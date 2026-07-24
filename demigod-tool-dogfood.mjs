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
const retiredLabels = new Set([
  'agent-comms',
  'computer-use',
  'dg-tools',
  'anti-bloat',
  'dg-ops-os',
  'webflow-tests',
  'dash-tests',
  'orca-terminal-send',
  'mobile-layout-audit',
  'events-policy-test',
  'dg-demand',
  'webflow-ai',
  'anti-bloat-pick',
  'quality-q1-host',
  'ship-v757',
  'selfstart-install-check',
  'funnel-watchdog-install',
  'ship-cdn-paste',
  'agent-coord',
  'codex-swarm-assist',
  'codex-swarm-review',
  'dg-workflow-map',
  'events-online-frontdoor',
  'events-status',
  'dg-dash-health',
  'grok-busy-loop',
  'grok-ask',
  'lead-pipeline',
  'dg-lead-pipeline',
  'selfstart-watchdog',
  'swarm-assist',
  'release-check',
  'foot-privacy-check',
  // one-shot manual logs — not recurring CLIs
  'store-reconcile-premature-rsvp',
  'git-durability-restore',
  'funnel-hygiene-draftid',
  'draft-claim-source-repair',
  'talent-greet-seo-refresh',
  'events-preferred-tunnel-note',
  'wip-triage-tools-batch',
  // external agent CLIs — not demigod product tools
  'ask-claude',
  'ask-codex',
  'grok-ask',
  // one-shot agent-entry / yolo labels — not registry tools
  'claude-yolo-loop',
  'claude-entry',
  // generic wrap labels / one-shot probes (not registry tools)
  'node-test',
  'tools-defect-scan',
  'totally-fake-tool-xyz',
  't',
]);
const explicitAliases = new Map([

  ['coord', 'agent-coord-status'],
  ['coord-api', 'api-coord'],
  ['coord-claim', 'agent-coord-status'],
  ['dash-coord', 'api-coord'],
  ['dashboard-events', 'events-dashboard-test'],
  ['dashboard-coord', 'api-coord'],
  ['dashboard-status', 'dash'],
  ['dg-cli', 'control'],
  ['bin/dg', 'control'],
  ['dg-dash-status', 'dash'],
  ['dg-quality', 'quality'],
  ['quality-q1-host', 'quality'],
  ['dg-demand', 'demand'],
  ['demigod-user-test', 'usertest'],
  // wrap/shorthand variants of registry usertest
  ['user-test', 'usertest'],
  ['dg-user-test', 'usertest'],
  ['dg-usertest', 'usertest'],
  ['demigod:funnel:selftest', 'funnel-selftest'],
  ['events-online-selfcheck', 'events-online'],
  ['events-online-selftest', 'events-online'],
  ['events-selftest', 'events-bot-selftest'],
  ['dg-events-test', 'events-test'],
  ['bin/dg events-test', 'events-test'],
  ['bin/dg events-test fast', 'events-test'],
  ['events-test-fast', 'events-test'],
  ['events-fast-test', 'events-test'],
  ['events-fast-gate', 'events-test'],
  ['events-public-invite-test', 'events-test'],
  ['events-lifecycle-fix', 'events-test'],
  ['events-lifecycle-tests', 'events-test'],
  ['events-policy-tests', 'events-app-policy'],
  ['events-policy-test', 'events-app-policy'],
  // Codex/Grok wrap shorthand without -test suffix
  ['events-policy', 'events-app-policy'],
  ['events-community', 'events-app-policy'],
  ['events-app-policy', 'events-app-policy'],
  ['events-api-policy', 'events-app-policy'],
  ['events-review', 'events-app-policy'],
  ['events-management', 'events-app-policy'],
  ['events-reconcile', 'events-reconcile'],
  ['events-reconcile-snapshot', 'events-reconcile'],
  ['store-reconcile-premature-rsvp', 'events-reconcile'],
  ['startup-map-refresh', 'startup-map-refresh'],
  ['startup-map', 'startup-map-refresh'],
  ['events-audience-policy', 'events-test'],
  ['events-audience-gates', 'events-test'],
  ['orca-cli', 'orca-status'],
  ['orca', 'orca-status'],
  ['demigod-work-find', 'work-find'],
  ['node demigod-work-find.mjs', 'work-find'],
  ['demigod-wiz-a11y-audit', 'wiz-a11y-audit'],
  ['events-app-policy-selftest', 'events-app-policy'],
  ['mobile-lighthouse', 'live-doctor'],
  ['mobile-a11y', 'wiz-a11y-audit'],
  ['mobile-layout-audit', 'wiz-a11y-audit'],
  ['priority-board', 'priority'],
  ['dg-priority', 'priority'],
  ['tools-os', 'tools-os-selftest'],
  ['df-review', 'review'],
  ['dg-next', 'next-canon'],
  ['dg', 'orient'],
  ['dashboard', 'dash'],
  ['dashboard-service', 'dash'],
  ['dashboard-workers', 'dash'],
  ['dashboard-source-identity', 'dash'],
  ['wiz-startup-playtest', 'wiz-playtest'],
  ['wiz-engineer-playtest', 'wiz-playtest'],
  ['wiz-playtest-engineer', 'wiz-playtest'],
  ['dashboard-clean-ui-test', 'tools-os-selftest'],
  ['dash-tests', 'tools-os-selftest'],
  ['dg-dashboard-clean-ui', 'tools-os-selftest'],
  ['events-bot-record-invite-gate', 'events-bot-selftest'],
  ['events-native-venue-gate', 'events-test'],
  ['startup-map-test', 'events-test'],
  ['codex-discover', 'work-find'],
  ['ship-prepare', 'ship'],
  ['ship-verify', 'ship'],
  ['ship-status', 'ship'],
  ['dg-ship', 'ship'],
  ['submission-approval-guard-test', 'approve-sub'],
  ['referrals-test-isolation', 'funnel-selftest'],
  ['referrals-isolation', 'funnel-selftest'],
  ['bin/dg ship', 'ship'],
  ['verify-source', 'verify-source'],
  ['node-check', 'verify-source'],
  ['source-verify', 'verify-source'],
  ['verify', 'verify-source'],
  // Short agent wrap labels for the board/loop gates (id is board-honesty / loop-state).
  ['verify-board', 'board-honesty'],
  ['verify-loop-state', 'loop-state'],
  ['verify-loop', 'loop-state'],
  ['mobile-a11y-sweep', 'wiz-a11y-audit'],
  ['wiz-cdp-playtest', 'wiz-playtest'],
  ['events-online-heal', 'events-online'],
  ['events-online-status', 'events-online'],
  ['events-restamp-watch', 'events-online'],
  ['submissions-triage', 'submit-fixture'],
  ['events-publish-policy-test', 'events-app-policy'],
  ['tools-lane-inspect', 'tools-os-selftest'],
  ['events-store-hygiene', 'events-online'],
  ['tool-dogfood', 'dogfood'],
  ['dogfood-status', 'dogfood'],
  ['dogfood-alias-test', 'dogfood'],
  ['dg-agent-coord-digest', 'agent-coord-status'],
  ['dg-agent-coord-focus-selftest', 'agent-coord-status'],
  ['dg-agent-coord-claim', 'agent-coord-status'],
  ['events-lifecycle-selftest', 'events-bot-selftest'],
  ['dg-webflow', 'webflow'],
  ['dg-tools-selftest', 'tools-os-selftest'],
  ['dg-tools', 'tools-os-selftest'],
  ['selfstart-status', 'never-stop-status'],
  ['dg-lead-pipeline-selftest', 'funnel-selftest'],
  ['dg-funnel-selftest', 'funnel-selftest'],
  ['webflow-ai', 'webflow'],
  ['selfstart', 'never-stop-status'],
  ['webflow-tests', 'webflow'],
  ['dg-ops-os', 'control'],
  ['anti-bloat', 'review'],
  ['events-lifecycle-test', 'events-bot-selftest'],
  ['funnel-tests', 'funnel-selftest'],
  // manual logs + discovery wrappers (not separate registry tools)
  ['useful-loop', 'work-find'],
  ['demigod-useful-loop', 'work-find'],
  // Claude/Grok wrap shorthand for quality+gates wave
  ['gates-trio', 'quality'],
  ['gate-trio', 'quality'],
  ['quality-trio', 'quality'],
  ['demigod-tools-selftest', 'tools-os-selftest'],
  ['tools-selftest', 'tools-os-selftest'],
  ['tools-discovery', 'tools-os-selftest'],
  ['tools-discover', 'tools-os-selftest'],
  ['control-plane', 'control'],
  ['controlplane', 'control'],
  ['dg-control', 'control'],
  ['webflow-change-selftest', 'webflow'],
  ['webflow-status', 'webflow'],
  ['events-outbox', 'events-online'],
  ['events-outbox-status', 'events-online'],
  ['events-agent', 'events-bot-selftest'],
  ['events-bot-agent', 'events-bot-selftest'],
  ['public-event-probe', 'events-online'],
  ['public-event', 'events-online'],
  ['webflow-change', 'webflow'],
  ['dashboard-tests', 'tools-os-selftest'],
  ['dashboard-test', 'tools-os-selftest'],
  ['dg-status', 'control'],
  ['status', 'control'],
  ['bin/dg status', 'control'],
  ['webflow-webhook-setup-test', 'webflow'],
  ['webflow-webhook-setup', 'webflow'],
  ['dg-events-online', 'events-online'],
  ['bin/dg-events-online', 'events-online'],
  ['events-online-heal', 'events-online'],
  // Codex/manual wraps often use pipeline-* for funnel gate
  ['pipeline-selftest', 'funnel-selftest'],
  ['pipeline-test', 'funnel-selftest'],
  ['lead-pipeline-selftest', 'funnel-selftest'],
  ['agent-coord', 'agent-coord-status'],
  ['dg-agent-coord', 'agent-coord-status'],
  ['approve-sub-list', 'approve-sub'],
  ['submissions-approve-list', 'approve-sub'],
  ['submissions-approve', 'approve-sub'],
  ['match-review-repro', 'match-review'],
  ['match-review-test', 'match-review'],
  ['dg-matches', 'match-review'],
  ['bin/dg-matches', 'match-review'],
  ['dg-cli', 'orient'],
  ['coord-claim', 'agent-coord-status'],
  ['agent-coord-claim', 'agent-coord-status'],
  ['events-bot', 'events-bot-selftest'],
  ['events-bot-test', 'events-bot-selftest'],
  ['dg-tools-discovery', 'tools-os-selftest'],
  ['tools-discovery', 'tools-os-selftest'],
  ['atlas-test', 'tools-os-selftest'],
  ['startup-atlas-test', 'tools-os-selftest'],
  ['agent-smoke', 'smoke'],
  ['dg-smoke', 'smoke'],
  ['bin/dg-smoke', 'smoke'],
  // archive + dashboard policy wraps (not separate registry ids)
  ['archive-scripts', 'tools-os-selftest'],
  ['demigod-archive-scripts', 'tools-os-selftest'],
  ['dashboard-http-policy', 'tools-os-selftest'],
  ['dashboard-http', 'tools-os-selftest'],
  ['coord-release', 'agent-coord-status'],
  ['coord-release-claim', 'agent-coord-status'],
  // one-shot probes / suite aliases
  ['unknown-flag-probe', 'tools-os-selftest'],
  ['chatroom-test', 'events-test'],
  ['chatroom-selftest', 'events-test'],
  ['events-native-test', 'events-dashboard-test'],
  ['events-native-invite-test', 'events-dashboard-test'],
  ['dashboard-events-native-invite', 'events-dashboard-test'],
  ['events-policy-selftest', 'events-app-policy'],
  ['events-app-policy-selftest', 'events-app-policy'],
  ['demigod-swarm-busy', 'tools-os-selftest'],
  ['swarm-busy', 'tools-os-selftest'],
  ['events-outbox-scope-test', 'events-bot-selftest'],
  ['events-outbox-scope', 'events-bot-selftest'],
  ['events-product-honesty', 'events-bot-selftest'],
  ['events-heal', 'events-online'],
  ['cont41-audit', 'tools-os-selftest'],
  ['cont41-verify', 'tools-os-selftest'],
  ['lead-sourcer-test', 'lead-sourcer'],
  ['lead-sourcer-tests', 'lead-sourcer'],
  ['webflow-publish-auto', 'webflow'],
  ['webflow-publish', 'webflow'],
  ['dg-orca', 'orca-status'],
  ['bin/dg-orca', 'orca-status'],
  ['webflow-connect', 'webflow'],
  ['webflow-change-selftest', 'webflow'],
  ['webflow-status', 'webflow'],
  ['events-outbox', 'events-online'],
  ['events-outbox-status', 'events-online'],
  ['events-agent', 'events-bot-selftest'],
  ['events-bot-agent', 'events-bot-selftest'],
  ['public-event-probe', 'events-online'],
  ['public-event', 'events-online'],
  ['webflow-audit-test', 'webflow'],
  ['webflow-audit', 'webflow'],
  // agents wrap dashboard file tests under a non-registry label
  ['dashboard-cli', 'tools-os-selftest'],
  ['dashboard-agent-runtime', 'tools-os-selftest'],
  ['dashboard-events-test', 'events-dashboard-test'],
  ['dashboard-events-native-invite-test', 'events-dashboard-test'],
  ['events-honesty-test', 'events-app-policy'],
  ['verify-loop-state', 'loop-state'],
  ['demand-status', 'demand'],
  ['pilot-status', 'pilot'],
  ['matches', 'match-review'],
  ['webflow-webhook-test', 'webflow'],
  ['webflow-token-privacy-test', 'webflow'],
  ['webflow-loop', 'webflow'],
  ['startup-map-browser', 'startup-map-refresh'],
  ['atlas-source-locate', 'startup-map-refresh'],
  ['atlas-source', 'startup-map-refresh'],
  ['demigod-startup-atlas', 'tools-os-selftest'],
  ['startup-atlas-web', 'tools-os-selftest'],
  ['dashboard-events-contract', 'events-dashboard-test'],
  ['pipeline', 'pipeline-status'],
  ['pipeline-tick', 'pipeline-status'],
  ['dg-pipeline', 'pipeline-status'],
  ['dg-work-find', 'work-find'],
  ['tools-regression', 'funnel-selftest'],
  ['forms-p0-tests', 'usertest'],
  ['forms-p0', 'usertest'],
  ['forms-p0-browser', 'wiz-playtest'],
  // wrap labels agents invent for CDP/match/dash probes
  ['matching-readiness', 'match-review'],
  ['matching-readiness-test', 'match-review'],
  ['wiz-cdp-talent', 'wiz-playtest'],
  ['wiz-cdp-startup', 'wiz-playtest'],
  ['wiz-cdp-engineer', 'wiz-playtest'],
  ['dashboard-control', 'dash'],
  ['dashboard-agent-brief', 'dash'],
  ['dashboard-health', 'dash'],
  ['community-forms-integration', 'usertest'],
  ['wiz-mobile-startup', 'wiz-playtest'],
  ['wiz-mobile-talent', 'wiz-playtest'],
  ['wiz-mobile-engineer', 'wiz-playtest'],
  ['forms-full-audit', 'usertest'],
  // high-noise agent wrap labels (cont65)
  ['dg-demand-draft', 'demand'],
  ['demand-draft', 'demand'],
  ['webflow-helper-selftest', 'webflow'],
  ['webflow-helper', 'webflow'],
  ['events-online-regression', 'events-online'],
  ['events-online-reg', 'events-online'],
  ['forms-v801-verify', 'usertest'],
  ['dg-webflow-doctor', 'webflow'],
  ['webflow-doctor', 'webflow'],
  ['events-online-config-test', 'events-online'],
  ['dg-events-outbox-show', 'events-online'],
  ['events-outbox-show', 'events-online'],
  ['dg-coord-status', 'agent-coord-status'],
  ['dg-coord', 'agent-coord-status'],
  ['verify-live', 'smoke'],
  ['live-html', 'smoke'],
  ['priority-board-test', 'priority'],
  ['seo-live', 'smoke'],
  ['api-tools', 'tools-os-selftest'],
  ['forms-live-audit', 'usertest'],
  ['webflow-webhook', 'webflow'],
  ['events-online-heal-lock', 'events-online'],
  ['events-online-dual-confirm', 'events-online'],
  ['events-test-fast-c173', 'events-test'],
  ['coord-gates-c173', 'agent-coord-status'],
  ['dg-review', 'review'],
  ['outreach-policy', 'demand'],
  ['verify-all', 'verify-source'],
  ['demigod-verify-all', 'verify-source'],
  ['referrals-test', 'funnel-selftest'],
  ['referrals-selftest', 'funnel-selftest'],
  ['laptop-settings', 'tools-os-selftest'],
  ['quality-Q7', 'tools-os-selftest'],
  ['anti-bloat-A4', 'tools-os-selftest'],
  ['truth-prepareOnlyAssets', 'truth'],
  ['truth-prepareonly', 'truth'],
  ['atlas-web-test', 'startup-map-refresh'],
  ['startup-atlas-web-test', 'startup-map-refresh'],
  ['dg-next-canon', 'orient'],
  ['next-canon', 'orient'],
  ['truth-prepareOnlyRelease', 'truth'],
  ['truth-prepareonlyrelease', 'truth'],
  ['demigod-pilot-os-test', 'pilot'],
  ['demigod-submit-to-pilot-test', 'pilot'],
  ['demigod-pilot-os-permissions-test', 'pilot'],
  ['pilot-os-test', 'pilot'],
  ['outreach-external-ready', 'demand'],
  ['control-prepareOnly', 'control'],
  ['control-prepareonly', 'control'],
  ['demigod-webflow-change-selftest', 'webflow'],
  ['webflow-change-selftest', 'webflow'],
  ['webflow-status', 'webflow'],
  ['events-outbox', 'events-online'],
  ['events-outbox-status', 'events-online'],
  ['events-agent', 'events-bot-selftest'],
  ['events-bot-agent', 'events-bot-selftest'],
  ['public-event-probe', 'events-online'],
  ['public-event', 'events-online'],
  // agents shorten webflow-webhook-setup* wraps / SSRF selftest labels
  ['webhook-setup-test', 'webflow'],
  ['webhook-ssrf', 'webflow'],
  ['webflow-webhook-ssrf', 'webflow'],
  // dry-run publish front door labels
  ['dg-publish-dry', 'dg-publish'],
  ['publish-dry', 'dg-publish'],
  ['publish-dry-run', 'dg-publish'],
  // webhook auth SoR + tests (also registered as webhook-auth)
  ['webhook-auth-test', 'webhook-auth'],
  ['demigod-webhook-auth', 'webhook-auth'],
  ['webflow-webhook-auth', 'webhook-auth'],
  // useful-loop single-task labels
  ['useful-loop-task', 'outreach-draft-audit'],
  ['outreach-audit', 'outreach-draft-audit'],
  ['events-outreach-audit', 'outreach-draft-audit'],
].map(([from, to]) => [String(from).toLowerCase(), to]));

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
  'live-doctor',
]);

