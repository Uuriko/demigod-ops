#!/usr/bin/env node
/**
 * Audio audit — tap Web Audio buses, measure peaks/RMS, detect overlap,
 * export short WAV clips per phase for human listening.
 *
 * Usage: GAME_CACHE=cohesion3 node audio-audit-playtest.mjs
 */
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
const OUT_DIR = '/home/potter/audit-shots/audio';
const OUT_MD = '/home/potter/AUDIO-AUDIT.md';
const SAMPLE_RATE = 44100;
const AMBIENT_LOUD = 0.018;
const VINYL_LOUD = 0.015;
const OVERLAP_FRAMES = 2;

fs.mkdirSync(OUT_DIR, { recursive: true });

function writeWav(filePath, floatSamples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = SAMPLE_RATE * blockAlign;
  const data = Buffer.alloc(floatSamples.length * 2);
  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    data.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(filePath, Buffer.concat([header, data]));
}

const browser = await connectPlaytestBrowser();
const page = await openFreshPlaytestPage(browser);
let audit = { pass: false, phases: [], issues: [], overlapEvents: [], musicNotes: [] };
try {
await page.setViewport({ width: 1280, height: 800 });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
});
await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});

audit = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tap = () => document.getElementById('dialogueBox')?.click();
  const AMBIENT_LOUD = 0.018;
  const VINYL_LOUD = 0.015;
  const OVERLAP_FRAMES = 2;
  const issues = [];
  const phases = [];
  const overlapEvents = [];

  function note(msg) { issues.push(msg); }

  function makeMeter(node, label) {
    if (!node || !audioCtx) return null;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    node.connect(analyser);
    return {
      label,
      analyser,
      peak() {
        const buf = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buf);
        let p = 0;
        for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i]));
        return p;
      },
      rms() {
        const buf = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        return Math.sqrt(sum / buf.length);
      },
      disconnect() { try { analyser.disconnect(); } catch (_) { /* */ } },
    };
  }

  function pullSamples(meter, bucket, maxLen) {
    if (!meter || bucket.length >= maxLen) return;
    const buf = new Float32Array(2048);
    meter.analyser.getFloatTimeDomainData(buf);
    for (let i = 0; i < buf.length && bucket.length < maxLen; i++) bucket.push(buf[i]);
  }

  async function samplePhase(name, durationMs = 2800, intervalMs = 100) {
    const clipLen = Math.floor(44100 * 1.2);
    const ambM = makeMeter(window.__ambientGain, 'ambient');
    const vinM = makeMeter(audioBus?.vinylGain, 'vinyl');
    const rhyM = makeMeter(audioBus?.rhythmGain, 'rhythm');
    const masM = makeMeter(audioBus?.masterGain, 'master');

    const frames = [];
    let overlapStreak = 0;
    const samplesPerBus = { ambient: [], vinyl: [], master: [] };

    for (let t = 0; t < durationMs; t += intervalMs) {
      await sleep(intervalMs);
      const frame = {
        t,
        ambient: ambM?.peak() ?? 0,
        vinyl: vinM?.peak() ?? 0,
        rhythm: rhyM?.peak() ?? 0,
        master: masM?.peak() ?? 0,
        ambientRms: ambM?.rms() ?? 0,
        vinylRms: vinM?.rms() ?? 0,
      };
      frames.push(frame);
      pullSamples(ambM, samplesPerBus.ambient, clipLen);
      pullSamples(vinM, samplesPerBus.vinyl, clipLen);
      pullSamples(masM, samplesPerBus.master, clipLen);

      if (frame.ambient > AMBIENT_LOUD && frame.vinyl > VINYL_LOUD) {
        overlapStreak++;
        if (overlapStreak >= OVERLAP_FRAMES) {
          overlapEvents.push({
            phase: name,
            atMs: t,
            ambient: frame.ambient,
            vinyl: frame.vinyl,
          });
        }
      } else {
        overlapStreak = 0;
      }
    }

    const pick = (key) => {
      const vals = frames.map((f) => f[key]).filter((v) => v > 0.001);
      if (!vals.length) return { peak: 0, rms: 0 };
      return {
        peak: Math.max(...vals),
        rms: vals.reduce((a, b) => a + b, 0) / vals.length,
      };
    };

    const snap = {
      ambientActive: StoreAmbient?.isActive?.(),
      ambientBlocked: StoreAmbient?.isMusicBlocked?.(),
      vinylId: VinylAudio?.getCurrentId?.() || JazzStoreOverworld?.listeningId || null,
      vinylPlaying: !!VinylAudio?.getCurrentId?.(),
      audioMode: audioBus?.getMode?.(),
      ctxState: audioCtx?.state,
    };

    [ambM, vinM, rhyM, masM].forEach((m) => m?.disconnect());

    phases.push({
      name,
      durationMs,
      frames: frames.length,
      ambient: pick('ambient'),
      vinyl: pick('vinyl'),
      rhythm: pick('rhythm'),
      master: pick('master'),
      snap,
      samplesPerBus,
    });
    return phases[phases.length - 1];
  }

  async function walkTo(x, y, max = 220) {
    for (let i = 0; i < max; i++) {
      const p = JazzStoreOverworld.playerGridPos();
      if (p.x === x && p.y === y) return true;
      if (p.x < x) JazzStoreOverworld.handleKey('ArrowRight', { repeat: false });
      else if (p.x > x) JazzStoreOverworld.handleKey('ArrowLeft', { repeat: false });
      else if (p.y < y) JazzStoreOverworld.handleKey('ArrowDown', { repeat: false });
      else JazzStoreOverworld.handleKey('ArrowUp', { repeat: false });
      await sleep(40);
    }
    return false;
  }

  async function spinVinyl(id) {
    const v = JazzStoreOverworld.VINYL_PICKUPS.find((p) => p.id === id);
    if (!v) return false;
    const reached = await walkTo(v.padX, v.padY);
    const pos = JazzStoreOverworld.playerGridPos();
    if (!reached && (pos.x !== v.padX || pos.y !== v.padY)) {
      note(`walk failed reaching ${id} pad — at ${pos.x},${pos.y} wanted ${v.padX},${v.padY}`);
      return false;
    }
    await ensureAudioReady?.().catch?.(() => {});
    if (audioCtx?.state === 'suspended') {
      try { await audioCtx.resume(); } catch (_) { /* gesture */ }
    }
    JazzStoreOverworld.handleKey('KeyZ', { repeat: false });
    await sleep(2000);
    return JazzStoreOverworld.isListening?.() || !!VinylAudio?.getCurrentId?.();
  }

  async function stopVinyl() {
    JazzStoreOverworld.handleKey('KeyX', { repeat: false });
    await sleep(900);
  }

  // --- boot intro → overworld ---
  for (let w = 0; w < 40; w++) {
    if (dialogue?.active && dialogue.forest === 'intro') break;
    await sleep(250);
  }
  for (let i = 0; i < 18; i++) {
    if (document.body.classList.contains('overworld-active')) break;
    if (!dialogue?.active) break;
    tap();
    await sleep(320);
  }
  if (!document.body.classList.contains('overworld-active')) {
    note('failed to reach overworld');
    return { issues, phases, overlapEvents, pass: false };
  }

  await ensureAudioReady?.().catch?.(() => {});
  await sleep(2200);

  await samplePhase('01_store_ambient', 3000);
  const amb = phases[phases.length - 1];
  if (amb.ambient.peak < 0.008) note('store ambient too quiet or silent at spawn');
  if (amb.vinyl.peak > VINYL_LOUD) note('vinyl audible during ambient-only phase');

  const moonOk = await spinVinyl('moon');
  if (!moonOk) note('moon vinyl did not start');
  await samplePhase('02_moon_vinyl', 3200);
  const moon = phases[phases.length - 1];
  if (moon.ambient.peak > AMBIENT_LOUD) {
    note(`ambient still audible during moon vinyl (peak=${moon.ambient.peak.toFixed(4)})`);
  }
  if (moon.vinyl.peak < VINYL_LOUD) note('moon vinyl bus too quiet');
  if (!moon.snap.ambientBlocked) note('StoreAmbient.isMusicBlocked false during vinyl');

  await stopVinyl();
  await sleep(1800);
  await samplePhase('03_after_stop_resume', 2800);
  const resume = phases[phases.length - 1];
  if (resume.vinyl.peak > VINYL_LOUD) note('vinyl still audible after stop');
  if (resume.ambient.peak < 0.006) note('ambient did not resume after vinyl stop');

  const shelterOk = await spinVinyl('shelter');
  if (!shelterOk) note('shelter vinyl did not start');
  await samplePhase('04_shelter_vinyl', 2800);

  const mirrorOk = await spinVinyl('mirror');
  if (!mirrorOk) note('mirror vinyl did not start (switch from shelter)');
  await samplePhase('05_mirror_switch', 2800);
  const mirror = phases[phases.length - 1];
  const mirrorId = mirror.snap.vinylId;
  if (mirrorId && mirrorId !== 'mirror') {
    note(`vinyl switch failed — still playing ${mirrorId} instead of mirror`);
  }
  if (mirrorOk && mirror.ambient.peak > AMBIENT_LOUD && mirror.vinyl.peak > VINYL_LOUD) {
    note(`ambient overlap during mirror vinyl (peak=${mirror.ambient.peak.toFixed(4)})`);
  }

  await stopVinyl();
  await sleep(1200);

  const uniqueOverlaps = overlapEvents.filter((ev, i, arr) =>
    arr.findIndex((x) => x.phase === ev.phase && Math.abs(x.atMs - ev.atMs) < 200) === i);

  if (uniqueOverlaps.length) {
    uniqueOverlaps.forEach((ev) => {
      note(`OVERLAP ${ev.phase} @${ev.atMs}ms ambient=${ev.ambient.toFixed(4)} vinyl=${ev.vinyl.toFixed(4)}`);
    });
  }

  const musicNotes = [];
  if (moon.vinyl.peak > 0 && amb.ambient.peak > 0) {
    const ratio = moon.vinyl.peak / amb.ambient.peak;
    musicNotes.push(`vinyl:ambient peak ratio during spin ≈ ${ratio.toFixed(1)}× (target ~3–8× for clear focus)`);
  }
  if (resume.ambient.rms > 0 && moon.vinyl.rms > 0) {
    musicNotes.push(`ambient RMS after stop ${resume.ambient.rms.toFixed(4)} — check fade-in smoothness`);
  }
  musicNotes.push('WAV clips in audit-shots/audio/ — listen for mud, harsh highs, or double-melody');

  return {
    issues,
    phases,
    overlapEvents: uniqueOverlaps,
    musicNotes,
    pass: issues.length === 0,
  };
});

