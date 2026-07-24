/**
 * Enrich transport honesty: cooldown on Firecrawl fail without burning attempt budget.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEnrichAttemptStamp,
  enrichRecentlyAttempted,
  enrichAttemptsExhausted,
  ENRICH_COOLDOWN_MS,
} from './demigod-lead-collect.mjs';

test('transport fail stamps cooldown but not attempt count', () => {
  const lead = { id: 'x', enrichAttemptCount: 0 };
  const at = '2026-07-24T05:00:00.000Z';
  applyEnrichAttemptStamp(lead, {
    scrapeCompleted: false,
    transportFailed: true,
    at,
    transportError: 'firecrawl_insufficient_credits',
  });
  assert.equal(lead.enrichAttemptedAt, at);
  assert.equal(lead.lastTransportFailedAt, at);
  assert.equal(lead.lastTransportError, 'firecrawl_insufficient_credits');
  assert.equal(lead.enrichAttemptCount, 0);
  assert.equal(enrichAttemptsExhausted(lead), false);
  assert.equal(
    enrichRecentlyAttempted(lead, { now: Date.parse(at) + 1000, cooldownMs: ENRICH_COOLDOWN_MS }),
    true,
  );
});

test('successful scrape burns attempt budget', () => {
  const lead = { id: 'y', enrichAttemptCount: 2 };
  applyEnrichAttemptStamp(lead, {
    scrapeCompleted: true,
    transportFailed: false,
    at: '2026-07-24T05:00:00.000Z',
  });
  assert.equal(lead.enrichAttemptCount, 3);
  assert.equal(enrichAttemptsExhausted(lead), true);
});
