#!/usr/bin/env node
/** Upload demigod-head-styles.css to catbox; patch link in demigod-head-minimal.html */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

assertNotFrozen('head-css-publish');

const SRC = path.join(ROOT, 'demigod-head-styles.css');
const HEAD = path.join(ROOT, 'demigod-head-minimal.html');
const OUT = path.join(ROOT, 'DEMIGOD-HEAD-CDN.json');

const up = spawnSync('curl', ['-s', '-F', 'reqtype=fileupload', '-F', `fileToUpload=@${SRC}`, 'https://catbox.moe/user/api.php'], { encoding: 'utf8' });
const cdnUrl = (up.stdout || '').trim();
if (!/^https:\/\/files\.catbox\.moe\/.+\.css$/.test(cdnUrl)) {
  console.error('upload failed', up.stdout, up.stderr);
  process.exit(1);
}

const liveCss = await (await fetch(`${cdnUrl}?v=${Date.now()}`)).text();
const ok = liveCss.includes(':root{--g:') && liveCss.includes('#demigod-trust-block');

let head = fs.readFileSync(HEAD, 'utf8');
head = head.replace(/<link rel="stylesheet" href="[^"]+">/, `<link rel="stylesheet" href="${cdnUrl}">`);
if (!head.includes(cdnUrl)) {
  head = head.replace('PLACEHOLDER_CSS', cdnUrl);
}
fs.writeFileSync(HEAD, head);

fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), cdnUrl, ok, headLen: head.length, cssLen: liveCss.length }, null, 2));
console.log(JSON.stringify({ ok, cdnUrl, headLen: head.length, cssLen: liveCss.length }));