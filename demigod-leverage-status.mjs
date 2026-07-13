#!/usr/bin/env node
/** Snapshot Demigod state for leverage decisions + Heavy handoff. */
import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-LEVERAGE-STATUS.json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function footVersion() {
  const s = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  const m = s.match(/dg-foot-v(\d+)/);
  return m ? Number(m[1]) : null;
}

const verify = readJson(path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json'));
const human = readJson(path.join(ROOT, 'DEMIGOD-HUMAN-ACTIONS.json'));
const board = readJson(path.join(ROOT, 'DEMIGOD-BOARD.json'));

const snapshot = {
  at: new Date().toISOString(),
  stage: 'MVP live, 0 logged placements',
  footVersion: footVersion(),
  verifyPass: verify?.pass ?? null,
  formsOk: verify?.htmlScan?.formsOk ?? null,
  formE2e: human?.verify?.formE2e ?? null,
  blockers: human?.blocker ? [human.blocker] : [],
  siteReady: Boolean(verify?.pass && verify?.htmlScan?.formsOk),
  partnership: {
    decision: 'Option C hybrid — Portfolio Desk deferred until first proof loop',
    artifacts: ['HEAVY-PARTNERSHIP-HYBRID-C.md', 'DEMIGOD-PARTNERSHIP-IMPLEMENT-PROMPT.md'],
  },
  existingAutomation: {
    webhookLocal: 'npm run demigod:submissions:webhook (:9877)',
    webhookSetup: 'npm run demigod:webhook:setup',
    boardPublish: 'demigod-board-publish.mjs',
    verify: 'npm run demigod:verify:all',
  },
  boardRoles: board?.roles?.length ?? 0,
  boardCandidates: board?.candidates?.length ?? 0,
  opinion: {
    bottleneckGuess: 'startup briefs + founder warm outreach (not site features)',
    highestLeverage: 'one white-glove pilot + 2h form response SLA',
    deprioritize: ['public partners page', 'recruiter marketplace', 'designer cleanup', 'more Heavy research'],
  },
};

fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
console.log(JSON.stringify(snapshot, null, 2));