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
  var MAX_TEXT_HOLDER = 500;
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

  function withTimeout(p, ms) {
    return Promise.race([
      p,
      new Promise(function (_, rej) {
        setTimeout(function () { rej(new Error('copy-timeout')); }, ms);
      }),
    ]);
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function timeLabel(ts) {
    try {
      var date = new Date(ts);
      return date.toLocaleString([], date.toDateString() === new Date().toDateString()
        ? { hour: '2-digit', minute: '2-digit' }
        : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    /* URLs first, then @handle mentions. Mentions are display-only links to x.com — this is never
       a write/notify path — and the prefix (line start, space or paren) stays plain text. */
    var re = /(https?:\/\/[^\s<>"']+)|(^|[\s(])@([A-Za-z0-9_]{1,15}\b)/gi;
    var last = 0;
    var m;
    while ((m = re.exec(s))) {
      var url = m[1];
      var prefix = m[2];
      var handle = m[3];
      if (m.index > last) node.appendChild(document.createTextNode(s.slice(last, m.index)));
      if (url) {
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
      } else if (handle) {
        if (prefix) node.appendChild(document.createTextNode(prefix));
        var ma = document.createElement('a');
        ma.href = 'https://x.com/' + handle;
        ma.textContent = '@' + handle;
        ma.target = '_blank';
        ma.rel = 'noopener noreferrer';
        node.appendChild(ma);
        last = m.index + m[0].length;
      }
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

  function openXPopup(base) {
    return window.open(base.replace(/\/$/, '') + '/oauth/x/start', 'dasha_x', 'width=520,height=700');
  }

  function holderBadge(context) {
    var badge = el('span', 'lobby-holder-badge', '$dasha holder');
    badge.title = context === 'post' ? 'Holder proof was current when posted' : 'Holder proof current when sent';
    return badge;
  }

  function forumThreadUrl(id) {
    return 'https://www.getdasha.com/lobby?t=' + encodeURIComponent(id);
  }

  function readThreadQuery() {
    try {
      return String(new URLSearchParams(location.search).get('t') || '').trim();
    } catch (e) {
      return '';
    }
  }

  function takeNewThreadHash() {
    try {
      var params = new URLSearchParams(location.hash.slice(1));
      if (params.get('new') !== '1') return null;
      var draft = {
        title: String(params.get('title') || '').slice(0, 80),
        body: String(params.get('body') || '').slice(0, 2000),
      };
      params.delete('new');
      params.delete('title');
      params.delete('body');
      var u = new URL(location.href);
      u.hash = params.toString();
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      return draft;
    } catch (e) {
      return null;
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
    function seenKey() { return 'dasha-forum-seen:' + (meHandle || 'guest'); }
    function seenMap() {
      try { return JSON.parse(localStorage.getItem(seenKey()) || '{}'); } catch (e) { return {}; }
    }
    function markSeen(id, ts) {
      try {
        var seen = seenMap();
        seen[id] = Number(ts) || Date.now();
        localStorage.setItem(seenKey(), JSON.stringify(seen));
      } catch (e) {}
    }
    function draftKey(scope) {
      return 'dasha-forum-draft:' + (meHandle || 'linked') + ':' + encodeURIComponent(String(scope || '').slice(0, 80));
    }
    function readDraft(key) {
      try {
        var value = JSON.parse(sessionStorage.getItem(key) || '{}');
        var quote = value.quote && value.quote.id ? {
          id: String(value.quote.id).slice(0, 48),
          handle: String(value.quote.handle || '').slice(0, 15),
          text: String(value.quote.text || '').slice(0, 140),
        } : null;
        return {
          title: String(value.title || '').slice(0, 80),
          body: String(value.body || '').slice(0, 2000),
          quote: quote,
        };
      } catch (e) { return { title: '', body: '', quote: null }; }
    }
    function saveDraft(key, title, body, quote) {
      try {
        var value = { title: String(title || '').slice(0, 80), body: String(body || '').slice(0, 2000) };
        if (quote && quote.id) value.quote = { id: String(quote.id).slice(0, 48), handle: String(quote.handle || '').slice(0, 15), text: String(quote.text || '').slice(0, 140) };
        if (!value.title && !value.body && !value.quote) sessionStorage.removeItem(key);
        else sessionStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }
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
    function shareLink(id, title) {
      var b = el('button', 'df-back df-copy');
      b.type = 'button';
      b.textContent = 'Share';
      var idleLabel = b.textContent;
      var want = forumThreadUrl(id);
      var card = null;
      var image = 'https://www.getdasha.com/lobby/card/' + encodeURIComponent(id) + '.png';
      if (navigator.share && navigator.canShare && typeof File === 'function') {
        fetch(image, { cache: 'force-cache' }).then(function (r) {
          if (!r.ok) throw new Error('card');
          return r.blob();
        }).then(function (blob) {
          if (blob.type === 'image/png' && blob.size > 0 && blob.size <= 1000000) {
            var name = String(id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'thread';
            card = new File([blob], 'dasha-thread-' + name + '.png', { type: 'image/png' });
          }
        }).catch(function () {});
      }
      function manual() {
        var input = b.parentNode && b.parentNode.querySelector('.df-share-link');
        if (!input && b.parentNode) {
          input = document.createElement('input');
          input.className = 'df-share-link';
          input.type = 'url';
          input.readOnly = true;
          input.value = want;
          input.setAttribute('aria-label', 'Thread link');
          b.parentNode.appendChild(input);
        }
        if (input) { input.focus(); input.select(); }
        done('Select link');
      }
      function copy() {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          manual();
          return Promise.resolve();
        }
        return withTimeout(navigator.clipboard.writeText(want), 800).then(function () {
          done('Copied');
        }).catch(manual);
      }
      function done(text) {
        b.textContent = text;
        setTimeout(function () { b.textContent = idleLabel; }, 1800);
      }
      b.addEventListener('click', function () {
        if (!navigator.share) { copy(); return; }
        b.disabled = true;
        var shared;
        var payload = { title: String(title || 'Dasha thread'), url: want };
        try {
          if (card && navigator.canShare({ files: [card] })) payload.files = [card];
          shared = navigator.share(payload);
        }
        catch (e) { shared = Promise.reject(e); }
        Promise.resolve(shared).then(function () { done('Shared'); }).catch(function (e) {
          if (!e || e.name !== 'AbortError') return copy();
        }).finally(function () { b.disabled = false; });
      });
      return b;
    }
    function forumAvatar(url, cls) {
      var img = el('img', cls || 'df-avatar');
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      if (url && avatarOk(url)) img.src = url;
      return img;
    }
    function forumAuthor(handle, profileUrl) {
      var value = String(handle || '');
      if (!/^[A-Za-z0-9_]{1,15}$/.test(value)) return document.createTextNode('@' + value);
      var canonical = 'https://www.getdasha.com/simp/u/' + value.toLowerCase();
      var internal = String(profileUrl || '') === canonical;
      var link = el('a', 'df-author', '@' + value);
      link.href = internal ? canonical : 'https://x.com/' + value;
      if (!internal) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer nofollow ugc';
      }
      return link;
    }
    function startEdit(art, p, threadId) {
      var old = art.querySelector('.df-editform');
      if (old) old.remove();
      var form = el('form', 'df-editform');
      var ta = document.createElement('textarea');
      ta.rows = 3;
      ta.maxLength = 2000;
      ta.value = p.text || '';
      ta.setAttribute('aria-label', 'Edit post');
      form.appendChild(ta);
      var row = el('div', 'df-tools');
      var save = el('button', 'df-send');
      save.type = 'submit';
      save.textContent = 'Save';
      var cancel = el('button', 'df-back');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', function () { openThread(threadId); });
      row.appendChild(save);
      row.appendChild(cancel);
      form.appendChild(row);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        save.disabled = true;
        api('/forum/thread/' + encodeURIComponent(threadId) + '/post/' + encodeURIComponent(p.id), {
          method: 'PATCH',
          body: JSON.stringify({ text: ta.value }),
        }).then(function (r) {
          if (r.status === 200 && r.body.ok) openThread(threadId);
          else { save.disabled = false; say(failWrite(r)); }
        }).catch(function () { save.disabled = false; say('Network error.'); });
      });
      art.appendChild(form);
      ta.focus();
    }
    function startDelete(tools, p, threadId) {
      var old = tools.querySelector('.df-delete-confirm');
      if (old) old.remove();
      var wrap = el('div', 'df-tools df-delete-confirm');
      var confirm = el('button', 'df-send');
      confirm.type = 'button';
      confirm.textContent = 'Confirm';
      confirm.addEventListener('click', function () {
        confirm.disabled = true;
        api('/forum/thread/' + encodeURIComponent(threadId) + '/post/' + encodeURIComponent(p.id), {
          method: 'DELETE',
        }).then(function (r) {
          if (r.status === 200 && r.body.ok) openThread(threadId);
          else { confirm.disabled = false; say(failWrite(r)); }
        }).catch(function () { confirm.disabled = false; say('Network error.'); });
      });
      var cancel = el('button', 'df-back');
      cancel.type = 'button';
      cancel.textContent = 'Keep';
      cancel.addEventListener('click', function () { wrap.remove(); });
      wrap.appendChild(confirm);
      wrap.appendChild(cancel);
      tools.appendChild(wrap);
    }
    function startReport(art, p, threadId) {
      var old = art.querySelector('.df-report-form');
      if (old) old.remove();
      var form = el('form', 'df-report-form');
      var sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Report reason');
      ['scam', 'spam', 'harassment', 'off-topic'].forEach(function (r) {
        var o = document.createElement('option');
        o.value = r;
        o.textContent = r;
        sel.appendChild(o);
      });
      form.appendChild(sel);
      var send = el('button', 'df-send');
      send.type = 'submit';
      send.textContent = 'Send';
      var cancel = el('button', 'df-back');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', function () { form.remove(); });
      form.appendChild(send);
      form.appendChild(cancel);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        send.disabled = true;
        api('/forum/thread/' + encodeURIComponent(threadId) + '/report', {
          method: 'POST',
          body: JSON.stringify({ postId: p.id, reason: sel.value }),
        }).then(function (r) {
          if (r.status === 200 && r.body.ok) { form.remove(); say('Reported.'); }
          else { send.disabled = false; say(failWrite(r)); }
        }).catch(function () { send.disabled = false; say('Network error.'); });
      });
      art.appendChild(form);
      sel.focus();
    }
    function threadRow(t) {
      var row = el('article', 'df-row');
      var unread = Number(t.lastTs || t.ts) > Number(seenMap()[t.id] || 0);
      row.appendChild(forumAvatar(t.avatar));
      var main = el('div', 'df-row-main');
      var btn = el('a', 'df-open');
      btn.href = forumThreadUrl(t.id);
      btn.textContent = t.title;
      btn.addEventListener('click', function (e) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        openThread(t.id);
      });
      var meta = el('p', 'df-meta');
      meta.appendChild(forumAuthor(t.handle, t.simpUrl));
      meta.appendChild(document.createTextNode(' · ' + (t.replies || 0) + (t.replies === 1 ? ' reply' : ' replies') + (t.reactions ? ' · ♥ ' + t.reactions : '') + ' · ' + timeLabel(t.lastTs || t.ts) + (t.locked ? ' · locked' : '')));
      if (t.holder) meta.appendChild(holderBadge('post'));
      main.appendChild(btn);
      main.appendChild(meta);
      if (t.snippet) main.appendChild(el('p', 'df-snippet', String(t.snippet).slice(0, 180)));
      row.appendChild(main);
      if (unread) row.appendChild(el('span', 'df-new', 'NEW'));
      return row;
    }
    function postRow(p, threadId, isNew) {
      var art = el('article', 'df-post');
      art.id = 'post-' + p.id;
      var meta = el('p', 'df-meta');
      meta.appendChild(forumAvatar(p.avatar));
      meta.appendChild(forumAuthor(p.handle, p.simpUrl));
      meta.appendChild(document.createTextNode(' · '));
      var permalink = el('a', 'df-post-link', timeLabel(p.ts));
      permalink.href = forumThreadUrl(threadId) + '#' + art.id;
      permalink.setAttribute('aria-label', 'Post permalink');
      meta.appendChild(permalink);
      if (p.editedAt) meta.appendChild(document.createTextNode(' · edited'));
      if (p.holder) meta.appendChild(holderBadge('post'));
      if (isNew) meta.appendChild(el('span', 'df-new', 'NEW'));
      art.appendChild(meta);
      var body = el('p', 'df-body');
      if (p.deleted) body.textContent = 'deleted';
      else fillBody(body, p.text);
      art.appendChild(body);
      if (!p.deleted && p.quote && p.quote.id) {
        var quote = el('blockquote', 'df-quote');
        var quoteHandle = el(/^[A-Za-z0-9_-]{1,48}$/.test(p.quote.id) ? 'a' : 'span', 'df-quote-handle', '@' + (p.quote.handle || ''));
        if (quoteHandle.tagName === 'A') {
          quoteHandle.href = forumThreadUrl(threadId) + '#post-' + p.quote.id;
          quoteHandle.setAttribute('aria-label', 'View quoted post by @' + (p.quote.handle || ''));
        }
        quote.appendChild(quoteHandle);
        quote.appendChild(document.createTextNode(' ' + (p.quote.text || '')));
        art.appendChild(quote);
      }
      if (!linked && Number(p.reactionCount) > 0) {
        meta.appendChild(document.createTextNode(' · ♥ ' + Number(p.reactionCount)));
      }
      if (linked && !p.deleted) {
        var tools = el('div', 'df-tools');
        var love = el('button', 'df-back df-react', '♥ ' + (Number(p.reactionCount) || 0));
        love.type = 'button';
        love.setAttribute('aria-pressed', p.reacted ? 'true' : 'false');
        love.setAttribute('aria-label', (p.reacted ? 'Remove love' : 'Love this post') + ' · ' + (Number(p.reactionCount) || 0));
        love.addEventListener('click', function () {
          love.disabled = true;
          api('/forum/thread/' + encodeURIComponent(threadId) + '/post/' + encodeURIComponent(p.id) + '/react', {
            method: 'POST', body: JSON.stringify({ active: !p.reacted }),
          }).then(function (r) {
            if (r.status !== 200 || !r.body.ok) throw new Error(failWrite(r));
            p.reactionCount = Number(r.body.reactionCount) || 0;
            p.reacted = r.body.reacted === true;
            love.textContent = '♥ ' + p.reactionCount;
            love.setAttribute('aria-pressed', p.reacted ? 'true' : 'false');
            love.setAttribute('aria-label', (p.reacted ? 'Remove love' : 'Love this post') + ' · ' + p.reactionCount);
            love.disabled = false;
            say(p.reacted ? 'Loved.' : 'Love removed.');
          }).catch(function (error) {
            love.disabled = false;
            say(error && error.message || 'Could not react.');
          });
        });
        tools.appendChild(love);
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
          ed.addEventListener('click', function () { startEdit(art, p, threadId); });
          var del = el('button', 'df-back');
          del.type = 'button';
          del.textContent = 'Delete';
          del.addEventListener('click', function () { startDelete(tools, p, threadId); });
          tools.appendChild(ed);
          tools.appendChild(del);
        } else {
          var report = el('button', 'df-back');
          report.type = 'button';
          report.textContent = 'Report';
          report.addEventListener('click', function () { startReport(art, p, threadId); });
          tools.appendChild(report);
        }
        art.appendChild(tools);
      }
      return art;
    }
    function composer(onSend, withTitle, scope) {
      var form = el('form', 'df-composer');
      var key = draftKey(scope);
      var saved = readDraft(key);
      var incoming = withTitle ? takeNewThreadHash() : null;
      if (incoming && !saved.title && !saved.body) {
        saved = incoming;
        saveDraft(key, saved.title, saved.body, null);
      }
      var title = withTitle
        ? field('Title', 'input', { type: 'text', maxlength: '80', required: 'required', placeholder: 'Say hi or pitch one thing' })
        : null;
      var body = field(withTitle ? 'First post' : 'Your reply', 'textarea', {
        rows: '4',
        maxlength: '2000',
        required: 'required',
        placeholder: withTitle ? 'What should Dasha make, fix, or explain?' : 'Say it plainly.',
      });
      if (title) title.input.value = saved.title;
      body.input.value = saved.body;
      function remember() { saveDraft(key, title ? title.input.value : '', body.input.value, withTitle ? null : pendingQuote); }
      if (title) title.input.addEventListener('input', remember);
      body.input.addEventListener('input', remember);
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
            saveDraft(key, '', '', null);
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
      var key = draftKey('reply:' + id);
      var saved = readDraft(key);
      if (!pendingQuote && saved.quote) pendingQuote = saved.quote;
      if (pendingQuote) saveDraft(key, '', saved.body, pendingQuote);
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
          var textarea = wrap.querySelector('textarea');
          saveDraft(key, '', textarea ? textarea.value : saved.body, null);
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
      }, false, 'reply:' + id);
      wrap.appendChild(form);
      view.appendChild(wrap);
      var ta = form.querySelector('textarea');
      if (ta) ta.focus();
    }
    function renderList(threads, q, next) {
      view.innerHTML = '';
      var head = el('div', 'df-head');
      head.appendChild(el('h2', 'df-title', 'Forum'));
      var note = el(
        'p',
        'df-note',
        linked
          ? 'Start a thread. Chat is for now. · '
          : 'Read freely. Link X to post. · ',
      );
      var feed = el('a', 'df-feed', 'RSS');
      feed.href = 'https://www.getdasha.com/lobby/feed.xml';
      feed.type = 'application/rss+xml';
      feed.setAttribute('aria-label', 'Subscribe to public forum threads with RSS');
      note.appendChild(feed);
      head.appendChild(note);
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
      if (threads.length || q) view.appendChild(search);
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
        }, true, 'new-thread'));
      }
      var list = el('div', 'df-list');
      var seen = seenMap();
      var unread = threads.filter(function (t) { return Number(t.lastTs || t.ts) > Number(seen[t.id] || 0); }).length;
      if (unread) list.appendChild(el('p', 'df-newcount', unread + (unread === 1 ? ' new thread' : ' new threads')));
      if (!threads.length) {
        list.appendChild(el('p', 'df-empty', q ? 'Nothing matches that search.' : linked ? 'Start the first thread: meme, question, or build idea.' : 'No threads yet.'));
        if (!q && !linked) {
          var linkX = el('button', 'df-send', 'Link X to start one');
          linkX.type = 'button';
          linkX.addEventListener('click', function () {
            if (!openXPopup(base)) say('Allow popups to link X.');
          });
          list.appendChild(linkX);
        }
      }
      for (var i = 0; i < threads.length; i++) list.appendChild(threadRow(threads[i]));
      if (next) {
        var more = el('button', 'df-back df-more', 'Load more');
        more.type = 'button';
        more.addEventListener('click', function () {
          more.disabled = true;
          more.textContent = 'Loading…';
          var params = new URLSearchParams();
          if (q) params.set('q', q);
          params.set('cursor', next);
          api('/forum/threads?' + params.toString()).then(function (r) {
            if (r.status !== 200 || !r.body || !Array.isArray(r.body.threads)) throw new Error('bad page');
            var rows = r.body.threads;
            for (var j = 0; j < rows.length; j++) list.insertBefore(threadRow(rows[j]), more);
            next = r.body.next || '';
            if (next) {
              more.disabled = false;
              more.textContent = 'Load more';
            } else more.remove();
            say(rows.length + (rows.length === 1 ? ' more thread loaded.' : ' more threads loaded.'));
          }).catch(function () {
            more.disabled = false;
            more.textContent = 'Try again';
            say('Could not load more threads.');
          });
        });
        list.appendChild(more);
      }
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
        bar.appendChild(shareLink(id, r.body.thread.title));
        view.appendChild(bar);
        view.appendChild(el('h2', 'df-title', r.body.thread.title));
        var posts = el('div', 'df-posts');
        var rows = r.body.posts || [];
        var previousSeen = Number(seenMap()[id] || 0);
        var newRows = previousSeen ? rows.filter(function (p) { return !p.deleted && Number(p.ts) > previousSeen; }) : [];
        var newCount = newRows.length;
        markSeen(id, rows.length ? rows[rows.length - 1].ts : Date.now());
        if (newCount) {
          var jump = el('a', 'df-newcount', newCount + (newCount === 1 ? ' new post' : ' new posts'));
          jump.href = '#post-' + newRows[0].id;
          view.appendChild(jump);
        }
        for (var i = 0; i < rows.length; i++) posts.appendChild(postRow(rows[i], id, previousSeen && !rows[i].deleted && Number(rows[i].ts) > previousSeen));
        view.appendChild(posts);
        if (r.body.thread && r.body.thread.locked) {
          view.appendChild(el('p', 'df-empty', 'This thread is locked.'));
        } else if (linked) {
          renderReplyComposer(id);
        }
        if (/^#post-[A-Za-z0-9_-]{1,48}$/.test(location.hash)) {
          var target = document.getElementById(location.hash.slice(1));
          if (target) { target.tabIndex = -1; target.focus(); }
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
          if (r.status !== 200 || !r.body || !Array.isArray(r.body.threads)) throw new Error('bad thread list');
          say('');
          renderList(r.body.threads, lastQuery, r.body.next);
          var want = readThreadQuery();
          if (want) openThread(want);
        })
        .catch(function () { say('Forum is unreachable right now. Chat still works.'); });
    }
    function onXLinkedMessage(ev) {
      if (!ev || !ev.data || ev.data.type !== 'dasha-x-linked') return;
      if (ev.origin !== 'https://lobby.getdasha.com' && ev.origin !== base) return;
      load(lastQuery);
    }
    window.addEventListener('message', onXLinkedMessage);
    load();
    return {
      reload: load,
      open: openThread,
      destroy: function () { window.removeEventListener('message', onXLinkedMessage); },
    };
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
    log.tabIndex = -1;
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-relevant', 'additions');
    // Empty state belongs to the room. The composer directly below is the action.
    if (!document.getElementById('dasha-lobby-empty-style')) {
      var emptyStyle = document.createElement('style');
      emptyStyle.id = 'dasha-lobby-empty-style';
      emptyStyle.textContent =
        '.lobby-empty{display:grid;gap:10px;justify-items:center;margin:auto;padding:28px 14px;text-align:center;color:var(--muted,#e6dcc4)}' +
        '.lobby-empty-title{margin:0;color:var(--paper,#f4eddb);font-size:18px;font-weight:950;letter-spacing:.02em}' +
        '.lobby-latest{align-self:center;min-height:44px;padding:0 16px;border:1px solid var(--acid,#dfff00);border-radius:999px;background:var(--acid,#dfff00);color:var(--ink,#070608);font:800 13px/1 Arial,sans-serif;cursor:pointer}' +
        '.lobby-latest[hidden]{display:none}';
      document.head.appendChild(emptyStyle);
    }
    function makeEmptyState() {
      var wrap = el('div', 'lobby-empty');
      wrap.appendChild(el('p', 'lobby-empty-title', 'Be first.'));
      return wrap;
    }
    log.appendChild(makeEmptyState());

    var newMessageCount = 0;
    var latest = el('button', 'lobby-latest');
    latest.type = 'button';
    latest.hidden = true;
    function atLatest() {
      return log.scrollHeight - log.scrollTop - log.clientHeight <= 40;
    }
    function clearNewMessages() {
      newMessageCount = 0;
      latest.hidden = true;
    }
    function jumpToLatest() {
      log.scrollTop = log.scrollHeight;
      log.focus();
      clearNewMessages();
    }
    latest.addEventListener('click', jumpToLatest);
    log.addEventListener('scroll', function () { if (atLatest()) clearNewMessages(); });

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
    root.appendChild(latest);
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
    var holder = false;
    var linkedHandle = null;
    var linkedAvatar = null;
    var xConfigured = false;
    var maxTextNow = MAX_TEXT;
    var serverMaxText = null;
    var lastActivity = Date.now();
    var idleTimer = null;
    var IDLE_MS = 20 * 60 * 1000;
    var pendingText = null;
    var expanded = false;
    var LOBBY_DRAFT_KEY = 'dasha-lobby-draft';
    var savedDraft = '';
    try { savedDraft = String(sessionStorage.getItem(LOBBY_DRAFT_KEY) || '').slice(0, MAX_TEXT_HOLDER); } catch (e) {}

    function saveLobbyDraft(text) {
      savedDraft = String(text || '').slice(0, MAX_TEXT_HOLDER);
      try {
        if (savedDraft) sessionStorage.setItem(LOBBY_DRAFT_KEY, savedDraft);
        else sessionStorage.removeItem(LOBBY_DRAFT_KEY);
      } catch (e) {}
    }

    function restoreLobbyDraft() {
      if (!savedDraft || (textIn.value && textIn.value !== savedDraft.slice(0, textIn.value.length))) return;
      textIn.value = savedDraft.slice(0, maxTextNow);
    }

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

    function applyServerPerks(perks) {
      holder = Boolean(linked && perks && perks.holder);
      var max = Number(perks && perks.maxText);
      serverMaxText = Number.isInteger(max) && max >= MAX_TEXT && max <= MAX_TEXT_HOLDER ? max : null;
    }

    function applyLinkedUi() {
      maxTextNow = linked ? serverMaxText || MAX_TEXT_LINKED : MAX_TEXT;
      textIn.maxLength = maxTextNow;
      restoreLobbyDraft();
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
        boardA.href = 'https://www.getdasha.com/simp';
        boardA.textContent = 'Simp Board';
        boardA.style.cssText = 'color:#dfff00;font-weight:800;text-underline-offset:3px';
        xStatus.appendChild(boardA);
        xStatus.appendChild(document.createTextNode(holder ? ' · 500-char holder chat' : ' · longer chat'));
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
            holder = false;
            serverMaxText = null;
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
      saveLobbyDraft('');
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
      var follow = atLatest();
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
      if (extra && extra.holder) {
        meta.appendChild(holderBadge('chat'));
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
      if (follow) {
        log.scrollTop = log.scrollHeight;
        clearNewMessages();
      } else {
        newMessageCount += 1;
        latest.textContent = newMessageCount + (newMessageCount === 1 ? ' new message ↓' : ' new messages ↓');
        latest.hidden = false;
      }
    }

    function handle(data) {
      if (!data || !data.type) return;
      if (data.type === 'ready') {
        bumpActivity();
        if (data.x && data.x.handle) {
          linked = true;
          linkedHandle = data.x.handle;
          linkedAvatar = data.x.avatar || null;
        }
        applyServerPerks(data.perks);
        applyLinkedUi();
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
        clearNewMessages();
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
        }
        applyServerPerks(data.perks);
        applyLinkedUi();
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
          clearNewMessages();
          if (data.pin && data.pin.text) addLine('pin', 'PIN', data.pin.text, null);
          if (data.pin && data.pin.text) setPinText(data.pin.text);
          data.history.forEach(function (m) {
            if (m.type === 'chat' || m.nick)
              addLine('chat', m.nick, m.text, m.ts, {
                linked: Boolean(m.linked),
                handle: m.handle || null,
                avatar: m.avatar || null,
                holder: Boolean(m.holder),
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
          holder: Boolean(data.holder),
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
      holder = false;
      serverMaxText = null;
      applyLinkedUi();

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
      var w = openXPopup(httpBase());
      if (!w) setStatus('Allow popups to link X', 'warn');
    });
    xUnlink.addEventListener('click', function () {
      fetch(httpBase() + '/oauth/x/logout', { method: 'POST', credentials: 'include', mode: 'cors' })
        .then(function () {
          linked = false;
          holder = false;
          serverMaxText = null;
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
      saveLobbyDraft('');
      textIn.value = '';
      paintCounts();
      textIn.focus();
    });

    nickIn.addEventListener('change', function () {
      if (ws && ws.readyState === 1) sendHello();
    });
    nickIn.addEventListener('input', paintCounts);
    textIn.addEventListener('input', function () {
      saveLobbyDraft(textIn.value);
      paintCounts();
    });
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
