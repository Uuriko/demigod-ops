#!/usr/bin/env node
/**
 * demigod-candidate-touch — Gem-shaped owned-history rediscovery (no fit score).
 *
 * Append-only touch log; rediscover prioritizes recency + channel weight + optional role match.
 * Never invents contacts or global scores.
 *
 *   node demigod-candidate-touch.mjs log --cand=ID --channel=dm|email|intro|review|note [--role=] [--outcome=] [--note=]
 *   node demigod-candidate-touch.mjs list [--cand=]
 *   node demigod-candidate-touch.mjs rediscover [--role=] [--limit=10]
 *   node demigod-candidate-touch.mjs --selftest
 *
 * SoR: DEMIGOD-CANDIDATE-TOUCHES.json
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-CANDIDATE-TOUCHES.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const SCHEMA = 'demigod.candidate-touch/1';
export const CHANNELS = ['dm', 'email', 'intro', 'review', 'note', 'call'];

function now() {
  return new Date().toISOString();
}

function load() {
  if (!fs.existsSync(STORE)) {
    return { schema: 'demigod.candidate-touches-store/1', updatedAt: null, touches: [] };
  }
  const j = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  if (!Array.isArray(j.touches)) j.touches = [];
  return j;
}

function save(doc) {
  doc.updatedAt = now();
  atomicWrite(STORE, `${JSON.stringify(doc, null, 2)}\n`, { mode: 0o600 });
}

export function assertTouch(t) {
  if (!t || t.schema !== SCHEMA) throw new Error('touch_schema');
  if (!String(t.candId || '').trim()) throw new Error('touch_candId');
  if (!CHANNELS.includes(t.channel)) throw new Error('touch_channel');
  if (!t.at || !Number.isFinite(Date.parse(t.at))) throw new Error('touch_at');
  if (t.note != null && String(t.note).length > 2000) throw new Error('touch_note_long');
  return true;
}

export function makeTouch({
  candId,
  channel,
  roleId = null,
  outcome = null,
  note = null,
  at = null,
} = {}) {
  const t = {
    schema: SCHEMA,
    id: crypto.randomBytes(8).toString('hex'),
    candId: String(candId || '').trim(),
    channel,
    roleId: roleId ? String(roleId).trim() : null,
    outcome: outcome ? String(outcome).trim().slice(0, 80) : null,
    note: note ? String(note).trim().slice(0, 2000) : null,
    at: at || now(),
  };
  assertTouch(t);
  return t;
}

export function appendTouch(touch) {
  assertTouch(touch);
  return withFileLock(`${STORE}.lock`, () => {
    const doc = load();
    doc.touches.push(touch);
    // keep last 50k touches
    if (doc.touches.length > 50000) doc.touches = doc.touches.slice(-50000);
    save(doc);
    return touch;
  });
}

const CHANNEL_W = { intro: 5, review: 4, call: 4, email: 3, dm: 2, note: 1 };

/**
 * Outcomes that withdraw consent. A candidate whose most recent touch ended this way is never
 * re-surfaced, regardless of how warm the history looks.
 *
 * This was recorded and then ignored: `lastOutcome` existed, the selftest asserted it was "retained
 * for suppression", and nothing suppressed on it — `rediscover`'s only caller (the CLI below)
 * passes no `suppress` set at all, so an opted-out candidate ranked normally, and ranked FIRST if
 * they had role hits. Rediscovery over consented history is the one mechanism here that beats a
 * bought list precisely because the person agreed to be contacted; re-opening someone who asked us
 * to stop is the single thing that would make it worth less than a bought list.
 *
 * Deliberately narrow. It does NOT reuse demigod-lead-collect's SUPPRESSED_STATUSES, which also
 * carries `cold`, `rejected`, `disqualified` and `fell_through` — those are exactly the people
 * rediscovery exists to re-open. Only a withdrawal of consent is terminal.
 */
