#!/usr/bin/env node
/**
 * demigod-agent-bus.mjs — lean Orca peer bus for Claude ⇄ Grok ⇄ Codex
 *
 * Resolves fresh terminal handles each call (never persist handles in repo docs).
 * Primary path: orca-ide orchestration. Fallbacks remain ask-claude / grok-ask.
 *
 *   node demigod-agent-bus.mjs roster
 *   node demigod-agent-bus.mjs send claude --subject "…" --body "…"
 *   node demigod-agent-bus.mjs task codex --title "…" --spec "…"
 *   node demigod-agent-bus.mjs wake claude
 *   node demigod-agent-bus.mjs status
 *   node demigod-agent-bus.mjs unstick   # answer Claude "resume from summary" prompts
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const ROSTER = path.join(BUSY, 'agent-roster.json');
const CLI = process.env.ORCA_CLI || 'orca-ide';
const WT = `path:${ROOT}`;

function orca(args, timeout = 15000) {
  const r = spawnSync(CLI, args, { cwd: ROOT, encoding: 'utf8', timeout });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim().slice(0, 400);
    throw new Error(`orca-ide ${args[0]} failed: ${err || `exit ${r.status}`}`);
  }
  try {
    return JSON.parse(r.stdout || '{}');
  } catch {
    return { raw: r.stdout };
  }
}

function orcaOk(args, timeout = 15000) {
  try {
    return orca(args, timeout);
  } catch {
    return null;
  }
}

function terminals() {
  const d = orca(['terminal', 'list', '--worktree', WT, '--json']);
  const rows = d?.result?.terminals || [];
  return rows.filter((t) => t.orphaned !== true && (!t.worktreePath || t.worktreePath === ROOT));
}

function classify(t) {
  const title = String(t.title || '');
  const prev = String(t.preview || '').toLowerCase();
  const titleL = title.toLowerCase();
  // Tab titles win — scrollback often mentions other agents.
  if (/-\s*grok\b/i.test(title) || /demigod · grok/i.test(title) || /^[^A-Za-z0-9]*grok\b/i.test(title)) return 'grok';
  if (/openai codex/i.test(title) || /demigod · codex/i.test(title)) return 'codex';
  if (/\bclaude\b/i.test(title) || /✳/.test(title)) {
    if (/claude|audit|orchestr/i.test(title)) return 'claude';
  }
  const blob = `${titleL}\n${prev}`;
  if (/\bcodex\b/.test(blob) || /openai codex/.test(blob) || /gpt-5\.6/.test(blob)) return 'codex';
  if (/\bgrok\b/.test(blob) || /grok --/.test(blob)) return 'grok';
  if (/\bclaude\b/.test(blob) || /claude '--/.test(blob) || /claude --/.test(blob)) return 'claude';
  if (/potter@pop-os:/.test(title) && /\$\s*$/.test(prev.replace(/\n/g, ' '))) return 'shell';
  return 'other';
}

function loadRoleHints() {
  try {
    return JSON.parse(fs.readFileSync(path.join(BUSY, 'agent-role-hints.json'), 'utf8')) || {};
  } catch {
    return {};
  }
}

function saveRoleHint(handle, role) {
  const hints = loadRoleHints();
  hints[handle] = { role, at: new Date().toISOString() };
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'agent-role-hints.json'), JSON.stringify(hints, null, 2));
}

function buildRoster() {
  const rows = terminals();
  const hints = loadRoleHints();
  const byRole = { claude: [], codex: [], grok: [], shell: [], other: [] };
  for (const t of rows) {
    let role = classify(t);
    // sticky hint wins over misclassify from polluted previews/tails
    if (hints[t.handle]?.role) {
      role = hints[t.handle].role;
    } else if ((role === 'shell' || role === 'other') && t.writable) {
      const tail = readTailSafe(t.handle, 12);
      if (/openai codex|\bcodex\b/i.test(tail)) role = 'codex';
      else if (/\bclaude\b|bypass permissions/i.test(tail)) role = 'claude';
      else if (/\bgrok\b/i.test(tail)) role = 'grok';
    }
    const entry = {
      handle: t.handle,
      role,
      title: t.title || null,
      connected: t.connected === true,
      writable: t.writable === true,
      preview: String(t.preview || '').replace(/\s+/g, ' ').slice(0, 140),
    };
    (byRole[role] || byRole.other).push(entry);
  }
  // prefer labeled Demigod/coordinator rows, then first writable connected
  const pick = (role) => {
    const list = byRole[role] || [];
    const score = (e) => {
      let s = 0;
      const t = `${e.title || ''} ${e.preview || ''}`;
      if (e.writable && e.connected) s += 10;
      if (/demigod/i.test(t)) s += 5;
      if (role === 'grok' && /-\s*grok\b/i.test(e.title || '')) s += 4;
      if (role === 'claude' && /claude/i.test(e.preview || '')) s += 2;
      if (role === 'codex' && /codex|openai codex/i.test(t)) s += 4;
      // deprioritize spinner-only previews as sole signal
      if (/^[┃◆⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏\s•Woringk]+$/i.test((e.preview || '').slice(0, 40))) s -= 1;
      return s;
    };
    return [...list].sort((a, b) => score(b) - score(a))[0] || null;
  };
  const roster = {
    schema: 'demigod.agent-roster/1',
    at: new Date().toISOString(),
    runtimeId: orcaOk(['status', '--json'])?.result?.runtime?.runtimeId || null,
    primary: {
      claude: pick('claude'),
      codex: pick('codex'),
      grok: pick('grok'),
      shell: pick('shell'),
    },
    all: byRole,
    counts: Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, v.length])),
  };
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(ROSTER, JSON.stringify(roster, null, 2));
  return roster;
}

function resolveRole(role) {
  const r = buildRoster();
  const key = String(role || '').toLowerCase();
  if (key.startsWith('term_')) return { handle: key, role: 'raw' };
  const primary = r.primary[key];
  if (!primary?.handle) throw new Error(`no live terminal for role=${key}; run: node demigod-agent-bus.mjs roster`);
  return primary;
}

function argVal(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  return argv[i + 1] ?? null;
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

function cmdRoster() {
  const r = buildRoster();
  console.log(
    JSON.stringify(
      {
        at: r.at,
        counts: r.counts,
        primary: Object.fromEntries(
          Object.entries(r.primary).map(([k, v]) => [
            k,
            v ? { handle: v.handle, title: v.title, writable: v.writable } : null,
          ]),
        ),
      },
      null,
      2,
    ),
  );
  return 0;
}

function cmdStatus() {
  const r = buildRoster();
  const tasks = orcaOk(['orchestration', 'task-list', '--json'])?.result?.tasks || [];
  const inbox = orcaOk(['orchestration', 'inbox', '--limit', '30', '--json'])?.result?.messages || [];
  const pending = tasks.filter((t) => !['completed', 'failed', 'cancelled'].includes(t.status));
  const unread = inbox.filter((m) => m.read === 0);
  console.log(
    JSON.stringify(
      {
        at: r.at,
        primary: r.primary,
        pendingTaskCount: pending.length,
        pending: pending.slice(0, 10).map((t) => ({
          id: t.id,
          status: t.status,
          title: t.title || t.taskTitle || t.displayName || t.spec?.slice?.(0, 80),
        })),
        unreadCount: unread.length,
        unread: unread.slice(0, 8).map((m) => ({
          id: m.id,
          subject: m.subject,
          type: m.type,
          from: m.from_handle,
          to: m.to_handle,
        })),
        rosterPath: ROSTER,
      },
      null,
      2,
    ),
  );
  return 0;
}

function cmdSend(argv) {
  const role = argv[0];
  const subject = argVal(argv, '--subject') || argVal(argv, '-s') || 'bus';
  const body = argVal(argv, '--body') || argVal(argv, '-b') || '';
  const type = argVal(argv, '--type') || 'status';
  const thread = argVal(argv, '--thread-id') || argVal(argv, '--thread') || null;
  const fromRole = argVal(argv, '--from') || 'grok';
  const to = resolveRole(role);
  let from = null;
  try {
    from = resolveRole(fromRole);
  } catch {
    from = null;
  }
  const args = [
    'orchestration',
    'send',
    '--to',
    to.handle,
    '--subject',
    subject,
    '--body',
    body,
    '--type',
    type,
    '--json',
  ];
  if (from?.handle) args.push('--from', from.handle);
  if (thread) args.push('--thread-id', thread);
  const d = orca(args);
  console.log(JSON.stringify({ ok: true, to: to.handle, role: to.role || role, result: d.result || d }, null, 2));
  return 0;
}

function cmdTask(argv) {
  const role = argv[0];
  const title = argVal(argv, '--title') || argVal(argv, '-t') || `bus→${role}`;
  const spec = argVal(argv, '--spec') || argVal(argv, '-s') || '';
  if (!spec) throw new Error('task needs --spec "…"');
  const to = resolveRole(role);
  let from = null;
  try {
    from = resolveRole(argVal(argv, '--from') || 'grok');
  } catch {
    from = null;
  }
  const created = orca([
    'orchestration',
    'task-create',
    '--task-title',
    title,
    '--display-name',
    title.slice(0, 48),
    '--spec',
    spec,
    '--json',
  ]);
  const taskId = created?.result?.task?.id || created?.result?.id || created?.result?.taskId;
  if (!taskId) throw new Error(`task-create returned no id: ${JSON.stringify(created).slice(0, 300)}`);
  const dispatchArgs = ['orchestration', 'dispatch', '--task', taskId, '--to', to.handle, '--inject', '--json'];
  if (from?.handle) dispatchArgs.push('--from', from.handle);
  const dispatched = orca(dispatchArgs);
  // Always wake TUI so inject is not silently unread (skip with --no-wake)
  if (!hasFlag(argv, '--no-wake')) {
    try {
      orca([
        'terminal',
        'send',
        '--terminal',
        to.handle,
        '--text',
        `orca-ide orchestration check --terminal ${to.handle} --unread --inject --json`,
        '--enter',
        '--json',
      ]);
    } catch {
      /* inject may already be enough for some TUIs */
    }
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        taskId,
        to: { role, handle: to.handle },
        from: from?.handle || null,
        dispatch: dispatched.result || dispatched,
      },
      null,
      2,
    ),
  );
  return 0;
}

