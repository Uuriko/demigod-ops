import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { buildPriorityBoard, lockChangedSinceClaim, newestLiveObservation } from './demigod-priority-board.mjs';

test('CLI rejects unknown flags', () => {
  const result = spawnSync(process.execPath, ['demigod-priority-board.mjs', '--definitely-unknown'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /usage:/);
});

test('CLI uses canonical evidence and hash-stale injected evidence stays red', () => {
  const source = fs.readFileSync(new URL('./demigod-priority-board.mjs', import.meta.url), 'utf8');
  assert.match(source, /truthEvidence:\s*refuseIfStale\(['"]truth['"]\)/);
  assert.doesNotMatch(source, /green:\s*\/PASS\|shipped=true\//);

  const board = buildPriorityBoard({
    truthEvidence: {
      green: false,
      fresh: false,
      reason: 'input-hash-mismatch',
      summary: 'TRUTH PASS disk=v2 live=v2 shipped=true',
    },
    live: { ok: true },
  });
  assert.equal(board.cards.some((item) => item.id === 'truth-green'), false);
  assert.equal(board.cards.find((item) => item.id === 'truth-not-green')?.detail, 'input-hash-mismatch');
});

test('raw lock lease detects a foot change without a derived baseShaMatch field', () => {
  assert.equal(lockChangedSinceClaim({ baseSha: 'before' }, 'after'), true);
  assert.equal(lockChangedSinceClaim({ baseSha: 'same' }, 'same'), false);
  assert.equal(lockChangedSinceClaim({}, 'after'), false);
});

test('an active lock owner editing the source is not a compromised lock', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    lock: { held: true, owner: 'website-lane', changedSinceClaim: true },
  });
  assert.equal(board.cards.some((item) => item.id === 'lock-compromised'), false);
  assert.match(board.cards.find((item) => item.id === 'lock-held')?.detail || '', /source changed under active lock/);
});

test('fresh demand warm-inbound overrides stale pilot receipt', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    demand: {
      next: 'Review one overdue warm inbound',
      warmInbound: { freshness: { overdueActionCount: 1 } },
    },
    pilot: { warmInbound: { freshness: { overdueActionCount: 0 } } },
  });
  const card = board.cards.find((item) => item.id === 'warm-overdue');
  assert.equal(card?.title, 'Warm inbound overdue');
  assert.equal(card?.detail, 'Review one overdue warm inbound');
});

test('human-only outcome notes remain informational without becoming agent actions', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    demand: {
      next: 'Review overdue warm inbound',
      warmInbound: { freshness: {
        overdueActionCount: 1,
        overdueActionItems: [{ action: 'log call outcome when known' }],
      } },
    },
  });
  const card = board.cards.find((item) => item.id === 'warm-overdue');
  assert.equal(card?.kind, 'info');
  assert.equal(card?.pri, 3);
  assert.equal(card?.owner, 'system');
  assert.notEqual(board.headline.id, 'warm-overdue');
});

test('flagged demand drafts are never rendered ready', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    demand: {
      pending: 8,
      sentConfirmed: 0,
      drafts: { hygiene: { ok: false, ready: false, flagged: 5, checked: 8 } },
    },
  });
  const card = board.cards.find((item) => item.id === 'demand-drafts-blocked');
  assert.equal(card?.title, '5 of 8 demand drafts blocked by hygiene · 0 sent');
  assert.doesNotMatch(`${card?.id} ${card?.title}`, /drafts ready/i);
});

test('clean drafts remain informational until outbound delivery is authorized', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    demand: {
      pending: 8,
      sentConfirmed: 0,
      drafts: { hygiene: { ok: true, ready: true, clean: 8, checked: 8, stale: false } },
    },
  });
  const card = board.cards.find((item) => item.id === 'demand-drafts-ready');
  assert.equal(card?.kind, 'info');
  assert.equal(card?.owner, 'system');
  assert.notEqual(board.headline.id, 'demand-drafts-ready');
});

test('fresh ship prepare demotes an old blocked cycle to historical info', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: false, summary: 'shipped=false' },
    live: { ok: true },
    cycleWorkHealth: {
      at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      blocked: true,
      attested: false,
      domain: 'ship',
      verification: 'release-blocked',
    },
    shipPrepare: { at: new Date().toISOString(), ok: true, steps: Array(6).fill({ ok: true }) },
  });
  assert.equal(board.cards.some((item) => item.id === 'cycle-unhealthy'), false);
  assert.equal(board.cards.find((item) => item.id === 'cycle-historical')?.pri, 4);
});

