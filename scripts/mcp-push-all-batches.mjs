#!/usr/bin/env node
/**
 * Push all prepared batches via grok_com_github MCP push_files.
 * Reads /tmp/mcp-push-args/*.json and calls MCP for each batch.
 * Requires GROK_MCP_GITHUB_AUTH or harness-injected MCP session.
 */
import fs from 'fs';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = process.env.GROK_MCP_URL || 'https://api.githubcopilot.com/mcp/x/all';
const ARGS_DIR = process.env.MCP_ARGS_DIR || '/tmp/mcp-push-args';
const SKIP = new Set((process.env.MCP_SKIP_BATCHES || '').split(',').filter(Boolean));

async function getAuthHeader() {
  if (process.env.GROK_MCP_GITHUB_AUTH) return process.env.GROK_MCP_GITHUB_AUTH;
  const authPath = path.join(process.env.HOME || '/home/potter', '.grok/auth.json');
  if (!fs.existsSync(authPath)) return null;
  const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  const entry = Object.values(auth)[0];
  if (!entry?.refresh_token) return null;
  const resp = await fetch('https://auth.x.ai/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: entry.refresh_token,
      client_id: entry.oidc_client_id || 'b1a00492-073a-47ea-816f-4c329264a828',
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.access_token ? `Bearer ${data.access_token}` : null;
}

async function pushBatch(jsonPath, authHeader) {
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const headers = authHeader ? { Authorization: authHeader } : {};
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { requestInit: { headers } });
  const client = new Client({ name: 'push-all-batches', version: '1.0.0' });
  await client.connect(transport);
  const result = await client.callTool({
    name: 'push_files',
    arguments: {
      owner: payload.owner,
      repo: payload.repo,
      branch: payload.branch,
      message: payload.message,
      files: payload.files,
    },
  });
  await client.close();
  const sha = result?.content?.[0]?.text?.match(/[a-f0-9]{40}/)?.[0] || null;
  const err = result?.isError ? result.content?.[0]?.text : null;
  if (err) throw new Error(err);
  return {
    batch: path.basename(jsonPath, '.json'),
    files: payload.files.map((f) => f.path),
    sha,
    result,
  };
}

const auth = await getAuthHeader();
const files = fs.readdirSync(ARGS_DIR).filter((f) => f.endsWith('.json')).sort();
const results = [];
let pushed = 0;
let failed = 0;

console.log(JSON.stringify({ auth: auth ? 'present' : 'missing', batches: files.length }));

for (const f of files) {
  const id = path.basename(f, '.json');
  if (SKIP.has(id)) {
    console.log('SKIP', id);
    continue;
  }
  const p = path.join(ARGS_DIR, f);
  try {
    const r = await pushBatch(p, auth);
    pushed++;
    console.log('OK', id, r.files.join(', '), r.sha || '');
    results.push({ batch: id, ok: true, files: r.files, sha: r.sha });
  } catch (e) {
    failed++;
    console.error('FAIL', id, e.message);
    results.push({ batch: id, ok: false, error: e.message });
  }
}

const summary = { pushed, failed, skipped: SKIP.size, results };
fs.writeFileSync('/tmp/mcp-push-summary.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(failed ? 1 : 0);