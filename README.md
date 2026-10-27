# PREPLEDGER-COMPETITIVE

A question and PYQ bank for competitive exams like JEE and NEET.

A chapter-wise and paper-wise question platform for **JEE Main, JEE Advanced, NEET and engineering entrance exams** (MHT CET, BITSAT, COMEDK, WBJEE, KCET, VITEEE, AP EAPCET, TS EAMCET, plus KEAM, GUJCET and OJEE). Its information architecture follows the URL structure of questions.examside.com as seen in search-index evidence, but the codebase, branding, design and content are original.

> **Content status:** the database ships with **78 original sample questions** (every type, with editorial solutions) and **metadata-only** past-paper listings. No past-year questions are included yet, and none are invented. See `docs/CONTENT_ONBOARDING.md` to import licensed books and official papers.

## Features
- Exam → subject → unit → chapter browsing with counts, syllabus flags, share-of-subject and disclosed statistics
- Paper-wise browsing by year, session and shift; full-paper view with original numbering, sections, marking scheme and answer key; unavailable papers clearly marked
- Question renderer: KaTeX maths, mhchem chemistry, tables, matrices, matrix-match lists, assertion–reason, passages, zoomable diagrams with alt text
- Answers with official / independently-verified / editorial labels; provisional, final, revised, disputed and dropped keys; correction history; labelled solutions with alternative methods
- Search with facets, chips, sorting, pagination and URL-synced state
- Chapter and paper PDF: print preview plus server-side Chromium PDF with answer key and solutions
- Chapter practice (check, reveal, reset); timed test engine with palette, mark for review, autosave and resume, scoring and review; custom chapter tests
- Optional accounts: bookmarks, recently viewed, attempt history, wrong-answer revision, progress, preferences, data export, account deletion
- Admin: taxonomy and syllabus mapping, papers, sources and rights, diagrams, question editor with live preview, revisions and restore, versioned answer keys, publish controls, JSON/CSV bulk import (validation, duplicate detection, preview, commit, rollback), report workflow, audit log, user roles
- Coverage dashboard (`/coverage`) and `npm run coverage-report`

## Stack
TypeScript · React 18 + React Router 6 · Vite · Express 4 · PostgreSQL 16 (SQL migrations, full-text + trigram search) · zod · KaTeX · helmet / rate limiting / pino · Vitest + Supertest · Playwright.

## Deploy on Render (recommended)
1. Sign in at https://render.com with GitHub.
2. **New → Blueprint**, pick this repository. Render reads `render.yaml` and creates the web service and a PostgreSQL database.
3. When asked, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 10 characters). `SESSION_SECRET` is generated automatically.
4. Wait for the first deploy (about 5 minutes), open the `onrender.com` link, and sign in at `/login` with the admin details.

Render's free web service sleeps when idle, and its free database expires after 30 days. Use paid plans for a permanent site.

## Local setup
```bash
# 1. PostgreSQL: create a role and database (pg_trgm must be available)
createuser -P prepledger            # password: prepledger
createdb -O prepledger prepledger
psql -d prepledger -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm'

# 2. App
npm ci
cp .env.example .env               # set SESSION_SECRET (32+ chars) and ADMIN_PASSWORD
npm run seed                       # migrations + taxonomy + samples + paper metadata + admin user
npm run dev                        # API :4000, Vite :5173 (proxying /api)
# or production-like:
npm run build && npm start         # everything on :4000
```
Sign in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then open `/admin`.

## Tests
```bash
# test databases (once)
createdb -O prepledger prepledger_test && psql -d prepledger_test -c 'CREATE EXTENSION pg_trgm'
createdb -O prepledger prepledger_e2e  && psql -d prepledger_e2e  -c 'CREATE EXTENSION pg_trgm'
npm run typecheck
npm test            # unit + API integration (78)
npm run test:e2e    # Playwright browser suite (31); needs Chromium (npx playwright install chromium)
```

## Project layout
```
server/          Express app, routes (public, tests, account, admin, pdf), importer, auth, env validation
shared/          Code shared by client and server: content renderer, scoring, statistics, import schema, types
src/             React client (pages/, components/, lib/, styles/app.css design system)
migrations/      SQL schema
data/            Exam taxonomy, original sample dataset, import templates
scripts/         seed, coverage report, dev server helper
tests/           unit/, integration/, e2e/
docs/            Audit, feature matrix, data model, metrics, content format, onboarding, deployment, limitations, test report, coverage
```

## Documentation
- `docs/AUDIT.md`: what could and couldn't be audited on the reference
- `docs/FEATURE_MATRIX.md`: reference-versus-implementation matrix with status per feature
- `docs/DATA_MODEL.md`, `docs/METRICS.md`, `docs/CONTENT_FORMAT.md`
- `docs/CONTENT_ONBOARDING.md`: importing your licensed books and official JEE Advanced papers
- `docs/DEPLOYMENT.md`, `docs/LIMITATIONS.md`, `docs/TEST_REPORT.md`, `docs/COVERAGE.md`
