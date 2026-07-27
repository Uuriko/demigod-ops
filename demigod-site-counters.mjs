#!/usr/bin/env node
// Live honest "trust strip" counters for the site, computed ONLY from board-verified coverage in the
// startup map — no estimates, no census overclaim. The map's own caveat says it's an open-data proxy,
// NOT a startup census, so these labels stick to what was actually fetched: companies with verified open
// roles on their public ATS board, roles tracked, YC-jobs-linked. Each counter appears ONLY if its real
// backing value is present and positive (honesty invariant — never fabricate a number to fill the strip).
//
//   node demigod-site-counters.mjs [--json]     # reads DEMIGOD-SF-STARTUP-MAP.json, prints strip
//   node demigod-site-counters.mjs --selftest
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));

// pure: map -> [{key, value, label}] using ONLY verified coverage fields. Omits any counter whose backing
// value is missing/non-positive (so a partial map degrades honestly instead of showing a fake 0/estimate).
export function siteCounters(map = {}) {
  const cov = map?.coverage || {};
  const num = (x) => (Number.isFinite(x) && x > 0 ? x : null);
  const rolesTracked = Object.values(cov.roleMix || {}).reduce((s, n) => s + (Number(n) || 0), 0);
  const out = [];
  const hiring = num(cov.companiesWithOpenRoles);
  if (hiring) out.push({ key: 'companiesHiring', value: hiring, label: 'SF companies with verified open roles' });
  if (rolesTracked > 0) out.push({ key: 'rolesTracked', value: rolesTracked, label: `open roles tracked${cov.openRolesAt ? ` · as of ${cov.openRolesAt}` : ''}` });
  const yc = num(cov.companiesWithYcJobsLink);
  if (yc) out.push({ key: 'ycLinked', value: yc, label: 'linked to their YC jobs page' });
  return out;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => Number(n).toLocaleString('en-US');

// self-contained fragment (inline styles, theme-neutral) — drop anywhere. Empty counters -> empty string.
export function countersFragment(counters = []) {
  if (!counters.length) return '';
  const cells = counters.map((c) => `<div style="flex:1 1 140px;min-width:120px"><div style="font:600 clamp(22px,4vw,32px)/1 ui-monospace,monospace;color:#08a05d">${fmt(c.value)}</div><div style="font:400 12px/1.4 system-ui,sans-serif;color:#7f978c;margin-top:4px">${esc(c.label)}</div></div>`).join('');
  return `<div role="group" aria-label="Demigod coverage" style="display:flex;flex-wrap:wrap;gap:20px 28px;padding:18px 20px">${cells}</div>`;
}

if (process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const full = { coverage: { companiesWithOpenRoles: 399, companiesWithYcJobsLink: 614, openRolesAt: '2026-07-24', roleMix: { engineering: 3060, 'ai/data': 1061, other: 168 } } };
  const cs = siteCounters(full);
  assert(cs.find((c) => c.key === 'companiesHiring').value === 399, 'reads companiesWithOpenRoles');
  assert(cs.find((c) => c.key === 'rolesTracked').value === 4289, 'rolesTracked = sum(roleMix) = 3060+1061+168');
  assert(cs.find((c) => c.key === 'rolesTracked').label.includes('2026-07-24'), 'includes as-of date honestly');
  assert(cs.find((c) => c.key === 'ycLinked').value === 614, 'reads YC jobs link count');
  // HONESTY: a counter with no backing value must be OMITTED, never fabricated
  assert(siteCounters({ coverage: {} }).length === 0, 'empty coverage -> no counters (no fabricated numbers)');
  assert(!siteCounters({ coverage: { companiesWithOpenRoles: 0, roleMix: {} } }).some((c) => c.key === 'companiesHiring'), 'zero/absent hiring -> omitted, not shown as 0');
  assert(siteCounters({}).length === 0, 'no map -> empty, no crash');
  // fragment: numbers formatted with commas, escaped, empty -> empty string
  const frag = countersFragment(cs);
  assert(frag.includes('4,289') && frag.includes('399'), 'fragment formats numbers with thousands separators');
  assert(countersFragment([]).length === 0, 'no counters -> empty fragment');
  assert(!countersFragment([{ key: 'x', value: 1, label: '<img src=x onerror=alert(1)>' }]).includes('<img src=x'), 'label is HTML-escaped');
  console.log(JSON.stringify({ ok: true, selftest: 'site-counters' }));
  process.exit(0);
}

if (isMain) {
  const mapPath = process.env.DEMIGOD_MAP || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const counters = siteCounters(map);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(counters, null, 2)); process.exit(0); }
  console.log(countersFragment(counters));
}
