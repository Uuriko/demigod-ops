import puppeteer from 'puppeteer-core';
import fs from 'fs';

const OW = fs.readFileSync('/home/potter/overworld.js', 'utf8');
const interactBlock = OW.match(/function checkInteract[\s\S]{0,900}/)?.[0] || '';
const vinylBlock = OW.match(/function vinylForInteract[\s\S]{0,700}/)?.[0] || '';
const npcBlock = OW.match(/function playerFacingNpc[\s\S]{0,900}/)?.[0] || '';
const examineBlock = OW.match(/function examineFacingSpot[\s\S]{0,500}/)?.[0] || '';
const hintBlock = OW.match(/function updateHint[\s\S]{0,1100}/)?.[0] || '';

const PROMPT = `Heavy — INTERACTION UX PASS for eat-the-sounds overworld.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

USER REQUEST: Make it simpler and smoother to interact with records, examine spots, and talk to people.

CURRENT PAIN POINTS:
• Single [Z] key — priority bird > NPC > vinyl > examine > secret
• Strict FACING required: must face exact tile (examine only matches facingTile === spot)
• Vinyl needs facing adjacent tile OR standing on interactX/Y
• NPC talk needs facing tile OR adjacent with correct direction
• interactHint only updates on keydown — NOT while walking near things
• Hint HUD hidden after first vinyl spin unless listening/NPC (vinylPreviewed gate)
• Examine spots sit ON shelf tiles (S) — player stands adjacent but must pixel-perfect face
• 600ms examine debounce shows toast only, no dialogue box

SNIPPETS:
${npcBlock}

${vinylBlock}

${examineBlock}

${interactBlock}

${hintBlock}

VINYL STANDS: moon (10,2)/(10,1) · shelter (25,3)/(25,2) · mirror (55,2)/(55,1)
MUTUALS: orph (5,7) · simon (32,4) · honey (47,8) pinned
12 EXAMINE_SPOTS for find quest (face tile · Z)

Deliver ONE reply (max 220 words + optional \`\`\`js patch):
1) 7–9 bullets: ranked interaction UX fixes (proximity model, auto-face, priority, HUD, vinyl adjacency, examine flow, hint persistence) — specific to our code
2) Keep vs change: what NOT to break (agent bridge, find quest, vinyl first-spin flow)
3) One sentence ship verdict

No prose after bullets.`;

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
await page.bringToFront();
const sent = await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return false;
  el.focus();
  if (el.tagName === 'TEXTAREA') {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
  return true;
}, PROMPT);
if (!sent) {
  const input = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 15000 });
  await input.click();
  await page.keyboard.type(PROMPT.slice(0, 800), { delay: 1 });
}
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-INTERACT-SENT.txt', new Date().toISOString());
console.log('interact prompt sent');
await browser.disconnect();