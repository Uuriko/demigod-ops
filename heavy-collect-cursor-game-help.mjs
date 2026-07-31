import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));

const texts = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('[data-testid="message"], article, .markdown, .prose')];
  return nodes.map((n) => (n.innerText || '').trim()).filter(Boolean);
});

const isUser = (t) =>
  t.includes('TWO-PART HELP REQUEST') ||
  t.includes('SHORT ANSWER ONLY') ||
  t.includes('CANONICAL GAME DESIGN') ||
  t.length > 25000;

const scoreReply = (body) => {
  let s = 0;
  if (/PART\s*1/i.test(body)) s += 4;
  if (/PART\s*2/i.test(body)) s += 4;
  if (/AGENTS\.md|Cloud Agent|\.cursor\/rules/i.test(body)) s += 3;
  if (/overworld\.js|vinyl-echo|ninjawhee/i.test(body)) s += 2;
  if ((body.match(/^\d+\./gm) || []).length >= 6) s += 2;
  if (body.includes('Game Design Document') && body.includes('Vision & emotional')) s -= 5;
  return s;
};

const candidates = texts
  .map((t) => t.replace(/^Thought for \d+s\n/, ''))
  .filter((t) => !isUser(t) && t.length > 400 && t.length < 20000)
  .map((t) => ({ t, s: scoreReply(t) }))
  .filter((x) => x.s >= 4)
  .sort((a, b) => b.s - a.s || b.t.length - a.t.length);

const best = candidates[0]?.t || '';

if (best.length > 400) {
  fs.writeFileSync(
    '/home/potter/HEAVY-CURSOR-GAME-FEEDBACK.md',
    `# SuperGrok Heavy — Cursor + Game Help\n\n**Collected:** ${new Date().toISOString()}\n\n---\n\n${best}\n`
  );
  console.log('saved', best.length, 'score', candidates[0]?.s);
  console.log(best);
} else {
  const recent = texts.slice(-4).map((t) => ({ len: t.length, head: t.slice(0, 150) }));
  console.log('no match yet');
  console.log(JSON.stringify(recent, null, 2));
}

await browser.disconnect();