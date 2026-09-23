import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('talent and hiring-partner onboarding land as reviewable records', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-onboard-'));
  const priorRoot = process.env.DEMIGOD_ROOT;
  process.env.DEMIGOD_ROOT = dir;
  t.after(() => {
    if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
    else process.env.DEMIGOD_ROOT = priorRoot;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const { ingestSubmission, loadInbox, publicStatus } = await import('./demigod-submissions-lib.mjs');
  const stamp = Date.now();
  const talentFields = {
    'full-name': 'Ada Okonkwo',
    'seeker-email': `ada.okonkwo.${stamp}@baymail.co`,
    'skills-stack': 'JavaScript, product instrumentation',
    experience: 'Shipped onboarding at a seed startup',
    'sf-bay': 'yes',
    availability: 'four weeks',
    'salary-expectation': '$180k',
  };
  const partnerFields = {
    'partner-type': 'vc',
    'partner-name': 'Harbor Foundry',
    'partner-email': `harbor.${stamp}@bayseed.co`,
    'partner-org': 'Harbor Foundry',
    'referral-plan': 'Warm intros to portfolio founders',
  };

  const talent = ingestSubmission({ name: 'engineer-join', data: talentFields });
  const partner = ingestSubmission({ name: 'partner-apply', data: partnerFields });
  const inbox = loadInbox();
  const talentRow = (inbox.items || []).find((item) => item.id === talent.record?.id);
  const partnerRow = (inbox.items || []).find((item) => item.id === partner.record?.id);

  assert.ok(talentRow, 'talent submit did not land in the inbox');
  assert.ok(partnerRow, 'hiring-partner submit did not land in the inbox');
  assert.equal(talentRow.status, 'new');
  assert.equal(partnerRow.status, 'new');
  assert.equal(talentRow.form, 'engineer-join');
  assert.equal(partnerRow.form, 'partner-apply');
  for (const [key, value] of Object.entries(talentFields)) {
    assert.equal(talentRow.raw[key], value, `talent field ${key} was not stored`);
  }
  for (const [key, value] of Object.entries(partnerFields)) {
    assert.equal(partnerRow.raw[key], value, `hiring-partner field ${key} was not stored`);
  }
  assert.ok(publicStatus(talentRow).steps.includes('Human review'));
  assert.ok(publicStatus(partnerRow).steps.includes('Human review'));
  assert.equal(publicStatus(talentRow).kind, 'engineer');
  assert.equal(publicStatus(partnerRow).kind, 'partner');
  console.log(JSON.stringify({
    talentId: talentRow.id,
    talentStatus: talentRow.status,
    talentForm: talentRow.form,
    talentKind: publicStatus(talentRow).kind,
    talentReview: publicStatus(talentRow).steps.includes('Human review'),
    partnerId: partnerRow.id,
    partnerStatus: partnerRow.status,
    partnerForm: partnerRow.form,
    partnerKind: publicStatus(partnerRow).kind,
    partnerReview: publicStatus(partnerRow).steps.includes('Human review'),
  }));
});
