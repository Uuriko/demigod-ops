#!/usr/bin/env node
/**
 * Continuous improvement loop:
 *   playtest → report → Heavy → collect → Cursor dispatch → sync → repeat
 *
 * Usage:
 *   node continuous-improve-loop.mjs --once     # single cycle
 *   node continuous-improve-loop.mjs            # daemon (default 4 min between cycles)
 *   node continuous-improve-loop.mjs --phase playtest
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import {
  ROOT, LOG_PATH, loadState, saveState, log, sleep, ensureServices,
  syncEatTheSounds, connectBrowser, findGrokPage, findCursorAgentsPage,
  sendToGrok, collectGrokReply, dispatchCursorTask, ensureCursorHealthy,
} from './collab-lib.mjs';

const args = new Set(process.argv.slice(2));
const ONCE = args.has('--once');
const INTERVAL_MS = Number(process.env.LOOP_INTERVAL_MS || 240000);
const HEAVY_WAIT_MS = Number(process.env.HEAVY_WAIT_MS || 100000);
const phaseArg = process.argv.find((a) => a.startsWith('--phase='))?.split('=')[1]
  || (args.has('--phase') ? process.argv[process.argv.indexOf('--phase') + 1] : null);

function runNode(script, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [path.join(ROOT, script)], {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function readText(file, max = 6000) {
  try { return fs.readFileSync(path.join(ROOT, file), 'utf8').slice(0, max); } catch (_) { return ''; }
}

async function phasePlaytest(state) {
  state.phase = 'playtest';
  saveState(state);
  log('PHASE playtest — new-player journey');
  const code = await runNode('new-player-playtest.mjs');
  state.lastPass = code === 0;
  state.lastReport = 'NEW-PLAYER-PLAYTEST.md';
  saveState(state);
  return code;
}

async function phaseAudioAudit(state) {
  state.phase = 'audio_audit';
  saveState(state);
  log('PHASE audio_audit — bus levels + overlap + WAV clips');
  const code = await runNode('audio-audit-playtest.mjs');
  state.lastAudioPass = code === 0;
  state.lastAudioReport = 'AUDIO-AUDIT.md';
  saveState(state);
  return code;
}

async function phaseSendHeavy(state) {
  state.phase = 'send_heavy';
  saveState(state);
  const report = readText('NEW-PLAYER-PLAYTEST.md', 5000);
  const audioReport = readText('AUDIO-AUDIT.md', 3500);
  const prompt = `Heavy — NEW PLAYER playtest audit (fresh eyes, store explore only).

Live: http://127.0.0.1:8765/ninjawhee-eat-the-sounds.html?v=cohesion3
Mobile share tunnel may differ — focus on first-visit UX.

AGENT REPORT:
${report}

AUDIO AUDIT (bus overlap + mix):
${audioReport || '(no audio audit this cycle)'}

Reply format (max 200 words):
## Confusion fixes (numbered — file:what to change)
## Bugs (severity + file:function)
## Top 3 polish (one line each)
## One task for Cursor agent (single focused implementation, one-file preferred)
## Ship note (one sentence for @ninjawhee)

Soul-first. No bundler. No refactors. Blunt.`;

  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) throw new Error('no grok tab — open grok.com in CDP Chrome');
  await sendToGrok(page, prompt);
  fs.writeFileSync(path.join(ROOT, 'HEAVY-NEWPLAYER-SENT.txt'), `${new Date().toISOString()} chars=${prompt.length}`);
  log(`PHASE send_heavy — sent ${prompt.length} chars`);
  state.pendingHeavy = true;
  saveState(state);
  await browser.disconnect();
}

async function phaseCollectHeavy(state) {
  state.phase = 'collect_heavy';
  saveState(state);
  log(`PHASE collect_heavy — polling up to ${HEAVY_WAIT_MS / 1000}s`);
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) throw new Error('no grok tab');
  let reply = { text: '', thinking: true, stale: true };
  const polls = Math.max(3, Math.ceil(HEAVY_WAIT_MS / 30000));
  for (let i = 0; i < polls; i++) {
    reply = await collectGrokReply(page, { waitMs: 30000, minGrowth: 40 });
    log(`  collect poll ${i + 1}/${polls}: ${reply.text?.length || 0} chars thinking=${reply.thinking}`);
    if (reply.text && !reply.thinking && !reply.stale) break;
    if (!reply.thinking && reply.text?.length > 200) break;
  }
  fs.writeFileSync(path.join(ROOT, 'HEAVY-NEWPLAYER-FEEDBACK.md'), reply.text || '(no reply yet — Heavy still thinking; will retry next cycle)');
  fs.writeFileSync(path.join(ROOT, 'HEAVY-NEWPLAYER-META.json'), JSON.stringify(reply, null, 2));
  state.pendingHeavy = !reply.text || reply.thinking;
  log(`PHASE collect_heavy — ${reply.text?.length || 0} chars thinking=${reply.thinking}`);
  saveState(state);
  await browser.disconnect();
}

async function phaseCursorRetry(state) {
  state.phase = 'cursor_retry';
  saveState(state);
  const code = await runNode('cursor-retry-crash.mjs');
  state.lastCursorRetry = new Date().toISOString();
  state.lastCursorOk = code === 0;
  log(`PHASE cursor_retry — exit ${code}`);
  saveState(state);
}

async function phaseDispatchCursor(state) {
  state.phase = 'dispatch_cursor';
  saveState(state);
  const report = readText('NEW-PLAYER-PLAYTEST.md', 2500);
  const heavy = readText('HEAVY-NEWPLAYER-FEEDBACK.md', 2500);
  const taskMatch = heavy.match(/cursor agent[^\n]*\n([\s\S]*?)(?=\n##|$)/i)
    || heavy.match(/## One task for Cursor[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
  const cursorTask = taskMatch?.[1]?.trim()
    || 'Fix top new-player confusion from playtest. One-file patch. Run new-player-playtest.mjs after.';

  const prompt = `∴ eat the sounds — continuous loop cycle ${state.cycle}

Repo: /home/potter (sync eat-the-sounds/)
Game: http://localhost:8765/ninjawhee-eat-the-sounds.html?v=cohesion3

PLAYTEST:
${report}

HEAVY:
${heavy}

YOUR TASK:
${cursorTask}

Rules: one-file if possible, cache-bust ?v=, sync eat-the-sounds/, no scope creep.`;

  const browser = await connectBrowser();
  let page = await findCursorAgentsPage(browser);
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(3000);
  }
  const sent = await dispatchCursorTask(page, prompt);
  fs.writeFileSync(path.join(ROOT, 'CURSOR-LOOP-DISPATCH.txt'), `${new Date().toISOString()} sent=${sent}\n\n${prompt.slice(0, 2000)}`);
  await page.screenshot({ path: path.join(ROOT, 'cursor-loop-dispatch.png') });
  state.pendingCursor = true;
  log(`PHASE dispatch_cursor — ${sent}`);
  saveState(state);
  await browser.disconnect();
}

async function phaseSync(state) {
  state.phase = 'sync';
  saveState(state);
  syncEatTheSounds();
  log('PHASE sync — copied to eat-the-sounds/');
}

async function runCycle(state) {
  if (state.automationPaused) {
    log('automation paused — skipping cycle (run: run-continuous.sh resume-all)');
    state.phase = 'paused';
    saveState(state);
    return;
  }
  state.cycle = (state.cycle || 0) + 1;
  state.lastRun = new Date().toISOString();
  state.errors = state.errors || [];
  saveState(state);
  log(`=== CYCLE ${state.cycle} START ===`);

  const services = await ensureServices();
  const bad = services.filter((s) => !s.ok);
  if (bad.length) {
    const msg = `services down: ${bad.map((b) => b.name).join(', ')}`;
    log(`WARN ${msg}`);
    state.errors.push({ at: new Date().toISOString(), msg });
    saveState(state);
    return;
  }

  const defaultPhases = ['playtest', 'audio_audit', 'send_heavy', 'collect_heavy', 'cursor_retry', 'dispatch_cursor', 'sync'];
  const cursorPaused = state.cursorPaused === true;
  const phases = phaseArg
    ? [phaseArg]
    : defaultPhases.filter((p) => !cursorPaused || (p !== 'cursor_retry' && p !== 'dispatch_cursor'));

  if (cursorPaused && !phaseArg) {
    log('cursor paused — skipping cursor_retry + dispatch_cursor');
    state.pendingCursor = false;
    saveState(state);
  }

  for (const phase of phases) {
    try {
      if (phase === 'playtest') await phasePlaytest(state);
      else if (phase === 'audio_audit') await phaseAudioAudit(state);
      else if (phase === 'send_heavy') await phaseSendHeavy(state);
      else if (phase === 'collect_heavy') await phaseCollectHeavy(state);
      else if (phase === 'cursor_retry') await phaseCursorRetry(state);
      else if (phase === 'dispatch_cursor') await phaseDispatchCursor(state);
      else if (phase === 'sync') await phaseSync(state);
      else log(`unknown phase ${phase}`);
    } catch (e) {
      const msg = `${phase}: ${e.message || e}`;
      log(`ERROR ${msg}`);
      state.errors.push({ at: new Date().toISOString(), phase, msg });
      saveState(state);
    }
  }

  state.phase = 'idle';
  saveState(state);
  log(`=== CYCLE ${state.cycle} END pass=${state.lastPass} ===`);
}

async function main() {
  fs.mkdirSync(ROOT, { recursive: true });
  log(`continuous-improve-loop start once=${ONCE} interval=${INTERVAL_MS}ms`);
  do {
    const state = loadState();
    await runCycle(state);
    if (ONCE) break;
    log(`sleeping ${INTERVAL_MS / 1000}s before next cycle…`);
    await sleep(INTERVAL_MS);
  } while (true);
}

main().catch((e) => {
  log(`FATAL ${e.stack || e}`);
  process.exit(1);
});