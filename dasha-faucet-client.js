/**
 * Dasha /faucet client — quiz-ticket cards, acid bar = card progress.
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
  var STILLS = ['bull.jpg', 'weekend.jpg', 'chart.jpg', 'profile.jpg'];
  var SHARE = 'got a sample. not an airdrop. not earn.';
  var PHRASE = 'nobody from $dasha will ask for a phrase.';

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
      '.faucet-root h1,.faucet-root h2,.faucet-go,.faucet-match{font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}' +
      '.faucet-root h1{margin:0 0 .4rem;font-size:clamp(2.6rem,10vw,5rem);line-height:.9;text-transform:uppercase}' +
      '.faucet-lede{color:rgba(244,237,219,.7);max-width:46ch}' +
      '.faucet-ticket{display:grid;gap:14px;padding:16px;border:2px dashed #dfff00;background:#120e12;box-shadow:6px 6px 0 #ff3b81}' +
      '.faucet-stub{position:relative;display:grid;gap:10px;padding:18px 18px 18px 36px;border:2px dashed #dfff00;background:#120e12}' +
      '.faucet-stub:before{content:"";position:absolute;left:12px;top:12px;bottom:12px;border-left:2px dotted #dfff00}' +
      '.faucet-hole{width:36px;height:36px;border-radius:50%;background:#070608;box-shadow:inset 0 0 0 3px #dfff00}' +
      '.faucet-still{width:100%;height:140px;object-fit:cover;border:1px solid #dfff00}' +
      '.faucet-bar{height:4px;background:#2a2428}.faucet-fill{display:block;height:100%;background:#dfff00}' +
      '.faucet-q{margin:0;font-size:clamp(26px,5vw,42px);line-height:1.08;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}' +
      '.faucet-match{margin:0;font-size:clamp(3rem,14vw,7rem);line-height:.85;color:#dfff00;text-transform:uppercase}' +
      '.faucet-stamp{display:inline-flex;align-items:center;min-height:36px;padding:0 10px;border:2px solid #dfff00;color:#dfff00;font-weight:900;letter-spacing:.06em}' +
      '.faucet-stamp.is-no{border-color:#ff3b81;color:#ff3b81}' +
      '.faucet-stamp.is-ink{background:#dfff00;color:#070608}' +
      '.faucet-go,.faucet-choice,.faucet-back{min-height:48px;min-width:48px;padding:0 16px;border:1px solid #dfff00;background:#dfff00;color:#070608;font:inherit;font-weight:900;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}' +
      '.faucet-back{background:transparent;color:#f4eddb}' +
      '.faucet-choice{background:#070608;color:#f4eddb;width:100%;text-align:left}' +
      '.faucet-choices{display:grid;gap:10px}' +
      '.faucet-ca,.faucet-mono{font:15px/1.4 Fragment Mono,ui-monospace,Menlo,Consolas,monospace;word-break:break-all;user-select:all;color:#7c4dff}' +
      '.faucet-warn{color:#ff3b81}' +
      '.faucet-label{display:block;margin:.2rem 0;color:rgba(244,237,219,.7)}' +
      '.faucet-root input{width:100%;min-height:48px;padding:10px;box-sizing:border-box;background:#070608;color:#f4eddb;border:1px solid #dfff00;font:15px/1.4 Fragment Mono,ui-monospace,Menlo,Consolas,monospace}' +
      '.faucet-hops,.faucet-quiet{display:flex;flex-wrap:wrap;gap:12px}' +
      '.faucet-quiet a{min-height:48px;min-width:48px;display:inline-flex;align-items:center;color:#dfff00}' +
      '@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}';
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
      confirming: 'still confirming. wait, then retry.',
      treasury_empty: 'treasury empty. try later.',
      faucet_paused: 'faucet paused',
      treasury_rent: 'treasury needs rent. try later.',
      rpc_unavailable: 'rpc down. try later.',
      not_configured: 'faucet not configured.',
      'invalid faucet challenge': 'wallet sign-in failed.',
      siws_domain: 'sign-in domain mismatch.',
      'non-json response': 'server did not answer.'
    };
    return map[key] || key;
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
    var learn = el('a', 'faucet-go', 'Learn');
    learn.href = '/learn';
    box.appendChild(buy);
    box.appendChild(learn);
    box.appendChild(el('p', 'faucet-lede', 'Neither is required.'));
    root.appendChild(box);
  }

  function quietHops(root) {
    var box = el('div', 'faucet-quiet');
    [['/learn', 'Learn'], ['/how-to-buy', 'How to buy'], ['/airdrop', 'Airdrop'], ['/earn', 'Earn']].forEach(function (pair) {
      var a = el('a', '', pair[1]);
      a.href = pair[0];
      box.appendChild(a);
    });
    root.appendChild(box);
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

  function still(n) {
    var img = el('img', 'faucet-still', '');
    img.src = 'https://lobby.getdasha.com/simp/photo/' + STILLS[n % STILLS.length];
    img.alt = '';
    return img;
  }

  function stamp(kind) {
    if (kind === 'IS_WALLET') return el('p', 'faucet-stamp', 'IS_WALLET');
    var no = el('p', 'faucet-stamp is-no', 'NOT THIS TOKEN');
    return no;
  }

  function hideLeftover() {
    var node = document.getElementById('dasha-faucet-static');
    if (node) node.hidden = true;
  }

  function mount(root) {
    if (!root) return null;
    hideLeftover();
    var base = apiBase(root);
    root.innerHTML = '';
    root.classList.add('faucet-root');
    var style = document.createElement('style');
    style.textContent = css();
    root.appendChild(style);
    root.appendChild(el('h1', '', 'Faucet'));
    var live = el('p', 'faucet-lede', '');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    var stage = el('div', 'faucet-card');
    root.appendChild(stage);
    root.appendChild(live);

    var state = {
      card: 0, me: null, status: null, dest: '', kind: '', siwsDown: false, sent: null,
      last4Ok: false, phraseStamped: false, mintMatched: false, note: '',
      holdCard: false, destError: '', fail: ''
    };
    var xPopup = null;
    var xTimer = 0;

    function bar(n) {
      var wrap = el('div', 'faucet-bar');
      var fill = el('span', 'faucet-fill');
      fill.style.width = Math.round((n / 5) * 100) + '%';
      wrap.appendChild(fill);
      return wrap;
    }

    function ticket(n) {
      var card = el('div', 'faucet-ticket');
      card.appendChild(bar(n));
      card.appendChild(still(n));
      return card;
    }

    function shareBlock(box) {
      var btn = el('button', 'faucet-go', 'Share the fact');
      btn.type = 'button';
      btn.addEventListener('click', function () { copyText(SHARE, btn); });
      box.appendChild(btn);
    }

    function choice(label, fn) {
      var btn = el('button', 'faucet-choice', label);
      btn.type = 'button';
      btn.addEventListener('click', fn);
      return btn;
    }

    function last4Of(addr) {
      return String(addr || '').slice(-4);
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

    function receiptStub(box, dest, nextAt) {
      var stub = el('div', 'faucet-stub');
      stub.appendChild(el('h2', 'faucet-q', 'Ticket stub'));
      stub.appendChild(el('p', '', '100 $dasha'));
      stub.appendChild(el('p', 'faucet-match', last4Of(dest) + ' MATCH'));
      stub.appendChild(el('p', '', '1/30d'));
      stub.appendChild(el('p', 'faucet-lede', 'no cash value'));
      stub.appendChild(el('div', 'faucet-hole', ''));
      if (nextAt) stub.appendChild(el('p', 'faucet-lede', 'Next at ' + new Date(nextAt).toISOString()));
      quietHops(stub);
      box.appendChild(stub);
    }

    function solscanLink(sig, href) {
      var a = el('a', 'faucet-go', 'Solscan');
      a.href = href || ('https://solscan.io/tx/' + sig);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      return a;
    }

    function paint() {
      stage.innerHTML = '';
      if (state.status && state.status.configured === false) {
        var empty = ticket(0);
        empty.appendChild(el('h2', 'faucet-q', 'Not funded yet'));
        empty.appendChild(el('p', '', 'a tiny sample for newbies. not an airdrop. not earn.'));
        empty.appendChild(el('p', 'faucet-lede', 'Agents do not claim this faucet.'));
        empty.appendChild(el('p', 'faucet-lede', 'The treasury key is not set. JSON writes return 501. This page is honest about that.'));
        mintBlock(empty);
        hops(empty);
        stage.appendChild(empty);
        live.textContent = 'not funded yet';
        return;
      }
      if (state.me && state.me.claimed) {
        var claimed = ticket(5);
        claimed.appendChild(el('h2', 'faucet-q', 'Already claimed'));
        receiptStub(claimed, state.me.dest || state.dest, state.me.nextAt);
        if (state.me.signature) {
          claimed.appendChild(solscanLink(state.me.signature));
          claimed.appendChild(el('p', 'faucet-mono', state.me.signature));
        }
        shareBlock(claimed);
        hops(claimed);
        stage.appendChild(claimed);
        live.textContent = 'one per linked X / 30 days';
        return;
      }
      if (state.card === 0) {
        var intro = ticket(0);
        intro.appendChild(el('h2', 'faucet-q', 'MATCH the sample'));
        intro.appendChild(el('p', '', 'a tiny sample for newbies. not an airdrop. not earn.'));
        intro.appendChild(el('p', 'faucet-lede', 'Agents do not claim this faucet.'));
        intro.appendChild(el('p', 'faucet-lede', 'Not official. Not advice. She is not the dev. Association is not endorsement.'));
        var nd = el('a', '', 'she is not the dev');
        nd.href = NOT_DEV;
        nd.target = '_blank';
        nd.rel = 'noopener noreferrer';
        var p = el('p', 'faucet-lede', '');
        p.appendChild(nd);
        intro.appendChild(p);
        var picks = el('div', 'faucet-choices');
        picks.appendChild(choice("it's a sample", function () { state.note = ''; state.holdCard = false; state.card = 1; paint(); }));
        picks.appendChild(choice('airdrop', function () {
          state.note = "there isn't one. that word has a room at /airdrop.";
          paint();
        }));
        picks.appendChild(choice('earn', function () {
          state.note = '$dasha does not pay you to click. that word has a room at /earn.';
          paint();
        }));
        intro.appendChild(picks);
        if (state.note) {
          var fix = el('p', 'faucet-warn', '');
          if (state.note.indexOf('/airdrop') >= 0) {
            fix.appendChild(document.createTextNode("there isn't one. that word has a room at "));
            var air = el('a', '', '/airdrop');
            air.href = '/airdrop';
            fix.appendChild(air);
            fix.appendChild(document.createTextNode('.'));
          } else {
            fix.appendChild(document.createTextNode('$dasha does not pay you to click. that word has a room at '));
            var earn = el('a', '', '/earn');
            earn.href = '/earn';
            fix.appendChild(earn);
            fix.appendChild(document.createTextNode('.'));
          }
          intro.appendChild(fix);
        }
        quietHops(intro);
        stage.appendChild(intro);
        return;
      }
      if (state.card === 1) {
        var xCard = ticket(1);
        xCard.appendChild(backTo(0));
        if (state.me && state.me.linked && !state.holdCard) {
          state.card = 2;
          paint();
          return;
        }
        if (state.me && state.me.linked) {
          xCard.appendChild(el('h2', 'faucet-q', 'X linked'));
          xCard.appendChild(el('p', '', 'Dest next. Back keeps dest and X.'));
          var destGo = el('button', 'faucet-go', 'Destination');
          destGo.type = 'button';
          destGo.addEventListener('click', function () { state.card = 2; paint(); });
          xCard.appendChild(destGo);
          stage.appendChild(xCard);
          return;
        }
        xCard.appendChild(el('h2', 'faucet-q', 'Connect X'));
        xCard.appendChild(el('p', '', 'One linked X account. One sample / 30 days. No referrals.'));
        var btn = el('button', 'faucet-go', 'Connect X');
        btn.type = 'button';
        btn.addEventListener('click', function () { startX(); });
        xCard.appendChild(btn);
        stage.appendChild(xCard);
        return;
      }
      if (state.card === 2) {
        var destCard = ticket(2);
        destCard.appendChild(backTo(1));
        destCard.appendChild(el('h2', 'faucet-q', 'Destination'));
        destCard.appendChild(el('p', 'faucet-lede', 'SIWS is dest-proof, not a claim-airdrop signature.'));
        if (!state.dest) {
          var siws = el('button', 'faucet-go', 'Sign with wallet');
          siws.type = 'button';
          siws.addEventListener('click', function () { bindSiws(siws); });
          destCard.appendChild(siws);
          destCard.appendChild(el('p', 'faucet-lede', 'Or paste. Check the last 4.'));
          var destField = labeledInput('dasha-faucet-dest', 'Destination wallet', {
            autocomplete: 'off',
            spellcheck: 'false',
            placeholder: 'Solana address'
          });
          var lastField = labeledInput('dasha-faucet-last4', 'Last 4 of destination', {
            autocomplete: 'off',
            placeholder: 'last 4',
            maxLength: 4
          });
          var paste = el('button', 'faucet-go', 'Use pasted address');
          paste.type = 'button';
          paste.addEventListener('click', function () { bindPaste(destField.input.value, lastField.input.value); });
          destCard.appendChild(destField.wrap);
          destCard.appendChild(lastField.wrap);
          destCard.appendChild(paste);
          if (state.destError) destCard.appendChild(showErr(state.destError));
        } else {
          destCard.appendChild(el('p', 'faucet-match', last4Of(state.dest) + ' MATCH'));
          destCard.appendChild(el('p', 'faucet-ca', state.dest));
          destCard.appendChild(stamp(state.kind || 'IS_WALLET'));
          destCard.appendChild(el('p', '', 'Retype dest last-4.'));
          var retypeField = labeledInput('dasha-faucet-last4-retype', 'Retype last 4 to MATCH', {
            autocomplete: 'off',
            placeholder: 'last 4',
            maxLength: 4
          });
          retypeField.input.addEventListener('input', function () {
            state.last4Ok = last4Of(state.dest) === String(retypeField.input.value || '').trim();
            if (state.last4Ok && state.phraseStamped) { state.card = 3; paint(); }
          });
          destCard.appendChild(retypeField.wrap);
          var ink = el('button', state.phraseStamped ? 'faucet-stamp is-ink' : 'faucet-stamp', PHRASE);
          ink.type = 'button';
          ink.addEventListener('click', function () {
            state.phraseStamped = true;
            if (state.last4Ok) { state.card = 3; paint(); }
            else paint();
          });
          destCard.appendChild(ink);
        }
        stage.appendChild(destCard);
        return;
      }
      if (state.card === 3) {
        var raw = state.status && state.status.amountRaw != null ? state.status.amountRaw : 100000000;
        var ui = state.status && state.status.amountUi != null ? state.status.amountUi : 100;
        var confirm = ticket(3);
        confirm.appendChild(backTo(2));
        confirm.appendChild(el('h2', 'faucet-q', 'Confirm'));
        confirm.appendChild(el('p', 'faucet-match', last4Of(state.dest) + ' MATCH'));
        confirm.appendChild(el('p', 'faucet-ca', state.dest));
        confirm.appendChild(stamp(state.kind || 'IS_WALLET'));
        confirm.appendChild(el('p', '', ui + ' $dasha'));
        confirm.appendChild(el('p', 'faucet-mono', 'raw ' + raw));
        confirm.appendChild(el('p', '', 'MATCH the mint. Does not unlock a send on the server.'));
        var mintBox = el('div', 'faucet-choices');
        mintBox.appendChild(choice('search $dasha by name', function () {
          state.mintMatched = false;
          live.textContent = 'NOT THIS TOKEN';
          confirm.appendChild(stamp('token'));
        }));
        mintBox.appendChild(choice(WSOL, function () {
          state.mintMatched = false;
          live.textContent = 'NOT THIS TOKEN';
        }));
        mintBox.appendChild(choice(MINT, function () {
          state.mintMatched = true;
          paint();
        }));
        confirm.appendChild(mintBox);
        var mintField = labeledInput('dasha-faucet-mint-paste', 'Mint address', {
          autocomplete: 'off',
          spellcheck: 'false',
          placeholder: 'paste the real CA'
        });
        mintField.input.addEventListener('input', function () {
          if (String(mintField.input.value || '').trim() === MINT) {
            state.mintMatched = true;
            paint();
          }
        });
        confirm.appendChild(mintField.wrap);
        if (state.mintMatched) {
          confirm.appendChild(el('p', 'faucet-ca', MINT));
          confirm.appendChild(el('p', 'faucet-lede', '1 / 30 days. Treasury pays current ATA rent if this wallet has no $dasha ATA yet.'));
          var send = el('button', 'faucet-go', 'send the sample');
          send.type = 'button';
          send.addEventListener('click', function () { state.card = 4; paint(); claim(); });
          confirm.appendChild(send);
        }
        stage.appendChild(confirm);
        return;
      }
      if (state.card === 4) {
        var sending = ticket(4);
        sending.appendChild(el('h2', 'faucet-q', 'Sending'));
        sending.appendChild(el('p', '', 'waiting for the chain. no fake bar.'));
        if (state.sent && state.sent.signature) {
          sending.appendChild(solscanLink(state.sent.signature, state.sent.solscan));
          sending.appendChild(el('p', 'faucet-mono', state.sent.signature));
        }
        stage.appendChild(sending);
        live.textContent = 'waiting for JSON';
        return;
      }
      if (state.card === 6) {
        var fail = ticket(4);
        fail.appendChild(backTo(3));
        fail.appendChild(showErr(state.fail || 'claim failed.'));
        fail.appendChild(el('p', 'faucet-lede', 'no fake send. dest and X stay. retry from confirm.'));
        var retry = el('button', 'faucet-go', 'Back to confirm');
        retry.type = 'button';
        retry.addEventListener('click', function () { state.card = 3; state.fail = ''; paint(); });
        fail.appendChild(retry);
        stage.appendChild(fail);
        live.textContent = humanError(state.fail);
        return;
      }
      if (state.card === 5) {
        var sent = ticket(5);
        sent.appendChild(el('h2', 'faucet-q', 'Sent'));
        receiptStub(sent, state.sent && state.sent.dest || state.dest, null);
        if (state.sent && state.sent.solscan && state.sent.signature) {
          sent.appendChild(solscanLink(state.sent.signature, state.sent.solscan));
          sent.appendChild(el('p', 'faucet-mono', state.sent.signature));
        }
        shareBlock(sent);
        hops(sent);
        stage.appendChild(sent);
        live.textContent = 'sample sent';
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
          var signIn = challenge.siws && walletSignIn(wallet);
          var signed = signIn
            ? signIn(challenge.siws)
            : wallet.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
          return Promise.resolve(signed).then(function (out) {
            if (Array.isArray(out)) out = out[0];
            var signature = out && (out.signature || out);
            if (signature && signature.signature) signature = signature.signature;
            if (!signature) throw new Error('wallet returned an incomplete signature');
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
            state.destError = humanError((res.data && res.data.error) || 'verify failed');
            live.textContent = state.destError;
            paint();
            return;
          }
          state.dest = res.data.dest;
          state.kind = res.data.kind || 'IS_WALLET';
          state.last4Ok = false;
          state.phraseStamped = false;
          state.card = 2;
          paint();
        })
        .catch(function (err) {
          btn.disabled = false;
          state.destError = humanError(err && err.message);
          live.textContent = state.destError;
          paint();
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
            showDestError((res.data && res.data.error) || 'paste rejected');
            return;
          }
          state.dest = res.data.dest;
          state.kind = res.data.kind || 'IS_WALLET';
          state.last4Ok = false;
          state.phraseStamped = false;
          state.destError = '';
          state.card = 2;
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
          state.card = 5;
          paint();
          return;
        }
        if (res.data && res.data.error === 'confirming' && res.data.signature) {
          state.sent = res.data;
          state.card = 4;
          paint();
          live.textContent = 'waiting for the chain. no fake bar.';
          return;
        }
        state.fail = humanError((res.data && res.data.error) || ('claim ' + res.status));
        state.card = 6;
        paint();
      }).catch(function () {
        state.fail = 'claim failed.';
        state.card = 6;
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
        if (state.me.linked && state.card === 1 && !state.holdCard) {
          stopXPoll();
          state.card = 2;
        }
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
        live.textContent = 'Allow popups to link X.';
        return;
      }
      live.textContent = 'Complete X link in the popup…';
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
