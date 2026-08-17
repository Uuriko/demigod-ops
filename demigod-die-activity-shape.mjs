/** Shape hosted DIE activity rows. Codex owns the HTTP/UI claim; this is the
 *  unclaimed neighbor for when empty `rows: []` grows into receipts.
 *  WEBAPP-PLAN §4.2: actor, time, entity, action, before/after version,
 *  idempotency key, result. Never keep candidate contact/resume/email.
 */
export const ACTIVITY_LIST_SCHEMA = 'demigod.die-activity-list/1';
export const ACTIVITY_ROW_KEYS = [
  'id',
  'at',
  'actor',
  'entity',
  'action',
  'beforeVersion',
  'afterVersion',
  'idempotencyKey',
  'result',
];
export const ACTIVITY_POLICY =
  'Hosted workflow receipts only. Local operations, agent, ship, and machine activity are excluded.';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function shapeActivityRow(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return null;
  const row = {};
  for (const key of ACTIVITY_ROW_KEYS) {
    if (receipt[key] == null) continue;
    const value = receipt[key];
    if (typeof value === 'string' && EMAIL.test(value)) return null;
    row[key] = value;
  }
  if (!row.action && !row.id) return null;
  if (EMAIL.test(JSON.stringify(row))) return null;
  return row;
}

export function projectActivityList({
  receipts = [],
  entity = null,
  limit = 20,
  cursor = 0,
} = {}) {
  const wanted = entity ? String(entity) : null;
  const start = Number.isFinite(Number(cursor)) ? Math.max(0, Number(cursor)) : 0;
  const lim = Math.min(50, Math.max(1, Number(limit) || 20));
  const rows = [];
  for (const receipt of receipts) {
    if (wanted && receipt?.entity !== wanted) continue;
    const row = shapeActivityRow(receipt);
    if (row) rows.push(row);
  }
  const slice = rows.slice(start, start + lim);
  return {
    schema: ACTIVITY_LIST_SCHEMA,
    entity: wanted,
    limit: lim,
    cursor: start,
    nextCursor: start + slice.length < rows.length ? start + slice.length : null,
    total: rows.length,
    rows: slice,
    state: rows.length ? 'ok' : 'no_hosted_mutations',
    policy: ACTIVITY_POLICY,
  };
}
