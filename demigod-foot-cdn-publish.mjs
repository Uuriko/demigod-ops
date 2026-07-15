#!/usr/bin/env node
/** Upload demigod-foot-core.js to catbox; update loader footer + CDN manifest.
 * Retries permanent catbox; verifies non-empty body; never writes a dead CDN URL.
 * Optional: DEMIGOD_ALLOW_LITTER=1 falls back to litterbox 72h (temporary only).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { resolveWebhookPublicUrl } from './demigod-webhook-url.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';

assertNotFrozen('foot-cdn-publish');
assertCanWriteFoot({ label: 'foot-cdn-publish' });

const SRC = path.join(ROOT, 'demigod-foot-core.js');
const FOOT = path.join(ROOT, 'demigod-footer-lite.html');
const LOADER = path.join(ROOT, 'demigod-footer-loader.html');
const OUT = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
const ALLOW_LITTER = process.env.DEMIGOD_ALLOW_LITTER === '1';
const sourceJs = fs.readFileSync(SRC, 'utf8');
const sourceVer = (sourceJs.match(/__dgFootVer='(\d+)'/) || [])[1];

if (!sourceVer) {
  console.error('source has no __dgFootVer');
  process.exit(1);
}

const check = spawnSync('node', ['--check', SRC], { encoding: 'utf8' });
if (check.status !== 0) {
  console.error(check.stderr || check.stdout);
  process.exit(1);
}

function curlUpload(url, extra = []) {
  const r = spawnSync(
    'curl',
    [
      '-sS', '--fail-with-body', '--max-time', '120',
      '-F', 'reqtype=fileupload', ...extra,
      '-F', `fileToUpload=@${SRC};type=application/javascript`,
      url,
    ],
    { encoding: 'utf8' },
  );
  return {
    body: (r.stdout || '').trim(),
    error: r.status === 0 ? '' : (r.stderr || `curl exited ${r.status}`).trim(),
  };
}

async function fetchOk(cdnUrl) {
  try {
    const liveJs = await (await fetch(`${cdnUrl}?v=${Date.now()}`)).text();
    const remoteVer = (liveJs.match(/__dgFootVer='(\d+)'/) || [])[1];
    const ok =
      liveJs.length > 40000 &&
      /dg-foot-v\d+-core/.test(liveJs) &&
      liveJs.includes('function hero') &&
      (liveJs.includes('#dg-bar') || liveJs.includes('__dgFootVer')) &&
      remoteVer === sourceVer;
    return { ok, liveJs, remoteVer };
  } catch (e) {
    return { ok: false, liveJs: '', err: String(e.message || e) };
  }
}

async function uploadPermanent() {
  for (let i = 1; i <= 4; i++) {
    const upload = curlUpload('https://catbox.moe/user/api.php');
    const cdnUrl = upload.body;
    if (!/^https:\/\/files\.catbox\.moe\/.+\.js$/.test(cdnUrl)) {
      console.error(`catbox try ${i}: bad response`, (upload.error || cdnUrl).slice(0, 240));
      await new Promise((r) => setTimeout(r, 1500 * i));
      continue;
    }
    // wait for prop
    await new Promise((r) => setTimeout(r, 2000));
    const { ok, liveJs } = await fetchOk(cdnUrl);
    console.error(`catbox try ${i}: ${cdnUrl} len=${liveJs.length} ok=${ok}`);
    if (ok) return { cdnUrl, liveJs, host: 'catbox.moe', temporary: false };
    await new Promise((r) => setTimeout(r, 2000 * i));
  }
  return null;
}

async function uploadLitter() {
  const upload = curlUpload('https://litterbox.catbox.moe/resources/internals/api.php', [
    '-F', 'time=72h',
  ]);
  const cdnUrl = upload.body;
  if (!/^https:\/\/litter\.catbox\.moe\/.+\.js$/.test(cdnUrl)) {
    console.error('litterbox failed:', (upload.error || cdnUrl).slice(0, 240));
    return null;
  }
  await new Promise((r) => setTimeout(r, 2000));
  const { ok, liveJs } = await fetchOk(cdnUrl);
  console.error(`litterbox: ${cdnUrl} len=${liveJs.length} ok=${ok}`);
  if (!ok) return null;
  return { cdnUrl, liveJs, host: 'litterbox.catbox.moe', temporary: true };
}

const permanent = await uploadPermanent();
let result = permanent;
if (!result && ALLOW_LITTER) {
  result = await uploadLitter();
}
if (!result) {
  console.error('upload failed: permanent catbox empty/0-byte; set DEMIGOD_ALLOW_LITTER=1 for 72h litterbox fallback');
  // Do NOT overwrite footer with a dead URL
  process.exit(1);
}

const { cdnUrl, liveJs, host, temporary } = result;
const ok = true;

const redirect = `<script>(function(){var p=location.pathname;
if(/^\\/legal\\/?$/i.test(p)&&!/[?&]p=/.test(location.search))location.replace('/?p=legal');
else if(/^\\/partnerships?\\/?$/i.test(p))location.replace('/?p=partners');
else if(/^\\/how\\/?$/i.test(p))location.replace('/?p=how');
else if(/^\\/pricing\\/?$/i.test(p))location.replace('/?p=pricing');
else if(/^\\/faq\\/?$/i.test(p))location.replace('/?p=faq');
else if(/^\\/hire\\/?$/i.test(p))location.replace('/?p=hire');
else if(/^\\/talent\\/?$/i.test(p)||/^\\/network\\/?$/i.test(p))location.replace('/?p=talent');
else if(/^\\/contact\\/?$/i.test(p))location.replace('/?p=contact');
else if(/^\\/compare\\/?$/i.test(p))location.replace('/?p=compare');
else if(/^\\/pilot\\/?$/i.test(p))location.replace('/?p=pilot');
else if(/^\\/about\\/?$/i.test(p))location.replace('/?p=about');
else if(/^\\/status\\/?$/i.test(p))location.replace('/?p=status');
else if(/^\\/events\\/?$/i.test(p))location.replace('https://files.catbox.moe/m22wy3.html');
})();</script>`;
const webhookUrl = resolveWebhookPublicUrl();
const webhookScript = webhookUrl ? `<script>window.__dgWebhookUrl=${JSON.stringify(webhookUrl)};</script>\n` : '';
const ver = (liveJs.match(/__dgFootVer='(\d+)'/) || [])[1] || '?';
const loader = `<!-- demigod-foot-cdn-loader v27 + events + foot v${ver}${temporary ? ' TEMP-litterbox-72h' : ''} -->\n${redirect}\n${webhookScript}<script src="${cdnUrl}"></script>\n`;
fs.writeFileSync(FOOT, loader);
fs.writeFileSync(LOADER, loader);
fs.writeFileSync(OUT, JSON.stringify({
  at: new Date().toISOString(),
  version: ver,
  cdnUrl,
  ok,
  temporary: !!temporary,
  bytes: Buffer.byteLength(liveJs),
  sha256: crypto.createHash('sha256').update(liveJs).digest('hex'),
  liveLen: liveJs.length,
  loaderLen: loader.length,
  webhookUrl: webhookUrl || null,
  host,
  footVer: ver,
}, null, 2));

console.log(JSON.stringify({
  ok, cdnUrl, liveLen: liveJs.length, loaderLen: loader.length, temporary: !!temporary, host, footVer: ver,
}, null, 2));
process.exit(ok ? 0 : 1);
