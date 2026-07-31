import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 90000;
console.log(`waiting ${WAIT_MS / 1000}s for Heavy multi-song reply...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab');
  process.exit(1);
}

const data = await page.evaluate(() => {
  const msgs = [...document.querySelectorAll('[data-testid="message"], article, .markdown, .prose, [class*="message"]')]
    .map((n) => n.innerText?.trim())
    .filter(Boolean);
  const body = document.body.innerText;
  const thinking = /thinking|Agents thinking/i.test(body);
  const codes = [...document.querySelectorAll('pre code, pre')]
    .map((e) => e.innerText?.trim())
    .filter((t) => t && t.length > 80);
  return {
    thinking,
    text: msgs.length ? msgs[msgs.length - 1] : body.slice(-12000),
    codes,
  };
});

if (data.thinking) {
  fs.writeFileSync('/home/potter/HEAVY-RHYTHM-MULTISONG-STILL-THINKING.txt', data.text.slice(-3000));
  console.log('still thinking');
} else {
  let out = `# SuperGrok Heavy — Rhythm Multi-Song\n\n${data.text}\n`;
  if (data.codes.length) {
    out += `\n\n## Code blocks\n\n\`\`\`javascript\n${data.codes.join('\n\n// ---\n\n')}\n\`\`\`\n`;
  }
  fs.writeFileSync('/home/potter/HEAVY-RHYTHM-MULTISONG-FEEDBACK.md', out);
  console.log('saved HEAVY-RHYTHM-MULTISONG-FEEDBACK.md', data.text.length, 'chars');
}

await browser.disconnect();