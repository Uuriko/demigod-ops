#!/usr/bin/env node
// Adversarial tests for reduceSourceVerificationHistory — the decay-aware evidence store.
// Its whole value rests on one invariant: an ABSENCE observation must mean "we fetched the page
// successfully and the exact quote was not in it", never "the fetch failed". If a bot wall, a
// timeout or a 500 can manufacture absence, the store reports claims dying that never died.
// Every case below tries to produce a false absence, or to corrupt the observation interval.
import assert from 'node:assert/strict';
import {
  EVIDENCE_TEXT_HASH_VERSION,
  evidenceTextSha256,
  isStaleVerifiedClaim,
  isTextStableTransportFlaky,
  reduceSourceVerificationHistory,
} from './demigod-company-research-benchmark.mjs';

const T0 = '2026-07-29T09:00:00.000Z';
const T1 = '2026-07-29T10:00:00.000Z';
const T2 = '2026-07-29T11:00:00.000Z';
const T3 = '2026-07-29T12:00:00.000Z';
const T4 = '2026-07-29T13:00:00.000Z';
const base = { rowId: 'yc:acme', fieldName: 'productSummary', url: 'https://acme.example/about', quote: 'exact words on the page' };
const only = (store) => Object.values(store.claims)[0];
const reduce = (prev, checks, at) => reduceSourceVerificationHistory(prev, checks, at);

// A successful verification opens the interval.
const verified = reduce({}, [{ ...base, ok: true, status: 200, sha256: 'aaa' }], T1);
assert.equal(verified.counts.claims, 1);
assert.equal(only(verified).currentState, 'verified');
assert.equal(only(verified).firstVerifiedAt, T1);
assert.equal(only(verified).stoppedMatchingAt, null);

// --- THE CORE INVARIANT: transport failure must never read as absence --------------------
for (const [label, check] of Object.entries({
  networkError: { ok: false, error: 'ECONNRESET' },
  fallbackError: { ok: false, status: 200, fallbackError: 'firecrawl 402' },
  notFound: { ok: false, status: 404 },
  serverError: { ok: false, status: 500 },
  tunnelDown: { ok: false, status: 503 },
  zeroStatus: { ok: false, status: 0 },
  noStatus: { ok: false },
  nullStatus: { ok: false, status: null },
  nanStatus: { ok: false, status: 'not-a-number' },
  redirect: { ok: false, status: 301 },
  rateLimited: { ok: false, status: 429 },
})) {
  const after = reduce(verified, [{ ...base, ...check }], T2);
  const claim = only(after);
  assert.equal(claim.currentState, 'verified', `${label} must not change state to absent`);
  assert.equal(claim.stoppedMatchingAt, null, `${label} must not stamp stoppedMatchingAt`);
  assert.equal(claim.transportFailureCount, 1, `${label} must be counted as a transport failure`);
  assert.equal(claim.lastVerifiedAt, T1, `${label} must not touch the last-verified boundary`);
}

// String status must never coerce into a real 2xx absence (fail-closed transport path).
{
  const coerced = reduce(verified, [{ ...base, ok: false, status: '200' }], T2);
  assert.equal(only(coerced).currentState, 'verified', 'string 2xx must not stamp absence');
  assert.equal(only(coerced).stoppedMatchingAt, null);
  assert.equal(only(coerced).transportFailureCount, 1, 'string status counts as transport failure');
}

// --- a real absence: successful 2xx fetch, quote not found --------------------------------
const absent = reduce(verified, [{ ...base, ok: false, status: 200, sha256: 'bbb' }], T2);
assert.equal(only(absent).currentState, 'absent');
assert.equal(only(absent).stoppedMatchingAt, T2);
assert.equal(only(absent).lastVerifiedAt, T1, 'the interval is (lastVerifiedAt, stoppedMatchingAt]');
assert.equal(only(absent).transportFailureCount, 0, 'a real absence is not a transport failure');

// Absence is sticky within a run series: a second absence must not move the first observation.
const stillAbsent = reduce(absent, [{ ...base, ok: false, status: 200 }], T3);
assert.equal(only(stillAbsent).stoppedMatchingAt, T2, 'first-absence timestamp must not drift forward');

