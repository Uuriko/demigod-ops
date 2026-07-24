#!/usr/bin/env node
/**
 * demigod-craft-log — personal craft log of *verified product outcomes only*.
 *
 * Fail-closed: no free-text wins. An entry is minted only when a verifier
 * can prove the outcome from disk/live/receipts. Soft agent motion does not count.
 *
 *   node demigod-craft-log.mjs list
 *   node demigod-craft-log.mjs status
 *   node demigod-craft-log.mjs mint ship          # requires live truth PASS disk==live shipped
 *   node demigod-craft-log.mjs mint intro <id>    # requires isRealReceipt(id) on board
 *   node demigod-craft-log.mjs mint event-ran     # active event stage run|followup|debrief + real invite URL
 *   node demigod-craft-log.mjs show <id>
 *   node demigod-craft-log.mjs render             # rewrite craft-log.md from jsonl
 *
 * Store: /tmp/dg-busy/craft-log/log.jsonl · human: /tmp/dg-busy/craft-log/craft-log.md
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { isRealReceipt, loadBoard } from './demigod-submissions-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DG_BUSY || '/tmp/dg-busy';
const DIR = path.join(BUSY, 'craft-log');
const LOG = path.join(DIR, 'log.jsonl');
const MD = path.join(DIR, 'craft-log.md');
const TRUTH = path.join(BUSY, 'truth.json');
const MANIFEST = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
const EVENTS = path.join(ROOT, 'DEMIGOD-EVENTS.json');

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function loadEntries() {
  if (!fs.existsSync(LOG)) return [];
  return fs
    .readFileSync(LOG, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/** Paths for dash/registry consumers. */
export function craftPaths() {
  return { dir: DIR, log: LOG, md: MD };
}

function appendEntry(entry) {
  ensureDir();
  fs.appendFileSync(LOG, JSON.stringify(entry) + '\n', { mode: 0o600 });
  try {
    fs.chmodSync(LOG, 0o600);
  } catch {
    /* ignore */
  }
  renderMarkdown();
  return entry;
}

function proofKey(kind, proof) {
  return crypto.createHash('sha256').update(JSON.stringify({ kind, proof })).digest('hex').slice(0, 16);
}

function alreadyMinted(key) {
  return loadEntries().some((e) => e.proofKey === key);
}

