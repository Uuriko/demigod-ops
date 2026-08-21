import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  daySeed,
  todaysRitual,
  ritualStudioHash,
  ritualStudioPath,
  homeRitualLinkScript,
  RITUAL_LOOKS,
  RITUAL_FORMATS,
  RITUAL_EFFECTS,
  RITUAL_STICKERS,
  RITUAL_CAPTIONS,
} from './dasha-today-ritual.mjs';

const fixed = new Date(Date.UTC(2026, 7, 12)); // Aug 12 2026
assert.equal(daySeed(fixed), 20260812);
const r = todaysRitual(fixed);
assert.ok(RITUAL_LOOKS.some((l) => l.id === r.look));
assert.ok(RITUAL_FORMATS.includes(r.format));
assert.ok(r.line.length > 0);
const hash = ritualStudioHash(r);
assert.match(hash, /look=/);
assert.match(hash, /format=/);
assert.match(hash, /line=/);
assert.equal(ritualStudioPath(r), `/studio#${hash}`);
assert.match(ritualStudioHash(r, { src: 'home' }), /src=home/);
assert.match(ritualStudioPath(r, { src: 'home' }), /src=home/);

// Deterministic
assert.deepEqual(todaysRitual(fixed), todaysRitual(fixed));

// Studio source must use the same seed formula, cold-open ritual, and DNA arrays
const studio = readFileSync(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
assert.match(studio, /getUTCFullYear\(\) \* 10000/);
assert.match(studio, /function todaysRitual/);
assert.match(studio, /applyLookFormatEffect\(ritual\.look/);
assert.match(studio, /after-dismiss[\s\S]*?surpriseMe\(\)/);

// LOOKS ids+lines, CAPTIONS, first-3 EFFECTS, STICKERS must match RITUAL_* (single DNA source)
const looksBlock = studio.match(/const LOOKS = \[([\s\S]*?)\];/)?.[1] || '';
const studioLookIds = [...looksBlock.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
const studioLookLines = [...looksBlock.matchAll(/line:\s*'((?:\\'|[^'])*)'/g)].map((m) =>
  m[1].replace(/\\'/g, "'"),
);
assert.deepEqual(
  studioLookIds.slice(0, RITUAL_LOOKS.length),
  RITUAL_LOOKS.map((l) => l.id),
  'Studio LOOKS ids drifted from RITUAL_LOOKS',
);
assert.deepEqual(
  studioLookLines.slice(0, RITUAL_LOOKS.length),
  RITUAL_LOOKS.map((l) => l.line),
  'Studio LOOKS lines drifted from RITUAL_LOOKS',
);

const captionsBlock = studio.match(/const CAPTIONS = \[([\s\S]*?)\];/)?.[1] || '';
const studioCaptions = [...captionsBlock.matchAll(/'((?:\\'|[^'])*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
assert.deepEqual(studioCaptions, RITUAL_CAPTIONS, 'Studio CAPTIONS drifted from RITUAL_CAPTIONS');

const effectsBlock = studio.match(/const EFFECTS = \[([\s\S]*?)\];/)?.[1] || '';
const studioEffects = [...effectsBlock.matchAll(/\['([^']+)'/g)].map((m) => m[1]).slice(0, 3);
assert.deepEqual(studioEffects, RITUAL_EFFECTS, 'Studio ritual EFFECTS[0..2] drifted');

const stickersBlock = studio.match(/const STICKERS = \[([\s\S]*?)\];/)?.[1] || '';
const studioStickers = [...stickersBlock.matchAll(/\['([^']*)'/g)].map((m) => m[1]);
assert.deepEqual(studioStickers, RITUAL_STICKERS, 'Studio STICKERS drifted from RITUAL_STICKERS');

// Home must embed the exact homeRitualLinkScript body (src=home included)
const home = readFileSync(new URL('./dasha-landing.html', import.meta.url), 'utf8');
const script = homeRitualLinkScript();
assert.match(script, /p\.set\("src","home"\)/);
assert.ok(home.includes(script), 'dasha-landing.html ritual script out of sync — paste homeRitualLinkScript()');
assert.match(home, /getUTCFullYear\(\)\*10000/);
assert.match(home, /a\[href\^="\/studio"\]/);

// Script output path matches module for fixed day when evaluated in node
const seed = 20260812;
const L = RITUAL_LOOKS;
const F = RITUAL_FORMATS;
const E = RITUAL_EFFECTS;
const S = RITUAL_STICKERS;
const C = RITUAL_CAPTIONS;
const pool = [...new Set([...C, ...L.map((x) => x.line)])];
const inline = {
  look: L[seed % L.length].id,
  format: F[seed % F.length],
  effect: E[seed % E.length],
  sticker: S[(seed >> 3) % S.length],
  line: pool[seed % pool.length] || L[0].line,
};
assert.deepEqual(inline, r);

console.log('dasha today ritual: seed, hash, home/studio parity OK', r.look, r.format, 'src=home');
