import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const TRIAGE = path.join(OPS, 'demigod-submissions-triage.mjs');
const CHECKOUT_INBOX = path.join(OPS, 'DEMIGOD-SUBMISSIONS-INBOX.json');
const CHECKOUT_SUMMARY = path.join(OPS, 'DEMIGOD-INBOX-TRIAGE.json');

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, TRIAGE, ...args], {
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

function statusOf(dir, id) {
  const inbox = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'));
  return inbox.items.find((item) => item.id === id).status;
}

function writeInbox(dir, items) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), JSON.stringify({ items }, null, 2));
}

describe('inbox triage', { concurrency: 1 }, () => {
  test('a smoke row in one inbox is marked spam and the other inbox stays new', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-triage-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-triage-west-'));
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

    writeInbox(east, [
      {
        id: 'sub-harbor-smoke',
        form: 'startup-hire',
        status: 'new',
        raw: {
          'contact-email': 'smoke-startup+east@harbor.example',
          'company-name': 'Harbor East',
          'role-title': 'Founding Engineer',
        },
      },
      {
        id: 'sub-harbor-east',
        form: 'startup-hire',
        status: 'new',
        raw: {
          'contact-email': 'ada@harbor.example',
          'company-name': 'Harbor East',
          'role-title': 'Founding Engineer',
        },
      },
    ]);
    writeInbox(west, [
      {
        id: 'sub-harbor-west',
        form: 'startup-hire',
        status: 'new',
        raw: {
          'contact-email': 'sam@harbor.example',
          'company-name': 'Harbor West',
          'role-title': 'Founding Engineer',
        },
      },
    ]);
    const eastBefore = fs.readFileSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8');
    const westBefore = fs.readFileSync(path.join(west, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8');
    const checkoutInboxBefore = fs.existsSync(CHECKOUT_INBOX) ? fs.readFileSync(CHECKOUT_INBOX, 'utf8') : null;
    const checkoutSummaryBefore = fs.existsSync(CHECKOUT_SUMMARY) ? fs.readFileSync(CHECKOUT_SUMMARY, 'utf8') : null;

    const dry = run(east, preload, ['--dry-run']);
    const dryBody = readJson(dry, 'dry run');
    assert.equal(dry.status, 0);
    assert.equal(dryBody.dryRun, true);
    assert.deepEqual(dryBody.markedIds, ['sub-harbor-smoke']);
    assert.equal(dryBody.keptNew, 1);
    assert.equal(dryBody.kept[0].id, 'sub-harbor-east');
    assert.equal(dryBody.report, path.join(east, 'DEMIGOD-INBOX-TRIAGE.json'));
    assert.equal(dryBody.sent, false);
    assert.equal(dryBody.liveMail, false);
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'), eastBefore);
    assert.equal(statusOf(east, 'sub-harbor-smoke'), 'new');

    const eastRun = run(east, preload, []);
    const eastBody = readJson(eastRun, 'east triage');
    assert.equal(eastRun.status, 0);
    assert.equal(eastBody.dryRun, false);
    assert.deepEqual(eastBody.markedIds, ['sub-harbor-smoke']);
    assert.equal(eastBody.details[0].reason, 'intake_smoke_probe');
    assert.equal(eastBody.sent, false);
    assert.equal(eastBody.liveMail, false);
    assert.equal(statusOf(east, 'sub-harbor-smoke'), 'spam');
    assert.equal(statusOf(east, 'sub-harbor-east'), 'new');
    const eastFile = fs.readFileSync(eastBody.report, 'utf8');
    assert.match(eastFile, /sub-harbor-smoke/);
    assert.doesNotMatch(eastFile, /sub-harbor-west/);
    assert.equal(fs.readFileSync(path.join(west, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'), westBefore);
    assert.equal(statusOf(west, 'sub-harbor-west'), 'new');

    const westRun = run(west, preload, []);
    const westBody = readJson(westRun, 'west triage');
    assert.equal(westBody.marked, 0);
    assert.equal(westBody.keptNew, 1);
    assert.equal(westBody.kept[0].id, 'sub-harbor-west');
    assert.equal(westBody.report, path.join(west, 'DEMIGOD-INBOX-TRIAGE.json'));
    const westFile = fs.readFileSync(westBody.report, 'utf8');
    assert.match(westFile, /sub-harbor-west/);
    assert.doesNotMatch(westFile, /sub-harbor-smoke/);
    assert.equal(fs.readFileSync(eastBody.report, 'utf8'), eastFile);
    assert.equal(statusOf(east, 'sub-harbor-smoke'), 'spam');
    assert.equal(statusOf(west, 'sub-harbor-west'), 'new');

    const combined = `${dry.stdout}\n${dry.stderr}\n${eastRun.stdout}\n${eastRun.stderr}\n${westRun.stdout}\n${westRun.stderr}`;
    assert.equal(combined.includes('puppeteer'), false);
    assert.equal(combined.includes('turn-lib'), false);
    assert.equal(combined.includes('ERR_MODULE_NOT_FOUND'), false);
    assert.equal(fs.existsSync(flag), false);
    assert.equal(fs.existsSync(CHECKOUT_INBOX) ? fs.readFileSync(CHECKOUT_INBOX, 'utf8') : null, checkoutInboxBefore);
    assert.equal(fs.existsSync(CHECKOUT_SUMMARY) ? fs.readFileSync(CHECKOUT_SUMMARY, 'utf8') : null, checkoutSummaryBefore);
  });
});