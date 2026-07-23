#!/usr/bin/env node
/**
 * demigod-pilot-inbound — inbound → PILOT-LOG / white-glove path (no fake pilots)
 *
 *   bin/dg pilot status
 *   bin/dg pilot from-wiz --email=… --90d="…" [--brief=…] [--log]
 *   bin/dg pilot warm --who="…" --channel=email|wiz|dm|phone|call [--status=…] [--next=…]
 *   bin/dg pilot white-glove
 *   bin/dg pilot os …          # passthrough demigod-pilot-os.mjs
 *
 * Honesty: warm inbound ≠ pilot. Only white-glove delivery + pilot-logger mints real.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { writeJsonAuto } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DG_BUSY || process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const OPS = path.join(ROOT, 'demigod-ops');
const PILOT_LOG = process.env.DEMIGOD_PILOT_LOG || path.join(OPS, 'PILOT-LOG.md');
const args = process.argv.slice(2);
const cmd = args.includes('--selftest')
  ? 'selftest'
  : (args.find((a) => !a.startsWith('-')) || 'status');
const asJson = args.includes('--json');
// Calls are attributable inbound too. Keep both the noun used in imported
// logs (`phone`) and the event label operators commonly record (`call`).
const WARM_CHANNELS = new Set(['email', 'wiz', 'dm', 'form', 'calendly', 'phone', 'call']);
const MAX_WARM_CELL_CHARS = 500;
const WARM_HEADING_RE = /^##[ \t]+Warm inbound(?:[ \t]+\(not a pilot yet\))?[ \t]*$/im;
const ACTIVE_HEADING_RE = /^##[ \t]+Active pipeline(?:[ \t]+\(fill by hand\))?[ \t]*$/im;

// Legacy/manual rows sometimes record a real multi-touch path such as
// "email + Calendly". Accept composites only when every component is known;
// appendWarm() still writes one canonical channel per captured event.
function isReadableWarmChannel(value) {
  const parts = String(value || '')
    .toLowerCase()
    .split(/\s*(?:\+|&|\/)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 && parts.every((part) => WARM_CHANNELS.has(part));
}

function opt(name, fallback = '') {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1];
  return fallback;
}

function read(p, max = 200_000) {
  try {
    return fs.readFileSync(p, 'utf8').slice(0, max);
  } catch {
    return '';
  }
}

function readWholeText(p) {
  try {
    // Writers must never reuse the display/status reader above: its slice is
    // intentional for bounded snapshots, but rewriting that slice would
    // silently discard the tail of an append-only operational record.
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function withoutFencedCode(md) {
  // PILOT-LOG includes operator instructions and can legitimately show table
  // examples. A heading/table inside a Markdown fence is documentation, not
  // pipeline evidence. Walk line-by-line so a truncated/unclosed example is
  // masked through EOF instead of becoming false inbound or pilot evidence.
  let fence = null;
  let htmlComment = false;
  return String(md || '').split('\n').map((line) => {
    const marker = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (!fence && marker) fence = { char: marker[1][0], length: marker[1].length };
    const commentStarts = !fence && line.includes('<!--');
    if (commentStarts) htmlComment = true;
    const masked = fence || htmlComment ? line.replace(/./g, ' ') : line;
    if (htmlComment && line.includes('-->')) htmlComment = false;
    if (fence && marker && marker[1][0] === fence.char && marker[1].length >= fence.length &&
        new RegExp(`^[ \\t]*\\${fence.char}{${fence.length},}[ \\t]*$`).test(line)) fence = null;
    return masked;
  }).join('\n');
}

function writeTextAtomic(file, text) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  let existingMode = 0o644;
  try {
    existingMode = fs.statSync(file).mode & 0o777;
  } catch {
    // New logs use a predictable, non-executable mode.
  }
  const temp = path.join(
    dir,
    `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`,
  );
  let handle;
  try {
    handle = fs.openSync(temp, 'wx', existingMode);
    fs.writeFileSync(handle, text, 'utf8');
    // Make the complete append-only record durable before publishing its name.
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = undefined;
    fs.renameSync(temp, file);
    // Persist the rename itself. fsyncing only the file makes its contents
    // durable, but a crash can still lose the directory entry after success.
    const dirHandle = fs.openSync(dir, 'r');
    try {
      fs.fsyncSync(dirHandle);
    } finally {
      fs.closeSync(dirHandle);
    }
  } finally {
    if (handle !== undefined) {
      try {
        fs.closeSync(handle);
      } catch {
        // Preserve the original write error.
      }
    }
    try {
      fs.unlinkSync(temp);
    } catch {
      // rename already consumed the temp file; cleanup is only for failures.
    }
  }
}

// Break a writer lock ONLY if its recorded PID is provably dead (kill 0 -> ESRCH). A live PID, or one
// we can't signal (EPERM = alive under another owner), keeps the lock, so the mutex still holds against
// a live writer. Without this a writer that crashed mid-write left a permanent .writer.lock that threw
// EEXIST on every future acquire, blocking all pilot-log writes forever (#7).
function breakStaleWriterLock(lock) {
  let pid;
  try { pid = parseInt(String(fs.readFileSync(lock, 'utf8')).trim(), 10); } catch { return false; }
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return false; } // no throw -> holder alive, keep the lock
  catch (e) { if (e.code !== 'ESRCH') return false; } // EPERM etc -> assume alive, keep
  try { fs.unlinkSync(lock); return true; } catch { return false; } // provably dead -> break
}

function acquirePilotLogWriterLock(file) {
  const lock = `${file}.writer.lock`;
  let handle;
  let created = false;
  try {
    try {
      handle = fs.openSync(lock, 'wx', 0o600);
    } catch (e) {
      // Retry once after breaking a provably-dead holder; the retry openSync stays atomic, so a
      // concurrent breaker/acquirer still can't double-acquire (the loser re-hits EEXIST on a live PID).
      if (e.code === 'EEXIST' && breakStaleWriterLock(lock)) handle = fs.openSync(lock, 'wx', 0o600);
      else throw e;
    }
    created = true;
    fs.writeFileSync(handle, `${process.pid}\n`, 'utf8');
    fs.fsyncSync(handle);
  } catch (error) {
    if (handle !== undefined) {
      try { fs.closeSync(handle); } catch { /* preserve acquisition error */ }
    }
    if (created) {
      try { fs.unlinkSync(lock); } catch { /* cleanup is best effort */ }
    }
    throw error;
  }
  return () => {
    try { fs.closeSync(handle); } finally {
      try { fs.unlinkSync(lock); } catch { /* cleanup is best effort */ }
    }
  };
}

