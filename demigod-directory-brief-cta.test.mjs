#!/usr/bin/env node
// Guard: the directory's intent-capture button.
//
// Debate outcome (Codex vs Grok, 2026-08-06): the directory is the only asset with real
// distribution, but Grok's own objection is that founders free-ride on it as research and never
// convert. This button is the answer — capture intent where signal is highest (a founder looking
// at a company with live open roles), hand off to the EXISTING brief wizard, send nothing.
//
//   node --test demigod-directory-brief-cta.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./demigod-startup-atlas-web.js', import.meta.url), 'utf8');

test('source is readable (non-vacuous: a bad read cannot satisfy the regexes below)', () => {
  assert.ok(SRC.length > 20000, `atlas read looks wrong: ${SRC.length} bytes`);
});

test('button is gated on observed open roles, not rendered unconditionally', () => {
  // The gate is what keeps the honesty line: we only invite a brief where the company's OWN
  // public board shows live roles. An ungated button would imply a relationship we do not have.
  const row = SRC.slice(SRC.indexOf("return '<li class=\"dg-dir-row\""), SRC.indexOf('function renderRecentRoles'));
  assert.ok(row.length > 200, 'row template located');
  assert.match(row, /openRoles\s*\?[\s\S]{0,400}dg-dir-brief/, 'brief button must sit inside an openRoles conditional');
});

test('button carries the company and an accessible name', () => {
  assert.match(SRC, /data-company="'\s*\+\s*esc\(company\.name\)/, 'company name is escaped into data-company');
  assert.match(SRC, /aria-label="Hiring at '\s*\+\s*esc\(company\.name\)/, 'accessible name names the company');
});

test('handoff reuses the existing wizard and never sends', () => {
  const handler = SRC.slice(SRC.indexOf('button.dg-dir-brief[data-company]'), SRC.indexOf('dg-dir-rolechip[data-fn]'));
  assert.ok(handler.length > 200, 'click handler located');
  assert.match(handler, /data-demigod-modal="startup"|#startup-modal/, 'opens the existing startup wizard');
  assert.match(handler, /\[name="company-name"\]/, 'prefills the company field');
  assert.match(handler, /location\.href = '\/hire'/, 'falls back to /hire so the control is never dead');
  // The whole point is that this is a form handoff, not an outbound action.
  assert.doesNotMatch(handler, /fetch\(|XMLHttpRequest|sendBeacon|mailto:/, 'must not send anything');
});

test('button meets the touch target and focus contract the rest of the site holds', () => {
  const css = SRC.slice(SRC.indexOf('button.dg-dir-brief{'), SRC.indexOf('button.dg-dir-brief{') + 600);
  assert.match(css, /min-height:44px/, '44px touch target');
  assert.match(SRC, /button\.dg-dir-brief:focus-visible\{outline:2px solid #a6ffcb/, 'visible focus ring');
  assert.match(SRC, /prefers-reduced-motion:reduce\)\{button\.dg-dir-brief\{transition:none/, 'honours reduced motion');
});

test('prefill never overwrites an answer the founder already typed', () => {
  assert.match(SRC, /if \(input && !String\(input\.value \|\| ''\)\.trim\(\)\)/, 'only fills an empty field');
});
