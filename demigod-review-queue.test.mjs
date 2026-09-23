import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const REVIEW = path.join(OPS, 'demigod-match-review.mjs');
const BUSY_REPORT = '/tmp/dg-busy/match-review-latest.json';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, REVIEW, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = String(res.status === 0 ? res.stdout : res.stderr || '').trim();
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const line = raw.split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
    try {
      parsed = JSON.parse(line || '');
    } catch {
      parsed = null;
    }
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function pairState(dir, id) {
  const store = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PAIRS.json'), 'utf8'));
  return store.pairs[id].state;
}

describe('match review queue', { concurrency: 1 }, () => {
  test('a review of one pair stays in the data root and leaves the other pair proposed', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-review-queue-'));
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

    fs.writeFileSync(path.join(dir, 'DEMIGOD-PAIRS.json'), JSON.stringify({
      pairs: {
        'pair-harbor-east': {
          pairId: 'pair-harbor-east',
          roleId: 'role-harbor-east',
          candId: 'cand-mina',
          state: 'proposed',
          sample: false,
        },
        'pair-harbor-west': {
          pairId: 'pair-harbor-west',
          roleId: 'role-harbor-west',
          candId: 'cand-sam',
          state: 'proposed',
          sample: false,
        },
      },
    }, null, 2));
    const busyBefore = fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '';

    const listed = readJson(run(dir, preload, ['--json']), 'list queue');
    assert.equal(listed.sent, false);
    assert.equal(listed.liveMail, false);
    assert.equal(listed.report, path.join(dir, 'DEMIGOD-MATCH-REVIEW.json'));
    assert.equal(listed.pairs.some((row) => row.pairId === 'pair-harbor-east' && row.state === 'proposed'), true);
    assert.equal(listed.pairs.some((row) => row.pairId === 'pair-harbor-west' && row.state === 'proposed'), true);
    const saved = JSON.parse(fs.readFileSync(listed.report, 'utf8'));
    assert.equal(saved.pairs.some((row) => row.pairId === 'pair-harbor-east'), true);
    assert.equal(saved.pairs.some((row) => row.pairId === 'pair-harbor-west'), true);

    const ambiguous = readJson(run(dir, preload, ['review', 'pair-harbor', '--decision', 'reject']), 'shared prefix');
    assert.equal(ambiguous.ok, false);
    assert.equal(ambiguous.sent, false);
    assert.equal(ambiguous.liveMail, false);
    assert.equal(pairState(dir, 'pair-harbor-east'), 'proposed');
    assert.equal(pairState(dir, 'pair-harbor-west'), 'proposed');

    const rejected = readJson(run(dir, preload, ['review', 'pair-harbor-east', '--decision', 'reject']), 'reject east');
    assert.equal(rejected.ok, true);
    assert.equal(rejected.pair.pairId, 'pair-harbor-east');
    assert.equal(rejected.pair.state, 'rejected');
    assert.equal(rejected.sent, false);
    assert.equal(rejected.liveMail, false);
    assert.equal(pairState(dir, 'pair-harbor-east'), 'rejected');
    assert.equal(pairState(dir, 'pair-harbor-west'), 'proposed');

    const busyAfter = fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '';
    assert.equal(busyAfter, busyBefore);
    assert.equal(busyAfter.includes('pair-harbor-east'), false);
    assert.equal(fs.existsSync(flag), false);
  });
});
