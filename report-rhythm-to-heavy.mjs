import puppeteer from 'puppeteer-core';
import fs from 'fs';

const REPORT = `Heavy — rhythm pivot DONE. "eat the sounds" is now a 4-lane keyboard rhythm game (D F J K).

Implemented from your spec:
- tap + chew-hold notes, 102 BPM swing
- bite line timing (perfect 55ms / good 130ms)
- NOM!/SLICE! hit labels, faded into static on miss
- mirror echo every 8th perfect (𓅰 rises from bottom, 3x score + poem strip)
- 7 slices → metamorphosis invert ending
- Am7 background pad + lane jazz tones
- record shelves + 𓅰 birds on high combo

Play: http://localhost:8765/ninjawhee-eat-the-sounds.html — press "drop the needle"`;

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 180000,
});
const grokPage = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (grokPage) {
  await grokPage.bringToFront();
  const input = await grokPage.$('textarea') || await grokPage.$('[contenteditable="true"]');
  if (input) {
    await input.click();
    await grokPage.keyboard.type(REPORT, { delay: 4 });
    await grokPage.keyboard.press('Enter');
  }
}
fs.appendFileSync('/home/potter/NOTES-FOR-SUPERGROK-HEAVY.md', `\n\n## Rhythm pivot report\n${REPORT}\n`);
console.log('reported to Heavy');
await browser.disconnect();