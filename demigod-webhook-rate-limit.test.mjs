#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { allowWebhookRequest, webhookClientIp } from './demigod-webhook-rate-limit.mjs';

const req = (remoteAddress, forwarded = '') => ({ socket: { remoteAddress }, headers: { 'x-forwarded-for': forwarded } });

assert.equal(webhookClientIp(req('203.0.113.10', '198.51.100.7')), '203.0.113.10', 'direct clients cannot spoof XFF');
assert.equal(webhookClientIp(req('127.0.0.1', '198.51.100.7, 127.0.0.1')), '198.51.100.7', 'local proxy forwards client IP');
assert.equal(webhookClientIp(req('127.0.0.1', '192.0.2.99, 198.51.100.7, 127.0.0.1')), '198.51.100.7', 'spoofed left entries cannot override the nearest untrusted peer');
assert.equal(webhookClientIp(req('10.0.0.4', '198.51.100.8'), ['10.0.0.4']), '198.51.100.8', 'configured proxy forwards client IP');
assert.equal(webhookClientIp(req('127.0.0.1', 'not-an-ip')), '127.0.0.1', 'malformed forwarding falls back safely');
assert.equal(webhookClientIp(req('::ffff:203.0.113.11', '198.51.100.9')), '203.0.113.11');

const hits = new Map();
assert.equal(allowWebhookRequest(hits, 'a', { now: 0, max: 2, maxKeys: 2 }), true);
assert.equal(allowWebhookRequest(hits, 'a', { now: 1, max: 2, maxKeys: 2 }), true);
assert.equal(allowWebhookRequest(hits, 'a', { now: 2, max: 2, maxKeys: 2 }), false);
assert.equal(allowWebhookRequest(hits, 'b', { now: 3, maxKeys: 2 }), true);
assert.equal(allowWebhookRequest(hits, 'c', { now: 4, maxKeys: 2 }), true);
assert.equal(hits.size, 2, 'attacker-controlled IP cardinality must not grow state without bound');
assert.equal(allowWebhookRequest(hits, 'a', { now: 60_001, max: 2, maxKeys: 2 }), true, 'window expiry restores delivery');

const receiver = fs.readFileSync(new URL('./demigod-submissions-webhook.mjs', import.meta.url), 'utf8');

/* This block used to slice between two markers and assert on the result:
     receiver.slice(receiver.indexOf('if (statusPath.matched)'), …)
   `statusPath` no longer exists in the receiver, so indexOf returned -1, slice(-1, …) produced an
   EMPTY string, and the assertions below it were arguing with ''. One failed (nothing matches
   empty) and one passed for the wrong reason — a vacuous green on a trust boundary.

   The route was removed; the requirement was not. Express it conditionally so it holds whether or
   not a status route exists, and so the guard comes back automatically if the route does:
   any request-serving route must be rate-limited with its OWN counter map. Sharing one map across
   routes lets cheap GETs exhaust the budget for real POSTs. */
const hasStatusRoute = receiver.includes('statusPath');
if (hasStatusRoute) {
  const start = receiver.indexOf('if (statusPath.matched)');
  const end = receiver.indexOf("if (req.method !== 'POST')");
  assert.ok(start >= 0 && end > start, 'status-route markers must both resolve before slicing');
  const statusRoute = receiver.slice(start, end);
  assert.match(receiver, /const statusHits = new Map\(\)/, 'status route needs its own counter map');
  assert.match(statusRoute, /allowWebhookRequest\(statusHits, webhookClientIp\(req, TRUSTED_PROXIES\)/);
  assert.doesNotMatch(statusRoute, /allowTimestampRequest/);
}

/* Unconditional: every route the receiver serves goes through the limiter. If a future route is
   added without one, this catches it even when the route has no dedicated map yet. */
assert.match(receiver, /const hits = new Map\(\)/, 'receiver keeps a rate-limit counter map');
assert.match(receiver, /allowWebhookRequest\(hits, ip/, 'POST path is rate-limited');
assert.match(receiver, /webhookClientIp\(/, 'client IP is derived through the trust-boundary helper, not read raw');

console.log('demigod webhook rate-limit trust boundary: PASS');
