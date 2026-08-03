import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

function worker(marker) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, DEMIGOD_TEST_SCOPE: marker };
    delete env.NODE_TEST_CONTEXT;
    const result = `/tmp/dg-test-scope-${process.pid}-${marker}.json`;
    const code = `import fs from 'node:fs';import{spawnSync}from'node:child_process';const m=await import('./demigod-submissions-lib.mjs');m.saveInbox({items:[{id:${JSON.stringify(marker)}}]});spawnSync(process.execPath,['--input-type=module','-e',${JSON.stringify("import fs from 'node:fs';import('./demigod-submissions-lib.mjs').then(m=>fs.writeFileSync(process.env.DG_CHILD_RESULT,m.INBOX_PATH))")}],{cwd:process.cwd(),env:{...process.env,DG_CHILD_RESULT:${JSON.stringify(result + '.child')}}});fs.writeFileSync(${JSON.stringify(result)},JSON.stringify({path:m.INBOX_PATH,childPath:fs.readFileSync(${JSON.stringify(result + '.child')},'utf8'),marker:JSON.parse(fs.readFileSync(m.INBOX_PATH)).items[0].id,scope:process.env.DEMIGOD_TEST_SCOPE,result:${JSON.stringify(result)}}))`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', err = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { err += chunk; });
    child.on('error', reject);
    child.on('close', (status) => status === 0 && fs.existsSync(result)
      ? resolve(JSON.parse(fs.readFileSync(result, 'utf8')))
      : reject(new Error(`exit ${status}; stdout=${out}; stderr=${err}`)));
  });
}

test('parallel test workers use distinct storage while descendants inherit one scope', async () => {
  const [a, b] = await Promise.all([worker('worker-a'), worker('worker-b')]);
  assert.notEqual(a.path, b.path);
  assert.notEqual(a.scope, b.scope);
  assert.equal(a.marker, 'worker-a');
  assert.equal(b.marker, 'worker-b');
  assert.equal(a.childPath, a.path);
  assert.equal(b.childPath, b.path);
  const testBase = fs.realpathSync(path.join(os.tmpdir(), 'dg-busy', 'tests'));
  for (const item of [a, b]) {
    assert.ok(item.path.includes(`/tests/${item.scope}/`));
    const root = fs.realpathSync(path.dirname(item.path));
    assert.equal(path.dirname(root), testBase);
    assert.equal(path.basename(root), item.scope);
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(item.result, { force: true });
    fs.rmSync(`${item.result}.child`, { force: true });
  }
});
