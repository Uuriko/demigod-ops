#!/usr/bin/env node
/**
 * Push prepared /tmp/mcp-push-*.json files via grok_com_github MCP.
 * Uses GROK_SESSION_AUTH from environment (injected by grok harness) or
 * falls back to reading session auth from active grok process.
 */
import fs from 'fs';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = 'https://api.githubcopilot.com/mcp/x/all';

async function getAuthHeader() {
  if (process.env.GROK_MCP_GITHUB_AUTH) {
    return process.env.GROK_MCP_GITHUB_AUTH;
  }
  // Try grok session token from auth refresh
  const authPath = path.join(process.env.HOME || '/home/potter', '.grok/auth.json');
  if (fs.existsSync(authPath)) {
    const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    const entry = Object.values(auth)[0];
    if (entry?.refresh_token) {
      const resp = await fetch('https://auth.x.ai/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: entry.refresh_token,
          client_id: entry.oidc_client_id || 'b1a00492-073a-47ea-816f-4c329264a828',
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.access_token) return `Bearer ${data.access_token}`;
      }
    }
  }
  return null;
}

async function pushFile(jsonPath, authHeader) {
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const headers = authHeader ? { Authorization: authHeader } : {};
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { requestInit: { headers } });
  const client = new Client({ name: 'batch-push', version: '1.0.0' });
  await client.connect(transport);
  const result = await client.callTool({
    name: 'push_files',
    arguments: {
      owner: payload.owner || 'Uuriko',
      repo: payload.repo || 'eat-the-sounds',
      branch: payload.branch || 'master',
      message: payload.message,
      files: payload.files,
    },
  });
  await client.close();
  const paths = payload.files.map((f) => f.path).join(', ');
  const err = result?.isError ? result.content?.[0]?.text : null;
  if (err) throw new Error(err);
  return { jsonPath, paths, result };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node mcp-batch-push.mjs <json>...');
  process.exit(1);
}

const authHeader = await getAuthHeader();
console.log('auth:', authHeader ? 'present' : 'missing');

const results = [];
for (const f of files) {
  try {
    const r = await pushFile(f, authHeader);
    console.log('OK', f, r.paths);
    results.push({ file: f, ok: true, paths: r.paths });
  } catch (e) {
    console.error('FAIL', f, e.message);
    results.push({ file: f, ok: false, error: e.message });
  }
}

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ pushed: results.length - failed.length, failed: failed.length, results }, null, 2));
process.exit(failed.length ? 1 : 0);