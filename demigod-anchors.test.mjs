import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const ANCHORS = path.join(OPS, 'demigod-anchors.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-ANCHORS.json');
const BUSY_OUTBOX = '/tmp/dg-busy/outbox';

function run(dir, args) {
  return spawnSync(process.execPath, [ANCHORS, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = res.status === 0 ? res.stdout : res.stderr;
  const line = String(raw || '').trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

function snapshotDir(dir) {
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir).sort().map((name) => {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (!st.isFile()) return { name, kind: 'other' };
    return { name, bytes: fs.readFileSync(full) };
  });
}

function writePlan(dir, name, file, anchor) {
  const body = `${anchor}\n`;
  fs.writeFileSync(path.join(dir, file), body);
  fs.writeFileSync(path.join(dir, name), JSON.stringify({
    title: name,
    replacements: [{ file, old: anchor, count: 1 }],
  }));
  return body;
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-ANCHORS.json'), 'utf8'));
}

describe('anchor check', { concurrency: 1 }, () => {
  test('a named plan stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-anchors-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-anchors-west-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-anchors-abs-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_REPORT);
    const outboxBefore = snapshotDir(BUSY_OUTBOX);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    });

    const missing = run(east, ['harbor-missing.json']);
    const missingOut = readJson(missing, 'missing');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'plan_not_found');
    assert.equal(missingOut.sent, false);
    assert.equal(missingOut.liveMail, false);
    assert.equal(missingOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-ANCHORS.json')), false);

    const publish = run(east, ['--publish', 'harbor-plan.json']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-ANCHORS.json')), false);

    fs.writeFileSync(path.join(east, 'harbor-empty.json'), JSON.stringify({ replacements: [] }));
    const empty = run(east, ['harbor-empty.json']);
    const emptyOut = readJson(empty, 'empty');
    assert.equal(empty.status, 1);
    assert.equal(emptyOut.error, 'no_replacements');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-ANCHORS.json')), false);

    writePlan(west, 'harbor-west-plan.json', 'harbor-west.txt', 'Harbor West anchor');
    const eastBody = writePlan(east, 'harbor-plan.json', 'harbor-east.txt', 'Harbor East anchor');
    const eastRun = run(east, ['harbor-plan.json']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.pass, true);
    assert.equal(eastOut.plan, 'harbor-plan.json');
    assert.equal(eastOut.count, 1);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-ANCHORS.json'));
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(eastOut.checks[0].file, 'harbor-east.txt');
    assert.equal(eastOut.checks[0].preview, 'Harbor East anchor');
    assert.equal(fs.readFileSync(path.join(east, 'harbor-east.txt'), 'utf8'), eastBody);
    assert.equal(report(east).runs.length, 1);
    assert.equal(report(east).runs[0].checks[0].preview, 'Harbor East anchor');
    assert.equal(JSON.stringify(report(east)).includes('Harbor West anchor'), false);

    const foreign = run(east, ['harbor-west-plan.json']);
    const foreignOut = readJson(foreign, 'foreign');
    assert.equal(foreign.status, 1);
    assert.equal(foreignOut.error, 'plan_not_found');
    assert.equal(report(east).runs.length, 1);

    writePlan(east, 'harbor-open.json', 'harbor-open.txt', 'Harbor Open anchor');
    const second = run(east, ['harbor-open.json']);
    const secondOut = readJson(second, 'second');
    assert.equal(second.status, 0);
    assert.equal(secondOut.count, 2);
    const eastText = JSON.stringify(report(east));
    assert.equal(eastText.includes('Harbor East anchor'), true);
    assert.equal(eastText.includes('Harbor Open anchor'), true);
    assert.equal(eastText.includes('Harbor West anchor'), false);

    const westRun = run(west, ['harbor-west-plan.json']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.count, 1);
    assert.equal(westOut.checks[0].preview, 'Harbor West anchor');
    assert.equal(JSON.stringify(report(west)).includes('Harbor East anchor'), false);
    assert.equal(JSON.stringify(report(west)).includes('Harbor Open anchor'), false);
    assert.equal(JSON.stringify(report(east)).includes('Harbor West anchor'), false);
    assert.equal(report(east).runs.length, 2);

    const absPlan = path.join(outside, 'harbor-abs.json');
    fs.writeFileSync(path.join(east, 'harbor-abs.txt'), 'Harbor Absolute anchor\n');
    fs.writeFileSync(absPlan, JSON.stringify({
      title: 'harbor-abs',
      replacements: [{ file: 'harbor-abs.txt', old: 'Harbor Absolute anchor', count: 1 }],
    }));
    const absRun = run(east, [absPlan]);
    const absOut = readJson(absRun, 'absolute');
    assert.equal(absRun.status, 0);
    assert.equal(absOut.pass, true);
    assert.equal(absOut.count, 3);
    assert.equal(absOut.checks[0].preview, 'Harbor Absolute anchor');
    assert.equal(fs.readFileSync(path.join(east, 'harbor-abs.txt'), 'utf8'), 'Harbor Absolute anchor\n');

    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshotDir(BUSY_OUTBOX), outboxBefore);
  });
});
