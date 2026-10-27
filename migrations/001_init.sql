-- PrepLedger initial schema.
-- Conventions: surrogate integer keys internally, stable short `public_id`s in URLs,
-- every content row carries provenance (source_record_id) and verification status.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------- provenance
CREATE TABLE source_records (
  id              SERIAL PRIMARY KEY,
  source_type     TEXT NOT NULL CHECK (source_type IN
                    ('official_document','licensed_dataset','original_sample','public_domain','user_contribution','test_fixture')),
  title           TEXT NOT NULL,
  publisher       TEXT,
  url             TEXT,
  license         TEXT NOT NULL,           -- e.g. "CC BY 4.0", "Proprietary – licensed to operator", "Original work of PrepLedger"
  rights_holder   TEXT,
  permission_note TEXT,                    -- how permission was obtained / why use is lawful
  retrieved_at    DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- taxonomy
CREATE TABLE exam_categories (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,         -- URL group, e.g. "jee", "medical"
  name       TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE exams (
  id               SERIAL PRIMARY KEY,
  category_id      INT NOT NULL REFERENCES exam_categories(id),
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  short_name       TEXT NOT NULL,
  full_name        TEXT,
  conducting_body  TEXT,
  official_url     TEXT,
  region           TEXT,                   -- "National", "Maharashtra", ...
  description      TEXT,
  marking_scheme   JSONB NOT NULL DEFAULT '{}'::jsonb,
  marking_scheme_verified BOOLEAN NOT NULL DEFAULT false,
  marking_scheme_note TEXT,
  on_reference     BOOLEAN NOT NULL DEFAULT true,  -- false = original extension (exam not listed on reference)
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subjects (
  id         SERIAL PRIMARY KEY,
  exam_id    INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (exam_id, slug)
);

CREATE TABLE chapters (
  id          SERIAL PRIMARY KEY,
  subject_id  INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  unit_name   TEXT,                        -- grouping heading on subject pages, e.g. "Mechanics"
  sort_order  INT NOT NULL DEFAULT 0,
  UNIQUE (subject_id, slug)
);
CREATE INDEX chapters_subject_idx ON chapters(subject_id, sort_order);

CREATE TABLE topics (
  id          SERIAL PRIMARY KEY,
  chapter_id  INT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  UNIQUE (chapter_id, slug)
);

CREATE TABLE syllabus_versions (
  id                  SERIAL PRIMARY KEY,
  exam_id             INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  effective_from_year INT,
  source_record_id    INT REFERENCES source_records(id),
  is_verified         BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  UNIQUE (exam_id, label)
);

CREATE TABLE chapter_syllabus (
  chapter_id          INT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  syllabus_version_id INT NOT NULL REFERENCES syllabus_versions(id) ON DELETE CASCADE,
  status              TEXT NOT NULL CHECK (status IN ('in_syllabus','reduced','removed')),
  note                TEXT,
  PRIMARY KEY (chapter_id, syllabus_version_id)
);

-- ---------------------------------------------------------------- papers
CREATE TABLE papers (
  id               SERIAL PRIMARY KEY,
  public_id        TEXT NOT NULL UNIQUE,
  exam_id          INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN ('past_paper','sample','test_fixture')),
  year             INT,
  session          TEXT,                   -- "January", "April", "Paper 1" ...
  exam_date        DATE,
  shift            TEXT,                   -- "Morning", "Evening"
  paper_number     INT,
  language         TEXT NOT NULL DEFAULT 'English',
  duration_minutes INT,
  total_marks      NUMERIC,
  marking_scheme   JSONB,                  -- overrides exam scheme when present
  sections         JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{key,name,subject_slug,instructions}]
  availability     TEXT NOT NULL DEFAULT 'metadata_only' CHECK (availability IN ('full','partial','metadata_only')),
  status           TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','verified','needs_correction')),
  source_record_id INT REFERENCES source_records(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, slug)
);
CREATE INDEX papers_exam_year_idx ON papers(exam_id, year DESC, exam_date DESC);

-- ---------------------------------------------------------------- import batches
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','editor','admin')),
  preferences   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);

