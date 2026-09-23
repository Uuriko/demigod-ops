#!/usr/bin/env node
/**
 * Record one named submission file in that data root.
 * Does not publish the board or send mail.
 *
 * Usage: node demigod-submissions-ingest.mjs submission.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractEmail, ingestSubmission } from './demigod-submissions-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function inboxFile() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-INBOX.json');
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

function parseArgs(argv) {
  const out = { file: '', publish: false };
  for (const arg of argv) {
    if (arg === '--publish') out.publish = true;
    else if (!arg.startsWith('--') && !out.file) out.file = arg;
  }
  return out;
}

function formNameOf(body) {
  return String(body.name || body.formName || body['form-name'] || '').toLowerCase();
}

function dataOf(body) {
  const data = body.data || body.fields || body;
  return data && typeof data === 'object' ? data : {};
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.publish) fail('publish_refused');
  if (!args.file) fail('submission_required');
  if (!fs.existsSync(args.file)) fail('file_not_found');
  let body;
  try {
    body = JSON.parse(fs.readFileSync(args.file, 'utf8'));
  } catch {
    fail('submission_invalid');
  }
  if (!body || typeof body !== 'object') fail('submission_invalid');
  const data = dataOf(body);
  const email = extractEmail(data, formNameOf(body));
  if (!email) fail('email_required');

  const result = ingestSubmission(body);
  const record = result.record || {};
  console.log(JSON.stringify({
    ok: true,
    id: record.id,
    email,
    company: String(data['company-name'] || data.companyName || '').trim(),
    status: record.status,
    path: inboxFile(),
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
