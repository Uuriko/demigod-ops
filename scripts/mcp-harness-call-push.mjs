#!/usr/bin/env node
/**
 * Emit one-line JSON: { server, toolName, arguments } for harness CallMcpTool.
 * Usage: node scripts/mcp-harness-call-push.mjs <batch-num 00-24>
 */
import fs from 'fs';

const n = process.argv[2]?.padStart(2, '0');
if (!n) {
  console.error('usage: mcp-harness-call-push.mjs <00-24>');
  process.exit(1);
}

const paths = [
  `/tmp/mcp-push-queue/batch-${n}.json`,
  `/tmp/gh-mcp-batches/batch-${n}.json`,
];
const p = paths.find((x) => fs.existsSync(x));
if (!p) {
  console.error('missing batch', n);
  process.exit(2);
}

const args = JSON.parse(fs.readFileSync(p, 'utf8'));
for (const f of args.files) {
  if (!f.content || f.content.length < 10 || /PLACEHOLDER|LOAD_FROM/i.test(f.content)) {
    console.error(JSON.stringify({ ok: false, batch: n, path: f.path, len: f.content?.length }));
    process.exit(3);
  }
}

const out = {
  server: 'grok_com_github',
  toolName: 'push_files',
  arguments: {
    owner: args.owner || 'Uuriko',
    repo: args.repo || 'eat-the-sounds',
    branch: args.branch || 'master',
    message: args.message,
    files: args.files,
  },
};

process.stdout.write(JSON.stringify(out));