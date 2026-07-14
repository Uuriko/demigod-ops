#!/usr/bin/env node
/**
 * demigod-review-lib — core: scope, diff hunks, baseline, report, scoring
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { atomicWrite, BUSY, ensureBusy } from './demigod-agent-tools-lib.mjs';

export const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
export const OUT_JSON = path.join(BUSY, 'review-latest.json');
export const OUT_MD = path.join(BUSY, 'review-latest.md');
export const OUT_PROMPT = path.join(BUSY, 'review-fix-prompt.md');
export const OUT_SARIF = path.join(BUSY, 'review-latest.sarif.json');
export const BASELINE_PATH = path.join(ROOT, 'DEMIGOD-REVIEW-BASELINE.json');
export const FIXTURE_DIR = path.join(BUSY, 'review-fixtures');

/** @typedef {'critical'|'high'|'medium'|'low'|'info'} Sev */
/**
 * @typedef {Object} Finding
 * @property {string} id
 * @property {string} rule
 * @property {Sev} sev
 * @property {string} [file]
 * @property {number} [line]
 * @property {number} [col]
 * @property {string} title
 * @property {string} detail
 * @property {string} [fix]
 * @property {'A'|'B'|'C'} [tier]  A=auto-safe B=suggest patch C=agent/human
 * @property {boolean} [inDiff]
 * @property {boolean} [suppressed]
 * @property {string} [fingerprint]
 */

export function sh(cmd, opts = {}) {
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd: opts.cwd || ROOT,
    encoding: 'utf8',
    timeout: opts.timeout || 60000,
    maxBuffer: 12 * 1024 * 1024,
    env: { ...process.env, ...(opts.env || {}) },
  });
  return {
    status: r.status ?? 1,
    out: ((r.stdout || '') + (r.stderr || '')).trim(),
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  };
}

export function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

