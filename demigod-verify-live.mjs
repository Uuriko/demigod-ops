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
const pass = reportPass(findings);

const out = {
  at: new Date().toISOString(),
  url,
  htmlScan,
  metaCounts,
  pageScan,
  findings,
  pass,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ pass, findings: findings.length, mcpGone: htmlScan.mcpScriptsGone, formsOk: htmlScan.formsOk, out: OUT }));
process.exit(pass ? 0 : 1);
