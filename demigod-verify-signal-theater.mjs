#!/usr/bin/env node
/** Verify signal theater exports are fresh and manifest-valid. */
import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';

const MANIFEST = path.join(ROOT, 'SIGNAL-THEATER.json');
const LATEST_HTML = path.join(ROOT, 'demigod-outreach', 'signal-theater', 'signal-card-latest.html');
const LATEST_DM = path.join(ROOT, 'demigod-outreach', 'signal-theater', 'dm-snippets-latest.txt');
const OUT = path.join(ROOT, 'DEMIGOD-VERIFY-SIGNAL-THEATER.json');

function main() {
  const checks = {
    manifestExists: fs.existsSync(MANIFEST),
    htmlLatest: fs.existsSync(LATEST_HTML),
    dmLatest: fs.existsSync(LATEST_DM),
    manifestOk: false,
    ledgerInHtml: false,
    noSpeedInDm: true,
  };

  if (checks.manifestExists) {
    try {
      const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
      checks.manifestOk = m.ok === true && (m.signal?.score == null || typeof m.signal?.score === 'number'); // honest: allow null until real receipts
    } catch (_) {
      checks.manifestOk = false;
    }
  }

  if (checks.htmlLatest) {
    const html = fs.readFileSync(LATEST_HTML, 'utf8');
    checks.ledgerInHtml = /Placement ledger|ledger-row|ledger-outcome/i.test(html);
  }

  if (checks.dmLatest) {
    const dm = fs.readFileSync(LATEST_DM, 'utf8');
    checks.noSpeedInDm = !/48\s*h|reply\s*in\s*\d|<2h/i.test(dm);
  }

  const pass = Object.values(checks).every(Boolean);
  const out = { at: new Date().toISOString(), pass, checks };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(pass ? 0 : 1);
}

main();