/** Refresh truth.json via bin/dg-truth (best-effort). */
function refreshTruth() {
  const bin = path.join(ROOT, 'bin/dg-truth');
  if (!fs.existsSync(bin)) return null;
  spawnSync(bin, [], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  return readJson(TRUTH);
}

export function verifyShipLive() {
  let truth = readJson(TRUTH);
  if (!truth?.pass) truth = refreshTruth();
  if (!truth?.pass) {
    return { ok: false, reason: 'truth_not_pass', detail: truth?.summaryLine || 'no truth.json' };
  }
  const diskVer = String(truth.foot?.ver || truth.foot?.publicVer || '');
  const liveVer = String(truth.live?.footVer || '');
  const man = truth.manifest || readJson(MANIFEST) || {};
  const manVer = String(man.version || man.footVer || '');
  if (!diskVer || diskVer !== liveVer) {
    return { ok: false, reason: 'disk_live_drift', detail: `disk=${diskVer} live=${liveVer}` };
  }
  if (manVer && manVer !== diskVer) {
    return { ok: false, reason: 'manifest_drift', detail: `man=${manVer} disk=${diskVer}` };
  }
  const shipped =
    truth.fullyShipped === true ||
    /shipped=true/.test(String(truth.summaryLine || '')) ||
    (truth.match?.diskLive === true && man.diskMatchesManifest !== false);
  if (!shipped && truth.fullyShipped === false) {
    return { ok: false, reason: 'not_shipped', detail: truth.summaryLine || 'fullyShipped=false' };
  }
  const sha = truth.foot?.sha256 || man.sha256 || null;
  const cdn = truth.live?.footUrl || man.cdnUrl || null;
  if (!sha || !cdn) {
    return { ok: false, reason: 'missing_sha_or_cdn', detail: { sha: Boolean(sha), cdn: Boolean(cdn) } };
  }
  return {
    ok: true,
    proof: {
      kind: 'ship_live',
      footVer: diskVer,
      sha256: sha,
      cdnUrl: cdn,
      truthAt: truth.at || null,
      summaryLine: truth.summaryLine || null,
    },
    line: `Live foot sealed v${diskVer} · ${String(sha).slice(0, 12)} · ${cdn}`,
  };
}

export function verifyMutualIntro(receiptId) {
  const id = String(receiptId || '').trim();
  if (!id) return { ok: false, reason: 'need_receipt_id' };
  let board;
  try {
    board = loadBoard();
  } catch (e) {
    return { ok: false, reason: 'board_load_failed', detail: String(e.message || e) };
  }
  const receipts = board?.receipts || [];
  const hit = receipts.find((r) => String(r.id || r.receiptId || '') === id);
  if (!hit) return { ok: false, reason: 'receipt_not_found', detail: id };
  if (!isRealReceipt(hit)) {
    return { ok: false, reason: 'not_real_receipt', detail: 'isRealReceipt=false (sample/undelivered/invalid)' };
  }
  return {
    ok: true,
    proof: {
      kind: 'mutual_intro',
      receiptId: id,
      status: hit.status || null,
      at: hit.at || hit.deliveredAt || null,
    },
    line: `Mutual intro delivered · receipt ${id}`,
  };
}

function hasRealInviteUrl(ev) {
  const urls = []
    .concat(ev?.inviteUrls || [])
    .concat(ev?.inviteUrl ? [ev.inviteUrl] : [])
    .concat(ev?.platforms ? Object.values(ev.platforms).map((p) => p?.url || p?.inviteUrl).filter(Boolean) : []);
  for (const u of urls) {
    const s = String(u || '').trim();
    if (!s) continue;
    if (/example\.com|localhost|fixture|selftest|todo|TBD|placeholder/i.test(s)) continue;
    if (/^https:\/\//i.test(s) && /partiful|lu\.ma|luma\.com|eventbrite|meetup/i.test(s)) return s;
    if (/^https:\/\//i.test(s) && s.length > 20) return s;
  }
  return null;
}

export function verifyEventRan() {
  const store = readJson(EVENTS);
  if (!store) return { ok: false, reason: 'events_store_missing' };
  const candidates = []
    .concat(store.activeEvent ? [store.activeEvent] : [])
    .concat(Array.isArray(store.events) ? store.events : []);
  const doneStages = new Set(['run', 'running', 'followup', 'debrief', 'done', 'closed']);
  for (const ev of candidates) {
    if (!ev || typeof ev !== 'object') continue;
    const stage = String(ev.stage || '').toLowerCase();
    if (!doneStages.has(stage)) continue;
    const invite = hasRealInviteUrl(ev);
    if (!invite) {
      return {
        ok: false,
        reason: 'event_advanced_without_real_invite',
        detail: { id: ev.id, stage, title: ev.title },
      };
    }
    if (/selftest|fixture|mock/i.test(String(ev.title || '') + String(ev.id || ''))) continue;
    return {
      ok: true,
      proof: {
        kind: 'event_ran',
        eventId: ev.id || null,
        title: ev.title || null,
        stage,
        inviteUrl: invite,
      },
      line: `Event ran · ${ev.title || ev.id} · stage=${stage}`,
    };
  }
  return {
    ok: false,
    reason: 'no_event_past_rsvp_with_real_invite',
    detail: 'active events still pre-run or invite missing (fail-closed)',
  };
}

function mintFromVerified(v, note) {
  if (!v.ok) {
    return { ok: false, error: v.reason, detail: v.detail || null };
  }
  const key = proofKey(v.proof.kind, v.proof);
  if (alreadyMinted(key)) {
    return { ok: true, deduped: true, proofKey: key, line: v.line };
  }
  const id = `craft_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`;
  const entry = {
    schema: 'demigod.craft-log/1',
    id,
    at: new Date().toISOString(),
    kind: v.proof.kind,
    line: v.line,
    note: note || null,
    proof: v.proof,
    proofKey: key,
  };
  appendEntry(entry);
  return { ok: true, entry };
}

export function mintShip(note) {
  return mintFromVerified(verifyShipLive(), note);
}

export function mintIntro(receiptId, note) {
  return mintFromVerified(verifyMutualIntro(receiptId), note);
}

export function mintEventRan(note) {
  return mintFromVerified(verifyEventRan(), note);
}

export function renderMarkdown() {
  const entries = loadEntries().slice().reverse();
  const lines = [
    '# Demigod craft log',
    '',
    '_Verified product outcomes only. Soft agent motion does not count._',
    '',
    `Entries: **${entries.length}** · store: \`${LOG}\``,
    '',
  ];
  if (!entries.length) {
    lines.push('_Empty. Mint with `node demigod-craft-log.mjs mint ship` when truth is green._', '');
  } else {
    for (const e of entries) {
      lines.push(`## ${e.at} · \`${e.kind}\``);
      lines.push('');
      lines.push(e.line);
      if (e.note) lines.push(`_note: ${e.note}_`);
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(e.proof, null, 2));
      lines.push('```');
      lines.push('');
    }
  }
  ensureDir();
  atomicWrite(MD, lines.join('\n'), { mode: 0o600 });
  return MD;
}

export function status() {
  const entries = loadEntries();
  const byKind = {};
  for (const e of entries) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  const ship = verifyShipLive();
  const event = verifyEventRan();
  return {
    ok: true,
    count: entries.length,
    byKind,
    log: LOG,
    md: MD,
    ready: {
      ship_live: ship.ok ? ship.line : `no: ${ship.reason}`,
      event_ran: event.ok ? event.line : `no: ${event.reason}`,
    },
    latest: entries.slice(-3).reverse(),
  };
}

function usage() {
  console.log(`usage:
  node demigod-craft-log.mjs list
  node demigod-craft-log.mjs status
  node demigod-craft-log.mjs mint ship [note...]
  node demigod-craft-log.mjs mint intro <receiptId> [note...]
  node demigod-craft-log.mjs mint event-ran [note...]
  node demigod-craft-log.mjs show <id>
  node demigod-craft-log.mjs render`);
}

async function main(argv) {
  const [cmd, a, ...rest] = argv;
  if (!cmd || cmd === 'help' || cmd === '-h') {
    usage();
    process.exit(0);
  }
  if (cmd === 'list') {
    const entries = loadEntries();
    if (!entries.length) {
      console.log('(empty craft log)');
      return;
    }
    for (const e of entries) {
      console.log(`${e.at}  ${e.kind.padEnd(14)}  ${e.line}  [${e.id}]`);
    }
    return;
  }
  if (cmd === 'status') {
    console.log(JSON.stringify(status(), null, 2));
    return;
  }
  if (cmd === 'render') {
    console.log(renderMarkdown());
    return;
  }
  if (cmd === 'show') {
    const id = a;
    const hit = loadEntries().find((e) => e.id === id);
    if (!hit) {
      console.error(JSON.stringify({ ok: false, error: 'not_found', id }));
      process.exit(1);
    }
    console.log(JSON.stringify(hit, null, 2));
    return;
  }
  if (cmd === 'mint') {
    const kind = a;
    const note = rest.join(' ').trim() || null;
    let r;
    if (kind === 'ship') r = mintShip(note);
    else if (kind === 'intro') r = mintIntro(rest[0] || note, rest.slice(1).join(' ').trim() || null);
    else if (kind === 'event-ran' || kind === 'event_ran') r = mintEventRan(note);
    else {
      console.error(JSON.stringify({ ok: false, error: 'unknown_kind', kind }));
      process.exit(1);
    }
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  }
  usage();
  process.exit(1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
