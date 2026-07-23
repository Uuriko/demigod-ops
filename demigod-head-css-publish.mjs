#!/usr/bin/env node
/** Upload demigod-head-styles.css to catbox, or attest DEMIGOD_HEAD_CDN_URL; patch canonical head. */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const SRC = path.join(ROOT, 'demigod-head-styles.css');
const HEAD = path.join(ROOT, 'demigod-head-minimal.html');
const OUT = path.join(ROOT, 'DEMIGOD-HEAD-CDN.json');
// Dashboard /api/coord reads this shape (not DEMIGOD-HEAD-CDN.json).
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const RECEIPT = path.join(BUSY, 'head-css-cdn.json');

assertNotFrozen('head-css-publish');

const diskBuf = fs.readFileSync(SRC);
const diskMd5 = crypto.createHash('md5').update(diskBuf).digest('hex');

let cdnUrl = String(process.env.DEMIGOD_HEAD_CDN_URL || '').trim();
if (!cdnUrl) {
  const up = spawnSync('curl', ['-s', '-F', 'reqtype=fileupload', '-F', `fileToUpload=@${SRC}`, 'https://catbox.moe/user/api.php'], { encoding: 'utf8' });
  cdnUrl = (up.stdout || '').trim();
  if (!cdnUrl) {
    console.error('upload failed', up.stdout, up.stderr);
    process.exit(1);
  }
}
const approvedCdn = /^https:\/\/(?:files\.catbox\.moe\/[a-z0-9]+\.css|cdn\.jsdelivr\.net\/gh\/Uuriko\/demigod-site-cdn@[a-f0-9]+\/head-latest\.css)$/i;
if (!approvedCdn.test(cdnUrl)) {
  console.error('unapproved stylesheet CDN URL', cdnUrl);
  process.exit(1);
}

const liveCss = await (await fetch(`${cdnUrl}?v=${Date.now()}`)).text();
const liveBuf = Buffer.from(liveCss);
const liveMd5 = crypto.createHash('md5').update(liveBuf).digest('hex');
const ok =
  liveCss.includes(':root{--g:') &&
  liveCss.includes('#demigod-trust-block') &&
  liveMd5 === diskMd5;

// Fail closed BEFORE touching the head. `ok` used to be computed here and then only printed --
// it gated nothing, the head was patched unconditionally below, and the process exited 0. So a
// readback that came back empty/truncated/404 still repointed the live stylesheet at that URL and
// reported success. It really happened: DEMIGOD-HEAD-CDN.json recorded
// {"ok":false,"cssLen":0,"cdnUrl":".../0lk5hh.css"} -- catbox served nothing back and the head was
// patched to it anyway. An unstyled live site is the blast radius, and exit 0 meant no caller could
// notice. A stylesheet we cannot read back intact is not one to point the head at; the orphaned
// catbox upload is harmless.
if (!ok) {
  const at = new Date().toISOString();
  const detail = {
    at,
    match: false,
    href: cdnUrl,
    diskMd5,
    liveMd5,
    diskBytes: diskBuf.length,
    liveBytes: liveBuf.length,
    headPatched: false,
    note: 'demigod-head-css-publish: live CSS failed readback — head NOT patched',
  };
  // Still leave both receipts so the dashboard/coord see a real failure rather than silence.
  try {
    atomicWrite(RECEIPT, JSON.stringify(detail, null, 2));
    atomicWrite(OUT, JSON.stringify({ at, cdnUrl, ok, cssLen: liveCss.length, headPatched: false }, null, 2));
  } catch {
    /* receipts are a convenience; the exit code is the product */
  }
  console.error(JSON.stringify(detail));
  process.exit(1);
}

let head = fs.readFileSync(HEAD, 'utf8');
// Match stylesheet links that may carry onerror/media attrs (not only exact <link rel=stylesheet href="…">)
const oldCdn = 'https?:\\/\\/(?:files\\.catbox\\.moe\\/[a-z0-9]+|cdn\\.jsdelivr\\.net\\/gh\\/Uuriko\\/demigod-site-cdn@[a-f0-9]+\\/head-latest)\\.css';
const re = new RegExp('(<link\\b[^>]*rel=["\\\']stylesheet["\\\'][^>]*href=["\\\'])' + oldCdn + '(["\\\'])', 'i');
const re2 = new RegExp('(<link\\b[^>]*href=["\\\'])' + oldCdn + '(["\\\'][^>]*rel=["\\\']stylesheet["\\\'])', 'i');
if (re.test(head)) head = head.replace(re, `$1${cdnUrl}$2`);
else if (re2.test(head)) head = head.replace(re2, `$1${cdnUrl}$2`);
else if (head.includes('PLACEHOLDER_CSS')) head = head.replace('PLACEHOLDER_CSS', cdnUrl);
else if (new RegExp(oldCdn, 'i').test(head)) {
  head = head.replace(new RegExp(oldCdn, 'i'), cdnUrl);
} else {
  console.error('no stylesheet catbox link found to patch');
  process.exit(2);
}
if (!head.includes(cdnUrl)) {
  console.error('head patch failed to embed', cdnUrl);
  process.exit(2);
}
// temp+rename: concurrent verify:source must never read torn head mid-ship
const at = new Date().toISOString();
atomicWrite(HEAD, head);
// Legacy shape (ship logs / humans)
atomicWrite(OUT, JSON.stringify({ at, cdnUrl, ok, headLen: head.length, cssLen: liveCss.length }, null, 2));
// Coord dogfood receipt — path+shape dashboard actually reads
atomicWrite(
  RECEIPT,
  JSON.stringify(
    {
      at,
      match: ok,
      href: cdnUrl,
      diskMd5,
      liveMd5,
      diskBytes: diskBuf.length,
      liveBytes: liveBuf.length,
      note: 'demigod-head-css-publish',
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ ok, cdnUrl, headLen: head.length, cssLen: liveCss.length, diskMd5, receipt: RECEIPT }));
