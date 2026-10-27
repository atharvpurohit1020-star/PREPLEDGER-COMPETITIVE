import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './env';
import { one } from './db';
import { sessionMiddleware } from './lib/auth';
import { HttpError } from './lib/http';
import { logger } from './logger';
import { accountRouter } from './routes/account';
import { adminRouter } from './routes/admin';
import { pdfRouter } from './routes/pdf';
import { publicRouter } from './routes/public';
import { testsRouter } from './routes/tests';

const WEB_DIR = path.resolve(__dirname, '../dist/web');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // KaTeX emits inline style attributes
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => !req.url?.startsWith('/api') } }));
  app.use(cookieParser());
  app.use(express.json({ limit: '12mb' }));

  // CSRF defence for cookie-authenticated mutations: require same-origin JSON requests.
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const ct = req.headers['content-type'] ?? '';
    const origin = req.headers.origin;
    if (req.headers['content-length'] && req.headers['content-length'] !== '0' && !ct.includes('application/json')) return res.status(415).json({ error: 'JSON body required' });
    if (origin && origin !== env.PUBLIC_ORIGIN && !sameHost(origin, req.headers.host) && !origin.startsWith(`http://localhost`) && !origin.startsWith('http://127.0.0.1')) return res.status(403).json({ error: 'Cross-origin request rejected' });
    next();
  });

  const limiter = (windowMs: number, limit: number) => rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => env.NODE_ENV === 'test', message: { error: 'Too many requests, please slow down.' } });
  app.use('/api/auth/login', limiter(15 * 60_000, 20));
  app.use('/api/auth/register', limiter(60 * 60_000, 10));
  app.use('/api/reports', limiter(60 * 60_000, 30));
  app.use('/api/pdf', limiter(10 * 60_000, 20));
  app.use('/api/admin/imports', limiter(10 * 60_000, 60));
  app.use('/api', limiter(60_000, 600));

  app.use('/api', sessionMiddleware);
  app.get('/api/health', async (_req, res) => {
    await one('SELECT 1');
    res.json({ ok: true });
  });
  app.use('/api', publicRouter);
  app.use('/api', testsRouter);
  app.use('/api', accountRouter);
  app.use('/api', pdfRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  app.use('/assets/diagrams', express.static(path.join(PUBLIC_DIR, 'assets/diagrams'), { maxAge: '7d', fallthrough: false }));
  if (fs.existsSync(WEB_DIR)) {
    // hashed build assets are immutable; a missing asset must 404, never fall through to the SPA
    app.use('/assets', express.static(path.join(WEB_DIR, 'assets'), { maxAge: '1y', immutable: true, fallthrough: false }));
    app.use(express.static(WEB_DIR, { index: false, maxAge: '1h' }));
    let indexHtml = '';
    let indexMtime = 0;
    app.get('*', async (req, res, next) => {
      try {
        if (path.extname(req.path)) return res.status(404).type('text').send('Not found');
        const st = fs.statSync(path.join(WEB_DIR, 'index.html'));
        if (st.mtimeMs !== indexMtime) {
          indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
          indexMtime = st.mtimeMs;
        }
        const status = (await routeExists(req.path)) ? 200 : 404;
        res.status(status).type('html').setHeader('Cache-Control', 'no-cache').send(indexHtml);
      } catch (e) {
        next(e);
      }
    });
  }

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    if (err?.status === 404 || err?.statusCode === 404) return res.status(404).json({ error: 'Not found' });
    req.log?.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

function sameHost(origin: string, host: string | undefined) {
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

const STATIC_ROUTES =new Set(['/', '/search', '/coverage', '/about', '/login', '/register', '/account', '/practice', '/test/custom']);

/** Server-side existence check so unknown deep links return HTTP 404 (the SPA still renders its 404 page). */
export async function routeExists(p: string): Promise<boolean> {
  const clean = p.replace(/\/+$/, '') || '/';
  if (STATIC_ROUTES.has(clean) || clean.startsWith('/admin') || clean.startsWith('/account/')) return true;
  let m: RegExpMatchArray | null;
  if ((m = clean.match(/^\/past-years\/year-wise\/([a-z0-9-]+)\/([a-z0-9-]+)(?:\/([a-z0-9-]+)\/([a-z0-9]+))?$/))) {
    if (!m[3]) return !!(await one('SELECT 1 FROM exams e JOIN exam_categories c ON c.id = e.category_id WHERE c.slug = $1 AND e.slug = $2', [m[1], m[2]]));
    return !!(await one(`SELECT 1 FROM papers p JOIN exams e ON e.id = p.exam_id WHERE e.slug = $1 AND p.public_id = $2 AND p.status = 'published'`, [m[2], m[4]]));
  }
  if ((m = clean.match(/^\/past-years\/([a-z0-9-]+)\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?(?:\/([a-z0-9-]+))?$/))) {
    if (!(await one('SELECT 1 FROM exams e JOIN exam_categories c ON c.id = e.category_id WHERE c.slug = $1 AND e.slug = $2', [m[1], m[2]]))) return false;
    if (!m[3]) return true;
    if (!m[4]) return !!(await one('SELECT 1 FROM subjects s JOIN exams e ON e.id = s.exam_id WHERE e.slug = $1 AND s.slug = $2', [m[2], m[3]]));
    return !!(await one('SELECT 1 FROM chapters c JOIN subjects s ON s.id = c.subject_id JOIN exams e ON e.id = s.exam_id WHERE e.slug = $1 AND s.slug = $2 AND c.slug = $3', [m[2], m[3], m[4]]));
  }
  if ((m = clean.match(/^\/question\/([a-z0-9]+)$/))) return !!(await one(`SELECT 1 FROM questions WHERE public_id = $1 AND status = 'published'`, [m[1]]));
  if ((m = clean.match(/^\/test\/paper\/([a-z0-9]+)$/))) return !!(await one(`SELECT 1 FROM papers WHERE public_id = $1 AND status = 'published'`, [m[1]]));
  if ((m = clean.match(/^\/test\/attempt\/([a-z0-9]+)$/))) return true;
  if ((m = clean.match(/^\/print\/(chapter|paper)\//))) return true;
  return false;
}
