import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-add-page-probe.mjs');
const HOME_WEBFLOW = '/home/potter/audit-shots/webflow';
const OPS_WEBFLOW = path.join(OPS, 'audit-shots', 'webflow');
const HOME_ADD = '/home/potter/audit-shots/add-page';
const OPS_ADD = path.join(OPS, 'audit-shots', 'add-page');
const SHARED = [
  '/home/potter/DEMIGOD-ADD-PAGE-PROBE.json',
  path.join(OPS, 'DEMIGOD-ADD-PAGE-PROBE.json'),
  '/home/potter/audit-shots/webflow/add-page-menu.png',
  path.join(OPS, 'audit-shots', 'webflow', 'add-page-menu.png'),
];

function run(dir, args = [], extraEnv = {}, cwd = OPS) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
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
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-add-page-probe-')).sort();
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-ADD-PAGE-PROBE.json');
}

function goodHtml(phrase, pageName) {
  return [
    `<p>${phrase}</p>`,
    '<button data-automation-id="left-sidebar-pages-button">Pages</button>',
    '<button data-automation-id="add-page-menu-button">Add</button>',
    '<div role="menuitem">Create page</div>',
    '<div role="menuitem">New folder</div>',
    `<div role="menuitem">${pageName}</div>`,
  ].join('\n');
}

function plant(dir, phrase, pageName) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-add-page-source.html'), goodHtml(phrase, pageName));
}

