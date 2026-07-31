#!/usr/bin/env node
/**
 * Push eat-the-sounds mirror files via GitHub MCP push_files (stdin JSON per batch).
 * Run from agent harness with grok_com_github MCP, or pipe batches to CallMcpTool.
 * Standalone: prints batch paths for agent loop.
 */
import fs from 'fs';
import path from 'path';

const ROOT = '/home/potter/eat-the-sounds';
const SKIP = new Set(['node_modules', '.git']);
const OWNER = 'Uuriko';
const REPO = 'eat-the-sounds';
const BRANCH = 'master';
const MAX_BYTES = 28_000;

function walk(dir, base = '') {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

function fileEntry(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  const isBinary = /\.(png|jpg|webp|gif)$/i.test(rel);
  return {
    path: rel,
    content: isBinary ? buf.toString('base64') : buf.toString('utf8'),
  };
}

const rels = walk(ROOT).sort();
const batches = [];
let current = [];
let currentBytes = 0;

for (const rel of rels) {
  const entry = fileEntry(rel);
  const bytes = Buffer.byteLength(entry.content, 'utf8');
  if (current.length && currentBytes + bytes > MAX_BYTES) {
    batches.push(current);
    current = [];
    currentBytes = 0;
  }
  current.push(entry);
  currentBytes += bytes;
}
if (current.length) batches.push(current);

const OUT = '/tmp/gh-push-mirror';
fs.mkdirSync(OUT, { recursive: true });
const manifest = [];
batches.forEach((files, i) => {
  const payload = {
    owner: OWNER,
    repo: REPO,
    branch: BRANCH,
    message: `Sync eat-the-sounds mirror [${i + 1}/${batches.length}]`,
    files,
  };
  const outPath = path.join(OUT, `batch-${String(i).padStart(2, '0')}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload));
  manifest.push({
    path: outPath,
    files: files.length,
    bytes: fs.statSync(outPath).size,
    names: files.map((f) => f.path),
  });
});

console.log(JSON.stringify({ totalFiles: rels.length, batches: manifest }, null, 2));