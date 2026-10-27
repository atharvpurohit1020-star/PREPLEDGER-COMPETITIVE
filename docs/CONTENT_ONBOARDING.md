# Importing real content (your books and official papers)

Every route below goes through the same validator and is previewed before commit (Admin → Imports).

## 1. Your licensed books
The rights holder has confirmed permission to republish. Record it once:

1. Admin → **Sources** → add a source with:
   - type `licensed_dataset`
   - title (book name and edition)
   - licence ("Licensed to the operator for online publication")
   - rights holder
   - permission note (who granted permission, when, and where the written record is kept)
2. Convert each chapter to the JSON or CSV template (`data/import-templates/`) using the **exam / subject / chapter slugs** shown in Admin → Taxonomy.
3. Book questions that are reproduced past-year questions should be linked to the past paper (by `papers[].paper` ref) with `is_pyq: true`. Practice questions keep `is_pyq: false`.
4. Answer `source` is `editorial` unless the book reproduces an official key, in which case use `independently_verified` unless you checked it against the official key.

## 2. Official JEE Advanced papers and answer keys
1. Add a source of type `official_document`. Use the jeeadv.ac.in archive URL and the retrieval date. Licence: "Official public examination document".
2. Create the paper record (or reuse the existing metadata rows for 2023/2024 Paper 1 and 2) with sections and the **paper-specific marking scheme**, because JEE Advanced changes it every year.
3. Import questions with `papers: [{ paper, number, section }]` in the original order. Use `answer.source: "official"`. Add the provisional key under `answer_history`, and record any revisions or dropped questions as later versions.
4. Set paper `availability` to `full` once every question is present, and mark metadata `verified`.

## 3. Network access needed in this cloud environment
Add these to the environment's allowed domains (environment menu → Edit → Network access):
`1drv.ms`, `onedrive.live.com`, `api.onedrive.com`, `*.sharepoint.com`, `jeeadv.ac.in`.
Alternatively, upload the PDFs into the session.

PDF-to-question conversion (OCR and LaTeX transcription) is a separate step. Its output must still pass the importer's formula, diagram and provenance checks.
