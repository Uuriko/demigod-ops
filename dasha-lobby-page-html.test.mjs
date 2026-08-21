#!/usr/bin/env node
/**
 * Worker /lobby is a document. dasha-lobby-page.html stays a Webflow fragment.
 * Live 2026-08-17 served the fragment raw — no <title>, tab leaked CSS.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asStandaloneLobbyPage } from './dasha-lobby-worker.mjs';
import { LOBBY_PAGE_HTML } from './dasha-lobby-static-gen.mjs';
import { linkedLimits, MAX_TEXT_HOLDER, MAX_TEXT_LINKED } from './dasha-lobby-x.mjs';
import { parseClientFrame, publicMessage } from './dasha-lobby-mod.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const fragment = readFileSync(join(root, 'dasha-lobby-page.html'), 'utf8');
const client = readFileSync(join(root, 'dasha-lobby-client.js'), 'utf8');
const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');

assert.equal(linkedLimits(false, true).maxText, 200, 'holder status never upgrades anonymous chat');
assert.equal(linkedLimits(true, false).maxText, MAX_TEXT_LINKED, 'X-linked chat keeps its existing limit');
assert.equal(linkedLimits(true, true).maxText, MAX_TEXT_HOLDER, 'current holders receive the 500-character tier');
const holderMessage = JSON.stringify({ type: 'chat', text: 'x'.repeat(400) });
assert.equal(parseClientFrame(holderMessage, { maxText: linkedLimits(true, false).maxText, linked: true }).ok, false);
assert.equal(parseClientFrame(holderMessage, { maxText: linkedLimits(true, true).maxText, linked: true }).ok, true);
const tagged = publicMessage({ id: '1', nick: '@maker', text: 'hi', ts: 1, linked: true, handle: 'maker', holder: true });
assert.equal(tagged.holder, true, 'server-authored holder messages expose the badge bit');
assert.equal('holder' in publicMessage({ id: '2', nick: 'anon', text: 'hi', ts: 1, holder: true }), false,
  'an anonymous message cannot acquire a holder badge');
assert.match(worker, /linkedLimits\(linked, holder\)/, 'Worker must enforce the holder tier, not only advertise it');
assert.match(client, /applyServerPerks\(data\.perks\)/, 'client limit must come from the authoritative session');
assert.match(client, /holder: Boolean\((?:m|data)\.holder\)/, 'client must render only the server message field');
assert.match(fragment, /\.lobby-holder-badge\{/, 'holder chat badge must use the existing palette');

assert.match(fragment, /^<style>/);
assert.doesNotMatch(fragment, /<title[\s>]/i, 'Webflow embed must stay a fragment');
assert.doesNotMatch(LOBBY_PAGE_HTML, /<title[\s>]/i, 'generated Worker blob is still the fragment');
assert.match(fragment, /id="dasha-lobby-page"/);
assert.match(fragment, /id="dasha-forum"/, 'lobby must mount threads beside chat');
assert.match(fragment, /q\.get\('pane'\)==='threads'/, 'threads pane must honor ?pane= so /forum 308 survives hash-stripping clients');
assert.match(fragment, /role="tablist"/, 'phone uses Now / Threads tabs');
assert.doesNotMatch(fragment, /lobby\.getdasha\.com\/forum/, 'no second door — /forum redirects into this room');
assert.match(fragment, /Now \+ threads\. Official\. No Telegram\. No Discord\./, 'first paint must say this is the official room');
assert.match(LOBBY_PAGE_HTML, /id="dasha-forum"/, 'worker lobby blob must mount threads beside chat');
assert.doesNotMatch(fragment, /#7ec8ff/i, 'no sixth palette colour on the lobby page');
assert.doesNotMatch(LOBBY_PAGE_HTML, /#7ec8ff/i, 'generated lobby blob stays in the five-colour palette');
assert.doesNotMatch(fragment, /#ffc857/i, 'no invented warn-yellow on the lobby page');
assert.doesNotMatch(LOBBY_PAGE_HTML, /#ffc857/i, 'generated lobby blob has no invented warn-yellow');
assert.match(fragment, /\.lobby-linked \.lobby-meta\{color:var\(--hot\)\}/, 'linked chat meta uses a palette accent, not a secret sixth colour');
assert.match(fragment, /\.df-post:target\{border-color:var\(--acid\)/,
  'a shared Forum post must remain visibly identified after fragment navigation');

const page = asStandaloneLobbyPage(LOBBY_PAGE_HTML);
const title = page.match(/<title>([^<]*)<\/title>/)?.[1];
assert.equal(title, '$dasha community — chat and forum');
assert.match(page, /<meta name="description" content="Live chat and lasting threads for \$dasha\.">/);
assert.doesNotMatch(title, /[{};#]/, 'title must not be CSS');
assert.match(page, /^<!doctype html>/i);
assert.match(page, /<html lang="en">/);
assert.match(page, /id="dasha-lobby-page"/);
assert.match(page, /<\/body><\/html>$/);
assert.equal(asStandaloneLobbyPage(page), page, 'already-titled documents stay put');

const leaked = asStandaloneLobbyPage('<style>\n  #dasha-lobby-page{--ink:#070608}\n</style>');
assert.equal(leaked.match(/<title>([^<]*)<\/title>/)?.[1], '$dasha community — chat and forum');
assert.doesNotMatch(leaked.match(/<title>([^<]*)<\/title>/)?.[1] || '', /--ink/);

console.log('dasha-lobby-page-html: PASS');
