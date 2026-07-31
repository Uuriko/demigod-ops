#!/usr/bin/env node
/**
 * Push one batch via grok_com_github push_files using JWT from ~/.grok/auth.json
 * Usage: node mcp-push-batch-pushfiles.mjs <batch-num 00-24>
 */
import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const batchNum = process.argv[2];
if (!batchNum) {
  console.error('usage: mcp-push-batch-pushfiles.mjs <00-24>');
  process.exit(1);
}

const MCP_URL = 'https://api.githubcopilot.com/mcp/x/all';
const batchPath = `/tmp/gh-mcp-batches/batch-${batchNum}.json`;
const payload = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

const auth = JSON.parse(fs.readFileSync(`${process.env.HOME}/.grok/auth.json`, 'utf8'));
const entry = Object.values(auth)[0];
const token = entry?.key;
if (!token) {
  console.error('NO_TOKEN');
  process.exit(2);
}

for (const f of payload.files) {
  if (!f.content || f.content.length < 10 || /PLACEHOLDER|LOAD_FROM/i.test(f.content)) {
    console.error(JSON.stringify({ ok: false, error: 'invalid content', path: f.path, len: f.content?.length }));
    process.exit(3);
  }
}

const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: 'mcp-push-batch', version: '1.0.0' });
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

const text = result?.content?.[0]?.text || JSON.stringify(result);
const sha = text.match(/[a-f0-9]{40}/)?.[0] || null;
const err = result?.isError ? text : null;
if (err) {
  console.error(JSON.stringify({ ok: false, batch: batchNum, error: err.slice(0, 800) }));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  batch: batchNum,
  paths: payload.files.map((f) => ({ path: f.path, len: f.content.length })),
  sha,
  text: text.slice(0, 300),
}));