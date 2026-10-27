/**
 * Export the published catalogue to data/demo/demo.json for the static (serverless) preview build.
 *   npx tsx scripts/exportDemoData.ts
 * Diagram URLs are inlined as data: URIs so the preview needs no asset server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../server/db';
import { loadQuestions } from '../server/lib/questions';

async function main() {
  const q = async (sql: string) => (await pool.query(sql)).rows;
  const categories = await q('SELECT slug, name, sort_order FROM exam_categories ORDER BY sort_order');
  const exams = await q(`SELECT e.id, e.slug, e.name, e.short_name, e.full_name, e.conducting_body, e.region, e.description, e.on_reference,
      e.marking_scheme, e.marking_scheme_note, e.marking_scheme_verified, ec.slug category_slug, ec.name category_name
    FROM exams e JOIN exam_categories ec ON ec.id = e.category_id ORDER BY ec.sort_order, e.sort_order`);
  const subjects = await q('SELECT id, exam_id, slug, name FROM subjects ORDER BY exam_id, sort_order');
  const chapters = await q(`SELECT c.id, c.subject_id, c.slug, c.name, c.unit_name,
      (SELECT json_agg(json_build_object('status', x.status, 'note', x.note, 'version', sv.label, 'verified', sv.is_verified))
         FROM chapter_syllabus x JOIN syllabus_versions sv ON sv.id = x.syllabus_version_id WHERE x.chapter_id = c.id) syllabus
    FROM chapters c ORDER BY c.subject_id, c.sort_order`);
  const topics = await q('SELECT chapter_id, slug, name FROM topics ORDER BY sort_order, name');
  const syllabus = await q('SELECT exam_id, label, effective_from_year, is_verified, notes FROM syllabus_versions');
  const papers = await q(`SELECT p.id, p.exam_id, p.public_id, p.slug, p.title, p.kind, p.year, p.session, p.exam_date, p.shift, p.paper_number, p.language,
      p.duration_minutes, p.total_marks, p.marking_scheme, p.sections, p.availability, p.verification_status, p.notes,
      sr.title source_title, sr.source_type, sr.license
    FROM papers p LEFT JOIN source_records sr ON sr.id = p.source_record_id WHERE p.status = 'published'
    ORDER BY p.year DESC NULLS LAST, p.exam_date DESC NULLS LAST, p.paper_number NULLS LAST, p.shift DESC NULLS LAST, p.title`);
  const links = await q(`SELECT pq.paper_id, pq.question_id, pq.question_number, pq.section_key, pq.marks, pq.negative_marks
    FROM paper_questions pq JOIN questions q ON q.id = pq.question_id WHERE q.status = 'published' ORDER BY pq.paper_id, pq.question_number`);
  const ids = (await q(`SELECT id FROM questions WHERE status = 'published' ORDER BY id`)).map((r) => r.id);
  const questions = await loadQuestions(ids, { withHistory: true });
  const meta = await q(`SELECT q.id, q.chapter_id, q.subject_id, q.exam_id, q.search_text, q.created_at,
      ARRAY(SELECT chapter_id FROM question_chapter_tags t WHERE t.question_id = q.id) tagged
    FROM questions q WHERE q.status = 'published'`);
  const metaById = new Map(meta.map((m) => [m.id, m]));
  const dataUri = (url: string) => {
    if (!url.startsWith('/assets/')) return url;
    const file = path.resolve(__dirname, '../public', url.slice(1));
    const ext = path.extname(file).slice(1);
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  };
  for (const qq of questions) {
    for (const d of Object.values(qq.diagrams) as any[]) d.url = dataUri(d.url);
    const m = metaById.get(qq.id)!;
    Object.assign(qq, { _chapter_id: m.chapter_id, _subject_id: m.subject_id, _exam_id: m.exam_id, _search: m.search_text, _created: m.created_at, _tagged: m.tagged });
  }
  const out = { generated_at: new Date().toISOString(), categories, exams, subjects, chapters, topics, syllabus, papers, links, questions };
  const file = path.resolve(__dirname, '../data/demo/demo.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`wrote ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${questions.length} questions, ${papers.length} papers)`);
}

main().then(() => pool.end()).catch((e) => { console.error(e); process.exit(1); });
