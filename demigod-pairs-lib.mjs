#!/usr/bin/env node
/**
 * Canonical pair ledger — roleId:candidateId mutual-yes / review state.
 * Not the public board. Freeze-safe local SoR for matching.
 *
 * CLI:
 *   node demigod-pairs-lib.mjs list
 *   node demigod-pairs-lib.mjs propose --role <id> --cand <id> [--score n] [--why "..."]
 *   node demigod-pairs-lib.mjs review <pairId> --decision approve|reject|defer
 *   node demigod-pairs-lib.mjs consent <pairId> --side founder|candidate
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
export const PAIRS_PATH = path.join(ROOT, 'DEMIGOD-PAIRS.json');
export const PAIRS_LOCK = path.join(ROOT, 'DEMIGOD-PAIRS.json.lock');

export function pairId(roleId, candId) {
  const a = String(roleId || '').trim();
  const b = String(candId || '').trim();
  // order-independent
  const [x, y] = [a, b].sort();
  return crypto.createHash('sha256').update(`${x}|${y}`).digest('hex').slice(0, 16);
}

export function loadPairs() {
  try {
    return JSON.parse(fs.readFileSync(PAIRS_PATH, 'utf8'));
  } catch {
    return { at: new Date().toISOString(), pairs: {} };
  }
}

function savePairs(store) {
  store.at = new Date().toISOString();
  atomicWrite(PAIRS_PATH, JSON.stringify(store, null, 2) + '\n');
  return store;
}

export function listPairs({ state = null, limit = 50, includeSample = false } = {}) {
  const store = loadPairs();
  let rows = Object.values(store.pairs || {});
  if (!includeSample) rows = rows.filter((p) => p.sample !== true);
  if (state) rows = rows.filter((p) => p.state === state);
  rows.sort((a, b) => String(b.updatedAt || b.at).localeCompare(String(a.updatedAt || a.at)));
  return rows.slice(0, limit);
}

export function getPair(id) {
  const store = loadPairs();
  return store.pairs?.[id] || null;
}

export function proposePair({ roleId, candId, score = null, reasons = [], actor = 'agent' } = {}) {
  if (!roleId || !candId) throw new Error('roleId and candId required');
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const id = pairId(roleId, candId);
    const prev = store.pairs[id];
    const now = new Date().toISOString();
    const pair = prev || {
      pairId: id,
      roleId: String(roleId),
      candId: String(candId),
      state: 'proposed',
      score: null,
      reasons: [],
      mutual: { founder: false, candidate: false },
      history: [],
      at: now,
    };
    pair.score = score != null ? Number(score) : pair.score;
    if (reasons?.length) pair.reasons = reasons;
    pair.updatedAt = now;
    pair.history = [
      ...(pair.history || []),
      { at: now, actor, event: 'propose', state: pair.state },
    ].slice(-40);
    store.pairs[id] = pair;
    savePairs(store);
    return pair;
  });
}

export function reviewPair(id, { decision, actor = 'agent', note = '' } = {}) {
  const d = String(decision || '').toLowerCase();
  if (!['approve', 'reject', 'defer'].includes(d)) throw new Error('decision must be approve|reject|defer');
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const pair = store.pairs?.[id];
    if (!pair) throw new Error('pair_not_found');
    const now = new Date().toISOString();
    const map = { approve: 'approved', reject: 'rejected', defer: 'deferred' };
    pair.state = map[d];
    pair.reviewNote = note || pair.reviewNote;
    pair.reviewedAt = now;
    pair.reviewedBy = actor;
    pair.updatedAt = now;
    pair.history = [
      ...(pair.history || []),
      { at: now, actor, event: 'review', state: pair.state, note: note || undefined },
    ].slice(-40);
    store.pairs[id] = pair;
    savePairs(store);
    return pair;
  });
}

export function consentPair(id, { side, actor = 'agent' } = {}) {
  const s = String(side || '').toLowerCase();
  if (s !== 'founder' && s !== 'candidate') throw new Error('side must be founder|candidate');
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const pair = store.pairs?.[id];
    if (!pair) throw new Error('pair_not_found');
    const now = new Date().toISOString();
    pair.mutual = pair.mutual || { founder: false, candidate: false };
    pair.mutual[s] = true;
    pair.updatedAt = now;
    if (pair.mutual.founder && pair.mutual.candidate) {
      pair.state = pair.state === 'rejected' ? pair.state : 'mutual_yes';
    }
    pair.history = [
      ...(pair.history || []),
      { at: now, actor, event: 'consent', side: s, state: pair.state },
    ].slice(-40);
    store.pairs[id] = pair;
    savePairs(store);
    return pair;
  });
}

/** Drop selftest / fixture pairs (keeps real ops rows). */
export function prunePairs({ selftest = true, sample = false, dryRun = false } = {}) {
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const before = Object.keys(store.pairs || {}).length;
    const removed = [];
    for (const [id, p] of Object.entries(store.pairs || {})) {
      const isSelf =
        selftest &&
        (/^role-t[a-z0-9]+-/i.test(p.roleId || '') ||
          /^cand-t[a-z0-9]+-/i.test(p.candId || '') ||
          (p.history || []).some((h) => h.actor === 'selftest'));
      const isSample = sample && p.sample;
      if (isSelf || isSample) {
        removed.push(id);
        if (!dryRun) delete store.pairs[id];
      }
    }
    if (!dryRun && removed.length) savePairs(store);
    return { before, removed: removed.length, ids: removed.slice(0, 40), dryRun };
  });
}

/** Seed demo pairs from board sample roles + synthetic cand ids (freeze-safe fixtures) */
function seedFixturePairs() {
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const now = new Date().toISOString();
    const fixtures = [
      { roleId: 'role-seed-pm', candId: 'cand-seed-a', score: 0.72, reasons: ['skills overlap', 'SF bay'] },
      { roleId: 'role-seed-pm', candId: 'cand-seed-b', score: 0.61, reasons: ['partial stack'] },
      { roleId: 'role-seed-design', candId: 'cand-seed-c', score: 0.8, reasons: ['portfolio fit'] },
    ];
    for (const f of fixtures) {
      const id = pairId(f.roleId, f.candId);
      if (store.pairs[id]) continue;
      store.pairs[id] = {
        pairId: id,
        roleId: f.roleId,
        candId: f.candId,
        state: 'proposed',
        score: f.score,
        reasons: f.reasons,
        mutual: { founder: false, candidate: false },
        history: [{ at: now, actor: 'fixture', event: 'propose', state: 'proposed' }],
        at: now,
        updatedAt: now,
        sample: true,
      };
    }
    savePairs(store);
    return store;
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (n) => {
    const i = rest.indexOf(n);
    return i >= 0 ? rest[i + 1] : null;
  };
  try {
    if (cmd === 'list') {
      console.log(
        JSON.stringify(
          { at: new Date().toISOString(), pairs: listPairs({ includeSample: rest.includes('--include-sample') }) },
          null,
          2,
        ),
      );
    } else if (cmd === 'seed') {
      console.log(JSON.stringify(seedFixturePairs(), null, 2));
    } else if (cmd === 'propose') {
      console.log(
        JSON.stringify(
          proposePair({
            roleId: flag('--role'),
            candId: flag('--cand'),
            score: flag('--score'),
            reasons: (flag('--why') || '').split('|').filter(Boolean),
          }),
          null,
          2,
        ),
      );
    } else if (cmd === 'review') {
      const id = rest[0];
      console.log(JSON.stringify(reviewPair(id, { decision: flag('--decision'), note: flag('--note') || '' }), null, 2));
    } else if (cmd === 'consent') {
      console.log(JSON.stringify(consentPair(rest[0], { side: flag('--side') }), null, 2));
    } else if (cmd === 'prune') {
      console.log(
        JSON.stringify(
          prunePairs({
            selftest: !rest.includes('--keep-selftest'),
            sample: rest.includes('--sample'),
            dryRun: rest.includes('--dry-run'),
          }),
          null,
          2,
        ),
      );
    } else {
      console.log('usage: list|seed|propose|review|consent|prune');
      process.exit(1);
    }
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  }
}