CREATE TABLE import_batches (
  id             SERIAL PRIMARY KEY,
  filename       TEXT,
  format         TEXT NOT NULL CHECK (format IN ('json','csv')),
  status         TEXT NOT NULL CHECK (status IN ('validated','committed','rolled_back','failed')),
  report         JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload        JSONB,
  created_by     INT REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at   TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------- questions
CREATE TABLE passages (
  id         SERIAL PRIMARY KEY,
  public_id  TEXT NOT NULL UNIQUE,
  title      TEXT,
  body       TEXT NOT NULL
);

CREATE TABLE questions (
  id                  SERIAL PRIMARY KEY,
  public_id           TEXT NOT NULL UNIQUE,
  exam_id             INT NOT NULL REFERENCES exams(id),
  subject_id          INT NOT NULL REFERENCES subjects(id),
  chapter_id          INT NOT NULL REFERENCES chapters(id),
  passage_id          INT REFERENCES passages(id),
  type                TEXT NOT NULL CHECK (type IN
                        ('mcq_single','mcq_multi','numerical','integer','matrix_match','assertion_reason')),
  body                TEXT NOT NULL,          -- PrepLedger content markup (Markdown subset + LaTeX)
  matrix              JSONB,                  -- matrix_match: {"left":[{key,body}], "right":[{key,body}]}
  marks               NUMERIC,
  negative_marks      NUMERIC,
  difficulty          TEXT CHECK (difficulty IN ('easy','medium','hard')),
  is_pyq              BOOLEAN NOT NULL DEFAULT false,   -- true only for genuine past-year questions with provenance
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','archived')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','verified','needs_correction')),
  source_record_id    INT NOT NULL REFERENCES source_records(id),
  source_ref          TEXT,                   -- page/question reference inside the source
  content_hash        TEXT NOT NULL,          -- normalised hash for duplicate detection
  search_text         TEXT NOT NULL DEFAULT '',
  search_vec          TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', search_text)) STORED,
  import_batch_id     INT REFERENCES import_batches(id),
  created_by          INT REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX questions_chapter_idx ON questions(chapter_id, status);
CREATE INDEX questions_exam_idx ON questions(exam_id, status);
CREATE INDEX questions_hash_idx ON questions(content_hash);
CREATE INDEX questions_search_idx ON questions USING GIN (search_vec);
CREATE INDEX questions_search_trgm_idx ON questions USING GIN (search_text gin_trgm_ops);

-- secondary chapter tags (a question can legitimately span chapters)
CREATE TABLE question_chapter_tags (
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  chapter_id  INT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, chapter_id)
);

CREATE TABLE question_topics (
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  topic_id    INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, topic_id)
);

CREATE TABLE options (
  id          SERIAL PRIMARY KEY,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  body        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  UNIQUE (question_id, label)
);

CREATE TABLE paper_questions (
  paper_id        INT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  question_id     INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  section_key     TEXT,
  question_number INT NOT NULL,
  marks           NUMERIC,
  negative_marks  NUMERIC,
  PRIMARY KEY (paper_id, question_id),
  UNIQUE (paper_id, question_number)
);
CREATE INDEX paper_questions_question_idx ON paper_questions(question_id);

CREATE TABLE answer_keys (
  id          SERIAL PRIMARY KEY,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version     INT NOT NULL,
  value       JSONB NOT NULL,      -- {"options":["A"]} | {"numeric":2.5,"tolerance":0.01} | {"range":[1,2]}
  status      TEXT NOT NULL CHECK (status IN ('provisional','final','revised','disputed','dropped')),
  source      TEXT NOT NULL CHECK (source IN ('official','independently_verified','editorial')),
  is_current  BOOLEAN NOT NULL DEFAULT true,
  note        TEXT,
  effective_at DATE,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, version)
);
CREATE UNIQUE INDEX answer_keys_current_idx ON answer_keys(question_id) WHERE is_current;

