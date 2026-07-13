#!/usr/bin/env node
/** Index SuperGrok Heavy Demigod-related threads from local artifacts. */
import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-HISTORY-DIGEST.json');
const OUT_MD = path.join(ROOT, 'DEMIGOD-HEAVY-HISTORY-DIGEST.md');

const GLOBS = [
  'HEAVY-DEMIGOD-*.md',
  'HEAVY-CURSOR-WEBSITE*.md',
  'HEAVY-CURSOR-FINISH*.md',
  'HEAVY-CURSOR-IMPROVE*.md',
  'HEAVY-CURSOR-ORCHESTRATION*.md',
  'HEAVY-CURSOR-ROADMAP*.md',
  'HEAVY-PARTNERSHIP*.md',
  'HEAVY-LEVERAGE*.md',
  'HEAVY-STARTUP*.md',
  'HEAVY-GROK*.md',
  'HEAVY-FORM*.md',
  'HEAVY-FULL-AUDIT*.md',
];

const SENT_PREFIXES = [
  'HEAVY-DEMIGOD',
  'HEAVY-CURSOR-WEBSITE',
  'HEAVY-CURSOR-FINISH',
  'HEAVY-CURSOR-IMPROVE',
  'HEAVY-CURSOR-ORCHESTRATION',
  'HEAVY-PARTNERSHIP',
  'HEAVY-LEVERAGE',
  'HEAVY-STARTUP',
  'HEAVY-GROK',
  'HEAVY-FULL-AUDIT',
];

function listFiles() {
  const all = fs.readdirSync(ROOT);
  const picked = new Set();
  for (const pat of GLOBS) {
    const base = pat.replace('*', '');
    const isWildcard = pat.includes('*');
    for (const f of all) {
      if (f.endsWith('.md') && (!isWildcard || f.startsWith(base.split('*')[0]))) {
        if (isWildcard ? f.startsWith(pat.replace('*.md', '').replace('*', '')) : f === pat) picked.add(f);
      }
    }
  }
  // explicit prefix match
  for (const f of all) {
    if (!f.endsWith('.md') && !f.endsWith('-SENT.txt')) continue;
    if (SENT_PREFIXES.some((p) => f.startsWith(p))) picked.add(f);
  }
  return [...picked].sort();
}

function excerpt(text, max = 600) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function topics(text) {
  const keys = [
    ['forms', /form|tally|intake|submit|field/i],
    ['design', /design|nav|footer|master|canvas|visual|hero/i],
    ['copy', /copy|messaging|trust|pricing/i],
    ['partnership', /partner|allies|portfolio desk|referral/i],
    ['gtm', /outbound|dm|placement|brief|founder/i],
    ['cms', /cms|blog|content|collection/i],
    ['pipeline', /webhook|board|submission|anonym/i],
    ['competitive', /fonzi|jack|underdog|paraform|dover/i],
    ['legal', /privacy|terms|atlas|entity|invoice/i],
    ['tech', /foot-core|head|cdn|verify|mcp|webflow/i],
  ];
  return keys.filter(([, re]) => re.test(text)).map(([k]) => k);
}

function summarizeFile(file) {
  const full = path.join(ROOT, file);
  let stat = null;
  try { stat = fs.statSync(full); } catch { return null; }
  const text = fs.readFileSync(full, 'utf8');
  const title = (text.match(/^#\s+(.+)/m) || [])[1] || file;
  const date = (text.match(/_Date:\s*([^_\n]+)/i) || text.match(/_(\d{4}-\d{2}-\d{2}[^\n]*)/) || [])[1]
    || stat.mtime.toISOString();
  const sent = file.endsWith('-SENT.txt');
  return {
    file,
    title: excerpt(title, 120),
    at: date,
    bytes: stat.size,
    type: sent ? 'prompt-sent' : 'reply-artifact',
    topics: topics(text),
    excerpt: excerpt(text.replace(/^#.*$/m, '').slice(0, 4000)),
  };
}

const files = listFiles();
const entries = files.map(summarizeFile).filter(Boolean);
const byTopic = {};
for (const e of entries) {
  for (const t of e.topics) {
    byTopic[t] = byTopic[t] || [];
    byTopic[t].push(e.file);
  }
}

const digest = {
  at: new Date().toISOString(),
  fileCount: entries.length,
  topics: Object.fromEntries(Object.entries(byTopic).map(([k, v]) => [k, [...new Set(v)].sort()])),
  entries,
  keyThreads: [
    { id: 'forms-native', files: entries.filter((e) => e.topics.includes('forms')).map((e) => e.file).slice(0, 8) },
    { id: 'design-masters', files: entries.filter((e) => e.topics.includes('design')).map((e) => e.file).slice(0, 8) },
    { id: 'partnership-c', files: entries.filter((e) => e.topics.includes('partnership')).map((e) => e.file) },
    { id: 'gtm-leverage', files: entries.filter((e) => e.topics.includes('gtm')).map((e) => e.file) },
    { id: 'competitive', files: entries.filter((e) => e.topics.includes('competitive')).map((e) => e.file).slice(0, 6) },
  ],
};

fs.writeFileSync(OUT_JSON, JSON.stringify(digest, null, 2));

let md = `# Demigod — SuperGrok Heavy History Digest\n\n_${digest.at}_ · ${digest.fileCount} artifacts indexed\n\n`;
md += `## Topic index\n\n`;
for (const [t, files2] of Object.entries(digest.topics).sort()) {
  md += `### ${t}\n${files2.map((f) => `- ${f}`).join('\n')}\n\n`;
}
md += `## Thread summaries\n\n`;
for (const e of entries.slice(0, 40)) {
  md += `### ${e.file}\n_${e.at}_ · topics: ${e.topics.join(', ') || '—'}\n\n${e.excerpt}\n\n`;
}
fs.writeFileSync(OUT_MD, md);
console.log(JSON.stringify({ ok: true, fileCount: digest.fileCount, out: OUT_MD }, null, 2));