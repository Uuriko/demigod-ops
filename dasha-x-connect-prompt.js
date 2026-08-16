/**
 * Site-wide optional X connect prompt.
 * Shows after a short delay + slight scroll — not on first paint.
 * Skip if already linked or user dismissed. Opens lobby OAuth popup.
 */
(function (global) {
  'use strict';
  var API = 'https://lobby.getdasha.com';
  var LS_DISMISS = 'dasha_x_prompt_v1';
  var LS_DISMISS_UNTIL = 'dasha_x_prompt_until_v1';
  var DISMISS_DAYS = 14;
  var SCROLL_PX = 140;
  var MIN_MS = 900;
  var MAX_WAIT_MS = 8000;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function dismissed() {
    try {
      if (localStorage.getItem(LS_DISMISS) === '1') return true;
      var until = Number(localStorage.getItem(LS_DISMISS_UNTIL) || 0);
      if (until && until > Date.now()) return true;
      if (until && until <= Date.now()) localStorage.removeItem(LS_DISMISS_UNTIL);
    } catch (e) {}
    return false;
  }

  function markDismiss(long) {
    try {
      if (long) localStorage.setItem(LS_DISMISS, '1');
      else localStorage.setItem(LS_DISMISS_UNTIL, String(Date.now() + DISMISS_DAYS * 864e5));
    } catch (e) {}
  }

  function apiBase() {
    try {
      var host = location.hostname || '';
      if (/getdasha\.com$/i.test(host) || host === 'localhost' || host === '127.0.0.1') return API;
    } catch (e) {}
    return API;
  }

  function checkLinked() {
    return fetch(apiBase() + '/oauth/x/status', {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store',
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        return {
          configured: Boolean(data && data.configured),
          linked: Boolean(data && data.linked),
          handle: data && data.x && data.x.handle ? data.x.handle : null,
        };
      })
      .catch(function () {
        return { configured: true, linked: false, handle: null };
      });
  }

  function css() {
    return (
      '.dasha-x-prompt{position:fixed;inset:0;z-index:92;display:grid;place-items:center;padding:16px;background:rgba(7,6,8,.72);backdrop-filter:blur(6px)}' +
      '.dasha-x-prompt-card{width:min(440px,100%);padding:22px 20px 18px;border:2px solid #dfff00;border-radius:16px;background:#120c18;color:#f4eddb;box-shadow:12px 12px 0 #7c4dff;display:grid;gap:12px;font:16px/1.45 Arial,Helvetica,sans-serif}' +
      '.dasha-x-prompt-kicker{margin:0;font-size:11px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:#dfff00}' +
      '.dasha-x-prompt-card h2{margin:0;font-size:clamp(22px,5vw,30px);line-height:1.05;letter-spacing:-.03em;text-transform:uppercase;font-family:"Arial Black",Arial,sans-serif}' +
      '.dasha-x-prompt-card p{margin:0;font-size:15px;line-height:1.45;color:#e6dcc4}' +
      '.dasha-x-prompt-list{margin:0;padding:0 0 0 1.1rem;color:#e6dcc4;font-size:14px;line-height:1.45}' +
      '.dasha-x-prompt-list li{margin:0 0 6px}' +
      '.dasha-x-prompt-list strong{color:#f4eddb}' +
      '.dasha-x-prompt-note{font-size:13px!important;color:#a99faf!important}' +
      '.dasha-x-prompt-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}' +
      '.dasha-x-prompt-actions button{min-height:48px;padding:0 18px;border-radius:999px;font:inherit;font-weight:950;font-size:12px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}' +
      '.dasha-x-prompt-primary{border:1px solid #dfff00;background:#dfff00;color:#070608}' +
      '.dasha-x-prompt-primary:hover{filter:brightness(1.05)}.dasha-x-prompt-primary:disabled{opacity:.55;cursor:not-allowed;filter:none}' +
      '.dasha-x-prompt-skip{border:1px solid rgba(244,237,219,.35);background:transparent;color:#f4eddb}' +
      '.dasha-x-prompt-skip:hover{border-color:#dfff00;color:#dfff00}' +
      '.dasha-x-prompt-primary:focus-visible,.dasha-x-prompt-skip:focus-visible{outline:3px solid #dfff00;outline-offset:3px}' +
      '.dasha-x-prompt-status{margin:0;min-height:1.2em;font-size:13px;font-weight:700;color:#a99faf}' +
      '.dasha-x-prompt-status[data-kind=ok]{color:#dfff00}.dasha-x-prompt-status[data-kind=bad]{color:#ff3b81}.dasha-x-prompt-status[data-kind=warn]{color:#ffc857}' +
      'html.dasha-x-prompt-open .buy-sticky{display:none!important}' +
      '@media(prefers-reduced-motion:reduce){.dasha-x-prompt{backdrop-filter:none}}'
    );
  }

  function openPrompt(state) {
    if (document.getElementById('dasha-x-prompt')) return;
    var root = el('div', 'dasha-x-prompt');
    root.id = 'dasha-x-prompt';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'dasha-x-prompt-title');
    var style = document.createElement('style');
    style.textContent = css();
    root.appendChild(style);
    var card = el('div', 'dasha-x-prompt-card');
    card.appendChild(el('p', 'dasha-x-prompt-kicker', 'Optional · one identity'));
    var h = el('h2', '', 'Connect X?');
    h.id = 'dasha-x-prompt-title';
    card.appendChild(h);
    card.appendChild(
      el(
        'p',
        '',
        'Link your X once. Dasha uses it as your public identity across the site — it does not post for you.',
      ),
    );
    var list = el('ul', 'dasha-x-prompt-list');
    var items = [
      ['Simp Board', 'Join the board, take the quiz, keep your score, share your row.'],
      ['Lobby', 'Handle + avatar, longer messages, reserved seats when full.'],
      ['Tip faucet', 'One tip per real X + wallet (stops pure wallet farms).'],
      ['Chess', 'Queue as yourself; public replays show handles.'],
    ];
    items.forEach(function (pair) {
      var li = el('li', '');
      var s = el('strong', '', pair[0]);
      li.appendChild(s);
      li.appendChild(document.createTextNode(' — ' + pair[1]));
      list.appendChild(li);
    });
    card.appendChild(list);
    card.appendChild(
      el('p', 'dasha-x-prompt-note', 'Skip anytime. You can connect later from Lobby, Simp, or Faucet.'),
    );
    var actions = el('div', 'dasha-x-prompt-actions');
    var primary = el('button', 'dasha-x-prompt-primary', 'Connect X');
    primary.type = 'button';
    var skip = el('button', 'dasha-x-prompt-skip', 'Not now');
    skip.type = 'button';
    actions.appendChild(primary);
    actions.appendChild(skip);
    card.appendChild(actions);
    var status = el('p', 'dasha-x-prompt-status', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    card.appendChild(status);
    root.appendChild(card);
    document.body.appendChild(root);
    try {
      document.documentElement.classList.add('dasha-x-prompt-open');
    } catch (e) {}

    function setStatus(t, kind) {
      status.textContent = t || '';
      status.dataset.kind = kind || '';
    }
    function close(longDismiss) {
      markDismiss(Boolean(longDismiss));
      document.removeEventListener('keydown', onKey);
      if (root.parentNode) root.parentNode.removeChild(root);
      try {
        document.documentElement.classList.remove('dasha-x-prompt-open');
      } catch (e) {}
    }
    function onKey(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        close(false);
      }
    }
    document.addEventListener('keydown', onKey);
    skip.addEventListener('click', function () {
      close(false);
    });
    root.addEventListener('click', function (ev) {
      if (ev.target === root) close(false);
    });
    primary.addEventListener('click', function () {
      if (!state.configured) {
        setStatus('X link is not configured on the server yet', 'warn');
        return;
      }
      setStatus('Complete X link in the popup…', 'warn');
      var w = window.open(apiBase() + '/oauth/x/start', 'dasha_x', 'width=520,height=700');
      if (!w) {
        setStatus('Allow popups to connect X', 'warn');
        return;
      }
      primary.disabled = true;
    });
    function onMsg(ev) {
      if (!ev || !ev.data || ev.data.type !== 'dasha-x-linked') return;
      var okOrigin =
        ev.origin === 'https://lobby.getdasha.com' ||
        ev.origin === apiBase() ||
        ev.origin === 'https://www.getdasha.com' ||
        ev.origin === 'https://getdasha.com';
      if (!okOrigin) return;
      setStatus(ev.data.handle ? 'Connected as @' + ev.data.handle : 'Connected', 'ok');
      markDismiss(true);
      setTimeout(function () {
        close(true);
        window.removeEventListener('message', onMsg);
        // Soft refresh identity surfaces if present
        try {
          if (global.DashaSimpBoard && typeof global.DashaSimpBoard === 'object') {
            /* board remounts on its own via message handlers when loaded */
          }
        } catch (e) {}
      }, 700);
    }
    window.addEventListener('message', onMsg);
    try {
      primary.focus();
    } catch (e) {}
  }

  function arm() {
    if (dismissed()) return;
    var started = Date.now();
    var scrolled = false;
    var shown = false;
    function maybeShow() {
      if (shown || dismissed()) return;
      var waited = Date.now() - started >= MIN_MS;
      var deepEnough = scrolled || window.scrollY >= SCROLL_PX;
      var forced = Date.now() - started >= MAX_WAIT_MS;
      if (!waited) return;
      if (!deepEnough && !forced) return;
      shown = true;
      cleanup();
      checkLinked().then(function (st) {
        if (dismissed()) return;
        if (st.linked) {
          markDismiss(true);
          return;
        }
        openPrompt(st);
      });
    }
    function onScroll() {
      if (window.scrollY >= SCROLL_PX) scrolled = true;
      maybeShow();
    }
    function cleanup() {
      window.removeEventListener('scroll', onScroll, { passive: true });
      clearInterval(tick);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    var tick = setInterval(maybeShow, 200);
    // If user never scrolls, still show once near the top of the session (after MAX_WAIT).
    onScroll();
  }

  function boot() {
    if (dismissed()) return;
    // Avoid double-mount with simp gate if that ever enables on same page.
    if (document.documentElement.classList.contains('simp-gate-open')) return;
    arm();
  }

  global.DashaXConnectPrompt = { boot: boot, open: function () {
    checkLinked().then(openPrompt);
  } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : this);
