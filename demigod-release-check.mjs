#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(path.join(root, 'docs/exchange/DEMIGOD-RELEASE-MANIFEST.json'), 'utf8'),
);
const diskFile = path.join(root, manifest.disk.footCore.file);
const liveUrl = manifest.live.footCdn;

const live = spawnSync('curl', ['--fail', '--silent', '--show-error', '--location', liveUrl], {
  encoding: null,
});
if (live.status !== 0) {
  process.stderr.write(live.stderr || `curl failed with status ${live.status}\n`);
  process.exit(live.status || 1);
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const diskSha256 = sha256(readFileSync(diskFile));
const liveSha256 = sha256(live.stdout);

console.log(`disk ${manifest.disk.footCore.file} ${diskSha256}`);
console.log(`live ${liveUrl} ${liveSha256}`);
console.log(`match ${diskSha256 === liveSha256}`);
