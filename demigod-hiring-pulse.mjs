#!/usr/bin/env node
// SF Startup Hiring Pulse — turn the directory's live hiring data into a shareable, honest
// data-media issue (the "come for the insight → use the tool → join the network" top-of-funnel).
//
// Every run: (1) append today's hiring snapshot to an append-only history (starts the trend
// clock), (2) compute the Pulse from the current map + deltas vs the most recent PRIOR snapshot,
// (3) emit pulse.json + a rendered pulse.html.
//
// Honesty: only counts what was actually fetched. "verified open roles" = live US-posted/Remote
// rows on a company's own public ATS board; "hiring" without a count = the company's own YC/self
// report. No estimates, no résumé data, no invented trends (deltas only appear once history exists).
//
//   node demigod-hiring-pulse.mjs [--out <dir>] [--selftest]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const HISTORY = path.join(ROOT, 'DEMIGOD-HIRING-HISTORY.jsonl');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const batchYear = (b) => {
  const m = /(\d{4})/.exec(b || '');
  const yr = m ? +m[1] : 0;
  const season = /Winter/.test(b) ? 0 : /Spring/.test(b) ? 1 : /Summer/.test(b) ? 2 : 3;
  return yr * 10 + season;
};

// Pure: given the map + optional prior snapshot, compute the Pulse data object.
export function computePulse(map, prior = null, today = '') {
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  const verified = companies.filter((c) => c.openRoles && c.atsSource);
  const hiringSignal = companies.filter((c) => c.hiring === 'yes');
  const totalRoles = verified.reduce((s, c) => s + c.openRoles, 0);

  const topHirers = [...verified]
    .sort((a, b) => b.openRoles - a.openRoles)
    .slice(0, 12)
    .map((c) => ({ name: c.name, roles: c.openRoles, ats: c.atsSource, url: c.jobsUrl }));

  const ats = {};
  for (const c of verified) ats[c.atsSource] = (ats[c.atsSource] || 0) + 1;
  const atsLandscape = Object.entries(ats).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));

  const byBatch = {};
  for (const c of companies) {
    const b = (c.tags || []).find((t) => /^YC (Winter|Spring|Summer|Fall) \d{4}$/.test(t));
    if (!b) continue;
    byBatch[b] = byBatch[b] || { batch: b, n: 0, hiring: 0, roles: 0 };
    byBatch[b].n++;
    if (c.hiring === 'yes') byBatch[b].hiring++;
    byBatch[b].roles += c.openRoles || 0;
  }
  const batches = Object.values(byBatch)
    .filter((v) => v.n >= 15) // only cohorts big enough for an honest rate
    .map((v) => ({ ...v, rate: Math.round((100 * v.hiring) / v.n) }))
    .sort((a, b) => batchYear(b.batch) - batchYear(a.batch))
    .slice(0, 8);

  // deltas vs prior snapshot (only if history exists) — the part that actually travels
  let deltas = null;
  if (prior && prior.roles) {
    const nowRoles = Object.fromEntries(verified.map((c) => [c.id, c.openRoles]));
    const started = verified.filter((c) => !(c.id in prior.roles)).length;
    const paused = Object.keys(prior.roles).filter((id) => !(id in nowRoles)).length;
    deltas = {
      since: prior.date,
      startedHiring: started,
      pausedHiring: paused,
      netRoles: totalRoles - prior.totalRoles,
    };
  }

  // What functions are SF startups hiring for? (global role-mix from the enrich, excl. "other")
  const byFunction = Object.entries(map?.coverage?.roleMix || {})
    .filter(([fn]) => fn !== 'other')
    .map(([fn, n]) => ({ fn, n }))
    .sort((a, b) => b.n - a.n);

  // HEADLINE finding, computed (not asserted): YC cohorts barely hire fresh out of the batch and ramp
  // ~a year later. Only claim it if the data actually shows it (mature rate ≥ 1.8× the newest cohort's).
  const seasonIdx = (b) => { const m = /(\d{4})/.exec(b || ''); const yr = m ? +m[1] : 0; const s = /Winter/.test(b) ? 0 : /Spring/.test(b) ? 1 : /Summer/.test(b) ? 2 : 3; return yr * 4 + s; };
  let finding = null;
  if (batches.length >= 4) {
    const newest = batches[0]; // batches sorted newest-first
    const newestIdx = seasonIdx(newest.batch);
    const mature = batches.filter((b) => newestIdx - seasonIdx(b.batch) >= 4); // a year+ past their batch
    if (mature.length && newest.rate > 0) {
      const matureRate = Math.round(mature.reduce((s, b) => s + b.rate, 0) / mature.length);
      if (matureRate >= 1.8 * newest.rate) {
        finding = { type: 'batch-curve', freshBatch: newest.batch.replace('YC ', ''), freshRate: newest.rate, matureRate, multiple: +(matureRate / newest.rate).toFixed(1) };
      }
    }
  }

  // AI insight, computed: only claim "more than product+design+marketing combined" when it's true.
  const fnN = (name) => byFunction.find((f) => f.fn === name)?.n || 0;
  // Denominator = ALL categorized roles INCLUDING 'other' (byFunction excludes 'other'); using the
  // excludes-'other' sum overstates the AI share in the public "1 in N open roles" copy.
  const allRoleTags = Object.values(map?.coverage?.roleMix || {}).reduce((s, n) => s + (Number(n) || 0), 0);
  const aiN = fnN('ai/data');
  const pdmN = fnN('product') + fnN('design') + fnN('marketing');
  const aiInsight = aiN ? { roles: aiN, share: Math.round((100 * aiN) / (allRoleTags || 1)), beatsPDM: aiN > pdmN, pdm: pdmN } : null;

  return {
    generatedAt: today,
    levels: {
      tracked: companies.length,
      hiring: hiringSignal.length,
      verifiedBoards: verified.length,
      verifiedRoles: totalRoles,
    },
    byFunction,
    finding,
    aiInsight,
    topHirers,
    atsLandscape,
    batches,
    deltas,
    method:
      'Open-role counts are live US-posted or Remote listings on each company’s own public ' +
      'Greenhouse/Lever/Ashby job board. "Hiring" without a count is the company’s own YC/self ' +
      'report. Public data only — no résumés, no estimates, no invented trends.',
  };
}

