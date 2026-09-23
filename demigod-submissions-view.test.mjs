import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const VIEW = path.join(OPS, 'demigod-submissions-view.mjs');
const CHECKOUT_INTAKE = path.join(OPS, 'DEMIGOD-WIZ-INTAKE.jsonl');
const CHECKOUT_INBOX = path.join(OPS, 'DEMIGOD-SUBMISSIONS-INBOX.json');
const CHECKOUT_VIEW = path.join(OPS, 'DEMIGOD-SUBMISSIONS-VIEW.json');

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, VIEW, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
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

function writeInbox(dir, item) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), JSON.stringify({
    items: [item],
  }, null, 2));
}

describe('submissions inbox view', { concurrency: 1 }, () => {
  test('a view shows that inbox and does not invent a founder', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-view-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-view-west-'));
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

    const checkoutIntakeBefore = fs.existsSync(CHECKOUT_INTAKE) ? fs.readFileSync(CHECKOUT_INTAKE, 'utf8') : null;
    const checkoutInboxBefore = fs.existsSync(CHECKOUT_INBOX) ? fs.readFileSync(CHECKOUT_INBOX, 'utf8') : null;
    const checkoutViewBefore = fs.existsSync(CHECKOUT_VIEW) ? fs.readFileSync(CHECKOUT_VIEW, 'utf8') : null;

    const refused = run(east, preload, ['--json', '--log-pilot']);
    const refusal = readJson(refused, 'pilot log refused');
    assert.equal(refused.status, 1);
    assert.equal(refusal.ok, false);
    assert.equal(refusal.error, 'pilot_log_refused');
    assert.equal(refusal.loggedPilot, false);
    assert.equal(refusal.wroteIntake, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-WIZ-INTAKE.jsonl')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMISSIONS-VIEW.json')), false);

    writeInbox(east, {
      id: 'sub-harbor-east',
      form: 'startup-hire',
      status: 'new',
      at: '2026-09-23T08:00:00.000Z',
      raw: {
        'company-name': 'Harbor East',
        'role-title': 'Founding Engineer',
        'contact-email': 'ada@harbor.example',
      },
    });
    writeInbox(west, {
      id: 'sub-harbor-west',
      form: 'engineer-join',
      status: 'new',
      at: '2026-09-20T08:00:00.000Z',
      raw: {
        'seeker-email': 'sam@harbor.example',
        'skills-stack': 'React',
      },
    });
    const eastInboxBefore = fs.readFileSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8');
    const westInboxBefore = fs.readFileSync(path.join(west, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8');

    const eastRun = run(east, preload, ['--json']);
    const eastView = readJson(eastRun, 'east view');
    assert.equal(eastRun.status, 0);
    assert.equal(eastView.ok, true);
    assert.equal(eastView.count, 1);
    assert.equal(eastView.rows[0].id, 'sub-harbor-east');
    assert.equal(eastView.rows[0].email, 'ada@harbor.example');
    assert.equal(eastView.rows[0].company, 'Harbor East');
    assert.equal(eastView.rows[0].brief, 'Founding Engineer');
    assert.equal(eastView.wroteIntake, false);
    assert.equal(eastView.loggedPilot, false);
    assert.equal(eastView.sent, false);
    assert.equal(eastView.liveMail, false);
    assert.equal(eastView.report, path.join(east, 'DEMIGOD-SUBMISSIONS-VIEW.json'));
    const eastFile = fs.readFileSync(eastView.report, 'utf8');
    assert.match(eastFile, /sub-harbor-east/);
    assert.match(eastFile, /ada@harbor\.example/);
    assert.doesNotMatch(eastFile, /sub-harbor-west/);
    assert.doesNotMatch(eastFile, /sam@harbor\.example/);
    assert.doesNotMatch(eastFile, /pm@seed\.co/);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-WIZ-INTAKE.jsonl')), false);
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'), eastInboxBefore);

    const westRun = run(west, preload, ['--json']);
    const westView = readJson(westRun, 'west view');
    assert.equal(westView.count, 1);
    assert.equal(westView.rows[0].id, 'sub-harbor-west');
    assert.equal(westView.rows[0].email, 'sam@harbor.example');
    assert.equal(westView.report, path.join(west, 'DEMIGOD-SUBMISSIONS-VIEW.json'));
    const westFile = fs.readFileSync(westView.report, 'utf8');
    assert.match(westFile, /sub-harbor-west/);
    assert.doesNotMatch(westFile, /sub-harbor-east/);
    assert.doesNotMatch(westFile, /pm@seed\.co/);
    assert.equal(fs.readFileSync(eastView.report, 'utf8'), eastFile);
    assert.equal(fs.readFileSync(path.join(west, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'), westInboxBefore);
    assert.equal(fs.existsSync(path.join(west, 'DEMIGOD-WIZ-INTAKE.jsonl')), false);

    const combined = `${eastRun.stdout}\n${eastRun.stderr}\n${westRun.stdout}\n${westRun.stderr}`;
    assert.equal(combined.includes('pm@seed.co'), false);
    assert.equal(combined.includes('vague@co.com'), false);
    assert.equal(combined.includes('designer@seed.co'), false);
    assert.equal(combined.includes('intake-from-wiz'), false);
    assert.equal(combined.includes('puppeteer'), false);
    assert.equal(fs.existsSync(flag), false);
    assert.equal(fs.existsSync(CHECKOUT_INTAKE) ? fs.readFileSync(CHECKOUT_INTAKE, 'utf8') : null, checkoutIntakeBefore);
    assert.equal(fs.existsSync(CHECKOUT_INBOX) ? fs.readFileSync(CHECKOUT_INBOX, 'utf8') : null, checkoutInboxBefore);
    assert.equal(fs.existsSync(CHECKOUT_VIEW) ? fs.readFileSync(CHECKOUT_VIEW, 'utf8') : null, checkoutViewBefore);
  });
});
