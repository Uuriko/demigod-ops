import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE = path.join(OPS, 'demigod-submit-to-pilot.mjs');
const EAST = 'sub-harbor-east';
const WEST = 'sub-harbor-west';
const TALENT = 'sub-mina';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, BRIDGE, ...args], {
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

function submission(id, form, company, role) {
  return {
    id,
    at: '2026-09-23T08:00:00.000Z',
    form,
    status: 'new',
    raw: {
      'company-name': company,
      'role-title': role,
      'contact-email': 'ada@harbor.example',
      '90day-outcome': 'Ship the billing path',
    },
  };
}

describe('submit to pilot', { concurrency: 1 }, () => {
  test('an ambiguous submission prefix creates no pilot', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-submit-pilot-'));
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

    fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), `${JSON.stringify({
      at: '2026-09-23T08:00:00.000Z',
      items: [
        submission(WEST, 'startup-hire', 'Harbor West', 'Founding Engineer'),
        submission(EAST, 'startup-hire', 'Harbor East', 'Founding Engineer'),
        submission(TALENT, 'engineer-join', 'Mina Alvarez', 'Engineer'),
      ],
    }, null, 2)}\n`);
    const pilotsFile = path.join(dir, 'DEMIGOD-PILOTS.json');

    const talent = run(dir, preload, ['--id', TALENT]);
    const talentBody = readJson(talent, 'talent submission');
    assert.equal(talent.status, 1);
    assert.equal(talentBody.ok, false);
    assert.equal(talentBody.error, 'startup_submission_required');
    assert.equal(talentBody.id, TALENT);
    assert.equal(fs.existsSync(pilotsFile), false);

    const ambiguous = run(dir, preload, ['--id', 'sub-harbor']);
    const ambiguousBody = readJson(ambiguous, 'ambiguous submission');
    assert.equal(ambiguous.status, 1);
    assert.equal(ambiguousBody.ok, false);
    assert.equal(ambiguousBody.error, 'ambiguous_id');
    assert.deepEqual(ambiguousBody.matches.sort(), [EAST, WEST]);
    assert.equal(fs.existsSync(pilotsFile), false);

    const opened = readJson(run(dir, preload, ['--id', 'sub-harbor-e']), 'unique submission');
    assert.equal(opened.ok, true);
    assert.equal(opened.pilot.company, 'Harbor East');
    assert.equal(opened.pilot.role, 'Founding Engineer');
    assert.equal(opened.pilot.source, `submit:${EAST}`);
    const stored = JSON.parse(fs.readFileSync(pilotsFile, 'utf8')).pilots;
    assert.equal(stored.length, 1);
    assert.equal(stored[0].id, opened.pilot.id);
    assert.equal(stored[0].company, 'Harbor East');
    assert.equal(stored[0].source, `submit:${EAST}`);
    assert.equal(fs.existsSync(flag), false);
  });
});
