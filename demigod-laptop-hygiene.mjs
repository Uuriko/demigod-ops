#!/usr/bin/env node
/**
 * demigod-laptop-hygiene — tabs + light process/load check for a snappy laptop
 *
 *   node demigod-laptop-hygiene.mjs [--json] [--prune] [--kill-hung] [--optimize]
 *
 * Safe defaults: report only. --prune closes excess CDP tabs. --kill-hung
 * only kills long-running claude --print / stuck demigod playtests (not Chrome CDP).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUSY, ensureBusy, atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
// Flag validation runs only from main() — this module is also imported for sensitiveRetention.
const asJson = args.includes('--json');
const optimize = args.includes('--optimize');
const doPrune = args.includes('--prune') || optimize;
const killHung = args.includes('--kill-hung') || optimize;
const MAX_LOG_BYTES = 2 * 1024 * 1024;
const KEEP_LOG_BYTES = 512 * 1024;
const RETENTION_DAYS = 7;

export function sensitiveRetention(roots, now = Date.now(), retentionDays = RETENTION_DAYS) {
  const files = [];
  const walk = (dir) => {
    try {
      const stat = fs.statSync(dir);
      if (stat.isFile()) { files.push(stat); return; }
    } catch { return; }
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile()) {
        try { files.push(fs.statSync(p)); } catch { /* raced with a writer */ }
      }
    }
  };
  for (const root of roots) walk(root);
  const ages = files.map((stat) => Math.max(0, (now - stat.mtimeMs) / 86400000));
  return {
    fileCount: files.length,
    agedCount: ages.filter((days) => days > retentionDays).length,
    oldestAgeDays: ages.length ? Math.floor(Math.max(...ages)) : null,
    retentionDays,
    unsafeModeCount: files.filter((stat) => (stat.mode & 0o077) !== 0).length,
  };
}

function sh(cmd) {
  return spawnSync('bash', ['-lc', cmd], { encoding: 'utf8', timeout: 20000 });
}

