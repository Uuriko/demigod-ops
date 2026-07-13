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
import { resolveWebhookPublicUrl } from './demigod-webhook-url.mjs';

const ROOT = '/home/potter';
const OUT = path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json');

const { url, html, footerCoreJs, pageScan } = await fetchLiveHtml();
const htmlScan = scanLiveHtml(html, { footerCoreJs });
const findings = buildFindings({
  htmlScan,
  pageScan,
  expectedWebhookUrl: resolveWebhookPublicUrl(),
});
const pass = reportPass(findings);

const out = {
  at: new Date().toISOString(),
  url,
  htmlScan,
  pageScan,
  findings,
  pass,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ pass, findings: findings.length, mcpGone: htmlScan.mcpScriptsGone, formsOk: htmlScan.formsOk, out: OUT }));
process.exit(pass ? 0 : 1);