// Album completion, chill mode, unlock tiers — persists across sessions
window.GameProgress = (function () {
  const KEY = 'eat-the-sounds-v1';
  const VINYL_IDS = ['moon', 'shelter', 'mirror'];
  const NPC_IDS = ['orph', 'simon', 'honey'];

  let state = {
    vinyls: [],
    vinylListens: 0,
    vinylListenCounts: {},
    npcs: [],
    wins: 0,
    runs: 0,
    bestScore: 0,
    bestSlices: 0,
    chillMode: false,
    lastRun: null,
    secrets: [],
    findCounts: { orph: 0, simon: 0, honey: 0 },
    findQuestComplete: false,
    inventory: [],
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = { ...state, ...JSON.parse(raw) };
    } catch (_) { /* ignore */ }
    state.vinyls = [...new Set(state.vinyls)];
    state.npcs = [...new Set(state.npcs)];
    state.secrets = [...new Set(state.secrets || [])];
    state.vinylListenCounts = state.vinylListenCounts || {};
    state.findCounts = state.findCounts || { orph: 0, simon: 0, honey: 0 };
    state.inventory = [...new Set(state.inventory || [])];
    state.findQuestComplete = state.findCounts.orph >= 3
      && state.findCounts.simon >= 3
      && state.findCounts.honey >= 3;
  }

  function getInventory() {
    return [...(state.inventory || [])];
  }

  function hasInventoryItem(id) {
    return !!id && state.inventory.includes(id);
  }

  function addInventoryItem(id) {
    if (!id || state.inventory.includes(id)) return false;
    state.inventory.push(id);
    save();
    return true;
  }

  function removeInventoryItem(id) {
    if (!id) return false;
    const idx = state.inventory.indexOf(id);
    if (idx < 0) return false;
    state.inventory.splice(idx, 1);
    save();
    return true;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) { /* ignore */ }
  }

  function recordVinyl(id) {
    if (!id) return;
    state.vinylListens = (state.vinylListens || 0) + 1;
    state.vinylListenCounts[id] = (state.vinylListenCounts[id] || 0) + 1;
    if (!state.vinyls.includes(id)) state.vinyls.push(id);
    save();
  }

  function getVinylListenCount(id) {
    if (id) return state.vinylListenCounts?.[id] || 0;
    return state.vinylListens || state.vinyls.length;
  }

  function recordNpc(id) {
    if (!id || state.npcs.includes(id)) return;
    state.npcs.push(id);
    save();
  }

  function recordRun({
    slices = 0, perfects = 0, score = 0, won = false, improv = 0, misses = 0,
    grooveChoice = 'keep',
  } = {}) {
    state.runs++;
    state.bestScore = Math.max(state.bestScore, score);
    state.bestSlices = Math.max(state.bestSlices, slices);
    if (won) state.wins++;
    state.lastRun = {
      slices, perfects, score, won, improv, misses, grooveChoice,
      at: Date.now(),
    };
    save();
    return getAlbumPct();
  }

  function getLastRun() {
    return state.lastRun ? { ...state.lastRun } : null;
  }

  function getAftermathTier(run = state.lastRun) {
    if (!run) return 'tasty';
    if (!run.won) return 'static';
    if (run.perfects >= 8 || run.improv >= 65) return 'wings';
    if (run.perfects >= 4 || run.score >= 1800) return 'groove';
    return 'tasty';
  }

  function getExplorationPct() {
    const v = state.vinyls.filter((id) => VINYL_IDS.includes(id)).length / VINYL_IDS.length;
    const n = state.npcs.filter((id) => NPC_IDS.includes(id)).length / NPC_IDS.length;
    return Math.round(((v + n) / 2) * 100);
  }

  function getAlbumPct() {
    const b = getAlbumBreakdown();
    return b.total;
  }

  function getAlbumBreakdown() {
    const exploreDetail = getExplorationPct();
    const explore = exploreDetail * 0.4;
    const rhythm = Math.min(100, (state.bestSlices / 15) * 100) * 0.35;
    const mastery = (state.wins > 0 ? 100 : 0) * 0.25;
    return {
      total: Math.min(100, Math.round(explore + rhythm + mastery)),
      explore: Math.round(explore),
      rhythm: Math.round(rhythm),
      mastery: Math.round(mastery),
      exploreDetail,
      bestSlices: state.bestSlices,
      wins: state.wins,
    };
  }

  function getUnlockTier() {
    const p = getAlbumPct();
    if (p >= 100) return 4;
    if (p >= 75) return 3;
    if (p >= 50) return 2;
    if (p >= 25) return 1;
    return 0;
  }

  function isChill() { return !!state.chillMode; }

  function setChill(on) {
    state.chillMode = !!on;
    save();
  }

  function toggleChill() {
    setChill(!state.chillMode);
    return state.chillMode;
  }

  function hasVinyl(id) {
    return state.vinyls.includes(id);
  }

  function unlockSecret(id) {
    if (!id || state.secrets.includes(id)) return false;
    state.secrets.push(id);
    save();
    return true;
  }

  function hasSecret(id) {
    return state.secrets.includes(id);
  }

  function getSecretCount() {
    return state.secrets.length;
  }

  function getEndVariant() {
    const tier = getUnlockTier();
    if (state.vinyls.includes('mirror')) {
      return {
        title: 'the mirror remembered you',
        subtitle: 'when its real... no words are needed.... theres wings in the glass.',
        extra: tier >= 3 ? 'mirror at the edge · whole album echo' : 'you listened to mirror before the bite',
      };
    }
    if (tier >= 4) return {
      title: 'whole album · side B',
      subtitle: 'when its real... no words are needed.... wings.',
      extra: 'you reassembled every echo. sarah smiles.',
    };
    if (tier >= 3) return {
      title: 'when its real',
      subtitle: 'theres a mirror at the edge of the world.. you see wings maybe.',
      extra: '',
    };
    if (tier >= 2) return {
      title: 'when its real',
      subtitle: 'no words are needed.... the groove remembers you.',
      extra: '',
    };
    return null;
  }

  function getSarahUnlockLine() {
    const tier = getUnlockTier();
    const lines = {
      1: 'you are filling the album. i notice.',
      2: 'moon · shelter · mirror — you listened. thank you.',
      3: 'almost whole. the mirror is warming up.',
      4: 'full album unlocked. drop the needle whenever — wings wait.',
    };
    return lines[tier] || null;
  }

  function drawHud(ctx, x, y, w) {
    const pct = getAlbumPct();
    ctx.fillStyle = 'rgba(10,8,18,0.82)';
    ctx.fillRect(x, y, w, 36);
    ctx.strokeStyle = '#7b5ea7';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, 36);
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = '#7b5ea7';
    ctx.textAlign = 'left';
    ctx.fillText('ALBUM', x + 8, y + 11);
    ctx.fillStyle = '#1a1028';
    ctx.fillRect(x + 8, y + 16, w - 16, 6);
    ctx.fillStyle = '#c45c7a';
    ctx.fillRect(x + 8, y + 16, (w - 16) * (pct / 100), 6);
    ctx.fillStyle = 'rgba(232,224,240,0.5)';
    ctx.fillText(`${pct}% · ${state.wins} wing${state.wins === 1 ? '' : 's'}`, x + 8, y + 30);
  }

  function reloadFromStorage() {
    load();
  }

  function resetSession() {
    state.lastRun = null;
    save();
  }

  function getFindCounts() {
    return { ...(state.findCounts || { orph: 0, simon: 0, honey: 0 }) };
  }

  function clampFind(n) {
    return Math.max(0, Math.min(3, Number(n) || 0));
  }

  function setFindCounts(counts) {
    state.findCounts = {
      orph: clampFind(counts?.orph),
      simon: clampFind(counts?.simon),
      honey: clampFind(counts?.honey),
    };
    state.findQuestComplete = state.findCounts.orph >= 3
      && state.findCounts.simon >= 3
      && state.findCounts.honey >= 3;
    save();
  }

  function resetFindQuest() {
    state.findCounts = { orph: 0, simon: 0, honey: 0 };
    state.findQuestComplete = false;
    save();
  }

  function isFindQuestComplete() {
    const c = state.findCounts || {};
    return c.orph >= 3 && c.simon >= 3 && c.honey >= 3;
  }

  function setLastRun(run) {
    state.lastRun = run ? { ...run, at: Date.now() } : null;
    save();
  }

  function getSnapshot() {
    const lastRun = getLastRun();
    return {
      state: { ...state, vinyls: [...state.vinyls], npcs: [...state.npcs], secrets: [...state.secrets] },
      lastRun,
      albumPct: getAlbumPct(),
      explorationPct: getExplorationPct(),
      unlockTier: getUnlockTier(),
      aftermathTier: getAftermathTier(lastRun),
    };
  }

  function getSarahHintLines(ow = {}) {
    const talked = new Set(ow.talked || []);
    const vinylSet = new Set(state.vinyls);
    const vinylHints = {
      moon: 'gold glow pad under soliloquy w/ moon — entrance room · north wall.',
      shelter: 'green glow pad — middle room · shelter from the storm.',
      mirror: 'purple glow pad — listening lounge · mirror edge.',
    };
    const mutualHints = {
      orph: 'orph · purple · left entrance aisle — stand on his glow pad · Z talk.',
      simon: 'simon · green · crate stacks center room — quick hello counts.',
      honey: 'honey · pink · listening lounge far right — she cheers loud.',
    };
    const findHints = {
      orph: 'storm traces — left stacks · green spines · ∴ glow pads.',
      simon: 'breadcrumbs — JAZZ poster · map note · chalk arrows.',
      honey: 'heartbeats — demo deck · pink rug · hi-fi plant.',
    };
    const lines = [];

    for (const id of VINYL_IDS) {
      if (!vinylSet.has(id)) {
        lines.push(`spin ${id} first.... ${vinylHints[id]}`);
        lines.push('stand on the glow tile · press Z · X stops the preview.');
        return lines;
      }
    }
    for (const id of NPC_IDS) {
      if (!talked.has(id)) {
        lines.push(`say hi to ${id}.... ${mutualHints[id]}`);
        lines.push('one short talk is enough to progress — explore more later if you want.');
        return lines;
      }
    }
    if (!isFindQuestComplete()) {
      for (const id of NPC_IDS) {
        const n = state.findCounts[id] || 0;
        if (n < 3) {
          lines.push(`${id} find quest ${n}/3 — ${findHints[id]}`);
          lines.push('face a ∴ glow pad in the shelves · press Z to examine.');
          return lines;
        }
      }
    }
    if ((state.secrets?.length || 0) < 2 && vinylSet.size >= 2) {
      lines.push('secrets hide in plain sight — moon window top wall · knock the front door.');
      lines.push('tap the register wood when nobody is watching.... old habit.');
      return lines;
    }
    if (!ow.sarahTalked && ow.mutualsComplete) {
      lines.push('come back to my counter — center room register row.');
      lines.push('we can chat forever or drop the needle when you are ready.');
      return lines;
    }
    lines.push('you have seen a lot tonight.... the aisles remember you.');
    lines.push('∴ pads still glow for optional lore · mutuals have deep revisit trees.');
    if (!state.wins) {
      lines.push('when you want rhythm — tell me drop the needle at the counter.');
    }
    return lines;
  }

  load();
  return {
    recordVinyl, recordNpc, recordRun, hasVinyl, getVinylListenCount,
    getAlbumPct, getAlbumBreakdown, getExplorationPct, getUnlockTier,
    isChill, setChill, toggleChill,
    getEndVariant, getSarahUnlockLine, drawHud,
    getLastRun, getAftermathTier, setLastRun,
    unlockSecret, hasSecret, getSecretCount,
    reloadFromStorage, resetSession, getSnapshot,
    getFindCounts, setFindCounts, resetFindQuest, isFindQuestComplete,
    getInventory, hasInventoryItem, addInventoryItem, removeInventoryItem,
    getSarahHintLines,
    getState: () => ({ ...state }),
  };
})();