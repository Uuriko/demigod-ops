#!/usr/bin/env node
/** Emit push_files or create_or_update_file args JSON to stdout for harness CallMcpTool. */
import fs from 'fs';

const n = process.argv[2]?.padStart(2, '0');
const mode = process.argv[3] || 'push'; // push | cou
if (!n) {
  console.error('usage: mcp-emit-batch-args.mjs <00-24> [push|cou]');
  process.exit(1);
}

const batchPath = `/tmp/gh-mcp-batches/batch-${n}.json`;
const payload = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
for (const f of payload.files) {
  if (!f.content || f.content.length < 10 || /PLACEHOLDER|LOAD_FROM/i.test(f.content)) {
    console.error(JSON.stringify({ ok: false, batch: n, path: f.path, len: f.content?.length }));
    process.exit(2);
  }
}

if (mode === 'cou' && payload.files.length === 1) {
  const f = payload.files[0];
  const couPath = `/tmp/mcp-cou-${f.path.replace(/\//g, '__')}.json`;
  let sha;
  if (fs.existsSync(couPath)) {
    sha = JSON.parse(fs.readFileSync(couPath, 'utf8')).sha;
  }
  const args = {
    owner: payload.owner,
    repo: payload.repo,
    branch: payload.branch,
    path: f.path,
    message: payload.message,
    content: f.content,
  };
  if (sha) args.sha = sha;
  process.stdout.write(JSON.stringify(args));
} else {
  process.stdout.write(JSON.stringify({
    owner: payload.owner,
    repo: payload.repo,
    branch: payload.branch,
    message: payload.message,
    files: payload.files,
  }));
}