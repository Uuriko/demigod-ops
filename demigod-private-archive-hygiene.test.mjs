#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hardenArchivedInboxes } from './demigod-private-archive-hygiene.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-private-archive-'));
const file = path.join(root, 'archive', 'agent-runs', 'DEMIGOD-SUBMISSIONS-INBOX.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, '{"items":[]}', { mode: 0o644 });
assert.deepEqual(hardenArchivedInboxes(root, false), { files: 1, unsafe: 1, hardened: 0 });
assert.deepEqual(hardenArchivedInboxes(root, true), { files: 1, unsafe: 1, hardened: 1 });
assert.equal(fs.statSync(file).mode & 0o777, 0o600);

console.log('demigod private archive hygiene: PASS');