// Recovery reopens the claim but preserves the prior absence as history.
const recovered = reduce(absent, [{ ...base, ok: true, status: 200 }], T3);
assert.equal(only(recovered).currentState, 'verified');
assert.equal(only(recovered).stoppedMatchingAt, null);
assert.equal(only(recovered).lastStoppedMatchingAt, T2, 'a recovered claim must not forget it was absent');
assert.equal(only(recovered).firstVerifiedAt, T1, 'firstVerifiedAt is the origin, never rewritten');

// --- claim identity includes the quote, so editing the quote cannot inherit its history ---
{
  const edited = reduce(verified, [{ ...base, quote: 'completely different words', ok: true, status: 200 }], T2);
  // Live-set prune: only the current gold claim ids remain (URL/quote rotation must not leave
  // orphan staleVerified ghosts of the previous quote).
  assert.equal(edited.counts.claims, 1, 'retired quote ids are pruned from the live store');
  const fresh = only(edited);
  assert.notEqual(fresh.quoteSha256, only(verified).quoteSha256, 'a new quote is a new claim id');
  assert.equal(fresh.firstVerifiedAt, T2, 'the new claim starts its own interval');
}
// Orphan prior claims (the dead Yahoo URL after the gold rotated that row+field to pymnts) drop
// on the next live reduce — the ROTATED SLOT is what licenses the delete, not mere absence.
{
  const deadYahoo = {
    rowId: base.rowId,
    fieldName: base.fieldName,
    url: 'https://www.yahooinc.com/press/dead',
    quoteSha256: 'dead',
    currentState: 'verified',
    lastVerifiedAt: T1,
    lastTransportFailureAt: T2,
    transportFailureCount: 1,
  };
  const orphanPrev = { schema: 'demigod.company-research-source-history/2', claims: { deadYahoo } };
  const pruned = reduce(orphanPrev, [{ ...base, ok: true, status: 200, sha256: 'aaa' }], T3);
  assert.equal(pruned.counts.claims, 1);
  assert.ok(!('deadYahoo' in pruned.claims), 'a retired id whose slot is re-checked is dropped');
  assert.equal(pruned.counts.staleVerified, 0, 'pruned orphans cannot inflate staleVerified');

  // Poison-control for the rule above: same store, same run, but the retired claim belongs to a
  // row+field this run never checked. Pruning on "not in this run" deleted it too — so a gold
  // shrink (fields marked `unknown`) or any partial re-source silently erased untouched history
  // and reported staleVerified 0. That is the false green this store exists to prevent.
  const otherRow = { ...deadYahoo, rowId: 'wd:Q116626626' };
  const kept = reduce(
    { schema: 'demigod.company-research-source-history/2', claims: { otherRow } },
    [{ ...base, ok: true, status: 200, sha256: 'aaa' }],
    T3,
  );
  assert.equal(kept.counts.claims, 2, 'an unchecked slot keeps its claim; a narrower run is not a delete');
  assert.ok('otherRow' in kept.claims, 'history for a row this run never touched must survive');
  assert.equal(kept.counts.staleVerified, 1, 'and its latent staleness stays visible, not zeroed');
}

