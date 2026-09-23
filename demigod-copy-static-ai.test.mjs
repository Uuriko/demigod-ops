import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-copy-static-ai.mjs');
const SHARED = [
  '/home/potter/DEMIGOD-COPY-STATIC-AI.json',
  path.join(OPS, 'DEMIGOD-COPY-STATIC-AI.json'),
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

function tmpReports() {
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-copy-static-ai-')).sort();
}

function plant(dir, phrase, html) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-copy-static-source.html'), html);
}

function goodHtml(phrase) {
  return [
    `<title>${phrase}</title>`,
    '<p>Humans intro fitting matches</p>',
    '<p>Your full name</p>',
  ].join('\n');
}

function badHtml() {
  return [
    '<p>3-5 matches in 48 hours</p>',
    '<p>John Doe</p>',
    '<p>TalentLink</p>',
    '<meta name="description" content="48 hours and 10% fee">',
  ].join('\n');
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-COPY-STATIC-AI.json');
}

describe('copy static', { concurrency: 1 }, () => {
  test('a copy check stays in that data root', async (t) => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-static-cwd-'));
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-static-bad-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-static-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-static-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const tmpBefore = tmpReports();
    t.after(() => {
      fs.rmSync(cwdDir, { recursive: true, force: true });
      fs.rmSync(bad, { recursive: true, force: true });
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes('demigod-live-lib'), false);
    assert.equal(src.includes('demigod-turn-lib'), false);
    assert.equal(src.includes('fetchLiveHtml'), false);
    assert.equal(src.includes('submitWebflowAiPrompt'), false);
    assert.equal(src.includes('process.cwd()'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' }, cwdDir);
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'static_root_required');
    assert.equal(unsetOut.liveFetch, false);
    assert.equal(unsetOut.aiSubmit, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const home = run('/home/potter', [], {}, cwdDir);
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'static_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-COPY-STATIC-AI.json'), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const checkout = run(OPS, [], {}, cwdDir);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'static_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const refused = run(east, ['--publish'], {}, cwdDir);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.aiSubmit, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const live = run(east, ['--live'], {}, cwdDir);
    const liveOut = readJson(live, 'live');
    assert.equal(live.status, 1);
    assert.equal(liveOut.error, 'publish_refused');
    assert.equal(liveOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal((live.stdout + live.stderr).includes('www.trydemigod.com'), false);

    const ai = run(east, ['--ai'], {}, cwdDir);
    const aiOut = readJson(ai, 'ai');
    assert.equal(ai.status, 1);
    assert.equal(aiOut.error, 'publish_refused');
    assert.equal(aiOut.aiSubmit, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const missing = run(east, [], {}, cwdDir);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    plant(bad, 'Harbor Bad keep', badHtml());
    const badRun = run(bad, [], {}, cwdDir);
    assert.equal(badRun.status, 1, `bad check should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.pass, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes(cwdDir), false);
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.liveFetch, false);
    assert.equal(badOut.aiSubmit, false);
    assert.equal(badOut.before.speedLeaks > 0, true);
    assert.equal(badOut.before.nameLeaks > 0, true);
    assert.equal(badOut.before.talentLink > 0, true);
    assert.equal(badOut.before.badMeta, 1);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.pass, false);
    assert.equal(badStored.aiSubmit, false);
    assert.equal(badStored.liveFetch, false);

    plant(east, 'Harbor East keep', goodHtml('Harbor East keep'));
    const eastRun = run(east, [], {}, cwdDir);
    assert.equal(eastRun.status, 0, `east check failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.pass, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.path.includes(cwdDir), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.before.speedLeaks, 0);
    assert.equal(eastOut.before.nameLeaks, 0);
    assert.equal(eastOut.before.talentLink, 0);
    assert.equal(eastOut.before.badMeta, 0);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.aiSubmit, false);
    assert.equal(eastOut.sent, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('fetchLiveHtml'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.after.speedLeaks, 0);
    assert.equal(stored.after.nameLeaks, 0);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', goodHtml('Harbor West keep'));
    const westRun = run(west, [], {}, OPS);
    assert.equal(westRun.status, 0, `west check failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.path.includes(OPS), false);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(tmpReports(), tmpBefore);
  });
});
