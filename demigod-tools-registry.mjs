#!/usr/bin/env node
/**
 * TOOL DISCOVERY SoR — metadata only (no execution).
 * Every executable declares owner group, output path, mutation/freeze behavior, hot-path.
 * Atlas: docs/exchange/DEMIGOD-FULL-HISTORY-AND-TOOL-ATLAS.md
 * CLI: node demigod-tools-registry.mjs [--json] [--md] [--group gates] · bin/dg tools
 * Dashboard: /api/tools
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
  // Session start — agents: `bin/dg orient` first
  { id: 'orient', name: 'Orient (session start)', group: 'session', cmd: 'bin/dg orient', purpose: 'Truth refresh + demand soft + unify + assert-same → 5-line card', out: '/tmp/dg-busy/orient.json', hot: true },
  { id: 'control', name: 'Control plane', group: 'session', cmd: 'bin/dg home', purpose: 'Cohesive map: site/webflow/match/review/hygiene/ship/orca', out: '/tmp/dg-busy/control-plane.json', hot: true },
  { id: 'ask-claude', name: 'Ask Claude', group: 'session', cmd: 'bin/ask-claude', purpose: 'Synchronous advisory consultation; no external action authority' },
  { id: 'full-check', name: 'Full check', group: 'session', cmd: 'bin/dg full-check', purpose: 'Doctor + orca + gates + smoke (one spine)', out: '/tmp/dg-busy/full-check.json', hot: true },
  { id: 'cockpit', name: 'Cockpit', group: 'session', cmd: 'bin/dg-cockpit', purpose: 'Single honest NEXT + hash chain', out: '/tmp/dg-busy/cockpit.json', hot: true },
  { id: 'smoke', name: 'Agent smoke', group: 'session', cmd: 'bin/dg-smoke', purpose: 'CDP body/h1/foot/WIZ proof', out: '/tmp/dg-busy/agent-smoke.json', hot: true },
  { id: 'usertest', name: 'User-test harness', group: 'session', cmd: 'bin/dg-usertest', purpose: 'Unified site+dash+tools+forms UX suite', out: '/tmp/dg-busy/user-test-latest.json', hot: true },
  { id: 'usertest-quick', name: 'User-test quick', group: 'session', cmd: 'bin/dg-usertest --quick', purpose: 'Faster UX suite without full selftest', out: '/tmp/dg-busy/user-test-latest.json', hot: true },
  { id: 'evidence', name: 'Evidence latest', group: 'session', cmd: 'node demigod-evidence.mjs fresh truth', purpose: 'Refuse stale truth/review green', out: '/tmp/dg-busy/evidence/latest-truth.json', hot: true },
  { id: 'craft', name: 'Craft log status', group: 'session', cmd: 'bin/dg craft status', purpose: 'Verified product outcomes only (ship/intro/event); fail-closed', out: '/tmp/dg-busy/craft-log/log.jsonl', hot: true },
  { id: 'craft-mint-ship', name: 'Craft mint ship', group: 'ship', cmd: 'bin/dg craft mint ship', purpose: 'Append ship_live only if truth PASS disk==live', out: '/tmp/dg-busy/craft-log/log.jsonl', hot: true },
  { id: 'truth', name: 'Truth oracle', group: 'session', cmd: 'bin/dg truth', purpose: 'Single disk/live/freeze/lock/board truth (SHA); 15s live cache', out: '/tmp/dg-busy/truth.json', hot: true },
  { id: 'perf-cache', name: 'Perf cache', group: 'gates', cmd: 'node -e "import(\'./demigod-perf-cache.mjs\').then(m=>console.log(JSON.stringify(m.constants())))"', purpose: 'Shared TTL cache for live/CDN probes across tools', out: '/tmp/dg-busy/perf-cache/' },
  { id: 'live-doctor', name: 'Live doctor (alias)', group: 'session', cmd: 'bin/dg live', purpose: 'Alias of truth', out: '/tmp/dg-busy/truth.json', hot: true },
  { id: 'foot-lock', name: 'Foot lock', group: 'session', cmd: 'bin/dg lock status', purpose: 'Hard mutex for demigod-foot-core.js', out: '/tmp/dg-busy/foot-lock.json', hot: true },
  { id: 'route-mime', name: 'Route MIME', group: 'gates', cmd: 'bin/dg mime', purpose: 'Product URLs must be text/html not catbox plain', out: '/tmp/dg-busy/route-mime.json', hot: true },
  { id: 'doctor', name: 'Doctor', group: 'session', cmd: 'node demigod-doctor.mjs', purpose: 'Env health: CDP, dash, keys, bins, orca', out: '/tmp/dg-busy/doctor.json', hot: true },
  { id: 'orca-up', name: 'Orca up', group: 'orca', cmd: 'bin/dg-orca up', purpose: 'Keep-awake + desktop Orca + pair + hubs', hot: true },
  { id: 'orca-status', name: 'Orca status', group: 'orca', cmd: 'bin/dg-orca status', purpose: 'Runtime + keep-awake + pair doctor', out: '/tmp/orca-pair-meta.json', hot: true },
  { id: 'orca-pair', name: 'Orca pair URL', group: 'orca', cmd: 'bin/dg-orca pair', purpose: 'Phone pairing orca:// URL + HTML', out: '/home/potter/orca-pair-code.txt', hot: true },
  { id: 'orca-swarm', name: 'Orca swarm', group: 'orca', cmd: 'bin/dg-orca swarm', purpose: 'Spawn grok+claude+codex in demigod-swarm worktree' },
  { id: 'orca-site', name: 'Orca site tabs', group: 'orca', cmd: 'bin/dg-orca site', purpose: 'Open live site + control plane in Orca browser' },
  { id: 'webflow', name: 'Webflow workbench', group: 'session', cmd: 'bin/dg-webflow status', purpose: 'Freeze/tabs/truth/playbooks for Designer+Custom Code', out: '/tmp/dg-busy/webflow-status.json', hot: true },
  { id: 'webflow-doctor', name: 'Webflow doctor', group: 'session', cmd: 'bin/dg-webflow doctor', purpose: 'CDP + live + Designer/custom-code readiness', out: '/tmp/dg-busy/webflow-doctor.json', hot: true },
  { id: 'webflow-audit', name: 'Webflow designer audit', group: 'session', cmd: 'node demigod-webflow-audit.mjs', purpose: 'CDP Designer canvas residual (contact/branding/CTAs); fails closed on empty canvas', out: 'HEAVY-DEMIGOD-AUDIT.json', hot: false },
  { id: 'webflow-change-selftest', name: 'Webflow change selftest', group: 'gates', cmd: 'node demigod-webflow-change-selftest.mjs', purpose: 'classifyChange + freeze.authorized paste/publish + robots/sitemap liveTruth', hot: true },
  { id: 'hygiene', name: 'Laptop hygiene', group: 'session', cmd: 'node demigod-laptop-hygiene.mjs --prune', purpose: 'Prune CDP tabs + load/mem check', out: '/tmp/dg-busy/laptop-hygiene.json', hot: true },
  { id: 'ponytail', name: 'Ponytail status', group: 'session', cmd: 'node demigod-ponytail.mjs status --json', purpose: 'Lazy-senior agent skill: Claude/Codex plugins + cursor rules + AGENTS wiring', out: '/tmp/dg-busy/ponytail-status.json', hot: true },
  { id: 'ponytail-check', name: 'Ponytail check', group: 'gates', cmd: 'node demigod-ponytail.mjs check --json', purpose: 'Fail closed if Ponytail not wired for agents', out: '/tmp/dg-busy/ponytail-status.json', hot: true },
  { id: 'review', name: 'Code review v2.3', group: 'session', cmd: 'bin/dg-review --no-contract --fail-on high', purpose: 'Default no-contract fail-on high (dogfood-safe); use --contract for intentional multi-file commits', out: '/tmp/dg-busy/review-latest.json', hot: true },
  { id: 'review-since', name: 'Review since HEAD~1', group: 'session', cmd: 'bin/dg-review --since HEAD~1 --no-contract --fail-on high', purpose: 'Agent thrash↓ delta review', out: '/tmp/dg-busy/review-latest.json', hot: true },
  { id: 'review-bug', name: 'Bug-hunt review', group: 'gates', cmd: 'bin/dg-review --bug --gates --no-contract', purpose: 'Stricter + targeted gates', out: '/tmp/dg-busy/review-latest.json' },
  { id: 'review-fix', name: 'Review autofix dry', group: 'gates', cmd: 'bin/dg-review --fix --dry-run --no-contract', purpose: 'Tier-A whitespace/newline/BOM preview', out: '/tmp/dg-busy/review-latest.json' },
  { id: 'review-selftest', name: 'Review selftest', group: 'gates', cmd: 'node demigod-review-selftest.mjs', purpose: 'Fixture proof + multi-file contract + blast --send ban', hot: true },
  { id: 'ship-selftest', name: 'Ship selftest', group: 'gates', cmd: 'node demigod-ship-selftest.mjs', purpose: 'Freeze-safe ship CLI and release-bundle contract gate', hot: true },
  { id: 'ship-prepare-contract', name: 'Ship prepare contract', group: 'gates', cmd: 'node demigod-ship-prepare-contract.test.mjs', purpose: 'Locks bin/dg ship prepare steps (import-integrity, honesty, foot-smoke, observational truth)', hot: true },
  { id: 'ship', name: 'Ship orchestrator', group: 'ship', cmd: 'bin/dg ship status|prepare|cdn|paste|verify|run', purpose: 'Single ship path; mutators need freeze OFF + foot lock', out: '/tmp/dg-busy/ship-os.json', hot: true },
  { id: 'dg-publish', name: 'Publish front door', group: 'ship', cmd: 'bin/dg-publish --dry-run', purpose: 'Fail-closed live publish (auth+CDP+gates); dry-run default for agents', out: '/tmp/dg-busy/dg-publish.log', hot: true },
  { id: 'demand', name: 'Demand ops', group: 'session', cmd: 'bin/dg demand status', purpose: 'GTM queue + SENT-CONFIRMED + pilots', out: '/tmp/dg-busy/demand-status.json', hot: true },
  { id: 'demand-draft', name: 'Demand draft pack', group: 'session', cmd: 'bin/dg demand draft --name=T0', purpose: 'Copy-paste DM pack — never sends (drafts-only policy)', out: '/tmp/dg-busy/demand-draft.json', hot: true },
  { id: 'pilot', name: 'Pilot inbound', group: 'session', cmd: 'bin/dg pilot status', purpose: 'WIZ/warm inbound → PILOT-LOG / white-glove (warm ≠ pilot)', out: '/tmp/dg-busy/pilot-inbound.json', hot: true },
  { id: 'next-canon', name: 'Canonical NEXT', group: 'session', cmd: 'bin/dg next-canon', purpose: 'Single NEXT from truth evidence + freeze + demand', out: '/tmp/dg-busy/next.json', hot: true },
  { id: 'cycle-status', name: 'Cycle status', group: 'session', cmd: 'bin/dg cycle-status', purpose: 'Read-only cycle + demand hygiene + canonical NEXT status; --attest fails closed', out: '/tmp/dg-busy/cycle-status.json', hot: true },
  { id: 'cycle-work', name: 'Cycle work (one unit)', group: 'session', cmd: 'node demigod-cycle-work.mjs --domain=auto --owner=dashboard', purpose: 'One single-flight work unit (respects lock)', out: '/tmp/dg-busy/cycle-work-latest.json', hot: true },
  { id: 'never-stop-status', name: 'Never-stop status', group: 'session', cmd: 'node demigod-never-stop-loop.mjs status', purpose: 'Background backlog loop status', hot: true },
  { id: 'never-stop-stop', name: 'Stop never-stop', group: 'session', cmd: 'node demigod-never-stop-loop.mjs stop', purpose: 'Stop the background backlog loop', hot: true },
  { id: 'swarm-status', name: 'Swarm status', group: 'swarm', cmd: 'node demigod-swarm-busy.mjs status', purpose: 'Agent swarm supervisor status (paused by default)', hot: true },
  { id: 'swarm-stop', name: 'Stop swarm', group: 'swarm', cmd: 'node demigod-swarm-busy.mjs stop', purpose: 'Stop the agent swarm supervisor', hot: true },
  { id: 'codex-swarm', name: 'Codex swarm assist', group: 'swarm', cmd: 'bin/dg-codex-swarm status', purpose: 'Periodic Codex assist wave status; once/start/stop via bin/dg-codex-swarm (usage-limited until provider credits)', out: '/tmp/dg-busy/swarm/swarm-last.json', hot: true },
  { id: 'harness-selftest', name: 'Harness selftest', group: 'gates', cmd: 'node demigod-harness-selftest.mjs', purpose: 'Workloop harness contract selftest', hot: true },
  { id: 'priority', name: 'Priority board', group: 'session', cmd: 'bin/dg priority', purpose: 'Dynamic top-of-dash priorities (demigod-priority-board)', out: '/tmp/dg-busy/priority-board.json', hot: true },
  { id: 'work-find', name: 'Work find', group: 'session', cmd: 'node demigod-work-find.mjs', purpose: 'Auto-discover unblocked agent work into work-queue', out: '/tmp/dg-busy/WORK-FOUND.md', hot: true },
  { id: 'outreach-draft-audit', name: 'Outreach draft audit', group: 'session', cmd: 'node demigod-useful-loop.mjs task outreach-draft-audit', purpose: 'Draft-only Events outreach readiness sample (queued/rejected; no send)', out: '/tmp/dg-busy/events-bot/outreach-draft-audit.json', hot: true },
  { id: 'wiz-a11y-audit', name: 'WIZ a11y audit', group: 'gates', cmd: 'node demigod-wiz-a11y-audit.mjs', purpose: 'Wizard accessibility audit (labels, focus, targets)', hot: true },
  { id: 'dogfood', name: 'Tool dogfood', group: 'session', cmd: 'node demigod-tool-dogfood.mjs status --json', purpose: 'Tool usage usefulness telemetry', out: '/tmp/dg-busy/tool-dogfood-status.json', hot: true },
  { id: 'quality', name: 'Quality wave', group: 'gates', cmd: 'bin/dg-quality once', purpose: 'Rotated product and tooling quality checks', out: '/tmp/dg-busy/coord/quality-last.json', hot: true },
  { id: 'funnel-selftest', name: 'Funnel selftest', group: 'gates', cmd: 'node demigod-funnel-selftest.mjs', purpose: 'Lead-state, approval, contact, package, and collision integrity gate', hot: true },
  { id: 'funnel-prune-terminal-drafts', name: 'Prune terminal funnel drafts', group: 'session', cmd: 'node demigod-funnel.mjs prune-terminal-drafts', purpose: 'Archive DQ/opt-out/quarantine no-contact drafts + orphan draft files; never sends', out: '/tmp/dg-busy/funnel/terminal-draft-prune-latest.json', hot: false },
  { id: 'funnel-status', name: 'Funnel status', group: 'session', cmd: 'bin/dg funnel status', purpose: 'Read-only lead funnel, package honesty, and event-health snapshot', hot: true },
  { id: 'funnel-collision-plan', name: 'Funnel duplicate cleanup plan', group: 'session', cmd: 'node demigod-funnel.mjs collision-plan', purpose: 'Review-only same-URL partner merge plan; use collision-plan --apply after review (evidence kept on survivor)', out: '/tmp/dg-busy/funnel/' },
  { id: 'funnel-collision-apply', name: 'Funnel collision apply', group: 'session', cmd: 'node demigod-funnel.mjs collision-plan --apply', purpose: 'Apply reviewed same-URL partner merges (evidence kept on survivor)', alias: 'funnel-collision-plan', hot: false },
  { id: 'lead-collect-url-dedupe', name: 'Lead collect URL dedupe', group: 'gates', cmd: 'node demigod-funnel-selftest.mjs', purpose: 'URL-first partnerDedupeKey / reattach twin skip (covered by funnel selftest)', alias: 'funnel-selftest', hot: false },
  { id: 'lead-sourcer', name: 'Lead sourcing preview', group: 'session', cmd: 'node demigod-lead-sourcer.mjs --type=talent', purpose: 'Preview evidence-backed talent submissions for private triage; never changes the CRM', out: '/tmp/dg-busy/lead-sourcer-latest.json', safe: true },
  { id: 'pipeline-status', name: 'Pipeline status', group: 'session', cmd: 'node demigod-lead-pipeline.mjs tick --stage=status', purpose: 'Read current lead funnel status without changing leads, packages, or board', safe: true },
  { id: 'pipeline-packages', name: 'Pipeline package refresh', group: 'session', cmd: 'node demigod-lead-pipeline.mjs tick --stage=packages', purpose: 'Refresh private approval/send/invite evidence without sending or changing leads/board', safe: true },
  { id: 'events-online', name: 'Events online status', group: 'session', cmd: 'bin/dg events status', purpose: 'Read-only Events app, tunnel, config, and store health (alias: bin/dg events-online)', hot: true },
  { id: 'dg-events-outbox', name: 'Events resource outbox', group: 'session', cmd: 'bin/dg-events-outbox status', purpose: 'Read-only invite and resource-draft readiness counts; never sends', hot: true },
  { id: 'dg-events-tick', name: 'Events draft tick', group: 'session', cmd: 'bin/dg-events-tick', purpose: 'Advance one Events Bot cycle in draft mode; never sends', mutate: true },
  { id: 'events-bot-selftest', name: 'Events Bot selftest', group: 'gates', cmd: 'env DEMIGOD_EVENTS_BOT_MOCK=1 node demigod-events-bot-selftest.mjs', purpose: 'Full deterministic Events Bot behavior gate', hot: true },
  { id: 'events-bot-chat-residual', name: 'Events bot chat residual', group: 'gates', cmd: 'env DEMIGOD_EVENTS_BOT_MOCK=1 node demigod-events-bot-selftest.mjs', purpose: 'Owner-chat slang normalize residual (whatsthecallsheet family → tick plan) via events bot selftest; demigod-events-bot-chat.mjs', hot: false },
  { id: 'events-test', name: 'Events focused gate', group: 'gates', cmd: 'bin/dg events-test fast', purpose: 'Focused EventsBot suites (policy, lifecycle, dashboard, outbox, native invite)', hot: true },
  { id: 'events-reconcile', name: 'Events preplan reconcile', group: 'session', cmd: 'bin/dg events-reconcile', purpose: 'Dry-run (default) clear premature native RSVP artifacts; apply only with --apply-production-foreground', out: '/tmp/dg-busy/events-bot/preplan-native-cleanup-proposal.json', hot: false },
  { id: 'startup-map-refresh', name: 'SF startup map data refresh', group: 'session', cmd: 'node demigod-startup-map-data.mjs', purpose: 'Rebuild public DEMIGOD-SF-STARTUP-MAP.json from open data (no outbound except public open-data fetches)', out: 'DEMIGOD-SF-STARTUP-MAP.json', hot: false },
  { id: 'atlas-source-locate', name: 'Atlas source locate', group: 'session', cmd: 'node demigod-startup-map-data.mjs', purpose: 'Locate/rebuild SF atlas map data source (venue pins live on CDN; disk atlas map-free by design)', out: 'DEMIGOD-SF-STARTUP-MAP.json', alias: 'startup-map-refresh', hot: false },
  { id: 'startup-jobs-enrich', name: 'SF startup US-posted job counts', group: 'session', cmd: 'node demigod-startup-jobs-enrich.mjs', purpose: 'Enrich map companies with US-posted/Remote open-role counts from public Greenhouse/Lever/Ashby boards (point-in-time; compact write)', out: 'DEMIGOD-SF-STARTUP-MAP.json', hot: false },
  { id: 'events-app-policy', name: 'Events app policy selftest', group: 'gates', cmd: 'node --test demigod-events-app-policy-selftest.mjs', purpose: 'Events API privacy, authorization, and persistence policy gate' },
  { id: 'events-dashboard-test', name: 'Events dashboard selftest', group: 'gates', cmd: 'node --test demigod-dashboard-events-native-invite.test.mjs', purpose: 'Events operator-card truth, readiness, and action contract' },
  { id: 'invite-drain', name: 'Events invite drain', group: 'session', cmd: 'node demigod-events-invite-drain.mjs', purpose: 'Absorb real invite URLs and purge stale, fixture, or orphan outbox files; never invent', out: '/tmp/dg-busy/events-bot/invite-drain-latest.json', mutate: true },
  { id: 'favicon-ship', name: 'Favicon ship', group: 'site', cmd: 'node demigod-favicon-ship.mjs', purpose: 'Write demigod favicon links into head-minimal', out: null, hot: false },
  { id: 'blog-assets', name: 'Blog assets wire', group: 'site', cmd: 'node demigod-blog-assets-gen.mjs', purpose: 'Wire blog hero CDN URLs from upload receipt', out: null, hot: false },
  { id: 'full-pass-status', name: 'Full-pass loop status', group: 'session', cmd: 'node demigod-full-pass-loop.mjs status', purpose: 'Durable multi-track loop (dash/webflow/frontend)', out: '/tmp/dg-busy/full-pass-state.json', hot: true },
  { id: 'unify', name: 'Unify snapshot', group: 'session', cmd: 'bin/dg unify', purpose: 'Deep snapshot (orient is the short path)', out: '/tmp/dg-busy/unify.json', hot: true },
  { id: 'poison-green', name: 'Poison false-green selftest', group: 'gates', cmd: 'node demigod-poison-green-selftest.mjs', purpose: 'Tamper latest-truth → green must flip off → restore', out: '/tmp/dg-busy/evidence/', hot: true },
  { id: 'version-ledger', name: 'Version ledger', group: 'gates', cmd: 'node demigod-version-ledger.mjs tail', purpose: 'Append-only disk/live/cdn history (written by truth)', out: 'DEMIGOD-VERSION-LEDGER.jsonl' },
  { id: 'ledger', name: 'Ledger delta', group: 'gates', cmd: 'node demigod-version-ledger.mjs delta', purpose: 'Dashboard-runnable version delta', out: '/tmp/dg-busy/version-ledger-tail.json', hot: true },
  { id: 'truth-delta', name: 'Truth delta', group: 'gates', cmd: 'bin/dg ledger delta', purpose: 'What changed since last truth ledger line', out: '/tmp/dg-busy/version-ledger-tail.json', hot: true },
  { id: 'evidence-producers', name: 'Evidence producers', group: 'gates', cmd: 'node demigod-evidence.mjs producers truth,review,demand,smoke', purpose: 'Check required evidence producers', out: '/tmp/dg-busy/evidence/', hot: true },
  { id: 'tools-os-selftest', name: 'Tools OS selftest', group: 'gates', cmd: 'node demigod-tools-os-selftest.mjs', purpose: 'Dashboard, registry, and job wiring selftest', hot: true },
  { id: 'grok-ask-selftest', name: 'Grok-ask transport selftest', group: 'gates', cmd: 'node demigod-grok-ask-selftest.mjs', purpose: 'bin/grok-ask context + Broken-pipe retry + 402 circuit breaker (verify:all + ship-gate)', hot: true },
  { id: 'grok-out-contract', name: 'Grok-out projection contract', group: 'gates', cmd: 'node demigod-agent-dashboard.mjs --selftest-grok-out', purpose: 'Mailbox receipt contract (bold **VERDICT:** etc.); transport=ok ≠ incomplete', hot: true },
  { id: 'next-assert', name: 'NEXT identity assert', group: 'session', cmd: 'bin/dg next-canon --assert-same', purpose: 'Fail if control/cockpit/ship NEXT drift from buildNext', out: '/tmp/dg-busy/next.json', hot: true },
  { id: 'wiz-ownership', name: 'WIZ ownership selftest', group: 'forms', cmd: 'node demigod-wiz-ownership-selftest.mjs', purpose: 'Source WIZ_CFG ownership (90day, submit, no SLA)', out: '/tmp/dg-busy/wiz-ownership.json', hot: true },
  { id: 'ship-checklist', name: 'Ship checklist', group: 'ship', cmd: 'bin/dg ship status', purpose: 'alias → bin/dg ship status', out: '/tmp/dg-busy/ship-checklist.json', alias: 'ship', hot: false },
  { id: 'ship-prepare', name: 'Ship prepare', group: 'ship', cmd: 'bin/dg ship prepare', purpose: 'Run ship gates without publishing', out: '/tmp/dg-busy/ship-prepare.json', hot: true },
  { id: 'ship-help', name: 'Ship help', group: 'ship', cmd: 'bin/dg ship help', purpose: 'alias → bin/dg ship help', alias: 'ship', hot: false },
  { id: 'ship-facts', name: 'Ship facts only', group: 'ship', cmd: 'bin/dg ship status --facts', purpose: 'disk/live/stage/freeze only — no agent NEXT', out: '/tmp/dg-busy/ship-latest.json', hot: true },
  { id: 'lock-who', name: 'Lock who', group: 'session', cmd: 'bin/dg lock-who', purpose: 'Who holds foot-core lock (pid/age/why)', out: '/tmp/dg-busy/foot-lock.json', hot: true },
  { id: 'handoff', name: 'Handoff structured', group: 'session', cmd: 'bin/dg handoff --from agent --done "…" --next "…"', purpose: 'Structured handoff wall note', hot: true },
  { id: 'approve-sub', name: 'Approve submission', group: 'session', cmd: 'node demigod-submissions-approve.mjs --list', purpose: 'Mint sample board card via mintBoardEntry', hot: true },
  { id: 'inbox', name: 'Submissions inbox', group: 'session', cmd: 'bin/dg-inbox', purpose: 'Redacted startup/engineer/partner queue', out: '/tmp/dg-busy/submissions-inbox-latest.json', hot: true },
  { id: 'submissions-lib', name: 'Submissions lib selftest', group: 'gates', cmd: 'node --test demigod-submissions-lib.test.mjs', purpose: 'Public status, PII scrub, webhook parse, board write guards (verify:all)', hot: true },
  { id: 'webhook-auth', name: 'Webhook auth selftest', group: 'gates', cmd: 'node --test demigod-webhook-auth.test.mjs', purpose: 'Webflow webhook secret readiness + signature verify (shared by setup/submissions/ship checklist)', hot: true },
  { id: 'submissions-e2e', name: 'Submissions e2e gate', group: 'gates', cmd: 'node demigod-submissions-e2e.mjs', purpose: 'Submissions end-to-end honesty gate (fixture isolation; no real outbound)', hot: false },
  { id: 'match-review', name: 'Match review queue', group: 'session', cmd: 'bin/dg-matches list', purpose: 'Pair ledger review queue (not public board)', out: '/tmp/dg-busy/match-review-latest.json', hot: true },
  { id: 'pairs', name: 'Pair ledger CLI', group: 'session', cmd: 'node demigod-pairs-lib.mjs list', purpose: 'Canonical DEMIGOD-PAIRS propose/review/consent', out: 'DEMIGOD-PAIRS.json' },
  { id: 'referrals', name: 'Referral rewards', group: 'session', cmd: 'bin/dg referrals status', purpose: 'Redacted unique-link → retained hire → payout/credit evidence ledger; never moves money. Mint: bin/dg referrals mint-talent --name --email --text · pack · approve · sync · hire → retain → settle', out: '/tmp/dg-busy/referrals-status.json', hot: true },
  { id: 'auto-propose', name: 'Auto-propose pairs', group: 'session', cmd: 'node demigod-auto-propose.mjs --json', purpose: 'Score roles×cands → DEMIGOD-PAIRS (min score 72)', out: '/tmp/dg-busy/auto-propose-latest.json', hot: true },
  { id: 'intro-draft', name: 'Intro draft', group: 'session', cmd: 'node demigod-intro-draft.mjs <sub-id|pairId>', purpose: 'Draft intro (gate: approved|mutual_yes; --force audits)', out: '/tmp/dg-busy/intros/' },
  { id: 'sprint-selftest', name: 'Sprint selftest', group: 'gates', cmd: 'npm run demigod:sprint-selftest', purpose: 'Pairs + intro gate + board audit presence' },
  { id: 'brief', name: 'Agent brief', group: 'session', cmd: 'curl -sS http://127.0.0.1:9878/api/agent-brief', purpose: 'Markdown brief for models', out: '/tmp/dg-busy/AGENT-BRIEF.md', hot: true },
  { id: 'start', name: 'Session start', group: 'session', cmd: 'bin/dg-start', purpose: 'Env + chrome + workspace hygiene' },
  { id: 'preflight', name: 'Preflight', group: 'session', cmd: 'node demigod-preflight.mjs', purpose: 'Before foot edits', out: '/tmp/dg-busy/preflight-latest.json' },

  // Gates
  { id: 'verify-source', name: 'Verify source', group: 'gates', cmd: 'npm run demigod:verify:source', purpose: 'Foot/head/footer source gate', out: 'DEMIGOD-VERIFY-SOURCE.json' },
  { id: 'board-honesty', name: 'Board honesty', group: 'gates', cmd: 'node demigod-verify-board-honesty.mjs', purpose: '≤3 seed roles, real counts honest', out: 'DEMIGOD-BOARD-HONESTY.json' },
  { id: 'loop-state', name: 'Loop state', group: 'gates', cmd: 'node demigod-verify-loop-state.mjs', purpose: 'Loop/busy state consistency' },
  { id: 'import-integrity', name: 'Import integrity', group: 'gates', cmd: 'node demigod-import-integrity.mjs', purpose: 'Clone-breaker + export contracts; also verify:source / ship prepare / .githooks/pre-commit (bin/dg-hooks install)' },
  { id: 'import-integrity-poison', name: 'Import integrity poison', group: 'gates', cmd: 'node --test demigod-import-integrity.test.mjs', purpose: 'Verify-the-verifier: PASS real tree + FAIL gutted exports / missing / untracked demigod-*.mjs', hot: true },
  { id: 'dg-hooks', name: 'Git hooks', group: 'gates', cmd: 'bin/dg-hooks status', purpose: 'Tracked pre-commit (import-integrity); install: bin/dg-hooks install' },

  { id: 'foot-smoke', name: 'Foot smoke', group: 'gates', cmd: 'node demigod-foot-smoke.mjs', purpose: 'Local foot JS smoke' },

  // Ship (mutate — respect freeze)
  { id: 'freeze-status', name: 'Freeze status', group: 'ship', cmd: 'node demigod-publish-freeze.mjs status', purpose: 'Publish freeze on/off', out: '/tmp/dg-busy/publish-freeze.json' },
  { id: 'ship-status', name: 'Ship status', group: 'ship', cmd: 'node demigod-ship-status.mjs', purpose: 'CDN/ship snapshot', out: '/tmp/dg-busy/ship-status.json' },
  { id: 'audit-100', name: 'Audit 100 layers', group: 'gates', cmd: 'bin/dg audit-100', purpose: 'Multi-layer instrumented audit (honest residual list)', out: '/tmp/dg-busy/audit-100-latest.json', hot: true },
  { id: 'live-attest', name: 'Live release attest', group: 'ship', cmd: 'bin/dg live-attest', purpose: 'Prove live foot CDN body matches disk version (markers+len)', out: '/tmp/dg-busy/live-attest.json', hot: true },
  { id: 'live-lib-test', name: 'Live lib unit tests', group: 'gates', cmd: 'node --test demigod-live-lib.test.mjs', purpose: 'Unit tests for live HTML/a11y helpers (dedupe findings etc.)', hot: false },
  { id: 'ship-receipt', name: 'Ship receipt', group: 'ship', cmd: 'bin/dg ship-receipt latest', purpose: 'Immutable ship attempt receipt (write|list|latest)', out: '/tmp/dg-busy/ship-receipt-latest.json', hot: true },
  { id: 'foot-cdn', name: 'Foot CDN publish', group: 'ship', cmd: 'node demigod-foot-cdn-publish.mjs', purpose: 'Publish a commit-pinned jsDelivr foot asset + manifest', mutate: true },
  { id: 'cm6-check', name: 'CM6 structural check', group: 'ship', cmd: 'node demigod-cm6-paste-publish.mjs --check-structural', purpose: 'Validate head/footer editor separation without requiring a released CDN manifest (--check-only alias ok)', mutate: false },
  { id: 'cm6-selftest', name: 'CM6 paste selftest', group: 'gates', cmd: 'node demigod-cm6-paste-publish.mjs --selftest', purpose: 'CM6 paste/publish contract selftest (save debounce, reload gates, transport identity); no Webflow mutate', mutate: false, hot: false },
  { id: 'cm6-paste', name: 'CM6 paste publish', group: 'ship', cmd: 'node demigod-cm6-paste-publish.mjs', purpose: 'Paste canonical head + footer with split assertions, then publish', mutate: true },
  { id: 'tab-prune', name: 'CDP tab prune', group: 'ship', cmd: 'node demigod-cdp-tab-prune.mjs', purpose: 'Close excess Chrome tabs' },

  // Inbox / multi-agent
  { id: 'plan-inbox', name: 'Plan inbox', group: 'swarm', cmd: 'node demigod-plan-inbox.mjs --useful', purpose: 'Unread agent plans', out: '/tmp/dg-busy/plan-inbox-latest.json' },
  { id: 'tools-registry', name: 'Tools registry', group: 'swarm', cmd: 'node demigod-tools-registry.mjs --md', purpose: 'This catalog', hot: true },
  { id: 'dash', name: 'Dashboard', group: 'swarm', cmd: 'bin/dg-dash', purpose: 'Agent dashboard UI :9878', hot: true },
  { id: 'api-coord', name: 'Coord API', group: 'swarm', cmd: 'curl -sS --max-time 5 http://127.0.0.1:9878/api/coord', purpose: 'Read-only coordination lanes, claims, and work-log health', hot: true },
  { id: 'agent-coord-status', name: 'Agent coordination status', group: 'swarm', cmd: 'bin/dg-agent-coord status', purpose: 'Read-only supervisor, worker, claim, and lane state', hot: true },
  { id: 'workflow-map', name: 'Workflow map', group: 'swarm', cmd: 'bin/dg-workflow-map status', purpose: 'Multi-agent workflow diagram status/update/review (occasional timer)', out: '/tmp/dg-busy/coord/workflow-map-last.json', hot: true },

  // Forms / WIZ
  { id: 'wiz-playtest', name: 'WIZ CDP playtest', group: 'forms', cmd: 'node demigod-wiz-cdp-playtest.mjs --local', purpose: 'Local WIZ stepper playtest' },
  { id: 'submit-fixture', name: 'Submit fixture', group: 'forms', cmd: 'node demigod-submit-fixture.mjs', purpose: 'Webflow form submit mock harness' },
];

export function validateTools(tools = TOOLS) {
  const errors = [];
  const ids = new Set();
  const aliases = new Map();
  for (const [index, tool] of tools.entries()) {
    const label = tool?.id || `index ${index}`;
    if (!tool || typeof tool !== 'object') {
      errors.push(`index ${index}: tool must be an object`);
      continue;
    }
    for (const key of ['id', 'name', 'group', 'cmd', 'purpose']) {
      if (typeof tool[key] !== 'string' || !tool[key].trim()) errors.push(`${label}: missing ${key}`);
    }
    if (ids.has(tool.id)) errors.push(`${label}: duplicate id`);
    else ids.add(tool.id);
  }
  for (const tool of tools) {
    if (!tool?.alias) continue;
    if (tool.alias === tool.id) errors.push(`${tool.id}: alias cannot target itself`);
    else if (!ids.has(tool.alias)) errors.push(`${tool.id}: alias target ${tool.alias} is missing`);
    else aliases.set(tool.id, tool.alias);
  }
  for (const start of aliases.keys()) {
    const seen = new Set();
    let current = start;
    while (aliases.has(current)) {
      if (seen.has(current)) {
        errors.push(`${start}: alias cycle detected`);
        break;
      }
      seen.add(current);
      current = aliases.get(current);
    }
  }
  return { ok: errors.length === 0, count: tools.length, errors };
}

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

export function buildRegistry({ group = null, hideAliases = false, hotOnly = false } = {}) {
  const at = new Date().toISOString();
  const validation = validateTools();
  if (!validation.ok) throw new Error(`invalid tools registry: ${validation.errors.join('; ')}`);
  let tools = TOOLS.slice();
  if (group) tools = tools.filter((t) => t.group === group);
  if (hideAliases) tools = tools.filter((t) => !t.alias);
  if (hotOnly) tools = tools.filter((t) => t.hot);
  const enriched = tools.map((t) => ({
    ...t,
    evidence: toolAge(t.out),
  }));
  const groups = [...new Set(enriched.map((t) => t.group))];
  return {
    at,
    count: enriched.length,
    groups,
    tools: enriched,
    hideAliases,
    hotOnly,
    aliasesHidden: hideAliases ? TOOLS.filter((t) => t.alias).length : 0,
    validation,
    sessionStart: ['bin/dg orient', 'curl -sS http://127.0.0.1:9878/api/orient'],
    note: 'Prefer bin/dg orient (then unify/next-canon). API /api/tools defaults hideAliases+hotOnly; ?all=1 for full catalog. Mutate only when freeze OFF.',
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
