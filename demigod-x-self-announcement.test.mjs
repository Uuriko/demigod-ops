#!/usr/bin/env node
// Guard: someone announcing their OWN new job is not a company hiring.
//
// HIRING_RE treats "founding engineer" and "first engineer" as triggers, because those titles are
// how early startup roles are usually described. That let through posts where the author had just
// TAKEN such a role — the title matched, an SF mention matched, and SEEKING_RE did not help
// because the author is not seeking, they already landed. Surfaced the moment `--review` made the
// staging file readable; invisible while it sat as JSON in /tmp.
//
// The precision fix must not cost recall. "joined" and "excited to announce" appear in real
// company posts too, so an announcement is only rejected when NO explicit demand phrase is
// present. Every fixture below is SYNTHESIZED — the real staged rows are posts by real people and
// do not belong in a committed test, and a fixture pinned to one person's phrasing would test that
// phrasing rather than the rule.
//
//   node --test demigod-x-self-announcement.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSelfAnnouncement, classifyPost } from './demigod-x-hiring.mjs';

const post = (text) => ({
  text,
  handle: 'example_handle',
  url: 'https://x.com/example_handle/status/1234567890123456789',
  postedAt: new Date().toISOString(),
});

test('a personal move is not a hiring signal', () => {
  for (const text of [
    "After nine years at a big company I've joined a startup as founding engineer. San Francisco.",
    "I'm joining an early team as their first engineer next month — moving to SF.",
    "Starting at a seed-stage company in San Francisco as founding engineer today.",
    "My new role: founding engineer at a Bay Area startup.",
    'Thrilled to be joining as first engineer. San Francisco based.',
  ]) {
    assert.equal(isSelfAnnouncement(text), true, `should read as a personal announcement: ${text.slice(0, 48)}`);
    assert.equal(classifyPost(post(text)), null, 'a personal announcement must not be staged as a lead');
  }
});

test('a real company hiring post still passes — recall is not sacrificed', () => {
  for (const text of [
    "We're hiring a founding engineer in San Francisco. DM me.",
    'Now hiring our first engineer — Bay Area, onsite.',
    'Join our team in SF, looking to hire a founding engineer.',
  ]) {
    assert.equal(isSelfAnnouncement(text), false, `must not be filtered: ${text.slice(0, 48)}`);
    assert.ok(classifyPost(post(text)), 'a genuine hiring post must still be staged');
  }
});

test('the blocklist trap: announcement words inside a real hiring post', () => {
  // A naive "joined"/"excited to announce" blocklist silently drops these, and a dropped lead is
  // invisible — nobody notices the post that never appeared.
  const mixed = [
    "Excited to announce we're hiring a founding engineer in San Francisco!",
    "I joined this company last year and now we're hiring our first engineer — SF.",
    "Thrilled to be joining forces with a new investor. We are hiring in the Bay Area.",
  ];
  for (const text of mixed) {
    assert.equal(isSelfAnnouncement(text), false, `explicit demand must win over announcement words: ${text.slice(0, 48)}`);
    assert.ok(classifyPost(post(text)), 'must survive to staging');
  }
});

test('ambiguity is kept for the human, not discarded', () => {
  // No first-person announcement and no explicit demand — just a title and a location. This is
  // exactly the case a human should see, so it must survive with needsReview set.
  const row = classifyPost(post('Founding engineer opportunity in San Francisco.'));
  assert.ok(row, 'ambiguous rows are kept — dropping is worse than surfacing in a triage queue');
  assert.equal(row.needsReview, true, 'and must be flagged for a human');
});

test('smart quotes are handled — X renders apostrophes as U+2019', () => {
  // /we'?re hiring/ with a straight apostrophe silently failed on every smart-quoted post. Real
  // hiring posts were dropped with no trace, and a lead that never appears is never missed by
  // anyone. Found only because the self-announcement filter removed zero rows from real staging.
  const curlyHiring = 'We\u2019re hiring a founding engineer in San Francisco';
  const curlyJoined = 'I\u2019ve joined a startup as founding engineer in San Francisco';
  assert.ok(classifyPost(post(curlyHiring)), 'a curly-quoted hiring post must be staged, not dropped');
  assert.equal(isSelfAnnouncement(curlyJoined), true, 'a curly-quoted personal announcement must be caught');
  assert.equal(classifyPost(post(curlyJoined)), null, 'and must not reach staging');
  // Straight quotes must keep working — the fix is a widening, not a swap.
  assert.ok(classifyPost(post("We're hiring a founding engineer in San Francisco")), 'straight quotes still staged');
  assert.equal(isSelfAnnouncement("I've joined a startup as founding engineer in SF"), true, 'straight quotes still caught');
});

test('the filter cannot fire on empty or missing text', () => {
  for (const v of ['', null, undefined]) {
    assert.equal(isSelfAnnouncement(v), false, 'empty input must not read as an announcement');
  }
});
