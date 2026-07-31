// Fire-and-forget: post Orca mobile pairing code to Grok Heavy for phone pickup.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PAIR = fs.readFileSync('/home/potter/orca-pair-code.txt', 'utf8').trim();
const [p1, p2, p3] = [
  PAIR.slice(0, 80),
  PAIR.slice(80, 160),
  PAIR.slice(160),
];

const PROMPT = `Heavy — ORCA MOBILE PAIRING CODE (for phone → Orca IDE app)

Potter needs this on mobile. Reply with ONLY the code blocks below, nothing else.

PHONE STEPS:
1. Open Orca IDE app → Pair → Paste pairing code
2. Paste all 3 parts as ONE line (no spaces between parts)
3. Phone + PC same Wi-Fi (192.168.1.106)

FULL CODE (one line):
${PAIR}

COPY IN 3 SHORT PARTS:
PART 1:
${p1}
PART 2:
${p2}
PART 3:
${p3}

Endpoint: ws://192.168.1.106:6768`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

const page =
  (await browser.pages()).find((p) => p.url().includes('grok.com/c/')) ||
  (await browser.pages()).find((p) => p.url().includes('grok.com')) ||
  (await browser.newPage());

if (!page.url().includes('grok.com')) {
  await page.goto('https://grok.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
}

await page.bringToFront();
const input = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 20000 });
await input.click();
await page.keyboard.type(PROMPT, { delay: 3 });
await page.keyboard.press('Enter');

fs.writeFileSync('/home/potter/HEAVY-ORCA-PAIR-SENT.txt', `${new Date().toISOString()}\n${PAIR}\n`);
console.log('orca pair code sent to Grok Heavy — check Grok app on phone');
await browser.disconnect();