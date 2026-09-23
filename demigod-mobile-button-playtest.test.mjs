import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-mobile-button-playtest.mjs');
const SHARED = [
  '/home/potter/DEMIGOD-MOBILE-BUTTON-PLAYTEST.json',
  path.join(OPS, 'DEMIGOD-MOBILE-BUTTON-PLAYTEST.json'),
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

function tmpReports() {
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-mobile-button-playtest-')).sort();
}

function plant(dir, phrase, html, foot) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), foot);
  fs.writeFileSync(path.join(dir, 'demigod-mobile-playtest-source.html'), html);
}

function goodHtml(phrase) {
  return [
    `<title>${phrase}</title>`,
    '<div id="dg-bar">',
    '<a class="dg-h" style="min-height: 44px">HIRE TALENT</a>',
    '<a class="dg-j" style="min-height: 44px">GET JOB</a>',
    '</div>',
    '<div id="dg-touch-style"></div>',
    '<nav id="dg-site-nav">',
    '<a class="dg-nav-cta" style="min-height: 44px">HIRE TALENT</a>',
    '<a data-demigod-modal="jobseeker" style="min-height: 44px">Join</a>',
    '</nav>',
    '<div id="demigod-pricing">',
    '<a data-demigod-modal="startup" style="min-height: 44px">Pricing</a>',
    '</div>',
    '<div id="demigod-partners-teaser">',
    '<a data-dg-partner-apply style="min-height: 44px">Apply</a>',
    '</div>',
    '<div id="startup-modal" class="dg-wiz-active"></div>',
    '<div id="jobseeker-modal" class="dg-wiz-active"></div>',
    '<div id="partner-modal" class="dg-wiz-active"></div>',
    '<div id="startup-hire">',
    '<button class="dg-wiz-next" style="height: 44px">Next</button>',
    '<div class="dg-wiz-show"><input name="contact-email"></div>',
    '</div>',
  ].join('\n');
}

function badHtml() {
  return [
    '<div id="dg-bar"><a class="dg-h" style="height: 20px">HIRE</a></div>',
    '<div class="hero-section"><a class="premium-btn" style="height: 20px">Hire</a></div>',
  ].join('\n');
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-MOBILE-BUTTON-PLAYTEST.json');
}

describe('mobile button playtest', { concurrency: 1 }, () => {
  test('a mobile button playtest stays in that data root', async (t) => {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-mbplay-bad-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-mbplay-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-mbplay-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
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
    assert.equal(unsetOut.error, 'playtest_root_required');
    assert.equal(unsetOut.tapped, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'playtest_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-MOBILE-BUTTON-PLAYTEST.json'), false);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'playtest_root_required');
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
    assert.equal(liveOut.tapped, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((live.stdout + live.stderr).includes('www.trydemigod.com'), false);

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    plant(bad, 'Harbor Bad keep', badHtml(), '// Harbor Bad keep\ndg-foot-v9-core\n');
    const badRun = run(bad);
    assert.equal(badRun.status, 1, `bad playtest should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.shot.startsWith(bad + path.sep), true);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.tapped, false);
    assert.equal(badOut.pass.footV75, false);
    assert.equal(badOut.pass.heroCtasHidden, false);
    assert.equal(badOut.pass.minTapTargets, false);
    assert.equal(badOut.pass.allOpen, false);
    assert.equal(badOut.pass.wizNextTap, false);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.sizes.some((size) => size.ok === false), true);
    assert.equal(badStored.taps.every((tap) => tap.tapped === false), true);

    const eastFoot = `// Harbor East keep\nwindow.__dgFootVer = "75";\ndg-foot-v75-core\n`;
    plant(east, 'Harbor East keep', goodHtml('Harbor East keep'), eastFoot);
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east playtest failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.shot.startsWith(east + path.sep), true);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.pass.footV75, true);
    assert.equal(eastOut.pass.heroCtasHidden, true);
    assert.equal(eastOut.pass.touchUi, true);
    assert.equal(eastOut.pass.minTapTargets, true);
    assert.equal(eastOut.pass.allOpen, true);
    assert.equal(eastOut.pass.wizNextTap, true);
    assert.equal(eastOut.taps, 6);
    assert.equal(eastOut.tapped, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    assert.equal(fs.readFileSync(eastOut.shot, 'utf8').includes('Harbor East keep'), true);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.state.foot, '75');
    assert.equal(stored.viewport.w, 390);
    assert.equal(stored.wizTap.nextH, 44);
    assert.equal(stored.wizTap.advanced, true);
    assert.equal(stored.taps.every((tap) => tap.opened === true && tap.tapped === false), true);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    const westFoot = `// Harbor West keep\nwindow.__dgFootVer = "75";\ndg-foot-v75-core\n`;
    plant(west, 'Harbor West keep', goodHtml('Harbor West keep'), westFoot);
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west playtest failed\n${westRun.stdout}\n${westRun.stderr}`);
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
    assert.deepEqual(tmpReports(), tmpBefore);
  });
});
