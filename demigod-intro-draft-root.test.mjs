import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const DRAFT = path.join(OPS, 'demigod-intro-draft.mjs');
const SHARED = '/tmp/dg-busy/intros';
const SUB = 'sub-harbor';
const REJECTED = 'sub-mina';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, DRAFT, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = res.status === 0 ? res.stdout : res.stderr;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function sharedStamp() {
  if (!fs.existsSync(SHARED)) return null;
  return fs.readdirSync(SHARED).sort();
}

describe('submission intro draft root', { concurrency: 1 }, () => {
  test('a rejected submission writes no intro draft', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-intro-root-'));
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
    const beforeShared = sharedStamp();
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(dir, { recursive: true, force: true });
    });

    fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), `${JSON.stringify({
      at: '2026-09-23T08:00:00.000Z',
      items: [
        {
          id: REJECTED,
          at: '2026-09-23T08:00:00.000Z',
          form: 'engineer-join',
          status: 'rejected',
          raw: { 'full-name': 'Mina Alvarez', 'seeker-email': 'mina.alvarez@baymail.co' },
        },
        {
          id: SUB,
          at: '2026-09-23T08:01:00.000Z',
          form: 'startup-hire',
          status: 'new',
          raw: {
            'company-name': 'Harbor Lane',
            'role-title': 'Founding Engineer',
            'contact-email': 'ada@harbor.example',
            '90day-outcome': 'Ship the billing path',
          },
        },
      ],
    }, null, 2)}\n`);
    const draftDir = path.join(dir, 'DEMIGOD-INTROS');

    const rejected = run(dir, preload, [REJECTED, '--json']);
    const rejectedBody = readJson(rejected, 'rejected submission');
    assert.equal(rejected.status, 1);
    assert.equal(rejectedBody.ok, false);
    assert.equal(rejectedBody.error, 'submission_not_draftable');
    assert.equal(rejectedBody.id, REJECTED);
    assert.equal(rejectedBody.sent, false);
    assert.equal(rejectedBody.liveMail, false);
    assert.equal(fs.existsSync(draftDir), false);
    assert.deepEqual(sharedStamp(), beforeShared);

    const drafted = readJson(run(dir, preload, [SUB, '--json']), 'reviewable submission');
    assert.equal(drafted.ok, true);
    assert.equal(drafted.id, SUB);
    assert.equal(drafted.sent, false);
    assert.equal(drafted.liveMail, false);
    assert.equal(drafted.path, path.join(draftDir, `${SUB}.md`));
    const text = fs.readFileSync(drafted.path, 'utf8');
    assert.equal(text.includes('Harbor Lane'), true);
    assert.equal(text.includes('Founding Engineer'), true);
    assert.equal(text.includes('NOT SENT'), true);
    assert.equal(text.includes('ada@harbor.example'), false);
    assert.deepEqual(sharedStamp(), beforeShared);
    assert.equal(fs.existsSync(flag), false);
  });
});
