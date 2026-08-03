#!/usr/bin/env node
/**
 * demigod-gtm-log-send.mjs
 * Record a human-attested send only. Agents cannot invent SENT-CONFIRMED rows.
 *
 * Usage (operator only):
 *   DEMIGOD_ATTEST_SEND=1 node demigod-gtm-log-send.mjs \
 *     --role="Founding PM" --to="name@co.com" --90d="Ship v1" \
 *     --receipt=/path/to/SENT-CONFIRMED-receipt.txt
 *
 * Receipt file must contain SENT-CONFIRMED and Message-ID: (transport proof).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2).reduce((o, a) => {
  const eq = a.indexOf('=');
  if (!a.startsWith('--')) return o;
  if (eq < 0) {
    o[a.slice(2)] = true;
    return o;
  }
  o[a.slice(2, eq)] = a.slice(eq + 1);
  return o;
}, {});

const attested =
  process.env.DEMIGOD_ATTEST_SEND === '1' || process.env.DEMIGOD_ATTEST_SEND === 'true';
if (!attested) {
  console.error(
    JSON.stringify({
      error: 'send_log_refused',
      hint: 'Set DEMIGOD_ATTEST_SEND=1 and pass --receipt=PATH to a real transport receipt. Agents never invent SENT-CONFIRMED.',
    }),
  );
  process.exit(2);
}

const receiptPath = args.receipt ? path.resolve(String(args.receipt)) : '';
if (!receiptPath || !fs.existsSync(receiptPath)) {
  console.error(
    JSON.stringify({
      error: 'receipt_required',
      hint: 'Pass --receipt=/path/to/file containing SENT-CONFIRMED and Message-ID:',
    }),
  );
  process.exit(2);
}

const receiptBody = fs.readFileSync(receiptPath, 'utf8');
if (!/SENT-CONFIRMED/i.test(receiptBody) || !/Message-ID:\s*\S+/i.test(receiptBody)) {
  console.error(
    JSON.stringify({
      error: 'receipt_invalid',
      hint: 'Receipt must include SENT-CONFIRMED and Message-ID: lines from real transport.',
    }),
  );
  process.exit(2);
}

const role = args.role || 'Role';
const to = args.to || '';
if (!to || /@example\.|@co\.com$/i.test(to)) {
  console.error(JSON.stringify({ error: 'recipient_required', hint: 'Pass a real --to= address' }));
  process.exit(2);
}
const d90 = args['90d'] || args['90d-outcome'] || 'N/A';
const date = new Date().toISOString().slice(0, 10);
const messageId = (receiptBody.match(/Message-ID:\s*(\S+)/i) || [])[1] || 'unknown';

const logDir = path.join(ROOT, 'demigod-outreach');
const logFile = path.join(logDir, 'dm-send-log.txt');
fs.mkdirSync(logDir, { recursive: true });
// Attested line shape demand.parseSendLog accepts (attested=1 · via=manual).
const entry = `SENT-CONFIRMED | ${date} | ${to} | ${role} | dm | attested=1 | via=manual | msg=${messageId} | 90d: ${d90}\n`;
fs.appendFileSync(logFile, entry, { mode: 0o600 });
console.log('Logged attested send:', entry.trim());
console.log('Log at:', logFile);
process.exit(0);