const wavFiles = [];
for (const phase of audit.phases) {
  for (const bus of ['ambient', 'vinyl', 'master']) {
    const samples = phase.samplesPerBus?.[bus];
    const busPeak = phase[bus]?.peak ?? 0;
    if (!samples?.length || busPeak < 0.004) continue;
    const safe = `${phase.name}-${bus}.wav`;
    const file = path.join(OUT_DIR, safe);
    writeWav(file, samples);
    wavFiles.push({ phase: phase.name, bus, file: safe });
    delete phase.samplesPerBus;
  }
}

const md = [
  '# Audio Audit Report',
  '',
  `**Run:** ${new Date().toISOString()}`,
  `**URL:** ${URL}`,
  `**Result:** ${audit.pass ? 'PASS' : 'ISSUES'}`,
  '',
  '## How this works',
  'The audit taps separate Web Audio buses (store ambient jazz, vinyl preview, rhythm, master),',
  'samples peak/RMS every 100ms, and flags frames where **both ambient and vinyl are loud**.',
  'Short WAV clips are exported per phase so you can listen directly.',
  '',
  '## Exclusivity rule',
  '**Only one "song layer" at a time:** store ambient OR vinyl preview — never both at full volume.',
  '',
  '## Phase levels',
  '| Phase | Ambient peak | Vinyl peak | Rhythm peak | State |',
  '|---|---:|---:|---:|---|',
  ...audit.phases.map((p) => {
    const st = [
      p.snap.vinylId ? `vinyl:${p.snap.vinylId}` : 'no-vinyl',
      p.snap.ambientBlocked ? 'blocked' : 'unblocked',
      p.snap.ambientActive ? 'amb:on' : 'amb:off',
      p.snap.audioMode || '?',
    ].join(' · ');
    return `| ${p.name} | ${p.ambient.peak.toFixed(4)} | ${p.vinyl.peak.toFixed(4)} | ${p.rhythm.peak.toFixed(4)} | ${st} |`;
  }),
  '',
];

if (audit.overlapEvents?.length) {
  md.push('## Overlap events', ...audit.overlapEvents.map((e) =>
    `- **${e.phase}** @ ${e.atMs}ms — ambient ${e.ambient.toFixed(4)}, vinyl ${e.vinyl.toFixed(4)}`), '');
}

if (audit.issues.length) {
  md.push('## Issues', ...audit.issues.map((i) => `- ${i}`), '');
} else {
  md.push('## Issues', '- None — buses are mutually exclusive in tested phases.', '');
}

if (audit.musicNotes?.length) {
  md.push('## Music / mix notes', ...audit.musicNotes.map((n) => `- ${n}`), '');
}

md.push(
  '## WAV clips (listen in any player)',
  ...wavFiles.map((w) => `- \`${w.file}\` — ${w.phase} · ${w.bus} bus`),
  '',
  `Folder: \`${OUT_DIR}\``,
);

fs.writeFileSync(OUT_MD, md.join('\n'));
console.log(md.join('\n'));
} finally {
  await closePlaytestPage(page);
  await closeStalePlaytestTabs(browser);
  await browser.disconnect();
}
process.exit(audit.pass ? 0 : 1);