#!/usr/bin/env node
/**
 * Demigod project status for one data root.
 * Local audit files stay in that root. This command does not fetch the live site or publish.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-STATUS-REPORT.json');
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataRoot(), file), 'utf8'));
  } catch {
    return fallback;
  }
}

function footVersion() {
  try {
    const m = fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8').match(/dg-foot-v(\d+)-core/);
    return m ? `v${m[1]}` : null;
  } catch {
    return null;
  }
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
    sent: false,
    liveMail: false,
    livePublish: false,
  };

  fs.writeFileSync(reportPath(), JSON.stringify(report, null, 2) + '\n');
  return report;
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

if (process.argv[1]?.endsWith('demigod-status-report.mjs')) {
  if (process.argv.includes('--publish')) fail('publish_refused');
  const report = buildStatusReport();
  console.log(JSON.stringify({
    ok: true,
    path: reportPath(),
    verifyLive: report.live.verifyLivePass,
    verifySource: report.source.verifySourcePass,
    footCore: report.source.footCore,
    failed: report.source.failed,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
}
