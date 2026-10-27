import crypto from 'node:crypto';
import { toPlainText } from '../../shared/content';

/** Stable 8-char public id derived from an external ref (so re-imports keep URLs stable). */
export function publicIdFor(ref: string, prefix = ''): string {
  const h = crypto.createHash('sha1').update(prefix + ref).digest();
  return BigInt('0x' + h.subarray(0, 8).toString('hex')).toString(36).padStart(12, '0').slice(-8);
}

export function randomPublicId(): string {
  return crypto.randomBytes(6).readUIntBE(0, 6).toString(36).padStart(8, '0').slice(-8);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function titleFromSlug(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalised content hash used for duplicate detection (case/whitespace/markup-insensitive). */
export function contentHash(body: string, options: { body: string }[] = []): string {
  const norm = (s: string) => toPlainText(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const opts = options.map((o) => norm(o.body)).sort().join('|');
  return crypto.createHash('sha256').update(norm(body) + '||' + opts).digest('hex');
}

export function searchTextFor(body: string, options: { body: string }[] = [], passage?: string | null): string {
  return [passage ?? '', body, ...options.map((o) => o.body)].map(toPlainText).join(' ').slice(0, 20000);
}
