#!/usr/bin/env node
/**
 * Demigod tools registry — agent-discoverable catalog of keep-path tools.
 * CLI: node demigod-tools-registry.mjs [--json] [--md] [--group gates]
 * Used by dashboard /api/tools
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const BUSY = '/tmp/dg-busy';

/** @typedef {{ id: string, name: string, group: string, cmd: string, purpose: string, out?: string, mutate?: boolean, hot?: boolean }} Tool */

/** @type {Tool[]} */
export const TOOLS = [
  // Session start
  { id: 'control', name: 'Control plane', group: 'session', cmd: 'bin/dg home', purpose: 'Cohesive map: site/webflow/match/review/hygiene/ship/orca', out: '/tmp/dg-busy/control-plane.json', hot: true },
  { id: 'full-check', name: 'Full check', group: 'session', cmd: 'bin/dg full-check', purpose: 'Doctor + orca + gates + smoke (one spine)', out: '/tmp/dg-busy/full-check.json', hot: true },
  { id: 'cockpit', name: 'Cockpit', group: 'session', cmd: 'bin/dg-cockpit', purpose: 'Single honest NEXT + hash chain', out: '/tmp/dg-busy/cockpit.json', hot: true },
  { id: 'smoke', name: 'Agent smoke', group: 'session', cmd: 'bin/dg-smoke', purpose: 'CDP body/h1/foot/WIZ proof', out: '/tmp/dg-busy/agent-smoke.json', hot: true },
  { id: 'usertest', name: 'User-test harness', group: 'session', cmd: 'bin/dg-usertest', purpose: 'Unified site+dash+tools+forms UX suite', out: '/tmp/dg-busy/user-test-latest.json', hot: true },
  { id: 'usertest-quick', name: 'User-test quick', group: 'session', cmd: 'bin/dg-usertest --quick', purpose: 'Faster UX suite without full selftest', out: '/tmp/dg-busy/user-test-latest.json', hot: true },
  { id: 'doctor', name: 'Doctor', group: 'session', cmd: 'node demigod-doctor.mjs', purpose: 'Env health: CDP, dash, keys, bins, orca', out: '/tmp/dg-busy/doctor.json', hot: true },
  { id: 'orca-up', name: 'Orca up', group: 'orca', cmd: 'bin/dg-orca up', purpose: 'Keep-awake + desktop Orca + pair + hubs', hot: true },
  { id: 'orca-status', name: 'Orca status', group: 'orca', cmd: 'bin/dg-orca status', purpose: 'Runtime + keep-awake + pair doctor', out: '/tmp/orca-pair-meta.json', hot: true },
  { id: 'orca-pair', name: 'Orca pair URL', group: 'orca', cmd: 'bin/dg-orca pair', purpose: 'Phone pairing orca:// URL + HTML', out: '/home/potter/orca-pair-code.txt', hot: true },
  { id: 'orca-swarm', name: 'Orca swarm', group: 'orca', cmd: 'bin/dg-orca swarm', purpose: 'Spawn grok+claude+codex in demigod-swarm worktree' },
  { id: 'orca-site', name: 'Orca site tabs', group: 'orca', cmd: 'bin/dg-orca site', purpose: 'Open live site + control plane in Orca browser' },
  { id: 'webflow', name: 'Webflow workbench', group: 'session', cmd: 'bin/dg-webflow status', purpose: 'Freeze/tabs/truth/playbooks for Designer+Custom Code', out: '/tmp/dg-busy/webflow-status.json', hot: true },
  { id: 'webflow-doctor', name: 'Webflow doctor', group: 'session', cmd: 'bin/dg-webflow doctor', purpose: 'CDP + Designer + custom-code + freeze readiness', out: '/tmp/dg-busy/webflow-doctor.json', hot: true },
  { id: 'hygiene', name: 'Laptop hygiene', group: 'session', cmd: 'node demigod-laptop-hygiene.mjs --prune', purpose: 'Prune CDP tabs + load/mem check', out: '/tmp/dg-busy/laptop-hygiene.json', hot: true },
  { id: 'review', name: 'Code review v2', group: 'session', cmd: 'bin/dg-review', purpose: 'Diff-aware rules, baseline, SARIF, fix prompt', out: '/tmp/dg-busy/review-latest.json', hot: true },
  { id: 'review-bug', name: 'Bug-hunt review', group: 'gates', cmd: 'bin/dg-review --bug --gates', purpose: 'Stricter + targeted gates', out: '/tmp/dg-busy/review-latest.json' },
  { id: 'review-selftest', name: 'Review selftest', group: 'gates', cmd: 'node demigod-review-selftest.mjs', purpose: 'Fixture proof of review engine' },
  { id: 'ship-checklist', name: 'Ship checklist', group: 'ship', cmd: 'node demigod-ship-checklist.mjs', purpose: 'Freeze-aware ship readiness (no publish)', out: '/tmp/dg-busy/ship-checklist.json', hot: true },
  { id: 'ship-prep', name: 'Ship prep', group: 'ship', cmd: 'bin/dg ship-prep', purpose: 'Gates + paste paths + next commands (no mutate if frozen)', out: '/tmp/dg-busy/ship-prep.json', hot: true },
  { id: 'approve-sub', name: 'Approve submission', group: 'session', cmd: 'node demigod-submissions-approve.mjs --list', purpose: 'Mint sample board card via mintBoardEntry', hot: true },
  { id: 'inbox', name: 'Submissions inbox', group: 'session', cmd: 'bin/dg-inbox', purpose: 'Redacted startup/engineer/partner queue', out: '/tmp/dg-busy/submissions-inbox-latest.json', hot: true },
  { id: 'match-review', name: 'Match review queue', group: 'session', cmd: 'bin/dg-matches list', purpose: 'Pair ledger review queue (not public board)', out: '/tmp/dg-busy/match-review-latest.json', hot: true },
  { id: 'pairs', name: 'Pair ledger CLI', group: 'session', cmd: 'node demigod-pairs-lib.mjs list', purpose: 'Canonical DEMIGOD-PAIRS propose/review/consent', out: 'DEMIGOD-PAIRS.json' },
  { id: 'auto-propose', name: 'Auto-propose pairs', group: 'session', cmd: 'node demigod-auto-propose.mjs --json', purpose: 'Score roles×cands → DEMIGOD-PAIRS (min score 72)', out: '/tmp/dg-busy/auto-propose-latest.json', hot: true },
  { id: 'intro-draft', name: 'Intro draft', group: 'session', cmd: 'node demigod-intro-draft.mjs <sub-id|pairId>', purpose: 'Draft intro (gate: approved|mutual_yes; --force audits)', out: '/tmp/dg-busy/intros/' },
  { id: 'sprint-selftest', name: 'Sprint selftest', group: 'gates', cmd: 'npm run demigod:sprint-selftest', purpose: 'Pairs + intro gate + board audit presence' },
  { id: 'brief', name: 'Agent brief', group: 'session', cmd: 'curl -sS http://127.0.0.1:9878/api/agent-brief', purpose: 'Markdown brief for models', out: '/tmp/dg-busy/AGENT-BRIEF.md', hot: true },
  { id: 'start', name: 'Session start', group: 'session', cmd: 'bin/dg-start', purpose: 'Env + chrome + workspace hygiene' },
  { id: 'truth', name: 'Truth', group: 'session', cmd: 'node demigod-truth.mjs --md', purpose: 'live==disk claims', out: '/tmp/dg-busy/truth.json' },
  { id: 'preflight', name: 'Preflight', group: 'session', cmd: 'node demigod-preflight.mjs', purpose: 'Before foot edits', out: '/tmp/dg-busy/preflight-latest.json' },
  { id: 'handoff', name: 'Handoff', group: 'session', cmd: 'node demigod-handoff.mjs --note "…"', purpose: 'Session handoff note' },

  // Gates
  { id: 'verify-source', name: 'Verify source', group: 'gates', cmd: 'npm run demigod:verify:source', purpose: 'Foot/head/footer source gate', out: 'DEMIGOD-VERIFY-SOURCE.json' },
  { id: 'board-honesty', name: 'Board honesty', group: 'gates', cmd: 'node demigod-verify-board-honesty.mjs', purpose: '≤3 seed roles, real counts honest', out: 'DEMIGOD-BOARD-HONESTY.json' },
  { id: 'loop-state', name: 'Loop state', group: 'gates', cmd: 'node demigod-verify-loop-state.mjs', purpose: 'Loop/busy state consistency' },
  { id: 'foot-smoke', name: 'Foot smoke', group: 'gates', cmd: 'node demigod-foot-smoke.mjs', purpose: 'Local foot JS smoke' },

  // Ship (mutate — respect freeze)
  { id: 'freeze-status', name: 'Freeze status', group: 'ship', cmd: 'node demigod-publish-freeze.mjs status', purpose: 'Publish freeze on/off', out: '/tmp/dg-busy/publish-freeze.json' },
  { id: 'ship-status', name: 'Ship status', group: 'ship', cmd: 'node demigod-ship-status.mjs', purpose: 'CDN/ship snapshot', out: '/tmp/dg-busy/ship-status.json' },
  { id: 'foot-cdn', name: 'Foot CDN publish', group: 'ship', cmd: 'node demigod-foot-cdn-publish.mjs', purpose: 'Upload foot to catbox + manifest', mutate: true },
  { id: 'cm6-paste', name: 'CM6 paste publish', group: 'ship', cmd: 'node demigod-cm6-paste-publish.mjs --footer-only', purpose: 'Paste footer into Webflow custom code', mutate: true },
  { id: 'tab-prune', name: 'CDP tab prune', group: 'ship', cmd: 'node demigod-cdp-tab-prune.mjs', purpose: 'Close excess Chrome tabs' },

  // Inbox / multi-agent
  { id: 'plan-inbox', name: 'Plan inbox', group: 'swarm', cmd: 'node demigod-plan-inbox.mjs --useful', purpose: 'Unread agent plans', out: '/tmp/dg-busy/plan-inbox-latest.json' },
  { id: 'tools-registry', name: 'Tools registry', group: 'swarm', cmd: 'node demigod-tools-registry.mjs --md', purpose: 'This catalog', hot: true },
  { id: 'dash', name: 'Dashboard', group: 'swarm', cmd: 'bin/dg-dash', purpose: 'Agent dashboard UI :9878', hot: true },

  // Forms / WIZ
  { id: 'wiz-playtest', name: 'WIZ CDP playtest', group: 'forms', cmd: 'node demigod-wiz-cdp-playtest.mjs --local', purpose: 'Local WIZ stepper playtest' },
  { id: 'submit-fixture', name: 'Submit fixture', group: 'forms', cmd: 'bin/dg-submit-fixture', purpose: 'Webflow form submit mock harness' },
];

