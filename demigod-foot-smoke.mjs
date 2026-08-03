#!/usr/bin/env node
/**
 * demigod-foot-smoke — boot foot-core in a minimal DOM shim (parse + run)
 *
 *   node demigod-foot-smoke.mjs [path/to/foot.js]
 *
 * Fails if IIFE throws or version marker missing. Closes verify:source gap when
 * CDN foot is assumed healthy. Always run after foot-core edits.
 */
import fs from 'fs';
import vm from 'vm';
import { fileURLToPath } from 'url';

function makeEl() {
  return {
    style: { setProperty() {}, removeProperty() {}, cssText: '' },
    dataset: {}, children: [], files: null,
    classList: { add() {}, remove() {}, toggle() {} },
    parentElement: null, parentNode: null,
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    appendChild() {}, insertBefore() {}, insertAdjacentElement() {},
    prepend() {}, remove() {}, replaceWith() {}, addEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, scrollIntoView() {},
    textContent: '', innerHTML: '', value: '',
  };
}

export function runFootSmoke(src = '/home/potter/demigod-foot-core.js') {
const code = fs.readFileSync(src, 'utf8');
if (!/window\.__dgPageReturnFocus=document\.activeElement/.test(code)) throw new Error('product pages must remember their opener');
if (!/returnFocus\.isConnected&&typeof returnFocus\.focus===['"]function['"]/.test(code)) throw new Error('product pages must restore focus to a connected opener');
if (!/if \(rsvpBtn\) rsvpBtn\.disabled = true/.test(code)) throw new Error('public RSVP submit must disable its button while a request is in flight (double-submit guard)');
if (!/if \(rsvpBtn\) rsvpBtn\.disabled = false/.test(code)) throw new Error('public RSVP submit must re-enable its button after the request settles');
const executable = code.replace(
  'window.__dgScrub = scrubStaticLabels;',
  'window.__dgScrub = scrubStaticLabels; window.__dgClosePageForSmoke = closePage; window.__dgRouteStateForSmoke = { pages: DG_PAGES, paths: DG_PAGE_PATHS };',
);
const document = {
  body: makeEl(), head: makeEl(), documentElement: makeEl(),
  createElement: () => makeEl(),
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {},
};
const thenable = { then() { return this; }, catch() { return this; } };
let replacedUrl = null;
const sandbox = {
  document,
  location: { hash: '', href: 'https://www.trydemigod.com/' },
  history: { state: null, replaceState(_state, _title, url) { replacedUrl = String(url); } },
  URL, URLSearchParams,
  navigator: { userAgent: 'smoke' },
  getComputedStyle: () => ({ display: 'block' }),
  MutationObserver: class { observe() {} disconnect() {} },
  fetch: () => thenable,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  console: { log() {}, warn() {}, error() {} },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

let threw = null;
try { vm.runInNewContext(executable, sandbox, { filename: src, timeout: 5000 }); }
catch (e) { threw = e; }

if (!threw && typeof sandbox.window.__dgClosePageForSmoke === 'function') {
  sandbox.location.href = 'https://www.trydemigod.com/events?utm_source=smoke#calendar';
  sandbox.window.__dgClosePageForSmoke();
}
const hardRouteCloseOk = replacedUrl === '/?utm_source=smoke#calendar';

const privateVer = String(sandbox.window.__dgFootVer || '').replace(/^v/i, '');
const publicVer = String(sandbox.window.dgFootVersion || '').replace(/^v/i, '');
const markersAgree = Boolean(privateVer && publicVer && privateVer === publicVer);
const routeState = sandbox.window.__dgRouteStateForSmoke || {};
const pages = routeState.pages || {};
const paths = routeState.paths || {};
const retiredPageIds = ['method', 'founders', 'candidates', 'compare', 'status', 'partners'];
const canonicalPageIds = ['how', 'hire', 'talent', 'pricing', 'about', 'contact', 'refer', 'events', 'sample'];
const routeAliases = {
  method: 'how', founders: 'hire', candidates: 'talent', engineers: 'talent', compare: 'pricing', status: 'about',
  partners: 'refer', partnerships: 'refer', partnership: 'refer',
};
const routeConsolidationOk =
  retiredPageIds.every((id) => !pages[id]) &&
  canonicalPageIds.every((id) => pages[id]) &&
  Object.entries(routeAliases).every(([from, to]) => paths[`/${from}`] === to);
const volumePrefixScrubOk = /\(\?:shortlist\|slate\|set\|batch\|group\)\\s\+of/.test(code);
const volumeSuffixSlashScrubOk = code.includes('(?:3\\s*(?:[/–—-]|to)\\s*5');
const legacyHireDeservesScrubOk = code.includes('(?:NEEDS|DESERVES)') && code.includes('(?:needs|deserves)');
const founderAudienceHireScrubOk = code.includes('FOUNDERS?|SF\\s+(?:BAY\\s+AREA\\s+)?STARTUPS?') &&
  code.includes('founders?|SF\\s+(?:Bay\\s+Area\\s+)?startups?');
const scalingAudienceHireScrubOk = code.includes('GROWING|SCALING|EARLY[\\s-]?STAGE') &&
  code.includes('growing|scaling|early[\\s-]?stage') &&
  code.includes('TEAMS?|STARTUPS?|COMPAN(?:Y|IES)') &&
  code.includes('teams?|startups?|compan(?:y|ies)');
const tapTargetFloorOk = /#dg-nav-hire,#dg-nav-talent,#dg-bar a\{min-height:48px!important\}/.test(code);
const sampleCtaRouteOk = /See a fictional match note[\s\S]{0,500}openPage\(['"]sample['"],true\)/.test(code) &&
  !/dg-sample-match,#jobseeker-modal \.dg-sample-match\{display:none!important\}/.test(code) &&
  !/done\.offsetParent===null&&getComputedStyle\(done\)\.display===['"]none['"]/.test(code);
const usefulPassOk = code.includes('A useful pass') && code.includes('do not force an intro');
const pass = !threw && markersAgree && routeConsolidationOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && legacyHireDeservesScrubOk && founderAudienceHireScrubOk && scalingAudienceHireScrubOk && tapTargetFloorOk && sampleCtaRouteOk && usefulPassOk && hardRouteCloseOk;
const markerError = !threw && !markersAgree
  ? `foot version markers disagree (public=${publicVer || 'missing'}, private=${privateVer || 'missing'})`
  : null;
const routeError = !threw && markersAgree && !routeConsolidationOk
  ? 'duplicate product pages or their canonical aliases are incomplete'
  : null;
const volumeError = !threw && markersAgree && routeConsolidationOk && !volumePrefixScrubOk
  ? 'canvas volume scrub misses slate/group-of count prefixes'
  : null;
const volumeSuffixSlashError = !threw && markersAgree && routeConsolidationOk && volumePrefixScrubOk && !volumeSuffixSlashScrubOk
  ? 'canvas volume scrub misses slash-separated count suffixes'
  : null;
const legacyHireDeservesError = !threw && markersAgree && routeConsolidationOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && !legacyHireDeservesScrubOk
  ? 'canvas CTA scrub misses talent-your-team/startup/company-deserves variants'
  : null;
const founderAudienceHireError = !threw && markersAgree && routeConsolidationOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && legacyHireDeservesScrubOk && !founderAudienceHireScrubOk
  ? 'canvas CTA scrub misses talent-for-founders/SF-startups variants'
  : null;
const scalingAudienceHireError = !threw && markersAgree && routeConsolidationOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && legacyHireDeservesScrubOk && founderAudienceHireScrubOk && !scalingAudienceHireScrubOk
  ? 'canvas CTA scrub misses talent-for-scaling-teams/startups/companies variants'
  : null;
const tapTargetError = !threw && markersAgree && routeConsolidationOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && legacyHireDeservesScrubOk && founderAudienceHireScrubOk && scalingAudienceHireScrubOk && !tapTargetFloorOk
  ? 'shared hero/nav/mobile CTAs do not enforce the 48px tap-target floor'
  : null;
const hardRouteCloseError = !threw && markersAgree && routeConsolidationOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && legacyHireDeservesScrubOk && founderAudienceHireScrubOk && scalingAudienceHireScrubOk && tapTargetFloorOk && !hardRouteCloseOk
  ? `closing /events produced ${replacedUrl || 'no history update'}, expected / with query/hash preserved`
  : null;
const sampleCtaRouteError = !threw && !sampleCtaRouteOk
  ? 'post-submit next action is hidden or does not open the fictional match note'
  : null;
const usefulPassError = !threw && !usefulPassOk
  ? 'fictional sample route does not explain a useful pass'
  : null;
return {
  pass,
  version: markersAgree ? privateVer : null,
  publicVersion: publicVer || null,
  privateVersion: privateVer || null,
  markersAgree,
  routeConsolidationOk,
  volumePrefixScrubOk,
  volumeSuffixSlashScrubOk,
  legacyHireDeservesScrubOk,
  founderAudienceHireScrubOk,
  scalingAudienceHireScrubOk,
  tapTargetFloorOk,
  sampleCtaRouteOk,
  usefulPassOk,
  hardRouteCloseOk,
  error: threw ? String(threw.message || threw) : (markerError || routeError || volumeError || volumeSuffixSlashError || legacyHireDeservesError || founderAudienceHireError || scalingAudienceHireError || tapTargetError || sampleCtaRouteError || usefulPassError || hardRouteCloseError),
};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const smokeArgs = process.argv.slice(2);
  if (smokeArgs.includes('--help') || smokeArgs.includes('-h')) {
    console.log(`demigod-foot-smoke — boot foot-core in a DOM shim

Usage: node demigod-foot-smoke.mjs [path/to/foot.js]`);
    process.exit(0);
  }
  const pathArg = smokeArgs.find((a) => !a.startsWith('-'));
  const unknown = smokeArgs.find((a) => a.startsWith('-'));
  if (unknown) {
    console.error(
      `foot-smoke: unknown argument ${unknown} — try: node demigod-foot-smoke.mjs [path/to/foot.js]`,
    );
    process.exit(2);
  }
  const result = runFootSmoke(pathArg);
  console.log(JSON.stringify(result));
  process.exit(result.pass ? 0 : 1);
}
