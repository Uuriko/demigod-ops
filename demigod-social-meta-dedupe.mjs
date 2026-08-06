/**
 * Canonical social/search meta: prefer honest long copy; drop duplicates.
 * Used by unit tests and kept in sync with head early script (dg-meta-dedupe).
 */
export function scoreSocialMetaContent(text) {
  const t = String(text || '');
  let n = 0;
  if (/mutual yes/i.test(t)) n += 4;
  if (/first[- ]?year base|first result|concrete first result/i.test(t)) n += 3;
  if (/10%/.test(t)) n += 2;
  if (/human review|humans review|human-reviewed/i.test(t)) n += 1;
  if (t.length > 90) n += 1;
  if (/tech ranks fit/i.test(t)) n -= 2;
  if (!t.trim()) n -= 10;
  return n;
}

/** @param {string[]} contents @returns {number} winning index */
export function pickSocialMetaWinner(contents) {
  const list = Array.isArray(contents) ? contents : [];
  if (!list.length) return -1;
  let best = 0;
  let bestS = scoreSocialMetaContent(list[0]);
  for (let i = 1; i < list.length; i++) {
    const s = scoreSocialMetaContent(list[i]);
    const longer =
      s === bestS &&
      String(list[i] || '').length > String(list[best] || '').length;
    if (s > bestS || longer) {
      best = i;
      bestS = s;
    }
  }
  return best;
}

/**
 * Group meta-like records by key; return kept content + drop indices.
 * @param {{ key: string, content: string }[]} items
 */
export function planSocialMetaDedupe(items) {
  const groups = new Map();
  (items || []).forEach((it, idx) => {
    const key = String(it?.key || '');
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ idx, content: String(it.content || '') });
  });
  const keep = [];
  const drop = [];
  for (const [, rows] of groups) {
    if (rows.length === 1) {
      keep.push(rows[0].idx);
      continue;
    }
    const win = pickSocialMetaWinner(rows.map((r) => r.content));
    rows.forEach((r, j) => (j === win ? keep.push(r.idx) : drop.push(r.idx)));
  }
  return { keep, drop };
}
