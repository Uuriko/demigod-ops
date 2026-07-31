// SuperGrok Heavy — vinyl ↔ rhythm bridge (exploration seeds rhythm entry)
window.VinylEchoBridge = (function () {
  const VINYL_META = {
    moon: { color: '#c9a84c', lane: 0, label: 'D' },
    shelter: { color: '#4a8f7a', lane: 1, label: 'F' },
    mirror: { color: '#7b5ea7', lane: 2, label: 'J' },
    eat: { color: '#c45c7a', lane: 3, label: 'K' },
  };
  const NPC_BONUS = { orph: 8, simon: 6, honey: 10 };

  const MOTIFS = {
    moon: [349.23, 392, 440],
    shelter: [293.66, 349.23, 392],
    mirror: [523.25, 587.33, 659.25],
    eat: [220, 261.63, 329.63],
  };

  let resonance = 0;
  const memorySeeds = [];
  let beatTimer = null;
  let tutorialGen = 0;
  let ghostUntil = 0;
  let ghostLane = 0;
  let ghostKey = 'D';
  let ghostColor = '#c9a84c';
  let ghostSliceUntil = 0;

  function recordPreview(vinylId, audioCtx, dest) {
    if (!vinylId) return getSeed();
    const isNew = !memorySeeds.includes(vinylId);
    if (isNew) {
      memorySeeds.push(vinylId);
      resonance = Math.min(100, resonance + 25);
    }
    playEchoTutorial(vinylId, audioCtx, dest);
    triggerGhostTeaser(vinylId, audioCtx, dest);
    return getSeed();
  }

  function showGhostSlice(vinylId, audioCtx, dest) {
    const meta = VINYL_META[vinylId] || VINYL_META.moon;
    ghostLane = meta.lane;
    ghostKey = meta.label;
    ghostColor = meta.color;
    ghostSliceUntil = Date.now() + 2600;
    ghostUntil = Date.now() + 2600;
    playTeaserPing(audioCtx, dest, meta.lane);
  }

  function playTeaserPing(audioCtx, dest, lane = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const f = audioCtx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = 280 + lane * 88;
    f.type = 'lowpass';
    f.frequency.value = 2400;
    g.gain.value = 0.14;
    osc.connect(f).connect(g).connect(dest || audioCtx.destination);
    const t = audioCtx.currentTime;
    osc.start(t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.28);
    osc.stop(t + 0.3);
  }

  function triggerGhostTeaser(vinylId, audioCtx, dest) {
    const meta = VINYL_META[vinylId] || VINYL_META.moon;
    ghostLane = meta.lane;
    ghostKey = meta.label;
    ghostColor = meta.color;
    ghostUntil = Date.now() + 2000;
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 220 + ghostLane * 95;
    g.gain.value = 0.08;
    osc.connect(g).connect(dest || audioCtx.destination);
    const t = audioCtx.currentTime;
    osc.start(t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.18);
    osc.stop(t + 0.2);
  }

  const hummedThisSession = new Set();

  function playMotif(vinylId, audioCtx, dest, gain = 0.06) {
    const notes = MOTIFS[vinylId] || MOTIFS.eat;
    if (!audioCtx || !notes) return;
    const t0 = audioCtx.currentTime + 0.05;
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(dest || audioCtx.destination);
      const t = t0 + i * 0.42;
      osc.start(t);
      g.gain.linearRampToValueAtTime(0.001, t + 0.35);
      osc.stop(t + 0.38);
    });
  }

  function recordNpc(npcId) {
    if (!npcId || memorySeeds.includes(`npc:${npcId}`)) return getSeed();
    memorySeeds.push(`npc:${npcId}`);
    resonance = Math.min(100, resonance + (NPC_BONUS[npcId] || 5));
    return getSeed();
  }

  function recordBirdGuide(audioCtx, dest) {
    if (memorySeeds.includes('bird')) return getSeed();
    memorySeeds.push('bird');
    resonance = Math.min(100, resonance + 12);
    playTeaserPing(audioCtx, dest, 1);
    return getSeed();
  }

  function clearBeatTimer() {
    if (beatTimer) {
      clearInterval(beatTimer);
      beatTimer = null;
    }
  }

  function cleanup() {
    tutorialGen++;
    clearBeatTimer();
    ghostUntil = 0;
  }

  function trySarahHum(vinylId, audioCtx, dest) {
    const listens = window.GameProgress?.getVinylListenCount?.(vinylId) ?? 0;
    if (listens < 3 || !vinylId || hummedThisSession.has(vinylId)) return false;
    hummedThisSession.add(vinylId);
    playMotif(vinylId, audioCtx, dest, 0.052);
    return true;
  }

  function resetSession() {
    cleanup();
    memorySeeds.length = 0;
    resonance = 0;
    ghostUntil = 0;
    ghostSliceUntil = 0;
    hummedThisSession.clear();
  }

  function playEchoTutorial(vinylId, audioCtx, dest) {
    if (!audioCtx) return;
    const gen = ++tutorialGen;
    clearBeatTimer();
    const meta = VINYL_META[vinylId] || VINYL_META.moon;
    let b = 0;
    beatTimer = setInterval(() => {
      if (gen !== tutorialGen) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      b++;
      const lane = (meta.lane + b - 1) % 4;
      const freq = 220 + lane * 95 + vinylId.length * 8;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const lpf = audioCtx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      lpf.type = 'lowpass';
      lpf.frequency.value = 900 + resonance * 6;
      g.gain.value = 0.12;
      osc.connect(lpf).connect(g).connect(dest || audioCtx.destination);
      const t = audioCtx.currentTime;
      osc.start(t);
      g.gain.linearRampToValueAtTime(0.001, t + 0.22);
      osc.stop(t + 0.25);
      if (b >= 4) clearBeatTimer();
    }, 340);
  }

  function getSeed() {
    const vinylOnly = memorySeeds.filter((s) => !s.startsWith('npc:'));
    const flavor = vinylOnly[vinylOnly.length - 1] || 'moon';
    return {
      resonance,
      seeds: [...memorySeeds],
      vinyls: vinylOnly,
      flavor,
      multi: 1 + resonance / 140,
      nomBiasMs: Math.floor(resonance / 5),
      color: VINYL_META[flavor]?.color || '#c9a84c',
    };
  }

  function drawOverworldHud(ctx, x, y, w) {
    const pct = Math.min(100, resonance);
    const albumPct = window.GameProgress?.getAlbumPct?.() ?? 0;
    const wins = window.GameProgress?.getState?.()?.wins ?? 0;
    const h = 68;
    ctx.fillStyle = 'rgba(10,8,18,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = '#c45c7a';
    ctx.textAlign = 'left';
    ctx.fillText('ECHO → RHYTHM', x + 8, y + 12);
    ctx.fillStyle = '#1a1028';
    ctx.fillRect(x + 8, y + 18, w - 16, 8);
    ctx.fillStyle = `hsl(${pct * 1.8}, 72%, 58%)`;
    ctx.fillRect(x + 8, y + 18, (w - 16) * (pct / 100), 8);
    ctx.fillStyle = 'rgba(232,224,240,0.55)';
    const orbN = memorySeeds.filter((s) => !s.startsWith('npc:')).length;
    ctx.fillText(`echo orbs → richer slices · ${orbN} orb${orbN === 1 ? '' : 's'}`, x + 8, y + 34);
    const orbX = x + w - 18;
    const orbY = y + 22;
    ctx.fillStyle = 'rgba(26,16,40,0.9)';
    ctx.beginPath();
    ctx.arc(orbX, orbY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsl(${pct * 1.8}, 72%, 58%)`;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 4 + (pct / 100) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7b5ea7';
    ctx.fillText('ALBUM', x + 8, y + 48);
    ctx.fillStyle = '#1a1028';
    ctx.fillRect(x + 8, y + 52, w - 16, 6);
    ctx.fillStyle = '#c45c7a';
    ctx.fillRect(x + 8, y + 52, (w - 16) * (albumPct / 100), 6);
    ctx.fillStyle = 'rgba(232,224,240,0.45)';
    ctx.fillText(`${albumPct}% · ${wins} wing${wins === 1 ? '' : 's'}`, x + 8, y + 64);
  }

  function drawGhostSlice(ctx, W, H) {
    if (ghostSliceUntil < Date.now()) return;
    const fade = (ghostSliceUntil - Date.now()) / 2600;
    const laneW = 56;
    const laneX0 = W / 2 - laneW * 2;
    const y = H - 108;
    const x = laneX0 + ghostLane * laneW + laneW / 2;
    const pulse = 0.55 + Math.sin(Date.now() / 140) * 0.35;
    ctx.save();
    ctx.globalAlpha = fade * pulse;
    if (window.PixelGfx?.drawGhostSlice) {
      PixelGfx.drawGhostSlice(ctx, x, y, ghostColor, ghostKey);
    } else {
      ctx.fillStyle = ghostColor;
      ctx.fillRect(x - 20, y - 16, 40, 12);
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#f8f4e8';
      ctx.textAlign = 'center';
      ctx.fillText(ghostKey, x, y - 6);
    }
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(232,224,240,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText('rhythm bite preview', W / 2, y + 14);
    ctx.restore();
  }

  function drawOverworldGhost(ctx, W, H) {
    if (ghostUntil < Date.now()) return;
    const fade = (ghostUntil - Date.now()) / 2000;
    const laneW = 56;
    const laneX0 = W / 2 - laneW * 2;
    const y = H - 88;
    const x = laneX0 + ghostLane * laneW + laneW / 2;
    ctx.globalAlpha = fade * 0.75;
    ctx.fillStyle = 'rgba(201,168,76,0.25)';
    ctx.fillRect(laneX0, y - 28, laneW * 4, 36);
    ctx.fillStyle = ghostColor;
    ctx.fillRect(x - 18, y - 22, 36, 14);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#f8f4e8';
    ctx.textAlign = 'center';
    ctx.fillText(ghostKey, x, y - 12);
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(232,224,240,0.5)';
    ctx.fillText('rhythm bite preview', W / 2, y + 8);
    ctx.globalAlpha = 1;
  }

  function drawRhythmEchoOrbs(ctx, x, y, echoCount, time, hotPulse = false) {
    if (!echoCount) return;
    const rich = echoCount > 2;
    const labelAlpha = hotPulse ? 0.75 : rich ? 0.62 : 0.45;
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = `rgba(232,224,240,${labelAlpha})`;
    ctx.textAlign = 'left';
    ctx.fillText(`echo orbs → richer slices`, x, y);
    ctx.fillStyle = rich ? 'rgba(201,168,76,0.7)' : `rgba(232,224,240,${labelAlpha * 0.85})`;
    ctx.fillText(`${echoCount} orb${echoCount > 1 ? 's' : ''}${rich ? ' · TASTY boost' : ''}`, x, y + 10);
    for (let i = 0; i < Math.min(echoCount, 5); i++) {
      const ox = x + 88 + i * 14;
      const pulseBase = hotPulse ? 0.85 : 0.65;
      const pulse = pulseBase + Math.sin(time * (hotPulse ? 0.22 : 0.14) + i * 1.1) * (hotPulse ? 0.35 : 0.25);
      ctx.fillStyle = `hsla(${120 + i * 38}, 72%, 58%, ${pulse})`;
      ctx.beginPath();
      ctx.arc(ox, y - 4, 4 + (i === echoCount - 1 ? 1 : 0), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRhythmGhosts(ctx, laneX0, laneW, hitY, slicesEaten, time) {
    if (slicesEaten >= 4 || memorySeeds.length === 0) return;
    const keys = ['D', 'F', 'J', 'K'];
    const lane = slicesEaten % 4;
    const x = laneX0 + lane * laneW + laneW / 2;
    const pulse = 0.5 + Math.sin(time * 0.12) * 0.3;
    ctx.globalAlpha = pulse * 0.65;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#f8f4e8';
    ctx.textAlign = 'center';
    ctx.fillText(keys[lane], x, hitY - 36);
    ctx.globalAlpha = 1;
  }

  function getVinylListenCount() {
    return memorySeeds.filter((s) => !s.startsWith('npc:')).length;
  }

  function getLastVinylId() {
    const vinylOnly = memorySeeds.filter((s) => !s.startsWith('npc:'));
    return vinylOnly[vinylOnly.length - 1] || null;
  }

  return {
    recordPreview, recordNpc, recordBirdGuide, getSeed, getVinylListenCount, getLastVinylId,
    drawOverworldHud, drawOverworldGhost, drawGhostSlice, drawRhythmEchoOrbs, drawRhythmGhosts,
    playMotif, playTeaserPing, showGhostSlice, trySarahHum,
    cleanup, clearBeatTimer, resetSession,
  };
})();