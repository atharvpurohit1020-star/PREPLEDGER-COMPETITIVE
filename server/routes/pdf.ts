import { Router } from 'express';
import type { Browser } from 'playwright';
import { z } from 'zod';
import { env } from '../env';
import { HttpError, wrap } from '../lib/http';
import { logger } from '../logger';
import { parseQuery } from './public';

export const pdfRouter = Router();

let browserPromise: Promise<Browser> | null = null;
async function browser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = import('playwright')
      .then(({ chromium }) => chromium.launch({ executablePath: env.CHROMIUM_PATH }))
      .catch((e) => {
        browserPromise = null;
        throw e;
      });
  }
  return browserPromise;
}

export async function closePdfBrowser() {
  if (browserPromise) (await browserPromise.catch(() => null))?.close();
  browserPromise = null;
}

const q = z.object({
  path: z.string().regex(/^\/print\/(chapter|paper)\/[A-Za-z0-9/_-]+(\?[A-Za-z0-9=&_.-]*)?$/, 'path must be a /print/ page'),
  filename: z.string().regex(/^[A-Za-z0-9._ -]{1,120}$/).default('prepledger.pdf'),
});

/**
 * Server-side PDF export: renders our own print page in headless Chromium so KaTeX output,
 * diagrams and page breaks match the on-screen print preview exactly.
 */
pdfRouter.get('/pdf', wrap(async (req, res) => {
  const { path, filename } = parseQuery(q, req);
  let b: Browser;
  try {
    b = await browser();
  } catch (e) {
    logger.error({ err: e }, 'pdf: chromium unavailable');
    throw new HttpError(503, 'PDF export is unavailable on this server (headless browser not installed). Use the print preview and your browser’s “Save as PDF” instead.');
  }
  const ctx = await b.newContext();
  try {
    const page = await ctx.newPage();
    const url = `http://127.0.0.1:${env.PORT}${path}`;
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new HttpError(resp?.status() === 404 ? 404 : 502, 'The requested page could not be rendered');
    await page.waitForSelector('[data-print-state]', { timeout: 20000 });
    const state = await page.getAttribute('[data-print-state]', 'data-print-state');
    if (state !== 'ready') {
      const msg = (await page.textContent('[data-print-state]'))?.trim().slice(0, 300);
      throw new HttpError(state === 'notfound' ? 404 : 409, msg || 'Nothing to export');
    }
    await page.evaluate(() => document.fonts?.ready);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666">PrepLedger · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.endsWith('.pdf') ? filename : filename + '.pdf'}"`);
    res.send(pdf);
  } finally {
    await ctx.close();
  }
}));
