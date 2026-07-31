#!/usr/bin/env node
/** Audit Cursor setup — what's done, unused, and still manual. */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GAME_ROOT } from '../game-root.mjs';

const ROOT = '/home/potter';
const MIRROR = path.join(ROOT, 'eat-the-sounds');

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

const loop = readJson(path.join(ROOT, 'LOOP-STATE.json')) || {};
const dash = readJson(path.join(ROOT, 'CURSOR-DASHBOARD-SETUP.json')) || {};

const local = {
  workspace: GAME_ROOT,
  agentsMd: exists(path.join(GAME_ROOT, 'AGENTS.md')),
  cloudAgentMd: exists(path.join(GAME_ROOT, 'CURSOR-CLOUD-AGENT.md')),
  cursorignore: exists(path.join(ROOT, '.cursorignore')),
  mcpJson: exists(path.join(ROOT, '.cursor/mcp.json')),
  hooksJson: exists(path.join(ROOT, '.cursor/hooks.json')),
  rules: (fs.existsSync(path.join(ROOT, '.cursor/rules'))
    ? fs.readdirSync(path.join(ROOT, '.cursor/rules')).filter((f) => f.endsWith('.mdc'))
    : []),
  launchScript: exists(path.join(ROOT, 'launch-cursor-game.sh')),
};

let git = { mirror: MIRROR, clean: null, ahead: null, remote: null, lastCommit: null };
try {
  git.clean = execSync('git status --porcelain', { cwd: MIRROR, encoding: 'utf8' }).trim();
  git.lastCommit = execSync('git log -1 --oneline', { cwd: MIRROR, encoding: 'utf8' }).trim();
  const cfg = fs.readFileSync(path.join(MIRROR, '.git/config'), 'utf8');
  git.remote = (cfg.match(/url = (.+)/) || [])[1]?.trim() || null;
} catch (e) {
  git.error = String(e.message || e);
}

const used = [
  { feature: 'Local Agent + AGENTS.md', status: local.agentsMd ? 'active' : 'missing' },
  { feature: 'Project rules (.cursor/rules/*.mdc)', status: local.rules.length ? `active (${local.rules.length})` : 'missing' },
  { feature: 'chrome-devtools MCP', status: local.mcpJson ? 'configured' : 'missing' },
  { feature: 'npm verify/playtest/audio-audit', status: exists(path.join(ROOT, 'package.json')) ? 'wired' : 'missing' },
  { feature: 'CDP playtest-browser (fresh tabs)', status: exists(path.join(ROOT, 'playtest-browser.mjs')) ? 'active' : 'missing' },
  { feature: 'Automation pause (run-continuous.sh)', status: loop.automationPaused ? 'paused (intentional)' : 'could run' },
  { feature: 'Cursor hooks (guard-automation)', status: local.hooksJson ? 'active' : 'unused' },
  { feature: '.cursorignore indexing', status: local.cursorignore ? 'active' : 'unused' },
  { feature: 'CURSOR-CLOUD-AGENT.md prompt', status: local.cloudAgentMd ? 'ready' : 'missing' },
  { feature: 'cursor:dashboard audit script', status: exists(path.join(ROOT, 'cursor-dashboard-setup.mjs')) ? 'ready' : 'missing' },
  { feature: 'cursor:explore audit script', status: exists(path.join(ROOT, 'cursor-explore-all.mjs')) ? 'ready' : 'missing' },
];

const unused = [
  { feature: 'Cloud Agents default repo → eat-the-sounds', blocker: 'manual click', current: dash.pages?.agents?.repos?.[0] || 'crispy-garbanzo' },
  { feature: 'Cloud environment for eat-the-sounds', blocker: 'manual — New env + setup + Save', current: 'none / crispy-garbanzo stale' },
  { feature: 'Bugbot', blocker: 'never enabled', current: 'dashboard link only' },
  { feature: 'Approval Agents', blocker: 'never configured', current: 'UI toggle seen, not set' },
  { feature: 'Security Agents', blocker: 'never explored', current: 'unused' },
  { feature: 'Shared Canvases', blocker: 'never used for game', current: 'unused' },
  { feature: 'Automations (cursor.com/agents)', blocker: 'none created', current: 'button visible' },
  { feature: 'Slack @Cursor integration', blocker: 'manual connect', current: 'getting started 2/4' },
  { feature: 'Self-hosted cloud pool', blocker: 'disabled', current: 'unused' },
  { feature: 'Cloud Secrets (My Secrets)', blocker: 'empty', current: 'unused' },
  { feature: 'Remote SSH extension', blocker: 'installed, not configured', current: 'unused' },
  { feature: 'Webflow MCP plugin', blocker: 'irrelevant project artifact', current: 'stale' },
  { feature: 'cursor-app-control MCP', blocker: 'empty-window only', current: 'unused' },
  { feature: 'Statusline / CLI config skills', blocker: 'default settings only', current: 'unused' },
  { feature: 'GitHub full mirror push', blocker: git.clean ? 'uncommitted local changes' : 'partial MCP push on master', current: git.lastCommit },
];

const manual = [
  'Dashboard → Cloud Agents → Default Repository → Uuriko/eat-the-sounds',
  'Cloud Agents → Environments → New → eat-the-sounds → setup → Save',
  'cursor.com/agents → Archive crispy-garbanzo drafts (usage on Auto)',
  'npm run sync:github && git push from eat-the-sounds/ (or finish MCP batches)',
  'Getting started: Connect Slack (optional)',
];

const report = {
  at: new Date().toISOString(),
  local,
  loop: {
    automationPaused: !!loop.automationPaused,
    cursorPaused: !!loop.cursorPaused,
    phase: loop.phase,
  },
  git,
  used,
  unused,
  manual,
};

const outJson = path.join(ROOT, 'CURSOR-LOOSE-ENDS.json');
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

console.log('# Cursor loose ends\n');
console.log(`Workspace: ${GAME_ROOT}`);
console.log(`Automation: ${loop.automationPaused ? 'PAUSED' : 'active'} | Cursor dispatch: ${loop.cursorPaused ? 'PAUSED' : 'active'}`);
console.log(`Git mirror: ${git.lastCommit || '?'}`);
if (git.clean) console.log(`Uncommitted in eat-the-sounds/: ${git.clean.split('\n').length} files`);
console.log('\n## Used\n');
used.forEach((u) => console.log(`- ${u.feature}: ${u.status}`));
console.log('\n## Not used yet (manual or optional)\n');
unused.forEach((u) => console.log(`- ${u.feature} — ${u.blocker} (${u.current})`));
console.log('\n## Click-list to finish\n');
manual.forEach((m, i) => console.log(`${i + 1}. ${m}`));
console.log(`\nWrote ${outJson}`);