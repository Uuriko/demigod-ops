#!/usr/bin/env node
/**
 * Read push_files or create_or_update_file args JSON and emit MCP call metadata.
 * Agent uses: node scripts/mcp-push-from-args.mjs <file.json>
 * Then CallMcpTool with parsed args (read file with node in agent).
 */
import fs from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: mcp-push-from-args.mjs <args.json>');
  process.exit(1);
}
const args = JSON.parse(fs.readFileSync(path, 'utf8'));
const tool = args.files ? 'push_files' : 'create_or_update_file';
const content = args.content || args.files?.[0]?.content || '';
const filePath = args.path || args.files?.map((f) => f.path).join(', ') || '?';
console.log(JSON.stringify({
  tool,
  path: filePath,
  contentLen: content.length,
  valid: content.length > 100 && !/PLACEHOLDER|LOAD_FROM/i.test(content),
  argsPath: path,
  argsBytes: fs.statSync(path).size,
}));