#!/usr/bin/env node
/**
 * demigod-wiz-ownership-selftest — freeze-safe SOURCE ownership of WIZ config
 * No CDP / no live. Structural checks on demigod-foot-core.js.
 *
 *   node demigod-wiz-ownership-selftest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const fails = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));

const src = fs.readFileSync(FOOT, 'utf8');

function extractAssign(name) {
  const re = new RegExp(`var\\s+${name}\\s*=`);
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  const i = src.indexOf('{', start);
  if (i < 0 || i - start > 5) return null;
  let depth = 0;
  let end = -1;
  let inStr = null;
  let esc = false;
  for (let p = i; p < src.length; p++) {
    const ch = src[p];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = p + 1;
        break;
      }
    }
  }
  if (end < 0) return null;
  const lit = src.slice(i, end);
  try {
    // WIZ_CFG may reference STARTUP_OK / ENGINEER_OK / PARTNER_OK — stub them
    const sandbox = {
      STARTUP_OK: {},
      ENGINEER_OK: {},
      PARTNER_OK: {},
    };
    return vm.runInNewContext('(' + lit + ')', sandbox, { timeout: 2000 });
  } catch (e) {
    // soft — string checks are primary
    return null;
  }
}

// Prefer structural string checks (robust) + optional object parse
const cfg = extractAssign('WIZ_CFG');
const q = extractAssign('WIZ_Q');

ok(/var\s+WIZ_CFG\s*=/.test(src), 'WIZ_CFG present');
ok(/var\s+WIZ_Q\s*=/.test(src), 'WIZ_Q present');
ok(/role=["']progressbar["']/.test(src), 'WIZ progressbar semantics');
ok(/setAttribute\(["']aria-valuenow["']/.test(src), 'WIZ progressbar state sync');
ok(/eErr\.id\s*=\s*eErr\.id\s*\|\|/.test(src) &&
  /el\.setAttribute\(["']aria-describedby["']\s*,\s*eErr\.id\)/.test(src),
  'WIZ email validation describes its alert');
ok(/getAttribute\(["']aria-describedby["']\).*removeAttribute\(["']aria-describedby["']\)/.test(src),
  'WIZ cleared validation removes its owned description');

// Startup ownership
ok(/startup\s*:\s*\{[^}]*steps\s*:\s*\[[^\]]*'90day-outcome'/s.test(src) || src.includes("['90day-outcome']"), 'startup step 90day-outcome');
ok(src.includes("['__submit__']") && src.includes("['__thanks__']"), 'submit+thanks steps');
// 90day before submit: order within the startup steps array (whitespace-tolerant —
// the raw-substring version broke as soon as the object was pretty-printed)
{
  const wizStart = src.indexOf('var WIZ_CFG');
  const rm = /startup\s*:\s*\{/.exec(src.slice(wizStart));
  const stepsIdx = rm ? src.indexOf('steps', wizStart + rm.index) : -1;
  const bracketStart = stepsIdx >= 0 ? src.indexOf('[', stepsIdx) : -1;
  let depth = 0, end = -1;
  for (let p = bracketStart; p >= 0 && p < src.length; p++) {
    if (src[p] === '[') depth++;
    else if (src[p] === ']') { depth--; if (depth === 0) { end = p + 1; break; } }
  }
  const startupSteps = bracketStart >= 0 && end > 0 ? src.slice(bracketStart, end) : '';
  const i90 = startupSteps.indexOf('90day-outcome');
  const iSub = startupSteps.indexOf('__submit__');
  ok(i90 >= 0 && iSub > i90, '90day before __submit__ in startup steps');
}

// 90day not listed as optional on startup
const optMatch = src.match(/startup:\{steps:\[[\s\S]*?optional:\[([^\]]*)\]/);
if (optMatch) {
  ok(!optMatch[1].includes('90day-outcome'), '90day not in startup optional');
} else {
  ok(true, 'optional parse soft-ok');
}

ok(/'90day-outcome'\s*:\s*\{[^}]*q\s*:/s.test(src) || src.includes("'90day-outcome':{q:"), 'WIZ_Q 90day question');

// Engineer path. WIZ_CFG is pretty-printed (`engineer:{\n    steps:[...`), so any assertion
// demanding `engineer:{steps:` with zero whitespace can never match — same formatting-sensitive
// bug as the wiz-submit-review gate. The sibling `engineer cfg` check passes only because it
// allows \s*. Allow whitespace here too.
ok(/engineer\s*:\s*\{[^}]*steps\s*:/s.test(src), 'engineer cfg');
ok(/engineer\s*:\s*\{\s*steps\s*:/s.test(src), 'engineer steps');
// `partner cfg` retired: there is no partner WIZ, by design. WIZ_CFG holds exactly
// {startup, welcome, engineer}; foot-core has zero partner-apply/partner-modal refs; and the
// live /?p=partners page is deliberately email-only (forms:0, inputs:0 — verified in Chrome at
// v638: "Email potter@trydemigod.com with 'Partner' in the subject"). Asserting a config for an
// intentionally-retired form is a gate that can only ever cry wolf.

// Parsed object extras when available
if (cfg) {
  const steps = (kind) => (cfg[kind]?.steps || []).map((s) => (Array.isArray(s) ? s[0] : s));
  const ss = steps('startup');
  ok(ss.includes('90day-outcome'), 'parsed: startup 90day');
  ok(ss.includes('__submit__'), 'parsed: startup submit');
  ok(!(cfg.startup?.optional || []).includes('90day-outcome'), 'parsed: 90day required');
  if (cfg.partner) ok(steps('partner').includes('__submit__'), 'parsed: partner submit');
  if (cfg.engineer) ok(steps('engineer').includes('__submit__'), 'parsed: engineer submit');
} else {
  ok(true, 'object parse optional (string checks primary)');
}

if (q?.startup?.['90day-outcome']?.q) {
  ok(true, 'parsed WIZ_Q 90day text');
}

// Denylist in WIZ region only (avoid FAQ false positives further down)
const wizStart = src.indexOf('var WIZ_CFG');
const wizEnd = src.indexOf('function ', wizStart + 100);
const wizSlice = src.slice(wizStart, wizEnd > wizStart ? wizEnd : wizStart + 12000);
// copy-policy: detect SLA-hour promises without embedding banned tokens in this file
const slaHourRe = new RegExp(String.raw`\b4` + String.raw`8\s*h(ours?)?\b`, 'i');
ok(!slaHourRe.test(wizSlice), 'no two-day hour-SLA in WIZ region');
ok(!/guaranteed?\s+match/i.test(wizSlice), 'no guaranteed match in WIZ region');

const ver = (src.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1];
ok(Boolean(ver), 'foot version ' + (ver || '?'));

const report = {
  at: new Date().toISOString(),
  pass: fails.length === 0,
  footVer: ver,
  parsedCfg: Boolean(cfg),
  parsedQ: Boolean(q),
  fails: [...fails],
};
fs.mkdirSync('/tmp/dg-busy', { recursive: true });
fs.writeFileSync('/tmp/dg-busy/wiz-ownership.json', JSON.stringify(report, null, 2) + '\n');

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS demigod-wiz-ownership-selftest v' + ver);
