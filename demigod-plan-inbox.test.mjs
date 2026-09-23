import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const INBOX = path.join(OPS, 'demigod-plan-inbox.mjs');
const SHARED_MULTI = '/tmp/dg-multi';
const BUSY_CURSOR = '/tmp/dg-busy/plan-inbox-cursor.json';
const BUSY_REPORT = '/tmp/dg-busy/plan-inbox-latest.json';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, INBOX, ...args], {
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

function listing(dir) {
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir).sort().join('\n');
}

function writeDrop(dir, name, body) {
  const drop = path.join(dir, 'DEMIGOD-PLAN-DROPS');
  fs.mkdirSync(drop, { recursive: true });
  fs.writeFileSync(path.join(drop, name), body);
}

describe('plan inbox', { concurrency: 1 }, () => {
  test('marking one root read does not hide the other root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-plan-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-plan-west-'));
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

    const eastNote = 'Harbor East founding engineer plan for the billing service and a 90 day outcome.';
    const eastOther = 'Harbor East second plan covering the platform billing service and follow-up.';
    const westNote = 'Harbor West founding engineer plan for the portfolio intros and a 90 day outcome.';
    writeDrop(east, 'harbor-east-plan.txt', eastNote);
    writeDrop(east, 'harbor-east-other.txt', eastOther);
    writeDrop(west, 'harbor-west-plan.txt', westNote);
    const sharedBefore = listing(SHARED_MULTI);
    const busyCursorBefore = fs.existsSync(BUSY_CURSOR) ? fs.readFileSync(BUSY_CURSOR, 'utf8') : '';
    const busyReportBefore = fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '';

    const listed = readJson(run(east, preload, ['--json']), 'east list');
    assert.equal(listed.unreadCount, 2);
    assert.deepEqual(listed.unread.map((row) => row.name).sort(), ['harbor-east-other.txt', 'harbor-east-plan.txt']);
    assert.equal(listed.report, path.join(east, 'DEMIGOD-PLAN-INBOX.json'));
    assert.equal(listed.sent, false);
    assert.equal(listed.liveMail, false);
    assert.equal(listed.unread.some((row) => row.name === 'harbor-west-plan.txt'), false);

    const marked = readJson(run(east, preload, ['--json', '--mark', 'harbor-east-plan.txt']), 'east mark');
    assert.equal(marked.markedOne, 'harbor-east-plan.txt');
    assert.equal(marked.unreadCount, 1);
    assert.equal(marked.unread[0].name, 'harbor-east-other.txt');
    assert.equal(marked.cursorPath, path.join(east, 'DEMIGOD-PLAN-CURSOR.json'));
    const eastCursor = JSON.parse(fs.readFileSync(marked.cursorPath, 'utf8'));
    assert.equal(typeof eastCursor.seen['harbor-east-plan.txt'], 'string');
    assert.equal(eastCursor.seen['harbor-west-plan.txt'], undefined);
    const eastReport = fs.readFileSync(marked.report, 'utf8');
    assert.match(eastReport, /harbor-east-other\.txt/);
    assert.doesNotMatch(eastReport, /harbor-west-plan\.txt/);

    const westListed = readJson(run(west, preload, ['--json']), 'west list');
    assert.equal(westListed.unreadCount, 1);
    assert.equal(westListed.unread[0].name, 'harbor-west-plan.txt');
    assert.equal(westListed.report, path.join(west, 'DEMIGOD-PLAN-INBOX.json'));
    assert.equal(fs.existsSync(path.join(west, 'DEMIGOD-PLAN-CURSOR.json')), false);
    assert.equal(fs.readFileSync(marked.report, 'utf8'), eastReport);
    const westReport = fs.readFileSync(westListed.report, 'utf8');
    assert.match(westReport, /harbor-west-plan\.txt/);
    assert.doesNotMatch(westReport, /harbor-east-plan\.txt/);

    assert.equal(listing(SHARED_MULTI), sharedBefore);
    assert.equal(fs.existsSync(BUSY_CURSOR) ? fs.readFileSync(BUSY_CURSOR, 'utf8') : '', busyCursorBefore);
    assert.equal(fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '', busyReportBefore);
    assert.equal(busyReportBefore.includes('harbor-east-plan.txt'), false);
    assert.equal(fs.existsSync(flag), false);
  });
});