# UI specification

Read with `docs/design-system.md` (tokens, components) and `docs/schema.sql`
(data). Local-only, single user: no auth, no loading skeletons for auth, no
empty-state onboarding.

## Routes

| Route | Purpose |
|---|---|
| `/` | Overview: coverage by syllabus area, weakest areas, resume last attempt |
| `/content` | The 16 areas, as a list |
| `/content/[areaSlug]` | One area: outcomes, notes, citations, linked questions |
| `/practice` | Question bank with filters |
| `/practice/[year]/[number]` | Question workspace — the core screen |
| `/review` | Categorisation review queue |

Search is a `⌘K` palette over areas, provisions and question text, not a page.

Server Components read SQLite directly via `lib/db.ts`. Mutations are Server
Actions. There is no `/api` layer — it would be pure overhead here.

## The question workspace

The most important screen. Layout at ≥1024px: content column at `--measure`
(left), sticky rail (right). Below 1024px the rail collapses to sections beneath
the content.

### Progressive reveal (Section B)

Section B scenarios disclose facts *between* sub-questions, and later facts
change the answers to earlier ones. In 2022 Q9 the 2014 Twitter post appears
only before part (c) and retrospectively destroys novelty. **Rendering the whole
scenario up front destroys the question.**

Render strictly in `sub_question.ordinal` order:

```
[ question.preamble ]                    serif, full measure

  ┌ (a)                        4 marks   inset, --rule-strong left border
  │ Advise David whether copyright …
  │ [ answer editor ]
  └

[ sub_question(b).preceding_narrative ]  dimmed to --ink-faint until (a) is done

  ┌ (b)                        4 marks
  ...
```

Rules:
- A sub-question's `preceding_narrative` renders **above that sub-question and
  below the previous one** — never hoisted into the preamble.
- Narrative and sub-questions after the current one are dimmed to `--ink-faint`
  and their text is `user-select: none` until unlocked.
- A part unlocks when the previous part's attempt is non-empty, or the user
  clicks **Skip ahead** (explicit, one click, no confirmation). Skipping is
  recorded but never blocked — this is a revision tool, not an invigilator.
- **Reveal all** is available in the rail for when you are reading rather than
  attempting. It sets no `submitted_at`.

### Answer editor

Plain textarea, serif, `--paper-sunk`, autosaves to `attempt.answer_text` on a
600ms debounce. Show a quiet `Saved HH:MM` in `--ink-faint`; no spinner, no
toast. Autosave failure must surface — a silent loss of a 20-mark answer is the
worst outcome this app can produce.

Word count and a soft target derived from marks (~40 words/mark, tuned later)
sit under the editor in mono.

### Mark scheme and self-marking

Hidden until **Reveal mark scheme**, which stamps `submitted_at` on first use
and warns once that it will. Revealed, each `mark_scheme_item` renders as:

```
☐  Copyright subsists in original artistic works …          1
☑  David is the creator so he owns the copyright            1     --ok-soft tint
◐  It lasts for David's life plus 70 years                  ½
```

- Click cycles `0 → full → half → 0`. Half marks are explicit in the mark
  schemes, so `½` must be reachable in one extra click, not hidden in a menu.
- Running total `awarded / available` in mono, tabular figures, updating live.
- Writes `self_mark`; the score comes from the `attempt_score` view, never
  recomputed in the client.

### Examiner's report

In the rail, collapsed by default, labelled explicitly:

> **Examiner's report — Question 9 (whole question)**

That label is required. Reports are per question, and presenting one beside part
(c) without saying so implies a specificity that does not exist.

### Marking complete

One control setting `progress.status`. Independent of self-marking — you may
mark something complete without scoring it, or score it and still want to
return.

## Progress and scoring with choose-3-of-4

Section B offers four questions of which three are answered. A single blended
percentage is misleading, so **always show two numbers, labelled**:

- **Coverage** — sub-questions attempted ÷ all sub-questions. Counts all four
  Section B questions, because for revision you want to have done all of them.
- **Exam-equivalent score** — Section A total (out of 40) plus the **best three**
  of the four Section B question scores (out of 60), giving a mark out of 100
  comparable to the real paper. Pass mark 50.

Never display a bare "%" without saying which basis. Where a paper has fewer
than three attempted Section B questions, show the exam-equivalent as
provisional and say so.

## Content area page

```
12 ── Supplementary unregistered design right
─────────────────────────────────────────────
IPReg topics: Qualifying for protection · Ownership     sans, --ink-faint

Learning outcomes
☑ a) Define the requirements … to subsist
☐ b) Explain how the term … is determined
▣ g) Apply (a) to (f) to a scenario          ← --accent-soft tint (Section B skill)

[ notes — MDX, serif, at --measure ]

Provisions
CDPA s.213  Design right              ← mono chip + verified heading
CDPA s.216  Duration of design right

Cases
WaterRower (UK) Ltd v Liking Ltd [2024] EWHC 2806

Questions in this area                  ← from categorisation
2022 Q8(a)   8 marks   ● complete   78%
2022 Q5      9 marks   ○ not started
```

Citation chips render from `content/provisions.json` by id. Never hand-write a
citation in MDX — a `<Cite id="cdpa-213" />` component keeps every reference
consistent and link-checked.

Any content note statement not yet checked against the source renders with an
`unverified` marker. This is not decoration: model knowledge of recent design
law (Reg (EU) 2024/2822, *WaterRower*) is the least reliable part of this app.

## Categorisation review queue

`/review` lists sub-questions with `review_status = 'proposed'`, newest import
first. Each row: question text, the model's proposed areas with confidence, and
the syllabus area picker. Keyboard: `J`/`K` move, `Enter` confirms, `E` edits,
`R` rejects. Confirming writes `confirmed`; changing writes `corrected`.

Proposed categorisations must be visually distinct from reviewed ones
everywhere they appear, not just here.

## Acceptance criteria

**Phase 0 — scaffold.** App boots; tokens in `globals.css`; light/dark toggle
persists; the three fonts load with fallbacks; migration runner applies
`docs/schema.sql` and is idempotent.

**Phase 1 — syllabus + citations.** `/content` lists 16 areas in order;
`/content/[slug]` renders outcomes and citation chips; every chip resolves to a
live URL; `npm run check:links` passes with zero 404s.

**Phase 3 — content.** Notes render from MDX; `⌘K` finds an area by title, an
outcome by text and a provision by citation; `unverified` markers visible.

**Phase 4 — practice.** All sub-questions of the 2022 paper are listed and
filterable by area and section; a Section B question reveals strictly in
ordinal order with narrative correctly interleaved; answers autosave and
survive a restart; mark scheme and examiner report reveal; complete toggles.

**Phase 5 — self-marking.** Items cycle 0/half/full; totals match
`attempt_score`; the overview shows coverage and exam-equivalent score,
separately labelled, with best-three-of-four applied to Section B.

## Explicitly out of scope

AI grading; timed mock mode; spaced repetition; other papers; multi-user; any
network call at runtime except opening a citation link in a new tab.
