#!/usr/bin/env node
/** Read push JSON and output summary; agent uses CallMcpTool with same file. */
import fs from 'fs';
const p = process.argv[2];
if (!p) { console.error('usage: node mcp-invoke-push.mjs <json>'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
const files = data.files || [{ path: data.path, content: data.content }];
for (const f of files) {
  const c = f.content || '';
  console.log(JSON.stringify({
    tool: data.tool || 'push_files',
    owner: data.owner || 'Uuriko',
    repo: data.repo || 'eat-the-sounds',
    branch: data.branch || 'master',
    message: data.message,
    path: f.path,
    contentLen: c.length,
    valid: c.length > 100 && !c.includes('PLACEHOLDER'),
    head: c.slice(0, 50),
    tail: c.slice(-50),
    sha: data.sha,
  }));
}