#!/usr/bin/env node
/**
 * demigod-ops-os — Autonomy operating system for Demigod
 *
 * Single spine: demand → submit → review → match → intro → hire → invoice/pay → support
 * + website/agent scaffolding that feeds the funnel.
 *
 *   node demigod-ops-os.mjs status [--json]
 *   node demigod-ops-os.mjs roadmap
 *   node demigod-ops-os.mjs next
 *   node demigod-ops-os.mjs tick   # safe autonomous steps only (no auto-DM, no fake pay)
 *
 * Writes: /tmp/dg-busy/ops-os.json
 * Docs: docs/DEMIGOD-AUTONOMY-OS-ROADMAP.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { getServiceStatus } from './demigod-future-services.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const OUT = path.join(BUSY, 'ops-os.json');

function readJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function count(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

function stage(id, title, status, detail, nextCmd, blockedBy = [], autonomy = 'human') {
  return {
    id,
    title,
    status, // ready | partial | stub | blocked | live
    detail,
    nextCmd,
    blockedBy,
    autonomy, // autonomous | assisted | human | stub
  };
}

function build() {
  fs.mkdirSync(BUSY, { recursive: true });
  const services = getServiceStatus();
  const ship = readJson(path.join(BUSY, 'ship-status.json'), {});
  const demand = readJson(path.join(BUSY, 'demand-status.json'), {});
  const pilotIn = readJson(path.join(BUSY, 'pilot-inbound.json'), {});
  const matchRev = readJson(path.join(BUSY, 'match-review-latest.json'), {});
  const quality = readJson(path.join(BUSY, 'coord', 'quality-last.json'), {});
  const qualityBl = readJson(path.join(BUSY, 'coord', 'quality-backlog.json'), {});
  const submissions = readJson(path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json'), { items: [] });
  const pilots = readJson(path.join(ROOT, 'DEMIGOD-PILOTS.json'), { pilots: [] });
  const board = readJson(path.join(ROOT, 'demigod-board.json'), readJson(path.join(ROOT, 'DEMIGOD-BOARD.json'), {}));
  const pairsPath = path.join(BUSY, 'matches.json');
  const pairsAlt = path.join(ROOT, 'DEMIGOD-MATCHES.json');
  const matches = readJson(pairsPath, readJson(pairsAlt, { pairs: [], matches: [] }));
  const pairN = count(matches.pairs) || count(matches.matches) || matchRev?.stats?.pairs || 0;
  const subItems = submissions.items || [];
  const startupSubs = subItems.filter((i) => /startup|hire|founder/i.test(i.form || i.kind || ''));
  const talentSubs = subItems.filter((i) => /engineer|talent|seeker|candidate/i.test(i.form || i.kind || ''));
  const openPilots = (pilots.pilots || pilots.items || []).filter((p) => !/closed|churned|hired/i.test(p.status || ''));

  let footVer = '?';
  try {
    const foot = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    footVer = (foot.match(/__dgFootVer='(\d+)'/) || [])[1] || '?';
  } catch {
    /* */
  }

  const stripeOn = !!services.stripe?.enabled;
  const atlasDone = services.stripe?.atlas === true;
  const twilioOn = !!services.twilio?.enabled;

  /** Full funnel stages — autonomy OS */
  const stages = [
    stage(
      'website',
      'Website conversion (WIZ · honesty · ship)',
      ship?.shipped ? 'live' : 'partial',
      `foot v${footVer} · shipped=${ship?.shipped === true} · stage=${ship?.stage || '?'}`,
      ship?.shipped ? 'bin/dg-quality once --context=ship' : 'bin/dg ship prepare && bin/dg ship run',
      [],
      'assisted',
    ),
    stage(
      'demand_founder',
      'Demand: founders / hiring briefs',
      demand?.queue || startupSubs.length ? 'partial' : 'stub',
      `startup submissions=${startupSubs.length} · demand pending=${demand?.queue?.pending ?? demand?.pending ?? '?'} · warm inbound tooling exists (no auto-DM)`,
      'bin/dg demand status · manual warm SF outreach · site WIZ hire path',
      ['no auto-DM policy'],
      'assisted',
    ),
    stage(
      'demand_talent',
      'Demand: talent / engineer profiles',
      talentSubs.length ? 'partial' : 'stub',
      `talent submissions=${talentSubs.length} · free forever path on site`,
      'site WIZ join path · honest free-for-talent copy · optional GTM content',
      [],
      'assisted',
    ),
    stage(
      'ingest',
      'Form capture → submissions inbox',
      subItems.length ? 'partial' : 'stub',
      `inbox items=${subItems.length} · Webflow forms → DEMIGOD-SUBMISSIONS-INBOX.json · triage tools exist`,
      'node demigod-submissions-inbox.mjs · node demigod-submissions-ingest.mjs',
      subItems.length ? [] : ['need real Webflow form posts or fixtures'],
      'assisted',
    ),
    stage(
      'triage',
      'Human/agent triage (90d · quality)',
      'partial',
      'triage-90d + approve tools; quality loop + review gates',
      'node demigod-submissions-triage-90d.mjs · bin/dg-quality once',
      [],
      'assisted',
    ),
    stage(
      'match',
      'Matching engine (score · pairs · mutual yes)',
      pairN > 0 ? 'partial' : 'stub',
      `pairs≈${pairN} · MATCH_STATES through paid · suggestMatches/decideMatch live on disk`,
      'bin/dg matches · node demigod-matching-engine.mjs suggest',
      [],
      'assisted',
    ),
    stage(
      'intro',
      'Mutual approve → warm intro email',
      'partial',
      'intro draft generators exist; no bulk send; potter@ is channel',
      'node demigod-intro-draft.mjs · bin/dg-intro',
      ['human approve both sides'],
      'human',
    ),
    stage(
      'pilot',
      'White-glove pilot tracking',
      openPilots.length ? 'partial' : 'stub',
      `open pilots=${openPilots.length} · pilot-os statuses new→hired`,
      'bin/dg-pilot-os list · node demigod-submit-to-pilot.mjs --latest-startup',
      [],
      'assisted',
    ),
    stage(
      'hire_outcome',
      'Hire outcome logged',
      'stub',
      'States exist (piloted/receipted); need consistent outcome logging from intros',
      'node demigod-matching-engine.mjs (logOutcome) · pilot-os set hired',
      [],
      'human',
    ),
    stage(
      'invoice',
      'Invoice 10% first-year cash',
      stripeOn ? 'ready' : 'stub',
      stripeOn
        ? 'Stripe enabled'
        : 'Stripe PENDING — manual invoice; draft-first Invoicing planned',
      stripeOn ? 'implement stripe adapter' : 'node demigod-funnel.mjs invoice  # report-only readiness; no invoice mutation',
      stripeOn ? [] : ['stripe not provisioned'],
      stripeOn ? 'assisted' : 'stub',
    ),
    stage(
      'payment',
      'Payment collection',
      stripeOn ? 'ready' : 'stub',
      stripeOn ? 'Stripe Invoicing' : 'Manual invoice/payment evidence until Stripe live',
      'test restricted keys + verified webhook → demigod-future-services stripe.enabled',
      stripeOn ? [] : ['stripe'],
      'stub',
    ),
    stage(
      'sms',
      'SMS follow-up (Twilio)',
      twilioOn ? 'ready' : 'stub',
      twilioOn ? 'Twilio live' : 'SMS pending — email only; sms-handler stub ready',
      'demigod-sms-handler.mjs + future-services twilio flag',
      twilioOn ? [] : ['twilio'],
      'stub',
    ),
    stage(
      'support',
      'Support / potter@ ops',
      'partial',
      'potter@ is canonical public contact; abandon-email mailto; no helpdesk yet',
      'mailbox triage · optional gmail MCP · FAQ pages live',
      [],
      'human',
    ),
    stage(
      'agents',
      'Multi-agent scaffolding',
      'live',
      'coord lanes · quality loop · anti-bloat · ship cadence · workflow map',
      'bin/dg-agent-coord status · bin/dg-quality once',
      [],
      'autonomous',
    ),
  ];

  const blocked = stages.filter((s) => s.status === 'blocked' || s.status === 'stub');
  const ready = stages.filter((s) => s.status === 'live' || s.status === 'ready' || s.status === 'partial');

  // Priority next actions (autonomous-safe first)
  const next = [];
  if ((qualityBl?.open || 0) > 0) {
    next.push({
      pri: 0,
      action: 'Clear quality-backlog P0/P1 before new features',
      cmd: 'bin/dg-quality backlog && bin/dg-quality once',
    });
  }
  if (ship?.shipped !== true && ship?.facts?.diskVer && ship?.facts?.liveVer && String(ship.facts.diskVer) !== String(ship.facts.liveVer).replace(/^v/, '')) {
    next.push({ pri: 1, action: 'Ship website disk→live', cmd: 'bin/dg ship prepare && bin/dg ship run' });
  }
  if (subItems.length === 0) {
    next.push({
      pri: 2,
      action: 'Generate real dual-sided demand (founders + talent) into WIZ / inbox',
      cmd: 'site CTAs healthy + warm outreach (no auto-DM) + optional submit fixtures for pipeline tests',
    });
  } else {
    next.push({
      pri: 2,
      action: 'Triage submissions → pilot drafts → match suggestions',
      cmd: 'node demigod-submissions-inbox.mjs; node demigod-submit-to-pilot.mjs --latest-startup; bin/dg matches',
    });
  }
  if (!stripeOn) {
    next.push({
      pri: 3,
      action: atlasDone ? 'Prepare draft-only fee invoice path (10% on verified hire)' : 'Form Demigod Delaware C corp with Stripe Atlas',
      cmd: atlasDone ? 'build/test idempotent draft Invoice adapter; keep service disabled' : 'Stripe Atlas application; payment adapter remains separately disabled',
    });
  }
  next.push({
    pri: 4,
    action: 'Keep mutual-approve intro quality high (human gate stays)',
    cmd: 'bin/dg-intro · demigod-intro-draft.mjs',
  });

  next.sort((a, b) => a.pri - b.pri);

  const roadmap = {
    now: [
      'Website conversion + honesty + ship cadence (live)',
      'Submissions inbox + pilot-os + matching engine (partial)',
      'Agent autonomy: coord, quality, anti-bloat, ship (live scaffolding)',
      'Email (potter@) as commercial + support channel',
    ],
    tomorrow_stripe: [
      'Stripe Atlas → Delaware C corporation, founder equity, EIN, 83(b), registered agent',
      'Restricted test keys + verified webhooks before FUTURE_SERVICES.stripe.enabled',
      'Draft Invoicing for 10% first-year cash after verified hire',
      'Explicit review gate before finalizing/sending',
      'Webhook: invoice.paid → match state paid + receipt ledger',
      'Keep talent free forever (no candidate charges)',
    ],
    soon: [
      'Reliable Webflow form → inbox webhook (or Make/Zapier bridge)',
      'Agent tick: ingest → triage 90d → suggestMatches dry-run → human queue',
      'Mutual yes protocol (email magic links or signed tokens)',
      'Intro send with templates + logging (still no spam blasts)',
      'Pilotdesk lite: tag potter@ threads by pilot id',
    ],
    later: [
      'Twilio SMS for high-signal follow-ups only',
      'Self-serve founder status page (pilot phase)',
      'Ledger + tax exports',
      'Multi-matcher collaboration UI',
      'Near-full autonomy with human audit on intros + invoices',
    ],
  };

  const snap = {
    schema: 'demigod.ops-os/1',
    at: new Date().toISOString(),
    northStar:
      'More founders submit hire briefs + more talent submit profiles → high-quality mutual matches → hire → Demigod paid 10%. Website + ops + agents exist to serve that loop.',
    principles: [
      'No auto-DM',
      'Both sides approve before identity moves',
      'Talent free forever',
      '10% first-year cash only on hire',
      'Pending honesty for Stripe/Twilio until live',
      'Human audit on intro + invoice until proven',
      'Ship website wins; do not hoard disk versions',
      'Quality loop before feature thrash',
      'Delete code/copy/features/pages when wrong or harmful — removal is a first-class product move',
      'Add pages, form copy, Notes, SEO, tools when they raise hire/talent submit rate or match quality',
    ],
    services: {
      stripe: services.stripe,
      twilio: services.twilio,
      microsoftForStartups: services.microsoftForStartups,
    },
    funnel: {
      startupSubmissions: startupSubs.length,
      talentSubmissions: talentSubs.length,
      submissionsTotal: subItems.length,
      matchPairs: pairN,
      openPilots: openPilots.length,
      shipShipped: ship?.shipped === true,
      footVer: footVer,
      qualityOpen: qualityBl?.open ?? 0,
    },
    stages,
    next,
    roadmap,
    autonomyScore: {
      // rough 0-100: how much of funnel can run without human
      score: Math.round(
        (stages.filter((s) => s.autonomy === 'autonomous' || s.autonomy === 'assisted').length / stages.length) * 55 +
          (stripeOn ? 15 : 0) +
          (twilioOn ? 10 : 0) +
          (subItems.length > 0 ? 10 : 0) +
          (pairN > 0 ? 10 : 0),
      ),
      note: 'Assisted ≠ unattended. Target ~90 when Stripe+ingest+mutual-yes links are live and intros remain human-audited.',
    },
    cmds: {
      status: 'bin/dg-ops-os status',
      next: 'bin/dg-ops-os next',
      tick: 'bin/dg-ops-os tick',
      roadmap: 'bin/dg-ops-os roadmap',
      json: 'bin/dg-ops-os status --json',
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(snap, null, 2) + '\n');
  return snap;
}

