#!/usr/bin/env node
/** Output push_files arguments JSON for one batch (agent passes to CallMcpTool). */
import fs from 'fs';
const n = process.argv[2];
if (!n) {
  console.error('Usage: node mcp-read-batch.mjs <NN>');
  process.exit(1);
}
const p = `/tmp/mcp-invoke/batch-${n}.json`;
const b = JSON.parse(fs.readFileSync(p, 'utf8'));
process.stdout.write(JSON.stringify({
  owner: b.owner,
  repo: b.repo,
  branch: b.branch,
  message: b.message,
  files: b.files,
}));