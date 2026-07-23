#!/usr/bin/env node
/**
 * demigod-gtm-blast.mjs — dry inventory of local send drafts only.
 * Delivery is permanently disabled. Non-dry never appends a "blasted" send log.
 *
 *   node demigod-gtm-blast.mjs --dry
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(ROOT, 'demigod-outreach', 'sends-2026-07-07');
const variantsf = '/tmp/demigod-x-variants.txt';
const dry = process.argv.includes('--dry');

if (!dry) {
  console.error(
    JSON.stringify({
      error: 'auto_dm_stopped',
      overrideAllowed: false,
      hint: 'Use --dry only. This tool never records delivery; it only inventories local draft files.',
    }),
  );
  process.exit(2);
}

let files = [];
try {
  files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt') && f !== 'SEND-LOG.txt');
} catch {
  files = [];
}
const variants = fs.existsSync(variantsf) ? fs.readFileSync(variantsf, 'utf8') : '';
console.log(`DRY inventory ${files.length} local draft file(s) (no send, no log append)`);
if (variants) console.log('variants file present (not sent)');
process.exit(0);
