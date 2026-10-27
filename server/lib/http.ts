import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/** Wrap an async handler: its resolved value is sent as JSON; thrown errors go to the error middleware. */
export function wrap(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res)
      .then((out) => {
        if (!res.headersSent && out !== undefined) res.json(out);
      })
      .catch(next);
  };
}

export function body<T extends z.ZodTypeAny>(schema: T, req: Request): z.infer<T> {
  const r = schema.safeParse(req.body);
  if (!r.success) throw new HttpError(400, 'Invalid request body', r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
}
