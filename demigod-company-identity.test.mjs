#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./demigod-company-identity.mjs', import.meta.url));
const run = spawnSync(process.execPath, [script, '--selftest'], { encoding: 'utf8' });
assert.equal(run.status, 0, run.stderr || run.stdout);
assert.match(run.stdout, /"selftest":"company-identity"/);