function parseTable(md, headingRe, expectedCells) {
  const rows = [];
  const start = md.search(headingRe);
  if (start < 0) return rows;
  const rest = md.slice(start);
  const end = rest.search(/\n#{1,2}[ \t]+/);
  const section = end > 0 ? rest.slice(0, end) : rest;
  for (const line of section.split('\n')) {
    const tableLine = line.trim();
    if (!tableLine.startsWith('|')) continue;
    const cells = tableLine
      .slice(1, tableLine.endsWith('|') ? -1 : undefined)
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
    // A partially written/corrupt Markdown row must not become demand or a
    // pilot. Enforce the table schema instead of accepting any pipe-shaped
    // line with three cells.
    if (cells.length !== expectedCells) continue;
    const first = cells[0].toLowerCase();
    if (cells.every((c) => /^:?-{3,}:?$/.test(c)) || ['id', 'who', 'founder'].includes(first)) continue;
    rows.push(cells);
  }
  return rows;
}

function parseWarmTable(md) {
  const rows = [];
  let rawRows = 0;
  let invalidSchemaRows = 0;
  const start = md.search(WARM_HEADING_RE);
  if (start < 0) return { rows, rawRows, invalidSchemaRows };
  const rest = md.slice(start);
  const end = rest.search(/\n#{1,2}[ \t]+/);
  const section = end > 0 ? rest.slice(0, end) : rest;
  const lines = section.split('\n');
  const headerIndex = lines.findIndex((line) => {
    const cells = String(line || '').trim().split('|').slice(1, -1).map((cell) => cell.trim().toLowerCase());
    return cells.length === 5 && cells.join('|') === 'who|channel|status|next|date';
  });
  const quarantinePreHeaderRows = (candidateLines) => {
    for (const line of candidateLines) {
      const tableLine = line.trim();
      if (!tableLine.startsWith('|')) continue;
      const cells = tableLine
        .slice(1, tableLine.endsWith('|') ? -1 : undefined)
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      rawRows += 1;
      invalidSchemaRows += 1;
    }
  };
  // Do not promote arbitrary rows when the canonical warm-inbound schema is
  // absent. Still count row-shaped content as quarantined schema evidence so
  // a damaged/manual header cannot make malformed inbound disappear from the
  // status card. appendWarm repairs malformed sections before writing.
  if (headerIndex < 0) {
    quarantinePreHeaderRows(lines.slice(1));
    return { rows, rawRows, invalidSchemaRows };
  }
  quarantinePreHeaderRows(lines.slice(1, headerIndex));
  for (const line of lines.slice(headerIndex + 1)) {
    const tableLine = line.trim();
    if (!tableLine.startsWith('|')) continue;
    const cells = tableLine
      .slice(1, tableLine.endsWith('|') ? -1 : undefined)
      .split(/(?<!\\)\|/)
      .map((cell) => cell.trim().replace(/\\\|/g, '|'));
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    rawRows += 1;
    if (cells.length !== 5) {
      invalidSchemaRows += 1;
      continue;
    }
    rows.push(cells);
  }
  return { rows, rawRows, invalidSchemaRows };
}

function parseActiveTableDetailed(md) {
  const empty = { rows: [], rawRows: 0, invalidSchemaRows: 0 };
  const start = md.search(ACTIVE_HEADING_RE);
  if (start < 0) return empty;
  const rest = md.slice(start);
  const end = rest.search(/\n#{1,2}[ \t]+/);
  const section = end > 0 ? rest.slice(0, end) : rest;
  const lines = section.split('\n');
  const headerIndex = lines.findIndex((line) => {
    const cells = String(line || '').trim().split('|').slice(1, -1).map((cell) => cell.trim().toLowerCase());
    return cells.length === 7 &&
      cells.join('|') === 'id|founder|role|90-day outcome|status|next|date';
  });
  // A legacy/corrupt table is not pilot evidence, but its row-shaped content
  // must remain visible as quarantine telemetry. Otherwise a damaged header
  // makes pilot-looking records disappear from status entirely.
  if (headerIndex < 0) {
    const candidateRows = lines.slice(1).filter((line) => {
      const tableLine = line.trim();
      if (!tableLine.startsWith('|')) return false;
      const cells = tableLine.slice(1, tableLine.endsWith('|') ? -1 : undefined)
        .split(/(?<!\\)\|/).map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) return false;
      const labels = cells.map((cell) => cell.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
      // A recognizable legacy header describes schema damage, not a pipeline
      // record. Count the data beneath it so quarantine totals stay honest.
      return !(labels[0] === 'id' && labels.includes('role') && labels.includes('status') && labels.includes('date'));
    }).length;
    return { rows: [], rawRows: candidateRows, invalidSchemaRows: candidateRows };
  }
  const rows = parseTable(lines.slice(headerIndex).join('\n'), /^/m, 7);
  return { rows, rawRows: rows.length, invalidSchemaRows: 0 };
}

function parseActiveTable(md) {
  return parseActiveTableDetailed(md).rows;
}

function isWarmSignal(row) {
  const text = [row.who, row.channel, row.status, row.next].join(' ').toLowerCase();
  const channel = String(row.channel || '').trim().toLowerCase();
  return isReadableWarmChannel(channel) &&
    !isPlaceholderIdentity(row.who) &&
    !isPlaceholderIdentity(row.status) &&
    !isPlaceholderIdentity(row.next) &&
    !/\b(?:test|demo|sample)\s+(?:noise|only)\b|\bignore(?:d)?\b/.test(text);
}

function explicitWarmNonSignalReason(row) {
  const text = [row.who, row.channel, row.status, row.next].join(' ').toLowerCase();
  if (/\b(?:test|demo|sample)\s+(?:noise|only)\b|\bignore(?:d)?\b/.test(text)) {
    return 'test_or_ignored';
  }
  // Inbox checks with an explicit zero result are useful audit observations,
  // but they are not attributable inbound. Classify that truth before channel
  // or date validation so status telemetry explains why the row was excluded.
  if (/\b(?:0|zero|no)\s+(?:inbound\s+)?(?:threads?|replies|responses|messages?)\b|\b(?:empty|no)\s+inbox\b/.test(text)) {
    return 'no_observed_inbound';
  }
  return null;
}

function hasUnsafeEvidenceMarkup(value) {
  const text = String(value || '');
  return /<\/?[a-z][^>]*>|!?\[[^\]]*\]\([^)]*\)/i.test(text) ||
    /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/.test(text);
}

function warmQuarantineReason(row) {
  if (isPlaceholderIdentity(row.who)) return 'placeholder_identity';
  const explicitNonSignal = explicitWarmNonSignalReason(row);
  if (explicitNonSignal) return explicitNonSignal;
  // Every text cell is emitted to the shared inbound snapshot and dashboard.
  // Keep markup/control bytes in notes, never trusted operational telemetry.
  if ([row.who, row.channel, row.status, row.next].some(hasUnsafeEvidenceMarkup)) return 'unsafe_markup';
  if (!isObservedDate(row.date)) return 'invalid_or_future_date';
  if (!isReadableWarmChannel(row.channel)) return 'invalid_channel';
  if (isPlaceholderIdentity(row.status) || isPlaceholderIdentity(row.next)) return 'missing_disposition';
  if (!isWarmSignal(row)) return 'test_or_ignored';
  return null;
}

function warmQuarantineSummary(rows) {
  const counts = {};
  for (const row of rows) {
    const reason = warmQuarantineReason(row);
    if (reason) counts[reason] = (counts[reason] || 0) + 1;
  }
  return counts;
}

function isRealPilotSignal(row) {
  const text = [row.id, row.founder, row.role, row.outcome90, row.status, row.next]
    .join(' ')
    .toLowerCase();
  // Identity alone is not delivery evidence. Require a recorded disposition
  // and next action too, so a half-written row cannot become a real pilot
  // between Markdown edits.
  if ([row.id, row.founder, row.role, row.outcome90, row.status, row.next]
    .some(isPlaceholderIdentity)) return false;
  return !/\b(?:test|demo|sample)\s+(?:noise|only|fixture)\b|\bfixture\b|\bignore(?:d)?\b/.test(text);
}

function isPlaceholderIdentity(value) {
  const plain = String(value || '')
    .replace(/[*_`~]/g, '')
    .replace(/&mdash;|&#8212;|&#x2014;/gi, '—')
    .trim()
    .toLowerCase();
  return !plain || ['—', '–', '-', 'n/a', 'na', 'none', 'tbd'].includes(plain);
}

function isIsoCalendarDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}

function operatingDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isObservedDate(value) {
  const text = String(value || '').trim();
  return isIsoCalendarDate(text) && text <= operatingDateKey();
}

function isObservedTimestamp(value) {
  const text = String(value || '').trim();
  // Date.parse normalizes some impossible dates (for example February 30),
  // so validate the calendar prefix before accepting Pilot OS evidence.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return false;
  if (!isIsoCalendarDate(text.slice(0, 10))) return false;
  const parsed = Date.parse(text);
  return !Number.isNaN(parsed) && parsed <= Date.now();
}

function hasObservedPilotTimestamp(pilot) {
  // Legacy rows may predate Pilot OS timestamps. When a timestamp is present,
  // however, it is evidence and must describe an event that has already
  // happened; malformed/future values cannot establish an open pilot.
  if (!Object.prototype.hasOwnProperty.call(pilot, 'at')) return true;
  return isObservedTimestamp(pilot.at);
}

function isReplyableContact(value) {
  const contact = String(value || '').trim();
  if (!contact || isPlaceholderIdentity(contact)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return true;
  if (/^@[A-Za-z0-9_]{1,32}$/.test(contact)) return true;
  if (/^https?:\/\/[^\s.]+(?:\.[^\s.]+)+(?:\/\S*)?$/.test(contact)) return true;
  // A digit count alone turns arbitrary notes such as "call abc1234567" into
  // replyable evidence. Phone contacts must contain phone punctuation only and
  // remain within the E.164 7–15 digit envelope.
  if (!/^\+?[0-9][0-9().\s-]{5,}[0-9]$/.test(contact)) return false;
  const digits = contact.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function dedupeWarmSignals(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = [row.who, row.channel, row.status, row.next, row.date]
      .map((value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase())
      .join('\u001f');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function warmInboundFreshness(rows, now = new Date()) {
  const currentRows = latestWarmInboundSignals(rows);
  // Preserve resolved rows as observed inbound evidence, but do not turn a
  // closed thread into stale operational work merely because its final
  // disposition is old.
  const actionableRows = currentRows.filter((row) => !isResolvedWarmDisposition(row));
  const today = Date.parse(`${operatingDateKey(now)}T00:00:00Z`);
  const ages = actionableRows.map((row) => Math.max(0, Math.floor((today - Date.parse(`${row.date}T00:00:00Z`)) / 86400000)));
  const stale = actionableRows.filter((_, index) => ages[index] > 7);
  // Count stale events, but show each attributable identity once. One person
  // can have several distinct warm events and should not dominate the summary.
  const staleWho = [...new Map(stale.map((row) => {
    const who = String(row.who || '').replace(/\s+/g, ' ').trim();
    return [who.toLowerCase(), who];
  })).values()];
  return {
    staleAfterDays: 7,
    staleCount: stale.length,
    staleWho,
    oldestDays: ages.length ? Math.max(...ages) : null,
    actionableCount: actionableRows.length,
    resolvedCount: currentRows.length - actionableRows.length,
    ...warmInboundActionHealth(currentRows, now),
  };
}

function latestWarmInboundSignals(rows) {
  const latestByWho = new Map();
  for (const row of rows) {
    const key = warmInboundIdentityKey(row);
    const previous = latestByWho.get(key);
    if (!previous || String(row.date) >= String(previous.date)) latestByWho.set(key, row);
  }
  return [...latestByWho.values()];
}

function warmInboundIdentityKey(row) {
  // A repeated display name can represent independent contacts. Channel is
  // part of the attributable identity so one thread cannot hide another.
  // Composite channels are a set: reversed separators/order still describe
  // one thread and must not inflate current warm-demand telemetry.
  const who = String(row?.who || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const channel = String(row?.channel || '')
    .toLowerCase()
    .split(/\s*(?:\+|&|\/)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    // Keep accepted aliases on one stable thread identity. Otherwise a
    // `phone` capture followed by a hand-written `call` disposition leaves
    // the older row actionable and inflates warm-demand telemetry.
    .map((part) => part === 'call' ? 'phone' : part)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .sort()
    .join('+');
  return [who, channel].join('\u001f');
}

function warmInboundActionHealth(rows, now = new Date()) {
  const today = operatingDateKey(now);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const actionScheduleFor = (row) => {
    // Historical notes often embed completed dates ("prep email SENT 2026-07-09",
    // "(was Tue 2026-07-14)"). Those are audit text, not the live action due date.
    const scheduleText = (value) => String(value || '')
      .replace(/\([^)]*\b\d{4}-\d{2}-\d{2}\b[^)]*\)/g, ' ')
      .replace(/\b(?:sent|completed|done|was|passed)\b[^.·|;]*?\b\d{4}-\d{2}-\d{2}\b/gi, ' ')
      .replace(/\b\d{4}-\d{2}-\d{2}\b[^.·|;]*?\b(?:sent|completed|done)\b/gi, ' ');
    const validDates = (value) => (String(value || '').match(/\b\d{4}-\d{2}-\d{2}\b/g) || [])
      .filter(isIsoCalendarDate);
    const nextDates = validDates(scheduleText(row.next));
    const statusDates = validDates(scheduleText(row.status));
    const nextText = String(row.next || '').replace(/[*_`~]/g, '').toLowerCase();
    const nextOnlyRecordsCompletedWork =
      /\b(?:sent|completed|done)\b/.test(nextText) &&
      !/\b(?:follow[- ]?up|review|reply|call|meet|schedule|pending|next)\b/.test(nextText);
    // `next` is the action schedule. A historical date in status (for example,
    // "called 2026-07-10") must not make a future follow-up look overdue.
    // Legacy rows without a dated next action fall back to status, then Date.
    // A malformed date-shaped token is not scheduling evidence. Fall back to
    // the observed row date instead of letting bad text hide an overdue signal.
    return nextDates.length && !nextOnlyRecordsCompletedWork
      // Preserve historical context in the note without aging a completed
      // event as open work. The latest valid date is the operative schedule.
      ? { dates: [nextDates.sort().at(-1)], source: 'next' }
      : (statusDates.length
        ? { dates: [statusDates.sort().at(-1)], source: 'status' }
        : { dates: [row.date], source: 'row_date' });
  };
  const actionDatesFor = (row) => actionScheduleFor(row).dates;
  const actionDetailFor = (row) => {
    const next = String(row.next || '').replace(/\s+/g, ' ').trim();
    const status = String(row.status || '').replace(/\s+/g, ' ').trim();
    const source = actionScheduleFor(row).source;
    return {
      actionSource: source,
      action: (source === 'next' ? next : (source === 'status' ? status : (next || status))).slice(0, 240),
    };
  };
  const actionable = rows.filter((row) => !isResolvedWarmDisposition(row));
  const overdue = actionable.filter((row) => {
    const actionDates = actionDatesFor(row);
    return actionDates.some((date) => isIsoCalendarDate(date) && date < today);
  });
  const overdueDates = overdue
    .flatMap((row) => actionDatesFor(row))
    .filter((date) => isIsoCalendarDate(date) && date < today)
    .sort();
  const dueToday = actionable.filter((row) => actionDatesFor(row).includes(today));
  const scheduledBySignal = actionable
    .map((row) => actionDatesFor(row).filter((date) => isIsoCalendarDate(date) && date >= today))
    .filter((dates) => dates.length > 0);
  const scheduledDates = scheduledBySignal.flat().sort();
  const nextActionDate = scheduledDates[0] || null;
  const uniqueWho = (signals) => [...new Map(signals.map((row) => {
    const who = String(row.who || '').replace(/\s+/g, ' ').trim();
    return [who.toLowerCase(), who];
  })).values()];
  // Status consumers need the actual due action, not only a name/count. Keep
  // this projection bounded and read-only; it remains warm-demand telemetry
  // and never becomes pilot or send evidence.
  const actionItems = (signals) => signals.map((row) => {
    const detail = actionDetailFor(row);
    return {
      who: String(row.who || '').replace(/\s+/g, ' ').trim(),
      channel: String(row.channel || '').replace(/\s+/g, ' ').trim(),
      actionDate: actionDatesFor(row)[0] || null,
      ...detail,
      // Retain the raw next disposition for compatible consumers while
      // `action` identifies the text that supplied the operative date.
      next: String(row.next || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    };
  }).sort((a, b) =>
    String(a.actionDate || '').localeCompare(String(b.actionDate || '')) ||
    a.who.localeCompare(b.who)
  ).slice(0, 20);
  // Keep status consumers on the structured boundary: scheduled work should
  // identify the attributable warm signal without requiring them to parse the
  // append-only Markdown log. This remains telemetry, never pilot evidence.
  const scheduledActionItems = actionable
    .flatMap((row) => actionDatesFor(row)
      .filter((date) => isIsoCalendarDate(date) && date >= today)
      .map((date) => ({ ...actionItems([row])[0], actionDate: date })))
    .sort((a, b) => a.actionDate.localeCompare(b.actionDate) || a.who.localeCompare(b.who))
    .slice(0, 20);
  return {
    overdueActionCount: overdue.length,
    overdueActionWho: uniqueWho(overdue),
    overdueActionItems: actionItems(overdue),
    overdueActionOldestDays: overdueDates.length
      ? Math.floor((todayMs - Date.parse(`${overdueDates[0]}T00:00:00Z`)) / 86400000)
      : null,
    dueTodayActionCount: dueToday.length,
    dueTodayActionWho: uniqueWho(dueToday),
    dueTodayActionItems: actionItems(dueToday),
    // Count attributable inbound rows, not date tokens. One note can mention
    // both a meeting and a follow-up date without becoming two warm signals.
    scheduledActionCount: scheduledBySignal.length,
    scheduledActionItems,
    nextActionDate,
    nextActionDays: nextActionDate
      ? Math.floor((Date.parse(`${nextActionDate}T00:00:00Z`) - todayMs) / 86400000)
      : null,
  };
}

function isResolvedWarmDisposition(row) {
  const status = String(row?.status || '').replace(/[*_`~]/g, '').trim().toLowerCase();
  const next = String(row?.next || '').replace(/[*_`~]/g, '').trim().toLowerCase();
  // Historical dates describe completed work too. Only suppress an overdue
  // alert for an explicit terminal disposition; a past call with a pending
  // follow-up must remain visible.
  const terminal = /^(?:closed|complete(?:d)?|done|declined|withdrawn|opted out|not (?:a fit|interested)|no follow[- ]?up|resolved)\b/;
  return terminal.test(next) || (terminal.test(status) && !/\b(?:follow[- ]?up|review|reply|call|meet|schedule|send|pending|next)\b/.test(next));
}

function isOpenPilotOsSignal(pilot) {
  if (!pilot || typeof pilot !== 'object' || pilot.sample === true) return false;
  if (!hasObservedPilotTimestamp(pilot)) return false;
  const status = String(pilot.status || '').trim().toLowerCase();
  if (!status || ['hired', 'closed', 'churned'].includes(status)) return false;
  // Pilot OS is operational state, not a loose note bucket. Require the same
  // identity its writer requires plus a replyable/attributable contact. This
  // quarantines partial legacy JSON and transient objects instead of turning
  // them into an "open pilot" count.
  return ![pilot.id, pilot.company, pilot.role, pilot.outcome90d]
    .some(isPlaceholderIdentity) && isReplyableContact(pilot.contact);
}

function latestPilotOsSignals(rows) {
  const latestById = new Map();
  for (const pilot of rows) {
    const id = String(pilot.id || '').trim().toLowerCase();
    if (id) latestById.set(id, pilot);
  }
  // Pilot OS is append-only state. Resolve repeated IDs before evaluating
  // open/closed status so an older open row cannot survive a later close.
  return [...latestById.values()];
}

function dedupeActivePipelineSignals(rows) {
  const latestById = new Map();
  for (const pilot of rows) {
    const id = String(pilot.id || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (id) latestById.set(id, pilot);
  }
  // PILOT-LOG is append-only audit history. A repeated ID is an updated
  // delivery state, so expose the last observed row instead of freezing the
  // status at its oldest entry.
  return [...latestById.values()];
}

function cmdStatus() {
  // PILOT-LOG is an append-only evidence record. A bounded display read can
  // silently hide later warm rows once the file grows past its cap, so status
  // must parse the complete record just like the atomic writer preserves it.
  const pilotLogText = readWholeText(PILOT_LOG);
  const md = withoutFencedCode(pilotLogText);
  const activeParsed = parseActiveTableDetailed(md);
  const active = activeParsed.rows.map((c) => ({
    id: c[0],
    founder: c[1],
    role: c[2],
    outcome90: c[3],
    status: c[4],
    next: c[5],
    date: c[6],
  }));
  const warmParsed = parseWarmTable(md);
  const rawWarm = warmParsed.rows.map((c) => ({
        who: c[0],
        channel: c[1],
        status: c[2],
        next: c[3],
        date: c[4],
      }));
  const warm = dedupeWarmSignals(
    rawWarm
      // Promotion and quarantine must be exact complements. Reusing the
      // classifier prevents explicit zero-inbound observations or unsafe
      // identity markup from appearing in `rows` while also being reported
      // as quarantined diagnostics.
      .filter((row) => !warmQuarantineReason(row)),
  );
  const quarantineReasons = warmQuarantineSummary(rawWarm);
  if (warmParsed.invalidSchemaRows > 0) {
    quarantineReasons.invalid_schema = warmParsed.invalidSchemaRows;
  }
  const validBeforeDedupe = rawWarm.filter((row) => !warmQuarantineReason(row)).length;
  if (validBeforeDedupe > warm.length) {
    quarantineReasons.duplicate = validBeforeDedupe - warm.length;
  }
  const realActive = dedupeActivePipelineSignals(active.filter((r) => {
    if (isPlaceholderIdentity(r.founder) || !isObservedDate(r.date) || !isRealPilotSignal(r)) return false;
    return true;
  }));
  const pilotsOs = readJson(path.join(ROOT, 'DEMIGOD-PILOTS.json'));
  // Pilot OS is a separate operator-written store. Keep inbound status
  // available if that JSON is partially written or has a bad `pilots` shape;
  // malformed entries are not evidence of an open, real pilot.
  const pilotRows = Array.isArray(pilotsOs?.pilots) ? pilotsOs.pilots : [];
  const openOs = latestPilotOsSignals(pilotRows).filter(isOpenPilotOsSignal);
  const warmFreshness = warmInboundFreshness(warm);

  const out = {
    schema: 'demigod.pilot-inbound/1',
    at: new Date().toISOString(),
    honesty: {
      warmInboundIsNotPilot: true,
      inventsPilots: false,
      path: 'WIZ/form/email → warm log → human review → white-glove → pilot-logger after delivery',
    },
    pilotLog: PILOT_LOG,
    pilotLogBytes: Buffer.byteLength(pilotLogText, 'utf8'),
    activePipeline: {
      // `rows` is kept as the observed/usable count for old dashboard readers.
      // Raw Markdown rows are diagnostics only and must never look like demand.
      rows: realActive.length,
      realFilled: realActive.length,
      rawRows: activeParsed.rawRows,
      quarantinedRows: activeParsed.rawRows - realActive.length,
      quarantineReasons: activeParsed.invalidSchemaRows > 0
        ? { invalid_schema: activeParsed.invalidSchemaRows }
        : {},
      recent: realActive.slice(-5),
    },
    warmInbound: {
      count: warm.length,
      rows: warm,
      rawRows: warmParsed.rawRows,
      quarantinedRows: warmParsed.rawRows - warm.length,
      quarantineReasons,
      freshness: warmFreshness,
    },
    pilotOs: { open: openOs.length, store: 'DEMIGOD-PILOTS.json' },
    next:
      realActive.length > 0
        ? `Active delivery state: ${realActive.map((r) => r.id + ' ' + r.status).join(' · ')}`
        : warmFreshness.overdueActionCount > 0
          ? `Inbound review overdue: ${warmFreshness.overdueActionCount} signal${warmFreshness.overdueActionCount === 1 ? '' : 's'}` +
            `${warmFreshness.overdueActionOldestDays == null ? '' : ` · oldest ${warmFreshness.overdueActionOldestDays}d`}` +
            `${warmFreshness.overdueActionItems[0]?.actionDate ? ` · action ${warmFreshness.overdueActionItems[0].actionDate}` : ''}` +
            ` · ${warmFreshness.overdueActionWho.join(', ')} · warm ≠ pilot`
        : warmFreshness.dueTodayActionCount > 0
          ? `Inbound review due today: ${warmFreshness.dueTodayActionCount} signal${warmFreshness.dueTodayActionCount === 1 ? '' : 's'} · ${warmFreshness.dueTodayActionWho.join(', ')} · warm ≠ pilot`
        : warm.length > 0
          ? `Inbound watch: ${warm.length} warm signal${warm.length === 1 ? '' : 's'} logged · warm ≠ pilot`
          : 'Inbound watch: no attributable warm inbound or delivered pilot logged',
    cmds: {
      fromWiz: 'bin/dg pilot from-wiz --email=f@co.com --90d="Ship v1" --brief="Head of Growth"',
      warm: 'bin/dg pilot warm --who="Name" --channel=email --status=new --next="review pending"',
      whiteGlove: 'bin/dg pilot white-glove',
      logAfterDelivery: 'node demigod-pilot-logger.mjs --founder=… --brief=… --no-publish',
      os: 'bin/dg pilot os list',
    },
  };
  fs.mkdirSync(BUSY, { recursive: true });
  writeJsonAuto(path.join(BUSY, 'pilot-inbound.json'), out);
  if (asJson) console.log(JSON.stringify(out, null, 2));
  else {
    console.log('# pilot inbound · honest (warm ≠ pilot)');
    console.log(`  Active real: ${out.activePipeline.realFilled} · Warm: ${out.warmInbound.count} · OS open: ${out.pilotOs.open}`);
    console.log(
      `  Warm health: overdue=${warmFreshness.overdueActionCount}` +
      `${warmFreshness.overdueActionOldestDays == null ? '' : ` (oldest ${warmFreshness.overdueActionOldestDays}d)`}` +
      ` · dueToday=${warmFreshness.dueTodayActionCount}` +
      ` · quarantined=${out.warmInbound.quarantinedRows}`,
    );
    if (out.warmInbound.quarantinedRows > 0) {
      const reasons = Object.entries(out.warmInbound.quarantineReasons)
        .filter(([, count]) => count > 0)
        .map(([reason, count]) => `${reason}=${count}`)
        .join(', ');
      console.log(`  Quarantine: ${reasons || 'unclassified'}`);
    }
    console.log(`  NEXT: ${out.next}`);
    if (warm.length) {
      console.log('  Warm inbound:');
      for (const w of warm.slice(0, 8)) console.log(`    - ${w.who} · ${w.channel} · ${w.status}`);
    }
    console.log(`  log: ${PILOT_LOG}`);
    console.log(`  snap: ${path.join(BUSY, 'pilot-inbound.json')}`);
  }
  return 0;
}

function cmdFromWiz() {
  const email = opt('email', '').trim();
  const outcome = (opt('90d', '') || opt('90d-outcome', '') || opt('outcome', '')).trim();
  const brief = opt('brief', '').trim();
  const doLog = args.includes('--log') || args.includes('--log-pilot');
  const openPilotOs = args.includes('--os');
  // An inbound record without a replyable identity cannot be reviewed or
  // attributed honestly. Never synthesize unknown@co.com as if it were a real
  // WIZ submission, and reject before spawning intake or touching PILOT-LOG.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(JSON.stringify({
      error: 'wiz_email_invalid',
      intakeAccepted: false,
      warmLogged: false,
    }));
    return 2;
  }
  if (isPlaceholderIdentity(outcome)) {
    console.error(
      'usage: bin/dg pilot from-wiz --email=f@co.com --90d="specific 90-day outcome" [--brief=…] [--log]',
    );
    return 2;
  }
  // An OS card is operational pipeline state. Do not open one with the
  // display-only fallback "unspecified" in place of a real role/brief.
  if (openPilotOs && isPlaceholderIdentity(brief)) {
    console.error(JSON.stringify({
      error: 'pilot_os_brief_required',
      intakeAccepted: false,
      warmLogged: false,
      pilotOsOpened: false,
    }));
    return 2;
  }
  const intakeArgs = [`--90d=${outcome}`, `--email=${email}`, `--brief=${brief || 'unspecified'}`];
  if (doLog) intakeArgs.push('--log');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-intake-from-wiz.mjs'), ...intakeArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
  });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');

  // A child-start error reports status=null. Never coerce that to success or
  // append demand truth for an intake that did not actually run.
  if (r.error || r.status !== 0) {
    const failure = {
      error: r.error ? 'intake_child_start_failed' : 'intake_failed',
      code: r.error?.code || null,
      status: r.status,
      message: r.error?.message || null,
      warmLogged: false,
    };
    console.error(JSON.stringify(failure));
    return r.error ? 2 : (r.status ?? 1);
  }

  // Always append warm inbound row (not a pilot) unless --no-warm
  if (!args.includes('--no-warm') && email) {
    const warmResult = appendWarm({
      who: email,
      channel: 'wiz',
      status: doLog ? 'triaged→pilot-logger dry' : 'needs human review',
      next: doLog ? 'white-glove if high signal' : 'score + reply if high signal',
    });
    if (!warmResult.ok) {
      console.error(JSON.stringify({
        error: 'warm_inbound_write_failed',
        warmLogged: false,
        intakeAccepted: true,
        path: PILOT_LOG,
      }));
      return 1;
    }
  }

  // Optional pilot-os open card (status=new, source=wiz) when --os
  if (openPilotOs && email) {
    const osResult = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'demigod-pilot-os.mjs'),
        'add',
        '--company',
        email.split('@')[1] || email,
        '--role',
        brief,
        '--source',
        'wiz',
        '--contact',
        email,
        '--90d',
        outcome,
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );
    process.stdout.write(osResult.stdout || '');
    process.stderr.write(osResult.stderr || '');
    if (osResult.error || osResult.status !== 0) {
      console.error(JSON.stringify({
        error: osResult.error ? 'pilot_os_child_start_failed' : 'pilot_os_open_failed',
        code: osResult.error?.code || null,
        status: osResult.status,
        intakeAccepted: true,
        warmLogged: !args.includes('--no-warm'),
        pilotOsOpened: false,
      }));
      return osResult.error ? 2 : (osResult.status ?? 1);
    }
  }

  return 0;
}

