#!/usr/bin/env node
/**
 * TOOL DISCOVERY SoR — metadata only (no execution).
 * Every executable declares owner group, output path, mutation/freeze behavior, hot-path.
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
  // Primary surface: everything else remains available in the cold catalog.
  { id: 'orient', name: 'Orient (session start)', group: 'session', cmd: 'bin/dg', purpose: 'Truth refresh + demand soft + unify + assert-same → 5-line card', out: '/tmp/dg-busy/orient.json', hot: true },
  { id: 'control-board', name: 'Integrity control board', group: 'session', cmd: 'node demigod-control-board.mjs status', purpose: 'Vanta-shaped continuous controls (seals, phase2, pairs, demand drafts-only)', out: '/tmp/dg-busy/control-board.json', hot: true, safe: true },
  { id: 'github-agent', name: 'GitHub CDP + PR brief', group: 'session', cmd: 'node demigod-github-agent.mjs status', purpose: 'Open GitHub tabs on CDP + gh notifications; brief PRs for multi-agent', out: '/tmp/dg-busy/github-agent-status.json', safe: true },
  { id: 'role-packet', name: 'Structured role packet (Ashby-shaped)', group: 'session', cmd: 'node demigod-role-packet.mjs list', purpose: 'Scorecard + evidence-required review notes; no AI verdict', out: 'DEMIGOD-ROLE-PACKETS.json', safe: true },
  { id: 'pilot-batch', name: 'Pilot batch cap (Underdog-shaped)', group: 'session', cmd: 'node demigod-pilot-batch.mjs list', purpose: 'Hard 2–3 candidate batches; terminal before add', out: 'DEMIGOD-PILOT-BATCHES.json', safe: true },
  { id: 'candidate-touch', name: 'Candidate touch rediscovery (Gem-shaped)', group: 'session', cmd: 'node demigod-candidate-touch.mjs rediscover', purpose: 'Owned-history rediscover; no fit score', out: 'DEMIGOD-CANDIDATE-TOUCHES.json', safe: true },
  { id: 'intro-path', name: 'Intro path memory (Affinity-shaped)', group: 'session', cmd: 'node demigod-intro-path.mjs warm', purpose: 'Manual warm-intro paths; human strength+evidence only; no mail scrape/auto-send', out: 'DEMIGOD-INTRO-PATHS.json', safe: true },
  { id: 'public-comp', name: 'Public job-post comp extract (Levels-thin)', group: 'session', cmd: 'node demigod-public-comp.mjs extract --text="$180k-$220k"', purpose: 'Extract DIE-shaped public pay quotes; apply to RolePacket public_job_post only', out: null, safe: true },
  { id: 'call-note', name: 'Call notes (Metaview-thin manual)', group: 'session', cmd: 'node demigod-call-note.mjs list', purpose: 'Human-edited call notes after real screens; no score; never auto-changes pair', out: 'DEMIGOD-CALL-NOTES.json', safe: true },
  { id: 'structured-hiring', name: 'Structured hiring desk', group: 'session', cmd: 'node demigod-structured-hiring.mjs status', purpose: 'Compose role-packet + pilot-batch + rediscover + intro paths (Ashby/Underdog/Gem/Affinity)', out: '/tmp/dg-busy/structured-hiring-status.json', hot: true, safe: true },
  { id: 'structured-hiring-audit', name: 'Structured hiring audit', group: 'session', cmd: 'node demigod-structured-hiring.mjs audit', purpose: 'Validate SH stores: packet/note/batch/touch/intro/call shapes; no fitScore; batch≤3', out: '/tmp/dg-busy/structured-hiring-audit.json', safe: true },
  { id: 'ats-board-coverage', name: 'ATS board coverage (AR-28)', group: 'session', cmd: 'node demigod-enrichment.mjs boards', purpose: 'Map jobsUrl vs openRoles + export unmatched/collisions (no new scrapers)', out: '/tmp/dg-busy/ats-board-coverage.json', safe: true },
  { id: 'reseal-queue', name: 'Research reseal queue', group: 'session', cmd: 'node demigod-reseal-queue.mjs status', purpose: 'After map enrich: enqueue/run company-research reseal', out: '/tmp/dg-busy/reseal-queue-last.json', safe: true },
  { id: 'reseal-due', name: 'Research reseal due (CH-13)', group: 'session', cmd: 'node demigod-reseal-queue.mjs due', purpose: 'Multi-day re-verify due check (no network); weekly timer uses run --schedule', out: null, safe: true },
  { id: 'control', name: 'Control plane', group: 'session', cmd: 'bin/dg home', purpose: 'Cohesive map: site/webflow/match/review/hygiene/ship/orca', out: '/tmp/dg-busy/control-plane.json' },
  { id: 'ask-claude', name: 'Ask Claude', group: 'session', cmd: 'bin/ask-claude', purpose: 'Synchronous advisory consultation; no external action authority' },
  { id: 'codex-ask', name: 'Ask Codex', group: 'session', cmd: 'bin/codex-ask', purpose: 'Stateless codex exec (read-only sandbox); never dual-write live Codex TUI' },
  { id: 'agent-bus', name: 'Agent peer bus', group: 'orca', cmd: 'bin/dg-bus status', purpose: 'Role-resolved Claude/Codex/Grok Orca bus: roster|send|task|wake|unstick', out: '/tmp/dg-busy/agent-roster.json', hot: true },
  { id: 'recruitai-export', name: 'RecruitAI export bridge', group: 'session', cmd: 'node demigod-recruitai-export.mjs', purpose: 'Map+role-ledger → /tmp/dg-busy/recruitai-export (no score/fee/contacts/send)', out: '/tmp/dg-busy/recruitai-export/latest.json' },
  // RA-16: one desk entry (status|pack|refresh) — no triple façade; seed-pack/import stay integrity edges
  { id: 'recruitai-desk', name: 'RecruitAI desk (lalalune v0.1.1)', group: 'session', cmd: 'node demigod-recruitai-desk.mjs status', purpose: 'status|pack|refresh: upstream pin + committed export handoff + seed pack (no Demigod send). Not a second SoR.', out: '/tmp/dg-busy/recruitai-desk-status.json', hot: true, safe: true },
  { id: 'recruitai-seed-pack', name: 'RecruitAI seed pack', group: 'session', cmd: 'node demigod-recruitai-seed-pack.mjs', purpose: 'Export/3 → CompanySeed JSONL + exact daily/7d/30d account changes (no score/contacts/send)', out: '/tmp/dg-busy/recruitai-handoff/seed-pack.json', safe: true },
  { id: 'recruitai-import', name: 'RecruitAI SQLite import (dry)', group: 'session', cmd: 'node demigod-recruitai-import.mjs --dry-run', purpose: 'Plan Demigod seed pack → recruitAI company table (no contacts; --apply to write)', out: '/tmp/dg-busy/recruitai-import-latest.json', safe: true },
  { id: 'enrichment-scoreboard', name: 'Enrichment scoreboard', group: 'session', cmd: 'node demigod-enrichment.mjs scoreboard', purpose: 'Ledger/map/export enrichment counts (public-attributable facts only)', out: '/tmp/dg-busy/enrichment-scoreboard.json', safe: true },
  { id: 'enrichment-batch', name: 'Enrichment batch pipeline', group: 'session', cmd: 'node demigod-enrichment.mjs batch --skip-poll', purpose: 'Reclassify→aging→export→desk→import (use full batch for network poll)', out: '/tmp/dg-busy/enrichment-batch-latest.json', safe: false },
  { id: 'check', name: 'Verification profiles', group: 'gates', cmd: 'bin/dg check edit', purpose: 'One verification router: edit | full | release', out: '/home/potter/DEMIGOD-VERIFY-SOURCE.json', hot: true },
  { id: 'cockpit', name: 'Cockpit', group: 'session', cmd: 'bin/dg-cockpit', purpose: 'Single honest NEXT + hash chain', out: '/tmp/dg-busy/cockpit.json' },
  { id: 'smoke', name: 'Agent smoke', group: 'session', cmd: 'bin/dg-smoke', purpose: 'CDP body/h1/foot/WIZ proof', out: '/tmp/dg-busy/agent-smoke.json' },
  { id: 'usertest', name: 'User-test harness', group: 'session', cmd: 'bin/dg-usertest', purpose: 'Unified site+dash+tools+forms UX suite', out: '/tmp/dg-busy/user-test-latest.json' },
  { id: 'evidence', name: 'Evidence latest', group: 'session', cmd: 'node demigod-evidence.mjs fresh truth', purpose: 'Refuse stale truth/review green', out: '/tmp/dg-busy/evidence/latest-truth.json' },
  { id: 'craft', name: 'Craft log status', group: 'session', cmd: 'bin/dg craft status', purpose: 'Verified product outcomes only (ship/intro/event); fail-closed', out: '/tmp/dg-busy/craft-log/log.jsonl' },
  { id: 'craft-mint-ship', name: 'Craft mint ship', group: 'ship', cmd: 'bin/dg craft mint ship', purpose: 'Append ship_live only if truth PASS disk==live', out: '/tmp/dg-busy/craft-log/log.jsonl' },
  { id: 'truth', name: 'Truth oracle', group: 'session', cmd: 'bin/dg truth', purpose: 'Single disk/live/freeze/lock/board truth (SHA); 15s live cache', out: '/tmp/dg-busy/truth.json', hot: true },
  { id: 'accepted-role', name: 'Accepted-role receipt', group: 'match', cmd: 'node demigod-accepted-role.mjs status', purpose: 'DIE Phase 2 gate: list accepted-for-delivery roles (pure read; samples fail-closed)', out: null, hot: true },
  { id: 'foot-lock', name: 'Foot lock', group: 'session', cmd: 'bin/dg lock status', purpose: 'Hard mutex for demigod-foot-core.js', out: '/tmp/dg-busy/foot-lock.json', hot: true },
  { id: 'route-mime', name: 'Route MIME', group: 'gates', cmd: 'bin/dg mime', purpose: 'Product URLs must be text/html not catbox plain', out: '/tmp/dg-busy/route-mime.json' },
  { id: 'doctor', name: 'Doctor', group: 'session', cmd: 'node demigod-doctor.mjs', purpose: 'Env health: CDP, dash, keys, bins, orca', out: '/tmp/dg-busy/doctor.json' },
  { id: 'orca-up', name: 'Orca up', group: 'orca', cmd: 'bin/dg-orca up', purpose: 'Keep-awake + desktop Orca + pair + hubs' },
  { id: 'orca-status', name: 'Orca operations', group: 'orca', cmd: 'bin/dg-orca status', purpose: 'Runtime + Claude/Codex terminal coordination + keep-awake', out: '/tmp/dg-busy/orca-status.json' },
  { id: 'orca-pair', name: 'Orca pair URL', group: 'orca', cmd: 'bin/dg-orca pair', purpose: 'Phone pairing orca:// URL + HTML', out: '/home/potter/orca-pair-code.txt' },
  { id: 'orca-site', name: 'Orca site tabs', group: 'orca', cmd: 'bin/dg-orca site', purpose: 'Open live site + control plane in Orca browser' },
  { id: 'webflow', name: 'Webflow workbench', group: 'session', cmd: 'bin/dg webflow status', purpose: 'Freeze/tabs/truth/playbooks for Designer+Custom Code', out: '/tmp/dg-busy/webflow-status.json', hot: true },
  { id: 'webflow-doctor', name: 'Webflow doctor', group: 'session', cmd: 'bin/dg-webflow doctor', purpose: 'CDP + live + Designer/custom-code readiness', out: '/tmp/dg-busy/webflow-doctor.json' },
  { id: 'webflow-audit', name: 'Webflow designer audit', group: 'session', cmd: 'node demigod-webflow-audit.mjs', purpose: 'CDP Designer canvas residual (contact/branding/CTAs); fails closed on empty canvas', out: 'HEAVY-DEMIGOD-AUDIT.json', hot: false },
  { id: 'webflow-change-selftest', name: 'Webflow change selftest', group: 'gates', cmd: 'node demigod-webflow-change-selftest.mjs', purpose: 'classifyChange + freeze.authorized paste/publish + robots/sitemap liveTruth' },
  { id: 'hygiene', name: 'Laptop hygiene', group: 'session', cmd: 'bin/dg hygiene --prune', purpose: 'Prune CDP tabs + load/mem check', out: '/tmp/dg-busy/laptop-hygiene.json', hot: true },
  { id: 'ponytail', name: 'Ponytail status', group: 'session', cmd: 'node demigod-ponytail.mjs status --json', purpose: 'Lazy-senior agent skill: Claude/Codex plugins + cursor rules + AGENTS wiring', out: '/tmp/dg-busy/ponytail-status.json' },
  { id: 'ponytail-check', name: 'Ponytail check', group: 'gates', cmd: 'node demigod-ponytail.mjs check --json', purpose: 'Fail closed if Ponytail not wired for agents', out: '/tmp/dg-busy/ponytail-status.json' },
  { id: 'review', name: 'Code review v2.3', group: 'session', cmd: 'bin/dg review', purpose: 'Default no-contract fail-on high (dogfood-safe); use --contract for intentional multi-file commits', out: '/tmp/dg-busy/review-latest.json', hot: true },
  { id: 'review-bug', name: 'Bug-hunt review', group: 'gates', cmd: 'bin/dg-review --bug --gates --no-contract', purpose: 'Stricter + targeted gates', out: '/tmp/dg-busy/review-latest.json' },
  { id: 'review-selftest', name: 'Review selftest', group: 'gates', cmd: 'node demigod-review-selftest.mjs', purpose: 'Fixture proof + multi-file contract + blast --send ban' },
  { id: 'ship-selftest', name: 'Ship selftest', group: 'gates', cmd: 'node demigod-ship-selftest.mjs', purpose: 'Freeze-safe ship CLI and release-bundle contract gate' },
  { id: 'ship-prepare-contract', name: 'Ship prepare contract', group: 'gates', cmd: 'node demigod-ship-prepare-contract.test.mjs', purpose: 'Locks bin/dg ship prepare steps (import-integrity, honesty, foot-smoke, observational truth)' },
  { id: 'ship', name: 'Ship orchestrator', group: 'ship', cmd: 'bin/dg ship status', purpose: 'Single ship path: status | prepare | cdn | paste | verify | run; mutators need freeze OFF + foot lock', out: '/tmp/dg-busy/ship-os.json', hot: true },
  { id: 'demand', name: 'Demand ops', group: 'session', cmd: 'bin/dg demand status', purpose: 'GTM queue + SENT-CONFIRMED + pilots', out: '/tmp/dg-busy/demand-status.json', hot: true },
  { id: 'demand-draft', name: 'Demand draft pack', group: 'session', cmd: 'bin/dg demand draft --name=T0', purpose: 'Copy-paste DM pack — never sends (drafts-only policy)', out: '/tmp/dg-busy/demand-draft.json' },
  { id: 'pilot', name: 'Pilot inbound', group: 'session', cmd: 'bin/dg pilot status', purpose: 'WIZ/warm inbound → PILOT-LOG / white-glove (warm ≠ pilot)', out: '/tmp/dg-busy/pilot-inbound.json' },
  { id: 'next-canon', name: 'Canonical NEXT', group: 'session', cmd: 'bin/dg next-canon', purpose: 'Single NEXT from truth evidence + freeze + demand', out: '/tmp/dg-busy/next.json' },
  { id: 'priority', name: 'Priority board', group: 'session', cmd: 'bin/dg priority', purpose: 'Dynamic top-of-dash priorities (demigod-priority-board)', out: '/tmp/dg-busy/priority-board.json' },
  { id: 'work-find', name: 'Work find', group: 'session', cmd: 'node demigod-work-find.mjs', purpose: 'Auto-discover unblocked agent work into work-queue', out: '/tmp/dg-busy/WORK-FOUND.md' },
  { id: 'outreach-draft-audit', name: 'Outreach draft audit', group: 'session', cmd: 'node demigod-useful-loop.mjs task outreach-draft-audit', purpose: 'Draft-only Events outreach readiness sample (queued/rejected; no send)', out: '/tmp/dg-busy/events-bot/outreach-draft-audit.json' },
  { id: 'wiz-a11y-audit', name: 'WIZ a11y audit', group: 'gates', cmd: 'node demigod-wiz-a11y-audit.mjs', purpose: 'Wizard accessibility audit (labels, focus, targets)' },
  { id: 'dogfood', name: 'Tool dogfood', group: 'session', cmd: 'bin/dg dogfood', purpose: 'Real executions, judgments, synthetic probes, and unused-tool telemetry', out: '/tmp/dg-busy/tool-dogfood-status.json' },
  { id: 'quality', name: 'Quality wave', group: 'gates', cmd: 'bin/dg-quality once', purpose: 'Rotated product and tooling quality checks', out: '/tmp/dg-busy/coord/quality-last.json' },
  { id: 'funnel-selftest', name: 'Funnel selftest', group: 'gates', cmd: 'node demigod-funnel-selftest.mjs', purpose: 'Lead-state, approval, contact, package, and collision integrity gate' },
  { id: 'funnel-loop', name: 'Funnel loop status', group: 'session', cmd: 'node demigod-funnel-loop.mjs status', purpose: 'Continuous local funnel+events hygiene loop status (dogfood label funnel-loop); stop via funnel-loop stop', out: '/tmp/dg-busy/funnel-loop/state.json' },
  { id: 'funnel-prune-terminal-drafts', name: 'Prune terminal funnel drafts', group: 'session', cmd: 'node demigod-funnel.mjs prune-terminal-drafts', purpose: 'Archive DQ/opt-out/quarantine no-contact drafts + orphan draft files; never sends', out: '/tmp/dg-busy/funnel/terminal-draft-prune-latest.json', hot: false },
  { id: 'funnel-status', name: 'Funnel status', group: 'session', cmd: 'bin/dg funnel status', purpose: 'Read-only lead funnel, package honesty, and event-health snapshot', hot: true },
  { id: 'funnel-collision-plan', name: 'Funnel duplicate cleanup plan', group: 'session', cmd: 'node demigod-funnel.mjs collision-plan', purpose: 'Review-only same-URL partner merge plan; use collision-plan --apply after review (evidence kept on survivor)', out: '/tmp/dg-busy/funnel/' },
  { id: 'funnel-collision-apply', name: 'Funnel collision apply', group: 'session', cmd: 'node demigod-funnel.mjs collision-plan --apply', purpose: 'Apply reviewed same-URL partner merges (evidence kept on survivor)', mutate: true, hot: false },
  { id: 'lead-sourcer', name: 'Lead sourcing preview', group: 'session', cmd: 'node demigod-lead-sourcer.mjs --type=talent', purpose: 'Preview evidence-backed talent submissions for private triage; never changes the CRM', out: '/tmp/dg-busy/lead-sourcer-latest.json', safe: true },
  { id: 'partner-sourcer', name: 'Partner sourcing preview', group: 'session', cmd: 'node demigod-lead-sourcer.mjs --type=partners --limit=10', purpose: 'Preview validated YC hiring/change evidence from RecruitAI export; never changes the CRM', out: '/tmp/dg-busy/lead-sourcer-latest.json', safe: true },
  { id: 'pipeline-status', name: 'Pipeline status', group: 'session', cmd: 'node demigod-lead-pipeline.mjs tick --stage=status', purpose: 'Read current lead funnel status without changing leads, packages, or board', safe: true },
  { id: 'pipeline-packages', name: 'Pipeline package refresh', group: 'session', cmd: 'node demigod-lead-pipeline.mjs tick --stage=packages', purpose: 'Refresh private approval/send/invite evidence without sending or changing leads/board', safe: true },
  { id: 'events-online', name: 'Events online status', group: 'session', cmd: 'bin/dg events status', purpose: 'Read-only Events app, tunnel, config, and store health (alias: bin/dg events-online)' },
  { id: 'dg-events-outbox', name: 'Events resource outbox', group: 'session', cmd: 'bin/dg-events-outbox status', purpose: 'Read-only invite and resource-draft readiness counts; never sends' },
  { id: 'dg-events-tick', name: 'Events draft tick', group: 'session', cmd: 'bin/dg-events-tick', purpose: 'Advance one Events Bot cycle in draft mode; never sends', mutate: true },
  { id: 'events-bot-selftest', name: 'Events Bot selftest', group: 'gates', cmd: 'env DEMIGOD_EVENTS_BOT_MOCK=1 node demigod-events-bot-selftest.mjs', purpose: 'Full deterministic Events Bot behavior gate' },
  { id: 'events-test', name: 'Events focused gate', group: 'gates', cmd: 'bin/dg events test fast', purpose: 'Focused EventsBot suites (policy, lifecycle, dashboard, outbox, native invite)' },
  { id: 'events-reconcile', name: 'Events preplan reconcile', group: 'session', cmd: 'bin/dg events-reconcile', purpose: 'Dry-run (default) clear premature native RSVP artifacts; apply only with --apply-production-foreground', out: '/tmp/dg-busy/events-bot/preplan-native-cleanup-proposal.json', hot: false },
  { id: 'startup-map-refresh', name: 'SF startup map data refresh', group: 'session', cmd: 'node demigod-startup-map-data.mjs', purpose: 'Rebuild public DEMIGOD-SF-STARTUP-MAP.json from open data (no outbound except public open-data fetches)', out: 'DEMIGOD-SF-STARTUP-MAP.json', hot: false },
  { id: 'startup-jobs-enrich', name: 'SF startup US-posted job counts', group: 'session', cmd: 'node demigod-startup-jobs-enrich.mjs', purpose: 'Enrich map companies with US-posted/Remote open-role counts from public Greenhouse/Lever/Ashby boards (point-in-time; compact write)', out: 'DEMIGOD-SF-STARTUP-MAP.json', hot: false },
  { id: 'directory-refresh', name: 'Directory refresh (orchestrator)', group: 'session', cmd: 'node demigod-directory-refresh.mjs', purpose: 'One command: HN cache → map+jobs → role-ledger poll → Pulse → static (network, several min)', out: 'DEMIGOD-SF-STARTUP-MAP.json', hot: false },
  { id: 'identity-review', name: 'Identity review candidates', group: 'session', cmd: 'node demigod-identity-review.mjs', purpose: 'Companies that may be one company listed twice. Cross-source dedupe keys only on website host, so a row with NO website can never merge — that blind spot is the candidate class. Reports evidence and merges NOTHING by default. Optional: --apply-websites [--write] collapse keyless shells when one sibling host exists (refuses if keyless has more openRoles). Distinct companies share names (Atlas/Alex/Candor) so name auto-merge is forbidden', out: 'stdout (--json)', hot: false, safe: true },
  { id: 'source-flakiness', name: 'Source flakiness rollup', group: 'session', cmd: 'node demigod-source-flakiness.mjs', purpose: 'Groups repeated transport failures by URL so a recurring flaky source is ONE tracked object with a stable fingerprint, not N scattered per-claim counters. Separates transport-flaky (quote intact, fetch failing) from a moved quote — opposite remedies, so they never share a fingerprint. Read-only over the sealed source history', out: 'stdout (--json)', hot: false, safe: true },
  { id: 'roles-feed', name: 'Public roles feed (newly observed)', group: 'session', cmd: 'node demigod-roles-feed.mjs --days 1', purpose: 'Machine-readable feed of roles newly first-observed on public ATS boards. Our firstObservedAt and the employer postedAt are separate fields and never conflated; postedAt is null unless Greenhouse-attributed. Reports observationSpanDays and flags a window wider than our own history (inception spike). No ranking, no intent claim', out: 'DEMIGOD-ROLES-FEED.json', hot: false, safe: true },
  { id: 'hiring-freshness', name: 'Hiring freshness (posting age vs corpus)', group: 'session', cmd: 'node demigod-hiring-freshness.mjs', purpose: 'Per-company posting-age profile ranked against the corpus. Only Greenhouse first_published counts as a posting date; every other role is reported UNDATED, never imputed, and stale share is over the dated denominator. States posting age, never intent (no "ghost job" claim)', out: 'stdout (--json for the full artifact)', hot: false, safe: true },
  { id: 'role-ledger', name: 'Role first-seen ledger', group: 'session', cmd: 'node demigod-role-ledger.mjs report --posted', purpose: 'Per-role open-lifetime over ATS boards (Greenhouse/Lever/Ashby + SmartRecruiters/Workable/Recruitee/Personio via demigod-ats-providers.mjs); observedOpenDays uses OUR firstSeen (never board date); close only on successful-fetch-absence. report --posted = Greenhouse posting-age (attributed, evergreen-flagged)', out: 'DEMIGOD-ROLE-LEDGER.json', hot: false },
  { id: 'hn-hiring', name: 'HN Who-is-hiring source', group: 'session', cmd: 'node demigod-hn-hiring.mjs', purpose: 'Mine HN monthly "Ask HN: Who is hiring?" → SF-only companies, mega-corp exclusion (HN-public license)', out: 'DEMIGOD-HN-HIRING.json', hot: false },
  { id: 'hiring-pulse', name: 'SF Hiring Pulse (data-media)', group: 'session', cmd: 'node demigod-hiring-pulse.mjs', purpose: 'Shareable Pulse from the directory: computed batch-curve finding, AI-share, top hirers, honest CTA (fail-capable)', out: 'hiring-pulse.html', hot: false },
  { id: 'directory-static', name: 'Crawlable static directory', group: 'session', cmd: 'node demigod-directory-static.mjs', purpose: 'Static /startups HTML with real company/job content + JobPosting/ItemList JSON-LD (verified-only, escapes)', out: 'sf-startups-static.html', hot: false },
  { id: 'honesty-audit', name: 'Live honesty audit', group: 'gates', cmd: 'node demigod-live-honesty-audit.mjs', purpose: 'Fetch live homepage as Googlebot; flag dishonest crawler-visible copy and retired Webflow animation payloads', hot: false },
  { id: 'conversion-audit', name: 'Conversion-path audit (rendered)', group: 'gates', cmd: 'node demigod-conversion-audit.mjs', purpose: 'CDP rendered-DOM funnel walk: per-page hero/CTA/bodyChars/dishonesty/glitches (measures what users get, not served HTML)', hot: false },
  { id: 'events-app-policy', name: 'Events app policy selftest', group: 'gates', cmd: 'node --test demigod-events-app-policy-selftest.mjs', purpose: 'Events API privacy, authorization, and persistence policy gate' },
  { id: 'events-dashboard-test', name: 'Events dashboard selftest', group: 'gates', cmd: 'node --test demigod-dashboard-events-native-invite.test.mjs', purpose: 'Events operator-card truth, readiness, and action contract' },
  { id: 'invite-drain', name: 'Events invite drain', group: 'session', cmd: 'node demigod-events-invite-drain.mjs', purpose: 'Absorb real invite URLs and purge stale, fixture, or orphan outbox files; never invent', out: '/tmp/dg-busy/events-bot/invite-drain-latest.json', mutate: true },
  { id: 'favicon-ship', name: 'Favicon ship', group: 'site', cmd: 'node demigod-favicon-ship.mjs', purpose: 'Write demigod favicon links into head-minimal', out: null, hot: false },
  { id: 'blog-assets', name: 'Blog assets wire', group: 'site', cmd: 'node demigod-blog-assets-gen.mjs', purpose: 'Wire blog hero CDN URLs from upload receipt', out: null, hot: false },
  { id: 'unify', name: 'Unify snapshot', group: 'session', cmd: 'bin/dg unify', purpose: 'Deep snapshot (orient is the short path)', out: '/tmp/dg-busy/unify.json' },
  { id: 'poison-green', name: 'Poison false-green selftest', group: 'gates', cmd: 'node demigod-poison-green-selftest.mjs', purpose: 'Tamper latest-truth → green must flip off → restore', out: '/tmp/dg-busy/evidence/' },
  { id: 'ledger', name: 'Ledger delta', group: 'gates', cmd: 'node demigod-version-ledger.mjs delta', purpose: 'Dashboard-runnable version delta', out: '/tmp/dg-busy/version-ledger-tail.json' },
  { id: 'evidence-producers', name: 'Evidence producers', group: 'gates', cmd: 'node demigod-evidence.mjs producers truth,review,demand,smoke', purpose: 'Check required evidence producers', out: '/tmp/dg-busy/evidence/' },
  { id: 'tools-os-selftest', name: 'Tools OS selftest', group: 'gates', cmd: 'node demigod-tools-os-selftest.mjs', purpose: 'Dashboard, registry, and job wiring selftest' },
  { id: 'grok-ask-selftest', name: 'Grok-ask transport selftest', group: 'gates', cmd: 'node demigod-grok-ask-selftest.mjs', purpose: 'bin/grok-ask context + Broken-pipe retry + 402 circuit breaker (verify:all + ship-gate)' },
  { id: 'wiz-ownership', name: 'WIZ ownership selftest', group: 'forms', cmd: 'node demigod-wiz-ownership-selftest.mjs', purpose: 'Source WIZ_CFG ownership (90day, submit, no SLA)', out: '/tmp/dg-busy/wiz-ownership.json' },
  { id: 'ship-checklist', name: 'Ship checklist', group: 'ship', cmd: 'node demigod-ship-checklist.mjs --json', purpose: 'Freeze-aware local ship readiness; never publishes', out: '/tmp/dg-busy/ship-checklist.json', hot: false },
  { id: 'ship-prepare', name: 'Ship prepare', group: 'ship', cmd: 'bin/dg ship prepare', purpose: 'Run ship gates without publishing', out: '/tmp/dg-busy/ship-prepare.json' },
  { id: 'ship-facts', name: 'Ship facts only', group: 'ship', cmd: 'bin/dg ship status --facts', purpose: 'disk/live/stage/freeze only — no agent NEXT', out: '/tmp/dg-busy/ship-latest.json' },
  { id: 'handoff', name: 'Handoff structured', group: 'session', cmd: 'bin/dg handoff --from agent --done "…" --next "…"', purpose: 'Structured handoff wall note' },
  { id: 'approve-sub', name: 'Approve submission', group: 'session', cmd: 'node demigod-submissions-approve.mjs --list', purpose: 'Mint sample board card via mintBoardEntry' },
  { id: 'inbox', name: 'Submissions inbox', group: 'session', cmd: 'bin/dg inbox', purpose: 'Redacted startup/engineer/partner queue', out: '/tmp/dg-busy/submissions-inbox-latest.json', hot: true },
  { id: 'submissions-lib', name: 'Submissions lib selftest', group: 'gates', cmd: 'node --test demigod-submissions-lib.test.mjs', purpose: 'Public status, PII scrub, webhook parse, board write guards (verify:all)' },
  { id: 'webhook-auth', name: 'Webhook auth selftest', group: 'gates', cmd: 'node --test demigod-webhook-auth.test.mjs', purpose: 'Webflow webhook secret readiness + signature verify (shared by setup/submissions/ship checklist)' },
  { id: 'submissions-e2e', name: 'Submissions e2e gate', group: 'gates', cmd: 'node demigod-submissions-e2e.mjs', purpose: 'Submissions end-to-end honesty gate (fixture isolation; no real outbound)', hot: false },
  { id: 'match-review', name: 'Match review queue', group: 'session', cmd: 'bin/dg matches', purpose: 'Pair ledger review queue (not public board)', out: '/tmp/dg-busy/match-review-latest.json' },
  { id: 'pairs', name: 'Pair ledger CLI', group: 'session', cmd: 'node demigod-pairs-lib.mjs list', purpose: 'Canonical DEMIGOD-PAIRS propose/review/consent', out: 'DEMIGOD-PAIRS.json' },
  { id: 'referrals', name: 'Referral rewards', group: 'session', cmd: 'bin/dg referrals status', purpose: 'Redacted unique-link → retained hire → payout/credit evidence ledger; never moves money. Mint: bin/dg referrals mint-talent --name --email --text · pack · approve · sync · hire → retain → settle', out: '/tmp/dg-busy/referrals-status.json' },
  { id: 'auto-propose', name: 'Auto-propose pairs', group: 'session', cmd: 'node demigod-auto-propose.mjs --json', purpose: 'Score roles×cands → DEMIGOD-PAIRS (min score 72)', out: '/tmp/dg-busy/auto-propose-latest.json' },
  { id: 'intro-draft', name: 'Intro draft', group: 'session', cmd: 'node demigod-intro-draft.mjs <sub-id|pairId>', purpose: 'Draft intro (gate: approved|mutual_yes; --force audits)', out: '/tmp/dg-busy/intros/' },
  { id: 'sprint-selftest', name: 'Sprint selftest', group: 'gates', cmd: 'npm run demigod:sprint-selftest', purpose: 'Pairs + intro gate + board audit presence' },
  { id: 'brief', name: 'Agent brief', group: 'session', cmd: 'curl -sS http://127.0.0.1:9878/api/agent-brief', purpose: 'Markdown brief for models', out: '/tmp/dg-busy/AGENT-BRIEF.md' },
  { id: 'start', name: 'Session start', group: 'session', cmd: 'bin/dg-start', purpose: 'Env + chrome + workspace hygiene' },
  { id: 'preflight', name: 'Preflight', group: 'session', cmd: 'node demigod-preflight.mjs', purpose: 'Before foot edits', out: '/tmp/dg-busy/preflight-latest.json' },

  // Gates
  { id: 'verify-source', name: 'Verify source', group: 'gates', cmd: 'npm run demigod:verify:source', purpose: 'Foot/head/footer source gate', out: 'DEMIGOD-VERIFY-SOURCE.json' },
  { id: 'board-honesty', name: 'Board honesty', group: 'gates', cmd: 'node demigod-verify-board-honesty.mjs', purpose: '≤3 seed roles, real counts honest', out: 'DEMIGOD-BOARD-HONESTY.json' },
  { id: 'import-integrity', name: 'Import integrity', group: 'gates', cmd: 'node demigod-import-integrity.mjs', purpose: 'Clone-breaker + export contracts; also verify:source / ship prepare / .githooks/pre-commit (bin/dg-hooks install)' },
  { id: 'import-integrity-poison', name: 'Import integrity poison', group: 'gates', cmd: 'node --test demigod-import-integrity.test.mjs', purpose: 'Verify-the-verifier: PASS real tree + FAIL gutted exports / missing / untracked demigod-*.mjs' },
  { id: 'dg-hooks', name: 'Git hooks', group: 'gates', cmd: 'bin/dg-hooks status', purpose: 'Tracked pre-commit (import-integrity); install: bin/dg-hooks install' },

  { id: 'foot-smoke', name: 'Foot smoke', group: 'gates', cmd: 'node demigod-foot-smoke.mjs', purpose: 'Local foot JS smoke' },

  // Ship (mutate — respect freeze)
  { id: 'ship-status', name: 'Ship status', group: 'ship', cmd: 'node demigod-ship-status.mjs', purpose: 'CDN/ship snapshot', out: '/tmp/dg-busy/ship-status.json' },
  { id: 'live-attest', name: 'Live release attest', group: 'ship', cmd: 'bin/dg live-attest', purpose: 'Prove live foot CDN body matches disk version (markers+len)', out: '/tmp/dg-busy/live-attest.json' },
  { id: 'live-lib-test', name: 'Live lib unit tests', group: 'gates', cmd: 'node --test demigod-live-lib.test.mjs', purpose: 'Unit tests for live HTML/a11y helpers (dedupe findings etc.)', hot: false },
  { id: 'ship-receipt', name: 'Ship receipt', group: 'ship', cmd: 'bin/dg ship-receipt latest', purpose: 'Immutable ship attempt receipt (write|list|latest)', out: '/tmp/dg-busy/ship-receipt-latest.json' },
  { id: 'foot-cdn', name: 'Site bundle CDN publish', group: 'ship', cmd: 'node demigod-foot-cdn-publish.mjs', purpose: 'Publish commit-pinned foot, map, and head assets + manifests', mutate: true },
  { id: 'cm6-check', name: 'CM6 structural check', group: 'ship', cmd: 'node demigod-cm6-paste-publish.mjs --check-structural', purpose: 'Validate head/footer editor separation without requiring a released CDN manifest (--check-only alias ok)', mutate: false },
  { id: 'cm6-selftest', name: 'CM6 paste selftest', group: 'gates', cmd: 'node demigod-cm6-paste-publish.mjs --selftest', purpose: 'CM6 paste/publish contract selftest (save debounce, reload gates, transport identity); no Webflow mutate', mutate: false, hot: false },
  { id: 'cm6-paste', name: 'CM6 paste publish', group: 'ship', cmd: 'node demigod-cm6-paste-publish.mjs', purpose: 'Paste canonical head + footer with split assertions, then publish', mutate: true },
  { id: 'tab-prune', name: 'CDP tab prune', group: 'ship', cmd: 'node demigod-cdp-tab-prune.mjs', purpose: 'Close excess Chrome tabs' },

  // Inbox / multi-agent
  { id: 'plan-inbox', name: 'Plan inbox', group: 'agents', cmd: 'node demigod-plan-inbox.mjs --useful', purpose: 'Unread agent plans', out: '/tmp/dg-busy/plan-inbox-latest.json' },
  { id: 'tools-registry', name: 'Tools registry', group: 'agents', cmd: 'node demigod-tools-registry.mjs --md', purpose: 'This catalog' },
  { id: 'dash', name: 'Dashboard', group: 'agents', cmd: 'bin/dg-dash', purpose: 'Agent dashboard UI :9878' },

  // Forms / WIZ
  { id: 'wiz-playtest', name: 'WIZ CDP playtest', group: 'forms', cmd: 'node demigod-wiz-cdp-playtest.mjs --local', purpose: 'Local WIZ stepper playtest' },
  { id: 'submit-fixture', name: 'Submit fixture', group: 'forms', cmd: 'node demigod-submit-fixture.mjs', purpose: 'Webflow form submit mock harness' },
];

export function validateTools(tools = TOOLS) {
  const errors = [];
  const ids = new Set();
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

export function buildRegistry({ group = null, hotOnly = false } = {}) {
  const at = new Date().toISOString();
  const validation = validateTools();
  if (!validation.ok) throw new Error(`invalid tools registry: ${validation.errors.join('; ')}`);
  let tools = TOOLS.slice();
  if (group) tools = tools.filter((t) => t.group === group);
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
    hotOnly,
    validation,
    sessionStart: ['bin/dg', 'curl -sS http://127.0.0.1:9878/api/orient'],
    note: 'Bare bin/dg runs orient. API /api/tools defaults to the primary catalog; ?all=1 exposes cold tools read-only. Mutate only when freeze OFF.',
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
