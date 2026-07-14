#!/usr/bin/env node
/**
 * demigod-review-proof — baseline-diff, contracts, input fingerprints for review v2.3
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ROOT } from './demigod-review-lib.mjs';
import { hashFiles, sha256File } from './demigod-evidence.mjs';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';

const BUSY = '/tmp/dg-busy';
const PREV_FINDINGS = path.join(BUSY, 'review-findings-prev.json');

export function inputProof(scopeFiles) {
  return {
    files: hashFiles(scopeFiles),
    at: new Date().toISOString(),
  };
}

export function fingerprintSet(findings) {
  const set = new Set();
  for (const f of findings || []) {
    if (f.suppressed) continue;
    const fp = f.fingerprint || `${f.rule}|${f.file}|${f.line}|${f.title}`;
    set.add(fp);
  }
  return set;
}

export function baselineDiff(currentFindings) {
  let prev = [];
  try {
    prev = JSON.parse(fs.readFileSync(PREV_FINDINGS, 'utf8'));
  } catch {
    prev = [];
  }
  const cur = fingerprintSet(currentFindings);
  const old = fingerprintSet(prev);
  const added = [];
  const resolved = [];
  const still = [];
  for (const f of currentFindings || []) {
    if (f.suppressed) continue;
    const fp = f.fingerprint || `${f.rule}|${f.file}|${f.line}|${f.title}`;
    if (!old.has(fp)) added.push({ fingerprint: fp, rule: f.rule, file: f.file, sev: f.sev, title: f.title });
    else still.push({ fingerprint: fp, rule: f.rule, file: f.file, sev: f.sev, title: f.title });
  }
  for (const f of prev || []) {
    if (f.suppressed) continue;
    const fp = f.fingerprint || `${f.rule}|${f.file}|${f.line}|${f.title}`;
    if (!cur.has(fp)) resolved.push({ fingerprint: fp, rule: f.rule, file: f.file, sev: f.sev, title: f.title });
  }
  return {
    added: added.length,
    resolved: resolved.length,
    stillOpen: still.length,
    addedItems: added.slice(0, 50),
    resolvedItems: resolved.slice(0, 50),
    stillItems: still.slice(0, 30),
  };
}

export function saveFindingsSnapshot(findings) {
  fs.mkdirSync(BUSY, { recursive: true });
  const slim = (findings || [])
    .filter((f) => !f.suppressed)
    .map((f) => ({
      fingerprint: f.fingerprint,
      rule: f.rule,
      file: f.file,
      line: f.line,
      sev: f.sev,
      title: f.title,
    }));
  fs.writeFileSync(PREV_FINDINGS, JSON.stringify(slim, null, 2) + '\n');
  return PREV_FINDINGS;
}

/**
 * @param {{ goal?: string, touch?: string[], requireFootLock?: boolean }} contract
 * @param {string[]} scopeFiles
 */
export function checkContract(contract, scopeFiles) {
  const issues = [];
  if (!contract || typeof contract !== 'object') {
    return { ok: false, issues: ['contract missing or invalid JSON'] };
  }
  const touch = (contract.touch || contract.files || []).map((t) => t.replace(/^\.\//, ''));
  const scope = scopeFiles.map((s) => s.replace(/^\.\//, ''));
  if (touch.length) {
    for (const s of scope) {
      const allowed = touch.some((t) => s === t || s.startsWith(t.replace(/\*$/, '')) || s.endsWith(t.replace(/^\*/, '')));
      // simple: exact or prefix match
      const ok =
        touch.includes(s) ||
        touch.some((t) => {
          if (t.endsWith('/*')) return s.startsWith(t.slice(0, -1));
          if (t.includes('*')) {
            const re = new RegExp('^' + t.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return re.test(s);
          }
          return s === t || s.startsWith(t + '/');
        });
      if (!ok) issues.push(`out-of-contract: ${s}`);
    }
  }
  const footTouched = scope.some((s) => s.includes('demigod-foot-core.js') || s.endsWith('demigod-footer-lite.html'));
  const requireLock = contract.requireFootLock !== false && footTouched;
  if (requireLock || contract.requireFootLock === true) {
    if (footTouched || contract.requireFootLock === true) {
      const r = assertCanWriteFoot({ soft: true, label: 'review-contract' });
      if (!r.ok) issues.push(`foot_lock_required: ${r.error || 'claim lock first'}`);
    }
  }
  if (contract.goal && String(contract.goal).length < 3) {
    issues.push('goal too short');
  }
  return { ok: issues.length === 0, issues, touch, footTouched, requireLock };
}

export function loadContract(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

export function midRunGuard(scopeFiles, startMtimes) {
  const changed = [];
  for (const f of scopeFiles) {
    const abs = path.isAbsolute(f) ? f : path.join(ROOT, f);
    try {
      const mt = fs.statSync(abs).mtimeMs;
      if (startMtimes[f] != null && mt !== startMtimes[f]) changed.push(f);
    } catch {
      /* */
    }
  }
  return { ok: changed.length === 0, changed };
}

export function captureMtimes(scopeFiles) {
  const out = {};
  for (const f of scopeFiles) {
    try {
      const abs = path.isAbsolute(f) ? f : path.join(ROOT, f);
      out[f] = fs.statSync(abs).mtimeMs;
    } catch {
      out[f] = null;
    }
  }
  return out;
}
