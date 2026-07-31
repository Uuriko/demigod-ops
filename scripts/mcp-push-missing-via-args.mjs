#!/usr/bin/env node
/** Emit MCP tool + args for each /tmp/mcp-missing/*.json payload */
import fs from 'fs';
import path from 'path';

const DIR = '/tmp/mcp-missing';
const ids = process.argv.slice(2);
const files = ids.length
  ? ids.map((id) => `${id}.json`)
  : fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();

for (const f of files) {
  const p = path.join(DIR, f);
  const payload = JSON.parse(fs.readFileSync(p, 'utf8'));
  process.stdout.write(JSON.stringify({ tool: payload.tool, arguments: payload.args }));
  if (files.length > 1) process.stdout.write('\n---PAYLOAD---\n');
}