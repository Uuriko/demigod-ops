import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SHARED = '/tmp/dg-busy';
const receipt = (dir, name) => path.join(dir, name);
const read = (file) => {
  try { return fs.readFileSync(file); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

test('demand selftest children keep every receipt out of shared busy state', (t) => {
  // Isolation: both env vars honored + default shared dir. Selftest sets BOTH to the same
  // canaryDir so precedence cannot affect isolation. Production demand paths prefer DEMIGOD_BUSY first
  // (DG_BUSY legacy alias) — same as evidence/export/sourcer — so mixed precedence cannot fork
  // receipts when the two vars ever differ.
  for (const file of ['demigod-demand.mjs', 'demigod-demand-selftest.mjs', 'demigod-dm-auto-send.mjs', 'demigod-pilot-inbound.mjs']) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const decl = source.match(/const BUSY = [^;]*/)?.[0] || '';
    assert.ok(decl, `${file} must declare BUSY`);
    assert.match(decl, /process\.env\.DG_BUSY/, `${file} must honor DG_BUSY`);
    assert.match(decl, /process\.env\.DEMIGOD_BUSY/, `${file} must honor DEMIGOD_BUSY`);
    assert.match(decl, /['"]\/tmp\/dg-busy['"]/, `${file} must default to the shared busy dir`);
    assert.match(
      decl,
      /process\.env\.DEMIGOD_BUSY\s*\|\|\s*process\.env\.DG_BUSY/,
      `${file} must prefer DEMIGOD_BUSY over DG_BUSY`,
    );
  }

  const selftest = fs.readFileSync(path.join(ROOT, 'demigod-demand-selftest.mjs'), 'utf8');
  assert.match(selftest, /DG_BUSY: canaryDir[\s\S]*DEMIGOD_BUSY: canaryDir/);
  assert.doesNotMatch(selftest, /run\(['"]demigod-(?:next|truth|ship)\.mjs['"]/);

  const sharedNames = [
    'demand-status.json',
    'demand-queue.json',
    'demand-draft.json',
    'dm-auto-send.json',
    'pilot-inbound.json',
  ];
  const before = new Map(sharedNames.map((name) => [name, read(receipt(SHARED, name))]));
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-demand-isolation-'));
  // T0 is a CLI usage placeholder, not a guaranteed production queue row
  // (removed 2026-07-23). Fixture queue + ready-email under DEMIGOD_ROOT.
  const fixtureRoot = path.join(isolated, 'root');
  const readyDir = path.join(fixtureRoot, 'demigod-outreach', 'ready-emails');
  fs.mkdirSync(readyDir, { recursive: true });
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // YYYY-MM-DD
  fs.writeFileSync(path.join(readyDir, `dm-${day}-t0.txt`), 'Hi T0,\n\nIsolation fixture body.\n');
  const queueMd = path.join(fixtureRoot, 'QUEUE.md');
  fs.writeFileSync(
    queueMd,
    `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | T0 | @t0_handle | T0 Co | hiring | https://example.test | receipt |
`,
  );
  const env = {
    ...process.env,
    DG_BUSY: isolated,
    DEMIGOD_BUSY: isolated,
    DEMIGOD_DEMAND_STATUS: receipt(isolated, 'demand-status.json'),
    DEMIGOD_ROOT: fixtureRoot,
    DEMIGOD_QUEUE_MD: queueMd,
  };

  try {
    for (const [script, args, status] of [
      ['demigod-demand.mjs', ['status', '--json'], 0],
      ['demigod-demand.mjs', ['queue', '--json'], 0],
      ['demigod-demand.mjs', ['draft', '--name=T0', '--json'], 0],
      ['demigod-demand.mjs', ['send', '--name=T0'], 2],
      ['demigod-dm-auto-send.mjs', ['--name=T0'], 2],
      ['demigod-pilot-inbound.mjs', ['status', '--json'], 0],
    ]) {
      const result = spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
        cwd: ROOT,
        encoding: 'utf8',
        env,
        timeout: 30_000,
      });
      if (result.error?.code === 'EPERM') {
        t.diagnostic('child spawn blocked; source isolation contract passed');
        return;
      }
      assert.ifError(result.error);
      assert.equal(result.status, status, `${script} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
    }

    for (const name of sharedNames) {
      assert.ok(fs.existsSync(receipt(isolated, name)), `${name} must be written inside the isolated directory`);
      assert.equal(fs.statSync(receipt(isolated, name)).mode & 0o777, 0o600, `${name} must be owner-only`);
      assert.deepEqual(read(receipt(SHARED, name)), before.get(name), `${name} in shared state must remain byte-identical`);
    }
  } finally {
    fs.rmSync(isolated, { recursive: true, force: true });
  }
});
