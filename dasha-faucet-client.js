/**
 * Dasha /faucet client — one card, acid bar, no N-of-M.
 * Tiny sample. Not an airdrop. Not earn.
 */
(function (global) {
  'use strict';

  var MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  var WSOL = 'So11111111111111111111111111111111111111112';
  var JUPITER = 'https://jup.ag/swap?sell=' + WSOL + '&buy=' + MINT;
  var MINT_SOURCE = 'https://x.com/dash_eats/status/2085405228078432279';
  var NOT_DEV = 'https://x.com/dash_eats/status/2085532923063853316';
  var DEFAULT_API = 'https://lobby.getdasha.com';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function apiBase(root) {
    var attr = root && root.getAttribute('data-faucet-api');
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

  function css() {
    return '#dasha-faucet,.faucet-root{color:#f4eddb;font:16px/1.45 Arial,Helvetica,sans-serif}' +
      '.faucet-root h1,.faucet-root h2,.faucet-go{font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}' +
      '.faucet-root h1{margin:0 0 .4rem;font-size:clamp(2.6rem,10vw,5rem);line-height:.9;text-transform:uppercase}' +
      '.faucet-lede{color:rgba(244,237,219,.7);max-width:46ch}' +
      '.faucet-card{display:grid;gap:14px}' +
      '.faucet-bar{height:4px;background:#2a2428}.faucet-fill{display:block;height:100%;background:#dfff00}' +
      '.faucet-q{margin:0;font-size:clamp(26px,5vw,42px);line-height:1.08;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}' +
      '.faucet-go,.faucet-choice{min-height:48px;min-width:48px;padding:0 16px;border:1px solid #dfff00;background:#dfff00;color:#070608;font:inherit;font-weight:900;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}' +
      '.faucet-choice{background:#070608;color:#f4eddb;width:100%;text-align:left}' +
      '.faucet-ca,.faucet-mono{font:15px/1.4 Fragment Mono,ui-monospace,Menlo,Consolas,monospace;word-break:break-all;user-select:all;color:#7c4dff}' +
      '.faucet-warn{color:#ff3b81}' +
      '.faucet-root input{width:100%;min-height:48px;padding:10px;box-sizing:border-box;background:#070608;color:#f4eddb;border:1px solid #dfff00;font:15px/1.4 Fragment Mono,ui-monospace,Menlo,Consolas,monospace}' +
      '.faucet-hops{display:flex;flex-wrap:wrap;gap:8px}' +
      '@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}';
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

  function hops(root) {
    var box = el('div', 'faucet-hops');
    var buy = el('a', 'faucet-go', 'How to buy');
    buy.href = '/how-to-buy';
    var jup = el('a', 'faucet-go', 'Jupiter');
    jup.href = JUPITER;
    jup.target = '_blank';
    jup.rel = 'noopener noreferrer';
    var learn = el('a', 'faucet-go', 'Learn');
    learn.href = '/learn';
    box.appendChild(buy);
    box.appendChild(jup);
    box.appendChild(learn);
    box.appendChild(el('p', 'faucet-lede', 'Neither is required.'));
    root.appendChild(box);
  }

  function mintBlock(root) {
    var code = el('code', 'faucet-ca', MINT);
    root.appendChild(code);
    var copy = el('button', 'faucet-go', 'Copy mint');
    copy.type = 'button';
    copy.addEventListener('click', function () { copyText(MINT, copy); });
    root.appendChild(copy);
    var src = el('p', 'faucet-lede', '');
    var a = el('a', '', 'mint source');
    a.href = MINT_SOURCE;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    src.appendChild(a);
    src.appendChild(document.createTextNode(' · MATCH, not verified.'));
    root.appendChild(src);
  }

  function mount(root) {
    if (!root) return null;
    var base = apiBase(root);
    root.innerHTML = '';
    root.classList.add('faucet-root');
    var style = document.createElement('style');
    style.textContent = css();
    root.appendChild(style);
    var live = el('p', 'faucet-lede', '');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    var stage = el('div', 'faucet-card');
    root.appendChild(stage);
    root.appendChild(live);

    var state = { card: 0, me: null, status: null, dest: '', siwsDown: false };

    function bar(n) {
      var wrap = el('div', 'faucet-bar');
      var fill = el('span', 'faucet-fill');
      fill.style.width = Math.round((n / 5) * 100) + '%';
      wrap.appendChild(fill);
      return wrap;
    }

    function paint() {
      stage.innerHTML = '';
      if (state.status && state.status.configured === false) {
        stage.appendChild(el('h2', 'faucet-q', 'Not funded yet'));
        stage.appendChild(el('p', '', 'a tiny sample for newbies. not an airdrop. not earn.'));
        stage.appendChild(el('p', 'faucet-lede', 'The treasury key is not set. JSON writes return 501. This page is honest about that.'));
        mintBlock(stage);
        hops(stage);
        live.textContent = 'not funded yet';
        return;
      }
      if (state.me && state.me.claimed) {
        stage.appendChild(el('h2', 'faucet-q', 'Already claimed'));
        if (state.me.signature) {
          var a = el('a', 'faucet-go', 'Solscan');
          a.href = 'https://solscan.io/tx/' + state.me.signature;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          stage.appendChild(a);
          stage.appendChild(el('p', 'faucet-mono', state.me.signature));
        }
        if (state.me.nextAt) stage.appendChild(el('p', 'faucet-lede', 'Next at ' + new Date(state.me.nextAt).toISOString()));
        hops(stage);
        live.textContent = 'one per linked X / 30 days';
        return;
      }
      if (state.card === 0) {
        stage.appendChild(bar(0));
        stage.appendChild(el('h2', 'faucet-q', 'What this is'));
        stage.appendChild(el('p', '', 'a tiny sample for newbies. not an airdrop. not earn.'));
        stage.appendChild(el('p', 'faucet-lede', 'Not official. Not advice. She is not the dev. Association is not endorsement.'));
        mintBlock(stage);
        var nd = el('a', '', 'she is not the dev');
        nd.href = NOT_DEV;
        nd.target = '_blank';
        nd.rel = 'noopener noreferrer';
        var p = el('p', 'faucet-lede', '');
        p.appendChild(nd);
        stage.appendChild(p);
        var go = el('button', 'faucet-go', 'Continue');
        go.type = 'button';
        go.addEventListener('click', function () { state.card = 1; paint(); });
        stage.appendChild(go);
        return;
      }
      if (state.card === 1) {
        stage.appendChild(bar(1));
        stage.appendChild(el('h2', 'faucet-q', 'Connect X'));
        stage.appendChild(el('p', '', 'One linked X account. One sample / 30 days. No referrals.'));
        if (state.me && state.me.linked) {
          live.textContent = 'X linked.';
          var next = el('button', 'faucet-go', 'Continue');
          next.type = 'button';
          next.addEventListener('click', function () { state.card = 2; paint(); });
          stage.appendChild(next);
          return;
        }
        var btn = el('button', 'faucet-go', 'Connect X');
        btn.type = 'button';
        btn.addEventListener('click', function () {
          var w = window.open(base + '/oauth/x/start?return=/faucet', 'dasha_x', 'width=520,height=700');
          if (!w) live.textContent = 'Allow popups to link X.';
          else live.textContent = 'Complete X link in the popup…';
        });
        stage.appendChild(btn);
        return;
      }
      if (state.card === 2) {
        stage.appendChild(bar(2));
        stage.appendChild(el('h2', 'faucet-q', 'Destination'));
        stage.appendChild(el('p', 'faucet-warn', 'This is your receive address. We will not ask for a phrase.'));
        var siws = el('button', 'faucet-go', 'Sign with wallet');
        siws.type = 'button';
        siws.addEventListener('click', function () { bindSiws(siws); });
        stage.appendChild(siws);
        stage.appendChild(el('p', 'faucet-lede', 'Or paste. Check the last 4.'));
        var input = el('input', '', '');
        input.placeholder = 'Solana address';
        input.autocomplete = 'off';
        input.spellcheck = false;
        var last = el('input', '', '');
        last.placeholder = 'last 4';
        last.autocomplete = 'off';
        last.maxLength = 4;
        var paste = el('button', 'faucet-go', 'Use pasted address');
        paste.type = 'button';
        paste.addEventListener('click', function () { bindPaste(input.value, last.value); });
        stage.appendChild(input);
        stage.appendChild(last);
        stage.appendChild(paste);
        return;
      }
      if (state.card === 3) {
        var raw = state.status && state.status.amountRaw != null ? state.status.amountRaw : 100000000;
        var ui = state.status && state.status.amountUi != null ? state.status.amountUi : 100;
        stage.appendChild(bar(3));
        stage.appendChild(el('h2', 'faucet-q', 'Confirm'));
        stage.appendChild(el('p', '', ui + ' $dasha'));
        stage.appendChild(el('p', 'faucet-mono', 'raw ' + raw));
        stage.appendChild(el('p', 'faucet-ca', MINT));
        stage.appendChild(el('p', 'faucet-lede', '1 / 30 days. Treasury pays ~0.00203928 SOL rent if this wallet has no $dasha ATA yet.'));
        stage.appendChild(el('p', 'faucet-mono', state.dest));
        var go = el('button', 'faucet-go', 'Send sample');
        go.type = 'button';
        go.addEventListener('click', function () { state.card = 4; paint(); claim(); });
        stage.appendChild(go);
        return;
      }
      if (state.card === 4) {
        stage.appendChild(bar(4));
        stage.appendChild(el('h2', 'faucet-q', 'Sending'));
        stage.appendChild(el('p', '', 'Waiting for the chain. No fake bar.'));
        live.textContent = 'waiting for JSON';
        return;
      }
      if (state.card === 5) {
        stage.appendChild(bar(5));
        stage.appendChild(el('h2', 'faucet-q', 'Sent'));
        if (state.sent && state.sent.solscan) {
          var link = el('a', 'faucet-go', 'Solscan');
          link.href = state.sent.solscan;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          stage.appendChild(link);
          stage.appendChild(el('p', 'faucet-mono', state.sent.signature));
        }
        hops(stage);
        live.textContent = 'sample sent';
      }
    }

    function bindSiws(btn) {
      var wallet = (global.phantom && global.phantom.solana) || global.solflare || global.solana;
      if (!wallet || !wallet.connect || !wallet.signMessage) {
        live.textContent = 'No wallet signer. Paste the receive address.';
        return;
      }
      btn.disabled = true;
      wallet.connect()
        .then(function (connected) {
          var publicKey = wallet.publicKey || (connected && connected.publicKey);
          if (!publicKey) throw new Error('wallet returned no public key');
          publicKey = publicKey.toString();
          return fetchJson(base + '/faucet/wallet/challenge', {
            method: 'POST',
            credentials: 'include',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicKey: publicKey })
          }).then(function (res) { return { res: res, publicKey: publicKey }; });
        })
        .then(function (pair) {
          if (pair.res.status === 501 || pair.res.status === 503) {
            state.siwsDown = true;
            live.textContent = 'Sign-in is down. Paste the receive address.';
            btn.disabled = false;
            return;
          }
          var challenge = pair.res.data;
          if (!challenge || !challenge.ok) throw new Error((challenge && challenge.error) || 'challenge failed');
          return wallet.signMessage(new TextEncoder().encode(challenge.message), 'utf8').then(function (signed) {
            var signature = signed.signature || signed;
            if (!signature) throw new Error('wallet returned an incomplete signature');
            return fetchJson(base + '/faucet/wallet/verify', {
              method: 'POST',
              credentials: 'include',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ challenge: challenge.challenge, publicKey: pair.publicKey, signature: toBase58(signature) })
            });
          });
        })
        .then(function (res) {
          btn.disabled = false;
          if (!res) return;
          if (!res.data || !res.data.ok) throw new Error((res.data && res.data.error) || 'verify failed');
          state.dest = res.data.dest;
          state.card = 3;
          paint();
        })
        .catch(function (err) {
          btn.disabled = false;
          live.textContent = String(err.message || err).slice(0, 120);
        });
    }

    function bindPaste(dest, four) {
      dest = String(dest || '').trim();
      four = String(four || '').trim();
      fetchJson(base + '/faucet/wallet/verify', {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dest: dest, last4: four, paste: true })
      }).then(function (res) {
        if (!res.data || !res.data.ok) {
          live.textContent = (res.data && res.data.error) || 'paste rejected';
          return;
        }
        state.dest = res.data.dest;
        state.card = 3;
        paint();
      }).catch(function () { live.textContent = 'paste failed'; });
    }

    function claim() {
      fetchJson(base + '/faucet/claim', {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }).then(function (res) {
        if (res.status === 200 && res.data && res.data.ok && res.data.signature) {
          state.sent = res.data;
          state.card = 5;
          paint();
          return;
        }
        state.card = 3;
        paint();
        live.textContent = (res.data && res.data.error) || ('claim ' + res.status);
      }).catch(function () {
        state.card = 3;
        paint();
        live.textContent = 'claim failed';
      });
    }

    function toBase58(bytes) {
      var ALPH = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      var src = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      var zeros = 0;
      while (zeros < src.length && src[zeros] === 0) zeros++;
      var size = Math.ceil(src.length * 138 / 100) + 1;
      var buf = new Uint8Array(size);
      for (var i = 0; i < src.length; i++) {
        var carry = src[i];
        for (var j = size - 1; j >= 0; j--) {
          carry += 256 * buf[j];
          buf[j] = carry % 58;
          carry = (carry / 58) | 0;
        }
      }
      var k = 0;
      while (k < size && buf[k] === 0) k++;
      var out = '';
      while (zeros--) out += '1';
      for (; k < size; k++) out += ALPH[buf[k]];
      return out || '1';
    }

    function onX(ev) {
      if (!ev || !ev.data || ev.data.type !== 'dasha-x-linked') return;
      fetchJson(base + '/faucet/me', { credentials: 'include', mode: 'cors' }).then(function (res) {
        state.me = res.data || {};
        if (state.me.linked && state.card === 1) state.card = 2;
        paint();
      });
    }
    window.addEventListener('message', onX);

    Promise.all([
      fetchJson(base + '/faucet/status', { credentials: 'include', mode: 'cors' }),
      fetchJson(base + '/faucet/me', { credentials: 'include', mode: 'cors' })
    ]).then(function (pair) {
      state.status = pair[0].data || {};
      if (pair[0].status === 501) state.status = { configured: false, error: 'not_configured' };
      state.me = pair[1].data || {};
      if (state.me.dest) state.dest = state.me.dest;
      paint();
    }).catch(function () {
      state.status = { configured: false, error: 'not_configured' };
      paint();
    });

    return { destroy: function () { window.removeEventListener('message', onX); root.innerHTML = ''; } };
  }

  var api = { mount: mount, MINT: MINT };
  global.DashaFaucet = api;
  function boot() {
    var root = document.getElementById('dasha-faucet');
    if (root && !root.getAttribute('data-faucet-mounted')) {
      root.setAttribute('data-faucet-mounted', '1');
      mount(root);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : this);
