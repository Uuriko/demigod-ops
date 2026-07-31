#!/usr/bin/env node
/**
 * Push all batches via GitHub Contents API using GITHUB_TOKEN or gh auth token.
 * Fallback: writes batch list for manual MCP push_files.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BATCH_DIR = '/tmp/gh-mcp-batches';
const OWNER = 'Uuriko';
const REPO = 'eat-the-sounds';
const BRANCH = 'master';

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try { return execSync('gh auth token 2>/dev/null', { encoding: 'utf8' }).trim(); } catch (_) {}
  return null;
}

async function getSha(filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getSha ${filePath}: ${res.status}`);
  return (await res.json()).sha;
}

async function upsertFile(filePath, content, message) {
  const isBinary = /\.(png|jpg|webp|gif)$/i.test(filePath);
  const body = {
    message,
    content: isBinary ? content : Buffer.from(content, 'utf8').toString('base64'),
    branch: BRANCH,
    encoding: 'base64',
  };
  const sha = await getSha(filePath);
  if (sha) body.sha = sha;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
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
  if (!res.ok) throw new Error(`upsert ${filePath}: ${res.status} ${text.slice(0, 300)}`);
  return filePath;
}

const tok = token();
if (!tok) {
  const batches = fs.readdirSync(BATCH_DIR).filter((f) => f.startsWith('batch-')).sort();
  console.error('No GitHub token — run: gh auth login');
  console.log(JSON.stringify({ mode: 'batches-only', batches: batches.map((b) => path.join(BATCH_DIR, b)) }, null, 2));
  process.exit(2);
}

const batches = fs.readdirSync(BATCH_DIR).filter((f) => f.startsWith('batch-')).sort();
let ok = 0;
let fail = 0;
const errors = [];

for (const name of batches) {
  const payload = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, name), 'utf8'));
  for (const file of payload.files) {
    try {
      await upsertFile(file.path, file.content, payload.message);
      ok++;
      process.stdout.write(`OK ${file.path}\n`);
    } catch (e) {
      fail++;
      errors.push({ path: file.path, error: e.message });
      process.stderr.write(`FAIL ${file.path}: ${e.message}\n`);
    }
  }
}

console.log(JSON.stringify({ ok, fail, errors: errors.slice(0, 10) }, null, 2));
process.exit(fail ? 1 : 0);