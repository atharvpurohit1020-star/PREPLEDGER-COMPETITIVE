# Test & browser-test report

Run on 2026-10-26 in the build environment (Linux, Node 22, PostgreSQL 16.15, Chromium via Playwright 1.63).

| Suite | Command | Result |
|---|---|---|
| Typecheck (client + server + tests) | `npm run typecheck` | ✅ clean |
| Unit (renderer, scoring, statistics, CSV/import schema, sample-data integrity, env validation) | `vitest run tests/unit` | ✅ 39 / 39 |
| API integration (real PostgreSQL test DB, reset and seeded per run) | `vitest run tests/integration` | ✅ 39 / 39 |
| End-to-end browser (Chromium, separate DB and server on :4100) | `npm run test:e2e` | ✅ 31 / 31 (two consecutive clean runs) |

Artifacts (generated, git-ignored): `playwright-report/` (HTML), `test-results/e2e-results.json`, `test-results/screens/*.png` (390 / 820 / 1280 px), `test-results/sample-chapter.pdf`.

## What the browser suite verifies
- **Routes:** every exam landing page and every chapter link on it returns 200 (14 exams, ~1,280 chapter links); deep links survive refresh; unknown routes return HTTP 404 with the 404 page; canonical URLs are set.
- **Navigation:** exam menu, header search, footer, breadcrumbs, subject switch, related-chapter links, prev/next questions, chapter ↔ paper context switch keeping the selected question, mobile menu.
- **Question types:** single, multi (partial feedback), numerical/range, integer, matrix-match lists, assertion–reason, passage, tables. Answer reveal, solutions (labelled editorial, not official), key status and correction history.
- **Diagrams:** image loaded (`naturalWidth > 0`), alt text, zoom viewer (zoom in, Escape to close).
- **Filters & search:** filters change results and sync to the URL; chips, clear-all, facets, sort, pagination and empty states.
- **Statistics:** disclosure text and the explicit "no year-wise trend" state.
- **PDF:** print preview contents and toggles; server PDF bytes start with `%PDF` (chapter and paper); explicit errors for empty or unknown chapters.
- **Practice/test engine:** palette states, mark for review, autosave across reload, submission, scoring (COMEDK +1/0), filtered review, custom tests, signed-in attempt saved and reviewable.
- **Accounts:** login boundary, saved practice state, bookmarks, recent views, progress, wrong-answer revision drop-off, reset practice, theme preference, data export, account deletion.
- **Admin:** student forbidden; import validation errors; preview; commit → public; rollback → archived; edit with live preview → revision; new disputed key version; unpublish/publish; report → accept & flag; audit log.
- **Responsive & quality gates** at 390, 820 and 1280 px across 13 pages: no horizontal scroll, no `katex-error`, no missing diagrams, no broken images, no console errors.
- **Accessibility smoke:** skip link focus and activation. Interactive controls are located by accessible role and name throughout the suite.

## Bugs found by the suites and fixed
1. Search with filters but no text crashed (`ORDER BY 0`), and facet queries bound unused parameters → per-query clause builders (`server/routes/public.ts`).
2. Test-engine server autosave never fired because the per-second clock kept resetting the debounce → debounce on answers only, plus a periodic flush.
3. Saved practice state arriving after the question card mounted was ignored → synced unless the user has already interacted.
4. Inline grid styles overrode responsive breakpoints (horizontal scroll at 390 px) → responsive layout classes.
5. The server cached `index.html` across rebuilds and returned HTML for missing `/assets/*` → mtime-aware reload, and 404 for missing files.
6. Desktop showed the mobile menu button (CSS specificity) → fixed.

## Not tested / not possible
- **Screenshot comparison with the reference** at matched viewports: blocked, because the reference was inaccessible (`AUDIT.md`).
- Firefox/WebKit: only Chromium is installed here. Add projects in `playwright.config.ts` in CI.
- Docker image build: no Docker daemon here.