/** Exit 2 = observational product amber (local ok / public flaky), not tool crash. */
const EXIT2_OK_TOOLS = new Set(['events-online', 'cockpit', 'ship']);

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

export function summarize(rows) {
  const by = {};
  for (const r of rows) {
    const t = canonicalTool(r.tool);
    by[t] = by[t] || { tool: t, registered: toolIds.has(t), retired: isRetiredLabel(t), n: 0, ok: 0, fail: 0, timeout: 0, red: 0, useful: 0, notUseful: 0, lastAt: null, whys: [] };
    by[t].n += 1;
    if (r.failureKind === 'timeout' || r.childExit === 124) by[t].timeout += 1;
    if (r.ok) by[t].ok += 1;
    else if (r.executionOk === true) by[t].red += 1;
    else by[t].fail += 1;
    if (r.useful === true) by[t].useful += 1;
    if (r.useful === false) by[t].notUseful += 1;
    by[t].lastAt = r.at;
    if (r.why && by[t].whys.length < 5) by[t].whys.push(String(r.why).slice(0, 120));
  }
  const allTools = Object.values(by).sort((a, b) => b.n - a.n);
  const retired = allTools.filter((tool) => tool.retired);
  const tools = allTools.filter((tool) => !tool.retired);
  const suggestions = [];
  const unregistered = tools.filter((tool) => !tool.registered);
  if (unregistered.length) {
    suggestions.push({
      tool: '*',
      kind: 'registry',
      text: `${unregistered.reduce((sum, tool) => sum + tool.n, 0)} events use actionable unregistered tools — reconcile ${unregistered.slice(0, 3).map((tool) => tool.tool).join(', ')}`,
    });
  }
  for (const t of tools) {
    const timeoutRate = t.n ? t.timeout / t.n : 0;
    const otherFailures = t.fail - t.timeout;
    const failRate = t.n ? otherFailures / t.n : 0;
    const usefulRate = t.useful + t.notUseful > 0 ? t.useful / (t.useful + t.notUseful) : null;
    if (timeoutRate > 0.4) {
      suggestions.push({ tool: t.tool, kind: 'timeout', text: `${t.tool} has timeout pressure (${t.timeout}/${t.n}) — raise the bound or shorten the hot path` });
    }
    if (failRate > 0.4) {
      suggestions.push({ tool: t.tool, kind: 'reliability', text: `${t.tool} has other execution failures (${otherFailures}/${t.n}) — fix the command/docs or remove from hot path` });
    }
    if (usefulRate != null && usefulRate < 0.35 && t.n >= 3) {
      suggestions.push({ tool: t.tool, kind: 'usefulness', text: `${t.tool} rated not useful — redesign for real workflow or demote from dash` });
    }
    if (t.n === 0) {
      suggestions.push({ tool: t.tool, kind: 'unused', text: `${t.tool} never dogfooded — run wrap once in a real session` });
    }
  }
  if (!rows.length) {
    suggestions.push({ tool: '*', kind: 'bootstrap', text: 'No dogfood yet — agents should wrap tools via demigod-tool-dogfood.mjs wrap' });
  }
  return {
    schema: 'demigod.tool-dogfood/1',
    at: new Date().toISOString(),
    rawTotal: rows.length,
    total: tools.reduce((sum, tool) => sum + tool.n, 0),
    timeouts: tools.reduce((sum, tool) => sum + tool.timeout, 0),
    registeredEvents: tools.filter((tool) => tool.registered).reduce((sum, tool) => sum + tool.n, 0),
    unregisteredEvents: unregistered.reduce((sum, tool) => sum + tool.n, 0),
    retiredEvents: retired.reduce((sum, tool) => sum + tool.n, 0),
    registeredTools: tools.filter((tool) => tool.registered).length,
    unregisteredTools: unregistered.length,
    retiredTools: retired.length,
    retired: retired.map(({ tool, n, lastAt }) => ({ tool, n, lastAt })),
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
  const status = summarize(readLog());
  fs.writeFileSync(STATUS, JSON.stringify(status, null, 2) + '\n');
  if (asJson || cmd === 'report') console.log(JSON.stringify(status, null, 2));
  else {
    console.log(`# dogfood · ${status.total} events · ${status.tools.length} tools · ${status.timeouts} timeouts`);
    for (const t of status.tools.slice(0, 12)) {
      console.log(`  ${t.tool}: n=${t.n} ok=${t.ok} red=${t.red} fail=${t.fail} timeout=${t.timeout}`);
    }
    for (const s of status.suggestions.slice(0, 6)) console.log(`! ${s.text}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
