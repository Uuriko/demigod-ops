import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.newPage());
await page.goto('http://localhost:8765/ninjawhee-eat-the-sounds.html?v=collision1', { waitUntil: 'domcontentloaded' });

const result = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (typeof startOverworld === 'function') await startOverworld({ freshFinds: true });
  await sleep(800);
  const MAP_PROBE = [];
  const dirs = [[0,-1,'ArrowUp'],[0,1,'ArrowDown'],[-1,0,'ArrowLeft'],[1,0,'ArrowRight']];
  let wallWalks = 0, floorBlocks = 0, moves = 0;
  const start = JazzStoreOverworld.playerGridPos();
  for (let i = 0; i < 80; i++) {
    const before = JazzStoreOverworld.playerGridPos();
    const d = dirs[i % 4];
    JazzStoreOverworld.handleKey(d[2], { repeat: false });
    const after = JazzStoreOverworld.playerGridPos();
    moves++;
    if (before.x === after.x && before.y === after.y) floorBlocks++;
  }
  // probe row 4 east — was misaligned zone
  for (let x = 18; x <= 24; x++) {
    JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
  }
  const north = JazzStoreOverworld.playerGridPos();
  return { start, after80: JazzStoreOverworld.playerGridPos(), north, floorBlocks, moves };
});

console.log(JSON.stringify(result, null, 2));
await browser.disconnect();