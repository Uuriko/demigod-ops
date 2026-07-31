#!/usr/bin/env node
/** Emit { server, toolName, arguments } for create_or_update_file from args JSON. */
import fs from 'fs';
const path = process.argv[2];
if (!path) {
  console.error('usage: mcp-emit-cou.mjs <cou-args.json>');
  process.exit(1);
}
const args = JSON.parse(fs.readFileSync(path, 'utf8'));
const content = args.content || '';
if (!content || content.length < 10 || /PLACEHOLDER|LOAD_FROM/i.test(content)) {
  console.error(JSON.stringify({ ok: false, path: args.path, len: content.length }));
  process.exit(2);
}
process.stdout.write(JSON.stringify({
  server: 'grok_com_github',
  toolName: 'create_or_update_file',
  arguments: args,
}));