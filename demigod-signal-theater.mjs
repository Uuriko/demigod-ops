#!/usr/bin/env node
/** Export board JSON → shareable HTML card + PNG + DM snippets for founders. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard } from './demigod-submissions-lib.mjs';
import {
  computeSignal,
  ledgerRoles,
  latestReceipt,
  ledgerRoleNote,
  isSeedRole,
} from './demigod-board-lib.mjs';

const OUT_DIR = path.join(ROOT, 'demigod-outreach', 'signal-theater');
const MANIFEST = path.join(ROOT, 'SIGNAL-THEATER.json');

function parseArgs(argv) {
  const out = { limit: 4, png: false, open: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--png') out.png = true;
    else if (a === '--open') out.open = true;
    else if (a.startsWith('--limit=')) out.limit = Number(a.slice(8)) || 4;
  }
  return out;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ledgerRowHtml(r) {
  const seed = isSeedRole(r);
  const note = ledgerRoleNote(r);
  return `<div class="ledger-row${seed ? ' seed' : ''}">
    <div class="ledger-top"><strong>${esc(r.title || 'Open role')}</strong>${seed ? '<span class="badge">Sample</span>' : ''}</div>
    ${r.stageType ? `<em class="ledger-meta">${esc(r.stageType)}</em>` : ''}
    <p class="ledger-outcome">${esc(note)}</p>
  </div>`;
}

function cardHtml(board, limit) {
  const signal = computeSignal(board);
  const roles = ledgerRoles(board, limit);
  const receipt = latestReceipt(board);
  const rows = roles.map(ledgerRowHtml).join('');
  const velocity = board.velocity ? `<p class="velocity">${esc(board.velocity)}</p>` : '';
  const receiptBlock = receipt
    ? `<p class="receipt">Intro Receipt #${String(receipt.number || '').padStart(3, '0')} · ${receipt.intros} intro${receipt.intros === 1 ? '' : 's'} · <a href="https://www.trydemigod.com/#receipt/${esc(receipt.hash)}">view</a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Demigod · SF Human Signal</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;background:#060606;font-family:Manrope,system-ui,sans-serif;color:#f5f0e6;padding:28px}
    .card{max-width:440px;margin:0 auto;border:1px solid rgba(201,168,76,.35);border-radius:16px;padding:22px 24px;background:#0e0e12;box-shadow:0 12px 40px rgba(0,0,0,.45)}
    .kicker{color:#a8a29e;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px}
    h1{font-family:Georgia,'Times New Roman',serif;color:#c9a84c;font-size:1.15rem;margin:0 0 10px;font-weight:600}
    .signal{margin:0 0 14px;padding:10px 12px;border:1px solid rgba(201,168,76,.28);border-radius:10px;background:rgba(14,14,18,.92);color:#e8d5a3;font-size:.84rem;text-align:center}
    .velocity{margin:0 0 12px;color:#8a8478;font-size:.72rem;text-align:center;letter-spacing:.04em}
    .ledger-title{color:#e8d5a3;font-size:.78rem;margin:0 0 8px;font-weight:600}
    .ledger{display:flex;flex-direction:column;gap:8px;margin:0 0 14px}
    .ledger-row{border:1px solid rgba(201,168,76,.22);border-radius:10px;padding:10px 12px;background:rgba(14,14,18,.92)}
    .ledger-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
    .ledger-top strong{color:#e8d5a3;font-size:.82rem}
    .badge{color:#8a8478;font-size:.58rem;letter-spacing:.08em;text-transform:uppercase;border:1px solid rgba(168,162,158,.35);border-radius:99px;padding:2px 7px;flex-shrink:0}
    .ledger-meta{display:block;color:#a8a29e;font-size:.74rem;font-style:normal;margin:0 0 4px}
    .ledger-outcome{color:#8a8478;font-size:.76rem;line-height:1.4;margin:0}
    .ledger-row.seed{opacity:.9}
    .receipt{margin:0 0 10px;color:#a8a29e;font-size:.76rem;text-align:center}
    .receipt a{color:#c9a84c;text-decoration:none}
    .foot{margin:0;color:#8a8478;font-size:.7rem;text-align:center;line-height:1.45}
  </style>
</head>
<body>
  <div class="card" id="signal-card">
    <p class="kicker">Placement ledger</p>
    <h1>Demigod · SF Human Signal</h1>
    <p class="signal">Live brief signal · —/100 · ${signal.realRoles > 0 ? `${signal.realRoles} real SF role${signal.realRoles === 1 ? '' : 's'} · ${signal.realReceipts} intro${signal.realReceipts === 1 ? '' : 's'} delivered` : 'Early catalog — humans reviewing first pilots'} · ${esc(signal.weekLabel)}</p>
    ${velocity}
    <p class="ledger-title">Recent intros. No embellishment.</p>
    <div class="ledger">${rows || '<p class="ledger-outcome">Open briefs — humans only.</p>'}</div>
    ${receiptBlock}
    <p class="foot">trydemigod.com · 10% on hire · no AI blast</p>
  </div>
</body>
</html>`;
}

function dmSnippets(board, limit) {
  const signal = computeSignal(board);
  const receipt = latestReceipt(board);
  const pilots = ledgerRoles(board, 6).filter((r) => r.pilot && !isSeedRole(r));
  const pilotLine = pilots.length
    ? ` Latest: ${pilots[0].title} — ${ledgerRoleNote(pilots[0])}`
    : '';
  const receiptLine = receipt && !/sample|demo/i.test(receipt.note || '') && !/^demo/i.test(receipt.hash || '')
    ? ` Receipt: trydemigod.com/#receipt/${receipt.hash}`
    : '';

  const variants = [
    `SF founders: human-matched hiring desk (not AI spam). ${signal.realRoles > 0 ? `${signal.realRoles} real SF role${signal.realRoles === 1 ? '' : 's'} · ${signal.realReceipts} intro${signal.realReceipts === 1 ? '' : 's'} delivered` : 'Early honest catalog — first pilots in human review'} · ${signal.slotsTaken} brief slot${signal.slotsTaken === 1 ? '' : 's'} this week.${pilotLine} Submit a role → trydemigod.com`,
    `Anti-slop filter for Bay Area startups. ${signal.realRoles > 0 ? `${signal.realRoles} real SF role${signal.realRoles === 1 ? '' : 's'} · ${signal.realReceipts} intro${signal.realReceipts === 1 ? '' : 's'} delivered` : 'Early honest catalog — first pilots in human review'} · ${signal.slotsTaken} open brief slot${signal.slotsTaken === 1 ? '' : 's'} · humans intro on fit only · 10% on hire.${receiptLine}`,
    `Demigod placement ledger is live — anonymized roles + real outcomes, no embellishment.${pilotLine} hello@trydemigod.com · trydemigod.com`,
  ];
  return variants.slice(0, Math.max(1, limit));
}

async function capturePng(htmlPath, pngPath) {
  const job = async () => {
    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.default.connect({
      browserURL: 'http://127.0.0.1:9223',
      protocolTimeout: 15_000,
    });
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 520, height: 720, deviceScaleFactor: 2 });
      await page.goto(`file://${htmlPath}`, { waitUntil: 'domcontentloaded', timeout: 12_000 });
      await page.waitForSelector('#signal-card', { timeout: 5000 });
      const card = await page.$('#signal-card');
      if (card) await card.screenshot({ path: pngPath });
      else await page.screenshot({ path: pngPath, fullPage: true });
      return true;
    } finally {
      await page.close().catch(() => {});
    }
  };
  try {
    return await Promise.race([
      job(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('png_timeout')), 18_000)),
    ]);
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const board = loadBoard();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = path.join(OUT_DIR, `signal-card-${stamp}.html`);
  const pngPath = path.join(OUT_DIR, `signal-card-${stamp}.png`);
  const dmPath = path.join(OUT_DIR, `dm-snippets-${stamp}.txt`);
  const latestHtml = path.join(OUT_DIR, 'signal-card-latest.html');
  const latestDm = path.join(OUT_DIR, 'dm-snippets-latest.txt');
  const latestPng = path.join(OUT_DIR, 'signal-card-latest.png');

  const html = cardHtml(board, args.limit);
  fs.writeFileSync(htmlPath, html);
  fs.writeFileSync(latestHtml, html);
  fs.writeFileSync(dmPath, dmSnippets(board, 6).join('\n\n---\n\n'));
  fs.writeFileSync(latestDm, fs.readFileSync(dmPath, 'utf8'));

  let png = null;
  if (args.png) {
    const shot = await capturePng(htmlPath, pngPath);
    if (shot === true) {
      fs.copyFileSync(pngPath, latestPng);
      png = path.relative(ROOT, pngPath);
    } else {
      png = shot;
    }
  }

  const manifest = {
    at: new Date().toISOString(),
    ok: true,
    signal: computeSignal(board),
    receiptUrl: latestReceipt(board)
      ? `https://www.trydemigod.com/#receipt/${latestReceipt(board).hash}`
      : null,
    html: path.relative(ROOT, htmlPath),
    htmlLatest: path.relative(ROOT, latestHtml),
    dm: path.relative(ROOT, dmPath),
    dmLatest: path.relative(ROOT, latestDm),
    png,
    pngLatest: png ? path.relative(ROOT, latestPng) : null,
    next: png
      ? 'Share PNG in DMs/posts · paste snippets from dm-snippets-latest.txt'
      : 'Open signal-card-latest.html → screenshot · or re-run with --png if CDP is up',
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  if (args.open) {
    spawnSync('xdg-open', [latestHtml], { stdio: 'ignore' });
  }

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});