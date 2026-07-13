#!/usr/bin/env node
/** Unified inbox view — startup, engineer, partner submissions in one triage report. */
import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadInbox, saveInbox, extractEmail, publicStatus, findSubmission } from './demigod-submissions-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-INBOX-REPORT.json');
const BUSY_OUT = '/tmp/dg-busy/submissions-inbox-latest.json';

function parseArgs(argv) {
  const out = { status: 'all', limit: 40, json: false, markReviewed: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--new') out.status = 'new';
    else if (a === '--spam') out.status = 'spam';
    else if (a === '--json') out.json = true;
    else if (a.startsWith('--limit=')) out.limit = Number(a.slice(8)) || 40;
    else if (a.startsWith('--status=')) out.status = a.slice(9);
    else if (a.startsWith('--mark-reviewed=')) out.markReviewed = a.slice(16);
    else if (a === '--mark-reviewed' && argv[i + 1]) out.markReviewed = argv[++i];
  }
  return out;
}

function formKind(form = '') {
  const f = String(form).toLowerCase();
  if (/partner/.test(f)) return 'partner';
  if (/startup/.test(f)) return 'startup';
  if (/engineer|jobseeker|candidate/.test(f)) return 'engineer';
  return 'other';
}

function summarize(items) {
  const byStatus = {};
  const byKind = { startup: 0, engineer: 0, partner: 0, other: 0 };
  for (const item of items) {
    const st = item.status || 'unknown';
    byStatus[st] = (byStatus[st] || 0) + 1;
    byKind[formKind(item.form)] += 1;
  }
  return { total: items.length, byStatus, byKind };
}

function redactItem(item) {
  const email = extractEmail(item.raw || {}, item.form);
  const masked = email ? email.replace(/(^.).*(@.*$)/, '$1***$2') : '';
  return {
    id: item.id,
    at: item.at,
    form: item.form,
    kind: formKind(item.form),
    status: item.status,
    email: masked,
    rejectReasons: item.rejectReasons || null,
    featuredId: item.featuredId || null,
    statusUrl: `https://www.trydemigod.com/#status/${item.id}`,
    headline: publicStatus(item).headline,
  };
}

function main() {
  const args = parseArgs(process.argv);

  if (args.markReviewed) {
    const inbox = loadInbox();
    const item = (inbox.items || []).find((i) => i.id === args.markReviewed);
    if (!item) {
      console.error(JSON.stringify({ ok: false, error: 'not_found', id: args.markReviewed }));
      process.exit(1);
    }
    item.status = item.status === 'new' ? 'reviewed' : item.status;
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = process.env.USER || 'agent';
    saveInbox(inbox);
    console.log(JSON.stringify({ ok: true, id: item.id, status: item.status, reviewedAt: item.reviewedAt }, null, 2));
    // fall through to refresh report
  }

  const inbox = loadInbox();
  let items = (inbox.items || []).slice(0, args.limit);
  if (args.status !== 'all') {
    items = items.filter((i) => i.status === args.status);
  }

  const summary = summarize(inbox.items || []);
  const rows = items.map(redactItem);
  const report = {
    at: new Date().toISOString(),
    inboxAt: inbox.at,
    filter: args.status,
    summary,
    newCount: (inbox.items || []).filter((i) => i.status === 'new').length,
    rows,
    actions: {
      approve: 'node demigod-submissions-approve.mjs <sub-id>',
      triageSpam: 'node demigod-submissions-triage.mjs',
      status: 'https://www.trydemigod.com/#status/<sub-id>',
    },
  };

  // Age for ops UI
  report.newestAt = rows[0]?.at || null;
  report.newestAgeSec = report.newestAt
    ? Math.round((Date.now() - Date.parse(report.newestAt)) / 1000)
    : null;
  report.actions = {
    ...report.actions,
    draftIntro: 'node demigod-intro-draft.mjs <sub-id>',
    markReviewed: 'node demigod-submissions-inbox.mjs --mark-reviewed=<sub-id>',
    refresh: 'node demigod-submissions-inbox.mjs --json',
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  try {
    fs.mkdirSync('/tmp/dg-busy', { recursive: true });
    fs.writeFileSync(BUSY_OUT, JSON.stringify(report, null, 2) + '\n');
  } catch {
    /* */
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`Inbox · ${summary.total} total · ${report.newCount} new`);
  console.log(`Kinds: startup ${summary.byKind.startup} · engineer ${summary.byKind.engineer} · partner ${summary.byKind.partner}`);
  console.log(`Status: ${Object.entries(summary.byStatus).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log('---');
  for (const row of rows) {
    console.log(`${row.id} · ${row.kind} · ${row.status} · ${row.email || '—'} · ${row.headline}`);
  }
  console.log(`\nWrote ${path.relative(ROOT, OUT)} + ${BUSY_OUT}`);
}

main();