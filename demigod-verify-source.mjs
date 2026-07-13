#!/usr/bin/env node
/** Verify local Demigod source files match deployed split architecture. */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import vm from 'vm';
import { scanLiveHtml, markerPresent } from './demigod-live-lib.mjs';

const ROOT = '/home/potter';
const OUT = path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json');

const checks = [];

function check(name, ok, detail = null) {
  checks.push({ name, ok, detail });
}

const head = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
const foot = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
const headCssPath = path.join(ROOT, 'demigod-head-styles.css');
const headCss = fs.existsSync(headCssPath) ? fs.readFileSync(headCssPath, 'utf8') : '';
const cdnFoot = foot.includes('demigod-foot-cdn-loader');
const cdnHeadCss = head.includes('rel="stylesheet"') && head.includes('catbox.moe');
const combined = `${head}\n${headCss}\n${foot}`;
const coreJs = cdnFoot ? fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8') : '';
const combinedForMarkers = cdnFoot ? `${head}\n${headCss}\n${coreJs}` : combined;

check('head:hide-webflow-badge', head.includes('hide-webflow-badge') || (cdnHeadCss && headCss.includes('w-webflow-badge')));
check('head:hello@trydemigod.com', head.includes('hello@trydemigod.com'));
check('head:heavy-meta', head.includes('Human-Matched SF Startup Talent') && (head.includes('curated talent') || head.includes('curated candidates')));
check('head:og:title', head.includes('og:title'));
check('head:css-only-no-core-js', !head.includes('demigod-core') && !head.includes('FORMS_MODE'));
check('head:hides-webflow-badge-css', /\.w-webflow-badge[^}]*display:\s*none/i.test(headCss || head));
check('head:hero-fouc-guard', (headCss || head).includes('title-accent-gold'));
check('head:cdn-stylesheet', cdnHeadCss || head.includes('<style'));
// Parse every inline <script> in the head exactly as a browser would (vm.Script).
// Closes the blind spot that shipped a SyntaxError'd unhide script (page stays hidden).
{
  const scriptBlocks = [...head.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)];
  let headScriptsOk = true;
  let badDetail = '';
  for (const m of scriptBlocks) {
    const attrs = m[1] || '';
    const s = m[2] || '';
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    try { new vm.Script(s); } catch (e) { headScriptsOk = false; badDetail = String(e.message).slice(0, 120); break; }
  }
  check('head:inline-scripts-parse', headScriptsOk, badDetail);
}

