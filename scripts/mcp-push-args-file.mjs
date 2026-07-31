#!/usr/bin/env node
/** Push one /tmp/mcp-args-*.json via grok_com_github create_or_update_file (stdio MCP). */
import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const argsPath = process.argv[2];
if (!argsPath) {
  console.error('usage: mcp-push-args-file.mjs <args.json>');
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(argsPath, 'utf8'));
const configPath = `${process.env.HOME}/.grok/config.toml`;
const config = fs.readFileSync(configPath, 'utf8');
const section = config.match(/\[mcp_servers\.grok_com_github\]([\s\S]*?)(?=\n\[|$)/);
if (!section) {
  console.error('grok_com_github MCP not in config.toml');
  process.exit(2);
}
const block = section[1];
const url = block.match(/url\s*=\s*"([^"]+)"/)?.[1];
const auth = block.match(/Authorization"\]\s*=\s*"([^"]+)"/)?.[1]
  || block.match(/Authorization\s*=\s*"([^"]+)"/)?.[1];
if (!url || !auth) {
  console.error('missing url or Authorization in grok_com_github config');
  process.exit(3);
}

const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
const transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: { headers: { Authorization: auth } },
});
const client = new Client({ name: 'mcp-push-args-file', version: '1.0.0' });
await client.connect(transport);
const result = await client.callTool({ name: 'create_or_update_file', arguments: args });
await client.close();
const text = result?.content?.[0]?.text || JSON.stringify(result);
const sha = text.match(/[a-f0-9]{40}/)?.[0] || null;
console.log(JSON.stringify({ ok: !result?.isError, path: args.path, sha, text: text.slice(0, 500) }));
process.exit(result?.isError ? 1 : 0);