import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-gtm-prep-sends.mjs');
const HOME_OUTREACH = '/home/potter/demigod-outreach';
const OPS_OUTREACH = path.join(OPS, 'demigod-outreach');
const SHARED = [
  '/home/potter/DEMIGOD-GTM-PREP-SENDS.json',
  '/home/potter/DEMIGOD-BOARD.json',
  path.join(OPS, 'DEMIGOD-GTM-PREP-SENDS.json'),
  path.join(OPS, 'DEMIGOD-BOARD.json'),
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

function names(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : null;
}

function tmpReports() {
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-gtm-prep-') || name.startsWith('sends-')).sort();
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-GTM-PREP-SENDS.json');
}

function plant(dir, phrase, stage, extraRole) {
  fs.mkdirSync(path.join(dir, 'demigod-outreach'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  fs.writeFileSync(
    path.join(dir, 'demigod-outreach', 'dms-2026-07-07-product-manager.txt'),
    `${phrase}\nHello [Name/Team],\n90d hook included.\n`,
  );
  const roles = [
    { id: 'role-pm', title: 'Product Manager', stageType: stage, status: 'Active', sample: true },
    { id: 'role-pilot', title: 'Quiet pilot', stageType: stage, status: 'Draft', pilot: true, sample: true },
  ];
  if (extraRole) roles.push(extraRole);
  fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({ roles }));
}

describe('gtm prep', { concurrency: 1 }, () => {
  test('a prep stays in that data root', async (t) => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-prep-cwd-'));
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-prep-bad-'));
    const leak = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-prep-leak-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-prep-out-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-prep-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-prep-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeBefore = names(HOME_OUTREACH);
    const opsBefore = names(OPS_OUTREACH);
    const tmpBefore = tmpReports();
    const outsideFile = path.join(outside, 'board.json');
    fs.writeFileSync(outsideFile, JSON.stringify({
      roles: [{ title: 'Outside keep secret', status: 'Active' }],
    }));
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
    assert.equal(src.includes('demigod-submissions-lib'), false);
    assert.equal(src.includes('loadBoard'), false);
    assert.equal(src.includes('process.cwd()'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);
    assert.equal(src.includes('https://'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);
    assert.equal(src.includes('execSync'), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' }, cwdDir);
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'prep_root_required');
    assert.equal(unsetOut.sent, false);
    assert.equal(unsetOut.liveMail, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'demigod-outreach')), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const home = run('/home/potter', [], {}, cwdDir);
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'prep_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-GTM-PREP-SENDS.json'), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'demigod-outreach')), false);

    const checkout = run(OPS, [], {}, cwdDir);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'prep_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'demigod-outreach')), false);

    const refused = run(east, ['--send'], {}, cwdDir);
    const refusedOut = readJson(refused, 'send');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'demigod-outreach')), false);

    const mailed = run(east, ['--mail'], {}, cwdDir);
    const mailedOut = readJson(mailed, 'mail');
    assert.equal(mailed.status, 1);
    assert.equal(mailedOut.error, 'publish_refused');
    assert.equal(mailedOut.liveMail, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((mailed.stdout + mailed.stderr).includes('https://'), false);

    const missing = run(east, [], {}, cwdDir);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'demigod-outreach')), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'demigod-outreach')), false);

    fs.symlinkSync(outsideFile, path.join(leak, 'DEMIGOD-BOARD.json'));
    const linked = run(leak, [], {}, cwdDir);
    const linkedOut = readJson(linked, 'symlink board');
    assert.equal(linked.status, 1);
    assert.equal(linkedOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(leak)), false);
    assert.equal((linked.stdout + linked.stderr).includes('Outside keep secret'), false);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);

    plant(bad, 'Harbor Bad keep', 'Seed Bad', {
      id: 'role-mystery',
      title: 'Mystery Role',
      stageType: 'Seed Bad',
      status: 'Active',
      sample: true,
    });
    const badRun = run(bad, [], {}, cwdDir);
    assert.equal(badRun.status, 1, `missing template should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes(cwdDir), false);
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.missing, 1);
    assert.equal(badOut.drafts, 0);
    assert.equal(badOut.sent, false);
    assert.equal(badOut.sendDir, null);
    assert.equal(fs.existsSync(path.join(bad, 'demigod-outreach', `sends-${badOut.day}`)), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'demigod-outreach')), false);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.ok, false);
    assert.equal(badStored.sent, false);
    assert.equal(badStored.missing.includes('Mystery Role'), true);

    plant(east, 'Harbor East keep', 'Seed East');
    const eastRun = run(east, [], {}, cwdDir);
    assert.equal(eastRun.status, 0, `east prep failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.path.includes(cwdDir), false);
    assert.equal(eastOut.sendDir.includes(east), true);
    assert.equal(eastOut.sendDir.includes(`sends-${eastOut.day}`), true);
    assert.equal(eastOut.sendDir.includes(cwdDir), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.roles, 1);
    assert.equal(eastOut.prepared, 1);
    assert.equal(eastOut.drafts, 1);
    assert.equal(eastOut.titles.includes('Product Manager'), true);
    assert.equal(eastOut.titles.includes('Quiet pilot'), false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'demigod-outreach')), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('https://'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('Outside keep secret'), false);
    const draft = fs.readFileSync(path.join(eastOut.sendDir, 'product-manager.txt'), 'utf8');
    assert.equal(draft.includes('Harbor East keep'), true);
    assert.equal(draft.includes('Founder/Team at Seed East'), true);
    assert.equal(draft.includes('[Name/Team]'), false);
    assert.equal(draft.includes('Harbor West keep'), false);
    const log = fs.readFileSync(path.join(eastOut.sendDir, 'SEND-LOG.txt'), 'utf8');
    assert.equal(log.includes('sent: false'), true);
    assert.equal(log.includes('Harbor East keep'), true);
    assert.equal(log.includes('Quiet pilot'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.sent, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    assert.equal(JSON.stringify(stored).includes('Quiet pilot'), false);
    const eastBytes = snapshot(reportFile(east));
    const eastDraft = snapshot(path.join(eastOut.sendDir, 'product-manager.txt'));

    plant(west, 'Harbor West keep', 'Seed West');
    const westRun = run(west, [], {}, OPS);
    assert.equal(westRun.status, 0, `west prep failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.sendDir.includes(west), true);
    assert.equal(westOut.sendDir.includes(OPS), false);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westOut).includes('Seed East'), false);
    const westDraft = fs.readFileSync(path.join(westOut.sendDir, 'product-manager.txt'), 'utf8');
    assert.equal(westDraft.includes('Harbor West keep'), true);
    assert.equal(westDraft.includes('Founder/Team at Seed West'), true);
    assert.equal(westDraft.includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.deepEqual(snapshot(path.join(eastOut.sendDir, 'product-manager.txt')), eastDraft);
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(path.join(OPS, 'demigod-outreach', `sends-${westOut.day}`)), false);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(names(HOME_OUTREACH), homeBefore);
    assert.deepEqual(names(OPS_OUTREACH), opsBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
    assert.deepEqual(names(cwdDir), []);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);
  });
});
