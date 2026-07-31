/**
 * Enrich transport honesty: cooldown on Firecrawl fail without burning attempt budget.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applyEnrichAttemptStamp,
  enrichRecentlyAttempted,
  enrichAttemptsExhausted,
  enrichUrlPriority,
  ENRICH_COOLDOWN_MS,
  fcScrape,
  lastFcScrapeError,
  mergeLeadState,
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

test('re-collection preserves enrichment transport evidence', () => {
  const merged = mergeLeadState(
    { id: 'z', state: 'policy_hold' },
    {
      id: 'z',
      state: 'policy_hold',
      enrichAttemptedAt: '2026-07-24T05:00:00.000Z',
      lastTransportFailedAt: '2026-07-24T05:00:00.000Z',
      lastTransportError: 'firecrawl_insufficient_credits',
    },
  );
  assert.equal(merged.lastTransportFailedAt, '2026-07-24T05:00:00.000Z');
  assert.equal(merged.lastTransportError, 'firecrawl_insufficient_credits');
});

test('unsafe provider lookalikes never invoke Firecrawl', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-enrich-url-'));
  const firecrawl = path.join(dir, 'firecrawl');
  const calls = path.join(dir, 'calls');
  fs.writeFileSync(
    firecrawl,
    '#!/bin/sh\nprintf \'%s\\n\' "$2" >> "$DG_TEST_FIRECRAWL_CALLS"\nprintf \'public provider page\' > "$4"\n',
    { mode: 0o700 },
  );
  const priorPath = process.env.PATH;
  const priorCalls = process.env.DG_TEST_FIRECRAWL_CALLS;
  process.env.PATH = `${dir}:${priorPath || ''}`;
  process.env.DG_TEST_FIRECRAWL_CALLS = calls;
  t.after(() => {
    if (priorPath === undefined) delete process.env.PATH;
    else process.env.PATH = priorPath;
    if (priorCalls === undefined) delete process.env.DG_TEST_FIRECRAWL_CALLS;
    else process.env.DG_TEST_FIRECRAWL_CALLS = priorCalls;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const unsafe = [
    'http://localhost/jobs.ashbyhq.com/private',
    'http://10.0.0.1/jobs.ashbyhq.com/private',
  ];
  for (const url of unsafe) {
    assert.equal(enrichUrlPriority(url), 3);
    assert.equal(fcScrape(url), null);
    assert.equal(lastFcScrapeError, 'unsafe_url');
  }
  assert.equal(fs.existsSync(calls), false);
  assert.equal(enrichUrlPriority('https://example.com/jobs.ashbyhq.com/acme/1'), 1);
  assert.equal(enrichUrlPriority('https://jobs.ashbyhq.com/acme/1'), 0);
  assert.equal(fcScrape('https://jobs.ashbyhq.com/acme/1'), 'public provider page');
  assert.equal(fs.readFileSync(calls, 'utf8').trim(), 'https://jobs.ashbyhq.com/acme/1');
});
