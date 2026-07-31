#!/usr/bin/env node
/**
 * Push files via grok_com_github MCP using prepared JSON payloads.
 * Reads push_files or create_or_update_file args from JSON files.
 * Must be invoked by the agent harness (CallMcpTool); this script
 * prepares and validates payloads only.
 */
import fs from 'fs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node mcp-push-from-json.mjs <json>...');
  process.exit(1);
}

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const data = JSON.parse(raw);
  const content = data.content || data.files?.[0]?.content || '';
  const path = data.path || data.files?.[0]?.path || '?';
  console.log(JSON.stringify({
    file: f,
    path,
    contentLen: content.length,
    starts: content.slice(0, 60),
    ends: content.slice(-40),
    valid: !content.includes('PLACEHOLDER') && content.length > 100,
  }));
}