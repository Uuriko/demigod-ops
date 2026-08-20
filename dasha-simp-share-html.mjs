/** Live overlay share HTML (2026-08-16). Worker does not import this yet — Codex holds the file.
 *  Wire: productEdge GET /simp → simpPageHtml(); DO GET /simp/r/:id → simpResultHtml();
 *        GET /?challenge=id → 308 challengeRedirectPath(); GET /quiz → 308 /simp.
 *  Pin must stay LIVE_SIMP_BOARD_SRI unless home + /simp are re-pinned in the same ship.
 */
export const WWW = 'https://www.getdasha.com';
export const LOBBY = 'https://lobby.getdasha.com';
export const LIVE_SIMP_BOARD_SRI =
  'sha384-1NLJlsSnRE8jxRGWYFnrM0hqGIxv9z4oDa1Lh8AHdcrG5L4KE/eUAtCJ3qMPnoLU';
export const SOCIAL_CARD = `${LOBBY}/og/dasha-social-card.png`;
export const RESULT_ID_RE = /^[A-Za-z0-9_-]{6,32}$/;
export const RETIRED_SEO_PATHS = new Set([
  '/airdrop', '/airdrop/', '/earn', '/earn/', '/claim', '/claim/', '/rally', '/rally/',
]);
const JUP =
  'https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

export function challengeRedirectPath(search) {
  const raw = search instanceof URLSearchParams
    ? search.get('challenge')
    : new URLSearchParams(String(search || '').replace(/^\?/, '')).get('challenge');
  const id = String(raw || '');
  return RESULT_ID_RE.test(id) ? `/simp/r/${id}` : null;
}

export function isRetiredSeoPath(pathname) {
  return RETIRED_SEO_PATHS.has(String(pathname || ''));
}

export function quizRedirectPath() {
  return '/simp';
}

function ogBlock({ title, description, url, image, width, height }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  const img = escapeHtml(image);
  return [
    `<meta property="og:type" content="website"><meta property="og:site_name" content="getdasha"><meta property="og:url" content="${u}">`,
    `<meta property="og:title" content="${t}"><meta property="og:description" content="${d}">`,
    `<meta property="og:image" content="${img}"><meta property="og:image:secure_url" content="${img}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="${width}"><meta property="og:image:height" content="${height}"><meta property="og:image:alt" content="${t}">`,
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@dash_eats"><meta name="twitter:title" content="${t}"><meta name="twitter:description" content="${d}"><meta name="twitter:image" content="${img}"><meta name="twitter:image:alt" content="${t}">`,
  ].join('\n');
}

