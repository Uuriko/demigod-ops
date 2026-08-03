import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { roleTruthFingerprint } from './demigod-accepted-role.mjs';
import { receiptArgsValid } from './demigod-funnel.mjs';
import { pairId } from './demigod-pairs-lib.mjs';
import { submissionFingerprint } from './demigod-submissions-lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FUNNEL = path.join(ROOT, 'demigod-funnel.mjs');

test('intro receipt requires and persists the current mutually consented pair', () => {
  assert.equal(receiptArgsValid(['--id=lead-real', '--message-id=<intro@real.test>', '--pair=pair-real']), true);
  assert.equal(receiptArgsValid(['--id=lead-real', '--pair=a', '--pair=b']), false);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-intro-receipt-'));
  const scope = `intro-receipt-${process.pid}-${Date.now()}`;
  const submissionsDir = path.join('/tmp/dg-busy/tests', scope);
  const boardPath = path.join(submissionsDir, 'test-board.json');
  const inboxPath = path.join(submissionsDir, 'test-submissions-inbox.json');
  const leadsPath = path.join(temp, 'DEMIGOD-LEADS.json');
  const pairsPath = path.join(temp, 'DEMIGOD-PAIRS.json');
  const roleId = 'role-real';
  const candId = 'cand-real';
  const leadId = 'lead-real';
  const originId = 'startup-real';
  const boundPairId = pairId(roleId, candId);
  const now = new Date().toISOString();
  const nextUpdateAt = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const roleData = {
    'company-name': 'Real Company',
    'company-stage': 'seed',
    'role-title': 'Founding Engineer',
    'stack-needs': 'JavaScript and systems work',
    '90day-outcome': 'Ship the first reliable customer workflow',
    'work-location': 'sf-hybrid',
    'salary-range': '$180k-$220k',
    'interview-process': 'Founder chat, work sample, final decision',
    'contact-email': 'founder@real.test',
  };
  const roleTruthHash = roleTruthFingerprint({ data: roleData });
  const pair = {
    pairId: boundPairId,
    roleId,
    candId,
    sample: false,
    createdSample: false,
    state: 'mutual_yes',
    mutual: { founder: true, candidate: true },
    history: [
      { at: now, actor: 'founder', event: 'consent', side: 'founder', evidence: 'founder approved this exact role', roleTruthHash, state: 'approved' },
      { at: now, actor: 'candidate', event: 'consent', side: 'candidate', evidence: 'candidate approved this exact role', roleTruthHash, state: 'mutual_yes' },
    ],
  };
  const leadStore = {
    schema: 'demigod.leads/2+funnel',
    partners: [{ id: leadId, state: 'mutual_yes', status: 'mutual_yes', pairIds: [boundPairId] }],
    talent: [],
  };
  const inbox = {
    items: [
      { id: originId, featuredId: roleId, status: 'featured', at: now, form: 'startup-hire', data: roleData },
      {
        id: candId,
        sample: false,
        status: 'reviewed',
        at: now,
        form: 'engineer-join',
        raw: {
          'full-name': 'Real Candidate',
          'seeker-email': 'candidate@real.test',
          'skills-stack': 'JavaScript and systems work',
          experience: 'Built and shipped production systems',
          'sf-bay': 'yes',
          availability: 'now',
          'salary-expectation': '$190k',
          'resume-url': 'https://real.test/resume.pdf',
        },
      },
    ],
  };
  const board = {
    candidates: [],
    roles: [{
      id: roleId,
      sample: false,
      title: 'Founding Engineer',
      sourceSubmissionHash: submissionFingerprint(originId),
    }],
  };
  fs.mkdirSync(submissionsDir, { recursive: true });
  fs.writeFileSync(leadsPath, JSON.stringify(leadStore, null, 2) + '\n');
  fs.writeFileSync(pairsPath, JSON.stringify({ pairs: { [boundPairId]: pair } }, null, 2) + '\n');
  fs.writeFileSync(boardPath, JSON.stringify(board, null, 2) + '\n');
  fs.writeFileSync(inboxPath, JSON.stringify(inbox, null, 2) + '\n');
  const original = fs.readFileSync(leadsPath, 'utf8');
  const env = {
    ...process.env,
    DEMIGOD_ROOT: temp,
    DEMIGOD_TEST_SCOPE: scope,
    DEMIGOD_INBOX_PATH: inboxPath,
    NODE_TEST_CONTEXT: '1',
  };
  const run = (...args) => spawnSync(process.execPath, [FUNNEL, ...args], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
  });

  try {
    const noPair = run('receipt', `--id=${leadId}`, '--message-id=<intro@real.test>', `--next-update=${nextUpdateAt}`);
    assert.notEqual(noPair.status, 0);
    assert.match(noPair.stderr, /intro_receipt_requires_pair/);
    assert.equal(fs.readFileSync(leadsPath, 'utf8'), original);

    const bypass = run('transition', `--id=${leadId}`, '--to=intro_made', `--pair=${boundPairId}`);
    assert.notEqual(bypass.status, 0);
    assert.match(bypass.stderr, /use receipt --pair=PAIR/);
    assert.equal(fs.readFileSync(leadsPath, 'utf8'), original);

    const wrongPair = run('receipt', `--id=${leadId}`, '--message-id=<intro@real.test>', '--pair=not-bound', `--next-update=${nextUpdateAt}`);
    assert.notEqual(wrongPair.status, 0);
    assert.match(wrongPair.stderr, /pair_not_bound_to_lead/);
    assert.equal(fs.readFileSync(leadsPath, 'utf8'), original);

    const result = run('receipt', `--id=${leadId}`, '--message-id=<intro@real.test>', `--pair=${boundPairId}`, `--next-update=${nextUpdateAt}`);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.deepEqual(
      { pairId: output.pairId, roleId: output.roleId, candId: output.candId, nextUpdateAt: output.nextUpdateAt },
      { pairId: boundPairId, roleId, candId, nextUpdateAt },
    );
    const lead = JSON.parse(fs.readFileSync(leadsPath, 'utf8')).partners[0];
    assert.equal(lead.state, 'intro_made');
    assert.equal(lead.pairId, boundPairId);
    assert.equal(lead.stateHistory.at(-1).nextUpdateAt, nextUpdateAt);
    assert.deepEqual(
      { pairId: lead.stateHistory.at(-1).pairId, roleId: lead.stateHistory.at(-1).roleId, candId: lead.stateHistory.at(-1).candId },
      { pairId: boundPairId, roleId, candId },
    );
    const receipt = fs.readFileSync(path.join(temp, 'demigod-outreach/funnel-receipts', `${leadId}-intro_made.txt`), 'utf8');
    assert.match(receipt, new RegExp(`pairId: ${boundPairId}`));
    assert.match(receipt, /roleId: role-real/);
    assert.match(receipt, /candId: cand-real/);
    assert.match(receipt, new RegExp(`nextUpdateAt: ${nextUpdateAt}`));
    const log = fs.readFileSync(path.join(temp, '.dg-busy/funnel/transitions.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).at(-1);
    assert.deepEqual({ pairId: log.pairId, roleId: log.roleId, candId: log.candId }, { pairId: boundPairId, roleId, candId });
    assert.equal(log.nextUpdateAt, nextUpdateAt);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
    fs.rmSync(submissionsDir, { recursive: true, force: true });
  }
});
