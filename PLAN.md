# FC4 Revision Tool — MVP Plan

Status: agreed and specified 2026-09-01. Not yet implemented.

Detailed specs live in `docs/` — see the table in `CLAUDE.md`. This file holds
the decisions; the docs hold the how.

## Locked decisions

| Question | Decision | Consequence |
|----------|----------|-------------|
| Deployment | **Local only, single user** | No auth, no hosted DB, no multi-tenancy. PEB material never leaves the machine. Server Components read SQLite directly — no API layer needed. |
| Self-marking | **In MVP** | Mark scheme bullets become a scoreable checklist. Adds `SelfMark` to the data model and a scoring UI. |
| Past papers | **5–10+ years planned** | Justifies a real extraction pipeline with a review UI, not a one-off hand-curation. Build it properly in Phase 2. |
| Aesthetic | **Editorial / law report** | Serif content type, warm paper ground, mono statutory refs, generous measure, restrained motion. Full light/dark. |

## Source document findings

These drive the design and should not be re-derived:

1. **The syllabus is a clean 16-node tree.** Each area carries a number, title, IPReg topic tags, lettered learning outcomes, and an explicit list of legal provisions. The content taxonomy is pre-specified by the PEB — do not invent one.
2. **Exam format:** 3 hours, pass at 50%. Section A = Q1–6, all compulsory, 40 marks. Section B = Q7–10, **choose 3 of 4**, 20 marks each. So a paper contains **120 available** marks but is scored out of **100 examinable** (40 + best 3 × 20). Do not conflate the two.
3. **Section A is not structurally recall-only.** The 2022 examiner's report calls it that, but 2024 Q2 and Q3 are full scenarios with preambles. A/B differ in marks and optionality, not shape.
4. **Section B scenarios reveal facts progressively.** Facts are interleaved between sub-questions — in 2022 Q9, the 2014 Twitter post that destroys novelty is disclosed only after parts (a) and (b). **The practice UI must preserve this reveal order.** Showing the full scenario at once destroys the question.
5. **Granularity mismatch:** mark schemes are per sub-question and bullet-level with marks attached (half marks allowed). Examiner's reports are per *whole question* only. Sub-question views inherit the parent question's examiner commentary, and must be labelled as such.
6. Nearly every learning outcome ends `"Apply (a) to (x) to a scenario"` — the Section A / Section B split is encoded in the syllabus itself.

## Stack

- **Next.js (App Router) + TypeScript**
- **Tailwind + shadcn/ui** — implemented as hand-written components in `components/` on Radix primitives (`@radix-ui/react-dialog`, `cmdk`, `class-variance-authority`, `clsx`/`tailwind-merge`), the same building blocks the shadcn CLI would scaffold, reskinned directly onto the tokens in `docs/design-system.md`. There is no `components.json` / shadcn CLI setup — the design is fully bespoke, so generating from shadcn's default theme and overriding it would have meant fighting two token systems.
- **Content as MDX** in `content/` — git-versioned, diffable, hand-correctable
- **SQLite (better-sqlite3)** for user data — answers, scores, progress, categorisation overrides. Gitignored.
- **MiniSearch** — prebuilt client-side index

Split of concerns: *content is authored and versioned in git; your work is stored in SQLite.* Different lifecycles, different homes.

## Data model

```
SyllabusArea      16 rows — number, title, ipregTopics[], learningOutcomes[]
Provision         citation registry — id, instrument, section, title, url
ContentNote       MDX file <-> syllabus area, cites Provisions
Paper             code, year, durationMins, totalMarks
Question          paper, number, section A|B, marks, questionType
SubQuestion       question, letter, text, marks, precedingNarrative, order
MarkSchemeItem    subQuestion, text, marks (0.5 granularity), order
ExaminerNote      question-level commentary
Categorisation    subQuestion <-> SyllabusArea, isPrimary, confidence, reviewStatus
Attempt           subQuestion, answerText, updatedAt
SelfMark          attempt <-> markSchemeItem, awarded (0 | 0.5 | 1)
Progress          subQuestion, status (not_started | in_progress | complete)
```

