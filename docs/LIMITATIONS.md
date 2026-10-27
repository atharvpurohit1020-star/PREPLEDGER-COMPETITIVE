# Known limitations

## Blocked by environment access
1. **Reference audit not possible.** questions.examside.com, its archive copies and further searches were unavailable (see `AUDIT.md`). No visual comparison or behavioural parity was verified. URL structure follows search-index evidence only.
2. **No real past-year questions yet.** The project owner's licensed book collection (OneDrive, `1drv.ms`) and official JEE Advanced papers (`jeeadv.ac.in`) were both refused by this environment's network policy (HTTP 403). Every published question is one of **78 original samples**, labelled "Sample · not a PYQ". Past-paper rows (JEE Main 2024 ×20, JEE Advanced 2023–24 ×4, NEET 2023–24 ×2) are **metadata only** and are marked unverified and unavailable. See `CONTENT_ONBOARDING.md` for the import path once access is granted.

## Data-dependent
3. Year-wise trends, years covered and true historical weightage stay empty until dated past papers with questions are imported. The UI says so instead of inventing figures.
4. Marking schemes and the JEE Main 2024 "removed chapter" flags come from public descriptions. They are marked **unverified** until checked against official bulletins.
5. Most chapters have no questions (see `COVERAGE.md`).

## Product scope
6. No Hindi/English language switch (the `papers.language` field exists).
7. No password-reset or verification email (no mail provider configured).
8. Admin cannot delete exams or subjects (deliberate; archive content instead). Import rollback **archives** questions rather than deleting them, so student attempts are preserved.
9. Restoring a question revision restores content but not answer-key versions. Key history is append-only by design; add a new key version if needed.
10. Search ranking uses Postgres full-text plus trigram similarity. It doesn't understand formulas semantically.
11. Diagram uploads go to local disk. Use a persistent volume or object storage in production.
12. Server-side PDF needs Chromium on the host. Browser print-to-PDF from the preview page always works.
13. The Dockerfile and compose file were not built here (no Docker daemon).
14. The client bundle is ~845 KB minified (≈235 KB gzip), mostly KaTeX. Admin is code-split.
