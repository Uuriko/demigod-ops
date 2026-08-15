/**
 * Dasha Simp Board client — opt-in board using Lobby X session.
 * Standalone; reuses /oauth/x/start for link, never invents OAuth.
 */
(function (global) {
  'use strict';

  var DEFAULT_API = 'https://lobby.getdasha.com';
  /** Canonical shareable deep link — www /simp mounts this client. */
  var QUIZ_INVITE_URL = 'https://www.getdasha.com/simp';
  /** Home scroll-ask + quiz-invite dismiss. Linked visitors never see either. */
  var GATE_LS = 'dasha_x_gate_v1';
  var ASK_SS = 'dasha_x_ask_v1';
  var GATE_AUTOJOIN = 'dasha_x_gate_autojoin';
  var QUIZ_INVITE_SS = 'dasha_quiz_invite_v1';
  var QUIZ_CARDS = {
    'Dasha scholar': { image: '/simp/photo/bull.jpg', quote: 'It’s time $dasha', source: '2085544531739754651' },
    'Confirmed simp': { image: '/simp/photo/weekend.jpg', quote: 'How u crying at the casino and u can’t even get in', source: '2085405075686801789' },
    'Deep in the lore': { image: '/simp/photo/chart.jpg', quote: 'It’s time this time', source: '2085524407225884699' },
    'Watching respectfully': { image: '/simp/photo/profile.jpg', quote: 'Did you buy my coin', source: '2008730208350990657' },
    'Dasha curious': { image: '/simp/photo/weekend.jpg', quote: 'All I want is free healthcare, honey', source: '1011745071983296512' }
  };
  var QUIZ_PHOTOS = Object.keys(QUIZ_CARDS).map(function (key) { return QUIZ_CARDS[key].image; });
  var BOARD_CSS = '.simp-board-root{max-width:36rem;margin:0 auto;color:#f4eddb;font-family:Arial,Helvetica,sans-serif}.simp-lede{margin:0 0 1.25rem;font:900 clamp(1.35rem,3.4vw,2rem)/1.15 "Arial Black",Helvetica,Arial,sans-serif}.simp-home-actions,.simp-quiz-invite-actions{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 1.75rem;align-items:center}.simp-quiz-go,.simp-quiz-start,.simp-action,.simp-tool{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 1.25rem;border:0;background:#dfff00;color:#070608;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;text-decoration:none;box-shadow:4px 4px 0 #ff3b81;cursor:pointer}.simp-action:disabled,.simp-tool:disabled{opacity:.7;color:#070608}.simp-connect{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 1.25rem;border:1px solid #f4eddb;background:none;color:#f4eddb;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;cursor:pointer}.simp-board{display:grid}.simp-row{display:grid;grid-template-columns:3.2rem minmax(0,1fr) 3.2rem;gap:.8rem;align-items:baseline;padding:.8rem 0;border-bottom:1px solid rgba(244,237,219,.18);background:none}.simp-rank{color:#dfff00;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}.simp-handle{color:#f4eddb;font-weight:900;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.simp-pts{color:rgba(244,237,219,.5);text-align:right;font-variant-numeric:tabular-nums}.simp-empty,.simp-status{margin:0;color:rgba(244,237,219,.42)}.simp-status:empty{display:none}.simp-more{margin:1.25rem 0 0;padding:0;border:0;background:none;color:#dfff00;font:900 1rem/1.2 "Arial Black",Helvetica,Arial,sans-serif;cursor:pointer}.simp-tools summary{min-height:48px;color:#f4eddb;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;cursor:pointer}';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function apiBase(opts, root) {
    if (opts && opts.api) return String(opts.api).replace(/\/$/, '');
    var attr = root && root.getAttribute('data-simp-api');
    if (attr) return String(attr).replace(/\/$/, '');
    return DEFAULT_API;
  }

  function isHomePath() {
    try {
      var p = String(location.pathname || '/').replace(/\/+$/, '') || '/';
      return p === '/' || p === '/index' || p === '/index.html';
    } catch (e) {
      return false;
    }
  }

  /** Shareable entry: ?quiz=1 | ?quiz=start | #quiz | #simp-quiz */
  function wantsQuizInvite() {
    try {
      var q = new URLSearchParams(location.search || '');
      var challenge = String(q.get('challenge') || '');
      if (/^[A-Za-z0-9_-]{6,20}$/.test(challenge)) return true;
      var quiz = String(q.get('quiz') || q.get('start') || '').toLowerCase();
      if (quiz === '1' || quiz === 'start' || quiz === 'true' || quiz === 'yes') return true;
      var h = String(location.hash || '')
        .replace(/^#/, '')
        .toLowerCase();
      if (h === 'quiz' || h === 'simp-quiz' || h.indexOf('quiz=1') !== -1) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function gateDismissed() {
    try {
      return Boolean(localStorage.getItem(GATE_LS));
    } catch (e) {
      return false;
    }
  }

  function markGateDone() {
    try {
      localStorage.setItem(GATE_LS, '1');
    } catch (e) {}
    try {
      sessionStorage.removeItem(GATE_AUTOJOIN);
    } catch (e) {}
  }

  function askShown() {
    try {
      return sessionStorage.getItem(ASK_SS) === '1';
    } catch (e) {
      return false;
    }
  }

  function markAskShown() {
    try {
      sessionStorage.setItem(ASK_SS, '1');
    } catch (e) {}
  }

  function setGateAutoJoin(on) {
    try {
      if (on) sessionStorage.setItem(GATE_AUTOJOIN, '1');
      else sessionStorage.removeItem(GATE_AUTOJOIN);
    } catch (e) {}
  }

  function wantsGateAutoJoin() {
    try {
      return sessionStorage.getItem(GATE_AUTOJOIN) === '1';
    } catch (e) {
      return false;
    }
  }

  function fetchJson(url, init) {
    return fetch(url, init).then(function (r) {
      return r.text().then(function (raw) {
        var data = null;
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch (e) {
            data = { error: 'non-json response', raw: String(raw).slice(0, 120) };
          }
        }
        return { status: r.status, data: data || {} };
      });
    });
  }

  function base58(bytes) {
    var alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    var digits = [0];
    for (var i = 0; i < bytes.length; i++) {
      var carry = bytes[i];
      for (var j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = (carry / 58) | 0;
      }
      while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
    }
    var out = '';
    for (var z = 0; z < bytes.length - 1 && bytes[z] === 0; z++) out += '1';
    for (var k = digits.length - 1; k >= 0; k--) out += alphabet[digits[k]];
    return out;
  }

  function phantomBrowseUrl(url) {
    return 'https://phantom.app/ul/browse/' + encodeURIComponent(url) + '?ref=' + encodeURIComponent(new URL(url).origin);
  }

  function mount(root, opts) {
    opts = opts || {};
    if (!root) return null;
    var base = apiBase(opts, root);
    var homeBoard = isHomePath();
    var homeOpen = false;
    root.innerHTML = '';
    root.classList.add('simp-board-root');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Dasha simp board');
    var style = document.createElement('style');
    style.textContent = BOARD_CSS + '.simp-quiz{margin:0 0 26px;padding:clamp(20px,4vw,34px);border:1px solid var(--line,#665b70);background:rgba(255,255,255,.055);color:var(--paper,#f4eddb)}.simp-quiz-title{margin:0 0 6px;color:var(--paper,#f4eddb)!important;font-size:clamp(28px,4vw,42px)}.simp-quiz-note{margin:0 0 18px;color:var(--paper,#f4eddb)}.simp-quiz-stage{display:grid;gap:18px}.simp-quiz-count{margin:0;color:var(--paper,#f4eddb);font-size:13px;font-weight:800;letter-spacing:.08em}.simp-quiz-stage.is-correct .simp-quiz-count{color:var(--acid,#dfff00)}.simp-quiz-stage.is-wrong .simp-quiz-count{color:var(--hot,#ff3b81)}.simp-quiz-bar{height:4px;background:#44384d}.simp-quiz-fill{display:block;height:100%;background:var(--acid,#dfff00);transition:width .2s}.simp-quiz-media{display:block;width:100%;height:auto;min-height:180px;max-height:min(56svh,480px);object-fit:cover;margin:0 0 14px;background:#160f1d}.simp-quiz-question{margin:4px 0;color:var(--paper,#f4eddb)!important;font-size:clamp(25px,5vw,46px);line-height:1.08}.simp-quiz-choices{display:grid;gap:10px}.simp-quiz-choice{display:flex;gap:12px;align-items:center;width:100%;min-height:54px;padding:12px 14px;border:1px solid #f4eddb;background:#070608;color:#f4eddb;text-align:left;cursor:pointer;transition:border-color .12s,background .12s,transform .12s}.simp-quiz-key{display:grid;place-items:center;min-width:28px;height:28px;border:1px solid #aa9ab8;color:var(--acid,#dfff00)}.simp-quiz-choice:hover,.simp-quiz-choice:focus-visible{border-color:var(--acid,#dfff00)}.simp-quiz-choice.is-selected{border-color:var(--acid,#dfff00);background:rgba(223,255,0,.15);transform:translateX(3px)}.simp-quiz-feedback{margin:0;color:#f4eddb}.simp-quiz-source{color:var(--acid,#dfff00)}.simp-surprise{margin:4px 0 0;padding:12px 14px;border:1px dashed var(--acid,#dfff00);background:rgba(223,255,0,.1);display:grid;gap:4px}.simp-surprise strong{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--acid,#dfff00)}.simp-surprise p{margin:0;font-size:14px;line-height:1.35;color:var(--paper,#f4eddb)}.simp-quiz-close{display:none;justify-self:end;border:0;background:none;color:var(--paper,#f4eddb);font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;min-height:48px;cursor:pointer}.simp-quiz-active .simp-quiz{min-height:calc(100svh - 48px);display:grid;align-content:center}.simp-quiz-active>.simp-status,.simp-quiz-active>.simp-privacy,.simp-quiz-active>.simp-board,.simp-quiz-active>.simp-actions,.simp-quiz-active>.simp-me,.simp-quiz-active>.simp-tools{display:none!important}.simp-quiz-active .simp-quiz-close{display:block}html.simp-quiz-open .buy-sticky,html.simp-result-open .buy-sticky{display:none!important}.simp-quiz-result-bar{display:none;position:fixed;left:0;right:0;bottom:0;z-index:96;gap:10px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:rgba(7,6,8,.94);border-top:1px solid #665b70;backdrop-filter:blur(10px)}.simp-quiz-result-bar button,.simp-quiz-result-bar a{flex:1 1 auto;min-height:48px;display:inline-flex;align-items:center;justify-content:center;padding:0 14px;border-radius:999px;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-decoration:none!important;cursor:pointer;border:1px solid #dfff00;background:#dfff00;color:#070608}.simp-quiz-result-bar a.ghost{border-color:#f4eddb;background:transparent;color:#f4eddb;flex:0.9 1 auto}@media(max-width:720px){html.simp-result-open .simp-quiz-result-bar{display:flex}.simp-quiz-box{padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}}@media(max-width:520px){.simp-quiz{padding:18px}.simp-quiz-title{font-size:28px}.simp-quiz-question{font-size:30px}.simp-quiz-active .simp-quiz{min-height:calc(100svh - 22px);align-content:start;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}html.simp-result-open .simp-quiz{padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))}}@media(prefers-reduced-motion:reduce){.simp-quiz-fill,.simp-quiz-choice{transition:none}.simp-quiz-choice.is-selected{transform:none}}.simp-share-push{position:fixed;inset:0;z-index:98;display:grid;place-items:center;padding:16px;background:rgba(7,6,8,.82)}.simp-share-push-card{width:min(440px,100%);padding:22px 20px 18px;border:2px solid #dfff00;background:#120c18;color:#f4eddb;display:grid;gap:12px;box-shadow:12px 12px 0 #ff3b81}.simp-share-push-card h2{margin:0;font-size:clamp(26px,6vw,36px);line-height:1.05;text-transform:uppercase}.simp-share-push-card p{margin:0;font-size:15px;line-height:1.45}.simp-share-push-url{word-break:break-all;font:700 13px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#dfff00;user-select:all}.simp-share-push-actions{display:flex;flex-wrap:wrap;gap:10px}.simp-share-push-actions button{min-height:48px;padding:0 16px;border:1px solid #dfff00;background:#dfff00;color:#070608;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;cursor:pointer}.simp-share-push-actions .ghost{border-color:#f4eddb;background:transparent;color:#f4eddb}';
    root.appendChild(style);

    var quiz = el('section', 'simp-quiz');
    var quizClose = el('button', 'simp-quiz-close', 'Close'); quizClose.type = 'button';
    quiz.appendChild(quizClose);
    quiz.appendChild(el('h3', 'simp-quiz-title', 'How big of a Dasha simp are you?'));
    var quizNote = el('p', 'simp-quiz-note', 'Take the quiz. Finishing joins the Board.');
    var quizBtn = el('button', 'simp-action simp-quiz-start', 'Take the quiz'); quizBtn.type = 'button';
    quizBtn.setAttribute('aria-label', 'Start the Dasha simp quiz');
    var retakeBtn = el('button', 'simp-action', 'Retake quiz'); retakeBtn.type = 'button'; retakeBtn.hidden = true;
    retakeBtn.setAttribute('aria-label', 'Retake the simp quiz and update your board score');
    var connectBtn = el('button', 'simp-connect', 'Connect X');
    connectBtn.type = 'button';
    connectBtn.setAttribute('aria-label', 'Connect X');
    var quizActions = el('div', 'simp-actions simp-quiz-invite-actions');
    var quizBox = el('div', 'simp-quiz-box'); quizBox.hidden = true;
    quiz.appendChild(quizNote); quiz.appendChild(quizActions); quiz.appendChild(quizBox);
    if (homeBoard) {
      var hop = el('p', 'simp-lede', 'How big of a Dasha simp are you?');
      var homeActions = el('div', 'simp-home-actions');
      var homeQuiz = document.createElement('a');
      homeQuiz.className = 'simp-quiz-go';
      homeQuiz.href = '/simp';
      homeQuiz.textContent = 'Take the quiz';
      homeActions.appendChild(homeQuiz);
      homeActions.appendChild(connectBtn);
      root.appendChild(hop);
      root.appendChild(homeActions);
    } else {
      quizActions.appendChild(quizBtn);
      quizActions.appendChild(connectBtn);
      quizActions.appendChild(retakeBtn);
      root.appendChild(quiz);
    }

    var status = el('p', 'simp-status', 'Loading board…');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    root.appendChild(status);

    var list = el('div', 'simp-board');
    root.appendChild(list);

    var actions = el('div', 'simp-actions');
    var actionBtn = el('button', 'simp-action', '…');
    actionBtn.type = 'button';
    actionBtn.hidden = true;
    actions.appendChild(actionBtn);

    var meLine = el('p', 'simp-me', '');
    meLine.hidden = true;

    var tools = el('details', 'simp-tools');
    tools.hidden = true;
    tools.appendChild(el('summary', '', 'More'));
    var toolActions = el('div', 'simp-tool-actions');
    var shareBoardBtn = el('button', 'simp-tool', 'Share on X'); shareBoardBtn.type = 'button';
    shareBoardBtn.setAttribute('aria-label', 'Share your Simp Board row on X');
    var inviteToolBtn = el('button', 'simp-tool', 'Copy quiz invite'); inviteToolBtn.type = 'button';
    inviteToolBtn.setAttribute('aria-label', 'Copy shareable quiz invite link');
    var holderBtn = el('button', 'simp-tool', 'Prove holder badge'); holderBtn.type = 'button';
    toolActions.appendChild(shareBoardBtn);
    toolActions.appendChild(inviteToolBtn);
    toolActions.appendChild(holderBtn);
    tools.appendChild(toolActions);
    var seasonLine = el('p', 'simp-season', '');     tools.appendChild(seasonLine);
    if (!homeBoard) {
      root.appendChild(actions);
      root.appendChild(meLine);
      root.appendChild(tools);
    }

    var boardData = null;
    var meData = null;
    var quizState = null;
    var quizAttemptId = '';
    /** Prevent double-taps while an answer is in flight. */
    var quizAnswerBusy = false;
    /** Last finished quiz (client memory) so Share works even if /me lags. */
    var lastQuizResult = null;
    var challengeId = new URLSearchParams(location.search).get('challenge');
    var challengeResult = null;
    var busy = false;
    var gateEl = null;
    var gateBusy = false;
    var prevBodyOverflow = '';
    var gateKeyHandler = null;
    var gateFocusReturn = null;
    var askIo = null;
    var askScroll = null;

    function setStatus(t, kind) {
      status.textContent = t;
      status.dataset.kind = kind || '';
    }

    function paintChallengeNote() {
      if (!challengeResult) return;
      quizNote.textContent = 'Beat ' + challengeResult.correct + '/' + challengeResult.total + ' · ' + challengeResult.title + ' · ' + challengeResult.lane;
    }

    function paintLinkedIdentity(suffix) {
      meLine.textContent = '';
      meLine.appendChild(document.createTextNode('X · '));
      if (meData && meData.x && meData.x.avatar) {
        var avatar = document.createElement('img');
        avatar.src = meData.x.avatar;
        avatar.alt = '';
        avatar.width = avatar.height = 24;
        avatar.style.cssText = 'width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:6px';
        meLine.appendChild(avatar);
      }
      var profile = document.createElement('a');
      profile.href = (meData && meData.x && meData.x.href) || 'https://x.com/';
      profile.target = '_blank';
      profile.rel = 'noopener noreferrer';
      profile.textContent = (meData && meData.x && meData.x.display) || '@…';
      meLine.appendChild(profile);
      meLine.appendChild(document.createTextNode(suffix || ''));
    }

    function closeGate() {
      if (gateKeyHandler) {
        document.removeEventListener('keydown', gateKeyHandler);
        gateKeyHandler = null;
      }
      if (!gateEl) return;
      if (gateEl.parentNode) gateEl.parentNode.removeChild(gateEl);
      gateEl = null;
      try {
        document.documentElement.classList.remove('simp-gate-open');
        document.body.style.overflow = prevBodyOverflow;
      } catch (e) {}
      var ret = gateFocusReturn;
      gateFocusReturn = null;
      if (ret && typeof ret.focus === 'function') {
        try {
          ret.focus();
        } catch (e) {}
      }
    }

    function paintGate() {
      if (!gateEl) return;
      if (meData && meData.linked) {
        markGateDone();
        closeGate();
        return;
      }
    }

    function setQuizOpen(on) {
      root.classList.toggle('simp-quiz-active', Boolean(on));
      document.documentElement.classList.toggle('simp-quiz-open', Boolean(on));
      if (on && root.scrollIntoView) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /** Result share phase: hide buy sticky + mobile sticky Share CTA. */
    function hideResultSticky() {
      var bar = document.getElementById('dasha-quiz-result-bar');
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      try {
        document.documentElement.classList.remove('simp-result-open');
      } catch (e) {}
    }

    function showResultSticky(onShare) {
      hideResultSticky();
      try {
        document.documentElement.classList.add('simp-result-open');
      } catch (e) {}
      var bar = el('div', 'simp-quiz-result-bar');
      bar.id = 'dasha-quiz-result-bar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'Share quiz result');
      var share = el('button', '', 'Share result');
      share.type = 'button';
      share.setAttribute('aria-label', 'Share quiz result card');
      share.addEventListener('click', function () {
        if (typeof onShare === 'function') onShare();
      });
      bar.appendChild(share);
      document.body.appendChild(bar);
    }

    function closeQuiz() {
      hideResultSticky();
      quizBox.hidden = true;
      quizBtn.hidden = false;
      retakeBtn.disabled = false;
      quizBtn.disabled = false;
      setQuizOpen(false);
      paintMe();
      try {
        quizBtn.focus();
      } catch (e) {}
    }

    function postJoin() {
      return fetchJson(base + '/simp/join', {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }).then(function (res) {
        if (res.status === 401 || (res.data && res.data.error === 'not linked')) {
          return { ok: false, error: 'Link X first', needLink: true };
        }
        if (!res.data || !res.data.ok) {
          return { ok: false, error: (res.data && res.data.error) || 'Join failed' };
        }
        return { ok: true, created: Boolean(res.data.created) };
      });
    }

    function rowClean(entry) {
      var art = el('article', 'simp-row');
      art.appendChild(el('span', 'simp-rank', '#' + (entry.rank || '')));
      var a = document.createElement('a');
      a.className = 'simp-handle';
      a.href = entry.href || ('https://x.com/' + (entry.handle || ''));
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = entry.display || ('@' + (entry.handle || ''));
      art.appendChild(a);
      art.appendChild(el('span', 'simp-pts', entry.total == null ? '' : String(entry.total)));
      return art;
    }

    function paintBoard() {
      list.textContent = '';
      if (!boardData) return;
      var rows = [];
      var editorial = (boardData.editorial || [])[0];
      if (editorial) rows.push(editorial);
      (boardData.measured || []).forEach(function (m) { rows.push(m); });
      if (!rows.length) {
        list.appendChild(el('p', 'simp-empty', 'Empty.'));
        return;
      }
      var shown = homeBoard && !homeOpen ? rows.slice(0, 10) : rows;
      shown.forEach(function (entry) { list.appendChild(rowClean(entry)); });
      if (homeBoard && rows.length > 10 && !homeOpen) {
        var more = el('button', 'simp-more', 'Show more');
        more.type = 'button';
        more.addEventListener('click', function () {
          homeOpen = true;
          paintBoard();
        });
        list.appendChild(more);
      }
    }

    function paintMe() {
      actionBtn.hidden = false;
      actionBtn.disabled = false;
      tools.hidden = true;
      meLine.hidden = true;
      meLine.textContent = '';
      quizBtn.hidden = false;
      retakeBtn.hidden = true;
      quizBtn.disabled = false;
      retakeBtn.disabled = false;
      connectBtn.hidden = !!(meData && meData.linked);
      if (!meData || !meData.linked) {
        actionBtn.textContent = 'Link X to join';
      actionBtn.setAttribute('aria-label', 'Link X to join the simp board');
        actionBtn.dataset.mode = 'link';
        quizBtn.textContent = 'Take the quiz';
        quizBtn.dataset.mode = 'quiz';
        quizBtn.setAttribute('aria-label', 'Start the Dasha simp quiz');
        quizNote.textContent = 'Take the quiz. Finishing joins the Board.';
        return;
      }
      var quizResult = (meData.board && meData.board.quiz) || lastQuizResult;
      quizBtn.textContent = quizResult ? 'Share result' : 'Take the quiz';
      quizBtn.dataset.mode = quizResult ? 'share' : 'quiz';
      quizBtn.setAttribute(
        'aria-label',
        quizResult ? 'Share your quiz result' : 'Start the Dasha simp quiz',
      );
      retakeBtn.hidden = !quizResult;
      retakeBtn.setAttribute('aria-label', 'Retake the simp quiz and update your score');
      quizNote.textContent = quizResult
        ? quizResult.correct +
          '/' +
          quizResult.total +
          ' · ' +
          quizResult.title +
          ' · ' +
          (meData.board && meData.board.components ? meData.board.components.quiz || 0 : quizResult.points || 0) +
          ' pts' +
          (quizResult.vibeNote ? ' · ' + quizResult.vibeNote : '') +
          (quizResult.resultUrl ? ' · ' + quizResult.resultUrl : '') +
          ' · Share anytime · Retake updates score'
        : 'Take the quiz. Finishing joins the Board. Score = accuracy. Vibe is just for fun.';
      if (!meData.enrolled) {
        actionBtn.textContent = 'Join board';
        actionBtn.setAttribute('aria-label', 'Join the simp board with linked X account');
        actionBtn.dataset.mode = 'join';
        meLine.hidden = false;
        paintLinkedIdentity(' — not on the board yet.');
        return;
      }
      actionBtn.textContent = 'Leave board';
      actionBtn.setAttribute('aria-label', 'Leave the simp board and delete linked board data');
      actionBtn.dataset.mode = 'leave';
      tools.hidden = false;
      meLine.hidden = false;
      var b = meData.board || {};
      var c = b.components || {};
      paintLinkedIdentity(
        ' · ' +
        (b.total != null ? b.total : 0) +
        ' pts (x ' +
        (c.linked_x || 0) +
        ' · quiz ' +
        (c.quiz || 0) +
        ' · learn ' +
        (c.learn || 0) +
        ' · create ' +
        (c.creative || 0) +
        ' · community ' +
        (c.community || 0) +
        ' · oss ' +
        (c.oss || 0) +
        '). Leave removes linked Board data.');
    }

    function linkX() {
      var w = window.open(base + '/oauth/x/start', 'dasha_x', 'width=520,height=700');
      if (!w) {
        setStatus('Allow popups to link X', 'warn');
      } else setStatus('Complete X link in the popup…', 'warn');
    }

    function inviteShareText() {
      return 'How big of a Dasha simp are you?\n\n' + QUIZ_INVITE_URL;
    }

    function copyQuizInvite(btn) {
      var text = QUIZ_INVITE_URL;
      function done() {
        setStatus('Invite link copied — paste anywhere', 'ok');
        if (btn) {
          var prev = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function () {
            btn.textContent = prev;
          }, 1400);
        }
      }
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;left:-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          done();
        } catch (e) {
          setStatus(text, 'warn');
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else fallback();
    }

    function shareQuizInviteOnX() {
      openXIntent(inviteShareText());
      setStatus('X compose opened — share the quiz invite', 'ok');
    }

    function scrollToQuiz() {
      try {
        var target = document.getElementById('simp') || root;
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else location.hash = '#simp';
      } catch (e) {
        try {
          location.hash = '#simp';
        } catch (e2) {}
      }
    }

    /** Sticky bar: connect X while quiz already running (invite deep link). */
    function showQuizConnectBar() {
      if (document.getElementById('dasha-quiz-connect-bar')) return;
      if (meData && meData.linked) return;
      var bar = el('div', 'simp-quiz-connect-bar');
      bar.id = 'dasha-quiz-connect-bar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'Connect X');
      var st = document.createElement('style');
      st.textContent =
        '.simp-quiz-connect-bar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:95;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;border:2px solid #dfff00;border-radius:14px;background:#120c18;color:#f4eddb;box-shadow:8px 8px 0 #ff3b81}' +
        '.simp-quiz-connect-bar p{margin:0;flex:1 1 12rem;font-size:14px;line-height:1.35;font-weight:700}' +
        '.simp-quiz-connect-bar b{color:#dfff00}' +
        '.simp-quiz-connect-bar .actions{display:flex;flex-wrap:wrap;gap:8px}' +
        '.simp-quiz-connect-bar button{min-height:48px;padding:0 16px;border-radius:999px;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;cursor:pointer}' +
        '.simp-quiz-connect-bar .primary{border:1px solid #dfff00;background:#dfff00;color:#070608}' +
        '.simp-quiz-connect-bar .ghost{border:1px solid #f4eddb;background:transparent;color:#f4eddb}' +
        'html.simp-quiz-open .simp-quiz-connect-bar{bottom:calc(72px + env(safe-area-inset-bottom,0px))}';
      bar.appendChild(st);
      var msg = el('p', '');
      msg.appendChild(el('b', '', 'Simp quiz invite'));
      bar.appendChild(msg);
      var acts = el('div', 'actions');
      var connect = el('button', 'primary', 'Connect X');
      connect.type = 'button';
      connect.addEventListener('click', function () {
        try {
          sessionStorage.setItem(QUIZ_INVITE_SS, '1');
        } catch (e) {}
        setGateAutoJoin(true);
        linkX();
      });
      var dismiss = el('button', 'ghost', 'Not now');
      dismiss.type = 'button';
      dismiss.addEventListener('click', function () {
        if (bar.parentNode) bar.parentNode.removeChild(bar);
      });
      acts.appendChild(connect);
      acts.appendChild(dismiss);
      bar.appendChild(acts);
      document.body.appendChild(bar);
    }

    function hideQuizConnectBar() {
      var bar = document.getElementById('dasha-quiz-connect-bar');
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    }

    /**
     * Deep link: /?quiz=1#simp
     * Linked visitors start. Unlinked visitors must connect X first.
     */
    function runQuizInvite() {
      scrollToQuiz();
      if (meData && meData.linked) {
        hideQuizConnectBar();
        startQuiz();
        return;
      }
      openQuizInviteGate();
      showQuizConnectBar();
    }

    function openQuizInviteGate() {
      if (gateEl) return;
      if (meData && meData.linked) return;
      try {
        gateFocusReturn = document.activeElement;
      } catch (e) {
        gateFocusReturn = null;
      }
      gateEl = el('div', 'simp-gate');
      gateEl.id = 'dasha-x-gate';
      gateEl.setAttribute('role', 'dialog');
      gateEl.setAttribute('aria-modal', 'true');
      gateEl.setAttribute('aria-labelledby', 'dasha-x-gate-title');
      var style = document.createElement('style');
      style.textContent =
        '.simp-gate{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:16px;background:rgba(7,6,8,.72);backdrop-filter:blur(6px)}' +
        '.simp-gate-card{width:min(420px,100%);padding:22px 20px 18px;border:2px solid #dfff00;border-radius:16px;background:#120c18;color:#f4eddb;box-shadow:12px 12px 0 #ff3b81;display:grid;gap:12px}' +
        '.simp-gate-kicker{margin:0;font-size:11px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:#dfff00}' +
        '.simp-gate-card h2{margin:0;font-size:clamp(24px,5vw,32px);line-height:1.05;letter-spacing:-.03em;text-transform:uppercase}' +
        '.simp-gate-card p{margin:0;font-size:15px;line-height:1.45;color:#e6dcc4}' +
        '.simp-gate-note{font-size:13px!important;color:#a99faf!important}' +
        '.simp-gate-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}' +
        '.simp-gate-actions button{min-height:48px;padding:0 18px;border-radius:999px;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}' +
        '.simp-gate-primary{border:1px solid #dfff00;background:#dfff00;color:#070608}' +
        '.simp-gate-skip{border:1px solid #f4eddb;background:transparent;color:#f4eddb}' +
        'html.simp-gate-open .buy-sticky{display:none!important}';
      gateEl.appendChild(style);
      var card = el('div', 'simp-gate-card');
      card.appendChild(el('p', 'simp-gate-kicker', 'Quiz invite'));
      var h = el('h2', '', 'Connect X');
      h.id = 'dasha-x-gate-title';
      card.appendChild(h);
      var actions = el('div', 'simp-gate-actions');
      var primary = el('button', 'simp-gate-primary', 'Connect X');
      primary.type = 'button';
      actions.appendChild(primary);
      card.appendChild(actions);
      var gateStatus = el('p', 'simp-gate-status', '');
      gateStatus.setAttribute('role', 'status');
      card.appendChild(gateStatus);
      gateEl.appendChild(card);
      document.body.appendChild(gateEl);
      try {
        document.documentElement.classList.add('simp-gate-open');
      } catch (e) {}
      function dismiss() {
        closeGate();
      }
      gateKeyHandler = function (ev) {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          dismiss();
        }
      };
      document.addEventListener('keydown', gateKeyHandler);
      gateEl.addEventListener('click', function (ev) {
        if (ev.target === gateEl) dismiss();
      });
      primary.addEventListener('click', function () {
        try {
          sessionStorage.setItem(QUIZ_INVITE_SS, '1');
        } catch (e) {}
        setGateAutoJoin(true);
        gateStatus.textContent = 'Complete X link in the popup…';
        gateStatus.dataset.kind = 'warn';
        var w = window.open(base + '/oauth/x/start', 'dasha_x', 'width=520,height=700');
        if (!w) {
          gateStatus.textContent = 'Allow popups to connect X';
          setStatus('Allow popups to link X', 'warn');
        }
      });
      try {
        primary.focus();
      } catch (e) {}
    }

    function stopHomeConnectAsk() {
      if (askIo) {
        try {
          askIo.disconnect();
        } catch (e) {}
        askIo = null;
      }
      if (askScroll) {
        window.removeEventListener('scroll', askScroll);
        askScroll = null;
      }
    }

    /** Small card after the hero — never a first-paint blur gate. */
    function openScrollConnectCard() {
      if (!homeBoard || gateEl) return;
      if (meData && meData.linked) return;
      if (gateDismissed() || askShown()) return;
      markAskShown();
      gateEl = el('aside', 'simp-x-ask');
      gateEl.id = 'dasha-x-ask';
      gateEl.setAttribute('role', 'dialog');
      gateEl.setAttribute('aria-label', 'Connect X');
      var st = document.createElement('style');
      st.textContent =
        '.simp-x-ask{position:fixed;right:16px;bottom:calc(172px + env(safe-area-inset-bottom,0px));z-index:40;width:min(320px,calc(100vw - 32px));background:#f4eddb;color:#070608;border:3px solid #070608;box-shadow:6px 6px 0 #ff3b81;padding:16px 18px}' +
        '.simp-x-ask p{margin:0 0 12px;font:700 15px/1.3 Arial,Helvetica,sans-serif}' +
        '.simp-x-ask .x-go{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 18px;background:#dfff00;color:#070608;font:900 1rem/1 "Arial Black",Helvetica,sans-serif;text-transform:uppercase;border:3px solid #070608;box-shadow:4px 4px 0 #ff3b81;cursor:pointer}' +
        '.simp-x-ask .x-skip{display:block;margin-top:8px;background:none;border:0;color:#070608;font:900 1rem/1.2 "Arial Black",Helvetica,sans-serif;text-decoration:underline;cursor:pointer;min-height:48px}';
      gateEl.appendChild(st);
      gateEl.appendChild(el('p', '', 'Connect X to keep your score.'));
      var go = el('button', 'x-go', 'Connect X');
      go.type = 'button';
      var skip = el('button', 'x-skip', 'Not now');
      skip.type = 'button';
      gateEl.appendChild(go);
      gateEl.appendChild(skip);
      document.body.appendChild(gateEl);
      go.addEventListener('click', function () {
        linkX();
      });
      skip.addEventListener('click', function () {
        markGateDone();
        closeGate();
      });
    }

    function watchHomeConnectAsk() {
      if (!homeBoard) return;
      if (meData && meData.linked) return;
      if (gateDismissed() || askShown()) return;
      var armed = false;
      var fire = function () {
        if (armed) return;
        armed = true;
        stopHomeConnectAsk();
        openScrollConnectCard();
      };
      var simp = document.getElementById('simp');
      if (simp && 'IntersectionObserver' in window) {
        askIo = new IntersectionObserver(
          function (ents) {
            if (ents.some(function (e) { return e.isIntersecting; })) fire();
          },
          { threshold: 0.12 },
        );
        askIo.observe(simp);
      }
      askScroll = function () {
        if (window.scrollY < Math.round(window.innerHeight * 0.85)) return;
        fire();
      };
      window.addEventListener('scroll', askScroll, { passive: true });
      askScroll();
    }

    function afterLinkedJoin() {
      setStatus('X linked — refreshing…', 'ok');
      var autoJoin = wantsGateAutoJoin();
      var fromQuizInvite = false;
      try {
        fromQuizInvite = sessionStorage.getItem(QUIZ_INVITE_SS) === '1';
        sessionStorage.removeItem(QUIZ_INVITE_SS);
      } catch (e) {}
      return refresh()
        .then(function () {
          paintLinkedChip();
          paintGate();
          if (!meData || !meData.linked) return;
          markGateDone();
          closeGate();
          hideQuizConnectBar();
          if (fromQuizInvite && quizBox.hidden) {
            scrollToQuiz();
            startQuiz();
          }
          if (autoJoin && !meData.enrolled) {
            setGateAutoJoin(false);
            return postJoin().then(function (res) {
              if (!res.ok) {
                setStatus(res.error || 'Linked — join the board when ready', 'warn');
                return;
              }
              return refresh().then(function () {
                showJoinSuccess(Boolean(res.created));
              });
            });
          }
          if (meData.enrolled) setStatus('X linked · on the board', 'ok');
          else setStatus('X linked — join the board when ready', 'ok');
        })
        .catch(function () {
          setGateAutoJoin(false);
        });
    }

    function loadImage(src) {
      return new Promise(function (resolve, reject) {
        var img = new Image(); img.crossOrigin = 'anonymous'; img.onload = function () { resolve(img); }; img.onerror = reject; img.src = src.charAt(0) === '/' ? base + src : src;
      });
    }

    function cover(ctx, img, x, y, width, height) {
      var scale = Math.max(width / img.width, height / img.height);
      var sw = width / scale, sh = height / scale;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, width, height);
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      var words = text.split(' '), line = '', lines = [];
      words.forEach(function (word) {
        var test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
      });
      if (line) lines.push(line);
      lines.slice(0, 3).forEach(function (row, index) { ctx.fillText(row, x, y + index * lineHeight); });
    }

    function quizCardBlob(result, photoIndex) {
      var card = QUIZ_CARDS[result.title] || QUIZ_CARDS['Dasha curious'];
      return loadImage(QUIZ_PHOTOS[photoIndex % QUIZ_PHOTOS.length]).then(function (img) {
        var canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 675;
        var ctx = canvas.getContext('2d'); cover(ctx, img, 0, 0, 1200, 675);
        var shade = ctx.createLinearGradient(450, 0, 1200, 0); shade.addColorStop(0, 'rgba(7,6,8,.12)'); shade.addColorStop(.58, 'rgba(7,6,8,.88)'); shade.addColorStop(1, '#070608'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 1200, 675);
        ctx.fillStyle = '#dfff00'; ctx.font = '900 28px Arial'; ctx.fillText('DASHA SIMP QUIZ', 650, 76);
        ctx.fillStyle = '#f4eddb'; ctx.font = '900 58px Arial'; wrapText(ctx, '“' + card.quote + '”', 650, 158, 490, 66);
        ctx.fillStyle = '#ff3b81'; ctx.font = '900 112px Arial'; ctx.fillText(result.correct + '/' + result.total, 646, 450);
        ctx.fillStyle = '#f4eddb'; ctx.font = '800 26px Arial'; wrapText(ctx, result.title + (result.lane ? ' · ' + result.lane : ''), 650, 492, 490, 32);
        ctx.font = '700 24px Arial'; ctx.fillText((meData && meData.x && meData.x.display) || '@dash_eats', 650, 553);
        ctx.fillStyle = '#dfff00'; ctx.font = '800 22px Arial'; ctx.fillText('getdasha.com', 650, 618);
        return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
      });
    }

    function openXIntent(text) {
      window.open(
        'https://x.com/intent/post?text=' + encodeURIComponent(text),
        '_blank',
        'noopener,noreferrer',
      );
    }

    function boardShareText() {
      var b = meData && meData.board;
      var handle = meData && meData.x && meData.x.display;
      if (!b || !handle) return '';
      var bits = handle + ' · ' + (b.total != null ? b.total : 0) + ' simp pts on getdasha';
      if (b.quiz) bits += '\nQuiz: ' + b.quiz.correct + '/' + b.quiz.total + ' · ' + b.quiz.title;
      if (b.badges && b.badges.length) bits += '\n' + b.badges.join(' · ');
      bits += '\n\n$dasha ' + QUIZ_INVITE_URL;
      return bits;
    }

    function shareBoardOnX() {
      var text = boardShareText();
      if (!text) {
        setStatus('Join the board to share your row', 'warn');
        return;
      }
      openXIntent(text);
      setStatus('Opened X — post your board row', 'ok');
    }

    function quizShareText(result, includeUrl) {
      var handle = (meData && meData.x && meData.x.display) || '';
      var title = (result && result.title) || 'Dasha simp';
      var score =
        result && result.correct != null
          ? result.correct + '/' + (result.total != null ? result.total : '?')
          : '';
      var who = handle ? handle + ' · ' : '';
      var challengeUrl = (result && result.resultUrl) || QUIZ_INVITE_URL;
      return (
        who +
        title +
        (score ? ' ' + score : '') +
        (includeUrl === false ? '\nBeat this' : '\nBeat this → ' + challengeUrl) +
        '\n$dasha'
      );
    }

    /** Prefer system share with result PNG (mobile CT); fall back to X text intent. */
    function sendQuizCard(result, blob) {
      var text = quizShareText(result);
      if (!text) {
        setStatus('Finish the quiz to share a result', 'warn');
        return;
      }
      trackQuiz('share');
      if (blob && navigator.canShare) {
        try {
          var file = new File([blob], 'dasha-simp-result.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            navigator
              .share({
                files: [file],
                text: quizShareText(result, false),
                url: (result && result.resultUrl) || QUIZ_INVITE_URL,
              })
              .then(function () {
                setStatus('Shared · invite friends to beat your score', 'ok');
              })
              .catch(function (err) {
                if (err && err.name === 'AbortError') {
                  setStatus('', '');
                  return;
                }
                openXIntent(text);
                setStatus('X compose opened — attach the result card if you saved it', 'ok');
              });
            return;
          }
        } catch (e) {}
      }
      openXIntent(text);
      setStatus('X compose opened — hit Post to publish your result', 'ok');
    }

    function hideSharePush() {
      var overlay = document.getElementById('dasha-share-push');
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    function resultShareText(result, url) {
      var title = (result && result.title) || 'Simp';
      return title + '\n' + url;
    }

    function copyText(text, btn, okStatus) {
      function done() {
        setStatus(okStatus || 'Copied', 'ok');
        if (btn) {
          var prev = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function () {
            btn.textContent = prev;
          }, 1400);
        }
      }
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;left:-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          done();
        } catch (e) {
          setStatus(text, 'warn');
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else fallback();
    }

    function showSharePush(result, resultUrl) {
      result = result || lastQuizResult || (meData && meData.board && meData.board.quiz);
      var url = resultUrl || (result && result.resultUrl) || '';
      if (!result || !url) {
        setStatus('No share link yet', 'warn');
        return;
      }
      lastQuizResult = result;
      hideSharePush();
      var overlay = el('div', 'simp-share-push');
      overlay.id = 'dasha-share-push';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'dasha-share-push-title');
      var card = el('div', 'simp-share-push-card');
      var title = el('h2', '', 'Share this');
      title.id = 'dasha-share-push-title';
      card.appendChild(title);
      card.appendChild(el('p', '', 'You finished. Send the link.'));
      var urlLine = el('p', 'simp-share-push-url', url);
      urlLine.setAttribute('aria-label', 'Result link');
      card.appendChild(urlLine);
      var acts = el('div', 'simp-share-push-actions');
      var copyBtn = el('button', '', 'Copy link');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        copyText(url, copyBtn, 'Link copied');
      });
      var tweet = el('button', '', 'Share on X');
      tweet.type = 'button';
      tweet.addEventListener('click', function () {
        trackQuiz('share');
        openXIntent(resultShareText(result, url));
        setStatus('X compose opened — post your result', 'ok');
      });
      acts.appendChild(copyBtn);
      acts.appendChild(tweet);
      if (navigator.share) {
        var native = el('button', '', 'Share');
        native.type = 'button';
        native.addEventListener('click', function () {
          trackQuiz('share');
          navigator.share({ title: (result && result.title) || 'Simp', text: resultShareText(result, url), url: url }).catch(function (err) {
            if (!err || err.name !== 'AbortError') openXIntent(resultShareText(result, url));
          });
        });
        acts.appendChild(native);
      }
      var dismiss = el('button', 'ghost', 'Not now');
      dismiss.type = 'button';
      dismiss.addEventListener('click', hideSharePush);
      acts.appendChild(dismiss);
      card.appendChild(acts);
      overlay.appendChild(card);
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay) hideSharePush();
      });
      document.body.appendChild(overlay);
      try {
        tweet.focus();
      } catch (e) {}
    }

    function shareQuiz(result) {
      result = result || lastQuizResult || (meData && meData.board && meData.board.quiz);
      if (!result) {
        setStatus('No quiz result yet — take the quiz first', 'warn');
        return;
      }
      lastQuizResult = result;
      var photoIndex = 0,
        previewUrl = '',
        cardBlob = null;
      function paintShareChrome(blob) {
        cardBlob = blob || null;
        quizBox.textContent = '';
        quizBox.hidden = false;
        quizBtn.hidden = true;
        retakeBtn.hidden = true;
        setQuizOpen(false);
        if (blob) {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          previewUrl = URL.createObjectURL(blob);
          var img = document.createElement('img');
          img.src = previewUrl;
          img.alt = 'Dasha simp quiz result card preview';
          img.style.cssText = 'display:block;width:100%;height:auto;margin:0 0 12px';
          quizBox.appendChild(img);
        }
        quizBox.appendChild(
          el(
            'p',
            'simp-quiz-note',
            (result.correct != null ? result.correct + '/' + result.total + ' · ' : '') +
              (result.title || 'Result') +
              (blob ? ' — share this card' : ' — post this on X'),
          ),
        );
        var actions = el('div', 'simp-actions');
        var share = el('button', 'simp-action', blob ? 'Share result' : 'Post result on X');
        share.type = 'button';
        share.setAttribute(
          'aria-label',
          blob ? 'Share quiz result card with image' : 'Open X to post your quiz result',
        );
        share.addEventListener('click', function () {
          sendQuizCard(result, cardBlob);
        });
        actions.appendChild(share);
        if (blob) {
          var another = el('button', 'simp-action', 'Another photo');
          another.type = 'button';
          another.addEventListener('click', function () {
            photoIndex++;
            paintPreview();
          });
          actions.appendChild(another);
        }
        var retake = el('button', 'simp-action', 'Retake quiz');
        retake.type = 'button';
        retake.addEventListener('click', function () {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          hideResultSticky();
          quizBox.hidden = true;
          startQuiz();
        });
        var done = el('button', 'simp-action', 'Done');
        done.type = 'button';
        done.addEventListener('click', function () {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          hideResultSticky();
          quizBox.hidden = true;
          quizBtn.hidden = false;
          paintMe();
        });
        actions.appendChild(retake);
        actions.appendChild(done);
        quizBox.appendChild(actions);
        // Sticky Share on mobile so buy chrome cannot bury the completion CTA.
        showResultSticky(function () {
          sendQuizCard(result, cardBlob);
        });
        // Image-first: wait for one tap (preserves mobile user-activation for navigator.share).
        setStatus(
          blob
            ? 'Share your result card — or post text on X. Retake anytime.'
            : 'Post on X — retake anytime to update score.',
          'ok',
        );
        try {
          share.focus();
        } catch (e) {}
      }
      function paintPreview() {
        setStatus('Making your result card…', 'warn');
        quizCardBlob(result, photoIndex)
          .then(function (blob) {
            if (!blob) throw new Error('Card unavailable');
            paintShareChrome(blob);
          })
          .catch(function () {
            // Text-only share still works (no card image required).
            paintShareChrome(null);
          });
      }
      paintPreview();
    }

    function paintLinkedChip() {
      var nav = document.querySelector('.nav .navlinks, .navlinks');
      var chip = document.getElementById('dasha-x-chip');
      if (!meData || !meData.linked || !meData.x || !meData.x.display) {
        if (chip && chip.parentNode) chip.parentNode.removeChild(chip);
        return;
      }
      if (!nav) return;
      if (!chip) {
        chip = document.createElement('a');
        chip.id = 'dasha-x-chip';
        chip.className = 'dasha-x-chip';
        chip.href = document.getElementById('simp') ? '#simp' : '/simp';
        var st = document.getElementById('dasha-x-chip-style');
        if (!st) {
          st = document.createElement('style');
          st.id = 'dasha-x-chip-style';
          // !important: homepage CSS hides .navlinks>a:not(.pill) under 800px — chip must stay visible.
          st.textContent =
            '.dasha-x-chip{display:inline-flex!important;align-items:center;min-height:48px;max-width:11rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 12px;border:1px solid #f4eddb;background:transparent;color:#f4eddb!important;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;letter-spacing:.04em;text-transform:none;text-decoration:none!important}.dasha-x-chip:hover{background:#f4eddb;color:#070608!important}@media(max-width:800px){.dasha-x-chip{font-size:1rem;padding:0 10px;min-height:48px;max-width:8.5rem}}';
          document.head.appendChild(st);
        }
        var lobbyPill = nav.querySelector('a.pill.lobby');
        if (lobbyPill) nav.insertBefore(chip, lobbyPill);
        else nav.appendChild(chip);
      }
      var handle = meData.x.display;
      chip.textContent = meData.enrolled ? handle + ' · board' : handle;
      chip.setAttribute(
        'aria-label',
        meData.enrolled
          ? handle + ' on Simp Board — open board'
          : handle + ' linked — open Simp Board',
      );
      chip.title = meData.enrolled ? 'On Simp Board' : 'Linked · open board';
    }

    function showJoinSuccess(created) {
      paintLinkedChip();
      var panel = document.getElementById('dasha-simp-joined');
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      panel = el('div', 'simp-joined');
      panel.id = 'dasha-simp-joined';
      panel.setAttribute('role', 'status');
      var st = document.createElement('style');
      st.textContent =
        '.simp-joined{position:relative;margin:12px 0;padding:16px 40px 16px 16px;border:1px solid var(--acid,#dfff00);border-radius:12px;background:rgba(223,255,0,.08);display:grid;gap:10px}.simp-joined strong{font-size:16px;color:var(--paper,#f4eddb)}.simp-joined p{margin:0;font-size:14px;line-height:1.45;color:var(--muted,#e6dcc4)}.simp-joined-actions{display:flex;flex-wrap:wrap;gap:8px}.simp-joined-actions a,.simp-joined-actions button{min-height:48px;padding:0 14px;border:1px solid #dfff00;background:#dfff00;color:#070608;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-decoration:none!important;cursor:pointer;display:inline-flex;align-items:center}.simp-joined-actions .ghost{border:1px solid #f4eddb;background:transparent;color:#f4eddb}.simp-joined-x{position:absolute;top:8px;right:8px;min-width:48px;min-height:48px;border:0;background:transparent;color:#f4eddb;font:900 1.4rem/1 "Arial Black",Helvetica,Arial,sans-serif;cursor:pointer}.simp-joined-x:hover{color:#dfff00}';
      panel.appendChild(st);
      var dismiss = el('button', 'simp-joined-x', '×');
      dismiss.type = 'button';
      dismiss.setAttribute('aria-label', 'Dismiss');
      dismiss.addEventListener('click', function () {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      });
      panel.appendChild(dismiss);
      panel.appendChild(
        el('strong', '', created ? 'You’re on the Simp Board' : 'You’re already on the board'),
      );
      panel.appendChild(
        el(
          'p',
          '',
          (meData && meData.x && meData.x.display ? meData.x.display + ' · ' : '') +
            'Share your row · longer lobby chat · reserved seats when busy.',
        ),
      );
      var acts = el('div', 'simp-joined-actions');
      var share = el('button', 'primary', 'Share on X');
      share.type = 'button';
      share.addEventListener('click', shareBoardOnX);
      var invite = el('button', 'ghost', 'Copy quiz invite');
      invite.type = 'button';
      invite.addEventListener('click', function () {
        copyQuizInvite(invite);
      });
      var inviteX = el('button', 'ghost', 'Invite on X');
      inviteX.type = 'button';
      inviteX.addEventListener('click', shareQuizInviteOnX);
      acts.appendChild(share);
      acts.appendChild(invite);
      acts.appendChild(inviteX);
      panel.appendChild(acts);
      if (root.firstChild) root.insertBefore(panel, root.firstChild);
      else root.appendChild(panel);
      setStatus(created ? 'Joined board' : 'Already on board', 'ok');
      var sec = document.getElementById('simp');
      if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      }, 45000);
    }

    function postQuiz(body) {
      if (quizAttemptId && body.action !== 'start') body.attemptId = quizAttemptId;
      return fetchJson(base + '/simp/quiz', { method: 'POST', credentials: 'include', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    function trackQuiz(event, data) {
      fetch(base + '/simp/quiz/event', { method: 'POST', mode: 'cors', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ event: event }, data || {})) }).catch(function () {});
    }

    function renderQuestion(data) {
      quizAnswerBusy = false;
      quizState = data; setQuizOpen(true); quizBox.textContent = ''; quizBox.hidden = false; quizBtn.hidden = true;
      var stage = el('div', 'simp-quiz-stage');
      var current = (data.progress && data.progress.current) || 1;
      var bar = el('div', 'simp-quiz-bar'); bar.setAttribute('role','progressbar'); bar.setAttribute('aria-valuenow',String(current));
      var fill = el('span','simp-quiz-fill'); fill.style.width = Math.min(90, 6 + current * 5) + '%'; bar.appendChild(fill); stage.appendChild(bar);
      var media = data.question.media || (data.question.image && { src: data.question.image, kind: 'image', alt: 'Dasha' });
      if (media && media.src) {
        var qimg = document.createElement('img');
        qimg.className = 'simp-quiz-media';
        qimg.src = media.src.charAt(0) === '/' ? media.src : base + media.src;
        qimg.alt = media.alt || 'Dasha';
        qimg.loading = 'eager';
        stage.appendChild(qimg);
      }
      var question = el('h4','simp-quiz-question',data.question.prompt); question.id = 'simp-quiz-question'; question.tabIndex = -1; stage.appendChild(question);
      var choices = el('div','simp-quiz-choices'); choices.setAttribute('role','group'); choices.setAttribute('aria-labelledby',question.id);
      data.question.choices.forEach(function (choice, index) {
        var button = el('button','simp-quiz-choice'); button.type = 'button';
        button.appendChild(el('span','simp-quiz-key',String(index + 1))); button.appendChild(el('span','',choice));
        button.addEventListener('click',function(){ button.classList.add('is-selected'); answerQuestion(index, choices); }); choices.appendChild(button);
      });
      stage.appendChild(choices);
      quizBox.appendChild(stage);
      try { question.focus({ preventScroll: true }); } catch (error) { question.focus(); }
    }

    function renderFeedback(data, after) {
      quizBox.textContent = '';
      var stage = el('div', 'simp-quiz-stage'); stage.setAttribute('role','status'); stage.setAttribute('aria-live','polite');
      if (data.feedback.correct === true) stage.classList.add('is-correct');
      if (data.feedback.correct === false) stage.classList.add('is-wrong');
      var verdict = data.feedback.correct == null ? 'Lane chosen' : data.feedback.correct ? 'Correct' : 'Not quite';
      stage.appendChild(el('p', 'simp-quiz-count', verdict));
      stage.appendChild(el('h4', 'simp-quiz-question', data.feedback.note));
      var surprise = data.feedback && data.feedback.surprise;
      if (surprise && (surprise.title || surprise.body)) {
        var card = el('div', 'simp-surprise');
        if (surprise.title) card.appendChild(el('strong', '', surprise.title));
        if (surprise.body) card.appendChild(el('p', '', surprise.body));
        stage.appendChild(card);
      }
      if (data.feedback.source) {
        var source = el('a', 'simp-quiz-source', 'Source ↗'); source.href = data.feedback.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; stage.appendChild(source);
      }
      var advanced = false;
      // Snappy advance: surprise slightly longer, otherwise keep flow under 1s.
      var hold = surprise ? 1100 : 650;
      var advance = function () { if (advanced) return; advanced = true; after ? after() : renderQuestion(data); };
      stage.addEventListener('click', function (event) { if (!event.target.closest('a')) advance(); });
      quizBox.appendChild(stage);
      setTimeout(function () { if (quizBox.contains(stage)) advance(); }, hold);
    }

    function answerQuestion(answer, choices) {
      if (quizAnswerBusy) return;
      quizAnswerBusy = true;
      Array.prototype.forEach.call(choices.querySelectorAll('button'), function (button) { button.disabled = true; });
      postQuiz({ action: 'answer', answer: answer }).then(function (res) {
        if (!res.data || !res.data.ok) throw new Error((res.data && res.data.error) || 'Quiz failed');
        if (res.data.done) {
          quizAnswerBusy = false;
          return renderFeedback(res.data, function () {
            quizBox.hidden = true;
            setQuizOpen(false);
            if (res.data.linkRequired) {
              quizAttemptId = res.data.attemptId;
              return linkX();
            }
            if (res.data.quiz) {
              lastQuizResult = res.data.quiz;
            }
            setStatus(
              res.data.retake ? 'Score updated · share your result' : 'Quiz scored · Board joined · share your result',
              'ok',
            );
            showSharePush(res.data.quiz || lastQuizResult, res.data.resultUrl);
            return refresh();
          });
        }
        renderFeedback(res.data);
      }).catch(function (error) {
        quizAnswerBusy = false;
        setStatus(String(error.message || error), 'bad');
        renderQuestion(quizState);
      });
    }

    function startQuiz() {
      quizAnswerBusy = false;
      hideResultSticky();
      if (!meData || !meData.linked) {
        quizBtn.disabled = false;
        retakeBtn.disabled = false;
        linkX();
        return;
      }
      quizBtn.disabled = true;
      retakeBtn.disabled = true;
      postQuiz({ action: 'start' })
        .then(function (res) {
          if (!res.data || !res.data.question) throw new Error((res.data && res.data.error) || 'Quiz unavailable');
          quizAttemptId = res.data.attemptId || '';
          setStatus('Simp quiz', 'ok');
          renderQuestion(res.data);
        })
        .catch(function (error) {
          quizBtn.disabled = false;
          retakeBtn.disabled = false;
          setStatus(String(error.message || error), 'bad');
        });
    }

    function retakeQuiz() {
      startQuiz();
    }

    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && root.classList.contains('simp-quiz-active')) { event.preventDefault(); closeQuiz(); return; }
      if (quizBox.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
      var index = Number(event.key) - 1;
      var buttons = quizBox.querySelectorAll('.simp-quiz-choice');
      if (index >= 0 && index < buttons.length) { event.preventDefault(); buttons[index].click(); }
    });

    connectBtn.addEventListener('click', function () {
      linkX();
    });
    quizBtn.addEventListener('click', function () {
      if (quizBtn.dataset.mode === 'link') {
        return linkX();
      }
      if (quizBtn.dataset.mode === 'share') {
        var shared = lastQuizResult || (meData && meData.board && meData.board.quiz);
        return showSharePush(shared, shared && shared.resultUrl);
      }
      startQuiz();
    });
    retakeBtn.addEventListener('click', function () {
      retakeQuiz();
    });
    inviteToolBtn.addEventListener('click', function () {
      copyQuizInvite(inviteToolBtn);
    });
    quizClose.addEventListener('click', closeQuiz);

    function refresh() {
      return Promise.all([
        fetchJson(base + '/simp/board', { method: 'GET', mode: 'cors', cache: 'no-store' }),
        fetchJson(base + '/simp/me', {
          method: 'GET',
          credentials: 'include',
          mode: 'cors',
          cache: 'no-store',
        }).catch(function () {
          return { status: 0, data: { linked: false, enrolled: false } };
        }),
        fetchJson(base + '/simp/seasons', { method: 'GET', mode: 'cors', cache: 'no-store' }).catch(function () { return { data: { seasons: [] } }; }),
      ])
        .then(function (pair) {
          var boardRes = pair[0];
          var meRes = pair[1];
          if (!boardRes.data || !boardRes.data.editorial) {
            setStatus('Board unavailable', 'bad');
            actionBtn.hidden = true;
            return;
          }
          boardData = boardRes.data;
          meData = meRes.data || { linked: false, enrolled: false };
          if (meData.board && meData.board.quiz) lastQuizResult = meData.board.quiz;
          var seasons = (pair[2].data && pair[2].data.seasons) || [];
          seasonLine.textContent = seasons.length ? 'Latest snapshot: ' + seasons[0].title : 'Lifetime board · no season snapshot yet.';
          paintBoard();
          connectBtn.hidden = !!(meData && meData.linked);
          paintGate();
          if (!homeBoard) {
            paintMe();
            paintChallengeNote();
            paintLinkedChip();
          }
          setStatus('', 'ok');
        })
        .catch(function () {
          setStatus('Board API offline — editorial fallback', 'warn');
          boardData = {
            editorial: [
              {
                rank: 1,
                display: '@PerryALPHA',
                href: 'https://x.com/PerryALPHA',
              },
            ],
            measured: [],
          };
          meData = { linked: false, enrolled: false };
          paintBoard();
          paintLinkedChip();
          actionBtn.hidden = true;
        });
    }

    if (challengeId && /^[A-Za-z0-9_-]{6,20}$/.test(challengeId)) fetchJson(base + '/simp/result/' + challengeId, { method: 'GET', mode: 'cors', cache: 'no-store' }).then(function (res) { if (res.data && res.data.result) { challengeResult = res.data.result; paintChallengeNote(); } }).catch(function () {});

    actionBtn.addEventListener('click', function () {
      if (busy) return;
      var mode = actionBtn.dataset.mode;
      if (mode === 'link') {
        return linkX();
      }
      if (mode === 'join') {
        busy = true;
        actionBtn.disabled = true;
        postJoin()
          .then(function (res) {
            busy = false;
            if (res.needLink) {
              setStatus('Link X first', 'warn');
              actionBtn.disabled = false;
              return refresh();
            }
            if (!res.ok) {
              setStatus(res.error || 'Join failed', 'bad');
              actionBtn.disabled = false;
              return;
            }
            return refresh().then(function () {
              showJoinSuccess(Boolean(res.created));
            });
          })
          .catch(function () {
            busy = false;
            actionBtn.disabled = false;
            setStatus('Join failed — try again', 'bad');
          });
        return;
      }
      if (mode === 'leave') {
        busy = true;
        actionBtn.disabled = true;
        fetchJson(base + '/simp/leave', {
          method: 'POST',
          credentials: 'include',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
          .then(function (res) {
            busy = false;
            if (res.status === 401) {
              setStatus('Session required to leave', 'warn');
              actionBtn.disabled = false;
              return;
            }
            setStatus(res.data && res.data.removed ? 'Left board — linked data removed' : 'Not on board', 'ok');
            return refresh();
          })
          .catch(function () {
            busy = false;
            actionBtn.disabled = false;
            setStatus('Leave failed — try again', 'bad');
          });
      }
    });

    shareBoardBtn.addEventListener('click', shareBoardOnX);

    holderBtn.addEventListener('click', function () {
      var wallet = (global.phantom && global.phantom.solana) || global.solflare || global.solana;
      if (!wallet || !wallet.connect || !wallet.signMessage) {
        if (/Android|iPhone|iPad|iPod/i.test((global.navigator && global.navigator.userAgent) || '')) {
          setStatus('Opening in Phantom…', 'ok');
          global.location.href = phantomBrowseUrl(global.location.href);
        } else setStatus('A Solana wallet with message signing is required', 'warn');
        return;
      }
      holderBtn.disabled = true;
      wallet.connect()
        .then(function (connected) {
          var publicKey = wallet.publicKey || (connected && connected.publicKey);
          if (!publicKey) throw new Error('wallet returned no public key');
          publicKey = publicKey.toString();
          return fetchJson(base + '/simp/wallet/challenge', { method: 'POST', credentials: 'include', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicKey: publicKey }) }).then(function (response) { return { response: response, publicKey: publicKey }; });
        })
        .then(function (pair) {
          var challenge = pair.response.data;
          if (!challenge || !challenge.ok) throw new Error((challenge && challenge.error) || 'challenge failed');
          return wallet.signMessage(new TextEncoder().encode(challenge.message), 'utf8').then(function (signed) {
            var signature = signed.signature || signed;
            if (!signature) throw new Error('wallet returned an incomplete signature');
            return fetchJson(base + '/simp/wallet/verify', { method: 'POST', credentials: 'include', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge: challenge.challenge, publicKey: pair.publicKey, signature: base58(signature) }) });
          });
        })
        .then(function (res) { holderBtn.disabled = false; if (!res.data || !res.data.ok) throw new Error((res.data && res.data.error) || 'holder proof failed'); setStatus('Holder verified. Access open for 24h.', 'ok'); return refresh(); })
        .catch(function (err) { holderBtn.disabled = false; setStatus(String(err.message || err).slice(0, 100), 'bad'); });
    });

    function onXLinkedMessage(ev) {
      if (!ev || !ev.data || ev.data.type !== 'dasha-x-linked') return;
      if (ev.origin !== base) return;
      if (quizAttemptId) {
        return postQuiz({ action: 'finalize' })
          .then(function (res) {
            if (!res.data || !res.data.ok) throw new Error((res.data && res.data.error) || 'Result unavailable');
            quizAttemptId = '';
            if (res.data.quiz) lastQuizResult = res.data.quiz;
            setStatus('Result unlocked · post on X', 'ok');
            showSharePush(res.data.quiz || lastQuizResult, res.data.resultUrl);
            return refresh();
          })
          .catch(function (error) {
            setStatus(String(error.message || error), 'bad');
          });
      }
      afterLinkedJoin();
    }
    window.addEventListener('message', onXLinkedMessage);

    // /simp?quiz=1 → quiz-invite gate. Home waits for scroll past the hero.
    refresh().then(function () {
      if (wantsQuizInvite()) {
        if (homeBoard) {
          try { location.replace('/simp' + location.search + location.hash); } catch (e) {}
          return;
        }
        runQuizInvite();
        return;
      }
      if (homeBoard) watchHomeConnectAsk();
    });
    return {
      destroy: function () {
        window.removeEventListener('message', onXLinkedMessage);
        stopHomeConnectAsk();
        closeGate();
        hideQuizConnectBar();
        hideResultSticky();
        hideSharePush();
        setQuizOpen(false);
        root.innerHTML = '';
      },
      refresh: refresh,
      api: base,
      closeGate: closeGate,
      runQuizInvite: runQuizInvite,
    };
  }

  var api = {
    mount: mount,
    defaultApi: DEFAULT_API,
    gateKey: GATE_LS,
    isHomePath: isHomePath,
    wantsQuizInvite: wantsQuizInvite,
    quizInviteUrl: QUIZ_INVITE_URL,
  };
  global.DashaSimpBoard = api;

  function auto() {
    var node = document.getElementById('dasha-simp-board');
    if (node && !node.dataset.mounted) {
      node.dataset.mounted = '1';
      mount(node);
    }
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
    else auto();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
