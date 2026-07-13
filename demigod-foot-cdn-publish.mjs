#!/usr/bin/env node
/** Upload demigod-foot-core.js to catbox; update loader footer + CDN manifest.
 * Retries permanent catbox; verifies non-empty body; never writes a dead CDN URL.
 * Optional: DEMIGOD_ALLOW_LITTER=1 falls back to litterbox 72h (temporary only).
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { resolveWebhookPublicUrl } from './demigod-webhook-url.mjs';

const SRC = path.join(ROOT, 'demigod-foot-core.js');
const FOOT = path.join(ROOT, 'demigod-footer-lite.html');
const LOADER = path.join(ROOT, 'demigod-footer-loader.html');
const OUT = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
const MIRROR = path.join(ROOT, 'eat-the-sounds', 'demigod-foot-core.js');
const ALLOW_LITTER = process.env.DEMIGOD_ALLOW_LITTER === '1';

const check = spawnSync('node', ['--check', SRC], { encoding: 'utf8' });
if (check.status !== 0) {
  console.error(check.stderr || check.stdout);
  process.exit(1);
}

if (fs.existsSync(path.dirname(MIRROR))) {
  try { fs.copyFileSync(SRC, MIRROR); } catch { /* optional mirror */ }
}

function curlUpload(url, extra = []) {
  const r = spawnSync(
    'curl',
    ['-sS', '--max-time', '120', '-F', 'reqtype=fileupload', ...extra, '-F', `fileToUpload=@${SRC}`],
    { encoding: 'utf8' },
  );
  return (r.stdout || '').trim();
}

async function fetchOk(cdnUrl) {
  try {
    const liveJs = await (await fetch(`${cdnUrl}?v=${Date.now()}`)).text();
    const ok =
      liveJs.length > 50000 &&
      /dg-foot-v\d+-core/.test(liveJs) &&
      liveJs.includes('function hero') &&
      (liveJs.includes('#dg-bar') || liveJs.includes('__dgFootVer'));
    return { ok, liveJs };
  } catch (e) {
    return { ok: false, liveJs: '', err: String(e.message || e) };
  }
}

async function uploadPermanent() {
  for (let i = 1; i <= 4; i++) {
    const cdnUrl = curlUpload('https://catbox.moe/user/api.php');
    if (!/^https:\/\/files\.catbox\.moe\/.+\.js$/.test(cdnUrl)) {
      console.error(`catbox try ${i}: bad response`, cdnUrl.slice(0, 120));
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
  const cdnUrl = curlUpload('https://litterbox.catbox.moe/resources/internals/api.php', [
    '-F', 'time=72h',
  ]);
  if (!/^https:\/\/litter\.catbox\.moe\/.+\.js$/.test(cdnUrl)) {
    console.error('litterbox failed:', cdnUrl.slice(0, 120));
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
if(/^\\/legal\\/?$/i.test(p)&&!/#privacy|#terms/.test(location.hash))location.replace('/#legal');
else if(/^\\/partnerships?\\/?$/i.test(p)&&location.hash!=='#partnerships')location.replace('/#partnerships');
else if(/^\\/events\\/?$/i.test(p))location.replace('https://files.catbox.moe/m22wy3.html');
})();</script>`;
const webhookUrl = resolveWebhookPublicUrl();
const webhookScript = webhookUrl ? `<script>window.__dgWebhookUrl=${JSON.stringify(webhookUrl)};</script>\n` : '';
const ver = (liveJs.match(/__dgFootVer='(\d+)'/) || [])[1] || '?';
const loader = `<!-- demigod-foot-cdn-loader v26 + events + foot v${ver}${temporary ? ' TEMP-litterbox-72h' : ''} -->\n${redirect}\n${webhookScript}<script src="${cdnUrl}"></script>\n`;
fs.writeFileSync(FOOT, loader);
fs.writeFileSync(LOADER, loader);
fs.writeFileSync(OUT, JSON.stringify({
  at: new Date().toISOString(),
  cdnUrl,
  ok,
  temporary: !!temporary,
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
