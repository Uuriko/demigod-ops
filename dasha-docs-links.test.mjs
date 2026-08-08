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
const SKIP_DIRS = new Set(['node_modules', '.git', '.tmp-dasha-ship', 'dist', 'archive']);

async function markdownFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await markdownFiles(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const files = await markdownFiles(root);
const broken = [];
let checked = 0;

for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const [, label, target] of text.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    // External, anchors, mail and protocol-relative links are not ours to keep alive.
    if (/^(https?:|mailto:|#|\/\/)/.test(target)) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    if (!path) continue;
    checked++;
    const abs = path.startsWith('/') ? join(root, path) : resolve(dirname(file), path);
    try { await stat(abs); }
    catch { broken.push(`${file.replace(root + '/', '')} → ${path}   [${label.slice(0, 40)}]`); }
  }
}

console.log(`Dasha docs links: ${files.length} markdown files, ${checked} local links`);
if (broken.length) {
  console.error(`\n${broken.length} broken local link(s):\n`);
  for (const b of broken) console.error('  · ' + b);
  process.exit(1);
}
console.log('Dasha docs links: PASS (every local link resolves)');
