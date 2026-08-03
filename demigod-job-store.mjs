#!/usr/bin/env node
/**
 * Persisted job records under /tmp/dg-busy/jobs/ (experiment).
 * CLI: node demigod-job-store.mjs list|get <id>|gc
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUSY, ensureBusy, atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';

const DIR = path.join(BUSY, 'jobs');

export function saveJob(rec) {
  ensureBusy();
  fs.mkdirSync(DIR, { recursive: true });
  if (!rec?.jobId) throw new Error('jobId required');
  const p = path.join(DIR, `${rec.jobId}.json`);
  atomicWrite(p, JSON.stringify(rec, null, 2) + '\n');
  atomicWrite(path.join(BUSY, 'jobs-latest.json'), JSON.stringify(rec, null, 2) + '\n');
  return p;
}

export function listJobs(limit = 30) {
  try {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
    return files
      .map((f) => {
        const j = readJson(path.join(DIR, f));
        const st = fs.statSync(path.join(DIR, f));
        return { ...j, _mtime: st.mtimeMs };
      })
      .filter(Boolean)
      .sort((a, b) => (b._mtime || 0) - (a._mtime || 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export function getJob(id) {
  return readJson(path.join(DIR, `${id}.json`));
}

export function gcJobs(keep = 50) {
  const all = listJobs(500);
  for (const j of all.slice(keep)) {
    try {
      fs.unlinkSync(path.join(DIR, `${j.jobId}.json`));
    } catch {
      /* */
    }
  }
  return { kept: Math.min(keep, all.length), removed: Math.max(0, all.length - keep) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [cmd, id] = process.argv.slice(2);
  if (cmd === 'list') console.log(JSON.stringify(listJobs(), null, 2));
  else if (cmd === 'get') console.log(JSON.stringify(getJob(id), null, 2));
  else if (cmd === 'gc') console.log(JSON.stringify(gcJobs(), null, 2));
  else {
    console.log('usage: node demigod-job-store.mjs list|get <id>|gc');
    process.exit(1);
  }
}
