/**
 * Dasha public lobby — Cloudflare Worker + single Durable Object room.
 * Optional X account link (OAuth 2 PKCE). Linking is never required.
 */
import {
  MINT,
  WSOL,
  DASHA_TAPE_EMBED_SRC,
  PIN,
  MAX_HISTORY,
  MAX_SOCKETS,
  MAX_PER_IP,
  parseClientFrame,
  checkRate,
  checkRepeat,
  pruneHistory,
  pruneForumThreads,
  publicForumRow,
  publicForumThread,
  parseForumThreadPath,
  publicMessage,
  originAllowed,
  validateNick,
  validateMessage,
  nickTaken,
  nickKey,
  checkIpJoin,
  roomSlowLimits,
  SLOW_MODE_AT,
  IDLE_MS,
  JOIN_COOLDOWN_MS,
  noteSpamHit,
  AUTO_SHIELD_MS,
} from './dasha-lobby-mod.mjs';
import {
  xConfigured,
  redirectUri,
  randomUrlToken,
  pkceChallengeS256,
  authorizeUrl,
  exchangeCode,
  fetchXUser,
  createSessionToken,
  sessionFromRequest,
  cookieHeader,
  clearLegacyCookieHeader,
  readCookie,
  publicLink,
  linkedLimits,
  mayJoinRoom,
  ANON_SOFT_CAP,
  signPayload,
  verifyPayload,
} from './dasha-lobby-x.mjs';
import {
  SCHEMA,
  buildPublicBoard,
  joinBoard,
  leaveBoard,
  meStatus,
  PUBLIC_BOARD_LIMIT,
  quizPublic,
  startQuizAttempt,
  questionForAttempt,
  answerQuizAttempt,
  quizResultForAttempt,
  submitQuiz,
  applyLearnAward,
} from './dasha-simp-score.mjs';
import { isLearnTrack, isLearnModuleId, MODULE_BY_ID } from './dasha-learn-bank.mjs';
import {
  applyHolderProof,
  hasPositiveTokenBalance,
  isValidSolanaAddress,
  claimsForSession,
  pendingClaims,
  publicSeasons,
  reviewClaim,
  scrubSeasonSnapshots,
  snapshotSeason,
  submitClaim,
  verifyEd25519,
  walletMessage,
} from './dasha-simp-actions.mjs';
import {
  LOBBY_CLIENT_JS,
  LOBBY_CLIENT_SRI,
  SIMP_BOARD_JS,
  SIMP_BOARD_SRI,
  STUDIO_CLIENT_JS,
  STUDIO_CLIENT_SRI,
  ROBOTS_TXT,
  SITEMAP_XML,
  HOWTO_HTML,
  CHESS_PAGE_HTML,
  GRAPH_PAGE_HTML,
  GRAPH_CLIENT_JS,
  LEARN_CLIENT_JS,
  LEARN_CLIENT_SRI,
  FAUCET_CLIENT_JS,
  FAUCET_CLIENT_SRI,
  FAUCET_STILL_SRI,
  DANCE_CLIENT_JS,
  LOBBY_PAGE_HTML,
  ASSET_HASH,
} from './dasha-lobby-static-gen.mjs';
import {
  DashaFaucet,
  handleFaucetApi,
  isFaucetApiPath,
  isFaucetPagePath,
} from './dasha-faucet.mjs';
import { magnetPageHtml, magnetRoute } from './dasha-magnet-pages.mjs';
import {
  AWARD_BOARD_CSS,
  AWARD_BTN_CSS,
  AWARD_CHROME_CSS,
  AWARD_CROP_CSS,
  AWARD_RAIL_CSS,
  AWARD_ROOM_CSS,
  AWARD_SLIM_CSS,
  BUY_HREF,
  cropTicksHtml,
  AWARD_FOOT_CSS,
  hamburgerHtml,
  nextUpChipHtml,
  roomLinksHtml,
  roomRailHtml,
  slimFooterHtml,
} from './dasha-award-chrome.mjs';
import {
  applyGraphHighlight,
  dropGraphHighlight,
  fetchGraphExpand,
  fetchGraphSnapshot,
  GRAPH_CACHE_CONTROL,
  pruneGraphHighlights,
  publicHighlights,
} from './dasha-graph.mjs';
import {
  CHESS_CLOCK_MS,
  CHESS_INCREMENT_MS,
  CHESS_START_RATING,
  canMate,
  newChessState,
  playMove,
  publicChessGame,
  publicChessReplay,
  abortChess,
  resignChess,
  settleChessRatings,
} from './dasha-chess.mjs';

export { DashaFaucet };

const SECURITY = {
  'Cache-Control': 'no-store',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
};

const HTML_SECURITY = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

const htmlHeaders = (extra = {}) => ({ ...HTML_SECURITY, ...extra });
const privateHtmlHeaders = (extra = {}, nonce = '') => ({
  ...HTML_SECURITY,
  'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; script-src ${nonce ? `'nonce-${nonce}'` : "'none'"}; connect-src 'none'; img-src 'none'; font-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`,
  'X-Robots-Tag': 'noindex, nofollow',
  ...extra,
});
const OAUTH_COOKIE = '__Host-dasha_x_oauth';

/** Keep crawler markup to the single, visible product identity owned by the embeds. */
export function sanitizePublicJsonLd(html) {
  return String(html || '').replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, (block) => {
    let value;
    try { value = JSON.parse(block.replace(/^[\s\S]*?>|<\/script>$/gi, '')); } catch { return block; }
    if (/potterlab|John\s*Potter/i.test(block)) return '';
    if (['SoftwareApplication', 'WebApplication'].includes(value?.['@type'])) return '';
    if (value?.['@type'] === 'WebSite' && !value?.['@id'] && html.includes('https://www.getdasha.com/#website')) return '';
    return block;
  });
}

/** Webflow's outer document currently omits its language on public pages. */
export function ensureHtmlLang(html) {
  return String(html || '').replace(/<html\b([^>]*)>/i, (tag, attrs) =>
    /\blang\s*=/i.test(attrs) ? tag : `<html lang="en"${attrs}>`);
}

/** Dead .simp-* rules still shipped in proxied Webflow HTML. Home remounts a clean board after this strip. */
const SIMP_LEFTOVER_STYLE_RE = /\.simp-(?:board|row|rank|handle|badges|badge|evidence|open|status|privacy|basis|pts|season|tool-actions|actions|action|tools|tool|me)\b/i;

/** Drop leftover CSS rules whose selectors mention dead board/frame classes. */
function stripLeftoverStyleRules(html, leftoverRe) {
  return String(html || '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) =>
    block.replace(/[^{}]+\{[^{}]*\}/g, (rule) => leftoverRe.test(rule.slice(0, rule.indexOf('{'))) ? '' : rule));
}

