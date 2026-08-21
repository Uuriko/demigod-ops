#!/usr/bin/env node
/**
 * Smoke test for privacy page — checks it has Worker-parity disclosures.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./dasha-privacy.html', import.meta.url), 'utf8');
assert.ok(html.includes('Referral links'), 'must mention referral link tracking');
assert.ok(html.includes('Lobby history'), 'must mention lobby history limits');
assert.ok(html.includes('public replays'), 'must mention chess replays');
assert.ok(html.includes('Cloudflare'), 'must name Cloudflare');
assert.ok(html.includes('chess rating'), 'must list chess data in deletion scope');
console.log('dasha-privacy: PASS');
