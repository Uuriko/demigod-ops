import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const GENERATOR = path.join(OPS, 'demigod-intro-generator.mjs');
const SHARED = '/tmp/intro-draft.txt';
const ROLE = 'role-harbor';
const CAND = 'cand-mina';
const TITLE = 'Founding Engineer';
const SUMMARY = 'Shipped a billing service';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, GENERATOR, ...args], {
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
  const stat = fs.statSync(SHARED);
  return { size: stat.size, mtimeMs: stat.mtimeMs };
}

describe('intro draft names', { concurrency: 1 }, () => {
  test('a missing candidate writes no intro draft', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-intro-draft-'));
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

    fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), `${JSON.stringify({
      at: '2026-09-23T08:00:00.000Z',
      roles: [{ id: ROLE, title: TITLE, skills: 'billing', comp: '$180-220k' }],
      candidates: [{ id: CAND, summary: SUMMARY, tags: ['billing'] }],
    }, null, 2)}\n`);
    const draftDir = path.join(dir, 'DEMIGOD-INTROS');

    const missing = run(dir, preload, [`--role-id=${ROLE}`, '--cand-id=cand-missing']);
    const missingBody = readJson(missing, 'missing candidate');
    assert.equal(missing.status, 1);
    assert.equal(missingBody.ok, false);
    assert.equal(missingBody.error, 'candidate_not_found');
    assert.equal(missingBody.sent, false);
    assert.equal(missingBody.liveMail, false);
    assert.equal(fs.existsSync(draftDir), false);
    assert.deepEqual(sharedStamp(), beforeShared);

    const drafted = readJson(run(dir, preload, [`--role-id=${ROLE}`, `--cand-id=${CAND}`]), 'named pair');
    assert.equal(drafted.ok, true);
    assert.equal(drafted.sent, false);
    assert.equal(drafted.liveMail, false);
    assert.equal(drafted.roleId, ROLE);
    assert.equal(drafted.candId, CAND);
    assert.equal(drafted.path, path.join(draftDir, `${ROLE}-${CAND}.md`));
    const text = fs.readFileSync(drafted.path, 'utf8');
    assert.equal(text.includes(TITLE), true);
    assert.equal(text.includes(SUMMARY), true);
    assert.equal(text.includes('Cand summary'), false);
    assert.equal(text.includes('This draft was not mailed.'), true);
    assert.deepEqual(sharedStamp(), beforeShared);
    assert.equal(fs.existsSync(flag), false);
  });
});
