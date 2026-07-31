#!/usr/bin/env node
/**
 * demigod-call-note — Metaview/BrightHire-shaped manual structured notes (no bot).
 *
 * After a real call only: human-edited summary required. Optional attributes_touched
 * as free-text evidence (not ratings). Never auto-changes pair state or scores.
 *
 *   node demigod-call-note.mjs log --kind=intake|candidate_screen|debrief --summary="…"
 *        [--role=] [--cand=] [--pair=] [--attrs='[{"mustHaveId":"mh1","evidence":"…"}]']
 *   node demigod-call-note.mjs list [--role=] [--cand=]
 *   node demigod-call-note.mjs --selftest
 *
 * SoR: DEMIGOD-CALL-NOTES.json
 * Design: docs/die/research/VERTICAL-MECHANISM-DEEP-DIVE.md §7
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-CALL-NOTES.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const SCHEMA = 'demigod.call-note/1';
export const KINDS = ['intake', 'candidate_screen', 'debrief'];

function now() {
  return new Date().toISOString();
}

function load() {
  if (!fs.existsSync(STORE)) {
    return { schema: 'demigod.call-notes-store/1', updatedAt: null, notes: [] };
  }
  const j = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  if (!Array.isArray(j.notes)) j.notes = [];
  return j;
}

function save(doc) {
  doc.updatedAt = now();
  atomicWrite(STORE, `${JSON.stringify(doc, null, 2)}\n`, { mode: 0o600 });
}

export function assertCallNote(n) {
  if (!n || n.schema !== SCHEMA) throw new Error('call_note_schema');
  if (!KINDS.includes(n.kind)) throw new Error('call_note_kind');
  const summary = String(n.summary || '').trim();
  if (summary.length < 20 || summary.length > 4000) throw new Error('call_note_summary');
  if (!n.roleId && !n.candId && !n.pairId) throw new Error('call_note_anchor');
  if (n.attributesTouched != null) {
    if (!Array.isArray(n.attributesTouched)) throw new Error('call_note_attrs');
    for (const a of n.attributesTouched) {
      if (!a?.mustHaveId || String(a.evidence || '').trim().length < 8) {
        throw new Error('call_note_attr_evidence');
      }
    }
  }
  // Hard non-goals
  if ('score' in n || 'fitScore' in n || 'verdict' in n) throw new Error('call_note_no_score');
  if (n.autoChangedPair === true) throw new Error('call_note_no_auto_pair');
  if (!n.at || !Number.isFinite(Date.parse(n.at))) throw new Error('call_note_at');
  return true;
}

export function makeCallNote({
  kind,
  summary,
  roleId = null,
  candId = null,
  pairId = null,
  attributesTouched = null,
  rawTranscript = null,
  by = 'operator',
  at = null,
} = {}) {
  const n = {
    schema: SCHEMA,
    id: crypto.randomBytes(8).toString('hex'),
    kind: String(kind || ''),
    summary: String(summary || '').trim(),
    roleId: roleId ? String(roleId).trim() : null,
    candId: candId ? String(candId).trim() : null,
    pairId: pairId ? String(pairId).trim() : null,
    attributesTouched: Array.isArray(attributesTouched)
      ? attributesTouched.map((a) => ({
          mustHaveId: String(a.mustHaveId),
          evidence: String(a.evidence || '').trim().slice(0, 1000),
        }))
      : null,
    // Optional private transcript — never scored
    rawTranscript: rawTranscript ? String(rawTranscript).trim().slice(0, 50000) : null,
    by: String(by || 'operator').slice(0, 80),
    at: at || now(),
    autoChangedPair: false,
  };
  assertCallNote(n);
  return n;
}

export function appendCallNote(note) {
  assertCallNote(note);
  return withFileLock(`${STORE}.lock`, () => {
    const doc = load();
    doc.notes.push(note);
    if (doc.notes.length > 20000) doc.notes = doc.notes.slice(-20000);
    save(doc);
    return note;
  });
}

export function listCallNotes({ roleId = null, candId = null, pairId = null, limit = 50 } = {}) {
  let rows = load().notes || [];
  if (roleId) rows = rows.filter((n) => n.roleId === roleId);
  if (candId) rows = rows.filter((n) => n.candId === candId);
  if (pairId) rows = rows.filter((n) => n.pairId === pairId);
  return rows.slice(-Math.max(1, Math.min(500, limit | 0 || 50))).reverse();
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`call-note selftest: ${m}`);
  };
  const n = makeCallNote({
    kind: 'candidate_screen',
    roleId: 'role-demo',
    candId: 'cand-1',
    summary: 'Discussed multi-tenant shipping history; clear communicator; follow up on equity band.',
    attributesTouched: [{ mustHaveId: 'mh1', evidence: 'Described two multi-tenant SaaS launches' }],
  });
  assertCallNote(n);
  assert(n.autoChangedPair === false, 'no auto pair');
  let threw = false;
  try {
    makeCallNote({ kind: 'intake', summary: 'too short', roleId: 'r1' });
  } catch {
    threw = true;
  }
  assert(threw, 'summary min');
  threw = false;
  try {
    assertCallNote({ ...n, score: 9 });
  } catch {
    threw = true;
  }
  assert(threw, 'no score');
  threw = false;
  try {
    makeCallNote({ kind: 'debrief', summary: 'Long enough summary without any anchor id at all.' });
  } catch {
    threw = true;
  }
  assert(threw, 'needs anchor');
  console.log(JSON.stringify({ ok: true, selftest: 'call-note' }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest') || args[0] === 'selftest') {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-call-note.mjs log|list [--kind=] [--summary=] [--role=] [--cand=] [--pair=] [--json]
  log   append human-edited call note (summary ≥20 chars; never auto-changes pair)
  list  recent notes
Policy: Metaview-compatible — notes do not evaluate candidates or hire.`);
    return;
  }
  const get = (k) => {
    const eq = args.find((a) => a.startsWith(`--${k}=`));
    if (eq) return eq.slice(k.length + 3);
    const i = args.indexOf(`--${k}`);
    if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1];
    return null;
  };
  const json = args.includes('--json');
  const cmd = args.find((a) => !a.startsWith('-')) || 'list';

  if (cmd === 'log') {
    try {
      let attrs = null;
      if (get('attrs')) attrs = JSON.parse(get('attrs'));
      const note = makeCallNote({
        kind: get('kind') || 'candidate_screen',
        summary: get('summary'),
        roleId: get('role'),
        candId: get('cand'),
        pairId: get('pair'),
        attributesTouched: attrs,
        rawTranscript: get('transcript'),
        by: get('by') || 'operator',
      });
      appendCallNote(note);
      console.log(JSON.stringify({ ok: true, note }, null, json ? 2 : 0));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  const rows = listCallNotes({
    roleId: get('role'),
    candId: get('cand'),
    pairId: get('pair'),
    limit: Number(get('limit') || 50),
  });
  if (json) console.log(JSON.stringify({ ok: true, notes: rows }, null, 2));
  else {
    console.log(`# call-notes · ${rows.length}`);
    for (const n of rows) {
      console.log(
        `  ${n.at?.slice(0, 10)} · ${n.kind} · ${n.roleId || '—'} / ${n.candId || n.pairId || '—'} · ${n.summary.slice(0, 70)}`,
      );
    }
  }
}

if (isMain) main();
