#!/usr/bin/env node
/**
 * demigod-import-integrity — fail if tracked demigod sources import local demigod-*.mjs
 * modules that are missing on disk or not tracked in git (clone-breakers).
 *
 *   node demigod-import-integrity.mjs
 *   node demigod-import-integrity.mjs --json
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const JSON_OUT = process.argv.includes('--json');

const tracked = new Set(
  spawnSync('git', ['-C', ROOT, 'ls-files'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean),
);

const importRe =
  /(?:from|import)\s*\(?\s*['"](\.\/)?(demigod-[a-zA-Z0-9._-]+\.mjs)['"]/g;

const missing = [];
const untracked = [];
const checked = new Set();

for (const rel of tracked) {
  if (!/\.(mjs|js)$/.test(rel)) continue;
  if (rel.startsWith('archive/') || rel.includes('node_modules/')) continue;
  const abs = path.join(ROOT, rel);
  let src;
  try {
    src = fs.readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  importRe.lastIndex = 0;
  let m;
  while ((m = importRe.exec(src))) {
    const mod = m[2];
    if (!mod || checked.has(`${rel}->${mod}`)) continue;
    checked.add(`${rel}->${mod}`);
    const modPath = path.join(ROOT, mod);
    if (!fs.existsSync(modPath)) {
      missing.push({ from: rel, mod, reason: 'missing-on-disk' });
    } else if (!tracked.has(mod)) {
      untracked.push({ from: rel, mod, reason: 'exists-untracked' });
    }
  }
}

const ok = missing.length === 0 && untracked.length === 0;
const report = {
  ok,
  at: new Date().toISOString(),
  edgesChecked: checked.size,
  missing,
  untracked,
  summary: ok
    ? `import-integrity OK edges=${checked.size}`
    : `import-integrity FAIL missing=${missing.length} untracked=${untracked.length}`,
};

if (JSON_OUT) console.log(JSON.stringify(report, null, 2));
else {
  console.log(report.summary);
  for (const row of [...missing, ...untracked].slice(0, 40)) {
    console.log(`  ${row.reason}: ${row.from} → ${row.mod}`);
  }
}
process.exit(ok ? 0 : 1);
