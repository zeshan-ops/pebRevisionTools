# pebRevisionTools

A revision assistance tool for the **PEB exams** (Patent Examination Board — the UK examinations for qualification as a Chartered Patent Attorney).

## Status

Greenfield. No code yet. Stack, architecture and feature set are being decided during planning — do not assume a framework or language until that is settled in this file.

## Scope

**Iteration 1: FC4 only.** Everything built now should work end-to-end for FC4 before breadth is added.

**Later: FC1, FC2, FC3, FC5, and FD1.** Design data models and abstractions so a new paper is added as data/config, not as a fork of the codebase. Avoid hardcoding FC4-specific assumptions into shared layers — but don't build speculative abstraction either; keep it simple and refactor when the second paper actually lands.

## Domain notes

The PEB Foundation Certificate papers, as understood so far (**to be confirmed with the user — correct this section rather than working from a guess**):

| Paper | Subject |
|-------|---------|
| FC1 | Basic principles of UK patent law |
| FC2 | English law and practice |
| FC3 | Basic principles of UK trade mark and design law |
| FC4 | Basic principles of drafting (patent specifications) |
| FC5 | Basic principles of amendment of patent specifications |
| FD1 | Advanced IP law and practice (Final Diploma) |

FC4 is a **drafting** paper: the candidate produces a patent specification (claims and description) from a client scenario and prior art, under time pressure, marked against an examiner's report. That shape — long-form written output judged against a mark scheme, rather than multiple choice — should drive the design.

### Terminology

Use the domain's own vocabulary in code and UI: *claim*, *independent/dependent claim*, *preamble*, *characterising portion*, *description*, *prior art*, *novelty*, *inventive step*, *added matter*, *examiner's report*, *mark scheme*, *past paper*.

## Working agreements

- Ask before inventing exam content. Accuracy matters more than volume here — a plausible-but-wrong statement of law or practice is worse than no content.
- Past papers, examiner's reports and mark schemes are PEB copyright. Keep any such material out of the repo unless the user confirms it is fine to commit; prefer a local, gitignored data directory.
- Keep user-facing wording aligned with how the PEB itself phrases things.

## Commands

_None yet — add build/test/run commands here as soon as the stack exists._
