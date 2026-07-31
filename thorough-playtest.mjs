#!/usr/bin/env node
/** Thorough playtest — desktop + mobile, many screenshots, bug log */
import fs from 'fs';
import path from 'path';
import {
  connectPlaytestBrowser,
  openFreshPlaytestPage,
  closePlaytestPage,
  closeStalePlaytestTabs,
} from './playtest-browser.mjs';

const CACHE = process.env.GAME_CACHE || 'cohesion3';
const URL = `http://127.0.0.1:8765/ninjawhee-eat-the-sounds.html?v=${CACHE}`;
const OUT_DIR = '/home/potter/audit-shots/thorough';
const OUT_MD = '/home/potter/THOROUGH-PLAYTEST.md';

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await connectPlaytestBrowser();
await closeStalePlaytestTabs(browser);

async function runSession(viewport, tag) {
  const page = await openFreshPlaytestPage(browser);
  try {
  await page.setViewport(viewport);
  const shots = [];
  const bugs = [];
  const notes = [];
  let n = 0;

  async function shot(label) {
    n++;
    const safe = `${tag}-${String(n).padStart(2, '0')}-${label}`.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 64);
    const file = path.join(OUT_DIR, `${safe}.png`);
    await page.screenshot({ path: file, fullPage: false });
    shots.push({ label, file });
    return file;
  }

  const bug = (msg) => bugs.push(`[${tag}] ${msg}`);
  const note = (msg) => notes.push(`[${tag}] ${msg}`);

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});

  const isMobile = viewport.width < 900;

  await page.evaluate(() => new Promise((r) => setTimeout(r, 900)));
  await shot('boot');

  const introResult = await page.evaluate(async (mobile) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const tap = () => document.getElementById('dialogueBox')?.click();
    const issues = [];
    if (!document.getElementById('introOverlay')?.classList.contains('hidden')) {
      issues.push('old rhythm intro overlay visible on boot');
    }
    let introReady = false;
    for (let w = 0; w < 40; w++) {
      if (dialogue?.active && dialogue.forest === 'intro') { introReady = true; break; }
      await sleep(250);
    }
    if (!introReady) issues.push('intro dialogue did not auto-start');
    const hint0 = document.getElementById('dialogueHint')?.textContent || '';
    if (mobile && /z \/|↑↓|space/i.test(hint0)) {
      issues.push(`mobile intro shows keyboard hint: "${hint0}"`);
    }
    for (let i = 0; i < 4; i++) { tap(); await sleep(360); }
    return { issues, hint0, node: dialogue?.nodeId };
  }, isMobile);
  introResult.issues.forEach((i) => bug(i));
  await shot('intro-mid');

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const tap = () => document.getElementById('dialogueBox')?.click();
    for (let i = 0; i < 14; i++) {
      if (document.body.classList.contains('overworld-active')) break;
      if (!dialogue?.active) break;
      tap();
      await sleep(360);
    }
    await sleep(700);
  });
  await shot('store-spawn');

  const spawnCheck = await page.evaluate((mobile) => {
    const issues = [];
    if (!document.body.classList.contains('overworld-active')) issues.push('stuck after intro');
    const touchUi = document.body.classList.contains('touch-ui');
    if (mobile && !touchUi) issues.push('touch-ui class missing on mobile');
    const padVis = document.getElementById('owTouchControls')
      && getComputedStyle(document.getElementById('owTouchControls')).display !== 'none';
    if (mobile && !padVis) issues.push('touch d-pad not visible');
    const hintKey = document.getElementById('owHintKey')?.textContent || '';
    const hintSub = document.getElementById('owHintSub')?.textContent || '';
    if (mobile && /^(Z|X|Esc)$/i.test(hintKey)) issues.push(`mobile hint shows keyboard key "${hintKey}"`);
    if (mobile && /Esc opens journal/i.test(hintSub)) issues.push(`mobile walk hint says Esc: "${hintSub}"`);
    return {
      issues,
      spawn: JazzStoreOverworld?.playerGridPos?.(),
      hintKey,
      hintSub,
      touchUi,
      padVis,
    };
  }, isMobile);
  spawnCheck.issues.forEach((i) => bug(i));
  note(`spawn ${spawnCheck.spawn?.x},${spawnCheck.spawn?.y}`);

  await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)));
  await shot('ambient-playing');

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 40; i++) {
      JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
      await sleep(35);
    }
  });
  await shot('walk-east');

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 50; i++) {
      JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
      await sleep(35);
    }
    for (let i = 0; i < 12; i++) {
      JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
      await sleep(35);
    }
  });
  await shot('walk-north');

  const vinylResult = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const issues = [];
    const moon = JazzStoreOverworld.VINYL_PICKUPS.find((v) => v.id === 'moon');

    async function walkTo(x, y, max = 140) {
      for (let i = 0; i < max; i++) {
        const p = JazzStoreOverworld.playerGridPos();
        if (p.x === x && p.y === y) return true;
        if (p.x < x) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
        else if (p.x > x) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
        else if (p.y < y) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
        else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
        await sleep(45);
      }
      const end = JazzStoreOverworld.playerGridPos();
      issues.push(`walk fail moon pad wanted (${x},${y}) got (${end.x},${end.y})`);
      return false;
    }

    async function measureAmbient(ms = 1000) {
      if (!audioCtx || !window.__ambientGain) return 0;
      const analyser = audioCtx.createAnalyser();
      __ambientGain.connect(analyser);
      const buf = new Float32Array(2048);
      let peak = 0;
      for (let i = 0; i < ms / 100; i++) {
        await sleep(100);
        analyser.getFloatTimeDomainData(buf);
        for (let j = 0; j < buf.length; j++) peak = Math.max(peak, Math.abs(buf[j]));
      }
      analyser.disconnect();
      return peak;
    }

    async function measureVinyl(ms = 1200) {
      if (!audioCtx || !audioBus?.vinylGain) return 0;
      const analyser = audioCtx.createAnalyser();
      audioBus.vinylGain.connect(analyser);
      const buf = new Float32Array(2048);
      let peak = 0;
      for (let i = 0; i < ms / 100; i++) {
        await sleep(100);
        analyser.getFloatTimeDomainData(buf);
        for (let j = 0; j < buf.length; j++) peak = Math.max(peak, Math.abs(buf[j]));
      }
      analyser.disconnect();
      return peak;
    }

    await walkTo(moon.padX, moon.padY);
    const atPad = JazzStoreOverworld.playerGridPos();
    await ensureAudioReady?.().catch?.(() => {});
    if (audioCtx?.state === 'suspended') {
      try { await audioCtx.resume(); } catch (_) { /* gesture */ }
    }
    const ambBefore = await measureAmbient(900);
    JazzStoreOverworld.handleKey('KeyZ', { repeat: false });
    await sleep(1400);
    const spinUi = JazzStoreOverworld.buildInteractHintUI?.();
    const playing = JazzStoreOverworld.isListening?.()
      || spinUi?.action === 'Stop'
      || VinylAudio?.isPlaying?.()
      || !!JazzStoreOverworld.listeningId;
    if (!playing) issues.push('Z on moon pad did not start vinyl');

    const ambDuring = await measureAmbient(900);
    const vinylDuring = await measureVinyl(1100);
    const ambBlocked = StoreAmbient?.isMusicBlocked?.();
    if (ambDuring > 0.04 && vinylDuring > 0.02) {
      issues.push(`ambient + vinyl overlap (amb=${ambDuring.toFixed(3)} vinyl=${vinylDuring.toFixed(3)})`);
    }
    if (ambBefore < 0.01) issues.push('store ambient silent before vinyl');

    await sleep(1000);
    return { issues, atPad, playing, ambBefore, ambDuring, vinylDuring, ambBlocked };
  });
  vinylResult.issues.forEach((i) => bug(i));
  await shot('vinyl-playing');

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    JazzStoreOverworld.handleKey('KeyX', { repeat: false });
    await sleep(700);
  });
  await shot('vinyl-stopped');

  await page.evaluate(async (mobile) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const key = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    if (mobile) {
      document.getElementById('owTouchJournal')?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
      );
    } else {
      key('Escape');
      await sleep(200);
      if (!StorePause?.isOpen?.()) JazzStoreOverworld?.setPaused?.(true);
    }
    await sleep(500);
  }, isMobile);
  await shot('journal');

  const journalCheck = await page.evaluate(() => ({
    open: StorePause?.isOpen?.(),
  }));
  if (!journalCheck.open) bug('journal/pause did not open');

  await page.evaluate(async (mobile) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const key = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    if (StorePause?.isOpen?.()) {
      if (mobile) key('Escape');
      else StorePause?.close?.();
      JazzStoreOverworld?.setPaused?.(false);
      await sleep(300);
    }
  }, isMobile);

  const shelterResult = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const issues = [];
    const shelter = JazzStoreOverworld.VINYL_PICKUPS.find((v) => v.id === 'shelter');
    for (let i = 0; i < 140; i++) {
      const p = JazzStoreOverworld.playerGridPos();
      if (p.x === shelter.padX && p.y === shelter.padY) break;
      if (p.x < shelter.padX) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
      else if (p.x > shelter.padX) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
      else if (p.y < shelter.padY) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
      else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
      await sleep(45);
    }
    JazzStoreOverworld.handleKey('KeyZ', { repeat: false });
    await sleep(1400);
    const spinUi = JazzStoreOverworld.buildInteractHintUI?.();
    const spinning = JazzStoreOverworld.isListening?.()
      || spinUi?.action === 'Stop'
      || !!JazzStoreOverworld.listeningId;
    if (!spinning) issues.push('shelter vinyl did not start');
    JazzStoreOverworld.handleKey('KeyX', { repeat: false });
    await sleep(400);
    return { issues };
  });
  shelterResult.issues.forEach((i) => bug(i));
  await shot('shelter-pad');

  const npcResult = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const tap = () => document.getElementById('dialogueBox')?.click();
    const issues = [];
    const orph = JazzStoreOverworld.getNpcById?.('orph');
    if (!orph) return { issues: ['orph npc missing'] };
    const tx = orph.padX ?? orph.tileX;
    const ty = orph.padY ?? orph.tileY + 1;
    for (let i = 0; i < 140; i++) {
      const p = JazzStoreOverworld.playerGridPos();
      if (p.x === tx && p.y === ty) break;
      if (p.x < tx) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
      else if (p.x > tx) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
      else if (p.y < ty) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
      else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
      await sleep(45);
    }
    JazzStoreOverworld.handleKey('KeyZ', { repeat: false });
    await sleep(500);
    if (!dialogue?.active) issues.push('Z near Orph did not open dialogue');
    for (let i = 0; i < 10; i++) {
      if (!dialogue?.active) break;
      tap();
      await sleep(280);
    }
    await sleep(400);
    return { issues, forest: dialogue?.forest };
  });
  npcResult.issues.forEach((i) => bug(i));
  await shot('talk-orph');

  if (isMobile) {
    const tapResult = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const issues = [];
      const canvas = document.getElementById('overworldCanvas');
      const rect = canvas.getBoundingClientRect();
      const start = JazzStoreOverworld.playerGridPos();
      JazzStoreOverworld?.setPaused?.(false);
      StorePause?.close?.();
      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width * 0.72,
        clientY: rect.top + rect.height * 0.42,
        pointerType: 'touch',
      }));
      await sleep(3200);
      const after = JazzStoreOverworld.playerGridPos();
      if (start.x === after.x && start.y === after.y) {
        issues.push(`tap-to-walk no movement from ${start.x},${start.y}`);
      }
      return { issues, start, after };
    });
    tapResult.issues.forEach((i) => bug(i));
    await shot('mobile-tap-walk');
  }

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    async function walkTo(x, y) {
      for (let i = 0; i < 140; i++) {
        const p = JazzStoreOverworld.playerGridPos();
        if (p.x === x && p.y === y) return;
        if (p.x < x) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
        else if (p.x > x) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
        else if (p.y < ty) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
        else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
        await sleep(40);
      }
    }
    const corners = [[2, 2], [64, 2], [64, 14], [2, 14]];
    for (const [x, y] of corners) {
      for (let i = 0; i < 140; i++) {
        const p = JazzStoreOverworld.playerGridPos();
        if (p.x === x && p.y === y) break;
        if (p.x < x) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
        else if (p.x > x) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
        else if (p.y < y) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
        else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
        await sleep(40);
      }
    }
  });
  await shot('corners');

  const mirrorResult = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const issues = [];
    const mirror = JazzStoreOverworld.VINYL_PICKUPS.find((v) => v.id === 'mirror');
    for (let i = 0; i < 160; i++) {
      const p = JazzStoreOverworld.playerGridPos();
      if (p.x === mirror.padX && p.y === mirror.padY) break;
      if (p.x < mirror.padX) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
      else if (p.x > mirror.padX) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
      else if (p.y < mirror.padY) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
      else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
      await sleep(40);
    }
    const at = JazzStoreOverworld.playerGridPos();
    if (at.x !== mirror.padX || at.y !== mirror.padY) {
      issues.push(`could not reach mirror pad got ${at.x},${at.y}`);
    }
    return { issues, at };
  });
  mirrorResult.issues.forEach((i) => bug(i));
  await shot('mirror-pad');

  const simonResult = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const tap = () => document.getElementById('dialogueBox')?.click();
    const issues = [];
    const simon = JazzStoreOverworld.getNpcById?.('simon');
    if (!simon) return { issues: ['simon npc missing'] };
    const tx = simon.padX ?? simon.tileX;
    const ty = simon.padY ?? simon.tileY + 1;
    for (let i = 0; i < 160; i++) {
      const p = JazzStoreOverworld.playerGridPos();
      if (p.x === tx && p.y === ty) break;
      if (p.x < tx) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
      else if (p.x > tx) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
      else if (p.y < ty) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
      else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
      await sleep(40);
    }
    JazzStoreOverworld.handleKey('KeyZ', { repeat: false });
    await sleep(500);
    if (!dialogue?.active) issues.push('Z near Simon did not open dialogue');
    for (let i = 0; i < 8; i++) { if (!dialogue?.active) break; tap(); await sleep(260); }
    return { issues };
  });
  simonResult.issues.forEach((i) => bug(i));
  await shot('talk-simon');

  await shot('final');

  return { tag, shots, bugs, notes, pass: bugs.length === 0 };
  } finally {
    await closePlaytestPage(page);
  }
}

