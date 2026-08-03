#!/usr/bin/env node
/**
 * demigod-favicon-ship — write favicon links into demigod-head-minimal.html
 * Prefers catbox URL from /tmp/dg-busy/asset-upload-receipt.json, else local SVG data URI.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HEAD = path.join(ROOT, 'demigod-head-minimal.html');
const RECEIPT = '/tmp/dg-busy/asset-upload-receipt.json';
const SVG = path.join(ROOT, 'assets/brand/favicon.svg');

function dataUriSvg(svg) {
  const compact = svg.replace(/\s+/g, ' ').trim();
  return 'data:image/svg+xml,' + encodeURIComponent(compact);
}

let fav = null;
let apple = null;
let favSvg = null;
try {
  const r = JSON.parse(fs.readFileSync(RECEIPT, 'utf8'));
  fav = r.favicon || null;
  apple = r.apple || r.favicon || null;
  favSvg = r.faviconSvg || null;
} catch {
  /* */
}
const svg = fs.readFileSync(SVG, 'utf8');
const dataUri = dataUriSvg(svg);
if (!fav || !/^https:\/\//.test(fav)) fav = dataUri;
if (!apple || !/^https:\/\//.test(apple)) apple = fav;

const remoteSvg = favSvg && /^https:\/\//.test(favSvg) ? favSvg : null;
const jpegType = /^data:image\/svg/.test(fav) || /\.svg(\?|$)/i.test(fav) ? 'image/svg+xml' : 'image/jpeg';

const iconBlock = `<!-- demigod favicon (shipped) -->
<link rel="icon" href="${dataUri}" type="image/svg+xml">
${remoteSvg ? `<link rel="icon" href="${remoteSvg}" type="image/svg+xml" sizes="any">\n` : ''}<link rel="icon" href="${fav}" type="${jpegType}" sizes="32x32">
<link rel="apple-touch-icon" href="${apple}">`;

let head = fs.readFileSync(HEAD, 'utf8');
if (/rel="icon"/.test(head)) {
  head = head.replace(
    /(?:<!--[^\n]*favicon[^\n]*-->\n)?(?:<link rel="icon"[^>]*>\n?)+(?:<link rel="apple-touch-icon"[^>]*>\n?)?/i,
    iconBlock + '\n',
  );
} else if (head.includes('</head>')) {
  head = head.replace('</head>', iconBlock + '\n</head>');
} else {
  head = iconBlock + '\n' + head;
}
// Atomic: write a temp then rename. A plain writeFileSync truncates-then-writes, so any concurrent
// reader -- verify:source, a ship, another swarm agent -- can catch the head torn. Observed live
// 2026-07-17: a verify run read the head at 96,256 bytes (vs 48,264 settled) with inline scripts that
// did not parse. rename(2) is atomic on the same filesystem, so readers see the old head or the new
// one, never a half.
// This matters more than a torn gate read: a torn head that reaches Webflow is the "site won't
// load" class, and a retry-only health check would paper over the whole category
// verify:source once and calling a transient fail clean.
{
  const tmp = `${HEAD}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, head);
  fs.renameSync(tmp, HEAD);
}
console.log(
  JSON.stringify(
    {
      ok: true,
      fav: String(fav).slice(0, 96),
      apple: String(apple).slice(0, 96),
      favSvg: remoteSvg,
      headBytes: head.length,
    },
    null,
    2,
  ),
);
