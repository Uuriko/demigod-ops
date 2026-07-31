import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const pages = await browser.pages();
let page = pages.find((p) => p.url().includes('8765') && p.url().includes('ninjawhee'));
if (!page) {
  page = await browser.newPage();
  await page.goto('http://localhost:8765/ninjawhee-eat-the-sounds.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
}
await page.reload({ waitUntil: 'domcontentloaded' });

const result = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const startBtn = [...document.querySelectorAll('button')].find((b) => /start|play|enter/i.test(b.textContent || ''));
  if (startBtn) startBtn.click();
  await sleep(800);
  if (typeof startOverworld === 'function') {
    await startOverworld({ freshFinds: true });
  } else if (typeof startGame === 'function') {
    await startGame();
  }
  await sleep(1200);
  if (!document.body.classList.contains('overworld-active')) {
    return { ok: false, err: 'overworld not active' };
  }
  const before = JazzStoreOverworld.playerGridPos();
  const hk = (code, repeat = false) => JazzStoreOverworld.handleKey(code, { repeat });
  const r1 = hk('ArrowRight');
  const after1 = JazzStoreOverworld.playerGridPos();
  const r2 = hk('ArrowRight');
  const after2 = JazzStoreOverworld.playerGridPos();
  const rRepeat = hk('ArrowDown', true);
  const afterRepeat = JazzStoreOverworld.playerGridPos();
  hk('Period');
  const tileRight = JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
  const afterBump = JazzStoreOverworld.playerGridPos();
  return {
    ok: true,
    before,
    after1,
    after2,
    afterRepeat,
    afterBump,
    r1, r2, rRepeat,
    movedOnce: after1.x === before.x + 1,
    movedTwice: after2.x === before.x + 2,
    repeatBlocked: afterRepeat.y === after2.y,
    paused: JazzStoreOverworld.isPaused?.(),
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.disconnect();