CREATE TABLE solutions (
  id               SERIAL PRIMARY KEY,
  question_id      INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('official','editorial','community')),
  method_label     TEXT,                 -- "Method 2: energy conservation"
  body             TEXT NOT NULL,
  is_verified      BOOLEAN NOT NULL DEFAULT false,
  author_name      TEXT,
  source_record_id INT REFERENCES source_records(id),
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX solutions_question_idx ON solutions(question_id, sort_order);

CREATE TABLE diagram_assets (
  id               SERIAL PRIMARY KEY,
  public_id        TEXT NOT NULL UNIQUE,
  url              TEXT NOT NULL,
  alt_text         TEXT NOT NULL,
  caption          TEXT,
  width            INT,
  height           INT,
  license          TEXT NOT NULL,
  source_record_id INT REFERENCES source_records(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE question_diagrams (
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  diagram_id  INT NOT NULL REFERENCES diagram_assets(id),
  PRIMARY KEY (question_id, diagram_id)
);

CREATE TABLE question_revisions (
  id          SERIAL PRIMARY KEY,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  revision    INT NOT NULL,
  snapshot    JSONB NOT NULL,
  change_note TEXT,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, revision)
);

-- ---------------------------------------------------------------- student data
CREATE TABLE bookmarks (
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE recent_views (
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE attempts (
  id               SERIAL PRIMARY KEY,
  public_id        TEXT NOT NULL UNIQUE,
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('paper_test','custom_test')),
  paper_id         INT REFERENCES papers(id) ON DELETE SET NULL,
  definition       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- custom test definition (chapters, seed, count)
  status           TEXT NOT NULL CHECK (status IN ('in_progress','submitted')),
  state            JSONB NOT NULL DEFAULT '{}'::jsonb,   -- palette / visited / current index
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at     TIMESTAMPTZ,
  duration_seconds INT,
  score            NUMERIC,
  max_score        NUMERIC
);
CREATE INDEX attempts_user_idx ON attempts(user_id, started_at DESC);

CREATE TABLE attempt_answers (
  attempt_id         INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id        INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  response           JSONB,
  marked_for_review  BOOLEAN NOT NULL DEFAULT false,
  is_correct         BOOLEAN,
  marks_awarded      NUMERIC,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id)
);

-- per-question practice checks (chapter practice mode)
CREATE TABLE practice_responses (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  response    JSONB NOT NULL,
  is_correct  BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX practice_responses_user_idx ON practice_responses(user_id, question_id, created_at DESC);

CREATE TABLE content_reports (
  id              SERIAL PRIMARY KEY,
  question_id     INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id         INT REFERENCES users(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL CHECK (reason IN ('wrong_answer','typo','rendering','missing_diagram','other')),
  details         TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected','resolved')),
  resolution_note TEXT,
  resolved_by     INT REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX content_reports_status_idx ON content_reports(status, created_at DESC);

CREATE TABLE audit_log (
  id          SERIAL PRIMARY KEY,
  actor_id    INT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log(created_at DESC);

-- ---------------------------------------------------------------- statistics
-- Chapter statistics are computed only from published questions in the database.
-- Denominators and disclosure rules are documented in docs/METRICS.md.
CREATE MATERIALIZED VIEW chapter_statistics AS
SELECT c.id AS chapter_id,
       count(q.id) FILTER (WHERE q.status = 'published')                         AS question_count,
       count(q.id) FILTER (WHERE q.status = 'published' AND q.is_pyq)            AS pyq_count,
       count(DISTINCT pq.paper_id) FILTER (WHERE q.status = 'published')         AS paper_count,
       min(p.year) FILTER (WHERE q.status = 'published' AND p.kind = 'past_paper') AS first_year,
       max(p.year) FILTER (WHERE q.status = 'published' AND p.kind = 'past_paper') AS last_year
FROM chapters c
LEFT JOIN questions q ON q.chapter_id = c.id
LEFT JOIN paper_questions pq ON pq.question_id = q.id
LEFT JOIN papers p ON p.id = pq.paper_id
GROUP BY c.id;
CREATE UNIQUE INDEX chapter_statistics_pk ON chapter_statistics(chapter_id);
