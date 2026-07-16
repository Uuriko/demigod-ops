#!/usr/bin/env node
/** Upload demigod-head-styles.css to catbox; patch link in demigod-head-minimal.html */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const SRC = path.join(ROOT, 'demigod-head-styles.css');
const HEAD = path.join(ROOT, 'demigod-head-minimal.html');
const OUT = path.join(ROOT, 'DEMIGOD-HEAD-CDN.json');

assertNotFrozen('head-css-publish');

const up = spawnSync('curl', ['-s', '-F', 'reqtype=fileupload', '-F', `fileToUpload=@${SRC}`, 'https://catbox.moe/user/api.php'], { encoding: 'utf8' });
const cdnUrl = (up.stdout || '').trim();
if (!/^https:\/\/files\.catbox\.moe\/.+\.css$/.test(cdnUrl)) {
  console.error('upload failed', up.stdout, up.stderr);
  process.exit(1);
}

const liveCss = await (await fetch(`${cdnUrl}?v=${Date.now()}`)).text();
const ok = liveCss.includes(':root{--g:') && liveCss.includes('#demigod-trust-block');

let head = fs.readFileSync(HEAD, 'utf8');
// Match stylesheet links that may carry onerror/media attrs (not only exact <link rel=stylesheet href="…">)
const re = /(<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'])https?:\/\/files\.catbox\.moe\/[a-z0-9]+\.css(["'])/i;
const re2 = /(<link\b[^>]*href=["'])https?:\/\/files\.catbox\.moe\/[a-z0-9]+\.css(["'][^>]*rel=["']stylesheet["'])/i;
if (re.test(head)) head = head.replace(re, `$1${cdnUrl}$2`);
else if (re2.test(head)) head = head.replace(re2, `$1${cdnUrl}$2`);
else if (head.includes('PLACEHOLDER_CSS')) head = head.replace('PLACEHOLDER_CSS', cdnUrl);
else if (/files\.catbox\.moe\/[a-z0-9]+\.css/.test(head)) {
  head = head.replace(/https?:\/\/files\.catbox\.moe\/[a-z0-9]+\.css/i, cdnUrl);
} else {
  console.error('no stylesheet catbox link found to patch');
  process.exit(2);
}
if (!head.includes(cdnUrl)) {
  console.error('head patch failed to embed', cdnUrl);
  process.exit(2);
}
// temp+rename: concurrent verify:source must never read torn head mid-ship
atomicWrite(HEAD, head);
atomicWrite(OUT, JSON.stringify({ at: new Date().toISOString(), cdnUrl, ok, headLen: head.length, cssLen: liveCss.length }, null, 2));
console.log(JSON.stringify({ ok, cdnUrl, headLen: head.length, cssLen: liveCss.length }));
