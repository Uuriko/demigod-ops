#!/usr/bin/env node
/**
 * demigod-live-attest — prove production foot CDN body matches disk
 *
 *   bin/dg live-attest [--json]
 *
 * Fetches live HTML → footer script src → JS body.
 * Requires: HTTP 200, version match disk __dgFootVer, body length floor,
 * marker functions, optional SHA vs DEMIGOD-FOOT-CDN.json when same host.
 *
 * Exit 0 = pass · 1 = fail
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { writeJsonAuto } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const LIVE_ATTEST_FLAGS = new Set(['--json', '--soft', '--help', '-h']);
const unknownLiveAttest = process.argv.slice(2).find((a) => !LIVE_ATTEST_FLAGS.has(a));
if (unknownLiveAttest) {
  console.error(
    `live-attest: unknown argument ${unknownLiveAttest} — try: bin/dg live-attest [--json] [--soft]`,
  );
  process.exit(2);
}
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`demigod-live-attest — prove live foot CDN body matches disk

Usage: bin/dg live-attest [--json] [--soft]`);
  process.exit(0);
}
const asJson = process.argv.includes('--json');
const soft = process.argv.includes('--soft');
const LIVE = process.env.DEMIGOD_LIVE_URL || 'https://www.trydemigod.com/';

function diskVer() {
  const src = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  return (src.match(/__dgFootVer='(\d+)'/) || [])[1] || null;
}

function diskSha() {
  const src = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'));
  return crypto.createHash('sha256').update(src).digest('hex');
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json'), 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const wantVer = diskVer();
  const wantSha = diskSha();
  const manifest = readManifest();
  const report = {
    schema: 'demigod.live-attest/1',
    at: new Date().toISOString(),
    liveUrl: LIVE,
    diskVer: wantVer,
    diskSha256: wantSha,
    ok: false,
    checks: [],
  };
  const check = (name, ok, detail) => {
    report.checks.push({ name, ok: !!ok, detail: detail || null });
    return !!ok;
  };

  try {
    const htmlRes = await fetch(`${LIVE}?attest=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache' },
    });
    const html = await htmlRes.text();
    check('html-http', htmlRes.status === 200, `status=${htmlRes.status}`);
    const scriptSrcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
    const loaderHit = html.match(/demigod-foot-cdn-loader[\s\S]*?<script src=["']([^"']+)["']/i);
    const allow = (u) => /gist\.githubusercontent\.com|files\.catbox\.moe\/.+\.js|litter\.catbox\.moe\/.+\.js|cdn\.jsdelivr\.net\/.+\.js|cdn\.statically\.io\/.+\.js/i.test(u || '');
    const footSrc = scriptSrcs.find(allow) || null;
    const cdnUrl = (loaderHit?.[1] && allow(loaderHit[1]) ? loaderHit[1] : null) || footSrc;
    report.cdnUrl = cdnUrl;
    check('cdn-url-found', !!cdnUrl, cdnUrl || 'no script src');

    if (!cdnUrl) {
      report.ok = false;
      finish(report);
      return;
    }

    const jsRes = await fetch(`${cdnUrl}${cdnUrl.includes('?') ? '&' : '?'}v=${Date.now()}`);
    const ctype = (jsRes.headers.get('content-type') || '').toLowerCase();
    const nosniff = (jsRes.headers.get('x-content-type-options') || '').toLowerCase().includes('nosniff');
    report.contentType = ctype;
    report.nosniff = nosniff;
    const js = await jsRes.text();
    report.liveLen = js.length;
    report.liveHttp = jsRes.status;
    const liveVer = (js.match(/__dgFootVer='(\d+)'/) || [])[1] || null;
    report.liveVer = liveVer;
    const liveSha = crypto.createHash('sha256').update(js).digest('hex');
    report.liveSha256 = liveSha;

    check('js-http', jsRes.status === 200, `status=${jsRes.status}`);
    // Browsers refuse script with text/plain + nosniff (gist.githubusercontent raw)
    const mimeOk =
      !nosniff ||
      ctype.includes('javascript') ||
      ctype.includes('ecmascript') ||
      ctype.includes('application/octet-stream');
    const hostBad = /gist\.githubusercontent\.com/i.test(cdnUrl) && nosniff && ctype.includes('text/plain');
    check(
      'js-mime-browser-safe',
      mimeOk && !hostBad,
      hostBad
        ? 'gist raw is text/plain+nosniff — browsers will NOT execute; use jsDelivr/statically/catbox'
        : `ctype=${ctype || '?'} nosniff=${nosniff}`,
    );
    check('js-size', js.length > 40000, `len=${js.length}`);
    check('js-marker', /dg-foot-v\d+-core/.test(js) && js.includes('function hero'), 'core markers');
    check('ver-match', liveVer && wantVer && liveVer === wantVer, `live=${liveVer} disk=${wantVer}`);
    // SHA equal only expected if same bytes (gist/catbox of same source)
    const shaMatch = liveSha === wantSha;
    check('sha-match', shaMatch, shaMatch ? 'exact' : 'drift (ok if live not re-shipped)');
    if (manifest?.sha256 && manifest?.cdnUrl && cdnUrl.includes(String(manifest.cdnUrl).split('/').pop()?.slice(0, 8) || '___')) {
      check('manifest-sha', liveSha === manifest.sha256 || shaMatch, 'vs DEMIGOD-FOOT-CDN.json');
    }
    // Default: require exact body SHA (disk == live). Use --soft for version/marker-only.
    report.ok = report.checks
      .filter((c) => c.name !== 'manifest-sha' && !(soft && c.name === 'sha-match'))
      .every((c) => c.ok);
    if (!soft && !shaMatch) report.ok = false;
    report.passStrict = report.ok && shaMatch;
    report.soft = soft;
  } catch (e) {
    check('fetch', false, String(e.message || e));
    report.ok = false;
  }

  finish(report);
}

function finish(report) {
  writeJsonAuto(path.join(BUSY, 'live-attest.json'), report);
  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(
      `# live-attest ${report.ok ? 'PASS' : 'FAIL'} · disk v${report.diskVer} live v${report.liveVer || '?'} · ${report.cdnUrl || 'no-cdn'} · len=${report.liveLen || 0}`,
    );
    for (const c of report.checks) {
      console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` · ${c.detail}` : ''}`);
    }
    if (report.passStrict) console.log('  (strict SHA match)');
  }
  process.exit(report.ok ? 0 : 1);
}

main();
