# pebRevisionTools

A revision assistance tool for the **PEB exams** (Patent Examination Board — the UK examinations for qualification as a Chartered Patent Attorney).

## Status

**Phases 0, 1 and 3 are built** (scaffold, citations, content section — see
`PLAN.md`'s phase table). **Phase 2 (extraction) is next**, then 4, 5, 6.
Run it with `npm run dev`. Read the specs in this order before changing
anything:

| Doc | What it settles |
|-----|-----------------|
| `PLAN.md` | Scope, locked decisions, build phases |
| `docs/design-system.md` | Design tokens, type, components — **read before writing any UI** |
| `docs/schema.sql` | Full DDL, with the reasoning in comments |
| `docs/ui.md` | Routes, screen specs, acceptance criteria per phase |
| `docs/extraction.md` | PDF → JSON pipeline, segmentation rules, validation gates |

Papers loaded: **FC4 2022, 2023, 2024**, each a complete set (paper, mark
scheme, examiner's report). The document grammar drifts between years — see
`docs/extraction.md`, which records every variation found and the year that
proved it.

Notes loaded (source `.docx` local-only, parsed output tracked):

| File | Contents |
|------|----------|
| `content/notes/fc4-notes.json` | Prose notes, ~27,300 words, 57/66 outcomes |
| `content/notes/fc4-cards.json` | 168 Q/A flashcards across 4 topic files |
| `content/notes/supplements/*.mdx` | Hand-written gap fills, `verified: false` |

Merged, the two note sets cover **65 of 66** non-application outcomes. Regenerate
with `scripts/parse_prose_notes.py` and `scripts/parse_notes.py` — both need
`pypdf`/`python-docx` in a venv, and both print a coverage report.

Data already built: `content/syllabus/fc4.json` (16 areas, 82 outcomes) and
`content/provisions.json` (126 provisions, 102 titles verified against
legislation.gov.uk). Regenerate the latter with `scripts/build_provisions.py`,
re-verify with `scripts/verify_provisions.py`.

Stack (agreed): Next.js App Router + TypeScript, Tailwind + shadcn/ui, MDX content in git, SQLite (better-sqlite3) for user data, MiniSearch for search. Local-only, single user, no auth.

## Scope

**Iteration 1: FC4 only.** Everything built now should work end-to-end for FC4 before breadth is added.

**Later: FC1, FC2, FC3, FC5, and FD1.** Design data models and abstractions so a new paper is added as data/config, not as a fork of the codebase. Avoid hardcoding FC4-specific assumptions into shared layers — but don't build speculative abstraction either; keep it simple and refactor when the second paper actually lands.

## Domain notes

The PEB papers:

| Paper | Subject |
|-------|---------|
| FC1 | UK Patent Law |
| FC2 | English Law |
| FC3 | International Patent Law |
| FC4 | Design and Copyright Law |
| FC5 | Trade Mark Law |
| FD1 | Advanced IP Law and Practice (Final Diploma) |

FC1–FC5 are the Foundation Certificate papers; FD1 is Final Diploma.

**FC4 — Design and Copyright Law** is the first target. Confirmed format from the
2026 syllabus:

- Three hour unseen written exam, closed book. **Pass mark 50%.**
- A paper contains **120 available** marks, scored out of **100 examinable**
  (Section A 40 + best three Section B answers at 20 each). Never conflate them.
- **Section A** — Q1–6, *all compulsory*, 40 marks total, each worth 1–10 marks.
  Often recall, but *not always*: 2024 Q2 and Q3 are full scenarios. Section A
  and B differ in marks and optionality, not in shape.
- **Section B** — Q7–10, ***choose three of four***, 20 marks each, 60 marks total.
  Scenario application, with lettered sub-parts.

The syllabus defines **16 content areas**, each with lettered learning outcomes and
an explicit list of legal provisions. This is the content taxonomy — use it as-is,
do not invent a parallel one. Nearly every area ends with an
`"Apply (a) to (x) to a scenario"` outcome, which is the Section A / Section B split.

**Section B scenarios reveal facts progressively** — narrative is interleaved
between sub-parts, and later facts frequently change the answer to earlier ones.
Any UI showing a Section B question must preserve that reveal order.

### Terminology

Use the domain's own vocabulary in code and UI: *registered design*, *UK
unregistered design right*, *supplementary unregistered design right*, *novelty*,
*individual character*, *informed user*, *commonplace*, *complex product*,
*must-fit*, *grace period*, *priority*, *restoration*, *invalidity*, *groundless
threats*, *subsistence*, *authorship*, *first ownership*, *moral rights*,
*permitted acts*, *secondary infringement*.

Statutory shorthand used throughout: **RDA** (Registered Designs Act 1949), **RDR**
(Registered Designs Rules), **CDPA** (Copyright, Designs and Patents Act 1988),
**EUDR** (Council Regulation (EC) 6/2002 as amended).

## Exam materials

`exam-materials/` holds PEB-issued PDFs, split by document type: `syllabi/`,
`past-papers/`, `mark-schemes/`, `examiners-reports/`, `guidance/`. Named
`FC4-2022-paper.pdf` style — paper code, year, doc type.

The PDFs are gitignored, and so is anything derived from them
(`content/derived/`), because the extracted question text is itself PEB
copyright. A fresh clone therefore needs the PDFs plus a rebuild to run.

These PDFs are the source of truth for exam format and syllabus content. There is
no PDF tooling on this machine — extract text with `pypdf` in a venv, not
`pdftotext`.

## Working agreements

- Ask before inventing exam content. Accuracy matters more than volume here — a plausible-but-wrong statement of law or practice is worse than no content.
- Past papers, examiner's reports and mark schemes are PEB copyright. Keep any such material out of the repo unless the user confirms it is fine to commit; prefer a local, gitignored data directory.
- Keep user-facing wording aligned with how the PEB itself phrases things.

## Commands

```bash
python3 scripts/build_provisions.py     # rebuild citation registry from syllabus
python3 scripts/verify_provisions.py    # re-verify titles against legislation.gov.uk
python3 scripts/parse_prose_notes.py    # .docx prose notes -> JSON + coverage report
python3 scripts/parse_notes.py          # .docx flashcards  -> JSON + coverage report
```
The parse scripts need `python-docx`; the PDF work needs `pypdf`.
```bash
npm run dev          # Turbopack dev server, http://localhost:3000
npm run build         # production build — also statically generates all 16 area pages
npm run lint           # eslint
npm run check:links    # fetches every citation URL in provisions.json, fails on non-2xx
```

The SQLite file lives at `data/app.db` (gitignored, created on first run — see
`lib/db.ts`). Delete it to reset all local progress; the migration runner
recreates the schema from `docs/schema.sql` on next boot.

**No PDF tooling on this machine** — no poppler/pdftotext/mutool/qpdf, no GNU
`timeout`, no `gh`. Extract PDF text with `pypdf` in a venv.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
