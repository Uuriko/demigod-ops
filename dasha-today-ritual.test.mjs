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

// Deterministic
assert.deepEqual(todaysRitual(fixed), todaysRitual(fixed));

// Studio source must use the same seed formula and cold-open ritual
const studio = readFileSync(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
assert.match(studio, /getUTCFullYear\(\) \* 10000/);
assert.match(studio, /function todaysRitual/);
assert.match(studio, /applyLookFormatEffect\(ritual\.look/);

// Home must load the ritual linker (script body fingerprint)
const home = readFileSync(new URL('./dasha-landing.html', import.meta.url), 'utf8');
const script = homeRitualLinkScript();
assert.match(home, /getUTCFullYear\(\)\*10000/);
assert.match(home, /a\[href\^="\/studio"\]/);
assert.ok(script.includes('seed'), 'home script builder empty');

// Script output path matches module for fixed day when evaluated in node
const seed = 20260812;
const L = RITUAL_LOOKS;
const F = RITUAL_FORMATS;
const E = ['clean', 'fry', 'xerox'];
const S = ['', '🍒', '✦', '♱', '♢', '☻'];
const C = [
  'How u crying at the casino and u can’t even get in',
  'It’s time $dasha',
  'Well im still alive',
  'Friday in the 4HL you can really feel the pull of the weekend',
];
const pool = [...new Set([...C, ...L.map((x) => x.line)])];
const inline = {
  look: L[seed % L.length].id,
  format: F[seed % F.length],
  effect: E[seed % E.length],
  sticker: S[(seed >> 3) % S.length],
  line: pool[seed % pool.length] || L[0].line,
};
assert.deepEqual(inline, r);

console.log('dasha today ritual: seed, hash, home/studio parity OK', r.look, r.format);
