#!/usr/bin/env node
/**
 * Poll lobby /stats (+ optional health assets) for announcement-day ops.
 * Exits 1 on --once if stats/health hard-fail (for cron / audit pairing).
 *
 *   node dasha-lobby-watch.mjs
 *   node dasha-lobby-watch.mjs --once
 */
const url = process.env.LOBBY_STATS_URL || 'https://lobby.getdasha.com/stats';
const healthUrl = process.env.LOBBY_HEALTH_URL || 'https://lobby.getdasha.com/health';
const every = Number(process.env.LOBBY_WATCH_MS) || 30_000;
const once = process.argv.includes('--once');
const FETCH_MS = Number(process.env.DASHA_AUDIT_FETCH_MS) || 12_000;

async function getJson(u) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const r = await fetch(u, { cache: 'no-store', signal: ctrl.signal });
    const j = await r.json();
    return { ok: r.ok, status: r.status, j };
  } finally {
    clearTimeout(t);
  }
}

async function tick() {
  try {
    const [stats, health] = await Promise.all([getJson(url), getJson(healthUrl)]);
    const j = stats.j || {};
    const h = health.j || {};
    const alerts = [];
    if (!stats.ok || j.ok !== true) alerts.push('STATS_BAD');
    if (!health.ok || h.ok !== true) alerts.push('HEALTH_BAD');
    if (h.assets == null) alerts.push('NO_ASSETS');
    if (j.xLink === false) alerts.push('OAUTH_OFF');
    if ((j.count || 0) >= (j.max || 80) * 0.9) alerts.push('NEAR_FULL');
    const line = [
      new Date().toISOString().slice(11, 19),
      `n=${j.count ?? '?'}`,
      `linked=${j.linked ?? 0}`,
      `cpm=${j.chatsPerMin ?? 0}`,
      `fullRej=${j.rejectsFull ?? 0}`,
      `ipRej=${j.rejectsIp ?? 0}`,
      j.shield || j.forceShield ? 'SHIELD' : 'open',
      j.slow ? 'SLOW' : 'fast',
      j.xLink ? 'oauth:ok' : 'oauth:off',
      h.assets ? `assets:${String(h.assets).slice(0, 8)}` : 'assets:?',
      alerts.length ? `!${alerts.join(',')}` : 'ok',
    ].join('  ');
    console.log(line);
    return { ok: alerts.length === 0, alerts };
  } catch (e) {
    console.log(new Date().toISOString().slice(11, 19), 'ERR', e.message || e);
    return { ok: false, alerts: ['ERR'] };
  }
}

console.log('watching', url, 'every', every + 'ms', once ? '(once)' : '');
const first = await tick();
if (once) process.exit(first.ok ? 0 : 1);
setInterval(tick, every);
