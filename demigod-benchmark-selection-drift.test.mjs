#!/usr/bin/env node
// The frozen 30-row gold set is validated against a selection RECOMPUTED from a mutable map, so a
// legitimate map refresh can evict a row and turn the benchmark red with only
// "ids/order do not match deterministic selection" to go on. That string cannot distinguish
// "the map moved" from "someone hand-picked the 30" — which is the thing the check exists to
// prevent. This locks the drift description that tells them apart.
import assert from 'node:assert/strict';
import { describeSelectionDrift } from './demigod-company-research-benchmark.mjs';

const map = {
  companies: [
    { id: 'wd:Q15646906', name: 'Kabam', source: 'Wikidata' },
    { id: 'wd:Q18636520', name: 'Dolls Kill', source: 'Wikidata', atsSource: 'Lever' },
    { id: 'yc:a', name: 'Alpha', source: 'Y Combinator', atsSource: 'Ashby' },
  ],
};

// The real incident: one row lost its ATS marker, another took the slot.
const drift = describeSelectionDrift(['wd:Q15646906', 'yc:a'], ['wd:Q18636520', 'yc:a'], map);
assert.deepEqual(drift.evicted, ['wd:Q15646906 Kabam (atsSource=none, source=Wikidata)']);
assert.deepEqual(drift.admitted, ['wd:Q18636520 Dolls Kill (atsSource=Lever, source=Wikidata)']);
assert.equal(drift.reorderedOnly, false);
// The stratum field that moved has to be visible — that is the whole diagnostic value.
assert.match(drift.evicted[0], /atsSource=none/);
assert.match(drift.admitted[0], /atsSource=Lever/);

// Same membership, different order is a materially different failure and must say so, because
// it means the selector's tie-breaking changed rather than the underlying data.
const reorder = describeSelectionDrift(['yc:a', 'wd:Q18636520'], ['wd:Q18636520', 'yc:a'], map);
assert.equal(reorder.reorderedOnly, true);
assert.deepEqual(reorder.evicted, []);
assert.deepEqual(reorder.admitted, []);

// A gold row that vanished from the map entirely must not be reported as an unexplained id.
const gone = describeSelectionDrift(['wd:Q999'], ['yc:a'], map);
assert.deepEqual(gone.evicted, ['wd:Q999 (absent from map)']);

// No drift at all: identical ids in identical order.
const same = describeSelectionDrift(['yc:a'], ['yc:a'], map);
assert.deepEqual(same.evicted, []);
assert.deepEqual(same.admitted, []);
assert.equal(same.reorderedOnly, true, 'identical lists trivially share membership');

// Empty inputs must not crash or invent drift.
const empty = describeSelectionDrift([], [], {});
assert.deepEqual(empty.evicted, []);
assert.deepEqual(empty.admitted, []);

console.log('benchmark selection drift: 14/14 PASS');
