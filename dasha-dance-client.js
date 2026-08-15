/**
 * Bottom dancer. First-party digitized stills + Umplix CC0 loop.
 * Track: Umplix, "Polygons N' Light", OpenGameArt, CC0 1.0.
 */
(function (global) {
  'use strict';

  var LOBBY = 'https://lobby.getdasha.com';
  var SHEET = LOBBY + '/client/dasha-sheet.webp';
  var LOOP = LOBBY + '/client/dasha-loop.mp3';
  var MUTE_KEY = 'dashaMute';
  var FRAMES = 8;
  var FW = 88;
  var FH = 150;
  var STEPS = [
    { f: 0, x: 0, y: 0, s: 1, t: 180 },
    { f: 1, x: 8, y: -2, s: 1.01, t: 160 },
    { f: 2, x: 4, y: 1, s: 0.99, t: 200 },
    { f: 3, x: -3, y: 0, s: 1.02, t: 170 },
    { f: 4, x: -8, y: -1, s: 1, t: 180 },
    { f: 5, x: -5, y: 2, s: 0.98, t: 150 },
    { f: 6, x: 3, y: 1, s: 1.01, t: 190 },
    { f: 7, x: 6, y: -2, s: 1, t: 160 }
  ];

  var dock = null;
  var canvas = null;
  var ctx = null;
  var sheet = null;
  var audio = null;
  var raf = 0;
  var step = 0;
  var until = 0;
  var reduced = false;
  var muted = false;
  var gesturing = false;
  var dead = false;

  function prefersReduced() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function readMute() {
    try { return global.localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
  }

  function writeMute(on) {
    try { global.localStorage.setItem(MUTE_KEY, on ? '1' : '0'); } catch (e) { /* private */ }
  }

  function css() {
    return '#dasha-dance{position:fixed;left:0;right:0;bottom:0;z-index:12;height:150px;pointer-events:none}' +
      '#dasha-dance button{position:absolute;right:max(8px,env(safe-area-inset-right,0px));bottom:0;width:100px;height:150px;margin:0;padding:0;border:0;background:transparent;pointer-events:auto;cursor:pointer}' +
      '#dasha-dance button:focus-visible{outline:3px solid #dfff00;outline-offset:3px}' +
      '#dasha-dance canvas,#dasha-dance img{display:block;width:100%;height:100%;background:transparent;image-rendering:pixelated}';
  }

  function paint(now) {
    if (dead || !ctx || !sheet) return;
    var pose = STEPS[step];
    if (!reduced) {
      if (now >= until) {
        step = (step + 1) % STEPS.length;
        pose = STEPS[step];
        until = now + pose.t;
      }
    }
    ctx.clearRect(0, 0, 100, 150);
    ctx.imageSmoothingEnabled = false;
    var dw = FW * pose.s;
    var dh = FH * pose.s;
    ctx.drawImage(sheet, pose.f * FW, 0, FW, FH, 6 + pose.x, pose.y + (150 - dh), dw, dh);
    if (!reduced) raf = global.requestAnimationFrame(paint);
  }

  function stillFallback() {
    if (!dock) return;
    var img = document.createElement('img');
    img.src = SHEET;
    img.alt = '';
    img.width = 100;
    img.height = 150;
    var btn = dock.querySelector('button');
    if (btn) {
      btn.innerHTML = '';
      btn.appendChild(img);
    }
  }

  function playLoop() {
    if (dead || reduced || !audio) return;
    var go = audio.play();
    if (go && go.catch) go.catch(function () { waitGesture(); });
  }

  function waitGesture() {
    if (gesturing || reduced || dead) return;
    gesturing = true;
    function once() {
      gesturing = false;
      global.removeEventListener('pointerdown', once, true);
      global.removeEventListener('keydown', once, true);
      global.removeEventListener('scroll', once, true);
      playLoop();
    }
    global.addEventListener('pointerdown', once, true);
    global.addEventListener('keydown', once, true);
    global.addEventListener('scroll', once, true);
  }

  function setMuted(on) {
    muted = !!on;
    writeMute(muted);
    if (audio) audio.muted = muted;
    var btn = dock && dock.querySelector('button');
    if (btn) {
      btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    }
  }

  function onTap(ev) {
    if (ev) ev.preventDefault();
    if (reduced) return;
    setMuted(!muted);
    if (!muted) playLoop();
  }

  function dispose() {
    dead = true;
    if (raf) global.cancelAnimationFrame(raf);
    raf = 0;
    if (audio) {
      try { audio.pause(); } catch (e) { /* closed */ }
      audio.removeAttribute('src');
      try { audio.load(); } catch (e2) { /* closed */ }
      audio = null;
    }
    if (dock && dock.parentNode) dock.parentNode.removeChild(dock);
    dock = null;
    canvas = null;
    ctx = null;
    sheet = null;
    global.removeEventListener('pagehide', dispose);
  }

  function mount() {
    if (dead || document.getElementById('dasha-dance')) return;
    if (prefersReduced()) return;
    reduced = false;
    muted = readMute();
    var style = document.createElement('style');
    style.textContent = css();
    dock = document.createElement('div');
    dock.id = 'dasha-dance';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 150;
    canvas.setAttribute('aria-hidden', 'true');
    btn.appendChild(canvas);
    dock.appendChild(style);
    dock.appendChild(btn);
    document.body.appendChild(dock);
    ctx = canvas.getContext ? canvas.getContext('2d') : null;
    sheet = new Image();
    sheet.decoding = 'async';
    sheet.onload = function () {
      if (dead) return;
      if (!ctx) {
        stillFallback();
        return;
      }
      until = (global.performance && performance.now ? performance.now() : 0) + STEPS[0].t;
      paint(until);
    };
    sheet.onerror = stillFallback;
    sheet.src = SHEET;
    if (!ctx) stillFallback();
    if (!reduced) {
      audio = document.createElement('audio');
      audio.src = LOOP;
      audio.loop = true;
      audio.playsInline = true;
      audio.autoplay = true;
      audio.setAttribute('playsinline', '');
      audio.setAttribute('autoplay', '');
      audio.muted = muted;
      playLoop();
      btn.addEventListener('click', onTap);
    } else {
      btn.disabled = true;
    }
    global.addEventListener('pagehide', dispose);
  }

  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }

  global.DashaDance = { dispose: dispose, boot: boot };
  boot();
})(typeof window !== 'undefined' ? window : globalThis);
