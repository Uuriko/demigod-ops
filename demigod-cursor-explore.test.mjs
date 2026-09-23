import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-cursor-explore.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/cursor-explore';
const OPS_SHOTS = path.join(OPS, 'audit-shots', 'cursor-explore');
const SHARED = [
  '/home/potter/CURSOR-DEMIGOD-EXPLORE.json',
  '/home/potter/DEMIGOD-CURSOR-EXPLORE.json',
  path.join(OPS, 'CURSOR-DEMIGOD-EXPLORE.json'),
  path.join(OPS, 'DEMIGOD-CURSOR-EXPLORE.json'),
];
const PAGE_IDS = [
  'agents',
  'dashboard',
  'cloud-agents',
  'settings',
  'integrations',
  'plugins',
  'bugbot',
  'automations',
  'docs',
  'marketplace',
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
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-cursor-explore-')).sort();
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-CURSOR-EXPLORE.json');
}

function goodNote(phrase) {
  return [
    phrase,
    'Overview Settings Cloud Agents Bugbot Security Agents Approval Agents',
    'Plugins Integrations API Keys Shared Canvases Members Usage Spending',
    'Billing Automations Marketplace Docs',
    'Desk lane stays local.',
  ].join('\n');
}

function plantGood(dir, phrase, approvalMode) {
  fs.mkdirSync(path.join(dir, '.cursor', 'rules'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.cursor', 'skills-cursor', 'local-skill'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.local', 'share', 'cursor-agent', 'versions'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'Downloads'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'cursor-pages'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  fs.writeFileSync(path.join(dir, '.cursor', 'cli-config.json'), JSON.stringify({
    approvalMode,
    sandbox: { mode: 'read-only' },
  }));
  fs.writeFileSync(path.join(dir, '.cursor', 'mcp.json'), JSON.stringify({
    mcpServers: { webflow: { ok: true }, 'chrome-devtools': { ok: true } },
  }));
  fs.writeFileSync(path.join(dir, '.cursor', 'rules', 'demigod.mdc'), `# ${phrase}\n`);
  fs.writeFileSync(path.join(dir, '.cursor', 'hooks.json'), '{}\n');
  fs.writeFileSync(path.join(dir, '.cursor', 'skills-cursor', 'local-skill', 'SKILL.md'), 'local\n');
  fs.writeFileSync(path.join(dir, 'Downloads', 'Cursor-3.7.36-x86_64.AppImage'), 'local\n');
  for (const id of PAGE_IDS) {
    fs.writeFileSync(path.join(dir, 'cursor-pages', `${id}.note`), goodNote(phrase));
  }
}

describe('cursor explore', { concurrency: 1 }, () => {
  test('an explore stays in that data root', async (t) => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-explore-cwd-'));
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-explore-bad-'));
    const leak = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-explore-leak-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-explore-out-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-explore-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-explore-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeShotsBefore = shotNames(HOME_SHOTS);
    const opsShotsBefore = shotNames(OPS_SHOTS);
    const tmpBefore = tmpReports();
    const outsideFile = path.join(outside, 'secret.json');
    fs.writeFileSync(outsideFile, JSON.stringify({ approvalMode: 'Outside keep secret' }));
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
    assert.equal(src.includes("from 'puppeteer-core'"), false);
    assert.equal(src.includes("from 'playwright'"), false);
    assert.equal(src.includes('cdp-config.mjs'), false);
    assert.equal(src.includes('demigod-turn-lib'), false);
    assert.equal(src.includes('demigod-live-lib'), false);
    assert.equal(src.includes('fetchLiveHtml'), false);
    assert.equal(src.includes('process.cwd()'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);
    assert.equal(src.includes('cursor.com'), false);
    assert.equal(src.includes('https://'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' }, cwdDir);
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'explore_root_required');
    assert.equal(unsetOut.liveFetch, false);
    assert.equal(unsetOut.browsed, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const home = run('/home/potter', [], {}, cwdDir);
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'explore_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-CURSOR-EXPLORE.json'), false);
    assert.equal(fs.existsSync('/home/potter/CURSOR-DEMIGOD-EXPLORE.json'), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const checkout = run(OPS, [], {}, cwdDir);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'explore_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const refused = run(east, ['--publish'], {}, cwdDir);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.browsed, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const live = run(east, ['--live'], {}, cwdDir);
    const liveOut = readJson(live, 'live');
    assert.equal(live.status, 1);
    assert.equal(liveOut.error, 'publish_refused');
    assert.equal(liveOut.liveFetch, false);
    assert.equal(liveOut.browsed, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal((live.stdout + live.stderr).includes('cursor.com'), false);
    assert.equal((live.stdout + live.stderr).includes('https://'), false);

    const fetched = run(east, ['--fetch'], {}, cwdDir);
    const fetchedOut = readJson(fetched, 'fetch');
    assert.equal(fetched.status, 1);
    assert.equal(fetchedOut.error, 'publish_refused');
    assert.equal(fetchedOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const missing = run(east, [], {}, cwdDir);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    fs.mkdirSync(path.join(leak, '.cursor'), { recursive: true });
    fs.symlinkSync(outsideFile, path.join(leak, '.cursor', 'cli-config.json'));
    const linked = run(leak, [], {}, cwdDir);
    const linkedOut = readJson(linked, 'symlink source');
    assert.equal(linked.status, 1);
    assert.equal(linkedOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(leak)), false);
    assert.equal((linked.stdout + linked.stderr).includes('Outside keep secret'), false);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);

    fs.writeFileSync(path.join(bad, 'demigod-foot-core.js'), '// Harbor Bad keep\ndg-foot-v75-core\n');
    fs.mkdirSync(path.join(bad, 'cursor-pages'), { recursive: true });
    fs.writeFileSync(path.join(bad, 'cursor-pages', 'agents.note'), 'Please sign in\n');
    const badRun = run(bad, [], {}, cwdDir);
    assert.equal(badRun.status, 1, `bad explore should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes(cwdDir), false);
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.liveFetch, false);
    assert.equal(badOut.browsed, false);
    assert.equal(badOut.pages, 1);
    assert.equal(badOut.loginWalls, 1);
    assert.equal(badOut.demigodRule, false);
    assert.equal(badOut.webflowMcp, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(bad, 'CURSOR-DEMIGOD-EXPLORE.json')), false);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.ok, false);
    assert.equal(badStored.browsed, false);
    assert.equal(badStored.liveFetch, false);
    assert.equal(badStored.explored[0].loginRequired, true);

    plantGood(east, 'Harbor East keep', 'east-desk');
    const eastRun = run(east, [], {}, cwdDir);
    assert.equal(eastRun.status, 0, `east explore failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.path.includes(cwdDir), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.pages, 10);
    assert.equal(eastOut.expected, 10);
    assert.equal(eastOut.loginWalls, 0);
    assert.equal(eastOut.demigodRule, true);
    assert.equal(eastOut.webflowMcp, true);
    assert.equal(eastOut.approvalMode, 'east-desk');
    assert.equal(eastOut.shots, 10);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.browsed, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(east, 'CURSOR-DEMIGOD-EXPLORE.json')), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('cursor.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('https://'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('Outside keep secret'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.source, 'disk');
    assert.equal(stored.browsed, false);
    assert.equal(stored.demigodRelevant.approvalMode, 'east-desk');
    assert.equal(stored.demigodRelevant.sandbox, 'read-only');
    assert.equal(stored.demigodRelevant.chromeDevtoolsMcp, true);
    assert.equal(stored.localConfig.hooks, true);
    assert.equal(stored.localConfig.cursorAgentCli, true);
    assert.equal(stored.localConfig.appImage, true);
    assert.equal(stored.localConfig.skills.includes('local-skill'), true);
    assert.equal(stored.explored.find((page) => page.id === 'dashboard').navVisible.includes('Billing'), true);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    assert.equal(JSON.stringify(stored).includes('Outside keep secret'), false);
    const eastShot = fs.readFileSync(path.join(east, 'audit-shots', 'cursor-explore', 'dashboard.shot'), 'utf8');
    assert.equal(eastShot.includes('Harbor East keep'), true);
    assert.equal(eastShot.includes('dashboard'), true);
    const eastBytes = snapshot(reportFile(east));

    plantGood(west, 'Harbor West keep', 'west-desk');
    const westRun = run(west, [], {}, OPS);
    assert.equal(westRun.status, 0, `west explore failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.approvalMode, 'west-desk');
    assert.equal(westOut.path.includes(OPS), false);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westOut).includes('east-desk'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(westStored.demigodRelevant.approvalMode, 'west-desk');
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westStored).includes('east-desk'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(path.join(OPS, 'audit-shots', 'cursor-explore', 'dashboard.shot')), false);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(shotNames(HOME_SHOTS), homeShotsBefore);
    assert.deepEqual(shotNames(OPS_SHOTS), opsShotsBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);
  });
});
