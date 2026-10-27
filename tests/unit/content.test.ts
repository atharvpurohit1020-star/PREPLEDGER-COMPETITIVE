import { describe, expect, it } from 'vitest';
import { diagramRefs, escapeHtml, renderContent, toPlainText } from '../../shared/content';

describe('renderContent', () => {
  it('renders inline and display math with KaTeX', () => {
    const html = renderContent('Energy $E = mc^2$ and\n\n$$\\int_0^1 x\\,dx$$');
    expect(html).toContain('class="katex"');
    expect(html).toContain('katex-display');
    expect(html).not.toContain('katex-error');
  });
  it('renders chemistry via mhchem', () => {
    const html = renderContent('$\\ce{Zn + Cu^2+ -> Zn^2+ + Cu}$');
    expect(html).not.toContain('katex-error');
    expect(html).toContain('katex');
  });
  it('marks invalid TeX with katex-error instead of throwing', () => {
    expect(renderContent('$\\frac{1}{$')).toContain('katex-error');
  });
  it('escapes HTML in text (no injection)', () => {
    const html = renderContent('<script>alert(1)</script> **bold** <img src=x onerror=alert(1)>');
    expect(html).not.toMatch(/<script|<img src=x/);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<strong>bold</strong>');
  });
  it('renders pipe tables with header', () => {
    const html = renderContent('| a | b |\n|---|---|\n| $x$ | 2 |');
    expect(html).toContain('<thead><tr><th>a</th><th>b</th></tr></thead>');
    expect(html).toContain('<td>2</td>');
  });
  it('renders bullet lists', () => {
    expect(renderContent('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
  });
  it('resolves diagrams with alt text and zoom button', () => {
    const html = renderContent('![A block on an incline](diagram:d1)', { diagrams: { d1: { public_id: 'd1', url: '/assets/diagrams/x.svg', alt_text: 'fallback', caption: 'Fig 1', width: 10, height: 5 } } });
    expect(html).toContain('alt="A block on an incline"');
    expect(html).toContain('data-zoom-src="/assets/diagrams/x.svg"');
    expect(html).toContain('<figcaption>Fig 1</figcaption>');
  });
  it('shows an explicit placeholder for missing diagrams', () => {
    expect(renderContent('![circuit](diagram:missing)')).toContain('Diagram unavailable');
  });
  it('rejects unsafe image URLs', () => {
    expect(renderContent('![x](javascript:alert(1))')).toContain('Unsupported image source');
  });
  it('keeps display math spanning blank-free lines intact', () => {
    const html = renderContent('Text\n$$\\begin{vmatrix} 1 & 2 \\\\ 3 & 4 \\end{vmatrix}$$\nmore');
    expect(html).not.toContain('katex-error');
  });
});

describe('helpers', () => {
  it('toPlainText strips markup for search', () => {
    expect(toPlainText('Find $\\frac{a}{b}$ of **x** ![alt](diagram:z)')).toBe('Find a/b of x alt');
  });
  it('diagramRefs lists diagram ids', () => {
    expect(diagramRefs('![a](diagram:one) and ![b](diagram:two)')).toEqual(['one', 'two']);
  });
  it('escapeHtml', () => {
    expect(escapeHtml(`<"'&>`)).toBe('&lt;&quot;&#39;&amp;&gt;');
  });
});
