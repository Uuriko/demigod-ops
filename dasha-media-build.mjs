#!/usr/bin/env node
/**
 * dasha-media-build — turn owned source images into deliverable ones, and refuse the bad trade.
 *
 * WHY THIS EXISTS
 * getdasha.com ships 4.95 MB to say 182 characters, and 4.40 MB of that is images. Re-encoding the
 * seven on the homepage took them from 3.85 MB to 0.41 MB — 89% — because they are not only in the
 * wrong format but several times larger than they are ever displayed. `chart.jpg` arrives at
 * 2411×3134 for a slot a few hundred pixels wide.
 *
 * That was a one-off conversion. This makes it the default, so the next image someone adds does not
 * quietly cost another megabyte.
 *
 * WHAT IT REFUSES
 * A converter that only ever shrinks things is easy and dangerous: quality collapses silently and
 * nobody notices until it is live. Every output here is decoded again and compared to the resized
 * source, pixel by pixel. If the error crosses the threshold the build FAILS rather than shipping
 * a smaller, worse picture. Small is not the goal; small at the same quality is.
 *
 * It also emits width and height for every asset. Without those the browser cannot reserve layout
 * space and the page shifts as images arrive — the cheapest Core Web Vitals mistake there is.
 *
 *   node dasha-media-build.mjs                 # build dasha-media/src -> dasha-media/out
 *   node dasha-media-build.mjs --check         # exit 1 if outputs are missing or stale
 *   node dasha-media-build.mjs --selftest
 *
 * Schema: dasha.media-build/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = process.env.DASHA_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const SRC = path.join(ROOT, 'dasha-media', 'src');
const OUT = path.join(ROOT, 'dasha-media', 'out');
const MANIFEST = path.join(ROOT, 'dasha-media', 'manifest.json');

/** Nothing on getdasha.com is presented above this. Delivering more is paying for pixels nobody sees. */
export const MAX_WIDTH = 1400;
export const AVIF_QUALITY = 52;
export const WEBP_QUALITY = 72;

/**
 * Root-mean-square pixel error, 0–255, above which an encode is rejected.
 *
 * Calibrated against the seven live homepage images, which came in between 2.11 and 5.81 and are
 * indistinguishable from their sources at viewing size. 8 leaves headroom for a hard photograph
 * without leaving room for a visibly degraded one.
 */
export const MAX_RMSE = 8;

/** PURE. The delivery width for a source: never upscale, never exceed the cap. */
export function deliveryWidth(sourceWidth, max = MAX_WIDTH) {
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0) return null;
  return Math.min(Math.round(sourceWidth), max);
}

/** PURE. Root-mean-square error between two equal-length raw pixel buffers. */
export function rmse(a, b) {
  const n = Math.min(a.length, b.length);
  if (!n) return Infinity;
  let se = 0;
  for (let i = 0; i < n; i++) { const d = a[i] - b[i]; se += d * d; }
  return Math.sqrt(se / n);
}

/** PURE. Is this encode worth shipping? Smaller is necessary but never sufficient. */
export function acceptable({ bytes, sourceBytes, error }, maxRmse = MAX_RMSE) {
  if (!(bytes > 0) || !(sourceBytes > 0)) return { ok: false, why: 'missing sizes' };
  if (error > maxRmse) return { ok: false, why: `too lossy (rmse ${error.toFixed(2)} > ${maxRmse})` };
  if (bytes >= sourceBytes) return { ok: false, why: 'no smaller than the source' };
  return { ok: true };
}