describe('add-page probe', { concurrency: 1 }, () => {
  test('a probe stays in that data root', async (t) => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-probe-cwd-'));
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-probe-bad-'));
    const leak = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-probe-leak-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-probe-out-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-probe-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-probe-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeWebflowBefore = shotNames(HOME_WEBFLOW);
    const opsWebflowBefore = shotNames(OPS_WEBFLOW);
    const homeAddBefore = shotNames(HOME_ADD);
    const opsAddBefore = shotNames(OPS_ADD);
    const tmpBefore = tmpReports();
    const outsideFile = path.join(outside, 'secret.html');
    fs.writeFileSync(outsideFile, '<div>Outside keep secret</div><div role="menuitem">Create page</div>');
    const outsideBefore = snapshot(outsideFile);
    t.after(() => {
      fs.rmSync(cwdDir, { recursive: true, force: true });
      fs.rmSync(bad, { recursive: true, force: true });
      fs.rmSync(leak, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes('collab-lib'), false);
    assert.equal(src.includes('demigod-turn-lib'), false);
    assert.equal(src.includes('prepareWebflowDesigner'), false);
    assert.equal(src.includes("from 'puppeteer-core'"), false);
    assert.equal(src.includes("from 'playwright'"), false);
    assert.equal(src.includes('cdp-config.mjs'), false);
    assert.equal(src.includes('demigod-live-lib'), false);
    assert.equal(src.includes('process.cwd()'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);
    assert.equal(src.includes('https://'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);
    assert.equal(src.includes('add-page-menu.png'), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' }, cwdDir);
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'probe_root_required');
    assert.equal(unsetOut.liveFetch, false);
    assert.equal(unsetOut.clicked, false);
    assert.equal(unsetOut.designerOpen, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const home = run('/home/potter', [], {}, cwdDir);
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'probe_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-ADD-PAGE-PROBE.json'), false);
    assert.equal(fs.existsSync('/home/potter/audit-shots/webflow/add-page-menu.png'), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const checkout = run(OPS, [], {}, cwdDir);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'probe_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const refused = run(east, ['--publish'], {}, cwdDir);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.clicked, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const designer = run(east, ['--designer'], {}, cwdDir);
    const designerOut = readJson(designer, 'designer');
    assert.equal(designer.status, 1);
    assert.equal(designerOut.error, 'publish_refused');
    assert.equal(designerOut.designerOpen, false);
    assert.equal(designerOut.clicked, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal((designer.stdout + designer.stderr).includes('https://'), false);

    const missing = run(east, [], {}, cwdDir);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    fs.writeFileSync(path.join(leak, 'demigod-foot-core.js'), '// Harbor Leak keep\ndg-foot-v75-core\n');
    fs.symlinkSync(outsideFile, path.join(leak, 'demigod-add-page-source.html'));
    const linked = run(leak, [], {}, cwdDir);
    assert.equal(linked.status, 1, `symlink probe should fail closed\n${linked.stdout}\n${linked.stderr}`);
    const linkedOut = readJson(linked, 'symlink source');
    assert.equal(linkedOut.ok, false);
    assert.equal(linkedOut.clicked, false);
    assert.equal(linkedOut.pagesButton, false);
    assert.equal(linkedOut.createPage, false);
    assert.equal((linked.stdout + linked.stderr).includes('Outside keep secret'), false);
    const linkedStored = JSON.parse(fs.readFileSync(reportFile(leak), 'utf8'));
    assert.equal(JSON.stringify(linkedStored).includes('Outside keep secret'), false);
    assert.equal(linkedStored.clicked, false);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);

    fs.writeFileSync(path.join(bad, 'demigod-foot-core.js'), '// Harbor Bad keep\ndg-foot-v75-core\n');
    fs.writeFileSync(
      path.join(bad, 'demigod-add-page-source.html'),
      '<button data-automation-id="left-sidebar-pages-button">Pages</button>\n',
    );
    const badRun = run(bad, [], {}, cwdDir);
    assert.equal(badRun.status, 1, `bad probe should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes(cwdDir), false);
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.clicked, false);
    assert.equal(badOut.designerOpen, false);
    assert.equal(badOut.pagesButton, true);
    assert.equal(badOut.addMenu, false);
    assert.equal(badOut.createPage, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(bad, 'audit-shots', 'webflow', 'add-page-menu.png')), false);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.ok, false);
    assert.equal(badStored.clicked, false);

    plant(east, 'Harbor East keep', 'East desk page');
    const eastRun = run(east, [], {}, cwdDir);
    assert.equal(eastRun.status, 0, `east probe failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.path.includes(cwdDir), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.pagesButton, true);
    assert.equal(eastOut.addMenu, true);
    assert.equal(eastOut.createPage, true);
    assert.equal(eastOut.menuCount, 5);
    assert.equal(eastOut.clicked, false);
    assert.equal(eastOut.designerOpen, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots', 'webflow', 'add-page-menu.png')), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('https://'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('Outside keep secret'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.clicked, false);
    assert.equal(stored.designerOpen, false);
    assert.equal(stored.menu.includes('Create page'), true);
    assert.equal(stored.menu.includes('New folder'), true);
    assert.equal(stored.menu.includes('East desk page'), true);
    assert.equal(stored.aids.some((item) => item.id === 'add-page-menu-button'), true);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    assert.equal(JSON.stringify(stored).includes('West desk page'), false);
    const eastShot = fs.readFileSync(path.join(east, 'audit-shots', 'add-page', 'add-page-menu.shot'), 'utf8');
    assert.equal(eastShot.includes('Harbor East keep'), true);
    assert.equal(eastShot.includes('add-page-menu'), true);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', 'West desk page');
    const westRun = run(west, [], {}, OPS);
    assert.equal(westRun.status, 0, `west probe failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.path.includes(OPS), false);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westOut).includes('East desk page'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(westStored.menu.includes('West desk page'), true);
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westStored).includes('East desk page'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(path.join(OPS, 'audit-shots', 'add-page', 'add-page-menu.shot')), false);
    assert.equal(fs.existsSync(path.join(OPS, 'audit-shots', 'webflow', 'add-page-menu.png')), false);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(shotNames(HOME_WEBFLOW), homeWebflowBefore);
    assert.deepEqual(shotNames(OPS_WEBFLOW), opsWebflowBefore);
    assert.deepEqual(shotNames(HOME_ADD), homeAddBefore);
    assert.deepEqual(shotNames(OPS_ADD), opsAddBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);
  });
});
