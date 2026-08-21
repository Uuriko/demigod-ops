/**
 * Dasha tip faucet client — mount on #dasha-faucet.
 * Contract: lobby /faucet/status|me|dest-check|wallet/*|claim + X OAuth + donate/fill.
 * Door = photo + free $dasha (claim) + Donate (pitch in).
 */
(function(global) {
  'use strict';
  var MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  var TREASURY = 'DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb';
  var DEFAULT_API = 'https://lobby.getdasha.com';
  var HERO = 'https://lobby.getdasha.com/client/faucet.avif';

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
    return fetch(url, init).then(function(r) {
      return r.text().then(function(raw) {
        var data = null;
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch (e) {
            data = {
              error: 'non-json response'
            };
          }
        }
        return {
          status: r.status,
          data: data || {}
        };
      });
    });
  }

  function destCopiedOk(got, want) {
    return String(got || '').replace(/\s+/g, '') === String(want || '');
  }

  function destShapeError(dest, four) {
    dest = String(dest || '').trim();
    four = String(four || '').trim();
    if (/t\.me|telegram/i.test(dest)) return 'dest_not_wallet';
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(dest)) return 'dest_not_wallet';
    try {
      var alph = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      var val = 0n;
      var i;
      for (i = 0; i < dest.length; i++) {
        var n = alph.indexOf(dest.charAt(i));
        if (n < 0) return 'dest_not_wallet';
        val = val * 58n + BigInt(n);
      }
      var bytes = [];
      while (val > 0n) {
        bytes.push(Number(val & 255n));
        val >>= 8n;
      }
      for (i = 0; i < dest.length && dest.charAt(i) === '1'; i++) bytes.push(0);
      if (bytes.length !== 32) return 'dest_not_wallet';
    } catch (e) {
      return 'dest_not_wallet';
    }
    if (dest === MINT) return 'dest_mint';
    if (dest === TREASURY) return 'dest_treasury';
    if (four && dest.slice(-4) !== four) return 'last-4 does not match';
    return '';
  }

  function humanError(code) {
    var key = String(code || '').trim();
    if (!key || key.charAt(0) === '{') return 'claim failed.';
    var map = {
      dest_not_wallet: 'not a wallet',
      dest_token: 'not a wallet',
      dest_mint: 'that is the mint',
      dest_treasury: 'that is the tip jar',
      dest_pda: 'not a wallet',
      'last-4 does not match': 'last 4 miss',
      'valid Solana address required': 'not a wallet',
      'bind a destination first': 'not a wallet',
      'invalid faucet challenge': 'sign-in failed',
      'invalid wallet signature': 'sign-in failed',
      'faucet challenge already used': 'sign-in failed',
      siws_domain: 'wrong sign-in site',
      'link X first': 'link X',
      'prove wallet': 'prove wallet',
      x_reauth: 'Link X again',
      daily_cap: 'try tomorrow',
      hourly_cap: 'try later',
      'already claimed': 'already claimed',
      confirming: 'confirming',
      'claim already sending': 'confirming',
      treasury_empty: 'jar empty',
      faucet_paused: 'paused',
      'faucet paused': 'paused',
      treasury_rent: 'jar empty',
      rpc_unavailable: 'try again',
      not_configured: 'not ready',
      'non-json response': 'claim failed.',
      'sig miss': 'sig miss',
      'bad signature': 'sig miss',
      unverified: 'sig miss',
      floor: 'too small',
      cap: 'capped',
      already: 'already in',
      duplicate: 'already in',
      'need wallet': 'not a wallet',
      dest_paste: 'not a wallet'
    };
    if (map[key]) return map[key];
    if (/_/.test(key)) return 'claim failed.';
    return key;
  }

  function css() {
    /* Stacked actions, 16px gutters, 52px targets. Rows of acid buttons
       next to fields were the live clutter: a 48px finger pad cannot
       split Send/Donate or input+Paste at 8px. WCAG 2.5.8 + Material 48. */
    return [
      '#dasha-faucet,.faucet-root{color:#f4eddb;font:16px/1.45 Arial,Helvetica,sans-serif;display:flex;flex-direction:column;align-items:center;width:100%;box-sizing:border-box;padding:0 0 2rem}',
      '.faucet-go,.faucet-back,.faucet-q,.faucet-send,.faucet-fill{font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}',
      '.faucet-frame{position:relative;width:100%;margin:0 0 4px}',
      '.faucet-hero{display:block;width:100%;height:auto;max-height:min(34svh,240px);background:#070608;object-fit:contain;cursor:pointer;box-shadow:8px 8px 0 #ff3b81}',
      '.faucet-tick{position:absolute;width:14px;height:14px;border-color:#dfff00;border-style:solid;pointer-events:none;z-index:2}',
      '.faucet-tick:nth-child(1){top:-6px;left:-6px;border-width:2px 0 0 2px}',
      '.faucet-tick:nth-child(2){top:-6px;right:-6px;border-width:2px 2px 0 0}',
      '.faucet-tick:nth-child(3){bottom:-6px;left:-6px;border-width:0 0 2px 2px}',
      '.faucet-tick:nth-child(4){bottom:-6px;right:-6px;border-width:0 2px 2px 0}',
      '.faucet-card{display:grid;gap:18px;max-width:400px;width:min(400px,calc(100vw - 32px));justify-items:stretch;margin:0 auto;padding:4px 0 8px}',
      '.faucet-q{margin:0;font-size:clamp(26px,6vw,38px);line-height:1.08;text-align:center}',
      '.faucet-note{margin:0;color:rgba(244,237,219,.78);font:15px/1.5 Arial,Helvetica,sans-serif;text-align:center}',
      '.faucet-go,.faucet-back,.faucet-fill{min-height:52px;min-width:52px;width:100%;padding:0 18px;border:1px solid #dfff00;background:#dfff00;color:#070608;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;box-shadow:4px 4px 0 #ff3b81}',
      '.faucet-back,.faucet-fill{background:#f4eddb;color:#070608;border-color:#f4eddb}',
      '.faucet-go:hover,.faucet-go:focus-visible,.faucet-back:hover,.faucet-back:focus-visible,.faucet-fill:hover,.faucet-fill:focus-visible{color:#070608;outline:3px solid #f4eddb;outline-offset:3px}',
      '.faucet-go:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}',
      '.faucet-send{min-height:56px;font-size:1.12rem}',
      '.faucet-nav,.faucet-actions,.faucet-row{display:flex;flex-direction:column;gap:16px;width:100%;align-items:stretch}',
      '#dasha-faucet,#faucet{padding-bottom:2rem!important}',
      '.faucet-door{justify-items:stretch}',
      '.faucet-ca,.faucet-mono{margin:0;padding:14px 16px;border:1px solid rgba(244,237,219,.28);border-radius:2px;font:14px/1.45 Fragment Mono,ui-monospace,Menlo,Consolas,monospace;word-break:break-all;overflow-wrap:anywhere;user-select:all;color:#f4eddb;text-align:left}',
      '.faucet-warn{color:#ff3b81}',
      '.faucet-label{display:block;margin:0 0 8px;color:rgba(244,237,219,.72);font:12px/1.3 Arial,Helvetica,sans-serif;font-weight:800;letter-spacing:.06em;text-transform:uppercase;text-align:left}',
      '.faucet-field{display:grid;gap:8px;width:100%}',
      '.faucet-root input{width:100%;min-height:52px;padding:12px 14px;box-sizing:border-box;background:#070608;color:#f4eddb;border:1px solid #dfff00;font:15px/1.4 Fragment Mono,ui-monospace,Menlo,Consolas,monospace}',
      '.faucet-hole{width:36px;height:36px;border-radius:50%;margin:0 auto;background:#070608;box-shadow:inset 0 0 0 3px #dfff00}',
      '@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}'
    ].join('');
  }

  function labeledInput(id, labelText, attrs) {
    var wrap = el('div', 'faucet-field');
    var input = el('input');
    input.id = id;
    input.setAttribute('aria-label', labelText || 'Wallet');
    Object.keys(attrs || {}).forEach(function(k) {
      if (k === 'maxLength') input.maxLength = attrs[k];
      else input.setAttribute(k, attrs[k]);
    });
    if (labelText) {
      var lab = el('label', 'faucet-label', labelText);
      lab.setAttribute('for', id);
      wrap.appendChild(lab);
    }
    wrap.appendChild(input);
    return {
      wrap: wrap,
      input: input
    };
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
      card: 0,
      me: null,
      status: null,
      dest: '',
      destDraft: '',
      kind: '',
      sent: null,
      last4Ok: false,
      holdCard: false,
      destError: '',
      fail: '',
      fillMiss: '',
      fillOk: ''
    };
    var xPopup = null;
    var xTimer = 0;
    var sendTimer = 0;

    function last4Of(addr) {
      return String(addr || '').slice(-4);
    }

    function openDest() {
      state.holdCard = false;
      if (state.dest) {
        state.card = 2;
        if (state.kind !== 'PASTED') state.last4Ok = true;
      } else {
        state.card = 1;
      }
      paint();
    }

    function hero(clickable) {
      var frame = el('div', 'faucet-frame');
      for (var i = 0; i < 4; i++) frame.appendChild(el('i', 'faucet-tick'));
      var img = el('img', 'faucet-hero');
      img.src = stillUrl;
      img.alt = 'Dasha tip faucet';
      img.width = 1024;
      img.height = 1024;
      img.fetchPriority = 'high';
      if (stillSri) {
        img.setAttribute('integrity', stillSri);
        img.crossOrigin = 'anonymous';
      }
      if (clickable) {
        img.addEventListener('click', openDest);
      }
      frame.appendChild(img);
      return frame;
    }

    function fillError(code) {
      var shown = humanError(code);
      if (shown === 'link X') return 'link X';
      if (shown === 'already in' || shown === 'already' || shown === 'already claimed') return 'already in';
      if (shown === 'sig miss' || code === 'sig miss') return 'sig miss';
      if (shown === 'jar empty' || shown === 'empty') return 'jar empty';
      return shown;
    }

    function openFill() {
      state.holdCard = true;
      state.card = 6;
      state.fillMiss = '';
      state.fillOk = '';
      paint();
    }

    function fillCard() {
      var box = el('div', 'faucet-card faucet-door');
      box.appendChild(backTo(0));
      box.appendChild(el('p', 'faucet-q', 'Donate'));
      box.appendChild(el('p', 'faucet-note', 'Send $dasha to this tip jar. Then paste the transaction signature. 1 simp point per 1,000 $dasha after Check. Not a purchase.'));
      var treas = (state.status && state.status.treasury) || TREASURY;
      if (treas) {
        box.appendChild(el('p', 'faucet-ca', treas));
        var copy = el('button', 'faucet-back', 'Copy address');
        copy.type = 'button';
        copy.addEventListener('click', function() {
          function ok() { copy.textContent = 'Copied'; setTimeout(function() { copy.textContent = 'Copy address'; }, 1200); }
          function miss() { copy.textContent = 'Select'; setTimeout(function() { copy.textContent = 'Copy address'; }, 1600); }
          function withTimeout(p, ms) {
            return Promise.race([p, new Promise(function(_, reject) {
              setTimeout(function() { reject(new Error('copy-timeout')); }, ms);
            })]);
          }
          function afterWrite() {
            if (navigator.clipboard && navigator.clipboard.readText) {
              withTimeout(navigator.clipboard.readText(), 800).then(function(got) {
                if (destCopiedOk(got, treas)) ok(); else miss();
              }).catch(miss);
            } else miss();
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            withTimeout(navigator.clipboard.writeText(treas), 800).then(afterWrite).catch(miss);
          } else miss();
        });
        box.appendChild(copy);
      }
      var sig = labeledInput('dasha-faucet-sig', 'Transaction signature', {
        autocomplete: 'off',
        spellcheck: 'false'
      });
      sig.input.setAttribute('aria-label', 'Transaction signature');
      sig.input.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        credit(sig.input.value, check);
      });
      var actions = el('div', 'faucet-actions');
      var paste = el('button', 'faucet-back', 'Paste');
      paste.type = 'button';
      paste.addEventListener('click', function() {
        pasteSig(sig.input, check);
      });
      var check = el('button', 'faucet-go', 'Check');
      check.type = 'button';
      check.addEventListener('click', function() {
        credit(sig.input.value, check);
      });
      actions.appendChild(paste);
      actions.appendChild(check);
      box.appendChild(sig.wrap);
      box.appendChild(actions);
      if (state.fillMiss) box.appendChild(el('p', 'faucet-q faucet-warn', state.fillMiss));
      return box;
    }

    function pasteSig(input, btn) {
      function go(text) {
        if (text) input.value = String(text).trim();
        credit(input.value, btn);
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(go).catch(function() {
          go(input.value);
        });
        return;
      }
      go(input.value);
    }

    function credit(signature, btn) {
      if (btn) btn.disabled = true;
      fetchJson(base + '/faucet/donate', {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signature: String(signature || '').trim()
        })
      }).then(function(res) {
        if (btn) btn.disabled = false;
        if (res.data && res.data.ok && res.data.awarded) {
          state.fillMiss = '';
          state.fillOk = '+simp';
          state.card = 0;
          paint();
          return;
        }
        if (res.data && res.data.ok && res.data.replay && !res.data.awarded && !res.data.error) {
          state.fillMiss = fillError('already');
          paint();
          return;
        }
        state.fillMiss = fillError((res.data && (res.data.error || (res.data.duplicate && 'already') || (res.data.dust && 'sig miss') || (res.data.capped && 'capped'))) || 'sig miss');
        paint();
      }).catch(function() {
        if (btn) btn.disabled = false;
        state.fillMiss = 'try again';
        paint();
      });
    }

    function jarEmpty() {
      return !state.status || state.status.funded !== true;
    }

    function door() {
      var empty = jarEmpty();
      var box = el('div', 'faucet-card faucet-door');
      box.appendChild(hero(!empty));
      if (empty) {
        box.appendChild(el('p', 'faucet-q', 'jar empty'));
        box.appendChild(el('p', 'faucet-note', 'One tip when the jar is full. Donate to refill. Not a farm.'));
      } else {
        var n = state.status && state.status.amountUi ? Number(state.status.amountUi) : 100;
        box.appendChild(el('p', 'faucet-note', 'One tip of ' + n + ' $dasha. Link X, then prove your wallet. Not a farm.'));
      }
      var nav = el('div', 'faucet-nav');
      var send = el('button', 'faucet-go faucet-send', 'free $dasha');
      send.type = 'button';
      send.setAttribute('aria-label', 'free $dasha');
      if (empty) {
        send.disabled = true;
        send.setAttribute('aria-disabled', 'true');
      } else {
        send.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          openDest();
        });
      }
      var fill = el('button', 'faucet-back faucet-fill', 'Donate');
      fill.type = 'button';
      fill.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openFill();
      });
      nav.appendChild(send);
      nav.appendChild(fill);
      box.appendChild(nav);
      if (state.fillOk) box.appendChild(el('p', 'faucet-q', state.fillOk));
      return box;
    }

    function backTo(n) {
      var b = el('button', 'faucet-back', 'Back');
      b.type = 'button';
      b.addEventListener('click', function() {
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
      var keepFocus = stage.contains(document.activeElement);
      stage.innerHTML = '';
      paintCard();
      if (!keepFocus) return;
      var dest = stage.querySelector('#dasha-faucet-dest');
      if (dest) {
        dest.focus();
        return;
      }
      var ctl = stage.querySelector('button.faucet-go, button:not(.faucet-back), a[href]');
      if (ctl) ctl.focus();
    }

    function stopSendPoll() {
      if (sendTimer) {
        clearInterval(sendTimer);
        sendTimer = 0;
      }
    }

    function startSendPoll() {
      if (sendTimer) return;
      sendTimer = setInterval(function() {
        claim(true);
      }, 2000);
    }

    function paintCard() {
      if (state.card !== 3) stopSendPoll();
      if (state.me && state.me.claimed) {
        var claimed = stub(state.me.dest || state.dest);
        claimed.appendChild(el('p', 'faucet-q', 'already claimed'));
        if (state.me.nextAt) {
          var when = new Date(Number(state.me.nextAt));
          if (!isNaN(when.getTime())) {
            claimed.appendChild(el('p', 'faucet-note', 'Next tip after ' + when.toISOString().slice(0, 10) + '.'));
          }
        }
        if (state.me.signature) claimed.appendChild(solscanLink(state.me.signature));
        stage.appendChild(claimed);
        return;
      }
      if (state.me && state.me.confirming && !state.holdCard && state.card !== 1 && state.card !== 2 && state.card !== 5 && state.card !== 6) {
        state.card = 3;
      }
      if (state.card === 0) {
        stage.appendChild(door());
        return;
      }
      if (state.card === 6) {
        stage.appendChild(fillCard());
        return;
      }
      if (state.card === 1 && state.dest) {
        state.card = 2;
        if (state.kind !== 'PASTED') state.last4Ok = true;
      }
      if (state.card === 1) {
        var destCard = el('div', 'faucet-card faucet-door');
        destCard.appendChild(backTo(0));
        destCard.appendChild(el('p', 'faucet-note', 'Link X, then your wallet. Not a farm.'));
        if (!state.me || !state.me.linked) {
          var x = el('button', 'faucet-go', 'Link X');
          x.type = 'button';
          x.addEventListener('click', function() {
            startX();
          });
          destCard.appendChild(x);
        }
        if (!state.dest) {
          var destForm = el('form', 'faucet-actions');
          destForm.addEventListener('submit', function(e) {
            e.preventDefault();
            bindPaste(destField.input.value, '');
          });
          var destField = labeledInput('dasha-faucet-dest', 'Solana address', {
            autocomplete: 'off',
            spellcheck: 'false'
          });
          destField.input.setAttribute('aria-label', 'Wallet');
          destField.input.value = state.destDraft || '';
          destField.input.addEventListener('input', function() {
            state.destDraft = destField.input.value;
          });
          destField.input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              bindPaste(destField.input.value, '');
            }
          });
          destForm.appendChild(destField.wrap);
          var paste = el('button', 'faucet-back', 'Paste address');
          paste.type = 'button';
          paste.addEventListener('click', function() {
            pasteDest(destField.input);
          });
          destForm.appendChild(paste);
          var siws = el('button', 'faucet-go', 'Prove wallet');
          siws.type = 'button';
          siws.addEventListener('click', function() {
            bindSiws(siws);
          });
          destForm.appendChild(siws);
          destCard.appendChild(destForm);
        }
        if (state.destError) destCard.appendChild(showErr(state.destError));
        stage.appendChild(destCard);
        return;
      }
      if (state.card === 2) {
        var sendCard = el('div', 'faucet-card faucet-door');
        sendCard.appendChild(backTo(1));
        sendCard.appendChild(el('p', 'faucet-q', last4Of(state.dest)));
        var tipN = state.status && state.status.amountUi ? Number(state.status.amountUi) : 100;
        sendCard.appendChild(el('p', 'faucet-note', state.kind === 'IS_WALLET'
          ? 'This last 4 is a typo check, not proof. Check the whole address. Tip me sends ' + tipN + ' $dasha there.'
          : 'This last 4 is a typo check, not proof. Prove the wallet before a tip. Paste alone cannot spend the jar.'));
        var pasteGate = state.kind === 'PASTED' && !state.last4Ok;
        var retype = null;
        if (pasteGate) {
          retype = labeledInput('dasha-faucet-last4-retype', 'Retype last 4', {
            autocomplete: 'off',
            maxLength: 4
          });
          retype.input.setAttribute('aria-label', 'Last 4');
          retype.input.addEventListener('input', function() {
            var four = String(retype.input.value || '').trim();
            if (four.length < 4) return;
            if (last4Of(state.dest) === four) {
              state.last4Ok = true;
              state.destError = '';
              paint();
              return;
            }
            showDestError('last-4 does not match');
          });
          retype.input.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            var four = String(retype.input.value || '').trim();
            if (last4Of(state.dest) === four) {
              state.last4Ok = true;
              state.destError = '';
              paint();
              return;
            }
            showDestError('last-4 does not match');
          });
          sendCard.appendChild(retype.wrap);
        }
        if (state.kind !== 'IS_WALLET') {
          var prove = el('button', 'faucet-go', 'Prove wallet');
          prove.type = 'button';
          prove.addEventListener('click', function() {
            bindSiws(prove);
          });
          sendCard.appendChild(prove);
        } else {
          var send = el('button', 'faucet-go', 'tip me');
          send.type = 'button';
          send.addEventListener('click', function() {
            if (state.kind === 'PASTED' && !state.last4Ok) {
              var four = retype ? String(retype.input.value || '').trim() : '';
              if (last4Of(state.dest) !== four) {
                showDestError('last-4 does not match');
                return;
              }
              state.last4Ok = true;
            }
            state.card = 3;
            paint();
            claim();
          });
          sendCard.appendChild(send);
        }
        if (state.destError) sendCard.appendChild(showErr(state.destError));
        if (state.fail) sendCard.appendChild(showErr(state.fail));
        stage.appendChild(sendCard);
        return;
      }
      if (state.card === 3) {
        var sending = el('div', 'faucet-card faucet-door');
        sending.appendChild(backTo(2));
        sending.appendChild(el('p', 'faucet-q', 'confirming'));
        startSendPoll();
        stage.appendChild(sending);
        return;
      }
      if (state.card === 5) {
        var fail = el('div', 'faucet-card');
        fail.appendChild(backTo(2));
        fail.appendChild(showErr(state.fail || 'claim failed.'));
        var retry = el('button', 'faucet-go', 'try again');
        retry.type = 'button';
        retry.addEventListener('click', function() {
          state.card = 2;
          state.fail = '';
          paint();
        });
        fail.appendChild(retry);
        stage.appendChild(fail);
        live.textContent = humanError(state.fail);
        return;
      }
      if (state.card === 4) {
        var sent = stub(state.sent && state.sent.dest || state.dest);
        sent.appendChild(el('p', 'faucet-q', 'tipped'));
        if (state.sent && state.sent.solscan && state.sent.signature) {
          sent.appendChild(solscanLink(state.sent.signature, state.sent.solscan));
        }
        stage.appendChild(sent);
      }
    }

    function walletSignIn(wallet) {
      if (wallet && typeof wallet.signIn === 'function') return function(input) {
        return wallet.signIn(input);
      };
      var feat = wallet && wallet.features && wallet.features['solana:signIn'];
      if (feat && typeof feat.signIn === 'function') return function(input) {
        return feat.signIn(input);
      };
      if (typeof feat === 'function') return feat;
      return null;
    }

    function decodeSignedMessage(value) {
      if (value == null) return '';
      if (typeof value === 'string') return value;
      try {
        return new TextDecoder().decode(value instanceof Uint8Array ? value : new Uint8Array(value));
      } catch (e) {
        return '';
      }
    }

    function bindSiws(btn) {
      if (!state.me || !state.me.linked) {
        showDestError('link X first');
        return;
      }
      var wallet = (global.phantom && global.phantom.solana) || global.solflare || global.solana;
      if (!wallet || !wallet.connect || (!wallet.signMessage && !walletSignIn(wallet))) {
        showDestError('dest_not_wallet');
        return;
      }
      btn.disabled = true;
      wallet.connect().then(function(connected) {
        var publicKey = wallet.publicKey || (connected && connected.publicKey);
        if (!publicKey) throw new Error('wallet returned no public key');
        publicKey = publicKey.toString();
        return fetchJson(base + '/faucet/wallet/challenge', {
          method: 'POST',
          credentials: 'include',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            publicKey: publicKey
          })
        }).then(function(res) {
          return {
            res: res,
            publicKey: publicKey
          };
        });
      }).then(function(pair) {
        if (pair.res.status === 501 || pair.res.status === 503) {
          btn.disabled = false;
          showDestError(pair.res.data && pair.res.data.error || 'not_configured');
          return;
        }
        var challenge = pair.res.data;
        if (!challenge || !challenge.ok) throw new Error((challenge && challenge.error) || 'invalid faucet challenge');
        var signIn = challenge.siws && walletSignIn(wallet);
        var signed = signIn ? signIn(challenge.siws) : wallet.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
        return Promise.resolve(signed).then(function(out) {
          if (Array.isArray(out)) out = out[0];
          var signature = out && (out.signature || out);
          if (signature && signature.signature) signature = signature.signature;
          if (!signature) throw new Error('invalid faucet challenge');
          var signedMessage = decodeSignedMessage(out && out.signedMessage) || challenge.message;
          return fetchJson(base + '/faucet/wallet/verify', {
            method: 'POST',
            credentials: 'include',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              challenge: challenge.challenge,
              publicKey: pair.publicKey,
              signature: toBase58(signature),
              signedMessage: signedMessage
            })
          });
        });
      }).then(function(res) {
        btn.disabled = false;
        if (!res) return;
        if (!res.data || !res.data.ok) {
          showDestError((res.data && res.data.error) || 'invalid faucet challenge');
          return;
        }
        state.dest = res.data.dest;
        state.kind = res.data.kind || 'IS_WALLET';
        state.last4Ok = true;
        state.destError = '';
        state.card = 2;
        paint();
      }).catch(function(err) {
        btn.disabled = false;
        showDestError(err && err.message);
      });
    }

    function showDestError(code) {
      state.destError = code;
      live.textContent = humanError(code);
      paint();
    }

    function pasteDest(destInput) {
      function go(text) {
        if (text) destInput.value = String(text).trim();
        bindPaste(destInput.value, '');
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(go).catch(function() {
          go(destInput.value);
        });
        return;
      }
      go(destInput.value);
    }

    function bindPaste(dest, four) {
      dest = String(dest || '').trim();
      four = String(four || '').trim();
      var shape = destShapeError(dest, four);
      if (shape) {
        showDestError(shape);
        return;
      }

      function takeDest(destAddr, kind) {
        state.dest = destAddr;
        state.kind = kind || 'PASTED';
        state.last4Ok = false;
        state.destError = '';
        state.card = 2;
        paint();
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
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dest: dest,
            last4: four,
            paste: true
          })
        }).then(function(res) {
          if (!res.data || !res.data.ok) {
            showDestError((res.data && res.data.error) || 'dest_not_wallet');
            return;
          }
          takeDest(res.data.dest, res.data.kind || 'PASTED');
        });
      }
      fetchJson(base + '/faucet/dest-check', {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dest: dest,
          last4: four
        })
      }).then(function(res) {
        var err = res.data && res.data.error;
        if (err || (res.data && res.data.ok === false)) {
          showDestError(err || 'dest_not_wallet');
          return;
        }
        if (!res.data || res.data.ok !== true) {
          showDestError('dest_not_wallet');
          return;
        }
        return afterWallet();
      }).catch(function() {
        showDestError('dest_not_wallet');
      });
    }

    function claim(quiet) {
      fetchJson(base + '/faucet/claim', {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dest: state.dest || ''
        })
      }).then(function(res) {
        if (res.status === 200 && res.data && res.data.ok && res.data.signature) {
          stopSendPoll();
          state.sent = res.data;
          if (res.data.replay) {
            state.me = Object.assign({}, state.me, {
              claimed: true,
              signature: res.data.signature,
              dest: res.data.dest || state.dest
            });
            paint();
            return;
          }
          state.card = 4;
          paint();
          return;
        }
        if (res.data && res.data.error === 'already claimed' && res.data.signature) {
          stopSendPoll();
          state.me = Object.assign({}, state.me, {
            claimed: true,
            signature: res.data.signature,
            dest: res.data.dest || state.dest
          });
          paint();
          return;
        }
        if (res.data && res.data.error === 'confirming' && res.data.signature) {
          state.sent = res.data;
          state.card = 3;
          if (!quiet) paint();
          else startSendPoll();
          return;
        }
        stopSendPoll();
        state.fail = humanError((res.data && res.data.error) || ('claim ' + res.status));
        state.card = 5;
        paint();
      }).catch(function() {
        stopSendPoll();
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

    function refreshMe(mode) {
      return fetchJson(base + '/faucet/me', {
        credentials: 'include',
        mode: 'cors'
      }).then(function(res) {
        var prevLinked = state.me && state.me.linked;
        var prevClaimed = state.me && state.me.claimed;
        state.me = res.data || {};
        if (state.me.dest) state.dest = state.me.dest;
        var linkedFlip = prevLinked !== state.me.linked;
        var claimedNow = state.me.claimed && !prevClaimed;
        if (mode === 'poll' && !linkedFlip && !claimedNow && state.card !== 3) return state.me;
        if (state.me.claimed) {
          state.card = 4;
          if (state.me.signature) {
            state.sent = state.sent || {
              signature: state.me.signature,
              dest: state.me.dest
            };
          }
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
        showDestError('link X first');
        return;
      }
      if (xTimer) clearInterval(xTimer);
      xTimer = setInterval(function() {
        if (xPopup && xPopup.closed) {
          stopXPoll();
          refreshMe();
          return;
        }
        refreshMe('poll');
      }, 2000);
    }

    function onX(ev) {
      if (!ev || !ev.data || ev.data.type !== 'dasha-x-linked') return;
      refreshMe();
    }

    function onVis() {
      if (xPopup && !xPopup.closed) refreshMe('poll');
    }
    window.addEventListener('message', onX);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    paint();
    Promise.all([fetchJson(base + '/faucet/status', {
      credentials: 'include',
      mode: 'cors'
    }), fetchJson(base + '/faucet/me', {
      credentials: 'include',
      mode: 'cors'
    })]).then(function(pair) {
      state.status = pair[0].data || {};
      if (pair[0].status === 501) state.status = {
        configured: false,
        error: 'not_configured'
      };
      state.me = pair[1].data || {};
      if (state.me.dest) state.dest = state.me.dest;
      paint();
    }).catch(function() {
      state.status = {
        configured: false,
        error: 'not_configured'
      };
      paint();
    });
    return {
      destroy: function() {
        stopXPoll();
        stopSendPoll();
        window.removeEventListener('message', onX);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('focus', onVis);
        root.innerHTML = '';
      }
    };
  }
  var api = {
    mount: mount,
    MINT: MINT,
    destShapeError: destShapeError,
    humanError: humanError
  };
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
