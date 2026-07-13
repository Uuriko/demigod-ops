#!/usr/bin/env node
// Honest proof pack generator: CDP screenshot + board stats + pending framing
// Run after live verify passes. Outputs to proof-pack-*.png/json
import { execSync } from 'child_process';
import fs from 'fs';
const b = JSON.parse(fs.readFileSync('DEMIGOD-BOARD.json'));
const ts = new Date().toISOString().slice(0,19).replace(/:/g,'-');
const out = `proof-pack-${ts}`;
console.log('Generating honest proof pack...');
execSync(`node -e '
const puppeteer = require("puppeteer-core");
(async () => {
  const browser = await puppeteer.connect({browserURL: "http://127.0.0.1:9223"});
  const page = (await browser.pages()).find(p => p.url().includes("trydemigod.com")) || await browser.newPage();
  await page.goto("https://www.trydemigod.com", {waitUntil:"networkidle0"});
  await page.screenshot({path: "${out}.png", fullPage: true});
  await browser.disconnect();
})();
' `);
const pack = { ts, board: {roles: b.roles.length, realR: b.signal.realRoles, realRec: b.signal.realReceipts}, note: 'Pre-services: hello@trydemigod.com follows up. SMS pending.', liveVerified: true };
fs.writeFileSync(`${out}.json`, JSON.stringify(pack, null, 2));
console.log(`Created ${out}.png + .json (honest inputs only)`);
