#!/usr/bin/env node
/**
 * Local GTM status for one data root.
 * Reads that root's outreach log and writes the report there.
 * Does not send mail, call site metrics, or post to Slack.
 *
 * Usage: node demigod-gtm-status.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function outreachDir() {
  return path.join(dataRoot(), 'demigod-outreach');
}

function sendLogPath() {
  return path.join(outreachDir(), 'dm-send-log.txt');
}

function reportJsonPath() {
  return path.join(dataRoot(), 'DEMIGOD-GTM-STATUS.json');
}

function reportMdPath() {
  return path.join(dataRoot(), 'DEMIGOD-GTM-STATUS.md');
}

function replyCheckPath() {
  return path.join(dataRoot(), 'DEMIGOD-REPLY-CHECK.json');
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function confirmedRows(text) {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('//') && /SENT-CONFIRMED/i.test(line))
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim());
      return {
        day: parts[1] || '',
        handle: parts[2] || '',
        company: parts[3] || '',
        channel: parts[4] || '',
      };
    });
}

function listReady(dir) {
  try {
    return fs.readdirSync(dir).filter((name) => name.endsWith('.txt')).sort();
  } catch {
    return [];
  }
}

function parseReady(file) {
  const text = readText(file);
  const handle = (text.match(/handle:\s*(@\S+)/i) || [])[1] || '';
  const company = (text.match(/company:\s*(.+)/i) || [])[1]?.trim() || '';
  return { file: path.basename(file), handle, company };
}

function loadReply() {
  try {
    const raw = JSON.parse(fs.readFileSync(replyCheckPath(), 'utf8'));
    return {
      scanned: Number(raw.scanned) || 0,
      human: Number(raw.human) || 0,
    };
  } catch {
    return null;
  }
}

function buildStatus() {
  const confirmed = confirmedRows(readText(sendLogPath()));
  const handles = new Set(confirmed.map((row) => row.handle).filter(Boolean));
  const readyDir = path.join(outreachDir(), 'ready-emails');
  const readyFiles = listReady(readyDir).map((name) => parseReady(path.join(readyDir, name)));
  const engFiles = listReady(path.join(outreachDir(), 'ready-emails-eng'));
  const remaining = readyFiles.filter((row) => row.handle && !handles.has(row.handle));
  return {
    ok: true,
    at: new Date().toISOString(),
    sentConfirmed: confirmed.length,
    companies: confirmed.map((row) => row.company).filter(Boolean),
    handles: confirmed.map((row) => row.handle).filter(Boolean),
    founderReady: readyFiles.length,
    engTemplates: engFiles.length,
    remaining: remaining.map((row) => row.company || row.handle),
    replyCheck: loadReply(),
    path: reportJsonPath(),
    sent: false,
    liveMail: false,
    liveSlack: false,
    liveMetrics: false,
  };
}

function renderMd(status) {
  const lines = [
    '# Demigod GTM status',
    '',
    `at: ${status.at}`,
    `sent confirmed: ${status.sentConfirmed}`,
    `founder ready: ${status.founderReady}`,
    `engineer templates: ${status.engTemplates}`,
    `remaining: ${status.remaining.length ? status.remaining.join(', ') : 'none'}`,
    `reply human: ${status.replyCheck ? status.replyCheck.human : 0}`,
    'sent: false',
    'live mail: false',
    'live metrics: false',
    '',
  ];
  if (status.companies.length) {
    lines.push('## Confirmed');
    status.companies.forEach((company, index) => {
      lines.push(`- ${company} (${status.handles[index] || ''})`);
    });
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const status = buildStatus();
  fs.mkdirSync(dataRoot(), { recursive: true });
  const md = renderMd(status);
  fs.writeFileSync(reportMdPath(), md);
  fs.writeFileSync(reportJsonPath(), JSON.stringify(status, null, 2) + '\n');
  process.stdout.write(`${md}\n${JSON.stringify(status)}\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
