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
const statusRoute = receiver.slice(receiver.indexOf('if (statusPath.matched)'), receiver.indexOf("if (req.method !== 'POST')"));
assert.match(receiver, /const statusHits = new Map\(\)/);
assert.match(statusRoute, /allowWebhookRequest\(statusHits, webhookClientIp\(req, TRUSTED_PROXIES\)/);
assert.doesNotMatch(statusRoute, /allowTimestampRequest/);

console.log('demigod webhook rate-limit trust boundary: PASS');
