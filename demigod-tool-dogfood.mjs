#!/usr/bin/env node
/**
 * demigod-tool-dogfood — log every tool use, score usefulness, suggest improvements
 *
 *   node demigod-tool-dogfood.mjs log --tool=truth --ok=1 --why="session start"
 *   node demigod-tool-dogfood.mjs status [--json]
 *   node demigod-tool-dogfood.mjs report [--json]
 *   node demigod-tool-dogfood.mjs wrap --tool=truth --  node demigod-truth.mjs
 *
 * Receipt: /tmp/dg-busy/tool-dogfood.jsonl + tool-dogfood-status.json
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { TOOLS } from './demigod-tools-registry.mjs';

const BUSY = '/tmp/dg-busy';
const LOG = path.join(BUSY, 'tool-dogfood.jsonl');
const STATUS = path.join(BUSY, 'tool-dogfood-status.json');
const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const toolIds = new Set(TOOLS.map((tool) => tool.id));
const retiredLabels = new Set(['workflow-map', 'api-coord']);
const explicitAliases = new Map([
  ['orca-check', 'orca-status'],
  ['orca-wait', 'orca-status'],
  ['orca-dispatch', 'orca-status'],
  ['orca-task', 'orca-status'],
  ['api-orca', 'orca-status'],
]);

function isRetiredLabel(value) {
  // Cycle tags: -123 or -c173 / name-c173 one-off wrap labels
  return (
    !toolIds.has(value) &&
    (retiredLabels.has(value) || /-\d{3,}$/.test(value) || /-c\d{2,}$/i.test(value))
  );
}

const toolAliases = new Map();
for (const tool of TOOLS) {
  const command = tool.cmd.trim().split(/\s+/);
  const executable = path.basename(command[0] || '').replace(/\.(?:mjs|js)$/, '');
  const aliases = [tool.id, `demigod-${tool.id}`, tool.cmd, executable];
  if (command[0] === 'node') {
    const script = path.basename(command[1] || '').replace(/\.(?:mjs|js)$/, '');
    const stage = command.find((part) => part.startsWith('--stage='))?.split('=')[1];
    aliases.push(script, stage ? `${script.replace(/^demigod-/, '')}-${stage}` : '');
  }
  if (command[0] === 'bin/dg' && command[1]) {
    const subcommand = command.slice(1).join(' ');
    aliases.push(command[1], `dg-${command[1]}`, `dg-${subcommand.replace(/\s+/g, '-')}`, `bin/dg ${subcommand}`);
  }
  for (const alias of aliases.filter(Boolean)) {
    const key = alias.toLowerCase();
    const ids = toolAliases.get(key) || new Set();
    ids.add(tool.id);
    toolAliases.set(key, ids);
  }
}

export function canonicalTool(value) {
  const raw = String(value || 'unknown').trim() || 'unknown';
  const key = raw.toLowerCase();
  if (explicitAliases.has(key)) return explicitAliases.get(key);
  const ids = toolAliases.get(key);
  return ids?.size === 1 ? [...ids][0] : raw;
}

function canonicalRowTool(row) {
  const rawTool = canonicalTool(row?.rawTool);
  return toolIds.has(rawTool) ? rawTool : canonicalTool(row?.tool);
}

/**
 * Exit 1 means "ran; product/status not green" only for observational tools
 * (truth/orient/ship/…). Selftests and hard gates use exit 1 as failure —
 * counting them as executionOk painted false "red" instead of "fail" (cont19).
 */
const EXIT1_OK_TOOLS = new Set([
  'truth',
  'orient',
  'control',
  'ship',
  'priority',
  'review',
  'webflow',
  'webflow-doctor',
  'demand',
  'pilot',
  'work-find',
  'hygiene',
  'next-canon',
  'dash',
  'events-online',
]);

/** Exit 2 = observational product amber (local ok / public flaky), not tool crash. */
// Exit 2 = POSIX usage / intentional fail-closed (unknown flags, FOCUS pause gates).
// Count as executionOk so dogfood "fail" stays reserved for crashes/timeouts.
const EXIT2_OK_TOOLS = new Set([
  'events-online',
  'cockpit',
  'ship',
  'funnel-loop',
  'events-bot-selftest',
  'intro-draft',
  'wiz-a11y-audit',
  'priority',
  'work-find',
]);

export function executionSucceeded(status, tool) {
  if (status === 0) return true;
  const id = canonicalTool(tool);
  // Exit 1 = product/status red only for allowlisted observational tools.
  if (status === 1 && EXIT1_OK_TOOLS.has(id)) return true;
  // Exit 2 = soft product red (e.g. events local ok / public flaky) — not tool failure.
  if (status === 2 && EXIT2_OK_TOOLS.has(id)) return true;
  return false;
}

