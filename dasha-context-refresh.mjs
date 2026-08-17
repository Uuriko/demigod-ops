#!/usr/bin/env node
/**
 * Refresh DASHA-LIVE-CONTEXT.md from live gates + optional note.
 *
 *   node dasha-context-refresh.mjs
 *   node dasha-context-refresh.mjs --agent=grok --note="shipped X"
 *   node dasha-context-refresh.mjs --offline          # no network; stamp only
 *   node dasha-context-refresh.mjs --no-audit         # meta JSON only (skip live audit)
 *
 * Writes: DASHA-LIVE-CONTEXT.md · /tmp/dasha-live-context.json
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const offline = args.includes('--offline');
const noAudit = args.includes('--no-audit') || args.includes('--fast');

function argVal(name) {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i < 0) return null;
  return args[i + 1] || null;
}

const agent = argVal('--agent') || process.env.DASHA_AGENT || 'grok';
const note = argVal('--note') || process.env.DASHA_CONTEXT_NOTE || '';

function runJson(cmd, cmdArgs, env = {}) {
  const r = spawnSync(cmd, cmdArgs, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  const out = (r.stdout || '').trim();
  // last JSON object in stdout
  let json = null;
  try {
    json = JSON.parse(out);
  } catch {
    const start = out.lastIndexOf('{');
    if (start >= 0) {
      try {
        json = JSON.parse(out.slice(start));
      } catch {
        /* ignore */
      }
    }
  }
  return { status: r.status ?? 1, json, stdout: out, stderr: r.stderr || '' };
}

function loadJsonFile(p) {
  try {
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function readPrevShipped() {
  const p = join(root, 'DASHA-LIVE-CONTEXT.md');
  if (!existsSync(p)) return [];
  const text = readFileSync(p, 'utf8');
  const m = text.match(/## Just shipped \/ in flight\n\n([\s\S]*?)\n\n## /);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- ') && !l.includes('(none yet'));
}

function iso() {
  return new Date().toISOString();
}

let meta = null;
let audit = null;

if (!offline) {
  // Avoid recursive meta→context→meta; meta sets DASHA_META_NO_CONTEXT when stamping.
  const m = runJson(process.execPath, ['dasha-meta.mjs'], { DASHA_META_NO_CONTEXT: '1' });
  meta = m.json || loadJsonFile('/tmp/dasha-meta.json');
  if (!noAudit) {
    const a = runJson(process.execPath, ['dasha-audit-live.mjs', '--fast']);
    audit = a.json || loadJsonFile('/tmp/dasha-audit-live.json');
  } else {
    audit = loadJsonFile('/tmp/dasha-audit-live.json');
  }
} else {
  meta = loadJsonFile('/tmp/dasha-meta.json');
  audit = loadJsonFile('/tmp/dasha-audit-live.json');
}

const soft = [
  ...new Set([...(meta?.soft || []), ...(audit?.soft || [])].filter(Boolean)),
];
const hard = [
  ...new Set([...(meta?.hard || []), ...(audit?.hard || [])].filter(Boolean)),
];
const announce =
  audit?.announceReady === true || (audit?.ok === true && hard.length === 0);
const metaOk = meta?.ok !== false && (meta?.hard || []).length === 0;

const liveLines = [
  `- Home / Studio / Desk — public getdasha routes (embed ship path)`,
  `- Lobby — lobby.getdasha.com (health/WS/clients${audit?.worker?.assets ? `; assets ${String(audit.worker.assets).slice(0, 8)}` : ''})`,
  `- Soft lag — ${soft.length ? soft.join(', ') : 'none reported'}`,
  `- Meta gate — ${metaOk ? 'ok' : `FAIL ${(meta?.hard || []).join(',') || '?'}`}`,
  `- Announce-ready — ${announce ? 'yes' : 'no'}${hard.length ? ` hard: ${hard.join(', ')}` : ''}`,
  `- Verified — ${offline ? 'offline stamp' : iso()} via context-refresh`,
];

const prevShipped = readPrevShipped().slice(0, 12);
const stamp = note
  ? `- ${iso().slice(0, 19)}Z · ${agent}: ${note.replace(/\n/g, ' ').slice(0, 200)}`
  : null;
const shipped = stamp ? [stamp, ...prevShipped].slice(0, 15) : prevShipped.length ? prevShipped : ['- (none yet this file)'];

const blocked = soft.includes('live-www-robots') || soft.includes('robots-empty') || soft.includes('sitemap-404') || soft.includes('live-www-sitemap')
  ? ['- www robots/sitemap still need Webflow Site SEO paste (lobby fallback live)']
  : hard.length
    ? hard.map((h) => `- ${h}`)
    : ['- (none)'];

/* Frontmatter is part of the template, not something to hand-add: this file is rewritten whole on
   every refresh, so a hand-added header would vanish and `dasha-doc-registry --check` would fail
   again the next time anyone ran a refresh. */
const body = `---
status: generated
generated_from: dasha-context-refresh.mjs
---

# DASHA NOW

**Rewrite in place after meaningful work.** All agents (Grok / Claude / Codex) read this first for Dasha; keep NOW short. No secrets.

Updated: ${iso()} · Agent: ${agent}

## Live

${liveLines.join('\n')}

## Just shipped / in flight

${shipped.join('\n')}

## Blocked

${blocked.join('\n')}

## Next unblocked

1. Keep \`npm run dasha:meta\` + \`dasha:audit:live:fast\` green
2. Observe Lobby/Simp opt-in before new scoring machinery
3. Webflow www SEO when convenient (soft lag only)

## Peers

- last refresh — ${agent} @ ${iso()}
- peer inbox — \`docs/exchange/DASHA-PEER-INBOX.md\` (append via \`dasha:peer-ping\`)
- bus messages — \`/tmp/dg-busy/agent-bus/messages.jsonl\` when \`dg-bus send\` works

## Commands that must stay green

\`\`\`bash
npm run dasha:meta
npm run dasha:audit:live:fast
\`\`\`

Refresh: \`npm run dasha:context:refresh -- --agent=${agent} --note="…"\`  
Notify peers: \`npm run dasha:peer-ping -- --note="…"\`
`;

const outPath = join(root, 'DASHA-LIVE-CONTEXT.md');
writeFileSync(outPath, body);
const summary = {
  ok: true,
  path: outPath,
  agent,
  note: note || null,
  metaOk,
  announceReady: announce,
  soft,
  hard,
  offline,
  at: iso(),
};
writeFileSync('/tmp/dasha-live-context.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
