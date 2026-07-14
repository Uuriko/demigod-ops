#!/usr/bin/env node
/**
 * demigod-next — single NEXT builder (control / dash / ship agree)
 *
 *   import { buildNext } from './demigod-next.mjs'
 *   node demigod-next.mjs [--json]
 *
 * Priority:
 *  1. Refresh truth if evidence not green
 *  2. If freeze ON + green → demand/human (no ship)
 *  3. If freeze OFF + not shipped → ship prepare/run
 *  4. Else orient home
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { refuseIfStale } from './demigod-evidence.mjs';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';

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
 * @returns {{ id: string, title: string, cmd: string, pri: number, mutate: boolean, freezeBlocks: boolean, reason: string, freeze: object, truthEvidence: object, versions: object }}
 */
export function buildNext({ truth = null, demand = null } = {}) {
  const freeze = freezeStatus();
  const te = refuseIfStale('truth');
  const truthFacts = truth || readJson(path.join(BUSY, 'truth.json'));
  const demandStatus = demand || readJson(path.join(BUSY, 'demand-status.json'));

  const versions = {
    disk: truthFacts?.foot?.ver ?? null,
    live: truthFacts?.live?.footVer ?? null,
    manifest: truthFacts?.manifest?.version ?? null,
  };

  const base = {
    freeze: { on: freeze.frozen, why: freeze.why },
    truthEvidence: {
      green: Boolean(te.green),
      reason: te.reason,
      runId: te.runId,
      summary: te.summary,
    },
    versions,
    fullyShipped: Boolean(truthFacts?.fullyShipped),
    driftExpected: Boolean(truthFacts?.driftExpected),
    at: new Date().toISOString(),
  };

  if (!te.green) {
    return {
      ...base,
      id: 'truth',
      title: 'Refresh truth evidence (not green/fresh)',
      cmd: 'bin/dg truth',
      pri: 0,
      mutate: false,
      freezeBlocks: false,
      reason: te.reason || 'no-evidence',
    };
  }

  if (freeze.frozen) {
    const pending = demandStatus?.queue?.pending;
    const top = demandStatus?.queue?.top3?.[0];
    const dmHint = top
      ? `Human DM: ${top.name} ${top.handle}`
      : pending != null
        ? `Demand: ${pending} pending DMs`
        : 'Run bin/dg demand status';
    return {
      ...base,
      id: 'demand-human',
      title: `No ship — freeze holds · ${dmHint}`,
      cmd: 'bin/dg demand status',
      pri: 0,
      mutate: false,
      freezeBlocks: true,
      reason: 'freeze-on-demand-first',
      demandNext: demandStatus?.next || null,
    };
  }

  if (truthFacts?.fullyShipped) {
    return {
      ...base,
      id: 'hold-green',
      title: 'Shipped + green — re-freeze + demand',
      cmd: 'node demigod-publish-freeze.mjs on --why post-ship',
      pri: 1,
      mutate: false,
      freezeBlocks: false,
      reason: 'fully-shipped',
    };
  }

  return {
    ...base,
    id: 'ship-prepare',
    title: 'Freeze OFF — prepare ship (disk≠live)',
    cmd: 'bin/dg ship prepare',
    pri: 1,
    mutate: false,
    freezeBlocks: false,
    reason: 'unfrozen-not-shipped',
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const n = buildNext();
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'next.json'), JSON.stringify(n, null, 2) + '\n');
  if (process.argv.includes('--json')) console.log(JSON.stringify(n, null, 2));
  else {
    console.log(`NEXT: ${n.title}`);
    console.log(`cmd:  ${n.cmd}`);
    console.log(`id:   ${n.id} · freeze=${n.freeze.on ? 'ON' : 'OFF'} · green=${n.truthEvidence.green}`);
    console.log(`ver:  disk=${n.versions.disk} live=${n.versions.live}`);
  }
}