// --- a BROKEN gold slot is marked, never pruned -------------------------------------------
// A check that names a real row+field but cannot mint an id (unsafe URL, empty quote) means the
// gold is broken there. Letting that license the rotation-delete deleted the claim outright, which
// (a) zeroed staleVerified — the false green this store exists to surface — and (b) let a
// break-then-repair round trip launder firstVerifiedAt and transportFailureCount back to clean,
// ending on a fully green run. Marking keeps the evidence AND makes the break loud.
{
  // A long-lived claim carrying a real latent-staleness signal.
  const stale = reduce(reduce({}, [{ ...base, ok: true, status: 200 }], T1),
    [{ ...base, ok: false, status: 503 }], T2);
  assert.equal(stale.counts.staleVerified, 1, 'setup: the claim is verified-but-latently-stale');
  assert.equal(only(stale).transportFailureCount, 1);

  for (const [label, broken] of Object.entries({
    unsafeUrl: { ...base, url: 'http://127.0.0.1/about', ok: false, error: 'unsafe_url' },
    emptyQuote: { ...base, quote: '', ok: false, error: 'unsafe_url' },
    whitespaceQuote: { ...base, quote: '   ', ok: false, error: 'unsafe_url' },
  })) {
    const after = reduce(stale, [broken], T3);
    assert.equal(after.counts.claims, 1, `${label}: a broken gold slot must not delete its claim`);
    assert.equal(after.counts.staleVerified, 1, `${label}: staleVerified must not be zeroed by deletion`);
    assert.equal(only(after).firstVerifiedAt, T1, `${label}: the origin survives a broken gold`);
    assert.equal(only(after).transportFailureCount, 2, `${label}: and the break is counted, not silent`);
  }

  // The laundering round trip: break the gold, run, repair to the IDENTICAL url+quote, run.
  const repaired = reduce(reduce(stale, [{ ...base, url: 'http://127.0.0.1/about', ok: false, error: 'unsafe_url' }], T3),
    [{ ...base, ok: true, status: 200 }], T4);
  assert.equal(only(repaired).firstVerifiedAt, T1, 'a break/repair round trip must not reset the origin');
  assert.equal(only(repaired).transportFailureCount, 2, 'nor wipe the accumulated failure count');

  // Non-vacuity control 1: a real rotation to a DIFFERENT valid url still prunes the retired id,
  // so the marking path did not just disable the prune.
  const rotated = reduce(stale, [{ ...base, url: 'https://acme.example/new-about', ok: true, status: 200 }], T3);
  assert.equal(rotated.counts.claims, 1, 'a genuine url rotation still retires the old claim id');
  assert.equal(only(rotated).firstVerifiedAt, T3, 'and the rotated claim starts its own interval');

  // Non-vacuity control 2: an unmintable check naming an UNKNOWN field must touch nothing at all —
  // otherwise any junk row could inflate transport failures on a healthy claim.
  const junk = reduce(stale, [{ ...base, fieldName: 'secretSignal', url: null, ok: false }], T3);
  assert.equal(only(junk).transportFailureCount, 1, 'an unknown field name marks nothing');
  assert.equal(junk.counts.claims, 1);
}

// Whitespace-only differences are the SAME claim — normalisation must happen before hashing.
{
  const respaced = reduce(verified, [{ ...base, quote: '  exact   words on the page ', ok: true, status: 200 }], T2);
  assert.equal(respaced.counts.claims, 1, 're-spacing a quote must not fork the claim');
  assert.equal(only(respaced).firstVerifiedAt, T1);
}

// --- a store written by an older schema must not be trusted ------------------------------
{
  const v1 = { schema: 'demigod.company-research-source-history/1', claims: { poisoned: { rowId: 'x', currentState: 'verified' } } };
  const after = reduce(v1, [{ ...base, ok: true, status: 200 }], T1);
  assert.equal(after.counts.claims, 1, 'a foreign schema is discarded, not merged');
  assert.ok(!('poisoned' in after.claims));
  assert.equal(reduce(undefined, [], T1).counts.claims, 0, 'no previous store is not a crash');
  assert.equal(reduce({ claims: { x: {} } }, [], T1).counts.claims, 0, 'a store with no schema is discarded');
}

