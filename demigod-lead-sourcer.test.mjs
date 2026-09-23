import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const SOURCER = path.join(OPS, 'demigod-lead-sourcer.mjs');
const CHECKOUT_LEADS = path.join(OPS, 'DEMIGOD-LEADS.json');

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, SOURCER, ...args], {
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

function writeInbox(dir, items) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), JSON.stringify({ items }, null, 2));
}

describe('lead sourcer', { concurrency: 1 }, () => {
  test('partner leads come from that inbox and do not invent a startup', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-leads-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-leads-west-'));
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

    const checkoutBefore = fs.existsSync(CHECKOUT_LEADS) ? fs.readFileSync(CHECKOUT_LEADS, 'utf8') : null;
    writeInbox(east, [
      {
        id: 'sub-harbor-east',
        form: 'partner-apply',
        status: 'new',
        raw: {
          'partner-email': 'ada@harbor.example',
          'partner-org': 'Harbor East',
          'referral-plan': 'billing intros',
          location: 'SF Bay',
        },
      },
      {
        id: 'sub-mina-east',
        form: 'engineer-join',
        status: 'new',
        raw: {
          'seeker-email': 'mina@harbor.example',
          'skills-stack': 'React',
          location: 'SF Bay',
          'why-this-role': 'billing service',
        },
      },
      {
        id: 'sub-startup-east',
        form: 'startup-hire',
        status: 'new',
        raw: {
          'contact-email': 'founder@harbor.example',
          'company-name': 'Harbor East',
          'role-title': 'Founding Engineer',
        },
      },
    ]);
    writeInbox(west, [
      {
        id: 'sub-harbor-west',
        form: 'partner-apply',
        status: 'new',
        raw: {
          'partner-email': 'sam@harbor.example',
          'partner-org': 'Harbor West',
          'referral-plan': 'portfolio intros',
          location: 'SF',
        },
      },
    ]);

    const bad = run(east, preload, ['--type=linkedin']);
    const invalid = readJson(bad, 'invalid type');
    assert.equal(bad.status, 1);
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error, 'type_invalid');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-LEADS.json')), false);

    const eastRun = run(east, preload, ['--type=partners', '--limit=10']);
    const eastLeads = readJson(eastRun, 'east partners');
    assert.equal(eastRun.status, 0);
    assert.equal(eastLeads.ok, true);
    assert.equal(eastLeads.type, 'partner');
    assert.equal(eastLeads.count, 1);
    assert.equal(eastLeads.leads[0].id, 'sub-harbor-east');
    assert.equal(eastLeads.leads[0].email, 'ada@harbor.example');
    assert.equal(eastLeads.leads[0].company, 'Harbor East');
    assert.equal(eastLeads.path, path.join(east, 'DEMIGOD-LEADS.json'));
    assert.equal(eastLeads.sent, false);
    assert.equal(eastLeads.liveMail, false);
    assert.equal(Number.isInteger(eastLeads.leads[0].score), true);
    const eastFile = fs.readFileSync(eastLeads.path, 'utf8');
    assert.match(eastFile, /sub-harbor-east/);
    assert.doesNotMatch(eastFile, /sub-harbor-west/);
    assert.doesNotMatch(eastFile, /sub-mina-east/);
    assert.doesNotMatch(eastFile, /sub-startup-east/);
    assert.doesNotMatch(eastFile, /p-seed-ai-1/);
    assert.doesNotMatch(eastFile, /p-pre-b2b-2/);
    assert.doesNotMatch(eastFile, /p-seed-3/);

    const talentRun = run(east, preload, ['--type=talent', '--limit=10']);
    const talent = readJson(talentRun, 'east talent');
    assert.equal(talent.count, 1);
    assert.equal(talent.leads[0].id, 'sub-mina-east');
    assert.equal(talent.leads[0].email, 'mina@harbor.example');
    assert.equal(talent.leads.some((row) => row.id === 'sub-harbor-east'), false);

    const westRun = run(west, preload, ['--type=partners']);
    const westLeads = readJson(westRun, 'west partners');
    assert.equal(westLeads.count, 1);
    assert.equal(westLeads.leads[0].id, 'sub-harbor-west');
    assert.equal(westLeads.leads[0].company, 'Harbor West');
    assert.equal(westLeads.path, path.join(west, 'DEMIGOD-LEADS.json'));
    const westFile = fs.readFileSync(westLeads.path, 'utf8');
    assert.match(westFile, /sub-harbor-west/);
    assert.doesNotMatch(westFile, /sub-harbor-east/);
    assert.doesNotMatch(westFile, /p-seed-ai-1/);
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-LEADS.json'), 'utf8').includes('sub-mina-east'), true);
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-LEADS.json'), 'utf8').includes('sub-harbor-west'), false);

    const combined = `${eastRun.stdout}\n${eastRun.stderr}\n${talentRun.stdout}\n${westRun.stdout}\n${westRun.stderr}`;
    assert.equal(combined.includes('puppeteer'), false);
    assert.equal(combined.includes('turn-lib'), false);
    assert.equal(combined.includes('ERR_MODULE_NOT_FOUND'), false);
    assert.equal(combined.includes('p-seed-ai-1'), false);
    assert.equal(fs.existsSync(flag), false);
    assert.equal(fs.existsSync(CHECKOUT_LEADS) ? fs.readFileSync(CHECKOUT_LEADS, 'utf8') : null, checkoutBefore);
  });
});