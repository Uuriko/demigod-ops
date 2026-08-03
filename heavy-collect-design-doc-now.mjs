import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));

const full = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('[data-testid="message"], article, .markdown, .prose')];
  const texts = nodes.map((n) => (n.innerText || '').trim()).filter(Boolean);
  const isHeavyDoc = (t) => {
    const body = t.replace(/^Thought for \d+s\n/, '');
    return (
      body.startsWith('∴ EAT THE SOUNDS') &&
      body.includes('1. Vision') &&
      body.includes('14. Future') &&
      !t.includes('Write the complete GAME DESIGN DOCUMENT for')
    );
  };
  const docs = texts.filter(isHeavyDoc);
  return docs.sort((a, b) => b.length - a.length)[0]?.replace(/^Thought for \d+s\n/, '') || '';
});

if (full.length > 3000) {
  const header = `# ∴ EAT THE SOUNDS ∴ — Game Design Document\n\n**Author:** SuperGrok Heavy (code-derived)  \n**Generated:** ${new Date().toISOString().slice(0, 10)}  \n**Source:** GAME-CODE-DESIGN-DIGEST.md (${JSON.parse(fs.readFileSync('/home/potter/GAME-CODE-BUNDLE-STATS.json','utf8')).totalLines} lines)\n\n---\n\n`;
  const body = full.startsWith('#') ? full : full.replace(/^∴ EAT THE SOUNDS[^]*?\n/, '');
  fs.writeFileSync('/home/potter/GAME-DESIGN-DOC-HEAVY.md', header + body);
  console.log('saved GAME-DESIGN-DOC-HEAVY.md', full.length);
  console.log('tail:', full.slice(-400));
} else {
  console.log('no Heavy doc found', full.length);
}

await browser.disconnect();