export function simpPageHtml({ sri = LIVE_SIMP_BOARD_SRI } = {}) {
  const title = '$dasha / Beat this';
  const url = `${WWW}/simp`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="canonical" href="${url}">
<meta name="description" content="Beat this">
<meta name="theme-color" content="#dfff00">
${ogBlock({ title, description: 'Beat this', url, image: SOCIAL_CARD, width: 1200, height: 630 })}
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}html,body{margin:0;min-height:100%;background:var(--ink);color:var(--paper);font:16px/1.45 Arial,Helvetica,sans-serif}h1{margin:0 0 .5rem;font:900 clamp(3rem,12vw,6rem)/.9 "Arial Black",Arial,Helvetica,sans-serif}a{color:var(--acid)}.skip-link{position:absolute;left:-9999px;top:0;z-index:100;padding:12px 16px;background:var(--acid);color:var(--ink)!important;font-weight:900;text-decoration:none}.skip-link:focus{left:12px;top:12px;outline:3px solid var(--paper);outline-offset:2px}.dasha-slim{display:flex;align-items:center;gap:.65rem;padding:.45rem 1rem}.dasha-word{display:inline-flex;align-items:center;min-height:48px;color:#f4eddb;font:900 1.15rem/1 "Arial Black",Helvetica,Arial,sans-serif;letter-spacing:-.04em;text-decoration:none;text-transform:uppercase}.buy-dasha{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 1rem;background:#dfff00;color:#070608;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;text-decoration:none;text-transform:uppercase}#dasha-quiz{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--acid)}.simp-lede{margin:0 0 1.25rem;font:900 clamp(1.35rem,3.4vw,2rem)/1.15 "Arial Black",Helvetica,Arial,sans-serif}.simp-quiz-go{display:inline-flex;align-items:center;justify-content:center;min-height:56px;min-width:12rem;padding:0 1.25rem;border:0;background:#dfff00;color:#070608;font:900 1rem/1 "Arial Black",Helvetica,Arial,sans-serif;box-shadow:4px 4px 0 #ff3b81;cursor:pointer}</style>
<body>
<a class="skip-link" href="#dasha-simp">Skip to quiz</a>
<header class="dasha-slim"><a class="dasha-word" href="${WWW}/">$dasha</a><a class="buy-dasha" href="${JUP}" target="_blank" rel="noopener noreferrer">Buy $dasha</a></header>
<main id="dasha-simp">
<h1>Simp</h1>
<div id="dasha-quiz" class="dasha-quiz"><div id="dasha-simp-board"><p class="simp-lede">How big of a Dasha simp are you?</p>
<button type="button" class="simp-quiz-go" data-dasha-take-quiz>Take Quiz</button>
<noscript><p>Needs JavaScript.</p></noscript></div></div>
<p><a href="${WWW}/how-to-buy">How to buy</a> · <a href="${WWW}/privacy">Privacy</a></p>
</main>
<script>(function(){var s=document.createElement('script');s.src='${LOBBY}/client/simp-board.js';s.integrity='${sri}';s.crossOrigin='anonymous';s.defer=true;document.head.appendChild(s)})();</script>
</body></html>`;
}

export function simpResultHtml({ id, title, correct, total, sri = LIVE_SIMP_BOARD_SRI }) {
  if (!RESULT_ID_RE.test(String(id || ''))) throw new Error('bad result id');
  const safeTitle = escapeHtml(title);
  const identity = `Beat ${Number(correct)}/${Number(total)} · ${safeTitle}`;
  const url = `${WWW}/simp/r/${id}`;
  const image = `${LOBBY}/simp/card/quiz.png`;
  const shareText = `${identity}\nBeat this\n$dasha\n${url}`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${identity}</title>
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#dfff00">
${ogBlock({ title: identity, description: 'Beat this', url, image, width: 1200, height: 628 })}
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}body{font:16px/1.45 Arial,Helvetica,sans-serif;background:var(--ink);color:var(--paper);max-width:28rem;margin:3rem auto;padding:0 1rem}a{color:var(--acid)}.skip-link{position:absolute;left:-9999px;top:0;z-index:100;padding:12px 16px;background:var(--acid);color:var(--ink)!important;font-weight:900;text-decoration:none}.skip-link:focus{left:12px;top:12px;outline:3px solid var(--paper);outline-offset:2px}h1{font-family:"Arial Black",Arial,Helvetica,sans-serif;font-weight:900;font-size:clamp(2rem,8vw,3.4rem);line-height:.95;margin:0 0 .75rem}.dasha-start,.dasha-share{display:inline-flex;align-items:center;justify-content:center;min-height:48px;background:var(--acid);color:var(--ink);border:0;padding:.55rem 1.1rem;font:900 1rem/1 "Arial Black",Arial,Helvetica,sans-serif;cursor:pointer;text-decoration:none}.dasha-start{margin:0 .6rem .75rem 0}</style>
<body>
<a class="skip-link" href="#dasha-simp">Skip to result</a>
<main id="dasha-simp">
<h1>${identity}</h1>
<div id="dasha-simp-board" data-simp-api="${LOBBY}" data-challenge="${escapeHtml(id)}"><button type="button" class="dasha-start" data-dasha-take-quiz>Start</button></div>
<button type="button" class="dasha-share" data-title="${identity}" data-text="${escapeHtml(shareText)}" data-url="${url}">Share</button>
<p><a href="${WWW}/">Back to Dasha</a> · <a href="${WWW}/how-to-buy">How to buy</a> · <a href="${WWW}/privacy">Privacy</a></p>
</main>
<script>(function(){var s=document.createElement('script');s.src='${LOBBY}/client/simp-board.js';s.integrity='${sri}';s.crossOrigin='anonymous';s.defer=true;document.head.appendChild(s)})();</script>
<script>(function(){var b=document.querySelector('.dasha-share');if(!b)return;function withTimeout(p,ms){return Promise.race([p,new Promise(function(_,rej){setTimeout(function(){rej(new Error('copy-timeout'))},ms)})])}b.addEventListener('click',function(){var title=b.getAttribute('data-title')||'';var text=b.getAttribute('data-text')||'';var url=b.getAttribute('data-url')||'';var copy=function(){var fallback=function(){try{var t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.cssText='position:fixed;left:-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}catch(e){}};if(navigator.clipboard&&navigator.clipboard.writeText){withTimeout(navigator.clipboard.writeText(text),800).catch(fallback);}else fallback();};if(navigator.share){navigator.share({title:title,text:text,url:url}).catch(function(err){if(!err||err.name!=='AbortError')copy();});}else copy();});}());</script>
</body></html>`;
}

export function privacyPageHtml() {
  const title = 'Privacy — $dasha';
  const url = `${WWW}/privacy`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="canonical" href="${url}">
<meta name="description" content="What Dasha stores, and how to leave.">
<meta name="theme-color" content="#dfff00">
${ogBlock({ title, description: 'What Dasha stores, and how to leave.', url, image: SOCIAL_CARD, width: 1200, height: 630 })}
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00}body{font:16px/1.45 Arial,Helvetica,sans-serif;background:var(--ink);color:var(--paper);max-width:36rem;margin:3rem auto;padding:0 1rem}a{color:var(--acid)}.skip-link{position:absolute;left:-9999px;top:0;z-index:100;padding:12px 16px;background:var(--acid);color:var(--ink)!important;font-weight:900;text-decoration:none}.skip-link:focus{left:12px;top:12px;outline:3px solid var(--paper);outline-offset:2px}h1{font:900 clamp(2rem,8vw,3.4rem)/.95 "Arial Black",Arial,Helvetica,sans-serif}</style>
<body>
<a class="skip-link" href="#dasha-page">Skip to content</a>
<main id="dasha-page">
<h1>Privacy</h1>
<p>Updated August 16, 2026.</p>
<h2>What Dasha uses</h2>
<p>Linking X reads your X account ID, handle, display name, avatar, and verification type. The browser session lasts up to 30 days. Dasha does not store the X access token.</p>
<p>If you join the Simp Board or finish its scored quiz, Dasha stores your linked identity, score, badges, contribution links, referral milestones, and dated holder-badge status. The wallet address and balance used for an optional holder badge are checked once and are not retained.</p>
<h2>Control and deletion</h2>
<p>Unlink clears the signed browser session. Leave Board removes your profile, claims, active quiz state, linked result, holder challenge, chess rating, and your rows from retained season snapshots. Anonymous aggregate counts remain.</p>
<p>For access or deletion requests, use the repository's <a href="https://github.com/Uuriko/dasha-desk/security/advisories/new">private report</a>. Do not include wallet keys or seed phrases.</p>
<p><a href="${WWW}/">Back to Dasha</a> · <a href="${WWW}/how-to-buy">How to buy</a></p>
</main>
</body></html>`;
}
