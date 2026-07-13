#!/usr/bin/env node
/** Smoke-test GTM assist scripts (blast dry-run + SLA test tick). */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';

const checks = [];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });
  return { ok: r.status === 0, status: r.status, out: (r.stdout || r.stderr || '').trim() };
}

const blast = run('node', ['demigod-founder-dm-blast.mjs', '--dry', '--limit=2']);
checks.push({ name: 'dm-blast-dry', ok: blast.ok, detail: blast.out.slice(0, 200) });

const sla = run('node', ['demigod-sla-pager.mjs', '--test']);
checks.push({ name: 'sla-test', ok: sla.ok, detail: sla.out.slice(0, 200) });

const proof = run('node', ['demigod-proof-logger.mjs', '--intro', 'Verify smoke test', '--detail', 'CLI ok']);
checks.push({ name: 'proof-logger-rejects-test', ok: proof.status !== 0, detail: 'should refuse test-looking intro' });

// Pilot tracker + proof-sla smoke (Fable ops review coverage)
const pilotTrack = run('node', ['demigod-pilot-tracker.mjs', '--founderEmail=smoke-intake+pilot@trydemigod.com', '--status=new', '--dry-run']);
checks.push({ name: 'pilot-tracker-smoke', ok: pilotTrack.ok || pilotTrack.status === 0, detail: pilotTrack.out.slice(0, 200) });

const proofSla = run('node', ['demigod-proof-sla.mjs']);
checks.push({ name: 'proof-sla', ok: proofSla.status === 0 || proofSla.status === 1, detail: proofSla.out.slice(0, 200) });

const pass = checks.every((c) => c.ok);
const out = { at: new Date().toISOString(), pass, checks };
fs.writeFileSync(path.join(ROOT, 'DEMIGOD-GTM-SCRIPTS-VERIFY.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(pass ? 0 : 1);