#!/usr/bin/env node
/** Keep the first-class Simp Board off Home while retaining its door. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const landingPath = join(root, 'dasha-landing.html');
const html = readFileSync(landingPath, 'utf8');
if (![0, 1].includes(args.size) || (args.size && !args.has('--check') && !args.has('--write'))) {
  console.error('usage: node dasha-simp-board-embed-build.mjs --check|--write');
  process.exit(2);
}
if (!html.includes('href="/simp"') || html.includes('id="dasha-simp-board"') || html.includes('/client/simp-board.js')) {
  console.error('dasha-simp-board-embed-build: Home must link to /simp without embedding its client');
  process.exit(1);
}
console.log('dasha-simp-board-embed-build: check PASS', { mode: 'door-only' });
