import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 90000;
console.log(`waiting ${WAIT_MS / 1000}s...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) process.exit(0);

const data = await page.evaluate(() => {
  const msgs = [...document.querySelectorAll('[data-testid="message"], article, .message, [class*="message"]')];
  const texts = msgs.map((m) => (m.innerText || '').trim()).filter((t) => t.length > 80);
  const heavy = texts.filter((t) =>
    t.includes('Ship verdict') || t.includes('play tonight') || t.includes('Soul check'));
  return { text: (heavy.at(-1) || texts.at(-1) || '').slice(0, 8000), total: texts.length };
});

fs.writeFileSync('/home/potter/HEAVY-SHIP-VERDICT.md', `# SuperGrok Heavy — Ship Verdict\n\n**Collected:** ${new Date().toISOString().slice(0, 10)}\n\n---\n\n${data.text}`);
console.log(data.text.slice(0, 2500));
await browser.disconnect();