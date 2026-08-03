#!/usr/bin/env node
/**
 * Read push_files args JSON (from agent-tools or /tmp) and emit summary.
 * Agent: node -p "JSON.stringify(JSON.parse(require('fs').readFileSync('PATH')))" 
 *   → output lands in agent-tools; then CallMcpTool push_files with that payload.
 */
import fs from 'fs';
const p = process.argv[2];
if (!p) {
  console.error('usage: mcp-push-from-agent-tools.mjs <args.json>');
  process.exit(1);
}
const args = JSON.parse(fs.readFileSync(p, 'utf8'));
const toolArgs = args.arguments || args;
const files = toolArgs.files || [{ path: toolArgs.path, content: toolArgs.content }];
for (const f of files) {
  if (!f.content || f.content.length < 10 || /PLACEHOLDER|LOAD_FROM/i.test(f.content)) {
    console.error(JSON.stringify({ ok: false, path: f.path, len: f.content?.length }));
    process.exit(2);
  }
}
console.log(JSON.stringify({
  ok: true,
  tool: args.tool || 'push_files',
  owner: toolArgs.owner,
  repo: toolArgs.repo,
  branch: toolArgs.branch,
  message: toolArgs.message,
  paths: files.map((f) => ({ path: f.path, len: f.content.length })),
  totalBytes: JSON.stringify(toolArgs).length,
}));