test('fresh canonical truth suppresses stale ship-cycle blockage', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    cycleWorkHealth: {
      domain: 'ship',
      blocked: true,
      stale: true,
      ageSec: 901,
      verification: 'release-blocked',
    },
    formsAudit: { at: 'invalid', issues: [] },
  });
  assert.equal(board.cards.some((item) => item.id === 'cycle-unhealthy'), false);
  assert.equal(board.cards.some((item) => item.id === 'cycle-historical'), false);
});

test('publish lag DEBT elevates prepare-only multi-version lag (never auto-ship)', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true, summary: 'TRUTH PASS shipped=false prepareOnly' },
    live: { ok: true, foot: 'v802' },
    publishLag: {
      lagging: true,
      overdue: true,
      diskVer: '818',
      liveVer: '802',
      versionsAhead: 16,
      ageHours: 8.2,
      note: 'publish lag DEBT — needs exact current-request publish authorization (not auto-ship)',
    },
  });
  const debt = board.cards.find((item) => item.id === 'publish-lag-debt');
  assert.equal(debt?.pri, 1);
  assert.equal(debt?.kind, 'action');
  assert.equal(debt?.owner, 'unassigned');
  assert.equal(debt?.job, 'ship-prepare');
  assert.match(debt?.title || '', /Publish lag DEBT/);
  assert.match(debt?.detail || '', /current-request publish authorization|not auto-ship/);
  assert.match(board.headline?.id || '', /publish-lag-debt|truth/);
  const sealed = board.cards.find((item) => item.id === 'truth-green');
  assert.match(sealed?.title || '', /lag DEBT/);
});

test('publish lag DEBT with intentional siblings is watch/system (no agent thrash)', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true, summary: 'TRUTH PASS shipped=false prepareOnly lagDebt' },
    live: { ok: true, foot: 'v802' },
    publishLag: {
      lagging: true,
      overdue: true,
      diskVer: '818',
      liveVer: '802',
      versionsAhead: 16,
      ageHours: 8.2,
      note: 'publish lag DEBT — needs exact current-request publish authorization (not auto-ship)',
    },
    siblingDrift: {
      intentional: true,
      status: 'intentional-staged',
      summary: 'atlas:intentional-redesign · mapData:intentional-expand',
    },
  });
  const debt = board.cards.find((item) => item.id === 'publish-lag-debt');
  assert.equal(debt?.pri, 2);
  assert.equal(debt?.kind, 'watch');
  assert.equal(debt?.owner, 'system');
  assert.match(debt?.detail || '', /siblings intentional/);
  assert.match(debt?.detail || '', /atlas:intentional-redesign/);
});

test('newest fresh live observation wins without changing truth drift', () => {
  const now = Date.now();
  const olderFail = { at: new Date(now - 60_000).toISOString(), ok: false, error: 'fetch failed' };
  const newerPass = { at: new Date(now - 1_000).toISOString(), ok: true, foot: 'v683' };
  assert.equal(newestLiveObservation([olderFail, newerPass], now), newerPass);
  const newestFail = { at: new Date(now).toISOString(), ok: false, error: 'fetch failed' };
  assert.equal(newestLiveObservation([newerPass, newestFail], now), newestFail);

  const board = buildPriorityBoard({ truthEvidence: { green: false, summary: 'shipped=false' }, live: newerPass });
  assert.equal(board.cards.some((item) => item.id === 'live-down'), false);
  const staged = board.cards.find((item) => item.id === 'truth-awaiting-ship');
  assert.equal(staged?.kind, 'watch');
  assert.equal(staged?.owner, 'unassigned');
  assert.match(staged?.title || '', /publish not authorized/);
  assert.equal(staged?.job, 'ship-prepare');
});

test('fresh verified resume-upload friction becomes actionable', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    formsAudit: {
      at: new Date().toISOString(),
      issues: [{ issue: 'rich_resume_upload_unavailable' }],
    },
  });
  const card = board.cards.find((item) => item.id === 'talent-resume-upload-missing');
  assert.equal(card?.pri, 1);
  assert.equal(card?.kind, 'action');
  assert.match(card?.detail || '', /mobile and desktop/);
  assert.match(card?.cmd || '', /webflow change .*File Upload component/);
});

test('zero real pilots is honest information, not assigned agent work', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    demand: { pilotsFilled: 0 },
    formsAudit: { at: 'invalid', issues: [] },
  });
  const card = board.cards.find((item) => item.id === 'no-pilots');
  assert.equal(card?.kind, 'info');
  assert.equal(card?.owner, 'system');
  assert.notEqual(board.headline.id, 'no-pilots');
});

test('fresh standalone Webflow doctor supersedes stale nested receipt', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    webflow: { doctor: { at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), pass: false } },
    webflowDoctor: { at: new Date(Date.now() - 3 * 60 * 1000).toISOString(), pass: true, checks: [] },
    formsAudit: { at: 'invalid', issues: [] },
  });
  assert.equal(board.cards.some((item) => item.id === 'webflow-doctor-stale'), false);
  assert.equal(board.cards.find((item) => item.id === 'webflow-doctor-green')?.kind, 'ok');
});

