import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  anonymizeRole,
  anonymizeCandidate,
  scrubPII,
  ingestSubmission,
  shouldAutoReject,
  slugId,
  filterBoard,
  saveInbox,
  saveBoard,
  INBOX_PATH,
  BOARD_PATH,
} from './demigod-submissions-lib.mjs';

test('submission IDs carry capability-grade entropy', () => {
  const ids = new Set(Array.from({ length: 32 }, () => slugId('sub')));
  assert.equal(ids.size, 32);
  for (const id of ids) assert.match(id, /^sub-[a-f0-9]{32}$/);
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
});

test('ingestSubmission auto-features when opted in', () => {
  const { featured } = ingestSubmission({
    name: 'startup-hire',
    data: {
      'company-name': 'Fixture Co',
      'company-stage': 'seed',
      'role-title': 'Head of Growth',
      'stack-needs': 'Seed fintech',
      '90day-outcome': 'Build a qualified pipeline',
      'work-location': 'remote-us',
      'salary-range': '$170-210k',
      'contact-email': 'founder@fixture.invalid',
    },
  }, { autoFeature: true });
  assert.equal(featured.title, 'Head of Growth');
});

test('auto-feature cannot bypass rejection or required evidence', () => {
  const incomplete = ingestSubmission({
    name: 'startup-hire',
    data: { 'role-title': 'Head of Growth', 'stack-needs': 'Seed fintech' },
  }, { autoFeature: true });
  assert.equal(incomplete.record.status, 'new');
  assert.equal(incomplete.featured, null);

  // work-location is required startup evidence (founder work-mode fit) — missing blocks feature
  const noLocation = ingestSubmission({
    name: 'startup-hire',
    data: {
      'company-name': 'No Loc Co',
      'company-stage': 'seed',
      'role-title': 'Founding Eng',
      'stack-needs': 'Seed B2B',
      '90day-outcome': 'Ship MVP',
      'salary-range': '$180-220k',
      'contact-email': 'noloc@fixture.invalid',
    },
  }, { autoFeature: true });
  assert.equal(noLocation.record.status, 'new');
  assert.equal(noLocation.featured, null);

  const rejected = ingestSubmission({
    name: 'engineer-join',
    data: { 'seeker-email': 'candidate@example.invalid', 'skills-stack': '' },
  }, { autoFeature: true });
  assert.equal(rejected.record.status, 'rejected');
  assert.equal(rejected.featured, null);
});

