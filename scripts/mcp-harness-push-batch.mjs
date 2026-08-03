#!/usr/bin/env node
/**
 * Emit push_files args for batch NN as JSON on stdout.
 * Agent: node scripts/mcp-harness-push-batch.mjs 17 | tee /tmp/out.json
 * Then CallMcpTool push_files with parsed JSON from /tmp/mcp-invoke-ready or require batch.
 */
import fs from 'fs';

const n = process.argv[2]?.padStart(2, '0');
if (!n) {
  console.error('usage: mcp-harness-push-batch.mjs <00-24>');
  process.exit(1);
}

const ready = `/tmp/mcp-invoke-ready/meta-${n}.json`;
const batch = `/tmp/gh-mcp-batches/batch-${n}.json`;
const meta = fs.existsSync(ready)
  ? JSON.parse(fs.readFileSync(ready, 'utf8'))
  : JSON.parse(fs.readFileSync(batch, 'utf8'));

const files = meta.files
  ? meta.files.map((f) => {
      const safe = f.path.replace(/[/\\]/g, '__');
      const contentPath = `/tmp/mcp-invoke-ready/content-${n}-${safe}`;
      const content = fs.existsSync(contentPath)
        ? fs.readFileSync(contentPath, 'utf8')
        : JSON.parse(fs.readFileSync(batch, 'utf8')).files.find((x) => x.path === f.path)?.content;
      if (!content || content.length < 10) throw new Error(`missing content for ${f.path}`);
      return { path: f.path, content };
    })
  : JSON.parse(fs.readFileSync(batch, 'utf8')).files;

for (const f of files) {
  if (/PLACEHOLDER|LOAD_FROM/i.test(f.content)) {
    console.error(JSON.stringify({ ok: false, batch: n, path: f.path }));
    process.exit(2);
  }
}

const args = {
  owner: meta.owner,
  repo: meta.repo,
  branch: meta.branch,
  message: meta.message,
  files,
};

process.stdout.write(JSON.stringify(args));