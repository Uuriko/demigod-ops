#!/usr/bin/env node
/**
 * Persist local job records under DEMIGOD_ROOT.
 * A missing job id writes nothing. This command does not send mail.
 *
 * Usage:
 *   node demigod-job-store.mjs put <jobId> --company "Harbor East"
 *   node demigod-job-store.mjs list
 *   node demigod-job-store.mjs get <jobId>
 *   node demigod-job-store.mjs gc [keep]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function jobsDir() {
  return path.join(dataRoot(), 'DEMIGOD-JOBS');
}

function latestPath() {
  return path.join(dataRoot(), 'DEMIGOD-JOBS-LATEST.json');
}

function jobIdOk(id) {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/.test(String(id || ''));
}

function honesty() {
  return { sent: false, liveMail: false };
}

export function saveJob(rec) {
  if (!jobIdOk(rec?.jobId)) {
    const error = new Error('job_required');
    error.code = 'job_required';
    throw error;
  }
  const dir = jobsDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${rec.jobId}.json`);
  const stored = { ...rec, ...honesty() };
  atomicWrite(file, JSON.stringify(stored, null, 2) + '\n');
  atomicWrite(latestPath(), JSON.stringify(stored, null, 2) + '\n');
  return file;
}

export function listJobs(limit = 30) {
  try {
    const dir = jobsDir();
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
    return files
      .map((name) => {
        const file = path.join(dir, name);
        const job = readJson(file);
        if (!job?.jobId) return null;
        const st = fs.statSync(file);
        return { ...job, _mtime: st.mtimeMs };
      })
      .filter(Boolean)
      .sort((a, b) => (b._mtime || 0) - (a._mtime || 0) || String(a.jobId).localeCompare(String(b.jobId)))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export function getJob(id) {
  if (!jobIdOk(id)) return null;
  return readJson(path.join(jobsDir(), `${id}.json`));
}

export function gcJobs(keep = 50) {
  const all = listJobs(500);
  const drop = all.slice(keep);
  for (const job of drop) {
    try {
      fs.unlinkSync(path.join(jobsDir(), `${job.jobId}.json`));
    } catch {
      /* already gone */
    }
  }
  return { kept: Math.min(keep, all.length), removed: drop.length, ...honesty() };
}

function parsePut(argv) {
  const rec = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      if (!rec.jobId) rec.jobId = arg;
      continue;
    }
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    const value = eq !== -1 ? body.slice(eq + 1) : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '');
    if (key === 'job' || key === 'job-id') rec.jobId = value;
    else rec[key] = value;
  }
  return rec;
}

function emit(code, body) {
  const line = JSON.stringify({ ...body, ...honesty() });
  if (code === 0) console.log(line);
  else console.error(line);
  return code;
}

function run(argv = process.argv.slice(2)) {
  const [cmd, ...rest] = argv;
  if (cmd === 'put') {
    const rec = parsePut(rest);
    if (!jobIdOk(rec.jobId)) return emit(1, { ok: false, error: 'job_required' });
    const file = saveJob(rec);
    return emit(0, { ok: true, jobId: rec.jobId, path: file });
  }
  if (cmd === 'list') {
    const jobs = listJobs();
    return emit(0, { ok: true, count: jobs.length, jobs });
  }
  if (cmd === 'get') {
    const job = getJob(rest[0]);
    if (!job) return emit(1, { ok: false, error: 'job_not_found' });
    return emit(0, { ok: true, job });
  }
  if (cmd === 'gc') {
    const keep = rest[0] == null ? 50 : Number(rest[0]);
    if (!Number.isInteger(keep) || keep < 0) return emit(1, { ok: false, error: 'keep_invalid' });
    return emit(0, { ok: true, ...gcJobs(keep) });
  }
  return emit(1, { ok: false, error: 'command_invalid' });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(run());
