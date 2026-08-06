/**
 * Social meta dedupe — drives real helpers in demigod-social-meta-dedupe.mjs
 * (same scoring as head script id=dg-meta-dedupe).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scoreSocialMetaContent,
  pickSocialMetaWinner,
  planSocialMetaDedupe,
} from './demigod-social-meta-dedupe.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const head = fs.readFileSync(path.join(root, 'demigod-head-minimal.html'), 'utf8');

const WEBFLOW_SHORT =
  'Tech ranks fit. Humans review. Mutual intro only. SF startups and talent.';
const HEAD_LONG =
  'SF startup talent matching: one role, one concrete first result, human review, and mutual yes. 10% of first-year base salary on hire. Talent free.';

test('honest long copy outranks short Webflow og:description', () => {
  assert.ok(scoreSocialMetaContent(HEAD_LONG) > scoreSocialMetaContent(WEBFLOW_SHORT));
  assert.equal(pickSocialMetaWinner([WEBFLOW_SHORT, HEAD_LONG]), 1);
  assert.equal(pickSocialMetaWinner([HEAD_LONG, WEBFLOW_SHORT]), 0);
});

test('plan drops losers and keeps one og:description', () => {
  const items = [
    { key: 'property:og:description', content: WEBFLOW_SHORT },
    { key: 'property:og:description', content: HEAD_LONG },
    { key: 'name:description', content: 'Demigod ranks fit with tech, reviews with people, introduces only with mutual interest. 10% on hire. Free for talent. potter@trydemigod.com' },
  ];
  const plan = planSocialMetaDedupe(items);
  assert.deepEqual(plan.drop.sort(), [0]);
  assert.ok(plan.keep.includes(1));
  assert.ok(plan.keep.includes(2));
});

test('head paste ships dg-meta-dedupe with mutual-yes scoring', () => {
  assert.match(head, /id="dg-meta-dedupe"/);
  assert.match(head, /mutual yes/i);
  assert.match(head, /tech ranks fit/i);
  assert.match(head, /demigod-social-meta-dedupe\.mjs/);
});
