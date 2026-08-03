#!/usr/bin/env node
/** Build push_files payload for GitHub MCP (stdout JSON). */
import fs from 'fs';
import path from 'path';

const ROOT = '/home/potter/eat-the-sounds';
const SKIP = new Set(['node_modules', '.git']);

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

const files = walk(ROOT).sort();
const payload = files.map((rel) => {
  const full = path.join(ROOT, rel);
  const buf = fs.readFileSync(full);
  const isBinary = /\.(png|jpg|webp|gif)$/i.test(rel);
  return {
    path: rel,
    content: isBinary ? buf.toString('base64') : buf.toString('utf8'),
    encoding: isBinary ? 'base64' : 'utf8',
  };
});

const chunks = [];
const MAX = 25;
for (let i = 0; i < payload.length; i += MAX) {
  chunks.push(payload.slice(i, i + MAX));
}

console.log(JSON.stringify({ total: payload.length, chunks: chunks.length, batches: chunks }, null, 0));