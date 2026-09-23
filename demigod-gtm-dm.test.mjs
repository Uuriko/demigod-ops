import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const HELPER = path.join(OPS, 'demigod-gtm-dm-helper.mjs');

function run(dir, preload) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, HELPER], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const line = String(res.stdout || '').trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

describe('founder draft role', { concurrency: 1 }, () => {
  test('two companies with the same title each keep their own draft', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-dm-'));
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

    fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({
      roles: [
        {
          id: 'role-harbor-east',
          title: 'Founding Engineer',
          company: 'Harbor East',
          skills: 'react billing',
          status: 'Active',
          stageType: 'Seed',
          comp: '$180-220k',
        },
        {
          id: 'role-harbor-west',
          title: 'Founding Engineer',
          company: 'Harbor West',
          skills: 'billing service',
          status: 'Active',
          stageType: 'Seed',
          comp: '$180-220k',
        },
      ],
    }, null, 2));

    const drafted = readJson(run(dir, preload), 'founder drafts');
    assert.equal(drafted.ok, true);
    assert.equal(drafted.sent, false);
    assert.equal(drafted.liveMail, false);
    assert.equal(drafted.drafts.length, 2);
    const east = drafted.drafts.find((row) => row.id === 'role-harbor-east');
    const west = drafted.drafts.find((row) => row.id === 'role-harbor-west');
    assert.equal(east.company, 'Harbor East');
    assert.equal(west.company, 'Harbor West');
    assert.equal(east.path, path.join(dir, 'demigod-outreach', 'founder-dm-role-harbor-east.txt'));
    assert.equal(west.path, path.join(dir, 'demigod-outreach', 'founder-dm-role-harbor-west.txt'));

    const eastBody = fs.readFileSync(east.path, 'utf8');
    const westBody = fs.readFileSync(west.path, 'utf8');
    assert.match(eastBody, /Harbor East/);
    assert.match(eastBody, /role-harbor-east/);
    assert.doesNotMatch(eastBody, /Harbor West/);
    assert.match(westBody, /Harbor West/);
    assert.match(westBody, /role-harbor-west/);
    assert.doesNotMatch(westBody, /Harbor East/);
    assert.equal(fs.existsSync(path.join(OPS, 'demigod-outreach', 'founder-dm-founding-engineer.txt')), false);
    assert.equal(fs.existsSync(flag), false);
  });
});
