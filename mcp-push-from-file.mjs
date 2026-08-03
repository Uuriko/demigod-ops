#!/usr/bin/env node
/**
 * Read prepared push JSON and output MCP push_files arguments to stdout.
 * Agent reads via shell (agent-tools) then calls CallMcpTool with the JSON.
 * Usage: node mcp-push-from-file.mjs /tmp/mcp-push-pixel-gfx_js.json
 */
import fs from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node mcp-push-from-file.mjs <json>');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const out = {
  owner: data.owner || 'Uuriko',
  repo: data.repo || 'eat-the-sounds',
  branch: data.branch || 'master',
  message: data.message,
  files: data.files,
};
process.stdout.write(JSON.stringify(out));