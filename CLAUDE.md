# pebRevisionTools

A revision assistance tool for the **PEB exams** (Patent Examination Board — the UK examinations for qualification as a Chartered Patent Attorney).

## Status

Planned, not yet implemented. **Read `PLAN.md` first** — it holds the agreed MVP scope, stack, data model and build phases.

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

- Three hour unseen written exam, closed book. 100 marks. **Pass mark 50%.**
- **Section A** — Q1–6, *all compulsory*, 40 marks total, each worth 1–10 marks.
  Recall-focused.
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

_None yet — add build/test/run commands here as soon as the stack exists._
