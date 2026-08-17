#!/usr/bin/env node
/**
 * Every markdown link to a file in this repo must resolve.
 *
 * There are forty-odd DASHA-*.md files at the repo root and they link to each other constantly. That
 * cross-linking is the only navigation the doc set has, so a dead link is not cosmetic — it is the
 * map pointing at a road that was removed. `DASHA-DOCS-SYSTEM-BACKLOG.md` already lists "remove links
 * in current docs to deleted files" as an open item; this makes it impossible to reintroduce.
 *
 * Only local links are checked. External URLs are somebody else's uptime and would make this gate
 * flaky and slow; the point is to catch OUR renames and deletions, which are the ones we cause.
 *
 *   node dasha-docs-links.test.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
/* `demigod-ops-*`, `work` and `tmp-die-c` are stale checkouts of this same repo, not part of it. Their
   docs link relative to their own root, so scanning them reports our own files as missing and buries
   the real breakage — 24 of 24 failures on 2026-08-17 came from mirrors. The ship-bound source of
   record is `/home/potter` itself (AGENTS.md); a copy's dead link is the copy's problem. */
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.tmp-dasha-ship', 'dist', 'archive', '.grok', 'src',
  'demigod-ops-23', 'demigod-ops-255', 'work', 'tmp-die-c',
  /* Vendored skill copies: their `references/` live beside the plugin source, not here. */
  'agent-tools',
]);
const CANONICAL_FILES = [
  'DASHA-DOCS.md',
  'DASHA-RULES.md',
  'DASHA-WORKFLOW.md',
  'DASHA-PRODUCT-BRIEF.md',
  'DASHA-ROADMAP.md',
  'DASHA-BIBLE.md',
];
const HISTORICAL_FILES = [
  'DASHA-PRODUCT-STRATEGY.md',
  'DASHA-DISCORD-BLUEPRINT.md',
  'DASHA-SPEC-GAMIFICATION.md',
  'DASHA-SPEC-SETTLEMENT.md',
  'DASHA-PIVOT-DECISION-2026-08-06.md',
];
/* Templates for a generated tree. Their relative links resolve where the file LANDS, not where it
   lives — dasha-studio-readme.md links to LICENSE, which exists beside its published copy in
   dasha-desk/studio/ and not beside the template. The generated copy is scanned normally, so the
   link is still checked; it is just checked in the only place the answer is meaningful. */
const SKIP_FILES = new Set(['dasha-studio-readme.md']);

async function markdownFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await markdownFiles(full));
    else if (entry.name.endsWith('.md') && !SKIP_FILES.has(entry.name)) out.push(full);
  }
  return out;
}

const files = await markdownFiles(root);
const broken = [];
let checked = 0;

function metadata(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  return Object.fromEntries(match[1].split('\n').map((line) => {
    const split = line.indexOf(':');
    return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
  }).filter(([key]) => key));
}

const owners = new Map();
for (const name of CANONICAL_FILES) {
  const meta = metadata(await readFile(join(root, name), 'utf8'));
  if (meta.status !== 'canonical') broken.push(`${name} → status must be canonical`);
  if (!meta.canonical_for) broken.push(`${name} → canonical_for is required`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.last_verified || '')) broken.push(`${name} → last_verified must be YYYY-MM-DD`);
  if (owners.has(meta.canonical_for)) broken.push(`${name} → duplicates canonical_for owned by ${owners.get(meta.canonical_for)}`);
  if (meta.canonical_for) owners.set(meta.canonical_for, name);
}
for (const name of HISTORICAL_FILES) {
  const meta = metadata(await readFile(join(root, name), 'utf8'));
  if (meta.status !== 'historical') broken.push(`${name} → retired direction must be historical`);
  if (!meta.superseded_by) broken.push(`${name} → superseded_by is required`);
}

const map = await readFile(join(root, 'DASHA-DOCS.md'), 'utf8');
for (const name of CANONICAL_FILES) {
  if (name === 'DASHA-DOCS.md') continue;
  if (!map.includes(`](${name})`)) broken.push(`DASHA-DOCS.md → missing canonical owner ${name}`);
}

for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const [, label, target] of text.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    // External, anchors, mail and protocol-relative links are not ours to keep alive.
    if (/^(https?:|mailto:|#|\/\/)/.test(target)) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    if (!path) continue;
    checked++;
    /* A leading `/` normally means repo-root-relative. But the exchange docs agents write to each
       other quote real absolute paths, and re-rooting those produced `/home/potter/home/potter/…`
       and reported three files that exist as missing. If it already starts at the root, it IS the
       path. */
    const abs = path.startsWith(root + '/') ? path
      : path.startsWith('/') ? join(root, path)
        : resolve(dirname(file), path);
    try { await stat(abs); }
    catch { broken.push(`${file.replace(root + '/', '')} → ${path}   [${label.slice(0, 40)}]`); }
  }
}

console.log(`Dasha docs: ${files.length} markdown files, ${checked} local links, ${owners.size} canonical owners`);
if (broken.length) {
  console.error(`\n${broken.length} broken local link(s):\n`);
  for (const b of broken) console.error('  · ' + b);
  process.exit(1);
}
console.log('Dasha docs: PASS (links, lifecycle metadata and canonical ownership)');