// --- a corrupt PRIOR store must not carry junk claims forward ------------------------------
// counts.claims is the number quoted as evidence ("142 claims, 0 absent"), and the state buckets are
// computed from Object.values(claims) — so a string/array/number claim value inflated the count and
// landed in a state bucket. Found 2026-07-30, sixth instance of the malformed-input class.
{
  const good = { rowId: base.rowId, fieldName: base.fieldName, url: base.url, quoteSha256: 'q', currentState: 'verified' };
  for (const [label, junk] of Object.entries({ str: 'corrupt', arr: ['a', 'b'], num: 42, bool: true, nul: null })) {
    const prev = { schema: 'demigod.company-research-source-history/2', claims: { junkKey: junk } };
    const after = reduce(prev, [{ ...base, ok: true, status: 200 }], T1);
    assert.equal(after.counts.claims, 1, `${label}: a junk claim must not be counted`);
    assert.ok(!('junkKey' in after.claims), `${label}: and must not be carried forward`);
  }
  // A valid prior that matches the live claim id survives; hand-keyed junk keys are dropped.
  const liveId = Object.keys(verified.claims)[0];
  const mixed = reduce(
    {
      schema: 'demigod.company-research-source-history/2',
      claims: { [liveId]: only(verified), bad: 'nope', orphan: good },
    },
    [{ ...base, ok: true, status: 200, sha256: 'aaa' }],
    T2,
  );
  assert.equal(mixed.counts.claims, 1, 'live claim survives; orphan keys prune');
  assert.ok(liveId in mixed.claims && !('bad' in mixed.claims) && !('orphan' in mixed.claims));
  // And the buckets still partition exactly, with no junk in any state.
  const c = mixed.counts;
  assert.equal(c.verified + c.absent + c.unknown, c.claims, 'buckets partition the claim count');
}

// --- malformed checks are skipped entirely, never half-recorded ---------------------------
for (const [label, check] of Object.entries({
  noRowId: { ...base, rowId: '   ' },
  hugeRowId: { ...base, rowId: 'x'.repeat(201) },
  unknownField: { ...base, fieldName: 'notAField' },
  emptyQuote: { ...base, quote: '   ' },
  ssrfUrl: { ...base, url: 'http://127.0.0.1/admin' },
  metadataUrl: { ...base, url: 'http://169.254.169.254/' },
  noUrl: { ...base, url: null },
})) {
  const after = reduce({}, [{ ...check, ok: true, status: 200 }], T1);
  assert.equal(after.counts.claims, 0, `${label} must not create a claim`);
}

// Rejected claim ids that still name a real row+field must MARK the slot. The concern is real: gold
// that rotates a verified field onto an unsafe URL / empty quote fails the run (ok:false), and if
// the history ignores the slot entirely the prior claim keeps advertising itself as cleanly verified
// — overstating coverage after a red seal. The property is "no longer clean", not "gone": deleting
// the claim zeroes staleVerified and lets a break/repair round trip launder the record (see the
// broken-gold block above). Marking satisfies the concern without destroying evidence.
{
  for (const [label, broken] of Object.entries({
    emptyQuote: { ...base, quote: '   ', ok: false },
    ssrfUrl: { ...base, url: 'http://127.0.0.1/admin', ok: false, error: 'unsafe_url' },
    noUrl: { ...base, url: null, ok: false, error: 'unsafe_url' },
  })) {
    const after = reduce(verified, [broken], T2);
    assert.equal(after.counts.claims, 1, `${label}: broken gold must not delete the slot's evidence`);
    assert.equal(only(after).transportFailureCount, 1, `${label}: the break is recorded as a failed attempt`);
    assert.equal(only(after).lastTransportFailureAt, T2, `${label}: stamped at this run`);
    assert.equal(after.counts.staleVerified, 1, `${label}: so the slot reads verified-but-stale, not clean`);
  }
  // unknownField / blank rowId must NOT prune — they are not real live slots.
  const keepUnknown = reduce(verified, [{ ...base, fieldName: 'notAField', ok: false }], T2);
  assert.equal(keepUnknown.counts.claims, 1, 'unknown field name must not license a prune');
  assert.equal(only(keepUnknown).currentState, 'verified');
  const keepBlank = reduce(verified, [{ ...base, rowId: '  ', ok: false }], T2);
  assert.equal(keepBlank.counts.claims, 1, 'blank rowId must not license a prune');
}

