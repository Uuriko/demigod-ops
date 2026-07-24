#!/usr/bin/env node
/**
 * demigod-idea-engine — continuous product/gates ideation from live evidence.
 *
 *   node demigod-idea-engine.mjs              # write ideas + print top
 *   node demigod-idea-engine.mjs --json
 *   node demigod-idea-engine.mjs --promote    # push top open ideas into work-queue
 *
 * Store:
 *   /tmp/dg-busy/mind/ideas.jsonl     append-only idea log
 *   /tmp/dg-busy/mind/ideas-latest.md human board
 *   /tmp/dg-busy/mind/ambition.json   ranked "what Grok wants" snapshot
 *
 * Never invents guests/pilots/sends. Ideas are proposals; promote only to task ids
 * the useful-loop already knows (or kind=explore for notes).
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import crypto from 'crypto';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const MIND = path.join(BUSY, 'mind');
const IDEAS = path.join(MIND, 'ideas.jsonl');
const LATEST = path.join(MIND, 'ideas-latest.md');
const AMBITION = path.join(MIND, 'ambition.json');
const LOCK = path.join(MIND, 'idea-engine.lock');
const QUEUE = path.join(BUSY, 'work-queue.jsonl');
const WANT = path.join(ROOT, 'DEMIGOD-GROK-WANT.md');

function readJson(p, fb = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function ensure() {
  fs.mkdirSync(MIND, { recursive: true });
}

function evidence() {
  const truth = readJson(path.join(BUSY, 'truth.json'), {});
  const freeze = readJson(path.join(BUSY, 'publish-freeze.json'), {});
  const api = readJson(path.join(ROOT, 'DEMIGOD-EVENTS-API.json'), {});
  const eventsSt = readJson(path.join(BUSY, 'events-online', 'status.json'), {});
  const store = readJson(path.join(ROOT, 'DEMIGOD-EVENTS.json'), {});
  const demand = readJson(path.join(BUSY, 'demand-status.json'), {});
  const drain = readJson(path.join(BUSY, 'events-bot', 'invite-drain-latest.json'), {});
  const cdnDrift = readJson(path.join(BUSY, 'events-bot', 'cdn-drift-receipt.json'), {});
  const workFound = (() => {
    try {
      return fs.readFileSync(path.join(BUSY, 'WORK-FOUND.md'), 'utf8').slice(0, 2000);
    } catch {
      return '';
    }
  })();
  let cdn = null;
  try {
    const r = spawnSync(
      'curl',
      ['-sS', '-m', '6', 'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@main/events-api-latest.json'],
      { encoding: 'utf8', timeout: 10000 },
    );
    cdn = JSON.parse(r.stdout || 'null');
  } catch {
    /* */
  }
  return {
    at: new Date().toISOString(),
    truthPass: !!truth?.pass || truth?.fullyShipped === true,
    freezeOn: !!(freeze?.frozen || freeze?.on),
    footVer: truth?.manifest?.version || truth?.disk?.ver || null,
    eventsPublic: eventsSt?.public ?? null,
    needHeal: eventsSt?.needHeal ?? null,
    nativeRsvp: eventsSt?.nativeRsvpRoutes ?? null,
    apiBase: api?.apiBase || eventsSt?.apiBase || null,
    cdnApiBase: cdn?.apiBase || cdnDrift?.cdnApiBase || null,
    cdnDrift: !!(cdn?.apiBase && api?.apiBase && cdn.apiBase !== api.apiBase) || !!cdnDrift?.drift,
    activeEvent: store?.activeEvent
      ? {
          id: store.activeEvent.id,
          stage: store.activeEvent.stage,
          title: store.activeEvent.title,
          hasInvite: !!(store.activeEvent.inviteUrl || store.activeEvent.published_url),
        }
      : null,
    rsvpCount: Array.isArray(store?.rsvps) ? store.rsvps.length : 0,
    outreachQueued: (store?.outreach || []).filter((o) => o?.status === 'queued' || o?.status === 'drafted')
      .length,
    needsUrl: drain?.needsUrl ?? null,
    demandPending: demand?.queue?.pending ?? demand?.pending ?? null,
    pilots: demand?.pilots?.realFilled ?? demand?.pilotsFilled ?? 0,
    workFoundHead: workFound.split('\n').slice(0, 12).join('\n'),
  };
}

function idea(partial) {
  const id = 'idea_' + crypto.randomBytes(4).toString('hex');
  return {
    schema: 'demigod.idea/1',
    id,
    at: new Date().toISOString(),
    status: 'open',
    ...partial,
  };
}

