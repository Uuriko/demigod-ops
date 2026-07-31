#!/usr/bin/env node
// Directory filter/search prototype over the SF startup map. The review found /startups is the richest
// page (757+ links) but a flat list — hard to navigate. This is a self-contained, client-side filterable
// directory. The filter predicate is a PURE, poison-tested function embedded into the page via toString(),
// so the page and the tests share ONE source of truth (no server, no drift).
//   node demigod-directory-filter.mjs [--page]   # emit the HTML page (reads DEMIGOD-SF-STARTUP-MAP.json)
//   node demigod-directory-filter.mjs --selftest
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));

// PURE predicate — used by both the selftest and the embedded page. Fields per the real map records:
// name, description, tags[], hiring ('yes'|…), jobsUrl, inceptionYear.
export function filterCompanies(companies, criteria) {
  const c = criteria || {};
  const q = String(c.q || '').trim().toLowerCase();
  return (companies || []).filter((co) => {
    if (!co) return false;
    if (c.hiringOnly && co.hiring !== 'yes') return false;
    if (c.hasJobs && !co.jobsUrl) return false;
    if (c.sinceYear && !(Number(co.inceptionYear) >= Number(c.sinceYear))) return false;
    if (q) {
      const hay = (String(co.name || '') + ' ' + String(co.description || '') + ' ' + (Array.isArray(co.tags) ? co.tags.join(' ') : '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function stripCompany(co = {}) {
  return {
    name: co.name || '', website: co.website || '', jobsUrl: co.jobsUrl || '',
    description: String(co.description || '').slice(0, 160),
    tags: Array.isArray(co.tags) ? co.tags.slice(0, 4) : [],
    hiring: co.hiring === 'yes' ? 'yes' : '', inceptionYear: Number(co.inceptionYear) || null,
    // YC's own published numbers, carried through as-is. Absent for every non-YC row, so the card
    // has to render nothing rather than guess a size.
    teamSize: Number.isSafeInteger(co.teamSize) && co.teamSize > 0 ? co.teamSize : null,
    stage: ['Early', 'Growth'].includes(co.stage) ? co.stage : '',
  };
}

const embedJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c'); // block </script> breakout

export function renderDirectoryPage(companies = []) {
  const data = companies.map(stripCompany).filter((c) => c.name);
  return `<!doctype html><meta charset="utf-8"><title>SF startup directory — filterable</title>
<style>body{background:#070b0a;color:#cfe8dd;font:15px/1.5 system-ui,sans-serif;margin:0;padding:24px}
.bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:16px}
input,select{background:#0d1512;border:1px solid #243530;color:#cfe8dd;border-radius:8px;padding:9px 12px;font:inherit}
label{font:13px/1 ui-monospace,monospace;color:#7f978c;display:flex;gap:6px;align-items:center}
#n{font:12px/1 ui-monospace,monospace;color:#08a05d}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.card{background:#0d1512;border:1px solid #243530;border-radius:10px;padding:14px}
.card h3{margin:0 0 4px;font:600 15px/1.2 ui-monospace,monospace;color:#a6ffcb}
.card p{margin:0;font-size:13px;color:#7f978c}.card a{color:#08a05d;font-size:13px}
.card p.m{font:11px/1.4 ui-monospace,monospace;color:#5f7a70;margin-bottom:3px}
.t{display:inline-block;font:10px/1 ui-monospace,monospace;color:#bfe0f0;background:#14232e;border:1px solid #3d7ea6;border-radius:20px;padding:2px 7px;margin:6px 4px 0 0}</style>
<div class="bar">
  <input id="q" placeholder="Search name, tags, description…" style="flex:1 1 240px">
  <label><input type="checkbox" id="hiring"> hiring now</label>
  <label><input type="checkbox" id="jobs" checked> has jobs link</label>
  <label>since <select id="year"><option value="">any</option><option>2020</option><option>2022</option><option>2024</option></select></label>
  <span id="n"></span>
</div>
<p style="font:12px/1.5 ui-monospace,monospace;color:#5f7a70;margin:0 0 16px">Team size, stage and sector tags are Y Combinator's own published figures for YC companies, not independently verified. Rows from other sources carry none.</p>
<div class="grid" id="grid"></div>
<script>
const DATA = ${embedJson(data)};
${filterCompanies.toString()}
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function render(){
  const crit={q:q.value,hiringOnly:hiring.checked,hasJobs:jobs.checked,sinceYear:year.value};
  const rows=filterCompanies(DATA,crit).slice(0,300);
  n.textContent=rows.length+' of '+DATA.length;
  grid.innerHTML=rows.map(c=>'<div class="card"><h3>'+esc(c.name)+(c.hiring==='yes'?' <span class="t">hiring</span>':'')+'</h3>'+((c.teamSize||c.stage)?'<p class="m">'+[c.teamSize?esc(c.teamSize)+(c.teamSize===1?' person':' people'):'',esc(c.stage)].filter(Boolean).join(' · ')+'</p>':'')+(c.description?'<p>'+esc(c.description)+'</p>':'')+(c.tags||[]).map(t=>'<span class="t">'+esc(t)+'</span>').join('')+'<div style="margin-top:8px">'+(c.jobsUrl?'<a href="'+esc(c.jobsUrl)+'" rel="nofollow noopener">jobs →</a>':'')+(c.website?' <a href="'+esc(c.website)+'" rel="nofollow noopener">site</a>':'')+'</div></div>').join('');
}
for(const el of [q,hiring,jobs,year]) el.addEventListener('input',render);
render();
</script>`;
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const cos = [
    { name: 'Acme AI', description: 'ml platform', tags: ['yc', 'YC Winter 2025'], hiring: 'yes', jobsUrl: 'u', inceptionYear: 2024 },
    { name: 'Beta Corp', description: 'fintech', tags: ['yc'], hiring: 'no', jobsUrl: '', inceptionYear: 2019 },
    { name: 'Gamma', description: 'robotics', tags: [], hiring: 'yes', jobsUrl: 'u2', inceptionYear: 2022 },
  ];
  assert(filterCompanies(cos, {}).length === 3, 'no criteria -> all');
  assert(filterCompanies(cos, { q: 'acme' }).length === 1 && filterCompanies(cos, { q: 'ACME' })[0].name === 'Acme AI', 'q matches name, case-insensitive');
  assert(filterCompanies(cos, { q: 'fintech' }).length === 1, 'q matches description');
  assert(filterCompanies(cos, { q: 'winter 2025' }).length === 1, 'q matches tags');
  assert(filterCompanies(cos, { hiringOnly: true }).length === 2, 'hiringOnly keeps only hiring=yes');
  assert(filterCompanies(cos, { hasJobs: true }).length === 2, 'hasJobs keeps only jobsUrl present');
  assert(filterCompanies(cos, { sinceYear: 2022 }).length === 2, 'sinceYear filters by inception');
  assert(filterCompanies(cos, { q: 'zzz' }).length === 0, 'no match -> empty');
  assert(filterCompanies([{ name: 'X' }, null], {}).length === 1, 'null companies skipped, no crash');
  // YC self-reported detail reaches the card, and only when YC actually published it.
  assert(stripCompany({ name: 'X', teamSize: 9, stage: 'Early' }).teamSize === 9, 'teamSize survives stripCompany');
  assert(stripCompany({ name: 'X', teamSize: 0 }).teamSize === null && stripCompany({ name: 'X', teamSize: -2 }).teamSize === null, 'non-positive teamSize is dropped');
  assert(stripCompany({ name: 'X', stage: 'Seriously Huge' }).stage === '', 'unknown stage string is dropped, not echoed');
  const detail = renderDirectoryPage([{ name: 'Sized', teamSize: 1, stage: 'Growth' }, { name: 'Plain' }]);
  assert(detail.includes('"teamSize":1') && detail.includes('"stage":"Growth"'), 'detail is embedded for the page');
  assert(detail.includes("' person':' people'"), 'card pluralizes team size');
  assert(detail.includes("Y Combinator's own published figures"), 'page attributes the self-reported detail');
  // page: embeds data + the predicate + escapes </script>
  const page = renderDirectoryPage([{ name: 'A</script><b>', jobsUrl: 'u', hiring: 'yes' }]);
  assert(page.includes('filterCompanies') && page.includes('DATA'), 'page embeds predicate + data');
  assert(!page.includes('</script><b>'), 'embedded data cannot break out of the script tag');
  console.log(JSON.stringify({ ok: true, selftest: 'directory-filter' }));
  process.exit(0);
}

if (isMain) {
  const map = JSON.parse(fs.readFileSync(process.env.DEMIGOD_MAP || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json'), 'utf8'));
  const cos = (map.companies || []).filter((c) => c && c.jobsUrl); // actionable directory entries (clickable jobs)
  process.stdout.write(renderDirectoryPage(cos));
}
