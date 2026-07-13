#!/usr/bin/env node
/** Demigod project status for agents + SuperGrok Heavy. */
import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT_JSON = path.join(ROOT, 'DEMIGOD-STATUS-REPORT.json');

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')); } catch (_) { return fallback; }
}

function footVersion() {
  try {
    const m = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8').match(/dg-foot-v(\d+)-core/);
    return m ? `v${m[1]}` : null;
  } catch (_) { return null; }
}

export function buildStatusReport() {
  const laptop = readJson('DEMIGOD-LAPTOP-AUDIT.json');
  const verifyLive = readJson('DEMIGOD-VERIFY-LIVE.json');
  const verifySource = readJson('DEMIGOD-VERIFY-SOURCE.json');
  const playtest = readJson('DEMIGOD-PLAYTEST-REVIEW.json');

  const report = {
    at: new Date().toISOString(),
    project: 'demigod',
    live: {
      url: 'https://www.trydemigod.com',
      designer: 'https://talentlink-sf.design.webflow.com/',
      verifyLivePass: verifyLive?.pass ?? null,
      formsOk: verifyLive?.htmlScan?.formsOk ?? null,
      mcpScriptsGone: verifyLive?.htmlScan?.mcpScriptsGone ?? null,
      playtestPass: playtest?.pass ?? null,
    },
    source: {
      verifySourcePass: verifySource?.pass ?? null,
      footCore: footVersion(),
      failed: verifySource?.failed ?? [],
    },
    laptop: laptop ? {
      score: laptop.score,
      issues: laptop.issues,
      chromeTabs: laptop.chrome?.count,
      cdp: laptop.services?.cdp,
    } : null,
    commands: {
      session: ['~/agent-dev.sh up', 'npm run demigod:workspace'],
      verify: ['npm run demigod:verify:all', 'npm run demigod:capture:audit'],
      orca: ['~/orca-demigod.sh full', '~/orca-demigod.sh spawn-trio "task"'],
    },
    nextHuman: [
      'Publish Webflow after foot-core / head changes',
      'Incognito form smoke test → hello@trydemigod.com',
    ],
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1]?.endsWith('demigod-status-report.mjs')) {
  const report = buildStatusReport();
  console.log(JSON.stringify({
    ok: true,
    path: OUT_JSON,
    verifyLive: report.live.verifyLivePass,
    verifySource: report.source.verifySourcePass,
    footCore: report.source.footCore,
  }));
}