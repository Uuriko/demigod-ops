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

  function mount(root, opts) {
    opts = opts || {};
    if (!root) return null;
    var wsUrl = opts.url || root.getAttribute('data-lobby-url') || DEFAULT_WS;
    var nickKey = 'dasha-lobby-nick';

    root.innerHTML = '';
    root.classList.add('dasha-lobby');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Chat');

    var xBar = el('div', 'lobby-xbar');
    var xStatus = el('span', 'lobby-x-status', '');
    var xBtn = el('button', 'lobby-x-btn', 'Link X');
    xBtn.type = 'button';
    var xUnlink = el('button', 'lobby-x-unlink', 'Unlink');
    xUnlink.type = 'button';
    xUnlink.hidden = true;
    xBar.appendChild(xStatus);
    xBar.appendChild(xBtn);
    xBar.appendChild(xUnlink);

    var status = el('p', 'lobby-status', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    var log = el('div', 'lobby-log');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-relevant', 'additions');

    var form = el('form', 'lobby-form');
    form.setAttribute('autocomplete', 'off');

    var nickWrap = el('div', 'lobby-field');
    var nickIn = el('input', 'lobby-nick');
    nickIn.type = 'text';
    nickIn.name = 'nick';
    nickIn.maxLength = MAX_NICK;
    nickIn.required = true;
    nickIn.setAttribute('aria-label', 'Nickname');
    try {
      nickIn.value = localStorage.getItem(nickKey) || '';
    } catch (e) {}
    nickWrap.appendChild(nickIn);

    var textWrap = el('div', 'lobby-field lobby-field-text');
    var textIn = el('input', 'lobby-text');
    textIn.type = 'text';
    textIn.name = 'text';
    textIn.maxLength = MAX_TEXT;
    textIn.setAttribute('aria-label', 'Message');
    textWrap.appendChild(textIn);

    var send = el('button', 'lobby-send', 'Send');
    send.type = 'submit';

    form.appendChild(nickWrap);
    form.appendChild(textWrap);
    form.appendChild(send);

    root.appendChild(xBar);
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
        xStatus.textContent = '';
        if (linkedAvatar && avatarOk(linkedAvatar)) {
          var identityAvatar = document.createElement('img');
          identityAvatar.className = 'lobby-avatar';
          identityAvatar.src = linkedAvatar;
          identityAvatar.alt = '';
          identityAvatar.width = identityAvatar.height = 16;
          xStatus.appendChild(identityAvatar);
        }
        xStatus.appendChild(document.createTextNode('@' + linkedHandle));
        xBtn.hidden = true;
        xUnlink.hidden = false;
      } else {
        nickIn.readOnly = false;
        if (nickIn.value.charAt(0) === '@') {
          try {
            nickIn.value = localStorage.getItem(nickKey) || '';
          } catch (e) {
            nickIn.value = '';
          }
        }
        xStatus.textContent = '';
        xBtn.hidden = !xConfigured;
        xBtn.disabled = !xConfigured;
        xUnlink.hidden = true;
      }
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

    function addLine(kind, head, body, ts, extra) {
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
      if (kind === 'chat' || kind === 'sys') fillBody(msg, body);
      else msg.textContent = body || '';
      if (extra && extra.join && linkOk(extra.join)) {
        msg.appendChild(document.createTextNode(' '));
        var join = document.createElement('a');
        join.className = 'lobby-join';
        join.href = extra.join;
        join.textContent = 'Join';
        join.target = '_blank';
        join.rel = 'noopener noreferrer';
        msg.appendChild(join);
      }
      if (extra && extra.lookingId) row.dataset.looking = extra.lookingId;
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
        setStatus('');
        if ((nickIn.value || '').trim().length >= 2) sendHello();
        return;
      }
      if (data.type === 'pin') return;
      if (data.type === 'history_clear') {
        log.innerHTML = '';
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
        var coolLeft =
          typeof data.joinCooldownRemainingMs === 'number'
            ? data.joinCooldownRemainingMs
            : typeof data.joinCooldownMs === 'number'
              ? data.joinCooldownMs
              : 0;
        if (coolLeft > 0) {
          setCooling(coolLeft);
        } else {
          setStatus('');
          flushPending();
        }
        if (Array.isArray(data.history)) {
          log.innerHTML = '';
          data.history.forEach(function (m) {
            if (m.type === 'chat' || m.nick)
              addLine('chat', m.nick, m.text, m.ts, {
                linked: Boolean(m.linked),
                handle: m.handle || null,
                avatar: m.avatar || null,
              });
          });
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
        if (data.lookingFor && data.lookingFor.expired && data.lookingFor.id) {
          var gone = log.querySelector('[data-looking="' + data.lookingFor.id + '"]');
          if (gone) gone.remove();
          return;
        }
        addLine('sys', '·', data.text, data.ts, {
          lookingId: data.lookingFor && data.lookingFor.id,
          join: data.lookingFor && data.lookingFor.url,
        });
        return;
      }
      if (data.type === 'presence') return;
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
          setStatus('offline', 'bad');
          return;
        }
        ws.onopen = function () {
          retry = 0;
          bumpActivity();
          armIdle();
          setStatus('');
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
            scheduleRetry(FULL_RETRY_MS, 'full');
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
            scheduleRetry(FULL_RETRY_MS, 'full');
            return;
          }
          startWs();
        })
        .catch(function () {
          if (!closed) startWs();
        });
    }

    xBtn.addEventListener('click', function () {
      if (!xConfigured) return;
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
          setStatus('');
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
      setStatus('');
      try {
        if (ws) ws.close();
      } catch (e) {}
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connect, 400);
    }
    window.addEventListener('message', onXLinkedMessage);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      bumpActivity();
      armIdle();
      var nick = (nickIn.value || '').trim();
      var text = (textIn.value || '').trim();
      if (nick.length < 2) {
        setStatus('nick', 'bad');
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
        }
        sendHello();
        setStatus('');
        return;
      }
      if (Date.now() < coolUntil) {
        if (text) {
          pendingText = text;
          textIn.value = '';
          setStatus('');
        } else {
          setStatus('slow down', 'warn');
        }
        return;
      }
      if (!text) return;
      ws.send(JSON.stringify({ type: 'chat', text: text }));
      textIn.value = '';
      textIn.focus();
    });

    nickIn.addEventListener('change', function () {
      if (ws && ws.readyState === 1) sendHello();
    });
    applyLinkedUi();
    refreshXStatus();
    connect();

    return {
      destroy: function () {
        closed = true;
        clearTimeout(retryTimer);
        clearTimeout(coolTimer);
        clearTimeout(idleTimer);
        window.removeEventListener('message', onXLinkedMessage);
        try {
          if (ws) ws.close();
        } catch (e) {}
        root.innerHTML = '';
      },
      wsUrl: wsUrl,
    };
  }

  function mountForum(root, opts) {
    opts = opts || {};
    if (!root) return null;
    var apiBase = opts.api || root.getAttribute('data-forum-api') || 'https://lobby.getdasha.com';
    var nickKey = 'dasha-lobby-nick';
    root.innerHTML = '';
    root.classList.add('dasha-forum');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Forum');

    var back = el('button', 'forum-back', 'Back');
    back.type = 'button';
    back.hidden = true;
    var status = el('p', 'forum-status', '');
    status.setAttribute('role', 'status');
    var list = el('div', 'forum-list');
    var threadBox = el('div', 'forum-thread');
    threadBox.hidden = true;
    var form = el('form', 'forum-form');
    var textIn = el('input', 'forum-text');
    textIn.type = 'text';
    textIn.maxLength = MAX_TEXT_LINKED;
    textIn.setAttribute('aria-label', 'Title');
    var send = el('button', 'forum-send', 'Post');
    send.type = 'submit';
    form.appendChild(textIn);
    form.appendChild(send);
    root.appendChild(back);
    root.appendChild(status);
    root.appendChild(list);
    root.appendChild(threadBox);
    root.appendChild(form);

    var openId = '';
    var linkedHandle = null;
    var coolUntil = 0;
    var coolTimer = null;

    function who() {
      if (linkedHandle) return '@' + linkedHandle;
      var chatNick = document.querySelector('#dasha-lobby input.lobby-nick');
      if (chatNick && chatNick.value.trim()) return chatNick.value.trim();
      try {
        return localStorage.getItem(nickKey) || '';
      } catch (e) {
        return '';
      }
    }

    function setStatus(t, kind) {
      status.textContent = t || '';
      status.dataset.kind = kind || '';
    }

    function setCooling(ms) {
      coolUntil = Date.now() + Math.max(0, ms || 0);
      send.disabled = true;
      clearTimeout(coolTimer);
      function tick() {
        var left = coolUntil - Date.now();
        if (left <= 0) {
          send.disabled = false;
          send.textContent = 'Post';
          return;
        }
        send.textContent = Math.ceil(left / 1000) + 's';
        coolTimer = setTimeout(tick, 200);
      }
      tick();
    }

    function topicTitle(text) {
      return String(text || '').split(/\r?\n/, 1)[0];
    }

    function postEl(item, cls) {
      var row = el('div', cls);
      var whoLabel = item.handle ? '@' + item.handle : item.nick || '';
      var meta = el('span', 'forum-meta', whoLabel + (item.ts ? (whoLabel ? ' · ' : '') + timeLabel(item.ts) : ''));
      var body = el('span', 'forum-body');
      fillBody(body, item.text);
      row.appendChild(body);
      row.appendChild(meta);
      return row;
    }

    function listRow(item) {
      var row = el('button', 'forum-row');
      row.type = 'button';
      row.appendChild(el('span', 'forum-body', topicTitle(item.text)));
      row.appendChild(el('span', 'forum-replies', String(item.replies || 0)));
      row.appendChild(el('span', 'forum-when', timeLabel(item.lastTs || item.ts)));
      return row;
    }

    function paintList(threads) {
      list.textContent = '';
      (threads || []).forEach(function (t) {
        var row = listRow(t);
        row.addEventListener('click', function () {
          openThread(t.id);
        });
        list.appendChild(row);
      });
    }

    function paintThread(data) {
      threadBox.textContent = '';
      threadBox.appendChild(postEl(data, 'forum-post'));
      (data.replies || []).forEach(function (r) {
        threadBox.appendChild(postEl(r, 'forum-reply'));
      });
    }

    function showList() {
      openId = '';
      back.hidden = true;
      threadBox.hidden = true;
      list.hidden = false;
      textIn.setAttribute('aria-label', 'Title');
    }

    function showThread() {
      back.hidden = false;
      list.hidden = true;
      threadBox.hidden = false;
      textIn.setAttribute('aria-label', 'Reply');
    }

    function loadList() {
      return fetch(apiBase + '/forum/threads', { method: 'GET', mode: 'cors', cache: 'no-store' })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          paintList(data.threads || []);
        })
        .catch(function () {
          setStatus('offline', 'bad');
        });
    }

    function openThread(id) {
      return fetch(apiBase + '/forum/threads/' + encodeURIComponent(id), { method: 'GET', mode: 'cors', cache: 'no-store' })
        .then(function (r) {
          return r.json().then(function (data) {
            return { ok: r.ok, data: data };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            setStatus(res.data.error || 'not found', 'bad');
            return;
          }
          openId = id;
          paintThread(res.data);
          showThread();
          setStatus('');
        })
        .catch(function () {
          setStatus('offline', 'bad');
        });
    }

    function refreshX() {
      return fetch(apiBase + '/oauth/x/status', { method: 'GET', credentials: 'include', mode: 'cors', cache: 'no-store' })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          linkedHandle = data && data.linked && data.x && data.x.handle ? data.x.handle : null;
        })
        .catch(function () {
          linkedHandle = null;
        });
    }

    back.addEventListener('click', function () {
      showList();
      loadList();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (textIn.value || '').trim();
      if (!text || Date.now() < coolUntil) return;
      var path = openId ? '/forum/threads/' + encodeURIComponent(openId) : '/forum/threads';
      fetch(apiBase + path, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, nick: who() }),
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { ok: r.ok, data: data };
          });
        })
        .then(function (res) {
          if (res.data && res.data.waitMs) setCooling(res.data.waitMs);
          if (!res.ok) {
            setStatus(res.data.error || 'error', 'bad');
            return;
          }
          textIn.value = '';
          setStatus('');
          if (openId) paintThread(res.data);
          else openThread(res.data.id);
        })
        .catch(function () {
          setStatus('offline', 'bad');
        });
    });

    showList();
    refreshX();
    loadList();
    return {
      destroy: function () {
        clearTimeout(coolTimer);
        root.innerHTML = '';
      },
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

  function settleEmptyQuiz() {
    var quiz = document.getElementById('dasha-quiz');
    if (!quiz || quiz.querySelector('#dasha-simp-board') || quiz.querySelector('a[href="/simp"]')) return;
    quiz.innerHTML = '<p><a href="/simp">Take Simp</a></p>';
  }

  function mountMintTape(root) {
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = '1';
    var api = root.getAttribute('data-tape-api') || 'https://lobby.getdasha.com/forum/tape';
    fetch(api, { method: 'GET', mode: 'cors', cache: 'no-store' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var ticks = data && data.ticks;
        root.textContent = '';
        if (!ticks || !ticks.length) {
          root.hidden = true;
          return;
        }
        ticks.forEach(function (t) {
          if (!t || (t.kind !== 'buy' && t.kind !== 'sell') || !t.usd) return;
          root.appendChild(el('span', 'mint-tick', t.kind + ' ' + t.usd));
        });
        root.hidden = !root.childNodes.length;
      })
      .catch(function () {
        root.hidden = true;
      });
  }

  function auto() {
    stripPersonalBrand();
    mountMintTape(document.getElementById('dasha-mint-tape'));
    var forum = document.getElementById('dasha-forum');
    if (forum && !forum.dataset.mounted) {
      forum.dataset.mounted = '1';
      mountForum(forum);
    }
    var node = document.getElementById('dasha-lobby');
    if (node && !node.dataset.mounted) {
      node.dataset.mounted = '1';
      mount(node);
    }
    settleEmptyQuiz();
  }
  if (typeof document !== 'undefined') {
    stripPersonalBrand();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
    else auto();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
