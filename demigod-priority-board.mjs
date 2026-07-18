#!/usr/bin/env node
/**
 * demigod-priority-board — ranked “what matters now” for the dashboard top
 *
 *   node demigod-priority-board.mjs [--json]
 *   import { buildPriorityBoard } from './demigod-priority-board.mjs'
 *
 * Pure ranker over already-built status / busy receipts. No network.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {object} data - dashboard status-like object
 * @returns {{ at: string, headline: object, cards: object[] }}
 */
export function buildPriorityBoard(data = {}) {
  const cards = [];
  const push = (card) => {
    if (!card?.id || !card?.title) return;
    cards.push({
      pri: card.pri ?? 5,
      id: card.id,
      kind: card.kind || 'info', // critical | action | watch | ok | info
      title: card.title,
      detail: card.detail || '',
      cmd: card.cmd || null,
      job: card.job || null,
      tab: card.tab || null,
      owner: card.owner || 'agent', // agent | unassigned | system
    });
  };

  const te = data.truthEvidence || {};
  const freeze = data.freeze || {};
  const next = data.next || {};
  const demand = data.demand || {};
  const pilot = data.pilot || readJson(path.join(BUSY, 'pilot-inbound.json')) || {};
  const cycle = data.cycleWorkHealth || data.cycleWork || {};
  const live = data.live || {};
  const lock = data.lock || data.control?.lock || {};
  const webflow = data.webflow || readJson(path.join(BUSY, 'webflow-status.json')) || {};
  const webflowDoctor = webflow.doctor || readJson(path.join(BUSY, 'webflow-doctor.json'));
  const webflowDoctorAgeSec = webflowDoctor?.at
    ? Math.round((Date.now() - Date.parse(webflowDoctor.at)) / 1000)
    : null;
  const webflowDoctorFresh = Number.isFinite(webflowDoctorAgeSec)
    && webflowDoctorAgeSec >= -60
    && webflowDoctorAgeSec <= 120;
  const paused =
    fs.existsSync(path.join(BUSY, 'watchdog.PAUSED')) ||
    fs.existsSync(path.join(BUSY, 'never-stop.STOP'));
  const liveUnobservable = /ENOTFOUND|EAI_AGAIN|EPERM/i.test(String(live.error || '')) ||
    webflowDoctorFresh && (webflowDoctor?.checks || []).some(
      (check) => check.name === 'cdp' && !check.ok && /EPERM/.test(check.detail || ''),
    );

  // P0 — truth / site. Healthy live + explicit unshipped drift is ship work, not an outage.
  const awaitingShip = (live.ok === true || liveUnobservable) && /shipped=false/.test(String(te.summary || ''));
  if (te.green !== true && awaitingShip) {
    push({
      pri: 1,
      id: 'truth-awaiting-ship',
      kind: 'action',
      title: 'Site changes await coordinated ship',
      detail: te.summary || 'disk differs from live',
      cmd: 'bin/dg ship prepare',
      job: 'ship-prepare',
      owner: 'agent',
    });
  } else if (te.green !== true) {
    push({
      pri: 0,
      id: 'truth-not-green',
      kind: 'critical',
      title: 'Truth not green',
      detail: te.reason || te.summary || 'bin/dg truth',
      cmd: 'bin/dg truth',
      job: 'truth',
      owner: 'agent',
    });
  } else {
    push({
      pri: 4,
      id: 'truth-green',
      kind: 'ok',
      title: `Site sealed green${live.foot ? ' · ' + live.foot : ''}`,
      detail: te.summary || te.runId || 'fresh pass',
      cmd: 'bin/dg truth',
      job: 'truth',
      owner: 'system',
    });
  }

  if (live.ok === false && !liveUnobservable) {
    push({
      pri: 0,
      id: 'live-down',
      kind: 'critical',
      title: 'Live site probe failed',
      detail: live.error || 'curl www.trydemigod.com',
      cmd: 'curl -sS -o /dev/null -w "%{http_code}" https://www.trydemigod.com/',
      owner: 'agent',
    });
  }

  if (webflowDoctor && !webflowDoctorFresh) {
    const clockSkewed = Number.isFinite(webflowDoctorAgeSec) && webflowDoctorAgeSec < -60;
    push({
      pri: 3,
      id: 'webflow-doctor-stale',
      kind: 'watch',
      title: 'Webflow doctor stale',
      detail: webflowDoctorAgeSec == null
        ? 'receipt has no valid timestamp'
        : clockSkewed ? 'receipt timestamp is in the future' : `receipt age ${webflowDoctorAgeSec}s`,
      cmd: 'bin/dg webflow doctor',
      job: 'webflow-doctor',
      tab: 'overview',
      owner: 'agent',
    });
  } else if (webflowDoctor?.pass === false) {
    const cdpDown = (webflowDoctor.checks || []).some((check) => check.name === 'cdp' && !check.ok);
    const observational = new Set(['cdp', 'live fetch', 'live SEO meta unique']);
    const failed = (webflowDoctor.checks || [])
      .filter((check) => !check.ok && (!cdpDown || !/ tab$/.test(check.name)))
      .filter((check) => !observational.has(check.name))
      .map((check) => check.name);
    push({
      pri: failed.length ? 1 : 3,
      id: 'webflow-doctor',
      kind: failed.length ? 'action' : 'watch',
      title: failed.length ? 'Webflow doctor found issues' : 'Webflow checks unobservable here',
      detail: failed.slice(0, 4).join(', ') || 'canonical truth confirms live; CDP/DNS unavailable in this namespace',
      cmd: 'bin/dg webflow doctor',
      job: 'webflow-doctor',
      tab: 'overview',
      owner: 'agent',
    });
  } else if (webflowDoctor?.pass === true) {
    push({
      pri: 4,
      id: 'webflow-doctor-green',
      kind: 'ok',
      title: 'Webflow doctor green',
      detail: `${webflowDoctor.checks?.length || 0} checks · ${webflowDoctor.freeze?.frozen ? 'freeze ON' : 'freeze OFF'}`,
      cmd: 'bin/dg webflow doctor',
      job: 'webflow-doctor',
      tab: 'overview',
      owner: 'system',
    });
  }

  // Freeze disabled for now — do not surface freeze on/off as priority work.
  // Foot-lock still guards concurrent foot edits.

  if (lock.compromised || lock.changedSinceClaim) {
    push({
      pri: 0,
      id: 'lock-compromised',
      kind: 'critical',
      title: 'Foot lock compromised',
      detail: lock.owner || 'check bin/dg lock status',
      cmd: 'bin/dg lock status',
      job: 'lock-who',
      owner: 'agent',
    });
  } else if (lock.foot || lock.held) {
    push({
      pri: 2,
      id: 'lock-held',
      kind: 'watch',
      title: `Foot lock held by ${lock.owner || 'someone'}`,
      detail: [
        lock.why ? String(lock.why).slice(0, 80) : null,
        lock.ttlLeftSec != null ? `ttl ~${lock.ttlLeftSec}s` : null,
        lock.footVer ? `core v${String(lock.footVer).replace(/^v/, '')}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 160),
      cmd: 'bin/dg lock status',
      job: 'lock-who',
      owner: 'agent',
    });
  }

  // Demand / pilot (GTM) — use freshness counts, not loose NEXT text (due today ≠ overdue).
  const warmFresh =
    pilot?.warmInbound?.freshness ||
    pilot?.warmHealth ||
    {};
  const warmOverdue = Number(
    warmFresh.overdueActionCount ??
      warmFresh.overdue ??
      pilot?.overdue ??
      0,
  );
  const warmDueToday = Number(warmFresh.dueTodayActionCount ?? 0);
  const warmNext = pilot?.next || pilot?.NEXT || demand?.next || null;
  if (warmOverdue > 0) {
    push({
      pri: 1,
      id: 'warm-overdue',
      kind: 'action',
      title: 'Warm inbound overdue',
      detail: String(warmNext || `overdue=${warmOverdue}`).slice(0, 160),
      cmd: 'bin/dg pilot status',
      job: 'pilot',
      tab: 'inbox',
      owner: 'unassigned',
    });
  } else if (warmDueToday > 0) {
    push({
      pri: 2,
      id: 'warm-due-today',
      kind: 'action',
      title: 'Warm inbound due today',
      detail: String(warmNext || `dueToday=${warmDueToday}`).slice(0, 160),
      cmd: 'bin/dg pilot status',
      job: 'pilot',
      tab: 'inbox',
      owner: 'unassigned',
    });
  }

  const pending = demand.pending ?? demand.queue?.pending ?? null;
  const sent = demand.sentConfirmed ?? demand.dms?.sentConfirmed ?? 0;
  if (pending != null && Number(pending) > 0 && Number(sent) === 0) {
    const top3Names = (demand.drafts?.top3 || demand.top3 || [])
      .map((d) => (typeof d === 'string' ? d : d?.name))
      .filter(Boolean)
      .slice(0, 3);
    const hyg = demand.drafts?.hygiene || demand.hygiene || null;
    const hygBit =
      hyg?.ok === true
        ? `hygiene ok ${hyg.clean ?? '?'}/${hyg.checked ?? '?'}`
        : hyg?.ok === false
          ? `hygiene flagged ${hyg.flagged ?? '?'}`
          : null;
    const detail = [
      'Drafts only — no auto-DM',
      top3Names.length ? top3Names.join(' → ') : null,
      hygBit,
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 160);
    push({
      pri: 2,
      id: 'demand-drafts-ready',
      kind: 'action',
      title: `${pending} demand drafts ready · 0 sent`,
      detail,
      cmd: 'bin/dg demand status',
      job: 'demand',
      owner: 'unassigned',
    });
  }

  const pilots = demand.pilotsFilled ?? pilot?.activeReal ?? 0;
  if (Number(pilots) === 0 && te.green === true) {
    push({
      pri: 3,
      id: 'no-pilots',
      kind: 'watch',
      title: 'No real pilots logged yet (honest)',
      detail: 'Warm ≠ pilot. Log only real briefs.',
      cmd: 'bin/dg pilot status',
      job: 'pilot',
      owner: 'agent',
    });
  }

  // Cycle / work-loop — do not call tools "not attested" when toolsReady and only release is blocked.
  if (cycle && (cycle.attested === false || cycle.degraded === true || cycle.blocked === true)) {
    const toolsReady = cycle.toolsReady === true || cycle.domain === 'tools' && cycle.attested === true;
    const releaseBlocked =
      cycle.verification === 'release-blocked' ||
      cycle.failureKind === 'release-blocked' ||
      cycle.releaseReady === false;
    const title =
      toolsReady && releaseBlocked
        ? 'Cycle tools OK · release-blocked'
        : cycle.degraded
          ? `Cycle ${cycle.domain || '?'} degraded`
          : `Cycle ${cycle.domain || '?'} not attested`;
    push({
      // When tools OS is green and only release structure is blocked, demote so
      // demand drafts and warm due-today stay above CM6/readback noise.
      pri: toolsReady && releaseBlocked && te.green === true ? 3 : 2,
      id: 'cycle-unhealthy',
      kind: 'watch',
      title,
      detail:
        (toolsReady && releaseBlocked
          ? cycle.releaseBlocker || cycle.verification || 'release structure unverified'
          : cycle.verification || cycle.releaseBlocker || cycle.detail) ||
        'see cycle-work-latest.json',
      cmd: 'bin/dg cycle-status',
      job: 'cycle-status',
      owner: 'agent',
    });
  }

  if (paused) {
    push({
      pri: 4,
      id: 'loops-paused',
      kind: 'info',
      title: 'Background loops paused',
      detail: 'watchdog / never-stop / swarm STOP files present',
      cmd: 'ls /tmp/dg-busy/*.STOP /tmp/dg-busy/watchdog.PAUSED 2>/dev/null',
      owner: 'system',
    });
  }

  // Canonical NEXT from control plane
  if (next.title && !(awaitingShip && next.id === 'truth') && !cards.some((card) => next.cmd && card.cmd === next.cmd)) {
    push({
      pri: next.pri != null ? Math.min(3, Number(next.pri)) : 2,
      id: 'next-' + (next.id || 'item'),
      kind: next.mutate ? 'action' : next.pri != null && next.pri <= 1 ? 'critical' : 'action',
      title: next.title,
      detail: [next.cmd, next.mutate ? 'may mutate live' : 'read-only'].filter(Boolean).join(' · '),
      cmd: next.cmd || null,
      job: next.job || null,
      owner: next.mutate ? 'human' : 'agent',
    });
  }

  // Dedup by id keeping lowest pri
  const byId = new Map();
  for (const c of cards) {
    const prev = byId.get(c.id);
    if (!prev || c.pri < prev.pri) byId.set(c.id, c);
  }
  const ranked = [...byId.values()].sort((a, b) => a.pri - b.pri || a.title.localeCompare(b.title));
  const top = ranked.slice(0, 8);
  const headline = top[0] || {
    pri: 5,
    id: 'idle',
    kind: 'ok',
    title: 'Nothing urgent',
    detail: 'Site quiet',
    owner: 'system',
  };

  return {
    schema: 'demigod.priority-board/1',
    at: new Date().toISOString(),
    headline,
    cards: top,
    count: top.length,
  };
}

function main() {
  const asJson = process.argv.includes('--json');
  // Build from busy receipts without full dashboard status
  const truth = readJson(path.join(BUSY, 'truth.json')) || {};
  const demand = readJson(path.join(BUSY, 'demand-status.json')) || {};
  const pilot = readJson(path.join(BUSY, 'pilot-inbound.json')) || {};
  const cycle = readJson(path.join(BUSY, 'cycle-work-latest.json')) || {};
  const freeze = readJson(path.join(BUSY, 'publish-freeze.json')) || {};
  const footLock = readJson(path.join(BUSY, 'foot-lock.json')) || {};
  const dashboard = readJson(path.join(BUSY, 'dashboard-status.json')) || {};
  const dashboardAgeMs = dashboard.at ? Date.now() - Date.parse(dashboard.at) : Infinity;
  // >= -60000 rejects a future-dated/clock-skewed status instead of blessing it fresh (false-fresh class)
  const dashboardFresh = dashboardAgeMs >= -60000 && dashboardAgeMs <= 120000;
  const lockHeld = Boolean(footLock.owner && footLock.expiresAt && Date.parse(footLock.expiresAt) > Date.now());
  const data = {
    truthEvidence: truth.truthEvidence || {
      green: /PASS|shipped=true/.test(String(truth.summaryLine || truth.summary || '')),
      summary: truth.summaryLine || truth.summary,
      reason: truth.pass === false ? 'fail' : 'pass',
    },
    freeze: { on: Boolean(freeze.on), why: freeze.why },
    demand: {
      pending: demand.queue?.pending ?? demand.pending,
      sentConfirmed: demand.dms?.sentConfirmed ?? demand.sentConfirmed,
      pilotsFilled: demand.pilots?.filled ?? demand.pilotsFilled ?? demand.pilots?.realFilled,
      next: demand.next,
      drafts: demand.drafts || null,
      top3: (demand.drafts?.top3 || []).map((d) => d?.name).filter(Boolean),
      hygiene: demand.drafts?.hygiene || null,
    },
    pilot,
    cycleWork: cycle,
    cycleWorkHealth: {
      attested: cycle.attested,
      degraded: cycle.degraded,
      blocked: cycle.blocked,
      verification: cycle.verification,
      domain: cycle.domain,
      toolsReady: cycle.toolsReady,
      releaseReady: cycle.releaseReady,
      failureKind: cycle.failureKind,
      releaseBlocker: cycle.releaseBlocker,
    },
    live: {
      ok: dashboardFresh && dashboard.live?.ok === true || truth.live?.reachable === true || truth.live?.htmlOk === true,
      foot: dashboardFresh && dashboard.live?.foot || (truth.live?.footVer ? `v${truth.live.footVer}` : null),
      error: dashboardFresh && dashboard.live?.ok === true ? null : truth.live?.htmlError || null,
    },
    lock: {
      held: lockHeld,
      foot: lockHeld,
      owner: footLock.owner || null,
      why: footLock.why || null,
      footVer: footLock.footVer || null,
      ttlLeftSec: lockHeld
        ? Math.max(0, Math.round((Date.parse(footLock.expiresAt) - Date.now()) / 1000))
        : null,
      compromised: footLock.baseShaMatch === false && lockHeld,
      changedSinceClaim: footLock.baseShaMatch === false && lockHeld,
    },
    next: readJson(path.join(BUSY, 'next.json'))?.next || readJson(path.join(BUSY, 'next.json')),
  };
  const board = buildPriorityBoard(data);
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'priority-board.json'), JSON.stringify(board, null, 2) + '\n');
  if (asJson) console.log(JSON.stringify(board, null, 2));
  else {
    console.log(`# priority · ${board.headline.title}`);
    for (const c of board.cards) {
      console.log(`P${c.pri} [${c.kind}] ${c.title}${c.cmd ? ' · ' + c.cmd : ''}`);
    }
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
