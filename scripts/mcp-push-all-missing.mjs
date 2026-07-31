#!/usr/bin/env node
/**
 * Push all /tmp/mcp-missing/*.json via GitHub Contents API.
 * Token: GITHUB_TOKEN or GH_TOKEN env, or ~/.config/gh/hosts.yml
 * Fallback instructions if no token.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DIR = '/tmp/mcp-missing';
const LOG = '/tmp/mcp-push-all-missing.log';
const SUMMARY = '/tmp/mcp-push-all-missing-summary.json';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, `${line}\n`);
}

function getToken() {
  for (const k of ['GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_PAT']) {
    if (process.env[k]) return process.env[k];
  }
  const hosts = path.join(process.env.HOME, '.config/gh/hosts.yml');
  if (fs.existsSync(hosts)) {
    const m = fs.readFileSync(hosts, 'utf8').match(/oauth_token:\s*(\S+)/);
    if (m) return m[1];
  }
  try { return execSync('gh auth token 2>/dev/null', { encoding: 'utf8' }).trim(); } catch (_) {}
  return null;
}

async function getSha(token, owner, repo, branch, filePath) {
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(filePath)}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`get ${filePath}: ${r.status} ${await r.text()}`);
  return (await r.json()).sha;
}

async function putFile(token, args, tool) {
  const { owner, repo, branch, message } = args;
  if (tool === 'push_files') {
    for (const f of args.files) {
      const sha = await getSha(token, owner, repo, branch, f.path);
      const body = {
        message: `${message} (${f.path})`,
        content: Buffer.from(f.content, f.path.endsWith('.png') ? 'base64' : 'utf8').toString('base64'),
        branch,
      };
      if (sha) body.sha = sha;
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(f.path)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`put ${f.path}: ${r.status} ${await r.text()}`);
      const j = await r.json();
      log(`OK ${f.path} ${j.commit.sha}`);
    }
    return { ok: true };
  }
  const sha = args.sha || await getSha(token, owner, repo, branch, args.path);
  const body = {
    message: args.message,
    content: Buffer.from(args.content, 'utf8').toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(args.path)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`put ${args.path}: ${r.status} ${await r.text()}`);
  const j = await r.json();
  log(`OK ${args.path} ${j.commit.sha}`);
  return { ok: true, sha: j.commit.sha };
}

const token = getToken();
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const results = [];

if (!token) {
  log('NO_TOKEN — use CallMcpTool for each file in /tmp/mcp-missing/');
  for (const f of files) results.push({ file: f, ok: false, error: 'no token' });
  fs.writeFileSync(SUMMARY, JSON.stringify({ token: false, results }, null, 2));
  process.exit(2);
}

log(`token present, pushing ${files.length} files`);
for (const f of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const tool = raw.tool;
  const args = raw.args;
  try {
    const r = await putFile(token, args, tool);
    results.push({ file: f, ok: true, ...r });
  } catch (e) {
    log(`FAIL ${f} ${e.message}`);
    results.push({ file: f, ok: false, error: e.message });
  }
}

const ok = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
fs.writeFileSync(SUMMARY, JSON.stringify({ ok, fail, results }, null, 2));
process.exit(fail ? 1 : 0);