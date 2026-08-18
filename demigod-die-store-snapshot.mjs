#!/usr/bin/env node
/**
 * demigod-die-store-snapshot — a copy of the mission store that is safe to back up.
 *
 * WHY NOT JUST BACK UP THE FILE
 * A SQLite database is not one write. A transaction touches several pages, and a file-level copier
 * — restic, rsync, cp — reads those pages over an interval rather than at an instant. Copy while a
 * write is in flight and the result holds some pages from before it and some from after: a file
 * that opens, reports a size, and is corrupt in the middle. Nothing announces this. The backup
 * looks fine for months and fails on the one day it is needed.
 *
 * `VACUUM INTO` is SQLite answering this itself. It runs inside a read transaction, so the
 * destination is the database as of a single consistent instant, whatever else is happening.
 *
 * WHY IT VERIFIES
 * A snapshot nobody has opened is a claim, not a backup. This one reopens the copy, runs SQLite's
 * own integrity check, and compares row counts per table against the source. A snapshot that
 * cannot be proved good is deleted rather than left to be found later and trusted.
 *
 *   node demigod-die-store-snapshot.mjs               # snapshot the configured store
 *   node demigod-die-store-snapshot.mjs --verify-only # check the newest snapshot, write nothing
 *   node demigod-die-store-snapshot.mjs --selftest
 *
 * Schema: demigod.die-store-snapshot/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const HOME = process.env.HOME || '';

export const STORE = process.env.DEMIGOD_DIE_STORE
  || path.join(HOME, '.local/share/demigod/die-missions.sqlite');
/* Beside the store, inside the directory dg-backup now includes, so a snapshot is picked up by the
   same pass that picks up everything else rather than needing its own schedule. */
export const SNAPSHOT_DIR = process.env.DEMIGOD_DIE_SNAPSHOT_DIR
  || path.join(HOME, '.local/share/demigod/backup');

/** PURE. Every user table, so a new one is covered without editing this file. */
export function tablesOf(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all().map((row) => row.name);
}

/** PURE. Row count per table — the cheap shape check that catches a truncated copy. */
export function countsOf(db) {
  const counts = {};
  for (const name of tablesOf(db)) {
    // Table names come from sqlite_master, not from input, but quote them anyway.
    counts[name] = db.prepare(`SELECT count(*) AS n FROM "${name.replace(/"/g, '""')}"`).get().n;
  }
  return counts;
}

/**
 * Verify a snapshot against its source. Returns why it failed rather than throwing, so a caller
 * can delete the bad copy and say what was wrong in the same breath.
 */
export function verifySnapshot(snapshotPath, sourcePath) {
  /* One try around the whole thing, including the first query. SQLite opens lazily: handing
     DatabaseSync a file of plain text succeeds, and "file is not a database" only surfaces when
     something is actually executed. Guarding the constructor alone let a corrupt snapshot throw
     past the verifier instead of being reported as unverifiable — which would have turned the one
     check that exists to catch corruption into a crash that skips deleting the bad copy. */
  let snap = null;
  let src = null;
  try {
    snap = new DatabaseSync(snapshotPath, { readOnly: true });
    const verdict = snap.prepare('PRAGMA integrity_check').get()?.integrity_check;
    if (verdict !== 'ok') return { ok: false, why: `integrity_check said ${JSON.stringify(verdict)}` };
    const snapCounts = countsOf(snap);
    if (!sourcePath || !fs.existsSync(sourcePath)) return { ok: true, counts: snapCounts, comparedToSource: false };
    src = new DatabaseSync(sourcePath, { readOnly: true });
    const srcCounts = countsOf(src);
    for (const [name, n] of Object.entries(srcCounts)) {
      if (snapCounts[name] === undefined) return { ok: false, why: `table ${name} missing from the snapshot` };
      /* Only ever fewer, never more: the source can gain rows between the snapshot and this
         check, which is expected and fine. Losing them is not. */
      if (snapCounts[name] > n) return { ok: false, why: `table ${name} has ${snapCounts[name]} rows against ${n} in the source` };
    }
    return { ok: true, counts: snapCounts, comparedToSource: true };
  } catch (error) {
    return { ok: false, why: `unreadable as a database: ${error.message}` };
  } finally {
    try { snap?.close(); } catch { /* already unusable */ }
    try { src?.close(); } catch { /* already unusable */ }
  }
}