// --- 3.7 page-churn counter: it must count real changes and nothing else -----------------
{
  // First observation is NOT a change — there is nothing to differ from.
  const first = reduce({}, [{ ...base, ok: true, status: 200, sha256: 'aaa' }], T1);
  assert.equal(only(first).sha256ChangeCount, 0, 'a first sighting is not a change');
  assert.equal(only(first).lastSha256ChangedAt, null);

  // A genuinely different hash on a successful fetch counts once and stamps the time.
  const changed = reduce(first, [{ ...base, ok: true, status: 200, sha256: 'bbb' }], T2);
  assert.equal(only(changed).sha256ChangeCount, 1);
  assert.equal(only(changed).lastSha256ChangedAt, T2);
  assert.equal(only(changed).lastSha256, 'bbb', 'the stored hash advances');

  // The same hash again is not another change, and must not restamp.
  const same = reduce(changed, [{ ...base, ok: true, status: 200, sha256: 'bbb' }], T3);
  assert.equal(only(same).sha256ChangeCount, 1, 'an unchanged page must not inflate the counter');
  assert.equal(only(same).lastSha256ChangedAt, T2, 'and must not move the last-changed time');

  // A page that changed AND lost the quote is the most interesting case — count it.
  const churnedToAbsent = reduce(first, [{ ...base, ok: false, status: 200, sha256: 'ccc' }], T2);
  assert.equal(only(churnedToAbsent).sha256ChangeCount, 1, 'change-then-absent must still count');
  assert.equal(only(churnedToAbsent).currentState, 'absent');

  // A transport failure never reaches the counter, even if it carries a hash.
  const failed = reduce(first, [{ ...base, ok: false, status: 503, sha256: 'ddd' }], T2);
  assert.equal(only(failed).sha256ChangeCount, 0, 'a failed fetch cannot report page churn');
  assert.equal(only(failed).lastSha256, 'aaa', 'and must not overwrite the last known hash');

  // A successful fetch with no hash at all must neither count nor erase what we knew.
  const noHash = reduce(first, [{ ...base, ok: true, status: 200 }], T2);
  assert.equal(only(noHash).sha256ChangeCount, 0, 'a missing hash is not a change');
  assert.equal(only(noHash).lastSha256, 'aaa', 'and must not clear the stored hash');

  // Counting accumulates across runs rather than resetting.
  let acc = first;
  for (const [i, at] of [[1, T2], [2, T3]]) {
    acc = reduce(acc, [{ ...base, ok: true, status: 200, sha256: `h${i}` }], at);
    assert.equal(only(acc).sha256ChangeCount, i, `change ${i} accumulates`);
  }
}