export function executionFailure(r) {
  if (r.status === 124 || r.error?.code === 'ETIMEDOUT') return { failureKind: 'timeout' };
  if (r.error) return { failureKind: 'child-start', stderr: String(r.error.message || r.error).slice(0, 2000) };
  if (r.status !== 0) return { failureKind: 'exit', ...(r.stderr ? { stderr: String(r.stderr).slice(-2000) } : {}) };
  return {};
}

function ensure() {
  fs.mkdirSync(BUSY, { recursive: true });
}

function appendLog(rec) {
  ensure();
  fs.appendFileSync(LOG, JSON.stringify(rec) + '\n');
}

function readLog(limit = 500) {
  try {
    const lines = fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Was the tool process healthy? Product red (ok=false) can still be execution-ok.
 * Prefer childExit over stamped executionOk — wraps from before EXIT2_OK allowlists
 * stamped executionOk:false for observational exit 2, which would freeze false fails.
 */
export function rowExecutionOk(r) {
  if (!r || typeof r !== 'object') return false;
  if (r.ok === true) return true;
  const exit = r.childExit ?? r.status;
  if (exit != null && exit !== '') return executionSucceeded(Number(exit), r.tool);
  if (r.executionOk === true) return true;
  return false;
}

export function rowKind(r) {
  const wrap = r?.source === 'wrap' || r?.source == null;
  const synthetic =
    wrap &&
    Array.isArray(r.argv) &&
    r.argv.length === 1 &&
    path.basename(String(r.argv[0])) === 'true';
  return synthetic ? 'synthetic' : wrap ? 'execution' : 'annotation';
}

export function summarize(rows) {
  const by = {};
  const registryIds = new Set(TOOLS.map((tool) => canonicalTool(tool.id)));
  const blank = (tool) => ({
    tool,
    registered: toolIds.has(tool),
    retired: isRetiredLabel(tool),
    n: 0,
    wraps: 0,
    executions: 0,
    annotations: 0,
    syntheticWraps: 0,
    ok: 0,
    fail: 0,
    timeout: 0,
    red: 0,
    useful: 0,
    notUseful: 0,
    lastAt: null,
    lastExecutionAt: null,
    lastExecutionOk: null,
    lastAnnotationAt: null,
    whys: [],
  });
  for (const tool of registryIds) by[tool] = blank(tool);
  for (const r of rows) {
    const t = canonicalRowTool(r);
    by[t] = by[t] || blank(t);
    by[t].n += 1;
    const kind = rowKind(r);
    if (kind === 'synthetic') {
      by[t].wraps += 1;
      by[t].syntheticWraps += 1;
    } else if (kind === 'execution') {
      by[t].wraps += 1;
      by[t].executions += 1;
      by[t].lastExecutionAt = r.at;
      by[t].lastExecutionOk = rowExecutionOk(r);
      if (r.failureKind === 'timeout' || r.childExit === 124) by[t].timeout += 1;
      if (r.ok) by[t].ok += 1;
      else if (rowExecutionOk(r)) by[t].red += 1;
      else by[t].fail += 1;
    } else {
      by[t].annotations += 1;
      by[t].lastAnnotationAt = r.at;
      if (r.useful === true) by[t].useful += 1;
      if (r.useful === false) by[t].notUseful += 1;
    }
    by[t].lastAt = r.at;
    if (r.why && by[t].whys.length < 5) by[t].whys.push(String(r.why).slice(0, 120));
  }
  const allTools = Object.values(by).sort(
    (a, b) => b.executions - a.executions || b.n - a.n || a.tool.localeCompare(b.tool),
  );
  const retired = allTools.filter((tool) => tool.retired);
  const tools = allTools.filter((tool) => !tool.retired);
  const suggestions = [];
  const unregistered = tools.filter((tool) => !tool.registered && tool.n > 0);
  // One-off labels are evidence, not durable tools. Warn only when an unknown
  // execution label repeats; the row remains visible for diagnosis meanwhile.
  const actionableUnregistered = unregistered.filter((tool) => tool.executions > 1);
  if (actionableUnregistered.length) {
    suggestions.push({
      tool: '*',
      kind: 'registry',
      text: `${actionableUnregistered.reduce((sum, tool) => sum + tool.executions, 0)} executions use unregistered tools — reconcile ${actionableUnregistered.slice(0, 3).map((tool) => tool.tool).join(', ')}`,
    });
  }
  for (const t of tools) {
    if (!registryIds.has(t.tool)) continue;
    const timeoutRate = t.executions ? t.timeout / t.executions : 0;
    const otherFailures = t.fail - t.timeout;
    const failRate = t.executions ? otherFailures / t.executions : 0;
    const ratings = t.useful + t.notUseful;
    const usefulRate = ratings > 0 ? t.useful / ratings : null;
    if (timeoutRate > 0.4 && t.lastExecutionOk === false) {
      suggestions.push({ tool: t.tool, kind: 'timeout', text: `${t.tool} has timeout pressure (${t.timeout}/${t.executions}) — raise the bound or shorten the hot path` });
    }
    if (failRate > 0.4 && t.lastExecutionOk === false) {
      suggestions.push({ tool: t.tool, kind: 'reliability', text: `${t.tool} has other execution failures (${otherFailures}/${t.executions}) — fix the command/docs or remove from hot path` });
    }
    if (usefulRate != null && usefulRate < 0.35 && ratings >= 3) {
      suggestions.push({ tool: t.tool, kind: 'usefulness', text: `${t.tool} rated not useful — redesign for real workflow or demote from dash` });
    }
  }
  const unusedTools = tools
    .filter((tool) => registryIds.has(tool.tool) && tool.executions === 0)
    .map((tool) => tool.tool);
  if (unusedTools.length) {
    suggestions.push({
      tool: '*',
      kind: 'unused',
      text: `${unusedTools.length} registered tools have no direct wrapped execution in this window`,
    });
  }
  if (!rows.length) {
    suggestions.push({ tool: '*', kind: 'bootstrap', text: 'No dogfood yet — agents should wrap tools via demigod-tool-dogfood.mjs wrap' });
  }
  const recentExecutions = rows
    .filter((row) => rowKind(row) === 'execution')
    .slice(-12)
    .reverse()
    .map((row) => ({
      at: row.at,
      tool: canonicalRowTool(row),
      outcome:
        row.failureKind === 'timeout' || row.childExit === 124
          ? 'timeout'
          : row.ok
            ? 'ok'
            : rowExecutionOk(row)
              ? 'red'
              : 'fail',
      childExit: row.childExit ?? row.status ?? null,
      ms: row.ms ?? null,
    }));
  const kindCounts = rows.reduce(
    (counts, row) => {
      const kind = rowKind(row);
      counts[kind] += 1;
      return counts;
    },
    { execution: 0, annotation: 0, synthetic: 0 },
  );
  return {
    schema: 'demigod.tool-dogfood/1',
    at: new Date().toISOString(),
    rawTotal: rows.length,
    total: tools.reduce((sum, tool) => sum + tool.n, 0),
    wrapTotal: kindCounts.execution + kindCounts.synthetic,
    executionTotal: kindCounts.execution,
    annotationTotal: kindCounts.annotation,
    syntheticWrapTotal: kindCounts.synthetic,
    timeouts: tools.reduce((sum, tool) => sum + tool.timeout, 0),
    registeredEvents: tools.filter((tool) => tool.registered).reduce((sum, tool) => sum + tool.n, 0),
    unregisteredEvents: unregistered.reduce((sum, tool) => sum + tool.n, 0),
    unregisteredExecutions: actionableUnregistered.reduce((sum, tool) => sum + tool.executions, 0),
    retiredEvents: retired.reduce((sum, tool) => sum + tool.n, 0),
    registeredTools: tools.filter((tool) => tool.registered && tool.n > 0).length,
    registryTools: registryIds.size,
    usedRegisteredTools: tools.filter(
      (tool) => registryIds.has(tool.tool) && tool.executions > 0,
    ).length,
    unusedRegisteredTools: unusedTools.length,
    unusedTools,
    unregisteredTools: unregistered.length,
    unregisteredExecutionTools: actionableUnregistered.length,
    retiredTools: retired.length,
    retired: retired.map(({ tool, n, lastAt }) => ({ tool, n, lastAt })),
    windowFirstAt: rows[0]?.at || null,
    windowLastAt: rows.at(-1)?.at || null,
    recentExecutions,
    tools,
    suggestions: suggestions.slice(0, 12),
  };
}

/** Fail-closed bool for manual log: only 0|1|true|false (case-insensitive). */
export function parseDogfoodBool(raw, flag) {
  if (raw == null || raw === '') {
    return { error: `dogfood log: missing --${flag}=0|1|true|false` };
  }
  const v = String(raw).trim().toLowerCase();
  if (v === '1' || v === 'true') return { value: true };
  if (v === '0' || v === 'false') return { value: false };
  return { error: `dogfood log: invalid --${flag}=${raw} (use 0|1|true|false)` };
}

/** Parse manual `log` flags without side effects (for tests + logFromArgs). */
export function parseLogFlags(args) {
  const get = (k) => {
    const a = args.find((x) => x.startsWith(`--${k}=`));
    return a ? a.slice(k.length + 3) : null;
  };
  const okP = parseDogfoodBool(get('ok'), 'ok');
  if (okP.error) return { error: okP.error };
  const usefulRaw = get('useful');
  let useful = null;
  if (usefulRaw != null && usefulRaw !== '') {
    const uP = parseDogfoodBool(usefulRaw, 'useful');
    if (uP.error) return { error: uP.error };
    useful = uP.value;
  }
  const rawTool = get('tool') || 'unknown';
  const tool = canonicalTool(rawTool);
  return {
    rawTool,
    tool,
    ok: okP.value,
    useful,
    why: get('why') || '',
    ms: Number(get('ms') || 0) || null,
    source: get('source') || 'manual',
  };
}

function logFromArgs(args) {
  const parsed = parseLogFlags(args);
  if (parsed.error) {
    console.error(parsed.error);
    process.exit(2);
  }
  const { rawTool, tool, ok, useful, why, ms, source } = parsed;
  const rec = {
    at: new Date().toISOString(),
    tool,
    ...(tool !== rawTool ? { rawTool } : {}),
    ok,
    useful,
    why,
    ms,
    source,
  };
  appendLog(rec);
  const status = summarize(readLog());
  fs.writeFileSync(STATUS, JSON.stringify(status, null, 2) + '\n');
  return rec;
}

function wrap(args) {
  const dash = args.indexOf('--');
  const pre = dash >= 0 ? args.slice(0, dash) : args;
  const cmd = dash >= 0 ? args.slice(dash + 1) : [];
  const rawTool = (pre.find((a) => a.startsWith('--tool=')) || '--tool=unknown').split('=')[1];
  const tool = canonicalTool(rawTool);
  if (!cmd.length) {
    console.error('usage: dogfood wrap --tool=NAME -- <command...>');
    process.exit(2);
  }
  const t0 = Date.now();
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, stdio: ['inherit', 'inherit', 'pipe'], env: process.env });
  if (r.stderr) process.stderr.write(r.stderr);
  const ms = Date.now() - t0;
  const ok = r.status === 0;
  const executionOk = executionSucceeded(r.status, tool);
  appendLog({
    at: new Date().toISOString(),
    tool,
    ...(tool !== rawTool ? { rawTool } : {}),
    ok,
    executionOk,
    childExit: r.status,
    ...executionFailure(r),
    useful: null,
    why: 'wrap-exec',
    ms,
    source: 'wrap',
    argv: cmd.slice(0, 6),
  });
  const status = summarize(readLog());
  fs.writeFileSync(STATUS, JSON.stringify(status, null, 2) + '\n');
  process.exit(r.status ?? 1);
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'status';
  const asJson = args.includes('--json');
  if (cmd === 'log') {
    const rec = logFromArgs(args.slice(1));
    console.log(asJson ? JSON.stringify(rec) : `logged ${rec.tool} ok=${rec.ok}`);
    return;
  }
  if (cmd === 'wrap') {
    wrap(args.slice(1));
    return;
  }
  if (!['status', 'report'].includes(cmd)) {
    console.error(`dogfood: unknown command ${cmd}`);
    process.exit(2);
  }
  for (const a of args.slice(1)) {
    if (a === '--json') continue;
    console.error(`dogfood: unknown argument ${a} — try: node demigod-tool-dogfood.mjs ${cmd} [--json]`);
    process.exit(2);
  }
  const status = summarize(readLog());
  fs.writeFileSync(STATUS, JSON.stringify(status, null, 2) + '\n');
  if (asJson || cmd === 'report') console.log(JSON.stringify(status, null, 2));
  else {
    console.log(
      `# dogfood · ${status.executionTotal} executions · ${status.annotationTotal} judgments · ${status.syntheticWrapTotal} synthetic · ${status.unusedRegisteredTools} without direct wraps`,
    );
    for (const t of status.tools.slice(0, 12)) {
      console.log(
        `  ${t.tool}: runs=${t.executions} notes=${t.annotations} ok=${t.ok} red=${t.red} fail=${t.fail} timeout=${t.timeout}`,
      );
    }
    for (const s of status.suggestions.slice(0, 6)) console.log(`! ${s.text}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
