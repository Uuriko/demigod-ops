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
import {
  loadPackets,
  loadNotes,
  projectForReview,
  advanceStage,
  upsertPacket,
  debriefRoundup,
} from './demigod-role-packet.mjs';
import { rediscover, makeTouch, appendTouch } from './demigod-candidate-touch.mjs';
import {
  openBatch,
  addCandidate,
  upsertBatch,
  activeCount as batchActive,
} from './demigod-pilot-batch.mjs';
import { warmPaths, listPaths as listIntroPaths } from './demigod-intro-path.mjs';
import { listCallNotes } from './demigod-call-note.mjs';
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

function loadIntroStore() {
  const p = path.join(ROOT, 'DEMIGOD-INTRO-PATHS.json');
  if (!fs.existsSync(p)) return { paths: [] };
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
  const intros = loadIntroStore();
  const packetList = Object.values(packets.packets || {});
  const noteList = Object.values(notes.notes || {});
  const batchList = Object.values(batches.batches || {});
  const touchList = touches.touches || [];
  const pathList = intros.paths || [];
  const callNotes = listCallNotes({ limit: 500 });

  return {
    schema: 'demigod.structured-hiring/1',
    at: new Date().toISOString(),
    inspiredBy: [
      'Ashby/Greenhouse scorecards',
      'Underdog/Wellfound batch caps',
      'Gem rediscovery',
      'Affinity intro paths (manual)',
      'Metaview call notes (manual)',
      'Levels public job-post bands',
    ],
    counts: {
      packets: packetList.length,
      reviewNotes: noteList.length,
      batches: batchList.length,
      activeBatchSlots: batchList.reduce((s, b) => s + batchActiveCount(b), 0),
      touches: touchList.length,
      introPaths: pathList.length,
      callNotes: callNotes.length,
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
    warmPaths: warmPaths(pathList, { limit: 8 }),
    recentCallNotes: callNotes.slice(0, 5).map((n) => ({
      id: n.id,
      kind: n.kind,
      roleId: n.roleId,
      candId: n.candId,
      at: n.at,
      summary: String(n.summary || '').slice(0, 120),
    })),
    cmds: {
      packet: 'node demigod-role-packet.mjs list|init|note|project|stage|set-comp|set-plan',
      batch: 'node demigod-pilot-batch.mjs open|add|terminal',
      touch: 'node demigod-candidate-touch.mjs log|rediscover',
      intro: 'node demigod-intro-path.mjs log|list|warm',
      call: 'node demigod-call-note.mjs log|list',
      comp: 'node demigod-public-comp.mjs extract|apply --role= --url= --text=',
      desk: 'node demigod-structured-hiring.mjs desk --role=ID',
      shortlist: 'node demigod-structured-hiring.mjs shortlist --role=… --cand=… --why=…',
      pack: 'node demigod-structured-hiring.mjs pack',
    },
    policy:
      'No fit score. Evidence-required ratings. Batch hard-cap 3 active. Rediscover from owned touches only. Intro paths human-set (no mail scrape). Call notes never auto-change pairs. Comp only from public job-post quotes or founder_stated.',
  };
}

/** Pack desk snapshot for multi-agent / desktop handoff (no contacts). */
export function packHandoff(outDir = path.join(BUSY, 'structured-hiring-handoff')) {
  const st = buildStatus();
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(outDir, 0o700);
  } catch {
    /* */
  }
  const desks = (st.packets || []).map((p) => buildDesk(p.roleId));
  const payload = {
    schema: 'demigod.structured-hiring-handoff/1',
    at: st.at,
    status: st,
    desks,
    note: 'Technical structured-hiring pack. No contacts, scores, or send authority.',
  };
  atomicWrite(path.join(outDir, 'status.json'), `${JSON.stringify(payload, null, 2)}\n`, {
    mode: 0o600,
  });
  const readme = `# Structured hiring handoff

Packed at ${st.at}

| Surface | Count |
|---------|-------|
| packets | ${st.counts.packets} |
| notes | ${st.counts.reviewNotes} |
| batches | ${st.counts.batches} |
| touches | ${st.counts.touches} |

## CLI
\`\`\`bash
node demigod-structured-hiring.mjs status
node demigod-structured-hiring.mjs desk --role=ROLE_ID
node demigod-structured-hiring.mjs shortlist --role=… --cand=… --why="…"
\`\`\`

Inspired by Ashby scorecards, Underdog batch caps, Gem rediscovery — Demigod-owned, no fit score.
`;
  atomicWrite(path.join(outDir, 'README.md'), readme, { mode: 0o600 });
  return { ok: true, outDir, counts: st.counts, at: st.at };
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
  const companyId = packet?.companyId || null;
  const introWarm = warmPaths(loadIntroStore().paths || [], {
    company: companyId,
    limit: 8,
  });
  const introRecent = listIntroPaths({ company: companyId, limit: 8 });
  const calls = listCallNotes({ roleId: id, limit: 10 });
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
    introPaths: { warm: introWarm, recent: introRecent },
    callNotes: calls,
    debrief: packet ? debriefRoundup(packet, notes) : null,
    next: !packet
      ? `node demigod-role-packet.mjs init --role=${id} --title=… --outcome="…(≥20 chars)…"`
      : !batch
        ? `node demigod-pilot-batch.mjs open --role=${id}`
        : `node demigod-role-packet.mjs project --role=${id} --cand=…`,
  };
}

