/**
 * Dasha lobby client — drop-in embed. MIT-friendly, no build step.
 * Usage: include this script; call DashaLobby.mount(rootEl, { url })
 * or set data-lobby-url on #dasha-lobby.
 * Source of truth for homepage inline (see dasha-lobby-embed-build.mjs).
 */
(function (global) {
  'use strict';

  var MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  var PAIR = '9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7';
  var WSOL = 'So11111111111111111111111111111111111111112';
  var DEFAULT_WS = 'wss://lobby.getdasha.com/ws';
  var MAX_TEXT = 200;
  var MAX_NICK = 18;
  var MAX_SOCKETS = 80;
  var MAX_TEXT_LINKED = 280;
  var FULL_RETRY_MS = 20000;
  var LINK_HOSTS = {
    'www.getdasha.com': 1,
    'getdasha.com': 1,
    'lobby.getdasha.com': 1,
    'x.com': 1,
    'twitter.com': 1,
    'jup.ag': 1,
    'pump.fun': 1,
    'www.pump.fun': 1,
    'phantom.com': 1,
    'www.phantom.com': 1,
    'raydium.io': 1,
    'www.raydium.io': 1,
    'dexscreener.com': 1,
    'www.geckoterminal.com': 1,
    'solscan.io': 1,
    'rugcheck.xyz': 1,
    'github.com': 1,
    'www.github.com': 1,
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function timeLabel(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function linkOk(url) {
    try {
      var u = new URL(url);
      var host = u.hostname.toLowerCase();
      if (u.protocol !== 'https:' || u.username || u.password || !LINK_HOSTS[host]) return false;
      var path = u.pathname.replace(/\/$/, '');
      function exactParams(expected) {
        var keys = Array.from(u.searchParams.keys());
        return keys.length === Object.keys(expected).length && Object.keys(expected).every(function (key) {
          return u.searchParams.getAll(key).length === 1 && u.searchParams.get(key) === expected[key];
        });
      }
      if (host === 'jup.ag') return path === '/swap' && exactParams({ sell: WSOL, buy: MINT });
      if (host === 'pump.fun' || host === 'www.pump.fun') return !u.search && path === '/coin/' + MINT;
      if (host === 'phantom.com' || host === 'www.phantom.com') return !u.search && path === '/tokens/solana/' + MINT;
      if (host === 'raydium.io' || host === 'www.raydium.io') return path === '/swap' && exactParams({ inputMint: 'sol', outputMint: MINT });
      if (host === 'dexscreener.com') return !u.search && path.toLowerCase() === ('/solana/' + PAIR).toLowerCase();
      if (host === 'www.geckoterminal.com') return !u.search && path.toLowerCase() === ('/solana/pools/' + PAIR).toLowerCase();
      if (host === 'solscan.io') return !u.search && path === '/token/' + MINT;
      if (host === 'rugcheck.xyz') return !u.search && path === '/tokens/' + MINT;
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Allow only X CDN avatars in chat metadata. */
  function avatarOk(url) {
    try {
      var u = new URL(url);
      if (u.protocol !== 'https:' || u.username || u.password) return false;
      var h = u.hostname.toLowerCase();
      return h === 'pbs.twimg.com' || h.endsWith('.twimg.com');
    } catch (e) {
      return false;
    }
  }

  function fillBody(node, text) {
    node.textContent = '';
    var s = String(text || '');
    var re = /https?:\/\/[^\s<>"']+/gi;
    var last = 0;
    var m;
    while ((m = re.exec(s))) {
      if (m.index > last) node.appendChild(document.createTextNode(s.slice(last, m.index)));
      var url = m[0];
      if (linkOk(url)) {
        var a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        node.appendChild(a);
      } else {
        node.appendChild(document.createTextNode(url));
      }
      last = m.index + url.length;
    }
    if (last < s.length) node.appendChild(document.createTextNode(s.slice(last)));
  }

  function originFromWs(wsUrl) {
    try {
      var u = new URL(wsUrl);
      var proto = u.protocol === 'wss:' ? 'https:' : u.protocol === 'ws:' ? 'http:' : u.protocol;
      return proto + '//' + u.host;
    } catch (e) {
      return 'https://lobby.getdasha.com';
    }
  }

  function forumThreadUrl(id) {
    return 'https://lobby.getdasha.com/forum?t=' + encodeURIComponent(id);
  }

  function linkCopiedOk(got, want) {
    return String(got || '').replace(/\s+/g, '') === String(want || '');
  }

  function readThreadQuery() {
    try {
      return String(new URLSearchParams(location.search).get('t') || '').trim();
    } catch (e) {
      return '';
    }
  }

  function writeThreadQuery(id) {
    try {
      var u = new URL(location.href);
      if (id) u.searchParams.set('t', id);
      else u.searchParams.delete('t');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  /**
   * Forum column. Routes match dasha-lobby-worker handleForum, not the older live
   * client paths that 404 on this worker.
   */
  function mountForum(root) {
    if (!root) return null;
    root.innerHTML = '';
    root.classList.add('dasha-forum');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Dasha forum');
    var status = el('p', 'df-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    var view = el('div', 'df-view');
    root.appendChild(status);
    root.appendChild(view);
    var linked = false;
    var meHandle = '';
    var lastQuery = '';
    var pendingQuote = null;
    var say = function (msg) { status.textContent = msg || ''; };
    var base = originFromWs(root.getAttribute('data-forum-api') || root.getAttribute('data-lobby-url') || DEFAULT_WS);
    var api = function (path, opts) {
      return fetch(base + path, Object.assign({
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }, opts || {})).then(function (r) {
        return r.text().then(function (raw) {
          var body = null;
          if (raw) {
            try { body = JSON.parse(raw); } catch (e) { body = { error: 'non-json response' }; }
          }
          return { status: r.status, body: body || {} };
        });
      });
    };
    function field(labelText, tag, attrs) {
      var wrap = el('label', 'df-field');
      wrap.appendChild(el('span', 'df-label', labelText));
      var input = document.createElement(tag);
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) input.setAttribute(k, attrs[k]);
      }
      wrap.appendChild(input);
      return { wrap: wrap, input: input };
    }
    function copyLink(id) {
      var b = el('button', 'df-back df-copy');
      b.type = 'button';
      b.textContent = 'Copy link';
      b.addEventListener('click', function () {
        var want = forumThreadUrl(id);
        var label = b.textContent;
        var done = function (text) {
          b.textContent = text;
          setTimeout(function () { b.textContent = label; }, 1800);
        };
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          done('Select');
          return;
        }
        navigator.clipboard.writeText(want).then(function () {
          if (!navigator.clipboard.readText) {
            done('Copied');
            return;
          }
          return navigator.clipboard.readText().then(function (got) {
            done(linkCopiedOk(got, want) ? 'Copied' : 'Select');
          });
        }).catch(function () { done('Select'); });
      });
      return b;
    }
    function threadRow(t) {
      var row = el('article', 'df-row');
      var btn = el('button', 'df-open');
      btn.type = 'button';
      btn.textContent = t.title;
      btn.addEventListener('click', function () { openThread(t.id); });
      var meta = el('p', 'df-meta', '@' + t.handle + ' · ' + (t.replies || 0) + (t.replies === 1 ? ' reply' : ' replies') + ' · ' + timeLabel(t.lastTs || t.ts) + (t.locked ? ' · locked' : ''));
      row.appendChild(btn);
      row.appendChild(meta);
      return row;
    }
    function postRow(p, threadId) {
      var art = el('article', 'df-post');
      var meta = '@' + p.handle + ' · ' + timeLabel(p.ts);
      if (p.editedAt) meta += ' · edited';
      art.appendChild(el('p', 'df-meta', meta));
      var body = el('p', 'df-body');
      if (p.deleted) body.textContent = 'deleted';
      else fillBody(body, p.text);
      art.appendChild(body);
      if (!p.deleted && p.quote && p.quote.id) {
        var quote = el('blockquote', 'df-quote');
        quote.appendChild(el('span', 'df-quote-handle', '@' + (p.quote.handle || '')));
        quote.appendChild(document.createTextNode(' ' + (p.quote.text || '')));
        art.appendChild(quote);
      }
      if (linked && !p.deleted) {
        var tools = el('div', 'df-tools');
        var reply = el('button', 'df-back');
        reply.type = 'button';
        reply.textContent = 'Reply';
        reply.addEventListener('click', function () {
          pendingQuote = { id: p.id, handle: p.handle, text: String(p.text || '').slice(0, 140) };
          renderReplyComposer(threadId);
        });
        tools.appendChild(reply);
        if (meHandle && p.handle === meHandle) {
          var ed = el('button', 'df-back');
          ed.type = 'button';
          ed.textContent = 'Edit';
          ed.addEventListener('click', function () {
            var next = window.prompt('Edit post', p.text || '');
            if (next == null) return;
            api('/forum/thread/' + encodeURIComponent(threadId) + '/post/' + encodeURIComponent(p.id), {
              method: 'PATCH',
              body: JSON.stringify({ text: next }),
            }).then(function (r) {
              if (r.status === 200 && r.body.ok) openThread(threadId);
              else say(failWrite(r));
            }).catch(function () { say('Network error.'); });
          });
          var del = el('button', 'df-back');
          del.type = 'button';
          del.textContent = 'Delete';
          del.addEventListener('click', function () {
            if (!window.confirm('Delete this reply?')) return;
            api('/forum/thread/' + encodeURIComponent(threadId) + '/post/' + encodeURIComponent(p.id), {
              method: 'DELETE',
            }).then(function (r) {
              if (r.status === 200 && r.body.ok) openThread(threadId);
              else say(failWrite(r));
            }).catch(function () { say('Network error.'); });
          });
          tools.appendChild(ed);
          tools.appendChild(del);
        } else {
          var report = el('button', 'df-back');
          report.type = 'button';
          report.textContent = 'Report';
          report.addEventListener('click', function () {
            var reason = window.prompt('Report as: scam, spam, harassment, or off-topic');
            if (!reason) return;
            api('/forum/thread/' + encodeURIComponent(threadId) + '/report', {
              method: 'POST',
              body: JSON.stringify({ postId: p.id, reason: String(reason).trim().toLowerCase() }),
            }).then(function (r) {
              say(r.status === 200 && r.body.ok ? 'Reported.' : failWrite(r));
            }).catch(function () { say('Network error.'); });
          });
          tools.appendChild(report);
        }
        art.appendChild(tools);
      }
      return art;
    }
    function composer(onSend, withTitle) {
      var form = el('form', 'df-composer');
      var title = withTitle
        ? field('Title', 'input', { type: 'text', maxlength: '80', required: 'required', placeholder: 'What is this about?' })
        : null;
      var body = field(withTitle ? 'First post' : 'Your reply', 'textarea', {
        rows: '4',
        maxlength: '2000',
        required: 'required',
        placeholder: 'Say it plainly.',
      });
      if (title) form.appendChild(title.wrap);
      form.appendChild(body.wrap);
      var send = el('button', 'df-send');
      send.type = 'submit';
      send.textContent = withTitle ? 'Post thread' : 'Reply';
      form.appendChild(send);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        send.disabled = true;
        say('Sending…');
        onSend(title ? title.input.value : null, body.input.value, function (ok, err) {
          send.disabled = false;
          if (ok) {
            if (title) title.input.value = '';
            body.input.value = '';
            say('');
          } else say(err || 'Could not post.');
        });
      });
      return form;
    }
    function failWrite(r) {
      if (r.status === 401) return 'Link X in the lobby to post.';
      return (r.body && r.body.error) || 'Could not post.';
    }
    function renderReplyComposer(id) {
      var old = view.querySelector('.df-reply-wrap');
      if (old) old.remove();
      var wrap = el('div', 'df-reply-wrap');
      if (pendingQuote) {
        var chip = el('div', 'df-quote-chip');
        chip.setAttribute('role', 'status');
        chip.appendChild(el('span', 'df-quote-chip-label', 'Replying to @' + (pendingQuote.handle || '') + ' — ' + (pendingQuote.text || '')));
        var dismiss = el('button', 'df-chip-x');
        dismiss.type = 'button';
        dismiss.textContent = '×';
        dismiss.setAttribute('aria-label', 'Remove quote');
        dismiss.addEventListener('click', function () {
          pendingQuote = null;
          renderReplyComposer(id);
        });
        chip.appendChild(dismiss);
        wrap.appendChild(chip);
      }
      var form = composer(function (_t, text, done) {
        var payload = { text: text };
        if (pendingQuote) payload.quoteId = pendingQuote.id;
        api('/forum/thread/' + encodeURIComponent(id), { method: 'POST', body: JSON.stringify(payload) })
          .then(function (rr) {
            if (rr.status === 200 && rr.body.ok) {
              pendingQuote = null;
              done(true);
              openThread(id);
            } else done(false, failWrite(rr));
          })
          .catch(function () { done(false, 'Network error.'); });
      }, false);
      wrap.appendChild(form);
      view.appendChild(wrap);
      var ta = form.querySelector('textarea');
      if (ta) ta.focus();
    }
    function renderList(threads, q) {
      view.innerHTML = '';
      var head = el('div', 'df-head');
      head.appendChild(el('h2', 'df-title', 'Forum'));
      head.appendChild(el(
        'p',
        'df-note',
        linked
          ? 'Official room. No Telegram. No Discord. Threads stay; chat below scrolls away.'
          : 'Official room. No Telegram. No Discord. Read freely. Link X in the lobby to post.',
      ));
      view.appendChild(head);
      var search = el('form', 'df-composer df-search');
      var qf = field('Search', 'input', { type: 'search', maxlength: '80', placeholder: 'Title or handle' });
      var go = el('button', 'df-send');
      go.type = 'submit';
      go.textContent = 'Search';
      if (q) qf.input.value = q;
      search.appendChild(qf.wrap);
      search.appendChild(go);
      search.addEventListener('submit', function (e) {
        e.preventDefault();
        load(qf.input.value);
      });
      view.appendChild(search);
      if (linked) {
        view.appendChild(composer(function (title, text, done) {
          api('/forum/threads', { method: 'POST', body: JSON.stringify({ title: title, text: text }) })
            .then(function (r) {
              if (r.status === 200 && r.body.ok) {
                done(true);
                load();
              } else done(false, failWrite(r));
            })
            .catch(function () { done(false, 'Network error.'); });
        }, true));
      }
      var list = el('div', 'df-list');
      if (!threads.length) {
        list.appendChild(el('p', 'df-empty', q ? 'Nothing matches that search.' : 'No threads yet. Start the first one.'));
      }
      for (var i = 0; i < threads.length; i++) list.appendChild(threadRow(threads[i]));
      view.appendChild(list);
    }
    function openThread(id) {
      say('Loading…');
      pendingQuote = null;
      writeThreadQuery(id);
      api('/forum/thread/' + encodeURIComponent(id)).then(function (r) {
        if (r.status !== 200 || !r.body.ok) {
          say((r.body && r.body.error) || 'Thread not found.');
          writeThreadQuery('');
          load(lastQuery);
          return;
        }
        say('');
        view.innerHTML = '';
        var bar = el('div', 'df-tools');
        var back = el('button', 'df-back');
        back.type = 'button';
        back.textContent = '← All threads';
        back.addEventListener('click', function () {
          writeThreadQuery('');
          load(lastQuery);
        });
        bar.appendChild(back);
        bar.appendChild(copyLink(id));
        view.appendChild(bar);
        view.appendChild(el('h2', 'df-title', r.body.thread.title));
        var posts = el('div', 'df-posts');
        var rows = r.body.posts || [];
        for (var i = 0; i < rows.length; i++) posts.appendChild(postRow(rows[i], id));
        view.appendChild(posts);
        if (r.body.thread && r.body.thread.locked) {
          view.appendChild(el('p', 'df-empty', 'This thread is locked.'));
        } else if (linked) {
          renderReplyComposer(id);
        }
      }).catch(function () { say('Could not load that thread.'); });
    }
    function load(q) {
      lastQuery = q || '';
      say('Loading…');
      api('/simp/me')
        .then(function (me) {
          meHandle = (me.body && me.body.x && me.body.x.handle) || '';
          linked = !!(me.body && (me.body.linked || meHandle));
        })
        .catch(function () { linked = false; meHandle = ''; })
        .then(function () {
          var qs = q ? ('?q=' + encodeURIComponent(q)) : '';
          return api('/forum/threads' + qs);
        })
        .then(function (r) {
          say('');
          renderList(r && r.body && r.body.threads ? r.body.threads : [], lastQuery);
          var want = readThreadQuery();
          if (want) openThread(want);
        })
        .catch(function () { say('Forum is unreachable right now. Chat still works.'); });
    }
    load();
    return { reload: load, open: openThread };
  }

  function mount(root, opts) {
    opts = opts || {};
    if (!root) return null;
    var wsUrl = opts.url || root.getAttribute('data-lobby-url') || DEFAULT_WS;
    var nickKey = 'dasha-lobby-nick';

    root.innerHTML = '';
    root.classList.add('dasha-lobby');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Public lobby chat');

    var pin = el('div', 'lobby-pin');
    var pinStrong = el('strong', null, 'Lobby');
    pin.appendChild(pinStrong);
    pin.appendChild(document.createTextNode(' · public · not Discord · '));
    var mintSpan = el('span', 'lobby-mint', MINT.slice(0, 6) + '…' + MINT.slice(-4));
    mintSpan.title = MINT;
    pin.appendChild(mintSpan);
    pin.appendChild(document.createTextNode(' · '));
    var verifyA = el('a', null, 'verify mint');
    // #token only exists on Home; /lobby and embeds need an absolute trust surface.
    try {
      var onHome =
        typeof location !== 'undefined' &&
        /getdasha\.com$/i.test(location.hostname) &&
        (location.pathname === '/' || location.pathname === '');
      verifyA.href = onHome ? '#token' : 'https://www.getdasha.com/#token';
    } catch (e) {
      verifyA.href = 'https://www.getdasha.com/#token';
    }
    verifyA.setAttribute('aria-label', 'Verify $dasha mint on getdasha');
    pin.appendChild(verifyA);

    var pinBody = el('p', 'lobby-pin-body', '');
    pinBody.hidden = true;

    var xBar = el('div', 'lobby-xbar');
    var xStatus = el('span', 'lobby-x-status', 'Optional: link X for perks');
    var xBtn = el('button', 'lobby-x-btn', 'Link X');
    xBtn.type = 'button';
    var xUnlink = el('button', 'lobby-x-unlink', 'Unlink');
    xUnlink.type = 'button';
    xUnlink.hidden = true;
    xBar.appendChild(xStatus);
    xBar.appendChild(xBtn);
    xBar.appendChild(xUnlink);

    var presenceStrip = el('p', 'lobby-presence', '—');
    presenceStrip.setAttribute('aria-live', 'polite');

    var tools = el('div', 'lobby-tools');
    var expandBtn = el('button', 'lobby-expand-btn', 'Expand chat');
    expandBtn.type = 'button';
    expandBtn.setAttribute('aria-expanded', 'false');
    expandBtn.setAttribute('aria-controls', root.id || 'dasha-lobby');
    tools.appendChild(expandBtn);

    var status = el('p', 'lobby-status', 'Connecting…');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    var log = el('div', 'lobby-log');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-relevant', 'additions');
    // Empty state belongs to the room. The composer directly below is the action.
    if (!document.getElementById('dasha-lobby-empty-style')) {
      var emptyStyle = document.createElement('style');
      emptyStyle.id = 'dasha-lobby-empty-style';
      emptyStyle.textContent =
        '.lobby-empty{display:grid;gap:10px;justify-items:center;margin:auto;padding:28px 14px;text-align:center;color:var(--muted,#e6dcc4)}' +
        '.lobby-empty-title{margin:0;color:var(--paper,#f4eddb);font-size:18px;font-weight:950;letter-spacing:.02em}';
      document.head.appendChild(emptyStyle);
    }
    function makeEmptyState() {
      var wrap = el('div', 'lobby-empty');
      wrap.appendChild(el('p', 'lobby-empty-title', 'Be first.'));
      return wrap;
    }
    log.appendChild(makeEmptyState());

    var form = el('form', 'lobby-form');
    form.setAttribute('autocomplete', 'off');

    var nickWrap = el('div', 'lobby-field');
    var nickIn = el('input', 'lobby-nick');
    nickIn.type = 'text';
    nickIn.name = 'nick';
    nickIn.maxLength = MAX_NICK;
    nickIn.placeholder = 'nick';
    nickIn.required = true;
    nickIn.setAttribute('aria-label', 'Nickname');
    try {
      nickIn.value = localStorage.getItem(nickKey) || '';
    } catch (e) {}
    var nickCount = el('span', 'lobby-count', '');
    nickWrap.appendChild(nickIn);
    nickWrap.appendChild(nickCount);

    var textWrap = el('div', 'lobby-field lobby-field-text');
    var textIn = el('input', 'lobby-text');
    textIn.type = 'text';
    textIn.name = 'text';
    textIn.maxLength = MAX_TEXT;
    textIn.placeholder = 'Message';
    textIn.setAttribute('aria-label', 'Message');
    var textCount = el('span', 'lobby-count', '');
    textWrap.appendChild(textIn);
    textWrap.appendChild(textCount);

    var send = el('button', 'lobby-send', 'Send');
    send.type = 'submit';

    form.appendChild(nickWrap);
    form.appendChild(textWrap);
    form.appendChild(send);

    // Pin / X / presence were built but never attached (chat looked "empty/broken").
    pin.appendChild(pinBody);
    root.appendChild(pin);
    root.appendChild(xBar);
    root.appendChild(presenceStrip);
    root.appendChild(tools);
    root.appendChild(status);
    root.appendChild(log);
    root.appendChild(form);

    var ws = null;
    var ready = false;
    var helloSent = false;
    var closed = false;
    var retry = 0;
    var retryTimer = null;
    var coolTimer = null;
    var coolUntil = 0;
    var linked = false;
    var linkedHandle = null;
    var linkedAvatar = null;
    var xConfigured = false;
    var maxTextNow = MAX_TEXT;
    var lastActivity = Date.now();
    var idleTimer = null;
    var IDLE_MS = 20 * 60 * 1000;
    var pendingText = null;
    var expanded = false;

    function paintPresence(data) {
      if (!data) {
        presenceStrip.textContent = '—';
        return;
      }
      var bits = [(data.count || 0) + ' here'];
      if (typeof data.linked === 'number') bits.push(data.linked + ' linked');
      if (data.slow) bits.push('slow');
      if (data.shield) bits.push('X-only');
      presenceStrip.textContent = bits.join(' · ');
    }

    function clearEmpty() {
      var e = log.querySelector('.lobby-empty');
      if (e) e.remove();
    }

    function ensureEmpty() {
      if (!log.querySelector('.lobby-line') && !log.querySelector('.lobby-empty')) {
        log.appendChild(makeEmptyState());
      }
    }

    function bumpActivity() {
      lastActivity = Date.now();
    }

    function armIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        if (Date.now() - lastActivity < IDLE_MS - 1000) {
          armIdle();
          return;
        }
        setStatus('Idle — reconnecting…', 'warn');
        try {
          if (ws) ws.close(4003, 'idle');
        } catch (e) {}
      }, IDLE_MS);
    }

    function httpBase() {
      try {
        var u = new URL(wsUrl.replace(/^ws/i, 'http'));
        u.pathname = '';
        u.search = '';
        u.hash = '';
        return u.origin;
      } catch (e) {
        return 'https://lobby.getdasha.com';
      }
    }

    function applyLinkedUi() {
      maxTextNow = linked ? MAX_TEXT_LINKED : MAX_TEXT;
      textIn.maxLength = maxTextNow;
      if (linked && linkedHandle) {
        nickIn.value = '@' + linkedHandle;
        nickIn.readOnly = true;
        nickIn.title = 'Your X handle (linked)';
        xStatus.textContent = '';
        xStatus.appendChild(document.createTextNode('X · '));
        if (linkedAvatar && avatarOk(linkedAvatar)) {
          var identityAvatar = document.createElement('img');
          identityAvatar.src = linkedAvatar;
          identityAvatar.alt = '';
          identityAvatar.width = identityAvatar.height = 22;
          identityAvatar.style.cssText = 'width:22px;height:22px;border-radius:50%;vertical-align:middle;margin-right:5px';
          xStatus.appendChild(identityAvatar);
        }
        xStatus.appendChild(document.createTextNode('@' + linkedHandle + ' · '));
        var boardA = document.createElement('a');
        boardA.href = 'https://www.getdasha.com/#simp';
        boardA.textContent = 'Simp Board';
        boardA.style.cssText = 'color:#7ec8ff;font-weight:800;text-underline-offset:3px';
        xStatus.appendChild(boardA);
        xStatus.appendChild(document.createTextNode(' · longer chat'));
        xBtn.hidden = true;
        xUnlink.hidden = false;
      } else {
        nickIn.readOnly = false;
        nickIn.title = '';
        if (nickIn.value.charAt(0) === '@') {
          try {
            nickIn.value = localStorage.getItem(nickKey) || '';
          } catch (e) {
            nickIn.value = '';
          }
        }
        xStatus.textContent = xConfigured
          ? 'Optional: link X for @handle, longer msgs, faster rate, priority seats'
          : 'Optional X link (server not configured yet) — chat still works';
        xBtn.hidden = !xConfigured;
        xBtn.disabled = !xConfigured;
        xUnlink.hidden = true;
      }
      paintCounts();
    }

    function refreshXStatus() {
      return fetch(httpBase() + '/oauth/x/status', { method: 'GET', credentials: 'include', mode: 'cors', cache: 'no-store' })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          xConfigured = Boolean(data && data.configured);
          if (data && data.linked && data.x && data.x.handle) {
            linked = true;
            linkedHandle = data.x.handle;
            linkedAvatar = data.x.avatar || null;
          } else {
            linked = false;
            linkedHandle = null;
            linkedAvatar = null;
          }
          applyLinkedUi();
          if (linked && ws && ws.readyState === 1) sendHello();
        })
        .catch(function () {
          xConfigured = false;
          applyLinkedUi();
        });
    }

    function setStatus(t, kind) {
      status.textContent = t;
      status.dataset.kind = kind || '';
    }

    function paintCounts() {
      nickCount.textContent = (nickIn.value || '').length + '/' + (linked ? 16 : MAX_NICK);
      textCount.textContent = (textIn.value || '').length + '/' + maxTextNow;
    }

    function setCooling(ms) {
      coolUntil = Date.now() + Math.max(0, ms || 0);
      send.disabled = true;
      clearTimeout(coolTimer);
      function tick() {
        var left = coolUntil - Date.now();
        if (left <= 0) {
          send.disabled = false;
          send.textContent = 'Send';
          flushPending();
          return;
        }
        send.textContent = 'Wait ' + Math.ceil(left / 1000) + 's';
        coolTimer = setTimeout(tick, 200);
      }
      tick();
    }

    function flushPending() {
      if (!pendingText || !ws || ws.readyState !== 1 || !ready || !helloSent) return;
      if (Date.now() < coolUntil) return;
      var text = pendingText;
      pendingText = null;
      ws.send(JSON.stringify({ type: 'chat', text: text }));
      setStatus('Sent', 'ok');
    }

    function setPinText(text) {
      if (!text) {
        pinBody.hidden = true;
        pinBody.textContent = '';
        return;
      }
      pinBody.hidden = false;
      pinBody.textContent = text;
    }

    function setExpanded(on) {
      expanded = !!on;
      root.classList.toggle('lobby-expanded', expanded);
      expandBtn.textContent = expanded ? 'Close expand' : 'Expand chat';
      expandBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      try {
        document.documentElement.classList.toggle('lobby-expanded-open', expanded);
        document.body.classList.toggle('lobby-expanded-open', expanded);
      } catch (e) {}
      if (expanded) {
        try {
          log.focus();
        } catch (e) {}
      }
    }

    function addLine(kind, head, body, ts, extra) {
      clearEmpty();
      var row = el('div', 'lobby-line lobby-' + kind + (extra && extra.linked ? ' lobby-linked' : ''));
      var meta = el('span', 'lobby-meta');
      if (extra && extra.avatar && avatarOk(extra.avatar)) {
        var img = document.createElement('img');
        img.className = 'lobby-avatar';
        img.src = extra.avatar;
        img.alt = '';
        img.width = 16;
        img.height = 16;
        img.referrerPolicy = 'no-referrer';
        img.loading = 'lazy';
        img.decoding = 'async';
        meta.appendChild(img);
      }
      var metaText = head || '';
      if (extra && extra.linked) metaText = (metaText || '') + ' · X';
      if (ts) metaText += (metaText ? ' · ' : '') + timeLabel(ts);
      if (extra && extra.handle) {
        var ha = document.createElement('a');
        ha.className = 'lobby-handle';
        ha.href = 'https://x.com/' + extra.handle;
        ha.target = '_blank';
        ha.rel = 'noopener noreferrer';
        ha.textContent = metaText || '@' + extra.handle;
        meta.appendChild(ha);
      } else {
        meta.appendChild(document.createTextNode(metaText));
      }
      row.appendChild(meta);
      var msg = el('span', 'lobby-body');
      if (kind === 'chat') fillBody(msg, body);
      else msg.textContent = body || '';
      row.appendChild(msg);
      log.appendChild(row);
      while (log.querySelectorAll('.lobby-line').length > 80) {
        var first = log.querySelector('.lobby-line');
        if (first) first.remove();
        else break;
      }
      log.scrollTop = log.scrollHeight;
    }

    function handle(data) {
      if (!data || !data.type) return;
      if (data.type === 'ready') {
        bumpActivity();
        if (data.x && data.x.handle) {
          linked = true;
          linkedHandle = data.x.handle;
          linkedAvatar = data.x.avatar || null;
          applyLinkedUi();
        }
        if (typeof data.remaining === 'number' && typeof data.max === 'number') {
          presenceStrip.textContent = data.remaining + ' seats open · max ' + data.max;
        }
        setStatus(
          linked ? 'Connected as @' + linkedHandle + ' — send to join' : 'Connected — enter a nick to join',
          'ok',
        );
        if (data.pin && data.pin.text) setPinText(data.pin.text);
        ensureEmpty();
        if ((nickIn.value || '').trim().length >= 2) sendHello();
        return;
      }
      if (data.type === 'pin') {
        if (data.pin && data.pin.text) setPinText(data.pin.text);
        return;
      }
      if (data.type === 'history_clear') {
        log.innerHTML = '';
        ensureEmpty();
        return;
      }
      if (data.type === 'hello_ok') {
        ready = true;
        helloSent = true;
        bumpActivity();
        if (data.x && data.x.handle) {
          linked = true;
          linkedHandle = data.x.handle;
          linkedAvatar = data.x.avatar || null;
          applyLinkedUi();
        }
        if (data.presence) paintPresence(data.presence);
        var count =
          (data.presence && data.presence.count) ||
          (data.count != null ? data.count : null);
        var coolLeft =
          typeof data.joinCooldownRemainingMs === 'number'
            ? data.joinCooldownRemainingMs
            : typeof data.joinCooldownMs === 'number'
              ? data.joinCooldownMs
              : 0;
        if (coolLeft > 0) {
          setCooling(coolLeft);
          setStatus(
            (data.you ? 'Joined as ' + data.you : 'Joined') +
              ' · chat unlocks in ' +
              Math.ceil(coolLeft / 1000) +
              's' +
              (pendingText ? ' · message queued' : ''),
            'warn',
          );
        } else {
          setStatus(
            (data.you ? 'Joined as ' + data.you : 'Connected') +
              (linked ? ' · X perks' : '') +
              (count != null ? ' · ' + count + ' here' : ''),
            'ok',
          );
          flushPending();
        }
        if (Array.isArray(data.history)) {
          log.innerHTML = '';
          if (data.pin && data.pin.text) addLine('pin', 'PIN', data.pin.text, null);
          if (data.pin && data.pin.text) setPinText(data.pin.text);
          data.history.forEach(function (m) {
            if (m.type === 'chat' || m.nick)
              addLine('chat', m.nick, m.text, m.ts, {
                linked: Boolean(m.linked),
                handle: m.handle || null,
                avatar: m.avatar || null,
              });
          });
          ensureEmpty();
        }
        return;
      }
      if (data.type === 'chat') {
        bumpActivity();
        addLine('chat', data.nick, data.text, data.ts, {
          linked: Boolean(data.linked),
          handle: data.handle || null,
          avatar: data.avatar || null,
        });
        return;
      }
      if (data.type === 'system') {
        addLine('sys', '·', data.text, data.ts);
        return;
      }
      if (data.type === 'presence') {
        paintPresence(data);
        if (ready) {
          var bits = ['Live · ' + (data.count || 0) + ' here'];
          if (typeof data.linked === 'number') bits.push(data.linked + ' linked');
          if (data.slow) bits.push('slow mode');
          if (data.shield) bits.push('X-only');
          if (linked) bits.push('X perks');
          setStatus(bits.join(' · '), data.shield || data.slow ? 'warn' : 'ok');
        }
        return;
      }
      if (data.type === 'error') {
        var err = data.error || 'error';
        setStatus(err, 'bad');
        if (data.waitMs) setCooling(data.waitMs);
        return;
      }
      if (data.type === 'pong') return;
    }

    function sendHello() {
      if (!ws || ws.readyState !== 1) return;
      var nick = (nickIn.value || '').trim();
      if (nick.length < 2) return;
      try {
        localStorage.setItem(nickKey, nick);
      } catch (e) {}
      ws.send(JSON.stringify({ type: 'hello', nick: nick }));
      helloSent = true;
      ready = false;
    }

    function capacityUrl() {
      try {
        var u = new URL(wsUrl.replace(/^ws/i, 'http'));
        u.pathname = '/capacity';
        u.search = '';
        u.hash = '';
        return u.href;
      } catch (e) {
        return null;
      }
    }

    function scheduleRetry(ms, label) {
      clearTimeout(retryTimer);
      var wait = Math.max(1000, ms || 3000);
      setStatus((label || 'Reconnecting') + ' in ' + Math.round(wait / 1000) + 's…', 'warn');
      retryTimer = setTimeout(connect, wait);
    }

    function connect() {
      if (closed) return;
      if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
      setStatus('Connecting…');
      ready = false;
      helloSent = false;

      var cap = capacityUrl();
      var startWs = function () {
        try {
          ws = new WebSocket(wsUrl);
        } catch (e) {
          setStatus('Lobby offline (bad URL)', 'bad');
          return;
        }
        ws.onopen = function () {
          retry = 0;
          bumpActivity();
          armIdle();
          setStatus('Connected — enter a nick to join', 'ok');
        };
        ws.onmessage = function (ev) {
          try {
            bumpActivity();
            armIdle();
            handle(JSON.parse(ev.data));
          } catch (e) {}
        };
        ws.onclose = function (ev) {
          ready = false;
          helloSent = false;
          clearTimeout(idleTimer);
          if (closed) return;
          // 4001 = server closed us for full room
          if (ev && (ev.code === 4001 || /lobby full|lobby busy/i.test(ev.reason || ''))) {
            var why = ev.reason || 'lobby full';
            scheduleRetry(
              FULL_RETRY_MS,
              why + ' · max ' + MAX_SOCKETS + (linked ? '' : ' · link X for reserved seats') + ' · retrying',
            );
            return;
          }
          if (ev && ev.code === 4003) {
            scheduleRetry(3000, 'Idle timeout — reconnecting');
            return;
          }
          if (ev && ev.code === 4002) {
            scheduleRetry(FULL_RETRY_MS, 'Network join limit — retrying');
            return;
          }
          var wait = Math.min(15000, 800 * Math.pow(1.6, retry++));
          scheduleRetry(wait, 'Reconnecting');
        };
        ws.onerror = function () {
          try {
            ws.close();
          } catch (e) {}
        };
      };

      if (!cap) {
        startWs();
        return;
      }
      // Preflight so we can show "full" without a reconnect storm.
      fetch(cap, { method: 'GET', mode: 'cors', cache: 'no-store' })
        .then(function (r) {
          return r.text().then(function (raw) {
            var data = null;
            if (raw) {
              try {
                data = JSON.parse(raw);
              } catch (e) {
                data = null;
              }
            }
            return { status: r.status, data: data };
          });
        })
        .then(function (res) {
          if (closed) return;
          if (res.data && res.data.full) {
            scheduleRetry(FULL_RETRY_MS, 'Lobby full (max ' + (res.data.max || MAX_SOCKETS) + '). Retrying');
            return;
          }
          startWs();
        })
        .catch(function () {
          if (!closed) startWs();
        });
    }

    xBtn.addEventListener('click', function () {
      if (!xConfigured) {
        setStatus('X link not configured on server yet', 'warn');
        return;
      }
      var w = window.open(httpBase() + '/oauth/x/start', 'dasha_x', 'width=520,height=700');
      if (!w) setStatus('Allow popups to link X', 'warn');
    });
    xUnlink.addEventListener('click', function () {
      fetch(httpBase() + '/oauth/x/logout', { method: 'POST', credentials: 'include', mode: 'cors' })
        .then(function () {
          linked = false;
          linkedHandle = null;
          linkedAvatar = null;
          applyLinkedUi();
          setStatus('X unlinked — pick a nick', 'ok');
          if (ws && ws.readyState === 1) {
            ready = false;
            helloSent = false;
          }
        })
        .catch(function () {
          setStatus('Could not unlink', 'bad');
        });
    });
    function onXLinkedMessage(ev) {
      if (!ev || !ev.data || ev.data.type !== 'dasha-x-linked') return;
      // OAuth popup lives on lobby host only.
      if (ev.origin !== 'https://lobby.getdasha.com' && ev.origin !== httpBase()) return;
      refreshXStatus();
      setStatus('X linked — reconnecting with perks…', 'ok');
      try {
        if (ws) ws.close();
      } catch (e) {}
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connect, 400);
    }
    window.addEventListener('message', onXLinkedMessage);

    expandBtn.addEventListener('click', function () {
      setExpanded(!expanded);
    });
    function onEsc(ev) {
      if (ev.key === 'Escape' && expanded) {
        setExpanded(false);
      }
    }
    document.addEventListener('keydown', onEsc);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      bumpActivity();
      armIdle();
      var nick = (nickIn.value || '').trim();
      var text = (textIn.value || '').trim();
      if (nick.length < 2) {
        setStatus('Pick a nick (2–18 chars)', 'bad');
        nickIn.focus();
        return;
      }
      if (!ws || ws.readyState !== 1) {
        setStatus('Not connected', 'bad');
        return;
      }
      if (!helloSent || !ready) {
        if (text) {
          pendingText = text;
          textIn.value = '';
          paintCounts();
        }
        sendHello();
        setStatus(text ? 'Joining… message queued' : 'Joining…', 'warn');
        return;
      }
      if (Date.now() < coolUntil) {
        if (text) {
          pendingText = text;
          textIn.value = '';
          paintCounts();
          setStatus('Queued — unlocks in ' + Math.ceil((coolUntil - Date.now()) / 1000) + 's', 'warn');
        } else {
          setStatus('slow down', 'warn');
        }
        return;
      }
      if (!text) return;
      ws.send(JSON.stringify({ type: 'chat', text: text }));
      textIn.value = '';
      paintCounts();
      textIn.focus();
    });

    nickIn.addEventListener('change', function () {
      if (ws && ws.readyState === 1) sendHello();
    });
    nickIn.addEventListener('input', paintCounts);
    textIn.addEventListener('input', paintCounts);
    paintCounts();
    applyLinkedUi();
    refreshXStatus();
    connect();

    return {
      destroy: function () {
        closed = true;
        setExpanded(false);
        clearTimeout(retryTimer);
        clearTimeout(coolTimer);
        clearTimeout(idleTimer);
        window.removeEventListener('message', onXLinkedMessage);
        document.removeEventListener('keydown', onEsc);
        try {
          if (ws) ws.close();
        } catch (e) {}
        root.innerHTML = '';
      },
      expand: function () {
        setExpanded(true);
      },
      collapse: function () {
        setExpanded(false);
      },
      wsUrl: wsUrl,
    };
  }

  var api = { mount: mount, mountForum: mountForum, mint: MINT, defaultUrl: DEFAULT_WS };
  global.DashaLobby = api;

  /** Drop non-product personal publisher JSON-LD if the host page still injects it. */
  function stripPersonalBrand() {
    try {
      if (typeof document === 'undefined') return;
      var re = new RegExp(['pot', 'ter', 'lab'].join('') + '|John\\s*Potter', 'i');
      document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
        var t = s.textContent || '';
        if (re.test(t)) s.remove();
      });
    } catch (e) {}
  }

  function auto() {
    stripPersonalBrand();
    var node = document.getElementById('dasha-lobby');
    if (node && !node.dataset.mounted) {
      node.dataset.mounted = '1';
      mount(node);
    }
    var forum = document.getElementById('dasha-forum');
    if (forum && !forum.dataset.mounted) {
      forum.dataset.mounted = '1';
      mountForum(forum);
    }
  }
  if (typeof document !== 'undefined') {
    stripPersonalBrand();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
    else auto();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
