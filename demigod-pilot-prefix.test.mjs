import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const PILOT_OS = path.join(OPS, 'demigod-pilot-os.mjs');
const EAST = 'pilot-harbor-east';
const WEST = 'pilot-harbor-west';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, PILOT_OS, ...args], {
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
  const pilots = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8')).pilots;
  return Object.fromEntries(pilots.map((row) => [row.id, row.status]));
}

describe('pilot prefix status', { concurrency: 1 }, () => {
  test('an ambiguous prefix does not change either company', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pilot-prefix-'));
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

    fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), `${JSON.stringify({
      at: new Date().toISOString(),
      pilots: [
        { id: EAST, company: 'Harbor East', role: 'Founding Engineer', status: 'shortlist', history: [] },
        { id: WEST, company: 'Harbor West', role: 'Founding Engineer', status: 'shortlist', history: [] },
      ],
    }, null, 2)}\n`);
    const before = fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8');

    const ambiguous = run(dir, preload, ['set', 'pilot-harbor', '--status', 'hired']);
    const ambiguousBody = readJson(ambiguous, 'ambiguous set');
    assert.equal(ambiguous.status, 1);
    assert.equal(ambiguousBody.ok, false);
    assert.equal(ambiguousBody.error, 'ambiguous_id');
    assert.deepEqual(ambiguousBody.matches.sort(), [EAST, WEST]);
    assert.equal(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8'), before);
    assert.deepEqual(statuses(dir), { [EAST]: 'shortlist', [WEST]: 'shortlist' });

    const shown = run(dir, preload, ['show', 'pilot-harbor']);
    const shownBody = readJson(shown, 'ambiguous show');
    assert.equal(shown.status, 1);
    assert.equal(shownBody.error, 'ambiguous_id');
    assert.equal(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8'), before);

    const unique = readJson(run(dir, preload, ['set', 'pilot-harbor-w', '--status', 'intro']), 'unique set');
    assert.equal(unique.ok, true);
    assert.equal(unique.pilot.id, WEST);
    assert.equal(unique.pilot.status, 'intro');
    assert.deepEqual(statuses(dir), { [EAST]: 'shortlist', [WEST]: 'intro' });
    assert.equal(fs.existsSync(flag), false);
  });
});
