#!/usr/bin/env node
/**
 * Print Dasha sources of truth for this checkout (one SoR per surface).
 *   node dasha-where.mjs
 */
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const home = process.env.HOME || '/home/potter';
const potter = join(home);

function real(p) {
  try {
    return existsSync(p) ? realpathSync(p) : p + ' (missing)';
  } catch {
    return p;
  }
}

const rows = [
  ['checkout (edit here)', root],
  ['home landing', join(root, 'dasha-landing.html')],
  ['studio', join(root, 'dasha-meme-studio.html')],
  ['desk src', join(root, 'dasha-desk/src')],
  ['lobby worker', join(root, 'dasha-lobby-worker.mjs')],
  ['simp client', join(root, 'dasha-simp-board-client.js')],
  ['ship script', join(root, 'dasha-ship.mjs')],
  ['workflow', join(root, 'DASHA-WORKFLOW.md')],
  ['product brief', join(root, 'DASHA-PRODUCT-BRIEF.md')],
  ['docs entry', join(root, 'DASHA-DOCS.md')],
  ['legacy home SoR note', join(potter, 'dasha-landing.html')],
];

console.log(JSON.stringify({
  ok: true,
  rule: 'Edit only this checkout for Dasha. Do not parallel-edit /home/potter copies in the same task. Ship: npm run dasha:check && npm run dasha:gate:fast && (publish auth) npm run dasha:ship',
  commands: {
    check: 'npm run dasha:check',
    gate: 'npm run dasha:gate:fast',
    ship: 'npm run dasha:ship',
    where: 'npm run dasha:where',
  },
  paths: Object.fromEntries(rows.map(([k, p]) => [k, real(p)])),
}, null, 2));
