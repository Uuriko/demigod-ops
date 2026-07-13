#!/usr/bin/env node
/** Publish DEMIGOD-BOARD.json to catbox CDN for foot-core fetch. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { BOARD_PATH, loadBoard, saveBoard } from './demigod-submissions-lib.mjs';
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

  // Redact private pilots before public CDN upload (PII leak fix)
  const publicBoard = JSON.parse(JSON.stringify(board));
  delete publicBoard.pilots;
  const pubPath = path.join(ROOT, 'DEMIGOD-BOARD-PUBLIC.json');

// FORCE HONEST for pre-services / no real receipts phase (per DEMIGOD rules)
publicBoard.signal = {realRoles: 0, realReceipts: 0};
if (publicBoard.roles) publicBoard.roles = publicBoard.roles.slice(0,2);

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

  const footPath = path.join(ROOT, 'demigod-foot-core.js');
  let foot = fs.readFileSync(footPath, 'utf8');
  foot = foot.replace(/var BOARD_CDN='[^']*';/, `var BOARD_CDN='${url}';`);
  fs.writeFileSync(footPath, foot);
  fs.copyFileSync(footPath, path.join(ROOT, 'eat-the-sounds', 'demigod-foot-core.js'));

  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), cdnUrl: url, ok, roles: live.roles?.length, candidates: live.candidates?.length, realFeatured: (board.roles || []).filter(r => !r.pilot).length }, null, 2));
  console.log(JSON.stringify({ ok, cdnUrl: url, roles: live.roles?.length, candidates: live.candidates?.length, realFeatured: (board.roles || []).filter(r => !r.pilot).length }));
}

function inferStage(raw = {}) {
  const text = [raw['company-stage'], raw.companyStage, raw['stack-needs'], raw.stackNeeds].filter(Boolean).join(' ');
  const m = text.match(/\b(pre-?seed|seed|series\s*[a-d]|yc|stealth)\b/i);
  const stage = m ? m[0].replace(/\s+/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Seed';
  return `${stage} · AI`;
}

main().catch((e) => { console.error(e); process.exit(1); });