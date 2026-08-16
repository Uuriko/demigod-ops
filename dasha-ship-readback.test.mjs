#!/usr/bin/env node
/**
 * The readback verdict, tested without Webflow.
 *
 * After dasha-ship writes an embed it reads the element back and compares. That comparison is the
 * last thing standing between "the tool returned 200" and "the page actually holds what we sent",
 * and its two failure modes need opposite responses — so they are worth pinning down.
 *
 * On 2026-08-16 the mismatch case was real, not theoretical: live home carried Designer nav edits
 * linking /simp, /graph and /bounties, none of which exist in any tree.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readbackVerdict } from './dasha-ship.mjs';

/** Short digest so a mismatch on a 46KB embed prints something a human can compare. */
const embedHash = (s) => (s === undefined || s === null ? 'none' : createHash('sha256').update(s).digest('hex').slice(0, 12));

const code = '<div id="dasha-embed">' + 'x'.repeat(4096) + '</div>';

// hashMatch: the only success. Identical bytes, whatever their size.
{
  const v = readbackVerdict(code, code);
  assert.equal(v.state, 'hashMatch', 'identical readback is a match');
  assert.equal(v.ok, true);
  assert.equal(v.diagnosis, null, 'a match must not carry a diagnosis to log');
  assert.equal(embedHash(code), embedHash(code));
}

// pending: Webflow acknowledged the write but get_settings cannot see it yet. Re-running finishes
// the ship, so the message must say so — this cost three failed ships on 2026-08-09.
for (const absent of [undefined, null]) {
  const v = readbackVerdict(absent, code);
  assert.equal(v.state, 'pending', `readback of ${String(absent)} is a lag, not a conflict`);
  assert.equal(v.ok, false);
  assert.match(v.diagnosis, /re-run/, 'pending must tell the operator re-running is the fix');
  assert.doesNotMatch(v.diagnosis, /something else wrote/, 'pending must not accuse another writer');
  assert.equal(embedHash(absent), 'none');
}

// mismatch: someone else wrote after us. Re-running would paper over it, so the message must NOT
// suggest that — this is the case that catches a Designer edit landing on top of a paste.
{
  const theirs = code.replace('dasha-embed', 'someone-elses-embed') + '<a href="/graph">graph</a>';
  const v = readbackVerdict(theirs, code);
  assert.equal(v.state, 'mismatch');
  assert.equal(v.ok, false);
  assert.match(v.diagnosis, /something else wrote/, 'mismatch must name the real cause');
  assert.doesNotMatch(v.diagnosis, /re-run/, 'mismatch must NOT suggest re-running, which would overwrite their change unexamined');
  assert.match(v.diagnosis, new RegExp(String(theirs.length)), 'diagnosis reports what was found');
  assert.match(v.diagnosis, new RegExp(String(code.length)), 'diagnosis reports what was expected');
  assert.notEqual(embedHash(theirs), embedHash(code), 'differing embeds must not share a hash');
}

// An empty string is a real value someone wrote, not an absent readback. Treating it as pending
// would tell the operator to re-run into a cleared element.
{
  const v = readbackVerdict('', code);
  assert.equal(v.state, 'mismatch', 'empty string is a mismatch, not a lag');
  assert.match(v.diagnosis, /read back 0 bytes/);
}

// The wait in the message follows the real deadline rather than a hardcoded number.
assert.match(readbackVerdict(undefined, code, { waitedMs: 30_000 }).diagnosis, /30s/);

console.log(JSON.stringify({ ok: true, test: 'dasha-ship-readback', cases: ['hashMatch', 'pending', 'mismatch', 'empty', 'deadline'] }));
