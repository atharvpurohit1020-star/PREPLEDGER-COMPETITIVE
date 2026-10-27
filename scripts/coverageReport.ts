/**
 * Writes docs/COVERAGE.md — content coverage by exam, subject, paper and chapter — from the live database.
 *   npm run coverage-report
 */
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../server/db';

async function main() {
  const q = async (sql: string) => (await pool.query(sql)).rows;
  const exams = await q(`
    SELECT e.name, e.on_reference,
      (SELECT count(*) FROM questions x WHERE x.exam_id = e.id AND x.status='published') published,
      (SELECT count(*) FROM questions x WHERE x.exam_id = e.id AND x.status='published' AND x.is_pyq) pyq,
      (SELECT count(*) FROM questions x WHERE x.exam_id = e.id AND x.status='published' AND x.verification_status='verified') verified,
      (SELECT count(*) FROM chapters c JOIN subjects s ON s.id = c.subject_id WHERE s.exam_id = e.id) chapters,
      (SELECT count(*) FROM chapters c JOIN subjects s ON s.id = c.subject_id JOIN chapter_statistics cs ON cs.chapter_id = c.id WHERE s.exam_id = e.id AND cs.question_count > 0) chapters_q,
      (SELECT count(*) FROM papers p WHERE p.exam_id = e.id AND p.kind='past_paper') past_papers,
      (SELECT count(*) FROM papers p WHERE p.exam_id = e.id AND p.kind='past_paper' AND p.availability <> 'metadata_only') past_papers_q
    FROM exams e ORDER BY e.sort_order`);
  const subjects = await q(`
    SELECT e.name exam, s.name, count(c.id) chapters, count(c.id) FILTER (WHERE cs.question_count > 0) chapters_q, COALESCE(sum(cs.question_count),0) questions
    FROM subjects s JOIN exams e ON e.id = s.exam_id JOIN chapters c ON c.subject_id = s.id JOIN chapter_statistics cs ON cs.chapter_id = c.id
    GROUP BY e.name, e.sort_order, s.name, s.sort_order ORDER BY e.sort_order, s.sort_order`);
  const papers = await q(`
    SELECT e.name exam, p.year, p.title, p.kind, p.availability, p.verification_status,
      (SELECT count(*) FROM paper_questions pq WHERE pq.paper_id = p.id) questions
    FROM papers p JOIN exams e ON e.id = p.exam_id ORDER BY e.sort_order, p.year DESC NULLS LAST, p.exam_date DESC NULLS LAST`);
  const chapters = await q(`
    SELECT e.name exam, s.name subject, c.name, cs.question_count, cs.pyq_count
    FROM chapters c JOIN subjects s ON s.id = c.subject_id JOIN exams e ON e.id = s.exam_id JOIN chapter_statistics cs ON cs.chapter_id = c.id
    WHERE cs.question_count > 0 ORDER BY e.sort_order, s.sort_order, c.sort_order`);
  const row = (cells: unknown[]) => `| ${cells.map((c) => String(c ?? '—')).join(' | ')} |`;
  const md = [
    '# Content coverage report',
    '',
    `Generated ${new Date().toISOString()} from the database. Live version: \`/coverage\` in the app.`,
    '',
    '> Counts describe what has been imported. Zero means "not imported yet", not "never examined".',
    '',
    '## By exam',
    '',
    row(['Exam', 'On reference', 'Published Q', 'PYQ', 'Verified', 'Chapters with Q', 'Past papers listed', 'Past papers with Q']),
    row(Array(8).fill('---')),
    ...exams.map((e) => row([e.name, e.on_reference ? 'yes' : 'extension', e.published, e.pyq, e.verified, `${e.chapters_q}/${e.chapters}`, e.past_papers, e.past_papers_q])),
    '',
    '## By subject',
    '',
    row(['Exam', 'Subject', 'Questions', 'Chapters with Q']),
    row(Array(4).fill('---')),
    ...subjects.map((s) => row([s.exam, s.name, s.questions, `${s.chapters_q}/${s.chapters}`])),
    '',
    '## By paper',
    '',
    row(['Exam', 'Year', 'Paper', 'Kind', 'Availability', 'Metadata', 'Questions']),
    row(Array(7).fill('---')),
    ...papers.map((p) => row([p.exam, p.year, p.title, p.kind, p.availability, p.verification_status, p.questions])),
    '',
    '## Chapters with questions',
    '',
    row(['Exam', 'Subject', 'Chapter', 'Questions', 'PYQ']),
    row(Array(5).fill('---')),
    ...chapters.map((c) => row([c.exam, c.subject, c.name, c.question_count, c.pyq_count])),
    '',
  ].join('\n');
  const out = path.resolve(__dirname, '../docs/COVERAGE.md');
  fs.writeFileSync(out, md);
  console.log(`wrote ${out}`);
}

main().then(() => pool.end()).catch((e) => { console.error(e); process.exit(1); });
