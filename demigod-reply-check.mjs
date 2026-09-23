#!/usr/bin/env node
/**
 * Reply / inbound capture check for Demigod GTM.
 * Dry report only — never auto-logs pilots (real delivery still human-gated).
 *
 * Usage:
 *   node demigod-reply-check.mjs              # write report from last gmail dump if present
 *   node demigod-reply-check.mjs --stdin      # parse JSON threads from stdin (agent paste)
 *   node demigod-reply-check.mjs --scan-local # count the data-root dm-send-log only
 *
 * Agent path (preferred): use Gmail MCP gmail__search then pipe or save JSON, e.g.
 *   gmail__search query: '(to:jjohnpotter@gmail.com OR to:hello@trydemigod.com) (subject:form OR demigod OR brief) newer_than:14d'
 *   → save /tmp/demigod-gmail-inbound.json → node demigod-reply-check.mjs --file=/tmp/demigod-gmail-inbound.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function sendLogPath() {
  return path.join(dataRoot(), 'demigod-outreach', 'dm-send-log.txt');
}

function reportMdPath() {
  return path.join(dataRoot(), 'DEMIGOD-REPLY-CHECK.md');
}

function reportJsonPath() {
  return path.join(dataRoot(), 'DEMIGOD-REPLY-CHECK.json');
}

const TEST_RE =
  /founder@test\.co|alex@test\.com|Acme Labs|Alex Chen|noreply@x\.ai|Test is ready/i;

function parseArgs(argv) {
  const o = { file: '', stdin: false, scanLocal: false };
  for (const a of argv) {
    if (a === '--stdin') o.stdin = true;
    else if (a === '--scan-local') o.scanLocal = true;
    else if (a.startsWith('--file=')) o.file = a.slice(7);
  }
  return o;
}

function loadThreads(args) {
  if (args.stdin) {
    const raw = fs.readFileSync(0, 'utf8');
    return JSON.parse(raw);
  }
  if (args.file && fs.existsSync(args.file)) {
    return JSON.parse(fs.readFileSync(args.file, 'utf8'));
  }
  // default dump paths agents may write
  for (const p of ['/tmp/demigod-gmail-inbound.json', '/tmp/gmail-inbound.json']) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return null;
}

function flattenMessages(payload) {
  const threads = payload?.threads || payload?.messages || (Array.isArray(payload) ? payload : []);
  const out = [];
  for (const t of threads) {
    const msgs = t.messages || [t];
    for (const m of msgs) {
      out.push({
        thread_id: t.thread_id || m.thread_id || '',
        message_id: m.message_id || m.id || '',
        subject: m.subject || t.subject || '',
        from: m.from || '',
        to: Array.isArray(m.to) ? m.to.join(', ') : m.to || '',
        date: m.date || '',
        preview: m.body_preview || m.snippet || t.snippet || '',
      });
    }
  }
  return out;
}

function classify(m) {
  const blob = `${m.subject}\n${m.from}\n${m.preview}`;
  if (TEST_RE.test(blob)) return 'test';
  if (/no-reply-forms@webflow\.com/i.test(m.from)) {
    if (TEST_RE.test(blob)) return 'test-form';
    return 'webflow-form';
  }
  if (/noreply@x\.ai/i.test(m.from)) return 'noise';
  if (/form submission/i.test(m.subject)) return /test|Acme|alex@test/i.test(blob) ? 'test-form' : 'webflow-form';
  return 'human-inbound';
}

function confirmedRows() {
  const sendLog = sendLogPath();
  if (!fs.existsSync(sendLog)) return [];
  return fs
    .readFileSync(sendLog, 'utf8')
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && /SENT-CONFIRMED/i.test(line))
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim());
      return { company: parts[3] || '', handle: parts[2] || '', line };
    });
}

function localNotes(confirmed) {
  const notes = [`dm-send-log SENT-CONFIRMED: ${confirmed.length}`];
  for (const row of confirmed) {
    if (row.company) notes.push(`confirmed company: ${row.company}`);
  }
  const pilot = path.join(dataRoot(), 'PILOT-LOG.md');
  if (fs.existsSync(pilot)) {
    const text = fs.readFileSync(pilot, 'utf8');
    notes.push(`PILOT-LOG has active pipeline: ${/waiting first brief|P0/i.test(text)}`);
  }
  return notes;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = args.scanLocal ? null : loadThreads(args);
  const msgs = payload ? flattenMessages(payload) : [];
  const by = { test: [], 'test-form': [], 'webflow-form': [], noise: [], 'human-inbound': [] };
  for (const m of msgs) {
    const c = classify(m);
    (by[c] || (by[c] = [])).push(m);
  }

  const human = by['human-inbound'] || [];
  const realForms = by['webflow-form'] || [];
  const confirmed = confirmedRows();
  const lines = [];
  lines.push('# Demigod reply-check report');
  lines.push(`**at:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Local');
  for (const n of localNotes(confirmed)) lines.push(`- ${n}`);
  lines.push('');
  lines.push('## Gmail scan');
  if (!payload) {
    lines.push('_No Gmail JSON loaded._ Run agent Gmail search, save to `/tmp/demigod-gmail-inbound.json`, re-run with `--file=`.');
    lines.push('');
    lines.push('Suggested queries:');
    lines.push('```');
    lines.push('to:jjohnpotter@gmail.com subject:"form submission" newer_than:14d');
    lines.push('to:hello@trydemigod.com newer_than:14d');
    lines.push('subject:Demigod newer_than:14d -from:noreply@x.ai');
    lines.push('```');
  } else {
    lines.push(`Messages scanned: ${msgs.length}`);
    lines.push(`- human-inbound: ${human.length}`);
    lines.push(`- webflow-form (non-test): ${realForms.length}`);
    lines.push(`- test / test-form: ${(by.test?.length || 0) + (by['test-form']?.length || 0)}`);
    lines.push(`- noise: ${by.noise?.length || 0}`);
    lines.push('');
    if (human.length) {
      lines.push('### Human inbound (review)');
      for (const m of human.slice(0, 15)) {
        lines.push(`- **${m.date}** | ${m.from} | ${m.subject}`);
        lines.push(`  ${(m.preview || '').slice(0, 160).replace(/\n/g, ' ')}`);
      }
    } else {
      lines.push('_No human inbound classified in this dump._');
    }
    if (realForms.length) {
      lines.push('');
      lines.push('### Real Webflow forms (non-test)');
      for (const m of realForms.slice(0, 10)) {
        lines.push(`- ${m.date} | ${m.subject} | ${(m.preview || '').slice(0, 120)}`);
      }
    }
  }
  lines.push('');
  lines.push('## Next actions');
  lines.push('1. Human send 8 founder DMs → `node demigod-dm-mark-sent.mjs --name=…`');
  lines.push('2. Any real form/reply → note `demigod-ops/PILOT-LOG.md` same day');
  lines.push('3. After white-glove delivery → `node demigod-pilot-logger.mjs --brief=…` (never invent pilots)');
  lines.push('4. Ignore Acme Labs / Alex Chen / noreply@x.ai test noise');

  const md = lines.join('\n') + '\n';
  const reportMd = reportMdPath();
  const reportJson = reportJsonPath();
  fs.mkdirSync(dataRoot(), { recursive: true });
  const summary = {
    ok: true,
    at: new Date().toISOString(),
    scanned: msgs.length,
    human: human.length,
    realForms: realForms.length,
    confirmed: confirmed.length,
    companies: confirmed.map((row) => row.company).filter(Boolean),
    humanSamples: human.slice(0, 5),
    report: reportMd,
    sent: false,
    liveMail: false,
  };
  fs.writeFileSync(reportMd, md);
  fs.writeFileSync(reportJson, JSON.stringify(summary, null, 2) + '\n');
  console.log(md);
  console.log(JSON.stringify(summary));
  return summary;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
