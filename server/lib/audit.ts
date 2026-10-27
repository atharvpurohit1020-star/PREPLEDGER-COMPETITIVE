import type { Db } from '../db';

export async function audit(db: Db, actorId: number | null, action: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await db.query('INSERT INTO audit_log(actor_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)', [actorId, action, entityType, entityId, details]);
}
