#!/usr/bin/env node
/**
 * Prepare per-batch push_files JSON under /tmp/mcp-push-queue/.
 * Agent calls CallMcpTool push_files for each file after node validates.
 */
import fs from 'fs';
import path from 'path';

const BATCH_DIR = '/tmp/gh-mcp-batches';
const READY = '/tmp/mcp-invoke-ready';
const OUT = '/tmp/mcp-push-queue';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
for (let i = 0; i <= 24; i++) {
  const n = String(i).padStart(2, '0');
  const batchPath = path.join(BATCH_DIR, `batch-${n}.json`);
  const p = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  const files = p.files.map((f) => {
    const safe = f.path.replace(/[/\\]/g, '__');
    const contentPath = path.join(READY, `content-${n}-${safe}`);
    const content = fs.existsSync(contentPath)
      ? fs.readFileSync(contentPath, 'utf8')
      : f.content;
    if (!content || content.length < 10 || /PLACEHOLDER|LOAD_FROM/i.test(content)) {
      throw new Error(`invalid ${n} ${f.path} len=${content?.length}`);
    }
    return { path: f.path, content };
  });
  const args = {
    owner: p.owner,
    repo: p.repo,
    branch: p.branch,
    message: p.message,
    files,
  };
  const outPath = path.join(OUT, `batch-${n}.json`);
  fs.writeFileSync(outPath, JSON.stringify(args));
  results.push({
    batch: n,
    outPath,
    bytes: fs.statSync(outPath).size,
    files: files.map((f) => ({ path: f.path, len: f.content.length })),
  });
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ batches: results.length, totalBytes: results.reduce((a, r) => a + r.bytes, 0) }, null, 2));
results.forEach((r) => console.log(r.batch, r.bytes, r.files.map((f) => f.path).join(', ')));