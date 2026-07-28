#!/usr/bin/env node
// Public Hiring Pulse page builder. Wraps computePulse + renderPulseHtml (both in demigod-hiring-pulse.mjs)
// and injects a VISIBLE classification caveat next to the AI & data claim. Required because categorizeRole
// keyword-tags any AI/ML/data-titled role as "ai/data" even when its primary function is product/design/
// marketing, so the ai/data share is an UPPER BOUND — and here its lead over P+D+M combined is razor-thin
// (1061 vs 1032). Do not ship the bare "beats P+D+M combined" claim without this caveat.
// [[demigod-categorizerole-aidata-bias]]
//   node demigod-pulse-page.mjs [--out file.html]   # build from DEMIGOD-SF-STARTUP-MAP.json
//   node demigod-pulse-page.mjs --selftest
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computePulse, renderPulseHtml } from './demigod-hiring-pulse.mjs';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fmt = (n) => Number(n).toLocaleString('en-US');

// pure: the caveat HTML. Uses the real ai/data vs P+D+M counts when present so it's specific, not hand-wavy.
export function classificationCaveat(aiInsight) {
  const nums = aiInsight && Number.isFinite(aiInsight.roles) && Number.isFinite(aiInsight.pdm)
    ? ` Here that is <b>${fmt(aiInsight.roles)}</b> AI &amp; data vs <b>${fmt(aiInsight.pdm)}</b> product + design + marketing — a narrow lead that the tagging could flip.`
    : '';
  return `<aside style="margin:10px 0 0;padding:10px 14px;border-left:2px solid #d4a017;background:#141109;color:#c9b382;font:400 12.5px/1.5 system-ui,sans-serif;border-radius:0 6px 6px 0">
<b style="color:#ffe9a6">Method note.</b> Role categories are keyword-tagged from job titles: a title containing “AI”, “ML”, or “data” is counted under <b>AI &amp; data</b> even when its primary function is product, design, or marketing. The AI &amp; data share is therefore an <b>upper bound</b>, not a precise split.${nums} Treat the mix as directional.</aside>`;
}

// pure: insert caveatHtml immediately after the AI callout paragraph. If no AI callout is present, append
// it (before the last </section> if any, else at the end) so the caveat is NEVER dropped.
export function injectAfterAiCallout(html, caveatHtml) {
  const s = String(html || '');
  const at = s.indexOf('AI &amp; data');
  if (at >= 0) {
    const end = s.indexOf('</p>', at);
    if (end >= 0) return s.slice(0, end + 4) + caveatHtml + s.slice(end + 4);
  }
  const lastSec = s.lastIndexOf('</section>');
  return lastSec >= 0 ? s.slice(0, lastSec) + caveatHtml + s.slice(lastSec) : s + caveatHtml;
}

export function buildPulsePage(map, today) {
  const pulse = computePulse(map, null, today || map?.coverage?.openRolesAt || '');
  const html = renderPulseHtml(pulse);
  return injectAfterAiCallout(html, classificationCaveat(pulse.aiInsight));
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  // caveat is specific when counts are present
  const cav = classificationCaveat({ roles: 1061, pdm: 1032 });
  assert(cav.includes('upper bound') && cav.includes('1,061') && cav.includes('1,032'), 'caveat states upper-bound + the real narrow counts');
  assert(classificationCaveat(null).includes('upper bound'), 'caveat still present without counts (no crash)');
  // injection places the caveat right after the AI callout, before following content
  const withAi = injectAfterAiCallout('<p class="dek">AI &amp; data is now <b>1 in 10</b> … <em>combined</em>.</p><div id="next">x</div>', '<aside id="CAV">c</aside>');
  assert(/<\/p><aside id="CAV">c<\/aside><div id="next">/.test(withAi), 'caveat inserted immediately after the AI callout </p>');
  // no AI callout -> caveat is still appended, never dropped
  const noAi = injectAfterAiCallout('<section><h2>x</h2></section>', '<aside id="CAV2">c</aside>');
  assert(noAi.includes('CAV2'), 'caveat appended even when there is no AI callout');
  // end-to-end on a crafted map: page renders, contains the callout AND the caveat
  const map = { coverage: { roleMix: { 'ai/data': 100, product: 10, design: 5, marketing: 5, other: 60 }, companiesWithOpenRoles: 5, openRolesAt: '2026-07-24' }, companies: [] };
  const page = buildPulsePage(map, '2026-07-24');
  assert(page.includes('AI &amp; data') && page.includes('Method note'), 'built page has the AI claim AND the visible caveat');
  assert(page.indexOf('Method note') > page.indexOf('AI &amp; data'), 'caveat sits with the AI claim, not before it');
  console.log(JSON.stringify({ ok: true, selftest: 'pulse-page' }));
  process.exit(0);
}

if (isMain) {
  const map = JSON.parse(fs.readFileSync(process.env.DEMIGOD_MAP || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json'), 'utf8'));
  const page = buildPulsePage(map);
  const oi = process.argv.indexOf('--out');
  if (oi >= 0 && process.argv[oi + 1]) { fs.writeFileSync(process.argv[oi + 1], page); console.log(`wrote ${process.argv[oi + 1]} (${page.length}b)`); }
  else process.stdout.write(page);
}
