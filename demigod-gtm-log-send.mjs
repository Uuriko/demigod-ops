#!/usr/bin/env node
/**
 * demigod-gtm-log-send.mjs
 * Record a local outreach log line for a named recipient. Does not send mail.
 *
 * Usage: node demigod-gtm-log-send.mjs --role="Founding Engineer" --to="ada@harbor.example" --90d="Ship the billing service"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) out[arg.slice(2)] = true;
    else out[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return out;
}

function logSend(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const role = String(args.role || '').trim();
  const to = String(args.to || '').trim();
  const d90 = String(args['90d'] || args['90d-outcome'] || '').trim();
  if (!to || !role) {
    return {
      ok: false,
      error: !to ? 'recipient_required' : 'role_required',
      sent: false,
      liveMail: false,
    };
  }

  const outreach = path.join(dataRoot(), 'demigod-outreach');
  fs.mkdirSync(outreach, { recursive: true });
  const logFile = path.join(outreach, 'dm-send-log.txt');
  const date = new Date().toISOString().slice(0, 10);
  const entry = `${date} | ${role} -> ${to} | 90d: ${d90 || 'n/a'}\n`;
  fs.appendFileSync(logFile, entry);
  return {
    ok: true,
    to,
    role,
    log: logFile,
    sent: false,
    liveMail: false,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = logSend();
  if (result.ok) console.log(JSON.stringify(result));
  else {
    console.error(JSON.stringify(result));
    process.exit(1);
  }
}

export { logSend };
