#!/usr/bin/env node
/** Fast HTTP verification of Demigod live site (no CDP). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchLiveHtml,
  scanLiveHtml,
  evaluateLandingLinks,
  buildFindings,
  reportPass,
} from './demigod-live-lib.mjs';
import { resolveWebhookPublicUrl } from './demigod-webhook-url.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.DEMIGOD_VERIFY_LIVE_OUT || path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json');

const [landing, wizard] = await Promise.all([
  fetchLiveHtml(true, '/'),
  fetchLiveHtml(true, '/?wiz=startup'),
]);
const htmlScan = scanLiveHtml(wizard.html, { footerCoreJs: wizard.footerCoreJs });
const landingLinks = evaluateLandingLinks(landing.html);
const routeFindings = [];
if (!landingLinks.startup.length) {
  routeFindings.push({ severity: 'high', issue: 'Landing page has no real startup wizard link' });
}
if (!landingLinks.engineer.length) {
  routeFindings.push({ severity: 'high', issue: 'Landing page has no real engineer wizard link' });
}
if (landingLinks.unsafeStartup.length) {
  routeFindings.push({
    severity: 'high',
    issue: 'Generic landing-page startup CTA carries company/role prefills',
    detail: landingLinks.unsafeStartup,
  });
}
const findings = routeFindings.concat(buildFindings({
  htmlScan,
  pageScan: landing.pageScan,
  expectedWebhookUrl: resolveWebhookPublicUrl(),
}));
const pass = reportPass(findings);

const out = {
  at: new Date().toISOString(),
  routes: { landing: landing.url, wizard: wizard.url },
  landingLinks,
  htmlScan,
  pageScan: landing.pageScan,
  findings,
  pass,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  pass,
  findings: findings.length,
  unsafeStartupLinks: landingLinks.unsafeStartup.length,
  mcpGone: htmlScan.mcpScriptsGone,
  formsOk: htmlScan.formsOk,
  out: OUT,
}));
process.exit(pass ? 0 : 1);
