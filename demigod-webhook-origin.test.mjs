import test from 'node:test';
import assert from 'node:assert/strict';
import { privateCapabilityHeaders, webhookOriginPolicy } from './demigod-webhook-origin.mjs';

test('webhook origin policy allows exact browser origins and originless server delivery only', () => {
  const allowed = ['https://www.trydemigod.com', 'https://talentlink-sf.webflow.io', 'https://talentlink-sf.design.webflow.com'];
  assert.deepEqual(webhookOriginPolicy('', allowed), { allowed: true, responseOrigin: '' });
  for (const origin of allowed) assert.deepEqual(webhookOriginPolicy(origin, allowed), { allowed: true, responseOrigin: origin });
  for (const origin of ['null', 'https://evil.example', 'https://www.trydemigod.com.evil.example', 'http://www.trydemigod.com']) {
    assert.deepEqual(webhookOriginPolicy(origin, allowed), { allowed: false, responseOrigin: '' });
  }
});

test('capability responses are private and non-referring without dropping CORS', () => {
  assert.deepEqual(privateCapabilityHeaders({
    'Access-Control-Allow-Origin': 'https://www.trydemigod.com',
    'Cache-Control': 'public',
  }), {
    'Access-Control-Allow-Origin': 'https://www.trydemigod.com',
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
  });
});
