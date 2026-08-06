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

import { attributionSummary } from './demigod-submissions-inbox.mjs';

test('attribution summary counts directory company-brief startups without PII', () => {
  const s = attributionSummary([
    {
      form: 'startup-hire',
      raw: { utm_source: 'directory', utm_campaign: 'company-brief', 'contact-email': 'a@b.com', 'company-name': 'Secret Co' },
    },
    {
      form: 'startup-hire',
      raw: { utm_source: 'linkedin', utm_campaign: 'founder launch' },
    },
    {
      form: 'engineer-join',
      raw: { utm_source: 'directory', utm_campaign: 'company-brief' },
    },
    {
      form: 'startup-hire',
      raw: { utm_source: 'directory', utm_campaign: 'company-brief' },
    },
  ]);
  assert.equal(s.directoryCompanyBriefs, 2);
  assert.equal(s.bySource.directory, 2);
  assert.equal(s.bySource.linkedin, 1);
  assert.equal(s.byCampaign['company-brief'], 2);
  assert.equal(s.startupWithAttribution, 3);
  assert.equal(JSON.stringify(s).includes('Secret Co'), false);
  assert.equal(JSON.stringify(s).includes('a@b.com'), false);
});
