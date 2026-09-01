-- pebRevisionTools — SQLite schema (better-sqlite3)
--
-- Split of concerns:
--   * Syllabus areas, provisions and cases are CONTENT. They live in
--     content/*.json, are loaded at build time, and are NOT in this database.
--     Only their string ids appear here, as loose references.
--   * Papers, questions, mark schemes and examiner notes are DERIVED from the
--     PDFs by scripts/extract. They are inserted by the importer and are
--     effectively read-only to the app.
--   * Attempts, self-marks and progress are USER DATA. Only these are written
--     at runtime, and only these are irreplaceable. Back them up.
--
-- Migrations: numbered files in db/migrations/NNN_name.sql, applied in order,
-- tracked in schema_migrations. Never edit an applied migration; add a new one.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL,
  applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------- derived --

CREATE TABLE paper (
  id            INTEGER PRIMARY KEY,
  paper_code    TEXT    NOT NULL,              -- 'FC4'
  year          INTEGER NOT NULL,
  duration_mins INTEGER NOT NULL,
  total_marks   INTEGER NOT NULL,
  source_pdf    TEXT    NOT NULL,
  imported_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (paper_code, year)
);

CREATE TABLE question (
  id           INTEGER PRIMARY KEY,
  paper_id     INTEGER NOT NULL REFERENCES paper(id) ON DELETE CASCADE,
  number       INTEGER NOT NULL,               -- 1..10
  section      TEXT    NOT NULL CHECK (section IN ('A','B')),
  marks        INTEGER NOT NULL,
  -- Section B is choose-3-of-4: these are optional, and completion stats must
  -- treat them as such or percentages will mislead. See docs/ui.md.
  is_optional  INTEGER NOT NULL DEFAULT 0 CHECK (is_optional IN (0,1)),
  preamble     TEXT,                           -- scenario text before part (a)
  UNIQUE (paper_id, number)
);

CREATE TABLE sub_question (
  id            INTEGER PRIMARY KEY,
  question_id   INTEGER NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  letter        TEXT,                          -- 'a'..'d'; NULL if the question has no parts
  ordinal       INTEGER NOT NULL,              -- display order, 1-based
  marks         REAL    NOT NULL,
  text          TEXT    NOT NULL,
  -- Narrative disclosed immediately BEFORE this sub-question and after the
  -- previous one. Load-bearing: in 2022 Q9 the Twitter post that destroys
  -- novelty appears here, before part (c). Rendering it early ruins the
  -- question. NULL where no new facts are introduced.
  preceding_narrative TEXT,
  UNIQUE (question_id, ordinal)
);

CREATE TABLE mark_scheme_item (
  id              INTEGER PRIMARY KEY,
  sub_question_id INTEGER NOT NULL REFERENCES sub_question(id) ON DELETE CASCADE,
  ordinal         INTEGER NOT NULL,
  text            TEXT    NOT NULL,
  -- Mark schemes state half marks ("0.5 marks each"), so REAL not INTEGER.
  marks           REAL    NOT NULL,
  UNIQUE (sub_question_id, ordinal)
);

-- Examiner's reports are written per WHOLE QUESTION, never per sub-question.
-- A sub-question view inherits its parent's note and must label it as such.
CREATE TABLE examiner_note (
  question_id INTEGER PRIMARY KEY REFERENCES question(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  source_pdf  TEXT NOT NULL
);

-- ---------------------------------------------------- categorisation ------

-- Many-to-many, at SUB-QUESTION level. Section A maps ~1:1; Section B does not
-- (2022 Q8 alone spans areas 12, 13, 2 and 4). Exactly one primary per
-- sub-question is enforced by the partial unique index below.
CREATE TABLE categorisation (
  id              INTEGER PRIMARY KEY,
  sub_question_id INTEGER NOT NULL REFERENCES sub_question(id) ON DELETE CASCADE,
  area_slug       TEXT    NOT NULL,            -- -> content/syllabus/fc4.json
  is_primary      INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  -- 'proposed' = model's first pass; 'confirmed'/'corrected' = human reviewed.
  -- The UI must visibly distinguish proposed from reviewed.
  review_status   TEXT    NOT NULL DEFAULT 'proposed'
                  CHECK (review_status IN ('proposed','confirmed','corrected','rejected')),
  confidence      REAL    CHECK (confidence BETWEEN 0 AND 1),
  note            TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  reviewed_at     TEXT,
  UNIQUE (sub_question_id, area_slug)
);

CREATE UNIQUE INDEX idx_categorisation_one_primary
  ON categorisation (sub_question_id) WHERE is_primary = 1;
CREATE INDEX idx_categorisation_area   ON categorisation (area_slug);
CREATE INDEX idx_categorisation_status ON categorisation (review_status);

-- ------------------------------------------------------------- notes ------

-- Content comes from three sources, all generated/authored as FILES, not rows:
--   content/notes/fc4-notes.json       prose, keyed by area + learning outcome
--   content/notes/fc4-cards.json       168 Q/A flashcards, keyed by area
--   content/notes/supplements/*.mdx    hand-written gap fills, area + outcome
-- Only per-card REVIEW STATE lives here, because only it is user data.

CREATE TABLE card_review (
  card_id     TEXT PRIMARY KEY,          -- 'card-001' -> fc4-cards.json
  -- Self-test outcome, newest only. Deliberately coarse: this is a confidence
  -- signal for surfacing weak areas, not a spaced-repetition scheduler.
  confidence  TEXT NOT NULL CHECK (confidence IN ('again','hard','good','easy')),
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  review_count INTEGER NOT NULL DEFAULT 1
);

-- -------------------------------------------------------- user data -------

CREATE TABLE attempt (
  id              INTEGER PRIMARY KEY,
  sub_question_id INTEGER NOT NULL REFERENCES sub_question(id) ON DELETE CASCADE,
  answer_text     TEXT    NOT NULL DEFAULT '',
  started_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  submitted_at    TEXT,                        -- set when revealing the mark scheme
  -- Multiple attempts per sub-question are allowed so you can re-sit a question
  -- later and compare. The app works on the newest unless told otherwise.
  attempt_no      INTEGER NOT NULL DEFAULT 1,
  UNIQUE (sub_question_id, attempt_no)
);
CREATE INDEX idx_attempt_sub ON attempt (sub_question_id, attempt_no DESC);

CREATE TABLE self_mark (
  attempt_id         INTEGER NOT NULL REFERENCES attempt(id) ON DELETE CASCADE,
  mark_scheme_item_id INTEGER NOT NULL REFERENCES mark_scheme_item(id) ON DELETE CASCADE,
  -- Awarded marks for this item. Half marks are explicitly allowed by the
  -- mark schemes, so this is REAL and must not exceed the item's own marks.
  awarded            REAL NOT NULL CHECK (awarded >= 0),
  marked_at          TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (attempt_id, mark_scheme_item_id)
);

CREATE TABLE progress (
  sub_question_id INTEGER PRIMARY KEY REFERENCES sub_question(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'not_started'
                  CHECK (status IN ('not_started','in_progress','complete')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------- views ------

-- Score per attempt. LEFT JOIN so an unmarked attempt yields 0, not NULL.
CREATE VIEW attempt_score AS
SELECT a.id                                  AS attempt_id,
       a.sub_question_id,
       COALESCE(SUM(sm.awarded), 0)          AS awarded,
       sq.marks                              AS available,
       CASE WHEN sq.marks > 0
            THEN ROUND(COALESCE(SUM(sm.awarded), 0) * 100.0 / sq.marks, 1)
       END                                   AS percent
FROM attempt a
JOIN sub_question sq ON sq.id = a.sub_question_id
LEFT JOIN self_mark sm ON sm.attempt_id = a.id
GROUP BY a.id;

-- Card confidence per area is computed in app code, not SQL: the card -> area
-- mapping lives in fc4-cards.json, which SQLite does not see.

-- Per-area performance, newest attempt only. Drives "where am I weak".
CREATE VIEW area_performance AS
SELECT c.area_slug,
       COUNT(DISTINCT sq.id)                        AS sub_questions,
       COUNT(DISTINCT latest.id)                    AS attempted,
       ROUND(AVG(s.percent), 1)                     AS avg_percent
FROM categorisation c
JOIN sub_question sq ON sq.id = c.sub_question_id
LEFT JOIN (
  SELECT a.* FROM attempt a
  WHERE a.attempt_no = (SELECT MAX(a2.attempt_no) FROM attempt a2
                        WHERE a2.sub_question_id = a.sub_question_id)
) latest ON latest.sub_question_id = sq.id
LEFT JOIN attempt_score s ON s.attempt_id = latest.id
WHERE c.review_status <> 'rejected'
GROUP BY c.area_slug;
