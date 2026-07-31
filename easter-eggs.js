// Hidden discoveries — persisted via GameProgress.secrets
window.EasterEggs = (function () {
  const DFJK = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
  const VINYL_ORDER = ['moon', 'shelter', 'mirror'];

  const META = {
    dfjk: {
      toast: '∴ four keys in order · pizza unlocked',
      quote: 'pizza in the groove · the cathedral remembers',
    },
    mirror_glyph: {
      toast: '∴𓅰 the glass blinked back',
      quote: 'the watermark is also a door',
    },
    moon_window: {
      toast: 'moon window · soliloquy w/ you',
      quote: 'the moon shelf sees late-night walkers',
    },
    mirror_door: {
      toast: 'knock knock · edge of the world',
      quote: 'theres a mirror at the edge of the world..',
    },
    counter_knock: {
      toast: 'counter ring · sarah heard that',
      quote: 'when I worked here my favorite thing was listening to whole albums',
    },
    combo_42: {
      toast: 'combo 42 · answer is a slice',
      quote: 'in the groove we become pizza · in the mirror we become wings',
    },
    score_2222: {
      toast: 'score 2222 · double deuce groove',
      quote: 'listen to entire albums — let the groove teach your hands where to bite',
    },
    vinyl_triple: {
      toast: 'three spines · whole store heard',
      quote: 'three records out tonight if you want a preview',
    },
    wings_return: {
      toast: 'wings tier · hidden neon warms',
      quote: 'when its real... no words are needed....',
    },
    bird_guide: {
      toast: 'little bird guided out · music was the door',
      quote: 'sometimes the gentlest groove is an exit',
    },
  };

  let dfjkIdx = 0;
  let lastDfjkAt = 0;
  let lastSecretAt = 0;
  const SECRET_COOLDOWN_MS = 700;
  let mirrorTaps = 0;
  let mirrorTapTimer = null;
  let sessionVinyls = [];
  let allKeysSince = 0;
  let fired = new Set();

  function unlock(id) {
    if (!META[id] || !window.GameProgress?.unlockSecret) return null;
    const isNew = GameProgress.unlockSecret(id);
    if (isNew) lastSecretAt = Date.now();
    return isNew ? { id, ...META[id] } : null;
  }

  function has(id) {
    return window.GameProgress?.hasSecret?.(id) || false;
  }

  function count() {
    return window.GameProgress?.getSecretCount?.() || 0;
  }

  function resetSession() {
    sessionVinyls = [];
    fired.clear();
    dfjkIdx = 0;
    mirrorTaps = 0;
    clearTimeout(mirrorTapTimer);
    mirrorTapTimer = null;
  }

  function once(id, fn) {
    if (fired.has(id)) return null;
    fired.add(id);
    return fn();
  }

  function rhythmCompleted() {
    return (window.GameProgress?.getState?.()?.runs ?? 0) >= 1;
  }

  function onKey(code, phase) {
    if (dialogueBlocked(phase)) return null;
    if (!rhythmCompleted()) return null;
    if (Date.now() - lastSecretAt < SECRET_COOLDOWN_MS) return null;
    if (!DFJK.includes(code)) {
      dfjkIdx = 0;
      return null;
    }
    if (dfjkIdx === 0 && Date.now() - lastDfjkAt < SECRET_COOLDOWN_MS) return null;
    if (code === DFJK[dfjkIdx]) {
      dfjkIdx++;
      if (dfjkIdx >= DFJK.length) {
        dfjkIdx = 0;
        lastDfjkAt = Date.now();
        return unlock('dfjk');
      }
    } else {
      dfjkIdx = code === DFJK[0] ? 1 : 0;
    }
    return null;
  }

  function dialogueBlocked(phase) {
    if (phase === 'dialogue' || phase === 'rhythm') return true;
    if (document.body?.classList.contains('dialogue-active')) return true;
    const scene = document.getElementById('dialogueScene');
    if (scene && !scene.classList.contains('hidden')) return true;
    return false;
  }

  function onMirrorTap() {
    mirrorTaps++;
    clearTimeout(mirrorTapTimer);
    mirrorTapTimer = setTimeout(() => { mirrorTaps = 0; }, 2200);
    if (mirrorTaps >= 7) {
      mirrorTaps = 0;
      return unlock('mirror_glyph');
    }
    return null;
  }

  function onOverworldSpot(spot) {
    if (!META[spot]) return null;
    return unlock(spot);
  }

  function onVinylPreview(id) {
    if (!id || sessionVinyls.includes(id)) return checkVinylTriple();
    sessionVinyls.push(id);
    return checkVinylTriple();
  }

  function checkVinylTriple() {
    if (sessionVinyls.length < 3) return null;
    const have = VINYL_ORDER.every((v) => sessionVinyls.includes(v));
    if (!have) return null;
    return unlock('vinyl_triple');
  }

  function onRhythmCombo(n) {
    if (n !== 42) return null;
    return once('combo_42', () => unlock('combo_42'));
  }

  function onRhythmScore(n) {
    if (n < 2222 || has('score_2222')) return null;
    return once('score_2222', () => unlock('score_2222'));
  }

  function onAftermathEnter(tier) {
    if (tier !== 'wings') return null;
    return once('wings_return_session', () => unlock('wings_return'));
  }

  function getBonusMicroQuotes() {
    return Object.keys(META)
      .filter((id) => has(id))
      .map((id) => META[id].quote)
      .filter(Boolean);
  }

  function getSpotHint(spot) {
    const hints = {
      moon_window: '[Z] moon window · soliloquy',
      mirror_door: '[Z] knock · edge of the world',
      counter_knock: '[Z] tap counter · sarah hears',
    };
    return hints[spot] || null;
  }

  return {
    META, unlock, has, count, resetSession,
    onKey, onMirrorTap, onOverworldSpot, onVinylPreview,
    onRhythmCombo, onRhythmScore, onAftermathEnter,
    getBonusMicroQuotes, getSpotHint,
  };
})();