function appendWarm({ who, channel, status, next }) {
  const date = operatingDateKey();
  // Keep untrusted inbound text inside one Markdown row. A raw pipe or newline
  // would otherwise shift columns or mint a second, misleading warm row.
  const raw = { who, channel, status, next };
  const invalidField = Object.entries(raw).find(([, value]) => {
    const text = String(value || '');
    return text.length > MAX_WARM_CELL_CHARS ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/.test(text);
  });
  if (invalidField) {
    const [field, value] = invalidField;
    console.error(JSON.stringify({
      error: 'warm_field_invalid',
      field,
      chars: String(value || '').length,
      maxChars: MAX_WARM_CELL_CHARS,
      path: PILOT_LOG,
    }));
    return { ok: false, added: false, duplicate: false };
  }
  const cell = (value) => String(value || '')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();
  const safe = {
    who: cell(who),
    channel: cell(channel),
    status: cell(status),
    next: cell(next),
  };
  if (isPlaceholderIdentity(safe.who)) {
    console.error(JSON.stringify({ error: 'warm_who_placeholder', path: PILOT_LOG }));
    return { ok: false, added: false, duplicate: false };
  }
  // The status readers quarantine linked/HTML identities because they are not
  // plain, attributable evidence. Reject the same input at the write boundary
  // so `pilot warm` cannot claim success for a row that instantly disappears
  // from operational demand truth.
  if (hasUnsafeEvidenceMarkup(safe.who)) {
    console.error(JSON.stringify({ error: 'warm_who_unsafe_markup', path: PILOT_LOG }));
    return { ok: false, added: false, duplicate: false };
  }
  if (!WARM_CHANNELS.has(safe.channel.toLowerCase())) {
    console.error(JSON.stringify({
      error: 'warm_channel_invalid',
      channel: safe.channel,
      allowed: [...WARM_CHANNELS],
      path: PILOT_LOG,
    }));
    return { ok: false, added: false, duplicate: false };
  }
  if (isPlaceholderIdentity(safe.status) || isPlaceholderIdentity(safe.next)) {
    console.error(JSON.stringify({
      error: 'warm_disposition_required',
      status: safe.status || null,
      next: safe.next || null,
      path: PILOT_LOG,
    }));
    return { ok: false, added: false, duplicate: false };
  }
  // Keep the writer and both status readers on the same evidence boundary.
  // Explicit zero-inbound observations and test/ignored notes are useful audit
  // text, but they are not attributable warm signals. Reject them before the
  // append so this command cannot claim a successful log entry that status
  // immediately quarantines.
  const nonSignalReason = explicitWarmNonSignalReason(safe);
  if (nonSignalReason) {
    console.error(JSON.stringify({
      error: 'warm_non_signal',
      reason: nonSignalReason,
      path: PILOT_LOG,
    }));
    return { ok: false, added: false, duplicate: false };
  }
  const values = [safe.who, safe.channel, safe.status, safe.next, date];
  const line = `| ${values.join(' | ')} |\n`;
  let releaseWriterLock;
  try {
    releaseWriterLock = acquirePilotLogWriterLock(PILOT_LOG);
  } catch (error) {
    console.error(JSON.stringify({
      error: error?.code === 'EEXIST' ? 'warm_inbound_writer_busy' : 'warm_inbound_lock_failed',
      code: error?.code || null,
      path: PILOT_LOG,
    }));
    return { ok: false, added: false, duplicate: false };
  }
  try {
  let md = readWholeText(PILOT_LOG);
  if (!md) {
    console.error(JSON.stringify({ error: 'pilot_log_missing', path: PILOT_LOG }));
    return { ok: false, added: false, duplicate: false };
  }
  // Form retries and repeated webhook delivery must not inflate warm-demand
  // counts. Treat an identical same-day signal as an idempotent success.
  // Compare decoded cells rather than raw Markdown. This remains idempotent if
  // the table is indented or a formatter changes spacing around delimiters.
  const parseCells = (row) => {
    const tableRow = String(row || '').trim();
    if (!tableRow.startsWith('|')) return null;
    const cells = tableRow
      .slice(1, tableRow.endsWith('|') ? -1 : undefined)
      .split(/(?<!\\)\|/)
      .map((value) => value.trim().replace(/\\\|/g, '|'));
    return cells.length === 5 ? cells : null;
  };
  const normalizeCell = (value) => String(value || '')
    .replace(/\\\|/g, '|')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const wanted = values.map(normalizeCell);
  // Only rows in the Warm inbound section are idempotency evidence. Other
  // five-column tables (notes, archived queues, etc.) can legitimately repeat
  // the same text and must not suppress a new warm capture.
  // Locate operational Markdown through the same index-preserving masked view
  // used by status parsing. Otherwise a documented example inside a fence or
  // HTML comment can capture this write before the real Warm inbound section.
  const visibleMd = withoutFencedCode(md);
  const warmStart = visibleMd.search(WARM_HEADING_RE);
  const warmRest = warmStart >= 0 ? visibleMd.slice(warmStart) : '';
  // Duplicate evidence is scoped to the live H2 section. A later top-level
  // archive can repeat a row without suppressing a new current capture.
  const warmEnd = warmRest.search(/\n#{1,2}[ \t]+/);
  const warmSection = warmEnd > 0 ? warmRest.slice(0, warmEnd) : warmRest;
  const canonicalHeader =
    /([ \t]*\|\s*Who\s*\|\s*Channel\s*\|\s*Status\s*\|\s*Next\s*\|\s*Date\s*\|\s*\n[ \t]*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*\n)/i;
  const warmHeader = warmSection.match(canonicalHeader);
  // A headerless legacy row is not readable demand evidence, so it cannot be
  // idempotency evidence either. Otherwise `warm` could report "already
  // logged" while both status readers correctly report zero attributable
  // inbound. Search only the canonical table body; malformed content is
  // preserved below when the writer repairs the section.
  const canonicalWarmBody = warmHeader
    ? md.slice(
      warmStart + (warmHeader.index || 0) + warmHeader[0].length,
      warmStart + (warmEnd > 0 ? warmEnd : warmRest.length),
    )
    : '';
  const duplicate = canonicalWarmBody.split('\n').some((existing) => {
    const cells = parseCells(existing);
    return cells && cells.every((value, index) => normalizeCell(value) === wanted[index]);
  });
  if (duplicate) return { ok: true, added: false, duplicate: true };
  // Insert only after the canonical five-column header. Merely seeing two
  // pipe-shaped lines is insufficient: a stale four-column table (or a table
  // copied from another section) would make the appended row ambiguous in
  // Markdown even though the loose status parser could still count it.
  const heading = /(^##[ \t]+Warm inbound(?:[ \t]+\(not a pilot yet\))?[ \t]*\n)/im;
  if (warmHeader && warmStart >= 0) {
    const insertAt = warmStart + warmHeader.index + warmHeader[0].length;
    md = md.slice(0, insertAt) + line + md.slice(insertAt);
  } else if (warmStart >= 0) {
    // The section exists but its table header is missing or has the wrong
    // schema. Prepend a canonical table before adding data; preserve legacy
    // prose/rows below it for audit rather than destructively rewriting them.
    const header = '| Who | Channel | Status | Next | Date |\n|-----|---------|--------|------|------|\n';
    const visibleHeading = warmRest.match(heading);
    const headingEnd = warmStart + (visibleHeading?.index || 0) + (visibleHeading?.[0]?.length || 0);
    md = md.slice(0, headingEnd) + header + line + md.slice(headingEnd);
  } else {
    md += `\n## Warm inbound (not a pilot yet)\n| Who | Channel | Status | Next | Date |\n|-----|---------|--------|------|------|\n${line}`;
  }
  // Demand/status readers run independently of inbound capture. Publish the
  // complete Markdown document in one rename so they never observe a partial
  // table while this process is writing it.
  try {
    writeTextAtomic(PILOT_LOG, md);
  } catch (error) {
    console.error(JSON.stringify({
      error: 'warm_inbound_write_failed',
      code: error?.code || null,
      path: PILOT_LOG,
    }));
    return { ok: false, added: false, duplicate: false };
  }
  return { ok: true, added: true, duplicate: false };
  } finally {
    releaseWriterLock();
  }
}

function cmdWarm() {
  const who = opt('who', '');
  const channel = opt('channel', 'email');
  const status = opt('status', 'new');
  const next = opt('next', 'human review');
  if (!who) {
    console.error('usage: bin/dg pilot warm --who="Name or email" --channel=email|wiz|dm|phone|call [--status=…] [--next=…]');
    return 2;
  }
  const result = appendWarm({ who, channel, status, next });
  const out = {
    ...result,
    who,
    channel,
    status,
    next,
    path: PILOT_LOG,
    note: !result.ok
      ? 'Warm inbound was not logged — not a pilot'
      : result.duplicate
        ? 'Identical same-day warm signal already logged — count unchanged'
        : 'Warm inbound only — not a pilot',
  };
  if (asJson) console.log(JSON.stringify(out, null, 2));
  else console.log(result.ok ? `✓ warm inbound: ${who} (${channel})${result.duplicate ? ' (already logged)' : ''}` : '✗ failed');
  return result.ok ? 0 : 1;
}

function cmdWhiteGlove() {
  const checklist = path.join(OPS, 'WHITE-GLOVE-ON-REPLY.md');
  const logHelp = read(PILOT_LOG, 2500);
  const wg = read(checklist, 4000);
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          checklist,
          pilotLog: PILOT_LOG,
          steps: [
            'Brief + 90d outcome received',
            'Human review recorded (no timing promise)',
            'A focused shortlist when there is a strong fit',
            'Mutual yes before intro',
            'Log via pilot-logger after real delivery',
            'Only then proof snippet',
          ],
        },
        null,
        2,
      ),
    );
    return 0;
  }
  console.log('# white-glove path');
  console.log(`checklist: ${checklist}`);
  console.log(`pilot log: ${PILOT_LOG}`);
  console.log('');
  console.log(wg || '(open WHITE-GLOVE-ON-REPLY.md)');
  console.log('\n--- PILOT-LOG head ---\n');
  console.log(logHelp);
  return 0;
}

