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
const document = {
  body: makeEl(), head: makeEl(), documentElement: makeEl(),
  createElement: () => makeEl(),
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {},
};
const thenable = { then() { return this; }, catch() { return this; } };
const sandbox = {
  document,
  location: { hash: '', href: 'https://www.trydemigod.com/' },
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
try { vm.runInNewContext(code, sandbox, { filename: src, timeout: 5000 }); }
catch (e) { threw = e; }

const privateVer = String(sandbox.window.__dgFootVer || '').replace(/^v/i, '');
const publicVer = String(sandbox.window.dgFootVersion || '').replace(/^v/i, '');
const markersAgree = Boolean(privateVer && publicVer && privateVer === publicVer);
const decisionSequences = (code.match(/<ol class=["']dg-decision-grid["']/g) || []).length;
const decisionSequenceLabels = (code.match(/aria-label=["'][^"']+decision sequence["']/g) || []).length;
const decisionSemanticsOk = decisionSequences >= 2 && decisionSequenceLabels >= 2;
const decisionPathIds = ['how', 'founders', 'candidates', 'pricing', 'faq', 'compare'];
const missingDecisionPaths = decisionPathIds.filter((id) =>
  !code.includes(`data-dg-page="${id}"`));
const decisionPathsOk = missingDecisionPaths.length === 0;
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
const pass = !threw && markersAgree && decisionSemanticsOk && decisionPathsOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && legacyHireDeservesScrubOk && founderAudienceHireScrubOk && scalingAudienceHireScrubOk && tapTargetFloorOk;
const markerError = !threw && !markersAgree
  ? `foot version markers disagree (public=${publicVer || 'missing'}, private=${privateVer || 'missing'})`
  : null;
const semanticsError = !threw && markersAgree && !decisionSemanticsOk
  ? `founders/talent decision sequences missing ordered-list semantics (lists=${decisionSequences}, labels=${decisionSequenceLabels})`
  : null;
const pathsError = !threw && markersAgree && decisionSemanticsOk && !decisionPathsOk
  ? `decision-screen path navigation missing: ${missingDecisionPaths.join(', ')}`
  : null;
const volumeError = !threw && markersAgree && decisionSemanticsOk && decisionPathsOk && !volumePrefixScrubOk
  ? 'canvas volume scrub misses slate/group-of count prefixes'
  : null;
const volumeSuffixSlashError = !threw && markersAgree && decisionSemanticsOk && decisionPathsOk && volumePrefixScrubOk && !volumeSuffixSlashScrubOk
  ? 'canvas volume scrub misses slash-separated count suffixes'
  : null;
const legacyHireDeservesError = !threw && markersAgree && decisionSemanticsOk && decisionPathsOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && !legacyHireDeservesScrubOk
  ? 'canvas CTA scrub misses talent-your-team/startup/company-deserves variants'
  : null;
const founderAudienceHireError = !threw && markersAgree && decisionSemanticsOk && decisionPathsOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && legacyHireDeservesScrubOk && !founderAudienceHireScrubOk
  ? 'canvas CTA scrub misses talent-for-founders/SF-startups variants'
  : null;
const scalingAudienceHireError = !threw && markersAgree && decisionSemanticsOk && decisionPathsOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && legacyHireDeservesScrubOk && founderAudienceHireScrubOk && !scalingAudienceHireScrubOk
  ? 'canvas CTA scrub misses talent-for-scaling-teams/startups/companies variants'
  : null;
const tapTargetError = !threw && markersAgree && decisionSemanticsOk && decisionPathsOk && volumePrefixScrubOk && volumeSuffixSlashScrubOk && legacyHireDeservesScrubOk && founderAudienceHireScrubOk && scalingAudienceHireScrubOk && !tapTargetFloorOk
  ? 'shared hero/nav/mobile CTAs do not enforce the 48px tap-target floor'
  : null;
return {
  pass,
  version: markersAgree ? privateVer : null,
  publicVersion: publicVer || null,
  privateVersion: privateVer || null,
  markersAgree,
  decisionSemanticsOk,
  decisionPathsOk,
  missingDecisionPaths,
  volumePrefixScrubOk,
  volumeSuffixSlashScrubOk,
  legacyHireDeservesScrubOk,
  founderAudienceHireScrubOk,
  scalingAudienceHireScrubOk,
  tapTargetFloorOk,
  error: threw ? String(threw.message || threw) : (markerError || semanticsError || pathsError || volumeError || volumeSuffixSlashError || legacyHireDeservesError || founderAudienceHireError || scalingAudienceHireError || tapTargetError),
};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = runFootSmoke(process.argv[2]);
  console.log(JSON.stringify(result));
  process.exit(result.pass ? 0 : 1);
}
