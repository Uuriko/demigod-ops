import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-form-submit-test.mjs');
const SHARED = [
  '/home/potter/DEMIGOD-FORM-SUBMIT-TEST.json',
  path.join(OPS, 'DEMIGOD-FORM-SUBMIT-TEST.json'),
];

function run(dir, args = [], extraEnv = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
      CDP_URL: 'http://127.0.0.1:9',
      DEMIGOD_DASH: 'http://127.0.0.1:9',
      ...extraEnv,
    },
    encoding: 'utf8',
    timeout: 20000,
  });
}

function readJson(res, label) {
  const raw = String(res.stdout || '').trim().startsWith('{') ? res.stdout : res.stderr;
  let parsed = null;
  try {
    parsed = JSON.parse(String(raw || '').trim());
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

function plant(dir, phrase) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v9-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-form-source.html'), [
    `<title>${phrase}</title>`,
    '<div id="startup-modal">',
    '<form id="startup-hire" name="startup-hire" data-name="startup-hire">',
    '<input type="email" name="contact-email">',
    '<input name="company-name">',
    '<input name="role-title">',
    '</form>',
    'first 90 days',
    '</div>',
    '<div id="jobseeker-modal">',
    '<form id="engineer-join" name="engineer-join" data-name="engineer-join">',
    '<input type="email" name="seeker-email">',
    '<input name="salary-expectation">',
    '</form>',
    '</div>',
  ].join('\n'));
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-FORM-SUBMIT-TEST.json');
}

describe('form submit check', { concurrency: 1 }, () => {
  test('a form submit check stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-form-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-form-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes("from 'puppeteer-core'"), false);
    assert.equal(src.includes('cdp-config.mjs'), false);
    assert.equal(src.includes('demigod-live-lib.mjs'), false);
    assert.equal(src.includes("const ROOT = '/home/potter'"), false);
    assert.equal(src.includes('www.trydemigod.com'), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' });
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'form_root_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'form_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-FORM-SUBMIT-TEST.json'), false);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'form_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(refusedOut.liveFetch, false);
    assert.equal(refusedOut.submitted, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    plant(east, 'Harbor East keep');
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east form check failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.pass, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.startupDataName, 'startup-hire');
    assert.equal(eastOut.engineerDataName, 'engineer-join');
    assert.equal(eastOut.issues, 0);
    assert.equal(eastOut.submitted, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.startup.dataName, 'startup-hire');
    assert.equal(stored.engineer.dataName, 'engineer-join');
    assert.equal(stored.startup.fields.includes('contact-email'), true);
    assert.equal(stored.engineer.fields.includes('salary-expectation'), true);
    assert.equal(stored.emailFormCount, 0);
    assert.equal(stored.submitResult.submitted, false);
    assert.equal(stored.submitResult.reason, 'local_record_only');
    assert.equal(stored.liveFetch, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west form check failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
  });
});
