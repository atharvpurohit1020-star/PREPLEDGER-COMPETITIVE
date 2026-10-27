# Question content format

Question bodies, options, list items, passages and solutions all use the same markup, rendered by `shared/content.ts`. Every piece of literal text is HTML-escaped, so markup cannot inject HTML.

| Need | Write |
|---|---|
| Paragraph | Separate with a blank line (a single newline becomes a line break) |
| Inline maths | `$v = u + at$` |
| Display maths | `$$\int_0^1 x^2\,dx$$` (may span lines) |
| Chemistry | `$\ce{2H2 + O2 -> 2H2O}$`, `$\ce{N2 + 3H2 <=> 2NH3}$` (mhchem) |
| Units | `$9.8\ \text{m s}^{-2}$` |
| Vectors | `$\vec{a} = \hat{i} + 2\hat{j}$` |
| Matrices / determinants | `$$\begin{vmatrix} 1 & 2 \\ 3 & 4 \end{vmatrix}$$` |
| Bold / italic / code | `**bold**`, `*italic*`, `` `code` `` |
| Table | Pipe table; a `|---|---|` second row makes the first row a header |
| Bullet list | Lines starting with `- ` |
| Diagram | `![Alt text describing everything the student needs](diagram:DIAGRAM_ID)` |
| Literal dollar | `\$` |

**Matrix-match** questions keep List-I and List-II in the `matrix` field (`{"left":[{"key":"P","body":"…"}],"right":[{"key":"1","body":"…"}]}`). The coded choices go in `options`.

**Assertion–reason** questions put the statements in the body as `**Assertion (A):** …` and `**Reason (R):** …`, followed by the four standard options.

**Passage** questions reference a shared passage by `passage` ref. Each question still has its own type and answer.

**Answers:** `{"options":["B"]}`, `{"options":["A","C"]}` (multi-correct), `{"numeric":2.5,"tolerance":0.01}`, `{"range":[0.62,0.64]}`.

The importer rejects any formula that KaTeX cannot render and any diagram reference that doesn't resolve.