export function fingerprint(f) {
  const raw = `${f.rule}|${f.file || ''}|${f.line || 0}|${(f.title || '').slice(0, 80)}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}


/** Load optional DEMIGOD-REVIEW.json (project root) */
export function loadReviewConfig() {
  const candidates = [
    path.join(ROOT, 'DEMIGOD-REVIEW.json'),
    path.join(ROOT, '.demigod-review.json'),
  ];
  for (const c of candidates) {
    try {
      if (!fs.existsSync(c)) continue;
      return { path: c, ...(JSON.parse(fs.readFileSync(c, 'utf8')) || {}) };
    } catch {
      /* */
    }
  }
  return null;
}

/** Dedupe by fingerprint; keep highest severity */
export function dedupeFindings(findings) {
  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const map = new Map();
  for (const f of findings) {
    const fp = f.fingerprint || fingerprint(f);
    const prev = map.get(fp);
    if (!prev) {
      map.set(fp, { ...f, fingerprint: fp });
      continue;
    }
    const a = order[f.sev] ?? 9;
    const b = order[prev.sev] ?? 9;
    if (a < b) map.set(fp, { ...f, fingerprint: fp });
  }
  return [...map.values()];
}

export function summaryLine(report) {
  const s = report.summary || {};
  return `REVIEW ${s.fail ? 'FAIL' : 'OK'} files=${report.files?.length ?? 0} findings=${s.count ?? 0} crit=${s.bySev?.critical ?? 0} high=${s.bySev?.high ?? 0} failOn=${s.failOn || 'high'}`;
}

export function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return { at: null, suppress: [], notes: 'Add fingerprints or rule:file:line entries to suppress known noise' };
  }
}

export function isSuppressed(f, baseline) {
  const fp = f.fingerprint || fingerprint(f);
  const list = baseline?.suppress || [];
  for (const s of list) {
    if (typeof s === 'string') {
      if (s === fp || s === f.rule || s === `${f.rule}:${f.file}` || s === `${f.rule}:${f.file}:${f.line}`) {
        return true;
      }
    } else if (s && typeof s === 'object') {
      if (s.fingerprint === fp) return true;
      if (s.rule === f.rule && (!s.file || s.file === f.file) && (s.line == null || s.line === f.line)) return true;
    }
  }
  return false;
}

/** Parse unified diff into Map<file, Set<lineNumber>> of changed lines in new file */
export function parseDiffHunks(diffText) {
  /** @type {Map<string, Set<number>>} */
  const map = new Map();
  let file = null;
  let newLine = 0;
  for (const line of String(diffText || '').split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice(6).trim();
      if (file === '/dev/null') file = null;
      else if (!map.has(file)) map.set(file, new Set());
      continue;
    }
    if (line.startsWith('@@')) {
      const m = line.match(/\+(\d+)(?:,(\d+))?/);
      newLine = m ? Number(m[1]) : 0;
      continue;
    }
    if (!file) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) {
      map.get(file)?.add(newLine);
      newLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // removed line — no new line number
    } else {
      newLine++; // context
    }
  }
  return map;
}

export function getGitDiff(base = null) {
  if (base) {
    return sh(`git diff ${shellQuote(base)} 2>/dev/null`, { timeout: 30000 }).stdout;
  }
  // Single pass: working tree + index vs HEAD (includes staged; no double-count)
  return sh('git diff HEAD 2>/dev/null', { timeout: 30000 }).stdout;
}

export function listScopeFiles(opts = {}) {
  const {
    noGit = false,
    untracked = false,
    base = null,
    files = null,
    hotUntracked = true,
  } = opts;
  const set = new Set();

  if (files?.length) {
    for (const f of files) {
      const abs = path.resolve(ROOT, f);
      const rootAbs = path.resolve(ROOT);
      if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) {
        // path escape — skip (main may report if needed)
        continue;
      }
      const rel = path.relative(ROOT, abs);
      if (rel.startsWith('..')) continue;
      if (!shouldReview(rel) && !fs.existsSync(path.join(ROOT, rel))) {
        // allow missing tracked files for missing-file findings
        if (!rel || rel.includes('..')) continue;
      }
      if (shouldReview(rel) || !fs.existsSync(path.join(ROOT, rel))) {
        set.add(rel);
      }
    }
    return [...set];
  }

  if (!noGit) {
    const st = sh('git status --porcelain --untracked-files=no 2>/dev/null', { timeout: 15000 });
    if (st.status === 0 && st.stdout) {
      for (const line of st.stdout.split('\n')) {
        if (!line.trim()) continue;
        let p = line.slice(3).trim();
        if (p.includes(' -> ')) p = p.split(' -> ').pop();
        if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
        set.add(p);
      }
    }
    if (base) {
      const d = sh(`git diff --name-only ${shellQuote(base)} 2>/dev/null`, { timeout: 15000 });
      for (const p of d.stdout.split('\n')) if (p.trim()) set.add(p.trim());
    }
    if (untracked) {
      const un = sh(
        "git ls-files --others --exclude-standard -- 'demigod-*.mjs' 'demigod-*.js' 'demigod-*.html' 'bin/dg-*' 'scripts/demigod-*' 2>/dev/null",
        { timeout: 20000 },
      );
      for (const p of un.stdout.split('\n')) if (p.trim()) set.add(p.trim());
    } else if (hotUntracked) {
      for (const p of [
        'demigod-review.mjs',
        'demigod-review-lib.mjs',
        'demigod-review-rules.mjs',
        'demigod-review-fix.mjs',
        'demigod-review-gates.mjs',
        'demigod-review-llm.mjs',
        'demigod-review-selftest.mjs',
        'bin/dg-review',
        'demigod-pairs-lib.mjs',
        'demigod-match-review.mjs',
        'demigod-auto-propose.mjs',
        'demigod-sprint-selftest.mjs',
      ]) {
        if (!fs.existsSync(path.join(ROOT, p))) continue;
        const tr = sh(`git ls-files --error-unmatch ${shellQuote(p)} 2>/dev/null`);
        if (tr.status !== 0) set.add(p);
      }
    }
  }

  return [...set].filter((rel) => shouldReview(rel));
}

export function shouldReview(rel) {
  if (!rel || rel.startsWith('.git/')) return false;
  if (rel.includes('node_modules/') || rel.startsWith('.cache/') || rel.startsWith('.grok/')) return false;
  if (rel.startsWith('.config/') || rel.startsWith('.local/')) return false;
  if (/\.(png|jpg|jpeg|gif|webp|ico|woff2?|map|lock)$/i.test(rel)) return false;
  try {
    const st = fs.statSync(path.join(ROOT, rel));
    if (!st.isFile() || st.size > 2_000_000) return false;
  } catch {
    return false;
  }
  return (
    /^(demigod-|bin\/|scripts\/|\.cursor\/|package\.json|AGENTS\.md|DEMIGOD-)/.test(rel) ||
    /\.(mjs|js|html|css|md|json)$/.test(rel)
  );
}

export function readRel(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}

export function syntaxCheck(rel) {
  if (!/\.(mjs|js|cjs)$/.test(rel)) return null;
  const r = spawnSync('node', ['--check', path.join(ROOT, rel)], {
    encoding: 'utf8',
    timeout: 20000,
  });
  if (r.status === 0) return null;
  return {
    id: crypto.randomBytes(4).toString('hex'),
    rule: 'syntax',
    sev: 'critical',
    file: rel,
    title: 'Syntax error (node --check)',
    detail: ((r.stderr || r.stdout || '') + '').slice(0, 400),
    fix: 'Fix parse error before other work',
    tier: 'C',
  };
}

/**
 * @param {any[]} findings
 * @param {{ failOn?: string }} [opts]
 */
export function scoreSummary(findings, opts = {}) {
  const bySev = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let active = 0;
  for (const f of findings) {
    if (f.suppressed) continue;
    active++;
    bySev[f.sev] = (bySev[f.sev] || 0) + 1;
  }
  const failOn = opts.failOn || 'high';
  let fail = false;
  if (failOn === 'never') fail = false;
  else if (failOn === 'any') fail = active > 0;
  else if (failOn === 'critical') fail = bySev.critical > 0;
  else if (failOn === 'high') fail = bySev.critical > 0 || bySev.high > 0;
  else if (failOn === 'medium') fail = bySev.critical + bySev.high + bySev.medium > 0;
  else if (failOn === 'low') fail = bySev.critical + bySev.high + bySev.medium + bySev.low > 0;
  else fail = bySev.critical > 0 || bySev.high > 0;
  return {
    bySev,
    count: active,
    suppressed: findings.filter((f) => f.suppressed).length,
    fail,
    failOn,
  };
}

/** Keep highest-severity findings up to max; demote rest as suppressed */
export function limitFindings(findings, max) {
  if (!max || max <= 0) return findings;
  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const active = findings.filter((f) => !f.suppressed);
  const suppressed = findings.filter((f) => f.suppressed);
  active.sort((a, b) => (order[a.sev] ?? 9) - (order[b.sev] ?? 9));
  const kept = active.slice(0, max);
  const dropped = active.slice(max).map((f) => ({
    ...f,
    suppressed: true,
    detail: (f.detail || '') + ' [max-findings]',
  }));
  return [...kept, ...dropped, ...suppressed];
}

/** Simple exclude: substring or trailing glob * */
export function matchExclude(rel, patterns) {
  if (!patterns?.length) return false;
  const n = rel.replace(/\\/g, '/');
  for (let p of patterns) {
    if (!p) continue;
    p = p.replace(/\\/g, '/');
    if (p.endsWith('/*')) {
      const pref = p.slice(0, -1);
      if (n.startsWith(pref) || n.includes('/' + pref)) return true;
    }
    if (p.startsWith('*.')) {
      if (n.endsWith(p.slice(1))) return true;
    }
    if (n === p || n.endsWith('/' + p) || n.includes(p)) return true;
  }
  return false;
}


export function markDiffAwareness(findings, hunks) {
  if (!hunks || hunks.size === 0) {
    for (const f of findings) f.inDiff = null;
    return findings;
  }
  for (const f of findings) {
    if (!f.file || f.line == null) {
      f.inDiff = null;
      continue;
    }
    const set = hunks.get(f.file);
    f.inDiff = set ? set.has(f.line) : false;
  }
  return findings;
}

/**
 * Prefer in-diff findings; demote out-of-diff medium/low unless --full
 */
export function applyDiffFilter(findings, { full = false, bug = false } = {}) {
  if (full) return findings;
  return findings.map((f) => {
    if (f.inDiff === false && f.sev !== 'critical' && f.sev !== 'high') {
      // keep but mark; optional drop of low
      if (!bug && f.sev === 'low') return { ...f, suppressed: true, detail: (f.detail || '') + ' [out-of-diff demoted]' };
    }
    if (f.inDiff === false && f.sev === 'medium' && !bug) {
      return { ...f, sev: 'low', detail: (f.detail || '') + ' [out-of-diff → low]' };
    }
    return f;
  });
}

export function toMarkdown(report) {
  const lines = [];
  lines.push(`# Demigod code review v2`);
  lines.push(`at: ${report.at}`);
  lines.push(
    `files: ${report.files.length} · findings: ${report.summary.count} (suppressed ${report.summary.suppressed}) · fail: ${report.summary.fail}`,
  );
  lines.push(`sev: ${JSON.stringify(report.summary.bySev)}`);
  if (report.timing) lines.push(`timing: ${report.timing.ms}ms`);
  lines.push('');
  if (report.gates?.length) {
    lines.push('## Gates');
    for (const g of report.gates) {
      lines.push(`- ${g.ok ? '✓' : '✗'} ${g.id}${g.detail ? ' — ' + String(g.detail).slice(0, 100) : ''}`);
    }
    lines.push('');
  }
  if (report.autoApplied?.length) {
    lines.push('## Auto-fix');
    for (const a of report.autoApplied) {
      lines.push(`- ${a.file}: ${(a.fixes || []).join(', ')}${a.dryRun ? ' (dry-run)' : ''}`);
    }
    lines.push('');
  }
  lines.push('## Findings');
  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sorted = [...report.findings]
    .filter((f) => !f.suppressed)
    .sort((a, b) => (order[a.sev] ?? 9) - (order[b.sev] ?? 9) || String(a.file).localeCompare(String(b.file || '')));
  if (!sorted.length) lines.push('_No active findings._');
  for (const f of sorted) {
    const loc = `${f.file || '?'}${f.line ? ':' + f.line : ''}`;
    const diff = f.inDiff === true ? ' · in-diff' : f.inDiff === false ? ' · outside-diff' : '';
    lines.push(`### [${f.sev}] ${f.title}`);
    lines.push(`- \`${loc}\`${diff} · rule=\`${f.rule}\` · tier=${f.tier || '?'} · fp=\`${f.fingerprint}\``);
    lines.push(`- ${f.detail || ''}`);
    if (f.fix) lines.push(`- **fix:** ${f.fix}`);
    lines.push('');
  }
  lines.push('## Files');
  for (const f of report.files) lines.push(`- ${f}`);
  lines.push('');
  lines.push('## Commands');
  lines.push('```');
  lines.push('bin/dg-review');
  lines.push('bin/dg-review --bug --gates');
  lines.push('bin/dg-review --fix --dry-run');
  lines.push('bin/dg-review --full          # no out-of-diff demotion');
  lines.push('bin/dg-review --baseline-add  # append current high-noise fps (careful)');
  lines.push('```');
  return lines.join('\n') + '\n';
}

