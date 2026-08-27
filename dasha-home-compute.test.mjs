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

function assertValidHideCss(css) {
  assert.doesNotMatch(css, /,\s*\{/);
  assert.doesNotMatch(css, /\{\s*,/);
  assert.doesNotMatch(css, /,,/);
  assert.doesNotMatch(css, /<style[^>]*>\s*,/);
  assert.doesNotMatch(css, /,\s*<\/style>/);
}

const hidden = `<style id="dasha-home-chrome-hide">footer,.compute,a[href="/compute"],a[href="https://www.getdasha.com/compute"],a[href="/chess"]{display:none!important}</style><a href="/compute">Compute</a>`;
const shown = stripComputeHideRules(hidden);
assert.doesNotMatch(shown, /a\[href="\/compute"\]/);
assert.doesNotMatch(shown, /a\[href="https:\/\/www\.getdasha\.com\/compute"\]/);
assert.doesNotMatch(shown, /\.compute\b/);
assert.match(shown, /a\[href="\/chess"\]/);
assert.match(shown, /footer,a\[href="\/chess"\]\{display:none!important\}/);
assertValidHideCss(shown);
const unhiddenDoor = ensureHomeComputeDoor(hidden);
assert.match(unhiddenDoor, /id="dasha-home-compute"/);
assert.doesNotMatch(unhiddenDoor, /a\[href="\/compute"\]\{display:none/);

const first = stripComputeHideRules('<style id="dasha-home-chrome-hide">.compute,a[href="/chess"]{display:none}</style>');
assert.equal(first, '<style id="dasha-home-chrome-hide">a[href="/chess"]{display:none}</style>');
assertValidHideCss(first);

const last = stripComputeHideRules('<style id="dasha-home-chrome-hide">footer,a[href="/compute"]{display:none}</style>');
assert.equal(last, '<style id="dasha-home-chrome-hide">footer{display:none}</style>');
assertValidHideCss(last);

const only = stripComputeHideRules('<style id="dasha-home-chrome-hide">.compute,a[href="/compute"]{display:none!important}</style>');
assert.equal(only, '<style id="dasha-home-chrome-hide"></style>');

const abs = stripComputeHideRules('<style id="dasha-home-chrome-hide">nav,a[href="https://www.getdasha.com/compute"]{display:none}</style>');
assert.equal(abs, '<style id="dasha-home-chrome-hide">nav{display:none}</style>');

const live = stripComputeHideRules(
  '<style id="dasha-home-chrome-hide">footer,.navlinks,.dasha-nav,nav.nav,.compute,.poster,a[href="/studio"],a[href="/compute"],a[href="https://www.getdasha.com/compute"],a[href="/chess"]{display:none!important}</style>',
);
assert.match(live, /footer,\.navlinks,\.dasha-nav,nav\.nav,\.poster,a\[href="\/studio"\],a\[href="\/chess"\]\{display:none!important\}/);
assert.doesNotMatch(live, /\.compute\b/);
assertValidHideCss(live);

console.log('dasha-home-compute: PASS');
