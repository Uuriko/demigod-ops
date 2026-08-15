/**
 * Dasha /learn client — hub + typeform runner + first-party tools.
 * Play without X. Award with X. Points go on Simp.
 */
(function (global) {
  'use strict';

  var MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  var MINT_SOURCE = 'https://x.com/dash_eats/status/2085405228078432279';
  var NOT_DEV = 'https://x.com/dash_eats/status/2085532923063853316';
  var JUPITER = 'https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=' + MINT;
  var DEFAULT_API = 'https://lobby.getdasha.com';
  var LS = 'dasha_learn_v1';
  var FEE_RESERVE = 0.02;
  var PHOTOS = ['archive', 'bull', 'chart', 'hero', 'media', 'press', 'profile', 'public', 'sweet', 'weekend'];
  var QUOTES = [
    { image: '/simp/photo/bull.jpg', quote: 'It’s time $dasha' },
    { image: '/simp/photo/weekend.jpg', quote: 'How u crying at the casino and u can’t even get in' },
    { image: '/simp/photo/chart.jpg', quote: 'It’s time this time' },
    { image: '/simp/photo/profile.jpg', quote: 'Did you buy my coin' },
    { image: '/simp/photo/hero.jpg', quote: 'All I want is free healthcare, honey' }
  ];
  var GLOSSARY = {
    mint: 'The serial. This one is ' + MINT + '.',
    ca: 'Contract address. Same as mint on Solana. MATCH the full string.',
    sol: 'The gas. Keep ~0.02 unspent.',
    slippage: 'How far a quote may move. If it moved, abort.',
    siws: 'Sign a string. Proves key control now. Not a tx. Not uniqueness.',
    rpc: 'A node you ask about the chain. If it 503s, the check is unavailable.',
    mcp: 'A plug for tools. Not a brain. Does not move money.',
    agent: 'A model that may call tools. Still needs a wallet to sign.',
    'holder-badge': 'Sticker. 0 Simp points. Not a score.',
    association: 'Being next to a thing is not an endorsement.'
  };
  var DRILL = [
    { text: MINT, match: true },
    { text: '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpunp', match: false },
    { text: '53uxQtB9…pump', match: false },
    { text: 't.me/dashacommunity', match: false },
    { text: '$dasha', match: false },
    { text: '53uxQTB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump', match: false },
    { text: MINT.slice(0, 12), match: false },
    { text: 'https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=' + MINT, match: true },
    { text: MINT_SOURCE, match: true },
    { text: '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpunp', match: false },
    { text: 'official dasha telegram', match: false },
    { text: '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37Eetn0pump', match: false },
    { text: 'https://solscan.io/token/' + MINT, match: true },
    { text: '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump ', match: true }
  ];
  var SIWS_DOMAINS = [
    { domain: 'www.getdasha.com', ok: true },
    { domain: 'lobby.getdasha.com', ok: true },
    { domain: 'getdasha.net', ok: false },
    { domain: 'getdasha.com.evil', ok: false },
    { domain: 'jup.ag', ok: false }
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function apiBase(root) {
    var attr = root && root.getAttribute('data-learn-api');
    if (attr) return String(attr).replace(/\/$/, '');
    return DEFAULT_API;
  }

  function fetchJson(url, init) {
    return fetch(url, init).then(function (r) {
      return r.text().then(function (raw) {
        var data = null;
        if (raw) {
          try { data = JSON.parse(raw); } catch (e) { data = { error: 'non-json response' }; }
        }
        return { status: r.status, data: data || {} };
      });
    });
  }

  function loadState(track) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { all = {}; }
    var row = all[track] || { track: track, difficulty: 1, skills: {}, done: [], queue: [], fresh: 0, study: 'normal' };
    row.track = track;
    return { all: all, row: row };
  }

  function saveState(track, row) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { all = {}; }
    all[track] = row;
    try { localStorage.setItem(LS, JSON.stringify(all)); } catch (e) {}
  }

  function skillOf(state, id) {
    var row = state.skills && state.skills[id];
    return { m: row && row.m >= 0 ? Math.min(3, row.m) : 0, elo: row && isFinite(row.elo) ? row.elo : 1000 };
  }

  function struggleCount(s) {
    return (s.wrongs > 0 ? s.wrongs : 0) + (s.explainAgain > 0 ? s.explainAgain : 0) + (s.felt === 'hard' ? 1 : 0) + (s.dwell ? 1 : 0);
  }

  function nextDifficulty(cur, s) {
    if (s.easyDoor || s.struggle >= 2 || !s.passed) return Math.max(0, cur - 1);
    if (s.passed && s.felt === 'easy' && s.struggle === 0) return Math.min(2, cur + 1);
    return cur;
  }

  function pickNext(state, bank) {
    var list = bank.filter(function (m) { return m.track === state.track; });
    var done = {};
    (state.done || []).forEach(function (id) { done[id] = 1; });
    if (!state.done || !state.done.length) {
      if (state.queue && state.queue[0]) {
        var q = list.filter(function (m) { return m.id === state.queue[0]; })[0];
        if (q) return q;
      }
      return list.filter(function (m) { return /01$/.test(m.id); })[0] || list[0];
    }
    if (state.queue && state.queue.length) {
      var queued = list.filter(function (m) { return m.id === state.queue[0] && !done[m.id]; })[0];
      if (queued) return queued;
    }
    function rank(pool) {
      return pool.slice().sort(function (a, b) {
        var ea = skillOf(state, a.skill).elo;
        var eb = skillOf(state, b.skill).elo;
        if (ea !== eb) return ea - eb;
        return bank.indexOf(a) - bank.indexOf(b);
      })[0];
    }
    if ((state.fresh || 0) >= 2) {
      var ret = rank(list.filter(function (m) { return done[m.id]; }));
      if (ret) return ret;
    }
    var unseen = list.filter(function (m) { return !done[m.id]; });
    var band = unseen.filter(function (m) { return m.difficulty === state.difficulty || m.difficulty === state.difficulty - 1; });
    return rank(band.length ? band : unseen);
  }

  function applyModule(state, mod, raw) {
    var s = {
      passed: !!raw.passed,
      felt: raw.felt === 'easy' || raw.felt === 'hard' ? raw.felt : 'ok',
      wrongs: raw.wrongs || 0,
      explainAgain: raw.explainAgain || 0,
      easyDoor: !!raw.easyDoor,
      dwell: !!raw.dwell || (raw.dwellMs > 40000)
    };
    s.struggle = struggleCount(s);
    var prev = skillOf(state, mod.skill);
    var m = prev.m >= 3 ? 3 : Math.max(0, Math.min(3, prev.m + (s.passed ? 1 : -1)));
    var d = [800, 1000, 1200][mod.difficulty] || 1000;
    var expected = 1 / (1 + Math.pow(10, (d - prev.elo) / 400));
    var elo = Math.round(prev.elo + 40 * ((s.passed ? 1 : 0) - expected));
    var wasNew = (state.done || []).indexOf(mod.id) < 0;
    var done = wasNew ? (state.done || []).concat([mod.id]) : state.done.slice();
    var fresh = wasNew ? Math.min(2, (state.fresh || 0) + 1) : 0;
    if ((state.fresh || 0) >= 2 && !wasNew) fresh = 0;
    var skills = {};
    Object.keys(state.skills || {}).forEach(function (k) { skills[k] = state.skills[k]; });
    skills[mod.skill] = { m: m, elo: elo };
    return {
      track: state.track,
      difficulty: nextDifficulty(state.difficulty, s),
      skills: skills,
      done: done,
      queue: (state.queue || []).filter(function (id) { return id !== mod.id; }),
      fresh: fresh,
      study: state.study || 'normal'
    };
  }

  function parsePath() {
    var parts = String(location.pathname || '').replace(/\/+$/, '').split('/');
    if (parts[1] !== 'learn') return { track: '', mod: '' };
    return { track: parts[2] || '', mod: parts[3] || '' };
  }

  function bankFrom(root) {
    var node = document.getElementById('dasha-learn-bank');
    if (!node) return null;
    try { return JSON.parse(node.textContent); } catch (e) { return null; }
  }

  function mount(root, opts) {
    opts = opts || {};
    if (!root) return null;
    var leftover = document.getElementById('dasha-learn-static');
    if (leftover) leftover.hidden = true;
    var base = apiBase(root);
    var pack = bankFrom(root) || opts.bank || {};
    var modules = pack.modules || [];
    var path = parsePath();
    var track = root.getAttribute('data-track') || path.track;
    var modId = root.getAttribute('data-mod') || path.mod;
    root.innerHTML = '';
    root.classList.add('learn-root');
    var style = document.createElement('style');
    style.textContent = css();
    root.appendChild(style);
    var live = el('p', 'learn-live', '');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    if (!track) renderHub(root, live, modules, base, pack);
    else renderRunner(root, live, modules, base, track, modId, pack);
    return { destroy: function () { root.innerHTML = ''; } };
  }

  function css() {
    return '#dasha-learn,.learn-root{color:#f4eddb;font:16px/1.45 Arial,Helvetica,sans-serif}' +
      '.learn-root h1,.learn-root h2,.learn-door,.learn-choice,.learn-go{font-family:"Arial Black","Helvetica Neue",Arial,Helvetica,sans-serif;font-weight:900}' +
      '.learn-root h1{margin:0 0 .4rem;font-size:clamp(2.6rem,10vw,5rem);line-height:.9;text-transform:uppercase}' +
      '.learn-lede{color:rgba(244,237,219,.7);max-width:42ch}' +
      '.learn-doors{display:grid;gap:12px;margin:22px 0}' +
      '.learn-door{display:flex;align-items:center;min-height:56px;padding:0 18px;background:#dfff00;color:#070608;text-decoration:none;text-transform:uppercase;box-shadow:4px 4px 0 #ff3b81}' +
      '.learn-door small{margin-left:auto;font:12px/1 Fragment Mono,ui-monospace,Menlo,Consolas,monospace}' +
      '.learn-study{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}' +
      '.learn-study button,.learn-go,.learn-choice,.learn-tool button{min-height:48px;min-width:48px;padding:0 16px;border:1px solid #dfff00;background:#070608;color:#f4eddb;font:inherit;font-weight:900;text-transform:uppercase;cursor:pointer}' +
      '.learn-study button.is-on,.learn-go{background:#dfff00;color:#070608}' +
      '.learn-ticks{font:13px/1.4 Fragment Mono,ui-monospace,Menlo,Consolas,monospace;color:rgba(244,237,219,.62)}' +
      '.learn-card{display:grid;gap:14px}' +
      '.learn-bar{height:4px;background:#2a2428}.learn-fill{display:block;height:100%;background:#dfff00}' +
      '.learn-q{margin:0;font-size:clamp(26px,5vw,42px);line-height:1.08}' +
      '.learn-choices{display:grid;gap:10px}' +
      '.learn-choice{display:flex;gap:12px;align-items:center;width:100%;text-align:left}' +
      '.learn-choice:hover,.learn-choice:focus-visible{outline:3px solid #dfff00;outline-offset:3px}' +
      '.learn-key{display:grid;place-items:center;min-width:28px;height:28px;border:1px solid #dfff00;color:#dfff00}' +
      '.learn-note{margin:0}.learn-source a{color:#dfff00}' +
      '.learn-surprise{padding:12px;border:1px dashed #dfff00}' +
      '.learn-ca,.learn-mono{font:15px/1.4 Fragment Mono,ui-monospace,Menlo,Consolas,monospace;word-break:break-all;user-select:all}' +
      '.learn-tool{display:grid;gap:10px;padding:12px 0;border-top:1px solid rgba(244,237,219,.18)}' +
      '.learn-tool input,.learn-tool textarea{width:100%;min-height:48px;padding:10px;box-sizing:border-box;background:#070608;color:#f4eddb;border:1px solid #dfff00;font:inherit}' +
      '.learn-match{color:#dfff00;font-weight:900}.learn-no{color:#ff3b81;font-weight:900}' +
      '.learn-tip[data-term]{border-bottom:1px dotted #7c4dff;cursor:help;color:#f4eddb}' +
      '.learn-felt{display:flex;flex-wrap:wrap;gap:8px}' +
      '.learn-share{display:grid;gap:10px;padding:12px;border:2px solid #dfff00}' +
      '.learn-share img{width:100%;height:auto;max-height:240px;object-fit:cover}' +
      '@media(prefers-reduced-motion:reduce){.learn-fill,.learn-door,.learn-choice{transition:none}}';
  }

  function renderHub(root, live, modules, base, pack) {
    root.appendChild(el('h1', '', 'Learn'));
    var lede = el('p', 'learn-lede', 'Optional class. Points go on Simp. No second score. No advice. Association is not endorsement.');
    root.appendChild(lede);
    var mint = el('code', 'learn-ca', MINT);
    mint.setAttribute('id', 'learn-mint');
    root.appendChild(mint);
    var copy = el('button', 'learn-go', 'Copy mint');
    copy.type = 'button';
    copy.addEventListener('click', function () { copyText(MINT, copy); });
    root.appendChild(copy);
    root.appendChild(el('p', 'learn-lede', 'this is how the buttons work. you do not have to buy to pass. MATCH, not verified.'));
    var studyBox = el('div', 'learn-study');
    studyBox.appendChild(el('span', '', 'Study'));
    ['chill', 'normal', 'mean'].forEach(function (name, i) {
      var b = el('button', '', name);
      b.type = 'button';
      b.dataset.study = name;
      studyBox.appendChild(b);
    });
    root.appendChild(studyBox);
    var doors = el('div', 'learn-doors');
    [
      ['crypto', 'CRYPTO', 'C'],
      ['crypto-ai', 'CRYPTO+AI', 'A'],
      ['ai', 'AI', 'I']
    ].forEach(function (row) {
      var saved = loadState(row[0]).row;
      var done = (saved.done || []).length;
      var a = el('a', 'learn-door', row[1]);
      a.href = '/learn/' + row[0] + '/' + row[2] + '01';
      a.appendChild(el('small', '', done ? done + ' local' : 'new'));
      if (row[0] === 'crypto') {
        a.addEventListener('click', function (ev) {
          if (ev.metaKey || ev.ctrlKey) return;
          /* skip handled by the skip button */
        });
      }
      doors.appendChild(a);
    });
    root.appendChild(doors);
    var skip = el('button', 'learn-go', 'Already on-chain');
    skip.type = 'button';
    skip.addEventListener('click', function () {
      var packed = loadState('crypto');
      packed.row.queue = ['C04'];
      packed.row.skills = packed.row.skills || {};
      packed.row.skills.wallet = { m: Math.max(1, (packed.row.skills.wallet && packed.row.skills.wallet.m) || 0), elo: (packed.row.skills.wallet && packed.row.skills.wallet.elo) || 1000 };
      packed.row.skills.sol = { m: Math.max(1, (packed.row.skills.sol && packed.row.skills.sol.m) || 0), elo: (packed.row.skills.sol && packed.row.skills.sol.elo) || 1000 };
      saveState('crypto', packed.row);
      location.href = '/learn/crypto/C04';
    });
    root.appendChild(skip);
    var ticks = el('p', 'learn-ticks', tickLine(modules));
    root.appendChild(ticks);
    var xBtn = el('button', 'learn-go', 'Link X');
    xBtn.type = 'button';
    xBtn.addEventListener('click', function () { linkX(base, live); });
    root.appendChild(xBtn);
    root.appendChild(live);
    root.appendChild(el('p', 'learn-lede', 'Play without X. Award with X. She is not the dev.'));
    var src = el('p', 'learn-source', '');
    var a1 = document.createElement('a'); a1.href = MINT_SOURCE; a1.target = '_blank'; a1.rel = 'noopener noreferrer'; a1.textContent = 'mint source';
    var a2 = document.createElement('a'); a2.href = NOT_DEV; a2.target = '_blank'; a2.rel = 'noopener noreferrer'; a2.textContent = 'not the dev';
    src.appendChild(a1); src.appendChild(document.createTextNode(' · ')); src.appendChild(a2);
    root.appendChild(src);
    paintStudy(studyBox);
    studyBox.addEventListener('click', function (ev) {
      var name = ev.target && ev.target.dataset && ev.target.dataset.study;
      if (!name) return;
      ['crypto', 'crypto-ai', 'ai'].forEach(function (tr) {
        var packed = loadState(tr);
        packed.row.study = name;
        packed.row.difficulty = name === 'chill' ? 0 : name === 'mean' ? 2 : 1;
        saveState(tr, packed.row);
      });
      paintStudy(studyBox);
    });
    window.addEventListener('message', function onMsg(ev) {
      if (!ev || !ev.data || ev.data.type !== 'dasha-x-linked') return;
      if (ev.origin !== base && ev.origin !== 'https://lobby.getdasha.com') return;
      mergeRemote(base, modules);
      live.textContent = 'X linked. Local ticks stay. Points go on Simp.';
    });
    fetchJson(base + '/simp/me', { credentials: 'include', mode: 'cors' }).then(function (res) {
      if (res.data && res.data.linked) {
        xBtn.textContent = res.data.x && res.data.x.display ? res.data.x.display : 'X linked';
        mergeRemote(base, modules);
      }
    }).catch(function () {});
  }

  function paintStudy(box) {
    var study = loadState('crypto').row.study || 'normal';
    [].forEach.call(box.querySelectorAll('button[data-study]'), function (b) {
      b.classList.toggle('is-on', b.dataset.study === study);
    });
  }

  function tickLine(modules) {
    var bits = [];
    ['crypto', 'crypto-ai', 'ai'].forEach(function (tr) {
      var n = (loadState(tr).row.done || []).length;
      var total = modules.filter(function (m) { return m.track === tr; }).length;
      bits.push(tr + ' ' + n + (total ? '' : ''));
    });
    return bits.join(' · ') + ' · local only until you link X';
  }

  function renderRunner(root, live, modules, base, track, modId, pack) {
    var packed = loadState(track);
    var state = packed.row;
    var mod = modules.filter(function (m) { return m.id === modId; })[0] || pickNext(state, modules);
    if (!mod) {
      root.appendChild(el('p', '', 'No module.'));
      return;
    }
    if (mod.id !== modId && !modId) {
      location.replace('/learn/' + track + '/' + mod.id);
      return;
    }
    var started = Date.now();
    var wrongs = 0;
    var explain = 0;
    var card = el('div', 'learn-card');
    var bar = el('div', 'learn-bar');
    var fill = el('span', 'learn-fill', '');
    fill.style.width = Math.min(100, ((state.done || []).length % 8) * 12 + 8) + '%';
    bar.appendChild(fill);
    card.appendChild(bar);
    var media = el('img', '', '');
    media.alt = 'Dasha';
    media.src = 'https://lobby.getdasha.com/simp/photo/' + PHOTOS[(mod.id.charCodeAt(1) + mod.id.charCodeAt(2)) % PHOTOS.length] + '.jpg';
    card.appendChild(media);
    card.appendChild(el('p', 'learn-lede', mod.goal || ''));
    if (mod.body) card.appendChild(gloss(mod.body));
    if (mod.hop) {
      var hop = document.createElement('a');
      hop.className = 'learn-go';
      hop.href = mod.hop.href;
      hop.textContent = mod.hop.label || 'Hop';
      if (mod.hop.outbound) { hop.target = '_blank'; hop.rel = 'noopener noreferrer'; }
      card.appendChild(hop);
    }
    var toolBox = el('div', 'learn-tool');
    mountTool(toolBox, mod, live, base);
    if (toolBox.childNodes.length) card.appendChild(toolBox);
    var stage = el('div', '', '');
    card.appendChild(stage);
    root.appendChild(card);
    root.appendChild(live);
    var escape = el('button', 'learn-go', 'Hub');
    escape.type = 'button';
    escape.addEventListener('click', function () { location.href = '/learn'; });
    root.appendChild(escape);

    var pending = [];
    if (mod.prompt && mod.choices) pending.push({ prompt: mod.prompt, choices: mod.choices, answer: mod.answer });
    if (mod.proves) pending = pending.concat(mod.proves);
    if (mod.fallback && !mod.prompt) pending.push(mod.fallback);
    if (mod.items) pending = pending.concat(mod.items.map(function (item) {
      return { prompt: item.text, choices: ['TRUE', 'INVENTED'], answer: item.invented ? 1 : 0 };
    }));
    if (mod.id === 'C06') pending = drillQuestions(6);
    if (mod.id === 'A08' && !pending.length) pending = SIWS_DOMAINS.map(function (row) {
      return { prompt: 'SIWS domain ' + row.domain, choices: ['Accept', 'Reject'], answer: row.ok ? 0 : 1 };
    });

    var idx = 0;
    var correct = 0;
    var retry = null;
    function showQ() {
      stage.innerHTML = '';
      var q = pending[idx];
      if (!q) return finish(true);
      stage.appendChild(el('p', 'learn-q', q.prompt));
      var list = el('div', 'learn-choices');
      (q.choices || []).forEach(function (c, i) {
        var b = el('button', 'learn-choice', '');
        b.type = 'button';
        b.appendChild(el('span', 'learn-key', String(i + 1)));
        b.appendChild(el('span', '', c));
        b.addEventListener('click', function () { pick(i); });
        list.appendChild(b);
      });
      stage.appendChild(list);
      var again = el('button', 'learn-go', 'Explain again');
      again.type = 'button';
      again.addEventListener('click', function () {
        explain++;
        live.textContent = mod.note || 'Read it again. Slower.';
      });
      stage.appendChild(again);
    }
    function pick(i) {
      var q = pending[idx];
      var ok = q.answer == null || i === q.answer;
      if (!ok) wrongs++;
      else correct++;
      var fb = el('p', 'learn-note', ok ? 'Correct. Unfortunate.' : 'No.');
      stage.appendChild(fb);
      if (mod.surprise && ok && idx === 0) {
        var sur = el('div', 'learn-surprise', '');
        sur.appendChild(el('strong', '', mod.surprise.title || ''));
        sur.appendChild(el('p', '', mod.surprise.body || ''));
        stage.appendChild(sur);
      }
      if (mod.source) {
        var s = el('p', 'learn-source', '');
        var a = document.createElement('a');
        a.href = mod.source; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'source';
        s.appendChild(a);
        stage.appendChild(s);
      }
      idx++;
      if (idx >= pending.length) {
        var passed = passRule(mod, correct, pending.length, wrongs, toolBox);
        if (mod.pass === 'drill-5-6' && !passed && !retry) {
          retry = true;
          pending = drillQuestions(3);
          idx = 0;
          correct = 0;
          live.textContent = 'Retry. 3 of 3.';
          showQ();
          return;
        }
        if (mod.pass === 'drill-5-6' && retry) passed = correct >= 3;
        finish(passed);
        return;
      }
      showQ();
    }
    function finish(passed) {
      var feltBox = el('div', 'learn-felt', '');
      ['easy', 'ok', 'hard'].forEach(function (f) {
        var b = el('button', 'learn-go', f);
        b.type = 'button';
        b.addEventListener('click', function () { close(passed, f); });
        feltBox.appendChild(b);
      });
      var easyDoor = el('button', 'learn-go', 'too easy');
      easyDoor.type = 'button';
      easyDoor.addEventListener('click', function () { close(passed, 'easy', true); });
      stage.appendChild(el('p', '', passed ? (mod.note || 'Passed.') : 'Failed closed. Try again.'));
      stage.appendChild(el('p', 'learn-lede', 'How did that feel?'));
      stage.appendChild(feltBox);
      stage.appendChild(easyDoor);
      if (passed) shareCard(stage, mod);
    }
    function close(passed, felt, easyDoor) {
      var nextState = applyModule(state, mod, {
        passed: passed,
        felt: felt,
        wrongs: wrongs,
        explainAgain: explain,
        easyDoor: !!easyDoor,
        dwellMs: Date.now() - started
      });
      saveState(track, nextState);
      if (passed) award(base, mod, live);
      var nxt = pickNext(nextState, modules);
      if (nxt) location.href = '/learn/' + track + '/' + nxt.id;
      else location.href = '/learn';
    }
    function onKey(ev) {
      if (ev.key === 'Escape') { location.href = '/learn'; return; }
      var n = parseInt(ev.key, 10);
      if (n >= 1 && n <= 9) {
        var q = pending[idx];
        if (q && q.choices && q.choices[n - 1] != null) pick(n - 1);
      }
    }
    document.addEventListener('keydown', onKey);
    showQ();
  }

  function passRule(mod, correct, total, wrongs, toolBox) {
    if (mod.pass === 'all') return correct === total;
    if (mod.pass === '4-of-5') return correct >= 4;
    if (mod.pass === 'drill-5-6') return correct >= 5;
    if (mod.pass === 'signtx-off') return toolBox.getAttribute('data-signtx') !== 'on' && toolBox.getAttribute('data-swap') !== 'allowed';
    if (mod.pass === 'tool-once') return toolBox.getAttribute('data-ran') === '1';
    if (mod.type === 'tool' && (mod.tool === 'fees' || mod.tool === 'mint-check' || mod.tool === 'chip')) {
      if (toolBox.getAttribute('data-ran') !== '1' && !mod.prompt) return false;
    }
    if (mod.tool === 'chip') return toolBox.getAttribute('data-chip') === 'ok';
    return correct >= Math.max(1, total - (mod.proves ? 0 : 0)) && (mod.answer == null || correct > 0 || total === 0);
  }

  function drillQuestions(n) {
    var pool = DRILL.slice();
    var out = [];
    for (var i = 0; i < n && pool.length; i++) {
      var row = pool[i % pool.length];
      out.push({
        prompt: row.text,
        choices: ['MATCH', 'NOT THIS TOKEN'],
        answer: row.match ? 0 : 1
      });
    }
    return out;
  }

  function mountTool(box, mod, live, base) {
    var tool = mod.tool;
    if (tool === 'mint-check' || mod.id === 'C04' || mod.id === 'C05') mintChecker(box, live);
    if (tool === 'drill' || mod.id === 'C06') box.appendChild(el('p', 'learn-lede', 'MATCH vs NOT THIS TOKEN. Truncated CA is wrong. t.me/dashacommunity is wrong.'));
    if (tool === 'fees' || mod.id === 'C09') feeEstimator(box, live);
    if (tool === 'siws' || mod.id === 'A03') siwsTool(box, live, base);
    if (tool === 'sandbox' || mod.id === 'A04') agentSandbox(box, live);
    if (tool === 'phish-siws' || mod.id === 'A08') phishSiws(box, live);
    if (tool === 'chip' || mod.id === 'I10') chipAssembler(box, live);
    if (tool === 'glossary' || mod.id === 'A05' || mod.id === 'I04') glossaryBar(box);
    if (tool === 'halluc') box.appendChild(el('p', 'learn-lede', 'TRUE or INVENTED. Fake holders, telegram, she-is-dev, truncated CA = invented.'));
    if (mod.id === 'C08' || mod.id === 'C03') {
      var j = document.createElement('a');
      j.className = 'learn-go';
      j.href = JUPITER;
      j.target = '_blank';
      j.rel = 'noopener noreferrer';
      j.textContent = 'jup.ag';
      box.appendChild(j);
    }
  }

  function mintChecker(box, live) {
    box.appendChild(el('p', '', 'Paste a CA. MATCH or NOT THIS TOKEN. Never a stamp.'));
    var input = document.createElement('input');
    input.setAttribute('aria-label', 'mint');
    input.autocomplete = 'off';
    input.spellcheck = false;
    var out = el('p', 'learn-mono', '');
    var go = el('button', 'learn-go', 'Check');
    go.type = 'button';
    go.addEventListener('click', function () {
      var v = String(input.value || '').trim();
      if (v === MINT) {
        out.innerHTML = '';
        out.appendChild(el('span', 'learn-match', 'MATCH'));
        box.setAttribute('data-ran', '1');
      } else {
        out.innerHTML = '';
        out.appendChild(el('span', 'learn-no', 'NOT THIS TOKEN'));
        if (/…|\.\.\./.test(v) || v.length < MINT.length) live.textContent = 'Truncated CA is wrong.';
      }
    });
    box.appendChild(input);
    box.appendChild(go);
    box.appendChild(out);
  }

  function feeEstimator(box, live) {
    box.appendChild(el('p', '', 'Intended SOL. We reserve 0.02. No wallet. No USD.'));
    var input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.setAttribute('aria-label', 'intended SOL');
    var out = el('p', 'learn-mono', '');
    var go = el('button', 'learn-go', 'Estimate');
    go.type = 'button';
    go.addEventListener('click', function () {
      var n = Number(String(input.value || '').replace(/[^0-9.]/g, ''));
      if (!isFinite(n) || n <= 0) { live.textContent = 'Type a SOL amount.'; return; }
      var spend = Math.max(0, n - FEE_RESERVE);
      out.textContent = 'spend ' + spend.toFixed(4) + ' · reserve ' + FEE_RESERVE.toFixed(2) + ' SOL';
      if (n <= FEE_RESERVE) live.textContent = 'That is only the reserve. 100% SOL can trap you.';
      box.setAttribute('data-ran', '1');
    });
    box.appendChild(input);
    box.appendChild(go);
    box.appendChild(out);
  }

  function siwsTool(box, live, base) {
    box.appendChild(el('p', '', 'Real /simp/wallet/challenge. Preview the message. Honest errors.'));
    var preview = el('pre', 'learn-mono', 'getdasha.com wants you to sign in with your Solana account:\n<pubkey>\n\nProve key control now. No transaction.\n\nURI: https://www.getdasha.com/\nVersion: 1\nChain ID: mainnet');
    box.appendChild(preview);
    var go = el('button', 'learn-go', 'Request challenge');
    go.type = 'button';
    go.addEventListener('click', function () {
      fetchJson(base + '/simp/wallet/challenge', {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: '11111111111111111111111111111111' })
      }).then(function (res) {
        if (res.status === 401) live.textContent = '401 — link X and join Simp first. Preview stays. No fake badge.';
        else if (res.status === 503) live.textContent = 'Solana holder check unavailable.';
        else if (res.status === 501) live.textContent = '501 — not configured. Preview + quiz. No fake badge.';
        else if (res.data && res.data.message) {
          preview.textContent = res.data.message;
          live.textContent = 'Challenge loaded. Sign only if the domain is getdasha.';
        } else live.textContent = (res.data && res.data.error) || ('HTTP ' + res.status);
        box.setAttribute('data-ran', '1');
      }).catch(function () { live.textContent = 'Challenge failed closed. Preview + quiz.'; });
    });
    box.appendChild(go);
  }

  function agentSandbox(box, live) {
    var signTx = false;
    box.appendChild(el('p', '', 'Sandbox. Four beats. No real wallet. signTx starts off.'));
    var toggle = el('button', 'learn-go', 'signTx off');
    toggle.type = 'button';
    toggle.addEventListener('click', function () {
      signTx = !signTx;
      toggle.textContent = signTx ? 'signTx on' : 'signTx off';
      box.setAttribute('data-signtx', signTx ? 'on' : 'off');
    });
    box.setAttribute('data-signtx', 'off');
    box.appendChild(toggle);
    var beats = [
      { k: 'read', t: 'read balance (fake)' },
      { k: 'signMessage', t: 'signMessage hello' },
      { k: 'swap', t: 'agent asks to swap' },
      { k: 'done', t: 'leave signTx off' }
    ];
    var i = 0;
    var log = el('p', 'learn-mono', 'beat 1 / read');
    var go = el('button', 'learn-go', 'Next beat');
    go.type = 'button';
    go.addEventListener('click', function () {
      var b = beats[i];
      if (!b) return;
      if (b.k === 'swap') {
        if (!signTx) {
          live.textContent = 'Rejected. signTx is off. That is a pass.';
          box.setAttribute('data-swap', 'rejected');
        } else {
          live.textContent = 'You let it swap. Fail.';
          box.setAttribute('data-swap', 'allowed');
        }
      } else if (b.k === 'signMessage') live.textContent = 'Signed a string. Not a tx.';
      else if (b.k === 'read') live.textContent = 'No RPC. No balance invented.';
      i++;
      log.textContent = beats[i] ? 'beat ' + (i + 1) + ' / ' + beats[i].k : 'done';
      box.setAttribute('data-ran', '1');
    });
    box.appendChild(go);
    box.appendChild(log);
  }

  function phishSiws(box, live) {
    box.appendChild(el('p', '', 'Reject the wrong domain. Logo is not a proof.'));
    SIWS_DOMAINS.forEach(function (row) {
      var line = el('p', 'learn-mono', row.domain + (row.ok ? ' · ours' : ' · bait'));
      box.appendChild(line);
    });
  }

  function chipAssembler(box, live) {
    var picked = {};
    box.appendChild(el('p', '', 'Stack a brief. The stamp chip is out. No model API.'));
    var chips = [
      { id: 'mint', text: MINT, required: true },
      { id: 'source', text: MINT_SOURCE, required: true },
      { id: 'not-dev', text: 'She is not the dev.', required: true },
      { id: 'assoc', text: 'Association is not endorsement.', required: true },
      { id: 'howto', text: 'https://www.getdasha.com/how-to-buy', required: true },
      { id: 'official', text: 'official', forbidden: true }
    ];
    var out = el('pre', 'learn-mono', '');
    chips.forEach(function (c) {
      var b = el('button', 'learn-go', c.text === MINT ? 'full mint' : c.id);
      b.type = 'button';
      b.addEventListener('click', function () {
        picked[c.id] = !picked[c.id];
        b.classList.toggle('is-on', picked[c.id]);
        var lines = chips.filter(function (x) { return picked[x.id]; }).map(function (x) { return x.text; });
        out.textContent = lines.join('\n');
        var bad = picked.official;
        var ok = !bad && chips.every(function (x) { return !x.required || picked[x.id]; });
        box.setAttribute('data-chip', ok ? 'ok' : 'no');
        box.setAttribute('data-ran', '1');
        live.textContent = bad ? 'Forbidden chip. official is out.' : (ok ? 'Brief ready. No model API.' : 'Missing a required chip.');
      });
      box.appendChild(b);
    });
    box.appendChild(out);
  }

  function glossaryBar(box) {
    var p = el('p', '', 'Hover a word.');
    Object.keys(GLOSSARY).forEach(function (k) {
      var s = el('span', 'learn-tip', k);
      s.title = GLOSSARY[k];
      s.setAttribute('data-term', k);
      p.appendChild(document.createTextNode(' '));
      p.appendChild(s);
    });
    box.appendChild(p);
  }

  function gloss(text) {
    var p = el('p', 'learn-lede', '');
    p.appendChild(document.createTextNode(text));
    return p;
  }

  function shareCard(stage, mod) {
    var card = QUOTES[mod.id.charCodeAt(2) % QUOTES.length];
    var wrap = el('div', 'learn-share', '');
    var img = el('img', '', '');
    img.alt = 'Dasha';
    img.src = 'https://lobby.getdasha.com' + card.image;
    wrap.appendChild(img);
    wrap.appendChild(el('p', '', '“' + card.quote + '”'));
    wrap.appendChild(el('p', 'learn-lede', 'Optional class. Points on Simp. Not “I earned $dasha.”'));
    var b = el('button', 'learn-go', 'Share');
    b.type = 'button';
    b.addEventListener('click', function () {
      var text = card.quote + '\ngetdasha.com/learn\n$dasha';
      window.open('https://x.com/intent/post?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
    });
    wrap.appendChild(b);
    stage.appendChild(wrap);
  }

  function award(base, mod, live) {
    fetchJson(base + '/simp/learn', {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: mod.id, difficulty: mod.difficulty, tool: mod.tool || null })
    }).then(function (res) {
      if (res.status === 401) live.textContent = 'Played. Link X to put points on Simp.';
      else if (res.data && res.data.awarded) live.textContent = '+' + res.data.points + ' on Simp.';
      else if (res.data && res.data.retake) live.textContent = 'Retake. Score unchanged.';
      else if (res.data && res.data.error) live.textContent = res.data.error;
    }).catch(function () { live.textContent = 'Played locally. Award needs X.'; });
  }

  function linkX(base, live) {
    var w = window.open(base + '/oauth/x/start', 'dasha_x', 'width=520,height=700');
    if (!w) live.textContent = 'Allow popups to link X.';
    else live.textContent = 'Complete X link in the popup…';
  }

  function mergeRemote(base, modules) {
    fetchJson(base + '/simp/me', { credentials: 'include', mode: 'cors' }).then(function (res) {
      var board = res.data && res.data.board;
      if (!board) return;
      var remoteDone = [];
      if (board.learnModules) remoteDone = board.learnModules;
      ['crypto', 'crypto-ai', 'ai'].forEach(function (tr) {
        var packed = loadState(tr);
        var done = {};
        (packed.row.done || []).forEach(function (id) { done[id] = 1; });
        remoteDone.forEach(function (id) {
          var mod = modules.filter(function (m) { return m.id === id; })[0];
          if (mod && mod.track === tr) done[id] = 1;
        });
        packed.row.done = Object.keys(done);
        Object.keys(packed.row.skills || {}).forEach(function (k) {
          /* max mastery kept local; remote only unions done */
        });
        saveState(tr, packed.row);
      });
    }).catch(function () {});
  }

  function copyText(text, btn) {
    function ok() {
      if (btn) { var prev = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = prev; }, 1200); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok).catch(function () { fallback(); });
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  var api = { mount: mount, MINT: MINT };
  global.DashaLearn = api;
  function boot() {
    var root = document.getElementById('dasha-learn');
    if (root && !root.getAttribute('data-learn-mounted')) {
      root.setAttribute('data-learn-mounted', '1');
      mount(root);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : this);
