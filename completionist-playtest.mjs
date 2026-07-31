#!/usr/bin/env node
/** Completionist run — interact with everything, beat rhythm, reach aftermath */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const OUT = '/home/potter/HEAVY-COMPLETIONIST-PLAYTEST.md';
const URL = 'http://localhost:8765/ninjawhee-eat-the-sounds.html?v=spacious1';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 300000 });
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 45000 });

const result = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = [];
  const issues = [];
  const ok = (name, pass, detail = '') => log.push({ name, pass, detail });

  function dispatchKey(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
  }

  async function forceFloor() {
    for (let i = 0; i < 60; i++) {
      if (!dialogue?.active) break;
      dispatchKey('KeyZ');
      await sleep(90);
    }
    if (dialogue?.active && typeof closeDialogueUI === 'function') closeDialogueUI();
    StorePause?.close?.();
    JazzStoreOverworld?.setPaused?.(false);
    await sleep(150);
  }

  async function walkTo(x, y, max = 90) {
    for (let i = 0; i < max; i++) {
      const p = JazzStoreOverworld.playerGridPos();
      if (p.x === x && p.y === y) return true;
      if (p.x < x) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
      else if (p.x > x) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
      else if (p.y < y) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
      else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
      await sleep(40);
    }
    const end = JazzStoreOverworld.playerGridPos();
    if (end.x !== x || end.y !== y) {
      issues.push(`walk fail → wanted (${x},${y}) got (${end.x},${end.y})`);
      return false;
    }
    return true;
  }

  async function pressZ() {
    if (typeof dialogue !== 'undefined' && dialogue.active) {
      dispatchKey('KeyZ');
      await sleep(120);
      return;
    }
    JazzStoreOverworld.handleKey('KeyZ', { repeat: false });
    await sleep(280);
  }

  async function stopVinylIfPlaying() {
    if (JazzStoreOverworld.listeningId) {
      JazzStoreOverworld.handleKey('KeyX', { repeat: false });
      await sleep(200);
    }
  }

  async function advanceDialogue(max = 40) {
    for (let i = 0; i < max; i++) {
      if (!dialogue?.active) return;
      if (dialogue.waiting && dialogue.choiceIdx !== undefined) {
        const items = document.querySelectorAll('.choice-item');
        let pick = -1;
        items.forEach((el, idx) => {
          const t = el.textContent || '';
          if (/drop the needle|eat some sounds|keep the sound/i.test(t)) pick = idx;
        });
        if (pick < 0) pick = 0;
        dialogue.choiceIdx = pick;
        dispatchKey('KeyZ');
        await sleep(200);
        continue;
      }
      dispatchKey('KeyZ');
      await sleep(140);
    }
    await sleep(200);
  }

  async function interactAt(x, y, label) {
    await stopVinylIfPlaying();
    const reached = await walkTo(x, y);
    if (!reached) return false;
    await pressZ();
    if (dialogue?.active) await advanceDialogue();
    return true;
  }

  // Fresh session
  localStorage.clear();
  GameProgress?.reloadFromStorage?.();
  await startOverworld({ freshFinds: true });
  await sleep(500);

  // --- VINYL ---
  const vinyls = JazzStoreOverworld.VINYL_PICKUPS || [];
  await ensureAudioReady?.();
  await sleep(800);
  for (const v of vinyls) {
    await interactAt(v.padX, v.padY, `vinyl ${v.id}`);
    for (let i = 0; i < 40 && !GameProgress.hasVinyl?.(v.id); i++) await sleep(200);
    if (!GameProgress.hasVinyl?.(v.id)) {
      await pressZ();
      for (let i = 0; i < 20 && !GameProgress.hasVinyl?.(v.id); i++) await sleep(200);
    }
    if (!GameProgress.hasVinyl?.(v.id)) issues.push(`vinyl not recorded: ${v.id}`);
    await stopVinylIfPlaying();
    await sleep(300);
  }
  ok('3 vinyl spins', GameProgress.getState().vinyls.length >= 3, GameProgress.getState().vinyls.join(', '));

  // --- NPCs (pinned) ---
  const npcs = ['orph', 'simon', 'honey'];
  for (const id of npcs) {
    const n = JazzStoreOverworld.getNpcById(id);
    if (!n) { issues.push(`missing npc ${id}`); continue; }
    const px = n.padX ?? n.tileX;
    const py = n.padY ?? n.tileY + 1;
    await interactAt(px, py, `talk ${id}`);
  }
  ok('3 mutual talks', JazzStoreOverworld.mutualsComplete?.()
    || npcs.every((id) => GameProgress.getState().npcs.includes(id)),
    [...(JazzStoreOverworld.talked || [])].join(', '));

  // --- ALL EXAMINE SPOTS ---
  const spots = JazzStoreOverworld.EXAMINE_SPOTS || [];
  for (const s of spots) {
    const tx = s.padX ?? s.x;
    const ty = s.padY ?? s.y;
    await interactAt(tx, ty, `examine ${s.id}`);
  }
  const fc = GameProgress.getFindCounts();
  ok('find quest 3/3/3', fc.orph === 3 && fc.simon === 3 && fc.honey === 3, JSON.stringify(fc));
  ok('find quest flag', GameProgress.isFindQuestComplete());

  // --- BIRD (before secrets dialogue can block movement) ---
  if (!JazzStoreOverworld.isBirdPresent?.()) JazzStoreOverworld.spawnBirdEncounter?.();
  for (let i = 0; i < 24 && !JazzStoreOverworld.isBirdPresent?.(); i++) await sleep(250);
  if (JazzStoreOverworld.isBirdPresent?.()) {
    await interactAt(10, 4, 'bird');
    await advanceDialogue(40);
    ok('bird helped', GameProgress.hasSecret('bird_guide'));
  } else {
    issues.push('bird never spawned');
    ok('bird helped', false, 'no spawn');
  }

  // --- SECRETS ---
  await interactAt(24, 3, 'moon window');
  await advanceDialogue(30);
  await interactAt(14, 15, 'door mat');
  await advanceDialogue(20);
  await interactAt(19, 7, 'register knock');
  await advanceDialogue(30);
  ok('secrets found', GameProgress.getSecretCount() >= 2, `${GameProgress.getSecretCount()} secrets`);

  const owned = StoreItems.listOwned();
  ok('inventory pickups', owned.length >= 7, `${owned.length}: ${owned.map((i) => i.id).join(', ')}`);

  // --- SARAH → RHYTHM ---
  await forceFloor();
  JazzStoreOverworld.clearListening?.();
  for (let i = 0; i < 6; i++) {
    JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
    await sleep(60);
  }
  const sarah = JazzStoreOverworld.getNpcById('ninjawhee_return');
  if (!await walkTo(sarah.padX, sarah.padY)) {
    await interactAt(19, 7, 'sarah register talk');
  } else {
    await pressZ();
  }
  await advanceDialogue(50);
  await advanceDialogue(50);

  const inRhythm = document.body.classList.contains('rhythm-active');
  ok('entered rhythm', inRhythm);

  if (inRhythm) {
    GameProgress?.setChill?.(true);
    syncTimingWindows?.();
    // Wait for chill auto-NOM to finish 15 slices (max ~3 min)
    let slices = 0;
    for (let i = 0; i < 360; i++) {
      await sleep(500);
      if (typeof slicesEaten !== 'undefined') slices = slicesEaten;
      if (slices >= 15) break;
      if (document.getElementById('mirrorChoice')?.classList.contains('visible')) break;
      if (document.getElementById('endOverlay') && !document.getElementById('endOverlay').classList.contains('hidden')) break;
    }
    ok('rhythm 15 slices', slices >= 15, `slices=${slices}`);

    // Mirror choice — wait for it to open after feast complete
    for (let i = 0; i < 40 && !document.getElementById('mirrorChoice')?.classList.contains('visible'); i++) {
      await sleep(500);
    }
    if (document.getElementById('mirrorChoice')?.classList.contains('visible')) {
      mirrorChoiceIdx = 0;
      if (typeof confirmMirrorChoice === 'function') confirmMirrorChoice();
      else dispatchKey('KeyZ');
      await sleep(4000);
    }
    ok('mirror choice done', !document.getElementById('mirrorChoice')?.classList.contains('visible'));

    // Wait for end screen → auto walk back to aftermath store
    for (let i = 0; i < 24 && document.getElementById('endOverlay')?.classList.contains('hidden'); i++) {
      await sleep(500);
    }
    for (let i = 0; i < 24; i++) {
      await sleep(500);
      if (document.body.classList.contains('overworld-active') && JazzStoreOverworld.isAftermath?.()) break;
    }
    if (!JazzStoreOverworld.isAftermath?.() && typeof enterAftermathStore === 'function') {
      await enterAftermathStore();
      await sleep(1500);
    }
    ok('aftermath store', JazzStoreOverworld.isAftermath?.());
  }

  const state = GameProgress.getState();
  const breakdown = GameProgress.getAlbumBreakdown();
  return {
    log,
    issues,
    state: {
      vinyls: state.vinyls,
      npcs: state.npcs,
      findCounts: state.findCounts,
      inventory: state.inventory,
      secrets: state.secrets,
      wins: state.wins,
    },
    breakdown,
    pass: log.every((r) => r.pass),
  };
});

const lines = [
  '# Completionist Playtest',
  `**Run:** ${new Date().toISOString()}`,
  `**Result:** ${result.pass ? 'PASS' : 'FAIL'}`,
  '',
  '## Checklist',
  ...result.log.map((r) => `- [${r.pass ? 'x' : ' '}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
  '',
  '## Progress',
  '```json',
  JSON.stringify(result.state, null, 2),
  '```',
  '',
  `**Album:** ${result.breakdown?.total}% (explore ${result.breakdown?.explore}% · rhythm ${result.breakdown?.rhythm}% · mastery ${result.breakdown?.mastery}%)`,
];

if (result.issues.length) {
  lines.push('', '## Issues');
  result.issues.forEach((e) => lines.push(`- ${e}`));
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(lines.join('\n'));
await page.close();
await browser.disconnect();
process.exit(result.pass ? 0 : 1);