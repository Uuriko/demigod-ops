#!/usr/bin/env node
/**
 * Publish DEMIGOD-BOARD.json to catbox CDN.
 *
 * NOTE (2026-07-17): nothing consumes this today. v205 dropped the fetchBoard() call from foot-core's
 * run(), so the site stopped rendering the ledger; the dead board code (fetchBoard/renderBoard/
 * BOARD_CDN/…) has since been deleted outright. Its outputs — DEMIGOD-BOARD-PUBLIC.json and
 * DEMIGOD-BOARD-CDN.json — are written here and read by no one. Kept because it still works and is
 * the path back if a public ledger is ever re-wired; DEMIGOD-BOARD.json itself remains the real SoR
 * for roles/receipts/pilots and is still guarded by demigod-verify-board-honesty.mjs.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import { ROOT } from './demigod-turn-lib.mjs';
import { BOARD_PATH, loadBoard, saveBoard, isRealReceipt } from './demigod-submissions-lib.mjs';
import { defaultBoardExtras } from './demigod-board-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

assertNotFrozen('board-publish');

const OUT = path.join(ROOT, 'DEMIGOD-BOARD-CDN.json');
const SRC = path.join(ROOT, 'demigod-board.json');

function seedIfEmpty(board) {
  if ((board.roles || []).length && (board.candidates || []).length) return board;
  board.roles = board.roles?.length ? board.roles : [
    { id: 'role-seed1', title: 'Product Manager', stageType: 'Pre-seed · B2B SaaS', skills: 'GTM, roadmap, user research', comp: '$160-200k + equity', status: 'Active', featuredAt: board.at, outcome: 'Sample pipeline row — warming up.', sample: true },
    { id: 'role-seed2', title: 'Founding Designer', stageType: 'Seed · Consumer', skills: 'Figma, design systems, brand', comp: 'Comp on intro', status: 'Open', featuredAt: board.at, outcome: 'Sample pipeline row — warming up.', sample: true },
    { id: 'role-seed3', title: 'Head of Growth', stageType: 'Series A · Fintech', skills: 'Paid social, PLG, analytics', comp: '$180-240k', status: 'Active', featuredAt: board.at, outcome: 'Sample pipeline row — warming up.', sample: true },
  ];
  board.candidates = board.candidates?.length ? board.candidates : [
    { id: 'cand-seed1', summary: 'Product strategy, Figma, growth. 4 years at Series B startup.', tags: ['SF Bay Area', 'Product strategy', 'Figma'], featuredAt: board.at },
    { id: 'cand-seed2', summary: 'Full-stack engineer. Shipped React platforms at seed-stage startups.', tags: ['SF Bay Area', 'Engineer', 'React'], featuredAt: board.at },
  ];
  saveBoard(board, { reason: 'board-publish-seedIfEmpty', actor: 'board-publish' });
  return board;
}

// Derive the public board from the local one: redact private pilots (PII) and FORCE HONEST for the
// pre-services / no-real-receipts phase. Zeroing the signal isn't enough — strip the real OBJECTS too,
// or a real role (sample:false) / receipt (delivered) on the local board would ride into the public
// artifact while signal claims 0 (a self-contradicting board; the direct receipt-mint->board-publish
// path skips the board-honesty gate). Keep only sample objects. Exported for the poison-test.
export function scrubPublicBoard(board) {
  const publicBoard = JSON.parse(JSON.stringify(board));
  delete publicBoard.pilots;
  publicBoard.signal = { realRoles: 0, realReceipts: 0 };
  if (publicBoard.roles) publicBoard.roles = publicBoard.roles.filter((r) => r && r.sample !== false).slice(0, 2);
  if (publicBoard.receipts) publicBoard.receipts = publicBoard.receipts.filter((r) => !isRealReceipt(r));
  return publicBoard;
}

async function main() {
  let board = loadBoard();
  board = seedIfEmpty(board);
  board = defaultBoardExtras(board);

  // Pull real featured ... (disabled for honest 2-role phase per Fable)
  try { throw new Error("skipped inbox for cap"); } catch(e) {
    console.warn('no inbox sync', e.message);
  }

  // Always keep full local board (with private pilots)
  fs.writeFileSync(SRC, JSON.stringify(board, null, 2));

  // Redact private pilots + force-honest the public artifact (see scrubPublicBoard).
  const publicBoard = scrubPublicBoard(board);
  const pubPath = path.join(ROOT, 'DEMIGOD-BOARD-PUBLIC.json');
  fs.writeFileSync(pubPath, JSON.stringify(publicBoard));

  const up = spawnSync('curl', ['-s', '-F', 'reqtype=fileupload', '-F', `fileToUpload=@${pubPath}`, 'https://catbox.moe/user/api.php'], { encoding: 'utf8' });
  const url = (up.stdout || '').trim();
  if (!/^https:\/\/files\.catbox\.moe\/.+/.test(url)) {
    console.error('upload failed', up.stdout, up.stderr);
    process.exit(1);
  }

  const live = await (await fetch(`${url}?v=${Date.now()}`)).json();
  const ok = Array.isArray(live.roles) && Array.isArray(live.candidates);

  board.cdnUrl = url;
  saveBoard(board, { reason: 'board-publish-cdn', actor: 'board-publish' });

  // No foot-core write here. This used to rewrite BOARD_CDN in demigod-foot-core.js (and copy it
  // into the archived eat-the-sounds/), unlocked and non-atomically — the concurrent-writer clobber
  // that caused the false-v149 saga. It was also pointless: nothing calls fetchBoard() since v205
  // (see run()), so BOARD stays null and BOARD_CDN is read by no one. board.cdnUrl above is the SoR.

  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), cdnUrl: url, ok, roles: live.roles?.length, candidates: live.candidates?.length, realFeatured: (board.roles || []).filter(r => !r.pilot).length }, null, 2));
  console.log(JSON.stringify({ ok, cdnUrl: url, roles: live.roles?.length, candidates: live.candidates?.length, realFeatured: (board.roles || []).filter(r => !r.pilot).length }));
}

function inferStage(raw = {}) {
  const text = [raw['company-stage'], raw.companyStage, raw['stack-needs'], raw.stackNeeds].filter(Boolean).join(' ');
  const m = text.match(/\b(pre-?seed|seed|series\s*[a-d]|yc|stealth)\b/i);
  const stage = m ? m[0].replace(/\s+/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Seed';
  return `${stage} · AI`;
}

// Run only when invoked as a CLI (`node demigod-board-publish.mjs`), never on import — importing this
// module used to fire main() and do a real CDN upload (hit accidentally twice: autopilot c439, c447).
// All real callers spawn it as a subprocess; nothing imports it. Guarding also makes the public-scrub
// unit-testable via import without side effects. (backlog #36)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}