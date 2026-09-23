import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-design-audit.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/design';
const SHARED = [
  '/home/potter/DEMIGOD-DESIGN-AUDIT.json',
  path.join(OPS, 'DEMIGOD-DESIGN-AUDIT.json'),
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
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-design-audit-')).sort();
}

function sections(phrase) {
  return [
    `<title>${phrase}</title>`,
    '<a>HIRE TALENT</a>',
    '<div id="demigod-trust-block" class="dg-steps">steps</div>',
    '<div id="demigod-pricing">pricing</div>',
    '<div id="demigod-partnerships-wrap">partners</div>',
    '<div id="demigod-legal-privacy">privacy policy</div>',
    '<div id="startup-modal">hire</div>',
    '<div id="jobseeker-modal">join</div>',
  ];
}

function plant(dir, phrase, extra = '') {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v9-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-design-source.html'), [...sections(phrase), extra].join('\n'));
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-DESIGN-AUDIT.json');
}

describe('design audit', { concurrency: 1 }, () => {
  test('a design audit stays in that data root', async (t) => {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-design-bad-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-design-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-design-west-'));
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
    assert.equal(unsetOut.error, 'design_root_required');
    assert.equal(unsetOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'design_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-DESIGN-AUDIT.json'), false);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'design_root_required');
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
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((live.stdout + live.stderr).includes('www.trydemigod.com'), false);

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    plant(bad, 'Harbor Bad keep', [
      'color: rgb(59, 130, 246);',
      '#6b7280',
      '#6b7280',
      '#6b7280',
      '#6b7280',
      '#6b7280',
    ].join('\n'));
    const badRun = run(bad);
    assert.equal(badRun.status, 1, `bad audit should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.shot.startsWith(bad + path.sep), true);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.liveFetch, false);
    assert.equal(badOut.summary.blueRed, 1);
    assert.equal(badOut.summary.coolGray, 5);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.ok, false);
    assert.equal(badStored.summary.blueRed, 1);
    assert.equal(badStored.summary.coolGray, 5);
    assert.equal(badStored.liveFetch, false);

    plant(east, 'Harbor East keep');
    const eastRun = run(east, [], { DG_DESIGN_VER: 'east60' });
    assert.equal(eastRun.status, 0, `east audit failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.shot.startsWith(east + path.sep), true);
    assert.equal(eastOut.shot.endsWith('east60-home-hero.shot'), true);
    assert.equal(eastOut.shots, 9);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.ver, 'east60');
    assert.equal(eastOut.quick, false);
    assert.equal(eastOut.summary.blueRed, 0);
    assert.equal(eastOut.summary.coolGray, 0);
    assert.equal(eastOut.missing, 0);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    assert.equal(fs.readFileSync(eastOut.shot, 'utf8').includes('Harbor East keep'), true);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.views['wizard-engineer'].found, true);
    assert.equal(stored.views.pricing.found, true);
    assert.equal(stored.screenshots.length, 9);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep');
    const westRun = run(west, ['--quick'], { DG_DESIGN_VER: '' });
    assert.equal(westRun.status, 0, `west audit failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.quick, true);
    assert.equal(westOut.shots, 5);
    assert.equal(westOut.ver, 'v60');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(westStored.quick, true);
    assert.equal(westStored.screenshots.length, 5);
    assert.equal(westStored.views['wizard-engineer'], undefined);
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(shotNames(HOME_SHOTS), shotsBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
  });
});
