import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const TRACKER = path.join(OPS, 'demigod-outreach-tracker.mjs');
const EAST = 'out-harbor-east';
const WEST = 'out-harbor-west';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, TRACKER, ...args], {
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

function statuses(dir) {
  const leads = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-OUTREACH.json'), 'utf8')).leads;
  return Object.fromEntries(leads.map((row) => [row.id, row.status]));
}

describe('outreach prefix status', { concurrency: 1 }, () => {
  test('an ambiguous prefix does not change either lead', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-outreach-prefix-'));
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

    const store = path.join(dir, 'DEMIGOD-OUTREACH.json');
    fs.writeFileSync(store, `${JSON.stringify({
      schema: 1,
      at: '2026-09-23T08:00:00.000Z',
      leads: [
        { id: EAST, name: 'Ada East', company: 'Harbor East', status: 'drafted', history: [] },
        { id: WEST, name: 'Ada West', company: 'Harbor West', status: 'drafted', history: [] },
      ],
    }, null, 2)}\n`);
    const before = fs.readFileSync(store, 'utf8');

    const ambiguous = run(dir, preload, ['set', 'out-harbor', '--status', 'pilot']);
    const ambiguousBody = readJson(ambiguous, 'ambiguous set');
    assert.equal(ambiguous.status, 1);
    assert.equal(ambiguousBody.ok, false);
    assert.equal(ambiguousBody.error, 'ambiguous_id');
    assert.deepEqual(ambiguousBody.matches.sort(), [EAST, WEST]);
    assert.equal(fs.readFileSync(store, 'utf8'), before);
    assert.deepEqual(statuses(dir), { [EAST]: 'drafted', [WEST]: 'drafted' });

    const unique = readJson(run(dir, preload, ['set', 'out-harbor-w', '--status', 'pilot']), 'unique set');
    assert.equal(unique.ok, true);
    assert.equal(unique.lead.id, WEST);
    assert.equal(unique.lead.status, 'pilot');
    assert.deepEqual(statuses(dir), { [EAST]: 'drafted', [WEST]: 'pilot' });
    assert.equal(fs.existsSync(flag), false);
  });
});
