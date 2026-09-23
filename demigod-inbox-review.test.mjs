import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const INBOX_CLI = path.join(OPS, 'demigod-submissions-inbox.mjs');
const SUB = 'sub-harbor';
const SHARED = '/tmp/dg-busy/submissions-inbox-latest.json';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, INBOX_CLI, ...args], {
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

describe('inbox review mark', { concurrency: 1 }, () => {
  test('a missing id does not mark another submission reviewed', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-inbox-review-'));
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

    const inboxFile = path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json');
    fs.writeFileSync(inboxFile, `${JSON.stringify({
      at: '2026-09-23T08:00:00.000Z',
      items: [{
        id: SUB,
        at: '2026-09-23T08:00:00.000Z',
        form: 'startup-hire',
        status: 'new',
        raw: {
          'company-name': 'Harbor Lane',
          'role-title': 'Founding Engineer',
          'contact-email': 'ada@harbor.example',
        },
      }],
    }, null, 2)}\n`);
    const before = fs.readFileSync(inboxFile, 'utf8');
    const reportFile = path.join(dir, 'DEMIGOD-INBOX-REPORT.json');

    const missing = run(dir, preload, ['--mark-reviewed=sub-missing', '--json']);
    const missingBody = readJson(missing, 'missing submission');
    assert.equal(missing.status, 1);
    assert.equal(missingBody.ok, false);
    assert.equal(missingBody.error, 'not_found');
    assert.equal(fs.readFileSync(inboxFile, 'utf8'), before);
    assert.equal(fs.existsSync(reportFile), false);

    const reviewed = run(dir, preload, [`--mark-reviewed=${SUB}`, '--json']);
    assert.equal(reviewed.status, 0, reviewed.stderr || reviewed.stdout);
    const stored = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
    assert.equal(stored.items[0].id, SUB);
    assert.equal(stored.items[0].status, 'reviewed');
    assert.equal(typeof stored.items[0].reviewedAt, 'string');
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const row = report.rows.find((item) => item.id === SUB);
    assert.equal(row.status, 'reviewed');
    assert.equal(row.kind, 'startup');
    assert.deepEqual(sharedStamp(), beforeShared);
    assert.equal(fs.existsSync(flag), false);
  });
});
