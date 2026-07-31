#!/usr/bin/env node
/**
 * demigod-structured-hiring — compose Ashby packet + Underdog batch + Gem rediscover.
 *
 * One operator view over the three technical product modules.
 *
 *   node demigod-structured-hiring.mjs status [--json]
 *   node demigod-structured-hiring.mjs desk --role=ID [--json]
 *   node demigod-structured-hiring.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPackets, loadNotes, projectForReview } from './demigod-role-packet.mjs';
import { rediscover } from './demigod-candidate-touch.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const OUT = path.join(BUSY, 'structured-hiring-status.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function loadBatchStore() {
  const p = path.join(ROOT, 'DEMIGOD-PILOT-BATCHES.json');
  if (!fs.existsSync(p)) return { batches: {} };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadTouchStore() {
  const p = path.join(ROOT, 'DEMIGOD-CANDIDATE-TOUCHES.json');
  if (!fs.existsSync(p)) return { touches: [] };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function batchActiveCount(b) {
  return (b?.candidates || []).filter((c) => !c.state || c.state === 'active').length;
}

export function buildStatus() {
  const packets = loadPackets();
  const notes = loadNotes();
  const batches = loadBatchStore();
  const touches = loadTouchStore();
  const packetList = Object.values(packets.packets || {});
  const noteList = Object.values(notes.notes || {});
  const batchList = Object.values(batches.batches || {});
  const touchList = touches.touches || [];

  return {
    schema: 'demigod.structured-hiring/1',
    at: new Date().toISOString(),
    inspiredBy: ['Ashby/Greenhouse scorecards', 'Underdog/Wellfound batch caps', 'Gem rediscovery'],
    counts: {
      packets: packetList.length,
      reviewNotes: noteList.length,
      batches: batchList.length,
      activeBatchSlots: batchList.reduce((s, b) => s + batchActiveCount(b), 0),
      touches: touchList.length,
    },
    packets: packetList.map((p) => ({
      roleId: p.roleId,
      title: p.title,
      stage: p.stage,
      mustHaves: p.mustHaves?.length,
      companyId: p.companyId,
      demo: p.demo === true,
    })),
    batches: batchList.map((b) => ({
      roleId: b.roleId,
      active: batchActiveCount(b),
      max: b.max,
      total: b.candidates?.length || 0,
    })),
    rediscoverTop: rediscover(touchList, { limit: 8 }),
    cmds: {
      packet: 'node demigod-role-packet.mjs list|init|note|project',
      batch: 'node demigod-pilot-batch.mjs open|add|terminal',
      touch: 'node demigod-candidate-touch.mjs log|rediscover',
      desk: 'node demigod-structured-hiring.mjs desk --role=ID',
    },
    policy: 'No fit score. Evidence-required ratings. Batch hard-cap 3 active. Rediscover from owned touches only.',
  };
}

/** Full desk for one role: packet + notes + batch + rediscover filtered. */
export function buildDesk(roleId) {
  const id = String(roleId || '').trim();
  if (!id) throw new Error('roleId required');
  const packet = loadPackets().packets[id] || null;
  const notes = Object.values(loadNotes().notes || {}).filter((n) => n.roleId === id);
  const batch = loadBatchStore().batches[id] || null;
  const touches = (loadTouchStore().touches || []).filter((t) => t.roleId === id || !t.roleId);
  const redis = rediscover(
    loadTouchStore().touches || [],
    { roleId: id, limit: 10 },
  );
  const projections = notes.map((n) =>
    packet ? projectForReview(packet, n) : { candId: n.candId, note: n, packet: null },
  );
  return {
    schema: 'demigod.structured-hiring-desk/1',
    at: new Date().toISOString(),
    roleId: id,
    packet,
    batch: batch
      ? {
          ...batch,
          active: batchActiveCount(batch),
        }
      : null,
    notes,
    projections,
    rediscover: redis,
    next: !packet
      ? `node demigod-role-packet.mjs init --role=${id} --title=… --outcome="…(≥20 chars)…"`
      : !batch
        ? `node demigod-pilot-batch.mjs open --role=${id}`
        : `node demigod-role-packet.mjs project --role=${id} --cand=…`,
  };
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`structured-hiring selftest: ${m}`);
  };
  const st = buildStatus();
  assert(st.schema === 'demigod.structured-hiring/1', 'schema');
  assert(st.counts && typeof st.counts.packets === 'number', 'counts');
  assert(Array.isArray(st.rediscoverTop), 'rediscover');
  assert(!('score' in st) && st.policy.includes('No fit score'), 'no score');
  // desk for demo if present
  if (st.packets[0]) {
    const d = buildDesk(st.packets[0].roleId);
    assert(d.roleId === st.packets[0].roleId, 'desk');
  }
  console.log(JSON.stringify({ ok: true, selftest: 'structured-hiring', packets: st.counts.packets }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log('usage: node demigod-structured-hiring.mjs status|desk [--role=] [--json]');
    return;
  }
  const json = args.includes('--json');
  const cmd = args.find((a) => !a.startsWith('-')) || 'status';
  let role = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--role' && args[i + 1]) role = args[++i];
    else if (args[i].startsWith('--role=')) role = args[i].slice(7);
  }

  if (cmd === 'desk') {
    if (!role) {
      console.error(JSON.stringify({ ok: false, error: '--role required' }));
      process.exit(1);
    }
    const desk = buildDesk(role);
    if (json) console.log(JSON.stringify(desk, null, 2));
    else {
      console.log(`# structured-hiring desk · ${desk.roleId}`);
      console.log(`  packet: ${desk.packet ? desk.packet.title : 'NONE'}`);
      console.log(
        `  batch: ${desk.batch ? `${desk.batch.active}/${desk.batch.max} active` : 'NONE'}`,
      );
      console.log(`  notes: ${desk.notes.length} · rediscover: ${desk.rediscover.length}`);
      console.log(`  next: ${desk.next}`);
    }
    return;
  }

  const st = buildStatus();
  fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
  atomicWrite(OUT, `${JSON.stringify(st, null, 2)}\n`, { mode: 0o600 });
  if (json) console.log(JSON.stringify(st, null, 2));
  else {
    console.log(`# structured-hiring · packets=${st.counts.packets} batches=${st.counts.batches} touches=${st.counts.touches}`);
    for (const p of st.packets) {
      console.log(`  packet ${p.roleId} · ${p.title} · musts=${p.mustHaves}`);
    }
    for (const b of st.batches) {
      console.log(`  batch  ${b.roleId} · ${b.active}/${b.max}`);
    }
    for (const h of st.rediscoverTop.slice(0, 5)) {
      console.log(`  rediscover ${h.candId} · touches=${h.touches} · roles=${h.roleHits}`);
    }
    console.log(`  receipt: ${OUT}`);
  }
}

if (isMain) main();
