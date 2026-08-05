#!/usr/bin/env node
/**
 * Regular multi-source roles refresh for Demigod website directory + public roles surface.
 *
 * Flow (honesty-preserving):
 *   1. X/Twitter hiring posts (CDP public search) → staging x-hiring.json
 *   2. HN Who-is-hiring (optional; default on) → HN cache / map merge inputs
 *   3. Extract public ATS board URLs → attach to map companies when host/slug matches (--write)
 *   4. Role-ledger poll (public ATS) → first-seen / still-open truth
 *   5. Roles feed → DEMIGOD-ROLES-FEED.json
 *   6. Public roles embed → DEMIGOD-PUBLIC-ROLES.json + demigod-public-roles-embed.js
 *   7. Directory static snapshot (Recently observed roles on /startups)
 *
 * Homepage inject reads window.__dgPublicRoles (from embed) — not DEMIGOD-BOARD seeds.
 * Live CDN still requires an authorized ship; this pipeline keeps disk + embed current.
 *
 *   node demigod-roles-pipeline.mjs              # full run
 *   node demigod-roles-pipeline.mjs --dry         # list steps
 *   node demigod-roles-pipeline.mjs --skip-x      # no CDP X collect
 *   node demigod-roles-pipeline.mjs --skip-hn
 *   node demigod-roles-pipeline.mjs --selftest
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const NODE = process.execPath;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function run(script, args = [], { optional = false } = {}) {
  const full = path.join(ROOT, script);
  console.log(`\n→ node ${script} ${args.join(' ')}`);
  const r = spawnSync(NODE, [full, ...args], { cwd: ROOT, stdio: 'inherit', env: process.env });
  const code = r.status ?? 1;
  if (code !== 0) {
    if (optional) {
      console.warn(`optional step failed (${script} exit ${code}) — continuing`);
      return { ok: false, code, script };
    }
    console.error(`FAILED at ${script} (exit ${code})`);
    process.exit(code || 1);
  }
  return { ok: true, code: 0, script };
}

function buildSteps(args) {
  const skipX = args.includes('--skip-x');
  const skipHn = args.includes('--skip-hn');
  const skipPoll = args.includes('--skip-poll');
  const steps = [];
  if (!skipX) steps.push({ script: 'demigod-x-hiring.mjs', args: [], optional: true });
  if (!skipHn) steps.push({ script: 'demigod-hn-hiring.mjs', args: ['--months', '2'], optional: true });
  steps.push({ script: 'demigod-roles-ats-apply.mjs', args: ['--write'], optional: false });
  if (!skipPoll) steps.push({ script: 'demigod-role-ledger.mjs', args: ['poll'], optional: false });
  steps.push({ script: 'demigod-roles-feed.mjs', args: ['--days', '1', '--limit', '120'], optional: false });
  steps.push({ script: 'demigod-public-roles.mjs', args: ['--limit', '24'], optional: false });
  steps.push({ script: 'demigod-directory-static.mjs', args: [], optional: true });
  return steps;
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    // Composition smoke: dry step list + pure modules
    const steps = buildSteps([]);
    if (steps.length < 5) throw new Error('pipeline steps too short');
    run('demigod-roles-ats-links.mjs', ['--selftest']);
    run('demigod-roles-ats-apply.mjs', ['--selftest']);
    run('demigod-public-roles.mjs', ['--selftest']);
    console.log(JSON.stringify({ ok: true, selftest: 'roles-pipeline', steps: steps.map((s) => s.script) }));
    process.exit(0);
  }
  const steps = buildSteps(args);
  if (args.includes('--dry')) {
    for (const s of steps) console.log('→ node', s.script, s.args.join(' '), s.optional ? '(optional)' : '');
    process.exit(0);
  }
  fs.mkdirSync(BUSY, { recursive: true });
  const started = new Date().toISOString();
  const results = [];
  for (const s of steps) results.push(run(s.script, s.args, { optional: s.optional }));
  const receipt = {
    schema: 'demigod.roles-pipeline/1',
    started,
    ended: new Date().toISOString(),
    results,
    note: 'Disk + public-roles embed refreshed. Live CDN still requires authorized ship.',
  };
  atomicWrite(path.join(BUSY, 'roles-pipeline-latest.json'), JSON.stringify(receipt, null, 2));
  console.log('\n✓ roles pipeline complete ·', path.join(BUSY, 'roles-pipeline-latest.json'));
}
