#!/usr/bin/env node
/**
 * demigod-github-agent — CDP GitHub tabs + gh API brief for multi-agent work.
 *
 * Docs: docs/process/GITHUB-CDP-AGENTS.md
 *
 *   node demigod-github-agent.mjs status|tabs|notif|brief [--repo owner/repo] [--pr N]
 *   node demigod-github-agent.mjs --selftest
 *
 * CDP default: http://127.0.0.1:9223  (DEMIGOD_CDP / CDP_URL)
 * Never drives login/password UI. Never merges.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const CDP = (process.env.DEMIGOD_CDP || process.env.CDP_URL || 'http://127.0.0.1:9223').replace(
  /\/$/,
  '',
);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const SCHEMA = 'demigod.github-agent/1';
const BRIEF_JSON = path.join(BUSY, 'github-pr-brief.json');
const BRIEF_MD = path.join(BUSY, 'github-pr-brief.md');
const STATUS_JSON = path.join(BUSY, 'github-agent-status.json');

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** List page targets from CDP; filter optional. */
export async function listCdpPages() {
  const list = await fetchJson(`${CDP}/json/list`);
  return (Array.isArray(list) ? list : []).filter((t) => t.type === 'page' || !t.type);
}

export function isGithubUrl(url) {
  try {
    const u = new URL(String(url || ''));
    return /(^|\.)github\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/** Avoid treating password/login recovery as a work tab. */
export function isSensitiveGithubUrl(url) {
  const s = String(url || '').toLowerCase();
  return /password_reset|login|session|sessions\/two-factor|auth\//.test(s);
}

export function parsePrFromUrl(url) {
  try {
    const u = new URL(String(url || ''));
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!m) return null;
    return { owner: m[1], repo: m[2], pr: Number(m[3]), url: u.href.split('?')[0] };
  } catch {
    return null;
  }
}

export function parseRepoFromUrl(url) {
  try {
    const u = new URL(String(url || ''));
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (!m || m[2].includes('.')) return null;
    if (['settings', 'notifications', 'pulls', 'issues'].includes(m[2])) return null;
    return { owner: m[1], repo: m[2] };
  } catch {
    return null;
  }
}

export async function githubTabs() {
  const pages = await listCdpPages();
  return pages
    .filter((t) => isGithubUrl(t.url))
    .map((t) => ({
      id: t.id,
      title: t.title || '',
      url: t.url || '',
      sensitive: isSensitiveGithubUrl(t.url),
      pr: parsePrFromUrl(t.url),
      repo: parseRepoFromUrl(t.url),
    }));
}

function ghJson(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim().slice(0, 400);
    throw new Error(`gh ${args.join(' ')} failed: ${err || r.status}`);
  }
  const out = (r.stdout || '').trim();
  if (!out) return null;
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

export function ghWhoami() {
  try {
    return ghJson(['api', 'user', '--jq', '.login']);
  } catch {
    return null;
  }
}

export function ghNotifications(limit = 8) {
  try {
    const raw = ghJson([
      'api',
      `notifications?per_page=${Math.min(20, Math.max(1, limit))}`,
    ]);
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, limit).map((n) => ({
      repo: n.repository?.full_name,
      reason: n.reason,
      title: n.subject?.title,
      type: n.subject?.type,
      apiUrl: n.subject?.url,
      updatedAt: n.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Build a multi-agent PR brief via gh (API). CDP tab only supplies default repo/pr if omitted.
 */
export function buildPrBrief({ owner, repo, pr }) {
  if (!owner || !repo || !pr) throw new Error('owner, repo, pr required');
  const full = `${owner}/${repo}`;
  const view = ghJson([
    'pr',
    'view',
    String(pr),
    '-R',
    full,
    '--json',
    'number,title,state,isDraft,url,author,baseRefName,headRefName,additions,deletions,changedFiles,commits,reviewDecision,statusCheckRollup,body',
  ]);
  let checks = null;
  try {
    checks = ghJson(['pr', 'checks', String(pr), '-R', full, '--json', 'name,state,bucket,link']);
  } catch {
    checks = null;
  }
  let files = [];
  try {
    const f = ghJson([
      'pr',
      'view',
      String(pr),
      '-R',
      full,
      '--json',
      'files',
    ]);
    files = (f?.files || []).slice(0, 40).map((x) => x.path);
  } catch {
    /* */
  }

  const rollup = Array.isArray(view?.statusCheckRollup) ? view.statusCheckRollup : [];
  const checksFailed = (checks || []).filter((c) => /fail|error/i.test(String(c.state || c.bucket || '')));
  const brief = {
    schema: SCHEMA,
    kind: 'pr-brief',
    at: new Date().toISOString(),
    repo: full,
    pr: Number(pr),
    url: view?.url || `https://github.com/${full}/pull/${pr}`,
    title: view?.title || null,
    state: view?.state || null,
    draft: view?.isDraft === true,
    author: view?.author?.login || null,
    base: view?.baseRefName || null,
    head: view?.headRefName || null,
    stats: {
      additions: view?.additions ?? null,
      deletions: view?.deletions ?? null,
      changedFiles: view?.changedFiles ?? null,
      commits: view?.commits?.length ?? null,
    },
    reviewDecision: view?.reviewDecision || null,
    checkRollup: rollup.slice(0, 20).map((c) => ({
      name: c.name || c.context,
      state: c.state || c.conclusion,
    })),
    checksFailed: checksFailed.slice(0, 15),
    files,
    bodyPreview: String(view?.body || '').slice(0, 1200),
    peers: {
      claude: `Review integrity of ${full}#${pr}; write /tmp/dg-busy/claude-pr-${pr}.md`,
      codex: `PASS/BLOCK gates on ${full}#${pr}; write /tmp/dg-busy/codex-pr-${pr}.md; no invent pilots`,
      bus: [
        `bin/dg-bus send claude --subject "PR ${pr} integrity" --body "See ${BRIEF_MD}"`,
        `bin/dg-bus send codex --subject "PR ${pr} PASS/BLOCK" --body "See ${BRIEF_MD}"`,
      ],
    },
    policy: 'API brief for multi-agent. CDP tab is optional visual confirm only. No merge/login automation.',
  };
  return brief;
}

export function writeBrief(brief) {
  fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
  atomicWrite(BRIEF_JSON, `${JSON.stringify(brief, null, 2)}\n`, { mode: 0o600 });
  const md = `# GitHub PR brief · ${brief.repo}#${brief.pr}

**URL:** ${brief.url}  
**Title:** ${brief.title}  
**State:** ${brief.state}${brief.draft ? ' (draft)' : ''} · review: ${brief.reviewDecision || '—'}  
**At:** ${brief.at}

## Stats
+${brief.stats.additions} / -${brief.stats.deletions} · ${brief.stats.changedFiles} files · ${brief.stats.commits} commits

## Checks (rollup sample)
${(brief.checkRollup || []).map((c) => `- ${c.state || '?'} ${c.name || ''}`).join('\n') || '_none_'}

## Failed checks
${(brief.checksFailed || []).map((c) => `- ${c.name}: ${c.state || c.bucket}`).join('\n') || '_none listed_'}

## Files (≤40)
${(brief.files || []).map((f) => `- \`${f}\``).join('\n') || '_unknown_'}

## Body preview
\`\`\`
${brief.bodyPreview || ''}
\`\`\`

## Peer dispatch
\`\`\`bash
${brief.peers.bus.join('\n')}
\`\`\`

- Claude: ${brief.peers.claude}
- Codex: ${brief.peers.codex}

## Policy
${brief.policy}
`;
  atomicWrite(BRIEF_MD, md, { mode: 0o600 });
  return { json: BRIEF_JSON, md: BRIEF_MD };
}

export async function buildStatus() {
  let tabs = [];
  let cdpOk = false;
  let cdpError = null;
  try {
    tabs = await githubTabs();
    cdpOk = true;
  } catch (e) {
    cdpError = String(e?.message || e);
  }
  const login = ghWhoami();
  const notif = login ? ghNotifications(6) : [];
  const workTabs = tabs.filter((t) => !t.sensitive);
  const sensitive = tabs.filter((t) => t.sensitive);
  const pinnedPr = workTabs.map((t) => t.pr).find(Boolean) || null;
  return {
    schema: SCHEMA,
    kind: 'status',
    at: new Date().toISOString(),
    cdp: { url: CDP, ok: cdpOk, error: cdpError, githubTabs: tabs.length, workTabs: workTabs.length },
    tabs: workTabs,
    sensitiveTabs: sensitive.map((t) => ({ title: t.title, url: t.url })),
    gh: { login, notifications: notif },
    pinHint: pinnedPr
      ? `Open PR tab: ${pinnedPr.owner}/${pinnedPr.repo}#${pinnedPr.pr}`
      : 'Pin a PR URL in Chrome CDP for visual work (not github.com homepage)',
    next: [
      'node demigod-github-agent.mjs tabs',
      pinnedPr
        ? `node demigod-github-agent.mjs brief --repo=${pinnedPr.owner}/${pinnedPr.repo} --pr=${pinnedPr.pr}`
        : 'node demigod-github-agent.mjs brief --repo=Uuriko/demigod-site-cdn --pr=N',
      'bin/dg-bus send claude --subject "GitHub brief" --body "See /tmp/dg-busy/github-pr-brief.md"',
    ],
    doc: 'docs/process/GITHUB-CDP-AGENTS.md',
  };
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`github-agent selftest: ${m}`);
  };
  assert(isGithubUrl('https://github.com/Uuriko/demigod-site-cdn/pull/1'), 'gh url');
  assert(!isGithubUrl('https://gitlab.com/x'), 'not gh');
  assert(isSensitiveGithubUrl('https://github.com/password_reset'), 'sensitive');
  const pr = parsePrFromUrl('https://github.com/Uuriko/demigod-site-cdn/pull/42/files');
  assert(pr && pr.owner === 'Uuriko' && pr.pr === 42, 'parse pr');
  assert(parseRepoFromUrl('https://github.com/Uuriko/demigod-site-cdn')?.repo === 'demigod-site-cdn', 'repo');
  console.log(JSON.stringify({ ok: true, selftest: 'github-agent' }));
}

function parseArgs(argv) {
  const args = { cmd: 'status', repo: null, pr: null, json: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--repo' && argv[i + 1]) args.repo = argv[++i];
    else if (a.startsWith('--repo=')) args.repo = a.slice(7);
    else if (a === '--pr' && argv[i + 1]) args.pr = argv[++i];
    else if (a.startsWith('--pr=')) args.pr = a.slice(5);
    else if (!a.startsWith('-')) rest.push(a);
  }
  if (rest[0]) args.cmd = rest[0];
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (isMain && (args.cmd === '--selftest' || process.argv.includes('--selftest'))) {
    selftest();
    return;
  }
  if (args.cmd === 'help' || args.cmd === '--help' || args.cmd === '-h') {
    console.log(`usage: node demigod-github-agent.mjs status|tabs|notif|brief [--repo owner/repo] [--pr N] [--json]
Docs: docs/process/GITHUB-CDP-AGENTS.md`);
    return;
  }

  if (args.cmd === 'tabs') {
    const tabs = await githubTabs();
    const out = { schema: SCHEMA, at: new Date().toISOString(), cdp: CDP, tabs };
    if (args.json) console.log(JSON.stringify(out, null, 2));
    else {
      console.log(`# github CDP tabs · ${CDP} · ${tabs.length}`);
      for (const t of tabs) {
        const flag = t.sensitive ? ' [sensitive — do not automate]' : '';
        const pr = t.pr ? ` PR#${t.pr}` : '';
        console.log(`- ${t.title.slice(0, 50)}${pr}${flag}\n  ${t.url}`);
      }
    }
    return;
  }

  if (args.cmd === 'notif') {
    const login = ghWhoami();
    const n = ghNotifications(12);
    const out = { login, at: new Date().toISOString(), notifications: n };
    if (args.json) console.log(JSON.stringify(out, null, 2));
    else {
      console.log(`# github notifications · ${login || 'not logged in'} · ${n.length}`);
      for (const x of n) console.log(`- [${x.reason}] ${x.repo}: ${x.title} (${x.type})`);
    }
    return;
  }

  if (args.cmd === 'brief') {
    let owner;
    let repo;
    let pr = args.pr ? Number(args.pr) : null;
    if (args.repo && args.repo.includes('/')) {
      [owner, repo] = args.repo.split('/');
    }
    if (!owner || !pr) {
      try {
        const tabs = await githubTabs();
        const hit = tabs.map((t) => t.pr).find(Boolean);
        if (hit) {
          owner = owner || hit.owner;
          repo = repo || hit.repo;
          pr = pr || hit.pr;
        }
      } catch {
        /* */
      }
    }
    if (!owner || !repo || !pr) {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'need --repo owner/repo --pr N (or open a PR tab in CDP Chrome)',
        }),
      );
      process.exit(1);
    }
    try {
      const brief = buildPrBrief({ owner, repo, pr });
      const paths = writeBrief(brief);
      if (args.json) console.log(JSON.stringify({ ok: true, ...brief, paths }, null, 2));
      else {
        console.log(`# brief ${brief.repo}#${brief.pr} · ${brief.title}`);
        console.log(`  url: ${brief.url}`);
        console.log(`  checks failed: ${(brief.checksFailed || []).length}`);
        console.log(`  wrote: ${paths.md}`);
        console.log(`  peers:\n    ${brief.peers.bus.join('\n    ')}`);
      }
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }));
      process.exit(1);
    }
    return;
  }

  // status default
  const st = await buildStatus();
  fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
  atomicWrite(STATUS_JSON, `${JSON.stringify(st, null, 2)}\n`, { mode: 0o600 });
  if (args.json) console.log(JSON.stringify(st, null, 2));
  else {
    console.log(`# github-agent · cdp=${st.cdp.ok ? 'up' : 'down'} · gh=${st.gh.login || 'no'}`);
    console.log(`  ${st.pinHint}`);
    if (st.cdp.error) console.log(`  cdp error: ${st.cdp.error}`);
    for (const t of st.tabs.slice(0, 6)) {
      console.log(`  tab: ${(t.title || '').slice(0, 40)} · ${(t.url || '').slice(0, 70)}`);
    }
    if (st.sensitiveTabs.length) {
      console.log(`  sensitive tabs: ${st.sensitiveTabs.length} (ignored for automation)`);
    }
    for (const n of (st.gh.notifications || []).slice(0, 4)) {
      console.log(`  notif: [${n.reason}] ${n.repo}: ${n.title}`);
    }
    console.log(`  receipt: ${STATUS_JSON}`);
    console.log(`  doc: ${st.doc}`);
  }
}

if (isMain) main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  process.exit(1);
});
