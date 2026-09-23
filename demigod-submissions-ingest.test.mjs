import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const INGEST = path.join(OPS, 'demigod-submissions-ingest.mjs');
const CHECKOUT_INBOX = path.join(OPS, 'DEMIGOD-SUBMISSIONS-INBOX.json');

function run(dir, args) {
  const env = { ...process.env, DEMIGOD_ROOT: dir };
  delete env.DEMIGOD_AUTO_FEATURE;
  delete env.DEMIGOD_ALLOW_REAL_ROLES;
  return spawnSync(process.execPath, [INGEST, ...args], {
    cwd: OPS,
    env,
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

function writeSubmission(dir, name, body) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(body, null, 2));
  return file;
}

function startup(email, company) {
  return {
    name: 'startup-hire',
    data: {
      'contact-email': email,
      'company-name': company,
      'role-title': 'Founding Engineer',
      'stack-needs': 'React',
      'salary-range': '$180-220k',
    },
  };
}

function inbox(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'));
}

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

describe('submission ingest', { concurrency: 1 }, () => {
  test('a named file stays in that inbox and publish is refused', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ingest-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ingest-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_INBOX);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const missing = run(east, []);
    const missingOut = readJson(missing, 'missing');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'submission_required');
    assert.equal(missingOut.sent, false);
    assert.equal(missingOut.liveMail, false);
    assert.equal(missingOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json')), false);

    const noEmail = writeSubmission(east, 'no-email.json', {
      name: 'startup-hire',
      data: { 'company-name': 'Harbor East', 'stack-needs': 'React' },
    });
    const noEmailRun = run(east, [noEmail]);
    const noEmailOut = readJson(noEmailRun, 'no email');
    assert.equal(noEmailRun.status, 1);
    assert.equal(noEmailOut.error, 'email_required');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json')), false);

    const adaFile = writeSubmission(east, 'ada.json', startup('ada@harbor.example', 'Harbor East'));
    const publish = run(east, ['--publish', adaFile]);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json')), false);

    const eastRun = run(east, [adaFile]);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.email, 'ada@harbor.example');
    assert.equal(eastOut.company, 'Harbor East');
    assert.equal(eastOut.status, 'new');
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json'));
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    const eastInbox = inbox(east);
    assert.equal(eastInbox.items.length, 1);
    assert.equal(eastInbox.items[0].id, eastOut.id);
    assert.equal(eastInbox.items[0].raw['company-name'], 'Harbor East');
    assert.equal(eastInbox.items[0].status, 'new');
    assert.equal(JSON.stringify(eastInbox).includes('sam@harbor.example'), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);

    const minaFile = writeSubmission(east, 'mina.json', startup('mina@harbor.example', 'Harbor East'));
    const minaRun = run(east, [minaFile]);
    const minaOut = readJson(minaRun, 'mina');
    assert.equal(minaRun.status, 0);
    assert.equal(minaOut.email, 'mina@harbor.example');
    const eastAfter = inbox(east);
    const emails = eastAfter.items.map((item) => item.raw['contact-email']);
    assert.deepEqual(emails, ['mina@harbor.example', 'ada@harbor.example']);

    const samFile = writeSubmission(west, 'sam.json', startup('sam@harbor.example', 'Harbor West'));
    const westRun = run(west, [samFile]);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.email, 'sam@harbor.example');
    assert.equal(westOut.company, 'Harbor West');
    const westInbox = inbox(west);
    assert.equal(westInbox.items.length, 1);
    assert.equal(westInbox.items[0].raw['company-name'], 'Harbor West');
    assert.equal(JSON.stringify(westInbox).includes('ada@harbor.example'), false);
    assert.equal(JSON.stringify(westInbox).includes('mina@harbor.example'), false);
    const eastFinal = inbox(east);
    assert.equal(JSON.stringify(eastFinal).includes('sam@harbor.example'), false);
    assert.equal(eastFinal.items.length, 2);
    assert.deepEqual(snapshot(CHECKOUT_INBOX), checkoutBefore);
  });
});
