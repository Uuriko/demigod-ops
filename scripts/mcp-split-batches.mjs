#!/usr/bin/env node
/** Split /tmp/mcp-push-args/*.json into <=20KB chunks for MCP push_files. */
import fs from 'fs';
import path from 'path';

const SRC = '/tmp/mcp-push-args';
const OUT = '/tmp/mcp-chunks';
const MAX = 20_000;
fs.mkdirSync(OUT, { recursive: true });

const manifest = [];
for (const f of fs.readdirSync(SRC).filter((x) => /^\d{2}[a-z]?\.json$/.test(x)).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
  let chunk = [];
  let size = 0;
  let part = 0;
  const flush = () => {
    if (!chunk.length) return;
    const id = `${f.replace('.json', '')}-${String(part++).padStart(2, '0')}`;
    const payload = {
      owner: data.owner,
      repo: data.repo,
      branch: data.branch,
      message: `${data.message} [chunk ${part}]`,
      files: chunk,
    };
    const outPath = path.join(OUT, `${id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(payload));
    manifest.push({ id, outPath, files: chunk.map((x) => x.path), bytes: fs.statSync(outPath).size });
    chunk = [];
    size = 0;
  };
  for (const file of data.files) {
    const bytes = Buffer.byteLength(file.content, 'utf8');
    if (chunk.length && size + bytes > MAX) flush();
    chunk.push(file);
    size += bytes;
  }
  flush();
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ chunks: manifest.length, totalBytes: manifest.reduce((a, m) => a + m.bytes, 0) }, null, 2));
manifest.forEach((m) => console.log(m.id, m.bytes, m.files.join(', ')));