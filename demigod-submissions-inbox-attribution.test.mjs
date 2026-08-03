import test from 'node:test';
import assert from 'node:assert/strict';
import { redactItem } from './demigod-submissions-inbox.mjs';

test('private inbox report exposes only allowlisted attribution', () => {
  const row = redactItem({
    id: 'sub-1',
    form: 'startup-hire',
    status: 'new',
    raw: {
      utm_source: 'linkedin',
      utm_medium: 'call-415-555-0123',
      utm_campaign: 'founder launch',
      role_id: 'role-42',
      referral: '123 Main Street',
      utm_term: 'founder@example.com',
      utm_content: { identity: 'Private Person' },
      event_id: 'x'.repeat(121),
      'contact-email': 'founder@example.com',
      company: 'Private Co',
    },
  });

  assert.deepEqual(row.attribution, {
    utm_source: 'linkedin',
    utm_campaign: 'founder launch',
    role_id: 'role-42',
  });
  assert.equal(JSON.stringify(row.attribution).includes('founder@example.com'), false);
  assert.equal(JSON.stringify(row.attribution).includes('Private Person'), false);
  assert.equal(Object.hasOwn(row.attribution, 'company'), false);
});
