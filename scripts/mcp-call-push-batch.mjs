#!/usr/bin/env node
/** Print one-line JSON for CallMcpTool push_files from /tmp/mcp-push-args/<id>.json */
import fs from 'fs';
const id = process.argv[2];
if (!id) {
  console.error('Usage: node mcp-call-push-batch.mjs <id>');
  process.exit(1);
}
const p = `/tmp/mcp-push-args/${id}.json`;
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
process.stdout.write(JSON.stringify({
  owner: data.owner,
  repo: data.repo,
  branch: data.branch,
  message: data.message,
  files: data.files,
}));