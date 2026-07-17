#!/usr/bin/env node
/**
 * demigod-demand — GTM / demand ops surface (DRAFTS-ONLY default)
 *
 *   bin/dg demand status|queue|log|templates|draft|send|help
 *   bin/dg demand draft --name=T0 [--json]   # copy-paste pack — never sends
 *   bin/dg demand send …                    # refused; only --dry is allowed
 *   bin/dg demand log --note "…"
 *
 * Honesty: never invents pilots; only SENT-CONFIRMED counts as sent.
 * Auto-DM STOPPED (website-first). External sends stay outside this tool.
 */
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { beginRun, sealRun } from './demigod-evidence.mjs';
import { writeJsonAuto } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
// Tests and other isolated readers may redirect the materialized status card.
// Without this boundary, a fixture status run can overwrite the production
// card consumed by `bin/dg orient` and briefly present canary demand as truth.
const DEMAND_STATUS = process.env.DEMIGOD_DEMAND_STATUS || path.join(BUSY, 'demand-status.json');
const OPS = path.join(ROOT, 'demigod-ops');
const OUTREACH = path.join(ROOT, 'demigod-outreach');
const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith('-')) || 'status';
const asJson = args.includes('--json');
const WARM_HEADING_RE = /^##[ \t]+Warm inbound(?:[ \t]+\(not a pilot yet\))?[ \t]*$/im;

/** Publish the canonical status as one complete snapshot for concurrent readers. */
function writeDemandStatusAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const pretty = process.env.DEMIGOD_JSON_PRETTY === '1';
  const payload = (pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value)) + '\n';
  // Multiple status refreshes can share both a PID and millisecond in embedded
  // callers. A random suffix keeps one publication from opening or cleaning
  // up another publication's temporary file.
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  let handle;
  try {
    handle = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(handle, payload, 'utf8');
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = undefined;
    fs.renameSync(temp, file);
    // Persist the directory entry before advertising a successful refresh.
    const dirHandle = fs.openSync(path.dirname(file), 'r');
    try {
      fs.fsyncSync(dirHandle);
    } finally {
      fs.closeSync(dirHandle);
    }
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
    try { fs.unlinkSync(temp); } catch { /* rename succeeded or no temp exists */ }
  }
}

