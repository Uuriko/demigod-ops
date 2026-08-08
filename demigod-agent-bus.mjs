#!/usr/bin/env node
/**
 * Filesystem-backed peer bus for Claude, Codex and Grok.
 * No daemon or terminal injection: adapters do the work; JSON receipts keep the history.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const BUS = path.join(BUSY, 'agent-bus');
const TASKS = path.join(BUS, 'tasks');
const MESSAGES = path.join(BUS, 'messages.jsonl');
const ROLES = ['claude', 'codex', 'grok'];
const ADAPTERS = {
  claude: process.env.DG_BUS_CLAUDE_BIN || path.join(ROOT, 'bin', 'ask-claude'),
  codex: process.env.DG_BUS_CODEX_BIN || path.join(ROOT, 'bin', 'codex-ask'),
  grok: process.env.DG_BUS_GROK_BIN || path.join(ROOT, 'bin', 'grok-ask'),
};

function init() {
  fs.mkdirSync(TASKS, { recursive: true, mode: 0o700 });
}

function arg(argv, name, fallback = null) {
  const i = argv.indexOf(name);
  return i < 0 ? fallback : (argv[i + 1] ?? fallback);
}

function role(value) {
  const r = String(value || '').toLowerCase();
  if (!ROLES.includes(r)) throw new Error(`role must be one of: ${ROLES.join(', ')}`);
  return r;
}

function id() {
  return `${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
}

function taskPath(taskId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(taskId || '')) throw new Error('invalid task id');
  return path.join(TASKS, `${taskId}.json`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function appendMessage(value) {
  fs.appendFileSync(MESSAGES, `${JSON.stringify(value)}\n`, { mode: 0o600 });
}

function available(r) {
  try {
    fs.accessSync(ADAPTERS[r], fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function listTasks() {
  init();
  return fs.readdirSync(TASKS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try { return readJson(path.join(TASKS, f)); } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function runTask(taskId) {
  const file = taskPath(taskId);
  const task = readJson(file);
  task.status = 'running';
  task.startedAt = new Date().toISOString();
  writeJson(file, task);

  const result = spawnSync(ADAPTERS[task.role], [], {
    cwd: ROOT,
    input: task.spec,
    encoding: 'utf8',
    timeout: Number(process.env.DG_BUS_TIMEOUT_MS || 900000),
    maxBuffer: 32 * 1024 * 1024,
  });
  task.finishedAt = new Date().toISOString();
  task.exitCode = result.status;
  task.signal = result.signal || null;
  task.reply = result.stdout || '';
  task.error = result.error?.message || result.stderr || null;
  task.status = result.status === 0 && task.reply.trim() ? 'completed' : 'failed';
  writeJson(file, task);
  appendMessage({
    id: id(), type: task.status === 'completed' ? 'worker_done' : 'escalation',
    taskId, from: task.role, to: task.from, subject: task.title,
    createdAt: task.finishedAt,
  });
  return task;
}

function cmdTask(argv) {
  init();
  const target = role(argv[0]);
  const title = arg(argv, '--title', arg(argv, '-t', `task for ${target}`));
  const specFile = arg(argv, '--spec-file');
  const spec = specFile ? fs.readFileSync(path.resolve(specFile), 'utf8') : arg(argv, '--spec', arg(argv, '-s'));
  if (!spec?.trim()) throw new Error('task needs --spec "…" or --spec-file PATH');
  if (!available(target)) throw new Error(`adapter unavailable: ${ADAPTERS[target]}`);
  const task = {
    schema: 'local.agent-task/1', id: id(), title, role: target,
    from: arg(argv, '--from', 'codex'), spec, status: 'queued',
    createdAt: new Date().toISOString(), startedAt: null, finishedAt: null,
    exitCode: null, signal: null, reply: '', error: null,
  };
  writeJson(taskPath(task.id), task);
  if (argv.includes('--detach')) {
    const child = spawn(process.execPath, [import.meta.filename, '_run', task.id], {
      cwd: ROOT, detached: true, stdio: 'ignore', env: process.env,
    });
    child.unref();
    console.log(JSON.stringify({ ok: true, taskId: task.id, status: 'queued', detached: true }, null, 2));
    return 0;
  }
  const done = runTask(task.id);
  console.log(JSON.stringify(done, null, 2));
  return done.status === 'completed' ? 0 : 1;
}

function cmdSend(argv) {
  init();
  const to = role(argv[0]);
  const message = {
    id: id(), type: arg(argv, '--type', 'status'), from: arg(argv, '--from', 'codex'), to,
    subject: arg(argv, '--subject', arg(argv, '-s', 'bus')),
    body: arg(argv, '--body', arg(argv, '-b', '')),
    threadId: arg(argv, '--thread-id', arg(argv, '--thread')),
    createdAt: new Date().toISOString(), readAt: null,
  };
  appendMessage(message);
  console.log(JSON.stringify({ ok: true, message }, null, 2));
  return 0;
}

function messages() {
  try { return fs.readFileSync(MESSAGES, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch { return []; }
}

function cmdInbox(argv) {
  const target = role(argv[0]);
  const unread = argv.includes('--unread');
  const rows = messages().filter((m) => m.to === target && (!unread || !m.readAt));
  console.log(JSON.stringify({ ok: true, role: target, count: rows.length, messages: rows }, null, 2));
  return 0;
}

function cmdStatus() {
  const tasks = listTasks();
  const msgs = messages();
  console.log(JSON.stringify({
    ok: true, transport: 'filesystem+stateless-adapters', root: BUS,
    agents: Object.fromEntries(ROLES.map((r) => [r, { adapter: ADAPTERS[r], available: available(r) }])),
    counts: {
      queued: tasks.filter((t) => t.status === 'queued').length,
      running: tasks.filter((t) => t.status === 'running').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      messages: msgs.length,
    },
    recent: tasks.slice(0, 10).map(({ id, title, role: r, status, createdAt, finishedAt }) => ({ id, title, role: r, status, createdAt, finishedAt })),
  }, null, 2));
  return 0;
}

function cmdShow(argv) {
  console.log(JSON.stringify(readJson(taskPath(argv[0])), null, 2));
  return 0;
}

async function cmdWait(argv) {
  const taskId = arg(argv, '--task') || argv[0];
  if (!taskId) throw new Error('wait needs --task ID');
  const timeout = Number(arg(argv, '--timeout-ms', 300000));
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const task = readJson(taskPath(taskId));
    if (['completed', 'failed'].includes(task.status)) {
      console.log(JSON.stringify(task, null, 2));
      return task.status === 'completed' ? 0 : 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`timeout waiting for ${taskId}`);
}

function selftest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-bus-test-'));
  const fake = path.join(root, 'fake');
  fs.writeFileSync(fake, '#!/bin/sh\nsed "s/^/reply: /"\n', { mode: 0o700 });
  const env = { ...process.env, DEMIGOD_BUSY: path.join(root, 'busy'), DEMIGOD_ROOT: ROOT,
    DG_BUS_CLAUDE_BIN: fake, DG_BUS_CODEX_BIN: fake, DG_BUS_GROK_BIN: fake };
  const r = spawnSync(process.execPath, [import.meta.filename, 'task', 'grok', '--title', 'test', '--spec', 'hello'], { encoding: 'utf8', env });
  const parsed = JSON.parse(r.stdout);
  if (r.status !== 0 || parsed.status !== 'completed' || !parsed.reply.includes('reply: hello')) throw new Error('task receipt failed');
  const s = spawnSync(process.execPath, [import.meta.filename, 'status'], { encoding: 'utf8', env });
  if (s.status !== 0 || JSON.parse(s.stdout).counts.completed !== 1) throw new Error('status failed');
  fs.rmSync(root, { recursive: true, force: true });
  console.log('agent-bus selftest PASS');
  return 0;
}

function usage() {
  console.log(`dg-bus — local Claude/Codex/Grok task bus

  status
  task <role> --title T (--spec TEXT | --spec-file PATH) [--detach]
  show <task-id>
  wait --task ID [--timeout-ms N]
  send <role> --subject S --body B [--type status] [--from codex]
  inbox <role> [--unread]
  selftest

Roles: claude | codex | grok
Receipts: ${TASKS}`);
}

async function main() {
  const [cmd = 'status', ...argv] = process.argv.slice(2);
  try {
    if (cmd === '_run') return runTask(argv[0]).status === 'completed' ? 0 : 1;
    if (cmd === 'task') return cmdTask(argv);
    if (cmd === 'send') return cmdSend(argv);
    if (cmd === 'inbox') return cmdInbox(argv);
    if (cmd === 'status' || cmd === 'roster') return cmdStatus();
    if (cmd === 'show') return cmdShow(argv);
    if (cmd === 'wait') return await cmdWait(argv);
    if (cmd === 'selftest') return selftest();
    if (['help', '-h', '--help'].includes(cmd)) { usage(); return 0; }
    throw new Error(`unknown command: ${cmd}`);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    return 1;
  }
}

process.exit(await main());
