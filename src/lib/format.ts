export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00Z' : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: d.length === 10 ? 'UTC' : undefined }) : '—';

export const fmtDateTime = (d: string | null | undefined) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return (h ? `${h}:` : '') + `${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
}

export const examPath = (category: string, exam: string) => `/past-years/${category}/${exam}`;
export const subjectPath = (category: string, exam: string, subject: string) => `${examPath(category, exam)}/${subject}`;
export const chapterPath = (category: string, exam: string, subject: string, chapter: string) => `${subjectPath(category, exam, subject)}/${chapter}`;
export const papersPath = (category: string, exam: string) => `/past-years/year-wise/${category}/${exam}`;
export const paperPath = (category: string, exam: string, slug: string, publicId: string) => `${papersPath(category, exam)}/${slug}/${publicId}`;
export const questionPath = (publicId: string, ctx?: { kind: 'chapter' | 'paper'; paper?: string }) =>
  `/question/${publicId}${ctx?.kind === 'paper' ? `?ctx=paper${ctx.paper ? `&paper=${ctx.paper}` : ''}` : ''}`;
