# pebRevisionTools

A revision assistance tool for the **PEB exams** (Patent Examination Board — the UK examinations for qualification as a Chartered Patent Attorney).

## Status

Greenfield. No code yet. Stack, architecture and feature set are being decided during planning — do not assume a framework or language until that is settled in this file.

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

**FC4 — Design and Copyright Law** is the first target. Its exam format, mark
allocation and syllabus topics are not yet documented here: read the official
PDFs in `exam-materials/` before making any design decision that depends on
them, and record what you find in this section. Do not infer the format.

### Terminology

Use the domain's own vocabulary in code and UI. For FC4 that means *registered
design*, *unregistered design right*, *supplementary unregistered design*,
*copyright*, *authorship*, *ownership*, *term*, *infringement*, *exceptions and
permitted acts*, *moral rights* — but confirm against the syllabus rather than
this list.

## Exam materials

`exam-materials/` holds PEB-issued PDFs (syllabi, past papers, examiners'
reports, guidance). The PDFs are gitignored — see that folder's README. They are
the source of truth for anything about exam format or syllabus content.

## Working agreements

- Ask before inventing exam content. Accuracy matters more than volume here — a plausible-but-wrong statement of law or practice is worse than no content.
- Past papers, examiner's reports and mark schemes are PEB copyright. Keep any such material out of the repo unless the user confirms it is fine to commit; prefer a local, gitignored data directory.
- Keep user-facing wording aligned with how the PEB itself phrases things.

## Commands

_None yet — add build/test/run commands here as soon as the stack exists._
