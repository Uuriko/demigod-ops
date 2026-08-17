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
const CANONICAL_ROUTES = ['/', '/blog', '/apply', '/companies', '/pricing', '/about', '/startups', '/hire', '/talent'];
const SITE = new URL(url).origin;
const rawRouteMeta = await Promise.all(CANONICAL_ROUTES.map(async (route) => {
  const page = await fetch(SITE + route).then((r) => (r.ok ? r.text() : ''), () => null);
  // null = we could not look; absence of evidence is not evidence of absence.
  if (page === null) return { route, canonical: null, ogUrl: null };
  /* Attribute order is not stable in what Webflow serves — this site emits
     `content=… name="description"` and `property="og:title" content=…` in the same head — so a
     regex that assumes property-then-content silently reports "no og:url" the day the order flips.
     Match the tag, then read its attributes. */
  const metaContent = (property) => {
    for (const tag of page.match(/<meta\b[^>]*>/gi) || []) {
      const attributes = {};
      for (const [, name, value] of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*["']([^"']*)["']/g)) {
        attributes[name.toLowerCase()] = value;
      }
      if ((attributes.property || attributes.name || '').toLowerCase() === property) return attributes.content ?? '';
    }
    return '';
  };
  return {
    route,
    canonical: /<link\b[^>]*rel=["']canonical["']/i.test(page),
    ogUrl: metaContent('og:url'),
  };
}));
const rawCanonicals = rawRouteMeta.map(({ route, canonical }) => ({ route, canonical }));
const missingCanonical = rawRouteMeta.filter((row) => row.canonical === false).map((row) => row.route);
if (missingCanonical.length) {
  findings.push({
    severity: 'medium',
    issue: `No canonical in served HTML on ${missingCanonical.length} route(s): ${missingCanonical.join(', ')} — injected by JS only`,
  });
}
/* Every route served og:url = the homepage on 2026-08-17, so every link anyone shares — a blog
   post, pricing, apply — unfurls in Slack, X and LinkedIn as the front page. Unfurlers do not run
   JavaScript, so the client-side injection that fixes the canonical does nothing here: this one can
   only be fixed in the page's own head. Separate from the canonical finding because it fails for a
   different audience and would be fixed by a different edit. */
const ogHome = rawRouteMeta.filter((row) => row.route !== '/' && row.ogUrl && new URL(row.ogUrl, SITE).pathname === '/');
const ogMissing = rawRouteMeta.filter((row) => row.ogUrl === '');
if (ogHome.length) {
  findings.push({
    severity: 'medium',
    issue: `og:url points at the homepage on ${ogHome.length} route(s): ${ogHome.map((r) => r.route).join(', ')} — every share of these unfurls as the front page`,
  });
}
if (ogMissing.length) {
  findings.push({
    severity: 'medium',
    issue: `No og:url at all on ${ogMissing.length} route(s): ${ogMissing.map((r) => r.route).join(', ')}`,
  });
}
const pass = reportPass(findings);

const out = {
  at: new Date().toISOString(),
  url,
  htmlScan,
  metaCounts,
  rawCanonicals,
  rawRouteMeta,
  pageScan,
  findings,
  pass,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ pass, findings: findings.length, mcpGone: htmlScan.mcpScriptsGone, formsOk: htmlScan.formsOk, out: OUT }));
process.exit(pass ? 0 : 1);
