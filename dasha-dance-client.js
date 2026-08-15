/**
 * Bottom dancer. One Three r170 Dasha + Umplix CC0 loop.
 * Track: Umplix, "Polygons N' Light", OpenGameArt, CC0 1.0.
 */
(function (global) {
  'use strict';

  var LOBBY = 'https://lobby.getdasha.com';
  var FACE = LOBBY + '/client/dasha-face.webp';
  var LOOP = LOBBY + '/client/dasha-loop.mp3';
  var THREE_SRC = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
  var MUTE_KEY = 'dashaMute';
  var DOCK_H = 156;
  var SKIN = 0xf0d2be;
  var HAIR = 0xc4a36a;
  var HAIR_DIM = 0x8d6b45;
  var TEE = 0x161618;
  var CAP = 0x0c0c0e;
  var JEAN = 0x242428;
  var MOLE = 0x3a2418;

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
  var THREE = null;
  var renderer = null;
  var scene = null;
  var camera = null;
  var rig = null;
  var clock = null;
  var dir = 1;
  var yaw = -0.85;
  var ro = null;
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
      '#dasha-dance .dasha-dance-speaker{position:absolute;left:max(8px,env(safe-area-inset-left,0px));bottom:max(8px,env(safe-area-inset-bottom,0px));width:48px;height:48px;background:#070608;border:2px solid #dfff00}' +
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
    paintSpeaker();
  }

  function onTap(ev) {
    if (ev) ev.preventDefault();
    if (reduced) return;
    setMuted(!muted);
    if (!muted) playLoop();
  }

  function mat(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color: color,
      roughness: 0.78,
      metalness: 0.02,
    }, extra || {}));
  }

  function capLabel() {
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    var g = c.getContext('2d');
    g.fillStyle = '#0c0c0e';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#f4eddb';
    g.font = '900 34px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('SCARY', 128, 34);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    var mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.05),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    mesh.position.set(0, 0.05, 0.145);
    return mesh;
  }

  function addHair(head, hair, dim) {
    var clumps = [
      [0, 0.08, -0.12, 0.145, hair],
      [0.11, 0.02, -0.07, 0.1, hair],
      [-0.11, 0.02, -0.07, 0.1, dim],
      [0.13, -0.08, 0.02, 0.085, hair],
      [-0.12, -0.1, 0.01, 0.08, dim],
      [0.15, -0.2, 0.0, 0.09, hair],
      [-0.1, -0.22, -0.02, 0.085, dim],
      [0.02, 0.1, -0.14, 0.11, dim],
    ];
    var i;
    for (i = 0; i < clumps.length; i++) {
      var c = clumps[i];
      var m = new THREE.Mesh(new THREE.SphereGeometry(c[3], 10, 8), c[4]);
      m.position.set(c[0], c[1], c[2]);
      head.add(m);
    }
  }

  function limb(len, r, material) {
    var g = new THREE.Group();
    var mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), material);
    mesh.position.y = -len / 2 - r * 0.2;
    g.add(mesh);
    return g;
  }

  function buildRig(faceMap) {
    var skin = mat(SKIN);
    var hair = mat(HAIR, { roughness: 0.92 });
    var dim = mat(HAIR_DIM, { roughness: 0.94 });
    var tee = mat(TEE, { roughness: 0.7 });
    var capM = mat(CAP, { roughness: 0.55 });
    var jean = mat(JEAN);
    var shoe = mat(0x111114, { roughness: 0.6 });
    var moleM = mat(MOLE, { roughness: 1 });

    var root = new THREE.Group();
    var hips = new THREE.Group();
    hips.position.y = 0.7;
    root.add(hips);

    var torso = new THREE.Group();
    torso.position.y = 0.06;
    hips.add(torso);
    var chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.3, 6, 12), tee);
    chest.position.y = 0.24;
    torso.add(chest);
    var hem = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.12, 12), tee);
    hem.position.y = 0.02;
    torso.add(hem);
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.08, 8), skin);
    neck.position.y = 0.44;
    torso.add(neck);

    var head = new THREE.Group();
    head.position.y = 0.58;
    torso.add(head);
    var skull = new THREE.Mesh(new THREE.SphereGeometry(0.152, 20, 16), skin);
    skull.scale.set(0.9, 1.04, 0.86);
    head.add(skull);
    if (faceMap) {
      var face = new THREE.Mesh(
        new THREE.CircleGeometry(0.132, 28),
        new THREE.MeshStandardMaterial({
          map: faceMap,
          transparent: true,
          alphaTest: 0.18,
          roughness: 0.62,
          metalness: 0,
        })
      );
      face.position.set(0, -0.012, 0.118);
      head.add(face);
    }
    var cheek = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), moleM);
    cheek.position.set(0.088, -0.018, 0.128);
    head.add(cheek);
    var chin = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), moleM);
    chin.position.set(0.022, -0.1, 0.122);
    head.add(chin);
    var earL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), skin);
    earL.position.set(0.13, -0.01, 0.01);
    earL.scale.set(0.55, 1, 0.7);
    head.add(earL);
    var earR = earL.clone();
    earR.position.x = -0.13;
    head.add(earR);
    addHair(head, hair, dim);

    var crown = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), capM);
    crown.scale.set(1.06, 0.62, 1.04);
    crown.position.y = 0.09;
    head.add(crown);
    var brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.018, 0.15), capM);
    brim.position.set(0, 0.03, 0.155);
    head.add(brim);
    head.add(capLabel());

    var lArm = limb(0.22, 0.038, skin);
    lArm.position.set(0.2, 0.38, 0);
    torso.add(lArm);
    var lFore = limb(0.2, 0.032, skin);
    lFore.position.y = -0.24;
    lArm.add(lFore);
    var rArm = limb(0.22, 0.038, skin);
    rArm.position.set(-0.2, 0.38, 0);
    torso.add(rArm);
    var rFore = limb(0.2, 0.032, skin);
    rFore.position.y = -0.24;
    rArm.add(rFore);

    var lLeg = limb(0.28, 0.05, jean);
    lLeg.position.set(0.08, 0, 0);
    hips.add(lLeg);
    var lShin = limb(0.26, 0.042, jean);
    lShin.position.y = -0.3;
    lLeg.add(lShin);
    var lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.16), shoe);
    lShoe.position.set(0, -0.3, 0.03);
    lShin.add(lShoe);

    var rLeg = limb(0.28, 0.05, jean);
    rLeg.position.set(-0.08, 0, 0);
    hips.add(rLeg);
    var rShin = limb(0.26, 0.042, jean);
    rShin.position.y = -0.3;
    rLeg.add(rShin);
    var rShoe = lShoe.clone();
    rShin.add(rShoe);

    return {
      root: root,
      hips: hips,
      torso: torso,
      head: head,
      lArm: lArm,
      rArm: rArm,
      lFore: lFore,
      rFore: rFore,
      lLeg: lLeg,
      rLeg: rLeg,
      lShin: lShin,
      rShin: rShin,
    };
  }

  function pose(t, moving) {
    if (!rig) return;
    var s = moving ? 1 : 0;
    var step = Math.sin(t);
    var kick = Math.sin(t * 2);
    rig.hips.position.y = 0.7 + Math.abs(step) * 0.04 * s;
    rig.hips.rotation.y = step * 0.2 * s;
    rig.torso.rotation.z = -step * 0.1 * s;
    rig.torso.rotation.y = step * 0.14 * s;
    rig.head.rotation.y = -step * 0.12 * s;
    rig.head.rotation.z = step * 0.05 * s;
    rig.lLeg.rotation.x = step * 0.72 * s;
    rig.rLeg.rotation.x = -step * 0.72 * s;
    rig.lShin.rotation.x = Math.max(0, -step) * 0.5 * s;
    rig.rShin.rotation.x = Math.max(0, step) * 0.5 * s;
    rig.lArm.rotation.x = -step * 0.62 * s + kick * 0.08 * s;
    rig.rArm.rotation.x = step * 0.62 * s;
    rig.lArm.rotation.z = 0.42 + Math.abs(step) * 0.12 * s;
    rig.rArm.rotation.z = -0.42 - Math.abs(step) * 0.12 * s;
    rig.lFore.rotation.x = -0.28 - Math.abs(step) * 0.22 * s;
    rig.rFore.rotation.x = -0.28 - Math.abs(step) * 0.22 * s;
  }

  function travelWidth() {
    if (!camera) return 4;
    var dist = camera.position.z;
    var h = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist;
    return h * camera.aspect;
  }

  function placeHit() {
    if (!hit || !rig || !camera || !tmp) return;
    var w = canvas.clientWidth || 1;
    var h = canvas.clientHeight || DOCK_H;
    rig.head.getWorldPosition(tmp);
    tmp.project(camera);
    var sx = (tmp.x * 0.5 + 0.5) * w;
    var sy = (-tmp.y * 0.5 + 0.5) * h;
    hit.style.left = Math.round(sx - 44) + 'px';
    hit.style.top = Math.round(sy - 36) + 'px';
    hit.style.marginLeft = '0';
  }

  function fit() {
    if (!renderer || !camera || !dock) return;
    var w = dock.clientWidth || global.innerWidth || 320;
    renderer.setSize(w, DOCK_H, true);
    camera.aspect = w / DOCK_H;
    camera.updateProjectionMatrix();
    if (reduced && scene) renderer.render(scene, camera);
    placeHit();
  }

  function tick() {
    if (dead || !renderer || !scene || !camera || !rig) return;
    var dt = clock ? Math.min(0.05, clock.getDelta()) : 0.016;
    var t = clock ? clock.elapsedTime * 5.2 : 0;
    if (!reduced) {
      var span = travelWidth() / 2 - 0.42;
      rig.root.position.x += dir * 0.95 * dt;
      if (rig.root.position.x > span) {
        rig.root.position.x = span;
        dir = -1;
      } else if (rig.root.position.x < -span) {
        rig.root.position.x = -span;
        dir = 1;
      }
      var want = dir > 0 ? -0.85 : 0.85;
      yaw += (want - yaw) * Math.min(1, dt * 5);
      rig.root.rotation.y = yaw;
      pose(t, true);
    } else {
      pose(0, false);
    }
    placeHit();
    renderer.render(scene, camera);
    if (!reduced) raf = global.requestAnimationFrame(tick);
  }

  function stillFallback() {
    if (!hit) return;
    var img = document.createElement('img');
    img.src = FACE;
    img.alt = '';
    img.width = 88;
    img.height = 88;
    img.style.display = 'block';
    img.style.margin = '30px auto 0';
    hit.appendChild(img);
  }

  function startScene(faceMap) {
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
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(28, 2, 0.1, 40);
    camera.position.set(0, 0.86, 4.15);
    camera.lookAt(0, 0.78, 0);
    scene.add(new THREE.AmbientLight(0xfff6ee, 0.72));
    var key = new THREE.DirectionalLight(0xfff4e8, 0.88);
    key.position.set(1.1, 2.2, 3.4);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xc8d4ff, 0.22);
    fill.position.set(-2.2, 1.1, 1.4);
    scene.add(fill);
    rig = buildRig(faceMap);
    scene.add(rig.root);
    tmp = new THREE.Vector3();
    clock = new THREE.Clock();
    fit();
    if (global.ResizeObserver) {
      ro = new ResizeObserver(fit);
      ro.observe(dock);
    } else {
      global.addEventListener('resize', fit);
    }
    if (reduced) {
      pose(0, false);
      renderer.render(scene, camera);
      placeHit();
    } else {
      tick();
    }
  }

  function loadFaceImg() {
    return new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = FACE;
    });
  }

  function faceTexture(img) {
    if (!img || !THREE) return null;
    var tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function dispose() {
    dead = true;
    if (raf) global.cancelAnimationFrame(raf);
    raf = 0;
    if (ro) {
      try { ro.disconnect(); } catch (e) { /* closed */ }
      ro = null;
    }
    global.removeEventListener('resize', fit);
    if (renderer) {
      try { renderer.dispose(); } catch (e2) { /* closed */ }
      renderer = null;
    }
    scene = null;
    camera = null;
    rig = null;
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
    Promise.all([
      import(THREE_SRC),
      loadFaceImg(),
    ]).then(function (pack) {
      if (dead) return;
      THREE = pack[0];
      if (!THREE) {
        stillFallback();
        return;
      }
      startScene(faceTexture(pack[1]));
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
