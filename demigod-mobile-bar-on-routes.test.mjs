#!/usr/bin/env node
// Guard: the mobile action bar stays visible on mini-page ROUTES, and stays hidden under MODALS.
//
// openPage() used to hide #dg-bar, which left /how with no action anywhere in the 390px fold — a
// page that explains the process and offered no way to start it. Mini-pages are routes; a modal is
// not. The asymmetry is the contract:
//
//   show()      hides the bar   — a focus-trapped dialog must not compete with a fixed bar
//   openPage()  leaves it       — a route keeps site-level navigation
//   closePage() restores it     — undoes whatever show() did on the way out
//
// Measured with puppeteer at 390x844 before the change: all three routes scroll (/ 0->600,
// /how 0->550, /hire 0->352) and each page's own CTA, scrolled into view with the bar visible,
// hit-tests to itself (reachable:true). An earlier rect-overlap reading at scroll offset 0 wrongly
// suggested a clash — that was an artifact of comparing a position:fixed bar against unscrolled
// content, not a blocked control.
//
//   node --test demigod-mobile-bar-on-routes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const HEAD = fs.readFileSync(new URL('./demigod-head-styles.css', import.meta.url), 'utf8');
const HIDES_BAR = /#dg-bar[\s\S]{0,140}setProperty\('display','none'/;

/* Slice from a function to the NEXT top-level `function` declaration. An earlier version passed an
   explicit end marker and silently mis-sliced, because these are not defined in reading order —
   closePage sits ~6k chars BEFORE openPage, and hide() ~140k before show(). Deriving the end from
   the source removes the ordering assumption entirely. */
function fn(name) {
  const i = SRC.indexOf(name);
  assert.notEqual(i, -1, `${name} must exist — a missing marker would slice to nothing`);
  const next = SRC.indexOf('\nfunction ', i + name.length);
  const body = SRC.slice(i, next > i ? next : i + 12000);
  assert.ok(body.length > 200, `${name} body located (${body.length} chars)`);
  return body;
}

test('source read is real (non-vacuous)', () => {
  assert.ok(SRC.length > 100000, `foot-core read looks wrong: ${SRC.length} bytes`);
});

test('openPage does NOT hide the mobile bar — routes keep their action', () => {
  const body = fn('function openPage');
  assert.doesNotMatch(
    body,
    HIDES_BAR,
    'openPage must not hide #dg-bar: /how then has no action in the 390px fold',
  );
  assert.match(body, /if \(el\.id === 'dg-bar'\) return;/, 'generic page-shell hiding loop must skip #dg-bar');
});

test('show() DOES hide the mobile bar — a modal must not compete with it', () => {
  const body = fn('function show(id, opener)');
  assert.match(body, HIDES_BAR, 'a focus-trapped dialog must suppress the fixed bar');
});

test('closePage restores the bar it never hid, so a modal exit cannot strand it', () => {
  const body = fn('function closePage');
  assert.match(body, /#dg-bar[\s\S]{0,140}removeProperty\('display'\)/, 'closePage clears any inline hide');
});

test('the bar still carries both paths', () => {
  const mob = fn('function mob()');
  assert.match(mob, /data-dg-cta="hire"/, 'founder path present');
  assert.match(mob, /data-dg-cta="talent"/, 'candidate path present');
  assert.match(SRC, /#dg-bar\{position:fixed!important;[^}]*z-index:10060/, 'bar paints above #dg-page z-index 10050');
  assert.match(HEAD, /#dg-bar\s*\{[^}]*z-index:10060!important/s, 'head cascade cannot pin bar below #dg-page');
  assert.match(HEAD, /\.nav_container\s*\{[^}]*z-index:10070!important/s, 'persistent navigation paints above #dg-page and the mobile bar');
});
