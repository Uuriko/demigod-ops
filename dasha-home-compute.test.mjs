import assert from 'node:assert/strict';
import { ensureHomeComputeDoor, ensureHomeComputeHop, stripComputeHideRules } from './dasha-home-compute.mjs';

const page = `<!doctype html><html><head></head><body>
<header class="dasha-hero"><h1>It's time $dasha.</h1></header>
<footer class="dasha-foot"><p><a href="https://www.getdasha.com/">$dasha</a> · <a href="https://www.getdasha.com/forum">Forum</a></p></footer>
</body></html>`;

const withDoor = ensureHomeComputeDoor(page);
assert.match(withDoor, /id="dasha-home-compute"/);
assert.match(withDoor, /id="compute-door"/);
assert.match(withDoor, /Route OpenAI-shaped test prompts to participating Macs\./);
assert.match(withDoor, /Open alpha · providers can read prompts · no billing yet\./);
assert.match(withDoor, /href="\/compute">Try the console</);
assert.match(withDoor, /github.com\/Uuriko\/dasha-desk\/tree\/main\/compute">Review source</);
assert.doesNotMatch(withDoor, /encrypted from providers|production[- ]ready|guaranteed (demand|earnings)/i);
assert.equal(ensureHomeComputeDoor(withDoor), withDoor);

const withHop = ensureHomeComputeHop(withDoor);
assert.match(withHop, /href="\/compute">Compute</);
assert.match(withHop, /Compute<\/a> · <a href="https:\/\/www\.getdasha\.com\/forum">Forum</);
assert.equal(ensureHomeComputeHop(withHop), withHop);

const hidden = `<style id="dasha-home-chrome-hide">footer,.compute,a[href="/compute"],a[href="https://www.getdasha.com/compute"],a[href="/chess"]{display:none!important}</style><a href="/compute">Compute</a>`;
const shown = stripComputeHideRules(hidden);
assert.doesNotMatch(shown, /a\[href="\/compute"\]/);
assert.doesNotMatch(shown, /a\[href="https:\/\/www\.getdasha\.com\/compute"\]/);
assert.doesNotMatch(shown, /\.compute\b/);
assert.match(shown, /a\[href="\/chess"\]/);
const unhiddenDoor = ensureHomeComputeDoor(hidden);
assert.match(unhiddenDoor, /id="dasha-home-compute"/);
assert.doesNotMatch(unhiddenDoor, /a\[href="\/compute"\]\{display:none/);

console.log('dasha-home-compute: PASS');
