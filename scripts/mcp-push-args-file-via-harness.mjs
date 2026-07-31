#!/usr/bin/env node
/**
 * Emit push_files / create_or_update_file args as single-line JSON for harness CallMcpTool.
 * Usage: node mcp-push-args-file-via-harness.mjs <args.json> [--tool push_files|create_or_update_file]
 */
import fs from 'fs';

const path = process.argv[2];
const toolFlag = process.argv.indexOf('--tool');
const toolOverride = toolFlag >= 0 ? process.argv[toolFlag + 1] : null;
if (!path) {
  console.error('usage: mcp-push-args-file-via-harness.mjs <args.json> [--tool name]');
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
const tool = toolOverride || (raw.files ? 'push_files' : 'create_or_update_file');
const args = raw.files ? raw : raw;
const content = args.content || args.files?.[0]?.content || '';
const out = { tool, arguments: args.files ? { owner: args.owner, repo: args.repo, branch: args.branch, message: args.message, files: args.files } : args };
if (!content || content.length < 100 || /PLACEHOLDER|LOAD_FROM/i.test(content)) {
  console.error(JSON.stringify({ ok: false, error: 'invalid content', contentLen: content.length }));
  process.exit(2);
}
process.stdout.write(JSON.stringify(out));