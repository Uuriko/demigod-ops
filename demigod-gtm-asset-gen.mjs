#!/usr/bin/env node
// Creative GTM asset generator: honest proof packs from live + board for DMs (no fakes)
import { execSync } from 'child_process';
import fs from 'fs';
const b = JSON.parse(fs.readFileSync('DEMIGOD-BOARD.json'));
const ts = Date.now();
const out = `gtm-proof-${ts}`;
console.log('Generating honest GTM assets...');
execSync(`node -e '
const p = require("puppeteer-core");
(async () => {
  const br = await p.connect({browserURL:"http://127.0.0.1:9223"});
  const pg = (await br.pages()).find(p=>p.url().includes("trydemigod")) || await br.newPage();
  await pg.goto("https://www.trydemigod.com");
  await pg.screenshot({path: "${out}-site.png", fullPage:true});
  await br.disconnect();
})();
'`);
const asset = {ts, board: {roles:b.roles.length, realR:b.signal.realRoles, realRec:b.signal.realReceipts}, note:"Pre-services honest. hello@ follows up. SMS pending.", files:[`${out}-site.png`]};
fs.writeFileSync(`${out}.json`, JSON.stringify(asset,null,2));
console.log(`Created ${out}.png + .json (attach to DMs for trust)`);
// Honesty pre-check
if (!require('child_process').execSync('node demigod-verify-board-honesty.mjs', {encoding:'utf8'}).includes('OK')) { console.error('Board not honest'); process.exit(1); }
