# Data model

Schema: `migrations/001_init.sql` (PostgreSQL 16; extension `pg_trgm`). Internal integer keys; stable short `public_id`s appear in URLs. Public IDs for imported content come from the import `ref` (`server/lib/ids.ts`), so re-seeding keeps URLs stable.

| Entity (brief) | Table(s) | Notes |
|---|---|---|
| ExamCategory | `exam_categories` | URL group (`jee`, `medical`) |
| Exam | `exams` | Marking scheme (JSON per question type, with verified flag and note), `on_reference` flag |
| Subject / Chapter / Topic | `subjects`, `chapters` (`unit_name` grouping), `topics` | Unique slugs per parent |
| SyllabusVersion | `syllabus_versions`, `chapter_syllabus` | Per-chapter in/reduced/removed status, with `is_verified` |
| Year / Session | attributes of `papers` (`year`, `session`, `exam_date`, `shift`, `paper_number`) | Normalised enough for filtering and grouping; no separate rows needed |
| Paper | `papers` | `kind` (past_paper / sample / test_fixture), `availability` (full / partial / metadata_only), sections JSON, optional marking-scheme override, verification status |
| Question | `questions` | Type, body, matrix, marks override, `is_pyq`, status (draft / in_review / published / archived), verification status, content hash, search vector |
| Question tags across chapters | `question_chapter_tags`, `question_topics` | Secondary chapters count in chapter lists and statistics |
| Option | `options` | Labels A, B, C… |
| Paper ↔ question | `paper_questions` | Original number, section, per-paper marks |
| AnswerKey | `answer_keys` | Append-only versions; `status`, `source` (official / independently_verified / editorial), note, effective date; exactly one `is_current` |
| Solution | `solutions` | `kind` (official / editorial / community), method label, reviewed flag, author |
| DiagramAsset | `diagram_assets`, `question_diagrams` | Alt text required, licence |
| Passage | `passages` | Shared stimulus |
| SourceRecord | `source_records` | Source type, licence, rights holder, permission note (required) |
| ChapterStatistics | materialized view `chapter_statistics` | Refreshed after content writes |
| User / sessions | `users`, `auth_sessions` | scrypt hashes; only a SHA-256 of the session token is stored |
| Bookmark / recent | `bookmarks`, `recent_views` | Recent views capped at 50 |
| Attempt / AttemptAnswer | `attempts`, `attempt_answers`, `practice_responses` | Timed tests and chapter-practice checks |
| ContentReport | `content_reports` | open → accepted / resolved / rejected |
| Revisions / audit / imports | `question_revisions`, `audit_log`, `import_batches` | Full JSON snapshot per change; the batch stores the validated payload and report |

**Deduplication:** `content_hash` = SHA-256 of normalised plain text of the body plus sorted options (case, whitespace and markup insensitive). It's checked against the file and the database on import, and shown in the admin editor.

**Indexes:** chapter/status, exam/status, content hash, GIN full-text, GIN trigram, paper ordering, the current answer key (partial unique), attempts by user, reports by status, audit by time.
