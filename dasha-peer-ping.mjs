#!/usr/bin/env node
/**
 * Refresh DASHA-LIVE-CONTEXT.md and notify Claude + Codex via filesystem peer bus.
 * No Orca. Always appends docs/exchange/DASHA-PEER-INBOX.md.
 *
 *   node dasha-peer-ping.mjs --note="shipped lobby SEO"
 *   node dasha-peer-ping.mjs --agent=grok --note="…" --no-refresh
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

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

if (!noRefresh) {
  const r = run(process.execPath, [
    join(root, 'dasha-context-refresh.mjs'),
    '--agent',
    agent,
    '--note',
    note,
  ]);
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || 'context-refresh failed');
    process.exit(r.status || 1);
  }
  if (r.stdout?.trim()) console.log(r.stdout.trim());
}

const iso = new Date().toISOString();
const body = [
  'Read DASHA-LIVE-CONTEXT.md (repo root) first.',
  `From: ${agent}`,
  `When: ${iso}`,
  `Note: ${note}`,
  'Gates: npm run dasha:meta && npm run dasha:audit:live:fast',
].join('\n');

const inboxPath = join(root, 'docs/exchange/DASHA-PEER-INBOX.md');
mkdirSync(dirname(inboxPath), { recursive: true });
if (!existsSync(inboxPath)) {
  writeFileSync(
    inboxPath,
    '# Dasha peer inbox\n\nAppend-only pings between Grok / Claude / Codex (no Orca).\n\n',
  );
}
appendFileSync(
  inboxPath,
  `\n## ${iso} · ${agent}\n\n${note}\n\n→ See \`DASHA-LIVE-CONTEXT.md\`\n`,
);

const busJs = join(homedir(), 'demigod-agent-bus.mjs');
const sends = [];
for (const role of ['claude', 'codex']) {
  if (!existsSync(busJs)) {
    sends.push({ role, ok: false, error: 'demigod-agent-bus.mjs missing' });
    continue;
  }
  const r = run(process.execPath, [
    busJs,
    'send',
    role,
    '--subject',
    'DASHA NOW',
    '--body',
    body,
    '--from',
    agent,
    '--type',
    'status',
  ]);
  let parsed = null;
  try {
    parsed = JSON.parse((r.stdout || '').trim());
  } catch {
    /* ignore */
  }
  sends.push({
    role,
    ok: r.status === 0 && parsed?.ok !== false,
    id: parsed?.message?.id || null,
    error: r.status !== 0 ? String(r.stderr || r.stdout || '').slice(0, 200) : null,
  });
}

const out = {
  ok: true,
  agent,
  note,
  inbox: inboxPath,
  context: join(root, 'DASHA-LIVE-CONTEXT.md'),
  sends,
  at: iso,
};
writeFileSync('/tmp/dasha-peer-ping.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(0);
