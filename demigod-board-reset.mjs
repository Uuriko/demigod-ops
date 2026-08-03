#!/usr/bin/env node
/** Reset featured board to curated seed cards; CDN publish is explicit opt-in. */
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { saveBoard } from './demigod-submissions-lib.mjs';

const at = new Date().toISOString();
const board = {
  at,
  roles: [
    { id: 'role-seed1', title: 'Product Manager', stageType: 'Pre-seed · B2B SaaS', skills: 'GTM, roadmap, user research', comp: '$160-200k + equity', status: 'Active', featuredAt: at },
    { id: 'role-seed2', title: 'Founding Designer', stageType: 'Seed · Consumer', skills: 'Figma, design systems, brand', comp: 'Comp on intro', status: 'Open', featuredAt: at },
    { id: 'role-seed3', title: 'Head of Growth', stageType: 'Series A · Fintech', skills: 'Paid social, PLG, analytics', comp: '$180-240k', status: 'Active', featuredAt: at },
  ],
  candidates: [
    { id: 'cand-seed1', summary: 'Product strategy, Figma, growth. 4 years at Series B startup.', tags: ['SF Bay Area', 'Product strategy', 'Figma'], featuredAt: at },
    { id: 'cand-seed2', summary: 'Full-stack engineer. Shipped React platforms at seed-stage startups.', tags: ['SF Bay Area', 'Engineer', 'React'], featuredAt: at },
  ],
  cdnUrl: null,
};

saveBoard(board, { reason: 'board-reset-seeds', actor: process.env.USER || 'reset' });
let publish = { skipped: true, reason: 'explicit_publish_required' };
if (process.env.DEMIGOD_FORCE_PUBLISH === '1') {
  const pub = spawnSync('node', ['demigod-board-publish.mjs'], { cwd: ROOT, encoding: 'utf8' });
  publish = {
    skipped: false,
    ok: pub.status === 0,
    out: pub.stdout?.trim() || pub.stderr,
  };
}
console.log(JSON.stringify({
  ok: publish.skipped || publish.ok,
  roles: board.roles.length,
  candidates: board.candidates.length,
  publish,
}));
