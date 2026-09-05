import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = mkdtempSync(path.join(tmpdir(), 'demigod-submissions-test-'));
const previousRoot = process.env.DEMIGOD_ROOT;
process.env.DEMIGOD_ROOT = root;
const {
  anonymizeRole,
  anonymizeCandidate,
  ingestSubmission,
  shouldAutoReject,
  filterBoard,
  BOARD_PATH,
  INBOX_PATH,
  loadInbox,
} = await import('./demigod-submissions-lib.mjs');

assert.equal(path.dirname(BOARD_PATH), root);
assert.equal(path.dirname(INBOX_PATH), root);
beforeEach(() => {
  rmSync(BOARD_PATH, { force: true });
  rmSync(INBOX_PATH, { force: true });
});
after(() => {
  rmSync(root, { recursive: true, force: true });
  if (previousRoot === undefined) delete process.env.DEMIGOD_ROOT;
  else process.env.DEMIGOD_ROOT = previousRoot;
});

test('anonymizeRole strips PII', () => {
  const r = anonymizeRole({
    'company-name': 'Secret Co',
    'contact-email': 'ceo@secret.com',
    'role-title': 'Founding PM',
    'stack-needs': 'Pre-seed B2B SaaS, GTM, Series A path',
    'salary-range': '$180-220k',
  });
  assert.equal(r.title, 'Founding PM');
  assert.match(r.stageType, /Pre-seed|Seed/i);
  assert.ok(!JSON.stringify(r).includes('Secret'));
  assert.ok(!JSON.stringify(r).includes('ceo@'));
});

test('anonymizeCandidate strips PII', () => {
  const c = anonymizeCandidate({
    'full-name': 'Jane Doe',
    'seeker-email': 'jane@test.com',
    'linkedin-url': 'https://linkedin.com/in/jane',
    'skills-stack': 'Product strategy, Figma, growth',
    experience: '4 years at Series B startup',
    'sf-bay': 'yes',
    links: 'https://github.com/jane',
  });
  assert.ok(!JSON.stringify(c).includes('Jane'));
  assert.ok(!JSON.stringify(c).includes('linkedin'));
  assert.ok(c.tags.includes('SF Bay Area'));
  assert.ok(c.tags.includes('Engineer'));
});

test('ingestSubmission inbox-only by default', () => {
  const { featured, record } = ingestSubmission({
    name: 'startup-hire',
    data: {
      'role-title': 'Head of Growth',
      'stack-needs': 'Seed fintech',
      'salary-range': '$160-200k',
    },
  });
  assert.equal(featured, null);
  assert.equal(record.status, 'new');
  assert.equal(loadInbox().items[0].id, record.id);
});

test('ingestSubmission auto-features when opted in', () => {
  const { featured } = ingestSubmission({
    name: 'startup-hire',
    data: { 'role-title': 'Head of Growth', 'stack-needs': 'Seed fintech' },
  }, { autoFeature: true });
  assert.equal(featured.title, 'Head of Growth');
});

test('shouldAutoReject flags test keyword and zero skills', () => {
  const r = shouldAutoReject({ 'stack-needs': 'this is a test brief' }, 'startup-hire', { items: [] });
  assert.equal(r.reject, true);
  assert.ok(r.reasons.includes('test_keyword'));

  const z = shouldAutoReject({ 'skills-stack': '' }, 'engineer-join', { items: [] });
  assert.equal(z.reject, true);
  assert.ok(z.reasons.includes('zero_skills'));
});

test('shouldAutoReject flags duplicate email within window', () => {
  const inbox = {
    items: [{
      at: new Date().toISOString(),
      form: 'startup-hire',
      status: 'new',
      raw: { 'contact-email': 'ceo@acme.com' },
    }],
  };
  const r = shouldAutoReject({ 'contact-email': 'ceo@acme.com', 'stack-needs': 'PM' }, 'startup-hire', inbox);
  assert.equal(r.reject, true);
  assert.ok(r.reasons.includes('duplicate_email'));
});

test('filterBoard drops stale featured cards', () => {
  const old = new Date(Date.now() - 20 * 86400000).toISOString();
  const fresh = new Date().toISOString();
  const b = filterBoard({
    roles: [{ id: 'r1', featuredAt: old }, { id: 'r2', featuredAt: fresh }],
    candidates: [{ id: 'c1', featuredAt: fresh }],
  });
  assert.equal(b.roles.length, 1);
  assert.equal(b.roles[0].id, 'r2');
});

test('ingestSubmission stores partner-apply in inbox', () => {
  const email = `alex-${Date.now()}@bayvc.co`;
  const { featured, record } = ingestSubmission({
    name: 'partner-apply',
    data: {
      'partner-type': 'refer-both',
      'partner-name': 'Alex Kim',
      'partner-email': email,
      'partner-org': 'Bay Seed Fund',
      'referral-plan': 'Warm intros to portfolio founders',
    },
  });
  assert.equal(featured, null);
  assert.equal(record.status, 'new');
  assert.equal(record.form, 'partner-apply');
});

test('shouldAutoReject flags incomplete partner application', () => {
  const r = shouldAutoReject({ 'partner-email': 'a@b.co' }, 'partner-apply', { items: [] });
  assert.equal(r.reject, true);
  assert.ok(r.reasons.includes('missing_plan'));
});

test('publicStatus omits PII and shapes steps by form', async () => {
  const { publicStatus } = await import('./demigod-submissions-lib.mjs');
  const st = publicStatus({
    id: 'sub-abc',
    form: 'partner-apply',
    status: 'new',
    at: '2026-06-30T12:00:00.000Z',
    raw: { 'partner-email': 'secret@vc.com', 'partner-name': 'Alex' },
  });
  assert.equal(st.id, 'sub-abc');
  assert.equal(st.kind, 'partner');
  assert.ok(st.steps.length >= 3);
  assert.ok(!JSON.stringify(st).includes('secret@'));
});

test('parseWebhookPayload handles Webflow v2 envelope', async () => {
  const { parseWebhookPayload } = await import('./demigod-submissions-lib.mjs');
  const { name, data } = parseWebhookPayload(JSON.stringify({
    triggerType: 'form_submission',
    payload: { name: 'startup-hire', data: { 'role-title': 'PM' } },
  }));
  assert.equal(name, 'startup-hire');
  assert.equal(data['role-title'], 'PM');
});