test('auto-feature patches fresh stores instead of rewriting stale snapshots', () => {
  const source = fs.readFileSync(new URL('./demigod-submissions-lib.mjs', import.meta.url), 'utf8');
  const branch = source.match(/if \(autoFeature && !submissionApprovalBlocker\(record\)\) \{[\s\S]+?\n  \}\n\n  return \{ inbox/)?.[0] || '';
  assert.match(branch, /board = writeBoard\(/);
  assert.match(branch, /const updated = updateInbox\(/);
  assert.doesNotMatch(branch, /saveInbox\(inbox\)|saveBoard\(board/);
});

test('shouldAutoReject flags test keyword and zero skills', () => {
  const r = shouldAutoReject({ 'stack-needs': 'this is a test brief' }, 'startup-hire', { items: [] });
  assert.equal(r.reject, true);
  assert.ok(r.reasons.includes('test_keyword'));

  const z = shouldAutoReject({ 'skills-stack': '' }, 'engineer-join', { items: [] });
  assert.equal(z.reject, true);
  assert.ok(z.reasons.includes('zero_skills'));
});

test('shouldAutoReject mirrors the browser matching-text caps', () => {
  const candidate = { 'seeker-email': 'candidate@example.com', 'skills-stack': 'Product', 'resume-url': 'https://example.com/resume.pdf' };
  const over = [
    [{ 'stack-needs': 'x'.repeat(501) }, 'startup-hire', 'stack_needs_too_long'],
    [{ 'stack-needs': 'Product', 'why-this-role': 'x'.repeat(301) }, 'startup-hire', 'why_this_role_too_long'],
    [{ ...candidate, 'skills-stack': 'x'.repeat(401) }, 'engineer-join', 'skills_stack_too_long'],
    [{ ...candidate, experience: 'x'.repeat(601) }, 'engineer-join', 'experience_too_long'],
  ];
  for (const [data, form, reason] of over) {
    const result = shouldAutoReject(data, form, { items: [] });
    assert.equal(result.reject, true);
    assert.ok(result.reasons.includes(reason));
  }

  const startupExact = shouldAutoReject({ 'stack-needs': 'x'.repeat(500), 'why-this-role': 'x'.repeat(300) }, 'startup-hire', { items: [] });
  assert.equal(startupExact.reject, false);
  assert.ok(!startupExact.reasons.some((reason) => reason.endsWith('_too_long')));
  const candidateExact = shouldAutoReject({ ...candidate, 'skills-stack': 'x'.repeat(400), experience: 'x'.repeat(600) }, 'engineer-join', { items: [] });
  assert.equal(candidateExact.reject, false);
  assert.ok(!candidateExact.reasons.some((reason) => reason.endsWith('_too_long')));
});

test('duplicate email becomes a review-gated update, not a rejection', () => {
  const inbox = {
    items: [{
      at: new Date().toISOString(),
      form: 'startup-hire',
      status: 'new',
      raw: { 'contact-email': 'ceo@acme.com' },
    }],
  };
  const r = shouldAutoReject({ 'contact-email': 'ceo@acme.com', 'stack-needs': 'PM' }, 'startup-hire', inbox);
  assert.equal(r.reject, false);
  assert.equal(r.duplicate, true);
  assert.ok(r.reasons.includes('duplicate_email'));
});

test('duplicate detection survives working-inbox eviction', () => {
  const archive = `${INBOX_PATH}.archive.jsonl`;
  try { fs.unlinkSync(archive); } catch {}
  const at = new Date().toISOString();
  const target = {
    id: 'sub-target', at, form: 'startup-hire', status: 'new',
    raw: { 'contact-email': 'evicted-founder@example.com', 'stack-needs': 'Product' },
  };
  const fillers = Array.from({ length: 199 }, (_, i) => ({
    id: `sub-fill-${i}`, at, form: 'startup-hire', status: 'new',
    raw: { 'contact-email': `fill-${i}@example.com`, 'stack-needs': 'Product' },
  }));
  try {
    saveInbox({ items: [...fillers, target] });
    ingestSubmission({ name: 'startup-hire', data: { 'contact-email': 'new@example.com', 'stack-needs': 'Product' } });
    const index = JSON.parse(fs.readFileSync(INBOX_PATH, 'utf8')).recentContacts;
    assert.match(index[0].emailHash, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(index).includes('@'), 'dedupe index must not retain plaintext email');
    const { record } = ingestSubmission({
      name: 'startup-hire',
      data: { 'contact-email': 'evicted-founder@example.com', 'stack-needs': 'Product' },
    });
    assert.equal(record.status, 'updated');
    assert.equal(record.rejectReasons, undefined);
  } finally {
    saveInbox({ items: [], recentContacts: [] });
    try { fs.unlinkSync(archive); } catch {}
  }
});

test('dedupe index repairs malformed and expired metadata', () => {
  const data = { 'contact-email': 'fresh-founder@example.com', 'stack-needs': 'Product' };
  assert.doesNotThrow(() => shouldAutoReject(data, 'startup-hire', { items: [], recentContacts: {} }));
  assert.doesNotThrow(() => shouldAutoReject(data, 'startup-hire', { items: [], recentContacts: [null] }));
  try {
    saveInbox({ items: [], recentContacts: [
      { emailHash: 'a'.repeat(64), at: '2020-01-01T00:00:00.000Z' },
      { emailHash: 'not-a-hash', at: new Date().toISOString() },
      { emailHash: 'b'.repeat(64), at: 'not-a-date' },
      { emailHash: 'c'.repeat(64), at: '2999-01-01T00:00:00.000Z' },
      null,
    ] });
    ingestSubmission({ name: 'startup-hire', data });
    assert.deepEqual(JSON.parse(fs.readFileSync(INBOX_PATH, 'utf8')).recentContacts, []);
  } finally {
    saveInbox({ items: [], recentContacts: [] });
  }
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

test('shouldAutoReject refuses an explicitly unsupported resume type', () => {
  const bad = shouldAutoReject(
    { 'seeker-email': 'candidate@example.com', 'skills-stack': 'React', 'resume-type': 'application/x-msdownload' },
    'engineer-join',
    { items: [] },
  );
  assert.ok(bad.reasons.includes('resume_type_unsupported'));
  const pdf = shouldAutoReject(
    { 'seeker-email': 'candidate@example.com', 'skills-stack': 'React', 'resume-type': 'application/pdf; charset=binary' },
    'engineer-join',
    { items: [] },
  );
  assert.ok(!pdf.reasons.includes('resume_type_unsupported'));
});

test('shouldAutoReject fails closed on invalid resume size metadata', () => {
  const candidate = { 'seeker-email': 'candidate@example.com', 'skills-stack': 'React' };
  for (const size of ['not-a-number', -1, 'Infinity']) {
    const result = shouldAutoReject({ ...candidate, 'resume-size': size }, 'engineer-join', { items: [] });
    assert.ok(result.reasons.includes('resume_size_invalid'));
  }
  const valid = shouldAutoReject({ ...candidate, 'resume-size': 1024 }, 'engineer-join', { items: [] });
  assert.ok(!valid.reasons.includes('resume_size_invalid'));
});

test('shouldAutoReject accepts only bounded credential-free HTTPS resume links', () => {
  const base = { 'seeker-email': 'candidate@example.com', 'skills-stack': 'Product operations' };
  assert.ok(!shouldAutoReject({ ...base, 'resume-url': 'https://drive.google.com/file/d/abc/view' }, 'engineer-join', { items: [] }).reasons.includes('resume_url_invalid'));
  for (const url of ['javascript:alert(1)', 'data:text/html,bad', 'http://example.com/resume', 'https://user:secret@example.com/resume', `https://example.com/${'a'.repeat(2048)}`]) {
    assert.ok(shouldAutoReject({ ...base, 'resume-url': url }, 'engineer-join', { items: [] }).reasons.includes('resume_url_invalid'));
  }
});

test('publicStatus omits PII and shapes steps by form', async () => {
  const { publicStatus } = await import('./demigod-submissions-lib.mjs');
  const st = publicStatus({
    id: 'sub-abc',
    form: 'partner-apply-secret@vc.com',
    status: 'new',
    at: '2026-06-30T12:00:00.000Z',
    raw: { 'partner-email': 'secret@vc.com', 'partner-name': 'Alex' },
  });
  assert.equal(st.id, 'sub-abc');
  assert.equal(st.kind, 'partner');
  assert.ok(st.steps.length >= 3);
  assert.ok(!JSON.stringify(st).includes('secret@'), 'raw fields and the internal form name must stay private');
  assert.equal('form' in st, false, 'safe kind replaces the unbounded internal form name');
  // Default / residual path must not advertise the unset hello@ mailbox.
  const generic = publicStatus({ id: 'sub-gen', form: 'other', status: 'new', at: '2026-06-30T12:00:00.000Z' });
  assert.ok(generic.steps.some((s) => /potter@/i.test(s)), 'generic status names potter@ contact');
  assert.ok(!JSON.stringify(generic).includes('hello@'), 'generic status never names hello@');
});

test('publicStatus reports the latest public workflow update', async () => {
  const { publicStatus } = await import('./demigod-submissions-lib.mjs');
  const st = publicStatus({
    id: 'sub-featured', form: 'startup-hire', status: 'featured',
    at: '2026-06-30T12:00:00.000Z', reviewedAt: '2026-07-01T12:00:00.000Z',
    featuredAt: '2026-07-02T12:00:00.000Z',
  });
  assert.equal(st.updatedAt, '2026-07-02T12:00:00.000Z');
});

test('public submission status URL preserves the high-entropy reference safely', async () => {
  const { publicSubmissionStatusUrl } = await import('./demigod-submissions-lib.mjs');
  const id = 'sub-0123456789abcdef0123456789abcdef';
  assert.equal(publicSubmissionStatusUrl(id), `https://www.trydemigod.com/#status/${id}`);
  assert.equal(publicSubmissionStatusUrl(''), null);
  assert.equal(publicSubmissionStatusUrl('sub-a/b'), 'https://www.trydemigod.com/#status/sub-a%2Fb');
});

test('status path parser is exact, bounded, query-safe, and preserves encoded legacy IDs', async () => {
  const { parseSubmissionStatusPath } = await import('./demigod-submissions-lib.mjs');
  assert.deepEqual(parseSubmissionStatusPath('/status/sub-0123456789abcdef?fresh=1'), { matched: true, id: 'sub-0123456789abcdef' });
  assert.deepEqual(parseSubmissionStatusPath('/status/sub-a%2Fb'), { matched: true, id: 'sub-a/b' });
  for (const path of ['/status/sub-bad%ZZ', `/status/sub-${'a'.repeat(161)}`, '/status/', '/status/sub-ok/../other']) {
    assert.deepEqual(parseSubmissionStatusPath(path), { matched: true, id: null });
  }
  assert.deepEqual(parseSubmissionStatusPath('/statusish/sub-ok'), { matched: false, id: null });
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

// Any free-text link can de-anonymize a candidate or carry a signed-file secret. Redact protocol,
// scheme-less, repository, and bare personal-domain shapes while retaining ordinary skill words.
test('anonymize scrubs free-text links but keeps plain skills', () => {
  const resume = 'https://files.invalid.example/resumes/private.pdf?token=canary-secret';
  const bareResume = 'drive.google.com/file/d/private?token=bare-secret';
  const github = 'https://github.com/facebook/react/blob/main/private.txt?token=github-secret';
  const c = JSON.stringify(anonymizeCandidate({
    'skills-stack': `React — ${github}; profile linkedin.com/in/jane-doe-123`,
    experience: `Node.js. Portfolio janedoe.dev. Resume (${resume}); backup ${bareResume}.`,
  }));
  assert.ok(!c.includes('linkedin.com/in/jane-doe-123'), 'free-text LinkedIn profile URL must be scrubbed (de-anonymizer)');
  assert.ok(!c.includes(resume), 'free-text resume URL must not reach a public candidate card');
  assert.ok(!c.includes('canary-secret'), 'signed-link secrets must not reach a public candidate card');
  assert.ok(!c.includes('bare-secret'), 'scheme-less signed links must not reach a public candidate card');
  assert.ok(!c.includes('github-secret') && !c.includes('/blob/'), 'GitHub subpaths and query secrets must be dropped');
  assert.ok(!c.includes('github.com/facebook/react'), 'repository links can identify a candidate and must be scrubbed');
  assert.ok(!c.includes('janedoe.dev'), 'bare personal domains must not reach a public candidate card');
  assert.ok(c.includes('[link removed]);') && c.includes('[link removed].'), 'surrounding punctuation must survive redaction');
  assert.ok(c.includes('React') && c.includes('Node.js'), 'plain skill words must be kept');
});

// Poison-test (Claude c174–c175 / Grok): free-text identity-link de-anonymizer must stay fail-capable.
// A regression that only greps "linkedin.com" (or drops scrubPII from anonymizeCandidate) ships
// public cards with profile URLs. Cover LinkedIn *and* other identity domains so a future
// linkedin-only regex cannot reopen github/twitter/x/portfolio leaks silently.
test('free-text identity-link scrub is fail-capable (not vacuous-green)', () => {
  // [url, unique marker that must not survive on a public card]
  const LEAKS = [
    ['linkedin.com/in/jane-doe-poison', 'jane-doe-poison'],
    ['linkedin.com/pub/jane-doe-poison', 'jane-doe-poison'],
    ['https://www.linkedin.com/in/jane-doe-poison', 'jane-doe-poison'],
    ['www.linkedin.com/in/jane-doe-poison', 'jane-doe-poison'],
    ['github.com/jane-doe-poison', 'jane-doe-poison'],
    ['https://github.com/jane-doe-poison', 'jane-doe-poison'],
    ['twitter.com/jane_doe_poison', 'jane_doe_poison'],
    ['x.com/jane_doe_poison', 'jane_doe_poison'],
    ['https://x.com/jane_doe_poison', 'jane_doe_poison'],
    ['janedoe-poison.dev', 'janedoe-poison.dev'],
    ['https://janedoe-poison.dev/about', 'janedoe-poison.dev'],
  ];

  for (const [leak, marker] of LEAKS) {
    const scrubbed = scrubPII(`React — profile ${leak}`);
    assert.ok(!scrubbed.includes(marker), `scrubPII must drop marker from ${leak}`);
    assert.ok(scrubbed.includes('[link removed]'), `scrubPII must mark removal for ${leak}`);
    assert.ok(scrubbed.includes('React'), 'plain skill words must survive scrubPII');

    const card = JSON.stringify(anonymizeCandidate({
      'skills-stack': `Product strategy, ${leak}`,
      experience: `GTM. See also ${leak}.`,
    }));
    assert.ok(!card.includes(marker), `anonymizeCandidate must drop ${marker} from ${leak}`);
    assert.ok(card.includes('Product') || card.includes('GTM') || card.includes('strategy'), 'skills must remain');
  }

  // Hand-poison: if scrubPII were narrowed to linkedin-only, non-LI identity URLs would survive.
  const multi = 'React — github.com/jane-doe-poison twitter.com/jane_doe_poison x.com/jane_doe_poison janedoe-poison.dev';
  assert.ok(multi.includes('github.com') && multi.includes('twitter.com') && multi.includes('x.com') && multi.includes('janedoe-poison.dev'));
  const scrubbedMulti = scrubPII(multi);
  assert.notEqual(scrubbedMulti, multi, 'scrubPII must change multi-domain identity free text');
  for (const marker of ['github.com', 'twitter.com', 'x.com', 'janedoe-poison.dev', 'jane-doe-poison', 'jane_doe_poison']) {
    assert.ok(!scrubbedMulti.includes(marker), `multi-domain scrub must drop ${marker}`);
  }
  assert.ok(scrubbedMulti.includes('React'), 'skills survive multi-domain scrub');

  // Public card path must apply scrub, not only unit scrubPII.
  const poisonRaw = {
    'skills-stack': 'React — github.com/jane-doe-poison linkedin.com/in/jane-doe-poison',
    experience: 'Node — x.com/jane_doe_poison',
  };
  const card = JSON.stringify(anonymizeCandidate(poisonRaw));
  assert.ok(!card.includes('github.com') && !card.includes('linkedin.com') && !card.includes('x.com'), 'public card must drop identity hosts');
  assert.ok(!card.includes('jane-doe-poison') && !card.includes('jane_doe_poison'), 'public card must drop profile slugs');
});

// Shorteners + bare @handles are common self-ID paths that skip a com/net/org-only host regex.
test('scrubPII redacts shorteners and bare @handles (fail-capable)', () => {
  for (const [raw, marker] of [
    ['lnkd.in/abc123poison', 'lnkd.in'],
    ['bit.ly/xyzpoison', 'bit.ly'],
    ['t.co/abcpoison', 't.co'],
    ['https://bit.ly/xyzpoison', 'bit.ly'],
    ['goo.gl/xpoison', 'goo.gl'],
  ]) {
    const out = scrubPII(`React — ${raw}`);
    assert.ok(!out.includes(marker), `shortener must drop ${raw}`);
    assert.ok(out.includes('[link removed]'), `shortener must mark ${raw}`);
    assert.ok(out.includes('React'));
  }

  const handleOut = scrubPII('React twitter @jane_doe_poison and Node');
  assert.ok(!handleOut.includes('jane_doe_poison'), 'bare @handle must be scrubbed');
  assert.ok(handleOut.includes('[handle removed]'));
  assert.ok(handleOut.includes('React') && handleOut.includes('Node'));

  // Must not eat TypeScript/npm scoped package names used as skills.
  const types = scrubPII('TypeScript @types/react and @angular/core');
  assert.ok(types.includes('@types/react'), '@types/* skill must survive');
  assert.ok(types.includes('@angular/core'), 'npm @scope/pkg must survive');

  // Emails still use contact redaction (not handle) and run first.
  assert.equal(scrubPII('ping jane@acme.com'), 'ping [contact removed]');

  // Hand-poison: identity shortener + bare handle must not equal input after scrub.
  const poison = 'see lnkd.in/secret and @jane_doe_poison';
  assert.notEqual(scrubPII(poison), poison);
  const card = JSON.stringify(anonymizeCandidate({
    'skills-stack': 'Product — lnkd.in/secret @jane_doe_poison',
    experience: 'GTM',
  }));
  assert.ok(!card.includes('lnkd.in') && !card.includes('jane_doe_poison'));
});

// Obfuscation tricks that skip a naive email/phone regex (Claude collab next poison).
test('scrubPII redacts obfuscated email and spoken-digit phone (fail-capable)', () => {
  for (const raw of [
    'jane [at] acme [dot] com',
    'jane(at)acme(dot)com',
    'ceo at stealth dot ai',
    'founder [at] x [dot] io',
  ]) {
    const out = scrubPII(`React — email me ${raw}`);
    assert.ok(!out.toLowerCase().includes('[at]') && !out.toLowerCase().includes('(at)'), `must scrub ${raw}`);
    assert.ok(!/\b(?:acme|stealth|x)\b.*\b(?:com|ai|io)\b/i.test(out) || out.includes('[contact removed]'), `host must not survive plain in ${raw}`);
    assert.ok(out.includes('[contact removed]'), `must mark contact for ${raw}`);
    assert.ok(out.includes('React'));
  }

  const spoken = scrubPII('call four one five five five five zero zero zero one please');
  assert.ok(spoken.includes('[phone removed]'), 'spoken digits must scrub');
  assert.ok(!/four one five/i.test(spoken), 'spoken digit words must not remain as a number phrase');

  // Hand-poison: if only \d{3}-\d{3}-\d{4} is scrubbed, [at]/spoken phones leak on public cards.
  const multi = 'React — jane [at] acme [dot] com or four one five five five five one two one two';
  const scrubbed = scrubPII(multi);
  assert.notEqual(scrubbed, multi);
  assert.ok(!scrubbed.includes('[at]') && !scrubbed.includes('[dot]'));
  assert.ok(!/four one five five five five/i.test(scrubbed));
  const card = JSON.stringify(anonymizeCandidate({
    'skills-stack': multi,
    experience: 'GTM',
  }));
  assert.ok(!card.includes('[at]') && !card.includes('four one five five five five'));
  assert.ok(card.includes('React') || card.includes('GTM'));
});

// International phones (Claude c176): US 3-3-4 only left +44/+33 E.164 free-text on public cards.
test('scrubPII redacts international phones (fail-capable)', () => {
  for (const [raw, marker] of [
    ['+44 20 7946 0958', '7946'],
    ['+33 1 42 68 53 00', '42 68'],
    ['+49 30 12345678', '12345678'],
    ['+442079460958', '442079460958'],
    ['+1 415 555 0199', '555 0199'],
  ]) {
    const out = scrubPII(`React — call ${raw}`);
    assert.ok(!out.includes(marker), `must scrub international ${raw}`);
    assert.ok(out.includes('[phone removed]'), `must mark phone for ${raw}`);
    assert.ok(out.includes('React'));
  }

  // Must not eat ordinary non-phone numbers in free text.
  for (const safe of ['React + 5 years experience', '$180-220k', 'Series A 2024', 'team of 12']) {
    assert.equal(scrubPII(safe), safe, `must not scrub non-phone: ${safe}`);
  }

  // Hand-poison: if only NANP runs, UK number survives on public cards.
  const poison = 'React — reach me +44 20 7946 0958';
  assert.notEqual(scrubPII(poison), poison);
  const card = JSON.stringify(anonymizeCandidate({
    'skills-stack': poison,
    experience: 'GTM +33 1 42 68 53 00',
  }));
  assert.ok(!card.includes('7946') && !card.includes('42 68'), 'intl phones must not reach public card');
  assert.ok(card.includes('React') || card.includes('GTM'));
});

// Street addresses (Claude c178): free-text home/office lines de-anonymize public cards.
// High-precision: number + street type; city+ZIP; leave "Main Street marketing" / SF Bay Area alone.
test('scrubPII redacts street addresses (fail-capable)', () => {
  for (const [raw, marker] of [
    ['123 Main St, SF 94103', '94103'],
    ['456 Oak Avenue, San Francisco, CA 94107', 'Oak Avenue'],
    ['789 Mission St Apt 4B', 'Mission St'],
    ['I live at 12 Valencia Street', 'Valencia'],
    ['SF 94103', '94103'],
    ['San Francisco, CA 94105', '94105'],
    ['PO Box 123, SF 94103', 'PO Box'],
    ['P.O. Box 4567', 'Box 4567'],
  ]) {
    const out = scrubPII(`React — ${raw}`);
    assert.ok(!out.includes(marker), `must scrub address marker from ${raw}`);
    assert.ok(out.includes('[address removed]'), `must mark address for ${raw}`);
    assert.ok(out.includes('React'));
  }

  // Must not eat ordinary product/location prose without a full address.
  for (const safe of [
    'React + 5 years experience',
    '$180-220k',
    'Series A 2024',
    'SF Bay Area',
    'worked on Main Street marketing',
    'team of 12',
  ]) {
    assert.equal(scrubPII(safe), safe, `must not scrub non-address: ${safe}`);
  }

  // Hand-poison: if only phone/email scrub, street lines survive on public cards.
  const poison = 'React — office 123 Main St, SF 94103';
  assert.notEqual(scrubPII(poison), poison);
  const card = JSON.stringify(anonymizeCandidate({
    'skills-stack': poison,
    experience: 'GTM near 456 Oak Avenue, San Francisco, CA 94107',
  }));
  assert.ok(!card.includes('94103') && !card.includes('Main St') && !card.includes('Oak Avenue'), 'street must not reach public card');
  assert.ok(card.includes('React') || card.includes('GTM'));
});
