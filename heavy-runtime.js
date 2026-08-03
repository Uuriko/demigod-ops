// SuperGrok Heavy runtime — contract functions for eat-the-sounds

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ laneX0:number, laneW:number, laneTopY:number, hitY:number, cx:number, goodMs:number, approachTime:number }} layout
 * @param {{ label:string, color:string, role:string }[]} lanes
 * @param {number} time
 */
function drawAlignedPlayfield(ctx, layout, lanes, time) {
  const {
    laneX0, laneW, laneTopY, hitY, cx,
    goodMs, greatMs = goodMs * 0.65, perfectMs = goodMs * 0.35, approachTime,
  } = layout;
  const beatPulse = 0.5 + Math.sin(time * 0.09) * 0.2;
  const laneCenter = (i) => laneX0 + i * laneW + laneW / 2;
  const PX = window.PixelGfx;
  if (PX) PX.setupPixelCtx(ctx);

  for (let i = 0; i < lanes.length; i++) {
    const x = laneX0 + i * laneW;
    for (let y = laneTopY; y < hitY + 32; y += 8) {
      const fade = (y - laneTopY) / (hitY - laneTopY + 32);
      ctx.fillStyle = fade < 0.5 ? 'rgba(201,168,76,0.02)' : lanes[i].color + '18';
      ctx.fillRect(x + 4, y, laneW - 8, 8);
    }

    ctx.strokeStyle = lanes[i].color + '66';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, laneTopY, laneW - 8, hitY - laneTopY + 28);

    ctx.fillStyle = lanes[i].color + '88';
    ctx.fillRect(laneCenter(i) - 1, hitY + 4, 2, 24);

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = lanes[i].color;
    ctx.textAlign = 'center';
    ctx.fillText(lanes[i].label, laneCenter(i), laneTopY - 10);
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = lanes[i].color + '99';
    ctx.fillText((lanes[i].role || '').slice(0, 6), laneCenter(i), laneTopY + 6);
  }

  const laneH = hitY - laneTopY;
  const winGood = (goodMs / approachTime) * laneH;
  const winGreat = (greatMs / approachTime) * laneH;
  const winPerfect = (perfectMs / approachTime) * laneH;
  ctx.fillStyle = 'rgba(201,168,76,0.07)';
  ctx.fillRect(laneX0 + 2, hitY - winGood, laneW * lanes.length - 4, winGood);
  ctx.fillStyle = 'rgba(74,143,122,0.1)';
  ctx.fillRect(laneX0 + 2, hitY - winGreat, laneW * lanes.length - 4, winGreat);
  ctx.fillStyle = 'rgba(248,244,255,0.12)';
  ctx.fillRect(laneX0 + 2, hitY - winPerfect, laneW * lanes.length - 4, winPerfect);

  const pulse = beatPulse > 0.6 ? 4 : 0;
  ctx.fillStyle = `rgba(201,168,76,${0.65 + beatPulse * 0.3})`;
  ctx.fillRect(laneX0, hitY - 2 - pulse, laneW * lanes.length, 4 + pulse);

  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(201,168,76,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('▼ BITE ▼', cx, hitY - 12);

  const pulseR = 6 + Math.floor(Math.sin(time * 0.14) * 2) * 2;
  if (PX) PX.fillPixelDisk(ctx, cx, hitY, pulseR, 4, 'rgba(240,240,255,0.2)');
}

/**
 * @param {AudioContext} audioCtx
 * @param {AudioNode} dest
 * @param {number} lane 0-3
 * @param {number[]} pentatonic
 * @param {number[]} stepRef mutable per-lane step array
 * @param {number[]} laneDegree root indices per lane
 * @returns {{ freq:number, idx:number }}
 */
function playJazzImprov(audioCtx, dest, lane, pentatonic, stepRef, laneDegree) {
  const step = stepRef[lane] || 0;
  const idx = (laneDegree[lane] + step) % pentatonic.length;
  const freq = pentatonic[idx];
  stepRef[lane] = (step + (Math.random() < 0.3 ? 2 : 1)) % pentatonic.length;

  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const f = audioCtx.createBiquadFilter();
  const vib = audioCtx.createOscillator();
  const vibG = audioCtx.createGain();

  o.type = lane < 2 ? 'triangle' : 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.linearRampToValueAtTime(freq * (1.02 + lane * 0.008), t + 0.06);
  o.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 0.22);
  o.detune.value = (Math.random() - 0.5) * 22;

  vib.frequency.value = 5.5 + lane;
  vibG.gain.value = 3 + lane;
  vib.connect(vibG);
  vibG.connect(o.detune);

  f.type = 'lowpass';
  f.frequency.value = lane < 2 ? 850 : 2400;

  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

  o.connect(f);
  f.connect(g);
  g.connect(dest);
  vib.start(t);
  o.start(t);
  vib.stop(t + 0.35);
  o.stop(t + 0.38);

  return { freq, idx };
}

