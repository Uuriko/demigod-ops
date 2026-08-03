#!/usr/bin/env node
/** Reset featured board to curated seed cards; CDN publish is explicit opt-in. */
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { saveBoard } from './demigod-submissions-lib.mjs';

const at = new Date().toISOString();
// sample:true is required by demigod-verify-board-honesty (non-sample count must equal signal.realRoles).
// id role-seed* alone is not enough for that gate (only for isSeedRole / computeSignal).
const board = {
  at,
  roles: [
    { id: 'role-seed1', sample: true, title: 'Product Manager', stageType: 'Pre-seed · B2B SaaS', skills: 'GTM, roadmap, user research', comp: '$160-200k + equity', status: 'Active', featuredAt: at },
    { id: 'role-seed2', sample: true, title: 'Founding Designer', stageType: 'Seed · Consumer', skills: 'Figma, design systems, brand', comp: 'Comp on intro', status: 'Open', featuredAt: at },
    { id: 'role-seed3', sample: true, title: 'Head of Growth', stageType: 'Series A · Fintech', skills: 'Paid social, PLG, analytics', comp: '$180-240k', status: 'Active', featuredAt: at },
  ],
  candidates: [
    { id: 'cand-seed1', sample: true, summary: 'Product strategy, Figma, growth. 4 years at Series B startup.', tags: ['SF Bay Area', 'Product strategy', 'Figma'], featuredAt: at },
    { id: 'cand-seed2', sample: true, summary: 'Full-stack engineer. Shipped React platforms at seed-stage startups.', tags: ['SF Bay Area', 'Engineer', 'React'], featuredAt: at },
  ],
  signal: { score: null, realRoles: 0, realReceipts: 0, slotsTaken: 1, slotsMax: 12, weekLabel: null },
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
