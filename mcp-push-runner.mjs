#!/usr/bin/env node
/**
 * Push prepared single-push JSON files via grok_com_github MCP (HTTP).
 * Usage: node mcp-push-runner.mjs /tmp/single-push-00.json ...
 */
import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = 'https://api.githubcopilot.com/mcp/x/all';

async function pushFile(jsonPath) {
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client({ name: 'push-runner', version: '1.0.0' });
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
  const paths = payload.files.map((f) => f.path).join(', ');
  console.log('OK', jsonPath, paths, JSON.stringify(result).slice(0, 500));
  return { jsonPath, paths, result };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node mcp-push-runner.mjs <json>...');
  process.exit(1);
}

const results = [];
for (const f of files) {
  try {
    results.push(await pushFile(f));
  } catch (e) {
    console.error('FAIL', f, e.message);
    results.push({ jsonPath: f, error: e.message });
  }
}
const failed = results.filter((r) => r.error);
console.log(JSON.stringify({ pushed: results.length - failed.length, failed: failed.length, results }, null, 2));
process.exit(failed.length ? 1 : 0);