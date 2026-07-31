import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHUNK_SIZE = 85000;
const bundle = fs.readFileSync('/home/potter/GAME-CODE-COMPLETE-BUNDLE.txt', 'utf8');
const manifest = fs.readFileSync('/home/potter/GAME-CODE-MANIFEST.md', 'utf8');
const stats = JSON.parse(fs.readFileSync('/home/potter/GAME-CODE-BUNDLE-STATS.json', 'utf8'));

const chunks = [];
for (let i = 0; i < bundle.length; i += CHUNK_SIZE) {
  chunks.push(bundle.slice(i, i + CHUNK_SIZE));
}

const TASK = `Heavy — AUTHORITATIVE GAME DESIGN DOC FROM COMPLETE SOURCE CODE

You are writing the canonical GAME DESIGN DOCUMENT for "∴ EAT THE SOUNDS ∴" by reading EVERY line of the attached source bundle (${stats.totalLines} lines across ${stats.files} files). This is reverse-engineered design: code is truth.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

## Your deliverable (ONE final reply after all chunks)

Write GAME-DESIGN-DOC.md structure:

# ∴ EAT THE SOUNDS ∴ — Game Design Document

## 1. Vision & emotional thesis
## 2. Player fantasy & tone (@ninjawhee voice)
## 3. Core loop diagram (intro → store → rhythm → aftermath)
## 4. Act-by-act design (Intro, Store overworld, Counter/Sarah, Rhythm feast, Aftermath, Secrets)
## 5. Systems bible
   - Movement (DCSS aut/tile)
   - Dialogue forests & NPCs
   - Vinyl / audio / echoes
   - Rhythm charts & scoring tiers
   - Progression & album %
   - Inventory & journal
   - Easter eggs
   - Pixel art direction
## 6. Store map & interaction pads (tile truth from overworld.js)
## 7. Content catalog (vinyls, mutuals, examine spots, items, dialogue trees summary)
## 8. Audio design
## 9. UI/HUD
## 10. Failure states & endings (mirror keep/pass, tiers)
## 11. Technical architecture (module graph, data flow)
## 12. Design principles inferred from code
## 13. Known gaps / tech debt visible in code
## 14. Future design recommendations (soul-first, small scope)

Be exhaustive. Cite specific file:function and line behaviors. No code dumps — design prose. Max 4500 words.

---

CODE MANIFEST:
${manifest}

`;

async function sendText(page, text) {
  await page.bringToFront();
  const ok = await page.evaluate((t) => {
    const el = document.querySelector('textarea, [contenteditable="true"]');
    if (!el) return false;
    el.focus();
    if (el.tagName === 'TEXTAREA') {
      el.value = t;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.textContent = t;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    return true;
  }, text);
  if (!ok) throw new Error('textarea not found');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 3500));
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 300000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(1); }

console.log(`Sending design doc task + ${chunks.length} code chunks...`);
await sendText(page, TASK);
for (let i = 0; i < chunks.length; i++) {
  console.log(`chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
  await sendText(page, `SOURCE BUNDLE CHUNK ${i + 1}/${chunks.length}:\n\`\`\`\n${chunks[i]}\n\`\`\``);
}
await sendText(page, `All ${chunks.length} chunks sent. ${stats.totalLines} lines total. Now deliver the complete GAME DESIGN DOCUMENT per the structure above. Read every chunk — code is authoritative.`);

fs.writeFileSync('/home/potter/HEAVY-FULL-DESIGN-DOC-SENT.txt', `${new Date().toISOString()} chunks=${chunks.length} lines=${stats.totalLines}`);
console.log('done sending');
await browser.disconnect();