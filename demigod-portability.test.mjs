#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function cleanEnvironment(extra = {}) {
  const environment = { ...process.env, ...extra };
  delete environment.DEMIGOD_ROOT;
  return environment;
}

test('source verification resolves files from its repository, not the caller cwd', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'demigod-portability-'));
  const output = path.join(directory, 'verify.json');
  context.after(() => rm(directory, { recursive: true, force: true }));

  const result = spawnSync(process.execPath, [path.join(ROOT, 'demigod-verify-source.mjs')], {
    cwd: directory,
    encoding: 'utf8',
    env: cleanEnvironment({ DEMIGOD_VERIFY_OUT: output }),
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(await readFile(output, 'utf8')).pass, true);
});

test('bin/dg resolves the repository when called from another directory', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'demigod-cli-'));
  context.after(() => rm(directory, { recursive: true, force: true }));

  const result = spawnSync('bash', [path.join(ROOT, 'bin/dg'), 'modules'], {
    cwd: directory,
    encoding: 'utf8',
    env: cleanEnvironment(),
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Site/);
  assert.match(result.stdout, /Webflow/);
});

test('webhook URL resolution does not load the browser automation stack', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'demigod-webhook-url-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const moduleUrl = pathToFileURL(path.join(ROOT, 'demigod-webhook-url.mjs')).href;
  const script = `import { resolveWebhookPublicUrl } from ${JSON.stringify(moduleUrl)};`
    + ' process.stdout.write(resolveWebhookPublicUrl());';

  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: directory,
    encoding: 'utf8',
    env: cleanEnvironment({ DEMIGOD_ROOT: directory, DEMIGOD_WEBHOOK_PUBLIC_URL: '' }),
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout, '');
});
