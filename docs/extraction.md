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

The genuinely hard step. Three document types, three grammars — and the grammars
**drift between years**. Every rule below was checked against the 2022, 2023 and
2024 papers; where they disagree, the disagreement is recorded. Do not tighten a
rule beyond what all three support.

### Question papers

Anchors, in priority order:

1. **Sections.** `^SECTION [AB]` opens a section. Section-total lines close one,
   and their wording *varies*:
   - `SECTION A Total: 40 marks` (2022, 2023)
   - `Total for SECTION A: 40 marks` (2024)
   - `SECTION B Total: 60 Marks` (2023 only)

   Match `(?:SECTION\s+([AB])\s+Total|Total\s+for\s+SECTION\s+([AB]))`, and
   **never** let these lines be parsed as a question's `Total:`. Everything in
   Section B gets `is_optional = 1`.

2. `^\s*Question\s+(\d+)\s*$` — starts a question. Reliable in all three
   years, in papers and mark schemes alike (always exactly 10).

3. `^\s*([a-z])\)\s` — starts a sub-question **only if** the letter is the
   expected next one for the current question. Prose contains `a)`-shaped
   strings. Parts run to at least **(f)** — 2023 has a six-part question of
   1 mark each — so do not assume a–d.

4. `(\d+(?:\.5)?)\s+marks?\s*$` — closes a sub-question and sets its marks.
   Note `marks?`: the sources contain `(1 marks)` typos.

5. `Total:\s*(\d+)\s+[Mm]arks` — closes a question. **Only present when the
   question has lettered parts.** 2024 Q2, Q3 and Q4 have no parts, no `Total:`,
   and just a single marks line. A gate demanding a `Total:` on every question
   fails 2024 outright.

**Narrative attribution — the load-bearing rule.** Two distinct patterns exist
and one rule covers both:

- Text after `letter)` and before that part's marks line **belongs to the part**
  (`sub_question.text`). It may itself contain scenario facts — 2024 Q5(a) opens
  with "Jocelyn is an American designer…" before the instruction.
- Text between one part's marks line and the next `letter)` is the **next**
  part's `preceding_narrative`. This is the 2022 Q9 pattern, where the 2014
  Twitter post appears here and retrospectively destroys novelty.
- Text between the `Question N` heading and the first `a)` is the question's
  `preamble`.

Getting this wrong either leaks a later fact into an earlier part or strands a
fact the part depends on. It is the failure mode that matters most.

**Section A is not structurally "recall-only."** The 2022 examiner's report
describes it that way, but 2024 Q2 and Q3 are full scenarios with preambles.
Treat `preamble` as valid in both sections; the A/B difference is marks and
optionality, not shape.

A question with no lettered parts still gets exactly one `sub_question` row with
`letter = NULL` and `ordinal = 1`, so attempts, marks and categorisation have a
uniform target.

Discard: the instructions page, `Page N of M`, and the running `FC4` header.

### Mark schemes

Mark schemes **restate the question — parts, marks and all — before answering
it**. A naive parse therefore double-counts every mark in the paper. Split each
question at the answer anchor and parse items only from what follows.

The anchor is `^\s*Answer\b:?` — **the colon is optional**. 2022 and 2024 write
`Answer:`; 2023 writes `Answer`. Requiring the colon finds 2 of 10 questions in
2023 and silently drops the rest. With the colon optional it finds exactly 10 in
all three years.

Within an answer, both the item marker and the mark placement vary:

| Year | Items marked by | Marks placed |
|---|---|---|
| 2022 | bullet glyphs | inline, end of line — `… (1 mark)` |
| 2023 | numbered `1.` `2.` | **on their own line** — `(6 marks)` |
| 2024 | plain lines | inline, end of line — `… (1 mark)` |

So an item is "text up to and including its mark value", where the value may sit
on the following line. Parse `\((\d+(?:\.5)?)\s+marks?\b` — again `marks?`,
and note 2023 uses `(N marks)` in parentheses where the paper uses bare
`N marks`.

