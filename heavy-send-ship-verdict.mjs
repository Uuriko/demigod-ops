import puppeteer from 'puppeteer-core';
import fs from 'fs';

const shipped = fs.existsSync('/home/potter/HEAVY-FIND-QUEST-PLAYTEST.md')
  ? fs.readFileSync('/home/potter/HEAVY-FIND-QUEST-PLAYTEST.md', 'utf8').slice(0, 2000)
  : 'playtest pending';

const PROMPT = `Heavy — FINAL SHIP VERDICT for ∴ EAT THE SOUNDS ∴

@ninjawhee jazz store browser game. Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

SHIPPED THIS SESSION:
- Mutual revisit_find_1/2/3 by findCounts
- Sarah return_finds_complete on 9/9 finds
- Bird onBirdGuide → echo orb
- Album % on end screen (albumPctEnd always visible + detail)
- Mirror choice album % consequence UI (mirrorAlbumPct + choice-aware brief)
- Gold vinyl pad markers (drawInteractPads stroke)
- Passerby chebyshev interact range
- Static tier softer aftermath lines (orph/simon/honey)

PLAYTEST:
${shipped}

Deliver:
## Ship verdict (play tonight? what gap remains?)
## Soul check (1 paragraph @ninjawhee tone)
## Top 3 cuts (defer list)
## One line each agent should do next (Grok / Cursor / Heavy)

Be blunt. Small scope only.`;

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
  if (!ok) throw new Error('no textarea');
  await page.keyboard.press('Enter');
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) throw new Error('no grok tab');
await sendText(page, PROMPT);
fs.writeFileSync('/home/potter/HEAVY-SHIP-VERDICT-SENT.txt', `${new Date().toISOString()}`);
console.log('sent ship verdict request');
await browser.disconnect();