/**
 * Public $DASHA chain graph client. Three r170 + OrbitControls from jsDelivr.
 * Browser talks only to same-origin /api/graph — no public RPC.
 */
(function (global) {
  'use strict';
  var MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  var PAIR = '9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7';
  var INK = 0x070608;
  var PAPER = 0xf4eddb;
  var ACID = 0xdfff00;
  var HOT = 0xff3b81;
  var data = { nodes: [], links: [], pulses: [], holdersLoaded: true, dex: {}, supply: null };
  var labelsOn = true;
  var listOn = false;
  var followOn = false;
  var reduced = false;
  var sceneApi = null;
  var selected = null;

  function $(id) { return document.getElementById(id); }
  function prefersReduced() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject();
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function shortId(id) {
    if (!id) return '';
    if (id === MINT) return '$DASHA';
    if (id.length < 12) return id;
    return id.slice(0, 4) + '…' + id.slice(-4);
  }
  function setStatus(text, kind) {
    var el = $('status');
    if (!el) return;
    el.textContent = text || '';
    el.dataset.kind = kind || '';
  }
  function closePanel() {
    var panel = $('panel');
    if (panel) { panel.hidden = true; panel.innerHTML = ''; }
    selected = null;
  }
  function showPanel(html) {
    var panel = $('panel');
    if (!panel) return;
    panel.innerHTML = html;
    panel.hidden = false;
  }
  function fmtHud(value) {
    if (value == null || value === '') return '—';
    var n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    if (n >= 1) return n.toFixed(2);
    return n.toPrecision(3);
  }
  function paintHud(dex) {
    dex = dex || {};
    var price = $('hud-price');
    var liq = $('hud-liq');
    var vol = $('hud-vol');
    var fdv = $('hud-fdv');
    if (price) price.textContent = dex.priceUsd != null && dex.priceUsd !== '' ? (Number(dex.priceUsd) ? fmtHud(dex.priceUsd) : String(dex.priceUsd)) : '—';
    if (liq) liq.textContent = Number.isFinite(Number(dex.liquidityUsd)) ? fmtHud(dex.liquidityUsd) : '—';
    if (vol) vol.textContent = Number.isFinite(Number(dex.volume24h)) ? fmtHud(dex.volume24h) : '—';
    if (fdv) fdv.textContent = Number.isFinite(Number(dex.fdv)) ? fmtHud(dex.fdv) : '—';
  }
  function paintList() {
    var list = $('list');
    if (!list) return;
    list.hidden = !(listOn || reduced);
    if (list.hidden) return;
    list.innerHTML = '';
    data.nodes.forEach(function (node) {
      var li = document.createElement('li');
      var bits = [node.id];
      if (node.symbol) bits.unshift(node.symbol);
      if (node.uiAmountString) bits.push(node.uiAmountString);
      li.innerHTML = '<strong>' + esc(node.role || node.kind || 'node') + '</strong> ' + esc(bits.join(' · '));
      list.appendChild(li);
    });
    data.links.forEach(function (link) {
      var li = document.createElement('li');
      li.textContent = (link.kind || 'link') + ' ' + link.source + ' → ' + link.target + (link.uiAmountString ? ' · ' + link.uiAmountString : '');
      list.appendChild(li);
    });
  }
  function explorerHref(id) {
    if (id === MINT) return 'https://solscan.io/token/' + id;
    return 'https://solscan.io/account/' + id;
  }
  function nodePanel(node) {
    selected = node;
    var amount = node.uiAmountString ? '<p>' + esc(node.uiAmountString) + '</p>' : '';
    var supply = node.id === MINT && data.supply && (data.supply.uiAmountString || data.supply.uiAmount != null)
      ? '<p>Supply ' + esc(data.supply.uiAmountString || String(data.supply.uiAmount)) + '</p>' : '';
    var holders = data.holdersLoaded ? '' : '<p>Holders: not loaded</p>';
    var expand = node.role === 'wallet' || node.kind === 'wallet'
      ? '<button type="button" data-expand="' + esc(node.id) + '">Expand hop</button>' : '';
    showPanel(
      '<h2>' + esc(node.symbol || (node.id === MINT ? '$DASHA' : node.role || 'Address')) + '</h2>' +
      '<p>' + esc(node.role || node.kind || '') + '</p>' +
      '<p><code>' + esc(node.id) + '</code></p>' + amount + supply + holders +
      '<div class="row"><button type="button" data-copy="' + esc(node.id) + '">Copy</button>' +
      '<a href="' + esc(explorerHref(node.id)) + '" target="_blank" rel="noopener noreferrer">Explorer</a>' +
      expand + '<button type="button" data-close="1">Close</button></div>'
    );
  }
  function mergeExpand(next) {
    if (!next || next.empty) {
      setStatus(next && next.reason === 'no_other_holdings' ? 'No other holdings' : (next && next.reason === 'rpc_unavailable' ? 'holders unavailable — retry' : 'Nothing to expand'), next && next.empty ? 'bad' : '');
      return;
    }
    var have = new Set(data.nodes.map(function (n) { return n.id; }));
    (next.nodes || []).forEach(function (node) {
      if (!have.has(node.id)) { data.nodes.push(node); have.add(node.id); }
    });
    (next.links || []).forEach(function (link) { data.links.push(link); });
    if (sceneApi) sceneApi.rebuild();
    paintList();
    setStatus('', '');
  }
  function expand(id) {
    setStatus('Expanding…');
    fetch('/api/graph/expand?id=' + encodeURIComponent(id), { credentials: 'omit' })
      .then(function (res) { return res.json(); })
      .then(mergeExpand)
      .catch(function () { setStatus('holders unavailable — retry', 'bad'); });
  }
  function bindPanel() {
    var panel = $('panel');
    if (!panel || panel.dataset.bound) return;
    panel.dataset.bound = '1';
    panel.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.dataset.close) closePanel();
      if (t.dataset.copy) copy(t.dataset.copy);
      if (t.dataset.expand) expand(t.dataset.expand);
    });
  }
  function nodeColor(node) {
    if (node.id === MINT) return ACID;
    if (node.hot) return HOT;
    return PAPER;
  }
  function layout(nodes) {
    var i = 0;
    var extras = nodes.filter(function (n) { return n.id !== MINT && n.id !== PAIR; });
    nodes.forEach(function (node) {
      if (node.id === MINT) { node.x = 0; node.y = 0; node.z = 0; return; }
      if (node.id === PAIR) { node.x = 6.2; node.y = 0.4; node.z = 0.2; return; }
      var t = extras.length ? (i++ / extras.length) * Math.PI * 2 : 0;
      var r = node.role === 'program' ? 14 : node.role === 'token' ? 10 : 11.5;
      node.x = Math.cos(t) * r;
      node.y = Math.sin(t * 1.7) * 2.4;
      node.z = Math.sin(t) * r;
    });
  }
  function startScene(THREE, OrbitControls) {
    var el = $('graph');
    if (!el) return null;
    var renderer = new THREE.WebGLRenderer({ antialias: !reduced, alpha: false });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth || global.innerWidth, el.clientHeight || global.innerHeight);
    renderer.setClearColor(INK, 1);
    el.innerHTML = '';
    el.appendChild(renderer.domElement);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, (el.clientWidth || global.innerWidth) / (el.clientHeight || global.innerHeight), 0.1, 200);
    camera.position.set(0, 8, 22);
    var controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !reduced;
    controls.enablePan = true;
    controls.target.set(0, 0, 0);
    var amb = new THREE.AmbientLight(PAPER, 0.62);
    var key = new THREE.DirectionalLight(ACID, 0.55);
    key.position.set(6, 10, 8);
    scene.add(amb, key);
    var group = new THREE.Group();
    scene.add(group);
    var pick = [];
    var pulseMeshes = [];
    var labelLayer = $('labels');
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var clicks = { id: '', at: 0 };
    var lastPulse = null;
    var running = true;

    function geo(node) {
      var role = node.role || node.kind;
      if (node.id === MINT || role === 'mint') return new THREE.IcosahedronGeometry(1.2, 0);
      if (node.id === PAIR || role === 'pair' || node.kind === 'pool') return new THREE.TorusGeometry(0.95, 0.28, 10, 24);
      if (role === 'program' || node.kind === 'program') return new THREE.OctahedronGeometry(0.9, 0);
      if (role === 'token' || (node.kind === 'mint' && node.id !== MINT)) return new THREE.BoxGeometry(1.05, 1.05, 1.05);
      return new THREE.SphereGeometry(0.52, 16, 12);
    }
    function scaleOf(node) {
      if (node.id === MINT) return 1.15;
      if (Number.isFinite(node.uiAmount) && node.uiAmount > 0) return Math.max(0.7, Math.min(2.1, Math.log10(node.uiAmount + 1) * 0.55));
      return 1;
    }
    function rebuild() {
      while (group.children.length) {
        var ch = group.children[0];
        group.remove(ch);
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) ch.material.dispose();
      }
      pick = [];
      pulseMeshes = [];
      layout(data.nodes);
      var byId = new Map(data.nodes.map(function (n) { return [n.id, n]; }));
      data.nodes.forEach(function (node) {
        var mat = new THREE.MeshStandardMaterial({
          color: nodeColor(node),
          roughness: 0.42,
          metalness: 0.08,
          emissive: node.id === MINT || node.hot ? nodeColor(node) : 0x000000,
          emissiveIntensity: node.id === MINT ? 0.22 : node.hot ? 0.18 : 0,
        });
        var mesh = new THREE.Mesh(geo(node), mat);
        mesh.position.set(node.x, node.y, node.z);
        var s = scaleOf(node);
        mesh.scale.setScalar(s);
        mesh.userData.node = node;
        group.add(mesh);
        pick.push(mesh);
      });
      data.links.forEach(function (link) {
        var a = byId.get(link.source);
        var b = byId.get(link.target);
        if (!a || !b) return;
        var pts = [new THREE.Vector3(a.x, a.y, a.z), new THREE.Vector3(b.x, b.y, b.z)];
        var line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: link.kind === 'transfer' ? HOT : PAPER, transparent: true, opacity: 0.62 })
        );
        group.add(line);
      });
      if (!reduced) {
        (data.pulses || []).forEach(function (pulse) {
          var a = byId.get(pulse.source);
          var b = byId.get(pulse.target);
          if (!a || !b) return;
          var ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 10, 8),
            new THREE.MeshStandardMaterial({ color: HOT, emissive: HOT, emissiveIntensity: 0.35 })
          );
          ball.userData.pulse = { a: a, b: b, t: Math.random(), sig: pulse.signature };
          group.add(ball);
          pulseMeshes.push(ball);
        });
      }
      paintLabels();
    }
    function paintLabels() {
      if (!labelLayer) return;
      labelLayer.hidden = !labelsOn || reduced;
      if (labelLayer.hidden) return;
      labelLayer.innerHTML = '';
      var w = el.clientWidth || global.innerWidth;
      var h = el.clientHeight || global.innerHeight;
      data.nodes.forEach(function (node) {
        var v = new THREE.Vector3(node.x, node.y, node.z).project(camera);
        if (v.z > 1) return;
        var span = document.createElement('span');
        span.textContent = node.symbol || (node.id === MINT ? '$DASHA' : shortId(node.id));
        span.style.left = ((v.x + 1) / 2 * w) + 'px';
        span.style.top = ((-v.y + 1) / 2 * h) + 'px';
        labelLayer.appendChild(span);
      });
    }
    function hit(ev) {
      var rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(pick, false);
      return hits[0] && hits[0].object.userData.node;
    }
    renderer.domElement.addEventListener('click', function (ev) {
      var node = hit(ev);
      if (!node) return;
      var now = Date.now();
      if (clicks.id === node.id && now - clicks.at < 400) expand(node.id);
      clicks = { id: node.id, at: now };
      nodePanel(node);
    });
    function onResize() {
      var w = el.clientWidth || global.innerWidth;
      var h = el.clientHeight || global.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    global.addEventListener('resize', onResize);
    var clock = new THREE.Clock();
    function tick() {
      if (!running) return;
      requestAnimationFrame(tick);
      var dt = clock.getDelta();
      if (!reduced) {
        pulseMeshes.forEach(function (ball) {
          var p = ball.userData.pulse;
          p.t = (p.t + dt * 0.35) % 1;
          ball.position.lerpVectors(
            new THREE.Vector3(p.a.x, p.a.y, p.a.z),
            new THREE.Vector3(p.b.x, p.b.y, p.b.z),
            p.t
          );
          lastPulse = ball.position;
        });
        if (followOn && lastPulse) controls.target.lerp(lastPulse, 0.08);
      }
      controls.update();
      renderer.render(scene, camera);
      if (labelsOn && !reduced) paintLabels();
    }
    rebuild();
    tick();
    return {
      rebuild: rebuild,
      reset: function () {
        followOn = false;
        var btn = $('follow');
        if (btn) btn.setAttribute('aria-pressed', 'false');
        camera.position.set(0, 8, 22);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      setLabels: function (on) {
        labelsOn = on;
        paintLabels();
      },
      dispose: function () {
        running = false;
        global.removeEventListener('resize', onResize);
        renderer.dispose();
      },
    };
  }
  function applySnapshot(body) {
    data = {
      nodes: body.nodes || [],
      links: body.links || [],
      pulses: body.pulses || [],
      holdersLoaded: body.holdersLoaded !== false,
      dex: body.dex || {},
      supply: body.supply || null,
    };
    paintHud(data.dex);
    if (!data.holdersLoaded) setStatus('Holders: not loaded', 'bad');
    else setStatus('', '');
    paintList();
    if (reduced) return;
    if (sceneApi) sceneApi.rebuild();
  }
  function load(reload) {
    setStatus('Loading…');
    fetch('/api/graph', { credentials: 'omit', cache: reload ? 'reload' : 'default' })
      .then(function (res) { return res.json(); })
      .then(applySnapshot)
      .catch(function () {
        applySnapshot({
          nodes: [{ id: MINT, kind: 'mint', role: 'mint' }, { id: PAIR, kind: 'pool', role: 'pair' }],
          links: [{ source: MINT, target: PAIR, kind: 'pair' }],
          pulses: [],
          holdersLoaded: false,
          dex: {},
          rings: { 1: { empty: true, reason: 'rpc_unavailable' } },
        });
      });
  }
  function onKey(ev) {
    if (ev.key === 'Escape') closePanel();
    if (ev.key === 'r' || ev.key === 'R') {
      if (sceneApi) sceneApi.reset();
    }
    if (ev.key === 'l' || ev.key === 'L') {
      labelsOn = !labelsOn;
      if (sceneApi) sceneApi.setLabels(labelsOn);
    }
  }
  function boot() {
    reduced = prefersReduced();
    listOn = reduced;
    var listBtn = $('list-toggle');
    if (listBtn) listBtn.setAttribute('aria-pressed', listOn ? 'true' : 'false');
    bindPanel();
    var resetBtn = $('reset');
    if (resetBtn) resetBtn.addEventListener('click', function () { if (sceneApi) sceneApi.reset(); });
    var followBtn = $('follow');
    if (followBtn) followBtn.addEventListener('click', function () {
      followOn = !followOn;
      followBtn.setAttribute('aria-pressed', followOn ? 'true' : 'false');
    });
    if (listBtn) listBtn.addEventListener('click', function () {
      listOn = !listOn;
      listBtn.setAttribute('aria-pressed', listOn ? 'true' : 'false');
      paintList();
    });
    var status = $('status');
    if (status) {
      status.style.cursor = 'pointer';
      status.addEventListener('click', function () {
        if (status.dataset.kind === 'bad') load(true);
      });
    }
    document.addEventListener('keydown', onKey);
    load(false);
    if (reduced) return;
    Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
    ]).then(function (mods) {
      sceneApi = startScene(mods[0], mods[1].OrbitControls);
      if (sceneApi) sceneApi.rebuild();
    }).catch(function () {
      reduced = true;
      listOn = true;
      if (listBtn) listBtn.setAttribute('aria-pressed', 'true');
      paintList();
      setStatus('3D library unavailable — list only', 'bad');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  global.DashaGraph = { load: load, expand: expand };
})(typeof window !== 'undefined' ? window : globalThis);
