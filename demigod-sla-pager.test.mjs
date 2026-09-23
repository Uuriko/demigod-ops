import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const PAGER = path.join(OPS, 'demigod-sla-pager.mjs');
const CHECKOUT_INBOX = path.join(OPS, 'DEMIGOD-SUBMISSIONS-INBOX.json');
const CHECKOUT_BADGE = path.join(OPS, 'public', 'sla-badge.json');

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, PAGER, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      SLACK_WEBHOOK_URL: 'https://hooks.slack.example/services/local-sla',
      DEMIGOD_SLACK_WEBHOOK: 'https://hooks.slack.example/services/local-sla',
    },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = res.status === 0 ? res.stdout : res.stderr;
  const line = String(raw || '').trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function writeInbox(dir, items) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), JSON.stringify({ items }, null, 2));
}

describe('reply SLA check', { concurrency: 1 }, () => {
  test('a breached row stays in that inbox and Slack is not called', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sla-pager-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sla-pager-west-'));
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

    const freshAt = new Date().toISOString();
    writeInbox(east, [
      {
        id: 'sub-harbor-east',
        form: 'startup-hire',
        status: 'new',
        at: '2026-09-20T08:00:00.000Z',
        raw: { 'contact-email': 'ada@harbor.example', 'company-name': 'Harbor East' },
      },
      {
        id: 'sub-harbor-fresh',
        form: 'startup-hire',
        status: 'new',
        at: freshAt,
        raw: { 'contact-email': 'ada@harbor.example', 'company-name': 'Harbor East' },
      },
      {
        id: 'sub-harbor-replied',
        form: 'startup-hire',
        status: 'replied',
        at: '2026-09-20T08:00:00.000Z',
        repliedAt: '2026-09-21T08:00:00.000Z',
        raw: { 'contact-email': 'ada@harbor.example', 'company-name': 'Harbor East' },
      },
    ]);
    writeInbox(west, [
      {
        id: 'sub-harbor-west',
        form: 'engineer-join',
        status: 'new',
        at: '2026-09-19T08:00:00.000Z',
        raw: { 'seeker-email': 'sam@harbor.example' },
      },
    ]);
    const eastInboxBefore = fs.readFileSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8');
    const westInboxBefore = fs.readFileSync(path.join(west, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8');
    const checkoutInboxBefore = fs.existsSync(CHECKOUT_INBOX) ? fs.readFileSync(CHECKOUT_INBOX, 'utf8') : null;
    const checkoutBadgeBefore = fs.existsSync(CHECKOUT_BADGE) ? fs.readFileSync(CHECKOUT_BADGE, 'utf8') : null;

    const injected = run(east, preload, ['--test']);
    const refused = readJson(injected, 'inject refused');
    assert.equal(injected.status, 1);
    assert.equal(refused.ok, false);
    assert.equal(refused.error, 'inject_refused');
    assert.equal(refused.liveSlack, false);
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'), eastInboxBefore);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SLA-STATE.json')), false);

    const watched = readJson(run(east, preload, ['--watch']), 'watch refused');
    assert.equal(watched.ok, false);
    assert.equal(watched.error, 'watch_refused');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SLA-STATE.json')), false);

    const eastRun = run(east, preload, ['--tick']);
    assert.equal(eastRun.status, 1);
    const eastReport = readJson(eastRun, 'east tick');
    assert.equal(eastReport.ok, false);
    assert.equal(eastReport.breachedCount, 1);
    assert.deepEqual(eastReport.breachedIds, ['sub-harbor-east']);
    assert.deepEqual(eastReport.openIds.sort(), ['sub-harbor-east', 'sub-harbor-fresh']);
    assert.equal(eastReport.historyCount, 1);
    assert.equal(eastReport.report, path.join(east, 'DEMIGOD-SLA-DASHBOARD.json'));
    assert.equal(eastReport.sent, false);
    assert.equal(eastReport.liveMail, false);
    assert.equal(eastReport.liveSlack, false);
    const eastFile = fs.readFileSync(eastReport.report, 'utf8');
    assert.match(eastFile, /sub-harbor-east/);
    assert.doesNotMatch(eastFile, /sub-harbor-west/);
    const eastState = fs.readFileSync(eastReport.statePath, 'utf8');

    const westRun = run(west, preload, ['--tick']);
    const westReport = readJson(westRun, 'west tick');
    assert.deepEqual(westReport.breachedIds, ['sub-harbor-west']);
    assert.equal(westReport.report, path.join(west, 'DEMIGOD-SLA-DASHBOARD.json'));
    assert.equal(fs.readFileSync(eastReport.statePath, 'utf8'), eastState);
    assert.equal(fs.readFileSync(path.join(west, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'), westInboxBefore);

    const missing = readJson(run(east, preload, ['--reply', 'sub-harbor-west']), 'reply other inbox');
    assert.equal(missing.ok, false);
    assert.equal(missing.error, 'not_found');
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'), eastInboxBefore);

    const replied = readJson(run(east, preload, ['--reply', 'sub-harbor-fresh']), 'reply fresh');
    assert.equal(replied.ok, true);
    assert.equal(replied.openIds.includes('sub-harbor-fresh'), false);
    assert.equal(replied.breachedIds.includes('sub-harbor-east'), true);
    const eastInbox = JSON.parse(fs.readFileSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'));
    assert.equal(eastInbox.items.find((item) => item.id === 'sub-harbor-fresh').status, 'replied');
    assert.equal(eastInbox.items.find((item) => item.id === 'sub-harbor-east').status, 'new');
    assert.equal(fs.readFileSync(path.join(west, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'), westInboxBefore);

    const combined = `${injected.stdout}\n${injected.stderr}\n${eastRun.stdout}\n${eastRun.stderr}\n${westRun.stdout}\n${westRun.stderr}`;
    assert.equal(combined.includes('hooks.slack'), false);
    assert.equal(combined.includes('puppeteer'), false);
    assert.equal(combined.includes('turn-lib'), false);
    assert.equal(combined.includes('ERR_MODULE_NOT_FOUND'), false);
    assert.equal(fs.existsSync(flag), false);
    assert.equal(fs.existsSync(path.join(east, 'public', 'sla-badge.json')), false);
    assert.equal(fs.existsSync(CHECKOUT_INBOX) ? fs.readFileSync(CHECKOUT_INBOX, 'utf8') : null, checkoutInboxBefore);
    assert.equal(fs.existsSync(CHECKOUT_BADGE) ? fs.readFileSync(CHECKOUT_BADGE, 'utf8') : null, checkoutBadgeBefore);
  });
});