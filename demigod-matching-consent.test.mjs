import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(OPS, 'demigod-matching-engine.mjs');

function runEngine(dir, preload, args) {
  const res = spawnSync(process.execPath, ['--import', preload, ENGINE, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
  let parsed = null;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    parsed = null;
  }
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, parsed };
}

function requireJson(res, label) {
  assert.ok(
    res.parsed,
    `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`,
  );
  return res.parsed;
}

function readPairs(dir) {
  const file = path.join(dir, 'DEMIGOD-PAIRS.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8')).pairs || {};
}

function pairFor(dir, roleId, candId) {
  return Object.values(readPairs(dir)).find((row) => row.roleId === roleId && row.candId === candId) || null;
}

function consentEvents(pair) {
  return (pair?.history || []).filter((row) => row.event === 'consent');
}

describe('matching consent', { concurrency: 1 }, () => {
  test('a named intro requires both real side consents on the same pair', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-consent-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = dir;
    const flag = path.join(dir, 'fetch-calls.log');
    const preload = path.join(dir, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(dir, { recursive: true, force: true });
    });

    const { saveBoard, ingestSubmission } = await import('./demigod-submissions-lib.mjs');
    const stamp = Date.now();
    saveBoard({
      at: new Date().toISOString(),
      roles: [
        { id: 'role-founding', title: 'Founding Engineer', company: 'Harbor Lane', status: 'Active', skills: 'TypeScript, product', stageType: 'Seed', comp: '$180-220k' },
        { id: 'role-staff-north', title: 'Staff Engineer', company: 'North Pier', status: 'Active', skills: 'Go, storage', stageType: 'Seed' },
        { id: 'role-staff-south', title: 'Staff Engineer', company: 'South Dock', status: 'Active', skills: 'Rust, compilers', stageType: 'Seed' },
      ],
      candidates: [],
    }, { reason: 'consent-fixture', actor: 'matching-consent' });

    const mina = ingestSubmission({
      name: 'engineer-join',
      data: {
        'full-name': 'Mina Alvarez',
        'seeker-email': `mina.alvarez.${stamp}@baymail.co`,
        'skills-stack': 'TypeScript, product',
        experience: 'Shipped a billing service',
        'sf-bay': 'yes',
        availability: 'now',
        'salary-expectation': '$180k',
      },
    }).record;
    const jules = ingestSubmission({
      name: 'engineer-join',
      data: {
        'full-name': 'Jules Okonkwo',
        'seeker-email': `jules.okonkwo.${stamp}@baymail.co`,
        'skills-stack': 'Go, storage',
        experience: 'Ran an on-call rotation',
        'sf-bay': 'yes',
        availability: 'now',
        'salary-expectation': '$180k',
      },
    }).record;

    const julesStartup = requireJson(runEngine(dir, preload, [
      'startup-interest',
      `--role-id=role-founding`,
      `--candidate-id=${jules.id}`,
    ]), 'jules startup-interest');
    assert.equal(julesStartup.ok, true);
    assert.equal(julesStartup.roleId, 'role-founding');
    const julesOptin = requireJson(runEngine(dir, preload, [
      'candidate-optin',
      `--candidate-id=${jules.id}`,
      '--role=Founding Engineer',
    ]), 'jules candidate-optin');
    assert.equal(julesOptin.ok, true);
    assert.equal(julesOptin.pairId, julesStartup.pairId);
    assert.equal(julesOptin.pair.state, 'mutual_yes');
    assert.equal(julesOptin.pair.mutual.founder, true);
    assert.equal(julesOptin.pair.mutual.candidate, true);
    const julesBefore = pairFor(dir, 'role-founding', jules.id);
    assert.equal(consentEvents(julesBefore).length, 2);
    assert.equal((julesBefore.reasons || []).includes('propose-intro'), false);

    const minaStartup = requireJson(runEngine(dir, preload, [
      'startup-interest',
      '--role-id=role-founding',
      `--candidate-id=${mina.id}`,
    ]), 'mina startup-interest');
    assert.equal(minaStartup.ok, true);
    assert.equal(minaStartup.roleId, 'role-founding');
    assert.notEqual(minaStartup.pairId, julesStartup.pairId);
    assert.equal(minaStartup.pair.state, 'proposed');
    assert.equal(minaStartup.pair.mutual.founder, true);
    assert.equal(minaStartup.pair.mutual.candidate, false);

    const staffStartup = requireJson(runEngine(dir, preload, [
      'startup-interest',
      '--role-id=role-staff-north',
      `--candidate-id=${mina.id}`,
    ]), 'staff startup-interest');
    assert.equal(staffStartup.ok, true);
    assert.equal(staffStartup.roleId, 'role-staff-north');
    assert.equal(staffStartup.pair.mutual.candidate, false);

    const borrowed = runEngine(dir, preload, [
      'propose-intro',
      '--role=Founding Engineer',
      `--candidate=${mina.id}`,
    ]);
    const borrowedBody = requireJson(borrowed, 'propose-intro before candidate consent');
    assert.equal(borrowed.status, 2);
    assert.equal(borrowedBody.ok, false);
    assert.equal(borrowedBody.error, 'no mutual match found');
    assert.equal(borrowedBody.candidate, mina.id);
    const julesAfterBorrow = pairFor(dir, 'role-founding', jules.id);
    assert.equal(consentEvents(julesAfterBorrow).length, 2);
    assert.equal((julesAfterBorrow.reasons || []).includes('propose-intro'), false);
    const minaAfterBorrow = pairFor(dir, 'role-founding', mina.id);
    assert.equal(minaAfterBorrow.state, 'proposed');
    assert.equal(minaAfterBorrow.mutual.candidate, false);
    const matchesFile = path.join(dir, 'DEMIGOD-MATCHES.json');
    const matches = JSON.parse(fs.readFileSync(matchesFile, 'utf8'));
    assert.equal((matches.intros || []).length, 0);

    const partial = runEngine(dir, preload, [
      'candidate-optin',
      `--candidate-id=${mina.id}`,
      '--role=Engineer',
    ]);
    const partialBody = requireJson(partial, 'partial title opt-in');
    assert.equal(partial.status, 2);
    assert.equal(partialBody.ok, false);
    assert.equal(partialBody.error, 'role_not_found');
    assert.equal(pairFor(dir, 'role-founding', mina.id).mutual.candidate, false);

    const ambiguous = runEngine(dir, preload, [
      'candidate-optin',
      `--candidate-id=${mina.id}`,
      '--role=Staff Engineer',
    ]);
    const ambiguousBody = requireJson(ambiguous, 'ambiguous title opt-in');
    assert.equal(ambiguous.status, 2);
    assert.equal(ambiguousBody.ok, false);
    assert.equal(ambiguousBody.error, 'role_ambiguous');
    assert.equal(pairFor(dir, 'role-staff-north', mina.id).mutual.candidate, false);
    assert.equal(pairFor(dir, 'role-staff-south', mina.id), null);

    const minaOptin = requireJson(runEngine(dir, preload, [
      'candidate-optin',
      `--candidate-id=${mina.id}`,
      '--role=Founding Engineer',
    ]), 'mina candidate-optin');
    assert.equal(minaOptin.ok, true);
    assert.equal(minaOptin.pairId, minaStartup.pairId);
    assert.equal(minaOptin.roleId, 'role-founding');
    assert.equal(minaOptin.pair.state, 'mutual_yes');
    assert.equal(minaOptin.pair.candId, mina.id);
    assert.equal(consentEvents(pairFor(dir, 'role-founding', mina.id)).length, 2);

    const intro = requireJson(runEngine(dir, preload, [
      'propose-intro',
      '--role=Founding Engineer',
      `--candidate=${mina.id}`,
    ]), 'propose-intro after both consents');
    assert.equal(intro.ok, true);
    assert.equal(intro.pairId, minaStartup.pairId);
    assert.equal(intro.pairState, 'mutual_yes');
    assert.equal(intro.boardWrite, false);
    const minaAfterIntro = pairFor(dir, 'role-founding', mina.id);
    assert.equal(minaAfterIntro.state, 'mutual_yes');
    assert.equal(consentEvents(minaAfterIntro).length, 2);
    assert.equal(consentEvents(pairFor(dir, 'role-founding', jules.id)).length, 2);
    const intros = JSON.parse(fs.readFileSync(matchesFile, 'utf8')).intros || [];
    assert.equal(intros.length, 1);
    assert.equal(intros[0].candidate, mina.id);
    assert.equal(intros[0].role, 'Founding Engineer');
    assert.equal(intros[0].boardWrite, false);

    const substring = runEngine(dir, preload, [
      'propose-intro',
      '--role=Engineer',
      `--candidate=${mina.id}`,
    ]);
    const substringBody = requireJson(substring, 'substring propose-intro');
    assert.equal(substring.status, 2);
    assert.equal(substringBody.ok, false);
    assert.equal(substringBody.error, 'no mutual match found');
    assert.equal(consentEvents(pairFor(dir, 'role-founding', mina.id)).length, 2);

    const otherCand = runEngine(dir, preload, [
      'propose-intro',
      '--role=Staff Engineer',
      `--candidate=${mina.id}`,
    ]);
    const otherBody = requireJson(otherCand, 'unconsented role propose-intro');
    assert.equal(otherBody.ok, false);
    assert.equal(otherBody.error, 'no mutual match found');
    assert.equal(pairFor(dir, 'role-staff-north', mina.id).mutual.candidate, false);
    assert.equal(pairFor(dir, 'role-staff-south', mina.id), null);
    assert.equal(consentEvents(pairFor(dir, 'role-founding', mina.id)).length, 2);

    const board = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), 'utf8'));
    assert.equal(board.roles.length, 3);
    assert.equal((board.pilots || []).length, 0);
    assert.equal(fs.existsSync(flag), false);
  });
});
