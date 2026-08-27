#!/usr/bin/env node
/** Fast HTTP verification of Demigod live site (no CDP). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchLiveHtml,
  fetchLiveSitemap,
  scanLiveHtml,
  evaluateLandingLinks,
  buildFindings,
  reportPass,
} from './demigod-live-lib.mjs';
import { resolveWebhookPublicUrl } from './demigod-webhook-url.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.DEMIGOD_VERIFY_LIVE_OUT || path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json');

const [landing, wizard, sitemap] = await Promise.all([
  fetchLiveHtml(true, '/'),
  fetchLiveHtml(true, '/?wiz=startup'),
  fetchLiveSitemap(true),
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
if (sitemap.missingRoutes.length) {
  routeFindings.push({
    severity: 'high',
    issue: 'Live sitemap omits source-owned product routes',
    detail: sitemap.missingRoutes,
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
  routes: { landing: landing.url, wizard: wizard.url, sitemap: sitemap.url },
  landingLinks,
  sitemap: { paths: sitemap.paths, missingRoutes: sitemap.missingRoutes },
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
  missingProductRoutes: sitemap.missingRoutes.length,
  mcpGone: htmlScan.mcpScriptsGone,
  formsOk: htmlScan.formsOk,
  out: OUT,
}));
process.exit(pass ? 0 : 1);
