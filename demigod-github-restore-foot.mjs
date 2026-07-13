#!/usr/bin/env node
/** Restore demigod-foot-core.js on GitHub via push_files payload file + gh api fallback. */
import fs from 'fs';
import { spawnSync } from 'child_process';

const SRC = '/home/potter/demigod-foot-core.js';
const PAYLOAD = '/home/potter/DEMIGOD-GITHUB-PUSH-PAYLOAD.json';

const content = fs.readFileSync(SRC, 'utf8');
const payload = {
  owner: 'Uuriko',
  repo: 'eat-the-sounds',
  branch: 'master',
  message: 'restore dg-foot-core v21 after accidental empty push',
  files: [{ path: 'demigod-foot-core.js', content }],
};
fs.writeFileSync(PAYLOAD, JSON.stringify(payload));
fs.copyFileSync(SRC, '/home/potter/eat-the-sounds/demigod-foot-core.js');

// Try gh api contents API if gh is authed
const shaRes = spawnSync('gh', [
  'api', 'repos/Uuriko/eat-the-sounds/contents/demigod-foot-core.js', '--jq', '.sha',
], { encoding: 'utf8' });
const sha = (shaRes.stdout || '').trim();
if (sha && sha.length === 40) {
  const b64 = Buffer.from(content, 'utf8').toString('base64');
  const put = spawnSync('gh', [
    'api', '-X', 'PUT', 'repos/Uuriko/eat-the-sounds/contents/demigod-foot-core.js',
    '-f', `message=${payload.message}`,
    '-f', `content=${b64}`,
    '-f', `sha=${sha}`,
    '-f', 'branch=master',
  ], { encoding: 'utf8' });
  if (put.status === 0) {
    console.log(JSON.stringify({ ok: true, method: 'gh-api', sha }));
    process.exit(0);
  }
  console.error('gh put failed', put.stderr || put.stdout);
}

console.log(JSON.stringify({ ok: false, method: 'needs-mcp-push', payload: PAYLOAD, len: content.length }));
process.exit(1);