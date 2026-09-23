import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const INTRO = path.join(OPS, 'demigod-intro.mjs');
const PILOT = 'pilot-harbor';
const SHARED_PACKET = path.join('/tmp/dg-busy', `intro-packet-${PILOT}.md`);

function runIntro(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, INTRO, ...args], {
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

function stampFile(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { size: stat.size, mtimeMs: stat.mtimeMs };
}

describe('intro mutual packet', { concurrency: 1 }, () => {
  test('an intro packet is written only after both sides yes the same candidate', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-intro-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = dir;
    const flag = path.join(dir, 'fetch-calls.log');
    const preload = path.join(dir, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_mail');
};
`);
    const beforeShared = stampFile(SHARED_PACKET);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(dir, { recursive: true, force: true });
    });

    const pilot = {
      id: PILOT,
      company: 'Harbor Lane',
      role: 'Founding Engineer',
      status: 'shortlist',
      outcome90d: 'Ship the billing path',
      shortlist: [
        { id: 'cand-mina', name: 'Mina Alvarez', why: 'Shipped a billing service', consent: false, links: 'https://harbor.example/mina' },
        { id: 'cand-jules', name: 'Jules Okonkwo', why: 'Ran an on-call rotation', consent: false, links: 'https://harbor.example/jules' },
      ],
      history: [],
    };
    fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), `${JSON.stringify({ at: new Date().toISOString(), pilots: [pilot] }, null, 2)}\n`);
    const packetFile = path.join(dir, 'DEMIGOD-INTROS', `${PILOT}.md`);

    const founder = readJson(runIntro(dir, preload, ['yes', PILOT, '--side', 'founder', '--cand', 'cand-mina']), 'founder yes');
    assert.equal(founder.ok, true);
    assert.equal(founder.mutual.founderYesFor, 'cand-mina');
    assert.equal(founder.mutual.candId, undefined);

    const other = readJson(runIntro(dir, preload, ['yes', PILOT, '--side', 'candidate', '--cand', 'cand-jules']), 'other candidate yes');
    assert.equal(other.ok, true);
    assert.equal(other.mutual.founderYesFor, 'cand-mina');
    assert.equal(other.mutual.candidateYesFor, 'cand-jules');
    assert.equal(other.mutual.candId, undefined);

    const split = readJson(runIntro(dir, preload, ['status', PILOT]), 'split status');
    assert.equal(split.ready, false);
    assert.equal(split.candId, null);
    assert.equal(split.sent, false);
    assert.equal(split.liveMail, false);

    const earlyPacket = runIntro(dir, preload, ['packet', PILOT]);
    const earlyBody = readJson(earlyPacket, 'early packet');
    assert.equal(earlyPacket.status, 1);
    assert.equal(earlyBody.ok, false);
    assert.equal(earlyBody.error, 'need_shortlist_mutual_yes_consent_outcome');
    assert.equal(earlyBody.sent, false);
    assert.equal(earlyBody.liveMail, false);
    assert.equal(fs.existsSync(packetFile), false);

    const earlySend = runIntro(dir, preload, ['send', PILOT]);
    assert.equal(earlySend.status, 1);
    assert.equal(readJson(earlySend, 'early send').sent, false);
    const stillShortlist = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8'));
    assert.equal(stillShortlist.pilots[0].status, 'shortlist');
    assert.equal((stillShortlist.pilots[0].history || []).some((row) => row.status === 'intro'), false);

    const minaYes = readJson(runIntro(dir, preload, ['yes', PILOT, '--side', 'candidate', '--cand', 'cand-mina']), 'mina candidate yes');
    assert.equal(minaYes.mutual.candId, 'cand-mina');
    assert.equal(minaYes.mutual.founderYesFor, 'cand-mina');
    assert.equal(minaYes.mutual.candidateYesFor, 'cand-mina');

    const ready = readJson(runIntro(dir, preload, ['status', PILOT]), 'ready status');
    assert.equal(ready.ready, true);
    assert.equal(ready.candId, 'cand-mina');
    assert.equal(ready.status, 'shortlist');

    const packet = readJson(runIntro(dir, preload, ['packet', PILOT]), 'mutual packet');
    assert.equal(packet.ok, true);
    assert.equal(packet.sent, false);
    assert.equal(packet.liveMail, false);
    assert.equal(packet.status, 'shortlist');
    assert.equal(packet.packet, packetFile);
    const draft = fs.readFileSync(packetFile, 'utf8');
    assert.match(draft, /Mina Alvarez/);
    assert.doesNotMatch(draft, /Jules Okonkwo/);
    assert.match(draft, /Founder yes for: cand-mina/);
    assert.match(draft, /Candidate yes for: cand-mina/);

    const sent = readJson(runIntro(dir, preload, ['send', PILOT]), 'send');
    assert.equal(sent.ok, true);
    assert.equal(sent.status, 'intro');
    assert.equal(sent.sent, false);
    assert.equal(sent.liveMail, false);
    assert.equal(sent.packet, packetFile);
    const after = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8')).pilots[0];
    assert.equal(after.status, 'intro');
    assert.equal(after.mutual.candId, 'cand-mina');
    assert.equal(after.history.filter((row) => row.status === 'intro').length, 1);
    const logged = fs.readFileSync(packetFile, 'utf8');
    assert.match(logged, /Mina Alvarez/);
    assert.doesNotMatch(logged, /Jules Okonkwo/);
    assert.equal(fs.existsSync(flag), false);
    assert.equal(fs.existsSync(path.join(dir, 'demigod-ops', 'intros', `${PILOT}.md`)), false);
    assert.deepEqual(stampFile(SHARED_PACKET), beforeShared);
  });
});
