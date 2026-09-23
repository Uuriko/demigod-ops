import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const HANDLER = path.join(OPS, 'demigod-sms-handler.mjs');
const MINA = '+14155550111';
const SAM = '+14155550122';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, HANDLER, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = res.status === 0 ? res.stdout : res.stderr;
  const line = String(raw || '').trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

describe('SMS inbound role', { concurrency: 1 }, () => {
  test('a named sender is suggested only for the one role the text names', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sms-inbound-'));
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

    const boardPath = path.join(dir, 'DEMIGOD-BOARD.json');
    const inboxPath = path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json');
    const statePath = path.join(dir, 'demigod-sms-state.json');
    fs.writeFileSync(boardPath, JSON.stringify({
      roles: [
        { id: 'role-harbor-pm', title: 'Product Manager', company: 'Harbor East', skills: 'product gtm', status: 'Active', stageType: 'Seed' },
        { id: 'role-harbor-eng', title: 'Founding Engineer', company: 'Harbor West', skills: 'react billing', status: 'Active', stageType: 'Seed' },
        { id: 'role-harbor-bill', title: 'Platform Billing', company: 'Harbor North', skills: 'billing', status: 'Active', stageType: 'Seed' },
      ],
    }, null, 2));
    const boardBefore = fs.readFileSync(boardPath, 'utf8');

    const missingSender = readJson(run(dir, preload, ['--body=My name is Mina Chen. skills: React']), 'missing sender');
    assert.equal(missingSender.ok, false);
    assert.equal(missingSender.error, 'sender_required');
    assert.equal(missingSender.sent, false);
    assert.equal(missingSender.liveSms, false);
    assert.equal(fs.existsSync(inboxPath), false);
    assert.equal(fs.existsSync(statePath), false);
    assert.equal(fs.readFileSync(boardPath, 'utf8'), boardBefore);

    const missingBody = readJson(run(dir, preload, [`--from=${MINA}`]), 'missing body');
    assert.equal(missingBody.ok, false);
    assert.equal(missingBody.error, 'body_required');
    assert.equal(fs.existsSync(inboxPath), false);
    assert.equal(fs.existsSync(statePath), false);

    const unique = readJson(run(dir, preload, [
      `--from=${MINA}`,
      '--body=My name is Mina Chen. skills: React',
    ]), 'unique skill');
    assert.equal(unique.ok, true);
    assert.equal(unique.phone, MINA);
    assert.equal(unique.suggestedRole, 'Founding Engineer');
    assert.equal(unique.suggestedRoleId, 'role-harbor-eng');
    assert.equal(unique.sent, false);
    assert.equal(unique.liveSms, false);
    assert.equal(unique.liveMail, false);

    const inbox = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
    const mina = inbox.items.find((item) => item.phone === MINA);
    assert.ok(mina, 'named sender missing from inbox');
    assert.equal(mina.raw['full-name'], 'Mina Chen');
    assert.equal(mina.form, 'engineer-join-sms');
    assert.doesNotMatch(JSON.stringify(mina.raw), /Product Manager/);
    assert.equal(inbox.items.some((item) => item.phone === '+14155551234'), false);
    assert.equal(fs.existsSync(statePath), true);
    assert.equal(statePath.startsWith(dir), true);
    assert.equal(fs.existsSync(path.join(OPS, 'demigod-sms-state.json')), false);
    assert.equal(fs.readFileSync(boardPath, 'utf8'), boardBefore);

    const ambiguous = readJson(run(dir, preload, [
      `--from=${SAM}`,
      '--body=My name is Sam Rivera. skills: billing',
    ]), 'shared skill');
    assert.equal(ambiguous.ok, true);
    assert.equal(ambiguous.phone, SAM);
    assert.equal(ambiguous.suggestedRole, null);
    assert.equal(ambiguous.suggestedRoleId, null);
    assert.equal(ambiguous.sent, false);
    assert.equal(ambiguous.liveSms, false);
    const afterShare = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
    const sam = afterShare.items.find((item) => item.phone === SAM);
    assert.ok(sam, 'second sender missing from inbox');
    assert.equal(sam.raw['full-name'], 'Sam Rivera');
    assert.doesNotMatch(JSON.stringify(sam.raw), /Product Manager/);
    assert.equal(afterShare.items.filter((item) => item.phone === MINA).length, 1);

    const optedRun = run(dir, preload, [
      `--from=${MINA}`,
      '--body=yes Founding Engineer',
    ]);
    const opted = readJson(optedRun, 'opt in');
    assert.equal(opted.ok, true);
    assert.equal(opted.suggestedRole, 'Founding Engineer');
    assert.equal(opted.suggestedRoleId, 'role-harbor-eng');
    assert.equal(opted.sent, false);
    assert.equal(opted.liveSms, false);
    assert.equal(opted.pilotBrief, 'Founding Engineer');
    const optedBoard = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
    assert.deepEqual(optedBoard.roles.map((role) => role.id), ['role-harbor-pm', 'role-harbor-eng', 'role-harbor-bill']);
    const minaPilot = (optedBoard.pilots || []).find((row) => row.phone === MINA);
    assert.equal(minaPilot.brief, 'Founding Engineer');
    assert.equal(minaPilot.status, 'opted-in');
    assert.equal(minaPilot.sent, false);
    assert.equal(minaPilot.liveSms, false);
    const optedBlob = `${optedRun.stdout}\n${optedRun.stderr}`;
    assert.equal(optedBlob.includes('puppeteer'), false);
    assert.equal(optedBlob.includes('pilot-logger'), false);
    assert.equal(optedBlob.includes('ERR_MODULE_NOT_FOUND'), false);
    const kept = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
    const minaAfter = kept.items.find((item) => item.phone === MINA);
    assert.equal(minaAfter.raw['full-name'], 'Mina Chen');
    assert.match(String(minaAfter.raw['skills-stack']), /React/);
    assert.equal(kept.items.filter((item) => item.phone === MINA).length, 1);
    assert.equal(fs.existsSync(flag), false);
  });
});
