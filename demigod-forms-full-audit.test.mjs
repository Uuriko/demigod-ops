import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-forms-full-audit.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/forms-audit';
const SHARED = [
  '/home/potter/DEMIGOD-FORMS-FULL-AUDIT.json',
  path.join(OPS, 'DEMIGOD-FORMS-FULL-AUDIT.json'),
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

function shotNames(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : null;
}

function tmpReports() {
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-forms-full-audit-')).sort();
}

function plant(dir, phrase, html) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v9-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-forms-audit-source.html'), html);
}

function goodHtml(phrase) {
  return [
    `<title>${phrase}</title>`,
    '<a>HIRE TALENT</a>',
    '<a>GET JOB</a>',
    '<div id="startup-modal">',
    '<form data-name="startup-hire" name="startup-hire">',
    '<input name="company-name">',
    '<input name="salary-range">',
    '<button type="submit">Request intro</button>',
    '</form>',
    '</div>',
    '<div id="jobseeker-modal">',
    '<form data-name="engineer-join" name="engineer-join">',
    '<input name="salary-expectation">',
    '<button type="submit">Join network</button>',
    '</form>',
    '</div>',
  ].join('\n');
}

function badHtml() {
  const many = Array.from({ length: 9 }, (_, index) => `<input name="field-${index}">`).join('\n');
  return [
    '<a>HIRE TALENT</a>',
    '<a>GET JOB</a>',
    '<div id="startup-modal">',
    '<p>brief received thanks</p>',
    '<form data-name="startup-hire">',
    '<input name="company-name">',
    '<button type="submit" hidden>Submit</button>',
    '</form>',
    '</div>',
    '<div id="jobseeker-modal">',
    '<p>oops something failed</p>',
    '<form data-name="engineer-join">',
    many,
    '<button type="submit">Submit</button>',
    '</form>',
    '</div>',
  ].join('\n');
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-FORMS-FULL-AUDIT.json');
}

describe('forms audit', { concurrency: 1 }, () => {
  test('a forms audit stays in that data root', async (t) => {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-forms-bad-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-forms-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-forms-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const shotsBefore = shotNames(HOME_SHOTS);
    const tmpBefore = tmpReports();
    t.after(() => {
      fs.rmSync(bad, { recursive: true, force: true });
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes("from 'puppeteer-core'"), false);
    assert.equal(src.includes("from 'playwright'"), false);
    assert.equal(src.includes('cdp-config.mjs'), false);
    assert.equal(src.includes('demigod-turn-lib'), false);
    assert.equal(src.includes('demigod-live-lib'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);
    assert.equal(src.includes('www.trydemigod.com'), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' });
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'forms_root_required');
    assert.equal(unsetOut.submitted, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'forms_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-FORMS-FULL-AUDIT.json'), false);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'forms_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(fs.existsSync(reportFile(east)), false);

    const live = run(east, ['--live']);
    const liveOut = readJson(live, 'live');
    assert.equal(live.status, 1);
    assert.equal(liveOut.error, 'publish_refused');
    assert.equal(liveOut.liveFetch, false);
    assert.equal(liveOut.submitted, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((live.stdout + live.stderr).includes('www.trydemigod.com'), false);

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    plant(bad, 'Harbor Bad keep', badHtml());
    const badRun = run(bad);
    assert.equal(badRun.status, 1, `bad audit should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.pass, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.shot.startsWith(bad + path.sep), true);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.submitted, false);
    assert.equal(badOut.liveFetch, false);
    assert.equal(badOut.high > 0, true);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.issues.some((issue) => issue.issue === 'ghost_messages_on_open' && issue.side === 'startup'), true);
    assert.equal(badStored.issues.some((issue) => issue.issue === 'submit_not_visible' && issue.side === 'startup'), true);
    assert.equal(badStored.issues.some((issue) => issue.issue === 'too_many_visible_fields' && issue.side === 'engineer'), true);
    assert.equal(badStored.issues.some((issue) => issue.issue === 'generic_submit_label' && issue.side === 'engineer'), true);
    assert.equal(badStored.pass, false);
    assert.equal(badStored.submitted, false);

    plant(east, 'Harbor East keep', goodHtml('Harbor East keep'));
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east audit failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.pass, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.shot.startsWith(east + path.sep), true);
    assert.equal(eastOut.shots, 4);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.issues, 0);
    assert.equal(eastOut.startup, 'startup-hire');
    assert.equal(eastOut.engineer, 'engineer-join');
    assert.equal(eastOut.submitted, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    assert.equal(fs.readFileSync(eastOut.shot, 'utf8').includes('Harbor East keep'), true);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.startup.formName, 'startup-hire');
    assert.equal(stored.startup.fields.some((field) => field.name === 'salary-range'), true);
    assert.equal(stored.engineer.formName, 'engineer-join');
    assert.equal(stored.engineer.fields.some((field) => field.name === 'salary-expectation'), true);
    assert.equal(stored.engineer.submitVisible, true);
    assert.equal(stored.startup.turnstile, false);
    assert.equal(stored.issues.length, 0);
    assert.equal(stored.screenshots.length, 4);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', goodHtml('Harbor West keep'));
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west audit failed\n${westRun.stdout}\n${westRun.stderr}`);
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
    assert.deepEqual(shotNames(HOME_SHOTS), shotsBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
  });
});
