import assert from 'node:assert/strict';
import { CHESS_H1, ensureChessHeading } from './dasha-chess-heading.mjs';
import { readFile } from 'node:fs/promises';

assert.equal(CHESS_H1, 'Chess');

const live = `<!doctype html><html lang="en"><body>
<header class="dasha-slim wrap"><a class="dasha-word" href="https://www.getdasha.com/">$dasha</a></header>
<main class="wrap"><div class="app"><h2 id="gate-title" hidden></h2></div></main>
</body></html>`;

const out = ensureChessHeading(live);
assert.match(out, /<h1>Chess<\/h1>/);
assert.ok(out.indexOf('<main class="wrap">') < out.indexOf('<h1>Chess</h1>'));
assert.ok(out.indexOf('<h1>Chess</h1>') < out.indexOf('<div class="app">'));
assert.equal(ensureChessHeading(out), out);
assert.equal(ensureChessHeading('<h1>Already</h1><main></main>'), '<h1>Already</h1><main></main>');

const source = await readFile(new URL('./dasha-chess-page.html', import.meta.url), 'utf8');
assert.match(ensureChessHeading(source), /<h1>Chess<\/h1>/);

console.log('dasha-chess-heading: PASS');
