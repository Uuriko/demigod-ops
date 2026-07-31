#!/usr/bin/env node
/** New-player journey — real intro boot, desktop + mobile screenshots, confusion audit */
import fs from 'fs';
import path from 'path';
import {
  connectPlaytestBrowser,
  openFreshPlaytestPage,
  closePlaytestPage,
  closeStalePlaytestTabs,
} from './playtest-browser.mjs';

const OUT_DIR = '/home/potter/audit-shots/newplayer';
const OUT_MD = '/home/potter/NEW-PLAYER-PLAYTEST.md';
const CACHE = process.env.GAME_CACHE || 'cohesion3';
const URL = `http://127.0.0.1:8765/ninjawhee-eat-the-sounds.html?v=${CACHE}`;

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await connectPlaytestBrowser();
await closeStalePlaytestTabs(browser);

async function runViewport(viewport, tag) {
  const page = await openFreshPlaytestPage(browser);
  try {
  await page.setViewport(viewport);
  const shots = [];
  let n = 0;
  async function shot(label) {
    n++;
    const safe = `${tag}-${String(n).padStart(2, '0')}-${label}`.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 56);
    const file = path.join(OUT_DIR, `${safe}.png`);
    await page.screenshot({ path: file, fullPage: false });
    shots.push({ label, file });
    return file;
  }

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});

  const result = await page.evaluate(async (isMobile) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const log = [];
    const issues = [];
    const confusion = [];
    const ok = (name, pass, detail = '') => log.push({ name, pass, detail });

    const tap = () => document.getElementById('dialogueBox')?.click();
    const key = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));

    ok('page loaded', true, location.href);

    const introHidden = document.getElementById('introOverlay')?.classList.contains('hidden');
    ok('rhythm intro overlay hidden', !!introHidden);
    if (!introHidden) confusion.push('Old rhythm "how to play" overlay may confuse store-first players');

    let introReady = false;
    for (let w = 0; w < 40; w++) {
      if (dialogue?.active && dialogue.forest === 'intro') { introReady = true; break; }
      await sleep(250);
    }
    ok('sarah intro dialogue', introReady,
      introReady ? `node=${dialogue.nodeId}` : 'no dialogue');
    if (!introReady) issues.push('intro dialogue did not auto-start');

    const hint0 = document.getElementById('dialogueHint')?.textContent || '';
    if (isMobile && /z \/|↑↓/.test(hint0)) confusion.push(`intro hint shows keyboard on mobile: "${hint0}"`);
    if (!isMobile && !/z \/|space/.test(hint0) && dialogue?.active) confusion.push(`desktop intro hint unclear: "${hint0}"`);

    window.__shotPhase = 'intro-line1';
    await sleep(400);
    for (let i = 0; i < 14; i++) {
      if (document.body.classList.contains('overworld-active')) break;
      if (!dialogue?.active) break;
      tap();
      await sleep(380);
      if (i === 2) window.__shotPhase = 'intro-line2';
    }

    await sleep(800);
    ok('entered overworld after intro', document.body.classList.contains('overworld-active'));
    if (!document.body.classList.contains('overworld-active')) {
      issues.push('stuck after intro — not in overworld');
      return { log, issues, confusion, pass: false };
    }

    window.__shotPhase = 'store-spawn';
    document.getElementById('overworldCanvas')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 300 }));
    await sleep(400);
    await ensureAudioReady?.().catch?.(() => {});
    if (audioCtx?.state === 'suspended') {
      try { await audioCtx.resume(); } catch (_) { /* gesture */ }
    }
    await sleep(1200);

    const touchUi = document.body.classList.contains('touch-ui');
    ok('touch-ui class', isMobile ? touchUi : !touchUi || window.innerWidth < 900, `touch-ui=${touchUi}`);

    const hintKeyEl = document.getElementById('owHintKey');
    const hintKeyVisible = hintKeyEl && hintKeyEl.style.display !== 'none'
      && getComputedStyle(hintKeyEl).display !== 'none';
    const hintKey = hintKeyVisible ? (hintKeyEl?.textContent || '') : '';
    if (isMobile && hintKeyVisible && /^[ZX]$/.test(hintKey)) {
      confusion.push(`hint bar shows ${hintKey} on mobile — should be TALK/STOP`);
    }

    const touchPad = document.getElementById('owTouchControls');
    const padVisible = touchPad && getComputedStyle(touchPad).display !== 'none';
    if (isMobile && !padVisible) confusion.push('touch d-pad not visible on mobile viewport');

    const sarahSpawn = JazzStoreOverworld.getNpcById?.('ninjawhee_return');
    ok('sarah hidden at spawn', sarahSpawn?.hidden === true, `hidden=${sarahSpawn?.hidden}`);
    if (sarahSpawn && !sarahSpawn.hidden) issues.push('Sarah visible at store spawn before first vinyl');

    if (isMobile) {
      document.getElementById('owTouchJournal')?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
      );
    } else {
      key('Escape');
    }
    await sleep(400);
    const pauseOpen = StorePause?.isOpen?.();
    ok('journal opens', !!pauseOpen);
    if (!pauseOpen) issues.push(isMobile ? '☰ LOG journal did not open' : 'ESC journal did not open');
    if (pauseOpen) {
      const quest = document.querySelector('.main-quest-steps .inv-quest-step, .journal-quest-track');
      if (!quest) confusion.push('journal open but main quest steps not visible');
    }
    window.__shotPhase = 'journal';
    await sleep(300);

    if (pauseOpen) {
      key('Escape');
      await sleep(300);
    }

    const v = JazzStoreOverworld.VINYL_PICKUPS?.[0];
    if (v) {
      for (let i = 0; i < 90; i++) {
        const p = JazzStoreOverworld.playerGridPos();
        if (p.x === v.padX && p.y === v.padY) break;
        if (p.x < v.padX) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
        else if (p.x > v.padX) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
        else if (p.y < v.padY) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
        else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
        await sleep(35);
      }
      JazzStoreOverworld.handleKey('KeyZ', { repeat: false });
      await sleep(1400);
      window.__shotPhase = 'first-vinyl';
      const spinUi = JazzStoreOverworld.buildInteractHintUI?.();
      const spinning = JazzStoreOverworld.isListening?.()
        || spinUi?.action === 'Stop'
        || GameProgress?.getState?.()?.vinyls?.length > 0;
      ok('first vinyl spin', spinning, spinUi?.action || JazzStoreOverworld.isListening?.() ? 'playing' : 'none');
      if (!spinning) issues.push('first vinyl did not start — stand on colored pad');
      const sarahAfter = JazzStoreOverworld.getNpcById?.('ninjawhee_return');
      ok('sarah appears after vinyl', sarahAfter?.hidden === false, `hidden=${sarahAfter?.hidden}`);
      if (sarahAfter?.hidden) issues.push('Sarah still hidden after first vinyl spin');
      window.__shotPhase = 'sarah-visible';
      JazzStoreOverworld.handleKey('KeyX', { repeat: false });
      await sleep(300);
    }

    const orph = JazzStoreOverworld.getNpcById('orph');
    if (orph) {
      for (let i = 0; i < 80; i++) {
        const p = JazzStoreOverworld.playerGridPos();
        const tx = orph.padX ?? orph.tileX;
        const ty = orph.padY ?? (orph.tileY + 1);
        if (p.x === tx && p.y === ty) break;
        if (p.x < tx) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
        else if (p.x > tx) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
        else if (p.y < ty) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
        else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
        await sleep(35);
      }
      JazzStoreOverworld.handleKey('KeyZ', { repeat: false });
      await sleep(800);
      window.__shotPhase = 'first-npc';
      if (dialogue?.active) {
        for (let j = 0; j < 12 && dialogue?.active; j++) { tap(); await sleep(150); }
      }
      ok('first NPC talk', JazzStoreOverworld.talked?.has?.('orph') || GameProgress?.getState?.()?.npcs?.includes('orph'));
    }

    const sub = document.getElementById('owHintSub')?.textContent || '';
    if (/Esc opens journal/.test(sub) && isMobile) confusion.push(`walk hint says Esc on mobile: "${sub}"`);

    return {
      log,
      issues,
      confusion,
      pass: log.every((r) => r.pass) && issues.length === 0 && confusion.length === 0,
      hintKey,
      hint0,
      sub,
      touchUi,
    };
  }, viewport.width < 500);

  for (const phase of ['intro-line1', 'intro-line2', 'store-spawn', 'journal', 'first-vinyl', 'sarah-visible', 'first-npc']) {
    await page.evaluate((p) => { window.__shotPhase = p; }, phase);
    await new Promise((r) => setTimeout(r, 200));
    await shot(phase);
  }
  await shot('final');

  return { tag, viewport, shots, result };
  } finally {
    await closePlaytestPage(page);
  }
}

