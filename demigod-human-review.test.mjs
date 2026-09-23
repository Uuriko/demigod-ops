import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const REVIEW = path.join(OPS, 'demigod-human-review-loop.mjs');
const CHECKOUT_LEADS = path.join(OPS, 'DEMIGOD-LEADS.json');
const CHECKOUT_REVIEW = path.join(OPS, 'DEMIGOD-HUMAN-REVIEW.json');
const CHECKOUT_DECISIONS = path.join(OPS, 'DEMIGOD-HUMAN-DECISIONS.jsonl');

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, REVIEW, ...args], {
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

function writeLeads(dir, lead) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-LEADS.json'), JSON.stringify({
    ok: true,
    type: 'partner',
    count: 1,
    leads: [lead],
    sent: false,
    liveMail: false,
  }, null, 2));
}

describe('human review loop', { concurrency: 1 }, () => {
  test('a review reads that data root and a missing lead writes nothing', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-review-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-review-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const flag = path.join(east, 'fetch-calls.log');
    const preload = path.join(east, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const checkoutLeadsBefore = fs.existsSync(CHECKOUT_LEADS) ? fs.readFileSync(CHECKOUT_LEADS, 'utf8') : null;
    const checkoutReviewBefore = fs.existsSync(CHECKOUT_REVIEW) ? fs.readFileSync(CHECKOUT_REVIEW, 'utf8') : null;
    const checkoutDecisionsBefore = fs.existsSync(CHECKOUT_DECISIONS) ? fs.readFileSync(CHECKOUT_DECISIONS, 'utf8') : null;

    writeLeads(east, {
      id: 'sub-harbor-east',
      type: 'partner',
      email: 'ada@harbor.example',
      company: 'Harbor East',
      skills: 'billing intros',
      score: 45,
    });
    writeLeads(west, {
      id: 'sub-harbor-west',
      type: 'partner',
      email: 'sam@harbor.example',
      company: 'Harbor West',
      skills: 'portfolio intros',
      score: 45,
    });

    const missing = run(east, preload, ['--decide']);
    const missingBody = readJson(missing, 'missing lead');
    assert.equal(missing.status, 1);
    assert.equal(missingBody.ok, false);
    assert.equal(missingBody.error, 'lead_required');
    assert.equal(missingBody.loggedPilot, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-HUMAN-DECISIONS.jsonl')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);
    assert.equal(`${missing.stdout}\n${missing.stderr}`.includes('pilot-logger'), false);
    assert.equal(`${missing.stdout}\n${missing.stderr}`.includes('decisions logged'), false);

    const eastRun = run(east, preload, ['--review']);
    const eastReview = readJson(eastRun, 'east review');
    assert.equal(eastRun.status, 0);
    assert.equal(eastReview.ok, true);
    assert.equal(eastReview.leadCount, 1);
    assert.equal(eastReview.leads[0].id, 'sub-harbor-east');
    assert.equal(eastReview.leads[0].company, 'Harbor East');
    assert.equal(eastReview.leadsPath, path.join(east, 'DEMIGOD-LEADS.json'));
    assert.equal(eastReview.report, path.join(east, 'DEMIGOD-HUMAN-REVIEW.json'));
    assert.equal(eastReview.sent, false);
    assert.equal(eastReview.liveMail, false);
    assert.equal(eastReview.loggedPilot, false);
    const eastFile = fs.readFileSync(eastReview.report, 'utf8');
    assert.match(eastFile, /sub-harbor-east/);
    assert.doesNotMatch(eastFile, /sub-harbor-west/);

    const westRun = run(west, preload, ['--review']);
    const westReview = readJson(westRun, 'west review');
    assert.equal(westReview.leadCount, 1);
    assert.equal(westReview.leads[0].id, 'sub-harbor-west');
    assert.equal(westReview.report, path.join(west, 'DEMIGOD-HUMAN-REVIEW.json'));
    const westFile = fs.readFileSync(westReview.report, 'utf8');
    assert.match(westFile, /sub-harbor-west/);
    assert.doesNotMatch(westFile, /sub-harbor-east/);
    assert.equal(fs.readFileSync(eastReview.report, 'utf8'), eastFile);

    const unknown = readJson(run(east, preload, ['--decide', 'sub-harbor-west', '--decision', 'approve']), 'unknown lead');
    assert.equal(unknown.ok, false);
    assert.equal(unknown.error, 'lead_not_found');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-HUMAN-DECISIONS.jsonl')), false);

    const decided = readJson(run(east, preload, ['--decide', 'sub-harbor-east', '--decision', 'approve']), 'east decision');
    assert.equal(decided.ok, true);
    assert.equal(decided.id, 'sub-harbor-east');
    assert.equal(decided.decision, 'approve');
    assert.equal(decided.path, path.join(east, 'DEMIGOD-HUMAN-DECISIONS.jsonl'));
    assert.equal(decided.loggedPilot, false);
    assert.equal(decided.sent, false);
    const decisionFile = fs.readFileSync(decided.path, 'utf8');
    assert.match(decisionFile, /sub-harbor-east/);
    assert.doesNotMatch(decisionFile, /sub-harbor-west/);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);
    assert.equal(fs.existsSync(path.join(west, 'DEMIGOD-HUMAN-DECISIONS.jsonl')), false);
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-LEADS.json'), 'utf8').includes('sub-harbor-east'), true);

    assert.equal(fs.existsSync(flag), false);
    assert.equal(fs.existsSync(CHECKOUT_LEADS) ? fs.readFileSync(CHECKOUT_LEADS, 'utf8') : null, checkoutLeadsBefore);
    assert.equal(fs.existsSync(CHECKOUT_REVIEW) ? fs.readFileSync(CHECKOUT_REVIEW, 'utf8') : null, checkoutReviewBefore);
    assert.equal(fs.existsSync(CHECKOUT_DECISIONS) ? fs.readFileSync(CHECKOUT_DECISIONS, 'utf8') : null, checkoutDecisionsBefore);
  });
});