export function toFixPrompt(report) {
  const blockers = report.findings.filter((f) => !f.suppressed && (f.sev === 'critical' || f.sev === 'high'));
  const medium = report.findings.filter((f) => !f.suppressed && f.sev === 'medium').slice(0, 25);
  const lines = [];
  lines.push(`# Agent fix prompt — Demigod review v2 · ${report.at}`);
  lines.push('');
  lines.push(
    'Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty. Freeze ON unless told otherwise.',
  );
  lines.push('Fix blockers first. One canonical file per concern. Verify after.');
  lines.push('');
  lines.push('## Hard rules');
  lines.push('- Never touch game files (Eat the Sounds archived)');
  lines.push('- Board only via saveBoard/writeBoard + {reason,actor}; real roles need DEMIGOD_ALLOW_REAL_ROLES=1');
  lines.push('- Foot edits only demigod-foot-core.js');
  lines.push('- No 48h/SLA promises in user-facing copy (scrub/runtime OK)');
  lines.push('- Prefer tier A auto-fix when listed; tier B as patches; tier C needs judgment');
  lines.push('');
  lines.push(`## Blockers (${blockers.length})`);
  if (!blockers.length) lines.push('_None._');
  for (const f of blockers) {
    lines.push(
      `- **[${f.sev}] ${f.title}** \`${f.file}${f.line ? ':' + f.line : ''}\` rule=${f.rule} tier=${f.tier || 'C'}`,
    );
    lines.push(`  ${f.detail}`);
    if (f.fix) lines.push(`  fix: ${f.fix}`);
  }
  lines.push('');
  lines.push(`## Medium (top ${medium.length})`);
  for (const f of medium) {
    lines.push(`- ${f.title} @ \`${f.file}${f.line ? ':' + f.line : ''}\` (${f.rule}) — ${String(f.detail).slice(0, 120)}`);
  }
  lines.push('');
  lines.push('## Verify');
  lines.push('```bash');
  lines.push('bin/dg-review --files <touched>');
  if (report.gatesSuggested?.length) {
    for (const g of report.gatesSuggested) lines.push(g.cmd);
  } else {
    lines.push('node demigod-sprint-selftest.mjs  # if pairs/board/match');
    lines.push('npm run demigod:verify:source   # if foot/head');
  }
  lines.push('```');
  lines.push('');
  lines.push(`Reports: ${OUT_JSON} · ${OUT_MD}`);
  return lines.join('\n') + '\n';
}

