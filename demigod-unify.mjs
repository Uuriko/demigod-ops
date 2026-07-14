#!/usr/bin/env node
/**
 * demigod-unify — ONE agent/human orientation snapshot
 *
 *   bin/dg unify [--json] [--md]
 *   curl http://127.0.0.1:9878/api/unify
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { buildNext } from './demigod-next.mjs';
import { refuseIfStale, listEvidence } from './demigod-evidence.mjs';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { tail as ledgerTail } from './demigod-version-ledger.mjs';
import { writeJsonAuto } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const DASH = process.env.DEMIGOD_DASH || 'http://127.0.0.1:9878';

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export async function buildUnify({ includeTools = true } = {}) {
  const freeze = freezeStatus();
  const truthEv = refuseIfStale('truth');
  const reviewEv = refuseIfStale('review');
  const truth = readJson(path.join(BUSY, 'truth.json'));
  const demand = readJson(path.join(BUSY, 'demand-status.json'));
  const ship = readJson(path.join(BUSY, 'ship-status.json')) || readJson(path.join(BUSY, 'ship-latest.json'));
  const lock = readJson(path.join(BUSY, 'foot-lock.json'));
  const next = buildNext({ truth, demand });

  let tools = [];
  if (includeTools) {
    try {
      const reg = await import('./demigod-tools-registry.mjs');
      tools = (reg.TOOLS || [])
        .filter((t) => t.hot)
        .slice(0, 24)
        .map((t) => ({
          id: t.id,
          name: t.name,
          cmd: t.cmd,
          group: t.group,
          mutate: !!t.mutate,
          alias: t.alias || null,
        }));
    } catch {
      tools = [
        { id: 'truth', name: 'Truth', cmd: 'bin/dg truth', group: 'session', hot: true },
        { id: 'next-canon', name: 'NEXT', cmd: 'bin/dg next-canon', group: 'session', hot: true },
        { id: 'demand', name: 'Demand', cmd: 'bin/dg demand status', group: 'session', hot: true },
        { id: 'ship', name: 'Ship', cmd: 'bin/dg ship status', group: 'ship', hot: true },
      ];
    }
  }

  const exp = lock?.expiresAt && Date.parse(lock.expiresAt) < Date.now();
  const unify = {
    schema: 'demigod.unify/1',
    at: new Date().toISOString(),
    product: 'Demigod Control',
    freeze: { on: freeze.frozen, why: freeze.why },
    next: {
      id: next.id,
      title: next.title,
      cmd: next.cmd,
      pri: next.pri,
      mutate: next.mutate,
      freezeBlocks: next.freezeBlocks,
      reason: next.reason,
      versions: next.versions,
    },
    truthEvidence: {
      green: Boolean(truthEv.green),
      reason: truthEv.reason,
      runId: truthEv.runId,
      summary: truthEv.summary,
      endedAt: truthEv.endedAt,
    },
    reviewEvidence: {
      green: Boolean(reviewEv.green),
      reason: reviewEv.reason,
      runId: reviewEv.runId,
    },
    truth: truth
      ? {
          pass: truth.pass,
          diskVer: truth.foot?.ver,
          liveVer: truth.live?.footVer,
          driftExpected: truth.driftExpected,
          fullyShipped: truth.fullyShipped,
          summary: truth.summaryLine,
        }
      : null,
    demand: demand
      ? {
          pending: demand.queue?.pending,
          sentConfirmed: demand.dms?.sentConfirmed,
          pilotsFilled: demand.pilots?.realFilled,
          top3: demand.queue?.top3 || [],
          next: demand.next,
        }
      : null,
    ship: ship
      ? {
          stage: ship.stage,
          shipped: ship.shipped,
          nextCanon: ship.nextCanon || null,
          facts: ship.facts || null,
        }
      : null,
    lock: {
      held: Boolean(lock?.owner && !exp),
      owner: exp ? null : lock?.owner || null,
      expiresAt: lock?.expiresAt || null,
    },
    ledger: ledgerTail(8),
    evidence: listEvidence({ limit: 12 }),
    toolsHot: tools,
    links: {
      ui: `${DASH}/`,
      unify: `${DASH}/api/unify`,
      next: `${DASH}/api/next`,
      truth: `${DASH}/api/truth`,
      status: `${DASH}/api/status?slim=1`,
      tools: `${DASH}/api/tools`,
      control: `${DASH}/api/control`,
      brief: `${DASH}/api/agent-brief`,
    },
    cli: {
      spine: ['bin/dg truth', 'bin/dg next-canon', 'bin/dg demand status', 'bin/dg ship status', 'bin/dg unify'],
      assertSame: 'bin/dg next-canon --assert-same',
      selftest: 'node demigod-tools-os-selftest.mjs && node demigod-unify-selftest.mjs',
    },
    rules: [
      'Green only from refuseIfStale(truth) pass+fresh',
      'Single NEXT from demigod-next (no dual NEXT)',
      'Freeze ON blocks ship mutators',
      'Never invent pilots or SENT-CONFIRMED',
    ],
  };

  try {
    writeJsonAuto(path.join(BUSY, 'unify.json'), unify);
  } catch {
    /* */
  }
  return unify;
}

export function toMarkdown(u) {
  return [
    `# Demigod Unify ${u.at}`,
    '',
    '## NEXT',
    `- **${u.next.title}**`,
    `- \`${u.next.cmd}\``,
    `- id=${u.next.id} freeze=${u.freeze.on ? 'ON' : 'OFF'} green=${u.truthEvidence.green}`,
    '',
    '## Truth',
    `- ${u.truth?.summary || u.truthEvidence.summary || '—'}`,
    `- evidence: ${u.truthEvidence.reason} ${u.truthEvidence.runId || ''}`,
    '',
    '## Demand',
    u.demand
      ? `- pending ${u.demand.pending} · SENT-CONFIRMED ${u.demand.sentConfirmed} · pilots ${u.demand.pilotsFilled}`
      : '- (run bin/dg demand status)',
    '',
    '## Ship',
    u.ship ? `- stage ${u.ship.stage} shipped=${u.ship.shipped}` : '- (no ship-status)',
    '',
    '## Hot tools',
    ...(u.toolsHot || []).slice(0, 12).map((t) => `- ${t.id}: \`${t.cmd}\``),
    '',
    '## Links',
    `- UI ${u.links.ui}`,
    `- API ${u.links.unify}`,
    '',
    '## CLI spine',
    ...u.cli.spine.map((c) => `- \`${c}\``),
    '',
  ].join('\n');
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const asJson = process.argv.includes('--json');
  const u = await buildUnify();
  if (asJson) {
    const pretty = process.env.DEMIGOD_JSON_PRETTY === '1';
    console.log(pretty ? JSON.stringify(u, null, 2) : JSON.stringify(u));
  } else {
    process.stdout.write(toMarkdown(u));
  }
}
