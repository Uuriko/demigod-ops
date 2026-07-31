#!/usr/bin/env node
/**
 * Push one /tmp/mcp-missing/*.json or /tmp/mcp-chunks/*.json payload via GitHub REST API.
 * Uses GITHUB_TOKEN env or gh auth token. Fallback for when harness MCP is unavailable.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const payloadPath = process.argv[2];
if (!payloadPath) {
  console.error('usage: mcp-push-from-payload.mjs <payload.json>');
  process.exit(1);
}

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch (_) { /* */ }
  return null;
}

const token = getToken();
if (!token) {
  console.error('no GITHUB_TOKEN or gh auth token');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const tool = payload.tool || 'push_files';
const args = payload.arguments || payload.args || payload;

async function getRefSha(owner, repo, branch) {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!r.ok) throw new Error(`ref ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.object.sha;
}

async function getFileSha(owner, repo, branch, filePath) {
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(filePath)}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`contents ${r.status}: ${await r.text()}`);
  return (await r.json()).sha;
}

async function createBlob(owner, repo, content, encoding = 'utf-8') {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, encoding }),
  });
  if (!r.ok) throw new Error(`blob ${r.status}: ${await r.text()}`);
  return (await r.json()).sha;
}

async function createTree(owner, repo, baseSha, entries) {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base_tree: baseSha, tree: entries }),
  });
  if (!r.ok) throw new Error(`tree ${r.status}: ${await r.text()}`);
  return (await r.json()).sha;
}

async function createCommit(owner, repo, message, treeSha, parents) {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, tree: treeSha, parents }),
  });
  if (!r.ok) throw new Error(`commit ${r.status}: ${await r.text()}`);
  return (await r.json()).sha;
}

async function updateRef(owner, repo, branch, sha) {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sha, force: false }),
  });
  if (!r.ok) throw new Error(`ref ${r.status}: ${await r.text()}`);
}

async function pushFiles(args) {
  const { owner, repo, branch, message, files } = args;
  const parentSha = await getRefSha(owner, repo, branch);
  const parentCommit = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${parentSha}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  }).then((r) => r.json());
  const treeEntries = [];
  for (const f of files) {
    const isBase64 = f.path.endsWith('.png');
    const blobSha = await createBlob(owner, repo, f.content, isBase64 ? 'base64' : 'utf-8');
    treeEntries.push({ path: f.path, mode: '100644', type: 'blob', sha: blobSha });
  }
  const treeSha = await createTree(owner, repo, parentCommit.tree.sha, treeEntries);
  const commitSha = await createCommit(owner, repo, message, treeSha, [parentSha]);
  await updateRef(owner, repo, branch, commitSha);
  return { sha: commitSha, files: files.map((f) => f.path) };
}

async function createOrUpdateFile(args) {
  const { owner, repo, branch, path: filePath, message, content, sha } = args;
  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
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
  if (!r.ok) throw new Error(`put ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { sha: j.commit.sha, path: filePath };
}

try {
  let result;
  if (tool === 'push_files') result = await pushFiles(args);
  else if (tool === 'create_or_update_file') result = await createOrUpdateFile(args);
  else throw new Error(`unknown tool ${tool}`);
  console.log(JSON.stringify({ ok: true, ...result }));
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
}