#!/usr/bin/env node
/**
 * Conversion playtest — site green check for hiring path.
 * Layer 1 (always): live HTML markers (path pills, WIZ hooks, foot, copy-policy).
 * Layer 2 (optional): Playwright dry form e2e when available.
 *
 * Usage:
 *   node demigod-conversion-playtest.mjs
 *   node demigod-conversion-playtest.mjs --pw       # try playwright dry
 *   node demigod-conversion-playtest.mjs --local    # pass --local to pw
 *   node demigod-conversion-playtest.mjs --json
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  BUSY,
  ensureBusy,
  atomicWrite,
  LIVE_DEFAULT,
  parseFirstJson,
  flag,
} from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.DEMIGOD_LIVE || LIVE_DEFAULT;
const args = process.argv.slice(2);
const wantPw = flag(args, '--pw');
const local = flag(args, '--local');
const asJson = flag(args, '--json');

const steps = [];
let pass = true;

function add(name, ok, detail) {
  steps.push({ name, ok: Boolean(ok), detail: String(detail || '').slice(0, 200) });
  if (!ok) pass = false;
}

async function liveLayer() {
  const t0 = Date.now();
  try {
    const r = await fetch(`${LIVE}/?cb=${Date.now()}`, {
      headers: { 'User-Agent': 'dg-conversion-playtest' },
      signal: AbortSignal.timeout(15000),
    });
    const html = await r.text();
    add('live-http', r.ok, `HTTP ${r.status} ${Date.now() - t0}ms`);

    // Foot may be catbox, jsDelivr gh CDN, or other host — accept known loaders
    const cdn =
      (html.match(/files\.catbox\.moe\/([a-z0-9]+\.js)/) || [])[1] ||
      (html.match(/cdn\.jsdelivr\.net\/gh\/[^"'>\s]+\/foot[^"'>\s]*\.js/) || [])[0] ||
      (html.match(/demigod-foot-cdn-loader|foot-latest\.js/) || [])[0];
    add('live-cdn-script', Boolean(cdn), cdn || 'missing foot CDN script');

    const foot = (html.match(/foot v(\d+)/) || [])[1];
    add('live-foot-ver', Boolean(foot), foot ? `v${foot}` : 'no foot ver marker');

    // Path pills are JS-injected — check live HTML + disk foot source
    let footDisk = '';
    try {
      footDisk = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    } catch {
      /* */
    }
    const hasHiring =
      /I.?m hiring/i.test(html) ||
      /I.?m looking/i.test(html) ||
      /dg-path-pill|path-pill|data-dg-path|dg-path/i.test(html) ||
      /wiz=startup/i.test(html) ||
      /I.?m hiring|I.?m looking|path.?pill|dg-path/i.test(footDisk);
    add(
      'hiring-path-signal',
      hasHiring,
      hasHiring ? 'path pills (live and/or disk foot)' : 'missing hiring path CTAs',
    );

    // WIZ / form hooks — require form structure, not mere "webflow" string
    const hasWiz =
      /w-form|dg-wiz|data-name=["'][^"']*startup|name=["']contact-email|90day-outcome|90-day/i.test(
        html,
      );
    add('wiz-or-form-hook', hasWiz, hasWiz ? 'form/wiz field markers' : 'no strong form markers');

    // no speed promises
    const speed = /48\s*h|within\s*\d+\s*h|\bSLA\b|fastest reply/i.test(html);
    add('no-speed-promise', !speed, speed ? 'speed language on live' : 'clean');

    // hello contact
    add(
      'hello-contact',
      /potter@trydemigod\.com/i.test(html),
      /potter@trydemigod\.com/i.test(html) ? 'potter@ present' : 'missing potter@ contact',
    );

    return { cdn, foot };
  } catch (e) {
    add('live-http', false, String(e.message || e));
    return {};
  }
}

function copyPolicyLayer() {
  const r = spawnSync('node', ['demigod-copy-policy.mjs', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
  });
  const j = parseFirstJson(r.stdout || r.stderr || '');
  add('copy-policy-disk', r.status === 0 && j?.pass !== false, j?.summary || (r.stdout || '').slice(0, 80));
}

function pwLayer() {
  const cmd = ['demigod-form-e2e-pw.mjs', '--dry'];
  // form e2e uses no --dry flag as separate - check: dry by default without --submit
  const argv = ['demigod-form-e2e-pw.mjs'];
  if (local) argv.push('--local');
  const r = spawnSync('node', argv, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
  });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  const j = parseFirstJson(out);
  // soft: pw fail does not fail whole conversion if live layer green — mark as step
  const ok = r.status === 0 && (j?.pass === true || /pass["']?\s*:\s*true/i.test(out));
  steps.push({
    name: 'playwright-form-e2e',
    ok,
    soft: true,
    detail: j ? `pass=${j.pass} err=${j.error || ''}` : out.slice(0, 120),
  });
  // soft fail: don't flip global pass
  return ok;
}

const live = await liveLayer();
copyPolicyLayer();
let pwOk = null;
if (wantPw) {
  pwOk = pwLayer();
}

// pass = all non-soft steps
pass = steps.filter((s) => !s.soft).every((s) => s.ok);

const report = {
  at: new Date().toISOString(),
  pass,
  liveUrl: LIVE,
  live,
  pw: wantPw ? pwOk : null,
  steps,
  summary: pass
    ? 'PASS — conversion surface green'
    : `FAIL — ${steps
        .filter((s) => !s.ok && !s.soft)
        .map((s) => s.name)
        .join(', ')}`,
  next: pass
    ? 'site conversion markers OK; use white-glove on real submit'
    : 'fix conversion markers before site polish claims',
};

ensureBusy();
atomicWrite(path.join(BUSY, 'conversion-playtest-latest.json'), JSON.stringify(report, null, 2) + '\n');

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`conversion-playtest  ${pass ? 'PASS ✓' : 'FAIL ✗'}`);
  for (const s of steps) {
    const soft = s.soft ? ' (soft)' : '';
    console.log(`  ${s.ok ? '✓' : '✗'} ${s.name.padEnd(26)} ${s.detail}${soft}`);
  }
  console.log(`next  ${report.next}`);
  console.log(`wrote /tmp/dg-busy/conversion-playtest-latest.json`);
}

process.exit(pass ? 0 : 1);