/**
 * @param {HTMLElement} root documentElement
 * @param {{ W:number, margin:number, laneW:number, laneX0:number, hitY:number, laneCenters:number[] }} layout
 */
function syncLaneLayout(root, layout) {
  const playW = layout.laneW * 4;
  root.style.setProperty('--play-left', layout.laneX0 + 'px');
  root.style.setProperty('--play-width', playW + 'px');
  root.style.setProperty('--hit-y', layout.hitY + 'px');
  layout.laneCenters.forEach((c, i) => {
    root.style.setProperty(`--lane-${i}`, c + 'px');
  });
}

/**
 * @param {number} diff ms from note time
 */
function classifyHit(diff, perfectMs, greatMs, goodMs) {
  if (diff <= perfectMs) return 'perfect';
  if (diff <= greatMs) return 'great';
  if (diff <= goodMs) return 'good';
  return null;
}

/** Short lane pluck on every key press (D/F/J/K) */
function playKeyTap(audioCtx, dest, lane, basePitch = 220) {
  const laneVoices = [
    { freq: 68, type: 'sine', filterHz: 420, vol: 0.2 },
    { freq: 440, type: 'sawtooth', filterHz: 2400, vol: 0.14 },
    { freq: 720, type: 'square', filterHz: 3100, vol: 0.12 },
    { freq: 1380, type: 'triangle', filterHz: 4200, vol: 0.1 },
  ];
  const voice = laneVoices[lane] || laneVoices[0];
  const freq = basePitch || voice.freq;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const f = audioCtx.createBiquadFilter();
  o.type = voice.type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 1.06, t + 0.035);
  f.type = 'lowpass';
  f.frequency.value = voice.filterHz;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(voice.vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
  o.connect(f);
  f.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.3);

  const len = Math.floor(audioCtx.sampleRate * 0.06);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const ng = audioCtx.createGain();
  const nf = audioCtx.createBiquadFilter();
  nf.type = 'highpass';
  nf.frequency.value = 2200 + lane * 400;
  ng.gain.setValueAtTime(0.07, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  src.connect(nf);
  nf.connect(ng);
  ng.connect(dest);
  src.start(t);
}

function playMissScratch(audioCtx, dest) {
  const t = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * 0.08);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.5;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const g = audioCtx.createGain();
  const f = audioCtx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1800;
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(t);
}

function pizzaBiteCrunch(audioCtx, dest, t, vol = 0.09, bright = false) {
  const len = Math.floor(audioCtx.sampleRate * (bright ? 0.05 : 0.04));
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const f = audioCtx.createBiquadFilter();
  f.type = bright ? 'highpass' : 'bandpass';
  f.frequency.value = bright ? 2800 : 1200;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (bright ? 0.07 : 0.05));
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(t);
}

function playJudgmentSfx(audioCtx, dest, lane, tier, basePitch = 220) {
  const pitches = [220, 261.63, 329.63, 392];
  const base = basePitch || pitches[lane] || 220;
  const t = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.connect(dest);

  if (tier === 'perfect') {
    pizzaBiteCrunch(audioCtx, g, t, 0.1, true);
    const thump = audioCtx.createOscillator();
    const tg = audioCtx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(base * 0.5, t);
    thump.frequency.exponentialRampToValueAtTime(base * 0.35, t + 0.08);
    tg.gain.setValueAtTime(0.14, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    thump.connect(tg);
    tg.connect(g);
    thump.start(t);
    thump.stop(t + 0.14);
    [base * 2, base * 2.5, base * 3].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const og = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      og.gain.setValueAtTime(0.1, t + 0.02 + i * 0.035);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.02 + i * 0.035 + 0.16);
      o.connect(og); og.connect(g);
      o.start(t + 0.02 + i * 0.035); o.stop(t + 0.02 + i * 0.035 + 0.18);
    });
    return;
  }

  if (tier === 'great') {
    pizzaBiteCrunch(audioCtx, g, t, 0.075);
    [base * 1.5, base * 2, base * 2.25].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const og = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      og.gain.setValueAtTime(0.1, t + i * 0.05);
      og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.18);
      o.connect(og); og.connect(g);
      o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.2);
    });
    return;
  }

  pizzaBiteCrunch(audioCtx, g, t, 0.05);
  const o = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.value = base * 1.25;
  og.gain.setValueAtTime(0.11, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(og); og.connect(g);
  o.start(t); o.stop(t + 0.18);
}

