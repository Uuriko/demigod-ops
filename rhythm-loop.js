// Looping jazz backing track for rhythm gameplay — RAF lookahead, tracked node cleanup
window.RhythmLoop = (function () {
  function create(ctx, dest) {
    let running = false;
    let beat = 0;
    let transportTime = 0;
    let rafId = null;
    let generation = 0;
    const liveNodes = new Set();
    let bpm = 84;
    let beatSec = 60 / bpm;
    let swing = beatSec * 0.06;
    let style = 'ballad';

    function setBpm(newBpm) {
      bpm = newBpm;
      beatSec = 60 / bpm;
      swing = beatSec * (style === 'ballad' ? 0.08 : 0.06);
      if (bpm >= 120) style = 'burner';
      else if (bpm >= 100) style = 'swing';
      else style = 'ballad';
    }

    function setStyle(next) {
      style = next;
      swing = beatSec * (style === 'ballad' ? 0.08 : 0.06);
    }

    const balladProg = [
      { bass: [82.41, 98, 110, 98], chord: [164.81, 196, 246.94], horn: 293.66 },
      { bass: [87.31, 103.83, 123.47, 103.83], chord: [174.61, 220, 261.63], horn: 311.13 },
      { bass: [73.42, 87.31, 98, 87.31], chord: [146.83, 174.61, 220], horn: 261.63 },
      { bass: [98, 110, 130.81, 110], chord: [196, 246.94, 293.66], horn: 329.63 },
    ];
    const swingProg = [
      { bass: [110, 110, 130.81, 110], chord: [220, 261.63, 329.63] },
      { bass: [87.31, 87.31, 110, 87.31], chord: [174.61, 220, 261.63] },
      { bass: [98, 98, 123.47, 98], chord: [196, 246.94, 293.66] },
      { bass: [82.41, 82.41, 98, 82.41], chord: [164.81, 196, 246.94] },
    ];
    const burnerProg = [
      { bass: [123.47, 123.47, 146.83, 123.47], chord: [246.94, 311.13, 369.99], horn: 440 },
      { bass: [110, 110, 130.81, 110], chord: [220, 261.63, 329.63], horn: 392 },
      { bass: [130.81, 130.81, 164.81, 130.81], chord: [261.63, 329.63, 392], horn: 493.88 },
      { bass: [98, 98, 123.47, 98], chord: [196, 246.94, 293.66], horn: 349.23 },
    ];
    const melody = [349.23, 392, 440, 493.88, 523.25, 493.88, 440, 392];
    const outGain = dest?.gain ? dest : null;

    const MAX_LIVE_NODES = 96;

    function track(node) {
      if (!node) return node;
      if (liveNodes.size >= MAX_LIVE_NODES) {
        const oldest = liveNodes.values().next().value;
        if (oldest) {
          try { oldest.stop?.(0); oldest.disconnect?.(); } catch (_) { /* stopped */ }
          liveNodes.delete(oldest);
        }
      }
      liveNodes.add(node);
      return node;
    }

    function releaseAll() {
      liveNodes.forEach((n) => {
        try {
          if (typeof n.stop === 'function') n.stop(0);
          n.disconnect?.();
        } catch (_) { /* already stopped */ }
      });
      liveNodes.clear();
    }

    function brush(when, vol, high = false) {
      const len = Math.floor(ctx.sampleRate * (high ? 0.03 : 0.04));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = track(ctx.createBufferSource());
      src.buffer = buf;
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = high ? 'highpass' : 'bandpass';
      f.frequency.value = high ? 6200 : 4800;
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(when);
      src.stop(when + 0.12);
    }

    function pianoComp(when, freqs, vol = 0.07) {
      freqs.forEach((freq, i) => {
        const co = track(ctx.createOscillator());
        const cg = ctx.createGain();
        const cf = ctx.createBiquadFilter();
        co.type = 'triangle';
        co.frequency.value = freq;
        co.detune.value = (i - 1) * 5;
        cf.type = 'lowpass';
        cf.frequency.value = 1800;
        cg.gain.setValueAtTime(0, when + swing);
        cg.gain.linearRampToValueAtTime(vol, when + swing + 0.02);
        cg.gain.exponentialRampToValueAtTime(0.001, when + swing + beatSec * 1.1);
        co.connect(cf);
        cf.connect(cg);
        cg.connect(dest);
        co.start(when + swing);
        co.stop(when + swing + beatSec * 1.2);
      });
    }

    function hiHat(when, open = false, vol = 0.05) {
      const len = Math.floor(ctx.sampleRate * (open ? 0.06 : 0.025));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = track(ctx.createBufferSource());
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = open ? 6800 : 8200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + (open ? 0.08 : 0.04));
      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(when);
      src.stop(when + 0.1);
    }

    function hornStab(when, freq, vol = 0.06) {
      const ho = track(ctx.createOscillator());
      const hg = ctx.createGain();
      const hf = ctx.createBiquadFilter();
      ho.type = 'sawtooth';
      ho.frequency.value = freq;
      hf.type = 'lowpass';
      hf.frequency.setValueAtTime(1400, when);
      hf.frequency.exponentialRampToValueAtTime(900, when + 0.35);
      hg.gain.setValueAtTime(0, when);
      hg.gain.linearRampToValueAtTime(vol, when + 0.04);
      hg.gain.exponentialRampToValueAtTime(0.001, when + 0.42);
      ho.connect(hf);
      hf.connect(hg);
      hg.connect(dest);
      ho.start(when);
      ho.stop(when + 0.45);
    }

    function scheduleBeat(when) {
      const bar = Math.floor(beat / 4) % 4;
      const step = beat % 4;
      const prog = style === 'ballad' ? balladProg[bar]
        : style === 'burner' ? burnerProg[bar] : swingProg[bar];
      const human = (Math.random() - 0.5) * 0.012;
      const bassVol = style === 'ballad' ? 0.32 : style === 'burner' ? 0.3 : 0.28;

      const bo = track(ctx.createOscillator());
      const bg = ctx.createGain();
      const bf = ctx.createBiquadFilter();
      bo.type = style === 'ballad' ? 'triangle' : 'sine';
      const bassFreq = prog.bass[step];
      if (style === 'ballad') {
        bo.frequency.setValueAtTime(bassFreq * 0.96, when + human);
        bo.frequency.exponentialRampToValueAtTime(bassFreq, when + human + 0.045);
      } else {
        bo.frequency.value = bassFreq;
      }
      bf.frequency.value = style === 'ballad' ? 520 : 420;
      bg.gain.setValueAtTime(0, when + human);
      bg.gain.linearRampToValueAtTime(bassVol, when + human + 0.015);
      bg.gain.exponentialRampToValueAtTime(0.001, when + human + beatSec * 0.92);
      bo.connect(bf);
      bf.connect(bg);
      bg.connect(dest);
      bo.start(when + human);
      bo.stop(when + human + beatSec);

      if (step === 0 || step === 2) {
        const chordVol = style === 'ballad' ? 0.08 : 0.09;
        pianoComp(when, prog.chord, chordVol);
      }

      if (style === 'ballad') {
        brush(when + beatSec * 0.5 + human, step % 2 === 0 ? 0.07 : 0.05);
        if (step === 3) brush(when + beatSec * 0.75 + human, 0.04, true);
        if (beat % 8 === 6 && prog.horn) hornStab(when + beatSec * 0.25, prog.horn, 0.055);
        if (beat % 16 === 12) {
          const mo = track(ctx.createOscillator());
          const mg = ctx.createGain();
          mo.type = 'sine';
          mo.frequency.value = melody[Math.floor(beat / 16) % melody.length];
          mg.gain.setValueAtTime(0, when);
          mg.gain.linearRampToValueAtTime(0.11, when + 0.03);
          mg.gain.exponentialRampToValueAtTime(0.001, when + beatSec * 1.8);
          mo.connect(mg);
          mg.connect(dest);
          mo.start(when + swing);
          mo.stop(when + swing + beatSec * 2);
        }
      } else {
        if (style === 'burner') {
          hiHat(when + human, false, step % 2 === 0 ? 0.055 : 0.04);
          if (step === 3) hiHat(when + beatSec * 0.5 + human, true, 0.05);
        } else if (style === 'swing') {
          if (step === 1 || step === 3) hiHat(when + beatSec * 0.5 + human, false, 0.042);
          if (step === 2) brush(when + beatSec * 0.25 + human, 0.04, true);
        } else if (step % 2 === 1) {
          hiHat(when + human, false, 0.038);
        }
        brush(when + beatSec * 0.04 + human, step % 2 === 0 ? 0.09 : 0.06);
        if (step === 1 || step === 3) brush(when + beatSec * 0.52 + human, 0.05, style === 'burner');
        if (style === 'burner' && (step === 0 || step === 2) && prog.horn) {
          hornStab(when + beatSec * 0.12, prog.horn, 0.05);
        }
        if (beat % 8 === 4) {
          const mo = track(ctx.createOscillator());
          const mg = ctx.createGain();
          mo.type = 'sine';
          mo.frequency.value = melody[Math.floor(beat / 8) % melody.length];
          mg.gain.setValueAtTime(0, when);
          mg.gain.linearRampToValueAtTime(style === 'burner' ? 0.12 : 0.1, when + 0.02);
          mg.gain.exponentialRampToValueAtTime(0.001, when + 0.45);
          mo.connect(mg);
          mg.connect(dest);
          mo.start(when + beatSec * 0.5);
          mo.stop(when + beatSec * 0.5 + 0.5);
        }
      }
      beat++;
    }

    function schedule() {
      if (!running) return;
      const myGen = generation;
      const now = ctx.currentTime;
      while (running && myGen === generation && transportTime < now + 0.5) {
        scheduleBeat(transportTime);
        transportTime += beatSec;
      }
      if (!running || myGen !== generation) return;
      rafId = requestAnimationFrame(schedule);
    }

    function stopClean() {
      running = false;
      generation++;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      releaseAll();
      if (outGain) {
        const t = ctx.currentTime;
        outGain.gain.cancelScheduledValues(t);
        outGain.gain.setValueAtTime(0, t);
      }
      beat = 0;
      transportTime = 0;
    }

    return {
      start() {
        stopClean();
        running = true;
        beat = 0;
        transportTime = ctx.currentTime + 0.08;
        if (outGain) {
          const t = ctx.currentTime;
          outGain.gain.cancelScheduledValues(t);
          const peak = style === 'burner' ? 0.78 : style === 'swing' ? 0.75 : 0.72;
          outGain.gain.setValueAtTime(0, t);
          outGain.gain.linearRampToValueAtTime(peak, t + 0.12);
        }
        schedule();
      },
      stop() {
        stopClean();
      },
      stopClean,
      isRunning: () => running,
      setBpm,
      getBpm: () => bpm,
      setStyle,
      getStyle: () => style,
    };
  }

  return { create };
})();