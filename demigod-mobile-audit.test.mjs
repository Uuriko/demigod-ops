import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-mobile-audit.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/mobile-audit';
const SHARED = [
  '/home/potter/DEMIGOD-MOBILE-AUDIT.json',
  path.join(OPS, 'DEMIGOD-MOBILE-AUDIT.json'),
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
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-mobile-audit-')).sort();
}

function plant(dir, phrase, html, foot) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), foot);
  fs.writeFileSync(path.join(dir, 'demigod-mobile-source.html'), html);
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
    '</nav>',
    '<div id="demigod-trust-block"></div>',
    '<div id="demigod-pricing">',
    '<a data-demigod-modal="startup" style="min-height: 44px">Pricing</a>',
    '</div>',
    '<div id="demigod-partners-teaser">',
    '<a data-dg-partner-apply style="min-height: 44px">Apply</a>',
    '</div>',
    '<div id="demigod-partnerships-wrap"></div>',
    '<div id="demigod-legal-privacy">privacy policy</div>',
    '<div id="startup-modal" class="dg-wiz-active"></div>',
    '<div id="jobseeker-modal"></div>',
    '<div id="partner-modal"></div>',
    '<div id="startup-hire" class="dg-wiz-shell">',
    '<button class="dg-wiz-next" style="height: 44px">Next</button>',
    '<input name="contact-email" style="font-size: 16px">',
    '</div>',
  ].join('\n');
}

function badHtml() {
  return [
    '<div id="dg-bar"><a class="dg-h" style="height: 20px">HIRE</a></div>',
    '<nav id="dg-site-nav"><a class="dg-nav-cta" style="height: 20px">Hire</a></nav>',
    '<div id="demigod-trust-block"></div>',
    '<div id="demigod-pricing"><a data-demigod-modal="startup" style="height: 20px">Pricing</a></div>',
    '<div id="demigod-partners-teaser"><a data-dg-partner-apply style="height: 20px">Apply</a></div>',
    '<div id="demigod-partnerships-wrap"></div>',
    '<div id="demigod-legal-privacy"></div>',
    '<div id="partner-modal"></div>',
    '<section style="width: 800px">wide</section>',
    '<div class="hero-section"><a class="premium-btn">Hire</a></div>',
    '<p>within 24 hours</p>',
    '<div class="dg-wiz-nav"><input name="contact-email" style="font-size: 12px"></div>',
  ].join('\n');
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-MOBILE-AUDIT.json');
}

describe('mobile audit', { concurrency: 1 }, () => {
  test('a mobile audit stays in that data root', async (t) => {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-mobile-bad-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-mobile-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-mobile-west-'));
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
    assert.equal(unsetOut.error, 'mobile_root_required');
    assert.equal(unsetOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'mobile_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-MOBILE-AUDIT.json'), false);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'mobile_root_required');
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

    plant(bad, 'Harbor Bad keep', badHtml(), '// Harbor Bad keep\ndg-foot-v9-core\n');
    const badRun = run(bad);
    assert.equal(badRun.status, 1, `bad audit should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.shot.startsWith(bad + path.sep), true);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.liveFetch, false);
    assert.equal(badOut.pass.noOverflow, false);
    assert.equal(badOut.pass.heroCtasHidden, false);
    assert.equal(badOut.pass.wizardOk, false);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.issues.some((issue) => issue.code === 'horizontal_overflow'), true);
    assert.equal(badStored.issues.some((issue) => issue.code === 'small_tap_targets'), true);
    assert.equal(badStored.issues.some((issue) => issue.code === 'copy_leaks'), true);
    assert.equal(badStored.issues.some((issue) => issue.code === 'startup_modal_no_open'), true);
    assert.equal(badStored.issues.some((issue) => issue.code === 'input_hidden_by_wiz_nav'), true);
    assert.equal(badStored.pass.footV75, false);
    assert.equal(badStored.liveFetch, false);

    const eastFoot = `// Harbor East keep\nwindow.__dgFootVer = "75";\ndg-foot-v75-core\n`;
    plant(east, 'Harbor East keep', goodHtml('Harbor East keep'), eastFoot);
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east audit failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.shot.startsWith(east + path.sep), true);
    assert.equal(eastOut.shots, 6);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.pass.footV75, true);
    assert.equal(eastOut.pass.heroCtasHidden, true);
    assert.equal(eastOut.pass.noOverflow, true);
    assert.equal(eastOut.pass.tapsOk, true);
    assert.equal(eastOut.pass.wizardOk, true);
    assert.equal(eastOut.pass.copyLeaks, true);
    assert.equal(eastOut.pass.highIssues, 0);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    assert.equal(fs.readFileSync(eastOut.shot, 'utf8').includes('Harbor East keep'), true);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.foot, '75');
    assert.equal(stored.viewport.w, 390);
    assert.equal(stored.layoutMeasured, 'declared');
    assert.equal(stored.taps.every((tap) => tap.tapped === false && tap.opened === true), true);
    assert.equal(stored.wizard.nextH, 44);
    assert.equal(stored.routes.privacy.found, true);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    const westFoot = `// Harbor West keep\nwindow.__dgFootVer = "75";\ndg-foot-v75-core\n`;
    plant(west, 'Harbor West keep', goodHtml('Harbor West keep'), westFoot);
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
