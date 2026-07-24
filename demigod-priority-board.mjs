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
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { refuseIfStale } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function newestLiveObservation(observations = [], now = Date.now(), maxAgeMs = 300000) {
  return observations
    .filter((item) => Number.isFinite(Date.parse(item?.at || '')))
    .filter((item) => {
      const age = now - Date.parse(item.at);
      return age >= -60000 && age <= maxAgeMs;
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0] || null;
}

export function lockChangedSinceClaim(lock, currentSha) {
  return Boolean(lock?.baseSha && currentSha && lock.baseSha !== currentSha);
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
  const shipPrepare = data.shipPrepare || {};
  const live = data.live || {};
  const eventsOnline = data.eventsBot?.online || data.eventsOnline || {};
  const lock = data.lock || data.control?.lock || {};
  // Publish-lag debt (truth soft-ok forever made multi-version lag invisible)
  const publishLag =
    (data.publishLag && typeof data.publishLag === 'object' ? data.publishLag : null) ||
    (te.publishLag && typeof te.publishLag === 'object' ? te.publishLag : null) ||
    null;
  const hasStandaloneDoctor = Object.hasOwn(data, 'webflowDoctor');
  const webflow = data.webflow || (hasStandaloneDoctor ? {} : readJson(path.join(BUSY, 'webflow-status.json'))) || {};
  const standaloneDoctor = hasStandaloneDoctor
    ? data.webflowDoctor
    : readJson(path.join(BUSY, 'webflow-doctor.json'));
  const webflowDoctor = [webflow.doctor, standaloneDoctor]
    .filter((receipt) => Number.isFinite(Date.parse(receipt?.at || '')))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0] || null;
  const formsAudit = data.formsAudit || readJson(path.join(ROOT, 'DEMIGOD-FORMS-FULL-AUDIT.json'));
  const webflowDoctorAgeSec = webflowDoctor?.at
    ? Math.round((Date.now() - Date.parse(webflowDoctor.at)) / 1000)
    : null;
  const webflowDoctorFresh = Number.isFinite(webflowDoctorAgeSec)
    && webflowDoctorAgeSec >= -60
    && webflowDoctorAgeSec <= 15 * 60;
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
      pri: 2,
      id: 'truth-awaiting-ship',
      kind: 'watch',
      title: 'Site changes staged locally · publish not authorized',
      detail: `${te.summary || 'disk differs from live'} · prepare/verify only`,
      cmd: 'bin/dg ship prepare',
      job: 'ship-prepare',
      owner: 'unassigned',
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
    const lagNote =
      publishLag?.overdue
        ? ` · lag DEBT +${publishLag.versionsAhead || '?'}ver ${publishLag.ageHours ?? '?'}h`
        : publishLag?.lagging
          ? ` · lag +${publishLag.versionsAhead || '?'}ver tracked`
          : '';
    push({
      pri: publishLag?.overdue ? 3 : 4,
      id: 'truth-green',
      kind: publishLag?.overdue ? 'watch' : 'ok',
      title: `Site sealed green${live.foot ? ' · ' + live.foot : ''}${lagNote}`,
      detail: te.summary || te.runId || 'fresh pass',
      cmd: 'bin/dg truth',
      job: 'truth',
      owner: 'system',
    });
  }

  // Aging prepare-only lag is debt (needs current-request publish auth — never auto-ship)
  if (publishLag?.overdue) {
    push({
      pri: 1,
      id: 'publish-lag-debt',
      kind: 'action',
      title: `Publish lag DEBT disk v${publishLag.diskVer || '?'} live v${publishLag.liveVer || '?'} (+${publishLag.versionsAhead || '?'}ver · ${publishLag.ageHours ?? '?'}h)`,
      detail:
        publishLag.note ||
        'needs exact current-request publish authorization (not auto-ship) · prepare/verify only',
      cmd: 'bin/dg ship prepare',
      job: 'ship-prepare',
      owner: 'unassigned',
    });
  } else if (publishLag?.lagging) {
    push({
      pri: 2,
      id: 'publish-lag-tracked',
      kind: 'watch',
      title: `Publish lag tracked disk v${publishLag.diskVer || '?'} live v${publishLag.liveVer || '?'} (+${publishLag.versionsAhead || '?'}ver · ${publishLag.ageHours ?? '?'}h)`,
      detail: 'under age/version thresholds · prepare-only until authorized publish',
      cmd: 'bin/dg ship prepare',
      job: 'ship-prepare',
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

  if (eventsOnline.stale !== true && eventsOnline.public === true && eventsOnline.configPublished === false) {
    const unreachable = eventsOnline.websiteConfigReachable === false;
    const prepareOnly = eventsOnline.prepareOnlyWebsiteConfig ?? unreachable;
    push({
      pri: prepareOnly ? 3 : unreachable ? 1 : 2,
      id: 'events-config-stale',
      kind: prepareOnly ? 'info' : 'watch',
      title: prepareOnly
        ? 'Events website config stale · prepare-only'
        : unreachable
        ? 'Events website configuration points to dead tunnels'
        : 'Events website configuration is stale',
      // Keep pri/kind prepare-only (no thrash); still name the live product impact for operators.
      detail: unreachable
        ? 'Current API tunnel is healthy · browser-consumed config is unreachable (live chat + event invite offline) · pending config ready · external config publish not authorized'
        : 'Current API tunnel is healthy · published browser config differs · external config publish not authorized',
      cmd: 'bin/dg events status',
      tab: 'overview',
      owner: prepareOnly ? 'system' : 'unassigned',
    });
  }

  // Sticky preferred loca name can 503 while a random public tunnel is still healthy.
  // CF quick tunnels never match sticky loca name — expected, not a heal thrash.
  // Info only — do not thrash heal while public is up.
  if (
    eventsOnline.stale !== true &&
    eventsOnline.public === true &&
    eventsOnline.preferredTunnelMatch === false
  ) {
    const note = String(eventsOnline.preferredTunnelNote || '').trim();
    const cfExpected =
      /\.trycloudflare\.com/i.test(String(eventsOnline.tunnelUrl || '')) ||
      /Cloudflare quick tunnels/i.test(note);
    push({
      pri: cfExpected ? 4 : 3,
      id: 'events-preferred-tunnel',
      kind: 'info',
      title: cfExpected
        ? 'Events on CF quick tunnel (sticky loca name N/A)'
        : 'Events preferred tunnel sticky name unavailable',
      detail: [
        eventsOnline.tunnelUrl ? `serving ${eventsOnline.tunnelUrl}` : 'public on non-preferred tunnel',
        note || null,
        'do not thrash heal while public is up',
      ]
        .filter(Boolean)
        .join(' · '),
      cmd: 'bin/dg events status',
      tab: 'overview',
      owner: 'system',
    });
  }

  if (webflowDoctor && !webflowDoctorFresh) {
    const clockSkewed = Number.isFinite(webflowDoctorAgeSec) && webflowDoctorAgeSec < -60;
    const siteTruthCoversStaleness = te.green === true && live.ok !== false;
    push({
      pri: 3,
      id: 'webflow-doctor-stale',
      kind: siteTruthCoversStaleness ? 'info' : 'watch',
      title: 'Webflow doctor stale',
      detail: webflowDoctorAgeSec == null
        ? 'receipt has no valid timestamp'
        : clockSkewed ? 'receipt timestamp is in the future' : `receipt age ${webflowDoctorAgeSec}s`,
      cmd: 'bin/dg webflow doctor',
      job: 'webflow-doctor',
      tab: 'overview',
      owner: siteTruthCoversStaleness ? 'system' : 'agent',
    });
  } else if (webflowDoctor?.pass === false) {
    const cdpDown = (webflowDoctor.checks || []).some((check) => check.name === 'cdp' && !check.ok);
    const observational = new Set(['cdp', 'live fetch', 'live SEO meta unique']);
    const failed = (webflowDoctor.checks || [])
      .filter((check) => !check.ok && (!cdpDown || !/ tab$/.test(check.name)))
      .filter((check) => !observational.has(check.name))
      .map((check) => check.name);
    const publishOnly = awaitingShip && failed.length > 0 && failed.every((name) =>
      ['live sitemap', 'robots advertises sitemap'].includes(name),
    );
    if (!publishOnly) {
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
    }
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

  const resumeUploadIssue = (formsAudit?.issues || []).find(
    (issue) => issue?.issue === 'rich_resume_upload_unavailable',
  );
  const formsAuditAgeMs = Date.now() - Date.parse(formsAudit?.at || '');
  if (resumeUploadIssue && Number.isFinite(formsAuditAgeMs) && formsAuditAgeMs >= -60_000 && formsAuditAgeMs <= 86_400_000) {
    push({
      pri: 1,
      id: 'talent-resume-upload-missing',
      kind: 'action',
      title: 'Talent résumé upload missing · link-only',
      detail: 'Verified on mobile and desktop; native Webflow File Upload prerequisite remains.',
      cmd: 'bin/dg webflow change "add Webflow File Upload component for talent résumé"',
      tab: 'gates',
      owner: 'unassigned',
    });
  }

  if (lock.compromised) {
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
        lock.changedSinceClaim ? 'source changed under active lock' : null,
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
    demand?.warmInbound?.freshness ||
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
  const warmNext = demand?.next || pilot?.next || pilot?.NEXT || null;
  const overdueItems = warmFresh.overdueActionItems || [];
  const humanOnlyOverdue = overdueItems.length > 0 && overdueItems.every((item) =>
    /(?:human outcome|call outcome|when known)/i.test(`${item?.action || ''} ${item?.next || ''}`),
  );
  if (warmOverdue > 0) {
    push({
      pri: humanOnlyOverdue ? 3 : 1,
      id: 'warm-overdue',
      kind: humanOnlyOverdue ? 'info' : 'action',
      title: humanOnlyOverdue ? 'Warm inbound awaiting outcome note' : 'Warm inbound overdue',
      detail: String(warmNext || `overdue=${warmOverdue}`).slice(0, 160),
      cmd: 'bin/dg pilot status',
      job: 'pilot',
      tab: 'inbox',
      owner: humanOnlyOverdue ? 'system' : 'unassigned',
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
    const draftsReady = hyg?.ready === true || (hyg?.ready == null && hyg?.ok === true && hyg?.stale === false);
    const draftsBlocked = hyg?.ok === false;
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
      id: draftsReady ? 'demand-drafts-ready' : draftsBlocked ? 'demand-drafts-blocked' : 'demand-drafts-review',
      kind: draftsReady ? 'info' : 'action',
      title: draftsReady
        ? `${pending} demand drafts ready · 0 sent`
        : draftsBlocked
          ? `${hyg.flagged ?? pending} of ${pending} demand drafts blocked by hygiene · 0 sent`
          : `${pending} demand drafts need hygiene review · 0 sent`,
      detail,
      cmd: 'bin/dg demand status',
      job: 'demand',
      owner: draftsReady ? 'system' : 'unassigned',
    });
  }

  const pilots = demand.pilotsFilled ?? pilot?.activeReal ?? 0;
  if (Number(pilots) === 0 && te.green === true) {
    push({
      pri: 4,
      id: 'no-pilots',
      kind: 'info',
      title: 'No real pilots logged yet (honest)',
      detail: 'Warm ≠ pilot. Log only real briefs.',
      cmd: 'bin/dg pilot status',
      job: 'pilot',
      owner: 'system',
    });
  }

  // Cycle / work-loop — do not call tools "not attested" when toolsReady and only release is blocked.
  const cycleAt = Date.parse(cycle?.at || '');
  const canonicalTruthSupersedesCycle = te.green === true && cycle?.domain === 'ship'
    && (cycle.stale === true || Number(cycle.ageSec) > 900 || Number.isFinite(cycleAt) && Date.now() - cycleAt > 900_000);
  if (!canonicalTruthSupersedesCycle && cycle && (cycle.attested === false || cycle.degraded === true || cycle.blocked === true)) {
    const prepareAt = Date.parse(shipPrepare.at || '');
    const prepareAgeMs = Date.now() - prepareAt;
    const historicalCycle = Number.isFinite(cycleAt) && Number.isFinite(prepareAt)
      && Date.now() - cycleAt > 900000 && prepareAt > cycleAt
      && prepareAgeMs >= -60000 && prepareAgeMs <= 900000 && shipPrepare.ok === true;
    if (historicalCycle) {
      push({
        pri: 4,
        id: 'cycle-historical',
        kind: 'info',
        title: 'Latest ship prepare green · prior cycle historical',
        detail: `prepare ${shipPrepare.steps?.length || 0} gates · old cycle ${cycle.domain || '?'} ${cycle.verification || 'unattested'}`,
        cmd: 'bin/dg cycle-status',
        job: 'cycle-status',
        owner: 'system',
      });
    } else {
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
  const headline = top.find((card) => !['info', 'ok'].includes(card.kind)) || {
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
  if (process.argv.slice(2).some((arg) => arg !== '--json')) {
    console.error('usage: node demigod-priority-board.mjs [--json]');
    process.exit(2);
  }
  const asJson = process.argv.includes('--json');
  // Build from busy receipts without full dashboard status
  const truth = readJson(path.join(BUSY, 'truth.json')) || {};
  const demand = readJson(path.join(BUSY, 'demand-status.json')) || {};
  const pilot = readJson(path.join(BUSY, 'pilot-inbound.json')) || {};
  const cycle = readJson(path.join(BUSY, 'cycle-work-latest.json')) || {};
  const shipPrepare = readJson(path.join(BUSY, 'ship-prepare.json')) || {};
  const freeze = readJson(path.join(BUSY, 'publish-freeze.json')) || {};
  const footLock = readJson(path.join(BUSY, 'foot-lock.json')) || {};
  const dashboard = readJson(path.join(BUSY, 'dashboard-status.json')) || {};
  const webflow = readJson(path.join(BUSY, 'webflow-status.json')) || {};
  const smoke = readJson(path.join(BUSY, 'agent-smoke.json')) || {};
  const eventsStatus = readJson(path.join(BUSY, 'events-online', 'status.json')) || {};
  const dashboardAgeMs = dashboard.at ? Date.now() - Date.parse(dashboard.at) : Infinity;
  // >= -60000 rejects a future-dated/clock-skewed status instead of blessing it fresh (false-fresh class)
  const dashboardFresh = dashboardAgeMs >= -60000 && dashboardAgeMs <= 120000;
  const eventsAgeMs = eventsStatus.at ? Date.now() - Date.parse(eventsStatus.at) : Infinity;
  const eventsFresh = eventsAgeMs >= -60000 && eventsAgeMs <= 10 * 60 * 1000;
  const latestLive = newestLiveObservation([
    { at: truth.at, ok: truth.live?.reachable === true || truth.live?.htmlOk === true, error: truth.live?.htmlError || null, foot: truth.live?.footVer ? `v${truth.live.footVer}` : null },
    { at: dashboard.at, ok: dashboard.live?.ok === true, error: dashboard.live?.error || null, foot: dashboard.live?.foot || null },
    { at: webflow.at, ok: webflow.live?.ok === true, error: webflow.live?.error || null, foot: webflow.live?.footVerHint || null },
    { at: smoke.at, ok: smoke.pass === true && smoke.corePass === true, error: smoke.error || null, foot: smoke.liveFootVer ? `v${smoke.liveFootVer}` : null },
  ]);
  const lockHeld = Boolean(footLock.owner && footLock.expiresAt && Date.parse(footLock.expiresAt) > Date.now());
  const currentFootSha = (() => {
    try {
      return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'))).digest('hex');
    } catch {
      return null;
    }
  })();
  const lockChanged = lockHeld && lockChangedSinceClaim(footLock, currentFootSha);
  const truthReceipt = readJson(path.join(BUSY, 'truth.json')) || {};
  const data = {
    truthEvidence: refuseIfStale('truth'),
    publishLag:
      truthReceipt.publishLag && typeof truthReceipt.publishLag === 'object'
        ? truthReceipt.publishLag
        : null,
    freeze: { on: Boolean(freeze.on), why: freeze.why },
    demand: {
      pending: demand.queue?.pending ?? demand.pending,
      sentConfirmed: demand.dms?.sentConfirmed ?? demand.sentConfirmed,
      pilotsFilled: demand.pilots?.filled ?? demand.pilotsFilled ?? demand.pilots?.realFilled,
      next: demand.next,
      drafts: demand.drafts || null,
      warmInbound: demand.warmInbound || null,
      top3: (demand.drafts?.top3 || []).map((d) => d?.name).filter(Boolean),
      hygiene: demand.drafts?.hygiene || null,
    },
    pilot,
    cycleWork: cycle,
    shipPrepare,
    cycleWorkHealth: {
      at: cycle.at,
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
      ok: latestLive?.ok ?? (dashboardFresh && dashboard.live?.ok === true || truth.live?.reachable === true || truth.live?.htmlOk === true),
      foot: latestLive?.foot || dashboardFresh && dashboard.live?.foot || (truth.live?.footVer ? `v${truth.live.footVer}` : null),
      error: latestLive ? (latestLive.ok ? null : latestLive.error) : (dashboardFresh && dashboard.live?.ok === true ? null : truth.live?.htmlError || null),
    },
    eventsOnline: eventsFresh ? {
      stale: false,
      public: eventsStatus.public ?? null,
      needHeal: eventsStatus.needHeal === true,
      configPublished: typeof eventsStatus.websiteConfigCurrent === 'boolean'
        ? eventsStatus.websiteConfigCurrent
        : null,
      websiteConfigReachable: eventsStatus.websiteConfigReachable ?? null,
      prepareOnlyWebsiteConfig: eventsStatus.prepareOnlyWebsiteConfig === true,
      preferredTunnelMatch:
        typeof eventsStatus.preferredTunnelMatch === 'boolean'
          ? eventsStatus.preferredTunnelMatch
          : null,
      preferredTunnelNote: eventsStatus.preferredTunnelNote || null,
      tunnelUrl: eventsStatus.tunnelUrl || null,
    } : { stale: true },
    lock: {
      held: lockHeld,
      foot: lockHeld,
      owner: footLock.owner || null,
      why: footLock.why || null,
      footVer: footLock.footVer || null,
      ttlLeftSec: lockHeld
        ? Math.max(0, Math.round((Date.parse(footLock.expiresAt) - Date.now()) / 1000))
        : null,
      compromised: false,
      changedSinceClaim: lockChanged,
    },
    next: readJson(path.join(BUSY, 'next.json'))?.next || readJson(path.join(BUSY, 'next.json')),
  };
  const board = buildPriorityBoard(data);
  atomicWrite(
    path.join(BUSY, 'priority-board.json'),
    JSON.stringify(board, null, 2) + '\n',
    { mode: 0o600 },
  );
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
