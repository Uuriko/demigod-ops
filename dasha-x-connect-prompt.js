/** Site-wide login status + /login controller. No account is required to browse. */
(function (global) {
  'use strict';
  var API = 'https://lobby.getdasha.com';

  function fetchJson(path, options) {
    var opts = options || {};
    opts.credentials = 'include';
    opts.mode = 'cors';
    opts.cache = 'no-store';
    if (opts.body) opts.headers = { 'Content-Type': 'application/json' };
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function base58(bytes) {
    var alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    var value = 0n;
    for (var i = 0; i < bytes.length; i++) value = value * 256n + BigInt(bytes[i]);
    var out = '';
    while (value) { out = alphabet[Number(value % 58n)] + out; value /= 58n; }
    for (var j = 0; j < bytes.length && bytes[j] === 0; j++) out = '1' + out;
    return out || '1';
  }

  function walletProvider() {
    return global.phantom && global.phantom.solana || global.solflare || global.solana || null;
  }

  function paintLinks(data) {
    var label = data && data.loggedIn
      ? data.provider === 'x' ? '@' + data.x.handle : data.wallet.display
      : 'Log in';
    document.querySelectorAll('[data-dasha-login-link]').forEach(function (link) {
      link.textContent = label;
      link.setAttribute('aria-label', data && data.loggedIn ? 'Open login settings for ' + label : 'Log in to Dasha');
    });
  }

  function status() {
    return fetchJson('/auth/status').then(function (data) { paintLinks(data); return data; });
  }

  function bootLoginPage(root) {
    var methods = root.querySelector('[data-login-methods]');
    var x = root.querySelector('[data-x-login]');
    var wallet = root.querySelector('[data-wallet-login]');
    var logout = root.querySelector('[data-logout]');
    var message = root.querySelector('[data-login-status]');
    var next = root.querySelector('[data-login-next]');
    var nextLink = next.querySelector('a');

    function say(text, kind) { message.textContent = text || ''; message.dataset.kind = kind || ''; }
    function paint(data) {
      var loggedIn = Boolean(data && data.loggedIn);
      methods.hidden = loggedIn;
      logout.hidden = !loggedIn;
      next.hidden = !loggedIn;
      if (loggedIn) nextLink.textContent = data.provider === 'x' ? 'Verify holder perks →' : 'Holder perks need X + Board →';
      say(loggedIn
        ? data.provider === 'x' ? 'Logged in as @' + data.x.handle + '.' : 'Logged in as ' + data.wallet.display + '. Address control only.'
        : '', loggedIn ? 'ok' : '');
      paintLinks(data);
    }

    x.addEventListener('click', function (event) {
      event.preventDefault();
      var popup = global.open(x.href, 'dasha_x', 'width=520,height=700');
      if (!popup) { say('Allow popups to continue with X.', 'bad'); return; }
      say('Finish in the X window…', '');
    });

    wallet.addEventListener('click', function () {
      var provider = walletProvider();
      if (!provider || !provider.connect || !provider.signMessage) {
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          location.href = 'https://phantom.app/ul/browse/' + encodeURIComponent(location.href) + '?ref=' + encodeURIComponent(location.origin);
        } else say('Open this page in a Solana wallet.', 'bad');
        return;
      }
      wallet.disabled = true;
      say('Connect, then sign the login message…', '');
      var publicKey;
      provider.connect().then(function (connected) {
        var key = provider.publicKey || connected && connected.publicKey;
        if (!key) throw new Error('Wallet returned no public key');
        publicKey = key.toString();
        return fetchJson('/auth/wallet/challenge', { method: 'POST', body: JSON.stringify({ publicKey: publicKey }) });
      }).then(function (challenge) {
        return provider.signMessage(new TextEncoder().encode(challenge.message), 'utf8').then(function (signed) {
          var bytes = signed && signed.signature || signed;
          if (!bytes || typeof bytes.length !== 'number') throw new Error('Wallet returned no signature');
          return fetchJson('/auth/wallet/verify', {
            method: 'POST',
            body: JSON.stringify({ publicKey: publicKey, challenge: challenge.challenge, signature: base58(bytes) }),
          });
        });
      }).then(function () { return status(); }).then(paint).catch(function (error) {
        say(String(error.message || error).slice(0, 120), 'bad');
      }).finally(function () { wallet.disabled = false; });
    });

    logout.addEventListener('click', function () {
      logout.disabled = true;
      fetchJson('/auth/logout', { method: 'POST' }).then(function () { return status(); }).then(paint).catch(function (error) {
        say(String(error.message || error).slice(0, 120), 'bad');
      }).finally(function () { logout.disabled = false; });
    });

    global.addEventListener('message', function (event) {
      if (!event.data || event.data.type !== 'dasha-x-linked' || event.origin !== API) return;
      status().then(paint);
    });
    status().then(paint).catch(function () { say('Login status unavailable.', 'bad'); });
  }

  function boot() {
    var root = document.querySelector('[data-dasha-login]');
    if (root) bootLoginPage(root);
    else status().catch(function () {});
  }

  global.DashaXConnectPrompt = { boot: boot, open: function () { location.href = 'https://www.getdasha.com/login'; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : this);
