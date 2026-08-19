import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const inboxCli = fileURLToPath(new URL('./demigod-submissions-inbox.mjs', import.meta.url));

const lib = new URL('./demigod-submissions-lib.mjs', import.meta.url).href;

function runWriter(inboxPath, id, holdMs) {
  const source = `
    import { updateInbox } from ${JSON.stringify(lib)};
    updateInbox((inbox) => {
      const until = Date.now() + ${holdMs};
      while (Date.now() < until) {}
      inbox.items.unshift({ id: ${JSON.stringify(id)} });
    });
  `;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      env: { ...process.env, DEMIGOD_INBOX_PATH: inboxPath },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr || `exit ${code}`)));
  });
}

test('locked inbox updates preserve concurrent writers', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-inbox-update-'));
  const inboxPath = path.join(dir, 'inbox.json');
  fs.writeFileSync(inboxPath, JSON.stringify({ items: [] }), { mode: 0o600 });

  const first = runWriter(inboxPath, 'review', 200);
  await new Promise((resolve) => setTimeout(resolve, 30));
  await Promise.all([first, runWriter(inboxPath, 'ingest', 0)]);

  const inbox = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
  assert.deepEqual(new Set(inbox.items.map((item) => item.id)), new Set(['review', 'ingest']));
  assert.equal(fs.statSync(inboxPath).mode & 0o777, 0o600);
});

test('candidate-observed availability reconfirmation refreshes intent without borrowing review time', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-availability-confirmation-'));
  const inboxPath = path.join(dir, 'inbox.json');
  const oldAt = new Date(Date.now() - 31 * 86400000).toISOString();
  fs.writeFileSync(inboxPath, JSON.stringify({ items: [{
    id: 'candidate-sub', form: 'engineer-join', status: 'reviewed', at: oldAt,
    raw: {
      'full-name': 'Candidate', 'seeker-email': 'candidate@example.com',
      'skills-stack': 'JavaScript', experience: 'Shipped onboarding', 'sf-bay': 'yes',
      availability: 'now', 'salary-expectation': '$180k',
      'resume-url': 'https://example.com/resume.pdf',
    },
  }] }));
  const run = (...args) => spawnSync(process.execPath, [inboxCli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_INBOX_PATH: inboxPath, DEMIGOD_TEST_SCOPE: `availability-${process.pid}` },
  });

  assert.equal(run('--mark-reviewed=candidate-sub', '--availability=2-4w').status, 2);
  assert.equal(JSON.parse(fs.readFileSync(inboxPath, 'utf8')).items[0].availabilityConfirmedAt, undefined);
  assert.equal(run('--mark-reviewed=candidate-sub', '--availability=soon', '--i-observed-candidate-answer').status, 1);
  const accepted = run('--mark-reviewed=candidate-sub', '--availability=2-4w', '--i-observed-candidate-answer');
  assert.equal(accepted.status, 0, accepted.stderr);
  const stored = JSON.parse(fs.readFileSync(inboxPath, 'utf8')).items[0];
  assert.equal(stored.raw.availability, '2-4w');
  assert.match(stored.availabilityConfirmedAt, /^20\d\d-/);
  assert.equal(stored.reviewedAt, undefined, 'operator review time is not rewritten as candidate intent');
});

