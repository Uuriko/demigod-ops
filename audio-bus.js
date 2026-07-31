// Shared Web Audio routing: compressor, rhythm ducking, mode state machine
window.AudioBus = (function () {
  const MASTER_LEVEL = 0.84;
  const VINYL_IDLE_LEVEL = 0.78;
  const VINYL_STORE_LEVEL = 0.98;
  const SFX_LEVEL = 0.78;
  const RHYTHM_NOMINAL = 0.82;
  const DUCK_LEVEL = 0.48;
  const MODE_LOCK_MS = 120;

  function create(ctx) {
    const mix = ctx.createGain();
    mix.gain.value = 1;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 10;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.16;
    mix.connect(compressor);
    compressor.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.value = MASTER_LEVEL;
    masterGain.connect(mix);

    const vinylGain = ctx.createGain();
    vinylGain.gain.value = VINYL_IDLE_LEVEL;
    const vinylLp = ctx.createBiquadFilter();
    vinylLp.type = 'lowpass';
    vinylLp.frequency.value = 5200;
    vinylLp.Q.value = 0.6;
    vinylGain.connect(vinylLp);
    vinylLp.connect(mix);

    const rhythmGain = ctx.createGain();
    rhythmGain.gain.value = RHYTHM_NOMINAL;
    rhythmGain.connect(mix);

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = SFX_LEVEL;
    sfxGain.connect(mix);

    let mode = 'idle';
    let modeLock = false;
    let pendingMode = null;
    let handlers = {
      stopVinyl: null,
      stopRhythm: null,
      stopEcho: null,
      stopQuotes: null,
    };

    function registerHandlers(h) {
      handlers = { ...handlers, ...h };
    }

    function stopRhythmClean() {
      const loop = handlers.stopRhythm;
      if (typeof loop === 'function') loop();
    }

    function stopVinylClean(fadeSec = 0.28) {
      const fn = handlers.stopVinyl;
      if (typeof fn === 'function') fn(fadeSec);
    }

    function applyModeGains(next, prev) {
      const t = ctx.currentTime;
      if (next === 'rhythm') {
        vinylGain.gain.cancelScheduledValues(t);
        vinylGain.gain.setTargetAtTime(0.001, t, 0.1);
        rhythmGain.gain.cancelScheduledValues(t);
        rhythmGain.gain.setTargetAtTime(RHYTHM_NOMINAL, t, 0.18);
      } else if (prev === 'rhythm') {
        rhythmGain.gain.cancelScheduledValues(t);
        rhythmGain.gain.setTargetAtTime(0.001, t, 0.06);
      }
      if (next === 'store') {
        vinylGain.gain.cancelScheduledValues(t);
        if (prev === 'rhythm') {
          vinylGain.gain.setValueAtTime(VINYL_STORE_LEVEL, t);
        } else {
          vinylGain.gain.setTargetAtTime(VINYL_STORE_LEVEL, t, 0.35);
        }
      } else if (next === 'idle' || next === 'dialogue') {
        vinylGain.gain.cancelScheduledValues(t);
        vinylGain.gain.setTargetAtTime(VINYL_IDLE_LEVEL, t, 0.25);
      }
    }

    function setMode(next) {
      if (modeLock) {
        pendingMode = next;
        return mode;
      }
      if (mode === next) return mode;
      modeLock = true;
      pendingMode = null;
      const prev = mode;

      if (prev === 'rhythm') {
        const t = ctx.currentTime;
        rhythmGain.gain.cancelScheduledValues(t);
        rhythmGain.gain.setValueAtTime(0, t);
        vinylGain.gain.cancelScheduledValues(t);
        sfxGain.gain.cancelScheduledValues(t);
        stopRhythmClean();
        handlers.stopQuotes?.();
      }

      const stopVinyl = prev === 'store'
        || next === 'rhythm'
        || (prev === 'rhythm' && next !== 'store')
        || next === 'dialogue'
        || next === 'idle';
      const fadeSec = prev === 'rhythm' && next === 'store' ? 0.42
        : prev === 'store' && next !== 'rhythm' ? 0.32
          : 0.2;
      if (stopVinyl) stopVinylClean(fadeSec);
      if (next === 'rhythm' || prev === 'store') handlers.stopEcho?.();

      if (next === 'dialogue' || next === 'idle') {
        handlers.stopQuotes?.();
      }

      applyModeGains(next, prev);
      mode = next;

      setTimeout(() => {
        modeLock = false;
        if (pendingMode && pendingMode !== mode) {
          const queued = pendingMode;
          pendingMode = null;
          setMode(queued);
        }
      }, MODE_LOCK_MS);
      return mode;
    }

    function duckRhythm(holdSec = 0.13, level = DUCK_LEVEL) {
      if (mode !== 'rhythm') return;
      const t = ctx.currentTime;
      rhythmGain.gain.cancelScheduledValues(t);
      rhythmGain.gain.setValueAtTime(rhythmGain.gain.value, t);
      rhythmGain.gain.linearRampToValueAtTime(level, t + 0.012);
      rhythmGain.gain.linearRampToValueAtTime(RHYTHM_NOMINAL, t + holdSec);
    }

    async function resume() {
      if (ctx.state === 'suspended') await ctx.resume();
    }

    function ensureVinylAudible(level = VINYL_STORE_LEVEL) {
      const t = ctx.currentTime;
      vinylGain.gain.cancelScheduledValues(t);
      vinylGain.gain.setValueAtTime(level, t);
    }

    async function resumeAndResetGain(level = VINYL_STORE_LEVEL) {
      await resume();
      ensureVinylAudible(level);
      return mode;
    }

    function snapGains() {
      const t = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(MASTER_LEVEL, t);
      rhythmGain.gain.cancelScheduledValues(t);
      rhythmGain.gain.setValueAtTime(mode === 'rhythm' ? RHYTHM_NOMINAL : 0.001, t);
      sfxGain.gain.cancelScheduledValues(t);
      sfxGain.gain.setValueAtTime(SFX_LEVEL, t);
      vinylGain.gain.cancelScheduledValues(t);
      const vinylLevel = mode === 'store' ? VINYL_STORE_LEVEL
        : mode === 'rhythm' ? 0.001 : VINYL_IDLE_LEVEL;
      vinylGain.gain.setValueAtTime(vinylLevel, t);
    }

    return {
      ctx,
      masterGain,
      vinylGain,
      rhythmGain,
      sfxGain,
      compressor,
      RHYTHM_NOMINAL,
      getMode: () => mode,
      setMode,
      registerHandlers,
      duckRhythm,
      resume,
      ensureVinylAudible,
      resumeAndResetGain,
      snapGains,
    };
  }

  return {
    create, RHYTHM_NOMINAL, DUCK_LEVEL,
    MASTER_LEVEL, VINYL_IDLE_LEVEL, VINYL_STORE_LEVEL, SFX_LEVEL,
  };
})();