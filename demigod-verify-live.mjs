#!/usr/bin/env node
/** Fast HTTP verification of Demigod live site (no CDP). */
import fs from 'fs';
import path from 'path';
import {
  fetchLiveHtml,
  scanLiveHtml,
  buildFindings,
  reportPass,
} from './demigod-live-lib.mjs';

const ROOT = '/home/potter';
const OUT = path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json');

const { url, html, footerCoreJs, pageScan } = await fetchLiveHtml();
const htmlScan = scanLiveHtml(html, { footerCoreJs });
const findings = buildFindings({ htmlScan, pageScan });
const metaCounts = {
  description: (html.match(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/gi) || []).length,
  ogTitle: (html.match(/<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/gi) || []).length,
};
for (const [name, count] of Object.entries(metaCounts)) {
  if (count !== 1) findings.push({ severity: 'medium', issue: `Raw HTML ${name} meta count is ${count}, expected 1` });
}

/* Canonicals are injected by openPage(), so they exist only after JS runs. A crawler that does not
   execute scripts — and every first-pass fetch, preview unfurl and LLM retrieval that matters —
   sees a page with no canonical at all. Measured on all five routes rather than the homepage,
   because the homepage is the one route where a missing canonical hurts least.
   Reported at medium: the durable fix is a per-page Webflow setting, which needs a publish, and a
   check that turns the whole suite red over something no local edit can clear would just get
   ignored. It stays visible on every run until a publish clears it. */
const CANONICAL_ROUTES = ['/', '/apply', '/companies', '/pricing', '/about'];
const SITE = new URL(url).origin;
const rawCanonicals = await Promise.all(CANONICAL_ROUTES.map(async (route) => {
  const page = await fetch(SITE + route).then((r) => (r.ok ? r.text() : ''), () => null);
  // null = we could not look; absence of evidence is not evidence of absence.
  return { route, canonical: page === null ? null : /<link[^>]+rel=["']canonical["']/i.test(page) };
}));
const missingCanonical = rawCanonicals.filter((row) => row.canonical === false).map((row) => row.route);
if (missingCanonical.length) {
  findings.push({
    severity: 'medium',
    issue: `No canonical in served HTML on ${missingCanonical.length} route(s): ${missingCanonical.join(', ')} — injected by JS only`,
  });
}
const pass = reportPass(findings);

const out = {
  at: new Date().toISOString(),
  url,
  htmlScan,
  metaCounts,
  rawCanonicals,
  pageScan,
  findings,
  pass,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ pass, findings: findings.length, mcpGone: htmlScan.mcpScriptsGone, formsOk: htmlScan.formsOk, out: OUT }));
process.exit(pass ? 0 : 1);