/**
 * Shortlist a candidate onto the Underdog-shaped batch for a role that has a packet.
 * Opens batch if missing. Logs a touch. Does not invent fit scores.
 */
export function shortlist({
  roleId,
  candId,
  why,
  openBatchIfMissing = true,
  logTouch = true,
} = {}) {
  const id = String(roleId || '').trim();
  const cand = String(candId || '').trim();
  const reason = String(why || '').trim();
  if (!id || !cand || reason.length < 4) throw new Error('roleId, candId, why(≥4) required');
  const packet = loadPackets().packets[id];
  if (!packet) throw new Error(`no_role_packet:${id} — init packet first`);

  let batch = loadBatchStore().batches[id] || null;
  if (!batch && openBatchIfMissing) {
    batch = openBatch(id, { max: 3 });
  }
  if (!batch) throw new Error('no_batch');
  let batchResult = { skipped: false };
  try {
    batch = addCandidate(batch, cand, reason);
    upsertBatch(batch);
    batchResult = { active: batchActive(batch), max: batch.max };
  } catch (e) {
    if (/batch_full/.test(String(e.message))) {
      batchResult = {
        error: 'batch_full',
        active: batchActive(batch),
        max: batch.max,
        hint: 'terminal a candidate: node demigod-pilot-batch.mjs terminal --role=… --cand=… --as=decline',
      };
    } else throw e;
  }

  let touch = null;
  if (logTouch && !batchResult.error) {
    touch = makeTouch({
      candId: cand,
      channel: 'review',
      roleId: id,
      note: reason.slice(0, 200),
    });
    appendTouch(touch);
  }

  // First successful shortlist advances brief_ready → reviewing (Ashby-shaped).
  let stage = { from: packet.stage, to: packet.stage, advanced: false };
  let packetOut = packet;
  if (!batchResult.error && packet.stage === 'brief_ready') {
    try {
      packetOut = advanceStage(packet, 'reviewing');
      upsertPacket(packetOut);
      stage = { from: 'brief_ready', to: 'reviewing', advanced: true };
    } catch {
      /* leave stage if transition blocked */
    }
  }

  return {
    ok: !batchResult.error,
    roleId: id,
    candId: cand,
    packetTitle: packetOut.title,
    batch: batchResult,
    touchId: touch?.id || null,
    stage,
    project: projectForReview(packetOut, null),
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
  assert(Array.isArray(st.warmPaths), 'warmPaths');
  assert(typeof st.counts.introPaths === 'number', 'introPaths count');
  assert(!('score' in st) && st.policy.includes('No fit score'), 'no score');
  // desk for demo if present
  if (st.packets[0]) {
    const d = buildDesk(st.packets[0].roleId);
    assert(d.roleId === st.packets[0].roleId, 'desk');
    assert(d.introPaths && Array.isArray(d.introPaths.warm), 'desk intro');
  }
  console.log(
    JSON.stringify({
      ok: true,
      selftest: 'structured-hiring',
      packets: st.counts.packets,
      introPaths: st.counts.introPaths,
    }),
  );
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest') || args[0] === 'selftest') {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-structured-hiring.mjs status|desk|shortlist|pack [--role=] [--cand=] [--why=] [--json]
  shortlist  add cand to role batch (requires packet); logs touch; hard-caps active=3
  pack       write /tmp/dg-busy/structured-hiring-handoff/`);
    return;
  }
  const json = args.includes('--json');
  const cmd = args.find((a) => !a.startsWith('-')) || 'status';
  let role = null;
  let cand = null;
  let why = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--role' && args[i + 1]) role = args[++i];
    else if (args[i].startsWith('--role=')) role = args[i].slice(7);
    else if (args[i] === '--cand' && args[i + 1]) cand = args[++i];
    else if (args[i].startsWith('--cand=')) cand = args[i].slice(7);
    else if (args[i] === '--why' && args[i + 1]) why = args[++i];
    else if (args[i].startsWith('--why=')) why = args[i].slice(6);
  }

  if (cmd === 'shortlist') {
    try {
      const out = shortlist({ roleId: role, candId: cand, why });
      console.log(JSON.stringify(out, null, 2));
      process.exit(out.ok ? 0 : 1);
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  if (cmd === 'pack') {
    const out = packHandoff();
    console.log(JSON.stringify(out, null, 2));
    return;
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
    console.log(
      `# structured-hiring · packets=${st.counts.packets} batches=${st.counts.batches} touches=${st.counts.touches} intros=${st.counts.introPaths} calls=${st.counts.callNotes}`,
    );
    for (const p of st.packets) {
      console.log(`  packet ${p.roleId} · ${p.title} · musts=${p.mustHaves}${p.stage ? ` · ${p.stage}` : ''}`);
    }
    for (const b of st.batches) {
      console.log(`  batch  ${b.roleId} · ${b.active}/${b.max}`);
    }
    for (const h of st.rediscoverTop.slice(0, 5)) {
      console.log(`  rediscover ${h.candId} · touches=${h.touches} · roles=${h.roleHits}`);
    }
    for (const w of (st.warmPaths || []).slice(0, 5)) {
      console.log(
        `  warm ${w.bestStrength} · ${w.toCand || w.toCompany} · paths=${w.paths}`,
      );
    }
    console.log(`  receipt: ${OUT}`);
  }
}

if (isMain) main();
