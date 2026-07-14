#!/usr/bin/env node
/**
 * demigod-live-doctor — LIVE ARTIFACT DOCTOR (read-only)
 *
 * Disk → footer-lite → CDN → live HTML identity + freeze + board honesty.
 * JSON SoR: /tmp/dg-busy/live-doctor.json · CLI: bin/dg live · used by full-check.
 *
 * Drift policy:
 *   - Default: disk≠live is an *issue* but when freeze ON → driftExpected=true and
 *     pass stays true (intentional ship lag). Hard fail only with --require-match
 *     or DEMIGOD_REQUIRE_LIVE_MATCH=1 (release mode).
 *   - Never mutates CDN/Webflow.
 *
 * Usage:
 *   node demigod-live-doctor.mjs [--json] [--require-match]
 *   bin/dg live
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { isFrozen } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const requireMatch = args.includes('--require-match') || process.env.DEMIGOD_REQUIRE_LIVE_MATCH === '1';

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function diskFoot() {
  const p = path.join(ROOT, 'demigod-foot-core.js');
  const t = fs.readFileSync(p, 'utf8');
  const ver = (t.match(/__dgFootVer='(\d+)'/) || [])[1] || null;
  return {
    path: p,
    ver,
    bytes: Buffer.byteLength(t),
    sha256: sha256(t),
  };
}

function diskHeadCss() {
  const p = path.join(ROOT, 'demigod-head-styles.css');
  if (!fs.existsSync(p)) return null;
  const t = fs.readFileSync(p);
  return { path: p, bytes: t.length, sha256: sha256(t) };
}

function headMinimalCssUrl() {
  const p = path.join(ROOT, 'demigod-head-minimal.html');
  const t = fs.readFileSync(p, 'utf8');
  const m = t.match(/https:\/\/files\.catbox\.moe\/[a-z0-9]+\.css/);
  return m ? m[0] : null;
}

function footerLiteJsUrl() {
  const p = path.join(ROOT, 'demigod-footer-lite.html');
  const t = fs.readFileSync(p, 'utf8');
  const m = t.match(/https:\/\/files\.catbox\.moe\/[a-z0-9]+\.js/);
  return m ? m[0] : null;
}

async function fetchText(url) {
  const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`, {
    signal: AbortSignal.timeout(25000),
    headers: { 'User-Agent': 'demigod-live-doctor' },
  });
  const text = await r.text();
  return {
    ok: r.ok,
    status: r.status,
    contentType: r.headers.get('content-type') || '',
    bytes: Buffer.byteLength(text),
    text,
  };
}

async function main() {
  const issues = [];
  const ok = [];
  const disk = diskFoot();
  const headCss = diskHeadCss();
  const freeze = isFrozen();
  const footerUrl = footerLiteJsUrl();
  const headCssUrlDisk = headMinimalCssUrl();

  let honesty = null;
  try {
    honesty = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-BOARD-HONESTY.json'), 'utf8'));
  } catch {
    honesty = { pass: null, missing: true };
  }

  const liveHtml = await fetchText(LIVE + '/');
  const catboxJs = [...liveHtml.text.matchAll(/https:\/\/files\.catbox\.moe\/([a-z0-9]+\.js)/g)].map(
    (m) => m[0],
  );
  const catboxCss = [...liveHtml.text.matchAll(/https:\/\/files\.catbox\.moe\/([a-z0-9]+\.css)/g)].map(
    (m) => m[0],
  );
  const liveFootUrl = catboxJs.find((u) => !u.includes('m22wy3')) || catboxJs[0] || null;
  const liveCssUrl = catboxCss[0] || null;

  let liveJs = null;
  let liveVer = null;
  if (liveFootUrl) {
    liveJs = await fetchText(liveFootUrl);
    liveVer = (liveJs.text.match(/__dgFootVer='(\d+)'/) || [])[1] || null;
    if (!liveJs.ok) issues.push(`live foot CDN HTTP ${liveJs.status}`);
    else if (!/javascript|ecmascript|text\/plain/i.test(liveJs.contentType) && liveJs.bytes < 1000) {
      issues.push(`live foot CDN suspicious content-type ${liveJs.contentType}`);
    } else ok.push(`live foot CDN ${liveFootUrl} ver=${liveVer}`);
  } else {
    issues.push('no catbox foot JS in live HTML');
  }

  let driftExpected = false;
  if (disk.ver && liveVer && disk.ver !== liveVer) {
    const msg = `version drift disk v${disk.ver} != live v${liveVer}`;
    // Freeze ON + disk ahead of live is the normal post-edit state — warn, don't fail
    // unless --require-match / release mode.
    if (freeze.on && Number(disk.ver) > Number(liveVer)) {
      driftExpected = true;
      ok.push(`${msg} (freeze ON — intentional until unfreeze/ship)`);
    } else {
      issues.push(msg);
    }
  } else if (disk.ver && liveVer && disk.ver === liveVer) {
    ok.push(`disk==live foot v${disk.ver}`);
  }

  if (footerUrl && liveFootUrl && footerUrl !== liveFootUrl) {
    issues.push(`footer-lite URL ${footerUrl} != live HTML ${liveFootUrl}`);
  }

  if (headCssUrlDisk && liveCssUrl && headCssUrlDisk !== liveCssUrl) {
    issues.push(`head-minimal CSS ${headCssUrlDisk} != live ${liveCssUrl}`);
  } else if (liveCssUrl) {
    ok.push(`live CSS ${liveCssUrl}`);
  }

  if (freeze.on) ok.push(`freeze ON: ${freeze.why || ''}`);
  else ok.push('freeze OFF');

  if (honesty?.pass === true) ok.push('board honesty pass');
  else if (honesty?.missing) issues.push('DEMIGOD-BOARD-HONESTY.json missing — run verify-board-honesty');
  else if (honesty?.pass === false) issues.push('board honesty FAIL');

  if (requireMatch && disk.ver && liveVer && disk.ver !== liveVer) {
    if (!issues.some((i) => i.includes('version drift') || i.includes('require-match'))) {
      issues.push(`require-match: disk v${disk.ver} live v${liveVer}`);
    }
  }

  const report = {
    at: new Date().toISOString(),
    schemaVersion: 1,
    id: 'live-doctor',
    pass: issues.length === 0,
    requireMatch,
    driftExpected,
    disk: { foot: disk, headCss, footerLiteJs: footerUrl, headMinimalCss: headCssUrlDisk },
    live: {
      htmlStatus: liveHtml.status,
      footUrl: liveFootUrl,
      footVer: liveVer,
      cssUrl: liveCssUrl,
      footBytes: liveJs?.bytes ?? null,
    },
    freeze: { on: freeze.on, why: freeze.why, env: freeze.env, file: freeze.file },
    honesty,
    ok,
    issues,
  };

  fs.mkdirSync('/tmp/dg-busy', { recursive: true });
  fs.writeFileSync('/tmp/dg-busy/live-doctor.json', JSON.stringify(report, null, 2) + '\n');

  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`# live-doctor ${report.pass ? 'PASS' : 'FAIL'} · disk v${disk.ver} · live v${liveVer}`);
    for (const o of ok) console.log(`  ✓ ${o}`);
    for (const i of issues) console.log(`  ✗ ${i}`);
    console.log('report: /tmp/dg-busy/live-doctor.json');
  }
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
