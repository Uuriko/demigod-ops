#!/usr/bin/env node
/** Resize Chrome window + Webflow Designer viewport to exit "browser too small" mode. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, prepareWebflowDesigner, captureDemigodScreenshots, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-DESIGNER-RESIZE.json');

async function main() {
  wlog('=== DESIGNER RESIZE START ===');
  const browser = await connectBrowser();
  const { page, resize } = await prepareWebflowDesigner(browser);
  const shots = await captureDemigodScreenshots('designer-resize');
  await browser.disconnect();

  const out = {
    at: new Date().toISOString(),
    resize,
    screenshot: shots?.webflow || null,
    pass: !!resize.ok,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: out.pass, resize, out: OUT }));
  wlog('=== DESIGNER RESIZE END ===');
  process.exit(out.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });