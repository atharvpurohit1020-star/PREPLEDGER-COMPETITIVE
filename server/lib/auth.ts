import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { one, pool } from '../db';

const SESSION_DAYS = 30;
export const COOKIE = 'pl_session';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, saltHex, hashHex] = stored.split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

const tokenHash = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

export async function createSession(userId: number): Promise<{ token: string; expires: Date }> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await pool.query('INSERT INTO auth_sessions(token_hash, user_id, expires_at) VALUES ($1,$2,$3)', [tokenHash(token), userId, expires]);
  return { token, expires };
}

export async function destroySession(token: string) {
  await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash(token)]);
}

export interface AuthUser { id: number; email: string; display_name: string; role: 'student' | 'editor' | 'admin'; preferences: Record<string, unknown> }

declare module 'express-serve-static-core' {
  interface Request { user?: AuthUser }
}

/** Attaches req.user when a valid session cookie is present. Never blocks. */
export async function sessionMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      req.user = await one<AuthUser>(
        `SELECT u.id, u.email, u.display_name, u.role, u.preferences FROM auth_sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [tokenHash(token)],
      );
    } catch (e) {
      return next(e);
    }
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Sign in required' });
  next();
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Sign in required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
