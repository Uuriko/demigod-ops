#!/usr/bin/env node
/** Ask SuperGrok Heavy: Demigod form fixes + what's next + questions for user. */
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const PROMPT = `SuperGrok Heavy — Demigod (trydemigod.com / Webflow talentlink-sf) form + site status. Local Grok agent just shipped dg-foot-v16-core.

## FORM FIXES SHIPPED (verified live + screenshots)
- Startup modal startup-hire: company, email, role, stack, optional salary. Removed hiring-model/team-size/urgency. Fee note: "10% hiring fee on hire. No subscription."
- Engineer modal engineer-join: name, email, linkedin, skills, shipped textarea, SF Bay checkbox, optional portfolio. Removed availability.
- Stripped ghost Oops/Hermes/pantheon divs from modals; hide w-form-done until real submit.
- Pricing: single "On hire" card; subscription/$5K hidden; CHOOSE COMMISSION → FIND TALENT.
- DEMIGOD-FORMS-AUDIT.json PASS 0 issues. Turnstile still blocks headless submit — needs human incognito test to hello@trydemigod.com.

## CONSTRAINTS
- Webflow Starter, split custom code (head-minimal CSS + footer JS). Footer component master locked (~39 dead # links hidden at runtime).
- No Tally hybrid for now. No Cursor/cloud agents unless asked. Manual Designer edits for form notification settings.

## ASK HEAVY (reply as strategic advisor + pretend you ARE the user answering Grok's questions):
A) Top 5 next work items ranked P0→P2 (forms, site, ops) — be specific and small-scope.
B) 6 questions Heavy would ask the founder before the next pass — then ANSWER each as the user would (pragmatic, ship-fast, SF AI recruiting, single 10% on-hire fee, humans-in-loop).
C) One thing to STOP doing (waste of time given current stack).
D) Single sentence: is the site shippable for first 10 startup briefs?

Format: numbered lists, max 400 words, no markdown tables.`;

const OUT = '/home/potter/HEAVY-DEMIGOD-FORMS-SENT.txt';
const REPLY = '/home/potter/HEAVY-DEMIGOD-FORMS-FEEDBACK.md';

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 120000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) throw new Error('no grok tab');

await page.bringToFront();
await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 20000 });

const before = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('[data-testid="message"], article, .message, [class*="message"]')];
  return nodes.map((n) => (n.innerText || '').trim()).filter((t) => t.length > 40).slice(-2).join('\n---\n');
});

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

if (!sent) throw new Error('could not fill grok input');
await page.keyboard.press('Enter');
fs.writeFileSync(OUT, `${new Date().toISOString()}\n${PROMPT.slice(0, 500)}...\n`);

// Poll for new assistant reply
let reply = '';
for (let i = 0; i < 36; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  reply = await page.evaluate((prev) => {
    const body = document.body?.innerText || '';
    const chunks = body.split('\n').filter((l) => l.trim().length > 0);
    const tail = chunks.slice(-80).join('\n');
    if (tail.length > prev.length + 120 && /P0|shippable|next work|questions/i.test(tail)) return tail;
    return prev;
  }, before);
  if (reply && reply.length > before.length + 200) break;
}

const full = await page.evaluate(() => document.body?.innerText || '');
fs.writeFileSync(REPLY, `# Heavy — Demigod forms + next work\n\n_at: ${new Date().toISOString()}_\n\n${full.slice(-12000)}\n`);
console.log(JSON.stringify({ sent: true, replyChars: full.length, out: REPLY }));
await browser.disconnect();