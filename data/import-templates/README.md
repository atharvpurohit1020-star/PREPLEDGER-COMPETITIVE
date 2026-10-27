# Import templates

- `questions-template.json` — full format: source/provenance, papers (with sections), diagrams, passages, questions (all types), answer-key history and multiple solutions.
- `questions-template.csv` — one question per row. Provenance is entered in the admin import form. Answer column: `B`, `A;C` (multi), `2.5`, `2.5±0.1`, or `1.2..1.4` (range).

Rules enforced by the validator (see `server/lib/importer.ts`):
- exam/subject/chapter slugs must exist (see Admin → Taxonomy); unknown topics are created with a warning;
- option labels run A, B, C… in order; answer options must exist; numeric types have no options;
- `is_pyq: true` requires a past paper link and a source that is not `original_sample`/`user_contribution`;
- `official` answer keys/solutions require an `official_document`, `licensed_dataset` or `public_domain` source;
- every formula must render with KaTeX and every `diagram:` reference must resolve;
- duplicates (normalised text + options hash) are reported against the file and the database;
- a ref can only be imported once (its stable public ID is derived from the ref).
