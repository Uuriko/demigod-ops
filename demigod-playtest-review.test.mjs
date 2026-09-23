import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-playtest-review.mjs');
const SHARED = [
  '/home/potter/DEMIGOD-PLAYTEST-REVIEW.json',
  path.join(OPS, 'DEMIGOD-PLAYTEST-REVIEW.json'),
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
  fs.writeFileSync(path.join(dir, 'demigod-playtest-source.html'), [
    `<title>${phrase}</title>`,
    '<a>HIRE TALENT</a>',
    '<nav><a>FIND TALENT</a></nav>',
    '<a>JOIN NETWORK</a>',
    '<h2>PRICING</h2>',
    '<footer>© 2026 Demigod</footer>',
    `<div id="startup-modal"><div class="dg-wiz-review">first 90 days 90day-outcome ${phrase}</div></div>`,
    `<div id="jobseeker-modal"><div class="dg-wiz-review">${phrase} engineer review</div></div>`,
  ].join('\n'));
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-PLAYTEST-REVIEW.json');
}

describe('playtest review', { concurrency: 1 }, () => {
  test('a playtest review stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-play-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-play-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeShots = '/home/potter/audit-shots';
    const homeShotsBefore = fs.existsSync(homeShots);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes("from 'puppeteer-core'"), false);
    assert.equal(src.includes('cdp-config.mjs'), false);
    assert.equal(src.includes('demigod-live-lib.mjs'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' });
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'playtest_root_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots')), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'playtest_root_required');
    assert.equal(fs.existsSync(homeShots), homeShotsBefore);
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-PLAYTEST-REVIEW.json'), false);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'playtest_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(refusedOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    plant(east, 'Harbor East keep');
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east playtest failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.pass, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.shotDir, path.join(east, 'audit-shots', 'playtest'));
    assert.equal(eastOut.shotDir.startsWith(east), true);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.high, 0);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.screenshots.length, 8);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    for (const file of eastOut.screenshots) {
      assert.equal(file.startsWith(east + path.sep), true);
      assert.equal(file.includes('/home/potter'), false);
      assert.equal(fs.readFileSync(file, 'utf8').includes('Harbor East keep'), true);
    }
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.pass, true);
    assert.equal(stored.findings.length, 0);
    assert.equal(stored.liveFetch, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots', 'webflow')), false);
    const eastBytes = snapshot(path.join(east, 'audit-shots', 'playtest', '01-landing.shot'));

    plant(west, 'Harbor West keep');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west playtest failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    for (const file of westOut.screenshots) {
      assert.equal(file.startsWith(west + path.sep), true);
      assert.equal(fs.readFileSync(file, 'utf8').includes('Harbor West keep'), true);
      assert.equal(fs.readFileSync(file, 'utf8').includes('Harbor East keep'), false);
    }
    assert.deepEqual(snapshot(path.join(east, 'audit-shots', 'playtest', '01-landing.shot')), eastBytes);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.equal(fs.existsSync(homeShots), homeShotsBefore);
  });
});
