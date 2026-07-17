#!/usr/bin/env node
/** Log real intros/placements → proof ledger + tweet template. No fake entries without --force. */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard, saveBoard, BOARD_PATH } from './demigod-submissions-lib.mjs';

const PROOF_LOG = path.join(ROOT, 'DEMIGOD-PROOF-LOG.json');
const EMBED = path.join(ROOT, 'DEMIGOD-PROOF-EMBED.json');
const ASSETS = path.join(ROOT, 'demigod-outreach', 'proof-assets');

function parseArgs(argv) {
  const out = { intro: '', detail: '', type: 'strong_intro', force: false, publish: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--intro' && argv[i + 1]) { out.intro = argv[++i]; continue; }
    if (a === '--detail' && argv[i + 1]) { out.detail = argv[++i]; continue; }
    if (a === '--type' && argv[i + 1]) { out.type = argv[++i]; continue; }
    if (a === '--proof' && argv[i + 1]) { out.proof = path.resolve(argv[++i]); continue; }
    if (a === '--force') out.force = true;
    if (a === '--publish') out.publish = true;
  }
  return out;
}

function loadLog() {
  try {
    return JSON.parse(fs.readFileSync(PROOF_LOG, 'utf8'));
  } catch {
    // Preserve a corrupt-but-present proof ledger before the next save overwrites it with this empty
    // default -- otherwise a single corrupt read silently wipes EVERY logged proof. Proofs are a
    // current-phase deliverable, each one a real delivery/testimonial; total silent loss is
    // unacceptable. Missing file (ENOENT) is a normal fresh start; a parse error on existing bytes is
    // not. Same guard as loadInbox (665d0da). (Lower-priority follow-ups noted for this file: the plain
    // writeFileSync at the save site, and the ~100/6 entry caps -- one-shot CLI, so low urgency.)
    try {
      if (fs.existsSync(PROOF_LOG)) fs.copyFileSync(PROOF_LOG, `${PROOF_LOG}.corrupt.${Date.now()}`);
    } catch {
      /* best-effort preservation; never block the fresh start */
    }
    return { entries: [] };
  }
}

function tweetTemplate(entry) {
  const lines = [
    `SF startup hiring update — ${entry.intro}`,
    entry.detail ? entry.detail : 'Human-matched intro, no marketplace spam.',
    '',
    'Human-matched SF startup talent → trydemigod.com',
    '10% on hire only · hello@trydemigod.com',
  ];
  return lines.join('\n');
}

function toMatchRow(entry) {
  return [entry.intro, entry.detail || (entry.type === 'placement' ? 'Placed' : 'Strong intro')];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.intro?.trim()) {
    console.error(JSON.stringify({
      ok: false,
      usage: 'npm run demigod:log:proof -- --intro "Backend eng → Seed AI co" --detail "2 interviews booked in 47min" [--proof screenshot.png] [--publish]',
    }));
    process.exit(1);
  }

  if (!args.force && /dummy|fake|test|shadow|placeholder/i.test(`${args.intro} ${args.detail}`)) {
    console.error(JSON.stringify({
      ok: false,
      error: 'Refusing fake-looking entry. Log real intros only, or pass --force if intentional.',
    }));
    process.exit(1);
  }

  const id = `proof-${crypto.randomBytes(4).toString('hex')}`;
  const entry = {
    id,
    at: new Date().toISOString(),
    type: args.type,
    intro: args.intro.trim(),
    detail: (args.detail || '').trim(),
    proofFile: null,
  };

  fs.mkdirSync(ASSETS, { recursive: true });
  if (args.proof && fs.existsSync(args.proof)) {
    const ext = path.extname(args.proof) || '.png';
    const dest = path.join(ASSETS, `${id}${ext}`);
    fs.copyFileSync(args.proof, dest);
    entry.proofFile = path.relative(ROOT, dest);
  }

  const log = loadLog();
  log.entries = (log.entries || []).slice(-99);
  log.entries.push(entry);
  fs.writeFileSync(PROOF_LOG, JSON.stringify(log, null, 2));

  const embed = {
    at: entry.at,
    matchRows: log.entries.slice(-3).map(toMatchRow),
    count: log.entries.length,
  };
  fs.writeFileSync(EMBED, JSON.stringify(embed, null, 2));

  const tweet = tweetTemplate(entry);
  const tweetPath = path.join(ASSETS, `${id}-tweet.txt`);
  fs.writeFileSync(tweetPath, tweet);

  let boardNote = null;
  if (args.publish) {
    const board = loadBoard();
    board.proofs = board.proofs || [];
    board.proofs.unshift({ id, intro: entry.intro, detail: entry.detail, at: entry.at });
    board.proofs = board.proofs.slice(0, 6);
    saveBoard(board, { reason: 'proof-logger', actor: process.env.USER || 'proof-logger' });
    const pub = spawnSync('node', ['demigod-board-publish.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 90_000 });
    boardNote = pub.status === 0 ? 'board_published' : `board_publish_failed:${pub.status}`;
  }

  console.log(JSON.stringify({
    ok: true,
    id,
    entry,
    proofLog: path.relative(ROOT, PROOF_LOG),
    embed: path.relative(ROOT, EMBED),
    tweetFile: path.relative(ROOT, tweetPath),
    tweetPreview: tweet.split('\n').slice(0, 3).join(' · '),
    boardNote,
    next: 'Copy tweet from proof-assets/*-tweet.txt when ready to post',
  }, null, 2));
}

main();