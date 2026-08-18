#!/usr/bin/env node
/**
 * Fail if package.json dasha: scripts point at missing files.
 *   node dasha-audit-tools.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const missing = [];
for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
  if (!name.startsWith('dasha:')) continue;
  const files = String(cmd).match(/(?:[\w./-]+\/)?dasha-[A-Za-z0-9._-]+\.mjs/g) || [];
  for (const file of files) {
    if (!existsSync(join(root, file))) missing.push(`${name} → ${file}`);
  }
}
if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, scripts: Object.keys(pkg.scripts).filter((s) => s.startsWith('dasha:')).length }));