function playComboStinger(audioCtx, dest, combo) {
  if (!audioCtx || !dest) return;
  const t = audioCtx.currentTime;
  const freqs = combo >= 32 ? [392, 523.25, 659.25, 783.99]
    : combo >= 16 ? [329.63, 440, 523.25]
      : [261.63, 329.63, 392];
  freqs.forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = combo >= 32 ? 'sawtooth' : 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t + i * 0.06);
    g.gain.linearRampToValueAtTime(0.08, t + i * 0.06 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.22);
    o.connect(g);
    g.connect(dest);
    o.start(t + i * 0.06);
    o.stop(t + i * 0.06 + 0.24);
  });
}

function playSarahEncoreStinger(audioCtx, dest, songIdx = 1) {
  if (!audioCtx || !dest) return;
  const t = audioCtx.currentTime;
  const lines = [
    [392, 440, 523.25],
    [349.23, 392, 440],
    [440, 523.25, 587.33],
  ];
  const notes = lines[songIdx % lines.length] || lines[0];
  notes.forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t + i * 0.11);
    g.gain.linearRampToValueAtTime(0.055, t + i * 0.11 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.42);
    o.connect(g);
    g.connect(dest);
    o.start(t + i * 0.11);
    o.stop(t + i * 0.11 + 0.45);
  });
}

function playSongHandoff(audioCtx, dest, bpm = 108) {
  if (!audioCtx || !dest) return;
  const t = audioCtx.currentTime;
  const root = bpm >= 120 ? 196 : bpm >= 100 ? 174.61 : 146.83;
  [root, root * 1.25, root * 1.5, root * 2].forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t + i * 0.07);
    g.gain.linearRampToValueAtTime(0.09, t + i * 0.07 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.35);
    o.connect(g);
    g.connect(dest);
    o.start(t + i * 0.07);
    o.stop(t + i * 0.07 + 0.38);
  });
  brushNoise(audioCtx, dest, t + 0.28, 0.06);
}

function brushNoise(audioCtx, dest, when, vol) {
  const len = Math.floor(audioCtx.sampleRate * 0.05);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const f = audioCtx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 5000;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(when);
}

/**
 * @param {object[]} particles mutable array
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {'perfect'|'great'|'good'} tier
 */
function judgmentBurst(particles, x, y, color, tier) {
  const cfg = {
    perfect: { n: 30, speed: 4.2, size: 3.5, accent: '#f8f4ff', ring: 1 },
    great: { n: 18, speed: 3, size: 2.8, accent: '#4a8f7a', ring: 0.7 },
    good: { n: 10, speed: 2.2, size: 2, accent: '#c9a84c', ring: 0.45 },
  }[tier] || { n: 10, speed: 2, size: 2, accent: color, ring: 0.4 };
  const c = cfg;
  for (let i = 0; i < c.n; i++) {
    const a = (Math.PI * 2 * i) / c.n + Math.random() * 0.5;
    particles.push({
      x, y,
      vx: Math.cos(a) * (c.speed + Math.random() * 2),
      vy: Math.sin(a) * (c.speed + Math.random() * 2) - 2,
      life: 1,
      color: i % 3 === 0 ? c.accent : (tier === 'great' && i % 2 === 0 ? '#e8d040' : color),
      size: c.size + Math.random(),
      tier,
    });
  }
  if (tier === 'great') {
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y - 4,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -2.5 - Math.random() * 2,
        life: 0.9,
        color: '#e8d040',
        size: 2.2 + Math.random(),
        tier: 'great',
      });
    }
  }
  if (tier === 'perfect') {
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      particles.push({
        x, y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5 - 0.5,
        life: 1.2, color: '#c9a84c', size: 4, tier: 'perfect',
      });
    }
  }
  return c.ring;
}

window.HeavyRuntime = {
  drawAlignedPlayfield, playJazzImprov, syncLaneLayout,
  classifyHit, playKeyTap, playMissScratch, playJudgmentSfx, judgmentBurst,
  playComboStinger, playSongHandoff, playSarahEncoreStinger,
};