#!/usr/bin/env node
/** Publish ghost-roles JSON (real briefs only) for embeds / outreach. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard } from './demigod-submissions-lib.mjs';
import { ghostRoles, computeSignal } from './demigod-board-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-GHOST-ROLES.json');

async function uploadJson(payload) {
  const tmp = path.join(ROOT, '.ghost-roles-upload.json');
  fs.writeFileSync(tmp, JSON.stringify(payload));
  const up = spawnSync('curl', ['-s', '-F', 'reqtype=fileupload', '-F', `fileToUpload=@${tmp}`, 'https://catbox.moe/user/api.php'], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  return (up.stdout || '').trim();
}

async function main() {
  const board = loadBoard();
  const payload = {
    at: new Date().toISOString(),
    signal: computeSignal(board),
    roles: ghostRoles(board),
    site: 'https://www.trydemigod.com',
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const url = await uploadJson(payload);
  const ok = /^https:\/\/files\.catbox\.moe\/.+/.test(url);
  console.log(JSON.stringify({ ok, url, roles: payload.roles.length, local: path.relative(ROOT, OUT) }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });