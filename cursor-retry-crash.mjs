#!/usr/bin/env node
/** Click Cursor "Try again" when agent UI crashes. Safe to run repeatedly. */
import fs from 'fs';
import path from 'path';
import {
  ROOT, log, connectBrowser, findCursorAgentsPage, ensureCursorHealthy, detectCursorCrash,
} from './collab-lib.mjs';

const OUT = path.join(ROOT, 'CURSOR-CRASH-RETRY.json');

const browser = await connectBrowser();
let page = await findCursorAgentsPage(browser);
if (!page) {
  page = await browser.newPage();
  await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 2000));
}

const before = await detectCursorCrash(page);
const result = await ensureCursorHealthy(page);
const after = await detectCursorCrash(page);

await page.screenshot({ path: path.join(ROOT, 'cursor-retry-after.png') });

const payload = {
  at: new Date().toISOString(),
  before,
  result,
  after,
};
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
log(`cursor-retry: before.crash=${before.crashed} after.crash=${after.crashed} recovered=${result.recovered}`);
console.log(JSON.stringify(payload, null, 2));
await browser.disconnect();
process.exit(after.crashed ? 1 : 0);