test('fresh green site truth keeps a stale Webflow doctor informational', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    webflowDoctor: { at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), pass: true },
    formsAudit: { at: 'invalid', issues: [] },
  });
  const card = board.cards.find((item) => item.id === 'webflow-doctor-stale');
  assert.equal(card?.kind, 'info');
  assert.equal(card?.owner, 'system');
});

test('publish-gated sitemap failures do not become duplicate P1 agent work', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: false, summary: 'disk v778 · live v759 · shipped=false' },
    live: { ok: true },
    webflowDoctor: {
      at: new Date().toISOString(),
      pass: false,
      checks: [
        { name: 'live sitemap', ok: false },
        { name: 'robots advertises sitemap', ok: false },
      ],
    },
    formsAudit: { at: 'invalid', issues: [] },
  });
  assert.equal(board.cards.some((item) => item.id === 'webflow-doctor'), false);
  assert.equal(board.headline.id, 'truth-awaiting-ship');
});

test('prepare-only dead browser Events config stays informational', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    eventsOnline: {
      stale: false,
      public: true,
      needHeal: false,
      configPublished: false,
      websiteConfigReachable: false,
    },
    formsAudit: { at: 'invalid', issues: [] },
  });
  const card = board.cards.find((item) => item.id === 'events-config-stale');
  assert.equal(card?.pri, 3);
  assert.equal(card?.kind, 'info');
  assert.equal(card?.owner, 'system');
  assert.match(card?.title || '', /prepare-only/);
  assert.match(card?.detail || '', /publish not authorized|blockedBy|auth/i);
  assert.equal(card?.cmd, 'bin/dg events status');
  assert.notEqual(board.headline.id, 'events-config-stale');
});

test('events config card names pending-matches-local when staged', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    eventsOnline: {
      public: true,
      configPublished: false,
      prepareOnlyWebsiteConfig: true,
      websiteConfigReachable: false,
      pendingMatchesLocal: true,
      pendingApiBase: 'https://short-melons-push.loca.lt/api/events-bot',
      pendingBlockedBy: 'current-request auth + explicit --publish-config required (prepare-only)',
    },
    formsAudit: { at: 'invalid', issues: [] },
  });
  const card = board.cards.find((item) => item.id === 'events-config-stale');
  assert.equal(card?.pri, 3);
  assert.equal(card?.kind, 'info');
  assert.match(card?.title || '', /pending matches local/);
  assert.match(card?.detail || '', /pending matches local tunnel/);
  assert.match(card?.detail || '', /publish-config/);
});

test('preferred tunnel mismatch is informational while public is up', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    eventsOnline: {
      public: true,
      preferredTunnelMatch: false,
      tunnelUrl: 'https://sour-duck-97.loca.lt',
      preferredTunnelNote: 'Sticky loca preferred is demigod-events-bot.loca.lt; live host is sour-duck-97.loca.lt',
      prepareOnlyWebsiteConfig: true,
      websiteConfigReachable: false,
      configPublished: false,
    },
    formsAudit: { at: 'invalid', issues: [] },
  });
  const card = board.cards.find((item) => item.id === 'events-preferred-tunnel');
  assert.equal(card?.kind, 'info');
  assert.equal(card?.pri, 3);
  assert.equal(card?.owner, 'system');
  assert.match(card?.title || '', /preferred tunnel/);
  assert.match(card?.detail || '', /do not thrash heal/);
  assert.match(card?.detail || '', /Sticky loca preferred/);
});

test('CF quick tunnel preferred mismatch is expected P4 info', () => {
  const board = buildPriorityBoard({
    truthEvidence: { green: true },
    live: { ok: true },
    eventsOnline: {
      public: true,
      preferredTunnelMatch: false,
      tunnelUrl: 'https://sunday-reduce-hello-sci.trycloudflare.com',
      preferredTunnelNote:
        'Cloudflare quick tunnels assign random *.trycloudflare.com hostnames; preferredSubdomain is for loca.lt sticky only.',
      prepareOnlyWebsiteConfig: true,
      websiteConfigReachable: false,
      configPublished: false,
    },
    formsAudit: { at: 'invalid', issues: [] },
  });
  const card = board.cards.find((item) => item.id === 'events-preferred-tunnel');
  assert.equal(card?.kind, 'info');
  assert.equal(card?.pri, 4);
  assert.match(card?.title || '', /CF quick tunnel/);
  assert.match(card?.detail || '', /Cloudflare quick tunnels/);
});
