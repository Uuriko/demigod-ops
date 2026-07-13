#!/usr/bin/env node
/** Full website audit → local scans → SuperGrok Heavy (code + design + verdict). */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import {
  ROOT,
  wlog,
  runHeavyCodeHelp,
  runHeavyDesignAudit,
  captureDemigodScreenshots,
} from './demigod-turn-lib.mjs';
import { fetchLiveHtml, scanLiveHtml, evaluateFooterCoreCopy } from './demigod-live-lib.mjs';

const OUT_DIR = ROOT;
const HEAVY_OUT = path.join(ROOT, 'HEAVY-WEBSITE-AUDIT-2026.md');
const HEAVY_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-WEBSITE-AUDIT.json');

function run(cmd, args = []) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
  return { cmd: [cmd, ...args].join(' '), status: r.status, stdout: (r.stdout || '').slice(-4000), stderr: (r.stderr || '').slice(-800) };
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return null; }
}

function readTail(p, n = 8000) {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf8').slice(-n); } catch { return ''; }
}

function latestShot(globDir, prefix) {
  const dir = path.join(ROOT, globDir);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(prefix)).sort();
  return files.length ? path.join(dir, files[files.length - 1]) : null;
}

async function collectHeavy(page, markers, minLen = 4000) {
  let text = '';
  for (let i = 0; i < 30; i++) {
    const reply = await collectGrokReply(page, { waitMs: 60000, minGrowth: 100 });
    text = reply.text || text;
    const tail = text.slice(-28000);
    const busy = reply.thinking || /thinking|Finalizing/i.test(tail);
    const ready = markers.every((m) => m.test(text));
    if (text && !busy && ready && tail.length >= minLen) break;
    wlog(`heavy audit poll ${i + 1}: len=${tail.length} busy=${busy}`);
  }
  return text;
}