// --- the two hashes must move INDEPENDENTLY: that separation is the whole point -----------
{
  const seed = reduce({}, [{ ...base, ok: true, status: 200, sha256: 'body1', textSha256: 'text1' }], T1);
  assert.equal(only(seed).sha256ChangeCount, 0);
  assert.equal(only(seed).textSha256ChangeCount, 0);

  // The measured real-world case: body churns on a nonce, evidence text is identical.
  const nonceOnly = reduce(seed, [{ ...base, ok: true, status: 200, sha256: 'body2', textSha256: 'text1' }], T2);
  assert.equal(only(nonceOnly).sha256ChangeCount, 1, 'body hash moved');
  assert.equal(only(nonceOnly).textSha256ChangeCount, 0, 'evidence did NOT move — this is the signal that matters');
  assert.equal(only(nonceOnly).lastTextSha256ChangedAt, null);

  // A real content edit moves both.
  const realEdit = reduce(nonceOnly, [{ ...base, ok: true, status: 200, sha256: 'body3', textSha256: 'text2' }], T3);
  assert.equal(only(realEdit).sha256ChangeCount, 2);
  assert.equal(only(realEdit).textSha256ChangeCount, 1, 'a genuine text change is counted once');
  assert.equal(only(realEdit).lastTextSha256ChangedAt, T3);

  // A transport failure moves neither, and erases neither.
  const failed = reduce(realEdit, [{ ...base, ok: false, status: 503, sha256: 'x', textSha256: 'y' }], T3);
  assert.equal(only(failed).sha256ChangeCount, 2, 'failed fetch cannot report body churn');
  assert.equal(only(failed).textSha256ChangeCount, 1, 'failed fetch cannot report evidence churn');
  assert.equal(only(failed).lastTextSha256, 'text2', 'and must not clear the last known text hash');

  // A missing text hash (empty page, extraction failure) counts as unknown, not as a change.
  const noText = reduce(realEdit, [{ ...base, ok: true, status: 200, sha256: 'body4', textSha256: null }], T3);
  assert.equal(noText && only(noText).textSha256ChangeCount, 1, 'absent text hash is not a change');
  assert.equal(only(noText).lastTextSha256, 'text2', 'and must not clear what we knew');

  // A fallback-verified claim must hash the fallback, not a changing HTTP bot wall.
  assert.equal(
    evidenceTextSha256(base.quote, 'bot nonce 1', `fallback ${base.quote}`),
    evidenceTextSha256(base.quote, 'bot nonce 2', `fallback ${base.quote}`),
  );
  assert.notEqual(
    evidenceTextSha256(base.quote, '', `fallback ${base.quote}`),
    evidenceTextSha256(base.quote, '', `changed fallback ${base.quote}`),
  );

  const stableBefore = 'stable before '.repeat(30);
  const stableAfter = ' stable after'.repeat(30);
  const farNoise = (value) =>
    `${value.repeat(400)} ${stableBefore}${base.quote}${stableAfter} ${value.repeat(400)}`;
  assert.equal(
    evidenceTextSha256(base.quote, farNoise('a')),
    evidenceTextSha256(base.quote, farNoise('b')),
    'page-wide noise outside the quote window is ignored',
  );
  assert.notEqual(
    evidenceTextSha256(base.quote, `prefix ${base.quote} stable qualification`),
    evidenceTextSha256(base.quote, `prefix ${base.quote} changed qualification`),
    'nearby evidence context still changes the hash',
  );

  const legacyHash = reduce({}, [{
    ...base, ok: true, status: 200, textSha256: 'whole-page-hash',
  }], T1);
  const migrated = reduce(legacyHash, [{
    ...base,
    ok: true,
    status: 200,
    textSha256: 'quote-window-hash',
    textHashVersion: EVIDENCE_TEXT_HASH_VERSION,
  }], T2);
  assert.equal(only(migrated).textSha256ChangeCount, 0, 'hash migration establishes a baseline');
  assert.equal(only(migrated).lastTextHashVersion, EVIDENCE_TEXT_HASH_VERSION);
  const movedAfterMigration = reduce(migrated, [{
    ...base,
    ok: true,
    status: 200,
    textSha256: 'changed-quote-window-hash',
    textHashVersion: EVIDENCE_TEXT_HASH_VERSION,
  }], T3);
  assert.equal(only(movedAfterMigration).textSha256ChangeCount, 1, 'later scoped change still counts');
}

// --- a pre-existing claim must gain real counters, not keep `undefined` -------------------
// "never compared" and "compared and stable" are different facts, and the 3.8 population query
// coerces undefined to 0, so an unbackfilled counter silently reads as confirmed-stable.
{
  const legacy = {
    schema: 'demigod.company-research-source-history/2',
    claims: {
      // A claim shaped the way the store looked before the churn counters existed.
      old: {
        rowId: base.rowId, fieldName: base.fieldName, url: base.url,
        quoteSha256: 'unused', firstVerifiedAt: T0, lastVerifiedAt: T0,
        stoppedMatchingAt: null, lastStoppedMatchingAt: null,
        currentState: 'verified', transportFailureCount: 1,
      },
    },
  };
  const after = reduce(legacy, [{ ...base, ok: true, status: 200, sha256: 'a', textSha256: 't' }], T1);
  const claim = Object.values(after.claims).find((c) => c.fieldName === base.fieldName && c.lastTextSha256 === 't');
  assert.equal(typeof claim.sha256ChangeCount, 'number', 'body counter must be a number, not undefined');
  assert.equal(typeof claim.textSha256ChangeCount, 'number', 'text counter must be a number, not undefined');
  assert.equal(claim.sha256ChangeCount, 0);
  assert.equal(claim.textSha256ChangeCount, 0);
}

