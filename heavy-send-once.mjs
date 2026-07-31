import puppeteer from 'puppeteer-core';

// Fire-and-forget: send ONCE, do NOT poll or click retry — let Heavy finish thinking.
const PROMPT = `CODE ONLY. Three complete JavaScript functions in \`\`\`js blocks:

function drawAlignedPlayfield(ctx, layout, lanes, time) { }
function playJazzImprov(audioCtx, dest, lane, pentatonic, stepRef) { }
function syncLaneLayout(root, layout) { }

Fill all bodies for eat-the-sounds rhythm game (4 lanes D F J K, bite line, improv). No prose.`;

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 60000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com')) ||
  await browser.newPage();

await page.bringToFront();
const input = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 15000 });
await input.click();
await page.keyboard.type(PROMPT, { delay: 6 });
await page.keyboard.press('Enter');
console.log('sent once — not polling, not interrupting');
await browser.disconnect();