export const CONSENT_WITHDRAWN = /\b(opt(?:ed)?[\s_-]?out|unsubscrib\w*|do[\s_-]?not[\s_-]?contact|dnc)\b/i;

/** True when this candidate's most recent recorded outcome withdrew consent. */
export function isConsentWithdrawn(outcome) {
  return CONSENT_WITHDRAWN.test(String(outcome || ''));
}

/**
 * Rediscover: group by candId, rank without a global fit score.
 * Prefer same roleId matches, then recency, then channel weight, then touch count.
 */
export function rediscover(touches, { roleId = null, limit = 10, suppress = new Set() } = {}) {
  const by = new Map();
  for (const t of touches || []) {
    if (!t?.candId || suppress.has(t.candId)) continue;
    const g = by.get(t.candId) || {
      candId: t.candId,
      touches: 0,
      lastAt: null,
      channels: new Set(),
      roleHits: 0,
      lastNote: null,
      lastOutcome: null,
      consentWithdrawn: false,
      scoreParts: { recency: 0, channel: 0, role: 0, volume: 0 },
    };
    g.touches += 1;
    g.channels.add(t.channel);
    // Sticky, not "most recent": consent does not come back because someone later logged a note.
    // Keying this off lastOutcome would silently un-suppress the candidate on the next touch.
    if (isConsentWithdrawn(t.outcome)) g.consentWithdrawn = true;
    if (roleId && t.roleId === roleId) g.roleHits += 1;
    if (!g.lastAt || Date.parse(t.at) > Date.parse(g.lastAt)) {
      g.lastAt = t.at;
      g.lastNote = t.note || g.lastNote;
      g.lastOutcome = t.outcome || null;
    }
    by.set(t.candId, g);
  }
  const nowMs = Date.now();
  const rows = [...by.values()].filter((g) => !g.consentWithdrawn).map((g) => {
    const ageDays = Math.max(0, (nowMs - Date.parse(g.lastAt)) / 864e5);
    // Soft recency: fresher is better; not a fit score — ranking aid only, never exported as "score"
    const recency = Math.max(0, 30 - ageDays);
    let channel = 0;
    for (const c of g.channels) channel += CHANNEL_W[c] || 1;
    const role = g.roleHits * 10;
    const volume = Math.min(g.touches, 10);
    const rankKey = role * 1000 + recency * 10 + channel + volume;
    return {
      candId: g.candId,
      touches: g.touches,
      lastAt: g.lastAt,
      roleHits: g.roleHits,
      channels: [...g.channels],
      lastNote: g.lastNote,
      lastOutcome: g.lastOutcome,
      rankKey, // internal sort only
      fitScore: null,
    };
  });
  rows.sort((a, b) => b.rankKey - a.rankKey || a.candId.localeCompare(b.candId));
  return rows.slice(0, Math.max(1, Math.min(50, limit))).map(({ rankKey, ...rest }) => rest);
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`candidate-touch selftest: ${m}`);
  };
  const t1 = makeTouch({
    candId: 'c-a',
    channel: 'dm',
    roleId: 'role-1',
    note: 'first touch',
    at: '2026-07-01T00:00:00.000Z',
  });
  const t2 = makeTouch({
    candId: 'c-a',
    channel: 'intro',
    roleId: 'role-1',
    note: 'intro made',
    outcome: 'opt_out',
    at: '2026-07-20T00:00:00.000Z',
  });
  const t3 = makeTouch({
    candId: 'c-b',
    channel: 'note',
    at: '2026-07-25T00:00:00.000Z',
  });
  assertTouch(t1);
  // t2 records opt_out for c-a. The warmest-looking history in the set is exactly the one that
  // must not surface — this assertion used to say "role hit ranks first" and c-a ranked first
  // WITH its opt_out, which is the bug: the outcome was retained and never acted on.
  const hits = rediscover([t1, t2, t3], { roleId: 'role-1', limit: 10 });
  assert(!hits.some((h) => h.candId === 'c-a'), 'a candidate who opted out is never re-surfaced');
  assert(hits.length === 1 && hits[0].candId === 'c-b', 'the remaining candidate still ranks');
  assert(hits[0].fitScore === null, 'no fit score');

  // Consent withdrawal is sticky. Logging any later touch must not un-suppress.
  const t4 = makeTouch({ candId: 'c-a', channel: 'note', note: 'saw them at a meetup', at: '2026-08-01T00:00:00.000Z' });
  assert(!rediscover([t1, t2, t4], { roleId: 'role-1' }).some((h) => h.candId === 'c-a'), 'a later note does not restore consent');
  assert(isConsentWithdrawn('opted out via email') && isConsentWithdrawn('unsubscribed'), 'withdrawal phrasings match');
  assert(!isConsentWithdrawn('rejected') && !isConsentWithdrawn('fell through') && !isConsentWithdrawn(null),
    'not-placed is not withdrawal — those are exactly who rediscovery is for');

  // Role hits still drive ranking among candidates who have not withdrawn.
  const ranked = rediscover([makeTouch({ candId: 'c-c', channel: 'dm', at: '2026-07-02T00:00:00.000Z' }), t3,
    makeTouch({ candId: 'c-d', channel: 'review', roleId: 'role-1', at: '2026-07-02T00:00:00.000Z' })], { roleId: 'role-1' });
  assert(ranked[0].candId === 'c-d' && ranked[0].roleHits === 1, 'role hit ranks first');
  let threw = false;
  try {
    makeTouch({ candId: 'x', channel: 'linkedin' });
  } catch {
    threw = true;
  }
  assert(threw, 'bad channel');
  console.log(JSON.stringify({ ok: true, selftest: 'candidate-touch' }));
}