function printStatus(snap) {
  console.log(`# Demigod Ops OS  autonomy≈${snap.autonomyScore.score}/100`);
  console.log(`at: ${snap.at}`);
  console.log(`north: ${snap.northStar}`);
  console.log('');
  console.log('## Funnel counts');
  const f = snap.funnel;
  console.log(
    `  founders_in=${f.startupSubmissions} talent_in=${f.talentSubmissions} pairs=${f.matchPairs} pilots=${f.openPilots} foot=v${f.footVer} shipped=${f.shipShipped} quality_open=${f.qualityOpen}`,
  );
  console.log('');
  console.log('## Stages');
  for (const s of snap.stages) {
    const mark = s.status === 'live' || s.status === 'ready' ? '✓' : s.status === 'partial' ? '·' : s.status === 'stub' ? '○' : '✗';
    console.log(`  ${mark} [${s.status}/${s.autonomy}] ${s.id} — ${s.detail}`);
    console.log(`      next: ${s.nextCmd}`);
  }
  console.log('');
  console.log('## Next (priority)');
  for (const n of snap.next.slice(0, 6)) {
    console.log(`  P${n.pri} ${n.action}`);
    console.log(`     $ ${n.cmd}`);
  }
  console.log('');
  console.log(`Services: stripe=${snap.services.stripe?.enabled ? 'ON' : 'PENDING'} twilio=${snap.services.twilio?.enabled ? 'ON' : 'PENDING'}`);
  console.log(`JSON: ${OUT}`);
}

