#!/usr/bin/env node
/**
 * demigod-ponytail — status + light controls for Ponytail (lazy-senior agent skill)
 *
 *   node demigod-ponytail.mjs status [--json]
 *   node demigod-ponytail.mjs check          # exit 0 if green enough
 *   node demigod-ponytail.mjs mode [lite|full|ultra|off]
 *   node demigod-ponytail.mjs help
 *
 * Writes /tmp/dg-busy/ponytail-status.json
 *
 * Upstream: https://github.com/DietrichGebert/ponytail
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const HOME = os.homedir();
const BUSY = '/tmp/dg-busy';
const OUT = path.join(BUSY, 'ponytail-status.json');
const CONFIG = path.join(HOME, '.config/ponytail/config.json');
const REPO = 'https://github.com/DietrichGebert/ponytail';

function ensureBusy() {
  fs.mkdirSync(BUSY, { recursive: true });
}

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function fileMentions(p, re) {
  try {
    return re.test(fs.readFileSync(p, 'utf8'));
  } catch {
    return false;
  }
}

function runQuiet(cmd, args, timeout = 8000) {
  try {
    const r = spawnSync(cmd, args, {
      encoding: 'utf8',
      timeout,
      cwd: ROOT,
      env: process.env,
    });
    return {
      ok: r.status === 0,
      status: r.status,
      out: `${r.stdout || ''}${r.stderr || ''}`.slice(0, 4000),
    };
  } catch (e) {
    return { ok: false, status: null, out: String(e.message || e) };
  }
}

function detectClaudePlugin() {
  const r = runQuiet('claude', ['plugin', 'list']);
  const text = r.out || '';
  const enabled = /ponytail@ponytail/i.test(text) && /enabled|✔/i.test(text);
  const installed = /ponytail@ponytail/i.test(text);
  return { ok: r.ok, installed, enabled, sample: text.slice(0, 500) };
}

function detectCodexPlugin() {
  const r = runQuiet('codex', ['plugin', 'list']);
  const text = r.out || '';
  const installed = /ponytail@ponytail/i.test(text);
  const enabled = installed && /installed,\s*enabled|enabled/i.test(text);
  return { ok: r.ok, installed, enabled, sample: text.slice(0, 500) };
}

export function gatherStatus() {
  ensureBusy();
  const config = readJson(CONFIG) || {};
  const defaultMode = config.defaultMode || process.env.PONYTAIL_DEFAULT_MODE || 'full';
  const cursorRule = path.join(HOME, '.cursor/rules/ponytail.mdc');
  const projectCursorRule = path.join(ROOT, '.cursor/rules/ponytail.mdc');
  const agentsMd = path.join(ROOT, 'AGENTS.md');
  const claudeMd = path.join(ROOT, 'CLAUDE.md');
  const demigodAgents = path.join(ROOT, 'DEMIGOD-AGENTS.md');
  const docsAgents = path.join(ROOT, 'docs/PONYTAIL-AGENTS.md');
  const docsSetup = path.join(ROOT, 'docs/PONYTAIL-SETUP.md');
  const codexAgents = path.join(HOME, '.codex/AGENTS.md');
  const claudeSkill = path.join(HOME, '.claude/skills/ponytail/SKILL.md');
  const standing = path.join(BUSY, 'AGENT-PONYTAIL.md');

  const claude = detectClaudePlugin();
  const codex = detectCodexPlugin();

  const surfaces = {
    claudePlugin: claude,
    codexPlugin: codex,
    cursorRule: {
      home: exists(cursorRule),
      project: exists(projectCursorRule),
      alwaysApply: fileMentions(cursorRule, /alwaysApply:\s*true/),
    },
    agents: {
      AGENTS: fileMentions(agentsMd, /Ponytail/i),
      CLAUDE: fileMentions(claudeMd, /Ponytail/i),
      DEMIGOD_AGENTS: fileMentions(demigodAgents, /Ponytail/i),
      codexAGENTS: fileMentions(codexAgents, /[Pp]onytail|lazy senior/),
    },
    docs: {
      agents: exists(docsAgents),
      setup: exists(docsSetup),
      standing: exists(standing),
    },
    skills: {
      claudeSkill: exists(claudeSkill),
    },
    config: {
      path: CONFIG,
      defaultMode,
      exists: exists(CONFIG),
    },
  };

  const required = [
    surfaces.claudePlugin.enabled || surfaces.claudePlugin.installed,
    surfaces.codexPlugin.enabled || surfaces.codexPlugin.installed,
    surfaces.cursorRule.home || surfaces.cursorRule.project,
    surfaces.agents.AGENTS,
    surfaces.docs.agents,
  ];
  const ok = required.every(Boolean);
  const score =
    (surfaces.claudePlugin.enabled ? 2 : surfaces.claudePlugin.installed ? 1 : 0) +
    (surfaces.codexPlugin.enabled ? 2 : surfaces.codexPlugin.installed ? 1 : 0) +
    (surfaces.cursorRule.home ? 1 : 0) +
    (surfaces.agents.AGENTS ? 1 : 0) +
    (surfaces.agents.CLAUDE ? 1 : 0) +
    (surfaces.agents.DEMIGOD_AGENTS ? 1 : 0) +
    (surfaces.docs.agents ? 1 : 0);

  const missing = [];
  if (!surfaces.claudePlugin.installed) missing.push('claude-plugin');
  if (!surfaces.codexPlugin.installed) missing.push('codex-plugin');
  if (!surfaces.cursorRule.home && !surfaces.cursorRule.project) missing.push('cursor-rule');
  if (!surfaces.agents.AGENTS) missing.push('AGENTS.md');
  if (!surfaces.docs.agents) missing.push('docs/PONYTAIL-AGENTS.md');

  const rec = {
    schema: 'demigod.ponytail-status/1',
    at: new Date().toISOString(),
    repo: REPO,
    ok,
    score,
    scoreMax: 9,
    defaultMode,
    missing,
    surfaces,
    ladder: [
      'YAGNI',
      'reuse-codebase',
      'stdlib',
      'native-platform',
      'installed-dep',
      'one-line',
      'minimum-that-works',
    ],
    keep: ['trust-boundary-validation', 'data-loss-handling', 'security', 'a11y', 'problem-understanding'],
    next:
      missing.length === 0
        ? 'Ponytail ready — agents use full mode by default'
        : `Fix: ${missing.join(', ')} · see docs/PONYTAIL-SETUP.md`,
    cmds: {
      status: 'node demigod-ponytail.mjs status --json',
      check: 'node demigod-ponytail.mjs check',
      mode: 'node demigod-ponytail.mjs mode full',
      dashJob: `curl -sS -X POST 'http://127.0.0.1:9878/api/jobs?run=ponytail'`,
      cli: 'bin/dg ponytail',
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(rec, null, 2) + '\n');
  return rec;
}

function setMode(mode) {
  const allowed = new Set(['lite', 'full', 'ultra', 'off']);
  if (!allowed.has(mode)) {
    console.error(`unknown mode ${mode}; expected lite|full|ultra|off`);
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  const cur = readJson(CONFIG) || {};
  cur.defaultMode = mode;
  fs.writeFileSync(CONFIG, JSON.stringify(cur, null, 2) + '\n');
  process.env.PONYTAIL_DEFAULT_MODE = mode;
  return gatherStatus();
}

function printHuman(rec) {
  const mark = rec.ok ? 'OK' : 'GAPS';
  console.log(`ponytail ${mark} · mode=${rec.defaultMode} · score=${rec.score}/${rec.scoreMax}`);
  console.log(
    `  claude=${rec.surfaces.claudePlugin.enabled ? 'enabled' : rec.surfaces.claudePlugin.installed ? 'installed' : 'missing'}` +
      ` · codex=${rec.surfaces.codexPlugin.enabled ? 'enabled' : rec.surfaces.codexPlugin.installed ? 'installed' : 'missing'}` +
      ` · cursor=${rec.surfaces.cursorRule.home || rec.surfaces.cursorRule.project ? 'rule' : 'missing'}` +
      ` · AGENTS=${rec.surfaces.agents.AGENTS ? 'yes' : 'no'}`,
  );
  if (rec.missing.length) console.log(`  missing: ${rec.missing.join(', ')}`);
  console.log(`  ${rec.next}`);
  console.log(`  receipt: ${OUT}`);
}

function help() {
  console.log(`demigod-ponytail — Ponytail status for dashboard/CLI

  node demigod-ponytail.mjs status [--json]
  node demigod-ponytail.mjs check
  node demigod-ponytail.mjs mode lite|full|ultra|off
  bin/dg ponytail [status|check|mode …]

Upstream: ${REPO}
`);
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'status';
  const asJson = args.includes('--json');

  if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
    help();
    return;
  }

  if (cmd === 'mode') {
    const mode = args[1];
    if (!mode) {
      const rec = gatherStatus();
      if (asJson) console.log(JSON.stringify(rec, null, 2));
      else console.log(rec.defaultMode);
      process.exit(0);
    }
    const rec = setMode(mode);
    if (asJson) console.log(JSON.stringify(rec, null, 2));
    else printHuman(rec);
    process.exit(rec.ok ? 0 : 1);
  }

  if (cmd === 'check') {
    const rec = gatherStatus();
    if (asJson) console.log(JSON.stringify(rec, null, 2));
    else printHuman(rec);
    process.exit(rec.ok ? 0 : 1);
  }

  // status (default)
  const rec = gatherStatus();
  if (asJson || args.includes('--json')) console.log(JSON.stringify(rec, null, 2));
  else printHuman(rec);
  process.exit(0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
