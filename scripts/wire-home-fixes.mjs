#!/usr/bin/env node
/** Idempotent wires for homepage CTA strip + Dasha Compute door. */
import { readFileSync, writeFileSync } from 'node:fs';

function mustInclude(hay, needle, label) {
  if (!hay.includes(needle)) throw new Error(`${label}: needle missing`);
}

function wireDemigod(src) {
  let s = src;
  if (!s.includes("from './demigod-html-prefill.mjs'")) {
    const needle = ' */\nconst FEED_SCHEMA';
    mustInclude(s, needle, 'demigod-html-worker import');
    s = s.replace(
      needle,
      " */\nimport { stripLeakedBriefPrefill } from './demigod-html-prefill.mjs';\nexport { stripLeakedBriefPrefill };\nconst FEED_SCHEMA",
    );
  }
  if (!s.includes('stripGoldAccent(stripLeakedBriefPrefill(html))')) {
    const needle = 'html = rewriteStaleSnapshotDates(rewriteCdnPin(stripGoldAccent(html)));';
    mustInclude(s, needle, 'demigod-html-worker productEdge');
    s = s.replace(
      needle,
      'html = rewriteStaleSnapshotDates(rewriteCdnPin(stripGoldAccent(stripLeakedBriefPrefill(html))));',
    );
  }
  return s;
}

function wireDasha(src) {
  let s = src;
  if (!s.includes("from './dasha-home-compute.mjs'")) {
    const needle = "} from './dasha-award-chrome.mjs';\n";
    mustInclude(s, needle, 'dasha-lobby-worker import');
    s = s.replace(
      needle,
      "} from './dasha-award-chrome.mjs';\nimport { ensureHomeComputeDoor, ensureHomeComputeHop } from './dasha-home-compute.mjs';\n",
    );
  }
  if (!s.includes('page = ensureHomeComputeDoor(page);')) {
    const needle = '  page = ensureHomeForumHop(page);\n  return ensureTwitterSite(ensureHomeSeo(page));';
    mustInclude(s, needle, 'dasha-lobby-worker rewriteHomeFirstViewport');
    s = s.replace(
      needle,
      '  page = ensureHomeForumHop(page);\n  page = ensureHomeComputeDoor(page);\n  page = ensureHomeComputeHop(page);\n  return ensureTwitterSite(ensureHomeSeo(page));',
    );
  }
  return s;
}

const jobs = [
  ['demigod-html-worker.mjs', wireDemigod],
  ['dasha-lobby-worker.mjs', wireDasha],
];

const changed = [];
for (const [file, wire] of jobs) {
  const before = readFileSync(file, 'utf8');
  const after = wire(before);
  if (after !== before) {
    writeFileSync(file, after);
    changed.push(file);
  }
}

console.log(JSON.stringify({ ok: true, changed }, null, 2));
