/**
 * PrepLedger content markup → HTML.
 *
 * Supported syntax (documented in docs/CONTENT_FORMAT.md):
 *   - Paragraphs separated by a blank line; single newlines become <br>.
 *   - Inline math  $...$   and display math  $$...$$  (KaTeX; \ce{} chemistry via mhchem).
 *   - **bold**, *italic*, `code`.
 *   - Pipe tables:  | a | b |  (second row of dashes marks a header row).
 *   - Bullet lists: lines beginning with "- ".
 *   - Diagrams:  ![alt text](diagram:PUBLIC_ID)  resolved against the supplied diagram map.
 *
 * All literal text is HTML-escaped; only the tags generated here are emitted, so the
 * output is safe to inject with dangerouslySetInnerHTML.
 */
import katex from 'katex';
import 'katex/contrib/mhchem';
import type { DiagramRef } from './types';

export interface RenderOptions {
  diagrams?: Record<string, DiagramRef>;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderMath(tex: string, display: boolean): string {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml', trust: false });
}

const PLACEHOLDER = '\u0000';

/** Render inline markup (math, bold, italic, code, diagrams) inside one block of text. */
export function renderInline(text: string, opts: RenderOptions = {}): string {
  const tokens: string[] = [];
  const stash = (html: string) => {
    tokens.push(html);
    return `${PLACEHOLDER}${tokens.length - 1}${PLACEHOLDER}`;
  };
  let s = text;
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => stash(`<span class="math-display">${renderMath(tex.trim(), true)}</span>`));
  s = s.replace(/\\\$/g, () => stash('$'));
  s = s.replace(/\$([^$\n]+?)\$/g, (_, tex) => stash(renderMath(tex, false)));
  s = s.replace(/`([^`]+)`/g, (_, c) => stash(`<code>${escapeHtml(c)}</code>`));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => stash(renderImage(alt, src, opts)));
  s = escapeHtml(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  s = s.replace(/\n/g, '<br>');
  return s.replace(new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, 'g'), (_, i) => tokens[Number(i)]);
}

function renderImage(alt: string, src: string, opts: RenderOptions): string {
  let url: string | null = null;
  let caption: string | null | undefined;
  let w: number | null | undefined;
  let h: number | null | undefined;
  let altText = alt;
  if (src.startsWith('diagram:')) {
    const d = opts.diagrams?.[src.slice(8)];
    if (!d) {
      return `<span class="diagram-missing" role="img" aria-label="${escapeHtml(alt || 'Diagram')}">Diagram unavailable: ${escapeHtml(alt || src.slice(8))}</span>`;
    }
    url = d.url;
    caption = d.caption;
    w = d.width;
    h = d.height;
    altText = alt || d.alt_text;
  } else if (/^(\/|https:\/\/)/.test(src)) {
    url = src;
  } else {
    return `<span class="diagram-missing">Unsupported image source</span>`;
  }
  const dims = w && h ? ` width="${w}" height="${h}"` : '';
  const cap = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '';
  return (
    `<figure class="q-figure"><button type="button" class="zoomable" data-zoom-src="${escapeHtml(url)}" data-zoom-alt="${escapeHtml(altText)}" aria-label="Enlarge diagram: ${escapeHtml(altText)}">` +
    `<img src="${escapeHtml(url)}" alt="${escapeHtml(altText)}" loading="lazy"${dims}></button>${cap}</figure>`
  );
}

function renderTable(lines: string[], opts: RenderOptions): string {
  const rows = lines.map((l) =>
    l
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim()),
  );
  let head: string[] | null = null;
  if (rows.length > 1 && rows[1].every((c) => /^:?-{2,}:?$/.test(c))) {
    head = rows[0];
    rows.splice(0, 2);
  }
  const th = head ? `<thead><tr>${head.map((c) => `<th>${renderInline(c, opts)}</th>`).join('')}</tr></thead>` : '';
  const tb = rows.map((r) => `<tr>${r.map((c) => `<td>${renderInline(c, opts)}</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap"><table class="q-table">${th}<tbody>${tb}</tbody></table></div>`;
}

/** Split text into blocks while keeping $$...$$ spanning blank lines intact. */
function splitBlocks(src: string): string[] {
  const out: string[] = [];
  let buf: string[] = [];
  let inDisplay = false;
  for (const line of src.replace(/\r\n/g, '\n').split('\n')) {
    const count = (line.match(/\$\$/g) || []).length;
    if (!inDisplay && line.trim() === '') {
      if (buf.length) out.push(buf.join('\n'));
      buf = [];
      continue;
    }
    buf.push(line);
    if (count % 2 === 1) inDisplay = !inDisplay;
  }
  if (buf.length) out.push(buf.join('\n'));
  return out;
}

export function renderContent(src: string | null | undefined, opts: RenderOptions = {}): string {
  if (!src) return '';
  return splitBlocks(src)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => l.trim().startsWith('|'))) return renderTable(lines, opts);
      if (lines.every((l) => /^\s*- /.test(l))) {
        return `<ul>${lines.map((l) => `<li>${renderInline(l.replace(/^\s*- /, ''), opts)}</li>`).join('')}</ul>`;
      }
      const trimmed = block.trim();
      if (/^\$\$[\s\S]*\$\$$/.test(trimmed) && (trimmed.match(/\$\$/g) || []).length === 2) {
        return `<div class="math-block">${renderMath(trimmed.slice(2, -2).trim(), true)}</div>`;
      }
      if (/^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) return renderInline(trimmed, opts);
      return `<p>${renderInline(block, opts)}</p>`;
    })
    .join('');
}

/** Plain-text projection used for search indexing and duplicate hashing. */
export function toPlainText(src: string): string {
  return src
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, ' $1 ')
    .replace(/\\ce\{([^}]*)\}/g, ' $1 ')
    .replace(/\\(?:frac|dfrac|tfrac)\{([^}]*)\}\{([^}]*)\}/g, ' $1/$2 ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}$|*`^_\\]/g, ' ')
    .replace(/-{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns diagram ids referenced in content. */
export function diagramRefs(src: string): string[] {
  return [...src.matchAll(/!\[[^\]]*\]\(diagram:([^)\s]+)\)/g)].map((m) => m[1]);
}
