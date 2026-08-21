/**
 * Love Spec path tests — L1–L7 acceptance as static + pure-function fixtures.
 * No browser. Complements dasha-studio-handoff.test.mjs (OG PNG) and meme-studio puppeteer.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sanitizeHandoffBody,
  handoffToStudioHash,
  handoffCardHtml,
  publicFunnelSummary,
} from './dasha-lobby-worker.mjs';
import { handoffOgPng } from './dasha-handoff-og.mjs';
import {
  publicMetricsViolations,
  PUBLIC_METRICS_KEYS,
} from './dasha-public-metrics-schema.mjs';
import { runIdentityMatrix } from './dasha-identity-matrix.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const studio = readFileSync(join(root, 'dasha-meme-studio.html'), 'utf8');
const love = existsSync(join(root, 'DASHA-LOVE-SPEC.md'))
  ? readFileSync(join(root, 'DASHA-LOVE-SPEC.md'), 'utf8')
  : '';

// —— Fixtures (golden DNA states) ——
const FIXTURES = {
  posterSquare: {
    look: 'poster',
    format: 'square',
    line: 'It’s time $dasha',
    effect: 'clean',
    sticker: '✦',
    src: 'home',
  },
  photoStory: {
    look: 'photo',
    format: 'story',
    line: 'Cmon',
    photo: 'hero',
    effect: 'fry',
  },
  longLine: {
    look: 'poster',
    format: 'banner',
    line: 'x'.repeat(200),
    effect: 'xerox',
  },
};

// L1 Instant competence — cold open applies today’s ritual (postable without typing)
assert.match(studio, /function todaysRitual/, 'L1: Today ritual missing');
assert.match(studio, /Today’s \$\{lookName\}|Today’s /, 'L1: cold-open Today starter copy missing');
assert.match(studio, /applyLookFormatEffect\(ritual\.look/, 'L1: cold open must land on ritual look');
assert.match(studio, /<canvas|getContext\(['"]2d['"]\)/, 'L1: canvas path missing');
assert.doesNotMatch(studio, /connect wallet|wallet required/i, 'L1: wallet gate on create');

// L2 One change is mine — edit surface + share still primary
assert.match(studio, /id="line"|textarea|contenteditable|input.*line/i, 'L2: line edit control');
assert.match(studio, /function setLook|data-look|look-strip|LOOKS/, 'L2: look change path');
assert.match(studio, /id="share"|function share\b/, 'L2: Share control');
assert.match(studio, /fillVariantThumbs|fillLookStripThumbs|v-thumb|strip-thumb/, 'L2: look thumbs');

// L3 Share works — native share + X fallthrough + honest status
assert.match(studio, /navigator\.share|share\(/, 'L3: share API');
assert.match(studio, /AbortError[\s\S]{0,200}save\(|intent\/tweet|x\.com\/intent/, 'L3: share fallthrough');
assert.match(studio, /Pass-it-on|Copied|shared|Share failed|could not/i, 'L3: status strings');

// L4 Handoff survives the feed — path URL + static og
const ok = sanitizeHandoffBody(FIXTURES.posterSquare);
assert.ok(ok, 'L4: sanitize accepts poster fixture');
assert.equal(ok.look, 'poster');
assert.equal(ok.sticker, '✦');
const long = sanitizeHandoffBody(FIXTURES.longLine);
assert.ok(long && long.line.length <= 120, 'L4: line capped');
assert.equal(sanitizeHandoffBody({ look: 'nope', format: 'square', line: 'x' }), null);
assert.equal(
  sanitizeHandoffBody({ look: 'poster', format: 'square', line: 'hi', photo: 'https://evil.test/x.png' }),
  null,
  'L4: reject remote photo blob',
);

const hash = handoffToStudioHash(ok);
assert.match(hash, /look=poster/);
assert.match(hash, /line=/);
const card = handoffCardHtml('loveFix01', ok);
assert.match(card, /og:title/);
assert.match(card, /og:image/);
assert.match(card, /twitter:card/);
assert.match(card, /\/h\/loveFix01\/og\.png/);
assert.match(card, /getdasha\.com\/studio#/);
assert.match(card, /Your turn/);
assert.doesNotMatch(card, /<script src=/);

const png = await handoffOgPng(ok);
assert.ok(png.byteLength > 800, 'L4: OG PNG too small');
assert.ok(png.byteLength < 200_000, 'L4: OG PNG uncompressed?');
assert.equal(png[0], 0x89);
assert.equal(png[1], 0x50);

// L5 Your turn — inbound DNA loads; parent lineage
assert.match(studio, /pLook|pFormat|pLine|parent/, 'L5: parent lineage');
assert.match(studio, /fragmentParams|location\.hash|URLSearchParams/, 'L5: fragment DNA load');
const photoOk = sanitizeHandoffBody(FIXTURES.photoStory);
assert.ok(photoOk?.photo === 'hero' && photoOk.effect === 'fry', 'L5: photo/effect handoff');
const withParent = sanitizeHandoffBody({
  ...FIXTURES.posterSquare,
  parent: FIXTURES.photoStory,
});
assert.ok(withParent?.parent?.look === 'photo', 'L5: nested parent sanitize');
assert.match(handoffToStudioHash(withParent), /pLook=photo|pFormat=story/);

// L6 No humiliation — no bag rank, rights carve-out, no account for create
assert.doesNotMatch(studio, /bag rank|holder rank|connect wallet to (create|export)/i, 'L6: humiliation UI');
assert.match(studio, /CC0|your|yours|rights|not financial|not the/i, 'L6: rights/disclaimer signal');
assert.doesNotMatch(studio, /thesis card|conviction receipt/i, 'L6: scrapped product');

// L7 Stay in the joke — after-share loop
assert.match(studio, /after-share|make another|Pass-it-on|open what|what they get/i, 'L7: after-share');
assert.match(studio, /ensureHandoffUrl/, 'L7: handoff preferred for share link');
assert.match(studio, /function surpriseMe|todaysRitual|ritual-today/, 'L7: stay-in-joke craft');

// —— Public metrics schema integrity ——
const sinceMs = Date.now() - 86_400_000;
const empty = publicFunnelSummary({ since: sinceMs, completionSince: sinceMs }, {}, {}, 5);
assert.equal(empty.ok, true);
assert.equal(empty.threshold, 5);
assert.deepEqual(
  Object.keys(empty.studio).sort(),
  [...PUBLIC_METRICS_KEYS.studio].sort(),
  'publicFunnelSummary studio keys must match schema',
);
assert.deepEqual(
  Object.keys(empty.chess).sort(),
  [...PUBLIC_METRICS_KEYS.chess].sort(),
  'publicFunnelSummary chess keys must match schema',
);
assert.equal(publicMetricsViolations(empty).length, 0, publicMetricsViolations(empty).join(','));

const fat = publicFunnelSummary(
  {
    since: sinceMs,
    completionSince: sinceMs,
    opens: 20,
    firstEdits: 10,
    completions: 8,
    exports: 7,
    shareIntents: 6,
    shareSuccesses: 5,
    copyEditableLinks: 5,
    handoffMints: 9,
    handoffOpens: 6,
  },
  { starts: 10, completions: 8, replays: 5, shares: 5 },
  { pageOpens: 20, localPlayIntents: 10, localCompletions: 6, localRematchIntents: 5 },
  5,
);
assert.equal(fat.studio.handoffMints, 9);
assert.equal(fat.studio.mintToOpen, Number((6 / 9).toFixed(3)));
assert.equal(fat.studio.editToShareIntent, Number((6 / 10).toFixed(3)));
assert.equal(fat.studio.intentToShareSuccess, Number((5 / 6).toFixed(3)));
assert.equal(fat.chess.pageOpenToLocalPlayIntent, 0.5);
assert.equal(fat.chess.localPlayToCompletion, 0.6);
assert.equal(fat.chess.localCompletionToRematchIntent, Number((5 / 6).toFixed(3)));
/* Opens can exceed mints (re-opens); public ratio is capped at 1. */
const overOpen = publicFunnelSummary(
  {
    since: sinceMs,
    completionSince: sinceMs,
    handoffMints: 10,
    handoffOpens: 25,
  },
  {},
  {},
  5,
);
assert.equal(overOpen.studio.mintToOpen, 1);
assert.equal(publicMetricsViolations(fat).length, 0, publicMetricsViolations(fat).join(','));

const leak = { ...empty, studio: { ...empty.studio, wallet: 'x' } };
assert.ok(publicMetricsViolations(leak).includes('studio:wallet'), 'must reject identity leak key');

// —— Identity matrix self-check (disk) ——
const matrix = runIdentityMatrix();
assert.ok(matrix.ok, `identity matrix hard fails: ${matrix.hard.join(', ')}`);

// Love spec doc still names L1–L7
if (love) {
  for (const tag of ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']) {
    assert.match(love, new RegExp(tag), `Love Spec missing ${tag}`);
  }
}

console.log('dasha love-paths: L1–L7 fixtures + metrics schema + identity matrix OK');
