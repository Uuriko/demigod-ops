#!/usr/bin/env node
/**
 * Show the submissions inbox for one data root.
 * An empty inbox lists nothing. This command does not invent a founder or write an intake.
 *
 * Usage:
 *   node demigod-submissions-view.mjs
 *   node demigod-submissions-view.mjs --json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function inboxPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-INBOX.json');
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-VIEW.json');
}

function textOf(raw, keys) {
  for (const key of keys) {
    const value = raw?.[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function viewRow(item) {
  const raw = item?.raw || {};
  return {
    id: item?.id || '',
    form: item?.form || '',
    status: item?.status || '',
    email: textOf(raw, ['contact-email', 'contactEmail', 'seeker-email', 'seekerEmail', 'partner-email', 'partnerEmail']),
    company: textOf(raw, ['company-name', 'companyName', 'company']),
    brief: textOf(raw, ['role-title', 'roleTitle', 'brief', 'title']),
  };
}

function buildView() {
  const inbox = readJson(inboxPath()) || { items: [] };
  const rows = (inbox.items || []).map(viewRow);
  return {
    ok: true,
    count: rows.length,
    rows,
    report: reportPath(),
    sent: false,
    liveMail: false,
    wroteIntake: false,
    loggedPilot: false,
  };
}

function run(argv = process.argv) {
  if (argv.includes('--log-pilot')) {
    return {
      code: 1,
      body: {
        ok: false,
        error: 'pilot_log_refused',
        sent: false,
        liveMail: false,
        wroteIntake: false,
        loggedPilot: false,
      },
    };
  }
  const view = buildView();
  fs.mkdirSync(dataRoot(), { recursive: true });
  atomicWrite(view.report, JSON.stringify(view, null, 2) + '\n');
  return { code: 0, body: view };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = run();
  const line = JSON.stringify(result.body);
  if (result.code === 0) console.log(line);
  else console.error(line);
  process.exit(result.code);
}
