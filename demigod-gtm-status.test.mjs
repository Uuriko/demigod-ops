import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const STATUS = path.join(OPS, 'demigod-gtm-status.mjs');
const SHARED_JSON = '/tmp/demigod-gtm-status-latest.json';
const SHARED_MD = '/tmp/demigod-gtm-status-latest.md';
const SHARED_REPLY = '/tmp/demigod-reply-check-latest.json';

function run(dir, preload) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, STATUS], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      SLACK_WEBHOOK_URL: 'https://hooks.slack.example/services/local-gtm',
      DEMIGOD_SLACK_WEBHOOK: 'https://hooks.slack.example/services/local-gtm',
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

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

function writeOutreach(dir, { log, ready = [], eng = [], reply = null }) {
  const outreach = path.join(dir, 'demigod-outreach');
  fs.mkdirSync(path.join(outreach, 'ready-emails'), { recursive: true });
  fs.mkdirSync(path.join(outreach, 'ready-emails-eng'), { recursive: true });
  fs.writeFileSync(path.join(outreach, 'dm-send-log.txt'), log);
  for (const file of ready) {
    fs.writeFileSync(path.join(outreach, 'ready-emails', file.name), file.body);
  }
  for (const file of eng) {
    fs.writeFileSync(path.join(outreach, 'ready-emails-eng', file.name), file.body);
  }
  if (reply) {
    fs.writeFileSync(path.join(dir, 'DEMIGOD-REPLY-CHECK.json'), JSON.stringify(reply));
  }
}

describe('GTM status', { concurrency: 1 }, () => {
  test('a confirmation stays in that data root and site metrics are not called', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-status-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-status-west-'));
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
    const sharedBefore = {
      json: snapshot(SHARED_JSON),
      md: snapshot(SHARED_MD),
      reply: snapshot(SHARED_REPLY),
    };
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    writeOutreach(east, {
      log: 'SENT-CONFIRMED | 2026-09-20 | @harbor_east | Harbor East | x\n',
      ready: [
        {
          name: 'dm-harbor-east.txt',
          body: 'handle: @harbor_east\ncompany: Harbor East\n',
        },
        {
          name: 'dm-harbor-open.txt',
          body: 'handle: @harbor_open\ncompany: Harbor Open\n',
        },
      ],
      eng: [{ name: 'eng-harbor-east.txt', body: 'handle: @eng_east\ncompany: Harbor East\n' }],
      reply: { ok: true, scanned: 3, human: 1, companies: ['Harbor East'] },
    });
    writeOutreach(west, {
      log: [
        'SENT-CONFIRMED | 2026-09-20 | @harbor_west | Harbor West | x',
        'SENT-CONFIRMED | 2026-09-21 | @harbor_west_two | Harbor West Two | x',
      ].join('\n'),
      ready: [{ name: 'dm-harbor-west.txt', body: 'handle: @harbor_west\ncompany: Harbor West\n' }],
    });
    const westLogBefore = fs.readFileSync(path.join(west, 'demigod-outreach', 'dm-send-log.txt'));

    const eastRun = run(east, preload);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.sentConfirmed, 1);
    assert.deepEqual(eastOut.companies, ['Harbor East']);
    assert.deepEqual(eastOut.handles, ['@harbor_east']);
    assert.equal(eastOut.founderReady, 2);
    assert.equal(eastOut.engTemplates, 1);
    assert.deepEqual(eastOut.remaining, ['Harbor Open']);
    assert.equal(eastOut.replyCheck.human, 1);
    assert.equal(eastOut.replyCheck.scanned, 3);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.liveSlack, false);
    assert.equal(eastOut.liveMetrics, false);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-GTM-STATUS.json'));
    assert.equal(fs.existsSync(flag), false);

    const eastReport = JSON.parse(fs.readFileSync(eastOut.path, 'utf8'));
    assert.deepEqual(eastReport.companies, ['Harbor East']);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-GTM-STATUS.md')), true);
    const eastMd = fs.readFileSync(path.join(east, 'DEMIGOD-GTM-STATUS.md'), 'utf8');
    assert.match(eastMd, /Harbor East/);
    assert.doesNotMatch(eastMd, /Harbor West/);

    const westRun = run(west, preload);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.sentConfirmed, 2);
    assert.deepEqual(westOut.companies, ['Harbor West', 'Harbor West Two']);
    assert.deepEqual(westOut.remaining, []);
    assert.equal(westOut.replyCheck, null);
    assert.equal(westOut.engTemplates, 0);
    assert.equal(fs.existsSync(path.join(west, 'DEMIGOD-GTM-STATUS.json')), true);
    const westReport = fs.readFileSync(path.join(west, 'DEMIGOD-GTM-STATUS.json'), 'utf8');
    assert.equal(westReport.includes('Harbor East'), false);
    assert.equal(westReport.includes('@harbor_open'), false);
    assert.deepEqual(fs.readFileSync(path.join(west, 'demigod-outreach', 'dm-send-log.txt')), westLogBefore);
    assert.equal(fs.existsSync(path.join(east, 'demigod-outreach', 'dm-send-log.txt')), true);
    const eastAfterWest = JSON.parse(fs.readFileSync(path.join(east, 'DEMIGOD-GTM-STATUS.json'), 'utf8'));
    assert.deepEqual(eastAfterWest.companies, ['Harbor East']);

    assert.deepEqual(snapshot(SHARED_JSON), sharedBefore.json);
    assert.deepEqual(snapshot(SHARED_MD), sharedBefore.md);
    assert.deepEqual(snapshot(SHARED_REPLY), sharedBefore.reply);
    assert.equal(fs.existsSync(path.join(OPS, 'DEMIGOD-GTM-STATUS.json')), false);
  });
});