// Append today's compact snapshot (idempotent per date); return the most recent PRIOR snapshot.
export function snapshotAndPrior(map, today, historyPath = HISTORY) {
  const verified = (map.companies || []).filter((c) => c.openRoles && c.atsSource);
  const lines = fs.existsSync(historyPath)
    ? fs.readFileSync(historyPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  const prior = lines.filter((s) => s.date < today).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  if (!lines.some((s) => s.date === today)) {
    const snap = {
      date: today,
      tracked: map.companies?.length || 0,
      verifiedBoards: verified.length,
      totalRoles: verified.reduce((s, c) => s + c.openRoles, 0),
      roles: Object.fromEntries(verified.map((c) => [c.id, c.openRoles])),
    };
    fs.appendFileSync(historyPath, JSON.stringify(snap) + '\n'); // append-only: never rewrite peers' history
  }
  return prior;
}

// Render the Pulse object → a self-contained, theme-aware HTML issue (data-driven; no hand-numbers).
export function renderPulseHtml(pulse, site = 'https://www.trydemigod.com') {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const SITE = String(site).replace(/\/+$/, '');
  const num = (n) => Number(n || 0).toLocaleString('en-US');
  const bars = (rows, max, label, val) => rows.map((r) => {
    const w = max > 0 ? Math.max(6, Math.round((100 * val(r)) / max)) : 0;
    return `<div class="row"><span class="lab">${esc(label(r))}</span><span class="track"><span class="fill" style="width:${w}%"></span></span><span class="val">${esc(num(val(r)))}</span></div>`;
  }).join('');
  const L = pulse.levels || {};
  const fnMax = Math.max(1, ...(pulse.byFunction || []).map((f) => f.n));
  const hireMax = Math.max(1, ...(pulse.topHirers || []).map((h) => h.roles));
  const atsMax = Math.max(1, ...(pulse.atsLandscape || []).map((a) => a.n));
  const batchMax = Math.max(1, ...(pulse.batches || []).map((b) => b.rate));
  const aiCallout = pulse.aiInsight
    ? `<p class="dek">${pulse.aiInsight.beatsPDM
        ? `AI &amp; data is now <b>1 in ${Math.max(2, Math.round(100 / pulse.aiInsight.share))}</b> open roles (${pulse.aiInsight.share}%) — more than product, design, and marketing <em>combined</em>.`
        : `AI &amp; data is <b>${pulse.aiInsight.share}%</b> of open roles.`}</p>`
    : '';
  const fnSection = (pulse.byFunction || []).length
    ? `<section><p class="eyebrow">What they're hiring for</p><h2>The functions SF startups are hiring most</h2>
       ${aiCallout}
       <div class="bars">${bars(pulse.byFunction.slice(0, 8), fnMax, (r) => r.fn, (r) => r.n)}</div></section>` : '';
  // The lede: one computed, screenshot-able finding. Only rendered when the data actually supports it.
  const findingSection = pulse.finding && pulse.finding.type === 'batch-curve'
    ? `<section class="finding"><p class="eyebrow">The finding</p>
       <h2>YC startups barely hire until a year after their batch</h2>
       <div class="bignum"><span class="big">${pulse.finding.multiple}×</span><span class="bigcap">more likely to be hiring a year+ past their batch</span></div>
       <p class="dek">Just <b>${pulse.finding.freshRate}%</b> of the newest cohort (${esc(pulse.finding.freshBatch)}) is hiring; <b>${pulse.finding.matureRate}%</b> of companies a year or more past their batch are. If you're job-hunting, the fresh batch isn't where the openings are.</p></section>`
    : '';
  const deltaLine = pulse.deltas
    ? `<p class="delta">Since ${esc(pulse.deltas.since)}: <b>${num(pulse.deltas.startedHiring)} started hiring</b>, ${num(pulse.deltas.pausedHiring)} paused, net ${pulse.deltas.netRoles >= 0 ? '+' : ''}${num(pulse.deltas.netRoles)} open roles.</p>`
    : '<p class="delta">Week-over-week trends begin next issue (first snapshot).</p>';
  const batchRows = (pulse.batches || []).map((b) => {
    const w = Math.max(6, Math.round((100 * b.rate) / batchMax));
    return `<div class="row"><span class="lab">${esc(b.batch.replace('YC ', ''))} <span class="sub">· ${b.n} cos</span></span><span class="track"><span class="fill" style="width:${w}%"></span></span><span class="val">${b.rate}%</span></div>`;
  }).join('');
  return `<title>SF Startup Hiring Pulse — ${esc(pulse.generatedAt)}</title>
<style>
:root{--bg:#0b0b0d;--panel:#141317;--ink:#ece9e2;--muted:#9a938a;--faint:#6b655c;--gold:#C9A84C;--gold-lite:#E8D5A3;--line:rgba(201,168,76,.22);--line-soft:rgba(255,255,255,.07);--bar:#C9A84C;--bar-soft:rgba(201,168,76,.16);--serif:'Cinzel',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;--mono:ui-monospace,Menlo,monospace}
@media(prefers-color-scheme:light){:root{--bg:#faf8f3;--panel:#fff;--ink:#1b1a17;--muted:#6b655c;--faint:#9a938a;--line:rgba(160,130,50,.28);--line-soft:rgba(0,0,0,.08);--gold:#8a6d1f;--gold-lite:#6b5417;--bar:#b98f2c;--bar-soft:rgba(185,143,44,.16)}}
:root[data-theme="dark"]{--bg:#0b0b0d;--panel:#141317;--ink:#ece9e2;--muted:#9a938a;--gold:#C9A84C;--gold-lite:#E8D5A3;--bar:#C9A84C;--bar-soft:rgba(201,168,76,.16);--line:rgba(201,168,76,.22);--line-soft:rgba(255,255,255,.07);--faint:#6b655c;--panel:#141317}
:root[data-theme="light"]{--bg:#faf8f3;--panel:#fff;--ink:#1b1a17;--muted:#6b655c;--gold:#8a6d1f;--gold-lite:#6b5417;--bar:#b98f2c;--bar-soft:rgba(185,143,44,.16);--line:rgba(160,130,50,.28);--line-soft:rgba(0,0,0,.08);--faint:#9a938a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.55;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.wrap{max-width:44rem;margin:0 auto;padding:clamp(1.1rem,4vw,2.75rem)}
.mast{border-bottom:2px solid var(--gold);padding-bottom:.9rem;margin-bottom:1.4rem}
.kicker{font-family:var(--mono);font-size:.66rem;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin:0 0 .5rem}
h1{font-family:var(--serif);font-weight:700;font-size:clamp(1.7rem,6vw,2.7rem);line-height:1.02;margin:0;text-wrap:balance}
.issue{display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-top:.7rem;font-family:var(--mono);font-size:.72rem;color:var(--muted)}
.delta{margin:1rem 0 0;font-size:.9rem;color:var(--muted)}.delta b{color:var(--gold-lite)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin:1.5rem 0 2rem}@media(max-width:34rem){.stats{grid-template-columns:repeat(2,1fr)}}
.stat{background:var(--panel);border:1px solid var(--line-soft);border-radius:10px;padding:.8rem .7rem}
.stat .n{font-family:var(--serif);font-size:clamp(1.3rem,4.5vw,1.7rem);font-weight:700;color:var(--gold-lite);line-height:1}
.stat .l{font-size:.64rem;letter-spacing:.03em;color:var(--muted);margin-top:.35rem;text-transform:uppercase}
section{margin:2.1rem 0}.eyebrow{font-family:var(--mono);font-size:.64rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:0 0 .15rem}
h2{font-family:var(--serif);font-weight:700;font-size:clamp(1.15rem,3.6vw,1.5rem);margin:.1rem 0 .3rem;text-wrap:balance}
.dek{color:var(--muted);font-size:.92rem;margin:0 0 1rem}.dek b{color:var(--gold-lite)}.dek em{font-style:italic;color:var(--ink)}
.finding{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:clamp(1.1rem,4vw,1.8rem)}
.finding h2{font-size:clamp(1.35rem,4.6vw,1.9rem)}
.bignum{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap;margin:.4rem 0 .8rem}
.big{font-family:var(--serif);font-weight:700;font-size:clamp(3rem,13vw,5rem);line-height:.9;color:var(--gold-lite)}
.bigcap{font-size:.95rem;color:var(--muted);max-width:14rem}
.bars{display:flex;flex-direction:column;gap:.34rem}
.row{display:grid;grid-template-columns:9rem 1fr auto;align-items:center;gap:.7rem;font-size:.85rem}@media(max-width:34rem){.row{grid-template-columns:6.5rem 1fr auto}}
.lab{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:capitalize}.lab .sub{color:var(--faint);font-size:.82em;text-transform:none}
.track{height:.6rem;background:var(--bar-soft);border-radius:999px;overflow:hidden}.fill{height:100%;background:var(--bar);border-radius:999px}
.val{font-family:var(--mono);color:var(--gold-lite);font-size:.82rem;min-width:2.6rem;text-align:right}
.cta{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:clamp(1.2rem,4vw,2rem)}
.ctabtns{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.3rem}
.btn{display:inline-block;text-decoration:none;font-size:.86rem;font-weight:600;padding:.6rem 1rem;border-radius:999px;border:1px solid var(--line);color:var(--ink);transition:transform .12s ease,background .12s ease}
.btn:hover{transform:translateY(-1px)}
.btn.primary{background:var(--gold);color:#141317;border-color:var(--gold)}
@media(prefers-reduced-motion:reduce){.btn{transition:none}.btn:hover{transform:none}}
.method{margin-top:2.2rem;border-top:1px solid var(--line);padding-top:1.1rem;font-size:.76rem;color:var(--muted)}.method b{color:var(--gold-lite)}
.foot{margin-top:1.2rem;font-family:var(--mono);font-size:.66rem;color:var(--faint);text-align:center}.foot a{color:var(--gold);text-decoration:none}
</style>
<div class="wrap">
  <header class="mast"><p class="kicker">Demigod · San Francisco</p><h1>SF Startup Hiring Pulse</h1>
    <div class="issue"><span>${esc(pulse.generatedAt)}</span><span>Public open data · refreshed weekly</span></div>
    ${deltaLine}</header>
  <div class="stats">
    <div class="stat"><div class="n">${num(L.tracked)}</div><div class="l">SF startups tracked</div></div>
    <div class="stat"><div class="n">${num(L.hiring)}</div><div class="l">hiring now</div></div>
    <div class="stat"><div class="n">${num(L.verifiedBoards)}</div><div class="l">verified job boards</div></div>
    <div class="stat"><div class="n">${num(L.verifiedRoles)}</div><div class="l">open roles</div></div>
  </div>
  ${findingSection}
  ${(pulse.batches || []).length ? `<section><p class="eyebrow">The evidence</p><h2>Hiring rate climbs with batch age</h2><p class="dek">Share of each YC cohort with at least one open role, newest first. Cohorts of 15+ companies only.</p><div class="bars">${batchRows}</div></section>` : ''}
  ${fnSection}
  <section><p class="eyebrow">Who's hiring most</p><h2>The biggest hirers are AI companies</h2><p class="dek">Largest verified open-role counts among all tracked SF tech companies (includes scaled firms like OpenAI &amp; Stripe, not only early-stage). Live counts from each company's own public board — US-posted &amp; remote.</p><div class="bars">${bars((pulse.topHirers || []).slice(0, 10), hireMax, (r) => r.name, (r) => r.roles)}</div></section>
  <section><p class="eyebrow">The infrastructure story</p><h2>Which ATS runs SF startup hiring</h2><p class="dek">Among SF startups with a detectable applicant-tracking system.</p><div class="bars">${bars(pulse.atsLandscape || [], atsMax, (r) => r.name, (r) => r.n)}</div></section>
  <section class="cta"><p class="eyebrow">From the Pulse to the people</p>
    <h2>Demigod tracks every one of these ${num(L.tracked)} companies</h2>
    <p class="dek">This is the public half — who's hiring, from their own job boards. The private half is matching people to these roles: tech ranks the fit, humans review it, and we only make the intro when <em>both</em> sides say yes. No spam, no résumé black hole.</p>
    <div class="ctabtns"><a class="btn primary" href="${SITE}/startups">Browse who's hiring →</a><a class="btn" href="${SITE}/hire">I'm hiring →</a><a class="btn" href="${SITE}/talent">I'm looking →</a></div></section>
  <p class="method"><b>Method.</b> ${esc(pulse.method)}</p>
  <p class="foot">SF Startup Hiring Pulse · a Demigod publication · <a href="${SITE}/">trydemigod.com</a></p>
</div>`;
}

if (isMain && (process.env.DEMIGOD_PULSE_SELFTEST === '1' || process.argv.includes('--selftest'))) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const fake = { companies: [
    { id: 'a', name: 'Alpha', openRoles: 10, atsSource: 'Ashby', jobsUrl: 'x', hiring: 'yes', tags: ['yc', 'YC Winter 2025'] },
    { id: 'b', name: 'Beta', openRoles: 5, atsSource: 'Greenhouse', jobsUrl: 'y', hiring: 'yes', tags: ['yc', 'YC Winter 2025'] },
    { id: 'c', name: 'Gamma', hiring: 'yes', tags: ['yc', 'YC Summer 2024'] },
  ] };
  const p = computePulse(fake, null, '2026-07-24');
  assert(p.levels.tracked === 3 && p.levels.verifiedBoards === 2 && p.levels.verifiedRoles === 15, 'levels');
  assert(p.topHirers[0].name === 'Alpha' && p.topHirers[0].roles === 10, 'top hirer sorted');
  assert(p.atsLandscape[0].name === 'Ashby', 'ats landscape sorted');
  assert(p.deltas === null, 'no deltas without history');
  // deltas fire with a prior snapshot; a paused board is detected
  const prior = { date: '2026-07-17', totalRoles: 20, roles: { a: 8, z: 12 } };
  const p2 = computePulse(fake, prior, '2026-07-24');
  assert(p2.deltas && p2.deltas.startedHiring === 1 && p2.deltas.pausedHiring === 1, 'deltas: 1 started (b), 1 paused (z)');
  // fail-capable: an empty map must not fabricate a Pulse
  const empty = computePulse({ companies: [] }, null, 'd');
  assert(empty.levels.verifiedBoards === 0 && empty.topHirers.length === 0, 'empty map → empty pulse (no fabrication)');
  // headline finding is COMPUTED and only claimed when the data shows it (batch-age curve).
  const cohort = (batch, n, hiring) => Array.from({ length: n }, (_, i) => ({ id: `${batch}-${i}`, name: `${batch}-${i}`, hiring: i < hiring ? 'yes' : 'no', tags: ['yc', batch] }));
  const curveMap = { coverage: { roleMix: { 'ai/data': 100, product: 20, design: 10, marketing: 30, engineering: 200, other: 5 } },
    companies: [...cohort('YC Summer 2026', 20, 2), ...cohort('YC Spring 2026', 20, 5), ...cohort('YC Summer 2025', 20, 12), ...cohort('YC Spring 2025', 20, 12)] };
  const pc = computePulse(curveMap, null, '2026-07-24');
  assert(pc.finding && pc.finding.type === 'batch-curve', 'finding computed when curve present');
  assert(pc.finding.freshRate === 10 && pc.finding.matureRate === 60 && pc.finding.multiple === 6, `finding numbers: ${JSON.stringify(pc.finding)}`);
  assert(pc.aiInsight.beatsPDM === true && pc.aiInsight.share === 27, `aiInsight share vs full denominator incl 'other': ${JSON.stringify(pc.aiInsight)}`);
  // no false finding: a flat curve (mature not ≥1.8× fresh) must NOT assert the claim
  const flatMap = { companies: [...cohort('YC Summer 2026', 20, 8), ...cohort('YC Spring 2026', 20, 8), ...cohort('YC Summer 2025', 20, 9), ...cohort('YC Spring 2025', 20, 9)] };
  assert(computePulse(flatMap, null, '2026-07-24').finding === null, 'flat curve (4 cohorts, <1.8×) → no fabricated finding');
  // AI insight honesty: when AI does NOT beat product+design+marketing, beatsPDM is false
  const lowAi = { coverage: { roleMix: { 'ai/data': 10, product: 40, design: 30, marketing: 50 } }, companies: [] };
  assert(computePulse(lowAi, null, 'd').aiInsight.beatsPDM === false, 'AI insight honest when AI < PDM');
  // Render is data-driven + escapes: produces HTML, reflects the numbers, no injection.
  const html = renderPulseHtml({ generatedAt: '2026-07-24', levels: { tracked: 2739, hiring: 800, verifiedBoards: 400, verifiedRoles: 11500 }, byFunction: [{ fn: 'engineering', n: 900 }, { fn: 'sales', n: 200 }], topHirers: [{ name: '<script>x</script>', roles: 10 }], atsLandscape: [{ name: 'Ashby', n: 180 }], batches: [], deltas: null, method: 'test' });
  assert(html.includes('2,739') && html.includes('SF Startup Hiring Pulse'), 'render includes levels + masthead');
  assert(html.includes('engineering') && html.includes('900'), 'render includes byFunction');
  assert(!html.includes('<script>x</script>') && html.includes('&lt;script&gt;'), 'render escapes injection');
  // conversion funnel: the CTA must route readers into the product (come-for-insight → stay-for-network)
  assert(html.includes('https://www.trydemigod.com/startups') && html.includes('/hire') && html.includes('/talent'), 'render includes CTA routes into product');
  assert(renderPulseHtml({ generatedAt: 'd', levels: {}, byFunction: [], topHirers: [], atsLandscape: [], batches: [], deltas: null, method: 'm' }, 'https://example.test/').includes('https://example.test/startups'), 'CTA honors custom site base (no trailing-slash dup)');
  console.log(JSON.stringify({ ok: true, selftest: 'hiring-pulse' }));
  process.exit(0);
}

if (isMain) {
  const outDir = (() => { const i = process.argv.indexOf('--out'); return i > 0 ? process.argv[i + 1] : ROOT; })();
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const today = process.env.DEMIGOD_PULSE_DATE || new Date().toISOString().slice(0, 10);
  const prior = snapshotAndPrior(map, today);
  const pulse = computePulse(map, prior, today);
  fs.writeFileSync(path.join(outDir, 'hiring-pulse.json'), JSON.stringify(pulse, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'hiring-pulse.html'), renderPulseHtml(pulse));
  console.log(JSON.stringify({ ok: true, today, prior: prior?.date || null, levels: pulse.levels, byFunction: pulse.byFunction, deltas: pulse.deltas }, null, 2));
}
