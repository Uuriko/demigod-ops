#!/usr/bin/env node
/**
 * Emit one-line {server, toolName, arguments} for a batch or COU args file.
 * Agent: node scripts/mcp-push-batch-via-args.mjs /tmp/cou-pixel-final.json create_or_update_file
 */
import fs from 'fs';

const path = process.argv[2];
const toolOverride = process.argv[3];
if (!path) {
  console.error('usage: mcp-push-batch-via-args.mjs <json> [toolName]');
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
const tool = toolOverride || raw.toolName || (raw.files ? 'push_files' : 'create_or_update_file');
const args = raw.arguments || raw;
const content = args.content || args.files?.[0]?.content || '';
if (!content || content.length < 100 || /PLACEHOLDER|LOAD_FROM/i.test(content)) {
  console.error(JSON.stringify({ ok: false, len: content?.length, path }));
  process.exit(2);
}
const out = { server: 'grok_com_github', toolName: tool, arguments: args };
process.stdout.write(JSON.stringify(out));