import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const WATCH = path.join(OPS, 'demigod-watch-submits.mjs');
const BUSY_CURSOR = '/tmp/dg-busy/submits-cursor.json';
const BUSY_ALERT = '/tmp/dg-busy/submits-latest.json';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, WATCH, ...args], {
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

function writeInbox(dir, item) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), JSON.stringify({
    at: item.at,
    items: [item],
  }, null, 2));
}

describe('submit watch cursor', { concurrency: 1 }, () => {
  test('a seen mark stays in that data root and does not hide the other inbox', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-watch-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-watch-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const flag = path.join(east, 'fetch-calls.log');
    const preload = path.join(east, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    writeInbox(east, {
      id: 'sub-harbor-east',
      form: 'startup-hire',
      status: 'new',
      at: '2026-09-23T08:00:00.000Z',
      raw: {
        'company-name': 'Harbor East',
        'contact-email': 'ada@harbor.example',
        'role-title': 'Founding Engineer',
        'stack-needs': 'billing service',
      },
    });
    writeInbox(west, {
      id: 'sub-harbor-west',
      form: 'startup-hire',
      status: 'new',
      at: '2026-09-20T08:00:00.000Z',
      raw: {
        'company-name': 'Harbor West',
        'contact-email': 'sam@harbor.example',
        'role-title': 'Founding Engineer',
        'stack-needs': 'billing service',
      },
    });

    const busyCursorBefore = fs.existsSync(BUSY_CURSOR) ? fs.readFileSync(BUSY_CURSOR, 'utf8') : '';
    const busyAlertBefore = fs.existsSync(BUSY_ALERT) ? fs.readFileSync(BUSY_ALERT, 'utf8') : '';

    const marked = readJson(run(east, preload, ['--json', '--mark']), 'mark east');
    assert.equal(marked.freshCount, 1);
    assert.equal(marked.rows[0].id, 'sub-harbor-east');
    assert.equal(marked.rows[0].kind, 'startup');
    assert.equal(marked.marked, true);
    assert.equal(marked.sent, false);
    assert.equal(marked.liveMail, false);
    assert.equal(marked.cursorPath, path.join(east, 'DEMIGOD-SUBMITS-CURSOR.json'));
    const eastCursor = JSON.parse(fs.readFileSync(marked.cursorPath, 'utf8'));
    assert.equal(eastCursor.seenIds['sub-harbor-east'], '2026-09-23T08:00:00.000Z');
    assert.equal(eastCursor.seenIds['sub-harbor-west'], undefined);
    const eastAlert = fs.readFileSync(path.join(east, 'DEMIGOD-SUBMIT-ALERT.md'), 'utf8');
    assert.match(eastAlert, /sub-harbor-east/);
    assert.doesNotMatch(eastAlert, /sub-harbor-west/);

    const other = readJson(run(west, preload, ['--json']), 'west unseen');
    assert.equal(other.freshCount, 1);
    assert.equal(other.rows[0].id, 'sub-harbor-west');
    assert.equal(other.marked, false);
    assert.equal(other.sent, false);
    assert.equal(fs.existsSync(path.join(west, 'DEMIGOD-SUBMITS-CURSOR.json')), false);
    const westAlert = fs.readFileSync(path.join(west, 'DEMIGOD-SUBMIT-ALERT.md'), 'utf8');
    assert.match(westAlert, /sub-harbor-west/);
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-SUBMIT-ALERT.md'), 'utf8'), eastAlert);

    const again = readJson(run(east, preload, ['--json']), 'east already seen');
    assert.equal(again.freshCount, 0);
    assert.equal(again.rows.length, 0);
    assert.equal(again.sent, false);

    const busyCursorAfter = fs.existsSync(BUSY_CURSOR) ? fs.readFileSync(BUSY_CURSOR, 'utf8') : '';
    const busyAlertAfter = fs.existsSync(BUSY_ALERT) ? fs.readFileSync(BUSY_ALERT, 'utf8') : '';
    assert.equal(busyCursorAfter, busyCursorBefore);
    assert.equal(busyAlertAfter, busyAlertBefore);
    assert.equal(busyCursorAfter.includes('sub-harbor-east'), false);
    assert.equal(fs.existsSync(flag), false);
  });
});
