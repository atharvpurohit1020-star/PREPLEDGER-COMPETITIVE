/**
 * Seed: taxonomy + original sample dataset + paper metadata + admin user.
 *   npm run seed            (idempotent: skips taxonomy/content if already present)
 *   npm run seed -- --reset (drops and recreates the schema first — destroys data)
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildPaperMetadataImport, buildSampleImport } from '../data/sample/sampleDataset';
import { CATEGORIES, EXAMS } from '../data/taxonomy';
import { pool, refreshStats } from '../server/db';
import { env } from '../server/env';
import { hashPassword } from '../server/lib/auth';
import { commitImport } from '../server/lib/importer';
import { migrate } from '../server/migrate';

export async function seed({ reset = false, quiet = false } = {}) {
  const log = (...a: unknown[]) => !quiet && console.log(...a);
  if (reset) {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    log('schema reset');
  }
  await migrate();
  const has = (await pool.query('SELECT count(*)::int n FROM exams')).rows[0].n > 0;
  if (!has) {
    for (const c of CATEGORIES) await pool.query('INSERT INTO exam_categories(slug,name,sort_order) VALUES ($1,$2,$3)', [c.slug, c.name, c.sort]);
    for (const [ei, e] of EXAMS.entries()) {
      const cat = (await pool.query('SELECT id FROM exam_categories WHERE slug=$1', [e.category])).rows[0].id;
      const exam = (
        await pool.query(
          `INSERT INTO exams(category_id,slug,name,short_name,full_name,conducting_body,region,description,marking_scheme,marking_scheme_note,on_reference,sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [cat, e.slug, e.name, e.shortName, e.fullName, e.conductingBody, e.region, e.description, e.markingScheme, e.markingNote, e.onReference, ei],
        )
      ).rows[0].id;
      let sv: number | null = null;
      if (e.slug === 'jee-main') {
        sv = (
          await pool.query(
            `INSERT INTO syllabus_versions(exam_id,label,effective_from_year,is_verified,notes) VALUES ($1,$2,$3,false,$4) RETURNING id`,
            [exam, 'JEE Main revised syllabus (2024 onward)', 2024, 'Chapters marked "removed" reflect the publicly reported 2024 syllabus revision. Not yet verified against the official NTA bulletin in this build.'],
          )
        ).rows[0].id;
      }
      for (const [si, s] of e.subjects.entries()) {
        const sid = (await pool.query('INSERT INTO subjects(exam_id,slug,name,sort_order) VALUES ($1,$2,$3,$4) RETURNING id', [exam, s.slug, s.name, si])).rows[0].id;
        for (const [ci, c] of s.chapters.entries()) {
          const cid = (await pool.query('INSERT INTO chapters(subject_id,slug,name,unit_name,sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING id', [sid, c.slug, c.name, c.unit, ci])).rows[0].id;
          if (sv && c.removed2024) {
            await pool.query(`INSERT INTO chapter_syllabus(chapter_id,syllabus_version_id,status,note) VALUES ($1,$2,'removed',$3)`, [cid, sv, 'Reported as removed from the 2024 syllabus (unverified).']);
          }
        }
      }
    }
    log(`taxonomy: ${EXAMS.length} exams`);
    const sample = buildSampleImport();
    const a = await commitImport(sample, { filename: 'data/sample/sampleDataset.ts', format: 'json' });
    log(`sample dataset: batch #${a.batchId}, ${a.report.counts.questions} questions, ${a.report.warnings.length} warnings`);
    const b = await commitImport(buildPaperMetadataImport(), { filename: 'paper-metadata', format: 'json' });
    log(`paper metadata: batch #${b.batchId}, ${b.report.counts.papers} papers`);
    const out = path.resolve(__dirname, '../data/sample/sample-dataset.json');
    fs.writeFileSync(out, JSON.stringify(sample, null, 2));
  }
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    await pool.query(
      `INSERT INTO users(email,password_hash,display_name,role) VALUES ($1,$2,'Administrator','admin') ON CONFLICT (email) DO NOTHING`,
      [env.ADMIN_EMAIL.toLowerCase(), hashPassword(env.ADMIN_PASSWORD)],
    );
  }
  await refreshStats();
}

if (require.main === module) {
  seed({ reset: process.argv.includes('--reset') })
    .then(() => pool.end())
    .catch((e) => {
      console.error(e.report ? JSON.stringify(e.report, null, 2) : e);
      process.exit(1);
    });
}