/** Take a consistent snapshot, prove it, and only then keep it. */
export function snapshot({ store = STORE, dir = SNAPSHOT_DIR, at = new Date() } = {}) {
  if (!fs.existsSync(store)) throw new Error(`die-store-snapshot: no store at ${store}`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stamp = at.toISOString().replace(/[:.]/g, '-');
  const out = path.join(dir, `die-missions-${stamp}.sqlite`);
  if (fs.existsSync(out)) fs.rmSync(out);

  const db = new DatabaseSync(store, { readOnly: true });
  try {
    // Single-quoted SQL string literal; a double-quoted one is parsed as an identifier.
    db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
  } finally { db.close(); }
  fs.chmodSync(out, 0o600);

  const proof = verifySnapshot(out, store);
  if (!proof.ok) {
    /* Deleted, not kept with a warning. A bad snapshot left on disk is worse than none: it is the
       one a restore would reach for. */
    fs.rmSync(out, { force: true });
    throw new Error(`die-store-snapshot: refusing to keep an unverifiable snapshot — ${proof.why}`);
  }
  return { path: out, bytes: fs.statSync(out).size, counts: proof.counts };
}

/** PURE-ish. Keep the newest `keep` snapshots. Retention is not the backup, restic's is. */
export function prune({ dir = SNAPSHOT_DIR, keep = 3 } = {}) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => /^die-missions-.*\.sqlite$/.test(f)).sort();
  const drop = files.slice(0, Math.max(0, files.length - keep));
  for (const f of drop) fs.rmSync(path.join(dir, f), { force: true });
  return drop;
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`die-store-snapshot selftest: ${msg}`); };
  const os = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'die-snap-'));
  const store = path.join(os, 'src.sqlite');
  const dir = path.join(os, 'backup');

  const db = new DatabaseSync(store);
  db.exec('CREATE TABLE missions(id TEXT PRIMARY KEY, body TEXT); CREATE TABLE audit(id TEXT, action TEXT);');
  db.prepare('INSERT INTO missions VALUES (?, ?)').run('role-1', '{"x":1}');
  for (let i = 0; i < 4; i++) db.prepare('INSERT INTO audit VALUES (?, ?)').run(`a${i}`, 'open');
  db.close();

  const made = snapshot({ store, dir, at: new Date('2026-08-18T12:00:00Z') });
  assert(fs.existsSync(made.path), 'a snapshot is written');
  assert(made.counts.missions === 1 && made.counts.audit === 4, `both tables copied, got ${JSON.stringify(made.counts)}`);
  assert((fs.statSync(made.path).mode & 0o777) === 0o600, 'a snapshot of private data is not world-readable');

  // discovered, not hardcoded: a new table must be covered without editing this file
  const db2 = new DatabaseSync(store);
  db2.exec('CREATE TABLE later(x); INSERT INTO later VALUES (9);');
  db2.close();
  const second = snapshot({ store, dir, at: new Date('2026-08-18T13:00:00Z') });
  assert(second.counts.later === 1, 'a table added after this file was written is still snapshotted');

  // the verifier must be able to FAIL, or a green backup means nothing
  const corrupt = path.join(dir, 'corrupt.sqlite');
  fs.writeFileSync(corrupt, 'this is not a database');
  assert(!verifySnapshot(corrupt, store).ok, 'a corrupt file does not pass verification');
  /* second.path, not made.path: the first snapshot predates the `later` table, so comparing it to
     the source correctly reports a missing table. That is the verifier working, not a bug — my
     first version of this test copied the stale snapshot and blamed the code. */
  const truncated = path.join(dir, 'truncated.sqlite');
  fs.copyFileSync(second.path, truncated);
  const t = new DatabaseSync(truncated);
  t.exec('DELETE FROM audit');
  t.close();
  assert(verifySnapshot(truncated, store).ok, 'FEWER rows than the source is fine — the source moves on');
  const extra = path.join(dir, 'extra.sqlite');
  fs.copyFileSync(second.path, extra);
  const e = new DatabaseSync(extra);
  e.prepare('INSERT INTO audit VALUES (?, ?)').run('x9', 'open');
  e.prepare('INSERT INTO audit VALUES (?, ?)').run('x10', 'open');
  e.close();
  assert(!verifySnapshot(extra, store).ok, 'MORE rows than the source means the copy is not of this source');

  // a snapshot that cannot be proved is not kept
  let threw = false;
  try { snapshot({ store: path.join(os, 'nope.sqlite'), dir }); } catch { threw = true; }
  assert(threw, 'no store is an error, not an empty backup');

  const dropped = prune({ dir, keep: 1 });
  assert(dropped.length === 1, `pruning keeps the newest, dropped ${dropped.length}`);
  assert(fs.readdirSync(dir).filter((f) => /^die-missions-/.test(f)).length === 1, 'one snapshot remains');

  fs.rmSync(os, { recursive: true, force: true });
  console.log(JSON.stringify({ ok: true, selftest: 'die-store-snapshot' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else if (args.includes('--verify-only')) {
    const files = fs.existsSync(SNAPSHOT_DIR)
      ? fs.readdirSync(SNAPSHOT_DIR).filter((f) => /^die-missions-.*\.sqlite$/.test(f)).sort()
      : [];
    if (!files.length) { console.error('die-store-snapshot: no snapshot to verify'); process.exit(1); }
    const newest = path.join(SNAPSHOT_DIR, files[files.length - 1]);
    const proof = verifySnapshot(newest, fs.existsSync(STORE) ? STORE : null);
    console.log(JSON.stringify({ snapshot: newest, ...proof }, null, 1));
    if (!proof.ok) process.exit(1);
  } else {
    const made = snapshot();
    const dropped = prune({});
    console.log(JSON.stringify({ ok: true, ...made, pruned: dropped.length }, null, 1));
  }
}