/** Minimal SARIF 2.1.0 for IDE import */
export function toSarif(report) {
  const results = report.findings
    .filter((f) => !f.suppressed)
    .map((f) => ({
      ruleId: f.rule || 'unknown',
      level: f.sev === 'critical' || f.sev === 'high' ? 'error' : f.sev === 'medium' ? 'warning' : 'note',
      message: { text: `${f.title}: ${f.detail || ''}` },
      locations: f.file
        ? [
            {
              physicalLocation: {
                artifactLocation: { uri: f.file },
                region: f.line ? { startLine: f.line } : undefined,
              },
            },
          ]
        : [],
      partialFingerprints: { demigod: f.fingerprint },
    }));
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: 'demigod-review', version: '2.1.0', informationUri: 'https://www.trydemigod.com' } },
        results,
      },
    ],
  };
}

export function writeReports(report, { sarif = true } = {}) {
  ensureBusy();
  atomicWrite(OUT_JSON, JSON.stringify(report, null, 2) + '\n');
  atomicWrite(OUT_MD, toMarkdown(report));
  atomicWrite(OUT_PROMPT, toFixPrompt(report));
  if (sarif) atomicWrite(OUT_SARIF, JSON.stringify(toSarif(report), null, 2) + '\n');
  return { json: OUT_JSON, md: OUT_MD, prompt: OUT_PROMPT, sarif: OUT_SARIF };
}

export function finalizeFindings(raw, baseline) {
  return raw.map((f) => {
    const fp = fingerprint(f);
    const full = { ...f, fingerprint: fp, id: f.id || crypto.randomBytes(4).toString('hex') };
    if (isSuppressed(full, baseline)) full.suppressed = true;
    return full;
  });
}

export function appendBaseline(findings, { onlySev = null } = {}) {
  const base = loadBaseline();
  const set = new Set((base.suppress || []).map((s) => (typeof s === 'string' ? s : s.fingerprint)).filter(Boolean));
  let added = 0;
  for (const f of findings) {
    if (f.suppressed) continue;
    if (onlySev && f.sev !== onlySev) continue;
    const fp = f.fingerprint || fingerprint(f);
    if (set.has(fp)) continue;
    base.suppress = base.suppress || [];
    base.suppress.push({
      fingerprint: fp,
      rule: f.rule,
      file: f.file,
      line: f.line,
      title: f.title,
      at: new Date().toISOString(),
    });
    set.add(fp);
    added++;
  }
  base.at = new Date().toISOString();
  atomicWrite(BASELINE_PATH, JSON.stringify(base, null, 2) + '\n');
  return { added, path: BASELINE_PATH, total: base.suppress.length };
}
