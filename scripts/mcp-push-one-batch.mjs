#!/usr/bin/env node
/** Emit push_files args JSON for one batch — agent passes to CallMcpTool. */
import fs from 'fs';
const n = process.argv[2];
if (!n) {
  console.error('usage: mcp-push-one-batch.mjs <00-24>');
  process.exit(1);
}
const paths = [
  `/tmp/push-args-${n}.json`,
  `/tmp/gh-mcp-batches/batch-${n}.json`,
];
const p = paths.map((x) => (fs.existsSync(x) ? JSON.parse(fs.readFileSync(x, 'utf8')) : null)).find(Boolean);
if (!p) {
  console.error('missing batch', n);
  process.exit(2);
}
for (const f of p.files) {
  if (!f.content || f.content.length < 10 || /PLACEHOLDER|LOAD_FROM/i.test(f.content)) {
    console.error(JSON.stringify({ ok: false, path: f.path, len: f.content?.length }));
    process.exit(3);
  }
}
process.stdout.write(JSON.stringify({
  owner: p.owner,
  repo: p.repo,
  branch: p.branch,
  message: p.message,
  files: p.files,
}));