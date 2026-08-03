// Multi-movement jazz albums — accurate playback duration for store vinyl HUD
window.VinylAudio = (function () {
  let ctx, dest, tap = null, current = null, stopTimer = null, fadeTimer = null, currentId = null, stopHook = null;
  let fxBus = null;
  let fading = false;
  let fadeSnapshot = null;
  const LOOKAHEAD_SEC = 2.8;
  const LOOKAHEAD_TICK_MS = 100;
  const STORE_PREVIEW_SEC = 28;
  const VOLUME_BOOST = 2.9;
  let sessionId = 0;

  function isSourceNode(n) {
    return n && (typeof OscillatorNode !== 'undefined' && n instanceof OscillatorNode
      || typeof AudioBufferSourceNode !== 'undefined' && n instanceof AudioBufferSourceNode);
  }

  function disposeScheduled(nodes) {
    if (!nodes?.length) return;
    nodes.forEach((n) => {
      try {
        if (isSourceNode(n)) n.stop(0);
        n.disconnect?.();
      } catch (_) { /* already stopped */ }
    });
    nodes.length = 0;
  }

  function spb(bpm) { return 60 / bpm; }

  function disposeFx() {
    if (!fxBus) return;
    try {
      fxBus.dry?.disconnect?.();
      fxBus.wet?.disconnect?.();
      fxBus.delay?.disconnect?.();
      fxBus.fb?.disconnect?.();
      fxBus.lp?.disconnect?.();
    } catch (_) { /* already torn down */ }
    fxBus = null;
  }

  function ensureFx() {
    const busDest = tap || dest;
    if (fxBus || !ctx || !busDest) return fxBus;
    const dry = ctx.createGain();
    dry.gain.value = 0.7;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    const delay = ctx.createDelay(1.4);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    dry.connect(busDest);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(lp);
    lp.connect(wet);
    wet.connect(busDest);
    fxBus = { dry, wet, delay, lp };
    return fxBus;
  }

  function createJazzScheduler(audioCtx, destination, t0) {
    const eventQueue = [];
    const liveNodes = [];
    let endTime = t0;
    let lookaheadId = null;
    let maxScheduleTime = Infinity;

    function inWindow(when) {
      return when < maxScheduleTime;
    }

    function extend(when, durSec = 0) {
      const t = Math.min(when + durSec, maxScheduleTime);
      if (t > endTime) endTime = t;
    }

    function scheduleNoteEvent(ev) {
      let { freq, when, dur, vol, type, opts = {} } = ev;
      if (when >= maxScheduleTime) return;
      dur = Math.min(dur, Math.max(0.02, maxScheduleTime - when));
      const boostedVol = vol * VOLUME_BOOST;
      const now = audioCtx.currentTime;
      const startAt = Math.max(when, now + 0.002);
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const f = audioCtx.createBiquadFilter();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, startAt);
      if (opts.detune) o.detune.value = opts.detune;
      f.type = opts.filter || 'lowpass';
      f.frequency.value = opts.filterHz || 4200;
      const atk = opts.attack ?? 0.035;
      g.gain.setValueAtTime(0, startAt);
      g.gain.linearRampToValueAtTime(boostedVol, startAt + atk);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
      o.connect(f);
      f.connect(g);
      const bus = ensureFx();
      if (opts.room && bus) {
        g.connect(bus.dry);
        g.connect(bus.delay);
      } else {
        g.connect(destination);
      }
      o.start(startAt);
      o.stop(startAt + dur + 0.05);
      liveNodes.push(o, g, f);
    }

    function scheduleBrushEvent(ev) {
      const { when, vol, swing = 0 } = ev;
      const now = audioCtx.currentTime;
      const len = Math.floor(audioCtx.sampleRate * 0.042);
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const e = 1 - i / len;
        d[i] = (Math.random() * 2 - 1) * e * e;
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const g = audioCtx.createGain();
      const f = audioCtx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 5200;
      f.Q.value = 0.55;
      g.gain.value = vol * VOLUME_BOOST;
      src.connect(f);
      f.connect(g);
      g.connect(destination);
      const start = Math.max(when + swing, now + 0.002);
      src.start(start);
      src.stop(start + 0.12);
      liveNodes.push(src, g, f);
    }

    function dispatch(ev) {
      if (ev.kind === 'brush') scheduleBrushEvent(ev);
      else scheduleNoteEvent(ev);
    }

    function pruneLiveNodes() {
      if (liveNodes.length > 2800) {
        disposeScheduled(liveNodes.splice(0, liveNodes.length - 2200));
      }
    }

    function flush() {
      const now = audioCtx.currentTime;
      const horizon = now + LOOKAHEAD_SEC;
      while (eventQueue.length && eventQueue[0].when <= horizon) {
        const ev = eventQueue.shift();
        if (ev.when < now - 0.08) continue;
        dispatch(ev);
      }
      pruneLiveNodes();
    }

    function note(freq, when, dur, vol, type, opts = {}) {
      if (!inWindow(when)) return;
      eventQueue.push({ kind: 'note', freq, when, dur, vol, type, opts });
      extend(when, dur);
    }

    function chord(freqs, when, dur, vol, type = 'triangle') {
      if (!inWindow(when)) return;
      freqs.forEach((fr, i) => {
        note(fr, when, dur, vol * (0.92 - i * 0.07), type, {
          detune: (i - 1.5) * 5,
          filterHz: 2600,
          room: true,
          attack: 0.07,
          release: 0.18,
        });
      });
    }

    function brush(when, vol, swing = 0) {
      if (!inWindow(when)) return;
      eventQueue.push({ kind: 'brush', when, vol, swing });
      extend(when + swing, 0.05);
    }

    function ride(when, vol) {
      if (!inWindow(when)) return;
      note(1100 + Math.random() * 120, when, 0.07, vol, 'square', {
        filter: 'highpass',
        filterHz: 3800,
        attack: 0.002,
        release: 0.05,
      });
    }

    function walk(schedAt, bpm, degrees, bars, vol = 0.088) {
      const b = spb(bpm);
      const roots = [41.2, 43.65, 46.25, 49, 51.91, 55, 58.27, 61.74];
      const steps = [0, 2, 1, 2, -1, 2, 0, -1, 1, 0];
      for (let bar = 0; bar < bars; bar++) {
        const root = roots[degrees[bar % degrees.length] % roots.length];
        [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].forEach((beat, i) => {
          const when = schedAt(bar * 4 + beat);
          if (!inWindow(when)) return;
          const semi = steps[(bar * 2 + i) % steps.length];
          note(root * Math.pow(2, semi / 12), when, b * 0.38, vol, 'sine', {
            filterHz: 380,
            attack: 0.008,
            release: 0.04,
          });
        });
      }
    }

    function comp(schedAt, bpm, prog, bars, vol = 0.028) {
      const b = spb(bpm);
      const swing = b * 0.06;
      for (let bar = 0; bar < bars; bar++) {
        const when = schedAt(bar * 4);
        if (!inWindow(when)) break;
        chord(prog[bar % prog.length], when + swing, b * 1.8, vol);
        chord(prog[bar % prog.length], when + 2 * b + swing, b * 1.6, vol * 0.85);
      }
    }

    function brushes(schedAt, bpm, bars, density = 1) {
      const b = spb(bpm);
      const swing = b * 0.07;
      for (let i = 0; i < bars * 8; i++) {
        if (i % 2 === 1 && Math.random() > density) continue;
        const beat = i * 0.5;
        const when = schedAt(beat);
        if (!inWindow(when)) break;
        if (i % 8 === 4) ride(when, 0.02);
        else brush(when, 0.024 + (i % 4) * 0.004, swing * (i % 2));
      }
    }

    function melody(schedAt, bpm, events) {
      const b = spb(bpm);
      events.forEach(([beat, freq, len, vol]) => {
        if (!freq) return;
        const when = schedAt(beat);
        if (!inWindow(when)) return;
        note(freq, when, len * b, vol ?? 0.05, 'triangle', { room: true, attack: 0.02 });
      });
    }

    function piano(schedAt, bpm, prog, bars, vol = 0.044) {
      const b = spb(bpm);
      const swing = b * 0.055;
      for (let bar = 0; bar < bars; bar++) {
        const chord = prog[bar % prog.length];
        const barStart = schedAt(bar * 4);
        if (!inWindow(barStart)) break;
        const shell = [chord[0], chord[1], chord[2]];
        shell.forEach((fr, i) => {
          note(fr, barStart + swing, b * 0.55, vol * (1 - i * 0.12), 'triangle', {
            filterHz: 2200, room: true, attack: 0.006, release: 0.08,
          });
          note(fr, barStart + 2 * b + swing, b * 0.42, vol * 0.82, 'triangle', {
            filterHz: 2000, room: true, attack: 0.005, release: 0.06,
          });
        });
      }
    }

    function rhodes(schedAt, bpm, events) {
      const b = spb(bpm);
      events.forEach(([beat, freq, len, vol]) => {
        if (!freq) return;
        const when = schedAt(beat);
        if (!inWindow(when)) return;
        note(freq, when, len * b, vol ?? 0.055, 'sine', {
          detune: 6,
          filterHz: 3400,
          room: true,
          attack: 0.012,
          release: 0.14,
        });
      });
    }

    function pad(schedAt, bpm, prog, bars, vol = 0.024) {
      const b = spb(bpm);
      for (let bar = 0; bar < bars; bar++) {
        const chord = prog[bar % prog.length];
        const when = schedAt(bar * 4);
        if (!inWindow(when)) break;
        chord.forEach((fr, i) => {
          note(fr / 2, when, b * 3.6, vol * (0.9 - i * 0.08), 'sine', {
            filterHz: 520, attack: 0.35, release: 0.4,
          });
        });
      }
    }

    function setMaxTime(t) {
      maxScheduleTime = t;
      endTime = Math.min(endTime, t);
    }

    function trimQueue() {
      let i = eventQueue.length;
      while (i--) {
        if (eventQueue[i].when >= maxScheduleTime) eventQueue.splice(i, 1);
      }
      endTime = Math.min(endTime, maxScheduleTime);
    }

    function startLookahead() {
      eventQueue.sort((a, b) => a.when - b.when);
      const bootstrapHorizon = audioCtx.currentTime + 4;
      while (eventQueue.length && eventQueue[0].when <= bootstrapHorizon) {
        const ev = eventQueue.shift();
        if (ev.when >= audioCtx.currentTime - 0.08) dispatch(ev);
      }
      flush();
      lookaheadId = setInterval(flush, LOOKAHEAD_TICK_MS);
    }

    function stopLookahead() {
      if (lookaheadId) clearInterval(lookaheadId);
      lookaheadId = null;
    }

    function disposeAll() {
      stopLookahead();
      disposeScheduled(liveNodes);
      liveNodes.length = 0;
      eventQueue.length = 0;
    }

    return {
      t0,
      nodes: liveNodes,
      liveNodes,
      pendingCount: () => eventQueue.length,
      getDurationMs: () => Math.ceil((Math.min(endTime, maxScheduleTime) - t0) * 1000) + 200,
      setMaxTime, trimQueue,
      note,
      chord,
      brush,
      walk,
      comp,
      brushes,
      melody,
      piano,
      rhodes,
      pad,
      extend,
      startLookahead,
      stopLookahead,
      disposeAll,
    };
  }

  function playAlbumMovements(movements, sched, maxPreviewSec = STORE_PREVIEW_SEC, previewFirst = null) {
    const songs = [];
    let timeCursor = sched.t0;
    const GAP_SEC = 0.55;
    const previewEnd = sched.t0 + maxPreviewSec;
    const queue = previewFirst ? [previewFirst, ...movements] : movements;

    for (let index = 0; index < queue.length; index++) {
      const mv = queue[index];
      const bpm = mv.bpm;
      const b = spb(bpm);
      const startAudio = timeCursor;
      if (startAudio >= previewEnd) break;
      const at = (beat) => startAudio + beat * b;
      const movementEnd = startAudio + mv.bars * 4 * b;
      const cappedBars = movementEnd > previewEnd
        ? Math.max(2, Math.floor((previewEnd - startAudio) / (4 * b)))
        : mv.bars;

      mv.compose({ at, bpm, b, sched, bars: cappedBars });
      const endAudio = startAudio + cappedBars * 4 * b;
      sched.extend(endAudio, 0.15);
      songs.push({
        index,
        title: mv.title,
        startMs: Math.round((startAudio - sched.t0) * 1000),
        durationMs: Math.ceil(cappedBars * 4 * b * 1000),
      });
      timeCursor = endAudio + GAP_SEC;
      if (timeCursor >= previewEnd) break;
    }

    const capMs = Math.min(sched.getDurationMs(), maxPreviewSec * 1000);
    return { durationMs: capMs, songs, preview: true };
  }

  // ── Album movements ──────────────────────────────────────────

  const AM7 = [220, 261.63, 329.63, 392];
  const Dm7 = [196, 233.08, 293.66, 349.23];
  const Gm7 = [174.61, 207.65, 261.63, 311.13];
  const C7 = [196, 246.94, 311.13, 369.99];
  const Fmaj = [174.61, 220, 261.63, 329.63];

  const ALBUMS = {
    moon: {
      title: 'soliloquy w/ moon',
      preview: {
        title: 'gold window (preview)',
        bpm: 74,
        bars: 20,
        compose({ at, bpm, sched, bars }) {
          const prog = [AM7, Dm7, Gm7, C7];
          sched.pad(at, bpm, prog, bars, 0.028);
          sched.walk(at, bpm, [0, 1, 2, 1, 3, 2, 1, 0], bars, 0.11);
          sched.piano(at, bpm, prog, bars, 0.048);
          sched.melody(at, bpm, [
            [0, 392, 1.5, 0.062], [2, 440, 1, 0.06], [4, 523.25, 2, 0.066],
            [8, 587.33, 1.5, 0.064], [12, 523.25, 2, 0.062], [16, 440, 2.5, 0.058],
            [22, 392, 3, 0.056], [28, 440, 2, 0.058], [34, 523.25, 3, 0.062],
            [42, 587.33, 2, 0.064], [48, 659.25, 4, 0.066], [56, 587.33, 3, 0.062],
            [64, 523.25, 5, 0.058], [72, 440, 6, 0.054],
          ]);
          sched.brushes(at, bpm, bars, 0.88);
        },
      },
      movements: [
        {
          title: 'window light',
          bpm: 72,
          bars: 40,
          compose({ at, bpm, sched, bars }) {
            const prog = [AM7, Dm7, Gm7, C7];
            sched.comp(at, bpm, prog, bars, 0.026);
            sched.melody(at, bpm, [
              [4, 392, 2, 0.045], [8, 440, 1.5, 0.042], [12, 392, 2, 0.04],
              [16, 349.23, 3, 0.038], [24, 329.63, 2, 0.036], [28, 392, 2.5, 0.042],
              [34, 440, 2, 0.04], [40, 392, 4, 0.035], [48, 440, 2, 0.04],
              [56, 392, 3, 0.038], [64, 349.23, 4, 0.036], [72, 329.63, 5, 0.034],
              [84, 392, 6, 0.032], [96, 440, 4, 0.035], [108, 392, 8, 0.03],
            ]);
            sched.brushes(at, bpm, bars, 0.7);
            sched.walk(at, bpm, [0, 1, 2, 1, 3, 2, 1, 0], bars, 0.07);
          },
        },
        {
          title: 'soliloquy',
          bpm: 66,
          bars: 56,
          compose({ at, bpm, sched, bars }) {
            const prog = [AM7, Dm7, Gm7, C7, Fmaj, Dm7, AM7, C7];
            sched.comp(at, bpm, prog, bars, 0.03);
            sched.melody(at, bpm, [
              [2, 523.25, 1.5, 0.052], [4, 587.33, 1, 0.048], [6, 659.25, 2, 0.055],
              [10, 587.33, 1, 0.05], [12, 523.25, 2, 0.052], [16, 493.88, 1.5, 0.048],
              [20, 440, 2, 0.045], [24, 392, 3, 0.042], [28, 440, 1, 0.048],
              [32, 493.88, 2, 0.05], [36, 523.25, 2.5, 0.052], [40, 587.33, 1, 0.048],
              [44, 659.25, 2, 0.055], [48, 587.33, 1.5, 0.05], [52, 523.25, 3, 0.048],
              [58, 493.88, 2, 0.042], [64, 440, 4, 0.04], [72, 392, 6, 0.038],
              [84, 440, 3, 0.04], [96, 493.88, 4, 0.042], [108, 523.25, 5, 0.044],
              [120, 587.33, 4, 0.046], [132, 659.25, 6, 0.048], [148, 523.25, 8, 0.04],
            ]);
            sched.walk(at, bpm, [0, 1, 2, 3, 2, 1, 0, 4], bars);
            sched.brushes(at, bpm, bars, 0.9);
          },
        },
        {
          title: 'moon in the glass',
          bpm: 60,
          bars: 32,
          compose({ at, bpm, sched, bars }) {
            sched.chord(AM7, at(0), spb(bpm) * (bars - 2), 0.022, 'sine');
            sched.melody(at, bpm, [
              [0, 523.25, 4, 0.04], [6, 493.88, 3, 0.035], [12, 440, 4, 0.032],
              [20, 392, 6, 0.03], [28, 349.23, 8, 0.028], [40, 329.63, 6, 0.026],
              [52, 392, 8, 0.028], [64, 440, 10, 0.03], [80, 392, 12, 0.028],
            ]);
            sched.brushes(at, bpm, bars, 0.5);
            sched.note(55, at(0), spb(bpm) * bars, 0.035, 'sine', { filterHz: 180 });
          },
        },
        {
          title: 'needle at closing time',
          bpm: 68,
          bars: 36,
          compose({ at, bpm, sched, bars }) {
            const prog = [AM7, Fmaj, Dm7, C7];
            sched.comp(at, bpm, prog, bars, 0.028);
            sched.melody(at, bpm, [
              [2, 392, 2, 0.042], [8, 440, 2, 0.044], [14, 493.88, 3, 0.046],
              [22, 440, 2, 0.042], [30, 392, 4, 0.04], [40, 349.23, 3, 0.038],
              [48, 392, 5, 0.04], [58, 440, 4, 0.042], [68, 523.25, 6, 0.044],
              [80, 493.88, 5, 0.04], [92, 440, 8, 0.038], [108, 392, 10, 0.035],
            ]);
            sched.walk(at, bpm, [0, 2, 1, 3, 2, 0, 1, 2], bars, 0.075);
            sched.brushes(at, bpm, bars, 0.8);
          },
        },
      ],
    },
    shelter: {
      title: 'shelter from the storm',
      preview: {
        title: 'storm glass (preview)',
        bpm: 86,
        bars: 20,
        compose({ at, bpm, sched, bars }) {
          const prog = [Dm7, Gm7, C7, Fmaj, AM7, Dm7];
          sched.pad(at, bpm, prog, bars, 0.026);
          sched.walk(at, bpm, [0, 1, 2, 1, 3, 4, 2, 0], bars, 0.105);
          sched.piano(at, bpm, prog, bars, 0.046);
          sched.melody(at, bpm, [
            [0, 349.23, 1, 0.064], [2, 392, 1.5, 0.066], [4, 440, 2, 0.068],
            [8, 493.88, 1.5, 0.07], [12, 440, 2, 0.066], [16, 392, 2.5, 0.064],
            [22, 349.23, 3, 0.062], [28, 329.63, 2, 0.058], [32, 349.23, 2, 0.06],
            [38, 392, 3, 0.064], [44, 440, 4, 0.066], [52, 493.88, 3, 0.068],
            [60, 440, 5, 0.064], [68, 392, 6, 0.06],
          ]);
          sched.brushes(at, bpm, bars, 0.95);
        },
      },
      movements: [
        {
          title: 'rain on the glass',
          bpm: 92,
          bars: 32,
          compose({ at, bpm, sched, bars }) {
            const prog = [[82.41, 123.47, 164.81, 196], [78.41, 117.47, 156.8, 186.47]];
            sched.comp(at, bpm, prog, bars, 0.03);
            sched.melody(at, bpm, [
              [2, 329.63, 1, 0.055], [4, 349.23, 0.75, 0.052], [6, 392, 2, 0.058],
              [10, 440, 1.5, 0.055], [14, 392, 2, 0.052], [20, 349.23, 3, 0.05],
              [28, 392, 2, 0.052], [36, 440, 2, 0.054], [44, 493.88, 3, 0.056],
              [52, 440, 2, 0.052], [60, 392, 4, 0.05], [72, 349.23, 5, 0.048],
            ]);
            sched.walk(at, bpm, [0, 0, 1, 1], bars, 0.095);
            sched.brushes(at, bpm, bars, 1);
          },
        },
        {
          title: 'storm walk',
          bpm: 88,
          bars: 48,
          compose({ at, bpm, sched, bars }) {
            const prog = [
              [82.41, 123.47, 164.81, 196], [87.31, 130.81, 174.61, 207.65],
              [92.5, 138.59, 185, 220], [73.42, 110, 146.83, 174.61],
            ];
            sched.comp(at, bpm, prog, bars, 0.032);
            sched.melody(at, bpm, [
              [0, 392, 1, 0.06], [2, 440, 1, 0.058], [4, 493.88, 1.5, 0.062],
              [8, 440, 1, 0.055], [12, 392, 2, 0.058], [16, 349.23, 1.5, 0.052],
              [20, 329.63, 2, 0.05], [24, 392, 2, 0.058], [28, 440, 1, 0.055],
              [32, 493.88, 2.5, 0.062], [36, 440, 1, 0.055], [40, 392, 3, 0.052],
              [48, 349.23, 2, 0.048], [56, 329.63, 4, 0.045], [64, 392, 3, 0.05],
              [72, 440, 2, 0.052], [80, 493.88, 4, 0.055], [92, 440, 3, 0.052],
              [104, 392, 5, 0.05], [120, 349.23, 6, 0.046], [140, 329.63, 8, 0.042],
            ]);
            sched.walk(at, bpm, [0, 1, 2, 1, 3, 2, 4, 3], bars);
            sched.brushes(at, bpm, bars, 1);
          },
        },
        {
          title: 'shelter (reprise)',
          bpm: 76,
          bars: 40,
          compose({ at, bpm, sched, bars }) {
            const prog = [Dm7, Gm7, C7, Fmaj];
            sched.comp(at, bpm, prog, bars, 0.028);
            sched.melody(at, bpm, [
              [4, 440, 3, 0.05], [10, 392, 2, 0.045], [16, 349.23, 4, 0.042],
              [24, 329.63, 3, 0.04], [32, 293.66, 6, 0.038], [44, 261.63, 8, 0.035],
              [56, 293.66, 5, 0.036], [68, 329.63, 6, 0.038], [80, 349.23, 7, 0.04],
              [96, 392, 8, 0.042], [112, 440, 10, 0.04], [132, 392, 12, 0.036],
            ]);
            sched.walk(at, bpm, [0, 2, 1, 0], bars, 0.08);
            sched.brushes(at, bpm, bars, 0.75);
          },
        },
        {
          title: 'dry coat by the door',
          bpm: 70,
          bars: 44,
          compose({ at, bpm, sched, bars }) {
            const prog = [Dm7, AM7, Gm7, C7, Fmaj];
            sched.comp(at, bpm, prog, bars, 0.027);
            sched.melody(at, bpm, [
              [2, 349.23, 2, 0.044], [10, 392, 3, 0.046], [18, 440, 4, 0.048],
              [28, 392, 3, 0.044], [38, 349.23, 5, 0.042], [50, 329.63, 6, 0.04],
              [64, 349.23, 5, 0.04], [78, 392, 7, 0.042], [94, 440, 9, 0.04],
              [112, 392, 11, 0.038],
            ]);
            sched.walk(at, bpm, [0, 1, 3, 2, 0, 4, 2, 1], bars, 0.078);
            sched.brushes(at, bpm, bars, 0.85);
          },
        },
      ],
    },
    mirror: {
      title: 'mirror at the edge',
      preview: {
        title: 'purple glass (preview)',
        bpm: 68,
        bars: 20,
        compose({ at, bpm, sched, bars }) {
          const prog = [AM7, Fmaj, Dm7, C7];
          sched.pad(at, bpm, prog, bars, 0.03);
          sched.walk(at, bpm, [0, 2, 1, 3, 2, 0, 1, 2], bars, 0.095);
          sched.piano(at, bpm, prog, bars, 0.042);
          sched.rhodes(at, bpm, [
            [0, 523.25, 3, 0.058], [6, 587.33, 2.5, 0.056], [12, 659.25, 3, 0.06],
            [18, 587.33, 2, 0.056], [24, 523.25, 4, 0.054], [32, 493.88, 3, 0.052],
            [38, 440, 4, 0.05], [46, 493.88, 3, 0.052], [54, 523.25, 5, 0.054],
            [62, 587.33, 4, 0.056], [70, 659.25, 6, 0.058],
          ]);
          sched.melody(at, bpm, [
            [1, 659.25, 2, 0.048], [8, 587.33, 2, 0.046], [16, 523.25, 3, 0.044],
            [24, 493.88, 4, 0.042], [34, 440, 5, 0.04], [44, 493.88, 4, 0.042],
            [54, 523.25, 6, 0.044], [64, 587.33, 7, 0.046],
          ]);
          sched.brushes(at, bpm, bars, 0.72);
        },
      },
      movements: [
        {
          title: 'edge of the world',
          bpm: 78,
          bars: 48,
          compose({ at, bpm, sched, bars }) {
            sched.note(41.2, at(0), spb(bpm) * bars * 4, 0.04, 'sine', { filterHz: 140, attack: 0.5 });
            const arp = [164.81, 196, 233.08, 261.63, 311.13, 349.23, 392, 440];
            for (let c = 0; c < bars * 2; c++) {
              arp.forEach((f, i) => {
                sched.note(f, at(c * 4 + i * 0.5), spb(bpm) * 1.6, 0.038, 'sine', { room: true });
              });
            }
            sched.brushes(at, bpm, bars, 0.6);
          },
        },
        {
          title: 'reflection',
          bpm: 72,
          bars: 56,
          compose({ at, bpm, sched, bars }) {
            sched.comp(at, bpm, [AM7, Fmaj, Dm7, C7], bars, 0.025);
            sched.melody(at, bpm, [
              [2, 523.25, 2, 0.048], [6, 659.25, 2, 0.052], [10, 587.33, 1.5, 0.048],
              [14, 523.25, 2, 0.045], [18, 493.88, 3, 0.042], [24, 440, 2, 0.04],
              [30, 493.88, 2, 0.042], [36, 523.25, 3, 0.045], [42, 587.33, 2, 0.048],
              [48, 659.25, 4, 0.05], [56, 587.33, 2, 0.045], [64, 523.25, 6, 0.04],
              [76, 493.88, 8, 0.035], [88, 523.25, 5, 0.04], [100, 587.33, 6, 0.042],
              [116, 659.25, 7, 0.044], [132, 587.33, 5, 0.04], [148, 523.25, 10, 0.036],
            ]);
            sched.walk(at, bpm, [0, 1, 2, 3, 2, 1, 0, 0], bars, 0.075);
            sched.brushes(at, bpm, bars, 0.8);
          },
        },
        {
          title: 'no words needed',
          bpm: 64,
          bars: 24,
          compose({ at, bpm, sched, bars }) {
            sched.chord([220, 261.63, 329.63, 415.3], at(0), spb(bpm) * (bars - 2), 0.02, 'sine');
            sched.melody(at, bpm, [
              [0, 659.25, 5, 0.04], [8, 587.33, 4, 0.035], [16, 523.25, 8, 0.03],
              [28, 493.88, 6, 0.032], [40, 440, 8, 0.03], [52, 392, 10, 0.028],
              [68, 349.23, 12, 0.026],
            ]);
            sched.brushes(at, bpm, bars, 0.4);
          },
        },
        {
          title: 'wings in the mirror',
          bpm: 62,
          bars: 32,
          compose({ at, bpm, sched, bars }) {
            const prog = [AM7, Dm7, Fmaj, C7];
            sched.comp(at, bpm, prog, bars, 0.024);
            sched.melody(at, bpm, [
              [0, 523.25, 4, 0.038], [8, 587.33, 4, 0.04], [16, 659.25, 6, 0.042],
              [28, 587.33, 5, 0.038], [40, 523.25, 7, 0.036], [52, 493.88, 8, 0.034],
              [68, 440, 10, 0.032], [84, 392, 12, 0.03], [104, 349.23, 14, 0.028],
            ]);
            sched.walk(at, bpm, [0, 2, 1, 3], bars, 0.07);
            sched.brushes(at, bpm, bars, 0.55);
          },
        },
      ],
    },
    eat: {
      title: 'eat the sounds (demo)',
      movements: [
        {
          title: 'needle drop',
          bpm: 104,
          bars: 24,
          compose({ at, bpm, sched, bars }) {
            sched.comp(at, bpm, [[220, 277.18, 329.63, 415.3], [196, 246.94, 311.13, 392]], bars, 0.035);
            const riff = [220, 261.63, 329.63, 392, 440, 392, 329.63, 277.18];
            for (let r = 0; r < bars * 2; r++) {
              riff.forEach((f, i) => {
                sched.note(f, at(r * 2 + i * 0.5), spb(bpm) * 0.34, 0.068, 'square', { filterHz: 1900 });
              });
            }
            sched.brushes(at, bpm, bars, 1);
          },
        },
        {
          title: 'eat the riff',
          bpm: 108,
          bars: 72,
          compose({ at, bpm, sched, bars }) {
            const prog = [[220, 277.18, 329.63, 415.3], [196, 246.94, 311.13, 392], [174.61, 220, 277.18, 349.23], [196, 246.94, 311.13, 392]];
            sched.comp(at, bpm, prog, bars, 0.032);
            sched.melody(at, bpm, [
              [1, 440, 0.5, 0.072], [2, 523.25, 0.5, 0.075], [3, 659.25, 1, 0.078],
              [6, 587.33, 0.5, 0.07], [8, 523.25, 1, 0.072], [12, 440, 1, 0.068],
              [16, 392, 0.5, 0.065], [18, 523.25, 2, 0.075], [24, 659.25, 1.5, 0.078],
              [28, 587.33, 1, 0.072], [32, 523.25, 2, 0.07], [40, 440, 2, 0.065],
              [48, 523.25, 2, 0.072], [56, 659.25, 3, 0.075], [64, 523.25, 4, 0.068],
              [76, 440, 2, 0.066], [88, 523.25, 3, 0.072], [100, 659.25, 4, 0.075],
              [116, 587.33, 3, 0.07], [132, 523.25, 5, 0.068], [152, 440, 6, 0.064],
            ]);
            sched.walk(at, bpm, [0, 0, 1, 2, 1, 0, 3, 2], bars, 0.09);
            sched.brushes(at, bpm, bars, 1);
          },
        },
        {
          title: 'mirror teaser',
          bpm: 96,
          bars: 40,
          compose({ at, bpm, sched, bars }) {
            sched.comp(at, bpm, [AM7, Dm7, Gm7, C7], bars, 0.03);
            sched.melody(at, bpm, [
              [2, 523.25, 2, 0.065], [8, 659.25, 2, 0.07], [14, 587.33, 3, 0.065],
              [22, 523.25, 4, 0.06], [32, 440, 6, 0.055], [44, 493.88, 5, 0.058],
              [56, 523.25, 6, 0.06], [72, 587.33, 7, 0.062], [88, 659.25, 8, 0.064],
              [108, 523.25, 10, 0.058],
            ]);
            sched.walk(at, bpm, [0, 1, 2, 1], bars);
            sched.brushes(at, bpm, bars, 0.85);
          },
        },
        {
          title: 'pizza slice coda',
          bpm: 100,
          bars: 40,
          compose({ at, bpm, sched, bars }) {
            const prog = [[220, 277.18, 329.63, 415.3], [196, 246.94, 311.13, 392]];
            sched.comp(at, bpm, prog, bars, 0.034);
            sched.melody(at, bpm, [
              [0, 659.25, 1, 0.076], [4, 587.33, 1, 0.072], [8, 523.25, 2, 0.074],
              [16, 440, 2, 0.068], [24, 523.25, 3, 0.074], [32, 659.25, 2, 0.076],
              [40, 587.33, 2, 0.072], [48, 523.25, 4, 0.07], [60, 440, 3, 0.066],
              [72, 392, 5, 0.064], [88, 440, 6, 0.066], [104, 523.25, 8, 0.062],
            ]);
            sched.walk(at, bpm, [0, 1, 0, 2], bars, 0.088);
            sched.brushes(at, bpm, bars, 0.95);
          },
        },
        {
          title: 'groove kitchen',
          bpm: 102,
          bars: 36,
          compose({ at, bpm, sched, bars }) {
            const prog = [[196, 246.94, 311.13, 392], [174.61, 220, 277.18, 349.23]];
            sched.comp(at, bpm, prog, bars, 0.033);
            sched.melody(at, bpm, [
              [0, 523.25, 1, 0.074], [6, 587.33, 1, 0.076], [12, 659.25, 2, 0.078],
              [20, 587.33, 1, 0.074], [28, 523.25, 2, 0.072], [36, 440, 2, 0.068],
              [44, 523.25, 3, 0.074], [54, 659.25, 3, 0.076], [66, 587.33, 2, 0.072],
              [78, 523.25, 4, 0.07], [92, 440, 5, 0.066], [108, 392, 7, 0.064],
            ]);
            sched.walk(at, bpm, [0, 2, 1, 3, 2, 0], bars, 0.09);
            sched.brushes(at, bpm, bars, 1);
          },
        },
      ],
    },
  };

  // Legacy TRACKS shape for HUD labels
  const TRACKS = Object.fromEntries(
    Object.entries(ALBUMS).map(([id, alb]) => [
      id,
      {
        title: alb.title,
        get duration() {
          return current?.id === id ? current.durationMs : estimateAlbumMs(alb);
        },
        movementCount: alb.movements.length,
      },
    ])
  );

  function estimateAlbumMs(alb) {
    return alb.movements.reduce((sum, mv) => sum + mv.bars * 4 * spb(mv.bpm) * 1000 + 550, 0);
  }

  function init(audioCtx, destination) {
    disposeFx();
    ctx = audioCtx;
    dest = destination;
    if (!tap || tap.context !== audioCtx) {
      tap = audioCtx.createGain();
      tap.gain.value = 1;
      tap.connect(dest);
    }
  }

  function outputGain() {
    return tap || dest;
  }

  function hardStop() {
    sessionId += 1;
    clearTimeout(stopTimer);
    clearTimeout(fadeTimer);
    stopTimer = null;
    fadeTimer = null;
    fading = false;
    fadeSnapshot = null;
    const hadPlayback = !!current || !!currentId;
    if (current?.sched?.disposeAll) current.sched.disposeAll();
    else if (current?.sched?.nodes) disposeScheduled(current.sched.nodes);
    const g = outputGain();
    if (ctx && g) {
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(1, t);
    }
    current = null;
    currentId = null;
    disposeFx();
    if (hadPlayback) stopHook?.();
  }

  function stop() {
    hardStop();
  }

  function fadeOut(sec = 0.35) {
    if (!ctx || !outputGain()) return hardStop();
    if (!current && !currentId) return;
    const fadeId = sessionId;
    clearTimeout(stopTimer);
    clearTimeout(fadeTimer);
    fadeSnapshot = getVinylPlaybackInfo();
    fading = true;
    const g = outputGain();
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.001, t + sec);
    fadeTimer = setTimeout(() => {
      if (fadeId !== sessionId) return;
      hardStop();
    }, Math.ceil(sec * 1000) + 60);
  }

  function isFading() {
    return fading;
  }

  function onStop(fn) {
    stopHook = typeof fn === 'function' ? fn : null;
  }

  async function play(id) {
    if (!ctx) return null;
    try {
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (_) { /* gesture required */ }
      }
      const album = ALBUMS[id];
      if (!album) return null;
      hardStop();
      const mySession = sessionId;
      fxBus = null;
      ensureFx();
      const out = tap || dest;
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(1, t);
      const t0 = t + 0.08;
      const sched = createJazzScheduler(ctx, out, t0);
      sched.setMaxTime(t0 + STORE_PREVIEW_SEC);
      const { durationMs: rawMs, songs } = playAlbumMovements(
        album.movements, sched, STORE_PREVIEW_SEC, album.preview || null,
      );
      sched.trimQueue();
      const durationMs = Math.min(rawMs, STORE_PREVIEW_SEC * 1000);
      sched.startLookahead();
      current = {
        id,
        title: album.title,
        t0,
        durationMs,
        songs,
        sched,
        preview: true,
      };
      currentId = id;
      stopTimer = setTimeout(() => {
        if (mySession !== sessionId) return;
        stop();
      }, durationMs + 800);
      return album.title;
    } catch (_) {
      disposeFx();
      hardStop();
      return null;
    }
  }

  function getVinylPlaybackInfo() {
    if (fading && fadeSnapshot) return { ...fadeSnapshot };
    if (!current || !ctx) return null;
    const humanizeMs = 1200;
    const capMs = current.durationMs + humanizeMs;
    const rawElapsed = Math.max(0, (ctx.currentTime - current.t0) * 1000);
    const elapsedMs = Math.min(capMs, rawElapsed);
    let song = current.songs[0];
    for (let i = current.songs.length - 1; i >= 0; i--) {
      const s = current.songs[i];
      if (elapsedMs >= s.startMs) { song = s; break; }
    }
    return {
      elapsedMs: Math.floor(Math.min(capMs, elapsedMs)),
      durationMs: current.durationMs,
      progress: current.durationMs > 0 ? Math.min(1, elapsedMs / capMs) : 0,
      songTitle: song?.title || current.title,
      songIndex: (song?.index ?? 0) + 1,
      songCount: current.songs.length,
      albumTitle: current.title,
    };
  }

  function isPlaying(id) {
    return currentId === id;
  }

  function getCurrentId() {
    return currentId;
  }

  function debugState() {
    return {
      playing: !!currentId,
      queue: current?.sched?.pendingCount?.() ?? 0,
      durationMs: current?.durationMs ?? null,
      previewSec: STORE_PREVIEW_SEC,
      live: current?.sched?.liveNodes?.length ?? 0,
      tap: tap?.gain?.value ?? null,
    };
  }

  return {
    init,
    onStop,
    play,
    stop,
    hardStop,
    fadeOut,
    isFading,
    isPlaying,
    getCurrentId,
    getVinylPlaybackInfo,
    debugState,
    TRACKS,
    ALBUMS,
  };
})();