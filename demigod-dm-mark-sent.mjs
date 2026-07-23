#!/usr/bin/env node
/**
 * Record an outbound attempt without claiming delivery.
 * Confirmed delivery requires a provider-backed receipt; local attestation is not evidence.
 *
 * Usage: node demigod-dm-mark-sent.mjs --handle=@x --company=Co --channel=x --unattested
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSendLog } from './demigod-demand.mjs';

process.umask(0o077);

const argv = process.argv.slice(2);
const refuse = (error, detail) => {
  console.error(JSON.stringify({ ok: false, error, detail }));
  process.exit(2);
};

if (argv.some((arg) => /^--agent-auto(?:=|$)/.test(arg))) {
  refuse('auto_dm_stopped', 'Agents cannot record or perform external delivery.');
}
if (argv.some((arg) => /^--i-sent-it(?:=|$)/.test(arg))) {
  refuse('external_delivery_receipt_required', 'Self-attestation is not delivery evidence.');
}
if (!argv.some((arg) => /^--unattested(?:=true)?$/.test(arg))) {
  refuse('external_delivery_receipt_required', 'Self-attestation is not delivery evidence; only --unattested attempt logging is available.');
}

const values = { handle: '', company: '', channel: 'x' };
const seen = new Set();
for (const arg of argv) {
  if (/^--unattested(?:=true)?$/.test(arg)) continue;
  const match = arg.match(/^--(handle|company|channel)=(.+)$/s);
  if (!match || seen.has(match[1])) refuse('invalid_argument', 'Use one value each for --handle, --company, and --channel.');
  seen.add(match[1]);
  values[match[1]] = match[2];
}

if (!values.handle.startsWith('@')) values.handle = `@${values.handle}`;
if (!/^@[A-Za-z0-9_]{1,30}$/.test(values.handle)) refuse('invalid_handle', 'Expected @ plus 1–30 letters, digits, or underscores.');
if (!values.company || values.company.length > 120 || /[|\u0000-\u001f\u007f]/.test(values.company)) {
  refuse('invalid_company', 'Company must be 1–120 characters without control characters or pipes.');
}
if (!/^[A-Za-z0-9_-]{1,32}$/.test(values.channel)) refuse('invalid_channel', 'Channel must be 1–32 letters, digits, underscores, or hyphens.');

const root = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const outreach = path.join(root, 'demigod-outreach');
const log = path.join(outreach, 'dm-send-log.txt');
const dateParts = Object.fromEntries(
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts().map(({ type, value }) => [type, value]),
);
const line = `SENT-UNATTESTED | ${dateParts.year}-${dateParts.month}-${dateParts.day} | ${values.handle} | ${values.company} | ${values.channel} | attested=0 | via=human`;
if (parseSendLog(line).unattestedCount !== 1) refuse('invalid_attempt_receipt', 'Generated row failed the canonical parser.');

fs.mkdirSync(outreach, { recursive: true, mode: 0o700 });
fs.chmodSync(outreach, 0o700);
fs.appendFileSync(log, `\n${line}\n`, { encoding: 'utf8', mode: 0o600 });
fs.chmodSync(log, 0o600);
console.log(JSON.stringify({ ok: true, kind: 'SENT-UNATTESTED', countsAsSent: false, log }));
