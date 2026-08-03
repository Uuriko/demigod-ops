#!/usr/bin/env node
/** Emit push_files args JSON to stdout (lands in agent-tools if large). */
import fs from 'fs';
const n = process.argv[2]?.padStart(2, '0');
if (!n) { console.error('usage: mcp-emit-batch-push.mjs <00-24>'); process.exit(1); }
const p = JSON.parse(fs.readFileSync(`/tmp/gh-mcp-batches/batch-${n}.json`, 'utf8'));
for (const f of p.files) {
  if (!f.content || f.content.length < 10 || /PLACEHOLDER|LOAD_FROM/i.test(f.content)) {
    console.error(JSON.stringify({ ok: false, batch: n, path: f.path, len: f.content?.length }));
    process.exit(2);
  }
}
const args = { owner: p.owner, repo: p.repo, branch: p.branch, message: p.message, files: p.files };
process.stdout.write(JSON.stringify(args));