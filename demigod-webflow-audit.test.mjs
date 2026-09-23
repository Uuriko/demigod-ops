import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-webflow-audit.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/webflow';
const SHARED = [
  '/home/potter/HEAVY-DEMIGOD-AUDIT.json',
  '/home/potter/HEAVY-DEMIGOD-AUDIT.md',
  '/home/potter/DEMIGOD-LOOP-STATE.json',
  '/home/potter/demigod-watcher.log',
  path.join(OPS, 'DEMIGOD-WEBFLOW-AUDIT.json'),
  path.join(OPS, 'HEAVY-DEMIGOD-AUDIT.json'),
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
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-webflow-audit-')).sort();
}

function plantFoot(dir, phrase) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v9-core\n`);
}

function plantBad(dir) {
  plantFoot(dir, 'Harbor Bad keep');
  fs.writeFileSync(path.join(dir, 'demigod-webflow-source.html'), [
    'POST A JOB',
    'TalentLink',
    'contact@talentlinksf',
    '2025 TalentLink',
    'BUSINESS EMAIL',
    'THE PANTHEON OF AGENTS',
    'THE PANTHEON OF AGENTS',
  ].join('\n'));
}

function plantGood(dir, phrase) {
  plantFoot(dir, phrase);
  fs.writeFileSync(path.join(dir, 'demigod-webflow-source.html'), [
    `<title>${phrase}</title>`,
    '<a href="#startup-modal">HIRE TALENT</a>',
    '<a href="#jobseeker-modal">FIND TALENT</a>',
    '<a href="#jobseeker-modal">GET JOB</a>',
    'hello@',
    '2026 Demigod',
    '<div id="startup-modal">#startup-modal</div>',
    '<div id="jobseeker-modal">#jobseeker-modal</div>',
    'THE PANTHEON OF AGENTS',
    '<form name="startup-hire"><input name="company-name"></form>',
  ].join('\n'));
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-WEBFLOW-AUDIT.json');
}

describe('webflow audit', { concurrency: 1 }, () => {
  test('a designer audit stays in that data root', async (t) => {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webflow-bad-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webflow-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webflow-west-'));
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
    assert.equal(src.includes('design.webflow.com'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);
    assert.equal(src.includes('www.trydemigod.com'), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' });
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'webflow_root_required');
    assert.equal(unsetOut.designerOpen, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'webflow_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-WEBFLOW-AUDIT.json'), false);
    assert.equal(fs.existsSync('/home/potter/HEAVY-DEMIGOD-AUDIT.json'), sharedBefore['/home/potter/HEAVY-DEMIGOD-AUDIT.json'] !== null);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'webflow_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.designerOpen, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const designer = run(east, ['--designer']);
    const designerOut = readJson(designer, 'designer');
    assert.equal(designer.status, 1);
    assert.equal(designerOut.error, 'publish_refused');
    assert.equal(designerOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((designer.stdout + designer.stderr).includes('www.trydemigod.com'), false);

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    plantBad(bad);
    const badRun = run(bad);
    assert.equal(badRun.status, 1, `bad audit should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.pass, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.shot.startsWith(bad + path.sep), true);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.designerOpen, false);
    assert.equal(badOut.liveFetch, false);
    assert.equal(badOut.issues > 0, true);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.issues.includes('post_job'), true);
    assert.equal(badStored.issues.includes('old_brand'), true);
    assert.equal(badStored.issues.includes('hire_missing'), true);
    assert.equal(badStored.issues.includes('modals_missing'), true);
    assert.equal(badStored.designerOpen, false);
    assert.equal(badStored.liveFetch, false);

    plantGood(east, 'Harbor East keep');
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east audit failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.pass, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.shot.startsWith(east + path.sep), true);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.hire, true);
    assert.equal(eastOut.join, true);
    assert.equal(eastOut.forms, 1);
    assert.equal(eastOut.issues, 0);
    assert.equal(eastOut.designerOpen, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    assert.equal(fs.readFileSync(eastOut.shot, 'utf8').includes('Harbor East keep'), true);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.signals.hireTalent, true);
    assert.equal(stored.signals.helloEmail, true);
    assert.equal(stored.signals.footer2026, true);
    assert.equal(stored.signals.postJob, false);
    assert.equal(stored.forms[0].name, 'startup-hire');
    assert.equal(stored.forms[0].fields.includes('company-name'), true);
    assert.equal(stored.issues.length, 0);
    assert.equal(stored.designerOpen, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    plantGood(west, 'Harbor West keep');
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
