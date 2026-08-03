#!/usr/bin/env node
/**
 * Read MCP args JSON and push via GitHub Contents API using token from env GITHUB_TOKEN.
 * Fallback when harness CallMcpTool cannot inline large payloads.
 * Usage: GITHUB_TOKEN=... node mcp-push-json-via-node.mjs <args.json>
 */
import fs from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: mcp-push-json-via-node.mjs <args.json>');
  process.exit(1);
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.error('NO_TOKEN');
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
const tool = raw.tool || (raw.files ? 'push_files' : 'create_or_update_file');
const args = raw.arguments || raw;

async function getSha(owner, repo, branch, filePath) {
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(filePath)}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`get ${filePath}: ${r.status} ${await r.text()}`);
  return (await r.json()).sha;
}

async function putOne(owner, repo, branch, message, filePath, content, sha) {
  const isPng = filePath.endsWith('.png');
  const body = {
    message: `${message} — ${filePath}`,
    content: isPng ? content : Buffer.from(content, 'utf8').toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(filePath)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`put ${filePath}: ${r.status} ${await r.text()}`);
  return (await r.json()).commit.sha;
}

const { owner, repo, branch, message } = args;
let sha;
if (tool === 'push_files') {
  for (const f of args.files) {
    const existing = await getSha(owner, repo, branch, f.path);
    sha = await putOne(owner, repo, branch, message, f.path, f.content, existing);
    console.log('OK', f.path, sha);
  }
} else {
  const existing = args.sha || await getSha(owner, repo, branch, args.path);
  sha = await putOne(owner, repo, branch, message, args.path, args.content, existing);
  console.log('OK', args.path, sha);
}
console.log(JSON.stringify({ ok: true, sha }));