function cmdOs() {
  const rest = args.filter((a) => a !== 'os' && a !== 'pilot');
  // if first arg was 'os', rest is the os subcommand
  const i = args.indexOf('os');
  const osArgs = i >= 0 ? args.slice(i + 1) : rest;
  const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-pilot-os.mjs'), ...osArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
  });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  // A launch error is not an OS command result. Fail closed even if Node
  // exposes a stale numeric status alongside the error.
  if (r.error) {
    console.error(JSON.stringify({
      error: 'pilot_os_child_start_failed',
      code: r.error.code || null,
      status: null,
      pilotOsMutated: false,
      message: r.error.message || null,
    }));
    return 2;
  }
  if (r.status !== 0) {
    console.error(JSON.stringify({
      error: 'pilot_os_command_failed',
      status: r.status,
      pilotOsMutated: false,
    }));
    return r.status ?? 1;
  }
  return 0;
}

function cmdSelftest() {
  // Keep this path hermetic: startup/cycle verification must not rewrite the
  // shared inbound snapshot or operational PILOT-LOG merely to test parsers.
  const fixture = withoutFencedCode(`
## Active pipeline
| ID | Founder | Role | 90-day outcome | Status | Next | Date |
|---|---|---|---|---|---|---|
| demo-1 | Sample Founder | Growth | Test outcome | sample fixture | ignore | 2026-01-01 |

## Warm inbound (not a pilot yet)
| Who | Channel | Status | Next | Date |
|---|---|---|---|---|
| Ada Example | email | replied | review pending | 2026-01-01 |
| Test Noise | email | test noise | ignore | 2026-01-01 |
`);
  const warmParsed = parseWarmTable(fixture);
  const warmRows = warmParsed.rows.map((cells) => ({
    who: cells[0], channel: cells[1], status: cells[2], next: cells[3], date: cells[4],
  }));
  const activeRows = parseActiveTable(fixture).map((cells) => ({
    id: cells[0], founder: cells[1], role: cells[2], outcome90: cells[3],
    status: cells[4], next: cells[5], date: cells[6],
  }));
  const headerlessWarm = parseWarmTable(withoutFencedCode(`
## Warm inbound
| Headerless Signal | email | replied | review | 2026-01-01 |
`));
  const malformedActive = parseActiveTableDetailed(withoutFencedCode(`
## Active pipeline
| ID | Founder/co | Role | 90d outcome | Status | Next action | Date |
|---|---|---|---|---|---|---|
| P0 | — | — | — | waiting | inbound only | 2026-01-01 |
`));
  const checks = {
    canonicalWarmSchemaParsed: warmParsed.rawRows === 2 && warmParsed.invalidSchemaRows === 0,
    canonicalWarmRowsNotDuplicated: warmParsed.rows.length === 2,
    headerlessWarmQuarantined: headerlessWarm.rows.length === 0 &&
      headerlessWarm.rawRows === 1 && headerlessWarm.invalidSchemaRows === 1,
    attributableWarmAccepted: warmQuarantineReason(warmRows[0]) === null,
    testWarmQuarantined: warmQuarantineReason(warmRows[1]) === 'test_or_ignored',
    warmNeverPromotedToPilot: activeRows.filter(isRealPilotSignal).length === 0,
    malformedActiveVisibleOnlyAsQuarantine: malformedActive.rows.length === 0 &&
      malformedActive.rawRows === 1 && malformedActive.invalidSchemaRows === 1,
    futureEvidenceRejected: !isObservedDate('2999-01-01'),
    compositeKnownChannelsReadable: isReadableWarmChannel('email + Calendly'),
    repeatedCompositeChannelsDeduplicated: warmInboundIdentityKey({
      who: 'Ada Example', channel: 'email + email + Calendly',
    }) === warmInboundIdentityKey({
      who: 'Ada Example', channel: 'Calendly / email',
    }),
    phoneCallAliasesDeduplicated: warmInboundIdentityKey({
      who: 'Ada Example', channel: 'phone',
    }) === warmInboundIdentityKey({
      who: 'Ada Example', channel: 'call / phone',
    }),
    unknownChannelRejected: !isReadableWarmChannel('carrier-pigeon'),
    unsafeWarmIdentityRejectedBeforeWrite: hasUnsafeEvidenceMarkup('[Ada](https://example.com)') &&
      hasUnsafeEvidenceMarkup('<span>Ada</span>') &&
      !hasUnsafeEvidenceMarkup('Ada Lovelace'),
    unsafeWarmDispositionQuarantined: warmQuarantineReason({
      who: 'Ada Example', channel: 'email', status: 'replied',
      next: '<script>review</script>', date: '2026-01-01',
    }) === 'unsafe_markup',
    latestNextDateIsOperative: (() => {
      const health = warmInboundActionHealth([{
        who: 'Ada Example', channel: 'email', status: 'active',
        next: 'met 2026-01-05; follow up 2026-01-20', date: '2026-01-01',
      }], new Date('2026-01-10T12:00:00Z'));
      return health.overdueActionCount === 0 &&
        health.scheduledActionCount === 1 &&
        health.nextActionDate === '2026-01-20';
    })(),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  const out = {
    schema: 'demigod.pilot-inbound-selftest/1',
    ok: failed.length === 0,
    readOnly: true,
    honesty: { warmInboundIsNotPilot: true, inventsPilots: false },
    checks,
    failed,
  };
  console.log(JSON.stringify(out, null, 2));
  return out.ok ? 0 : 1;
}

function help() {
  console.log(`# demigod-pilot-inbound — WIZ/warm → white-glove (no fake pilots)

  bin/dg pilot status
  bin/dg pilot from-wiz --email=f@co.com --90d="Ship v1 + $50k MRR" [--brief=…] [--log] [--os]
  bin/dg pilot warm --who="Name" --channel=email --status=new --next="reply"
  bin/dg pilot white-glove
  bin/dg pilot os list|add|set|checklist …
  node demigod-pilot-inbound.mjs --selftest

After real intro delivery only:
  node demigod-pilot-logger.mjs --founder=… --brief=… --source=inbound --no-publish
`);
}

const map = {
  help,
  status: cmdStatus,
  'from-wiz': cmdFromWiz,
  fromwiz: cmdFromWiz,
  intake: cmdFromWiz,
  warm: cmdWarm,
  'white-glove': cmdWhiteGlove,
  whiteglove: cmdWhiteGlove,
  wg: cmdWhiteGlove,
  os: cmdOs,
  selftest: cmdSelftest,
};

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const PILOT_FLAGS_OK = (a) =>
    a === '--json' ||
    a === '--selftest' ||
    a === '--log' ||
    a === '--log-pilot' ||
    a === '--os' ||
    a === '--help' ||
    a === '-h' ||
    a === '--email' ||
    a === '--90d' ||
    a === '--brief' ||
    a === '--who' ||
    a === '--channel' ||
    a === '--status' ||
    a === '--next' ||
    a === '--company' ||
    a === '--role' ||
    a === '--source' ||
    a.startsWith('--email=') ||
    a.startsWith('--90d=') ||
    a.startsWith('--brief=') ||
    a.startsWith('--who=') ||
    a.startsWith('--channel=') ||
    a.startsWith('--status=') ||
    a.startsWith('--next=') ||
    a.startsWith('--company=') ||
    a.startsWith('--role=') ||
    a.startsWith('--source=');
  const unknownPilotFlag = args.find((a) => a.startsWith('-') && !PILOT_FLAGS_OK(a));
  if (unknownPilotFlag) {
    console.error(
      `pilot: unknown argument ${unknownPilotFlag} — try: bin/dg pilot status|from-wiz|warm|white-glove|os|selftest [--json]`,
    );
    process.exit(2);
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`demigod-pilot-inbound — inbound → pilot path (no fake pilots)

Usage: bin/dg pilot status|from-wiz|warm|white-glove|os|selftest [--json]`);
    process.exit(0);
  }
  if (!map[cmd]) {
    console.error('usage: bin/dg pilot status|from-wiz|warm|white-glove|os|help');
    process.exitCode = 2;
  } else {
    // Let stdout/stderr drain before Node exits. Demand/control invoke this CLI
    // with captured pipes, where process.exit() can truncate the JSON contract.
    process.exitCode = map[cmd]() ?? 0;
  }
}
