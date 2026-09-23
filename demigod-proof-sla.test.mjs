import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const SLA = path.join(OPS, 'demigod-proof-sla.mjs');
const CHECKOUT_BOARD = path.join(OPS, 'DEMIGOD-BOARD.json');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-SLA-PROOF.json');

function run(dir, preload) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, SLA, '--json'], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      SLACK_WEBHOOK_URL: 'https://hooks.slack.example/services/local-proof',
      DEMIGOD_SLACK_WEBHOOK: 'https://hooks.slack.example/services/local-proof',
    },
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

function writeBoard(dir, pilots) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({ pilots }, null, 2));
}

describe('pilot SLA proof', { concurrency: 1 }, () => {
  test('an overdue pilot stays in that data root and Slack is not called', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sla-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sla-west-'));
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

    const soon = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
    writeBoard(east, [
      {
        id: 'pilot-harbor-east',
        email: 'ada@harbor.example',
        status: 'briefed',
        slaDue: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'pilot-harbor-soon',
        email: 'soon@harbor.example',
        status: 'matched',
        slaDue: soon,
      },
      {
        id: 'pilot-harbor-closed',
        email: 'closed@harbor.example',
        status: 'churned',
        slaDue: '2026-09-01T00:00:00.000Z',
      },
    ]);
    writeBoard(west, [
      {
        id: 'pilot-harbor-west',
        email: 'sam@harbor.example',
        status: 'intros-sent',
        slaDue: '2026-09-02T00:00:00.000Z',
      },
    ]);
    const eastBoardBefore = fs.readFileSync(path.join(east, 'DEMIGOD-BOARD.json'), 'utf8');
    const westBoardBefore = fs.readFileSync(path.join(west, 'DEMIGOD-BOARD.json'), 'utf8');
    const checkoutBoardBefore = fs.existsSync(CHECKOUT_BOARD) ? fs.readFileSync(CHECKOUT_BOARD, 'utf8') : null;
    const checkoutReportBefore = fs.existsSync(CHECKOUT_REPORT) ? fs.readFileSync(CHECKOUT_REPORT, 'utf8') : null;

    const eastRun = run(east, preload);
    assert.equal(eastRun.status, 1);
    const eastReport = readJson(eastRun, 'east sla');
    assert.equal(eastReport.ok, false);
    assert.equal(eastReport.overdue, 1);
    assert.equal(eastReport.dueSoon, 1);
    assert.deepEqual(eastReport.overduePilots.map((pilot) => pilot.id), ['pilot-harbor-east']);
    assert.deepEqual(eastReport.dueSoonPilots.map((pilot) => pilot.id), ['pilot-harbor-soon']);
    assert.equal(eastReport.report, path.join(east, 'DEMIGOD-SLA-PROOF.json'));
    assert.equal(eastReport.sent, false);
    assert.equal(eastReport.liveMail, false);
    assert.equal(eastReport.liveSlack, false);
    const eastFile = fs.readFileSync(eastReport.report, 'utf8');
    assert.match(eastFile, /pilot-harbor-east/);
    assert.match(eastFile, /pilot-harbor-soon/);
    assert.doesNotMatch(eastFile, /pilot-harbor-west/);
    assert.doesNotMatch(eastFile, /pilot-harbor-closed/);
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-BOARD.json'), 'utf8'), eastBoardBefore);

    const westRun = run(west, preload);
    assert.equal(westRun.status, 1);
    const westReport = readJson(westRun, 'west sla');
    assert.equal(westReport.overdue, 1);
    assert.deepEqual(westReport.overduePilots.map((pilot) => pilot.id), ['pilot-harbor-west']);
    assert.equal(westReport.report, path.join(west, 'DEMIGOD-SLA-PROOF.json'));
    assert.equal(westReport.liveSlack, false);
    const westFile = fs.readFileSync(westReport.report, 'utf8');
    assert.match(westFile, /pilot-harbor-west/);
    assert.doesNotMatch(westFile, /pilot-harbor-east/);
    assert.equal(fs.readFileSync(eastReport.report, 'utf8'), eastFile);
    assert.equal(fs.readFileSync(path.join(west, 'DEMIGOD-BOARD.json'), 'utf8'), westBoardBefore);

    const combined = `${eastRun.stdout}\n${eastRun.stderr}\n${westRun.stdout}\n${westRun.stderr}`;
    assert.equal(combined.includes('hooks.slack'), false);
    assert.equal(combined.includes('fetch'), false);
    assert.equal(fs.existsSync(flag), false);
    assert.equal(fs.existsSync(CHECKOUT_BOARD) ? fs.readFileSync(CHECKOUT_BOARD, 'utf8') : null, checkoutBoardBefore);
    assert.equal(fs.existsSync(CHECKOUT_REPORT) ? fs.readFileSync(CHECKOUT_REPORT, 'utf8') : null, checkoutReportBefore);
  });
});