// --- counts must describe the store, not the batch ----------------------------------------
{
  const two = reduce({}, [
    { ...base, ok: true, status: 200 },
    { ...base, rowId: 'yc:beta', ok: false, status: 200 },
  ], T1);
  assert.equal(two.counts.claims, 2);
  assert.equal(two.counts.verified, 1);
  assert.equal(two.counts.absent, 1);
  assert.ok(Object.hasOwn(two.counts, 'staleVerified'), 'counts must expose staleVerified');
  assert.ok(Object.hasOwn(two.counts, 'textStableFlaky'), 'counts must expose textStableFlaky');
  assert.equal(two.counts.verified + two.counts.absent + two.counts.unknown, two.counts.claims,
    'every claim must land in exactly one state bucket');
}

// --- an empty batch must not silently zero a populated store ------------------------------
{
  const untouched = reduce(verified, [], T3);
  assert.equal(untouched.counts.claims, 1, 'a run that checked nothing must not erase history');
  assert.equal(only(untouched).currentState, 'verified');
  assert.equal(only(untouched).lastVerifiedAt, T1, 'and must not restamp what it did not check');
}

// --- §3.8 diagnostic: transport failure after success leaves verified but staleVerified=1 ---
{
  assert.equal(verified.counts.staleVerified, 0, 'fresh verification is not stale');
  assert.equal(isStaleVerifiedClaim(only(verified)), false);
  const failed = reduce(verified, [{ ...base, ok: false, error: 'ECONNRESET' }], T2);
  assert.equal(only(failed).currentState, 'verified', 'failure must not demote state');
  assert.equal(only(failed).lastVerifiedAt, T1);
  assert.equal(only(failed).lastTransportFailureAt, T2);
  assert.equal(failed.counts.staleVerified, 1, 'persistent failure after success must surface');
  assert.equal(isStaleVerifiedClaim(only(failed)), true);
  // Recovery clears the diagnostic without inventing a third product state.
  const recovered = reduce(failed, [{ ...base, ok: true, status: 200, sha256: 'bbb' }], T3);
  assert.equal(recovered.counts.staleVerified, 0, 'success after failure clears staleVerified');
  assert.equal(isStaleVerifiedClaim(only(recovered)), false);
  assert.equal(only(recovered).lastVerifiedAt, T3);
}

// lastVerifiedAt is monotonic — a clock-skewed/replayed ok must not widen the interval.
{
  const back = reduce(verified, [{ ...base, ok: true, status: 200, sha256: 'zzz' }], '2026-07-01T00:00:00.000Z');
  assert.equal(only(back).lastVerifiedAt, T1, 'lastVerifiedAt must not move backwards');
  assert.equal(only(back).firstVerifiedAt, T1);
}

// §3.8 population: text-stable + transport-flaky (not a product state — count only).
{
  const seeded = reduce({}, [{ ...base, ok: true, status: 200, sha256: 'b1', textSha256: 't1' }], T1);
  assert.equal(seeded.counts.textStableFlaky, 0);
  const flaky = reduce(seeded, [{ ...base, ok: false, error: 'ECONNRESET' }], T2);
  assert.equal(flaky.counts.textStableFlaky, 1);
  assert.equal(isTextStableTransportFlaky(only(flaky)), true);
  const textMoved = reduce(flaky, [{ ...base, ok: true, status: 200, sha256: 'b2', textSha256: 't2' }], T3);
  assert.equal(textMoved.counts.textStableFlaky, 0, 'text churn exits the population');
}

// --- lastVerifiedAt is monotonic (Claude §3.8 F1) — older replay must not regress ---
{
  const olderOk = reduce(verified, [{ ...base, ok: true, status: 200, sha256: 'zzz' }], T0);
  assert.equal(
    only(olderOk).lastVerifiedAt,
    T1,
    'replaying an older success at must not move lastVerifiedAt backwards',
  );
  assert.equal(only(olderOk).firstVerifiedAt, T1);
}

console.log('source-history poison: all cases PASS');
