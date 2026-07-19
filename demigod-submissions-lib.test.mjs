import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  anonymizeRole,
  anonymizeCandidate,
  ingestSubmission,
  shouldAutoReject,
  filterBoard,
  saveInbox,
  saveBoard,
  INBOX_PATH,
  BOARD_PATH,
} from './demigod-submissions-lib.mjs';

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
// Perm-regression guard: PII SoR writers must create files 0600 (cycles 280-288 secured contacts/
// offers PII). A future edit dropping the post-write chmod would silently re-expose them; catch it.
test('PII SoR writers create files 0600', () => {
  try { fs.unlinkSync(INBOX_PATH); } catch {} // fresh file so we test creation-time mode (umask default is 0644)
  saveInbox({ items: [] });
  assert.equal(fs.statSync(INBOX_PATH).mode & 0o077, 0, 'saveInbox must create INBOX_PATH 0600 (no group/world PII)');
  try { fs.unlinkSync(BOARD_PATH); } catch {}
  saveBoard({ roles: [], candidates: [] });
  assert.equal(fs.statSync(BOARD_PATH).mode & 0o077, 0, 'saveBoard must create BOARD_PATH 0600');
});

// Receipt write-guard: a real delivered receipt (mintReceipt sets no `sample` field, so sample===undefined)
// must be refused without DEMIGOD_ALLOW_REAL_RECEIPTS — the guard keys on status==='delivered', not the
// sample===false proxy the minted receipt slipped through (caught only downstream before this fix).
test('saveBoard refuses a real delivered receipt without the allow-real env', async () => {
  const { mintReceipt } = await import('./demigod-board-lib.mjs');
  const real = { roles: [], candidates: [], receipts: [] };
  mintReceipt(real, { intros: 2, status: 'delivered', note: '' }); // sample:undefined, hex hash
  delete process.env.DEMIGOD_ALLOW_REAL_RECEIPTS; delete process.env.DEMIGOD_ALLOW_REAL_ROLES;
  assert.throws(() => saveBoard(real, { reason: 'test-real-receipt' }), /REAL_RECEIPTS_REFUSED|realReceipts/);
  // a sample-labeled receipt (note says "Sample") stays writable — not a real proof claim
  const sample = { roles: [], candidates: [], receipts: [{ hash: 'demo004', number: 4, status: 'delivered', note: 'Sample receipt', intros: 3 }] };
  assert.doesNotThrow(() => saveBoard(sample, { reason: 'test-sample-receipt' }));
});

// #23 regression guard: anonymize* strips STRUCTURED PII fields, but the free-text skills/experience/
// stack-needs are concatenated into the published summary/tags/skills — scrubPII must redact email/phone
// there too, or a candidate/founder typing contact info into a free-text field leaks it to the live board.
test('anonymize scrubs free-text email/phone (#23 regression)', () => {
  const c = anonymizeCandidate({
    'skills-stack': 'React, Node — reach me jane@acme.com or 415-555-0000',
    experience: '5y, call 650.555.1212',
  });
  const cj = JSON.stringify(c);
  assert.ok(!cj.includes('jane@acme.com'), 'candidate free-text email must be scrubbed');
  assert.ok(!cj.includes('415-555-0000'), 'candidate free-text phone must be scrubbed');
  assert.ok(!cj.includes('650.555.1212'), 'candidate experience phone must be scrubbed');
  assert.ok(cj.includes('React') || cj.includes('Node'), 'useful skills must be kept');
  const rj = JSON.stringify(anonymizeRole({ 'stack-needs': 'Seed SaaS, ping ceo@x.io or 415-555-9999' }));
  assert.ok(!rj.includes('ceo@x.io'), 'role free-text email must be scrubbed');
  assert.ok(!rj.includes('415-555-9999'), 'role free-text phone must be scrubbed');
  assert.ok(/Seed|SaaS/.test(rj), 'useful role skills must be kept');
});

// A LinkedIn URL in a free-text field de-anonymizes the candidate (the structured linkedin-url field is
// already dropped, but a typed one leaked — the c358 fix covered email/phone, not profile URLs). Redact
// linkedin.com/in|pub; keep github/skills (repo refs are legit signal).
test('anonymize scrubs free-text LinkedIn URL but keeps github/skills', () => {
  const c = JSON.stringify(anonymizeCandidate({ 'skills-stack': 'React — https://www.linkedin.com/in/jane-doe-123, github.com/facebook/react' }));
  assert.ok(!c.includes('linkedin.com/in/jane-doe-123'), 'free-text LinkedIn profile URL must be scrubbed (de-anonymizer)');
  assert.ok(c.includes('github.com/facebook/react'), 'github repo ref must be kept (skill signal, not PII)');
  assert.ok(c.includes('React'), 'skills must be kept');
});