async function main() {
  wlog('=== FULL WEBSITE AUDIT PASS START ===');
  const report = { at: new Date().toISOString(), local: {}, heavy: {} };

  report.local.fullAudit = run('node', ['demigod-full-audit.mjs']);
  report.local.verify = run('npm', ['run', 'demigod:verify:all']);
  report.local.capture = run('npm', ['run', 'demigod:capture:audit']);
  report.local.playtest = run('npm', ['run', 'demigod:verify:browser']);
  report.local.copyInv = run('node', ['demigod-copy-inventory.mjs']);

  const { html, footerCoreJs } = await fetchLiveHtml(true);
  const scan = scanLiveHtml(html, { footerCoreJs });
  const footCore = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  const coreVer = (footCore.match(/dg-foot-v(\d+)-core/) || [])[1];
  const boardCdn = (footCore.match(/BOARD_CDN='([^']+)'/) || [])[1];

  report.live = {
    scan,
    footerCore: evaluateFooterCoreCopy(footCore),
    coreVersion: coreVer,
    boardCdn,
    staticSignals: {
      emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
      startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
      engineerJoin: (html.match(/data-name=["']engineer-join["']/gi) || []).length,
      methodology: (html.match(/METHODOLOGY/gi) || []).length,
      hireTalent: (html.match(/HIRE TALENT/gi) || []).length,
      findTalent: (html.match(/FIND TALENT/gi) || []).length,
    },
    humanActions: readJson('DEMIGOD-HUMAN-ACTIONS.json'),
    session: readJson('DEMIGOD-SESSION-STATUS.json'),
    webhook: readJson('DEMIGOD-WEBHOOK-SETUP.json'),
    playtest: readJson('DEMIGOD-PLAYTEST-REVIEW.json'),
    fullAuditJson: readJson('DEMIGOD-FULL-AUDIT.json'),
  };

  const shots = await captureDemigodScreenshots('heavy-website-audit');
  report.screenshots = shots;
  const landingShot = latestShot('audit-shots/audit', '01-landing') || shots.webflow;

  const briefTail = readTail('HEAVY-FULL-AUDIT-BRIEF.md', 12000);
  const copyTail = readTail('HEAVY-COPY-INVENTORY.md', 6000);
  const shipLoop = readTail('HEAVY-SHIP-LOOP.md', 4000);

  const PROMPT = `SuperGrok Heavy — COMPLETE WEBSITE AUDIT + CODE REVIEW + DESIGN REVIEW for trydemigod.com

John wants EVERYTHING website-related audited. NO eat-the-sounds game. NO Tally (native Webflow forms only).

## Architecture (source truth)
- Webflow site: talentlink-sf → www.trydemigod.com
- Head: demigod-head-minimal.html + demigod-head-styles.css (catbox CDN)
- Footer loader: demigod-footer-lite.html → demigod-foot-core.js v${coreVer || '?'} (catbox)
- Forms: startup-hire (7 fields v36), engineer-join (8 fields v36) — runtime patched by foot-core
- Board: DEMIGOD-BOARD.json → catbox CDN ${boardCdn || '?'}
- Pipeline: webhook :9877, review gate (inbox → approve → featured), deferred Webflow API token

## Live scan (just now)
${JSON.stringify(report.live, null, 2).slice(0, 14000)}

## Full audit brief excerpt
${briefTail.slice(0, 8000)}

## Copy inventory excerpt
${copyTail.slice(0, 4000)}

## Prior ship-loop notes
${shipLoop.slice(0, 3000)}

## Screenshot
Latest landing: ${landingShot || 'audit-shots/'}

Deliver ALL sections:

=== STATUS ACK ===

=== FULL AUDIT VERDICT ===
(shipNow yes/no, P0 blockers, P1 polish, static drift vs runtime OK)

=== CODE REVIEW ===
(demigod-foot-core.js, head CSS, submissions lib, webhook — bugs, races, dead code, what to delete from repo)

=== DESIGN REVIEW ===
(first impression 1-10 startups + engineers, hero, modals, trust, board, mobile, vs Fonzi/Jack simplicity)

=== CANVAS DELETE LIST ===
(numbered — METHODOLOGY, email-form rename, nav master, footer master)

=== REPO CLEANUP ===
(which demigod-*.mjs to archive, legacy files to delete)

=== PROMPT FOR CURSOR AGENT ===
(20 numbered steps, AUTOMATED vs HUMAN, one-session scope, STOP condition)

Be blunt. Launch-focused.`;

  wlog('dispatching Heavy comprehensive audit...');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) throw new Error('no grok tab');
  await page.bringToFront();
  await sendToGrok(page, PROMPT);
  const mega = await collectHeavy(page, [
    /=== FULL AUDIT VERDICT ===/i,
    /=== CODE REVIEW ===/i,
    /=== DESIGN REVIEW ===/i,
    /=== PROMPT FOR CURSOR AGENT ===/i,
  ], 5000);
  await browser.disconnect();
  report.heavy.mega = { chars: mega.length, hasAll: /CODE REVIEW|DESIGN REVIEW|PROMPT FOR CURSOR/i.test(mega) };

  wlog('dispatching Heavy code help...');
  try {
    report.heavy.codeHelp = await runHeavyCodeHelp();
  } catch (e) {
    report.heavy.codeHelp = { ok: false, error: String(e.message) };
  }

  wlog('dispatching Heavy design audit...');
  try {
    report.heavy.design = await runHeavyDesignAudit(landingShot);
  } catch (e) {
    report.heavy.design = { ok: false, error: String(e.message) };
  }

  fs.writeFileSync(HEAVY_OUT, `# SuperGrok Heavy — Complete Website Audit\n\n_${new Date().toISOString()}_\n\n${mega}\n\n---\n\n## Code help (separate pass)\n\nSee HEAVY-DEMIGOD-CODE-HELP.md\n\n## Design audit (separate pass)\n\nSee HEAVY-DEMIGOD-DESIGN-AUDIT.md\n`);
  fs.writeFileSync(HEAVY_JSON, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(ROOT, 'HEAVY-FULL-AUDIT-BRIEF.md'), briefTail || readTail('HEAVY-FULL-AUDIT-BRIEF.md'));

  console.log(JSON.stringify({
    ok: true,
    heavyOut: HEAVY_OUT,
    heavyJson: HEAVY_JSON,
    codeHelp: report.heavy.codeHelp?.path,
    design: report.heavy.design?.path,
    megaChars: mega.length,
    coreVersion: coreVer,
  }));
  wlog('=== FULL WEBSITE AUDIT PASS END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });