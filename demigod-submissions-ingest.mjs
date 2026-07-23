#!/usr/bin/env node
/** CLI: ingest a submission from JSON file or stdin; CDN publish is explicit opt-in. */
import fs from 'fs';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { ingestSubmission } from './demigod-submissions-lib.mjs';

const args = process.argv.slice(2);
const arg = args.find((value) => !value.startsWith('--'));
const publishRequested = !args.includes('--no-publish') &&
  (args.includes('--publish') || process.env.DEMIGOD_FORCE_PUBLISH === '1');
let body = {};
if (arg && arg !== '-') {
  body = JSON.parse(fs.readFileSync(arg, 'utf8'));
} else {
  const stdin = fs.readFileSync(0, 'utf8');
  body = JSON.parse(stdin);
}

const result = ingestSubmission(body);

let publish = { skipped: true, reason: 'explicit_publish_required' };
if (publishRequested) {
  const gate = spawnSync('node', ['demigod-verify-board-honesty.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (gate.status !== 0) {
    console.error('HONESTY FAIL, skip publish');
    console.error((gate.stdout || gate.stderr || '').slice(0, 400));
    process.exit(1);
  }
  const pub = spawnSync('node', ['demigod-board-publish.mjs'], { cwd: ROOT, encoding: 'utf8' });
  publish = {
    skipped: false,
    ok: pub.status === 0,
    out: pub.status === 0 ? pub.stdout?.trim() : pub.stderr,
  };
}

console.log(
  JSON.stringify({
    ok: publish.skipped || publish.ok,
    id: result.record?.id,
    featured: result.featured,
    board: { roles: result.board?.roles?.length, candidates: result.board?.candidates?.length },
    publish,
  }),
);
