/**
 * Dasha /faucet — picture, dest, send.
 */
(function (global) {
  'use strict';

  var MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  var DEFAULT_API = 'https://lobby.getdasha.com';
  var HERO = 'https://lobby.getdasha.com/client/faucet.png';

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

  function destShapeError(dest, four) {
    dest = String(dest || '').trim();
    four = String(four || '').trim();
    if (/t\.me|telegram/i.test(dest)) return 'dest_not_wallet';
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(dest)) return 'dest_not_wallet';
    if (dest === MINT) return 'dest_mint';
    if (four && dest.slice(-4) !== four) return 'last-4 does not match';
    return '';
  }

  function humanError(code) {
    var key = String(code || '').trim();
    if (!key || key.charAt(0) === '{') return 'claim failed.';
    var map = {
      dest_not_wallet: 'dest_not_wallet',
      dest_token: 'dest_token',
      dest_mint: 'dest_mint',
      dest_pda: 'dest_pda',
      'last-4 does not match': 'last-4 does not match',
      'link X first': 'link X first',
      'already claimed': 'already claimed',
      confirming: 'confirming',
      treasury_empty: 'treasury_empty',
      faucet_paused: 'faucet paused',
      treasury_rent: 'treasury_rent',
      rpc_unavailable: 'rpc_unavailable',
      not_configured: 'not_configured',
      'invalid faucet challenge': 'invalid faucet challenge',
      siws_domain: 'siws_domain',
      'non-json response': 'non-json response'
    };
    return map[key] || key;
  }

  function css() {
    return '#dasha-faucet,.faucet-root{color:#f4eddb;font:16px/1.45 Arial,Helvetica,sans-serif}' +
      '.faucet-go,.faucet-back,.faucet-q{font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}' +
      '.faucet-hero{display:block;width:min(100%,720px);height:auto;background:#070608;cursor:pointer}' +
      '.faucet-card{display:grid;gap:14px;max-width:720px}' +
      '.faucet-q{margin:0;font-size:clamp(26px,5vw,42px);line-height:1.08}' +
      '.faucet-go,.faucet-back{min-height:48px;min-width:48px;padding:0 16px;border:1px solid #dfff00;background:#dfff00;color:#070608;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}' +
      '.faucet-back{background:transparent;color:#f4eddb;border-color:#f4eddb}' +
      '.faucet-go:disabled{opacity:.7;color:#070608}' +
      '.faucet-nav{display:flex;flex-wrap:wrap;gap:8px}' +
      '.faucet-ca,.faucet-mono{font:15px/1.4 Fragment Mono,ui-monospace,Menlo,Consolas,monospace;word-break:break-all;user-select:all;color:#f4eddb}' +
      '.faucet-warn{color:#ff3b81}' +
      '.faucet-label{display:block;margin:.2rem 0;color:rgba(244,237,219,.7)}' +
      '.faucet-root input{width:100%;min-height:48px;padding:10px;box-sizing:border-box;background:#070608;color:#f4eddb;border:1px solid #dfff00;font:15px/1.4 Fragment Mono,ui-monospace,Menlo,Consolas,monospace}' +
      '.faucet-hole{width:36px;height:36px;border-radius:50%;background:#070608;box-shadow:inset 0 0 0 3px #dfff00}' +
      '@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}';
  }

  function labeledInput(id, labelText, attrs) {
    var wrap = el('div');
    var lab = el('label', 'faucet-label', labelText);
    lab.setAttribute('for', id);
    var input = el('input');
    input.id = id;
    input.setAttribute('aria-label', labelText);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'maxLength') input.maxLength = attrs[k];
      else input.setAttribute(k, attrs[k]);
    });
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return { wrap: wrap, input: input };
  }

  function hideLeftover() {
    var node = document.getElementById('dasha-faucet-static');
    if (node) node.hidden = true;
  }

  function mount(root) {
    if (!root) return null;
    hideLeftover();
    var base = apiBase(root);
    var stillUrl = root.getAttribute('data-faucet-still') || HERO;
    var stillSri = root.getAttribute('data-faucet-still-sri') || '';
    root.innerHTML = '';
    root.classList.add('faucet-root');
    var style = document.createElement('style');
    style.textContent = css();
    root.appendChild(style);
    var live = el('p', '', '');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)';
    var stage = el('div', 'faucet-card');
    root.appendChild(stage);
    root.appendChild(live);

    var state = {
      card: 0, me: null, status: null, dest: '', kind: '', sent: null,
      last4Ok: false, holdCard: false, destError: '', fail: ''
    };
    var xPopup = null;
    var xTimer = 0;

    function last4Of(addr) {
      return String(addr || '').slice(-4);
    }

    function hero(clickable) {
      var img = el('img', 'faucet-hero');
      img.src = stillUrl;
      img.alt = '';
      if (stillSri) {
        img.setAttribute('integrity', stillSri);
        img.crossOrigin = 'anonymous';
      }
      if (clickable) {
        img.addEventListener('click', function () {
          state.holdCard = false;
          state.card = 1;
          paint();
        });
      }
      return img;
    }

    function backTo(n) {
      var b = el('button', 'faucet-back', 'Back');
      b.type = 'button';
      b.addEventListener('click', function () {
        state.holdCard = true;
        state.card = n;
        state.fail = '';
        state.destError = '';
        paint();
      });
      return b;
    }

    function showErr(code) {
      return el('p', 'faucet-q faucet-warn', humanError(code));
    }

    function solscanLink(sig, href) {
      var a = el('a', 'faucet-go', 'Solscan');
      a.href = href || ('https://solscan.io/tx/' + sig);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      return a;
    }

    function stub(dest) {
      var box = el('div', 'faucet-card');
      box.appendChild(hero(false));
      if (dest) box.appendChild(el('p', 'faucet-q', last4Of(dest)));
      box.appendChild(el('div', 'faucet-hole', ''));
      return box;
    }

    function paint() {
      stage.innerHTML = '';
      if (state.me && state.me.claimed) {
        var claimed = stub(state.me.dest || state.dest);
        if (state.me.signature) claimed.appendChild(solscanLink(state.me.signature));
        stage.appendChild(claimed);
        return;
      }
      if (!state.status || state.status.configured !== true || state.status.funded !== true) {
        stage.appendChild(hero(false));
        live.textContent = state.status && state.status.configured === false ? 'not_configured' : 'treasury_empty';
        return;
      }
      if (state.card === 0) {
        stage.appendChild(hero(true));
        return;
      }
      if (state.card === 1) {
        var destCard = el('div', 'faucet-card');
        destCard.appendChild(backTo(0));
        destCard.appendChild(hero(false));
        if (!state.me || !state.me.linked) {
          var x = el('button', 'faucet-go', 'X');
          x.type = 'button';
          x.addEventListener('click', function () { startX(); });
          destCard.appendChild(x);
        }
        if (!state.dest) {
          var siws = el('button', 'faucet-go', 'Wallet');
          siws.type = 'button';
          siws.addEventListener('click', function () { bindSiws(siws); });
          destCard.appendChild(siws);
          var destField = labeledInput('dasha-faucet-dest', 'Destination wallet', {
            autocomplete: 'off',
            spellcheck: 'false'
          });
          var lastField = labeledInput('dasha-faucet-last4', 'Last 4 of destination', {
            autocomplete: 'off',
            maxLength: 4
          });
          var paste = el('button', 'faucet-go', 'Paste');
          paste.type = 'button';
          paste.addEventListener('click', function () { bindPaste(destField.input.value, lastField.input.value); });
          destCard.appendChild(destField.wrap);
          destCard.appendChild(lastField.wrap);
          destCard.appendChild(paste);
          if (state.destError) destCard.appendChild(showErr(state.destError));
        } else {
          destCard.appendChild(el('p', 'faucet-ca', state.dest));
          var retype = labeledInput('dasha-faucet-last4-retype', 'Last 4', {
            autocomplete: 'off',
            maxLength: 4
          });
          retype.input.addEventListener('input', function () {
            state.last4Ok = last4Of(state.dest) === String(retype.input.value || '').trim();
            if (state.last4Ok) { state.card = 2; paint(); }
          });
          destCard.appendChild(retype.wrap);
        }
        stage.appendChild(destCard);
        return;
      }
      if (state.card === 2) {
        var sendCard = el('div', 'faucet-card');
        sendCard.appendChild(backTo(1));
        sendCard.appendChild(hero(false));
        sendCard.appendChild(el('p', 'faucet-q', last4Of(state.dest)));
        var send = el('button', 'faucet-go', 'Send');
        send.type = 'button';
        send.addEventListener('click', function () { state.card = 3; paint(); claim(); });
        sendCard.appendChild(send);
        if (state.fail) sendCard.appendChild(showErr(state.fail));
        stage.appendChild(sendCard);
        return;
      }
      if (state.card === 3) {
        var sending = el('div', 'faucet-card');
        sending.appendChild(hero(false));
        if (state.sent && state.sent.signature) {
          sending.appendChild(solscanLink(state.sent.signature, state.sent.solscan));
          sending.appendChild(el('p', 'faucet-mono', state.sent.signature));
        }
        stage.appendChild(sending);
        return;
      }
      if (state.card === 5) {
        var fail = el('div', 'faucet-card');
        fail.appendChild(backTo(2));
        fail.appendChild(showErr(state.fail || 'claim failed.'));
        var retry = el('button', 'faucet-go', 'Send');
        retry.type = 'button';
        retry.addEventListener('click', function () { state.card = 2; state.fail = ''; paint(); });
        fail.appendChild(retry);
        stage.appendChild(fail);
        live.textContent = humanError(state.fail);
        return;
      }
      if (state.card === 4) {
        var sent = stub(state.sent && state.sent.dest || state.dest);
        if (state.sent && state.sent.solscan && state.sent.signature) {
          sent.appendChild(solscanLink(state.sent.signature, state.sent.solscan));
        }
        stage.appendChild(sent);
      }
    }

    function walletSignIn(wallet) {
      if (wallet && typeof wallet.signIn === 'function') return function (input) { return wallet.signIn(input); };
      var feat = wallet && wallet.features && wallet.features['solana:signIn'];
      if (feat && typeof feat.signIn === 'function') return function (input) { return feat.signIn(input); };
      if (typeof feat === 'function') return feat;
      return null;
    }

    function decodeSignedMessage(value) {
      if (value == null) return '';
      if (typeof value === 'string') return value;
      try { return new TextDecoder().decode(value instanceof Uint8Array ? value : new Uint8Array(value)); } catch (e) { return ''; }
    }

    function bindSiws(btn) {
      var wallet = (global.phantom && global.phantom.solana) || global.solflare || global.solana;
      if (!wallet || !wallet.connect || (!wallet.signMessage && !walletSignIn(wallet))) {
        showDestError('dest_not_wallet');
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
            btn.disabled = false;
            showDestError(pair.res.data && pair.res.data.error || 'not_configured');
            return;
          }
          var challenge = pair.res.data;
          if (!challenge || !challenge.ok) throw new Error((challenge && challenge.error) || 'invalid faucet challenge');
          var signIn = challenge.siws && walletSignIn(wallet);
          var signed = signIn
            ? signIn(challenge.siws)
            : wallet.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
          return Promise.resolve(signed).then(function (out) {
            if (Array.isArray(out)) out = out[0];
            var signature = out && (out.signature || out);
            if (signature && signature.signature) signature = signature.signature;
            if (!signature) throw new Error('invalid faucet challenge');
            var signedMessage = decodeSignedMessage(out && out.signedMessage) || challenge.message;
            return fetchJson(base + '/faucet/wallet/verify', {
              method: 'POST',
              credentials: 'include',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                challenge: challenge.challenge,
                publicKey: pair.publicKey,
                signature: toBase58(signature),
                signedMessage: signedMessage
              })
            });
          });
        })
        .then(function (res) {
          btn.disabled = false;
          if (!res) return;
          if (!res.data || !res.data.ok) {
            showDestError((res.data && res.data.error) || 'invalid faucet challenge');
            return;
          }
          state.dest = res.data.dest;
          state.kind = res.data.kind || 'IS_WALLET';
          state.last4Ok = false;
          state.destError = '';
          state.card = 1;
          paint();
        })
        .catch(function (err) {
          btn.disabled = false;
          showDestError(err && err.message);
        });
    }

    function showDestError(code) {
      state.destError = humanError(code);
      live.textContent = state.destError;
      paint();
    }

    function bindPaste(dest, four) {
      dest = String(dest || '').trim();
      four = String(four || '').trim();
      var shape = destShapeError(dest, four);
      if (shape) {
        showDestError(shape);
        return;
      }
      function afterWallet() {
        if (!state.me || !state.me.linked) {
          showDestError('link X first');
          return Promise.resolve();
        }
        return fetchJson(base + '/faucet/wallet/verify', {
          method: 'POST',
          credentials: 'include',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dest: dest, last4: four, paste: true })
        }).then(function (res) {
          if (!res.data || !res.data.ok) {
            showDestError((res.data && res.data.error) || 'dest_not_wallet');
            return;
          }
          state.dest = res.data.dest;
          state.kind = res.data.kind || 'IS_WALLET';
          state.last4Ok = false;
          state.destError = '';
          state.card = 1;
          paint();
        });
      }
      fetchJson(base + '/faucet/dest-check', {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dest: dest, last4: four })
      }).then(function (res) {
        var err = res.data && res.data.error;
        if (err && err !== 'link X first') {
          showDestError(err);
          return;
        }
        if (res.data && res.data.ok === false) {
          showDestError(err || 'dest_not_wallet');
          return;
        }
        return afterWallet();
      }).catch(function () { return afterWallet(); });
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
          state.card = 4;
          paint();
          return;
        }
        if (res.data && res.data.error === 'confirming' && res.data.signature) {
          state.sent = res.data;
          state.card = 3;
          paint();
          return;
        }
        state.fail = humanError((res.data && res.data.error) || ('claim ' + res.status));
        state.card = 5;
        paint();
      }).catch(function () {
        state.fail = 'claim failed.';
        state.card = 5;
        paint();
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

    function refreshMe() {
      return fetchJson(base + '/faucet/me', { credentials: 'include', mode: 'cors' }).then(function (res) {
        state.me = res.data || {};
        if (state.me.dest) state.dest = state.me.dest;
        paint();
        return state.me;
      });
    }

    function stopXPoll() {
      if (xTimer) {
        clearInterval(xTimer);
        xTimer = 0;
      }
      xPopup = null;
    }

    function startX() {
      xPopup = window.open(base + '/oauth/x/start?return=/faucet', 'dasha_x', 'width=520,height=700');
      if (!xPopup) {
        showDestError('link X first');
        return;
      }
      if (xTimer) clearInterval(xTimer);
      xTimer = setInterval(function () {
        if (xPopup && xPopup.closed) {
          stopXPoll();
          refreshMe();
          return;
        }
        refreshMe();
      }, 2000);
    }

    function onX(ev) {
      if (!ev || !ev.data || ev.data.type !== 'dasha-x-linked') return;
      refreshMe();
    }
    function onVis() {
      if (xPopup && !xPopup.closed) refreshMe();
    }
    window.addEventListener('message', onX);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);

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

    return {
      destroy: function () {
        stopXPoll();
        window.removeEventListener('message', onX);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('focus', onVis);
        root.innerHTML = '';
      }
    };
  }

  var api = { mount: mount, MINT: MINT, destShapeError: destShapeError, humanError: humanError };
  global.DashaFaucet = api;
  function boot() {
    hideLeftover();
    var root = document.getElementById('dasha-faucet');
    if (root && !root.getAttribute('data-faucet-mounted')) {
      root.setAttribute('data-faucet-mounted', '1');
      mount(root);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : this);