let pass = false;
try {
const desktop = await runSession({ width: 1280, height: 720, deviceScaleFactor: 1 }, 'desktop');
const mobile = await runSession({
  width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
}, 'mobile');

const allBugs = [...new Set([...desktop.bugs, ...mobile.bugs])];
const allNotes = [...desktop.notes, ...mobile.notes];
pass = desktop.pass && mobile.pass;

const md = [];
md.push('# Thorough Playtest Report');
md.push('');
md.push(`**Date:** ${new Date().toISOString().slice(0, 10)}`);
md.push(`**URL:** ${URL}`);
md.push(`**Result:** ${pass ? 'PASS (no issues logged)' : 'ISSUES FOUND'}`);
md.push('');
md.push('## Bugs / Not As Intended');
if (allBugs.length) allBugs.forEach((b) => md.push(`- ${b}`));
else md.push('- None logged this run');
md.push('');
md.push('## Observations');
allNotes.forEach((n) => md.push(`- ${n}`));
md.push('');
md.push('## Screenshots');
[...desktop.shots, ...mobile.shots].forEach((s) => md.push(`- \`${path.basename(s.file)}\` — ${s.label}`));
md.push('');
md.push(`Screenshots folder: \`${OUT_DIR}\``);

fs.writeFileSync(OUT_MD, md.join('\n'));
console.log(JSON.stringify({
  pass,
  bugs: allBugs,
  shotCount: desktop.shots.length + mobile.shots.length,
  report: OUT_MD,
}, null, 2));
} finally {
  await closeStalePlaytestTabs(browser);
  await browser.disconnect();
}