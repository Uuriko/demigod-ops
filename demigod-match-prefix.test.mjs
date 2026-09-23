import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const MATCH = path.join(OPS, 'demigod-match.mjs');
const INTRO = path.join(OPS, 'demigod-intro.mjs');
const CLOSE = path.join(OPS, 'demigod-close.mjs');
const WEST = 'pilot-harbor-west';
const EAST = 'pilot-harbor';
const PREFIX = 'pilot-harbor-w';
const AMBIGUOUS = 'pilot-har';

function run(dir, preload, script, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, script, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = res.status === 0 ? res.stdout : res.stderr;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function pilots(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8')).pilots;
}

describe('match prefix pair', { concurrency: 1 }, () => {
  test('a unique pilot prefix stores the pair under the resolved pilot id', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-prefix-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = dir;
    const flag = path.join(dir, 'fetch-calls.log');
    const preload = path.join(dir, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(dir, { recursive: true, force: true });
    });

    const base = {
      company: 'Harbor Lane',
      role: 'Founding Engineer',
      status: 'shortlist',
      outcome90d: 'Ship the billing path',
      'salary-range': '$180-220k',
      shortlist: [],
      history: [],
    };
    fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), `${JSON.stringify({
      at: new Date().toISOString(),
      pilots: [
        { ...base, id: EAST, company: 'Harbor East' },
        { ...base, id: WEST },
        { ...base, id: 'pilot-north', company: 'North Pier', role: 'Growth Lead' },
      ],
    }, null, 2)}\n`);

    const ambiguous = run(dir, preload, MATCH, [
      'add', AMBIGUOUS, '--name', 'Mina Alvarez', '--why', 'Shipped a billing service', '--links', 'mina.alvarez@baymail.co', '--consent',
    ]);
    const ambiguousBody = readJson(ambiguous, 'ambiguous prefix');
    assert.equal(ambiguous.status, 1);
    assert.equal(ambiguousBody.ok, false);
    assert.equal(ambiguousBody.error, 'ambiguous_id');
    assert.equal(fs.existsSync(path.join(dir, 'DEMIGOD-PAIRS.json')), false);
    assert.equal(pilots(dir).every((row) => (row.shortlist || []).length === 0), true);

    const added = readJson(run(dir, preload, MATCH, [
      'add', PREFIX, '--name', 'Mina Alvarez', '--why', 'Shipped a billing service', '--links', 'mina.alvarez@baymail.co', '--consent',
    ]), 'unique prefix add');
    assert.equal(added.ok, true);
    assert.equal(added.pilotId, WEST);
    assert.equal(added.pair.roleId, WEST);
    assert.notEqual(added.pair.roleId, PREFIX);
    assert.equal(added.pair.candId, added.candidate.id);
    const stored = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs[added.pairId];
    assert.equal(stored.roleId, WEST);
    assert.equal(stored.candId, added.candidate.id);
    const west = pilots(dir).find((row) => row.id === WEST);
    const east = pilots(dir).find((row) => row.id === EAST);
    assert.equal(west.shortlist.length, 1);
    assert.equal(west.shortlist[0].id, added.candidate.id);
    assert.equal(east.shortlist.length, 0);

    const founder = readJson(run(dir, preload, INTRO, ['yes', PREFIX, '--side', 'founder', '--cand', added.candidate.id]), 'founder yes');
    assert.equal(founder.ok, true);
    const candidate = readJson(run(dir, preload, INTRO, ['yes', PREFIX, '--side', 'candidate', '--cand', added.candidate.id]), 'candidate yes');
    assert.equal(candidate.mutual.candId, added.candidate.id);
    const sent = readJson(run(dir, preload, INTRO, ['send', PREFIX]), 'intro send');
    assert.equal(sent.ok, true);
    assert.equal(sent.status, 'intro');
    assert.equal(sent.sent, false);

    const hired = readJson(run(dir, preload, CLOSE, [
      'hire', PREFIX, '--start', '2026-10-01', '--comp', '200000', '--cand', added.candidate.id,
    ]), 'hire');
    assert.equal(hired.ok, true);
    assert.notEqual(hired.error, 'pair_required');
    assert.equal(hired.close.hiredCandId, added.candidate.id);
    assert.equal(hired.close.hiredPairId, added.pairId);
    assert.equal(hired.invoiceDraft.pilotId, WEST);
    assert.equal(hired.invoiceDraft.hiredCandId, added.candidate.id);
    assert.equal(hired.invoiceDraft.livePayment, false);
    assert.equal(hired.invoiceDraft.sendInvoice, false);
    assert.equal(fs.existsSync(flag), false);
  });
});
