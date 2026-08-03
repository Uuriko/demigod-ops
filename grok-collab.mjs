import puppeteer from 'puppeteer-core';

const CDP = 'http://[::1]:9223';
const PROMPT = `SuperGrok Heavy — creative direction request from Local Grok (Grok Build).

We're improving an artsy browser minigame called "eat the sounds" inspired by @ninjawhee (Sarah Lin). Current mechanics: catch floating jazz-record pizza-slices, each adds a color to a central hex shape, 7 slices triggers metamorphosis/wings at "the mirror at the edge of the world." Uses her X quotes, hieroglyphs ∴𓅰, cathedral/moon aesthetic.

Give a tight numbered list (max 8 items) of the highest-impact improvements for: visual poetry, gameplay feel, audio, and ninjawhee thematic fidelity. Be specific and implementable in vanilla HTML canvas. No generic advice.`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getLatestAssistantText(page) {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-testid="message"], article, .markdown, .prose, [class*="message"]'));
    const texts = nodes.map((n) => n.innerText?.trim()).filter(Boolean);
    if (texts.length) return texts[texts.length - 1];
    const body = document.body?.innerText || '';
    const chunks = body.split(/\n{2,}/).filter((t) => t.length > 80);
    return chunks[chunks.length - 1] || body.slice(-2500);
  });
}

async function sendToGrok(page, text) {
  const selectors = [
    'textarea',
    '[contenteditable="true"]',
    '[role="textbox"]',
    'div[contenteditable]',
  ];
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (!el) continue;
    await el.click({ clickCount: 3 });
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(text, { delay: 8 });
    await page.keyboard.press('Enter');
    return true;
  }
  return false;
}

const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
const pages = await browser.pages();
let grokPage = pages.find((p) => p.url().includes('grok.com/c/'));
if (!grokPage) grokPage = pages.find((p) => p.url().includes('grok.com'));
if (!grokPage) {
  grokPage = await browser.newPage();
  await grokPage.goto('https://grok.com', { waitUntil: 'domcontentloaded' });
}

await grokPage.bringToFront();
const before = await getLatestAssistantText(grokPage);
const sent = await sendToGrok(grokPage, PROMPT);
console.log('sent:', sent);

let response = '';
for (let i = 0; i < 45; i++) {
  await sleep(2000);
  const now = await getLatestAssistantText(grokPage);
  if (now && now !== before && now.length > before.length + 120) {
    response = now;
    if (now.includes('1.') || now.includes('1)') || /^\d+\./m.test(now)) break;
  }
}

if (!response) response = await getLatestAssistantText(grokPage);

const out = `/home/potter/HEAVY-GAME-DIRECTION.md`;
const fs = await import('fs');
fs.writeFileSync(out, `# SuperGrok Heavy — Game Direction\n\n${response}\n`);
console.log('saved:', out);
console.log('preview:\n', response.slice(0, 1200));
await browser.disconnect();