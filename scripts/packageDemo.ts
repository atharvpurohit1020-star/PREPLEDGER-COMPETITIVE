/**
 * Turn dist/demo/index.html into a page fragment for artifact hosting (the host supplies the
 * doctype/html/head/body skeleton). KaTeX's .ttf/.woff fallbacks are dropped; woff2 is kept.
 */
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.resolve(__dirname, '../dist/demo/index.html'), 'utf8');
const head = src.match(/<head>([\s\S]*?)<\/head>/)![1];
const body = src.match(/<body>([\s\S]*?)<\/body>/)![1];
const styles = [...head.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0].replace(/,url\(data:font\/(?:ttf|woff);base64,[^)]*\) format\("(?:truetype|woff)"\)/g, ''));
const scripts = [...head.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const out = [
  '<title>PrepLedger Preview</title>',
  '<meta name="description" content="JEE, NEET and engineering entrance question bank — static preview">',
  ...styles,
  body.trim(),
  ...scripts,
].join('\n');
const file = path.resolve(__dirname, '../dist/demo/prepledger-preview.html');
fs.writeFileSync(file, out);
console.log(`wrote ${file} (${(out.length / 1024 / 1024).toFixed(2)} MB)`);