function loadMem() {
  const up = sh('uptime').stdout || '';
  const loadM = up.match(/load average:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  const free = sh("free -b | awk '/^Mem:/{print $2,$7}'").stdout.trim().split(/\s+/);
  const total = Number(free[0]) || 0;
  const avail = Number(free[1]) || 0;
  return {
    load1: loadM ? Number(loadM[1]) : null,
    load5: loadM ? Number(loadM[2]) : null,
    load15: loadM ? Number(loadM[3]) : null,
    memTotalGb: total ? +(total / 1e9).toFixed(1) : null,
    memAvailGb: avail ? +(avail / 1e9).toFixed(1) : null,
    memAvailPct: total ? Math.round((avail / total) * 100) : null,
  };
}

function listHung() {
  // etime can be [[dd-]hh:]mm:ss
  const r = sh("ps -eo pid=,etime=,cmd= | grep -E 'claude --print|demigod-(wiz-cdp|form-e2e|ux-flow|full-audit|mobile-audit)' | grep -v grep || true");
  const lines = (r.stdout || '').trim().split('\n').filter(Boolean);
  const hung = [];
  for (const line of lines) {
    const m = line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    const pid = Number(m[1]);
    const etime = m[2];
    const cmd = m[3];
    // convert rough minutes
    let mins = 0;
    const parts = etime.split(/[-:]/).map(Number);
    if (parts.length === 2) mins = parts[0];
    else if (parts.length === 3) mins = parts[0] * 60 + parts[1];
    else if (parts.length === 4) mins = parts[0] * 24 * 60 + parts[1] * 60 + parts[2];
    if (mins >= 25) hung.push({ pid, etime, mins, cmd: cmd.slice(0, 120) });
  }
  return hung;
}

async function tabCount() {
  try {
    const r = await fetch('http://127.0.0.1:9223/json/list', { signal: AbortSignal.timeout(3000) });
    const j = await r.json();
    const pages = (Array.isArray(j) ? j : []).filter((t) => t.type === 'page');
    const by = {};
    for (const p of pages) {
      const u = p.url || '';
      let k = 'other';
      if (/9878/.test(u)) k = 'ops-dash';
      else if (/trydemigod/.test(u)) k = 'live';
      else if (/design\.webflow/.test(u)) k = 'designer';
      else if (/custom-code/.test(u)) k = 'custom-code';
      else if (/webflow\.com/.test(u)) k = 'webflow';
      by[k] = (by[k] || 0) + 1;
    }
    return { ok: true, pages: pages.length, by };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

function pausedState() {
  const paused = path.join(BUSY, 'watchdog.PAUSED');
  const stops = fs.existsSync(BUSY)
    ? fs.readdirSync(BUSY).filter((name) => name.endsWith('.STOP')).sort()
    : [];
  return { watchdogPaused: fs.existsSync(paused), stops };
}

function trimBusyLogs() {
  const trimmed = [];
  if (!fs.existsSync(BUSY)) return trimmed;
  for (const name of fs.readdirSync(BUSY)) {
    if (!/\.(?:log|txt|jsonl)$/i.test(name)) continue;
    const file = path.join(BUSY, name);
    let stat;
    try { stat = fs.statSync(file); } catch { continue; }
    if (!stat.isFile() || stat.size <= MAX_LOG_BYTES) continue;
    const fd = fs.openSync(file, 'r');
    const kept = Buffer.alloc(Math.min(KEEP_LOG_BYTES, stat.size));
    fs.readSync(fd, kept, 0, kept.length, stat.size - kept.length);
    fs.closeSync(fd);
    const newline = kept.indexOf(10);
    const tail = newline >= 0 ? kept.subarray(newline + 1) : kept;
    atomicWrite(file, tail);
    trimmed.push({ file: name, beforeBytes: stat.size, afterBytes: tail.length });
  }
  return trimmed;
}

async function main() {
  const HYGIENE_FLAGS = new Set(['--json', '--prune', '--kill-hung', '--optimize', '--help', '-h']);
  const unknownHygiene = args.find((a) => !HYGIENE_FLAGS.has(a));
  if (unknownHygiene) {
    console.error(
      `hygiene: unknown argument ${unknownHygiene} — try: node demigod-laptop-hygiene.mjs [--json] [--prune] [--kill-hung] [--optimize]`,
    );
    process.exit(2);
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`demigod-laptop-hygiene — CDP tabs + load

Usage: node demigod-laptop-hygiene.mjs [--json] [--prune] [--kill-hung] [--optimize]`);
    process.exit(0);
  }
  ensureBusy();
  const warmPrepFiles = fs.readdirSync(BUSY)
    .filter((name) => /^warm-.*\.md$/i.test(name))
    .map((name) => path.join(BUSY, name));
  const before = { load: loadMem(), tabs: await tabCount(), paused: pausedState() };
  const report = {
    at: new Date().toISOString(),
    mode: optimize ? 'optimize' : 'report',
    before,
    load: before.load,
    tabs: before.tabs,
    hung: listHung(),
    actions: [],
    tips: [],
    sensitiveRetention: sensitiveRetention([
      path.join(BUSY, 'talent-crm'),
      path.join(ROOT, 'talent-crm', 'resumes'),
      ...warmPrepFiles,
    ]),
  };

  if (optimize && before.paused.watchdogPaused) {
    report.actions.push({
      action: 'paused-guard', ok: true,
      detail: 'watchdog.PAUSED present; swarm/never-stop restart refused',
    });
  }

  const { load, tabs, hung } = report;
  if (load.load1 != null && load.load1 > 4) {
    report.tips.push(`Load high (${load.load1}) — prune tabs, skip parallel claude/swarm`);
  }
  if (load.memAvailPct != null && load.memAvailPct < 15) {
    report.tips.push(`Low free mem (${load.memAvailPct}%) — close Chrome tabs / restart dash`);
  }
  if (tabs.ok && tabs.pages > 10) {
    report.tips.push(`CDP pages ${tabs.pages} > 10 — run with --prune`);
  }
  if (tabs.ok && (tabs.by['ops-dash'] || 0) > 2) {
    report.tips.push(`Ops dash tabs ${tabs.by['ops-dash']} — keep one :9878`);
  }
  if (hung.length) {
    report.tips.push(`${hung.length} hung agent process(es) ≥25m — --kill-hung if stuck`);
  }
  if (report.sensitiveRetention.agedCount > 0) {
    report.tips.push(
      `${report.sensitiveRetention.agedCount} private raw/resume artifact(s) exceed ${report.sensitiveRetention.retentionDays}d retention review`,
    );
  }

  if (doPrune) {
    const p = spawnSync('node', [path.join(ROOT, 'demigod-cdp-tab-prune.mjs')], {
      encoding: 'utf8',
      timeout: 30000,
      cwd: ROOT,
    });
    let detail = null;
    try {
      detail = JSON.parse(p.stdout || '{}');
    } catch {
      detail = { raw: (p.stdout || '').slice(0, 300) };
    }
    report.actions.push({ action: 'tab-prune', ok: p.status === 0, detail });
    report.tabs = await tabCount();
  }

  if (killHung && hung.length) {
    for (const h of hung) {
      try {
        process.kill(h.pid, 'SIGTERM');
        report.actions.push({ action: 'kill-hung', pid: h.pid, ok: true, cmd: h.cmd });
      } catch (e) {
        report.actions.push({ action: 'kill-hung', pid: h.pid, ok: false, err: String(e.message || e) });
      }
    }
  }

  if (optimize) {
    const trimmed = trimBusyLogs();
    report.actions.push({ action: 'trim-busy-logs', ok: true, trimmed });
  }

  // Ensure one ops dash if CDP up and prune left zero
  if (doPrune && report.tabs.ok && !(report.tabs.by['ops-dash'] > 0)) {
    try {
      await fetch(
        `http://127.0.0.1:9223/json/new?${encodeURIComponent('http://127.0.0.1:9878/')}`,
        { method: 'PUT', signal: AbortSignal.timeout(5000) },
      );
      report.actions.push({ action: 'reopen-ops-dash', ok: true });
      report.tabs = await tabCount();
    } catch (e) {
      report.actions.push({ action: 'reopen-ops-dash', ok: false, err: String(e.message || e) });
    }
  }

  report.after = { load: loadMem(), tabs: await tabCount(), paused: pausedState() };
  report.load = report.after.load;
  report.tabs = report.after.tabs;
  const remainingHung = listHung();
  report.hungAfter = remainingHung;
  report.healthy =
    (report.load.load1 == null || report.load.load1 < 6) &&
    (report.load.memAvailPct == null || report.load.memAvailPct > 10) &&
    (!report.tabs.ok || report.tabs.pages <= 12) &&
    remainingHung.length === 0;

  atomicWrite(path.join(BUSY, 'laptop-hygiene.json'), JSON.stringify(report, null, 2) + '\n');
  if (optimize) {
    atomicWrite(path.join(BUSY, 'laptop-optimize-receipt.json'), JSON.stringify(report, null, 2) + '\n');
    const summary = [
      '# Demigod laptop optimization', '',
      `- At: ${report.at}`,
      `- Load (1m): ${before.load.load1} → ${report.after.load.load1}`,
      `- Available memory: ${before.load.memAvailGb} GB (${before.load.memAvailPct}%) → ${report.after.load.memAvailGb} GB (${report.after.load.memAvailPct}%)`,
      `- CDP pages: ${before.tabs.pages ?? '?'} → ${report.after.tabs.pages ?? '?'}`,
      `- Hung processes terminated: ${report.actions.filter((a) => a.action === 'kill-hung' && a.ok).length}`,
      `- Oversized logs trimmed: ${report.actions.find((a) => a.action === 'trim-busy-logs')?.trimmed.length || 0}`,
      `- Watchdog paused preserved: ${report.after.paused.watchdogPaused}; STOP markers: ${report.after.paused.stops.join(', ') || 'none'}`,
      '',
    ].join('\n');
    atomicWrite(path.join(BUSY, 'laptop-optimize-summary.md'), summary);
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `laptop-hygiene ${report.healthy ? 'OK' : 'ATTN'} · load ${load.load1}/${load.load5} · mem free ${load.memAvailGb}G (${load.memAvailPct}%) · tabs ${tabs.pages ?? '?'} · hung ${hung.length}`,
    );
    if (tabs.ok) console.log(`  tabs by: ${JSON.stringify(tabs.by)}`);
    for (const t of report.tips) console.log(`  · ${t}`);
    for (const a of report.actions) {
      console.log(`  action ${a.action}: ${a.ok ? 'ok' : 'fail'} ${a.pid || ''} ${a.detail?.closed != null ? 'closed=' + a.detail.closed : ''}`);
    }
    if (!doPrune && tabs.ok && tabs.pages > 8) {
      console.log('  hint: node demigod-laptop-hygiene.mjs --prune');
    }
  }
  process.exit(report.healthy ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}
