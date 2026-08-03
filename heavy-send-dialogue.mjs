import puppeteer from 'puppeteer-core';
import fs from 'fs';

const NINJAWHEE_POSTS = `
@sarah/ninjawhee X voice samples (from x.com/ninjawhee):
- "when i was working at a jazz records store, favorite thing to do was to listen to entire albums and eat the sounds as you would a pizza"
- "when its real... no words are needed...."
- "theres a mirror at the edge of the world.."
- "Why do people enter cathedrals? ... they seek metamorphosis ... surrendering the molt of the old and ushering in the new of the wings."
- "in the groove we become pizza · in the mirror we become wings" (game canon)
- "Every 'yes' is a contract, every 'no' is a declaration."
- "people are so amazing tbh Im super wowed by the amount of beauty and talent everywhere"
- "glad to have started posting more on the digital space.. the joy of non-performative authenticity is the most beautiful treasure"
- "it takes me at least 3-7 business days to process and realise when someone tries to rizz me up.. sometimes months..."
- "evening, some girls of the night outside a dingy bar with cigarettes, next to a bakery's windowsill featuring ornate wedding cakes. a cruel joke from the universe"
- "this weekend, was a facilitator for an artworkshop for children with rare diseases.. agency in choosing the colors they wanted, with a simple shape as structure"
- ego-secure sharing vs one-upping when insecure (reply to @orphcorp)
- bio: ∴𓅰 𓅬 𓅭 𓅮 𓅯
`.trim();

const GAME_DIALOGUE_SAMPLE = `
Current forests: intro, return (sarah counter), aftermath (tiered), orph, simon, honey, secrets.
Sarah intro open: "when I worked here my favorite thing was listening to whole albums" / "eating the sounds as you would a pizza"
Sarah meet has 7 choices (who are you, mirror, mutuals, vibe, X, records, screen store)
Return setup has 9 choices before rhythm — may be too many
Aftermath static (recent fix): "we still ate some sounds together. that counts."
Mutuals: orph (philosophy/ego), simon (maps/breadcrumbs), honey (enthusiasm/!!)
`.trim();

const PROMPT = `Heavy — eat-the-sounds DIALOGUE improvement session.

Play: http://localhost:8765/ninjawhee-eat-the-sounds.html
Read the dialogue forests in ninjawhee-eat-the-sounds.html (DIALOGUE_FORESTS).

TASK: Help us improve ALL in-game dialogue to sound more like @ninjawhee while following good Undertale-style game dialogue practices.

${NINJAWHEE_POSTS}

${GAME_DIALOGUE_SAMPLE}

Please ALSO browse/research @ninjawhee on X (x.com/ninjawhee) if you can — look for voice patterns, recurring motifs, punctuation habits, warmth vs melancholy balance.

Deliver ONE reply:

## Summary (4-6 sentences)
Does current dialogue capture @ninjawhee? What's the biggest gap?

## Game dialogue best practices (for THIS game)
5-7 bullet rules — pacing, choice design, line length, when to be tutorial vs poetic, how mutuals should differ from Sarah.

## Voice audit by character
Sarah · orph · simon · honey — for each: what works, what feels off-brand, 2 example lines written in authentic @ninjawhee voice.

## Forest-by-forest fixes (priority order)
intro · return · aftermath · mutuals — specific nodes to trim, merge, or rewrite. Name node IDs.

## Top 10 line rewrites (ready to paste)
Format: forest:nodeId → new lines array (exact strings, lowercase, her punctuation style)

## Top 5 new choice branches (small scope)
forest:nodeId + choice text + 2-3 line payoff — must teach gameplay OR deepen emotion, not filler.

## One dialogue sin we're committing
Be blunt — e.g. too tutorial-heavy, too meta, repeating pizza line, etc.

Do NOT rewrite the whole game. No new systems. Dialogue text + light node graph tweaks only.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }

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
if (sent) await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-DIALOGUE-SENT.txt', new Date().toISOString());
console.log('dialogue improvement prompt sent');
await browser.disconnect();