import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-button-audit.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/button-audit';
const SHARED = [
  '/home/potter/DEMIGOD-BUTTON-AUDIT.json',
  path.join(OPS, 'DEMIGOD-BUTTON-AUDIT.json'),
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
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-button-audit-')).sort();
}

function plant(dir, phrase, html, extras = {}) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-button-source.html'), html);
  if (extras.legal != null) fs.writeFileSync(path.join(dir, 'demigod-button-legal.html'), extras.legal);
  if (extras.partnerships != null) fs.writeFileSync(path.join(dir, 'demigod-button-partnerships.html'), extras.partnerships);
}

function goodHtml(phrase) {
  return [
    `<title>${phrase}</title>`,
    '<nav id="dg-site-nav"></nav>',
    '<div id="demigod-trust-block"></div>',
    '<div id="demigod-pricing"></div>',
    '<div id="demigod-partnerships-wrap"></div>',
    '<div id="demigod-legal-wrap"></div>',
    '<div id="startup-modal"></div>',
    '<div id="jobseeker-modal"></div>',
    '<div id="partner-modal"></div>',
    '<a data-demigod-modal="startup">HIRE TALENT</a>',
    '<a data-demigod-modal="startup">FIND TALENT</a>',
    '<a data-demigod-modal="engineer" href="#engineer">JOIN NETWORK</a>',
    '<a href="#demigod-pricing">Pricing</a>',
    '<a href="#partnerships">Partners</a>',
    '<a href="#privacy">Privacy</a>',
    '<a data-dg-partner-apply>BECOME A PARTNER</a>',
    '<a href="#demigod-trust-block">How it works</a>',
    '<a href="mailto:hello@">hello@</a>',
  ].join('\n');
}

function badHtml() {
  return [
    '<a href="#">GET STARTED</a>',
    '<a href="#">Pricing</a>',
    '<a href="#" data-dg-nav="scroll">Learn more</a>',
  ].join('\n');
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-BUTTON-AUDIT.json');
}

describe('button audit', { concurrency: 1 }, () => {
  test('a button audit stays in that data root', async (t) => {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-button-bad-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-button-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-button-west-'));
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
    assert.equal(unsetOut.error, 'button_root_required');
    assert.equal(unsetOut.liveFetch, false);
    assert.equal(unsetOut.clicked, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'button_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-BUTTON-AUDIT.json'), false);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'button_root_required');
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
    assert.equal(liveOut.clicked, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((live.stdout + live.stderr).includes('www.trydemigod.com'), false);

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    plant(bad, 'Harbor Bad keep', badHtml(), {
      legal: '404 not found',
      partnerships: '404 not found',
    });
    const badRun = run(bad);
    assert.equal(badRun.status, 1, `bad audit should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.shot.startsWith(bad + path.sep), true);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.clicked, false);
    assert.equal(badOut.liveFetch, false);
    assert.equal(badOut.summary.totalBroken > 0, true);
    assert.equal(badOut.summary.bareLegal404, true);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.routes['/'].broken.some((click) => click.text === 'GET STARTED'), true);
    assert.equal(badStored.routes['/'].broken.some((click) => click.text === 'Pricing'), true);
    assert.equal(badStored.bareUrls['/legal'].fetched, false);
    assert.equal(badStored.bareUrls['/partnerships'].is404, true);
    assert.equal(badStored.clicked, false);

    plant(east, 'Harbor East keep', goodHtml('Harbor East keep'), {
      legal: 'dg-foot-v75-core\nprivacy policy',
      partnerships: 'dg-foot-v75-core\npartners',
    });
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east audit failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.shot.startsWith(east + path.sep), true);
    assert.equal(eastOut.shot.endsWith(`${path.sep}home.shot`), true);
    assert.equal(eastOut.shots, 5);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.quick, false);
    assert.equal(eastOut.summary.totalBroken, 0);
    assert.equal(eastOut.summary.bareLegal404, false);
    assert.equal(eastOut.summary.barePartnerships404, false);
    assert.equal(eastOut.clicked, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    assert.equal(fs.readFileSync(eastOut.shot, 'utf8').includes('Harbor East keep'), true);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.routes['/'].clicks.some((click) => click.text === 'HIRE TALENT' && click.result === 'startup-modal'), true);
    assert.equal(stored.routes['/'].clicks.some((click) => click.text === 'Pricing' && click.result === 'hash:#demigod-pricing'), true);
    assert.equal(stored.routes['/'].clicks.some((click) => click.text === 'BECOME A PARTNER' && click.result === 'partner-modal'), true);
    assert.equal(stored.routes['/#privacy'].meta.legalPage, true);
    assert.equal(stored.bareUrls['/legal'].fetched, false);
    assert.equal(stored.bareUrls['/legal'].foot, true);
    assert.equal(stored.clicks === undefined || stored.clicked === false, true);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', goodHtml('Harbor West keep'), {
      legal: 'dg-foot-v75-core\nprivacy policy',
      partnerships: 'dg-foot-v75-core\npartners',
    });
    const westRun = run(west, ['--quick']);
    assert.equal(westRun.status, 0, `west audit failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.quick, true);
    assert.equal(westOut.shots, 1);
    assert.equal(westOut.summary.totalBroken, 0);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(westStored.quick, true);
    assert.equal(Object.keys(westStored.routes).join(','), '/');
    assert.equal(westStored.routes['/'].clicks.some((click) => click.text === 'HIRE TALENT'), true);
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(shotNames(HOME_SHOTS), shotsBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
  });
});
