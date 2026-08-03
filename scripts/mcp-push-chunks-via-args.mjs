#!/usr/bin/env node
/**
 * Emit CallMcpTool push_files arguments for each chunk in /tmp/mcp-chunks/.
 * Agent reads stdout per chunk id and calls CallMcpTool.
 * Usage: node mcp-push-chunks-via-args.mjs [chunk-id ...]
 *        node mcp-push-chunks-via-args.mjs --list
 */
import fs from 'fs';
import path from 'path';

const DIR = '/tmp/mcp-chunks';
const args = process.argv.slice(2);
if (!args.length || args[0] === '--list') {
  const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
  for (const m of manifest) console.log(m.id, m.bytes, m.files.join(', '));
  process.exit(0);
}
for (const id of args) {
  const p = path.join(DIR, `${id}.json`);
  if (!fs.existsSync(p)) {
    console.error('missing', id);
    process.exit(1);
  }
  process.stdout.write(fs.readFileSync(p, 'utf8'));
  if (args.length > 1) process.stdout.write('\n---CHUNK---\n');
}