function read(p, max = 200_000) {
  try {
    return fs.readFileSync(p, 'utf8').slice(0, max);
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
  // Markdown examples are not demand evidence. Mask fenced blocks before
  // locating PILOT-LOG sections so a documented sample table cannot become a
  // warm signal or an active pilot merely because it appears first. A missing
  // closing fence masks through EOF: truncated documentation is not evidence.
  let fence = null;
  let htmlComment = false;
  return String(md || '').split('\n').map((line) => {
    const marker = line.match(/^[ \t]*(`{3,}|~{3,})/);
    const activeFence = fence;
    if (!fence && marker) fence = { char: marker[1][0], length: marker[1].length };
    const commentStarts = !fence && line.includes('<!--');
    if (commentStarts) htmlComment = true;
    const masked = fence || htmlComment ? line.replace(/./g, ' ') : line;
    if (htmlComment && line.includes('-->')) htmlComment = false;
    if (activeFence && marker && marker[1][0] === activeFence.char && marker[1].length >= activeFence.length &&
        new RegExp(`^[ \\t]*\\${activeFence.char}{${activeFence.length},}[ \\t]*$`).test(line)) fence = null;
    return masked;
  }).join('\n');
}

function parseQueue(md) {
  const rows = [];
  const seen = new Set();
  // The queue is the first, schema-labelled table. Do not scan every table in
  // the document: operator notes and archived summaries are not demand rows.
  const header = md.search(/^\s*\|\s*Prio\s*\|\s*Name\s*\|\s*Handle\s*\|\s*Company\s*\|\s*Why first\s*\|\s*Open\s*\|\s*After send\s*\|\s*$/im);
  if (header < 0) return rows;
  const table = md.slice(header).split(/\n\s*\n|\n(?=##?\s+)/, 1)[0];
  for (const line of table.split('\n')) {
    const tableLine = line.trim();
    if (!tableLine.startsWith('|')) continue;
    const cells = tableLine
      .slice(1, tableLine.endsWith('|') ? -1 : undefined)
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
    if (cells.length !== 7) continue;
    if (cells.every((c) => /^:?-{3,}:?$/.test(c)) || /^Prio$/i.test(cells[0])) continue;
    const [prio, name, handle, company, why, open, after] = cells;
    if (!name || !/^@[A-Za-z0-9_]{1,30}$/.test(handle)) continue;
    const key = handle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      prio: prio || 'med',
      name,
      handle: handle || '',
      company: company || '',
      why: why || '',
      open: open || '',
      after: after || '',
    });
  }
  return rows;
}

function parseSendLog(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
  // A keyword anywhere in a note is not send evidence. Accept only the
  // canonical receipt shape, require an observed date + attributable handle,
  // and count a handle once even if legacy syncs duplicated its receipt.
  const parseReceipt = (line, kind) => {
    const cells = String(line || '').split('|').map((cell) => cell.trim());
    if (cells.length < 5 || cells[0].toUpperCase() !== kind) return null;
    const [receiptKind, date, handle, company, channel, ...metadata] = cells;
    if (!isObservedDate(date) || !/^@[A-Za-z0-9_]{1,30}$/.test(handle)) return null;
    if (!company || !channel) return null;
    const attestedFields = metadata.filter((cell) => /^attested=/i.test(cell));
    const viaFields = metadata.filter((cell) => /^via=/i.test(cell));
    // Reserved evidence fields are singular. Accepting the first duplicate
    // lets a contradictory suffix (attested=1 | attested=0) masquerade as a
    // confirmed receipt depending on field order.
    if (attestedFields.length !== 1 || viaFields.length > 1) return null;
    const [attested] = attestedFields;
    const [via] = viaFields;
    // A label alone is not evidence. Each receipt kind must carry the exact
    // attestation value its name claims; contradictory or missing metadata is
    // malformed telemetry, not an observed send attempt.
    if (receiptKind === 'SENT-CONFIRMED' && !/^attested=1$/i.test(attested || '')) return null;
    if (receiptKind === 'SENT-UNATTESTED' && !/^attested=0$/i.test(attested || '')) return null;
    // The startup surface is drafts-only. A legacy or forged receipt that says
    // an agent/automation sent it directly contradicts that boundary and must
    // never become confirmed demand evidence, even when it also says
    // `attested=1`. External/manual receipts remain attributable via their
    // explicit channel metadata.
    if (receiptKind === 'SENT-CONFIRMED' && /^via=(?:agent(?:-auto)?|auto(?:mation)?)$/i.test(via || '')) return null;
    return { line, handle: handle.toLowerCase() };
  };
  const malformedReceiptReason = (line) => {
    const cells = String(line || '').split('|').map((cell) => cell.trim());
    if (cells.length < 5) return 'invalid_schema';
    const [kind, date, handle, company, channel, ...metadata] = cells;
    if (!isObservedDate(date)) return 'invalid_or_future_date';
    if (!/^@[A-Za-z0-9_]{1,30}$/.test(handle)) return 'invalid_handle';
    if (!company || !channel) return 'missing_attribution';
    const attestedFields = metadata.filter((cell) => /^attested=/i.test(cell));
    const viaFields = metadata.filter((cell) => /^via=/i.test(cell));
    // Duplicated reserved keys are contradictory metadata. A missing key is a
    // separate attestation failure so operators can count each class honestly.
    if (attestedFields.length > 1 || viaFields.length > 1) return 'conflicting_metadata';
    const [attested] = attestedFields;
    const [via] = viaFields;
    if (kind.toUpperCase() === 'SENT-CONFIRMED' && /^via=(?:agent(?:-auto)?|auto(?:mation)?)$/i.test(via || '')) {
      return 'prohibited_auto_send';
    }
    if (
      attestedFields.length !== 1 ||
      (kind.toUpperCase() === 'SENT-CONFIRMED' && !/^attested=1$/i.test(attested || '')) ||
      (kind.toUpperCase() === 'SENT-UNATTESTED' && !/^attested=0$/i.test(attested || ''))
    ) return 'invalid_attestation';
    return 'invalid_receipt';
  };
  const receiptLines = lines.filter((line) => /^SENT-(?:CONFIRMED|UNATTESTED)\s*\|/i.test(line));
  const parsedReceiptByLine = new Map(receiptLines.map((line) => {
    const kind = line.split('|', 1)[0].trim().toUpperCase();
    return [line, parseReceipt(line, kind)];
  }));
  // Invalid receipt-shaped rows stay quarantined instead of disappearing from
  // status. They never count as send evidence, but operators can now see that
  // the append-only log contains contradictory or incomplete telemetry.
  const malformedLines = receiptLines.filter((line) => !parsedReceiptByLine.get(line));
  const malformedReasons = {};
  for (const line of malformedLines) {
    const reason = malformedReceiptReason(line);
    malformedReasons[reason] = (malformedReasons[reason] || 0) + 1;
  }
  const confirmedReceipts = receiptLines
    .filter((line) => /^SENT-CONFIRMED\s*\|/i.test(line))
    .map((line) => parsedReceiptByLine.get(line))
    .filter(Boolean);
  const confirmedByHandle = new Map();
  for (const receipt of confirmedReceipts) {
    if (!confirmedByHandle.has(receipt.handle)) confirmedByHandle.set(receipt.handle, receipt.line);
  }
  const confirmed = [...confirmedByHandle.values()];
  // Unattested is still an operational metric, so keep its evidence boundary
  // as strict as confirmed receipts. Notes containing the keyword, malformed
  // rows, future dates, and duplicate sync rows must not inflate it.
  const unattestedByHandle = new Map();
  for (const receipt of receiptLines
    .filter((line) => /^SENT-UNATTESTED\s*\|/i.test(line))
    .map((line) => parsedReceiptByLine.get(line))
    .filter(Boolean)) {
    // A later externally attested receipt promotes the attempt to confirmed.
    // Keep the metrics mutually exclusive so one handle cannot inflate both
    // operational buckets when the append-only log retains its earlier row.
    if (confirmedByHandle.has(receipt.handle)) continue;
    if (!unattestedByHandle.has(receipt.handle)) {
      unattestedByHandle.set(receipt.handle, receipt.line);
    }
  }
  const unattested = [...unattestedByHandle.values()];
  const handles = new Set(confirmedByHandle.keys());
  const logPath = process.env.DEMIGOD_DM_LOG || path.join(OUTREACH, 'dm-send-log.txt');
  return {
    lines: confirmed,
    count: confirmed.length,
    unattestedCount: unattested.length,
    unattestedLines: unattested.slice(-5),
    malformedCount: malformedLines.length,
    malformedLines: malformedLines.slice(-5),
    malformedReasons,
    handles,
    path: logPath,
  };
}

function sendLogPath() {
  return process.env.DEMIGOD_DM_LOG || path.join(OUTREACH, 'dm-send-log.txt');
}

function pilotLogPath() {
  return process.env.DEMIGOD_PILOT_LOG || path.join(OPS, 'PILOT-LOG.md');
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
  // Date.parse can roll impossible calendar dates forward. Pilot evidence must
  // be an explicit ISO timestamp with a real date and an observed instant.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return false;
  if (!isIsoCalendarDate(text.slice(0, 10))) return false;
  const parsed = Date.parse(text);
  return !Number.isNaN(parsed) && parsed <= Date.now();
}

function hasObservedPilotTimestamp(pilot) {
  // Preserve timestamp-less legacy records, but never promote an explicitly
  // malformed or future-dated Pilot OS row into current startup demand truth.
  if (!Object.prototype.hasOwnProperty.call(pilot, 'at')) return true;
  return isObservedTimestamp(pilot.at);
}

function queuePath() {
  return process.env.DEMIGOD_QUEUE_MD || path.join(OPS, 'SEND-QUEUE-PRIORITIZED.md');
}

/** Parse only the Active pipeline table (not Warm inbound — those are not pilots). */
function parsePilotTable(md) {
  const rows = [];
  const seen = new Set();
  // Only the canonical current section is delivery evidence. Headings such as
  // "Archived Active pipeline" or "Active pipeline notes" are historical.
  const start = md.search(/^##[ \t]+Active pipeline[ \t]*$/im);
  if (start < 0) return rows;
  const rest = md.slice(start);
  // An H2 section ends at the next H1 or H2. A top-level archive heading is
  // just as strong a boundary as a sibling H2 and must not leak rows back
  // into the current delivery table.
  const end = rest.search(/\n#{1,2}[ \t]+/);
  const section = end > 0 ? rest.slice(0, end) : rest;
  const lines = section.split('\n');
  const headerIndex = lines.findIndex((line) => {
    const cells = String(line || '').trim().split('|').slice(1, -1).map((cell) => cell.trim().toLowerCase());
    return cells.length === 7 &&
      cells.join('|') === 'id|founder|role|90-day outcome|status|next|date';
  });
  // A seven-cell row is not evidence by itself. Require the canonical schema
  // so legacy/corrupt tables cannot be misread as current delivery state.
  if (headerIndex < 0) return rows;
  for (const line of lines.slice(headerIndex + 1)) {
    const tableLine = line.trim();
    if (!tableLine.startsWith('|')) continue;
    const cells = tableLine
      .slice(1, tableLine.endsWith('|') ? -1 : undefined)
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
    if (cells.length !== 7) continue;
    if (cells.every((c) => /^:?-{3,}:?$/.test(c)) || /Founder|^ID$/i.test(cells[0])) continue;
    const [id, founder, role, outcome90, status, next, date] = cells;
    if (!id || id === 'ID') continue;
    const placeholder = (value) => {
      const plain = String(value || '').replace(/[*_`~]/g, '').trim().toLowerCase();
      return !plain || ['—', '–', '-', 'n/a', 'na', 'none', 'tbd'].includes(plain);
    };
    // Keep the single all-empty/template row visible for honest table-state
    // reporting, but reject partially written real rows altogether. Treating a
    // named founder with a missing outcome/disposition as a table row makes a
    // transient Markdown write look like delivered pipeline evidence.
    const founderPlaceholder = placeholder(founder);
    const partialRealRow = !founderPlaceholder &&
      [id, founder, role, outcome90, status, next].some(placeholder);
    if (partialRealRow) continue;
    const empty = founderPlaceholder || placeholder(id) || !isObservedDate(date);
    const row = {
      id,
      founder: empty ? null : founder,
      role: role || '',
      outcome90: outcome90 || '',
      status: status || '',
      next: next || '',
      date: date || '',
      empty: Boolean(empty),
    };
    const signalText = [id, founder, role, outcome90, status, next].join(' ').toLowerCase();
    if (/\b(?:test|demo|sample)\s+(?:noise|only|fixture)\b|\bfixture\b|\bignore(?:d)?\b/.test(signalText)) {
      continue;
    }
    const key = [id, founder, role, outcome90, status, next, date]
      .map((value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase())
      .join('\u001f');
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  // The log is append-only and a pilot ID is its stable identity. Preserve
  // the newest observed state for each ID so demand status cannot surface an
  // older matching/review row after an intro/close update was appended.
  const latestById = new Map();
  for (const row of rows) latestById.set(String(row.id).trim().toLowerCase(), row);
  return [...latestById.values()];
}

function parseWarmInbound(md) {
  const rows = [];
  let rawRows = 0;
  const quarantineReasons = {};
  const quarantine = (reason) => {
    quarantineReasons[reason] = (quarantineReasons[reason] || 0) + 1;
  };
  const seen = new Set();
  // Phone conversations are attributable warm inbound, never pilot or send
  // evidence. Accept both common labels so manual PILOT-LOG rows and the
  // inbound writer resolve to the same demand truth.
  const allowedChannels = new Set(['email', 'wiz', 'dm', 'form', 'calendly', 'phone', 'call']);
  const placeholder = (value) => {
    const plain = String(value || '')
      .replace(/[*_`~]/g, '')
      .replace(/&mdash;|&#8212;|&#x2014;/gi, '—')
      .trim()
      .toLowerCase();
    return !plain || ['—', '–', '-', 'n/a', 'na', 'none', 'tbd'].includes(plain);
  };
  const isReadableChannel = (value) => {
    const parts = String(value || '')
      .toLowerCase()
      .split(/\s*(?:\+|&|\/)\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 && parts.every((part) => allowedChannels.has(part));
  };
  const hasUnsafeEvidenceMarkup = (value) =>
    /<\/?[a-z][^>]*>|!?\[[^\]]*\]\([^)]*\)/i.test(String(value || '')) ||
    /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/.test(String(value || ''));
  // Only the canonical live section is current demand evidence. Archive or
  // notes headings that merely begin with "Warm inbound" must stay historical.
  const start = md.search(WARM_HEADING_RE);
  if (start < 0) return { rows, rawRows, quarantineReasons };
  const rest = md.slice(start);
  // Stop at either a sibling H2 or a new top-level document section. Only
  // H3+ content remains nested under Warm inbound.
  const end = rest.search(/\n#{1,2}[ \t]+/);
  const section = end > 0 ? rest.slice(0, end) : rest;
  const lines = section.split('\n');
  const headerIndex = lines.findIndex((line) => {
    const cells = String(line || '')
      .trim()
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim().toLowerCase());
    return cells.length === 5 && cells.join('|') === 'who|channel|status|next|date';
  });
  // Row-shaped content before (or without) the canonical header is malformed
  // evidence, not invisible prose. Keep it in quarantine telemetry so demand
  // and pilot-inbound report the same damaged log without promoting a signal.
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
      quarantine('invalid_schema');
    }
  };
  quarantinePreHeaderRows(lines.slice(1, headerIndex < 0 ? undefined : headerIndex));
  // A heading plus a row-shaped fragment is not attributable inbound. Require
  // the canonical schema; malformed rows above remain explicitly quarantined.
  if (headerIndex < 0) return { rows, rawRows, quarantineReasons };
  for (const line of lines.slice(headerIndex + 1)) {
    const tableLine = line.trim();
    if (!tableLine.startsWith('|')) continue;
    const cells = tableLine
      .slice(1, tableLine.endsWith('|') ? -1 : undefined)
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
    // Count every non-separator row under the canonical header before the
    // honesty filters run. This keeps malformed/manual signals observable as
    // quarantine telemetry without promoting them to attributable demand.
    const separator = cells.every((c) => /^:?-{3,}:?$/.test(c));
    if (separator) continue;
    rawRows += 1;
    // Warm inbound has a fixed five-column schema. Reject partial or shifted
    // rows so a transient Markdown write cannot become a demand signal.
    if (cells.length !== 5) {
      quarantine('invalid_schema');
      continue;
    }
    const [who, channel, status, next, date] = cells;
    const plainWho = String(who || '')
      .replace(/[*_`~]/g, '')
      .replace(/&mdash;|&#8212;|&#x2014;/gi, '—')
      .trim()
      .toLowerCase();
    if (
      ['who', '—', '–', '-', 'n/a', 'na', 'none', 'tbd', ''].includes(plainWho) ||
      separator
    ) {
      quarantine('placeholder_identity');
      continue;
    }
    // Evidence cells are identifiers, not presentation. Reject hand-written
    // links/HTML so a label such as `[Founder](unknown)` cannot be counted as
    // an attributable person or disguise an invalid channel.
    // Every text cell is later surfaced by demand/control/dashboard readers.
    // Quarantine markup in disposition fields too: a hand-edited log must not
    // turn HTML/Markdown or control bytes into trusted operational telemetry.
    if ([who, channel, status, next].some(hasUnsafeEvidenceMarkup)) {
      quarantine('unsafe_markup');
      continue;
    }
    const signalText = [who, channel, status, next].join(' ').toLowerCase();
    // Preserve explicit non-signals as audit rows, but explain their exclusion
    // before structural validation obscures the operational truth (for example,
    // a test date range or an inbox check recorded with channel "inbox").
    if (/\b(?:test|demo|sample)\s+(?:noise|only)\b|\bignore(?:d)?\b/.test(signalText)) {
      quarantine('test_or_ignored');
      continue;
    }
    if (/\b(?:0|zero|no)\s+(?:inbound\s+)?(?:threads?|replies|responses|messages?)\b|\b(?:empty|no)\s+inbox\b/.test(signalText)) {
      quarantine('no_observed_inbound');
      continue;
    }
    if (!isReadableChannel(channel)) {
      quarantine('invalid_channel');
      continue;
    }
    if (!isObservedDate(date)) {
      quarantine('invalid_or_future_date');
      continue;
    }
    if (placeholder(status) || placeholder(next)) {
      quarantine('missing_disposition');
      continue;
    }
    const row = { who, channel: channel || '', status: status || '', next: next || '', date: date || '' };
    // Treat identical normalized rows as one demand signal. The writer also
    // refuses duplicates, but the reader must stay honest with legacy/manual
    // logs that already contain the same row more than once.
    const key = [row.who, row.channel, row.status, row.next, row.date]
      .map((value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase())
      .join('\u001f');
    if (seen.has(key)) {
      quarantine('duplicate');
      continue;
    }
    seen.add(key);
    rows.push(row);
  }
  return { rows, rawRows, quarantineReasons };
}

function warmInboundFreshness(rows, now = new Date()) {
  const currentRows = latestWarmInboundSignals(rows);
  // Freshness is operational work health, not historical retention. Closed
  // threads remain in `warmInbound.rows` as evidence, but must not age into a
  // stale alert after an explicit terminal disposition supersedes them.
  const actionableRows = currentRows.filter((row) => !isResolvedWarmDisposition(row));
  const today = Date.parse(`${operatingDateKey(now)}T00:00:00Z`);
  const ages = actionableRows.map((row) => Math.max(0, Math.floor((today - Date.parse(`${row.date}T00:00:00Z`)) / 86400000)));
  const stale = actionableRows.filter((_, index) => ages[index] > 7);
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
  // Warm inbound is an append-only state log. A later disposition for the same
  // person supersedes older pending work; otherwise a closed thread remains
  // permanently overdue. Input order breaks same-day ties in favor of the
  // last appended observation.
  const latestByWho = new Map();
  for (const row of rows) {
    const key = warmInboundIdentityKey(row);
    const previous = latestByWho.get(key);
    if (!previous || String(row.date) >= String(previous.date)) latestByWho.set(key, row);
  }
  return [...latestByWho.values()];
}

function warmInboundIdentityKey(row) {
  // Display names are not globally unique. Keep independent email/LinkedIn/
  // referral threads separate while still letting a later disposition on the
  // same channel supersede that contact's earlier append-only state.
  // Composite channels are a set: reversed separators/order still describe
  // one thread and must not inflate current warm-demand telemetry.
  const who = String(row?.who || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const channel = String(row?.channel || '')
    .toLowerCase()
    .split(/\s*(?:\+|&|\/)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    // `call` and `phone` are accepted labels for the same attributable
    // conversation channel. Canonicalize before set deduplication so a manual
    // row and an inbound-writer row cannot count one thread twice.
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
      // A single note may retain a completed meeting date before its current
      // follow-up date. The latest valid date is the operative next action;
      // treating every mentioned date as live creates a false overdue alert.
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
  const actionItems = (signals) => signals.map((row) => {
    const detail = actionDetailFor(row);
    return {
      who: String(row.who || '').replace(/\s+/g, ' ').trim(),
      channel: String(row.channel || '').replace(/\s+/g, ' ').trim(),
      actionDate: actionDatesFor(row)[0] || null,
      ...detail,
      // Backward-compatible raw disposition; action/actionSource prevent
      // consumers from presenting completed next-work as the due action.
      next: String(row.next || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    };
  }).sort((a, b) =>
    String(a.actionDate || '').localeCompare(String(b.actionDate || '')) ||
    a.who.localeCompare(b.who)
  ).slice(0, 20);
  // A date/count alone is not actionable for API consumers: they would have
  // to reparse PILOT-LOG.md to learn which warm signal is scheduled. Expose a
  // bounded, date-ordered projection while keeping it explicitly separate
  // from pilot and send evidence.
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
  const terminal = /^(?:closed|complete(?:d)?|done|declined|withdrawn|opted out|not (?:a fit|interested)|no follow[- ]?up|resolved)\b/;
  return terminal.test(next) || (terminal.test(status) && !/\b(?:follow[- ]?up|review|reply|call|meet|schedule|send|pending|next)\b/.test(next));
}

function isOpenPilotOsSignal(pilot) {
  if (!pilot || typeof pilot !== 'object' || pilot.sample === true) return false;
  if (!hasObservedPilotTimestamp(pilot)) return false;
  const placeholder = (value) => {
    const plain = String(value || '').replace(/[*_`~]/g, '').trim().toLowerCase();
    return !plain || ['—', '–', '-', 'n/a', 'na', 'none', 'tbd'].includes(plain);
  };
  const status = String(pilot.status || '').trim().toLowerCase();
  if (!status || ['hired', 'closed', 'churned'].includes(status)) return false;
  return ![pilot.id, pilot.company, pilot.role, pilot.outcome90d].some(placeholder) &&
    isReplyableContact(pilot.contact);
}

function isReplyableContact(value) {
  const contact = String(value || '').trim();
  const plain = contact.replace(/[*_`~]/g, '').trim().toLowerCase();
  if (!plain || ['—', '–', '-', 'n/a', 'na', 'none', 'tbd'].includes(plain)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return true;
  if (/^@[A-Za-z0-9_]{1,32}$/.test(contact)) return true;
  if (/^https?:\/\/[^\s.]+(?:\.[^\s.]+)+(?:\/\S*)?$/.test(contact)) return true;
  // Keep Pilot OS counts attributable: prose that merely contains seven
  // digits is not a replyable phone contact.
  if (!/^\+?[0-9][0-9().\s-]{5,}[0-9]$/.test(contact)) return false;
  const digits = contact.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function countOpenPilotOs(store) {
  const latestById = new Map();
  for (const pilot of Array.isArray(store?.pilots) ? store.pilots : []) {
    const id = String(pilot?.id || '').trim().toLowerCase();
    if (id) latestById.set(id, pilot);
  }
  // The store is append-only history. Count only the newest observed state
  // for each ID; filtering first would preserve a stale open row after close.
  return [...latestById.values()].filter(isOpenPilotOsSignal).length;
}

function listTemplates() {
  const files = [
    { id: 'reply', path: path.join(OPS, 'REPLY-TEMPLATES.md'), title: 'Reply templates' },
    { id: 'white-glove', path: path.join(OPS, 'WHITE-GLOVE-ON-REPLY.md'), title: 'White-glove on reply' },
  ];
  return files.map((f) => ({
    ...f,
    exists: fs.existsSync(f.path),
    bytes: fs.existsSync(f.path) ? fs.statSync(f.path).size : 0,
  }));
}

function cmdSend() {
  const dry = args.includes('--dry');

  // Startup demand is drafts-only. Do not retain an environment-variable
  // escape hatch: inherited shell state must never turn a status/draft tool
  // into an external sender. Dry runs remain available for local validation.
  if (!dry) {
    const nameIdx = args.findIndex((a) => a === '--name' || a.startsWith('--name='));
    let hintName = 'T0';
    if (nameIdx >= 0) {
      const a = args[nameIdx];
      hintName = a.startsWith('--name=') ? a.slice(7) : args[nameIdx + 1] || 'T0';
    } else {
      const pos = args.filter((a) => !a.startsWith('-') && a !== 'send');
      if (pos[0]) hintName = pos[0];
    }
    const report = {
      schema: 'demigod.demand.send/1',
      ok: false,
      error: 'auto_dm_stopped',
      policy: 'drafts-only',
      hint: `Draft only: bin/dg demand draft --name=${hintName}; no send was attempted`,
      overrideAllowed: false,
      dryAllowed: 'bin/dg demand send --name=NAME --dry',
    };
    fs.mkdirSync(BUSY, { recursive: true });
    writeJsonAuto(path.join(BUSY, 'dm-auto-send.json'), report);
    console.error(JSON.stringify(report, null, 2));
    return 2;
  }

  const nameIdx = args.findIndex((a) => a === '--name' || a.startsWith('--name='));
  const namesIdx = args.findIndex((a) => a === '--names' || a.startsWith('--names='));
  const sendArgs = [];
  if (nameIdx >= 0) {
    const a = args[nameIdx];
    const n = a.startsWith('--name=') ? a.slice(7) : args[nameIdx + 1];
    if (n) sendArgs.push(`--name=${n}`);
  }
  if (namesIdx >= 0) {
    const a = args[namesIdx];
    const n = a.startsWith('--names=') ? a.slice(8) : args[namesIdx + 1];
    if (n) sendArgs.push(`--names=${n}`);
  }
  // positional: demand send T0 Hellyeah
  const pos = args.filter((a) => !a.startsWith('-') && a !== 'send');
  for (const p of pos) sendArgs.push(`--name=${p}`);
  if (!sendArgs.length) sendArgs.push('--names=T0,Hellyeah,Weave');
  if (dry) sendArgs.push('--dry');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-dm-auto-send.mjs'), ...sendArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 600000,
    stdio: 'inherit',
  });
  return r.status ?? 1;
}

function buildStatus() {
  const statusPath = DEMAND_STATUS;
  const statusAt = new Date().toISOString();
  const freeze = freezeStatus();
  const truth = readJson(path.join(BUSY, 'truth.json'));
  const queueMd = read(queuePath());
  const pilotMd = withoutFencedCode(read(pilotLogPath()));
  const sendLog = parseSendLog(read(sendLogPath()));
  const queue = parseQueue(queueMd);
  const pilots = parsePilotTable(pilotMd);
  const warmParsed = parseWarmInbound(pilotMd);
  const warmInbound = warmParsed.rows;
  const warmFreshness = warmInboundFreshness(warmInbound);
  const realPilots = pilots.filter((p) => !p.empty);
  const pending = queue.filter((q) => {
    const h = (q.handle || '').toLowerCase();
    return h && !sendLog.handles.has(h);
  });
  const sentFromQueue = queue.filter((q) => sendLog.handles.has((q.handle || '').toLowerCase()));
  const top3 = pending.slice(0, 3);
  // Agent pack quality for top pending (advisory; never blocks status)
  const top3Drafts = top3.map((t) => {
    const { body, readyFile } = loadDraftBody(t);
    const hygiene = draftHygiene({ name: t.name, company: t.company, handle: t.handle, body });
    return {
      name: t.name,
      handle: t.handle,
      readyFile,
      hygieneOk: hygiene.ok,
      flagCount: hygiene.flags.length,
      flags: hygiene.flags,
      draftCmd: `bin/dg demand draft --name=${t.name}`,
    };
  });
  const draftsNeedFix = top3Drafts.filter((d) => !d.hygieneOk || d.flagCount > 0);
  const draftHygieneOk = top3Drafts.length > 0
    ? draftsNeedFix.length === 0
    : null;
  const draftHygieneReceipt = {
    statusPath,
    jsonPointer: '/drafts/hygiene',
    source: 'drafts.hygiene',
    at: statusAt,
    // This receipt is created in the same status materialization, so its
    // source-side freshness is explicit. Cached consumers still recompute
    // age/staleness from `at` when they read it later.
    ageSec: 0,
    stale: false,
    clockSkewed: false,
    checked: top3Drafts.length,
    clean: top3Drafts.filter((d) => d.hygieneOk && d.flagCount === 0).length,
    flagged: draftsNeedFix.length,
    ok: draftHygieneOk,
  };

  // Keep public board evidence and operational pilot state separate. The
  // board schema contains roles, not pilots; treating a removed `pilots`
  // field as startup truth produced a permanent "?" on the demand surface.
  const board = readJson(path.join(ROOT, 'demigod-board.json'));
  const boardRoles = Array.isArray(board?.roles) ? board.roles : [];
  const boardEvidence = {
    realRoles: Number.isInteger(board?.realRoles)
      ? board.realRoles
      : boardRoles.filter((role) => role?.sample !== true).length,
    sampleRoles: boardRoles.filter((role) => role?.sample === true).length,
  };
  const pilotOsOpen = countOpenPilotOs(readJson(path.join(ROOT, 'DEMIGOD-PILOTS.json')));

  // Inbound is observed demand; draft packs are only prepared outbound. Keep
  // an overdue attributable inbound action above draft hygiene on orient and
  // dashboard surfaces so a real signal cannot be buried by an eight-row
  // queue. This changes prioritization only: warm inbound remains != pilot and
  // no send or SENT receipt is created.
  const nextAgent = warmFreshness.overdueActionCount > 0
    ? `Agent: review overdue warm inbound · ${warmFreshness.overdueActionCount} signal${warmFreshness.overdueActionCount === 1 ? '' : 's'}` +
      `${warmFreshness.overdueActionOldestDays == null ? '' : ` · oldest ${warmFreshness.overdueActionOldestDays}d`}` +
      `${warmFreshness.overdueActionItems[0]?.actionDate ? ` · action ${warmFreshness.overdueActionItems[0].actionDate}` : ''}` +
      ` · ${warmFreshness.overdueActionWho.join(', ')} · warm ≠ pilot`
    : warmFreshness.dueTodayActionCount > 0
      ? `Agent: review warm inbound due today · ${warmFreshness.dueTodayActionCount} signal${warmFreshness.dueTodayActionCount === 1 ? '' : 's'} · ${warmFreshness.dueTodayActionWho.join(', ')} · warm ≠ pilot`
    : top3.length
      ? `Agent: draft packs ready for ${top3.map((t) => t.name).join(' → ')} · hygiene ${draftsNeedFix.length ? draftsNeedFix.map((d) => d.name + (d.hygieneOk ? ':warn' : ':fail')).join(',') : 'ok'} · mark-sent only after real send`
      : sendLog.count
        ? 'Queue handles all marked SENT-CONFIRMED — refresh queue or pilot inbound'
        : 'No queue rows parsed — check demigod-ops/SEND-QUEUE-PRIORITIZED.md';

  // Progress: only attested SENT; queue names never invented from ghost log handles
  const ghostHandles = [...sendLog.handles].filter(
    (h) => !queue.some((q) => (q.handle || '').toLowerCase() === h),
  );

  return {
    schema: 'demigod.demand/1',
    at: statusAt,
    statusPath,
    // File-only consumers should not have to know the dashboard's projection
    // contract to locate the canonical draft-hygiene receipt. Keep the path
    // and pointer beside the materialized demand status itself.
    statusPathView: {
      path: statusPath,
      // Status consumers run from terminals, the dashboard, and canary
      // subprocesses with different working directories. Make path semantics
      // explicit so a relative override cannot be mistaken for a canonical,
      // globally discoverable receipt.
      absolute: path.isAbsolute(statusPath),
      orientApi: '/api/orient',
      // Name the hygiene evidence path explicitly as well as the containing
      // status file. Dashboard/status consumers should not have to infer that
      // both paths are intentionally identical for this materialization.
      draftsHygieneStatusPath: statusPath,
      draftsHygieneJsonPointer: '/drafts/hygiene',
      // Keep a directly usable path as well as the RFC-6901 pointer. Status
      // readers commonly log this small discovery object without retaining
      // the surrounding payload; the dotted path makes the hygiene receipt
      // discoverable in that compact view without inventing a second value.
      draftsHygienePath: 'drafts.hygiene',
      visible: Boolean(statusPath) && path.isAbsolute(statusPath),
      // Carry the receipt as well as its locator. A file-only reader can now
      // distinguish fresh-clean, flagged, and the honest no-drafts `unknown`
      // state without resolving another JSON pointer or assuming presence is
      // readiness.
      draftsHygiene: draftHygieneReceipt,
      hygieneVisible: true,
      hygieneReady:
        draftHygieneReceipt.ok === true &&
        draftHygieneReceipt.stale === false &&
        draftHygieneReceipt.clockSkewed === false,
    },
    honesty: {
      agentNeverAutoSends: true,
      autoDmAllowed: false,
      inventsPilots: false,
      claims: 'Only SENT-CONFIRMED counts as sent; empty pilot rows ≠ pilots; warm inbound ≠ pilot; auto-DM stopped — draft only',
      markSentRequiresAttestation: true,
      sendCmd: 'disabled — drafts only; no auto-DM',
    },
    freeze: { on: freeze.frozen, why: freeze.why },
    truth: truth
      ? {
          pass: truth.pass,
          diskVer: truth.foot?.ver,
          liveVer: truth.live?.footVer,
          summary: truth.summaryLine,
        }
      : { pass: null, note: 'run bin/dg truth first' },
    queue: {
      total: queue.length,
      pending: pending.length,
      sentConfirmedInQueue: sentFromQueue.length,
      top3,
      pendingNames: pending.map((p) => p.name),
      ghostHandlesOutsideQueue: ghostHandles,
    },
    drafts: {
      top3: top3Drafts,
      needFix: draftsNeedFix.map((d) => d.name),
      // No checked drafts is unknown/not-applicable, not a hygiene failure.
      // Keep this tri-state so control/dashboard surfaces never report
      // "0 flagged" as a red result when the queue is simply empty.
      allHygieneOk: draftHygieneOk,
      hygiene: draftHygieneReceipt,
    },
    dms: {
      sentConfirmed: sendLog.count,
      sentUnattested: sendLog.unattestedCount || 0,
      malformedReceipts: sendLog.malformedCount || 0,
      malformedReceiptLines: sendLog.malformedLines || [],
      malformedReceiptReasons: sendLog.malformedReasons || {},
      logPath: sendLog.path,
      recent: sendLog.lines.slice(-5),
      recentUnattested: sendLog.unattestedLines || [],
    },
    pilots: {
      // Preserve the legacy raw count, but make its evidence quality explicit.
      // Only `realFilled` is attributable pilot demand.
      tableRows: pilots.length,
      realFilled: realPilots.length,
      quarantinedRows: pilots.length - realPilots.length,
      pilotOsOpen,
      boardEvidence,
      note: realPilots.length === 0 ? 'No real pilots logged yet (honest)' : null,
      recent: realPilots.slice(-3),
    },
    warmInbound: {
      count: warmInbound.length,
      rows: warmInbound,
      rawRows: warmParsed.rawRows,
      quarantinedRows: warmParsed.rawRows - warmInbound.length,
      quarantineReasons: warmParsed.quarantineReasons,
      freshness: warmFreshness,
      note: 'Warm inbound ≠ pilot (not counted as realFilled)',
    },
    templates: listTemplates(),
    next: nextAgent,
    cmds: {
      draft: 'bin/dg demand draft --name=NAME',
      send: 'disabled (drafts-only; --dry validation only)',
      markSent: 'attestation-only receipt logger (not run by demand status)',
      pilotReport: 'node demigod-pilot-logger.mjs --report',
      pilotInbound: 'bin/dg pilot status',
      pack: 'demigod-outreach/SEND-PACK-TOP3.md',
      queueFile: 'demigod-ops/SEND-QUEUE-PRIORITIZED.md',
    },
  };
}

function printStatus(s) {
  console.log(`# demand status · freeze=${s.freeze.on ? 'ON' : 'OFF'} · policy=DRAFTS-ONLY`);
  console.log(`  Auto-DM: STOPPED · drafts only`);
  console.log(`  DMs SENT-CONFIRMED: ${s.dms.sentConfirmed}`);
  if (s.dms.malformedReceipts) {
    const reasons = Object.entries(s.dms.malformedReceiptReasons || {})
      .map(([reason, count]) => `${reason}=${count}`)
      .join(', ');
    console.log(`  Receipt quarantine: ${s.dms.malformedReceipts} malformed row(s)${reasons ? ` · ${reasons}` : ''}`);
  }
  console.log(`  Queue: ${s.queue.pending} pending / ${s.queue.total} total (${s.queue.sentConfirmedInQueue} confirmed)`);
  console.log(`  Pilots filled: ${s.pilots.realFilled} · Pilot OS open: ${s.pilots.pilotOsOpen}`);
  console.log(`  Board evidence: ${s.pilots.boardEvidence.realRoles} real roles · ${s.pilots.boardEvidence.sampleRoles} samples`);
  if (s.pilots.note) console.log(`  ${s.pilots.note}`);
  console.log(`  NEXT: ${s.next}`);
  if (s.queue.top3.length) {
    console.log('  Top pending + draft hygiene:');
    const byName = Object.fromEntries((s.drafts?.top3 || []).map((d) => [d.name, d]));
    for (const t of s.queue.top3) {
      const d = byName[t.name];
      const hy = d
        ? d.flagCount === 0 && d.hygieneOk
          ? 'hygiene=ok'
          : `hygiene=${d.hygieneOk ? 'warn' : 'fail'}(${d.flagCount})`
        : 'hygiene=?';
      console.log(`    - ${t.prio} ${t.name} ${t.handle} · ${t.company} · ${hy}`);
    }
  }
  console.log(`  report: ${s.statusPath}`);
}

function cmdQueue() {
  const s = buildStatus();
  const freeze = s.freeze;
  const queueMd = read(queuePath());
  const queue = parseQueue(queueMd);
  const sendLog = parseSendLog(read(sendLogPath()));
  const rows = queue.map((q) => ({
    ...q,
    sentConfirmed: sendLog.handles.has((q.handle || '').toLowerCase()),
  }));
  const out = { at: new Date().toISOString(), freeze, rows, sentConfirmed: sendLog.count };
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'demand-queue.json'), JSON.stringify(out, null, 2) + '\n');
  if (asJson) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`# demand queue (${rows.length}) · SENT-CONFIRMED total=${sendLog.count}`);
    for (const r of rows) {
      console.log(`  ${r.sentConfirmed ? '✓' : '○'} [${r.prio}] ${r.name} ${r.handle} — ${r.company}`);
    }
  }
  return 0;
}

/** Load ready-email / SEND-PACK body for a queue row (never sends). */
function loadDraftBody(row) {
  if (!row?.name) return { body: '', readyFile: null };
  const slug = row.name.toLowerCase().replace(/\W+/g, '');
  const readyDir = path.join(OUTREACH, 'ready-emails');
  try {
    // Recipient identity is the stem after the ISO date prefix, with non-word
    // chars stripped so `AltTimed` matches `dm-…-alt-timed.txt` while `Ann`
    // still cannot select `…-joann.txt` (slug equality, not substring).
    const recipientSlugOf = (filename) => {
      const base = String(filename || '').replace(/\.txt$/i, '');
      const m = base.match(/^dm-\d{4}-\d{2}-\d{2}-(.+)$/i);
      const stem = (m ? m[1] : base).toLowerCase();
      return stem.replace(/\W+/g, '');
    };
    const candidates = fs.readdirSync(readyDir)
      .filter((f) => f.endsWith('.txt') && recipientSlugOf(f) === slug)
      // Ready-email names start with an ISO date. Prefer the latest revision;
      // choosing candidates[0] after ascending sort resurrected stale copy.
      .sort((a, b) => b.localeCompare(a));
    if (candidates[0]) {
      const readyFile = path.join(readyDir, candidates[0]);
      return { body: read(readyFile, 8000), readyFile };
    }
  } catch {
    /* */
  }
  const pack = read(path.join(OUTREACH, 'SEND-PACK-TOP3.md'), 50000);
  const re = new RegExp(`##\\s*${row.name}[\\s\\S]*?\`\`\`([\\s\\S]*?)\`\`\``, 'i');
  const m = pack.match(re);
  return { body: m ? m[1].trim() : '', readyFile: null };
}

/**
 * Draft quality flags (agent-side). Never auto-rewrites body — surfaces issues only.
 * @param {{ name?: string, company?: string, handle?: string, body?: string|null }} row
 */
function draftHygiene(row) {
  const flags = [];
  const raw = String(row.body || '');
  // Ready-email files carry three known metadata headers. Strip only those
  // headers: removing every Markdown heading let sendable `# {{name}}` or
  // `# guaranteed matches` lines evade the same honesty checks as body copy.
  // So this stays a WHITELIST of known metadata keys, never a blanket /^#/ strip.
  // Added name|generated: the draft writer emits `# name:` and `# generated:` (3 drafts each)
  // but the whitelist still only knew channel|company|log send, so those two headers stayed in
  // `body` and tripped orphan_fragment (`# name: T0` = 3 words, 10 chars, no terminal
  // punctuation). That is the whole of "draft hygiene 3 flagged" on the dashboard — a false
  // positive on the exact drafts queued for the three highest-priority warm leads, which makes
  // three good drafts look broken and buries any real flag in noise.
  const readyMetadata = /^\s*#\s*(?:channel|company|log send|name|generated)\s*:/i;
  const body = raw
    .split('\n')
    .filter((l) => !readyMetadata.test(l) && !/^\s*\/\//.test(l))
    .join('\n')
    .trim();
  const name = String(row.name || '').trim();
  const company = String(row.company || '').trim();
  const firstLine = body.split('\n').find((l) => l.trim()) || '';
  const looksLikePersonName = (value) => /^[A-Z][a-z]{1,12}$/.test(String(value || '').trim());

  // A draft is copy-pasted as-is, so unresolved merge fields are a hard
  // hygiene failure. Keep the vocabulary narrow to avoid treating ordinary
  // Markdown links or angle-bracket prose as placeholders.
  const mergeToken = body.match(
    /\{\{\s*(?:first[_ -]?name|name|company|handle|role)\s*\}\}|\$\{\s*(?:first[_ -]?name|name|company|handle|role)\s*\}|%\s*(?:first[_ -]?name|name|company|handle|role)\s*%|\[\[?\s*(?:first[_ -]?name|name|company|handle|role)\s*\]\]?|<<\s*(?:first[_ -]?name|name|company|handle|role)\s*>>|<\s*(?:first[_ -]?name|name|company|handle|role)\s*>/i,
  );
  if (mergeToken) {
    flags.push({
      id: 'unresolved_merge_token',
      sev: 'error',
      msg: `Unresolved personalization token: "${mergeToken[0]}"`,
    });
  }

  // Outreach drafts are part of the same pre-services honesty boundary as the
  // site. Reject reply-time/SLA language and guaranteed-volume claims before a
  // draft can be presented as clean, even though this command never sends it.
  const servicePromise = body.match(
    /\bwithin\s+(?:an?\s+)?(?:hour|day|week)\b|\b(?:within|in|under|less\s+than)\s+\d+\s*(?:business\s+)?(?:minutes?|mins?|hours?|hrs?|days?|weeks?)\b|\b(?:24|48)\s*(?:hours?|hrs?|h)\b|\b(?:same|next)[- ]day\b|\bby\s+(?:tomorrow|(?:end\s+of\s+)?(?:the\s+)?day)\b|\bSLA\b|\b(?:guarantee(?:d|ing)?|promise)\s+(?:you\s+)?(?:a\s+)?(?:match|matches|intro|intros|shortlist|candidates?|replacement)\b|\breplacement\s+guarantee\b|\b(?:2\s*[–—-]\s*3|3\s*[–—-]\s*5)\s+(?:candidates?|matches|intros)\b|\b(?:send|share|deliver|introduce)\s+(?:you\s+)?(?:at\s+least\s+)?\d+\s+(?:candidates?|matches|intros)\b|\bmeet\s+(?:your\s+)?(?:at\s+least\s+)?\d+\s+(?:candidates?|matches|intros)\b|\b(?:you|we)(?:['’]ll|\s+will)\s+(?:get|receive|see|have|meet)\s+(?:at\s+least\s+)?\d+\s+(?:candidates?|matches|intros)\b/i,
  );
  if (servicePromise) {
    flags.push({
      id: 'service_promise',
      sev: 'error',
      msg: `Pre-services promise is not allowed: "${servicePromise[0]}"`,
    });
  }

  // Demigod is 10% on hire; only candidates are free. Keep outreach from
  // accidentally turning that candidate-side truth into a founder-side
  // "no fee" claim while the service is still pre-services.
  const falseFeeClaim = body.match(
    /\b(?:no|zero)\s+(?:placement\s+|hiring\s+)?fees?\b|\b(?:hire|hiring|recruit(?:ing|ment)?)\s+(?:is\s+)?free\b|\bfree\s+(?:to|for)\s+(?:hire|hiring|startups?|founders?|companies|employers?)\b/i,
  );
  if (falseFeeClaim) {
    flags.push({
      id: 'false_fee_claim',
      sev: 'error',
      msg: `Founder-side fee claim conflicts with 10% on hire: "${falseFeeClaim[0]}"`,
    });
  }

  // Drafts cannot manufacture Demigod traction. Keep this scoped to
  // first-person/service-side claims so recipient facts such as "you hired two
  // engineers" are not treated as invented Demigod evidence.
  const unverifiedTraction = body.match(
    /\b(?:we(?:['’]ve| have)|demigod has)\s+(?:already\s+)?(?:placed|hired|matched|introduced)\s+(?:\d+|multiple|several|dozens? of)\b|\b(?:we(?:['’]re| are)|demigod is)\s+(?:currently\s+)?(?:running|supporting|serving)\s+(?:\d+|multiple|several)\s+(?:active\s+)?pilots?\b/i,
  );
  if (unverifiedTraction) {
    flags.push({
      id: 'unverified_traction',
      sev: 'error',
      msg: `Unverified Demigod traction claim is not allowed: "${unverifiedTraction[0]}"`,
    });
  }

  const hi = firstLine.match(/^\s*hi\s+([^,!\n]+)/i);
  if (hi) {
    const greeter = hi[1].trim();
    const greeterLc = greeter.toLowerCase();
    // "Hi —" / "Hi there" ok
    if (greeter === '—' || greeter === '-' || /^(there|friend|team)$/i.test(greeter)) {
      /* intentional generic */
    } else if (company && greeterLc === company.toLowerCase()) {
      flags.push({ id: 'greet_company', sev: 'warn', msg: `Opens "Hi ${greeter}" (company) — prefer a person name` });
    } else if (looksLikePersonName(name) && looksLikePersonName(greeter) && greeterLc !== name.toLowerCase()) {
      // Exact-recipient filename lookup prevents Ann -> joann.txt, but cannot
      // detect copy/paste residue inside Ann's correctly named file.
      flags.push({
        id: 'recipient_mismatch',
        sev: 'error',
        msg: `Greeting "${greeter}" does not match queue recipient "${name}"`,
      });
    } else if (name && greeterLc === name.toLowerCase()) {
      // Single first-name queue labels (Marty) are fine; brand labels (HeyPocket, Chai) warn
      const looksLikePerson = looksLikePersonName(name) && !/[A-Z]{2}/.test(name.slice(1));
      if (!looksLikePerson) {
        flags.push({ id: 'greet_queue_name', sev: 'warn', msg: `Opens "Hi ${greeter}" (queue name) — confirm person name` });
      }
    }
  }
  if (/\b(john\s*doe|john\s*potter)\b/i.test(body) || /\n[-–—]\s*John\s*$/im.test(body) || /\b(best|cheers|thanks),?\s*John\b/i.test(body)) {
    flags.push({ id: 'sign_john', sev: 'error', msg: 'Signs as John — use Potter / real sender' });
  } else if (/\bJohn\b/.test(body) && !/johnson/i.test(body)) {
    flags.push({ id: 'name_john', sev: 'warn', msg: 'Body mentions John — check signature / placeholders' });
  }
  // Short orphan lines (unmerged personalization tokens)
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const l of lines) {
    if (/^https?:\/\//i.test(l)) continue;
    if (/^(hi |hey |hello )/i.test(l)) continue;
    if (/^(real intros|see current|quick research|i'm building|reply with)/i.test(l)) continue;
    // Optional leading dash: the drafts sign "— Potter" (em-dash U+2014), not "Potter", so a
    // bare ^potter never matched and the signature was flagged as an unmerged fragment
    // ("— Potter" = 2 words, 8 chars, no terminal punctuation). Allow -, – or — before the word.
    if (/^[—–-]?\s*(best|cheers|thanks|potter|trydemigod)/i.test(l)) continue;
    if (/^\(.*\)$/.test(l)) continue; // (trydemigod.com)
    const words = l.split(/\s+/).length;
    if (words <= 5 && l.length < 40 && !/[.!?]$/.test(l) && !/@/.test(l) && !/,$/.test(l)) {
      flags.push({ id: 'orphan_fragment', sev: 'warn', msg: `Possible unmerged fragment: "${l.slice(0, 60)}"` });
      break;
    }
  }
  if (!body.trim()) flags.push({ id: 'empty_body', sev: 'error', msg: 'No draft body' });
  return {
    ok: !flags.some((f) => f.sev === 'error'),
    flags,
  };
}

/** Read-only draft pack — never sends or assigns an external send task. */
function cmdDraft() {
  const nameIdx = args.findIndex((a) => a === '--name' || a.startsWith('--name='));
  let name = '';
  if (nameIdx >= 0) {
    const a = args[nameIdx];
    name = a.startsWith('--name=') ? a.slice(7) : args[nameIdx + 1] || '';
  }
  // also allow: demand draft T0
  if (!name) {
    const pos = args.filter((a) => !a.startsWith('-') && a !== 'draft');
    name = pos[0] || '';
  }
  if (!name) {
    console.error('usage: bin/dg demand draft --name=T0  (never sends)');
    return 2;
  }
  const s = buildStatus();
  const queueMd = read(queuePath());
  const queue = parseQueue(queueMd);
  const row =
    queue.find((q) => q.name.toLowerCase() === name.toLowerCase()) ||
    queue.find((q) => (q.handle || '').toLowerCase().includes(name.toLowerCase().replace(/^@/, '')));
  if (!row) {
    console.error(JSON.stringify({ error: 'name_not_in_queue', name, pending: s.queue.pendingNames }));
    return 1;
  }
  const { body, readyFile } = loadDraftBody(row);
  const openUrl = (row.open.match(/https?:\/\/[^\s\])]+/) || [])[0] || '';
  const hygiene = draftHygiene({ name: row.name, company: row.company, handle: row.handle, body });
  const out = {
    schema: 'demigod.demand.draft/1',
    at: new Date().toISOString(),
    neverSends: true,
    name: row.name,
    handle: row.handle,
    company: row.company,
    open: openUrl || row.open,
    afterSend: `node demigod-dm-mark-sent.mjs --name=${row.name} --i-sent-it`,
    readyFile: readyFile || null,
    body: body || null,
    hygiene,
    note: body
      ? 'Draft ready. SENT-CONFIRMED remains zero until an externally attested send is recorded; agents never auto-DM.'
      : 'No ready body found; draft source is SEND-PACK-TOP3.md.',
  };
  fs.mkdirSync(BUSY, { recursive: true });
  writeJsonAuto(path.join(BUSY, 'demand-draft.json'), out);
  if (asJson) {
    console.log(JSON.stringify(out, null, process.env.DEMIGOD_JSON_PRETTY === '1' ? 2 : 0));
  } else {
    console.log(`# demand draft · ${out.name} ${out.handle} · NEVER SENDS`);
    console.log(`open:  ${out.open}`);
    console.log(`after: ${out.afterSend}`);
    if (out.readyFile) console.log(`file:  ${out.readyFile}`);
    if (hygiene.flags.length) {
      console.log(`hygiene: ${hygiene.ok ? 'WARN' : 'FAIL'} (${hygiene.flags.length})`);
      for (const f of hygiene.flags) console.log(`  [${f.sev}] ${f.msg}`);
    } else {
      console.log('hygiene: ok');
    }
    console.log('--- body ---');
    console.log(out.body || '(empty)');
    console.log('--- end ---');
  }
  // exit 0 always for draft (never blocks pack); hygiene is advisory in body/json
  return 0;
}

function cmdTemplates() {
  const t = listTemplates();
  if (asJson) {
    console.log(JSON.stringify({ at: new Date().toISOString(), templates: t }, null, 2));
    return 0;
  }
  console.log('# demand templates (paths only — open to use)');
  for (const f of t) {
    console.log(`  ${f.exists ? '✓' : '✗'} ${f.id}: ${f.path}`);
  }
  console.log('\n--- REPLY-TEMPLATES (head) ---');
  console.log(read(path.join(OPS, 'REPLY-TEMPLATES.md'), 1200));
  return 0;
}

function cmdLog() {
  const noteIdx = args.findIndex((a) => a === '--note' || a.startsWith('--note='));
  let note = '';
  if (noteIdx >= 0) {
    const a = args[noteIdx];
    note = a.startsWith('--note=') ? a.slice(7) : args[noteIdx + 1] || '';
  }
  if (!note) {
    // show pilot log + send log tails
    const s = buildStatus();
    if (asJson) {
      console.log(JSON.stringify({ dms: s.dms, pilots: s.pilots }, null, 2));
    } else {
      console.log('# demand log (read-only tails)');
      console.log(`SENT-CONFIRMED: ${s.dms.sentConfirmed}`);
      for (const l of s.dms.recent) console.log('  ' + l);
      console.log(`Pilots filled: ${s.pilots.realFilled}`);
      console.log('Append note: bin/dg demand log --note "…"');
      console.log('Mark sent:   node demigod-dm-mark-sent.mjs --name=NAME --i-sent-it');
      console.log('Pilot:       node demigod-pilot-logger.mjs --founder=… --no-publish');
    }
    return 0;
  }
  // Human note only — not a pilot or DM claim
  const line = {
    at: new Date().toISOString(),
    kind: 'note',
    note: String(note).slice(0, 500),
    by: process.env.USER || 'agent',
  };
  fs.mkdirSync(BUSY, { recursive: true });
  fs.appendFileSync(path.join(BUSY, 'demand-log.jsonl'), JSON.stringify(line) + '\n');
  const pilotPath = path.join(OPS, 'PILOT-LOG.md');
  const stamp = `\n<!-- note ${line.at} ${line.by}: ${line.note.replace(/-->/g, '')} -->\n`;
  fs.appendFileSync(pilotPath, stamp);
  if (asJson) console.log(JSON.stringify(line, null, 2));
  else console.log(`✓ noted (not a pilot/DM claim): ${line.note}`);
  return 0;
}

function cmdStatus() {
  const run = beginRun('demand', { scope: [] });
  const s = buildStatus();
  fs.mkdirSync(BUSY, { recursive: true });
  // `statusPath` is part of the public status contract consumed by orient and
  // the dashboard. Write through that exact value so the advertised hygiene
  // path and the persisted JSON can never drift after a path change.
  writeDemandStatusAtomic(s.statusPath, s);
  sealRun(run, {
    pass: true,
    summary: `demand pending=${s.queue.pending} sent=${s.dms.sentConfirmed} pilots=${s.pilots.realFilled}`,
    ttlSec: 1800,
  });
  if (asJson) console.log(process.env.DEMIGOD_JSON_PRETTY === '1' ? JSON.stringify(s, null, 2) : JSON.stringify(s));
  else printStatus(s);
  return 0;
}

function help() {
  console.log(`# demigod-demand — GTM ops (DRAFTS-ONLY · auto-DM stopped)

  bin/dg demand status      # queue + SENT-CONFIRMED + pilots (honest)
  bin/dg demand queue       # full queue with sent flags
  bin/dg demand draft --name=T0   # copy-paste pack — NEVER sends
  bin/dg demand send …      # refused (use --dry for local validation)
  bin/dg demand log         # tails; --note "…" appends human note only
  bin/dg demand templates   # reply/white-glove paths + reply head

External-send boundary: drafts stop before delivery; receipts require explicit attestation.
Pilot: bin/dg pilot status | bin/dg pilot from-wiz --email=… --90d="…"
`);
}

const map = {
  help,
  status: cmdStatus,
  queue: cmdQueue,
  draft: cmdDraft,
  send: cmdSend,
  log: cmdLog,
  templates: cmdTemplates,
};

if (!map[cmd]) {
  console.error('usage: bin/dg demand status|queue|draft|send|log|templates|help');
  process.exitCode = 2;
} else {
  // Do not force-exit after console output. Captured invocations (including the
  // demand canary) need Node to flush stdout/stderr before the process closes.
  process.exitCode = map[cmd]() ?? 0;
}
