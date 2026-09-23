import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const PROPOSE = path.join(OPS, 'demigod-auto-propose.mjs');
const BUSY_REPORT = '/tmp/dg-busy/auto-propose-latest.json';

function run(dir, preload) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, PROPOSE, '--json'], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const line = String(res.stdout || '').trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

describe('auto-propose report', { concurrency: 1 }, () => {
  test('a scored pair stays in the data root and is not written for the other role', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-auto-propose-'));
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

    fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({
      roles: [
        {
          id: 'role-harbor-eng',
          title: 'Founding Engineer',
          company: 'Harbor West',
          skills: 'react billing node typescript systems',
          status: 'Active',
          stageType: 'Seed',
          comp: '$180-220k',
        },
        {
          id: 'role-harbor-pm',
          title: 'Product Manager',
          company: 'Harbor East',
          skills: 'product gtm',
          status: 'Active',
          stageType: 'Seed',
          comp: '$90-110k',
        },
      ],
    }, null, 2));
    fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), JSON.stringify({
      items: [{
        id: 'cand-mina',
        form: 'engineer-join',
        status: 'new',
        raw: {
          'full-name': 'Mina Chen',
          'seeker-email': 'mina@harbor.example',
          'skills-stack': 'react billing node typescript systems',
          'sf-bay': 'sf',
          experience: 'shipped a billing service',
          'why-this-role': 'I want to build the billing service for a seed company',
          'salary-range': '$180k',
        },
      }],
    }, null, 2));

    const busyBefore = fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '';
    const proposed = readJson(run(dir, preload), 'auto-propose');
    assert.equal(proposed.livePublish, false);
    assert.equal(proposed.sent, false);
    assert.equal(proposed.report, path.join(dir, 'DEMIGOD-AUTO-PROPOSE.json'));
    assert.equal(proposed.proposed.filter((row) => row.roleId === 'role-harbor-eng' && row.candId === 'cand-mina').length, 1);
    assert.equal(proposed.proposed.some((row) => row.roleId === 'role-harbor-pm'), false);

    const report = JSON.parse(fs.readFileSync(proposed.report, 'utf8'));
    assert.equal(report.proposed.some((row) => row.roleId === 'role-harbor-eng' && row.candId === 'cand-mina'), true);
    assert.equal(report.proposed.some((row) => row.roleId === 'role-harbor-pm'), false);
    assert.equal(report.report.startsWith(dir), true);

    const pairs = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PAIRS.json'), 'utf8'));
    const rows = Object.values(pairs.pairs || {});
    assert.equal(rows.some((row) => row.roleId === 'role-harbor-eng' && row.candId === 'cand-mina'), true);
    assert.equal(rows.some((row) => row.roleId === 'role-harbor-pm'), false);

    const busyAfter = fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '';
    assert.equal(busyAfter, busyBefore);
    assert.equal(busyAfter.includes('role-harbor-eng'), false);
    assert.equal(fs.existsSync(flag), false);
  });
});