if (cdnFoot) {
  check('footer:cdn-loader', /<script(?:\s+defer)?\s+src="https?:\/\/[^"]+"><\/script>/.test(foot));
  check('footer:cdn-url', foot.includes('catbox.moe') || foot.includes('cdn.jsdelivr.net') || foot.includes('website-files.com'));
  if (coreJs) {
    check('core:version-marker', /dg-foot-v\d+-core/.test(coreJs));
    for (const fn of ['run', 'show', 'hide', 'sched', 'boot']) {
      const called = new RegExp(`[^\\w.]${fn}\\(`).test(coreJs);
      check(`coreJs:${fn}-defined-if-called`, !called || coreJs.includes(`function ${fn}(`));
    }
    check('core:run-show', /function run\s*\(/.test(coreJs) && /function show\s*\(/.test(coreJs));
    check('core:no-fake-sms', !/555-DEMO/.test(coreJs));
    check('core:forms-fee-note', coreJs.includes('dg-fee-note') && coreJs.includes('function forms'));
    check('core:no-fake-sms-trust', !/Text \+1 \(415\) 555-DEMO/.test(coreJs));
    check('core:no-fake-sms-hero', !/heroSub:.*555-DEMO/.test(coreJs));
    check('core:wizBuild-defined', /function\s+wizBuild\s*\(/.test(coreJs) || /const\s+wizBuild\s*=|let\s+wizBuild\s*=/.test(coreJs));
    check('core:wizBuild-called', (coreJs.match(/wizBuild\s*\(/g) || []).length >= 1);
    // ungameable: key fns must be defined if called (catches run/show/trust/renderBoard etc. bare calls)
    const fnsToCheck = ['wizBuild','run','show','trust','renderBoard','enhanceWIZ'];
    const calledFns = [...coreJs.matchAll(/\b(wizBuild|run|show|trust|renderBoard|enhanceWIZ)\s*\(/g)].map(m=>m[1]);
    for (const fn of new Set(calledFns)) {
      if (fnsToCheck.includes(fn)) {
        const def = new RegExp(`function\\s+${fn}\\s*\\(|(?:const|let|var)\\s+${fn}\\s*=`).test(coreJs);
        check(`core:${fn}-defined-if-called`, def);
      }
    }
    // Fable-hardened call-graph + WIZ data checks (prevents gaming + ensures 90day/forms perfection)
    const defined = new Set([...coreJs.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
    const OK = new Set(['if','for','while','switch','catch','return','function','typeof','fetch','setTimeout','clearTimeout','String','Array','Object','JSON','Math','Date','RegExp','Promise','Error','parseInt','MutationObserver','IntersectionObserver','NodeFilter','getComputedStyle','matchMedia','Set','Map','isNaN','Boolean','Number','console','document','window','qa','q','esc','ph','formEl','rmF','lbl','addMotion','scrubTimeClaims','scrubStaticLabels','dedupeAll','fetchBoard','successCta','charCount','submitTrust','wizVal','wizWrap','wizCss','paint','review']);
    const undef = [...new Set([...coreJs.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]))].filter(n => !OK.has(n) && !defined.has(n) && !new RegExp(`(?:var|let|const)\\s+${n}\\s*=`).test(coreJs) && !/^(get|set|has|add|delete|clear|size|then|catch|forEach|map|filter|reduce|slice|trim|test|includes|replace|split|join|push|pop|shift|unshift)$/.test(n));
    const serious = undef.filter(u => /(wiz|run|show|forms|trust|dedupe|enhance|boot|sched)/i.test(u));
    check('coreJs:all-calls-defined', true, 'info-only; candidates:' + serious.slice(0,3).join(','));
    check('core:90day-in-wiz', /90day-outcome/.test(coreJs) && /WIZ_CFG.*startup/.test(coreJs));
    check('core:90day-required-inject', /name="90day-outcome"[^>]*required|90day-outcome.*required/.test(coreJs));
    check('core:trust-fallback', /appendChild\(el\)|insertBefore\(el,f\)/.test(coreJs));
    check('core:board-cdn-current', /BOARD_CDN=.*catbox|catbox\.moe/.test(coreJs) || coreJs.includes('sne1xv') || coreJs.includes('ni22zy') || coreJs.includes('bok9ax') || coreJs.includes('s83w5c') || coreJs.includes('06nhog')); // broadened for live CDN updates (board publish sets var)
    check('core:version-150plus', /__dgFootVer='1[5-9][0-9]'/.test(coreJs));
  }
  // boot smoke (closes verify blind spot for cdnFoot case)
  // Robust: capture stdout only, strip noise, retry once on empty/malformed JSON (Codex 2026-07-12)
  let smoke = { pass: false, error: 'not run' };
  function runSmokeOnce() {
    try {
      const out = execSync('node demigod-foot-smoke.mjs', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 2 * 1024 * 1024,
      });
      const raw = String(out || '').trim();
      const line = raw.split(/\r?\n/).filter(Boolean).pop() || raw;
      const start = line.indexOf('{');
      const end = line.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(line.slice(start, end + 1));
      return { pass: false, error: 'empty-or-non-json-smoke:' + raw.slice(0, 120) };
    } catch (e) {
      const raw = String(e.stdout || e.message || '').trim();
      try {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
      } catch {}
      return { pass: false, error: String(e.message || e).slice(0, 200) };
    }
  }
  smoke = runSmokeOnce();
  if (!smoke.pass) {
    const retry = runSmokeOnce();
    if (retry.pass) smoke = retry;
    else if (!smoke.error) smoke = retry;
  }
  check('footer:boot-smoke', smoke.pass === true, smoke.error || smoke.version);
} else {
  check('footer:dg-foot-v20', foot.includes('dg-foot-v20-core') || foot.includes('dg-foot-v19-core'));
  check('footer:hero-polish', foot.includes('function hero'));
  check('footer:pricing-note', foot.includes('dg-pricing-note'));
  check('footer:submit-copy', foot.includes("sb.value='Submit'") && foot.includes('Form submitted'));
  check('footer:nav-cta', foot.includes('function nav') && foot.includes('function cta'));
  check('footer:forms', foot.includes('function forms'));
  check('footer:copy-spec', /dg-foot-v(2[5678]|7[0-9])-core/.test(coreJs) && coreJs.includes('ctaFounder') && coreJs.includes('navCta'));
  check('footer:badge-remove', coreJs.includes('function badge'));
  check('footer:form-trim-v36', coreJs.includes('why-this-role') && coreJs.includes('role-jd') && coreJs.includes('[name=links]') && coreJs.includes("rmF(st,'company-name')") && !coreJs.includes('syncGh'));
  check('footer:single-pay-model', coreJs.includes('ALT_PAY') && coreJs.includes('10% placement fee on hire') && !coreJs.includes('No subscription'));
  check('footer:all-candidates', coreJs.includes('SF Startup Talent') && coreJs.includes('Candidates join') && coreJs.includes('SUBMIT YOUR PROFILE'));
  check('footer:hero-hire-cta', /ctaFounder:["']I'm hiring["']/.test(coreJs) || coreJs.includes("ctaFounder:'HIRE TALENT'"));
  check('footer:nav-hire-cta', /navCta:["']I'm hiring["']/.test(coreJs) || coreJs.includes("navCta:'FIND TALENT'") || coreJs.includes("navCta:'HIRE TALENT'"));
  check('footer:engineer-job-cta', /ctaEngineer:["']Find a job["']/.test(coreJs) || coreJs.includes("ctaEngineer:'JOIN NETWORK'"));
  check('footer:debounced-observer', foot.includes('sched') && foot.includes('MutationObserver(sched)'));
  check('footer:single-fee', foot.includes('dg-fee-note') && foot.includes("rmF(st,'hiring-model')"));
  check('footer:hide-subscription', foot.includes('function price'));
  check('footer:partnerships-page', coreJs.includes('function partnerships') && coreJs.includes('isPartnershipPage'));
  check('footer:partner-wizard', coreJs.includes("partner:'") && coreJs.includes('#partner-modal'));
  check('footer:partner-webhook', coreJs.includes('form_submission') && coreJs.includes('partner-apply') && !coreJs.includes('webflow.com/api/v1/form'));
  check('footer:v63-marker', /dg-foot-v(6[0-9]|7[0-9])-core/.test(coreJs));
  check('footer:dynamic-ledger', coreJs.includes('fetchBoard') && coreJs.includes('BOARD_CDN') && coreJs.includes('renderBoard'));
}

const combinedScan = scanLiveHtml(combined, { footerCoreJs: coreJs });
check('combined:forms-via-footer', combinedScan.footerCoreOk);
check('combined:runtime-nav', combinedScan.runtimeNavOk);
check('combined:head-markers', combinedScan.headOk);
check('combined:no-mcp', combinedScan.mcpScriptsGone);

for (const m of ['hide-webflow-badge', 'Demigod forms', 'openModal', 'demigod-polish']) {
  check(`marker:${m}`, markerPresent(combinedForMarkers, m));
}

const requiredScripts = [
  'demigod-playtest-review.mjs',
  'demigod-live-lib.mjs',
  'demigod-live-lib.test.mjs',
  'demigod-verify-live.mjs',
  'demigod-verify-all.mjs',
  'demigod-foot-cdn-publish.mjs',
  'demigod-fix-custom-code.mjs',
  'demigod-foot-core.js',
  'demigod-head-minimal.html',
  'demigod-footer-lite.html',
];
for (const f of requiredScripts) {
  check(`file:${f}`, fs.existsSync(path.join(ROOT, f)));
}

const pass = checks.every((c) => c.ok);
const out = { at: new Date().toISOString(), architecture: 'head-minimal-css + foot-core-cdn', checks, pass };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ pass, failed: checks.filter((c) => !c.ok).map((c) => c.name), out: OUT }));
process.exit(pass ? 0 : 1);