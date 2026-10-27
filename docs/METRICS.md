# Statistics methodology

All statistics come from `shared/stats.ts` (unit-tested in `tests/unit/stats.test.ts`) and the `chapter_statistics` materialized view (refreshed after every import or edit). Every figure describes **the imported dataset only**. The UI shows a disclosure under each statistics panel giving the totals and how many questions are past-year versus sample.

| Metric | Calculation | Denominator | Date range | Where shown |
|---|---|---|---|---|
| Questions | Published questions whose primary chapter is this chapter, or that are tagged to it as a secondary chapter | — | All | Chapter page, exam/subject lists |
| Past-year questions | Subset with `is_pyq = true` (requires a past-paper link and a non-sample source) | — | All | Chapter page |
| Papers | Distinct published papers (past or sample) containing ≥1 of the chapter's questions | — | All | Chapter page |
| Questions per year | Distinct questions linked to a **past** paper of that year | — | Earliest–latest year present | Chapter chart; hidden with an explanation when empty |
| Years covered | First–last year in the series above | — | — | Chapter page |
| Year-on-year change | count(y) − count(y−1), only for consecutive years both present | — | — | Below the chart |
| Share of subject ("weightage") | chapter questions ÷ published questions in the subject | Subject total (stated in the UI) | All | Chapter page, subject page (%) |
| Question-type breakdown | Count per type in the chapter | Chapter total | All | Chapter page bars |
| Coverage | Published / PYQ / verified counts; chapters with ≥1 question; past papers listed vs with questions | Per exam/subject | All | `/coverage`, `docs/COVERAGE.md` |

**Not computed:** official exam weightage, difficulty trends and predicted questions. These can't be derived honestly from an incomplete import. Once complete papers for a year range are imported, the share-of-subject figure becomes a true historical weightage for that range. The disclosure text still names the denominator.
