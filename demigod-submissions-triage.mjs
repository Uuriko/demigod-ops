#!/usr/bin/env node
/**
 * Bulk-mark e2e / playtest inbox noise as spam.
 * The summary stays under DEMIGOD_ROOT. A dry run does not change status.
 * This command does not send mail.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { loadInbox, saveInbox, extractEmail } from './demigod-submissions-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function summaryPath() {
  return path.join(dataRoot(), 'DEMIGOD-INBOX-TRIAGE.json');
}

function isE2eItem(item) {
  const raw = item.raw || {};
  const form = String(item.form || '').toLowerCase();
  const email = extractEmail(raw, form);

  if (/partner/.test(form)) {
    if (/^partner@acme\.vc$/i.test(email)) return 'e2e_partner_fixture';
    if (/^partner-e2e@/i.test(email)) return 'e2e_partner_test';
    if (/^smoke-intake\+/i.test(email)) return 'intake_smoke_probe';
    if (/intake smoke probe/i.test(raw['partner-org'] || '')) return 'intake_smoke_probe';
    if (raw['partner-name'] === 'Smoke Check') return 'intake_smoke_probe';
    if (/^alex(-\d+)?@/i.test(email) && /@(bayvc\.co|vc\.co)$/i.test(email)) return 'e2e_playtest_alex';
    if (raw['partner-name'] === 'Alex Kim' && raw['partner-org'] === 'Bay Seed Fund') return 'e2e_playtest_alex';
    if (raw['partner-name'] === 'Jordan Lee' && raw['partner-org'] === 'Seed VC Partners') return 'e2e_playtest_jordan';
  }

  if (/startup/.test(form)) {
    if (/^smoke-startup\+/i.test(email)) return 'intake_smoke_probe';
    if (raw['company-name'] === 'Smoke Check Co' && /intake smoke probe/i.test(raw['stack-needs'] || '')) return 'intake_smoke_probe';
    if (/^founder@test\.com$/i.test(email)) return 'e2e_startup_fixture';
    if (/^sla-test@/i.test(email) || /SLA test role/i.test(raw['role-title'] || '')) return 'sla_test_probe';
    if (raw['role-title'] === 'Head of Growth' && raw['stack-needs'] === 'Seed fintech') return 'e2e_playtest_growth';
    if (!email && raw['role-title'] === 'Head of Growth') return 'e2e_playtest_no_email';
  }

  if (/engineer/.test(form)) {
    if (/^smoke-engineer\+/i.test(email)) return 'intake_smoke_probe';
    if (raw['full-name'] === 'Smoke Check' && /intake smoke probe/i.test(raw['skills-stack'] || '')) return 'intake_smoke_probe';
  }

  if (raw.company === 'Test Co' || /^test@/i.test(email)) return 'e2e_test_keyword';

  return null;
}

function triageInbox(argv = process.argv) {
  const dryRun = argv.includes('--dry-run');
  const inbox = loadInbox();
  const marked = [];
  const kept = [];

  for (const item of inbox.items || []) {
    if (item.status !== 'new' && item.status !== 'pending') continue;
    const reason = isE2eItem(item);
    if (!reason) {
      if (item.status === 'new') kept.push({ id: item.id, form: item.form, email: extractEmail(item.raw || {}, item.form) });
      continue;
    }
    marked.push({ id: item.id, form: item.form, reason, was: item.status });
    if (!dryRun) {
      item.status = 'spam';
      item.rejectReasons = [...new Set([...(item.rejectReasons || []), reason, 'bulk_triage'])];
      item.reviewedAt = new Date().toISOString();
    }
  }

  if (!dryRun && marked.length) saveInbox(inbox);

  const summary = {
    at: new Date().toISOString(),
    dryRun,
    marked: marked.length,
    keptNew: kept.length,
    kept,
    markedIds: marked.map((row) => row.id),
    details: marked,
    report: summaryPath(),
    sent: false,
    liveMail: false,
  };
  fs.mkdirSync(dataRoot(), { recursive: true });
  atomicWrite(summary.report, JSON.stringify(summary, null, 2) + '\n');
  return summary;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  console.log(JSON.stringify(triageInbox()));
}
