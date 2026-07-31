import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

test('two funnel writers preserve both CRM transitions', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-funnel-lock-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'DEMIGOD-LEADS.json');
  const lock = `${store}.lock`;
  fs.writeFileSync(store, JSON.stringify({ partners: [{ id: 'a', state: 'sourced' }, { id: 'b', state: 'sourced' }], talent: [] }));
  fs.writeFileSync(lock, `${process.pid} test barrier\n`);

  const run = (id) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'demigod-funnel.mjs'), 'transition', `--id=${id}`, '--to=policy_hold', '--note=no-contact'], {
      env: { ...process.env, DEMIGOD_ROOT: dir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${id} exited ${code}: ${stderr}`)));
  });

  const writers = [run('a'), run('b')];
  await new Promise((resolve) => setTimeout(resolve, 100));
  fs.unlinkSync(lock);
  await Promise.all(writers);

  const leads = JSON.parse(fs.readFileSync(store, 'utf8')).partners;
  assert.deepEqual(leads.map(({ id, state }) => [id, state]), [['a', 'policy_hold'], ['b', 'policy_hold']]);
});