export function toolAge(outPath) {
  if (!outPath) return null;
  const full = outPath.startsWith('/') ? outPath : path.join(ROOT, outPath);
  try {
    const st = fs.statSync(full);
    return {
      path: full,
      mtime: st.mtime.toISOString(),
      ageSec: Math.round((Date.now() - st.mtimeMs) / 1000),
      bytes: st.size,
    };
  } catch {
    return { path: full, missing: true };
  }
}

export function buildRegistry({ group = null } = {}) {
  const at = new Date().toISOString();
  let tools = TOOLS.slice();
  if (group) tools = tools.filter((t) => t.group === group);
  const enriched = tools.map((t) => ({
    ...t,
    evidence: toolAge(t.out),
  }));
  const groups = [...new Set(TOOLS.map((t) => t.group))];
  return {
    at,
    count: enriched.length,
    groups,
    tools: enriched,
    sessionStart: ['bin/dg-cockpit', 'bin/dg-smoke', 'curl -sS http://127.0.0.1:9878/api/agent-brief'],
    note: 'Prefer cockpit NEXT. Mutate tools only when freeze OFF.',
  };
}

export function toMarkdown(reg) {
  const lines = [
    `# Demigod tools registry`,
    `at: ${reg.at} · count: ${reg.count}`,
    '',
    `Session: \`${reg.sessionStart.join(' && ')}\``,
    '',
  ];
  for (const g of reg.groups) {
    const items = reg.tools.filter((t) => t.group === g);
    if (!items.length) continue;
    lines.push(`## ${g}`);
    for (const t of items) {
      const age = t.evidence?.missing
        ? 'no output yet'
        : t.evidence?.ageSec != null
          ? `age ${t.evidence.ageSec}s`
          : '';
      const flags = [t.mutate ? 'MUTATE' : null, t.hot ? 'hot' : null].filter(Boolean).join(',');
      lines.push(`- **${t.name}** (\`${t.id}\`) ${flags ? `[${flags}]` : ''}`);
      lines.push(`  - ${t.purpose}`);
      lines.push(`  - \`${t.cmd}\`${age ? ` · ${age}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const groupArg = process.argv.includes('--group')
    ? process.argv[process.argv.indexOf('--group') + 1]
    : null;
  const reg = buildRegistry({ group: groupArg });
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'tools-registry.json'), JSON.stringify(reg, null, 2));
  if (args.has('--md') || !args.has('--json')) {
    const md = toMarkdown(reg);
    fs.writeFileSync(path.join(BUSY, 'tools-registry.md'), md);
    if (!args.has('--json')) console.log(md);
  }
  if (args.has('--json')) console.log(JSON.stringify(reg, null, 2));
}
