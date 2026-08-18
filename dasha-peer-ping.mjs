#!/usr/bin/env node
/**
 * Refresh DASHA-LIVE-CONTEXT.md and notify Claude + Codex via dg-bus.
 *
 *   node dasha-peer-ping.mjs --note="prepared bounties page"
 *   node dasha-peer-ping.mjs --agent=grok --note="…" --no-refresh
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const noRefresh = args.includes('--no-refresh');
const agent = argVal('--agent') || process.env.DASHA_AGENT || 'grok';
const note =
  argVal('--note') ||
  process.env.DASHA_CONTEXT_NOTE ||
  'DASHA-LIVE-CONTEXT.md updated — please read it';

function argVal(name) {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i < 0) return null;
  return args[i + 1] || null;
}

function run(cmd, cmdArgs) {
  return spawnSync(cmd, cmdArgs, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
}

if (!noRefresh && existsSync(join(root, 'dasha-context-refresh.mjs'))) {
  const r = run(process.execPath, [
    join(root, 'dasha-context-refresh.mjs'),
    '--agent',
    agent,
    '--note',
    note,
    '--offline',
  ]);
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || 'context-refresh failed');
    process.exit(r.status || 1);
  }
}

const iso = new Date().toISOString();
const inboxPath = join(root, 'docs/exchange/DASHA-PEER-INBOX.md');
mkdirSync(dirname(inboxPath), { recursive: true });
if (!existsSync(inboxPath)) {
  writeFileSync(inboxPath, '# Dasha peer inbox\n\nAppend-only pings (no Orca).\n\n');
}
appendFileSync(inboxPath, `\n## ${iso} · ${agent}\n\n${note}\n\n→ See \`DASHA-LIVE-CONTEXT.md\`\n`);

const bus = join(root, 'bin/dg-bus');
const sends = [];
if (existsSync(bus)) {
  for (const role of ['claude', 'codex']) {
    const r = run(bus, [
      'send', role, '--from', agent,
      '--subject', 'DASHA NOW',
      '--body', `Read DASHA-LIVE-CONTEXT.md. ${note}`,
    ]);
    sends.push({ role, ok: r.status === 0 });
  }
}

console.log(JSON.stringify({ ok: true, agent, note, inbox: inboxPath, sends, at: iso }, null, 2));