function parseArgs(argv) {
  const o = { cmd: 'list', flags: {} };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && a.includes('=')) {
      const [k, ...v] = a.slice(2).split('=');
      o.flags[k] = v.join('=');
    } else if (a.startsWith('--') && argv[i + 1] && !argv[i + 1].startsWith('-')) {
      o.flags[a.slice(2)] = argv[++i];
    } else if (!a.startsWith('-')) rest.push(a);
  }
  if (rest[0]) o.cmd = rest[0];
  return o;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-candidate-touch.mjs log|list|rediscover [--cand=] [--channel=] [--role=] [--limit=10]`);
    return;
  }
  const { cmd, flags } = parseArgs(args);

  if (cmd === 'log') {
    try {
      const t = makeTouch({
        candId: flags.cand,
        channel: flags.channel || 'note',
        roleId: flags.role || null,
        outcome: flags.outcome || null,
        note: flags.note || null,
      });
      appendTouch(t);
      console.log(JSON.stringify({ ok: true, id: t.id, path: STORE }));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  if (cmd === 'list') {
    const doc = load();
    let touches = doc.touches || [];
    if (flags.cand) touches = touches.filter((t) => t.candId === flags.cand);
    touches = touches.slice(-30);
    console.log(`# candidate-touches · showing ${touches.length} (of ${doc.touches?.length || 0})`);
    for (const t of touches) {
      console.log(`- ${t.at.slice(0, 10)} ${t.channel} ${t.candId}${t.roleId ? ` @${t.roleId}` : ''} ${t.note || ''}`);
    }
    return;
  }

  if (cmd === 'rediscover') {
    const doc = load();
    const hits = rediscover(doc.touches, {
      roleId: flags.role || null,
      limit: flags.limit ? Number(flags.limit) : 10,
    });
    console.log(JSON.stringify({ ok: true, count: hits.length, hits }, null, 2));
    return;
  }

  console.error(JSON.stringify({ ok: false, error: `unknown ${cmd}` }));
  process.exit(1);
}

if (isMain) main();