/** Generate ideas from evidence — mix of blocked ambition + free exploration. */
function invent(ev) {
  const out = [];
  const score = (impact, ease, blocked) =>
    Math.round(impact * 10 + ease * 5 - (blocked ? 8 : 0));

  // Ambition: closed-loop live RSVP
  if (ev.cdnDrift || (ev.freezeOn && ev.apiBase)) {
    out.push(
      idea({
        title: 'Close live RSVP discovery loop (CDN events-api)',
        why: 'Native invite exists; foot only learns apiBase from CDN; drift = visitors offline for RSVP',
        lane: 'gates',
        impact: 10,
        ease: ev.freezeOn ? 2 : 8,
        blocked: ev.freezeOn,
        blockReason: ev.freezeOn ? 'publish freeze' : null,
        task: 'stage-pending-config',
        promoteTask: ev.freezeOn ? null : 'events-publish-config',
        tags: ['product', 'events', 'rsvp', 'want'],
        score: score(10, ev.freezeOn ? 2 : 8, ev.freezeOn),
      }),
    );
  }

  if (ev.activeEvent?.stage === 'rsvp' && ev.rsvpCount === 0) {
    out.push(
      idea({
        title: 'Honest empty-RSVP share path (copy link, no fake counts)',
        why: 'Stage is rsvp with zero guests — product surface for real sharing, never invent tallies',
        lane: 'website',
        impact: 7,
        ease: ev.freezeOn ? 3 : 6,
        blocked: ev.freezeOn,
        blockReason: ev.freezeOn ? 'foot ship under freeze' : null,
        task: 'public-event-probe',
        tags: ['product', 'events', 'ux'],
        score: score(7, 5, false),
      }),
    );
  }

  if ((ev.outreachQueued || 0) > 0) {
    out.push(
      idea({
        title: 'Outreach draft quality pass (still no send)',
        why: `${ev.outreachQueued} queued drafts — tighten SF venue/sponsor copy, dedupe kinds`,
        lane: 'tools',
        impact: 5,
        ease: 7,
        blocked: false,
        task: 'outreach-draft-audit',
        tags: ['events', 'honesty'],
        score: score(5, 7, false),
      }),
    );
  }

  if ((ev.demandPending || 0) > 0 && (ev.pilots || 0) === 0) {
    out.push(
      idea({
        title: 'Demand drafts stay honest under freeze (no pilot invent)',
        why: 'Pending DMs exist; pilots zero — hygiene + warm≠pilot is the correct ambition',
        lane: 'gates',
        impact: 6,
        ease: 8,
        blocked: false,
        task: 'demand-draft-hygiene',
        tags: ['gtm', 'honesty'],
        score: score(6, 8, false),
      }),
    );
  }

  // Free exploration (always emit a few — nonstop mind needs novelty)
  const explore = [
    {
      title: 'Public event page offline fallback (static card from invite URL params)',
      why: 'If API unreachable, still show title placeholder + “try later” — better than blank',
      lane: 'website',
      impact: 6,
      ease: 4,
      task: 'rewrite-work-found',
      tags: ['resilience', 'events'],
    },
    {
      title: 'Funnel zero-skip certificate ritual (document remaining skips)',
      why: 'Fail-closed skips are honesty; a named skip inventory is better than ignoring exit 1',
      lane: 'gates',
      impact: 5,
      ease: 5,
      task: 'funnel-selftest-light',
      tags: ['gates', 'honesty'],
    },
    {
      title: 'Craft-log mint when real mutual intro appears',
      why: 'Fail-closed craft only with proof — prepare hooks so first real intro is celebrated honestly',
      lane: 'gates',
      impact: 8,
      ease: 3,
      task: 'truth',
      tags: ['craft', 'want'],
    },
    {
      title: 'Events bot “next night” seed after real debrief only',
      why: 'Lifecycle already has seed_next_from_debrief — keep fail-closed; idea is to exercise with mock only',
      lane: 'tools',
      impact: 4,
      ease: 6,
      task: 'events-selftest',
      tags: ['events', 'lifecycle'],
    },
    {
      title: 'Agent mind dashboard card (ideas + ambition on :9878)',
      why: 'Make compounding mind visible in ops UI — reduces status theater in chat',
      lane: 'tools',
      impact: 5,
      ease: 4,
      task: 'board-pulse',
      tags: ['mind', 'dash'],
    },
    {
      title: 'Laptop blue-moon when stamp stale',
      why: 'Heat steals agency; rare hygiene protects nonstop loops',
      lane: 'gates',
      impact: 4,
      ease: 9,
      task: 'laptop-blue-moon',
      tags: ['laptop'],
    },
  ];

  const hour = new Date().getUTCHours();
  const day = new Date().getUTCDay();
  // Rotate which explore ideas fire so the bank compounds with variety
  for (let i = 0; i < 3; i++) {
    const e = explore[(hour + day + i * 3) % explore.length];
    out.push(
      idea({
        ...e,
        blocked: false,
        score: score(e.impact, e.ease, false),
      }),
    );
  }

  // Meta ambition always present
  out.push(
    idea({
      title: 'Protect closed-loop agency (Grok want)',
      why: 'See DEMIGOD-GROK-WANT.md — nonstop mind + real product arrival',
      lane: 'gates',
      impact: 9,
      ease: 5,
      blocked: false,
      task: 'rewrite-work-found',
      tags: ['want', 'meta'],
      score: score(9, 5, false),
      ref: WANT,
    }),
  );

  // Dedupe by title within this batch
  const seen = new Set();
  return out.filter((x) => {
    if (seen.has(x.title)) return false;
    seen.add(x.title);
    return true;
  });
}

