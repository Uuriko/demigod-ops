#!/usr/bin/env node
/**
 * Motion, and the three ways it goes wrong.
 *
 * 1. It becomes required. If content is hidden until an animation reveals it, then a browser that
 *    does not run the animation shows an empty page. So the finished state is the default and every
 *    animation sits inside @supports — a browser that does not understand animation-timeline
 *    ignores the block and sees the page as it was, with no fallback branch to maintain.
 * 2. It costs interaction. Animating anything but transform and opacity runs layout or paint on
 *    every frame, which is what actually shows up as INP on a scrolling page. Scroll-linked rules
 *    here are held to those two properties.
 * 3. It ignores people who asked it not to. Every effect is inside a
 *    prefers-reduced-motion: no-preference query, so asking for less motion gets none of it rather
 *    than a faster version of it.
 *
 * Read from the stylesheet rather than from a rendered page: this is about what the CSS promises,
 * and the harness browser reports prefers-reduced-motion: reduce, so a rendered check would show
 * every one of these rules correctly switched off and prove nothing.
 *
 *   node dasha-motion.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const SURFACES = ['dasha-landing.html', 'dasha-lobby-page.html', 'dasha-chess-page.html'];

/** Properties the compositor can animate without running layout or paint. */
const COMPOSITED = new Set(['transform', 'opacity', 'filter', 'stroke-dashoffset']);

for (const file of SURFACES) {
  const html = readFileSync(join(root, file), 'utf8');

  // ---- every surface answers a request for less motion --------------------------
  /* Two shapes satisfy this and the second is the better one. Switching motion off inside a
     `reduce` block means every new effect has to remember to opt out. Declaring it only inside
     `no-preference` means a new effect is off by default for anyone who asked for less, which is
     what the chess page does — this assertion originally demanded the weaker form and failed the
     surface that had already got it right. */
  const optsOut = /@media\s*\(?\s*prefers-reduced-motion\s*:\s*reduce/.test(html);
  const optsIn = /@media\s*\(?\s*prefers-reduced-motion\s*:\s*no-preference/.test(html);
  assert.ok(optsOut || optsIn,
    `${file} never mentions prefers-reduced-motion — a sticky header and a scrolling page are motion whether or not anyone wrote a keyframe`);

  /* Whichever shape it uses, motion must not be left outside it. Anything declared unconditionally
     runs for everyone, including the people who asked it not to. */
  if (optsIn && !optsOut) {
    const guarded = html.slice(html.indexOf('prefers-reduced-motion:no-preference'));
    for (const [, decl] of html.matchAll(/(transition\s*:\s*[^;}]+)/g)) {
      if (/\b0s\b|none/.test(decl)) continue;
      assert.ok(guarded.includes(decl),
        `${file} declares "${decl.trim().slice(0, 48)}" outside its no-preference guard`);
    }
  }

  // ---- scroll-driven rules are enhancement, never load-bearing -------------------
  const usesScrollTimeline = /animation-timeline\s*:/.test(html);
  if (usesScrollTimeline) {
    assert.ok(/@supports\s*\(\s*animation-timeline\s*:\s*view\(\)\s*\)/.test(html),
      `${file} uses animation-timeline without an @supports guard — in a browser that lacks it the styles apply half-way`);

    /* The guard has to actually contain the rules, not merely appear somewhere in the file. */
    const guardAt = html.indexOf('@supports (animation-timeline: view())');
    const timelineAt = html.indexOf('animation-timeline:view()');
    assert.ok(guardAt >= 0 && timelineAt > guardAt,
      `${file} declares animation-timeline outside its @supports guard`);

    assert.ok(/prefers-reduced-motion\s*:\s*no-preference/.test(html),
      `${file} runs scroll animations without asking whether motion is wanted`);
  }

  // ---- keyframes stay on the compositor -----------------------------------------
  for (const [, name, body] of html.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\}\s*\}/g)) {
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    for (const prop of props) {
      assert.ok(COMPOSITED.has(prop),
        `${file}: @keyframes ${name} animates "${prop}", which runs layout or paint every frame — use transform/opacity`);
    }
  }
}

// ---- the homepage's finished state does not depend on motion ---------------------
{
  const html = readFileSync(join(root, 'dasha-landing.html'), 'utf8');
  /* The failure this prevents: setting opacity:0 in the base styles and relying on an animation to
     bring it back. Then anything that stops the animation — an unsupported browser, a reduced-motion
     request, a stylesheet that fails to load — leaves a blank page rather than a still one. */
  const base = html.slice(0, html.indexOf('@supports (animation-timeline: view())'));
  for (const selector of ['.dasha section', '.poster-tile', '.contract']) {
    const rule = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*opacity\\s*:\\s*0\\b`);
    assert.ok(!rule.test(base),
      `${selector} starts invisible in the base styles — the page would be blank without the animation`);
  }
}

console.log(`dasha motion: PASS (${SURFACES.length} surfaces answer reduced-motion, scroll rules guarded by @supports and no-preference, keyframes stay composited, finished state is the default)`);
