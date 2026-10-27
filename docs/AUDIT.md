# Phase 1 — Reference audit (questions.examside.com)

## Access result: blocked

| Attempt | Result |
|---|---|
| `curl https://questions.examside.com/` from the build environment | Proxy refused CONNECT — **HTTP 403** (environment network policy) |
| WebFetch of the homepage | `getaddrinfo ENOTFOUND` |
| Wayback Machine (`web.archive.org`) | Blocked for this environment |
| Further web searches | Stopped at the project owner's request |

**Consequence:** no page of the reference was opened, clicked, screenshotted or measured. Any behaviour not listed under "Evidence" below is **unverified**, and nothing in this project claims parity with it. Phase 15 (screenshot comparison at matched viewports) could not be performed.

## Evidence that *was* available (search-engine index only)

Search results (titles, URLs and snippets; no page content was fetched) established:

| Observation | Source URL (as indexed) |
|---|---|
| Exam landing pages use `/past-years/{group}/{exam}` with groups `jee`, `medical`, `gate`, `ssc`, `defence` | `/past-years/jee/jee-main`, `/past-years/jee/viteee`, `/past-years/jee/bitsat`, `/past-years/jee/iat-iiser`, `/past-years/jee/comedk`, `/past-years/jee/mht-cet`, `/past-years/medical/neet`, `/past-years/gate/gate-in`, `/past-years/ssc/ssc-cgl-tier-i` |
| Subject pages: `/past-years/{group}/{exam}/{subject}` | `/past-years/jee/jee-main/physics`, `/past-years/medical/neet/biology` |
| Chapter pages: `/past-years/{group}/{exam}/{subject}/{chapter}` | `/past-years/jee/jee-main/physics/laws-of-motion`, `…/current-electricity`, `…/electronic-devices` (titled "Semiconductor"), `…/chemistry/solutions`, `…/mathematics/statistics`, `/past-years/medical/neet/biology/human-health-and-diseases` |
| Paper-wise pages: `/past-years/year-wise/{group}/{exam}` and `/past-years/year-wise/{group}/{exam}/{paper-slug}/{id}` | `/past-years/year-wise/jee/jee-main/jee-main-2024-online-27th-january-morning-shift/lsbl0a9f` |
| Snippets mention chapter question counts per type (e.g. "MCQ (Single Correct Answer) 246"), subject chapter lists grouped by area with counts/weightage, chapter-wise PDF mentions, English/Hindi paper versions, "Practice questions PDF" | snippets only |

Everything in the right-hand column was used only as **routing and naming evidence**. No question text, solution, count, statistic, logo or asset from the reference is used anywhere in PrepLedger.

## How the build handles the gap

- URL patterns, the `jee`/`medical` grouping, exam slugs and chapter slugs that appear above were reused (marked `slugObserved` in `data/taxonomy.ts`). Other slugs are PrepLedger's own.
- Features suggested by snippets but never observed (chapter weightage, chapter PDFs, paper listings by shift) were built from the brief's specification, and the UI states their basis.
- Features with no reference evidence (timed test engine, accounts, admin) are labelled **original extensions**.
- See `FEATURE_MATRIX.md` for every feature's status.

## Scope (revised by the project owner)

In scope: JEE Main, JEE Advanced, NEET, and engineering entrance exams — MHT CET, BITSAT, COMEDK, WBJEE, KCET, VITEEE, AP EAPCET, TS EAMCET (from the reference list), plus KEAM, GUJCET and OJEE as state-exam extensions not on the reference list.

Out of scope after the revision: IISER IAT, MHT CET Biology, AIIMS, the GATE papers, UPSC, NDA, SSC CGL and CBSE Class 12. These are listed in `data/taxonomy.ts → OUT_OF_SCOPE` and can be added through Admin → Taxonomy.
