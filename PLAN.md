# FC4 Revision Tool — MVP Plan

Status: agreed 2026-09-01. Not yet implemented.

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
2. **Exam format:** 3 hours, 100 marks, pass at 50%. Section A = Q1–6, all compulsory, 40 marks total, 1–10 marks each, recall-heavy. Section B = Q7–10, **choose 3 of 4**, 20 marks each, scenario application.
3. **Section B scenarios reveal facts progressively.** Facts are interleaved between sub-questions — in 2022 Q9, the 2014 Twitter post that destroys novelty is disclosed only after parts (a) and (b). **The practice UI must preserve this reveal order.** Showing the full scenario at once destroys the question.
4. **Granularity mismatch:** mark schemes are per sub-question and bullet-level with marks attached (half marks allowed). Examiner's reports are per *whole question* only. Sub-question views inherit the parent question's examiner commentary, and must be labelled as such.
5. Nearly every learning outcome ends `"Apply (a) to (x) to a scenario"` — the Section A / Section B split is encoded in the syllabus itself.

## Stack

- **Next.js (App Router) + TypeScript**
- **Tailwind + shadcn/ui**
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

pypdf reads all current PDFs (text layers present, no OCR needed). Output is dirty — `"retaile r"`, `"Brigh ton"`, lost bullet glyphs — so a cleaning pass plus human review is mandatory. With 5–10+ papers coming, the review UI is a first-class component.

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

| Phase | Deliverable |
|-------|-------------|
| 0 | Scaffold: Next.js, TS, Tailwind, shadcn, design tokens, SQLite |
| 1 | Syllabus as structured data + Provision registry + link checker |
| 2 | Extraction pipeline + review UI; 2022 paper ingested |
| 3 | Content section: area pages, MDX notes, search |
| 4 | Practice section: filters, progressive reveal, answer editor, mark scheme + examiner report |
| 5 | Self-marking: checklist scoring, score display |
| 6 | Polish |

## Out of scope for MVP

AI grading of written answers; timed mock exam mode; spaced repetition; FC1/2/3/5 and FD1; any multi-user or auth.

## Known limitations

1. **Model knowledge of recent law is unreliable.** The 2026 syllabus leans on Regulation (EU) 2024/2822, the Art 20a repair clause, and *Waterrower* [2024]. Every substantive statement in the content section must be anchored to a cited provision and flagged `unverified` until the user checks it. Confidently wrong law is worse than a gap.
2. Examiner reports are question-level, not sub-question level.
3. One paper is a thin base for categorisation — some of the 16 areas will have no questions attached until more papers land.
4. Extraction requires human review; do not silently ship mis-parsed questions.
5. Nothing PEB-issued may reach a public host.
