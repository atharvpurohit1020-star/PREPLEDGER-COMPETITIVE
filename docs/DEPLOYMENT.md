# Deployment guide

## Requirements
- Node.js ≥ 20 (tested on 22), PostgreSQL ≥ 14 with the `pg_trgm` extension available
- Chromium for server-side PDF export (`npx playwright install --with-deps chromium`, or set `CHROMIUM_PATH`). Without it, `/api/pdf` returns 503 with a message pointing users to browser print-to-PDF.

## Environment variables
Validated at startup by `server/env.ts`; the process refuses to start with a readable error if any are invalid. Template: `.env.example`.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/db` |
| `SESSION_SECRET` | yes | ≥ 32 random characters |
| `PUBLIC_ORIGIN` | recommended | Exact public origin; cross-origin mutations from other origins are rejected |
| `PORT` | no | Default 4000 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | for the first seed | Creates the first admin; change the password afterwards |
| `CHROMIUM_PATH` | no | Custom Chromium binary for PDFs |
| `LOG_LEVEL` | no | pino level (default `info`) |
| `NODE_ENV` | no | `production` enables `Secure` cookies |

## Docker Compose
```bash
export SESSION_SECRET=$(openssl rand -hex 32) ADMIN_PASSWORD='choose-a-strong-one'
docker compose up -d --build
docker compose exec app npx tsx scripts/seed.ts   # taxonomy, sample set, paper metadata, admin user
```
Uploaded diagrams are written to the `uploads` volume. Migrations run automatically at startup.

> The Dockerfile and compose file were written but **not built in this environment** (no Docker daemon was available). Build them once in CI before relying on them.

## Bare metal / PaaS
```bash
npm ci
npm run build             # client → dist/web
npm run seed              # first deploy only (idempotent)
NODE_ENV=production npm start
```
Put a TLS-terminating proxy (nginx, Caddy, a platform router) in front. `trust proxy` is enabled for correct client IPs in rate limiting.

## Security controls already in place
- Helmet security headers with a strict CSP (scripts from `self` only; inline styles allowed because KaTeX needs them), `frame-ancestors 'none'`
- Session cookies: `HttpOnly`, `SameSite=Lax`, and `Secure` in production; tokens are stored hashed
- CSRF defence: mutations must be JSON and same-origin (`Origin` checked)
- Rate limits: login 20 / 15 min, register 10 / h, reports 30 / h, PDF 20 / 10 min, imports 60 / 10 min, overall API 600 / min
- Input validation with zod on every endpoint; parameterised SQL throughout
- Upload sniffing; SVGs containing scripts, event handlers or `foreignObject` are rejected
- Structured request logging (pino-http) for API routes

## Operations
- Health: `GET /api/health`
- Backups: standard `pg_dump`; uploads live in `public/assets/diagrams/uploads`
- Coverage snapshot: `npm run coverage-report` → `docs/COVERAGE.md`
- Content rollback: Admin → Imports → Roll back (archives the batch's questions and keeps student history)
