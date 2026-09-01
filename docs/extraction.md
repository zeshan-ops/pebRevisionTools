# Extraction pipeline

Turns PEB PDFs into rows in the derived tables. This is the hardest part of the
project and the one where errors are quietest — a mis-attributed narrative block
silently changes what a question asks.

**Design rule: the pipeline never writes straight to the app.** It emits JSON,
a human reviews it, and only then is it imported. Confidence is recorded, not
assumed.

```
exam-materials/*.pdf
   → 1 extract text        (pypdf)
   → 2 clean               (dehyphenate, fix spacing, normalise bullets)
   → 3 segment             (papers / mark schemes / reports → structured JSON)
   → 4 pair                (match paper ↔ mark scheme ↔ report by filename)
   → 5 categorise          (model proposes syllabus areas)
   → 6 review              (human confirms — /review)
   → 7 import              (JSON → SQLite)
```

Steps 1–4 live in `scripts/`, output to `content/derived/` (gitignored). Step 7
is `npm run import`.

## 0. Environment

No PDF tooling on this machine — no `poppler`, `pdftotext`, `mutool` or `qpdf`,
and no GNU `timeout`. Use `pypdf` in a venv:

```bash
python3 -m venv .venv && .venv/bin/pip install pypdf
```

All six current PDFs have text layers; no OCR is needed. **Verify this per new
paper** — a scanned paper yields empty strings, and the pipeline must fail loudly
rather than import nothing.

## 1–2. Extract and clean

`pypdf`'s `extract_text()` output is dirty in consistent, fixable ways:

| Artefact | Example | Fix |
|---|---|---|
| Intra-word spaces | `retaile r`, `Brigh ton`, `f or` | Rejoin when split halves form a dictionary word and the gap is single-space |
| Lost bullet glyphs | `` (U+F0A7 etc.) | Map private-use chars to `-` |
| Header/footer noise | `Page 3 of 14`, `FC4 Design and Copyright Law` | Drop lines matching per-document header patterns |
| Non-breaking / thin spaces | | Normalise to U+0020 |
| Smart quotes | `“infringing copy”` | Keep — they match the statute book |

Never "fix" legal text beyond whitespace and glyphs. Preserve wording exactly:
these are the words being marked.

## 3. Segmentation

The genuinely hard step. Three document types, three grammars.

### Question papers

Anchors, in priority order:

1. `SECTION A` / `SECTION B` — set `question.section`, and `is_optional = 1`
   for everything in B.
2. `^Question\s+(\d+)\s*$` on its own line — starts a question.
3. `^\s*([a-z])\)\s` — starts a sub-question **only if** the letter is the
   expected next one for the current question (`a` then `b` then `c`…). This
   guard matters: prose contains `a)`-shaped strings, and lettered lists appear
   inside scenarios. An out-of-sequence letter is a list item, not a part.
4. `(\d+(?:\.5)?)\s+marks?\s*$` — closes a sub-question and sets its marks.
5. `Total:\s*(\d+)\s+[Mm]arks` — closes a question; assert it equals the sum of
   its parts and fail loudly if not. This is the pipeline's best self-check.

**Narrative attribution — the load-bearing rule.** Text between the end of one
sub-question's marks line and the start of the next `letter)` is that *next*
sub-question's `preceding_narrative`. Text between the `Question N` heading and
the first `a)` is the question's `preamble`. Getting this wrong is the failure
mode that matters most: it either leaks a later fact into an earlier part or
strands a fact that a part depends on.

A question with no lettered parts (2022 Q1–Q4, Q6) still gets exactly one
`sub_question` row with `letter = NULL` and `ordinal = 1`, so everything
downstream — attempts, marks, categorisation — has a uniform target.

Discard: the instructions page, `Page N of M`, and the running `FC4` header.

### Mark schemes

Mark schemes restate the question before answering it, so segmentation must not
re-parse those restatements as new questions. Anchor on `Answer:` — everything
after it, until the next `Question\s+\d+`, is mark scheme content.

Within an answer, parts are marked `(a)`, `(b)` — parenthesised, unlike the
paper's `a)`. Items are bullet lines ending in a mark value:

```
- Copyright subsists in original artistic works … (1 mark)
- … a habitual residence … (0.5 marks each)
```

Parse `\((\d+(?:\.5)?)\s+marks?\b` into `mark_scheme_item.marks`. Note the
2022 scheme's preamble — *"Half marks may be awarded"*, *"Article and section
numbers are not required"* — is paper-level guidance, not an item; capture it on
the paper, not as a scored bullet.

`0.5 marks each` applied to a multi-item bullet needs a human decision. Flag,
don't guess.

### Examiner's reports

A two-column table: question number, commentary. Extracted linearly, this
becomes `Question 1` followed by its prose. Anchor on `^Question\s+(\d+)` and
take everything to the next anchor. Reports are **per question** — there is no
sub-question granularity to recover, and none should be invented.

## 4. Pairing

By filename: `FC4-2022-paper.pdf` ↔ `FC4-2022-mark-scheme.pdf` ↔
`FC4-2022-examiners-report.pdf`. A paper with no mark scheme imports fine and is
marked as such; the UI hides the reveal control rather than showing an empty
panel.

## 5. Categorisation

For each sub-question the model proposes syllabus areas from
`content/syllabus/fc4.json`, writing `categorisation` rows with
`review_status = 'proposed'` and a calibrated `confidence`.

- Exactly one `is_primary` per sub-question.
- Section A is usually 1:1 (2022 Q3 → area 1 Berne; Q6 → area 11 invalidity).
- Section B is genuinely multi-area — 2022 Q8 spans areas 12, 13, 2 and 4 — and
  each part usually sits in a different one. Do not collapse to one.
- Prefer the area whose *provisions* the mark scheme actually cites. The mark
  scheme is better evidence of the intended area than the question wording.

Never auto-confirm. `proposed` is the only status the pipeline may write.

## 6–7. Review and import

Review at `/review` (see `docs/ui.md`). Import is idempotent and keyed on
`(paper_code, year)`: re-importing a paper replaces its derived rows inside a
transaction and **must not touch `attempt`, `self_mark` or `progress`**. Since
those FK to `sub_question`, re-import must match existing sub-questions on
`(question.number, ordinal)` and update in place rather than delete-and-insert,
or a re-import silently destroys written answers. This is the single most
dangerous operation in the codebase — cover it with a test that writes an
attempt, re-imports, and asserts the answer survives.

## Validation gates

The importer refuses input that fails any of these:

1. Every question's part marks sum to its stated `Total:`.
2. Section A marks sum to 40; Section B questions are 20 each; paper total 100.
3. Section A has 6 questions, Section B has 4 — for the current format. Warn
   rather than fail if a paper differs; older papers may not match.
4. Every sub-question has ≥1 mark scheme item, where a mark scheme exists.
5. No sub-question text is empty or under 20 characters.
6. Letters within a question are contiguous from `a`.

A failing gate prints the offending question and stops. Do not import partial
papers.

## Known limitations

- Layout-dependent: two-column or heavily tabular papers may need per-year
  tweaks. Keep overrides in a per-paper config, not in the shared parser.
- Older papers pre-date the current format and may not satisfy gate 3.
- Figures and images in design papers are not extracted at all. A question
  depending on a drawing will import as text and be incomplete — flag these for
  manual attention rather than importing them silently.