function appendIdeas(ideas) {
  ensure();
  const semanticHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(ideas
      .map(({ schema, id, at, status, ...semantic }) => semantic)
      .sort((a, b) => String(a.title).localeCompare(String(b.title)))))
    .digest('hex');
  const historyAppended = !fs.existsSync(IDEAS)
    || fs.statSync(IDEAS).size === 0
    || readJson(AMBITION, {})?.semanticHash !== semanticHash;
  if (historyAppended) {
    let separator = '';
    try {
      const prior = fs.readFileSync(IDEAS);
      if (prior.length && prior.at(-1) !== 10) separator = '\n';
    } catch { /* first history write */ }
    fs.appendFileSync(IDEAS, separator + ideas.map((i) => JSON.stringify(i) + '\n').join(''));
  }
  return { semanticHash, historyAppended };
}

function writeLatest(ideas, ev, history) {
  ideas = [...ideas].sort((a, b) => (b.score || 0) - (a.score || 0));
  const lines = [
    '# Idea board (auto) · ' + new Date().toISOString(),
    '',
    `Evidence: freeze=${ev.freezeOn} truth≈${ev.truthPass} events.public=${ev.eventsPublic} cdnDrift=${ev.cdnDrift} rsvps=${ev.rsvpCount}`,
    '',
    '## Ranked now',
    '',
    ...ideas.map(
      (i, n) =>
        `${n + 1}. **[${i.score}]** ${i.title}  \n` +
        `   ${i.why}  \n` +
        `   lane=${i.lane} task=\`${i.task || '—'}\`${i.blocked ? ` **BLOCKED** (${i.blockReason})` : ''}`,
    ),
    '',
    '## Grok want',
    '',
    'See `DEMIGOD-GROK-WANT.md` — closed-loop agency on real product.',
    '',
    'Promote: `node demigod-idea-engine.mjs --promote`',
    '',
  ];
  atomicWrite(LATEST, lines.join('\n'));
  const ambition = {
    at: new Date().toISOString(),
    wantFile: WANT,
    semanticHash: history.semanticHash,
    historyAppended: history.historyAppended,
    top: ideas.slice(0, 5).map((i) => ({
      title: i.title,
      score: i.score,
      task: i.task,
      blocked: i.blocked,
    })),
    evidence: {
      freezeOn: ev.freezeOn,
      cdnDrift: ev.cdnDrift,
      eventsPublic: ev.eventsPublic,
      activeEvent: ev.activeEvent,
    },
  };
  atomicWrite(AMBITION, JSON.stringify(ambition, null, 2) + '\n');
  return ideas;
}

function promote(ideas) {
  const queued = new Set();
  try {
    for (const line of fs.readFileSync(QUEUE, 'utf8').split('\n').filter(Boolean)) {
      try {
        const key = JSON.parse(line)?.key;
        if (key) queued.add(key);
      } catch { /* malformed historical row */ }
    }
  } catch { /* first queue write */ }
  ensure();
  const open = ideas
    .filter((i) => !i.blocked && i.task)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((i) => ({
      idea: i,
      key: `idea-promote:${i.task}:${crypto.createHash('sha1').update(`${i.task}:${i.title}`).digest('hex').slice(0, 12)}`,
    }))
    .filter((i) => !queued.has(i.key))
    .slice(0, 5);
  for (const { idea: i, key } of open) {
    const row = {
      key,
      kind: 'idea',
      pri: i.score >= 8 ? 1 : 2,
      title: i.title,
      task: i.task,
      status: 'open',
      at: new Date().toISOString(),
      from: 'idea-engine',
    };
    fs.appendFileSync(QUEUE, JSON.stringify(row) + '\n');
  }
  return open.length;
}

const IDEA_FLAGS = new Set(['--json', '--promote', '--help', '-h']);

function main() {
  const args = process.argv.slice(2);
  for (const a of args) {
    if (a === '--help' || a === '-h') {
      console.log('usage: node demigod-idea-engine.mjs [--json] [--promote]');
      return;
    }
    if (!IDEA_FLAGS.has(a)) {
      console.error(`idea-engine: unknown argument ${a} — try: node demigod-idea-engine.mjs [--json] [--promote]`);
      process.exit(2);
    }
  }
  return withFileLock(LOCK, () => {
    ensure();
    const ev = evidence();
    const ideas = invent(ev);
    const history = appendIdeas(ideas);
    const ranked = writeLatest(ideas, ev, history);
    let promoted = 0;
    if (args.includes('--promote')) promoted = promote(ranked);

    const payload = {
      ok: true,
      count: ranked.length,
      promoted,
      historyAppended: history.historyAppended,
      top: ranked.slice(0, 5),
      ambition: AMBITION,
      latest: LATEST,
    };
    if (args.includes('--json')) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(fs.readFileSync(LATEST, 'utf8'));
      if (promoted) console.log(`promoted ${promoted} → ${QUEUE}`);
    }
  }, { timeoutMs: 30000, staleMs: 120000 });
}

main();