let pass = false;
try {
const desktop = await runViewport({ width: 1280, height: 800 }, 'desktop');
const mobile = await runViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }, 'mobile');

const allIssues = [...new Set([
  ...desktop.result.issues,
  ...mobile.result.issues,
])];
const allConfusion = [...new Set([
  ...desktop.result.confusion,
  ...mobile.result.confusion,
])];
pass = desktop.result.pass && mobile.result.pass && allConfusion.length === 0;

const md = [
  '# New Player Playtest',
  `**Run:** ${new Date().toISOString()}`,
  `**URL:** ${URL}`,
  `**Result:** ${pass ? 'PASS' : 'FAIL'}`,
  `**Screenshots:** ${OUT_DIR}`,
  '',
  '## Desktop',
  ...desktop.result.log.map((r) => `- [${r.pass ? 'x' : ' '}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
  '',
  '## Mobile',
  ...mobile.result.log.map((r) => `- [${r.pass ? 'x' : ' '}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
];

if (allConfusion.length) {
  md.push('', '## Confusion (UX)', ...allConfusion.map((c) => `- ${c}`));
}
if (allIssues.length) {
  md.push('', '## Bugs', ...allIssues.map((i) => `- ${i}`));
}

md.push('', '## Screenshots', ...[...desktop.shots, ...mobile.shots].map((s) => `- ${path.basename(s.file)} — ${s.label}`));

fs.writeFileSync(OUT_MD, md.join('\n'));
console.log(md.join('\n'));
} finally {
  await closeStalePlaytestTabs(browser);
  await browser.disconnect();
}
process.exit(pass ? 0 : 1);