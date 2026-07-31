#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const sha = (file) =>
  fs.existsSync(file) ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;

test('two live enrich CLIs spend through only one paid run', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-enrich-lock-'));
  const canonical = path.join(ROOT, 'DEMIGOD-LEADS.json');
  const canonicalBefore = sha(canonical);
  try {
    const store = path.join(tmp, 'DEMIGOD-LEADS.json');
    const stubDir = path.join(tmp, 'bin');
    const calls = path.join(tmp, 'firecrawl-calls');
    fs.mkdirSync(stubDir);
    fs.writeFileSync(store, `${JSON.stringify({
      partners: [{
        id: 'paid-race',
        type: 'partner',
        company: 'Acme',
        title: 'Founding Engineer',
        url: 'https://example.com/jobs/1',
        state: 'policy_hold',
        status: 'policy_hold',
        policyHoldReason: 'no-usable-contact',
      }],
      talent: [],
    })}\n`, { mode: 0o600 });
    const firecrawl = path.join(stubDir, 'firecrawl');
    fs.writeFileSync(firecrawl, `#!/usr/bin/env node
import fs from 'node:fs';
const out = process.argv[process.argv.indexOf('-o') + 1];
fs.appendFileSync(process.env.FIRECRAWL_STUB_CALLS, process.pid + '\\n');
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
fs.writeFileSync(out, 'public job page without a person contact '.repeat(3));
`, { mode: 0o700 });

    const env = {
      ...process.env,
      DEMIGOD_ROOT: tmp,
      DEMIGOD_BUSY: path.join(tmp, 'busy'),
      FIRECRAWL_STUB_CALLS: calls,
      HOME: tmp,
      PATH: `${stubDir}:${process.env.PATH}`,
    };
    const run = () => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [
        path.join(ROOT, 'demigod-lead-collect.mjs'),
        '--enrich',
        '--id=paid-race',
        '--limit=1',
        '--force-paused',
      ], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.once('error', reject);
      child.once('exit', (code) => resolve({ code, stdout, stderr }));
    });

    const runs = await Promise.all([run(), run()]);
    assert.deepEqual(runs.map(({ code }) => code).sort(), [0, 1]);
    assert.equal(fs.readFileSync(calls, 'utf8').trim().split('\n').length, 1);
    assert.equal(runs.filter(({ stderr }) => /enrich_already_running/.test(stderr)).length, 1);
    assert.equal(JSON.parse(fs.readFileSync(store, 'utf8')).partners[0].enrichAttemptCount, 1);
    assert.equal(fs.existsSync(`${store}.enrich.lock`), false);
    assert.equal(sha(canonical), canonicalBefore);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