/** Drop leftover Webflow board chrome. Home remounts a clean #simp board after this strip. */
export function stripHomeSimpBoard(html) {
  let out = String(html || '');
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) =>
    /lobby\.getdasha\.com\/client\/simp-board(?:-client)?\.js/i.test(block) ? '' : block);
  out = out.replace(/<(section|div)\b[^>]*\bid=["']simp["'][^>]*>[\s\S]*?<\/\1>/i, '');
  out = out.replace(/<div\b[^>]*\bid=["']dasha-simp-board["'][^>]*>[\s\S]*?<\/div>/i, '');
  out = out.replace(/<h2\b[^>]*>\s*Simp board\.\s*<\/h2>/i, '');
  return stripLeftoverStyleRules(out, SIMP_LEFTOVER_STYLE_RE);
}

const HOME_SKIP_RE = /<a\b[^>]*(?:\bclass=["'][^"']*\bskip(?:-link)?\b[^"']*["']|>\s*Skip to )[^>]*>[\s\S]*?<\/a>/gi;
const HOME_HERO_RE = /<main\b|<header\b[^>]*\bdasha-hero\b|<header\b|<section\b/i;
const FORUM_WWW = 'https://www.getdasha.com/forum';

function forumCanonical(url) {
  return `${url.origin}/forum`;
}

function isForumApiPath(pathname) {
  return Boolean(parseForumThreadPath(pathname));
}

async function forumApiResponse(request, env, allowedOrigin) {
  if (request.method !== 'GET' && request.headers.get('Origin') && !allowedOrigin && !env.ALLOW_ANY_ORIGIN) {
    return json({ error: 'origin not allowed' }, 403, null);
  }
  if (!env.LOBBY) return json({ error: 'not found' }, 404, allowedOrigin, { credentials: true });
  return env.LOBBY.get(env.LOBBY.idFromName('public')).fetch(request);
}
function simpBoardClientScript() {
  return `<script>(function(){var s=document.createElement('script');s.src='https://lobby.getdasha.com/client/simp-board.js';s.integrity='${SIMP_BOARD_SRI}';s.crossOrigin='anonymous';s.defer=true;document.head.appendChild(s)})();</script>`;
}

function homeFirstInsertAt(page) {
  const heroAt = page.search(HOME_HERO_RE);
  const head = heroAt >= 0 ? page.slice(0, heroAt) : page;
  let last = -1;
  let len = 0;
  HOME_SKIP_RE.lastIndex = 0;
  for (let m; (m = HOME_SKIP_RE.exec(head)); ) {
    last = m.index;
    len = m[0].length;
  }
  if (last >= 0) return last + len;
  if (heroAt >= 0) return heroAt;
  const body = page.match(/<body\b[^>]*>/i);
  if (body) return page.indexOf(body[0]) + body[0].length;
  const close = page.search(/<\/(?:body|html)>/i);
  return close >= 0 ? close : page.length;
}

/** Live decoy is a 100vh section inside `.w-embed.w-script`. Any tag, then leftover copy. */
function stripHomeCtaDecoy(html) {
  return String(html || '')
    .replace(/<(section|div|header|article)\b[^>]*\bid=["']dasha-home-cta["'][^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\s*Take Simp\.\s*/g, '');
}

function stripHomeWebFonts(html) {
  return String(html || '')
    .replace(/<script\b[^>]*\bsrc=["'][^"']*webfont[^"']*["'][^>]*>\s*<\/script>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?WebFont\.load[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*href=["'][^"']*fonts\.(?:googleapis|gstatic)\.com[^"']*["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*href=["'][^"']*ajax\.googleapis\.com\/ajax\/libs\/webfont[^"']*["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["'](?:preconnect|dns-prefetch|preload|modulepreload)["'][^>]*(?:fonts\.(?:googleapis|gstatic)|fonts\.google)\.com[^>]*>/gi, '')
    .replace(/<link\b[^>]*(?:fonts\.(?:googleapis|gstatic)|fonts\.google)\.com[^>]*rel=["'](?:preconnect|dns-prefetch|preload|modulepreload)["'][^>]*>/gi, '')
    .replace(/\b(?:Exo|Bangers|Raleway)\b/g, 'Arial')
    .replace(/system-ui/gi, 'Arial');
}

function stripHomeForumHrefs(html) {
  return String(html || '')
    .replace(/\s*·\s*<a\b[^>]*href=["']https:\/\/lobby\.getdasha\.com\/forum\/?["'][^>]*>[^<]*<\/a>/gi, '')
    .replace(/<a\b[^>]*href=["']https:\/\/lobby\.getdasha\.com\/forum\/?["'][^>]*>[^<]*<\/a>\s*·\s*/gi, '')
    .replace(/<a\b[^>]*href=["']https:\/\/lobby\.getdasha\.com\/forum\/?["'][^>]*>[^<]*<\/a>/gi, '');
}

function demoteHomeNavMint(html) {
  return String(html || '').replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, (nav) => nav
    .replace(/<a\b[^>]*href=["']#token["'][^>]*>[^<]*<\/a>/gi, '')
    .replace(/<a\b[^>]*\bbuy-dasha\b[^>]*>[^<]*<\/a>/gi, ''));
}

function stripHomeAtmosphere(html) {
  return String(html || '')
    .replace(/--hot-deep\s*:[^;}\"']+;?/gi, '')
    .replace(/#1[fF]041[cC]\b/g, '#070608')
    .replace(/rgba\(\s*124\s*,\s*77\s*,\s*255[^)]*\)/gi, 'transparent')
    .replace(/\.dasha\{[^}]*\}/g, (rule) =>
      /background(?:-image)?\s*:\s*#070608/.test(rule)
        ? rule
        : rule.replace(/background(?:-image)?\s*:[^;}]+;?/, 'background:#070608;'));
}

/** Kill measured home jank: smooth-scroll, view-timeline on #token, overflow-x trap. No Lenis. */
function stripHomeScrollToys(html) {
  return String(html || '')
    .replace(/scroll-behavior\s*:\s*smooth/gi, 'scroll-behavior:auto')
    .replace(/\.dasha\{[^}]*\}/g, (rule) => rule.replace(/overflow-x\s*:\s*hidden/gi, 'overflow-x:visible'))
    .replace(/view-timeline(?:-name|-axis)?\s*:\s*(?!none\b)[^;}\"']+;?/gi, '')
    .replace(/animation-timeline\s*:\s*(?!none\b)[^;}\"']+;?/gi, '')
    .replace(/scroll-timeline(?:-name|-axis)?\s*:\s*(?!none\b)[^;}\"']+;?/gi, '');
}

const HOME_CULTURE_NAV = roomLinksHtml();

/** Hidden Webflow `main.dasha > nav` — same labels as lock nav after #49. No Buy. */
function alignHomeLowerNav(html) {
  return String(html || '').replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, (nav) => {
    if (!/\bclass=["'][^"']*\b(?:nav|dasha-nav)\b/.test(nav)) return nav;
    if (!/\/studio|\/lobby|\/forum|\/bounties|#token|buy-dasha/i.test(nav)) return nav;
    return nav.replace(/>[\s\S]*<\/nav>/i, `>${HOME_CULTURE_NAV}</nav>`);
  });
}

const HOME_BUY_HREF = BUY_HREF;
const HOME_BUY_PILL = `<a class="pill primary buy-dasha" href="${HOME_BUY_HREF}" target="_blank" rel="noopener noreferrer">Buy $dasha ↗</a>`;
const HOME_CARNIVAL_HIDE = '#lobby,#remix,#stills,#oss,#voice,.poster-grid,#token h2,#token .section-title,#token .assoc,#token .disclaimer,#token .poster,#token .tape{display:none!important}';
const HOME_FOLD_CSS = '#dasha-tape,#simp,#faucet,#token,main.dasha>section{content-visibility:auto;contain-intrinsic-size:auto 720px}';
const HOME_SCROLL_CSS = 'html{scroll-behavior:auto!important}.dasha{overflow-x:visible!important}#token,#token *{view-timeline:none!important;animation-timeline:none!important;scroll-timeline:none!important}';
const HOME_CALM_CSS = 'main.dasha>nav.nav,main.dasha>nav.nav.wrap,.dasha>nav.nav,.dasha-nav,.dasha-hero .poster,.dasha-hero .price,.dasha-hero .actions a:not(.buy-dasha),.dasha-hero .actions .pill:not(.buy-dasha),a[href*="github.com/Uuriko/dasha-desk"],a[href^="/studio#"],#dasha-lock,main.dasha>footer{display:none!important}.dasha-hero h1,.dasha-word{font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}html,body,.dasha,.dasha-hero{font-family:Arial,Helvetica,sans-serif}' + HOME_SCROLL_CSS + HOME_CARNIVAL_HIDE + HOME_FOLD_CSS + AWARD_SLIM_CSS + AWARD_CROP_CSS + AWARD_ROOM_CSS + AWARD_FOOT_CSS + AWARD_BTN_CSS;

function injectHomeCalmCss(html) {
  const page = String(html || '');
  if (/id=["']dasha-home-calm["']/i.test(page)) return page;
  const tag = `<style id="dasha-home-calm">${HOME_CALM_CSS}</style>`;
  const closeHead = page.search(/<\/head>/i);
  if (closeHead >= 0) return page.slice(0, closeHead) + tag + page.slice(closeHead);
  const styleAt = page.search(/<style\b/i);
  if (styleAt >= 0) return page.slice(0, styleAt) + tag + page.slice(styleAt);
  const body = page.match(/<body\b[^>]*>/i);
  if (body) {
    const at = page.indexOf(body[0]) + body[0].length;
    return page.slice(0, at) + tag + page.slice(at);
  }
  return tag + page;
}

function ensureHomeBuyPill(html) {
  const pill = HOME_BUY_PILL;
  let page = String(html || '').replace(/<header\b[^>]*\bdasha-hero\b[^>]*>[\s\S]*?<\/header>/i, (hero) => {
    if (/<(?:p|div)\b[^>]*\bactions\b[^>]*>[\s\S]*\bbuy-dasha\b/i.test(hero)) return hero;
    if (/(<(?:p|div)\b[^>]*\bclass=["'][^"']*\bactions\b[^"']*["'][^>]*>)/i.test(hero)) {
      return hero.replace(/(<(?:p|div)\b[^>]*\bclass=["'][^"']*\bactions\b[^"']*["'][^>]*>)/i, `$1${pill}`);
    }
    if (/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(hero)) {
      return hero.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i, `$1<p class="actions">${pill}</p>`);
    }
    return hero.replace(/<\/header>/i, `<p class="actions">${pill}</p></header>`);
  });
  return page.replace(/<section\b[^>]*\bid=["']dasha-lock["'][^>]*>[\s\S]*?<\/section>/i, (lock) => {
    if (/\bbuy-dasha\b/.test(lock)) return lock;
    if (/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(lock)) {
      return lock.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i, `$1<p class="actions">${pill}</p>`);
    }
    return lock;
  });
}

function ensureHomeSimpMount(html) {
  const page = String(html || '');
  if (/id=["']dasha-simp-board["']/i.test(page)) return page;
  const mount = `<div id="simp"><style>${AWARD_BOARD_CSS}</style><div id="dasha-simp-board" data-simp-api="https://lobby.getdasha.com"><noscript>Needs JavaScript.</noscript></div></div>${simpBoardClientScript()}`;
  const hero = page.match(/<header\b[^>]*\bdasha-hero\b[^>]*>[\s\S]*?<\/header>/i);
  if (!hero) return page;
  const at = page.indexOf(hero[0]) + hero[0].length;
  return page.slice(0, at) + mount + page.slice(at);
}

/** Official Dexscreener embed for this pair. Below first paint, above the board. */
function dashaTapeMountHtml() {
  return `<section id="dasha-tape" aria-label="$dasha live chart"><style>#dasha-tape-embed{position:relative;width:100%;padding-bottom:125%;background:#070608}@media(min-width:1400px){#dasha-tape-embed{padding-bottom:65%}}#dasha-tape-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#070608}</style><div id="dasha-tape-embed"><iframe class="dasha-tape-frame" title="$dasha live chart" src="${DASHA_TAPE_EMBED_SRC}" loading="lazy" referrerpolicy="no-referrer"></iframe></div></section>`;
}

function ensureHomeTapeMount(html) {
  const page = String(html || '');
  if (/id=["']dasha-tape["']/i.test(page)) return page;
  const mount = dashaTapeMountHtml();
  const simp = page.match(/<(?:div|section)\b[^>]*\bid=["']simp["'][^>]*>/i);
  if (simp) {
    const at = page.indexOf(simp[0]);
    return page.slice(0, at) + mount + page.slice(at);
  }
  const hero = page.match(/<header\b[^>]*\bdasha-hero\b[^>]*>[\s\S]*?<\/header>/i);
  if (!hero) return page;
  const at = page.indexOf(hero[0]) + hero[0].length;
  return page.slice(0, at) + mount + page.slice(at);
}

function faucetStillUrl() {
  return 'https://lobby.getdasha.com/client/faucet.png';
}

/** Same picture + dest + send mount as /faucet. */
function faucetMountHtml() {
  const still = faucetStillUrl();
  return `<div id="dasha-faucet" data-faucet-still="${still}" data-faucet-still-sri="${FAUCET_STILL_SRI}"></div>
<noscript>
<img class="faucet-hero" src="${still}" integrity="${FAUCET_STILL_SRI}" crossorigin="anonymous" alt="">
</noscript>
${faucetClientScript()}`;
}

function ensureHomeFaucetMount(html) {
  const page = String(html || '');
  if (/id=["']dasha-faucet["']/i.test(page)) return page;
  const mount = `<div id="faucet">${faucetMountHtml()}</div>`;
  const script = page.match(/simp-board\.js[\s\S]*?<\/script>/i);
  if (script) {
    const at = page.indexOf(script[0]) + script[0].length;
    return page.slice(0, at) + mount + page.slice(at);
  }
  const hero = page.match(/<header\b[^>]*\bdasha-hero\b[^>]*>[\s\S]*?<\/header>/i);
  if (!hero) return page;
  const at = page.indexOf(hero[0]) + hero[0].length;
  return page.slice(0, at) + mount + page.slice(at);
}

function injectHomeReveal(html) {
  const page = String(html || '');
  if (/id=["']dasha-home-reveal["']/i.test(page)) return page;
  const tag = `<noscript><style>#simp,#faucet,#token{opacity:1;transform:none}</style></noscript><script id="dasha-home-reveal">(function(){var nodes=document.querySelectorAll('#simp,#faucet,#token');if(!nodes.length)return;if(!window.IntersectionObserver||(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)){for(var i=0;i<nodes.length;i++)nodes[i].classList.add('is-in');return}var io=new IntersectionObserver(function(ents){ents.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -8% 0px'});for(var j=0;j<nodes.length;j++)io.observe(nodes[j])})();</script>`;
  return /<\/body>/i.test(page) ? page.replace(/<\/body>/i, `${tag}</body>`) : page + tag;
}

/** www/apex / only: first paint is headline + Buy $dasha. Never emit #dasha-lock. */
export function rewriteHomeFirstViewport(html) {
  let page = demoteHomeNavMint(stripHomeForumHrefs(stripHomeAtmosphere(stripHomeWebFonts(stripHomeCtaDecoy(String(html || ''))))));
  page = stripHomeScrollToys(page);
  page = stripGraphHops(page);
  page = page.replace(/<section\b[^>]*\bid=["']dasha-lock["'][^>]*>[\s\S]*?<\/section>/gi, '');
  page = injectHomeCalmCss(page);
  page = ensureHomeBuyPill(page);
  if (/<header\b[^>]*\bdasha-hero\b/i.test(page)) {
    page = ensureHomeSimpMount(page);
    page = ensureHomeTapeMount(page);
    page = ensureHomeFaucetMount(page);
  }
  page = ensureHomeAwardChrome(page);
  page = injectHomeReveal(page);
  return rewriteLeftoverLobbyHrefs(alignHomeLowerNav(page));
}

function ensureHomeAwardChrome(html) {
  let page = String(html || '');
  if (!/class=["'][^"']*\bdasha-slim\b/.test(page)) {
    const at = homeFirstInsertAt(page);
    page = page.slice(0, at) + hamburgerHtml({ buy: true }) + page.slice(at);
  }
  if (!/class=["']dasha-crop["']/.test(page)) {
    const at = homeFirstInsertAt(page);
    page = page.slice(0, at) + cropTicksHtml() + page.slice(at);
  }
  if (!/class=["']dasha-foot["']/.test(page)) {
    const foot = slimFooterHtml();
    page = /<\/body>/i.test(page) ? page.replace(/<\/body>/i, `${foot}</body>`) : page + foot;
  }
  return page;
}

/** /lobby is chat only. Quiz lives on / #simp and /simp. Drops leftover mount/style/script. Idempotent. */
export function stripLobbySimpQuiz(html) {
  let page = String(html || '');
  page = page.replace(/<style\b[^>]*\bid=["']dasha-quiz-style["'][^>]*>[\s\S]*?<\/style>/gi, '');
  page = page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) =>
    /lobby\.getdasha\.com\/client\/simp-board(?:-client)?\.js/i.test(block) ? '' : block);
  page = page.replace(/<script\b[^>]*\bsrc=["'][^"']*simp-board(?:-client)?\.js[^"']*["'][^>]*>\s*<\/script>/gi, '');
  page = page.replace(/<div\b[^>]*\bid=["']dasha-simp-board["'][^>]*>[\s\S]*?<\/div>/gi, '');
  page = page.replace(/<(section|div)\b[^>]*(?:\bid=["']dasha-quiz["']|\bclass=["'][^"']*\bdasha-quiz\b)[^>]*>\s*<\/\1>/gi, '');
  page = page.replace(/<h2\b[^>]*>\s*Simp board\.\s*<\/h2>/i, '');
  return rewriteLobbyScriptIntegrity(page);
}

/** Replace leftover Webflow SRI on lobby.js tags and injectors. Pin is the hash of served client/lobby.js. */
export function rewriteLobbyScriptIntegrity(html, sri = LOBBY_CLIENT_SRI) {
  let page = String(html || '');
  page = page.replace(/<script\b[^>]*>\s*<\/script>/gi, (tag) => {
    const src = tag.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i);
    if (!src || !/(?:lobby\.getdasha\.com)?\/client\/lobby(?:-client)?\.js/i.test(src[2])) return tag;
    const pin = tag.match(/\bintegrity\s*=\s*(["'])([^"']*)\1/i);
    if (!pin || pin[2] === sri) return tag;
    return tag.replace(pin[0], `integrity=${pin[1]}${sri}${pin[1]}`);
  });
  return page.replace(
    /(s\.src\s*=\s*(['"])(?:https:\/\/lobby\.getdasha\.com)?\/client\/lobby(?:-client)?\.js\2\s*;\s*s\.integrity\s*=\s*)(['"])[^'"]*\3/gi,
    `$1$3${sri}$3`,
  );
}

/** Leftover lobby.getdasha.com chess/forum doors become same-origin. */
export function rewriteLeftoverLobbyHrefs(html) {
  return String(html || '')
    .replace(/href=(["'])https:\/\/lobby\.getdasha\.com\/chess/gi, 'href=$1/chess')
    .replace(/href=(["'])https:\/\/lobby\.getdasha\.com\/forum\/?/gi, 'href=$1/forum');
}

/** Drop the dead lobby.getdasha.com/forum hop, empty #dasha-forum, and 404 forum.js. Does not invent a forum. */
export function stripDeadLobbyForum(html) {
  let page = String(html || '');
  page = page
    .replace(/\s*·\s*<a\b[^>]*href=["']https:\/\/lobby\.getdasha\.com\/forum\/?["'][^>]*>[^<]*<\/a>/gi, '')
    .replace(/<a\b[^>]*href=["']https:\/\/lobby\.getdasha\.com\/forum\/?["'][^>]*>[^<]*<\/a>\s*·\s*/gi, '')
    .replace(/<a\b[^>]*href=["']https:\/\/lobby\.getdasha\.com\/forum\/?["'][^>]*>[^<]*<\/a>/gi, '');
  page = page.replace(/<div\b[^>]*\bid=["']dasha-forum["'][^>]*>\s*<\/div>/gi, '');
  page = page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) =>
    /\/client\/forum\.js/i.test(block) ? '' : block);
  return page.replace(/<script\b[^>]*\bsrc=["'][^"']*\/client\/forum\.js[^"']*["'][^>]*>\s*<\/script>/gi, '');
}

/** /bounties-only: drop the Pages iframe and its leftover frame CSS. The listings feed is /bounties.json. */
export function stripBountiesIframe(html) {
  return stripLeftoverStyleRules(
    String(html || '').replace(
      /<iframe\b[^>]*uuriko\.github\.io\/dasha-desk\/bounties[^>]*>\s*<\/iframe>/gi,
      '',
    ),
    /\.dasha-bounties-frame\b/i,
  );
}

function bountyItemHref(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
  } catch {
    return '';
  }
}

function listingHasPayTo(row) {
  return typeof row?.payTo === 'string' && Boolean(row.payTo.trim());
}

/** Leftover GitHub issue #8 is not an open bounty. */
function isLeftoverBountyRow(row) {
  const href = bountyItemHref(row?.itemUrl);
  const name = typeof row?.name === 'string' ? row.name : '';
  return /github\.com\/Uuriko\/dasha-desk\/issues\/8/i.test(href)
    || /docs:\s*add CONTRIBUTING screenshot/i.test(name);
}

/** True when unpaid /bounties HTML still paints a USDC or $ payout amount. $DASHA / Buy $dasha are not payouts. */
export function unpaidBountiesHtmlHasPayoutAmounts(html) {
  const page = String(html || '');
  return /\bUSDC\b/i.test(page) || /\$\s*\d|\d+\s*\$/.test(page);
}

function bountiesBoardHtml(feed) {
  const data = normalizeBountiesFeed(feed);
  const unpaid = data.listings.every((row) => !listingHasPayTo(row));
  let visible = unpaid
    ? data.listings.filter((row) => bountyItemHref(row.itemUrl))
    : data.listings;
  visible = visible.filter((row) => !isLeftoverBountyRow(row));
  const work = visible.length
    ? `<ul>${visible.map((row) => {
        const name = escapeHtml(typeof row.name === 'string' ? row.name.trim() : '');
        const href = bountyItemHref(row.itemUrl);
        const title = href ? `<a href="${escapeHtml(href)}">${name}</a>` : name;
        if (unpaid) return `<li><p>${title}</p></li>`;
        const amount = row.amount == null || row.amount === '' ? '' : String(row.amount);
        const currency = typeof row.currency === 'string' ? row.currency.trim() : '';
        const label = escapeHtml([amount, currency].filter(Boolean).join(' '));
        return `<li><p>${title}</p>${label ? `<p class="amt">${label}</p>` : ''}</li>`;
      }).join('')}</ul>`
    : '<p>No open bounties</p>';
  const payoutNote = unpaid ? '<p>Payouts are not configured yet.</p>' : '';
  const buy = `https://jup.ag/swap?sell=${WSOL}&buy=${MINT}`;
  return `<section id="dasha-bounties" aria-label="Bounties"><style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}html,body{margin:0;min-height:100%;background:var(--ink);color:var(--paper)}${AWARD_CHROME_CSS}#dasha-bounties{box-sizing:border-box;min-height:100vh;margin:0;padding:0 0 2rem;background:var(--ink);color:var(--paper);font:16px/1.45 Arial,Helvetica,sans-serif}#dasha-bounties h1,#dasha-bounties h2{margin:1.25rem 1rem .5rem;font-family:"Arial Black",Arial,Helvetica,sans-serif;font-weight:900;text-transform:uppercase}#dasha-bounties h1{margin-top:.5rem;color:var(--paper);font-size:clamp(2rem,5vw,3.25rem);line-height:.9}#dasha-bounties p{margin:.5rem 1rem}#dasha-bounties a{color:var(--acid)}#dasha-bounties a.go,#dasha-bounties button{display:inline-flex;min-height:48px;align-items:center;padding:0 1.25rem;background:var(--acid);color:var(--ink);font:inherit;font-weight:900;text-decoration:none;border:0;box-shadow:4px 4px 0 var(--hot)}#dasha-bounties .amt{color:var(--hot)}#dasha-bounties ul{list-style:none;margin:0 1rem;padding:0}#dasha-bounties li{border-top:1px solid var(--acid);padding:.75rem 0}#dasha-bounties li:first-child{border-top:0}#dasha-bounties li p{margin:.25rem 0}#dasha-bounties form{margin:0 1rem}#dasha-bounties label{display:block}#dasha-bounties input,#dasha-bounties textarea{display:block;width:100%;max-width:36rem;margin:.25rem 0 .75rem;padding:.5rem;box-sizing:border-box;background:var(--ink);color:var(--paper);border:1px solid var(--acid);font:inherit}#dasha-bounties textarea{min-height:6rem}#dasha-bounties footer{margin:2rem 1rem 0;padding-top:1rem;border-top:1px solid var(--acid)}#dasha-bounties footer code{color:var(--paper);word-break:break-all}</style>${cropTicksHtml()}${hamburgerHtml({ path: '/bounties' })}<h1>Bounties</h1><p>Post a project. Other people run spare compute on it.</p><p><a class="go" href="#dasha-bounty-post">Post a project</a></p><p><a class="go" href="mailto:potter@trydemigod.com?subject=I%20have%20excess%20compute">I have excess compute</a></p><h2 id="dasha-bounty-post">Post</h2><form action="mailto:potter@trydemigod.com" method="get"><input type="hidden" name="subject" value="Dasha bounty"><p><label>Project name <input name="name" required></label></p><p><label>What to run <textarea name="body" required></textarea></label></p><p><label>Contact <input name="contact"></label></p><p><button type="submit">Post a project</button></p></form><p>This sends a request. It is not a live listing.</p><h2>Work</h2>${payoutNote}${work}<footer id="token"><p><code>${MINT}</code> · <a href="${buy}" target="_blank" rel="noopener noreferrer">Buy $dasha ↗</a></p></footer>${siteFooter('/bounties')}</section>`;
}

/** Worker-owned first HTML for /bounties. Tokens + Arial only. No Webflow first paint. */
export function bountiesPageHtml(feed) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bounties</title>
<body>${bountiesBoardHtml(feed)}</body></html>`;
}

async function bountiesPageResponse(request) {
  return new Response(request.method === 'HEAD' ? null : bountiesPageHtml(await loadBountiesFeed()), {
    status: 200,
    headers: htmlHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'X-Dasha-Edge': 'bounties',
    }),
  });
}

/** /bounties-only: no-JS post+work board after the leftover w-embed. Same feed as /bounties.json. */
export function injectBountiesBoard(html, feed) {
  const page = String(html || '');
  const board = bountiesBoardHtml(feed);
  const embed = page.match(/<div\b[^>]*\bclass=["'][^"']*\bw-embed\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  if (embed) {
    const at = page.indexOf(embed[0]) + embed[0].length;
    return page.slice(0, at) + board + page.slice(at);
  }
  const scriptAt = page.search(/<script\b[^>]*(?:jquery|webflow\.js)/i);
  if (scriptAt >= 0) return page.slice(0, scriptAt) + board + page.slice(scriptAt);
  const close = page.search(/<\/(?:body|html)>/i);
  return close >= 0 ? page.slice(0, close) + board + page.slice(close) : page + board;
}

function siteFooter(_current = '') {
  return slimFooterHtml();
}
const WORKER_SITE_FOOTER = siteFooter();

const PRIVACY_HREF_RE = /href=["'](?:\/(?:privacy|legal|privacy-policy|learn|verse|bible|dashaverse)(?:\/[^"'#?]*)?\/?|https?:\/\/(?:www\.)?getdasha\.com\/(?:privacy|legal|privacy-policy|learn|verse|bible|dashaverse)(?:\/[^"'#?]*)?\/?)["']/i;

/** Kill leftover Privacy / legal doors and lecture copy. Does not invent a replacement. */
export function stripPrivacyHrefs(html) {
  let page = String(html || '');
  page = page.replace(/<p\b[^>]*\bclass=["']([^"']*)["'][^>]*>[\s\S]*?<\/p>/gi, (tag, cls) => (
    String(cls).split(/\s+/).includes('privacy') ? '' : tag
  ));
  page = page.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => (PRIVACY_HREF_RE.test(anchor) ? '' : anchor));
  page = page.replace(/\s*·\s*·\s*/g, ' · ');
  page = page.replace(/ · <\/p>/gi, '</p>');
  page = page.replace(/<p([^>]*)>\s*·\s*/gi, '<p$1>');
  return page;
}

export function ensurePrivacyLink(html) {
  return stripPrivacyHrefs(html);
}

function isLeftoverPrivacyPath(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  return path === '/privacy' || path === '/legal' || path === '/privacy-policy';
}

function isLeftoverLearnPath(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  return path === '/learn' || path.startsWith('/learn/');
}

function isLeftoverVersePath(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  return path === '/verse' || path === '/bible' || path === '/dashaverse';
}

/** Dock is off. Dance files stay on disk; nothing mounts them. */
export function danceDockPath(pathname) {
  return false;
}

export function injectDanceDock(html) {
  return html;
}

const HOWTO_PAGE_HTML = ensurePrivacyLink(HOWTO_HTML);
const CHESS_PAGE = ensurePrivacyLink(CHESS_PAGE_HTML);
const GRAPH_PAGE = GRAPH_PAGE_HTML;
const LOBBY_PAGE = injectDanceDock(ensurePrivacyLink(stripLobbySimpQuiz(LOBBY_PAGE_HTML)));
const FORUM_PAGE = LOBBY_PAGE;

/** Replace leftover Webflow SRI on the worker-served studio.js tag. Other pins stay. */
/** Live Studio nav CTA currently dumps people under the home lock at /#token. */
export function rewriteStudioBuyVerifyHref(html) {
  let page = String(html || '').replace(
    /<a\b([^>]*\bdgcta\b[^>]*)>(\s*Buy\s*\/\s*verify[^<]*)<\/a>/gi,
    (full, attrs, text) => {
      const next = attrs.replace(
        /(\bhref\s*=\s*["'])(?:https:\/\/(?:www\.)?getdasha\.com)?\/?#token\b/i,
        '$1/how-to-buy',
      );
      return `<a${next}>${text}</a>`;
    },
  );
  if (/<\/head>/i.test(page) && !/id=["']dasha-btn-lock["']/i.test(page)) {
    page = page.replace(/<\/head>/i, `<style id="dasha-btn-lock">${AWARD_BTN_CSS}</style></head>`);
  }
  return page;
}

export function rewriteStudioScriptIntegrity(html, sri = STUDIO_CLIENT_SRI) {
  return String(html || '').replace(/<script\b[^>]*>\s*<\/script>/gi, (tag) => {
    const src = tag.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i);
    if (!src || !/(?:lobby\.getdasha\.com)?\/client\/studio\.js/i.test(src[2])) return tag;
    const pin = tag.match(/\bintegrity\s*=\s*(["'])([^"']*)\1/i);
    if (!pin || pin[2] === sri) return tag;
    return tag.replace(pin[0], `integrity=${pin[1]}${sri}${pin[1]}`);
  });
}

/** Point leftover Webflow shortcut icon at the first-party cherries path. Other icons stay. */
export function rewriteStaleCdnFavicon(html) {
  return String(html || '').replace(/<link\b[^>]*>/gi, (tag) => {
    const href = tag.match(/\bhref\s*=\s*(["'])([^"']*)\1/i);
    if (!href || !/favicon\.ico(?:\?|$)/i.test(href[2])) return tag;
    if (!/website-files\.com|webflow\.com/i.test(href[2])) return tag;
    return tag.replace(href[0], `href=${href[1]}/favicon.ico${href[1]}`);
  });
}

function securityTxt(host) {
  return `Contact: https://github.com/Uuriko/dasha-desk/security/advisories/new\nExpires: 2027-08-01T00:00:00Z\nPreferred-Languages: en\nCanonical: https://${host}/.well-known/security.txt\nPolicy: https://github.com/Uuriko/dasha-desk/security/policy\n`;
}

function securityTxtResponse(request, host) {
  return new Response(request.method === 'HEAD' ? null : securityTxt(host), {
    status: 200,
    headers: {
      ...SECURITY,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function applyHtmlSecurity(headers) {
  for (const [name, value] of Object.entries(HTML_SECURITY)) headers.set(name, value);
  const link = headers.get('Link');
  if (link) {
    const kept = link.split(',').map((part) => part.trim()).filter((part) => !/fonts\.(?:googleapis|gstatic)\.com/i.test(part));
    if (kept.length) headers.set('Link', kept.join(', '));
    else headers.delete('Link');
  }
  return headers;
}

function jsAsset(body, origin, { headOnly = false } = {}) {
  return new Response(headOnly ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Robots-Tag': 'noindex, nofollow',
      'Access-Control-Allow-Origin': origin || '*',
      Vary: 'Origin',
      ETag: `"${ASSET_HASH}"`,
    },
  });
}

function corsHeaders(origin, { credentials = false } = {}) {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...(credentials ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
    Vary: 'Origin',
  };
}

function json(body, status, origin, { credentials = false } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...SECURITY,
      ...corsHeaders(origin, { credentials }),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function graphPageResponse() {
  return Response.redirect('https://www.getdasha.com/', 308);
}

/** Drop leftover Graph doors. /graph is shelved; source stays on disk. */
export function stripGraphHops(html) {
  return String(html || '')
    .replace(/\s*·\s*<a\b[^>]*href=["'][^"']*\/graph\/?["'][^>]*>[^<]*<\/a>/gi, '')
    .replace(/<a\b[^>]*href=["'][^"']*\/graph\/?["'][^>]*>[^<]*<\/a>\s*·\s*/gi, '')
    .replace(/<a\b[^>]*href=["'][^"']*\/graph\/?["'][^>]*>[^<]*<\/a>/gi, '');
}

function graphApiResponse(body, origin, cacheControl = GRAPH_CACHE_CONTROL) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...SECURITY,
      ...corsHeaders(origin),
      'Cache-Control': cacheControl,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Dasha-Edge': 'graph-api',
    },
  });
}

async function loadPublicHighlights(env) {
  try {
    if (!env?.LOBBY) return [];
    const stub = env.LOBBY.get(env.LOBBY.idFromName('public'));
    const res = await stub.fetch(new Request('https://lobby.getdasha.com/api/graph/highlights', { method: 'GET' }));
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.highlights) ? publicHighlights(data.highlights) : [];
  } catch {
    return [];
  }
}

async function graphSnapshotResponse(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = origin && originAllowed(origin, env.ALLOWED_ORIGINS || '') ? origin : origin || '*';
  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: {
        ...SECURITY,
        ...corsHeaders(allowedOrigin),
        'Cache-Control': GRAPH_CACHE_CONTROL,
        'Content-Type': 'application/json; charset=utf-8',
        'X-Dasha-Edge': 'graph-api',
      },
    });
  }
  const [body, highlights] = await Promise.all([
    fetchGraphSnapshot(env, { endpoints: solanaRpcEndpoints(env) }),
    loadPublicHighlights(env),
  ]);
  return graphApiResponse({ ...body, highlights }, allowedOrigin);
}

function isGraphWritePath(pathname) {
  const path = String(pathname || '').replace(/\/$/, '');
  return path === '/api/graph/wallet/challenge' || path === '/api/graph/highlight' || path === '/api/graph/highlights';
}

async function graphExpandResponse(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = origin && originAllowed(origin, env.ALLOWED_ORIGINS || '') ? origin : origin || '*';
  const id = new URL(request.url).searchParams.get('id') || '';
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers: { ...SECURITY, 'X-Dasha-Edge': 'graph-api' } });
  }
  const body = await fetchGraphExpand(env, id, { endpoints: solanaRpcEndpoints(env) });
  return graphApiResponse(body, allowedOrigin);
}

function id() {
  return crypto.randomUUID().slice(0, 12);
}

async function requestJson(request) {
  if (Number(request.headers.get('Content-Length') || 0) > 4096) return {};
  const text = await request.text().catch(() => '');
  if (new TextEncoder().encode(text).length > 4096) return {};
  try { return JSON.parse(text || '{}'); } catch { return {}; }
}

function modAllowed(request, env) {
  const secret = env.LOBBY_MOD_SECRET;
  return Boolean(secret && request.headers.get('Authorization') === `Bearer ${secret}`);
}

function simpRate(map, key, maxPerMin) {
  const state = map.get(key) || { lastMs: 0, times: [] };
  map.set(key, state);
  return checkRate(state, Date.now(), { rateMs: 0, maxPerMin });
}

function countMetric(object, key) {
  object[key] = (object[key] || 0) + 1;
}

function countQuizResult(metrics, attempt, quiz) {
  countMetric(metrics.lanes, quiz.lane);
  countMetric(metrics.tiers, quiz.title);
  const seconds = Math.max(0, (Number(attempt.updatedAt) - Number(attempt.startedAt)) / 1000);
  countMetric(metrics.elapsed, seconds < 60 ? 'under-1m' : seconds < 120 ? '1-2m' : seconds < 240 ? '2-4m' : 'over-4m');
}

const emptyQuizMetrics = since => ({ since, starts: 0, completions: 0, replays: 0, shares: 0, reached: {}, answers: {}, lanes: {}, tiers: {}, elapsed: {} });
const emptyStudioMetrics = since => ({ since, completionSince: since, opens: 0, firstEdits: 0, completions: 0, exports: 0, shareIntents: 0, shareSuccesses: 0, sources: { home: 0, quiz: 0, direct: 0, other: 0 } });
const emptyChessMetrics = since => ({ since, pageOpens: 0, linkIntents: 0, enrollmentIntents: 0, holderProofIntents: 0, queueIntents: 0, buyIntents: 0, gamesStarted: 0, gamesCompleted: 0, rematchesOffered: 0, rematchesAccepted: 0, replayOpens: 0, replayPlayIntents: 0, replayShareIntents: 0, replayShareHandoffs: 0, challengesCreated: 0, challengesAccepted: 0, challengeShareIntents: 0, tournamentsCreated: 0, tournamentJoins: 0, tournamentsStarted: 0, tournamentsCompleted: 0, tournamentShareIntents: 0 });
const CHESS_TOURNAMENT_REGISTRATION_MS = 24 * 60 * 60_000;
const CHESS_CHALLENGE_MS = 30 * 60_000;
const CHESS_CHALLENGE_RETAIN_MS = 24 * 60 * 60_000;
const WWW_CHESS = 'https://www.getdasha.com/chess';

/** Public observation without identities, content, source slices, or tiny cohorts. */
export function publicFunnelSummary(studio = {}, quiz = {}, chess = {}, threshold = 5) {
  const cell = value => Number(value) >= threshold ? Number(value) : null;
  const ratio = (part, whole) => Number(part) >= threshold && Number(whole) >= threshold && Number(part) <= Number(whole)
    ? Number((Number(part) / Number(whole)).toFixed(3))
    : null;
  return {
    ok: true,
    since: Number.isFinite(studio.since) ? new Date(studio.since).toISOString() : null,
    completionSince: Number.isFinite(studio.completionSince ?? studio.since) ? new Date(studio.completionSince ?? studio.since).toISOString() : null,
    threshold,
    studio: {
      opens: cell(studio.opens),
      firstEdits: cell(studio.firstEdits),
      openToEdit: ratio(studio.firstEdits, studio.opens),
      completions: cell(studio.completions),
      editToCompletion: ratio(studio.completions, studio.firstEdits),
      exports: cell(studio.exports),
      editToExport: ratio(studio.exports, studio.firstEdits),
      shareIntents: cell(studio.shareIntents),
      shareApiResolutions: cell(studio.shareSuccesses),
    },
    quiz: {
      starts: cell(quiz.starts),
      completions: cell(quiz.completions),
      startToComplete: ratio(quiz.completions, quiz.starts),
      replays: cell(quiz.replays),
      shareIntents: cell(quiz.shares),
      completeToShareIntent: ratio(quiz.shares, quiz.completions),
    },
    chess: {
      pageOpens: cell(chess.pageOpens),
      linkIntents: cell(chess.linkIntents),
      enrollmentIntents: cell(chess.enrollmentIntents),
      holderProofIntents: cell(chess.holderProofIntents),
      queueIntents: cell(chess.queueIntents),
      pageOpenToLinkIntent: ratio(chess.linkIntents, chess.pageOpens),
      linkToEnrollmentIntent: ratio(chess.enrollmentIntents, chess.linkIntents),
      enrollmentToHolderProofIntent: ratio(chess.holderProofIntents, chess.enrollmentIntents),
      holderProofToQueueIntent: ratio(chess.queueIntents, chess.holderProofIntents),
      buyIntents: cell(chess.buyIntents),
      pageOpenToBuyIntent: ratio(chess.buyIntents, chess.pageOpens),
      gamesStarted: cell(chess.gamesStarted),
      gamesCompleted: cell(chess.gamesCompleted),
      gameStartToComplete: ratio(chess.gamesCompleted, chess.gamesStarted),
      rematchesOffered: cell(chess.rematchesOffered),
      rematchesAccepted: cell(chess.rematchesAccepted),
      rematchOfferToAccept: ratio(chess.rematchesAccepted, chess.rematchesOffered),
      replayOpens: cell(chess.replayOpens),
      replayPlayIntents: cell(chess.replayPlayIntents),
      replayOpenToPlay: ratio(chess.replayPlayIntents, chess.replayOpens),
      replayShareIntents: cell(chess.replayShareIntents),
      replayShareHandoffs: cell(chess.replayShareHandoffs),
      replayShareIntentToHandoff: ratio(chess.replayShareHandoffs, chess.replayShareIntents),
      completionToReplayShare: ratio(chess.replayShareIntents, chess.gamesCompleted),
      challengesCreated: cell(chess.challengesCreated),
      challengesAccepted: cell(chess.challengesAccepted),
      challengeCreateToAccept: ratio(chess.challengesAccepted, chess.challengesCreated),
      challengeShareIntents: cell(chess.challengeShareIntents),
      tournamentsCreated: cell(chess.tournamentsCreated),
      tournamentJoins: cell(chess.tournamentJoins),
      tournamentsStarted: cell(chess.tournamentsStarted),
      tournamentsCompleted: cell(chess.tournamentsCompleted),
      tournamentShareIntents: cell(chess.tournamentShareIntents),
    },
    limits: `Aggregate events only; cells below ${threshold} and non-comparable ratios are suppressed and are not unique-user conversion or retention.`,
  };
}

export function solanaRpcEndpoints(env = {}) {
  const configured = String(env.SOLANA_RPC_URLS || env.SOLANA_RPC_URL || '').split(',').map(value => value.trim()).filter(Boolean);
  const endpoints = configured.length ? [...new Set(configured)].slice(0, 2) : ['https://api.mainnet-beta.solana.com'];
  if (endpoints.some(endpoint => !endpoint.startsWith('https://'))) throw new Error('Solana RPC must use HTTPS');
  return endpoints;
}

async function walletHoldsDasha(env, owner) {
  let lastError;
  for (const endpoint of solanaRpcEndpoints(env)) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(4000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
          params: [owner, { mint: MINT }, { encoding: 'jsonParsed', commitment: 'finalized' }],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error || !Array.isArray(data.result?.value)) throw new Error('Solana balance check failed');
      return hasPositiveTokenBalance(data, { owner, mint: MINT });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Solana balance check failed');
}

function send(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch {
    /* closed */
  }
}

function htmlPage(title, body, { chrome = false, path = '/' } = {}) {
  const extra = chrome ? AWARD_CHROME_CSS : AWARD_BTN_CSS;
  const lead = chrome ? `${cropTicksHtml()}${hamburgerHtml({ path })}` : '';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:16px/1.45 Arial,Helvetica,sans-serif;background:#070608;color:#f4eddb;max-width:28rem;margin:3rem auto;padding:0 1rem}a{color:#dfff00}code{color:#f4eddb}${extra}</style>
<body>${lead}${body}</body></html>`;
}

const SIMP_WWW = 'https://www.getdasha.com/simp';

function isExactPath(pathname, base) {
  return pathname === base || pathname === `${base}/`;
}

/** First-paint quiz chrome: one lede. Questions stay in JS. */
export function simpQuizFirstPaintHtml() {
  return `<p>How big of a Dasha simp are you?</p>
<noscript><p>Needs JavaScript.</p></noscript>`;
}

/** Worker-owned first HTML for /simp. Quiz + clean board. Tokens only. No handle list. */
export function simpPageHtml() {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simp</title>
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}html,body{margin:0;min-height:100%;background:var(--ink);color:var(--paper)}${AWARD_CHROME_CSS}${AWARD_BOARD_CSS}body{box-sizing:border-box;min-height:100vh;padding:1.25rem;font:16px/1.45 Arial,Helvetica,sans-serif}h1{margin:0 0 .5rem;color:var(--paper);font-family:"Arial Black",Arial,Helvetica,sans-serif;font-weight:900;font-size:clamp(3rem,12vw,6rem);line-height:.9}a{color:var(--acid)}#dasha-quiz,.dasha-quiz{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--acid)}</style>
<body>
${cropTicksHtml()}
${hamburgerHtml({ path: '/simp' })}
<h1>Simp</h1>
<p>How big of a Dasha simp are you?</p>
<div id="dasha-quiz" class="dasha-quiz"><div id="dasha-simp-board">${simpQuizFirstPaintHtml()}</div></div>
${simpBoardClientScript()}
${siteFooter('/simp')}
</body></html>`;
}

async function simpPageResponse(request) {
  return new Response(request.method === 'HEAD' ? null : simpPageHtml(), {
    status: 200,
    headers: htmlHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'X-Dasha-Edge': 'simp',
    }),
  });
}

const SIMP_SHARE_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const SIMP_SHARE_IMAGE = 'https://lobby.getdasha.com/simp/card/quiz.png';
const SIMP_SHARE_JS = `(function(){var b=document.querySelector('.dasha-share');if(!b)return;b.addEventListener('click',function(){var title=b.getAttribute('data-title')||'';var text=b.getAttribute('data-text')||title;var url=b.getAttribute('data-url')||location.href;var go=function(){location.href='https://x.com/intent/post?text='+encodeURIComponent(text+(url?'\\n'+url:''));};if(navigator.share){navigator.share({title:title,text:text,url:url}).catch(function(err){if(!err||err.name!=='AbortError')go();});}else go();});}());`;

function simpShareId(pathname) {
  const m = String(pathname || '').match(/^\/simp\/(?:r|result)\/([^/]+)\/?$/);
  return m && SIMP_SHARE_ID_RE.test(m[1]) ? m[1] : '';
}

function simpShareWww(id) {
  return `https://www.getdasha.com/simp/r/${id}`;
}

/** Worker-owned www share page. Type name leads; score is supporting text only. */
export function simpSharePageHtml(result, id) {
  const rawType = String(result?.title || '').trim().slice(0, 80);
  const rawVibe = typeof result?.vibeNote === 'string' ? result.vibeNote.trim().slice(0, 160) : '';
  const typeName = escapeHtml(rawType);
  const vibe = escapeHtml(rawVibe);
  const lane = result?.lane ? escapeHtml(String(result.lane).slice(0, 40)) : '';
  const correct = Number(result?.correct);
  const total = Number(result?.total);
  const score = Number.isFinite(correct) && Number.isFinite(total) ? `${correct}/${total}` : '';
  const url = simpShareWww(id);
  const description = vibe || `${typeName} on the Dasha simp quiz.`;
  const shareText = escapeHtml(rawVibe ? `${rawType} · ${rawVibe}` : rawType);
  const support = [score, lane].filter(Boolean).join(' · ');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${typeName}</title>
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="getdasha"><meta property="og:url" content="${url}">
<meta property="og:title" content="${typeName}"><meta property="og:description" content="${description}">
<meta property="og:image" content="${SIMP_SHARE_IMAGE}"><meta property="og:image:alt" content="${typeName}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${typeName}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${SIMP_SHARE_IMAGE}"><meta name="twitter:image:alt" content="${typeName}">
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}body{font:16px/1.45 Arial,Helvetica,sans-serif;background:var(--ink);color:var(--paper);max-width:28rem;margin:3rem auto;padding:0 1rem}a{color:var(--acid)}h1{font-family:"Arial Black",Arial,Helvetica,sans-serif;font-weight:900;font-size:clamp(2rem,8vw,3.4rem);line-height:.95;margin:0 0 .75rem}.dasha-share{background:var(--acid);color:var(--ink);border:0;padding:.55rem 1rem;font:inherit;font-weight:700;cursor:pointer}</style>
<body>
<h1>${typeName}</h1>
${support ? `<p>${support}</p>` : ''}
<button type="button" class="dasha-share" data-title="${typeName}" data-text="${shareText}" data-url="${url}">Share</button>
<p><a href="/simp">Simp</a> · <a href="https://www.getdasha.com/">Back to Dasha</a></p>
<script>${SIMP_SHARE_JS}</script>
</body></html>`;
}

/** Honest empty result page. No invented score. */
export function simpResultMissingHtml() {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Result not found</title>
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}body{font:16px/1.45 Arial,Helvetica,sans-serif;background:var(--ink);color:var(--paper);max-width:28rem;margin:3rem auto;padding:0 1rem}a{color:var(--acid)}</style>
<body>
<h1>Result not found</h1>
<p>No quiz result for this id.</p>
<p><a href="/simp">Simp</a> · <a href="https://www.getdasha.com/">Back to Dasha</a></p>
</body></html>`;
}

async function simpSharePageResponse(request, env, id) {
  try {
    const stub = env?.LOBBY?.get(env.LOBBY.idFromName('public'));
    if (!stub) return Response.redirect(`https://lobby.getdasha.com/simp/r/${id}`, 308);
    const url = new URL(request.url);
    return stub.fetch(new Request(`${url.origin}/simp/r/${id}`, { method: request.method }));
  } catch {
    return Response.redirect(`https://lobby.getdasha.com/simp/r/${id}`, 308);
  }
}

function simpHoldResponse(origin) {
  return json({ configured: false, error: 'not_configured' }, 501, origin);
}

export function parseLearnPath(pathname) {
  const m = String(pathname || '').replace(/\/$/, '').match(/^\/learn(?:\/([^/]+))?(?:\/([^/]+))?$/);
  if (!m) return null;
  const track = m[1] || '';
  const mod = m[2] || '';
  if (track && !isLearnTrack(track)) return { invalid: true };
  if (mod && !isLearnModuleId(mod)) return { invalid: true };
  if (mod && MODULE_BY_ID.get(mod)?.track !== track) return { invalid: true };
  return { track, mod };
}

function faucetClientScript() {
  return `<script src="https://lobby.getdasha.com/client/faucet.js" integrity="${FAUCET_CLIENT_SRI}" crossorigin="anonymous" defer></script>`;
}

/** Worker-owned /faucet. Picture, dest, send. */
export function faucetPageHtml() {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Faucet — getdasha.com</title>
<link rel="canonical" href="https://www.getdasha.com/faucet">
<meta name="description" content="Faucet">
<meta name="theme-color" content="#070608">
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}html,body{margin:0;min-height:100%;background:var(--ink);color:var(--paper)}${AWARD_CHROME_CSS}body{box-sizing:border-box;min-height:100vh;padding:1.25rem;font:16px/1.45 Arial,Helvetica,sans-serif}a{color:var(--acid)}.faucet-hero{display:block;width:min(100%,720px);height:auto;background:#070608}footer{margin-top:36px;color:rgba(244,237,219,.62)}footer a{color:var(--acid);display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding:0 .4rem;font-family:"Arial Black",Helvetica,Arial,sans-serif}@media(prefers-reduced-motion:reduce)*{transition:none!important;animation:none!important}</style>
<body>
${cropTicksHtml()}
${hamburgerHtml({ path: '/faucet' })}
${faucetMountHtml()}
${siteFooter('/faucet')}
</body></html>`;
}

function magnetPageResponse(request, route) {
  if (route.redirect) {
    return Response.redirect(`https://www.getdasha.com${route.canonical}`, 308);
  }
  return new Response(request.method === 'HEAD' ? null : magnetPageHtml(route.kind, siteFooter(route.canonical)), {
    status: 200,
    headers: htmlHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'X-Dasha-Edge': route.kind,
    }),
  });
}

function faucetPageResponse(request) {
  return new Response(request.method === 'HEAD' ? null : faucetPageHtml(), {
    status: 200,
    headers: htmlHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'X-Dasha-Edge': 'faucet',
    }),
  });
}

async function faucetApiResponse(request, env, allowedOrigin) {
  if (request.method === 'OPTIONS') {
    if (!allowedOrigin && !env.ALLOW_ANY_ORIGIN) {
      return new Response(null, { status: 403, headers: SECURITY });
    }
    return new Response(null, {
      status: 204,
      headers: { ...SECURITY, ...corsHeaders(allowedOrigin || '*', { credentials: true }) },
    });
  }
  return handleFaucetApi(request, env, {
    json,
    allowedOrigin,
    endpoints: solanaRpcEndpoints(env),
  });
}


/** Curated public list only. Pending submissions never appear here. */
export function parseVerseSubmit(input) {
  const raw = String(input?.url || '').trim();
  const note = String(input?.note || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!raw || raw.length > 2048) return { error: 'Need an http(s) link.' };
  const lower = raw.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return { error: 'Need an http(s) link.' };
  let parsed;
  try { parsed = new URL(raw); } catch { return { error: 'Need an http(s) link.' }; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { error: 'Need an http(s) link.' };
  if (parsed.username || parsed.password) return { error: 'Need an http(s) link.' };
  return { url: parsed.href, note };
}

const NOT_FOUND_HTML = htmlPage('Page not found — $dasha', `<h1>Page not found</h1>
<p>This path is not a Dasha page.</p>
${WORKER_SITE_FOOTER}`, { chrome: true, path: '/' });

// Existing cherries mark (studio/assets/favicon.svg). Do not restyle.
const DASHA_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Dasha">
  <title>Dasha</title>
  <rect width="64" height="64" rx="14" fill="#070608"/>
  <g transform="translate(32 33) scale(0.82) translate(-32 -32)">
    <g fill="none" stroke="#dfff00" stroke-width="7" stroke-linecap="round">
      <path d="M18 31 C19 19 26 10 36 6"/>
      <path d="M46 37 C48 26 42 14 36 6"/>
    </g>
    <circle cx="17" cy="45" r="14" fill="#dfff00"/>
    <circle cx="46" cy="47" r="12" fill="#dfff00"/>
  </g>
</svg>`;

const ICON_PATHS = new Set([
  '/favicon.ico',
  '/favicon.svg',
  '/favicon.png',
  '/apple-touch-icon',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
]);

function isIconPath(pathname) {
  return ICON_PATHS.has(String(pathname || '').replace(/\/$/, '') || '/');
}

function faviconResponse(request) {
  return new Response(request.method === 'HEAD' ? null : DASHA_FAVICON_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Dasha-Edge': 'favicon',
    },
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function personalizeChessPage(html, { title, description, url, robots = 'index,follow' }) {
  const safeTitle = escapeHtml(String(title || 'Dasha Chess').slice(0, 100));
  const safeDescription = escapeHtml(String(description || 'Dasha versus Anna. Holder-only rated chess.').slice(0, 180));
  const safeUrl = escapeHtml(String(url || WWW_CHESS));
  const safeRobots = robots === 'noindex,follow' ? robots : 'index,follow';
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${safeUrl}">`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${safeDescription}">`)
    .replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${safeRobots}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${safeUrl}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${safeTitle}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${safeDescription}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${safeTitle}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${safeDescription}">`);
}

async function chessPageForRequest(request, env) {
  if (request.method === 'HEAD' || !env?.LOBBY) return CHESS_PAGE;
  const url = new URL(request.url);
  const gameId = url.searchParams.get('game');
  const tournamentId = url.searchParams.get('tournament');
  const challengeId = url.searchParams.get('challenge');
  const valid = value => /^[A-Za-z0-9_-]{6,24}$/.test(value || '');
  const apiPath = valid(gameId) ? `/chess/replay/${gameId}` : valid(challengeId) ? `/chess/challenge/${challengeId}` : valid(tournamentId) ? `/chess/tournament/${tournamentId}` : '';
  if (!apiPath) return CHESS_PAGE;
  try {
    const room = env.LOBBY.idFromName('public');
    const response = await env.LOBBY.get(room).fetch(new Request(`https://lobby.getdasha.com${apiPath}`));
    if (!response.ok) {
      if (valid(challengeId)) {
        return personalizeChessPage(CHESS_PAGE, {
          title: 'Challenge not found — Dasha Chess',
          description: 'This invite expired or was never created.',
          url: `${WWW_CHESS}?challenge=${encodeURIComponent(challengeId)}`,
          robots: 'noindex,follow',
        });
      }
      return CHESS_PAGE;
    }
    const data = await response.json();
    if (data.replay) {
      const replay = data.replay;
      return personalizeChessPage(CHESS_PAGE, {
        title: `@${replay.white.handle} ${replay.result} @${replay.black.handle} — Dasha Chess`,
        description: `${replay.moves.length} moves · ${replay.reason} · Replay every move.`,
        url: `${WWW_CHESS}?game=${encodeURIComponent(replay.id)}`,
      });
    }
    if (data.tournament) {
      const tournament = data.tournament;
      const state = tournament.status === 'registration' ? 'Open tournament' : tournament.status === 'active' ? 'Tournament in progress' : `${tournament.champion || 'Champion'} wins`;
      return personalizeChessPage(CHESS_PAGE, {
        title: `${tournament.name} — Dasha Chess`,
        description: `${state} · ${tournament.entrants.length}/${tournament.maxPlayers} players.`,
        url: `${WWW_CHESS}?tournament=${encodeURIComponent(tournament.id)}`,
      });
    }
    if (data.challenge) {
      const challenge = data.challenge;
      const state = challenge.status === 'open' ? 'Take Anna. Dasha has white.' : challenge.status === 'accepted' ? 'The table is claimed.' : 'This table is closed.';
      const title = challenge.status === 'open'
        ? `${challenge.creator} challenges you — Dasha Chess`
        : challenge.status === 'accepted'
          ? `${challenge.creator}'s table is claimed — Dasha Chess`
          : `${challenge.creator}'s table is closed — Dasha Chess`;
      return personalizeChessPage(CHESS_PAGE, {
        title,
        description: state,
        url: `${WWW_CHESS}?challenge=${encodeURIComponent(challenge.id)}`,
        robots: 'noindex,follow',
      });
    }
  } catch {
    /* generic card remains available */
  }
  return CHESS_PAGE;
}

const oauthStateCookie = (token = '') => `${OAUTH_COOKIE}=${token}; Path=/; Max-Age=${token ? 900 : 0}; HttpOnly; Secure; SameSite=Lax`;

const OAUTH_RETURN_OK = new Set([
  'https://www.getdasha.com/simp',
  'https://www.getdasha.com/chess',
  'https://lobby.getdasha.com/chess',
  'https://www.getdasha.com/lobby',
  'https://lobby.getdasha.com/lobby',
  'https://www.getdasha.com/faucet',
  'https://lobby.getdasha.com/faucet',
]);

function parseOAuthReturn(raw) {
  const value = String(raw || '').trim();
  if (OAUTH_RETURN_OK.has(value)) return value;
  const path = (value.startsWith('/') ? value : `/${value}`).split('?')[0].split('#')[0];
  if (path === '/graph') return 'https://www.getdasha.com/';
  if (path === '/simp') return 'https://www.getdasha.com/simp';
  if (path === '/chess') return 'https://www.getdasha.com/chess';
  if (path === '/lobby' || path === '/forum') return FORUM_WWW;
  if (path === '/faucet') return 'https://www.getdasha.com/faucet';
  return '';
}

function oauthHtmlResponse(body, status) {
  return new Response(body, {
    status,
    headers: privateHtmlHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': oauthStateCookie() }),
  });
}

export class DashaLobby {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.history = [];
    this.forumThreads = [];
    this.rates = new Map();
    this.simpRates = new Map();
    this.verseRates = new Map();
    this.versePending = [];
    this.nicks = new Map();
    this.ipJoins = new Map(); // ip -> { times: number[] }
    this.mutes = new Map(); // nickKey -> untilMs
    this.shield = false; // linked-only chat when true
    this.forceSlow = false;
    this.autoShieldUntil = 0;
    this.customPin = null; // { text, ts } or null
    this.presenceTimer = null;
    this.spamHits = { times: [] };
    /** @type {Record<string, object>} xId -> simp profile (internal; never public as-is) */
    this.simpProfiles = {};
    this.simpQuizAttempts = {};
    this.simpQuizMetrics = emptyQuizMetrics(Date.now());
    this.studioMetrics = emptyStudioMetrics(Date.now());
    this.simpQuizResults = {};
    this.simpClaims = {};
    this.simpSeasons = {};
    this.chessGames = {};
    this.chessRatings = {};
    this.chessCurrent = {};
    this.chessQueue = [];
    this.chessChallenges = {};
    this.chessTournaments = {};
    this.chessHidden = {};
    this.chessLooking = {};
    this.chessMetrics = emptyChessMetrics(Date.now());
    /** @type {Record<string, { handle: string, href: string, until: number, checkedAt: number }>} xId -> opt-in graph highlight */
    this.graphHighlights = {};
    this.stats = {
      joins: 0,
      chats: 0,
      rejectsFull: 0,
      rejectsIp: 0,
      mutes: 0,
      autoShields: 0,
      startedAt: Date.now(),
    };
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get('history');
      if (Array.isArray(stored)) this.history = pruneHistory(stored);
      const forumStored = await this.state.storage.get('forumThreads');
      if (Array.isArray(forumStored)) this.forumThreads = pruneForumThreads(forumStored);
      const muteRows = await this.state.storage.get('mutes');
      if (Array.isArray(muteRows)) {
        const now = Date.now();
        for (const row of muteRows) {
          if (row?.key && row.until > now) this.mutes.set(row.key, row.until);
        }
      }
      const flags = await this.state.storage.get('flags');
      if (flags && typeof flags === 'object') {
        this.shield = Boolean(flags.shield);
        this.forceSlow = Boolean(flags.forceSlow);
        this.autoShieldUntil = Number(flags.autoShieldUntil) || 0;
        if (flags.customPin && typeof flags.customPin.text === 'string') {
          this.customPin = flags.customPin;
        }
      }
      const simp = await this.state.storage.get('simpProfiles');
      if (simp && typeof simp === 'object' && !Array.isArray(simp)) this.simpProfiles = simp;
      const attempts = await this.state.storage.get('simpQuizAttempts');
      if (attempts && typeof attempts === 'object' && !Array.isArray(attempts)) this.simpQuizAttempts = attempts;
      const metrics = await this.state.storage.get('simpQuizMetrics');
      if (metrics && typeof metrics === 'object' && !Array.isArray(metrics)) this.simpQuizMetrics = { ...this.simpQuizMetrics, ...metrics, since: Number(metrics.since) || null };
      const studioMetrics = await this.state.storage.get('studioMetrics');
      if (studioMetrics && typeof studioMetrics === 'object' && !Array.isArray(studioMetrics)) {
        const completionSince = Number(studioMetrics.completionSince) || Date.now();
        this.studioMetrics = { ...this.studioMetrics, ...studioMetrics, since: Number(studioMetrics.since) || null, completionSince, sources: { ...this.studioMetrics.sources, ...studioMetrics.sources } };
        if (!Number(studioMetrics.completionSince)) await this.state.storage.put('studioMetrics', this.studioMetrics);
      }
      const results = await this.state.storage.get('simpQuizResults');
      if (results && typeof results === 'object' && !Array.isArray(results)) this.simpQuizResults = results;
      const claims = await this.state.storage.get('simpClaims');
      if (claims && typeof claims === 'object' && !Array.isArray(claims)) this.simpClaims = claims;
      const seasons = await this.state.storage.get('simpSeasons');
      if (seasons && typeof seasons === 'object' && !Array.isArray(seasons)) this.simpSeasons = seasons;
      const versePending = await this.state.storage.get('versePending');
      if (Array.isArray(versePending)) this.versePending = versePending;
      const chess = await this.state.storage.get('chessState');
      if (chess && typeof chess === 'object' && !Array.isArray(chess)) {
        if (chess.games && typeof chess.games === 'object') this.chessGames = chess.games;
        if (chess.ratings && typeof chess.ratings === 'object') this.chessRatings = chess.ratings;
        if (chess.current && typeof chess.current === 'object') this.chessCurrent = chess.current;
        if (Array.isArray(chess.queue)) this.chessQueue = chess.queue;
        if (chess.challenges && typeof chess.challenges === 'object') this.chessChallenges = chess.challenges;
        if (chess.tournaments && typeof chess.tournaments === 'object') this.chessTournaments = chess.tournaments;
        if (chess.hidden && typeof chess.hidden === 'object') this.chessHidden = chess.hidden;
        if (chess.metrics && typeof chess.metrics === 'object') this.chessMetrics = { ...this.chessMetrics, ...chess.metrics, since: Number(chess.metrics.since) || null };
        let migrated = false;
        for (const game of Object.values(this.chessGames)) if (game?.state?.status === 'active' && !game.clock) {
          game.clock = { w: CHESS_CLOCK_MS, b: CHESS_CLOCK_MS, activeSince: Date.now() };
          migrated = true;
        }
        if (migrated) await this.persistChess();
      }
      const chessMetrics = await this.state.storage.get('chessMetrics');
      if (chessMetrics && typeof chessMetrics === 'object' && !Array.isArray(chessMetrics)) {
        this.chessMetrics = { ...this.chessMetrics, ...chessMetrics, since: Number(chessMetrics.since) || null };
      }
      const graphHighlights = await this.state.storage.get('graphHighlights');
      if (graphHighlights && typeof graphHighlights === 'object' && !Array.isArray(graphHighlights)) this.graphHighlights = graphHighlights;
      const next = await this.state.storage.getAlarm();
      if (next == null) await this.state.storage.setAlarm(Date.now() + 5 * 60_000);
    });
  }

  async persistSimp() {
    await this.state.storage.put('simpProfiles', this.simpProfiles);
  }

  async persistSimpState() {
    await this.state.storage.put({ simpProfiles: this.simpProfiles, simpQuizAttempts: this.simpQuizAttempts, simpQuizMetrics: this.simpQuizMetrics, simpQuizResults: this.simpQuizResults, simpClaims: this.simpClaims, simpSeasons: this.simpSeasons });
  }

  async persistGraphHighlights() {
    await this.state.storage.put('graphHighlights', this.graphHighlights);
  }

  async dropOwnGraphHighlight(session) {
    const xId = session?.xId ? String(session.xId) : '';
    if (xId) await this.state.storage.delete(`graphHolder:${xId}`);
    const result = dropGraphHighlight(this.graphHighlights, session);
    if (result.dropped) {
      this.graphHighlights = result.rows;
      await this.persistGraphHighlights();
    }
    return result;
  }

  async publicGraphHighlights(now = Date.now()) {
    const next = pruneGraphHighlights(this.graphHighlights, now);
    if (Object.keys(next).length !== Object.keys(this.graphHighlights).length) {
      this.graphHighlights = next;
      await this.persistGraphHighlights();
    }
    return publicHighlights(this.graphHighlights, now);
  }

  async handleGraph(request, allowedOrigin) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const cred = { credentials: true };

    if (path === '/api/graph/highlights' && request.method === 'GET') {
      return json({ highlights: await this.publicGraphHighlights() }, 200, allowedOrigin || '*');
    }

    if (path === '/api/graph/wallet/challenge') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId || !session.handle) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      const publicKey = String((await requestJson(request)).publicKey || '');
      if (!isValidSolanaAddress(publicKey)) return json({ error: 'valid Solana address required' }, 400, allowedOrigin, cred);
      const allowed = simpRate(this.simpRates, `graph-challenge:${session.xId}`, 6);
      if (!allowed.ok) return json({ error: 'holder check rate limited', waitMs: allowed.waitMs }, 429, allowedOrigin, cred);
      const issuedAt = Date.now();
      const expiresAt = issuedAt + 5 * 60_000;
      const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, '0')).join('');
      const proofOrigin = new URL(allowedOrigin);
      const message = walletMessage({
        handle: session.handle,
        publicKey,
        nonce,
        issuedAt,
        expiresAt,
        domain: proofOrigin.host,
        uri: `${proofOrigin.origin}/`,
        requestId: 'graph-highlight',
      });
      const challenge = await signPayload(this.env.LOBBY_SESSION_SECRET, {
        kind: 'graph_highlight',
        xId: String(session.xId),
        publicKey,
        nonce,
        message,
        origin: proofOrigin.origin,
        exp: expiresAt,
      });
      await this.state.storage.put(`graphHolder:${session.xId}`, { nonce, exp: expiresAt });
      return json({ ok: true, message, challenge, expiresAt }, 200, allowedOrigin, cred);
    }

    if (path === '/api/graph/highlight' && request.method === 'DELETE') {
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      await this.dropOwnGraphHighlight(session);
      return json({ ok: true, highlights: await this.publicGraphHighlights() }, 200, allowedOrigin, cred);
    }

    if (path === '/api/graph/highlight') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId || !session.handle) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      const allowed = simpRate(this.simpRates, `graph-verify:${session.xId}`, 4);
      if (!allowed.ok) return json({ error: 'holder check rate limited', waitMs: allowed.waitMs }, 429, allowedOrigin, cred);
      const body = await requestJson(request);
      const challenge = await verifyPayload(this.env.LOBBY_SESSION_SECRET, body.challenge);
      if (
        !challenge
        || challenge.kind !== 'graph_highlight'
        || challenge.xId !== String(session.xId)
        || challenge.publicKey !== body.publicKey
        || challenge.origin !== allowedOrigin
      ) {
        return json({ error: 'invalid holder challenge' }, 401, allowedOrigin, cred);
      }
      const signatureOk = await verifyEd25519(challenge.message, body.publicKey, body.signature).catch(() => false);
      if (!signatureOk) return json({ error: 'invalid wallet signature' }, 400, allowedOrigin, cred);
      const key = `graphHolder:${session.xId}`;
      const pending = await this.state.storage.get(key);
      if (!pending || pending.nonce !== challenge.nonce || pending.exp < Date.now()) {
        return json({ error: 'holder challenge already used' }, 409, allowedOrigin, cred);
      }
      let holds;
      try { holds = await walletHoldsDasha(this.env, body.publicKey); }
      catch { return json({ error: 'Solana holder check unavailable — try again' }, 503, allowedOrigin, cred); }
      await this.state.storage.delete(key);
      if (!holds) return json({ error: 'wallet does not currently hold $dasha' }, 400, allowedOrigin, cred);
      const result = applyGraphHighlight(this.graphHighlights, session);
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      this.graphHighlights = result.rows;
      await this.persistGraphHighlights();
      return json({
        ok: true,
        highlight: result.highlight,
        highlights: publicHighlights(this.graphHighlights),
      }, 200, allowedOrigin, cred);
    }

    return json({ error: 'not found' }, 404, allowedOrigin, cred);
  }

  async handleVerse(request) {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, null);
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
    const allowed = simpRate(this.verseRates, `verse:${ip}`, 5);
    if (!allowed.ok) return json({ error: 'rate limit', waitMs: allowed.waitMs }, 429, null);
    const parsed = parseVerseSubmit(await requestJson(request));
    if (parsed.error) return json({ error: parsed.error }, 400, null);
    this.versePending.push({ id: id(), url: parsed.url, note: parsed.note, at: Date.now() });
    // ponytail: cap 200 pending rows; oldest drop. Review is manual, never public.
    if (this.versePending.length > 200) this.versePending.splice(0, this.versePending.length - 200);
    await this.state.storage.put('versePending', this.versePending);
    return json({ ok: true }, 200, null);
  }

  chessSnapshot() {
    return {
      games: this.chessGames,
      ratings: this.chessRatings,
      current: this.chessCurrent,
      queue: this.chessQueue,
      challenges: this.chessChallenges,
      tournaments: this.chessTournaments,
      hidden: this.chessHidden,
      metrics: this.chessMetrics,
    };
  }

  chessStorageBytes() {
    return new TextEncoder().encode(JSON.stringify(this.chessSnapshot())).byteLength;
  }

  async persistChess() {
    await this.state.storage.put('chessState', this.chessSnapshot());
  }

  async persistChessMetrics() {
    await this.state.storage.put('chessMetrics', this.chessMetrics);
  }

  chessRating(xId, handle = '') {
    const key = String(xId);
    return this.chessRatings[key] || { rating: CHESS_START_RATING, games: 0, wins: 0, losses: 0, draws: 0, handle: String(handle).toLowerCase() };
  }

  makeChessGame(first, second, { tournamentId = null, matchId = null, swap = false } = {}) {
    const flip = swap ? false : Boolean(crypto.getRandomValues(new Uint8Array(1))[0] & 1);
    const entrants = flip ? [second, first] : [first, second];
    const gameId = randomUrlToken(9), createdAt = Date.now();
    const game = {
      id: gameId,
      players: {
        w: { ...entrants[0], rating: this.chessRating(entrants[0].xId, entrants[0].handle).rating },
        b: { ...entrants[1], rating: this.chessRating(entrants[1].xId, entrants[1].handle).rating },
      },
      state: newChessState(), clock: { w: CHESS_CLOCK_MS, b: CHESS_CLOCK_MS, activeSince: createdAt }, createdAt, updatedAt: createdAt, rated: false,
      ...(tournamentId ? { tournamentId, matchId } : {}),
    };
    this.chessGames[gameId] = game;
    this.chessMetrics.gamesStarted++;
    this.chessCurrent[entrants[0].xId] = gameId;
    this.chessCurrent[entrants[1].xId] = gameId;
    return game;
  }

  activeTournamentFor(xId) {
    return Object.values(this.chessTournaments).find(row => (row.status === 'registration' || row.status === 'active') && row.entrants.some(player => player.xId === String(xId))) || null;
  }

  openChessChallengeFor(xId) {
    return Object.values(this.chessChallenges).find(row => row.creatorXId === String(xId) && row.status === 'open') || null;
  }

  pruneChessQueue(now = Date.now()) {
    const kept = new Set();
    const next = this.chessQueue.filter(row => {
      const ok = now - Number(row.at) < 15 * 60_000 && this.simpProfiles[row.xId] && Number(this.simpProfiles[row.xId].holderUntil) > now && !this.activeTournamentFor(row.xId) && !this.openChessChallengeFor(row.xId);
      if (ok) kept.add(row.xId);
      return ok;
    });
    const changed = next.length !== this.chessQueue.length;
    for (const row of this.chessQueue) if (!kept.has(row.xId)) this.clearChessLooking('queue', row.xId);
    this.chessQueue = next;
    return changed;
  }

  expireChessRegistrations(now = Date.now()) {
    let changed = false;
    for (const tournament of Object.values(this.chessTournaments)) if (tournament.status === 'registration' && now - Number(tournament.createdAt) >= CHESS_TOURNAMENT_REGISTRATION_MS) {
      tournament.status = 'cancelled';
      changed = true;
    }
    return changed;
  }

  expireChessChallenges(now = Date.now()) {
    let changed = false;
    for (const [id, challenge] of Object.entries(this.chessChallenges)) {
      if (challenge.status === 'open' && Number(challenge.expiresAt) <= now) {
        challenge.status = 'expired'; challenge.updatedAt = now; changed = true;
        this.clearChessLooking('challenge', id);
      } else if (challenge.status !== 'open' && now - Number(challenge.updatedAt || challenge.createdAt) >= CHESS_CHALLENGE_RETAIN_MS) {
        this.clearChessLooking('challenge', id);
        delete this.chessChallenges[id]; changed = true;
      }
    }
    return changed;
  }

  chessLookingUrl(kind, id) {
    return kind === 'challenge' ? `${WWW_CHESS}?challenge=${encodeURIComponent(id)}` : `${WWW_CHESS}?join=queue`;
  }

  broadcastChessLooking({ kind, id, xId }) {
    const key = `${kind}:${id}`;
    if (this.chessLooking[key]) return false;
    const rate = simpRate(this.simpRates, `chess-looking:${xId}`, 3);
    if (!rate.ok) return false;
    const url = this.chessLookingUrl(kind, id);
    this.chessLooking[key] = { kind, id, url, at: Date.now(), xId };
    this.broadcast({
      type: 'system',
      text: `Looking for a chess game. Join: ${url}`,
      ts: Date.now(),
      lookingFor: { id: key, url, kind },
    });
    return true;
  }

  clearChessLooking(kind, id) {
    const key = `${kind}:${id}`;
    if (!this.chessLooking[key]) return false;
    delete this.chessLooking[key];
    this.broadcast({
      type: 'system',
      text: 'Chess looking-for expired.',
      ts: Date.now(),
      lookingFor: { id: key, expired: true },
    });
    return true;
  }

  removeFromChessQueue(xId) {
    const before = this.chessQueue.some(row => row.xId === xId);
    this.chessQueue = this.chessQueue.filter(row => row.xId !== xId);
    if (before) this.clearChessLooking('queue', xId);
  }

  publicChessChallenge(challenge, viewerXId = '', viewerHolder = false) {
    if (!challenge) return null;
    const viewer = String(viewerXId);
    return {
      id: challenge.id,
      status: challenge.status,
      creator: `@${challenge.creatorHandle}`,
      creatorRating: this.chessRating(challenge.creatorXId, challenge.creatorHandle).rating,
      creatorIsMe: challenge.creatorXId === viewer,
      canAccept: challenge.status === 'open' && Boolean(viewer && viewer !== challenge.creatorXId && viewerHolder),
      createdAt: challenge.createdAt,
      expiresAt: challenge.expiresAt,
    };
  }

  publicChessTournament(tournament, viewerXId = '') {
    if (!tournament) return null;
    const entrants = tournament.entrants.map(player => ({ handle: player.handle, display: `@${player.handle}`, href: `https://x.com/${player.handle}`, rating: this.chessRating(player.xId, player.handle).rating }));
    return {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      organizer: `@${tournament.organizerHandle}`,
      organizerIsMe: tournament.organizerXId === String(viewerXId),
      joined: tournament.entrants.some(player => player.xId === String(viewerXId)),
      entrants,
      maxPlayers: 16,
      champion: tournament.champion ? `@${tournament.champion.handle}` : null,
      rounds: (tournament.rounds || []).map(round => ({
        number: round.number,
        byes: round.byes.map(player => `@${player.handle}`),
        matches: round.matches.map(match => ({
          id: match.id,
          white: match.whiteHandle ? `@${match.whiteHandle}` : null,
          black: match.blackHandle ? `@${match.blackHandle}` : null,
          winner: match.winnerHandle ? `@${match.winnerHandle}` : null,
          status: match.status,
          replays: (match.gameIds || [match.currentGameId]).filter(id => this.chessGames[id]?.state?.status === 'finished'),
        })),
      })),
      createdAt: tournament.createdAt,
      startedAt: tournament.startedAt || null,
      finishedAt: tournament.finishedAt || null,
    };
  }

  startTournamentRound(tournament, players) {
    if (players.length === 1) {
      if (tournament.status !== 'finished') this.chessMetrics.tournamentsCompleted++;
      tournament.status = 'finished';
      tournament.champion = players[0];
      tournament.finishedAt = Date.now();
      return tournament;
    }
    const pool = [...players], byes = [];
    if (pool.length % 2) byes.push(pool.pop());
    const round = { number: tournament.rounds.length + 1, byes, matches: [], startedAt: Date.now() };
    while (pool.length) {
      const first = pool.shift(), second = pool.shift(), matchId = randomUrlToken(6);
      const game = this.makeChessGame(first, second, { tournamentId: tournament.id, matchId });
      round.matches.push({ id: matchId, currentGameId: game.id, gameIds: [game.id], whiteXId: game.players.w.xId, whiteHandle: game.players.w.handle, blackXId: game.players.b.xId, blackHandle: game.players.b.handle, winnerXId: null, winnerHandle: null, status: 'playing' });
    }
    tournament.rounds.push(round);
    return tournament;
  }

  advanceChessTournament(game) {
    if (!game.tournamentId || game.state.status !== 'finished') return;
    const tournament = this.chessTournaments[game.tournamentId];
    const round = tournament?.rounds?.at(-1);
    const match = round?.matches?.find(row => row.id === game.matchId && row.currentGameId === game.id);
    if (!tournament || tournament.status !== 'active' || !match) return;
    if (game.state.result === '1/2-1/2') {
      const rematch = this.makeChessGame(game.players.b, game.players.w, { tournamentId: tournament.id, matchId: match.id, swap: true });
      match.currentGameId = rematch.id;
      match.gameIds.push(rematch.id);
      match.whiteXId = rematch.players.w.xId; match.whiteHandle = rematch.players.w.handle;
      match.blackXId = rematch.players.b.xId; match.blackHandle = rematch.players.b.handle;
      match.status = 'replay';
      return;
    }
    const winner = game.state.result === '1-0' ? game.players.w : game.players.b;
    match.winnerXId = winner.xId;
    match.winnerHandle = winner.handle;
    match.status = 'done';
    if (round.matches.some(row => !row.winnerXId)) return;
    const winnerIds = [...round.byes.map(player => player.xId), ...round.matches.map(row => row.winnerXId)];
    const next = winnerIds.map(xId => tournament.entrants.find(player => player.xId === xId)).filter(Boolean);
    this.startTournamentRound(tournament, next);
  }

  chessFinish(game, state) {
    const now = Date.now();
    const next = { ...game, state, updatedAt: now, ...(state.status === 'finished' ? { finishedAt: game.finishedAt || now } : {}) };
    if (state.status === 'finished' && !game.rated && !game.settled) {
      this.chessMetrics.gamesCompleted++;
      next.settled = true;
      if ((state.moves || []).length >= 2) {
        const white = this.chessRating(game.players.w.xId, game.players.w.handle);
        const black = this.chessRating(game.players.b.xId, game.players.b.handle);
        const settled = settleChessRatings(white, black, state.result);
        this.chessRatings[game.players.w.xId] = { ...settled.white, handle: game.players.w.handle };
        this.chessRatings[game.players.b.xId] = { ...settled.black, handle: game.players.b.handle };
        next.rated = true;
        next.players = {
          w: { ...game.players.w, rating: settled.white.rating },
          b: { ...game.players.b, rating: settled.black.rating },
        };
      }
    }
    this.chessGames[game.id] = next;
    this.advanceChessTournament(next);
    return next;
  }

  expireChessClock(game, now = Date.now()) {
    if (!game?.clock || game.state?.status !== 'active') return { game, expired: false };
    const side = game.state.turn;
    const remaining = Number(game.clock[side]) - Math.max(0, now - Number(game.clock.activeSince));
    if (remaining > 0) return { game, expired: false };
    const clock = { ...game.clock, [side]: 0, activeSince: now };
    const drawn = !canMate(game.state, side === 'w' ? 'b' : 'w');
    const state = { ...game.state, status: 'finished', result: drawn ? '1/2-1/2' : side === 'w' ? '0-1' : '1-0', reason: drawn ? 'timeout · no mating material' : 'timeout', version: (Number(game.state.version) || 0) + 1 };
    return { game: this.chessFinish({ ...game, clock }, state), expired: true };
  }

  clockAfterMove(game, side, now) {
    const remaining = Number(game.clock[side]) - Math.max(0, now - Number(game.clock.activeSince));
    return { ...game.clock, [side]: Math.max(0, remaining) + CHESS_INCREMENT_MS, activeSince: now };
  }

  deleteChessIdentity(xId) {
    const key = String(xId || '');
    this.removeFromChessQueue(key);
    for (const [id, challenge] of Object.entries(this.chessChallenges)) {
      if (challenge.creatorXId === key || challenge.acceptedByXId === key) {
        this.clearChessLooking('challenge', id);
        delete this.chessChallenges[id];
      }
    }
    delete this.chessRatings[key];
    delete this.chessHidden[key];
    delete this.chessCurrent[key];
    for (const [tournamentId, tournament] of Object.entries(this.chessTournaments)) {
      if (tournament.organizerXId !== key && !tournament.entrants.some(player => player.xId === key)) continue;
      if (tournament.status === 'registration' && tournament.organizerXId !== key) {
        tournament.entrants = tournament.entrants.filter(player => player.xId !== key);
        continue;
      }
      for (const round of tournament.rounds || []) for (const match of round.matches || []) {
        for (const gameId of match.gameIds || []) {
          const game = this.chessGames[gameId];
          if (!game) continue;
          const involved = game.players?.w?.xId === key || game.players?.b?.xId === key;
          if (involved) {
            for (const player of Object.values(game.players || {})) if (this.chessCurrent[player.xId] === gameId) delete this.chessCurrent[player.xId];
            delete this.chessGames[gameId];
          } else {
            const standalone = { ...game };
            delete standalone.tournamentId;
            delete standalone.matchId;
            this.chessGames[gameId] = standalone;
          }
        }
      }
      delete this.chessTournaments[tournamentId];
    }
    for (const [gameId, game] of Object.entries(this.chessGames)) {
      if (game.players?.w?.xId !== key && game.players?.b?.xId !== key) continue;
      const other = game.players.w.xId === key ? game.players.b.xId : game.players.w.xId;
      if (this.chessCurrent[other] === gameId) delete this.chessCurrent[other];
      delete this.chessGames[gameId];
    }
  }

  /**
   * Opt-in Simp Board HTTP API (same DO + session cookie as Lobby).
   * Never enrolls on OAuth callback or chat.
   */
  async handleSimp(request, allowedOrigin) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    const cred = { credentials: true };

    if (path === '/studio/event' && request.method === 'POST') {
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const input = await requestJson(request);
      const key = { open: 'opens', first_edit: 'firstEdits', completion: 'completions', export: 'exports', share_intent: 'shareIntents', share_success: 'shareSuccesses' }[input?.event];
      if (!key) return json({ error: 'invalid event' }, 400, allowedOrigin);
      this.studioMetrics[key]++;
      if (input.event === 'open') {
        const source = ['home', 'quiz', 'direct', 'other'].includes(input.source) ? input.source : 'other';
        this.studioMetrics.sources[source]++;
      }
      await this.state.storage.put('studioMetrics', this.studioMetrics);
      return json({ ok: true }, 200, allowedOrigin);
    }

    if (path === '/studio/metrics') {
      if (!modAllowed(request, this.env)) return json({ error: 'unauthorized' }, 401, allowedOrigin);
      if (request.method === 'GET') return json({ ok: true, metrics: this.studioMetrics, quizMetrics: this.simpQuizMetrics, chessMetrics: this.chessMetrics, chessStorage: { bytes: this.chessStorageBytes(), migrateAtBytes: 1_000_000 } }, 200, allowedOrigin);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin);
      const input = await requestJson(request);
      if (input?.action !== 'reset') return json({ error: 'invalid action' }, 400, allowedOrigin);
      const since = Date.now();
      this.studioMetrics = emptyStudioMetrics(since);
      this.simpQuizMetrics = emptyQuizMetrics(since);
      this.chessMetrics = emptyChessMetrics(since);
      await this.state.storage.put({ studioMetrics: this.studioMetrics, simpQuizMetrics: this.simpQuizMetrics, chessMetrics: this.chessMetrics });
      await this.persistChess();
      return json({ ok: true, reset: true, since }, 200, allowedOrigin);
    }

    if (path === '/studio/metrics/public' && request.method === 'GET') {
      return json(publicFunnelSummary(this.studioMetrics, this.simpQuizMetrics, this.chessMetrics), 200, allowedOrigin);
    }

    if (path.startsWith('/simp/result/') && request.method === 'GET') {
      const result = this.simpQuizResults[path.slice('/simp/result/'.length)];
      return result ? json({ ok: true, result: { correct: result.correct, total: result.total, title: result.title, lane: result.lane, ...(result.vibeNote ? { vibeNote: result.vibeNote } : {}) } }, 200, allowedOrigin) : json({ error: 'result not found' }, 404, allowedOrigin);
    }

    if (path.startsWith('/simp/r/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const id = path.slice('/simp/r/'.length);
      const result = this.simpQuizResults[id];
      const headOnly = request.method === 'HEAD';
      if (!result) {
        return new Response(headOnly ? null : simpResultMissingHtml(), {
          status: 404,
          headers: htmlHeaders({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
            'X-Dasha-Edge': 'simp-result',
          }),
        });
      }
      if (isProductHost(new URL(request.url).hostname)) {
        return new Response(headOnly ? null : simpSharePageHtml(result, id), {
          status: 200,
          headers: htmlHeaders({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'X-Dasha-Edge': 'simp-share',
          }),
        });
      }
      const identity = `${result.title} · ${result.lane}`;
      const description = `${result.correct}/${result.total} on the Dasha simp quiz. Beat this score.`;
      const resultUrl = `https://lobby.getdasha.com/simp/r/${id}`;
      const imageUrl = 'https://lobby.getdasha.com/simp/card/quiz.png';
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${identity}</title><link rel="canonical" href="${resultUrl}"><meta property="og:type" content="website"><meta property="og:site_name" content="getdasha"><meta property="og:url" content="${resultUrl}"><meta property="og:title" content="${identity}"><meta property="og:description" content="${description}"><meta property="og:image" content="${imageUrl}"><meta property="og:image:secure_url" content="${imageUrl}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="628"><meta property="og:image:alt" content="Dasha simp quiz"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${identity}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${imageUrl}"><meta name="twitter:image:alt" content="Dasha simp quiz"><style>body{margin:0;background:#070608;color:#f4eddb;font:20px/1.4 Arial,Helvetica,sans-serif;display:grid;place-items:center;min-height:100vh}.r{max-width:36rem;padding:32px}h1{font-size:clamp(42px,9vw,76px);line-height:.95}b{color:#dfff00}a{display:inline-block;background:#dfff00;color:#070608;padding:14px 20px;font-weight:900;text-decoration:none}</style></head><body><main class="r"><b>DASHA SIMP QUIZ</b><h1>${result.correct}/${result.total}<br>${identity}</h1><p>${description}</p><a href="https://www.getdasha.com/?challenge=${id}#simp">Beat this score</a></main></body></html>`;
      return new Response(headOnly ? null : html, { headers: htmlHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }) });
    }

    if (path === '/simp/hold') {
      return simpHoldResponse(allowedOrigin);
    }

    if (path === '/simp/board' && request.method === 'GET') {
      const board = buildPublicBoard(Object.values(this.simpProfiles), {
        limit: PUBLIC_BOARD_LIMIT,
      });
      return json(board, 200, allowedOrigin);
    }

    if (path === '/simp/me' && request.method === 'GET') {
      const session = await sessionFromRequest(this.env, request);
      return json({ ...meStatus(this.simpProfiles, session), claims: claimsForSession(this.simpClaims, session) }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/quiz/event' && request.method === 'POST') {
      const input = await requestJson(request);
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      if (input?.event !== 'share') return json({ error: 'invalid event' }, 400, allowedOrigin, cred);
      this.simpQuizMetrics.shares++;
      await this.state.storage.put('simpQuizMetrics', this.simpQuizMetrics);
      return json({ ok: true }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/quiz') {
      const session = await sessionFromRequest(this.env, request);
      const xId = session?.xId ? String(session.xId) : null;
      const completed = xId ? this.simpProfiles[xId]?.quiz : null;
      if (request.method === 'GET') return json({ ok: true, ...quizPublic(), ...(completed ? { completed: true, quiz: completed } : { ready: true }) }, 200, allowedOrigin, cred);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const input = await requestJson(request);
      if (!xId && !allowedOrigin) return json({ error: 'origin required' }, 403, null);
      if (input?.action === 'start') {
        if (!xId) return json({ error: 'link X to take the quiz' }, 401, allowedOrigin, cred);
        const cutoff = Date.now() - 60 * 60_000;
        for (const [key, attempt] of Object.entries(this.simpQuizAttempts)) if (key.startsWith('anon:') && Number(attempt?.updatedAt) < cutoff) delete this.simpQuizAttempts[key];
        // Scored retakes always allowed — wipe in-progress attempt and start a fresh scored run.
        const attempt = startQuizAttempt({ practice: false });
        this.simpQuizAttempts[xId] = attempt;
        this.simpQuizMetrics[completed ? 'replays' : 'starts']++;
        countMetric(this.simpQuizMetrics.reached, attempt.current);
        await this.persistSimpState();
        return json({
          ok: true,
          ...quizPublic(),
          retake: Boolean(completed),
          ...questionForAttempt(attempt),
        }, 200, allowedOrigin, cred);
      }
      if (input?.action === 'finalize') {
        if (!xId) return json({ error: 'link X to reveal your result' }, 401, allowedOrigin, cred);
        const anonKey = `anon:${String(input.attemptId || '')}`;
        const attempt = this.simpQuizAttempts[anonKey];
        const result = submitQuiz(this.simpProfiles, session, attempt);
        if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
        const resultId = randomUrlToken(9); result.quiz.resultUrl = simpShareWww(resultId); this.simpQuizResults[resultId] = result.quiz;
        this.simpProfiles = result.store;
        this.simpProfiles[xId] = { ...this.simpProfiles[xId], quiz: { ...result.quiz, resultUrl: result.quiz.resultUrl } };
        countQuizResult(this.simpQuizMetrics, attempt, result.quiz);
        delete this.simpQuizAttempts[anonKey]; await this.persistSimpState();
        return json({
          ok: true,
          done: true,
          retake: Boolean(result.retake),
          quiz: this.simpProfiles[xId].quiz,
          resultUrl: result.quiz.resultUrl,
          ...meStatus(this.simpProfiles, session),
        }, 200, allowedOrigin, cred);
      }
      if (!xId) return json({ error: 'link X to take the quiz' }, 401, allowedOrigin, cred);
      const attemptKey = xId;
      if (input?.action !== 'answer' || !this.simpQuizAttempts[attemptKey]) return json({ error: 'start quiz first' }, 400, allowedOrigin, cred);
      const prior = this.simpQuizAttempts[attemptKey];
      const advanced = answerQuizAttempt(prior, input.answer);
      if (!advanced.ok) return json({ error: advanced.error }, advanced.status || 400, allowedOrigin, cred);
      countMetric(this.simpQuizMetrics.answers, `${prior.current}:${input.answer}`);
      if (!advanced.done) {
        this.simpQuizAttempts[attemptKey] = advanced.attempt;
        countMetric(this.simpQuizMetrics.reached, advanced.attempt.current);
        await this.persistSimpState();
        return json({ ok: true, ...advanced }, 200, allowedOrigin, cred);
      }
      if (!xId) {
        this.simpQuizAttempts[attemptKey] = advanced.attempt;
        this.simpQuizMetrics.completions++;
        await this.persistSimpState();
        return json({ ok: true, done: true, linkRequired: true, attemptId: attemptKey.slice(5), feedback: advanced.feedback }, 200, allowedOrigin, cred);
      }
      const result = submitQuiz(this.simpProfiles, session, advanced.attempt);
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      this.simpProfiles = result.store;
      this.simpQuizMetrics.completions++;
      countQuizResult(this.simpQuizMetrics, advanced.attempt, result.quiz);
      const resultId = randomUrlToken(9); result.quiz.resultUrl = simpShareWww(resultId); this.simpQuizResults[resultId] = result.quiz;
      // Keep resultUrl on stored profile so Share always has a permanent link (incl. retakes / Perry).
      this.simpProfiles[xId] = { ...this.simpProfiles[xId], quiz: { ...result.quiz, resultUrl: result.quiz.resultUrl } };
      delete this.simpQuizAttempts[attemptKey];
      await this.persistSimpState();
      return json({
        ok: true,
        done: true,
        retake: Boolean(result.retake),
        feedback: advanced.feedback,
        quiz: this.simpProfiles[xId].quiz,
        resultUrl: result.quiz.resultUrl,
        ...meStatus(this.simpProfiles, session),
      }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/learn') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const session = await sessionFromRequest(this.env, request);
      const input = await requestJson(request);
      const moduleId = String(input?.moduleId || '');
      const known = isLearnModuleId(moduleId) ? MODULE_BY_ID.get(moduleId) : null;
      const result = applyLearnAward(this.simpProfiles, session, {
        moduleId,
        difficulty: known?.difficulty ?? input?.difficulty,
        tool: known?.tool ?? input?.tool,
        purchases: input?.purchases,
        balance: input?.balance,
        bagSize: input?.bagSize,
        referrals: input?.referrals,
      });
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      this.simpProfiles = result.store;
      await this.persistSimp();
      return json({
        ok: true,
        awarded: Boolean(result.awarded),
        retake: Boolean(result.retake),
        capped: Boolean(result.capped),
        points: result.points || 0,
        ...meStatus(this.simpProfiles, session),
      }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/join') {
      if (request.method !== 'POST') {
        return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      }
      const session = await sessionFromRequest(this.env, request);
      const result = joinBoard(this.simpProfiles, session);
      if (!result.ok) return json({ error: result.error }, result.status || 401, allowedOrigin, cred);
      this.simpProfiles = result.store;
      await this.persistSimp();
      return json(
        {
          ok: true,
          created: result.created,
          ...meStatus(this.simpProfiles, session),
        },
        200,
        allowedOrigin,
        cred,
      );
    }

    if (path === '/simp/leave') {
      if (request.method !== 'POST') {
        return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      }
      const session = await sessionFromRequest(this.env, request);
      const profile = session?.xId ? this.simpProfiles[String(session.xId)] : null;
      const result = leaveBoard(this.simpProfiles, session);
      if (!result.ok) return json({ error: result.error }, result.status || 401, allowedOrigin, cred);
      this.simpProfiles = result.store;
      for (const [claimId, claim] of Object.entries(this.simpClaims)) if (claim.xId === String(session.xId)) delete this.simpClaims[claimId];
      delete this.simpQuizAttempts[String(session.xId)];
      const resultId = String(profile?.quiz?.resultUrl || '').match(/\/simp\/r\/([^/?#]+)/)?.[1];
      if (resultId) delete this.simpQuizResults[resultId];
      this.simpSeasons = scrubSeasonSnapshots(this.simpSeasons, session.xId, profile?.handle || session.handle);
      this.deleteChessIdentity(session.xId);
      await this.state.storage.delete(`simpHolder:${session.xId}`);
      await this.dropOwnGraphHighlight(session);
      await this.persistSimpState();
      await this.persistChess();
      return json(
        {
          ok: true,
          removed: result.removed,
          ...meStatus(this.simpProfiles, session),
        },
        200,
        allowedOrigin,
        cred,
      );
    }

    if (path === '/simp/claims') {
      const session = await sessionFromRequest(this.env, request);
      if (request.method === 'GET') return json({ ok: true, claims: claimsForSession(this.simpClaims, session) }, 200, allowedOrigin, cred);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const result = submitClaim(this.simpClaims, this.simpProfiles, session, await requestJson(request), { id: id() });
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      this.simpClaims = result.claims;
      await this.persistSimpState();
      return json({ ok: true, claim: result.claim }, 201, allowedOrigin, cred);
    }

    if (path === '/simp/review') {
      if (!modAllowed(request, this.env)) return json({ error: 'mod denied' }, 403, allowedOrigin, cred);
      if (request.method === 'GET') return json({ ok: true, claims: pendingClaims(this.simpClaims) }, 200, allowedOrigin, cred);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const result = reviewClaim(this.simpClaims, this.simpProfiles, await requestJson(request));
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      this.simpClaims = result.claims;
      this.simpProfiles = result.profiles;
      await this.persistSimpState();
      return json({ ok: true, claim: result.claim }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/seasons' && request.method === 'GET') {
      return json({ ok: true, seasons: publicSeasons(this.simpSeasons) }, 200, allowedOrigin);
    }

    if (path === '/simp/seasons/snapshot') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (!modAllowed(request, this.env)) return json({ error: 'mod denied' }, 403, allowedOrigin, cred);
      const result = snapshotSeason(this.simpSeasons, this.simpProfiles, await requestJson(request));
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      this.simpSeasons = result.snapshots;
      await this.persistSimpState();
      return json({ ok: true, snapshot: result.snapshot }, 201, allowedOrigin, cred);
    }

    if (path === '/simp/wallet/challenge') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId || !this.simpProfiles[String(session.xId)]) return json({ error: 'join board first' }, 401, allowedOrigin, cred);
      const publicKey = String((await requestJson(request)).publicKey || '');
      if (!isValidSolanaAddress(publicKey)) return json({ error: 'valid Solana address required' }, 400, allowedOrigin, cred);
      const allowed = simpRate(this.simpRates, `holder-challenge:${session.xId}`, 6);
      if (!allowed.ok) return json({ error: 'holder check rate limited', waitMs: allowed.waitMs }, 429, allowedOrigin, cred);
      const issuedAt = Date.now(), expiresAt = issuedAt + 5 * 60_000;
      const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, '0')).join('');
      const proofOrigin = new URL(allowedOrigin);
      const message = walletMessage({ handle: session.handle, publicKey, nonce, issuedAt, expiresAt, domain: proofOrigin.host, uri: `${proofOrigin.origin}/` });
      const challenge = await signPayload(this.env.LOBBY_SESSION_SECRET, { kind: 'simp_holder', xId: String(session.xId), publicKey, nonce, message, origin: proofOrigin.origin, exp: expiresAt });
      await this.state.storage.put(`simpHolder:${session.xId}`, { nonce, exp: expiresAt });
      return json({ ok: true, message, challenge, expiresAt }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/wallet/verify') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const session = await sessionFromRequest(this.env, request);
      if (session?.xId) {
        const allowed = simpRate(this.simpRates, `holder-verify:${session.xId}`, 4);
        if (!allowed.ok) return json({ error: 'holder check rate limited', waitMs: allowed.waitMs }, 429, allowedOrigin, cred);
      }
      const body = await requestJson(request);
      const challenge = await verifyPayload(this.env.LOBBY_SESSION_SECRET, body.challenge);
      if (!session?.xId || !challenge || challenge.kind !== 'simp_holder' || challenge.xId !== String(session.xId) || challenge.publicKey !== body.publicKey || challenge.origin !== allowedOrigin) return json({ error: 'invalid holder challenge' }, 401, allowedOrigin, cred);
      const signatureOk = await verifyEd25519(challenge.message, body.publicKey, body.signature).catch(() => false);
      if (!signatureOk) return json({ error: 'invalid wallet signature' }, 400, allowedOrigin, cred);
      const key = `simpHolder:${session.xId}`;
      const pending = await this.state.storage.get(key);
      if (!pending || pending.nonce !== challenge.nonce || pending.exp < Date.now()) return json({ error: 'holder challenge already used' }, 409, allowedOrigin, cred);
      let holds;
      try { holds = await walletHoldsDasha(this.env, body.publicKey); }
      catch { return json({ error: 'Solana holder check unavailable — try again' }, 503, allowedOrigin, cred); }
      await this.state.storage.delete(key);
      if (!holds) return json({ error: 'wallet does not currently hold $dasha' }, 400, allowedOrigin, cred);
      const result = applyHolderProof(this.simpProfiles, session);
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      this.simpProfiles = result.profiles;
      await this.persistSimpState();
      return json({ ok: true, holder: true, checkedAt: result.profile.holderCheckedAt, expiresAt: result.profile.holderUntil }, 200, allowedOrigin, cred);
    }

    return json({ error: 'not found' }, 404, allowedOrigin, cred);
  }

  async handleChess(request, allowedOrigin) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const cred = { credentials: true };
    const session = await sessionFromRequest(this.env, request);
    const xId = session?.xId ? String(session.xId) : '';
    const profile = xId ? this.simpProfiles[xId] : null;
    const holder = Boolean(profile && Number(profile.holderUntil) > Date.now());
    const requireLinked = () => !xId ? json({ error: 'link X first' }, 401, allowedOrigin, cred) : null;
    const requireOrigin = () => request.method !== 'GET' && !allowedOrigin ? json({ error: 'origin required' }, 403, null) : null;
    const registrationExpired = this.expireChessRegistrations();
    if (this.expireChessChallenges() || registrationExpired) await this.persistChess();

    if (path === '/chess/event' && request.method === 'POST') {
      const input = await requestJson(request);
      const publicKey = { page_open: 'pageOpens', link_intent: 'linkIntents', enrollment_intent: 'enrollmentIntents', holder_proof_intent: 'holderProofIntents', queue_intent: 'queueIntents', buy_intent: 'buyIntents', replay_open: 'replayOpens', replay_play: 'replayPlayIntents', replay_share: 'replayShareIntents', replay_share_handoff: 'replayShareHandoffs', challenge_share: 'challengeShareIntents', tournament_share: 'tournamentShareIntents' }[input?.event];
      if (publicKey) {
        const blocked = requireOrigin();
        if (blocked) return blocked;
        const subject = xId ? `x:${xId}` : request.headers.get('CF-Connecting-IP');
        if (!subject) return json({ error: 'event subject required' }, 400, allowedOrigin, cred);
        const rate = simpRate(this.simpRates, `chess-event:${subject}`, 60);
        if (!rate.ok) return json({ error: 'event rate limited', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
        countMetric(this.chessMetrics, publicKey);
        await this.persistChessMetrics();
        return json({ ok: true }, 200, allowedOrigin, cred);
      }
      return json({ error: 'invalid event' }, 400, allowedOrigin, cred);
    }

    if (path === '/chess/me' && request.method === 'GET') {
      const gameId = xId ? this.chessCurrent[xId] : null;
      const expired = gameId ? this.expireChessClock(this.chessGames[gameId]) : { game: null, expired: false };
      if (expired.expired) await this.persistChess();
      const game = publicChessGame(expired.game, xId);
      const rating = xId ? this.chessRating(xId, session.handle) : null;
      return json({
        ok: true,
        linked: Boolean(xId),
        enrolled: Boolean(profile),
        holder,
        holderExpiresAt: holder ? Number(profile.holderUntil) : null,
        x: xId ? { display: `@${session.handle}`, href: `https://x.com/${session.handle}` } : null,
        rating: rating ? { rating: rating.rating, games: rating.games, wins: rating.wins, losses: rating.losses, draws: rating.draws } : null,
        queued: Boolean(xId && this.chessQueue.some(row => row.xId === xId)),
        game,
      }, 200, allowedOrigin, cred);
    }

    if (path === '/chess/mod/ratings') {
      if (!modAllowed(request, this.env)) return json({ error: 'mod denied' }, 403, allowedOrigin);
      if (request.method === 'GET') return json({ ok: true, hidden: Object.values(this.chessHidden).map(row => row.handle).sort() }, 200, allowedOrigin);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin);
      const input = await requestJson(request), handle = String(input?.handle || '').replace(/^@/, '').toLowerCase();
      const matches = Object.entries(this.chessRatings).filter(([, row]) => row?.handle === handle);
      if (!matches.length) return json({ error: 'rating not found' }, 404, allowedOrigin);
      if (matches.length > 1) return json({ error: 'ambiguous historic handle' }, 409, allowedOrigin);
      const found = matches[0];
      if (input?.action === 'hide') this.chessHidden[found[0]] = { handle, at: Date.now() };
      else if (input?.action === 'unhide') delete this.chessHidden[found[0]];
      else return json({ error: 'invalid action' }, 400, allowedOrigin);
      await this.persistChess();
      return json({ ok: true, handle, hidden: input.action === 'hide' }, 200, allowedOrigin);
    }

    if (path === '/chess/ratings' && request.method === 'GET') {
      const ratings = Object.entries(this.chessRatings)
        .filter(([xId, row]) => !this.chessHidden[xId] && row?.handle && Number(row.games) > 0)
        .map(([, row]) => row)
        .sort((a, b) => Number(b.rating) - Number(a.rating) || Number(b.games) - Number(a.games) || String(a.handle).localeCompare(String(b.handle)))
        .slice(0, 20)
        .map((row, index) => ({ rank: index + 1, handle: row.handle, display: `@${row.handle}`, href: `https://x.com/${row.handle}`, rating: row.rating, games: row.games, wins: row.wins, losses: row.losses, draws: row.draws }));
      const recent = Object.values(this.chessGames)
        .filter(game => game?.rated && game.state?.status === 'finished' && !this.chessHidden[game.players?.w?.xId] && !this.chessHidden[game.players?.b?.xId])
        .sort((a, b) => Number(b.finishedAt || b.updatedAt) - Number(a.finishedAt || a.updatedAt))
        .slice(0, 5)
        .map(game => ({ id: game.id, white: `@${game.players.w.handle}`, black: `@${game.players.b.handle}`, result: game.state.result }));
      return json({ ok: true, ratings, recent }, 200, allowedOrigin, cred);
    }

    const replayMatch = path.match(/^\/chess\/replay\/([A-Za-z0-9_-]{6,24})$/);
    if (replayMatch && request.method === 'GET') {
      const replay = publicChessReplay(this.chessGames[replayMatch[1]]);
      return replay ? json({ ok: true, replay }, 200, allowedOrigin, cred) : json({ error: 'replay not found' }, 404, allowedOrigin, cred);
    }

    if (path === '/chess/challenges') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const blocked = requireOrigin() || requireLinked();
      if (blocked) return blocked;
      const rate = simpRate(this.simpRates, `chess-challenge:${xId}`, 12);
      if (!rate.ok) return json({ error: 'challenge actions rate limited', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
      if (!profile || !holder) return json({ error: 'current holder proof required' }, 403, allowedOrigin, cred);
      const current = this.chessGames[this.chessCurrent[xId]];
      if (current?.state?.status === 'active') return json({ error: 'finish your current game first' }, 409, allowedOrigin, cred);
      if (this.activeTournamentFor(xId)) return json({ error: 'leave or finish the tournament first' }, 409, allowedOrigin, cred);
      const input = await requestJson(request);
      const existing = this.openChessChallengeFor(xId);
      if (existing) {
        if (input?.askLobby) this.broadcastChessLooking({ kind: 'challenge', id: existing.id, xId });
        return json({ ok: true, challenge: this.publicChessChallenge(existing, xId, holder) }, 200, allowedOrigin, cred);
      }
      const id = randomUrlToken(9), createdAt = Date.now();
      const challenge = { id, creatorXId: xId, creatorHandle: String(session.handle).toLowerCase(), status: 'open', createdAt, expiresAt: createdAt + CHESS_CHALLENGE_MS, updatedAt: createdAt };
      this.chessChallenges[id] = challenge;
      this.removeFromChessQueue(xId);
      this.chessMetrics.challengesCreated++;
      if (input?.askLobby) this.broadcastChessLooking({ kind: 'challenge', id, xId });
      await this.persistChess();
      return json({ ok: true, challenge: this.publicChessChallenge(challenge, xId, holder) }, 201, allowedOrigin, cred);
    }

    const challengeMatch = path.match(/^\/chess\/challenge\/([A-Za-z0-9_-]{6,24})$/);
    if (challengeMatch) {
      const challenge = this.chessChallenges[challengeMatch[1]];
      if (!challenge) return json({ error: 'This challenge was not found or has expired.' }, 404, allowedOrigin, cred);
      if (request.method === 'GET') return json({ ok: true, challenge: this.publicChessChallenge(challenge, xId, holder) }, 200, allowedOrigin, cred);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const blocked = requireOrigin() || requireLinked();
      if (blocked) return blocked;
      const rate = simpRate(this.simpRates, `chess-challenge:${xId}`, 12);
      if (!rate.ok) return json({ error: 'challenge actions rate limited', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
      const input = await requestJson(request);
      if (input?.action === 'cancel') {
        if (challenge.creatorXId !== xId) return json({ error: 'only the creator can cancel' }, 403, allowedOrigin, cred);
        if (challenge.status !== 'open') return json({ error: 'challenge is not open' }, 409, allowedOrigin, cred);
        challenge.status = 'cancelled'; challenge.updatedAt = Date.now();
        this.clearChessLooking('challenge', challenge.id);
        await this.persistChess();
        return json({ ok: true, challenge: this.publicChessChallenge(challenge, xId, holder) }, 200, allowedOrigin, cred);
      }
      if (input?.action === 'ask') {
        if (challenge.creatorXId !== xId) return json({ error: 'only the creator can ask the lobby' }, 403, allowedOrigin, cred);
        if (challenge.status !== 'open') return json({ error: 'challenge is not open' }, 409, allowedOrigin, cred);
        this.broadcastChessLooking({ kind: 'challenge', id: challenge.id, xId });
        return json({ ok: true, challenge: this.publicChessChallenge(challenge, xId, holder), asked: Boolean(this.chessLooking[`challenge:${challenge.id}`]) }, 200, allowedOrigin, cred);
      }
      if (input?.action !== 'accept') return json({ error: 'invalid challenge action' }, 400, allowedOrigin, cred);
      if (challenge.status === 'accepted' && challenge.acceptedByXId === xId) {
        const existing = this.chessGames[challenge.gameId];
        if (existing) return json({ ok: true, challenge: this.publicChessChallenge(challenge, xId, holder), game: publicChessGame(existing, xId) }, 200, allowedOrigin, cred);
      }
      if (!profile || !holder) return json({ error: 'current holder proof required' }, 403, allowedOrigin, cred);
      if (challenge.status !== 'open') return json({ error: 'challenge is not open' }, 409, allowedOrigin, cred);
      if (challenge.creatorXId === xId) return json({ error: 'you cannot accept your own challenge' }, 409, allowedOrigin, cred);
      const creatorProfile = this.simpProfiles[challenge.creatorXId];
      if (!creatorProfile || Number(creatorProfile.holderUntil) <= Date.now()) return json({ error: 'challenger must refresh holder proof' }, 409, allowedOrigin, cred);
      for (const playerId of [challenge.creatorXId, xId]) {
        const current = this.chessGames[this.chessCurrent[playerId]];
        if (current?.state?.status === 'active') return json({ error: 'a player is already in a game' }, 409, allowedOrigin, cred);
        if (this.activeTournamentFor(playerId)) return json({ error: 'a player is in a tournament' }, 409, allowedOrigin, cred);
      }
      const game = this.makeChessGame({ xId: challenge.creatorXId, handle: challenge.creatorHandle }, { xId, handle: String(session.handle).toLowerCase() }, { swap: true });
      challenge.status = 'accepted'; challenge.acceptedByXId = xId; challenge.gameId = game.id; challenge.updatedAt = Date.now();
      this.removeFromChessQueue(challenge.creatorXId);
      this.removeFromChessQueue(xId);
      this.clearChessLooking('challenge', challenge.id);
      this.chessMetrics.challengesAccepted++;
      await this.persistChess();
      return json({ ok: true, challenge: this.publicChessChallenge(challenge, xId, holder), game: publicChessGame(game, xId) }, 201, allowedOrigin, cred);
    }

    if (path === '/chess/tournaments') {
      if (request.method === 'GET') {
        const tournaments = Object.values(this.chessTournaments)
          .filter(row => row.status !== 'cancelled')
          .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
          .slice(0, 12)
          .map(row => this.publicChessTournament(row, xId));
        return json({ ok: true, tournaments }, 200, allowedOrigin, cred);
      }
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const blocked = requireOrigin() || requireLinked();
      if (blocked) return blocked;
      const existing = Object.values(this.chessTournaments).find(row => row.organizerXId === xId && (row.status === 'registration' || row.status === 'active'));
      if (existing) return json({ ok: true, tournament: this.publicChessTournament(existing, xId) }, 200, allowedOrigin, cred);
      const rate = simpRate(this.simpRates, `chess-tournament:${xId}`, 12);
      if (!rate.ok) return json({ error: 'tournament actions rate limited', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
      if (!profile || !holder) return json({ error: 'current holder proof required' }, 403, allowedOrigin, cred);
      if (this.openChessChallengeFor(xId)) return json({ error: 'cancel your open challenge first' }, 409, allowedOrigin, cred);
      if (Object.values(this.chessTournaments).some(row => row.status === 'registration' || row.status === 'active')) return json({ error: 'a tournament is already open' }, 409, allowedOrigin, cred);
      const current = this.chessGames[this.chessCurrent[xId]];
      if (current?.state?.status === 'active') return json({ error: 'finish your current game first' }, 409, allowedOrigin, cred);
      const input = await requestJson(request);
      const name = String(input?.name || '').trim().replace(/\s+/g, ' ').slice(0, 48);
      if (name.length < 3) return json({ error: 'tournament name is too short' }, 400, allowedOrigin, cred);
      const id = randomUrlToken(8), createdAt = Date.now();
      const tournament = { id, name, organizerXId: xId, organizerHandle: session.handle, status: 'registration', entrants: [{ xId, handle: session.handle }], rounds: [], champion: null, createdAt, startedAt: null, finishedAt: null };
      this.chessTournaments[id] = tournament;
      this.removeFromChessQueue(xId);
      this.chessMetrics.tournamentsCreated++;
      await this.persistChess();
      return json({ ok: true, tournament: this.publicChessTournament(tournament, xId) }, 201, allowedOrigin, cred);
    }

    const tournamentMatch = path.match(/^\/chess\/tournament\/([A-Za-z0-9_-]{6,24})$/);
    if (tournamentMatch) {
      const tournament = this.chessTournaments[tournamentMatch[1]];
      if (!tournament || tournament.status === 'cancelled') return json({ error: 'tournament not found' }, 404, allowedOrigin, cred);
      if (request.method === 'GET') return json({ ok: true, tournament: this.publicChessTournament(tournament, xId) }, 200, allowedOrigin, cred);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const blocked = requireOrigin() || requireLinked();
      if (blocked) return blocked;
      const rate = simpRate(this.simpRates, `chess-tournament:${xId}`, 12);
      if (!rate.ok) return json({ error: 'tournament actions rate limited', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
      const input = await requestJson(request);
      if (input?.action === 'start' && tournament.organizerXId === xId && (tournament.status === 'active' || tournament.status === 'finished')) {
        return json({ ok: true, tournament: this.publicChessTournament(tournament, xId) }, 200, allowedOrigin, cred);
      }
      if (input?.action === 'join') {
        if (tournament.status !== 'registration') return json({ error: 'registration is closed' }, 409, allowedOrigin, cred);
        if (!profile || !holder) return json({ error: 'current holder proof required' }, 403, allowedOrigin, cred);
        const joined = tournament.entrants.some(row => row.xId === xId);
        if (!joined && tournament.entrants.length >= 16) return json({ error: 'tournament is full' }, 409, allowedOrigin, cred);
        const current = this.chessGames[this.chessCurrent[xId]];
        if (current?.state?.status === 'active') return json({ error: 'finish your current game first' }, 409, allowedOrigin, cred);
        if (this.openChessChallengeFor(xId)) return json({ error: 'cancel your open challenge first' }, 409, allowedOrigin, cred);
        if (!joined) {
          tournament.entrants.push({ xId, handle: session.handle });
          this.chessMetrics.tournamentJoins++;
        }
        this.removeFromChessQueue(xId);
      } else if (input?.action === 'leave') {
        if (tournament.status !== 'registration') return json({ error: 'registration is closed' }, 409, allowedOrigin, cred);
        if (tournament.organizerXId === xId) return json({ error: 'organizer can cancel the tournament' }, 409, allowedOrigin, cred);
        tournament.entrants = tournament.entrants.filter(row => row.xId !== xId);
      } else if (input?.action === 'cancel') {
        if (tournament.organizerXId !== xId || tournament.status !== 'registration') return json({ error: 'organizer cannot cancel now' }, 403, allowedOrigin, cred);
        tournament.status = 'cancelled';
      } else if (input?.action === 'start') {
        if (tournament.organizerXId !== xId || tournament.status !== 'registration') return json({ error: 'organizer cannot start now' }, 403, allowedOrigin, cred);
        if (tournament.entrants.length < 2) return json({ error: 'two holders are required' }, 409, allowedOrigin, cred);
        for (const entrant of tournament.entrants) {
          if (!this.simpProfiles[entrant.xId] || Number(this.simpProfiles[entrant.xId].holderUntil) <= Date.now()) return json({ error: `@${entrant.handle} must refresh holder proof` }, 409, allowedOrigin, cred);
          const active = this.chessGames[this.chessCurrent[entrant.xId]];
          if (active?.state?.status === 'active') return json({ error: `@${entrant.handle} is already playing` }, 409, allowedOrigin, cred);
        }
        for (let i = tournament.entrants.length - 1; i > 0; i--) {
          const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
          [tournament.entrants[i], tournament.entrants[j]] = [tournament.entrants[j], tournament.entrants[i]];
        }
        tournament.status = 'active'; tournament.startedAt = Date.now();
        const entrantIds = new Set(tournament.entrants.map(row => row.xId));
        for (const entrantId of entrantIds) this.removeFromChessQueue(entrantId);
        this.chessMetrics.tournamentsStarted++;
        this.startTournamentRound(tournament, tournament.entrants);
      } else return json({ error: 'invalid tournament action' }, 400, allowedOrigin, cred);
      await this.persistChess();
      return json({ ok: true, tournament: this.publicChessTournament(tournament, xId) }, 200, allowedOrigin, cred);
    }

    if (path === '/chess/queue') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const blocked = requireOrigin() || requireLinked();
      if (blocked) return blocked;
      if (!profile) return json({ error: 'join the Simp Board first' }, 403, allowedOrigin, cred);
      if (!holder) return json({ error: 'prove current $dasha ownership first' }, 403, allowedOrigin, cred);
      const rate = simpRate(this.simpRates, `chess-queue:${xId}`, 10);
      if (!rate.ok) return json({ error: 'matchmaking rate limited', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
      const input = await requestJson(request);
      this.pruneChessQueue();
      if (input?.action === 'cancel') {
        this.removeFromChessQueue(xId);
        await this.persistChess();
        return json({ ok: true, queued: false }, 200, allowedOrigin, cred);
      }
      if (this.chessQueue.some(row => row.xId === xId)) return json({ ok: true, queued: true }, 200, allowedOrigin, cred);
      const currentId = this.chessCurrent[xId];
      const current = currentId && this.chessGames[currentId];
      if (current?.state?.status === 'active') return json({ ok: true, matched: true, game: publicChessGame(current, xId) }, 200, allowedOrigin, cred);
      if (currentId) delete this.chessCurrent[xId];
      if (this.activeTournamentFor(xId)) return json({ error: 'leave or finish the tournament before casual matchmaking' }, 409, allowedOrigin, cred);
      if (this.openChessChallengeFor(xId)) return json({ error: 'cancel your open challenge before matchmaking' }, 409, allowedOrigin, cred);
      this.removeFromChessQueue(xId);
      const opponent = this.chessQueue.shift();
      if (opponent) this.clearChessLooking('queue', opponent.xId);
      if (!opponent) {
        this.chessQueue.push({ xId, handle: String(session.handle).toLowerCase(), at: Date.now() });
        this.broadcastChessLooking({ kind: 'queue', id: xId, xId });
        await this.persistChess();
        return json({ ok: true, queued: true }, 200, allowedOrigin, cred);
      }
      const game = this.makeChessGame(opponent, { xId, handle: session.handle });
      await this.persistChess();
      return json({ ok: true, matched: true, game: publicChessGame(game, xId) }, 201, allowedOrigin, cred);
    }

    const gameMatch = path.match(/^\/chess\/game\/([A-Za-z0-9_-]{6,24})$/);
    if (gameMatch) {
      const blocked = requireLinked();
      if (blocked) return blocked;
      let game = this.chessGames[gameMatch[1]];
      const expired = this.expireChessClock(game);
      game = expired.game;
      if (expired.expired) await this.persistChess();
      const publicGame = publicChessGame(game, xId);
      if (!game || !publicGame) return json({ error: 'game not found' }, 404, allowedOrigin, cred);
      if (request.method === 'GET') return json({ ok: true, game: publicGame }, 200, allowedOrigin, cred);
      const originBlocked = requireOrigin();
      if (originBlocked) return originBlocked;
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (expired.expired) return json({ error: 'time expired', game: publicGame }, 409, allowedOrigin, cred);
      const rate = simpRate(this.simpRates, `chess-move:${xId}`, 40);
      if (!rate.ok) return json({ error: 'move rate limited', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
      const input = await requestJson(request);
      const crossed = this.expireChessClock(game);
      if (crossed.expired) {
        game = crossed.game;
        await this.persistChess();
        return json({ error: 'time expired', game: publicChessGame(game, xId) }, 409, allowedOrigin, cred);
      }
      if (Number(input?.version) !== Number(game.state.version)) return json({ error: 'position changed', game: publicChessGame(game, xId) }, 409, allowedOrigin, cred);
      const side = game.players.w.xId === xId ? 'w' : 'b';
      if (input?.action === 'rematch') {
        if (game.state.status !== 'finished') return json({ error: 'finish this game first' }, 409, allowedOrigin, cred);
        if (game.tournamentId) return json({ error: 'tournament rematches are automatic' }, 409, allowedOrigin, cred);
        if (!holder) return json({ error: 'refresh holder proof first' }, 403, allowedOrigin, cred);
        if (game.rematchGameId) {
          const existing = this.chessGames[game.rematchGameId];
          return json({ ok: true, game: publicChessGame(existing, xId) || publicChessGame(game, xId) }, 200, allowedOrigin, cred);
        }
        const opponentId = side === 'w' ? game.players.b.xId : game.players.w.xId;
        for (const playerId of [xId, opponentId]) {
          const current = this.chessGames[this.chessCurrent[playerId]];
          if (current?.id !== game.id && current?.state?.status === 'active') return json({ error: 'finish the active game before rematching' }, 409, allowedOrigin, cred);
          if (this.activeTournamentFor(playerId)) return json({ error: 'leave or finish the tournament before rematching' }, 409, allowedOrigin, cred);
          if (this.openChessChallengeFor(playerId)) return json({ error: 'cancel the open challenge before rematching' }, 409, allowedOrigin, cred);
        }
        if (!game.rematchOfferBy) {
          game.rematchOfferBy = xId;
          game.updatedAt = Date.now();
          this.chessGames[game.id] = game;
          this.chessMetrics.rematchesOffered++;
          await this.persistChess();
          return json({ ok: true, game: publicChessGame(game, xId) }, 200, allowedOrigin, cred);
        }
        if (game.rematchOfferBy === xId) return json({ ok: true, game: publicChessGame(game, xId) }, 200, allowedOrigin, cred);
        const opponentProfile = this.simpProfiles[opponentId];
        if (!opponentProfile || Number(opponentProfile.holderUntil) <= Date.now()) return json({ error: 'opponent must refresh holder proof' }, 409, allowedOrigin, cred);
        this.removeFromChessQueue(xId);
        this.removeFromChessQueue(opponentId);
        const rematch = this.makeChessGame(game.players.b, game.players.w, { swap: true });
        this.chessMetrics.rematchesAccepted++;
        game.rematchGameId = rematch.id;
        game.updatedAt = Date.now();
        this.chessGames[game.id] = game;
        await this.persistChess();
        return json({ ok: true, game: publicChessGame(rematch, xId) }, 201, allowedOrigin, cred);
      }
      let result;
      if (input?.action === 'abort') {
        if (game.tournamentId) return json({ error: 'tournament games cannot be aborted' }, 409, allowedOrigin, cred);
        if (game.state.moves.length && game.state.turn !== side) return json({ error: 'only the player to move can abort' }, 409, allowedOrigin, cred);
        result = abortChess(game.state);
      }
      else if (input?.action === 'resign') result = resignChess(game.state, side);
      else if (input?.action === 'offer_draw') {
        if (game.state.moves.length < 2) return json({ error: 'play one move each before offering a draw' }, 409, allowedOrigin, cred);
        if (game.drawOfferBy && game.drawOfferBy !== xId) {
          result = { ok: true, state: { ...game.state, status: 'finished', result: '1/2-1/2', reason: 'draw agreed', version: Number(game.state.version) + 1 } };
        } else {
          if (game.state.turn === side) return json({ error: 'offer a draw after your move' }, 409, allowedOrigin, cred);
          game.drawOfferBy = xId;
          game.updatedAt = Date.now();
          this.chessGames[game.id] = game;
          await this.persistChess();
          return json({ ok: true, game: publicChessGame(game, xId) }, 200, allowedOrigin, cred);
        }
      }
      else {
        if (game.state.turn !== side) return json({ error: 'wait for your turn' }, 409, allowedOrigin, cred);
        result = playMove(game.state, input);
      }
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      const now = Date.now();
      const timed = input?.action === 'resign' || input?.action === 'offer_draw' || input?.action === 'abort' ? game : { ...game, drawOfferBy: null, clock: this.clockAfterMove(game, side, now) };
      const next = this.chessFinish(timed, result.state);
      if (input?.action === 'abort') {
        delete this.chessCurrent[next.players.w.xId];
        delete this.chessCurrent[next.players.b.xId];
      }
      await this.persistChess();
      return json({ ok: true, game: publicChessGame(next, xId) }, 200, allowedOrigin, cred);
    }

    return json({ error: 'not found' }, 404, allowedOrigin, cred);
  }

  async alarm() {
    this.history = pruneHistory(this.history);
    await this.state.storage.put('history', this.history.slice(-MAX_HISTORY));
    this.forumThreads = pruneForumThreads(this.forumThreads);
    await this.state.storage.put('forumThreads', this.forumThreads);
    // Drop expired mutes + idle sockets
    const now = Date.now();
    let chessChanged = this.pruneChessQueue(now);
    if (this.expireChessRegistrations(now)) chessChanged = true;
    if (this.expireChessChallenges(now)) chessChanged = true;
    for (const game of Object.values(this.chessGames)) {
      const result = this.expireChessClock(game, now);
      if (result.expired) chessChanged = true;
    }
    if (chessChanged) await this.persistChess();
    for (const [k, until] of [...this.mutes.entries()]) {
      if (until <= now) this.mutes.delete(k);
    }
    for (const [key, rate] of this.simpRates) if (now - rate.lastMs > 60 * 60_000) this.simpRates.delete(key);
    await this.persistMutes();
    for (const ws of this.state.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment() || {};
        const last = Number(att.lastActive) || Number(att.joined) || 0;
        if (last && now - last > IDLE_MS) {
          try {
            ws.close(4003, 'idle timeout');
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    }
    await this.state.storage.setAlarm(Date.now() + 5 * 60_000);
  }

  async persist() {
    this.history = pruneHistory(this.history);
    await this.state.storage.put('history', this.history.slice(-MAX_HISTORY));
  }

  async persistForum() {
    this.forumThreads = pruneForumThreads(this.forumThreads);
    await this.state.storage.put('forumThreads', this.forumThreads);
  }

  forumIdentity(session, body) {
    if (session?.handle) {
      const handle = String(session.handle).toLowerCase();
      return { ok: true, nick: `@${handle}`, handle };
    }
    return validateNick(body?.nick);
  }

  async handleForum(request, allowedOrigin) {
    const parsed = parseForumThreadPath(new URL(request.url).pathname);
    const cred = { credentials: true };
    if (!parsed) return json({ error: 'not found' }, 404, allowedOrigin);

    if (request.method === 'GET') {
      if (parsed.list) {
        const threads = this.forumThreads.map(thread => publicForumRow(thread)).sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
        return json({ threads }, 200, allowedOrigin || '*');
      }
      const thread = this.forumThreads.find(row => row.id === parsed.id);
      if (!thread) return json({ error: 'not found' }, 404, allowedOrigin || '*');
      return json(publicForumThread(thread), 200, allowedOrigin || '*');
    }

    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
    if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);

    const session = await sessionFromRequest(this.env, request);
    const body = await requestJson(request);
    const who = this.forumIdentity(session, body);
    if (!who.ok) return json({ error: who.error }, 400, allowedOrigin, cred);
    const limits = linkedLimits(Boolean(session?.handle));
    const msg = validateMessage(body.text, { maxText: limits.maxText });
    if (!msg.ok) return json({ error: msg.error }, 400, allowedOrigin, cred);

    const rateKey = `forum:${session?.xId || request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'}`;
    const rateState = this.rates.get(rateKey) || { lastMs: 0, times: [] };
    this.rates.set(rateKey, rateState);
    const rate = checkRate(rateState, Date.now(), { rateMs: limits.rateMs, maxPerMin: limits.maxPerMin });
    if (!rate.ok) return json({ error: rate.error, waitMs: rate.waitMs }, 429, allowedOrigin, cred);
    const dup = checkRepeat(rateState, msg.text);
    if (!dup.ok) return json({ error: dup.error, waitMs: dup.waitMs }, 429, allowedOrigin, cred);

    if (parsed.list) {
      const thread = { id: id(), text: msg.text, nick: who.nick, handle: who.handle || null, ts: Date.now(), replies: [] };
      this.forumThreads.push(thread);
      await this.persistForum();
      return json(publicForumThread(thread), 200, allowedOrigin, cred);
    }

    const thread = this.forumThreads.find(row => row.id === parsed.id);
    if (!thread) return json({ error: 'not found' }, 404, allowedOrigin, cred);
    thread.replies.push({ id: id(), text: msg.text, nick: who.nick, handle: who.handle || null, ts: Date.now() });
    await this.persistForum();
    return json(publicForumThread(thread), 200, allowedOrigin, cred);
  }

  async persistMutes() {
    const rows = [];
    const now = Date.now();
    for (const [key, until] of this.mutes.entries()) {
      if (until > now) rows.push({ key, until });
    }
    await this.state.storage.put('mutes', rows);
  }

  async persistFlags() {
    await this.state.storage.put('flags', {
      shield: this.shield,
      forceSlow: this.forceSlow,
      autoShieldUntil: this.autoShieldUntil,
      customPin: this.customPin,
    });
  }

  effectiveShield() {
    if (this.autoShieldUntil && Date.now() < this.autoShieldUntil) return true;
    return this.shield;
  }

  activePin() {
    if (this.customPin?.text) {
      return { type: 'pin', text: this.customPin.text, mint: MINT, custom: true };
    }
    return PIN;
  }

  maybeAutoShield() {
    const { spike } = noteSpamHit(this.spamHits);
    if (!spike) return false;
    if (this.effectiveShield()) return false;
    this.autoShieldUntil = Date.now() + AUTO_SHIELD_MS;
    this.stats.autoShields++;
    this.persistFlags();
    this.broadcast({
      type: 'system',
      text: 'auto-shield on · spam spike · X-linked chat only for ~10m',
      ts: Date.now(),
    });
    this.schedulePresence();
    return true;
  }

  liveCount() {
    return this.state.getWebSockets().length;
  }

  linkedCount() {
    let n = 0;
    for (const ws of this.state.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment() || {};
        if (att.linked && att.handle) n++;
      } catch {
        /* ignore */
      }
    }
    return n;
  }

  touch(ws, att) {
    att.lastActive = Date.now();
    try {
      ws.serializeAttachment(att);
    } catch {
      /* ignore */
    }
  }

  roomStats() {
    const count = this.liveCount();
    const mins = Math.max(1 / 60, (Date.now() - this.stats.startedAt) / 60000);
    return {
      ok: true,
      service: 'dasha-lobby',
      count,
      linked: this.linkedCount(),
      max: MAX_SOCKETS,
      softCapAnon: ANON_SOFT_CAP,
      slow: this.forceSlow || count >= SLOW_MODE_AT,
      shield: this.effectiveShield(),
      forceShield: this.shield,
      autoShieldUntil: this.autoShieldUntil || null,
      mutes: this.mutes.size,
      joins: this.stats.joins,
      chats: this.stats.chats,
      rejectsFull: this.stats.rejectsFull,
      rejectsIp: this.stats.rejectsIp,
      autoShields: this.stats.autoShields,
      chatsPerMin: Math.round((this.stats.chats / mins) * 10) / 10,
      uptimeMs: Date.now() - this.stats.startedAt,
      xLink: xConfigured(this.env),
      customPin: Boolean(this.customPin?.text),
    };
  }

  syncNicksFromSockets() {
    this.nicks.clear();
    for (const ws of this.state.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment() || {};
        if (att.id && att.nick) this.nicks.set(att.id, att.nick);
      } catch {
        /* ignore */
      }
    }
  }

  nickList() {
    this.syncNicksFromSockets();
    const names = [];
    for (const n of this.nicks.values()) {
      if (n && names.length < 12) names.push(n);
    }
    return names;
  }

  presence() {
    const count = this.liveCount();
    return {
      type: 'presence',
      count,
      linked: this.linkedCount(),
      nicks: this.nickList(),
      slow: this.forceSlow || count >= SLOW_MODE_AT,
      shield: this.effectiveShield(),
      remaining: Math.max(0, MAX_SOCKETS - count),
      max: MAX_SOCKETS,
    };
  }

  capacity() {
    const count = this.liveCount();
    return {
      ok: true,
      count,
      linked: this.linkedCount(),
      max: MAX_SOCKETS,
      softCapAnon: ANON_SOFT_CAP,
      maxPerIp: MAX_PER_IP,
      slowAt: SLOW_MODE_AT,
      full: count >= MAX_SOCKETS,
      remaining: Math.max(0, MAX_SOCKETS - count),
      shield: this.effectiveShield(),
    };
  }

  broadcast(obj, except) {
    const raw = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) {
      if (except && ws === except) continue;
      try {
        ws.send(raw);
      } catch {
        /* ignore */
      }
    }
  }

  schedulePresence() {
    if (this.presenceTimer) return;
    this.presenceTimer = setTimeout(() => {
      this.presenceTimer = null;
      try {
        this.broadcast(this.presence());
      } catch {
        /* ignore */
      }
    }, 350);
  }

  countIp(ip) {
    let n = 0;
    for (const ws of this.state.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment() || {};
        if (att.ip && att.ip === ip) n++;
      } catch {
        /* ignore */
      }
    }
    return n;
  }

  isMuted(nick) {
    const key = nickKey(nick);
    const until = this.mutes.get(key);
    if (!until) return false;
    if (Date.now() >= until) {
      this.mutes.delete(key);
      return false;
    }
    return true;
  }

  tryModCommand(att, text) {
    const secret = this.env.LOBBY_MOD_SECRET;
    if (!secret || typeof text !== 'string') return null;
    // !mod <secret> <cmd> [args...]
    const m = text.trim().match(/^!mod\s+(\S+)\s+(mute|unmute|slow|shield|clear|nuke|pin)\s*(.*)$/i);
    if (!m) return null;
    if (m[1] !== secret) return { ok: false, error: 'mod denied' };
    const cmd = m[2].toLowerCase();
    const rest = (m[3] || '').trim();
    const arg = rest.split(/\s+/)[0] || '';
    if (cmd === 'mute') {
      if (!arg) return { ok: false, error: 'mute needs a nick' };
      this.mutes.set(nickKey(arg), Date.now() + 24 * 60 * 60 * 1000);
      this.stats.mutes++;
      this.persistMutes();
      return { ok: true, system: `muted ${arg} for 24h` };
    }
    if (cmd === 'unmute') {
      if (!arg) return { ok: false, error: 'unmute needs a nick' };
      this.mutes.delete(nickKey(arg));
      this.persistMutes();
      return { ok: true, system: `unmuted ${arg}` };
    }
    if (cmd === 'slow') {
      this.forceSlow = /^(on|1|true)$/i.test(arg);
      this.persistFlags();
      return { ok: true, system: this.forceSlow ? 'slow mode on' : 'slow mode off' };
    }
    if (cmd === 'shield') {
      this.shield = /^(on|1|true)$/i.test(arg);
      if (!this.shield) this.autoShieldUntil = 0;
      this.persistFlags();
      return { ok: true, system: this.shield ? 'shield on · X-linked chat only' : 'shield off' };
    }
    if (cmd === 'clear' || cmd === 'nuke') {
      this.history = [];
      this.persist();
      return { ok: true, system: 'history cleared', clearClients: true };
    }
    if (cmd === 'pin') {
      if (!rest || /^clear$/i.test(rest)) {
        this.customPin = null;
        this.persistFlags();
        return { ok: true, system: 'pin reset to default', pin: PIN };
      }
      const textPin = rest.slice(0, 280);
      this.customPin = { text: textPin, ts: Date.now() };
      this.persistFlags();
      return { ok: true, system: 'pin updated', pin: this.activePin() };
    }
    return null;
  }

  rejectWs(code, reason) {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    server.close(code, reason.slice(0, 120));
    return new Response(null, { status: 101, webSocket: client });
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && (url.pathname === '/capacity' || url.searchParams.get('capacity') === '1')) {
      return json(this.capacity(), 200, null);
    }
    if (request.method === 'GET' && url.pathname === '/stats') {
      return json(this.roomStats(), 200, null);
    }

    if (url.pathname.replace(/\/$/, '') === '/verse') {
      return this.handleVerse(request);
    }

    if (url.pathname.startsWith('/api/graph/')) {
      const origin = request.headers.get('Origin');
      const allowedOrigin =
        origin && originAllowed(origin, this.env.ALLOWED_ORIGINS || '')
          ? origin
          : this.env.ALLOW_ANY_ORIGIN
            ? origin || '*'
            : null;
      return this.handleGraph(request, allowedOrigin);
    }

    if (parseForumThreadPath(url.pathname)) {
      const origin = request.headers.get('Origin');
      const allowedOrigin =
        origin && originAllowed(origin, this.env.ALLOWED_ORIGINS || '')
          ? origin
          : this.env.ALLOW_ANY_ORIGIN
            ? origin || '*'
            : null;
      return this.handleForum(request, allowedOrigin);
    }

    if (url.pathname.startsWith('/simp/') || url.pathname.startsWith('/studio/') || url.pathname.startsWith('/chess/')) {
      // Origin already checked by worker entry; pass through for CORS on stub responses.
      const origin = request.headers.get('Origin');
      const allowedOrigin =
        origin && originAllowed(origin, this.env.ALLOWED_ORIGINS || '')
          ? origin
          : this.env.ALLOW_ANY_ORIGIN
            ? origin || '*'
            : null;
      return url.pathname.startsWith('/chess/') ? this.handleChess(request, allowedOrigin) : this.handleSimp(request, allowedOrigin);
    }

    const upgrade = request.headers.get('Upgrade') || '';
    if (upgrade.toLowerCase() !== 'websocket') {
      return new Response('expected websocket', { status: 426, headers: SECURITY });
    }

    const origin = request.headers.get('Origin');
    const allowed = this.env.ALLOWED_ORIGINS || '';
    if (origin && !originAllowed(origin, allowed) && !this.env.ALLOW_ANY_ORIGIN) {
      return new Response('origin not allowed', { status: 403, headers: SECURITY });
    }

    const link = await sessionFromRequest(this.env, request);
    const count = this.liveCount();
    const seat = mayJoinRoom({ count, maxSockets: MAX_SOCKETS, linked: Boolean(link) });
    if (!seat.ok) {
      this.stats.rejectsFull++;
      const reason =
        seat.reason === 'lobby full'
          ? `lobby full ${count}/${MAX_SOCKETS}`
          : `lobby busy ${count}/${MAX_SOCKETS} · link X for reserved seats`;
      return this.rejectWs(4001, reason);
    }

    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
    if (this.countIp(ip) >= MAX_PER_IP) {
      this.stats.rejectsIp++;
      return this.rejectWs(4002, 'too many connections from this network');
    }
    let ipState = this.ipJoins.get(ip);
    if (!ipState) {
      ipState = { times: [] };
      this.ipJoins.set(ip, ipState);
    }
    const ipOk = checkIpJoin(ipState);
    if (!ipOk.ok) {
      this.stats.rejectsIp++;
      return this.rejectWs(4002, ipOk.error || 'join rate limited');
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    this.stats.joins++;
    const now = Date.now();
    server.serializeAttachment({
      id: id(),
      nick: null,
      joined: now,
      lastActive: now,
      linked: Boolean(link),
      handle: link?.handle || null,
      xId: link?.xId || null,
      avatar: link?.avatar || null,
      ip,
    });

    send(server, {
      type: 'ready',
      pin: this.activePin(),
      mint: MINT,
      you: null,
      max: MAX_SOCKETS,
      softCapAnon: ANON_SOFT_CAP,
      slowAt: SLOW_MODE_AT,
      joinCooldownMs: JOIN_COOLDOWN_MS,
      remaining: Math.max(0, MAX_SOCKETS - this.liveCount()),
      x: publicLink(link),
      perks: link
        ? {
            linked: true,
            longerMessages: true,
            fasterRate: true,
            reservedSeats: true,
            badge: true,
          }
        : { linked: false },
    });
    send(server, this.presence());
    // Quiet joins — no system spam; debounced presence only.
    this.schedulePresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
    if (raw.length > 1024) {
      send(ws, { type: 'error', error: 'frame too large' });
      return;
    }

    const att = ws.deserializeAttachment() || { id: id(), nick: null };
    const linked = Boolean(att.linked && att.handle);
    const limits = linkedLimits(linked);
    this.touch(ws, att);

    const parsed = parseClientFrame(raw, {
      maxText: limits.maxText,
      linked,
      forceNick: linked ? `@${att.handle}` : null,
    });
    if (!parsed.ok) {
      if (/automod|blocked|duplicate/i.test(parsed.error || '')) this.maybeAutoShield();
      send(ws, { type: 'error', error: parsed.error });
      return;
    }

    if (parsed.type === 'ping') {
      send(ws, { type: 'pong', t: Date.now() });
      return;
    }

    if (parsed.type === 'hello') {
      this.syncNicksFromSockets();
      if (nickTaken(this.nicks, parsed.nick, att.id)) {
        send(ws, { type: 'error', error: 'nick taken' });
        return;
      }
      att.nick = parsed.nick;
      this.touch(ws, att);
      this.nicks.set(att.id, parsed.nick);
      this.history = pruneHistory(this.history);
      const joinedAt = Number(att.joined) || Date.now();
      const coolLeft = Math.max(0, JOIN_COOLDOWN_MS - (Date.now() - joinedAt));
      send(ws, {
        type: 'hello_ok',
        pin: this.activePin(),
        history: this.history,
        you: parsed.nick,
        mint: MINT,
        presence: this.presence(),
        joinCooldownMs: JOIN_COOLDOWN_MS,
        joinCooldownRemainingMs: coolLeft,
        x: linked
          ? publicLink({ handle: att.handle, avatar: att.avatar, verifiedType: null })
          : null,
        perks: linked
          ? { linked: true, longerMessages: true, fasterRate: true, reservedSeats: true, badge: true }
          : { linked: false },
      });
      // Quiet: no "joined" spam (Twitch-style less noise).
      this.schedulePresence();
      return;
    }

    if (parsed.type === 'chat') {
      if (!att.nick) {
        send(ws, { type: 'error', error: 'send hello with nick first' });
        return;
      }

      const mod = this.tryModCommand(att, parsed.text);
      if (mod) {
        if (!mod.ok) {
          send(ws, { type: 'error', error: mod.error });
          return;
        }
        if (mod.clearClients) {
          this.broadcast({ type: 'history_clear', ts: Date.now() });
        }
        if (mod.pin) {
          this.broadcast({ type: 'pin', pin: mod.pin, ts: Date.now() });
        }
        this.broadcast({ type: 'system', text: mod.system, ts: Date.now() });
        this.schedulePresence();
        return;
      }

      if (this.effectiveShield() && !linked) {
        send(ws, { type: 'error', error: 'shield on · link X to chat' });
        return;
      }
      if (this.isMuted(att.nick) || (att.handle && this.isMuted('@' + att.handle))) {
        send(ws, { type: 'error', error: 'you are muted' });
        return;
      }

      const joinedAt = Number(att.joined) || 0;
      if (joinedAt && Date.now() - joinedAt < JOIN_COOLDOWN_MS) {
        const waitMs = JOIN_COOLDOWN_MS - (Date.now() - joinedAt);
        send(ws, {
          type: 'error',
          error: 'join cooldown · wait a few seconds (anti-raid)',
          waitMs,
        });
        return;
      }

      let rate = this.rates.get(att.id);
      if (!rate) {
        rate = { lastMs: 0, times: [], lastText: '', lastTextMs: 0 };
        this.rates.set(att.id, rate);
      }
      const effective = roomSlowLimits(this.liveCount(), {
        rateMs: this.forceSlow ? Math.max(limits.rateMs, 5000) : limits.rateMs,
        maxPerMin: limits.maxPerMin,
      });
      const allowed = checkRate(rate, Date.now(), {
        rateMs: effective.rateMs,
        maxPerMin: effective.maxPerMin,
      });
      if (!allowed.ok) {
        this.maybeAutoShield();
        send(ws, {
          type: 'error',
          error: effective.slow || this.forceSlow ? 'slow mode · ' + allowed.error : allowed.error,
          waitMs: allowed.waitMs,
        });
        return;
      }
      const rep = checkRepeat(rate, parsed.text);
      if (!rep.ok) {
        this.maybeAutoShield();
        send(ws, { type: 'error', error: rep.error, waitMs: rep.waitMs });
        return;
      }
      const msg = publicMessage({
        id: id(),
        nick: att.nick,
        text: parsed.text,
        ts: Date.now(),
        linked,
        handle: att.handle || undefined,
        avatar: att.avatar || undefined,
      });
      this.stats.chats++;
      this.history = pruneHistory([...this.history, msg]);
      await this.persist();
      this.broadcast(msg);
    }
  }

  async webSocketClose(ws) {
    const att = ws.deserializeAttachment() || {};
    if (att.id) {
      this.rates.delete(att.id);
      this.nicks.delete(att.id);
    }
    this.schedulePresence();
  }

  async webSocketError(ws) {
    try {
      ws.close(1011, 'error');
    } catch {
      /* ignore */
    }
  }
}

async function handleOAuth(request, env, allowedOrigin) {
  const url = new URL(request.url);

  if (url.pathname === '/oauth/x/status') {
    const link = await sessionFromRequest(env, request);
    return json(
      {
        configured: xConfigured(env),
        linked: Boolean(link),
        x: publicLink(link),
        perks: {
          longerMessages: '280 chars (vs 200)',
          fasterRate: 'faster send rate',
          reservedSeats: `priority seats when room > ${ANON_SOFT_CAP}`,
          badge: '@handle badge in chat',
        },
      },
      200,
      allowedOrigin,
      { credentials: true },
    );
  }

  if (url.pathname === '/oauth/x/logout') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, { credentials: true });
    if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
    if (env.LOBBY) {
      try {
        await env.LOBBY.get(env.LOBBY.idFromName('public')).fetch(new Request('https://lobby.getdasha.com/api/graph/highlight', {
          method: 'DELETE',
          headers: {
            Origin: allowedOrigin,
            Cookie: request.headers.get('Cookie') || '',
          },
        }));
      } catch { /* cookie still clears */ }
    }
    const headers = new Headers({
        ...SECURITY,
        ...corsHeaders(allowedOrigin, { credentials: true }),
        'Content-Type': 'application/json; charset=utf-8',
    });
    headers.append('Set-Cookie', cookieHeader('', { clear: true }));
    headers.append('Set-Cookie', clearLegacyCookieHeader());
    return new Response(JSON.stringify({ ok: true, linked: false }), { status: 200, headers });
  }

  if (url.pathname === '/oauth/x/start' && request.method === 'GET') {
    if (!xConfigured(env)) {
      return oauthHtmlResponse(
        htmlPage(
          'X link unavailable',
          '<h1>X link not configured</h1><p>Dasha still works where identity is optional. An operator needs to set <code>X_CLIENT_ID</code>, <code>X_CLIENT_SECRET</code>, and <code>LOBBY_SESSION_SECRET</code> on the worker.</p><p><a href="https://www.getdasha.com/">Back to Dasha</a></p>',
        ),
        503,
      );
    }
    const back = parseOAuthReturn(url.searchParams.get('return'));
    if (url.searchParams.get('continue') !== '1') {
      const continueHref = back
        ? `/oauth/x/start?continue=1&return=${encodeURIComponent(back)}`
        : '/oauth/x/start?continue=1';
      return oauthHtmlResponse(
        htmlPage('Connect X', `<h1>Connect X</h1><p><a class="btn ghost" href="${continueHref}">Continue with X</a></p>`),
        200,
      );
    }
    const verifier = randomUrlToken(32);
    const challenge = await pkceChallengeS256(verifier);
    const state = randomUrlToken(16);
    const stateToken = await signPayload(env.LOBBY_SESSION_SECRET, {
      v: 1,
      kind: 'oauth_state',
      state,
      verifier,
      ...(back ? { cont: back } : {}),
      exp: Date.now() + 15 * 60_000,
    });
    const dest = authorizeUrl({
      clientId: env.X_CLIENT_ID,
      redirectUri: redirectUri(env),
      state,
      challenge,
    });
    return new Response(null, {
      status: 302,
      headers: {
        ...SECURITY,
        Location: dest,
        'Set-Cookie': oauthStateCookie(stateToken),
      },
    });
  }

  if (url.pathname === '/oauth/x/callback' && request.method === 'GET') {
    if (!xConfigured(env)) {
      return oauthHtmlResponse(htmlPage('Error', '<p>OAuth not configured.</p>'), 503);
    }
    const err = url.searchParams.get('error');
    if (err) {
      return oauthHtmlResponse(
        htmlPage('Cancelled', `<h1>Link cancelled</h1><p>${escapeHtml(err)}</p><p><a href="https://www.getdasha.com/">Back to Dasha</a></p>`),
        400,
      );
    }
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthCookie = (() => {
      const raw = request.headers.get('Cookie') || '';
      return readCookie(raw, OAUTH_COOKIE);
    })();
    const st = oauthCookie ? await verifyPayload(env.LOBBY_SESSION_SECRET, oauthCookie) : null;
    if (!code || !state || !st || st.kind !== 'oauth_state' || st.state !== state || !st.verifier) {
      return oauthHtmlResponse(htmlPage('Error', '<h1>Invalid OAuth state</h1><p><a href="/oauth/x/start">Try again</a></p>'), 400);
    }
    try {
      const tokens = await exchangeCode(env, { code, verifier: st.verifier });
      const user = await fetchXUser(tokens.access_token);
      if (!user.handle) throw new Error('missing handle');
      const session = await createSessionToken(env, user);
      const safeHandle = escapeHtml(user.handle);
      const scriptHandle = JSON.stringify(user.handle).replace(/</g, '\\u003c');
      const dest = parseOAuthReturn(st.cont) || 'https://www.getdasha.com/';
      const destJson = JSON.stringify(dest).replace(/</g, '\\u003c');
      const destLabel = dest.endsWith('/graph') ? 'Open Graph' : dest.endsWith('/simp') ? 'Open Simp' : dest.endsWith('/chess') ? 'Open Chess' : dest.endsWith('/forum') ? 'Open Forum' : dest.endsWith('/lobby') ? 'Open Forum' : dest.endsWith('/faucet') ? 'Open Faucet' : 'Open Dasha';
      const scriptNonce = randomUrlToken(18);
      const body = htmlPage(
        'Linked',
        `<h1>Linked @${safeHandle}</h1>
        <p>You can close this tab and return to Dasha.</p>
        <p><a href="${escapeHtml(dest)}">${destLabel}</a></p>
        <script nonce="${scriptNonce}">try{if(window.opener){var h=${scriptHandle};['https://www.getdasha.com','https://getdasha.com','https://lobby.getdasha.com'].forEach(function(o){try{window.opener.postMessage({type:'dasha-x-linked',handle:h},o);}catch(e){}});}}catch(e){} setTimeout(function(){if(!window.opener)location.replace(${destJson});else window.close()},800);</script>`,
      );
      const headers = new Headers(privateHtmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
      }, scriptNonce));
      headers.append('Set-Cookie', cookieHeader(session));
      headers.append('Set-Cookie', clearLegacyCookieHeader());
      headers.append('Set-Cookie', oauthStateCookie());
      return new Response(body, { status: 200, headers });
    } catch (e) {
      return oauthHtmlResponse(
        htmlPage('Error', `<h1>Could not link X</h1><p>${escapeHtml(String(e.message || e).slice(0, 200))}</p><p><a href="/oauth/x/start">Try again</a></p>`),
        502,
      );
    }
  }

  return null;
}

const BOUNTIES_FEED_SCHEMA = 'dasha-bounties-feed/v1';
const BOUNTIES_FEED_NOTE = "USDC on Solana. We don't hold it.";
const BOUNTIES_FEED_PAGE = 'https://www.getdasha.com/bounties';
const BOUNTIES_FEED_SOURCES = [
  'https://uuriko.github.io/dasha-desk/bounties.json',
  'https://raw.githubusercontent.com/Uuriko/dasha-desk/main/bounties.json',
];

function isBountiesJsonPath(pathname) {
  return pathname === '/bounties.json' || pathname === '/bounties.json/';
}

function honestPayTo(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** dasha-desk still emits payTo:""; www must never. Missing dest → null + not_implemented. */
export function normalizeBountiesFeed(raw) {
  const listings = Array.isArray(raw?.listings)
    ? raw.listings.filter((row) => row && typeof row === 'object').map((row) => {
        const dest = honestPayTo(row.payTo);
        return dest ? { ...row, payTo: dest } : { ...row, payTo: null, payoutStatus: 'not_implemented' };
      })
    : [];
  return {
    name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : 'dasha bounties',
    schema: BOUNTIES_FEED_SCHEMA,
    note: BOUNTIES_FEED_NOTE,
    url: typeof raw?.url === 'string' && raw.url.trim() ? raw.url.trim() : BOUNTIES_FEED_PAGE,
    listings,
  };
}

async function readBountiesSource(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const raw = await res.json().catch(() => null);
  if (!raw || typeof raw !== 'object') return null;
  if (raw.schema !== BOUNTIES_FEED_SCHEMA && !Array.isArray(raw.listings)) return null;
  return normalizeBountiesFeed(raw);
}

async function loadBountiesFeed() {
  for (const src of BOUNTIES_FEED_SOURCES) {
    try {
      const feed = await readBountiesSource(src);
      if (feed) return feed;
    } catch {
      /* next pin */
    }
  }
  return normalizeBountiesFeed(null);
}

async function bountiesFeedResponse(request) {
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(await loadBountiesFeed()), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
      'X-Dasha-Edge': 'bounties-feed',
    },
  });
}

function isProductHost(host) {
  const h = String(host || '').toLowerCase();
  return h === 'www.getdasha.com' || h === 'getdasha.com';
}

const RETIRED_COMMERCE_PATHS = new Set(['/checkout', '/paypal-checkout', '/order-confirmation']);

async function staticAssetResponse(request, env) {
  const asset = await env.ASSETS.fetch(request);
  const headers = new Headers(asset.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  if (asset.ok) headers.set('Cache-Control', 'public, max-age=86400');
  return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
}

/** Product hosts (www/apex) serve SEO/howto plus a few footer aliases; everything else goes to Webflow origin. */
async function productEdge(request, url, env) {
  if (url.pathname.startsWith('/og/')) {
    return staticAssetResponse(request, env);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname.startsWith('/simp/photo/')) {
    return staticAssetResponse(request, env);
  }
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (url.pathname === '/client/dasha-loop.mp3' || url.pathname === '/client/dasha-face.webp' || url.pathname === '/client/dasha.glb')
  ) {
    return staticAssetResponse(request, env);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname.startsWith('/simp/card/')) {
    return Response.redirect(`https://lobby.getdasha.com${url.pathname}${url.search}`, 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && isIconPath(url.pathname)) {
    return faviconResponse(request);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && RETIRED_COMMERCE_PATHS.has(url.pathname)) {
    return new Response(request.method === 'HEAD' ? null : 'Not found', {
      status: 404,
      headers: htmlHeaders({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Dasha-Edge': 'retired-commerce',
      }),
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/.well-known/security.txt') {
    return securityTxtResponse(request, url.hostname);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/robots.txt') {
    return new Response(request.method === 'HEAD' ? null : ROBOTS_TXT, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Robots-Tag': 'all',
        'X-Dasha-Edge': 'robots',
      },
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/sitemap.xml') {
    return new Response(request.method === 'HEAD' ? null : SITEMAP_XML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Dasha-Edge': 'sitemap',
      },
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && isBountiesJsonPath(url.pathname)) {
    return bountiesFeedResponse(request);
  }
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (url.pathname === '/how-to-buy' || url.pathname === '/how-to-buy/')
  ) {
    return new Response(request.method === 'HEAD' ? null : HOWTO_PAGE_HTML, {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'howto',
      }),
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && isExactPath(url.pathname, '/simp')) {
    return simpPageResponse(request);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && isLeftoverLearnPath(url.pathname)) {
    return Response.redirect('https://www.getdasha.com/', 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && isFaucetPagePath(url.pathname)) {
    return faucetPageResponse(request);
  }
  const productMagnet = magnetRoute(url.pathname);
  if ((request.method === 'GET' || request.method === 'HEAD') && productMagnet) {
    return magnetPageResponse(request, productMagnet);
  }
  if (isFaucetApiPath(url.pathname)) {
    const origin = request.headers.get('Origin');
    const allowedOrigin = origin && originAllowed(origin, env.ALLOWED_ORIGINS || '') ? origin : env.ALLOW_ANY_ORIGIN ? origin || '*' : null;
    const faucetRes = await faucetApiResponse(request, env, allowedOrigin);
    if (faucetRes) return faucetRes;
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && isExactPath(url.pathname, '/bounties')) {
    return bountiesPageResponse(request);
  }
  if (isLeftoverVersePath(url.pathname)) {
    return Response.redirect('https://www.getdasha.com/', 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && isExactPath(url.pathname, '/graph')) {
    return graphPageResponse(request);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/graph') {
    return graphSnapshotResponse(request, env);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/graph/expand') {
    return graphExpandResponse(request, env);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && isExactPath(url.pathname, '/quiz')) {
    return Response.redirect(SIMP_WWW, 308);
  }
  const shareId = simpShareId(url.pathname);
  if ((request.method === 'GET' || request.method === 'HEAD') && shareId) {
    return simpSharePageResponse(request, env, shareId);
  }
  if (url.pathname.replace(/\/$/, '') === '/simp/hold') {
    return simpHoldResponse(request.headers.get('Origin'));
  }
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (url.pathname === '/howtobuy' || url.pathname === '/howtobuy/')
  ) {
    return Response.redirect('https://www.getdasha.com/how-to-buy', 308);
  }
  if (isForumApiPath(url.pathname)) {
    const origin = request.headers.get('Origin');
    const allowedOrigin = origin && originAllowed(origin, env.ALLOWED_ORIGINS || '') ? origin : env.ALLOW_ANY_ORIGIN ? origin || '*' : null;
    return forumApiResponse(request, env, allowedOrigin);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/forum/') {
    return Response.redirect(forumCanonical(url), 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/forum') {
    return new Response(request.method === 'HEAD' ? null : FORUM_PAGE, {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'forum',
      }),
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/lobby' || url.pathname === '/lobby/')) {
    return Response.redirect(forumCanonical(url), 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && isLeftoverPrivacyPath(url.pathname)) {
    return Response.redirect('https://www.getdasha.com/', 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/chess' || url.pathname === '/chess/')) {
    const html = await chessPageForRequest(request, env);
    return new Response(request.method === 'HEAD' ? null : html, {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'chess',
      }),
    });
  }
  if (request.method === 'GET' || request.method === 'HEAD') {
    const chessRead = url.pathname.replace(/\/$/, '');
    if (chessRead === '/chess/me' || chessRead === '/chess/ratings' || chessRead === '/chess/tournaments' || /^\/chess\/replay\/[A-Za-z0-9_-]{6,24}$/.test(chessRead)) {
      return Response.redirect(`https://lobby.getdasha.com${chessRead}${url.search}`, 308);
    }
  }
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (url.pathname === '/rally' || url.pathname === '/rally/')
  ) {
    return Response.redirect('https://www.getdasha.com/', 308);
  }
  // Pass through to Webflow (subrequest does not re-invoke this Worker for same zone).
  // Strip personal publisher branding (potterlab / John Potter) from head JSON-LD so the
  // public product site is getdasha-only. Source of truth for clean schema is also in embeds.
  const upstream = await fetch(request);
  const ct = String(upstream.headers.get('content-type') || '');
  if (
    upstream.status === 404 &&
    ct.includes('text/html') &&
    (request.method === 'GET' || request.method === 'HEAD')
  ) {
    return new Response(request.method === 'HEAD' ? null : NOT_FOUND_HTML, {
      status: 404,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'html-404',
      }),
    });
  }
  if (request.method !== 'GET' || !ct.includes('text/html')) return upstream;
  let html = await upstream.text();
  const originalHtml = html;
  html = sanitizePublicJsonLd(html);
  const stripped = html !== originalHtml;
  if (url.pathname === '/') {
    html = rewriteHomeFirstViewport(stripHomeSimpBoard(html));
  } else {
    html = stripLeftoverStyleRules(html, SIMP_LEFTOVER_STYLE_RE);
    if (isExactPath(url.pathname, '/lobby')) html = stripLobbySimpQuiz(html);
  }
  html = ensureHtmlLang(html);
  html = ensurePrivacyLink(html);
  if (isExactPath(url.pathname, '/lobby')) html = stripDeadLobbyForum(html);
  html = rewriteLeftoverLobbyHrefs(html);
  html = stripGraphHops(html);
  html = rewriteStudioScriptIntegrity(html);
  html = rewriteLobbyScriptIntegrity(html);
  html = rewriteStaleCdnFavicon(html);
  if (isExactPath(url.pathname, '/studio')) html = rewriteStudioBuyVerifyHref(html);
  if (danceDockPath(url.pathname)) html = injectDanceDock(html);
  if (stripped) {
    // Also drop any leftover plain mentions in head comments (defensive).
    html = html.replace(/https?:\/\/x\.com\/potterlab/gi, 'https://www.getdasha.com/');
  }
  const headers = applyHtmlSecurity(new Headers(upstream.headers));
  headers.delete('content-length');
  headers.set('X-Dasha-Edge', stripped ? 'html-strip-personal-brand' : 'html-security');
  return new Response(html, { status: upstream.status, statusText: upstream.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return new Response(null, {
        status: 308,
        headers: { Location: url.href, 'Cache-Control': 'public, max-age=3600' },
      });
    }
    if (isProductHost(url.hostname)) {
      return productEdge(request, url, env);
    }

    const origin = request.headers.get('Origin');
    const allowedOrigin =
      origin && originAllowed(origin, env.ALLOWED_ORIGINS || '')
        ? origin
        : env.ALLOW_ANY_ORIGIN
          ? origin || '*'
          : null;

    if (request.method === 'OPTIONS') {
      if (!allowedOrigin && !env.ALLOW_ANY_ORIGIN) {
        return new Response(null, { status: 403, headers: SECURITY });
      }
      return new Response(null, {
        status: 204,
        headers: { ...SECURITY, ...corsHeaders(allowedOrigin || '*', { credentials: true }) },
      });
    }

    if (url.pathname.startsWith('/oauth/github')) {
      const githubStatus = url.pathname === '/oauth/github/status';
      return json(
        githubStatus
          ? { configured: false, linked: false, github: null, error: 'not_configured' }
          : { configured: false, error: 'not_configured' },
        githubStatus ? 200 : 501,
        allowedOrigin,
        { credentials: true },
      );
    }

    if (url.pathname.startsWith('/oauth/x')) {
      const oauthRes = await handleOAuth(request, env, allowedOrigin);
      if (oauthRes) return oauthRes;
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && isLeftoverPrivacyPath(url.pathname)) {
      return Response.redirect('https://www.getdasha.com/', 308);
    }
    if (isForumApiPath(url.pathname)) {
      return forumApiResponse(request, env, allowedOrigin);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/forum/') {
      return Response.redirect(forumCanonical(url), 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/forum') {
      return new Response(request.method === 'HEAD' ? null : FORUM_PAGE, {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Dasha-Edge': 'forum',
        }),
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/.well-known/security.txt') {
      return securityTxtResponse(request, url.hostname);
    }

    if (url.pathname.startsWith('/simp/photo/') || url.pathname.startsWith('/simp/card/') || url.pathname.startsWith('/og/')) {
      return staticAssetResponse(request, env);
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && isExactPath(url.pathname, '/simp')) {
      return simpPageResponse(request);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && isLeftoverLearnPath(url.pathname)) {
      return Response.redirect('https://www.getdasha.com/', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && isFaucetPagePath(url.pathname)) {
      return faucetPageResponse(request);
    }
    const lobbyMagnet = magnetRoute(url.pathname);
    if ((request.method === 'GET' || request.method === 'HEAD') && lobbyMagnet) {
      return magnetPageResponse(request, lobbyMagnet);
    }
    if (isFaucetApiPath(url.pathname)) {
      const faucetRes = await faucetApiResponse(request, env, allowedOrigin);
      if (faucetRes) return faucetRes;
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && isExactPath(url.pathname, '/bounties')) {
      return Response.redirect(BOUNTIES_FEED_PAGE, 308);
    }
    if (isLeftoverVersePath(url.pathname)) {
      return Response.redirect('https://www.getdasha.com/', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && isExactPath(url.pathname, '/graph')) {
      return graphPageResponse(request);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/graph') {
      return graphSnapshotResponse(request, env);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/graph/expand') {
      return graphExpandResponse(request, env);
    }
    if (isGraphWritePath(url.pathname)) {
      if (!env.LOBBY) return json({ error: 'not found' }, 404, allowedOrigin, { credentials: true });
      return env.LOBBY.get(env.LOBBY.idFromName('public')).fetch(request);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && isExactPath(url.pathname, '/dashaverse')) {
      return Response.redirect('https://www.getdasha.com/', 308);
    }
    if (url.pathname.replace(/\/$/, '') === '/simp/hold') {
      return simpHoldResponse(allowedOrigin);
    }

    if ((url.pathname.startsWith('/simp/') && url.pathname !== '/simp/') || (url.pathname.startsWith('/studio/') && url.pathname !== '/studio/') || (url.pathname.startsWith('/chess/') && url.pathname !== '/chess/')) {
      if (request.method !== 'GET' && origin && !allowedOrigin && !env.ALLOW_ANY_ORIGIN) {
        return json({ error: 'origin not allowed' }, 403, null);
      }
      const room = env.LOBBY.idFromName('public');
      const stub = env.LOBBY.get(room);
      return stub.fetch(request);
    }

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/client/lobby.js' || url.pathname === '/client/lobby-client.js')
    ) {
      return jsAsset(LOBBY_CLIENT_JS, allowedOrigin || '*', { headOnly: request.method === 'HEAD' });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/client/simp-board.js' || url.pathname === '/client/simp-board-client.js')
    ) {
      return jsAsset(SIMP_BOARD_JS, allowedOrigin || '*', { headOnly: request.method === 'HEAD' });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname === '/client/studio.js'
    ) {
      return jsAsset(STUDIO_CLIENT_JS, allowedOrigin || '*', { headOnly: request.method === 'HEAD' });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname === '/client/graph.js'
    ) {
      return jsAsset(GRAPH_CLIENT_JS, allowedOrigin || '*', { headOnly: request.method === 'HEAD' });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname === '/client/learn.js'
    ) {
      return jsAsset(LEARN_CLIENT_JS, allowedOrigin || '*', { headOnly: request.method === 'HEAD' });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname === '/client/faucet.js'
    ) {
      return jsAsset(FAUCET_CLIENT_JS, allowedOrigin || '*', { headOnly: request.method === 'HEAD' });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname === '/client/faucet.png'
    ) {
      return staticAssetResponse(new Request(new URL('/simp/photo/faucet.png', request.url), request), env);
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname === '/client/dasha-dance.js'
    ) {
      return jsAsset(DANCE_CLIENT_JS, allowedOrigin || '*', { headOnly: request.method === 'HEAD' });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/client/dasha-loop.mp3' || url.pathname === '/client/dasha-face.webp' || url.pathname === '/client/dasha.glb')
    ) {
      return staticAssetResponse(request, env);
    }

    // SEO + howto: also routed on www/apex getdasha.com (see dasha-lobby-wrangler.jsonc).
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/robots.txt') {
      return new Response(request.method === 'HEAD' ? null : ROBOTS_TXT, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'X-Robots-Tag': 'all',
        },
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/sitemap.xml') {
      return new Response(request.method === 'HEAD' ? null : SITEMAP_XML, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && isBountiesJsonPath(url.pathname)) {
      return bountiesFeedResponse(request);
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/how-to-buy' || url.pathname === '/how-to-buy/')
    ) {
      return new Response(request.method === 'HEAD' ? null : HOWTO_PAGE_HTML, {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Dasha-Edge': 'howto',
        }),
      });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/howtobuy' || url.pathname === '/howtobuy/')
    ) {
      return Response.redirect('https://www.getdasha.com/how-to-buy', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/chess' || url.pathname === '/chess/')) {
      const html = await chessPageForRequest(request, env);
      return new Response(request.method === 'HEAD' ? null : html, {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Dasha-Edge': 'chess',
        }),
      });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/rally' || url.pathname === '/rally/')
    ) {
      return Response.redirect('https://www.getdasha.com/', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && isExactPath(url.pathname, '/studio')) {
      return Response.redirect('https://www.getdasha.com/studio', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/lobby' || url.pathname === '/lobby/')) {
      return Response.redirect(forumCanonical(url), 308);
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json(
        {
          ok: true,
          service: 'dasha-lobby',
          mint: MINT,
          pin: PIN.text,
          room: 'public',
          maxSockets: MAX_SOCKETS,
          softCapAnon: ANON_SOFT_CAP,
          xLink: xConfigured(env),
          holderRpc: env.SOLANA_RPC_URLS || env.SOLANA_RPC_URL ? 'dedicated' : 'public-fallback',
          assets: ASSET_HASH,
        },
        200,
        allowedOrigin,
      );
    }

    if (request.method === 'GET' && url.pathname === '/capacity') {
      const room = env.LOBBY.idFromName('public');
      const stub = env.LOBBY.get(room);
      const res = await stub.fetch(new Request(new URL('/capacity', request.url), { method: 'GET' }));
      const data = await res.json();
      return json(data, data.full ? 503 : 200, allowedOrigin);
    }

    if (request.method === 'GET' && url.pathname === '/stats') {
      const room = env.LOBBY.idFromName('public');
      const stub = env.LOBBY.get(room);
      const res = await stub.fetch(new Request(new URL('/stats', request.url), { method: 'GET' }));
      const data = await res.json();
      return json(data, 200, allowedOrigin);
    }

    if (url.pathname === '/ws' || url.pathname === '/lobby/ws') {
      const room = env.LOBBY.idFromName('public');
      const stub = env.LOBBY.get(room);
      return stub.fetch(request);
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && isIconPath(url.pathname)) {
      return faviconResponse(request);
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      return new Response(request.method === 'HEAD' ? null : NOT_FOUND_HTML, {
        status: 404,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Dasha-Edge': 'html-404',
        }),
      });
    }
    return json({ error: 'not found' }, 404, allowedOrigin);
  },
};
