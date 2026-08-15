/**
 * Public $DASHA chain graph client. 3d-force-graph is loaded from jsDelivr, not bundled.
 */
(function (global) {
  'use strict';
  var MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  var INK = '#070608';
  var PAPER = '#f4eddb';
  var ACID = '#dfff00';
  var HOT = '#ff3b81';
  var VIOLET = '#7c4dff';
  var graph = null;
  var data = { nodes: [], links: [] };
  var labelsOn = true;
  var reduced = false;
  var usedViolet = false;

  function $(id) { return document.getElementById(id); }
  function prefersReduced() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function apiRoot() { return ''; }
  function solscanAccount(id) {
    return id === 'pump.fun' ? 'https://pump.fun' : 'https://solscan.io/account/' + id;
  }
  function solscanTx(sig) { return 'https://solscan.io/tx/' + sig; }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject();
  }
  function nodeColor(node) {
    if (node.kind === 'mint' && node.id === MINT) return ACID;
    if (node.kind === 'launchpad') return VIOLET;
    return PAPER;
  }
  function linkColor(link) {
    if (link.kind === 'launchpad' && !usedViolet) return VIOLET;
    if (link.kind === 'transfer') return HOT;
    return PAPER;
  }
  function nodeVal(node) {
    if (node.id === MINT) return 14;
    if (Number.isFinite(node.uiAmount) && node.uiAmount > 0) return Math.max(2, Math.min(12, Math.log10(node.uiAmount + 1) * 3));
    return 3;
  }
  function nodeLabel(node) {
    if (!labelsOn) return '';
    if (node.symbol) return node.symbol;
    if (node.label) return node.label;
    if (node.id === MINT) return '$DASHA';
    return node.id.slice(0, 4) + '…' + node.id.slice(-4);
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
  }
  function showPanel(html) {
    var panel = $('panel');
    if (!panel) return;
    panel.innerHTML = html;
    panel.hidden = false;
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function paintList() {
    var list = $('list');
    if (!list) return;
    list.hidden = false;
    list.innerHTML = '';
    data.nodes.forEach(function (node) {
      var li = document.createElement('li');
      var bits = [node.id];
      if (node.symbol) bits.unshift(node.symbol);
      if (node.uiAmountString) bits.push(node.uiAmountString);
      li.innerHTML = '<strong>' + esc(node.kind || 'node') + '</strong> ' + esc(bits.join(' · '));
      list.appendChild(li);
    });
    data.links.forEach(function (link) {
      var li = document.createElement('li');
      var from = typeof link.source === 'object' ? link.source.id : link.source;
      var to = typeof link.target === 'object' ? link.target.id : link.target;
      li.textContent = (link.kind || 'link') + ' ' + from + ' → ' + to + (link.uiAmountString ? ' · ' + link.uiAmountString : '');
      list.appendChild(li);
    });
  }
  function nodePanel(node) {
    var amount = node.uiAmountString ? '<p>' + esc(node.uiAmountString) + '</p>' : '';
    var meta = [node.kind, node.tag, node.symbol, node.name, node.label].filter(Boolean).join(' · ');
    var expand = node.kind === 'wallet' || node.kind === 'pool' || node.kind === 'program'
      ? '<button type="button" data-expand="' + esc(node.id) + '">Expand</button>' : '';
    showPanel(
      '<h2>' + esc(node.symbol || node.label || (node.id === MINT ? '$DASHA' : 'Address')) + '</h2>' +
      '<p>' + esc(meta) + '</p>' +
      '<p><code>' + esc(node.id) + '</code></p>' + amount +
      '<div class="row"><button type="button" data-copy="' + esc(node.id) + '">Copy</button>' +
      (node.id === 'pump.fun' ? '' : '<a href="' + esc(solscanAccount(node.id)) + '" target="_blank" rel="noopener noreferrer">Solscan ↗</a>') +
      expand + '<button type="button" data-close="1">Close</button></div>'
    );
  }
  function linkPanel(link) {
    var from = typeof link.source === 'object' ? link.source.id : link.source;
    var to = typeof link.target === 'object' ? link.target.id : link.target;
    var amount = link.uiAmountString || (Number.isFinite(link.amount) ? String(link.amount) : '');
    var sig = link.signature ? '<p><code>' + esc(link.signature) + '</code></p>' : '';
    var tx = link.signature ? '<a href="' + esc(solscanTx(link.signature)) + '" target="_blank" rel="noopener noreferrer">Explorer ↗</a>' : '';
    showPanel(
      '<h2>Edge</h2><p>' + esc(link.kind || '') + '</p>' +
      '<p>From ' + esc(from) + '</p><p>To ' + esc(to) + '</p>' +
      (amount ? '<p>' + esc(amount) + '</p>' : '') + sig +
      '<div class="row">' + (link.signature ? '<button type="button" data-copy="' + esc(link.signature) + '">Copy</button>' : '') +
      tx + '<button type="button" data-close="1">Close</button></div>'
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
    if (graph) graph.graphData(data);
    if (reduced) paintList();
  }
  function expand(id) {
    setStatus('Expanding…');
    fetch(apiRoot() + '/api/graph/expand?id=' + encodeURIComponent(id), { credentials: 'omit' })
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
  function draw3d() {
    if (!global.ForceGraph3D) {
      setStatus('3D library unavailable — list only', 'bad');
      reduced = true;
      paintList();
      return;
    }
    usedViolet = data.links.some(function (link) { return link.kind === 'launchpad'; });
    var el = $('graph');
    graph = global.ForceGraph3D()(el)
      .backgroundColor(INK)
      .showNavInfo(false)
      .enableNodeDrag(true)
      .enableNavigationControls(true)
      .nodeRelSize(4)
      .nodeVal(nodeVal)
      .nodeColor(nodeColor)
      .nodeLabel(nodeLabel)
      .linkColor(linkColor)
      .linkWidth(function (link) { return link.kind === 'transfer' ? 1.6 : 0.8; })
      .linkOpacity(0.72)
      .graphData(data)
      .onNodeClick(nodePanel)
      .onLinkClick(linkPanel)
      .onNodeDragEnd(function (node) {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      });
    graph.d3Force('charge').strength(-48);
    var clicks = { id: '', at: 0 };
    graph.onNodeClick(function (node) {
      var now = Date.now();
      if (clicks.id === node.id && now - clicks.at < 400) expand(node.id);
      clicks = { id: node.id, at: now };
      nodePanel(node);
    });
  }
  function applySnapshot(body) {
    data = { nodes: body.nodes || [], links: body.links || [] };
    if (body.rings && body.rings[1] && body.rings[1].empty) {
      var reason = body.rings[1].reason;
      if (reason === 'rpc_unavailable') setStatus('holders unavailable — retry', 'bad');
      else setStatus('Mint only', '');
    } else setStatus('', '');
    if (reduced) paintList();
    else draw3d();
  }
  function load(reload) {
    setStatus('Loading…');
    fetch(apiRoot() + '/api/graph', { credentials: 'omit', cache: reload ? 'reload' : 'default' })
      .then(function (res) { return res.json(); })
      .then(applySnapshot)
      .catch(function () {
        applySnapshot({ nodes: [{ id: MINT, kind: 'mint', ring: 0 }], links: [], rings: { 1: { empty: true, reason: 'rpc_unavailable' } } });
      });
  }
  function resetCamera() {
    if (!graph) return;
    data.nodes.forEach(function (node) { node.fx = node.fy = node.fz = undefined; });
    graph.cameraPosition({ x: 0, y: 0, z: 220 }, { x: 0, y: 0, z: 0 }, 0);
    graph.graphData(data);
  }
  function onKey(ev) {
    if (ev.key === 'Escape') closePanel();
    if (ev.key === 'r' || ev.key === 'R') resetCamera();
    if (ev.key === 'l' || ev.key === 'L') {
      labelsOn = !labelsOn;
      if (graph) graph.nodeLabel(nodeLabel);
    }
  }
  function boot() {
    reduced = prefersReduced();
    bindPanel();
    var copyBtn = $('copy-mint');
    if (copyBtn) copyBtn.addEventListener('click', function () { copy(MINT); });
    var status = $('status');
    if (status) {
      status.style.cursor = 'pointer';
      status.addEventListener('click', function () {
        if (status.dataset.kind === 'bad') load(true);
      });
    }
    document.addEventListener('keydown', onKey);
    load(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  global.DashaGraph = { load: load, expand: expand };
})(typeof window !== 'undefined' ? window : globalThis);