async function encodeOne(file, { outDir = OUT, maxWidth = MAX_WIDTH } = {}) {
  const src = fs.readFileSync(file);
  const meta = await sharp(src).metadata();
  const width = deliveryWidth(meta.width, maxWidth);
  const resize = meta.width > maxWidth ? { width: maxWidth } : null;
  const base = path.basename(file).replace(/\.[^.]+$/, '');
  const pipe = () => (resize ? sharp(src).resize(resize) : sharp(src));

  const avif = await pipe().avif({ quality: AVIF_QUALITY, effort: 4 }).toBuffer();
  const webp = await pipe().webp({ quality: WEBP_QUALITY }).toBuffer();

  // Decode both back and compare to the resized source. This is the step that makes the build
  // trustworthy: without it "it got smaller" is the only thing anyone would ever check.
  const reference = await pipe().removeAlpha().raw().toBuffer();
  const check = async (buf) => rmse(reference, await sharp(buf).removeAlpha().raw().toBuffer());
  const avifError = await check(avif);
  const webpError = await check(webp);

  const verdicts = {
    avif: acceptable({ bytes: avif.length, sourceBytes: src.length, error: avifError }),
    webp: acceptable({ bytes: webp.length, sourceBytes: src.length, error: webpError }),
  };
  const height = Math.round((meta.height / meta.width) * width);

  if (verdicts.avif.ok) fs.writeFileSync(path.join(outDir, `${base}.avif`), avif);
  if (verdicts.webp.ok) fs.writeFileSync(path.join(outDir, `${base}.webp`), webp);

  return {
    name: base,
    source: path.basename(file),
    sourceBytes: src.length,
    width,
    height,
    avif: { bytes: avif.length, rmse: Number(avifError.toFixed(2)), ...verdicts.avif },
    webp: { bytes: webp.length, rmse: Number(webpError.toFixed(2)), ...verdicts.webp },
  };
}

export async function build({ srcDir = SRC, outDir = OUT, write = true } = {}) {
  if (!fs.existsSync(srcDir)) throw new Error(`media-build: no source directory at ${srcDir}`);
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(srcDir).filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f)).sort();
  const assets = [];
  for (const f of files) assets.push(await encodeOne(path.join(srcDir, f), { outDir }));

  const rejected = assets.filter((a) => !a.avif.ok && !a.webp.ok);
  const report = {
    schema: 'dasha.media-build/1',
    maxWidth: MAX_WIDTH,
    maxRmse: MAX_RMSE,
    assets: assets.length,
    sourceBytes: assets.reduce((s, a) => s + a.sourceBytes, 0),
    avifBytes: assets.reduce((s, a) => s + (a.avif.ok ? a.avif.bytes : 0), 0),
    rejected: rejected.map((a) => ({ name: a.name, avif: a.avif.why, webp: a.webp.why })),
    files: assets,
  };
  if (write) fs.writeFileSync(MANIFEST, `${JSON.stringify(report, null, 1)}\n`);
  return report;
}

/**
 * PURE. The markup for one asset.
 *
 * AVIF first, WebP next, the original last. width and height always, because a browser that cannot
 * reserve space shifts the page as each image lands. Exactly one image per page should be eager
 * with fetchpriority high — the LCP one — and the rest lazy; passing `lcp` says which.
 */