test('founder-observed open-role confirmation refreshes the private receipt and board card', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-open-confirmation-'));
  const inboxPath = path.join(dir, 'inbox.json');
  const scope = `open-confirmation-${process.pid}`;
  const testDir = path.join('/tmp/dg-busy/tests', scope);
  const boardPath = path.join(testDir, 'test-board.json');
  const oldAt = new Date(Date.now() - 91 * 86400000).toISOString();
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(boardPath, JSON.stringify({ roles: [{ id: 'role-real', sample: false, status: 'Active', featuredAt: oldAt }], candidates: [] }));
  fs.writeFileSync(inboxPath, JSON.stringify({ items: [{
    id: 'role-sub', featuredId: 'role-real', form: 'startup-hire', status: 'featured', featuredAt: oldAt,
    raw: {
      'company-name': 'Acme', 'company-stage': 'seed', 'role-title': 'Founding Engineer',
      'stack-needs': 'JavaScript', '90day-outcome': 'Ship onboarding',
      'work-location': 'sf-hybrid', 'salary-range': '$180-220k',
      'interview-process': 'Founder chat → final', 'contact-email': 'founder@acme.example',
    },
  }] }));
  const run = (...args) => spawnSync(process.execPath, [inboxCli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_INBOX_PATH: inboxPath, DEMIGOD_TEST_SCOPE: scope, DEMIGOD_ALLOW_REAL_ROLES: '1' },
  });

  const pruned = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { writeBoard } from ${JSON.stringify(lib)};
    writeBoard((board) => board, { reason: 'test-prune', allowRealRoles: true });
  `], {
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_INBOX_PATH: inboxPath, DEMIGOD_TEST_SCOPE: scope, DEMIGOD_ALLOW_REAL_ROLES: '1' },
  });
  assert.equal(pruned.status, 0, pruned.stderr);
  assert.equal(JSON.parse(fs.readFileSync(boardPath, 'utf8')).roles.length, 0);

  assert.equal(run('--mark-reviewed=role-sub', '--confirm-open').status, 2);
  assert.equal(JSON.parse(fs.readFileSync(inboxPath, 'utf8')).items[0].openConfirmedAt, undefined);

  const accepted = run('--mark-reviewed=role-sub', '--confirm-open', '--i-observed-founder-answer');
  assert.equal(accepted.status, 0, accepted.stderr);
  const stored = JSON.parse(fs.readFileSync(inboxPath, 'utf8')).items[0];
  const card = JSON.parse(fs.readFileSync(boardPath, 'utf8')).roles[0];
  assert.match(stored.openConfirmedAt, /^20\d\d-/);
  assert.equal(card.id, 'role-real');
  assert.equal(card.sample, false);
  assert.match(card.sourceSubmissionHash, /^[a-f0-9]{64}$/);
  assert.equal(card.featuredAt, stored.openConfirmedAt);
});

test('founder-observed interview process is recorded during review, never inferred', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-process-calibration-'));
  const inboxPath = path.join(dir, 'inbox.json');
  fs.writeFileSync(inboxPath, JSON.stringify({ items: [{
    id: 'role-sub', form: 'startup-hire', status: 'new', raw: {
      'company-name': 'Acme', 'company-stage': 'seed', 'role-title': 'Founding Engineer',
      'stack-needs': 'JavaScript', '90day-outcome': 'Ship onboarding',
      'work-location': 'sf-hybrid', 'salary-range': '$180-220k',
      'contact-email': 'founder@acme.example',
    },
  }] }));
  const run = (...args) => spawnSync(process.execPath, [inboxCli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_INBOX_PATH: inboxPath, DEMIGOD_TEST_SCOPE: `process-${process.pid}` },
  });
  const plan = 'Founder chat → work sample → final; target decision in ~2 weeks';
  assert.equal(run('--mark-reviewed=role-sub', `--interview-process=${plan}`).status, 2);
  assert.equal(JSON.parse(fs.readFileSync(inboxPath, 'utf8')).items[0].raw['interview-process'], undefined);
  const accepted = run('--mark-reviewed=role-sub', `--interview-process=${plan}`, '--i-observed-founder-answer');
  assert.equal(accepted.status, 0, accepted.stderr);
  const stored = JSON.parse(fs.readFileSync(inboxPath, 'utf8')).items[0];
  assert.equal(stored.status, 'reviewed');
  assert.equal(stored.raw['interview-process'], plan);
  assert.match(stored.interviewProcessObservedAt, /^20\d\d-/);
});

test('review and approval route mutations through locked helpers', () => {
  const review = fs.readFileSync(new URL('demigod-submissions-inbox.mjs', import.meta.url), 'utf8');
  const approval = fs.readFileSync(new URL('demigod-submissions-approve.mjs', import.meta.url), 'utf8');
  const gmail = fs.readFileSync(new URL('demigod-gmail-forms.mjs', import.meta.url), 'utf8');
  const funnel = fs.readFileSync(new URL('demigod-funnel.mjs', import.meta.url), 'utf8');
  assert.match(review, /updateInbox\(/);
  assert.match(approval, /approveSubmission\(/);
  assert.match(gmail, /inboxPatched = updateInbox\(/);
  assert.match(funnel, /gmail\.inboxPatched = updateInbox\(/);
  assert.doesNotMatch(review + approval + gmail + funnel, /saveInbox\(/);
});
