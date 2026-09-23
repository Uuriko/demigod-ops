import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-ux-flow-audit.mjs');
const SHARED = [
  '/tmp/dg-ux-pack/playwright-flows.json',
  '/tmp/dg-ux-pack/shots',
  '/home/potter/DEMIGOD-UX-FLOW.json',
  path.join(OPS, 'DEMIGOD-UX-FLOW.json'),
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
    },
    encoding: 'utf8',
    timeout: 20000,
    ...extraEnv,
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
  if (!fs.existsSync(file)) return null;
  const st = fs.lstatSync(file);
  if (st.isDirectory()) return { dir: true, names: fs.readdirSync(file).sort() };
  return fs.readFileSync(file);
}

function plant(dir, phrase) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v9-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-ux-source.html'), [
    `<title>${phrase}</title>`,
    '<a>HIRE TALENT</a>',
    '<a>JOIN NETWORK</a>',
    '<a href="mailto:hello@example.co">hello@example.co</a>',
    '<div id="dg-bar"><a>HIRE TALENT</a></div>',
    `<div id="startup-modal">first 90 days 90day-outcome ${phrase}</div>`,
    `<div id="jobseeker-modal">${phrase} engineer review</div>`,
  ].join('\n'));
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-UX-FLOW.json');
}

describe('ux flow', { concurrency: 1 }, () => {
  test('a ux flow stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ux-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ux-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes("from 'playwright'"), false);
    assert.equal(src.includes('/tmp/dg-ux-pack'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);

    const unset = run(east, [], { env: { ...process.env, DEMIGOD_ROOT: '', DEMIGOD_LIVE: 'http://127.0.0.1:9', CDP_URL: 'http://127.0.0.1:9' } });
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'ux_root_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots')), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'ux_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-UX-FLOW.json'), false);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'ux_root_required');
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
    assert.equal(eastRun.status, 0, `east ux flow failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/dg-ux-pack'), false);
    assert.equal(eastOut.shotDir, path.join(east, 'audit-shots', 'ux-flow'));
    assert.equal(eastOut.shotDir.startsWith(east), true);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.issues, 0);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.screenshots.length, 3);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('playwright'), false);
    for (const file of eastOut.screenshots) {
      assert.equal(file.startsWith(east + path.sep), true);
      assert.equal(file.includes('/tmp/dg-ux-pack'), false);
      assert.equal(fs.readFileSync(file, 'utf8').includes('Harbor East keep'), true);
    }
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.viewports.length, 3);
    assert.equal(stored.viewports.every((vp) => vp.ok && vp.hire && vp.join && vp.has90), true);
    assert.equal(stored.liveFetch, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(path.join(east, 'audit-shots', 'ux-flow', 'desktop-home.shot'));

    plant(west, 'Harbor West keep');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west ux flow failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    for (const file of westOut.screenshots) {
      assert.equal(file.startsWith(west + path.sep), true);
      assert.equal(fs.readFileSync(file, 'utf8').includes('Harbor West keep'), true);
      assert.equal(fs.readFileSync(file, 'utf8').includes('Harbor East keep'), false);
    }
    assert.deepEqual(snapshot(path.join(east, 'audit-shots', 'ux-flow', 'desktop-home.shot')), eastBytes);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
  });
});
