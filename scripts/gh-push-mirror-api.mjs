#!/usr/bin/env node
/** Push eat-the-sounds mirror via GitHub Contents API (needs gh auth token). */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = '/home/potter/eat-the-sounds';
const OWNER = 'Uuriko';
const REPO = 'eat-the-sounds';
const BRANCH = 'master';
const SKIP = new Set(['node_modules', '.git']);

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  const gh = process.env.GH_PATH || '/home/potter/.local/bin/gh';
  try { return execSync(`"${gh}" auth token 2>/dev/null`, { encoding: 'utf8' }).trim(); } catch (_) {}
  return null;
}

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

async function getSha(tok, filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURI(filePath)}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getSha ${filePath}: ${res.status}`);
  return (await res.json()).sha;
}

async function upsert(tok, rel, message) {
  const full = path.join(ROOT, rel);
  const buf = fs.readFileSync(full);
  const isBinary = /\.(png|jpg|webp|gif)$/i.test(rel);
  const content = buf.toString('base64');
  const sha = await getSha(tok, rel);
  const body = { message, content, branch: BRANCH, ...(sha ? { sha } : {}) };
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURI(rel)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tok}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${rel}: ${res.status} ${text.slice(0, 200)}`);
  return rel;
}

const tok = token();
if (!tok) {
  console.error('No token. Run: /home/potter/.local/bin/gh auth login');
  process.exit(2);
}

const files = walk(ROOT).sort();
let ok = 0;
let fail = 0;
for (const rel of files) {
  try {
    await upsert(tok, rel, `Sync eat-the-sounds mirror: ${rel}`);
    ok++;
    process.stdout.write(`OK ${rel}\n`);
  } catch (e) {
    fail++;
    process.stderr.write(`FAIL ${rel}: ${e.message}\n`);
  }
}
console.log(JSON.stringify({ ok, fail, total: files.length }));
process.exit(fail ? 1 : 0);