import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-board-reset.mjs');
const SHARED = [
  '/home/potter/DEMIGOD-BOARD.json',
  '/home/potter/DEMIGOD-BOARD-RESET.json',
  '/home/potter/DEMIGOD-BOARD-AUDIT.jsonl',
  '/home/potter/DEMIGOD-BOARD.json.lock',
  path.join(OPS, 'DEMIGOD-BOARD.json'),
  path.join(OPS, 'DEMIGOD-BOARD-RESET.json'),
  path.join(OPS, 'DEMIGOD-BOARD-AUDIT.jsonl'),
  path.join(OPS, 'DEMIGOD-BOARD.json.lock'),
  path.join(OPS, 'demigod-board.json'),
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
  if (!fs.existsSync(file)) return null;
  const st = fs.lstatSync(file);
  if (st.isSymbolicLink()) return `link:${fs.readlinkSync(file)}`;
  return fs.readFileSync(file);
}

function tmpReports() {
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-board-reset-')).sort();
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-BOARD-RESET.json');
}

function boardFile(dir) {
  return path.join(dir, 'DEMIGOD-BOARD.json');
}

function plant(dir, phrase, previousTitle) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  if (previousTitle) {
    fs.writeFileSync(boardFile(dir), JSON.stringify({
      roles: [{ id: 'role-old', title: previousTitle, sample: false }],
      candidates: [{ id: 'cand-old', summary: previousTitle }],
    }));
  }
}

describe('board reset', { concurrency: 1 }, () => {
  test('a reset stays in that data root', async (t) => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-reset-cwd-'));
    const leak = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-reset-leak-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-reset-out-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-reset-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-reset-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const tmpBefore = tmpReports();
    const outsideFile = path.join(outside, 'board.json');
    fs.writeFileSync(outsideFile, JSON.stringify({ roles: [{ title: 'Outside keep secret', sample: false }] }));
    const outsideBefore = snapshot(outsideFile);
    t.after(() => {
      fs.rmSync(cwdDir, { recursive: true, force: true });
      fs.rmSync(leak, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes('demigod-turn-lib'), false);
    assert.equal(src.includes('demigod-submissions-lib'), false);
    assert.equal(src.includes('demigod-board-publish'), false);
    assert.equal(src.includes('saveBoard'), false);
    assert.equal(src.includes('spawnSync'), false);
    assert.equal(src.includes('process.cwd()'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);
    assert.equal(src.includes('https://'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' }, cwdDir);
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'reset_root_required');
    assert.equal(unsetOut.published, false);
    assert.equal(unsetOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(boardFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(boardFile(cwdDir)), false);

    const home = run('/home/potter', [], {}, cwdDir);
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'reset_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-BOARD-RESET.json'), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const checkout = run(OPS, [], {}, cwdDir);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'reset_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const refused = run(east, ['--publish'], {}, cwdDir);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.published, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(boardFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal((refused.stdout + refused.stderr).includes('https://'), false);

    const missing = run(east, [], {}, cwdDir);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(boardFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    fs.writeFileSync(path.join(leak, 'demigod-foot-core.js'), '// Harbor Leak keep\ndg-foot-v75-core\n');
    fs.symlinkSync(outsideFile, boardFile(leak));
    const linked = run(leak, [], {}, cwdDir);
    const linkedOut = readJson(linked, 'symlink board');
    assert.equal(linked.status, 1);
    assert.equal(linkedOut.error, 'board_link_refused');
    assert.equal(linkedOut.published, false);
    assert.equal(fs.existsSync(reportFile(leak)), false);
    assert.equal((linked.stdout + linked.stderr).includes('Outside keep secret'), false);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);
    assert.equal(fs.readlinkSync(boardFile(leak)), outsideFile);

    plant(east, 'Harbor East keep', 'Harbor Old keep');
    const eastRun = run(east, [], {}, cwdDir);
    assert.equal(eastRun.status, 0, `east reset failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.boardPath, boardFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.path.includes(cwdDir), false);
    assert.equal(eastOut.boardPath.includes(OPS), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.replaced, true);
    assert.equal(eastOut.previousRoles, 1);
    assert.equal(eastOut.roles, 3);
    assert.equal(eastOut.candidates, 2);
    assert.equal(eastOut.sample, true);
    assert.equal(eastOut.published, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(eastOut.sent, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(boardFile(cwdDir)), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('https://'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('Outside keep secret'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.published, false);
    assert.equal(stored.livePublish, false);
    const eastBoard = JSON.parse(fs.readFileSync(boardFile(east), 'utf8'));
    assert.equal(eastBoard.roles.length, 3);
    assert.equal(eastBoard.candidates.length, 2);
    assert.equal(eastBoard.roles.every((role) => role.sample === true), true);
    assert.equal(eastBoard.roles[0].title, 'Product Manager');
    assert.equal(eastBoard.cdnUrl, null);
    assert.equal(JSON.stringify(eastBoard).includes('Harbor Old keep'), false);
    assert.equal(JSON.stringify(eastBoard).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(boardFile(east));
    const eastReportBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', 'Harbor Old keep');
    const westRun = run(west, [], {}, OPS);
    assert.equal(westRun.status, 0, `west reset failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.boardPath, boardFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.path.includes(OPS), false);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westBoard = JSON.parse(fs.readFileSync(boardFile(west), 'utf8'));
    assert.equal(westBoard.roles[2].title, 'Head of Growth');
    assert.equal(JSON.stringify(westBoard).includes('Harbor Old keep'), false);
    assert.deepEqual(snapshot(boardFile(east)), eastBytes);
    assert.deepEqual(snapshot(reportFile(east)), eastReportBytes);
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(path.join(OPS, 'DEMIGOD-BOARD-RESET.json')), false);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(tmpReports(), tmpBefore);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);
  });
});