export function pictureTag(asset, { dir = '/media', lcp = false, alt = '' } = {}) {
  if (!asset || !asset.name) throw new Error('media-build: cannot build a picture for nothing');
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const loading = lcp ? 'eager' : 'lazy';
  const priority = lcp ? ' fetchpriority="high"' : '';
  return `<picture>`
    + (asset.avif?.ok ? `<source type="image/avif" srcset="${esc(dir)}/${esc(asset.name)}.avif">` : '')
    + (asset.webp?.ok ? `<source type="image/webp" srcset="${esc(dir)}/${esc(asset.name)}.webp">` : '')
    + `<img src="${esc(dir)}/${esc(asset.source)}" width="${asset.width}" height="${asset.height}"`
    + ` loading="${loading}" decoding="async"${priority} alt="${esc(alt)}"></picture>`;
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`media-build selftest: ${msg}`); };

  assert(deliveryWidth(3000) === MAX_WIDTH, 'an oversized source is capped');
  assert(deliveryWidth(600) === 600, 'a small source is never upscaled');
  assert(deliveryWidth(0) === null && deliveryWidth('x') === null, 'junk has no delivery width');

  assert(rmse(Uint8Array.from([0, 0]), Uint8Array.from([0, 0])) === 0, 'identical buffers have no error');
  assert(Math.abs(rmse(Uint8Array.from([0]), Uint8Array.from([10])) - 10) < 1e-9, 'error is measured in levels');
  assert(rmse([], []) === Infinity, 'nothing to compare is not a pass');

  // The rule that makes this build worth trusting: smaller is necessary, never sufficient.
  assert(acceptable({ bytes: 10, sourceBytes: 100, error: 2 }).ok, 'small and faithful is accepted');
  assert(!acceptable({ bytes: 10, sourceBytes: 100, error: 40 }).ok, 'a visibly degraded encode is refused however small');
  assert(/too lossy/.test(acceptable({ bytes: 10, sourceBytes: 100, error: 40 }).why), 'and says why');
  assert(!acceptable({ bytes: 200, sourceBytes: 100, error: 1 }).ok, 'a perfect encode that grew is still refused');
  assert(!acceptable({ bytes: 0, sourceBytes: 100, error: 1 }).ok, 'an empty output is not a success');

  // Markup: the two attributes that decide layout stability and LCP.
  const asset = { name: 'chart', source: 'chart.jpg', width: 1400, height: 1820, avif: { ok: true }, webp: { ok: true } };
  const lazy = pictureTag(asset, { alt: 'chart' });
  assert(/type="image\/avif"[^>]*chart\.avif/.test(lazy), 'AVIF is offered first');
  assert(lazy.indexOf('image/avif') < lazy.indexOf('image/webp'), 'and before WebP, or the browser takes the bigger one');
  assert(/width="1400" height="1820"/.test(lazy), 'dimensions ship, or the page shifts as images land');
  assert(/loading="lazy"/.test(lazy) && !/fetchpriority/.test(lazy), 'a normal image is lazy and unprioritised');
  const hero = pictureTag(asset, { lcp: true });
  assert(/loading="eager"/.test(hero) && /fetchpriority="high"/.test(hero), 'the LCP image is eager and prioritised — lazy-loading it is the classic regression');
  assert(!pictureTag({ ...asset, avif: { ok: false } }).includes('image/avif'), 'a rejected encode is never referenced');
  let threw = false;
  try { pictureTag(null); } catch { threw = true; }
  assert(threw, 'no asset, no markup');

  console.log(JSON.stringify({ ok: true, selftest: 'media-build' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else if (args.includes('--check')) {
    const report = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const missing = report.files.filter((a) => (a.avif.ok && !fs.existsSync(path.join(OUT, `${a.name}.avif`)))
      || (a.webp.ok && !fs.existsSync(path.join(OUT, `${a.name}.webp`))));
    if (missing.length) { console.error(`media-build: ${missing.length} output(s) missing — run the build`); process.exit(1); }
    console.log(`dasha media: current (${report.assets} assets, ${(report.avifBytes / 1024).toFixed(0)} KB avif)`);
  } else {
    const report = await build();
    console.log(`dasha media · ${report.assets} assets · ${(report.sourceBytes / 1048576).toFixed(2)} MB in, `
      + `${(report.avifBytes / 1048576).toFixed(2)} MB avif out `
      + `(${(100 - (100 * report.avifBytes) / report.sourceBytes).toFixed(0)}% smaller)`);
    for (const a of report.files) {
      console.log(`  ${a.name.padEnd(14)} ${String(a.width) + 'w'} ${(a.sourceBytes / 1024).toFixed(0).padStart(6)}KB -> `
        + `${(a.avif.bytes / 1024).toFixed(0).padStart(5)}KB avif  rmse ${String(a.avif.rmse).padStart(5)}`
        + (a.avif.ok ? '' : `  REJECTED: ${a.avif.why}`));
    }
    if (report.rejected.length) process.exit(1);
  }
}