function printRoadmap(snap) {
  console.log('# Autonomy roadmap\n');
  for (const [k, items] of Object.entries(snap.roadmap)) {
    console.log(`## ${k}`);
    for (const i of items) console.log(`  - ${i}`);
    console.log('');
  }
}

function tick(snap) {
  // Safe autonomous steps only
  const results = [];
  const run = (label, cmd, args = []) => {
    const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
    results.push({
      label,
      ok: r.status === 0,
      status: r.status,
      tail: ((r.stdout || '') + (r.stderr || '')).slice(-400),
    });
  };
  run('ops-os-rebuild', process.execPath, [path.join(ROOT, 'demigod-ops-os.mjs'), 'status', '--json']);
  run('ship-status', path.join(ROOT, 'bin/dg'), ['ship', 'status']);
  run('quality-status', path.join(ROOT, 'bin/dg-quality'), ['status']);
  // dry match suggest if engine CLI supports
  run('matches-list', path.join(ROOT, 'bin/dg'), ['matches']);
  const out = {
    at: new Date().toISOString(),
    ok: results.every((r) => r.ok || r.label === 'matches-list'),
    results,
    note: 'tick is observational + queue health only — no auto-DM, no Stripe charge, no unsolicited intro',
  };
  fs.writeFileSync(path.join(BUSY, 'ops-os-tick.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
  return out;
}

const args = process.argv.slice(2);
const cmd = args[0] || 'status';
const OPS_CMDS = new Set(['status', 'roadmap', 'next', 'tick', 'help', '-h', '--help']);
const OPS_FLAGS = new Set(['--json']);
const unknownArg = args.slice(cmd === args[0] ? 1 : 0).find((a) => !OPS_FLAGS.has(a));
if (args[0] && args[0].startsWith('-') && !OPS_FLAGS.has(args[0]) && !OPS_CMDS.has(args[0])) {
  console.error(`ops-os: unknown argument ${args[0]} — try: bin/dg-ops-os status|roadmap|next|tick [--json]`);
  process.exit(2);
}
if (!OPS_CMDS.has(cmd) && !OPS_FLAGS.has(cmd)) {
  console.error(`ops-os: unknown command ${cmd} — try: bin/dg-ops-os status|roadmap|next|tick [--json]`);
  process.exit(2);
}
if (unknownArg && !OPS_CMDS.has(unknownArg)) {
  console.error(`ops-os: unknown argument ${unknownArg} — try: bin/dg-ops-os ${cmd} [--json]`);
  process.exit(2);
}
if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
  console.log(`demigod-ops-os — autonomy OS status spine

Usage: bin/dg-ops-os status|roadmap|next|tick [--json]`);
  process.exit(0);
}
const json = args.includes('--json');

if (cmd === 'roadmap') {
  const snap = build();
  if (json) console.log(JSON.stringify(snap.roadmap, null, 2));
  else printRoadmap(snap);
  process.exit(0);
}

if (cmd === 'next') {
  const snap = build();
  if (json) console.log(JSON.stringify(snap.next, null, 2));
  else {
    for (const n of snap.next) {
      console.log(`P${n.pri} ${n.action}\n  ${n.cmd}`);
    }
  }
  process.exit(0);
}

if (cmd === 'tick') {
  const snap = build();
  tick(snap);
  process.exit(0);
}

// status default
const snap = build();
if (json) console.log(JSON.stringify(snap, null, 2));
else printStatus(snap);
