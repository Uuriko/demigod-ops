#!/usr/bin/env node
/**
 * Push payload JSON files via grok_com_github MCP (push_files / create_or_update_file).
 * Usage: node mcp-push-payloads.mjs /tmp/mcp-missing/overworld.js.json ...
 */
import fs from 'fs';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = process.env.GROK_MCP_URL || 'https://api.githubcopilot.com/mcp/x/all';

function getAuthHeader() {
  if (process.env.GROK_MCP_GITHUB_AUTH) return process.env.GROK_MCP_GITHUB_AUTH;
  const authPath = path.join(process.env.HOME || '/home/potter', '.grok/auth.json');
  const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  const entry = Object.values(auth)[0];
  if (entry?.key) return `Bearer ${entry.key}`;
  return null;
}

async function callTool(name, args, authHeader) {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: authHeader } },
  });
  const client = new Client({ name: 'mcp-push-payloads', version: '1.0.0' });
  await client.connect(transport);
  const result = await client.callTool({ name, arguments: args });
  await client.close();
  if (result?.isError) throw new Error(result.content?.[0]?.text || 'MCP error');
  const text = result?.content?.[0]?.text || '';
  const sha = text.match(/[a-f0-9]{40}/)?.[0] || null;
  return { text, sha };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: mcp-push-payloads.mjs <payload.json> ...');
  process.exit(1);
}

const auth = getAuthHeader();
if (!auth) {
  console.error('no auth');
  process.exit(2);
}

const results = [];
for (const f of files) {
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  const tool = raw.tool || (raw.files ? 'push_files' : 'create_or_update_file');
  const args = raw.arguments || raw.args || raw;
  const label = path.basename(f);
  try {
    const r = await callTool(tool, args, auth);
    console.log('OK', label, r.sha || '');
    results.push({ file: label, ok: true, sha: r.sha });
  } catch (e) {
    console.error('FAIL', label, e.message);
    results.push({ file: label, ok: false, error: e.message });
  }
}

fs.writeFileSync('/tmp/mcp-push-payloads-summary.json', JSON.stringify(results, null, 2));
process.exit(results.some((r) => !r.ok) ? 1 : 0);