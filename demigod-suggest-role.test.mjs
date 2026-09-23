import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(OPS, 'demigod-matching-engine.mjs');

function runSuggest(dir, preload, query, extra = []) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, ENGINE, 'suggest', query, ...extra], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  let parsed = null;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function pairRoleIds(dir) {
  const file = path.join(dir, 'DEMIGOD-PAIRS.json');
  if (!fs.existsSync(file)) return [];
  return Object.values(JSON.parse(fs.readFileSync(file, 'utf8')).pairs || {}).map((row) => row.roleId);
}

describe('suggest exact role', { concurrency: 1 }, () => {
  test('suggest proposes a pair only for one exact board role', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-suggest-'));
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

    const { saveBoard, ingestSubmission } = await import('./demigod-submissions-lib.mjs');
    const stamp = Date.now();
    saveBoard({
      at: new Date().toISOString(),
      roles: [
        { id: 'role-founding', title: 'Founding Engineer', company: 'Harbor Lane', status: 'Active', skills: 'TypeScript, product', stageType: 'Seed' },
        { id: 'role-staff-north', title: 'Staff Engineer', company: 'North Pier', status: 'Active', skills: 'Go, storage', stageType: 'Seed' },
        { id: 'role-staff-south', title: 'Staff Engineer', company: 'South Dock', status: 'Active', skills: 'Rust, compilers', stageType: 'Seed' },
      ],
      candidates: [],
    }, { reason: 'suggest-fixture', actor: 'suggest-role' });
    const mina = ingestSubmission({
      name: 'engineer-join',
      data: {
        'full-name': 'Mina Alvarez',
        'seeker-email': `mina.alvarez.${stamp}@baymail.co`,
        'skills-stack': 'TypeScript, product',
        experience: 'Shipped a billing service',
        'sf-bay': 'yes',
        availability: 'now',
        'salary-expectation': '$180k',
      },
    }).record;

    const missing = runSuggest(dir, preload, 'Missing Role', ['--propose']);
    const missingBody = readJson(missing, 'missing role');
    assert.equal(missing.status, 2);
    assert.equal(missingBody.ok, false);
    assert.equal(missingBody.error, 'role_not_found');
    assert.deepEqual(missingBody.proposed, []);
    assert.deepEqual(pairRoleIds(dir), []);

    const partial = runSuggest(dir, preload, 'Engineer', ['--propose']);
    const partialBody = readJson(partial, 'partial title');
    assert.equal(partial.status, 2);
    assert.equal(partialBody.ok, false);
    assert.equal(partialBody.error, 'role_not_found');
    assert.deepEqual(pairRoleIds(dir), []);

    const ambiguous = runSuggest(dir, preload, 'Staff Engineer', ['--propose']);
    const ambiguousBody = readJson(ambiguous, 'ambiguous title');
    assert.equal(ambiguous.status, 2);
    assert.equal(ambiguousBody.ok, false);
    assert.equal(ambiguousBody.error, 'role_ambiguous');
    assert.deepEqual(pairRoleIds(dir), []);

    const titled = readJson(runSuggest(dir, preload, 'Founding Engineer', ['--propose']), 'exact title');
    assert.equal(titled.ok, true);
    assert.equal(titled.role.id, 'role-founding');
    assert.equal(titled.role.title, 'Founding Engineer');
    assert.equal(titled.proposed.length, 1);
    assert.equal(titled.proposed[0].candId, mina.id);
    assert.deepEqual(pairRoleIds(dir), ['role-founding']);

    const byId = readJson(runSuggest(dir, preload, 'role-founding', ['--propose']), 'exact id');
    assert.equal(byId.ok, true);
    assert.equal(byId.role.id, 'role-founding');
    assert.equal(byId.proposed[0].pairId, titled.proposed[0].pairId);
    assert.deepEqual([...new Set(pairRoleIds(dir))], ['role-founding']);
    assert.equal(fs.existsSync(flag), false);
  });
});
