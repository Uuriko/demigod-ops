#!/usr/bin/env node
/**
 * Real contrast, measured against the pixels actually behind the text.
 *
 * axe reports zero colour-contrast violations on all five routes — and that is not the same as the
 * text being readable. Automated checkers compare two declared colours; they skip text over
 * gradients and images entirely, which is the single most common way a design fails contrast. Every
 * Dasha surface puts type over radial gradients, so the one number nobody had was the real one.
 *
 * Method, and the three things it took to make the number trustworthy:
 *
 *   1. Tag every candidate with a unique attribute, and address it by that. The first version of
 *      this file found elements by matching their text, which is ambiguous — a wrapper and its
 *      child often share the same first 34 characters. It regularly blanked the wrong node, left
 *      the real glyphs in the screenshot, and then measured the text against itself. That is what
 *      "cream on cream, 1.25:1" means when you see it: an instrument fault, not a design fault.
 *
 *   2. Mask the glyphs on the ENTIRE page, once, then capture. Masking only the target's subtree is
 *      not enough: the home headline runs at line-height .86, so its own lines overlap, and the
 *      cream line above bled into the acid line below and was measured as its background — acid on
 *      cream, 1.03:1, on type that is actually acid on near-black. With every glyph on the page
 *      hidden, whatever is left in the capture is by definition background. Backgrounds, borders and
 *      images are untouched, because those ARE what sits behind the text.
 *
 *   3. Composite alpha. Type set in rgba(...,.78) is not that colour; it is that colour blended
 *      over whatever is behind it. Measuring the declared value reports a contrast nobody sees.
 *
 *   4. Sample viewport screenshots in viewport coordinates. Element-relative screenshots are not
 *      reliable for transformed ancestors: their clipped image and DOM Range coordinates use
 *      different transformed origins, which once reported white type on a dark rotated card as
 *      1.04:1 against its cream border. The viewport has one coordinate system for both pixels and
 *      Range rectangles.
 *
 * Then: crop a 1px border off the capture so a neighbour's edge cannot leak in, and take the WORST
 * sampled pixel, because WCAG is a floor, not a mean.
 *
 * The instrument checks itself: on every page at least one node must measure above 8:1. Dasha is
 * ink-on-acid somewhere on all five routes, so if nothing clears 8:1 the clip is misaligned again
 * and the whole run is noise rather than a design report.
 *
 * Thresholds are WCAG AA: 4.5:1 for body text, 3:1 for large text (>=24px, or >=18.66px bold).
 *
 *   node dasha-contrast.test.mjs             # live routes
 *   node dasha-contrast.test.mjs --local     # local sources instead
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { settleMotion } from './dasha-motion-settle.mjs';

const local = process.argv.includes('--local');
const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const rgba = (s) => {
  const n = (s.match(/[\d.]+/g) || []).map(Number);
  return { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 };
};
// Semi-transparent type is its declared colour composited over the pixel behind it.
const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

let servers = [];
async function serve(file) {
  const html = await readFile(new URL(`./${file}`, import.meta.url), 'utf8');
  const server = createServer((_, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}/`;
}

const targets = local
  ? [['home', await serve('dasha-landing.html')], ['studio', await serve('dasha-meme-studio.html')]]
  : [['home', 'https://www.getdasha.com/'], ['studio', 'https://www.getdasha.com/studio'],
    ['desk', 'https://www.getdasha.com/dasha'], ['lobby', 'https://www.getdasha.com/lobby'],
    ['howto', 'https://www.getdasha.com/how-to-buy']];

const ATTR = 'data-dasha-contrast';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const findings = [];

for (const [name, url] of targets) {
  for (const [device, w, h] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
    const page = await browser.newPage();
  await settleMotion(page);
    await page.setViewport({ width: w, height: h });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));

    /* Dismiss the first-visit X gate before measuring. It is a modal with a dimming scrim over the
       whole page, and every element behind it then samples through that scrim: acid reads as dark
       olive, cream reads as grey, and the run fills with impossible ~1.0:1 ratios for text that is
       fine to look at. It produced 96 phantom findings on home and none of them were real — the
       self-check never caught it, because the modal's own text is undimmed and clears 8:1 on its
       own. Local mode was unaffected only because the gate needs the network to appear, which is
       why this stayed hidden while --local was the only wired-up form.
       A returning visitor has the key set, so this measures what almost everyone actually sees. */
    await page.evaluate(() => {
      try { localStorage.setItem('dasha_x_gate_v1', '1'); } catch { /* storage may be blocked */ }
    });
    await page.reload({ waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));
    const gated = await page.evaluate(() =>
      document.documentElement.classList.contains('simp-gate-open'));
    if (gated) { console.error(`${name}/${device}: the X gate is still open — readings would be taken through its scrim`); process.exitCode = 1; }

    // Every element that renders its own text, tagged so it can be addressed unambiguously later.
    const items = await page.evaluate((attr) => {
      const out = [];
      let n = 0;
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot) walk(el.shadowRoot);
          const direct = [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim().length > 1);
          if (!direct) continue;
          const closed = el.closest('details:not([open])');
          if (closed && !closed.querySelector('summary')?.contains(el)) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
          const size = parseFloat(cs.fontSize);
          const bold = Number(cs.fontWeight) >= 700;
          el.setAttribute(attr, String(n));
          out.push({
            id: n++,
            text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 34),
            sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''),
            color: cs.color,
            size, bold,
            large: size >= 24 || (bold && size >= 18.66),
          });
        }
      };
      walk(document);
      return out;
    }, ATTR);

    /* Every glyph on the page goes transparent — including pseudo-element text and the outlined
       -webkit-text-stroke type, which text-fill-color alone does not hide. Colour only, so layout and
       the Range rects measured below are unchanged. */
    await page.evaluate(() => {
      /* The landing sets html{scroll-behavior:smooth}, which makes scrollIntoView animate — every
         rect read straight afterwards is the pre-scroll position, and the viewport clamp below then
         throws the element away. Two thirds of the page went unmeasured until this line existed. */
      const css = `html{scroll-behavior:auto!important}
        *,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;
        -webkit-text-stroke-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}`;
      const inject = (root) => {
        const style = document.createElement('style');
        style.textContent = css;
        (root === document ? document.head : root).appendChild(style);
      };
      inject(document);
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { inject(el.shadowRoot); walk(el.shadowRoot); }
      };
      walk(document);
    });

    // A shadow root is not reachable by document.querySelector, so resolve through the same walk.
    const resolve = `(id) => {
      const hit = [];
      const walk = (root) => {
        const found = root.querySelector('[${ATTR}="' + id + '"]');
        if (found) hit.push(found);
        for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot);
      };
      walk(document);
      return hit[0] || null;
    }`;

    let measured = 0, best = 0;
    const oversize = [];
    for (const item of items) {
      const handle = (await page.evaluateHandle(`(${resolve})(${item.id})`)).asElement();
      if (!handle) continue;
      /* Where the glyphs actually are, in the capture's own coordinates. The element BOX is not the
         answer: Dasha's buttons are pills, so the corners of their bounding box are page background
         that no text is ever drawn over. Measuring the box reported the ink-on-acid CTA — a genuine
         16:1 — as 1.10:1, because the worst pixel in the box was a rounded corner. Range rects give
         the line boxes of this element's own direct text and nothing else. */
      const lines = await handle.evaluate((el) => {
        const closed = el.closest('details:not([open])');
        if (closed && !closed.querySelector('summary')?.contains(el)) return [];
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });  // same scroll state as the capture
        const b = el.getBoundingClientRect();
        // Parked offscreen (skip links live at x:-9999) or too small to read: nobody sees it.
        if (b.width < 6 || b.height < 6 || b.right <= 0 || b.left >= document.documentElement.scrollWidth) return [];
        /* Wider or taller than the viewport: ElementHandle.screenshot() expands the viewport to fit,
           which reflows the page, so the capture no longer matches the rects measured here. The home
           ticker's scrolling track is 1454px in a 1440px viewport and produced a confident 1.00:1 on
           text that is ink on an acid strip. Not measurable this way; counted and reported, not hidden. */
        if (b.width > innerWidth || b.height > innerHeight) return 'oversize';
        /* Clip to every ancestor that hides overflow. A text node reports client rects for text that
           an ancestor has clipped away — the home ticker's track is twice its container's width and
           scrolls under overflow:hidden, so half its rects describe pixels that are never painted.
           Sampling those found page background under the text and called it ink on ink, 1.00:1. */
        /* The viewport is a clip too. The ticker's track runs from x:-84 to x:1370 mid-animation, and
           there is no page left of zero to photograph — those pixels come back black and read as ink
           on ink. Safe to clamp here only because we scrolled the element in just above. */
        /* Start from the element's own box. A text node's background cannot be a sibling that
           merely sits next to it: on the Studio at 390px the "Tilt" label ends a few pixels above an
           acid .btn.primary, the Range rect bled into that button, and "worst pixel" duly reported
           cream on acid at 1.03:1 for text that is cream on #070608. The 1px inset below was already
           there for the same reason and was not enough at this spacing.
           This still catches a real overlay — a modal scrim covers the element's own box too, so the
           gate-scrim case is unaffected. */
        const own = el.getBoundingClientRect();
        let clip = { l: Math.max(0, own.left), t: Math.max(0, own.top),
                     r: Math.min(innerWidth, own.right), b: Math.min(innerHeight, own.bottom) };
        for (let p = el; p; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (cs.overflow === 'visible' && cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
          const pr = p.getBoundingClientRect();
          clip = { l: Math.max(clip.l, pr.left), t: Math.max(clip.t, pr.top),
                   r: Math.min(clip.r, pr.right), b: Math.min(clip.b, pr.bottom) };
        }
        /* Rects for short character spans, not whole lines. A line rect is the axis-aligned box of
           its text, and Dasha rotates things — the ticker sits at -1deg, so across 1440px its line
           box overshoots the acid strip by ~25px at each corner, and those corners are page
           background. That read as ink on ink, 1.00:1, on text that is ink on acid everywhere. A
           short span's box hugs the glyphs: over ~30px the same rotation drifts half a pixel. */
        const out = [];
        out.scrollY = Math.round(window.scrollY);
        for (const node of el.childNodes) {
          if (node.nodeType !== 3 || !node.textContent.trim()) continue;
          const len = node.textContent.length;
          const chunk = Math.max(3, Math.ceil(len / 40));
          for (let i = 0; i < len; i += chunk) {
            const range = document.createRange();
            range.setStart(node, i);
            range.setEnd(node, Math.min(len, i + chunk));
            if (!range.toString().trim()) continue;
            for (const r of range.getClientRects()) {
              const l = Math.max(r.left, clip.l), t = Math.max(r.top, clip.t);
              const w = Math.min(r.right, clip.r) - l, hh = Math.min(r.bottom, clip.b) - t;
              if (w < 3 || hh < 3) continue;
              out.push({ x: l, y: t, w, h: hh });
            }
          }
        }
        return out;
      });
      if (lines === 'oversize') { oversize.push(item.text); await handle.dispose(); continue; }
      if (!lines.length) { await handle.dispose(); continue; }

      let worst = Infinity, worstPx = null;
      try {
        const shot = await page.screenshot({ encoding: 'base64' });
        const px = await page.evaluate(async (b64, rects) => {
          const img = new Image();
          img.src = 'data:image/png;base64,' + b64;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const out = [];
          for (const r of rects) {
            /* Only sample what the capture actually contains. A rect that lies outside the
               screenshot means the element was never scrolled into view, and clamping it back into
               the viewport samples a completely different part of the page — which is how the
               Studio's "Tilt" label, cream on #070608, got reported as cream on acid at 1.03:1.
               Out of frame is unmeasured, never a finding. */
            if (r.y < 0 || r.x < 0 || r.y + r.h > img.height || r.x + r.w > img.width) continue;
            // Inset 1px: a line box's own edge picks up the neighbouring element's antialiasing.
            const x = Math.max(0, Math.round(r.x) + 1), y = Math.max(0, Math.round(r.y) + 1);
            const w = Math.min(img.width - x, Math.round(r.w) - 2), h = Math.min(img.height - y, Math.round(r.h) - 2);
            if (w < 1 || h < 1) continue;
            const d = ctx.getImageData(x, y, w, h).data;
            const step = Math.max(1, Math.floor(d.length / 4 / 400)) * 4;
            for (let i = 0; i < d.length; i += step) if (d[i + 3] > 8) out.push([d[i], d[i + 1], d[i + 2]]);
          }
          return out;
        }, shot, lines);
        const { rgb, a } = rgba(item.color);
        for (const bg of px) {
          const r = ratio(a < 1 ? over(rgb, a, bg) : rgb, bg);
          if (r < worst) { worst = r; worstPx = bg; }
        }
        if (px.length) measured++; else worst = Infinity;
      } catch { worst = Infinity; }
      await handle.dispose();

      if (worst !== Infinity && worst > best) best = worst;
      const need = item.large ? 3 : 4.5;
      if (worst < need) {
        findings.push({ route: name, device, text: item.text, color: item.color, sel: item.sel,
          size: Math.round(item.size), need, got: worst, bg: worstPx,
          /* --explain keeps the evidence for a finding, not just its verdict. Twice this file has
             reported a ratio that turned out to be an instrument fault, and both times the only way
             to tell was to know WHICH pixels it sampled and where. Carrying the rects costs nothing
             and makes the next false positive a two-minute question instead of an afternoon. */
          rects: lines.map((r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) })),
          scrollY: item.scrollY });
      }
    }
    console.log(`${name.padEnd(7)} ${device.padEnd(8)} measured ${measured}/${items.length} text nodes, best ${best.toFixed(1)}:1`
      + (oversize.length ? `  [${oversize.length} wider than the viewport, not measurable: ${oversize.map((t) => JSON.stringify(t.slice(0, 18))).join(', ')}]` : ''));
    if (measured < 5) { console.error(`${name}/${device}: only ${measured} nodes measured — the harness did not really run`); process.exitCode = 1; }
    /* Self-check. Dasha puts ink on acid on every route, so something must clear 8:1. If nothing
       does, the clip is landing on the wrong pixels and every finding below is fiction. */
    if (best < 8) { console.error(`${name}/${device}: nothing cleared 8:1 (best ${best.toFixed(2)}) — the clip is misaligned, findings are not trustworthy`); process.exitCode = 1; }
    await page.close();
  }
}

await browser.disconnect();
for (const s of servers) { s.closeAllConnections?.(); s.close(); }

if (findings.length) {
  console.error(`\n${findings.length} text element(s) below WCAG AA against the worst pixel behind them:\n`);
  const explain = process.argv.includes('--explain');
  for (const f of findings.sort((a, b) => a.got - b.got)) {
    console.error(`  ${f.got.toFixed(2)}:1 (needs ${f.need}:1)  ${f.route}/${f.device}  ${f.size}px  ${f.color} on rgb(${f.bg})\n      ${f.sel}\n      "${f.text}"`);
    if (explain) {
      console.error(`      sampled at scrollY ${f.scrollY}: ${f.rects.map((r) => `${r.w}x${r.h} @ ${r.x},${r.y}`).join('  ')}`);
    }
  }
  process.exit(1);
}
console.log('\nDasha contrast: PASS (every text node clears WCAG AA against the worst pixel behind it)');