function cmdWake(argv) {
  const role = argv[0] || 'claude';
  const t = resolveRole(role);
  const cmd = `orca-ide orchestration check --terminal ${t.handle} --unread --inject --json`;
  const d = orca(['terminal', 'send', '--terminal', t.handle, '--text', cmd, '--enter', '--json']);
  console.log(JSON.stringify({ ok: true, role, handle: t.handle, woke: true, result: d.result || d }, null, 2));
  return 0;
}

function readTail(handle, limit = 40) {
  const d = orcaOk(['terminal', 'read', '--terminal', handle, '--limit', String(limit), '--json']);
  return (d?.result?.terminal?.tail || []).join('\n');
}

function readTailSafe(handle, limit = 12) {
  try {
    return readTail(handle, limit);
  } catch {
    return '';
  }
}

function cmdUnstick() {
  const r = buildRoster();
  const candidates = [...(r.all.claude || []), ...(r.all.codex || []), ...(r.all.other || [])];
  const results = [];
  for (const t of candidates) {
    let tail = '';
    try {
      tail = readTail(t.handle);
    } catch {
      continue;
    }
    try {
      if (/Resume from summary/i.test(tail)) {
        orca(['terminal', 'send', '--terminal', t.handle, '--text', '1', '--enter', '--json']);
        results.push({ handle: t.handle, title: t.title, action: 'claude-resume-summary-1' });
      } else if (/Update available|Skip until next version/i.test(tail) && /codex/i.test(tail + (t.title || ''))) {
        orca(['terminal', 'send', '--terminal', t.handle, '--text', '2', '--enter', '--json']);
        results.push({ handle: t.handle, title: t.title, action: 'codex-skip-update-2' });
      } else if (/Update available!.*Press enter to continue/is.test(tail)) {
        orca(['terminal', 'send', '--terminal', t.handle, '--text', '2', '--enter', '--json']);
        results.push({ handle: t.handle, title: t.title, action: 'codex-skip-update-2' });
      }
    } catch (e) {
      results.push({ handle: t.handle, error: String(e.message || e) });
    }
  }
  console.log(JSON.stringify({ ok: true, unstuck: results.length, results }, null, 2));
  return 0;
}

