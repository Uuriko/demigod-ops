#!/usr/bin/env node
/**
 * demigod-favicon-ship — write favicon links into demigod-head-minimal.html
 *
 * Brand SoR is the square jpeg (ges75q.jpg) — required by verify:source for
 * org LD logo, ms tile, apple-touch, and blog publisher. SVG is progressive only.
 * Optional receipt fields: favicon / apple (https jpeg) · faviconSvg (https svg).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HEAD = path.join(ROOT, 'demigod-head-minimal.html');
const RECEIPT = '/tmp/dg-busy/asset-upload-receipt.json';
const SVG = path.join(ROOT, 'assets/brand/favicon.svg');
/** Square brand mark used by Organization LD + tile honesty gates. */
const BRAND_JPEG = 'https://files.catbox.moe/ges75q.jpg';

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

// Never demote jpeg SoR to SVG — receipt may only supply alternate https jpeg or svg.
const isHttpsJpeg = (u) => typeof u === 'string' && /^https:\/\/.+\.jpe?g(\?|$)/i.test(u);
if (!isHttpsJpeg(fav)) fav = BRAND_JPEG;
if (!isHttpsJpeg(apple)) apple = fav;

const remoteSvg = favSvg && /^https:\/\//.test(favSvg) ? favSvg : null;
let dataUri = null;
try {
  dataUri = dataUriSvg(fs.readFileSync(SVG, 'utf8'));
} catch {
  /* local svg optional */
}

const iconBlock =
  `<!-- demigod favicon: jpeg brand mark is SoR for org/tile/apple (verify:source); SVG is progressive -->\n` +
  `<link rel="icon" href="${fav}" type="image/jpeg" sizes="1024x1024">\n` +
  `<link rel="apple-touch-icon" href="${apple}" type="image/jpeg" sizes="1024x1024">\n` +
  (remoteSvg
    ? `<link rel="icon" href="${remoteSvg}" type="image/svg+xml" sizes="any">\n`
    : dataUri
      ? `<link rel="icon" href="${dataUri}" type="image/svg+xml" sizes="any">\n`
      : '');

let head = fs.readFileSync(HEAD, 'utf8');
// One run of comment + any order of icon/apple-touch links (prior regex left trailing SVGs).
const iconRun =
  /(?:<!--[^\n]*favicon[^\n]*-->\s*)?(?:<link\b[^>]*\brel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*>\s*)+/i;
if (iconRun.test(head)) {
  head = head.replace(iconRun, iconBlock);
} else if (head.includes('</head>')) {
  head = head.replace('</head>', iconBlock + '</head>');
} else {
  head = iconBlock + head;
}
// Atomic rename so concurrent verify/ship never reads a torn head.
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
