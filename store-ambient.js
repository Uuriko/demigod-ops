// Late-night store jazz — seamless looping ballad, ducks under vinyl previews
window.StoreAmbient = (function () {
  let ctx, dest, mixBus, lookaheadId = null;
  let live = [], active = false, session = 0;
  let loopEnd = 0, section = 0;
  let fadeToken = 0;

  const BPM = 64;
  const LOOP_BARS = 32;
  const SCHEDULE_BARS = 4;
  const LOOKAHEAD_SEC = 2.8;
  const LOOKAHEAD_MS = 90;
  const MASTER_LEVEL = 0.94;
  const DUCK_DIALOGUE = 0.22;
  let musicBlocked = false;
  const VOLUME_BOOST = 2.65;

  const AM7 = [220, 261.63, 329.63, 392];
  const Dm7 = [196, 233.08, 293.66, 349.23];
  const Gm7 = [174.61, 207.65, 261.63, 311.13];
  const C7 = [196, 246.94, 311.13, 369.99];
  const Fmaj = [174.61, 220, 261.63, 329.63];
  const PROG_A = [AM7, Dm7, Gm7, C7];
  const PROG_B = [AM7, Fmaj, Dm7, C7, Gm7, Dm7, AM7, C7];

  function spb() { return 60 / BPM; }
  function barDur() { return spb() * 4; }
  function loopDur() { return LOOP_BARS * barDur(); }

  function init(audioCtx, destination) {
    ctx = audioCtx;
    dest = destination;
    if (mixBus) return;
    mixBus = ctx.createGain();
    mixBus.gain.value = 1;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    lp.Q.value = 0.55;
    const delay = ctx.createDelay(1.8);
    delay.delayTime.value = 0.38;
    const fb = ctx.createGain();
    fb.gain.value = 0.18;
    const wet = ctx.createGain();
    wet.gain.value = 0.14;
    const dry = ctx.createGain();
    dry.gain.value = 0.86;
    mixBus.connect(dry);
    dry.connect(lp);
    lp.connect(dest);
    mixBus.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(lp);
  }

  function isReady() {
    return !!(ctx && dest && mixBus);
  }

  function disposeNodes(nodes = live) {
    nodes.forEach((n) => {
      try {
        if (n.stop) n.stop(0);
        n.disconnect?.();
      } catch (_) { /* already stopped */ }
    });
    if (nodes === live) live = [];
  }

  function hardStop() {
    session += 1;
    fadeToken += 1;
    if (lookaheadId) clearInterval(lookaheadId);
    lookaheadId = null;
    disposeNodes();
    active = false;
    loopEnd = 0;
    section = 0;
  }

  function fadeOut(sec = 0.55) {
    if (!ctx || !dest) return hardStop();
    session += 1;
    const token = ++fadeToken;
    active = false;
    if (lookaheadId) clearInterval(lookaheadId);
    lookaheadId = null;
    const t = ctx.currentTime;
    dest.gain.cancelScheduledValues(t);
    dest.gain.setValueAtTime(dest.gain.value, t);
    dest.gain.linearRampToValueAtTime(0.001, t + sec);
    setTimeout(() => {
      if (token !== fadeToken) return;
      disposeNodes();
      if (dest) dest.gain.setValueAtTime(0, ctx.currentTime);
    }, Math.ceil(sec * 1000) + 50);
  }

  function stopForMusic(sec = 0.45) {
    musicBlocked = true;
    if (sec <= 0.12) {
      hardStop();
      if (ctx && dest) dest.gain.setValueAtTime(0, ctx.currentTime);
      return;
    }
    fadeOut(sec);
  }

  function startEngine(level = MASTER_LEVEL) {
    if (!ctx || !dest || !mixBus || musicBlocked) return false;
    if (ctx.state === 'suspended') ctx.resume?.().catch(() => {});
    session += 1;
    active = true;
    section = 0;
    loopEnd = 0;
    const sid = session;
    fadeIn(0.45, level);
    if (lookaheadId) clearInterval(lookaheadId);
    lookaheadId = setInterval(() => {
      if (!active || sid !== session) return;
      tickLookahead();
    }, LOOKAHEAD_MS);
    tickLookahead();
    return true;
  }

  function setLevel(level, sec = 0.35) {
    if (!ctx || !dest || musicBlocked) return;
    if (!active) startEngine(level);
    if (!active) return;
    fadeIn(sec, level);
  }

  function fadeIn(sec = 1.1, level = MASTER_LEVEL) {
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    dest.gain.cancelScheduledValues(t);
    const cur = dest.gain.value;
    if (sec <= 0.12 || cur < 0.02) {
      dest.gain.setValueAtTime(level, t);
      return;
    }
    dest.gain.setValueAtTime(cur, t);
    dest.gain.linearRampToValueAtTime(level, t + sec);
  }

  function scheduleNote(freq, when, dur, vol, type = 'triangle', opts = {}) {
    const now = ctx.currentTime;
    const startAt = Math.max(when, now + 0.002);
    const boosted = vol * VOLUME_BOOST;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = type;
    o.frequency.setValueAtTime(freq, startAt);
    if (opts.detune) o.detune.value = opts.detune;
    f.type = opts.filter || 'lowpass';
    f.frequency.value = opts.filterHz || 3200;
    const atk = opts.attack ?? 0.04;
    const rel = opts.release ?? 0.12;
    g.gain.setValueAtTime(0, startAt);
    g.gain.linearRampToValueAtTime(boosted, startAt + atk);
    g.gain.exponentialRampToValueAtTime(0.001, startAt + Math.max(dur, atk + rel));
    o.connect(f);
    f.connect(g);
    g.connect(mixBus);
    o.start(startAt);
    o.stop(startAt + dur + 0.06);
    live.push(o);
  }

  function scheduleChord(freqs, when, dur, vol, type = 'triangle') {
    freqs.forEach((fr, i) => {
      scheduleNote(fr, when, dur, vol * (0.9 - i * 0.06), type, {
        detune: (i - 1.5) * 4,
        filterHz: 2400,
        attack: 0.08,
        release: 0.2,
      });
    });
  }

  function scheduleBrush(when, vol, swing = 0) {
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const e = 1 - i / len;
      d[i] = (Math.random() * 2 - 1) * e * e;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 4800;
    f.Q.value = 0.5;
    g.gain.value = vol * VOLUME_BOOST;
    src.connect(f);
    f.connect(g);
    g.connect(mixBus);
    const start = Math.max(when + swing, now + 0.002);
    src.start(start);
    src.stop(start + 0.11);
    live.push(src);
  }

  function at(t0, beat) {
    return t0 + beat * spb();
  }

  function scheduleComp(t0, prog, bars, vol = 0.042, barOffset = 0) {
    const b = spb();
    const swing = b * 0.065;
    for (let bar = 0; bar < bars; bar++) {
      const chord = prog[bar % prog.length];
      const barStart = t0 + bar * barDur();
      scheduleChord(chord, barStart + swing, b * 1.9, vol);
      scheduleChord(chord, barStart + 2 * b + swing, b * 1.5, vol * 0.82);
    }
  }

  function scheduleWalk(t0, degrees, bars, vol = 0.095, barOffset = 0) {
    const b = spb();
    const roots = [41.2, 43.65, 46.25, 49, 51.91, 55, 58.27, 61.74];
    const steps = [0, 2, 1, 2, -1, 2, 0, -1, 1, 0];
    for (let bar = 0; bar < bars; bar++) {
      const root = roots[(degrees[(barOffset + bar) % degrees.length]) % roots.length];
      [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].forEach((beat, i) => {
        const semi = steps[((barOffset + bar) * 2 + i) % steps.length];
        scheduleNote(root * 2 ** (semi / 12), at(t0, bar * 4 + beat), b * 0.36, vol, 'sine', {
          filterHz: 420,
          attack: 0.01,
          release: 0.05,
        });
      });
    }
  }

  function scheduleBrushes(t0, bars, density = 0.82, barOffset = 0) {
    const b = spb();
    const swing = b * 0.07;
    for (let bar = 0; bar < bars; bar++) {
      for (let i = 0; i < 8; i++) {
        const idx = (barOffset + bar) * 8 + i;
        if (i % 2 === 1 && Math.random() > density) continue;
        const beat = bar * 4 + i * 0.5;
        const when = at(t0, beat);
        if (i % 8 === 4) {
          scheduleNote(900 + Math.random() * 80, when, 0.06, 0.02, 'square', {
            filter: 'highpass',
            filterHz: 3400,
            attack: 0.002,
            release: 0.04,
          });
        } else {
          scheduleBrush(when, 0.024 + (i % 4) * 0.004, swing * (i % 2));
        }
      }
    }
  }

  function scheduleMelodySlice(t0, variant, barOffset, bars) {
    const eventsA = [
      [8, 392, 2, 0.05], [12, 440, 1.5, 0.048], [16, 392, 2.5, 0.046],
      [24, 349.23, 3, 0.044], [32, 329.63, 2, 0.042], [40, 392, 3, 0.046],
      [48, 440, 2, 0.048], [56, 392, 4, 0.044], [68, 349.23, 3, 0.042],
      [80, 329.63, 5, 0.04], [96, 392, 6, 0.038],
    ];
    const eventsB = [
      [4, 523.25, 1.5, 0.052], [8, 493.88, 2, 0.05], [14, 440, 2.5, 0.048],
      [20, 392, 3, 0.046], [28, 440, 2, 0.048], [36, 493.88, 2.5, 0.05],
      [44, 523.25, 2, 0.052], [52, 587.33, 1.5, 0.054], [60, 523.25, 3, 0.05],
      [72, 493.88, 4, 0.046], [88, 440, 5, 0.044], [104, 392, 6, 0.042],
    ];
    const events = variant % 2 === 0 ? eventsA : eventsB;
    const startBeat = barOffset * 4;
    const endBeat = startBeat + bars * 4;
    events.forEach(([beat, freq, len, vol]) => {
      if (beat < startBeat || beat >= endBeat) return;
      scheduleNote(freq, at(t0, beat - startBeat), len * spb(), vol, 'triangle', {
        filterHz: 2800,
        attack: 0.03,
        release: 0.14,
      });
    });
  }

  function schedulePadSlice(t0, bars, barOffset = 0) {
    for (let bar = 0; bar < bars; bar++) {
      const chord = PROG_A[(barOffset + bar) % PROG_A.length];
      const root = chord[0] / 2;
      scheduleNote(root, t0 + bar * barDur(), barDur() * 0.95, 0.026, 'sine', {
        filterHz: 280,
        attack: 0.6,
        release: 0.35,
      });
    }
  }

  function scheduleBars(t0, barOffset, bars, variant = 0) {
    const walkA = [0, 1, 2, 1, 3, 2, 1, 0];
    const walkB = [0, 1, 2, 3, 2, 1, 0, 4];
    const walk = barOffset < LOOP_BARS / 2 ? walkA : walkB;
    const prog = barOffset < LOOP_BARS / 2 ? PROG_A : PROG_B;
    schedulePadSlice(t0, bars, barOffset);
    scheduleWalk(t0, walk, bars, 0.088, barOffset);
    scheduleComp(t0, prog, bars, barOffset < LOOP_BARS / 2 ? 0.038 : 0.034, barOffset);
    scheduleBrushes(t0, bars, 0.78, barOffset);
    scheduleMelodySlice(t0, variant, barOffset, bars);
    return t0 + bars * barDur();
  }

  function pruneLive() {
    if (live.length > 3600) {
      disposeNodes(live.splice(0, live.length - 2800));
    }
  }

  function tickLookahead() {
    if (!active || !ctx) return;
    const now = ctx.currentTime;
    const horizon = now + LOOKAHEAD_SEC;
    if (loopEnd <= 0) loopEnd = now + 0.08;
    while (loopEnd < horizon) {
      const barOffset = section % LOOP_BARS;
      const barsLeft = LOOP_BARS - barOffset;
      const chunk = Math.min(SCHEDULE_BARS, barsLeft);
      loopEnd = scheduleBars(loopEnd, barOffset, chunk, Math.floor(section / LOOP_BARS));
      section += chunk;
    }
    pruneLive();
  }

  function beginLoop(level = MASTER_LEVEL) {
    return startEngine(level);
  }

  function start() {
    musicBlocked = false;
    ensurePlaying();
  }

  function ensurePlaying(level = MASTER_LEVEL) {
    if (!ctx || !dest || !mixBus || musicBlocked) return;
    if (ctx.state === 'suspended') ctx.resume?.().catch(() => {});
    if (!active) {
      beginLoop(level);
      return;
    }
    if (dest.gain.value < level - 0.03) fadeIn(0.55, level);
    tickLookahead();
  }

  function resumeIfStore() {
    musicBlocked = false;
    if (!active) beginLoop(MASTER_LEVEL);
    else fadeIn(0.65, MASTER_LEVEL);
    tickLookahead();
  }

  return {
    init, start, stop: hardStop, fadeOut, fadeIn, resumeIfStore,
    ensurePlaying, stopForMusic, setLevel, isReady,
    DUCK_DIALOGUE, MASTER_LEVEL,
    isActive: () => active,
    isMusicBlocked: () => musicBlocked,
  };
})();