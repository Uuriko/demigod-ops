/**
 * Bottom dancer. One skinned GLB + Umplix CC0 loop.
 * Track: Umplix, "Polygons N' Light", OpenGameArt, CC0 1.0.
 */
(function (global) {
  'use strict';

  var LOBBY = 'https://lobby.getdasha.com';
  var GLB = LOBBY + '/client/dasha.glb';
  var FACE = LOBBY + '/client/dasha-face.webp';
  var LOOP = LOBBY + '/client/dasha-loop.mp3';
  var THREE_SRC = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
  var ADDONS = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/';
  var MUTE_KEY = 'dashaMute';
  var DOCK_H = 156;
  var HALF_H = 0.84;
  var LOOK_EVERY = 3;
  var LOOK_HOLD = 1.15;

  var dock = null;
  var canvas = null;
  var hit = null;
  var speaker = null;
  var audio = null;
  var raf = 0;
  var reduced = false;
  var muted = false;
  var gesturing = false;
  var dead = false;
  var onScreen = true;
  var tabVisible = true;
  var scrolling = false;
  var scrollTimer = 0;
  var lowEnd = false;
  var THREE = null;
  var renderer = null;
  var scene = null;
  var camera = null;
  var wrap = null;
  var head = null;
  var mixer = null;
  var clock = null;
  var dir = 1;
  var yaw = -0.85;
  var crossings = 0;
  var lookHold = 0;
  var ro = null;
  var io = null;
  var tmp = null;

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
    return '#dasha-dance{position:fixed;left:0;right:0;bottom:0;z-index:12;height:' + DOCK_H + 'px;pointer-events:none}' +
      '#dasha-dance canvas{display:block;width:100%;height:' + DOCK_H + 'px;background:transparent}' +
      '#dasha-dance button{pointer-events:auto;margin:0;padding:0;border:0;cursor:pointer;background:transparent}' +
      '#dasha-dance button:focus-visible{outline:3px solid #dfff00;outline-offset:3px}' +
      '#dasha-dance .dasha-dance-hit{position:absolute;left:50%;width:88px;height:150px;bottom:0;margin-left:-44px}' +
      '#dasha-dance .dasha-dance-speaker{position:absolute;right:max(8px,env(safe-area-inset-right,0px));top:8px;width:48px;height:48px;background:#070608;border:2px solid #dfff00}' +
      '#dasha-dance .dasha-dance-speaker svg{display:block;width:32px;height:32px;margin:6px auto}';
  }

  function speakerSvg(on) {
    return '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<path fill="#dfff00" d="M10 18h7l11-8v28L17 30h-7z"/>' +
      (on
        ? '<path fill="none" stroke="#dfff00" stroke-width="3" stroke-linecap="square" d="M12 12l24 24"/>'
        : '<path fill="none" stroke="#dfff00" stroke-width="2.6" stroke-linecap="square" d="M32 18a8 8 0 010 12M36 13a14 14 0 010 22"/>') +
      '</svg>';
  }

  function paintSpeaker() {
    if (!speaker) return;
    speaker.innerHTML = speakerSvg(muted);
    speaker.setAttribute('aria-pressed', muted ? 'true' : 'false');
    speaker.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    if (hit) {
      hit.setAttribute('aria-pressed', muted ? 'true' : 'false');
      hit.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    }
  }

  function playLoop() {
    if (dead || reduced || muted || !audio || !live()) return;
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
    paintSpeaker();
  }

  function onTap(ev) {
    if (ev) ev.preventDefault();
    if (reduced) return;
    setMuted(!muted);
    if (!muted) playLoop();
  }

  function pinThree() {
    if (document.querySelector('script[type="importmap"]')) return;
    var s = document.createElement('script');
    s.type = 'importmap';
    s.textContent = '{"imports":{"three":"' + THREE_SRC + '","three/addons/":"' + ADDONS + '"}}';
    document.head.appendChild(s);
  }

  function live() {
    return onScreen && tabVisible && !dead && !scrolling;
  }

  function stopTick() {
    if (raf) global.cancelAnimationFrame(raf);
    raf = 0;
  }

  function ratioCap() {
    return (scrolling || lowEnd) ? 1 : 2;
  }

  function applyPixelRatio() {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, ratioCap()));
  }

  function onScrollPulse() {
    if (dead || reduced) return;
    if (!scrolling) {
      scrolling = true;
      stopTick();
      applyPixelRatio();
    }
    if (scrollTimer) global.clearTimeout(scrollTimer);
    scrollTimer = global.setTimeout(afterScroll, 150);
  }

  function afterScroll() {
    scrollTimer = 0;
    scrolling = false;
    if (clock) clock.getDelta();
    applyPixelRatio();
    if (live()) goLive();
  }

  function goQuiet() {
    stopTick();
    if (audio) {
      try { audio.pause(); } catch (e) { /* closed */ }
    }
  }

  function goLive() {
    if (dead || reduced) return;
    if (!raf) tick();
    if (!muted) playLoop();
  }

  function onVis() {
    tabVisible = !document.hidden;
    if (live()) goLive();
    else goQuiet();
  }

  function travelWidth() {
    if (!camera) return 4;
    return camera.right - camera.left;
  }

  function placeHit() {
    if (!hit || !camera || !tmp) return;
    var w = canvas.clientWidth || 1;
    var h = canvas.clientHeight || DOCK_H;
    var obj = head || wrap;
    if (!obj) return;
    obj.getWorldPosition(tmp);
    tmp.y += head ? 0 : 1.46;
    tmp.project(camera);
    hit.style.left = Math.round((tmp.x * 0.5 + 0.5) * w - 44) + 'px';
    hit.style.top = Math.round((-tmp.y * 0.5 + 0.5) * h - 36) + 'px';
    hit.style.marginLeft = '0';
  }

  function fit() {
    if (!renderer || !camera || !dock) return;
    var w = dock.clientWidth || global.innerWidth || 320;
    renderer.setSize(w, DOCK_H, true);
    var halfW = HALF_H * (w / DOCK_H);
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = HALF_H;
    camera.bottom = -HALF_H;
    camera.updateProjectionMatrix();
    if (reduced && scene) renderer.render(scene, camera);
    placeHit();
  }

  function tick() {
    if (dead || !renderer || !scene || !camera || !wrap) {
      raf = 0;
      return;
    }
    if (!live()) {
      raf = 0;
      return;
    }
    var dt = clock ? Math.min(0.05, clock.getDelta()) : 0.016;
    if (!reduced) {
      var span = travelWidth() / 2 - 0.45;
      var want = dir > 0 ? -0.85 : 0.85;
      if (lookHold > 0) {
        lookHold -= dt;
        want = 0;
      }
      yaw += (want - yaw) * Math.min(1, dt * 2.2);
      wrap.rotation.y = yaw;
      var turning = Math.abs(want - yaw) > 0.16;
      if (lookHold <= 0 && !turning) {
        wrap.position.x += dir * 0.95 * dt;
        if (wrap.position.x > span) {
          wrap.position.x = span;
          dir = -1;
          crossings += 1;
          if (crossings % LOOK_EVERY === 0) lookHold = LOOK_HOLD;
        } else if (wrap.position.x < -span) {
          wrap.position.x = -span;
          dir = 1;
          crossings += 1;
          if (crossings % LOOK_EVERY === 0) lookHold = LOOK_HOLD;
        }
      }
      if (mixer) mixer.update(dt);
    }
    placeHit();
    renderer.render(scene, camera);
    if (!reduced) raf = global.requestAnimationFrame(tick);
  }

  function stillFallback() {
    if (!hit || hit.querySelector('img')) return;
    var img = document.createElement('img');
    img.src = FACE;
    img.alt = '';
    img.width = 88;
    img.height = 88;
    img.style.display = 'block';
    img.style.margin = '30px auto 0';
    hit.appendChild(img);
  }

  function dressMat(mat) {
    mat.metalness = 0;
    mat.roughness = 0.9;
    mat.envMap = null;
    mat.envMapIntensity = 0;
    mat.onBeforeCompile = function (shader) {
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
        'float rim = 1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0);' +
        'vec3 outgoingLight = totalDiffuse + totalSpecular * 0.15 + totalEmissiveRadiance;' +
        'outgoingLight += vec3(0.874, 1.0, 0.0) * pow(rim, 2.7) * 0.58;' +
        'outgoingLight += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.028;'
      );
    };
    mat.needsUpdate = true;
  }

  function startScene(gltf) {
    if (dead || !canvas || !THREE) return;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
      });
    } catch (e) {
      stillFallback();
      return;
    }
    renderer.setClearColor(0x000000, 0);
    applyPixelRatio();
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1.6, 1.6, HALF_H, -HALF_H, 0.1, 40);
    camera.position.set(0, 0.80, 4);
    camera.lookAt(0, 0.80, 0);
    scene.add(new THREE.AmbientLight(0xfff6ee, 0.78));
    var key = new THREE.DirectionalLight(0xfff4e8, 0.52);
    key.position.set(1.1, 2.2, 3.4);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xc8d4ff, 0.16);
    fill.position.set(-2.2, 1.1, 1.4);
    scene.add(fill);
    wrap = new THREE.Group();
    wrap.add(gltf.scene);
    gltf.scene.traverse(function (obj) {
      if (obj.name === 'head') head = obj;
      if (obj.material) {
        if (obj.material.isMaterial) dressMat(obj.material);
      }
    });
    scene.add(wrap);
    tmp = new THREE.Vector3();
    clock = new THREE.Clock();
    if (!reduced && gltf.animations && gltf.animations.length) {
      mixer = new THREE.AnimationMixer(gltf.scene);
      var clip = mixer.clipAction(gltf.animations[0]);
      clip.play();
    }
    fit();
    if (global.ResizeObserver) {
      ro = new ResizeObserver(fit);
      ro.observe(dock);
    } else {
      global.addEventListener('resize', fit);
    }
    if (global.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) {
        onScreen = !!(entries[0] && entries[0].isIntersecting);
        if (live()) goLive();
        else goQuiet();
      }, { threshold: 0 });
      io.observe(dock);
    }
    document.addEventListener('visibilitychange', onVis);
    global.addEventListener('scroll', onScrollPulse, { passive: true });
    global.addEventListener('wheel', onScrollPulse, { passive: true });
    global.addEventListener('touchmove', onScrollPulse, { passive: true });
    if (reduced) {
      renderer.render(scene, camera);
      placeHit();
    } else {
      tick();
    }
  }

  function dispose() {
    dead = true;
    if (raf) global.cancelAnimationFrame(raf);
    raf = 0;
    document.removeEventListener('visibilitychange', onVis);
    global.removeEventListener('scroll', onScrollPulse);
    global.removeEventListener('wheel', onScrollPulse);
    global.removeEventListener('touchmove', onScrollPulse);
    if (scrollTimer) global.clearTimeout(scrollTimer);
    scrollTimer = 0;
    scrolling = false;
    if (ro) {
      try { ro.disconnect(); } catch (e) { /* closed */ }
      ro = null;
    }
    if (io) {
      try { io.disconnect(); } catch (e0) { /* closed */ }
      io = null;
    }
    global.removeEventListener('resize', fit);
    if (mixer) {
      mixer.stopAllAction();
      mixer = null;
    }
    if (renderer) {
      try { renderer.dispose(); } catch (e2) { /* closed */ }
      renderer = null;
    }
    scene = null;
    camera = null;
    wrap = null;
    head = null;
    clock = null;
    tmp = null;
    if (audio) {
      try { audio.pause(); } catch (e3) { /* closed */ }
      audio.removeAttribute('src');
      try { audio.load(); } catch (e4) { /* closed */ }
      audio = null;
    }
    if (dock && dock.parentNode) dock.parentNode.removeChild(dock);
    dock = null;
    canvas = null;
    hit = null;
    speaker = null;
    global.removeEventListener('pagehide', dispose);
  }

  function mount() {
    if (dead || document.getElementById('dasha-dance')) return;
    reduced = prefersReduced();
    muted = reduced ? true : readMute();
    tabVisible = !document.hidden;
    var nav = global.navigator || {};
    lowEnd = (nav.deviceMemory && nav.deviceMemory <= 4) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4);
    var style = document.createElement('style');
    style.textContent = css();
    dock = document.createElement('div');
    dock.id = 'dasha-dance';
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'dasha-dance-hit';
    speaker = document.createElement('button');
    speaker.type = 'button';
    speaker.className = 'dasha-dance-speaker';
    paintSpeaker();
    dock.appendChild(style);
    dock.appendChild(canvas);
    dock.appendChild(hit);
    dock.appendChild(speaker);
    document.body.appendChild(dock);
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
      hit.addEventListener('click', onTap);
      speaker.addEventListener('click', onTap);
    } else {
      hit.disabled = true;
      speaker.disabled = true;
    }
    global.addEventListener('pagehide', dispose);
    pinThree();
    Promise.all([
      import(THREE_SRC),
      import('three/addons/loaders/GLTFLoader.js'),
    ]).then(function (pack) {
      if (dead) return;
      THREE = pack[0];
      var Loader = pack[1] && pack[1].GLTFLoader;
      if (!THREE || !Loader) {
        stillFallback();
        return;
      }
      var loader = new Loader();
      loader.setCrossOrigin('anonymous');
      loader.load(GLB, function (gltf) {
        if (dead) return;
        startScene(gltf);
      }, undefined, stillFallback);
    }).catch(stillFallback);
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