function cmdWait(argv) {
  const timeout = Number(argVal(argv, '--timeout-ms') || argVal(argv, '--timeout') || 300000);
  const types = argVal(argv, '--types') || 'worker_done,escalation,decision_gate';
  // Prefer coordinator (grok) terminal for check --wait
  let term = argVal(argv, '--terminal');
  if (!term) {
    try {
      term = resolveRole('grok').handle;
    } catch {
      const r = buildRoster();
      term = r.primary.claude?.handle || r.primary.codex?.handle;
    }
  }
  if (!term) throw new Error('wait needs --terminal or a live grok primary');
  const d = orca(
    [
      'orchestration',
      'check',
      '--terminal',
      term,
      '--wait',
      '--types',
      types,
      '--timeout-ms',
      String(timeout),
      '--json',
    ],
    Math.max(timeout + 5000, 20000),
  );
  console.log(JSON.stringify({ ok: true, terminal: term, types, result: d.result || d }, null, 2));
  return 0;
}

function cmdShellStart(argv) {
  // Start codex/claude/grok on an empty shell terminal
  const agent = (argv[0] || 'codex').toLowerCase();
  const r = buildRoster();
  const shell = r.primary.shell;
  if (!shell?.handle) throw new Error('no empty shell terminal; create one in Orca or use dg-orca spawn');
  const cmd =
    agent === 'codex'
      ? 'codex'
      : agent === 'claude'
        ? "claude --dangerously-skip-permissions"
        : agent === 'grok'
          ? 'grok --permission-mode bypassPermissions'
          : agent;
  orca(['terminal', 'send', '--terminal', shell.handle, '--text', cmd, '--enter', '--json']);
  if (['codex', 'claude', 'grok'].includes(agent)) saveRoleHint(shell.handle, agent);
  console.log(JSON.stringify({ ok: true, agent, handle: shell.handle, started: cmd }, null, 2));
  return 0;
}