**Categorisation is sub-question level, many-to-many, with a primary.** Section A maps 1:1 (Q3 -> area 1 Berne; Q6 -> area 11 invalidity). Section B does not — 2022 Q8 alone spans areas 12, 13, 2 and 4, with each sub-part in a different place. One-category-per-question would make the filter useless for exactly the questions most worth drilling.

Every categorisation carries `confidence` and `reviewStatus`, so the model's first pass is visibly provisional and the user's corrections are permanent.

**Section B is choose-3-of-4** — completion percentages must account for optional questions or they will mislead.

## Extraction pipeline

`npm run extract` : PDFs -> cleaned text -> segmented JSON -> review UI -> SQLite.

pypdf reads all current PDFs (text layers present, no OCR needed). Output is dirty — `"retaile r"`, `"Brigh ton"`, lost bullet glyphs — so a cleaning pass plus human review is mandatory.

**2022, 2023 and 2024 are loaded as complete sets** (paper + mark scheme + examiner's report). Testing the segmentation rules against all three showed the grammar drifts every year — the mark scheme answer anchor, mark placement, item markers and section-total wording all vary. `docs/extraction.md` records each variation and which year proved it. Assume the next paper adds another.

Derived JSON lands in **gitignored** `content/derived/`, because the extracted text *is* the copyrighted material. Consequence: a fresh clone does not yield a working app — it needs the PDFs plus a rebuild. This is the correct trade; it keeps PEB content off GitHub entirely.

## Content section

Browse by the 16 syllabus areas. Each area page shows learning outcomes as a checklist, the user's notes (expanded by the model), and every statutory reference as a live link.

Citation registry targets:

| Source | Target |
|--------|--------|
| RDA 1949, CDPA 1988 | legislation.gov.uk deep links |
| Berne, Paris, Hague | WIPO |
| EUDR 6/2002, Reg (EU) 2024/2822 | EUR-Lex |
| *Samsung v Apple*, *Cofemel*, *Waterrower* | BAILII / CURIA |

Link-checker script so dead links surface rather than rot. legislation.gov.uk deep-link patterns need one-off verification per instrument (RDA 1949 is regnal-year based and awkward), and it defaults to "latest available", which can lag recent amendments — pin explicit versions where it matters.

## Build phases

**Dependency order matters.** Phases 4-6 consume rows that only the Phase 2
extraction pipeline produces (`question`, `sub_question`, `mark_scheme_item`).
Starting them first means building against invented fixtures and reworking when
the real shape lands. Phases 0, 1 and 3 have all their data already and can be
built immediately.

| Phase | Deliverable | Blocked by |
|-------|-------------|------------|
| 0 | ~~Scaffold: Next.js, TS, Tailwind, design tokens, SQLite~~ **done** | — |
| 1 | ~~Syllabus data + Provision registry + link checker + `/content` routes~~ **done** | 0 |
| 3 | ~~Content section: area pages merging prose + supplements + cards, card self-test, search~~ **done** | 0, 1 |
| 2 | Extraction pipeline + review UI; 2022-2024 papers ingested | 0 |
| 4 | Practice section: filters, progressive reveal, answer editor, mark scheme + examiner report | 2 |
| 5 | Self-marking: checklist scoring, score display | 4 |
| 6 | Polish | all |

Phases are listed in build order, not numeric order: **0 → 1 → 3**, then **2**,
then **4 → 5 → 6**.

## Out of scope for MVP

AI grading of written answers; timed mock exam mode; spaced repetition; FC1/2/3/5 and FD1; any multi-user or auth.

## Known limitations

1. **Model knowledge of recent law is unreliable.** The 2026 syllabus leans on Regulation (EU) 2024/2822, the Art 20a repair clause, and *Waterrower* [2024]. Every substantive statement in the content section must be anchored to a cited provision and flagged `unverified` until the user checks it. Confidently wrong law is worse than a gap.
2. Examiner reports are question-level, not sub-question level.
3. One paper is a thin base for categorisation — some of the 16 areas will have no questions attached until more papers land.
4. Extraction requires human review; do not silently ship mis-parsed questions.
5. Nothing PEB-issued may reach a public host.
