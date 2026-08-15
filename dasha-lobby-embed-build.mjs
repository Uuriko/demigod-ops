#!/usr/bin/env node
/** Verify the dedicated Lobby page owns the client mount. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const landing = readFileSync(join(root, 'dasha-landing.html'), 'utf8');
const page = readFileSync(join(root, 'dasha-lobby-page.html'), 'utf8');

if (!page.includes('id="dasha-lobby"') || !page.includes('https://lobby.getdasha.com/client/lobby.js')) {
  console.error('dasha-lobby-embed-build: dedicated page is missing its mount or client');
  process.exit(1);
}
if (!landing.includes('href="/forum"') || landing.includes('id="dasha-lobby"')) {
  console.error('dasha-lobby-embed-build: homepage must link to /forum without mounting chat');
  process.exit(1);
}
if (args.has('--check') || args.has('--write') || args.size === 0) {
  console.log('dasha-lobby-embed-build: PASS', { route: '/forum' });
  process.exit(0);
}
console.error('usage: node dasha-lobby-embed-build.mjs --check|--write');
process.exit(2);