function usage() {
  console.log(`demigod-agent-bus — Orca peer bus (Claude/Codex/Grok)

  roster                         write /tmp/dg-busy/agent-roster.json + print primaries
  status                         roster + pending tasks + unread inbox
  send <role> --subject S --body B [--type status] [--from grok] [--thread-id T]
  task <role> --title T --spec "…" [--from grok]
  wake <role>                    inject orchestration check into that TUI
  unstick                        answer Claude "resume from summary" → 1
  shell-start [codex|claude|grok] start agent on empty shell terminal
  wait [--timeout-ms N] [--types worker_done,…]  block for worker_done (coord terminal)

Roles: claude | codex | grok | shell | term_<handle>
`);
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || 'status';
  const rest = argv.slice(1);
  try {
    switch (cmd) {
      case 'roster':
        return cmdRoster();
      case 'status':
        return cmdStatus();
      case 'send':
        return cmdSend(rest);
      case 'task':
        return cmdTask(rest);
      case 'wake':
        return cmdWake(rest);
      case 'unstick':
        return cmdUnstick();
      case 'shell-start':
        return cmdShellStart(rest);
      case 'wait':
        return cmdWait(rest);
      case '-h':
      case '--help':
      case 'help':
        usage();
        return 0;
      default:
        usage();
        throw new Error(`unknown command: ${cmd}`);
    }
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    return 1;
  }
}

const code = await main();
process.exit(code ?? 0);