Half marks are common and increasing (8 mentions in 2022, 12 in 2023, 17 in
2024), which is why `mark_scheme_item.marks` and `self_mark.awarded` are REAL.

Paper-level guidance — *"Half marks may be awarded"*, *"Article and section
numbers are not required"* — belongs on the paper, not as a scored item.
`0.5 marks each` applied to a multi-item bullet needs a human decision: flag,
do not guess.

### Examiner's reports

A two-column table (question number, commentary) that extracts linearly. Anchor
on `^Question\s+(\d+)` and take everything to the next anchor. Reports are
**per question** — there is no sub-question granularity to recover, and none
should be invented.

## 4. Pairing

By filename: `FC4-2022-paper.pdf` ↔ `FC4-2022-mark-scheme.pdf` ↔
`FC4-2022-examiners-report.pdf`. All of 2022, 2023 and 2024 are present as
complete sets. A paper with no mark scheme imports fine and is marked as such;
the UI hides the reveal control rather than showing an empty panel.

## 5. Categorisation

For each sub-question the model proposes syllabus areas from
`content/syllabus/fc4.json`, writing `categorisation` rows with
`review_status = 'proposed'` and a calibrated `confidence`.

- Exactly one `is_primary` per sub-question.
- Section A is usually 1:1 (2022 Q3 → area 1 Berne; Q6 → area 11 invalidity).
- Section B is genuinely multi-area — 2022 Q8 spans areas 12, 13, 2 and 4 — and
  each part usually sits in a different one. Do not collapse to one.
- Prefer the area whose *provisions* the mark scheme actually cites. The mark
  scheme is better evidence of intent than the question wording. The 2023 scheme
  is especially explicit, naming sections in the questions themselves
  ("With regard to S. 16 CDPA …").

Never auto-confirm. `proposed` is the only status the pipeline may write.

## 6-7. Review and import

Review at `/review` (see `docs/ui.md`). Import is idempotent and keyed on
`(paper_code, year)`: re-importing replaces derived rows in a transaction and
**must not touch `attempt`, `self_mark` or `progress`**. Those FK to
`sub_question`, so re-import must match existing sub-questions on
`(question.number, ordinal)` and update in place rather than delete-and-insert,
or it silently destroys written answers. This is the most dangerous operation in
the codebase — cover it with a test that writes an attempt, re-imports, and
asserts the answer survives.

## Validation gates

The importer refuses input that fails any of these. Each was checked against all
three papers.

1. **If** a question states `Total: N marks`, its parts must sum to N. Questions
   without parts have no `Total:` and are exempt — this is normal, not an error.
2. Section A marks sum to **40**; each Section B question is **20**.
3. Marks arithmetic, stated explicitly because it is easy to get wrong:
   - **Available** = 40 + (4 × 20) = **120**
   - **Examinable** = 40 + (best 3 × 20) = **100**

   Never assert "paper total = 100" against summed marks; the paper contains 120.
4. 10 questions: 6 in Section A, 4 in Section B. True for 2022-2024. **Warn, do
   not fail** — older papers may differ.
5. Every sub-question has ≥1 mark scheme item, where a mark scheme exists.
6. No sub-question text is empty or under 20 characters.
7. Letters within a question are contiguous from `a`.
8. The mark scheme yields exactly one answer block per question (10 per paper).
   Fewer means the `Answer` anchor drifted again — fail loudly.

A failing gate prints the offending question and stops. Do not import partial
papers.

## Known limitations

- **The grammar drifts yearly.** Three years produced three variations in the
  answer anchor, mark placement, item markers and section-total wording. Assume
  the next paper adds another. Keep per-year quirks in a per-paper config, not
  in the shared parser, and re-run the gates on every import.
- Older papers pre-date the current format and may fail gate 4.
- Figures and drawings are not extracted at all. A design question depending on
  an image imports as incomplete text — flag for manual attention rather than
  importing silently.
- Intra-word spacing damage (`Ahmed is a London -based designer`) survives
  cleaning in places. Acceptable in narrative; never "correct" statutory wording.
