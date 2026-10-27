# Feature inventory and reference-versus-implementation matrix

**Reference status key**
- **Observed (index):** URL pattern or label seen in search-engine results. The page was never opened (see `AUDIT.md`).
- **Brief:** specified in the project brief. Reference behaviour unverified.
- **Extension:** original PrepLedger feature. No claim that the reference has it.

**Test key** — U = unit, I = API integration, E = Playwright browser test. All suites pass (see `TEST_REPORT.md`).

| # | Feature | Reference URL / basis | Expected behaviour | Implementation | Tests | Limitation |
|---|---|---|---|---|---|---|
| 1 | Homepage exam catalogue by category | `/` — Brief | Exams grouped (Engineering / Medical) with entry points | ✅ `HomePage`, `/api/exams` | E navigation | Visual design not compared (reference inaccessible) |
| 2 | Exam landing (chapter-wise) | `/past-years/jee/jee-main` — Observed (index) | Identity, subjects, grouped chapters, counts, papers, practice, marking scheme, syllabus | ✅ `ExamPage` | E navigation, I | Counts are imported-data counts only |
| 3 | Subject page + subject switch | `/past-years/jee/jee-main/physics` — Observed (index) | Chapter list grouped by unit, share-of-subject | ✅ `SubjectPage`, `SubjectTabs` | E | — |
| 4 | Chapter page | `/past-years/jee/jee-main/physics/laws-of-motion` — Observed (index) | Question list, statistics, filters, pagination, related chapters | ✅ `ChapterPage` | E, I | — |
| 5 | Chapter-wise ↔ paper-wise switch | Observed (index) URL families | Tabs on every exam page | ✅ `ModeTabs` | E | — |
| 6 | Paper list by year/session/shift | `/past-years/year-wise/jee/jee-main` — Observed (index) | Years → papers, date, shift, availability | ✅ `PaperListPage` | E, I | Past papers are metadata-only until licensed content is imported |
| 7 | Complete paper view | `/past-years/year-wise/jee/jee-main/{slug}/{id}` — Observed (index) | Original order/numbering, sections, marks, answer key | ✅ `PaperPage` | E, I | Only sample sets have questions |
| 8 | Missing papers marked unavailable | Brief | Never reconstruct/fake | ✅ badge + empty state; test engine refuses (409) | E, I | — |
| 9 | Question detail page | Brief (reference pattern unknown) | Canonical `/question/{id}`, breadcrumbs, prev/next, provenance | ✅ `QuestionPage` | E, I | URL pattern is PrepLedger's own |
| 10 | Switch chapter ↔ paper context keeping the question | Brief | Context tabs; prev/next follow context | ✅ `?ctx=paper&paper=` | E, I | — |
| 11 | Breadcrumbs, back nav, related chapters, prev/next chapter | Brief | Correct trails, adjacent chapters | ✅ | E | — |
| 12 | Direct-link refresh, canonical URLs, real 404s | Brief | Deep links load; unknown paths return HTTP 404 | ✅ server `routeExists` + SPA 404 page | E, I | — |
| 13 | Responsive global nav, exam menu, footer | Brief | Desktop menu, mobile toggle | ✅ `Layout` | E | — |
| 14 | Question types | Brief | Single, multi, numerical, integer, matrix-match, assertion–reason, passage | ✅ all rendered and scored | U, E | — |
| 15 | Maths/chemistry rendering | Brief | KaTeX inline/display, mhchem `\ce{}`, tables, matrices, vectors | ✅ `shared/content.ts` | U, E (0 `katex-error` on every page) | — |
| 16 | Diagrams: alt text, zoom, high-res | Brief | Accessible zoom viewer | ✅ `Lightbox`, SVG diagrams | E | Only 3 sample diagrams |
| 17 | Answers with key status/source | Brief | Official vs independently verified vs editorial; provisional/final/revised/disputed/dropped | ✅ `AnswerBox`, `answer_keys` table | U, I, E | No official keys imported yet |
| 18 | Correction history | Brief | Versioned keys, visible history | ✅ append-only key versions | I, E | — |
| 19 | Worked solutions, alternative methods | Brief | Labelled kind, method label, reviewed flag | ✅ | E | Solutions are editorial samples |
| 20 | Unavailable/disputed/dropped handling | Brief | Explicit UI + scoring (dropped = full marks) | ✅ | U, I | — |
| 21 | Search across text, chapters, IDs | Brief (reference search behaviour unverified) | Full-text + trigram, chapter hits | ✅ Postgres FTS + `pg_trgm` | I, E | — |
| 22 | Filters, facets, chips, clear-all, sort, URL sync, pagination | Brief | Filters change results; counts shown | ✅ chapter + search | I, E | — |
| 23 | Chapter statistics | Brief; snippets mention counts/weightage | Counts, type mix, per-year, YoY change, share of subject, disclosures | ✅ `shared/stats.ts` | U, I, E | Year trends empty until dated PYQs exist (shown explicitly) |
| 24 | Metric documentation | Brief | Denominator, source, range per metric | ✅ `/about#metrics`, `METRICS.md` | — | — |
| 25 | Chapter & paper PDF | Snippets mention chapter PDFs (unverified) | Preview, print, download, key, solutions, page breaks, errors | ✅ print pages + Chromium `/api/pdf` | E (PDF bytes checked) | Not the reference's PDFs; needs Chromium on the server |
| 26 | Chapter practice (answer, check, reveal, reset) | Brief | Check answer, reveal, saved per user, reset | ✅ `QuestionCard` | E | Saved progress needs an account |
| 27 | Timed full-paper test engine | **Extension** | Timer, palette states, mark for review, autosave, resume, submit, scoring, review | ✅ `TestPage` | E, I | Runs only on papers that have questions |
| 28 | Custom chapter tests | **Extension** | Pick chapters → seeded random test | ✅ `PracticePage` | E, I | — |
| 29 | Accounts (optional) | **Extension** | Register/login; content stays public | ✅ scrypt + session cookie | I, E | No password reset email (no mail service) |
| 30 | Bookmarks, recent, history, wrong-answer revision, progress, preferences | **Extension** | Per-user persistence | ✅ | I, E | — |
| 31 | Data export & account deletion | **Extension** (Brief requirement) | JSON export; password-confirmed delete | ✅ | I, E | — |
| 32 | Content reports | **Extension** | Report problem → admin workflow | ✅ | I, E | — |
| 33 | Admin: taxonomy, syllabus mapping | Brief | Manage exams/subjects/chapters/topics/syllabus versions | ✅ | I | No exam deletion (deliberate) |
| 34 | Admin: question CRUD, live preview, publish controls | Brief | Validate, preview, draft/review/published/archived | ✅ | I, E | — |
| 35 | Admin: revisions & rollback | Brief | Snapshot per change; restore | ✅ | I, E | Restore leaves key history untouched (append-only by design) |
| 36 | Bulk import JSON/CSV with validation, duplicates, preview, commit, rollback | Brief | Batch workflow, provenance enforced | ✅ `server/lib/importer.ts` | U, I, E | Rollback archives rather than deletes |
| 37 | Provenance & rights on every question | Brief | Source type, licence, permission note | ✅ enforced by the importer | U, I | — |
| 38 | Audit log | Brief | Every admin mutation logged | ✅ | I, E | — |
| 39 | Diagram upload with safety checks | Brief | Type sniffing, SVG script rejection | ✅ | I | Local disk storage (use a volume) |
| 40 | Coverage dashboard & report | Brief | By exam/subject/paper/chapter | ✅ `/coverage`, `npm run coverage-report` | I, E | — |
| 41 | Security: CSP, CSRF, rate limits, env validation, logging | Brief | — | ✅ helmet, origin/JSON check, express-rate-limit, zod env, pino | U, I | — |
| 42 | Design matching to reference screenshots | Brief | Match typography, spacing, etc. | ❌ **Blocked** — reference inaccessible | Responsive checks only (390/820/1280) | Original dense design, not a comparison |
| 43 | Real past-year question content | Brief | Lawfully sourced PYQs | ❌ **Blocked** — no licensed source reachable; `1drv.ms` and `jeeadv.ac.in` denied by network policy | — | 78 clearly labelled original samples instead |
| 44 | English/Hindi paper versions | Snippets (unverified) | Language switch | ⚠️ Data model has `papers.language`; no UI switch | — | Needs bilingual content |
