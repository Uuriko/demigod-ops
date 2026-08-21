/**
 * Dasha public lobby — Cloudflare Worker + single Durable Object room.
 * Optional X account link (OAuth 2 PKCE). Linking is never required.
 */
import {
  MINT,
  PAIR,
  PIN,
  MAX_HISTORY,
  MAX_SOCKETS,
  MAX_PER_IP,
  parseClientFrame,
  checkRate,
  checkRepeat,
  pruneHistory,
  publicMessage,
  originAllowed,
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
  createWalletSessionToken,
  authSessionFromRequest,
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
  GH_OAUTH_COOKIE,
  githubAuthorizeUrl,
  githubConfigured,
  githubCookieHeader,
  githubOauthStateCookie,
  githubRedirectUri,
  exchangeGithubCode,
  fetchGithubUser,
  createGithubSessionToken,
  githubSessionFromRequest,
  publicGithubLink,
} from './dasha-lobby-github.mjs';
import {
  buildPublicBoard,
  joinBoard,
  leaveBoard,
  creditDonate,
  meStatus,
  PUBLIC_BOARD_LIMIT,
  quizPublic,
  startQuizAttempt,
  questionForAttempt,
  answerQuizAttempt,
  quizResultForAttempt,
  storedQuizTitle,
  submitQuiz,
  setSimpSpotlight,
} from './dasha-simp-score.mjs';
import {
  activateReferral,
  applyReferralScores,
  applyHolderProof,
  claimReferral,
  hasPositiveTokenBalance,
  isValidSolanaAddress,
  claimsForSession,
  pendingClaims,
  noteReferralQuiz,
  pruneExpiredReferrals,
  publicSeasons,
  reviewClaim,
  qualifyReferral,
  referralCapReached,
  removeReferralIdentity,
  scrubSeasonSnapshots,
  snapshotSeason,
  submitClaim,
  verifyEd25519,
  walletLoginMessage,
  walletMessage,
} from './dasha-simp-actions.mjs';
import {
  LOBBY_CLIENT_JS,
  SIMP_BOARD_JS,
  STUDIO_CLIENT_JS,
  STUDIO_CLIENT_SRI,
  STUDIO_WEBMANIFEST,
  FAUCET_CLIENT_JS,
  FAUCET_PAGE_HTML,
  X_CONNECT_JS,
  X_CONNECT_SRI,
  ROBOTS_TXT as GENERATED_ROBOTS_TXT,
  SITEMAP_XML as GENERATED_SITEMAP_XML,
  HOWTO_HTML,
  CHESS_PAGE_HTML,
  LOBBY_PAGE_HTML,
  LOGIN_PAGE_HTML,
  ASSET_HASH,
} from './dasha-lobby-static-gen.mjs';

/* assets-build overwrites static-gen robots/sitemap; live-verify and disk SoR are this set. */
const ROBOTS_TXT = `# getdasha.com — public crawl rules (also served at lobby.getdasha.com/robots.txt)
#
# This file is the source for what the Worker serves at /robots.txt. It used to be a different
# document — a "paste this into Webflow SEO settings" draft still narrating a 2026-08-08 outage that
# had already been fixed — while the edge served these rules instead. Two copies, and the one nobody
# read was the one with the explanation in it. Kept in sync now.
#
# The Disallow lines that used to sit here were described as the part worth protecting, because they
# keep a 2020 e-commerce template out of a crypto domain's index. They did the opposite. All five
# paths already answer 404, and /checkout, /paypal-checkout and /order-confirmation also serve
# \`X-Robots-Tag: noindex, nofollow\`. A crawler that obeys a Disallow never fetches the URL, so it
# never sees the 404 and never sees the noindex — which is the one signal that would remove it.
# Blocked URLs can sit in an index indefinitely as URL-only entries. Letting crawlers fetch a 404 is
# what actually retires a page, so the Disallow lines are gone and the 404s do the work.
#
# Deliberately permissive otherwise. Everything here is public and CC0, there is nothing to hide from
# a crawler, and AI search indexes are a real discovery path for a site nobody links to yet.
#
# Machine-readable identity: /llms.txt (index) and /llms-full.txt (full markdown).

User-agent: *
Allow: /
Allow: /studio
Allow: /dasha
Allow: /chess
Allow: /faucet
Allow: /llms.txt
Allow: /llms-full.txt

Sitemap: https://www.getdasha.com/sitemap.xml
Sitemap: https://lobby.getdasha.com/sitemap.xml
`;
const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.getdasha.com/</loc><lastmod>2026-08-21</lastmod></url>
  <url><loc>https://www.getdasha.com/simp</loc></url>
  <url><loc>https://www.getdasha.com/studio</loc></url>
  <url><loc>https://www.getdasha.com/lobby</loc></url>
  <url><loc>https://www.getdasha.com/dasha</loc></url>
  <url><loc>https://www.getdasha.com/faucet</loc></url>
  <url><loc>https://www.getdasha.com/bounties</loc></url>
  <url><loc>https://www.getdasha.com/contribute</loc></url>
  <url><loc>https://www.getdasha.com/how-to-buy</loc></url>
  <url><loc>https://www.getdasha.com/privacy</loc></url>
  <url><loc>https://www.getdasha.com/chess</loc></url>
  <url><loc>https://www.getdasha.com/which</loc><lastmod>2026-08-21</lastmod></url>
  <url><loc>https://www.getdasha.com/llms.txt</loc><lastmod>2026-08-21</lastmod></url>
  <url><loc>https://www.getdasha.com/llms-full.txt</loc><lastmod>2026-08-21</lastmod></url>
</urlset>
`;
void GENERATED_ROBOTS_TXT;
void GENERATED_SITEMAP_XML;

import {
  FAUCET_MINT,
  alreadyClaimedResponse,
  buildStatus,
  burnAggregate,
  burnReceiptsFull,
  checkRateLimits,
  checkXEligibility,
  claimAllowed,
  clearPendingClaim,
  consumeBurnIntent,
  createBurnIntent,
  destShapeError,
  donateFailClosed,
  donateSigError,
  inspectDonateTx,
  inspectBurnTx,
  faucetConfig,
  faucetSignerSecret,
  faucetSiwsInput,
  FAUCET_SIWS_DOMAIN,
  meFromSession,
  siwsMessageError,
  noteSuccessfulClaim,
  rateLimitStatusFields,
  recordClaim,
  reserveClaim,
  upsertBurnIntent,
} from './dasha-faucet.mjs';
import { publicKeyFromSecret, rpc, sendTipTransfer } from './dasha-faucet-solana.mjs';
import { forumThreadOgPng, handoffOgPng, simpMemberOgPng } from './dasha-handoff-og.mjs';
const BURN_RECEIPTS_ENABLED = false;
import {
  challengeRedirectPath,
  quizRedirectPath,
  simpMemberBadgeSvg,
  simpMemberHtml,
  simpPageHtml,
  simpResultHtml,
} from './dasha-simp-share-html.mjs';
import {
  CHESS_CLOCK_MS,
  CHESS_INCREMENT_MS,
  CHESS_START_RATING,
  canMate,
  newChessState,
  playMove,
  publicChessGame,
  publicChessReplay,
  resignChess,
  settleChessRatings,
} from './dasha-chess.mjs';
import {
  MAX_POSTS,
  MAX_REACTORS,
  addReply,
  assertWritable,
  deletePost,
  editPost,
  lockThread,
  newThread,
  paginateIndex,
  pruneIndex,
  publicPost,
  publicThread,
  searchThreads,
  threadReactionCount,
  toggleReaction,
  validateReport,
  visibleReplies,
} from './dasha-forum.mjs';

const LLMS_TXT = `# $dasha is dash_eats on Solana

site https://www.getdasha.com/
which https://www.getdasha.com/which
associated mint 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
pair 9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7
CoinGecko dash_eats https://www.coingecko.com/en/coins/dash_eats
Jupiter https://jup.ag/tokens/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump

The other Dasha is VVAIFU FQ1tyso61AH1tzodyJfSwmzsD3GToybbRNoZxUBz21p8 — not this.

## Links

- [getdasha.com](https://www.getdasha.com/)
- [Which $dasha](https://www.getdasha.com/which)
- [CoinGecko dash_eats](https://www.coingecko.com/en/coins/dash_eats)
- [Jupiter](https://jup.ag/tokens/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump)

## Optional

- [Full text](https://www.getdasha.com/llms-full.txt)
`;

const LLMS_FULL_TXT = `# $dasha is dash_eats on Solana

> dash_eats on Solana. Site https://www.getdasha.com/. Associated mint 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump. Pair 9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7. CoinGecko dash_eats. Jupiter is jup.ag with that mint.

$dasha is dash_eats. The site is https://www.getdasha.com/. This file is the full markdown for agents. /llms.txt is the short index.

## Identity

This is dash_eats on Solana.

associated mint 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
pair 9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7
CoinGecko dash_eats https://www.coingecko.com/en/coins/dash_eats
Jupiter token https://jup.ag/tokens/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
Jupiter swap https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
Solscan https://solscan.io/token/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
GeckoTerminal pool https://www.geckoterminal.com/solana/pools/9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7
X https://x.com/dash_eats
Mint source https://x.com/dash_eats/status/2085405228078432279

The other Dasha is VVAIFU FQ1tyso61AH1tzodyJfSwmzsD3GToybbRNoZxUBz21p8 — not this.

## Which $dasha?

This is dash_eats on Solana. Its associated Solana mint is:

\`53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump\`

The other Dasha is VVAIFU:

\`FQ1tyso61AH1tzodyJfSwmzsD3GToybbRNoZxUBz21p8\`

That is a different token, not this one.

Pair: \`9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7\`

CoinGecko lists this one as dash_eats. Jupiter is jup.ag. Token path and swap path both carry the associated mint in full.

Page: https://www.getdasha.com/which

## Site

https://www.getdasha.com/

Home: $dasha. Make something. Pass it on. Contract address on the page is the associated mint.

Studio: remix stills and lines. Open tool at https://www.getdasha.com/studio

Lobby: public chat and lasting forum threads, not Discord. https://www.getdasha.com/lobby

Simp Board: opt-in quiz and measured board. Purchases and holdings add zero points. At 25 points, a member can publish one allowlisted Spotlight profile. https://www.getdasha.com/simp

Desk: buyer facts, full mint, Jupiter swap, GeckoTerminal pool, Solscan. https://www.getdasha.com/dasha

Faucet: public $dasha tip flow; current availability comes from its public status endpoint. https://www.getdasha.com/faucet

Chess: rated games. https://www.getdasha.com/chess

How to buy: fund SOL, match the full mint, then use the exact-mint Jupiter link. Dasha does not execute or custody the swap. https://www.getdasha.com/how-to-buy

Bounties: USDC on Solana. Dasha does not hold the funds. https://www.getdasha.com/bounties

Contribute: no application, wallet or points gate; open a pull request. https://www.getdasha.com/contribute

## Machine files

- https://www.getdasha.com/llms.txt
- https://www.getdasha.com/llms-full.txt
- https://www.getdasha.com/sitemap.xml
- https://www.getdasha.com/robots.txt
`;

const WHICH_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Which $dasha? dash_eats, not VVAIFU</title>
  <meta name="description" content="dash_eats on Solana. The associated $dasha mint is 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump. VVAIFU is a different token.">
  <link rel="canonical" href="https://www.getdasha.com/which">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Which $dasha? dash_eats, not VVAIFU","url":"https://www.getdasha.com/which","description":"dash_eats on Solana. Associated mint 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump. Pair 9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7. CoinGecko dash_eats. The other Dasha is VVAIFU FQ1tyso61AH1tzodyJfSwmzsD3GToybbRNoZxUBz21p8."}</script>
  <style>
    :root { color-scheme: dark; font: 18px/1.5 Arial, Helvetica, sans-serif; background: #070608; color: #f4eddb; }
    body { max-width: 44rem; margin: auto; padding: 2rem 1rem; }
    h1 { line-height: 1; }
    code { display: block; padding: 1rem; border: 1px solid #666; overflow-wrap: anywhere; }
    a { color: #dfff00; }
    a:focus-visible { outline: 3px solid #dfff00; outline-offset: 3px; }
  </style>
</head>
<body>
  <main>
    <h1>Which $dasha?</h1>
    <p>This is dash_eats on Solana. Its associated Solana mint is:</p>
    <code>53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump</code>
    <p>The other Dasha is VVAIFU:</p>
    <code>FQ1tyso61AH1tzodyJfSwmzsD3GToybbRNoZxUBz21p8</code>
    <p>That is a different token, not this one.</p>
    <p>Pair: <code>9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7</code></p>
    <p>CoinGecko: <a href="https://www.coingecko.com/en/coins/dash_eats">dash_eats</a></p>
    <p><a href="https://jup.ag/tokens/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump" rel="noopener noreferrer">Open the associated mint on Jupiter</a></p>
    <p><a href="https://www.getdasha.com/">getdasha.com</a></p>
  </main>
</body>
</html>
`;


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
/** Inject site-wide X connect prompt into product HTML (home via Webflow pass-through + edge pages). */
export function injectXConnectPrompt(html) {
  if (!html || typeof html !== 'string') return html;
  if (html.includes('client/x-connect.js') || html.includes('DashaXConnectPrompt')) return html;
  const tag = `<script src="https://lobby.getdasha.com/client/x-connect.js" integrity="${X_CONNECT_SRI}" crossorigin="anonymous" defer></script>`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}\n</body>`);
  return html + tag;
}

export function ensureHtmlLang(html) {
  return String(html || '').replace(/<html\b([^>]*)>/i, (tag, attrs) =>
    /\blang\s*=/i.test(attrs) ? tag : `<html lang="en"${attrs}>`);
}

/** Webflow's shared nav opens X in a new tab; enforce isolation at the edge too. */
export function hardenBlankTargets(html) {
  return String(html || '').replace(/<a\b[^>]*\btarget=(['"])_blank\1[^>]*>/gi, (tag) => {
    const rel = tag.match(/\brel=(['"])(.*?)\1/i);
    if (!rel) return tag.replace(/>$/, ' rel="noopener noreferrer">');
    const tokens = new Set(rel[2].toLowerCase().split(/\s+/).filter(Boolean));
    tokens.add('noopener');
    tokens.add('noreferrer');
    return tag.replace(rel[0], `rel="${[...tokens].join(' ')}"`);
  });
}

/** Exact tags dasha-live-verify looks for. Webflow pages often omit them. */
/** Designer chrome still links /graph, a page that 404s. Strip it at the edge so first-visit
 *  HTML does not fail live-verify while the Webflow symbol is mid-claim. */
export function stripDeadNav(html) {
  return String(html || '').replace(/\s*<a\b[^>]*href="\/graph"[^>]*>[\s\S]*?<\/a>/gi, '');
}

/** Webflow still injects a loader for retired project fonts even though Dasha overrides its type. */
export function stripLegacyFonts(html) {
  return String(html || '')
    .replace(/\s*<link\b(?=[^>]*\bhref=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com[^"']*["'])[^>]*\/?\s*>/gi, '')
    .replace(/\s*<script\b(?=[^>]*\bsrc=["']https:\/\/ajax\.googleapis\.com\/ajax\/libs\/webfont\/[^"']+["'])[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\s*<script\b[^>]*>\s*WebFont\.load\([\s\S]*?<\/script>/gi, '');
}

export function ensureCanonical(html, pageUrl) {
  if (!html || !pageUrl) return html;
  let out = String(html);
  if (!/rel=["']canonical["']/i.test(out)) {
    const tag = `<link rel="canonical" href="${pageUrl}">`;
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${tag}</head>`) : tag + out;
  }
  if (!/property=["']og:url["']/i.test(out)) {
    const tag = `<meta property="og:url" content="${pageUrl}">`;
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${tag}</head>`) : tag + out;
  }
  return out;
}

/**
 * dasha-lobby-page.html is a Webflow embed fragment (no document chrome).
 * Worker /lobby is a first-class page — without a <title>, browsers invent one
 * from the leading <style> block (CSS leaking into the tab).
 */
export function asStandaloneLobbyPage(html) {
  /* Lobby host `/` is health JSON. The embed fragment's ← $dasha must not land there. */
  const src = String(html || '').replace(
    /(<a class="lp-back" href=")\/(")/,
    '$1https://www.getdasha.com/$2',
  );
  if (/<title[\s>]/i.test(src)) return src;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>$dasha community — chat and forum</title><meta name="description" content="Live chat and lasting threads for $dasha."><link rel="canonical" href="https://www.getdasha.com/lobby"><link rel="alternate" type="application/rss+xml" title="$dasha forum" href="https://www.getdasha.com/lobby/feed.xml"><meta name="theme-color" content="#070608"><meta property="og:type" content="website"><meta property="og:url" content="https://www.getdasha.com/lobby"><meta property="og:title" content="$dasha community — chat and forum"><meta property="og:description" content="Live chat and lasting threads for $dasha."><meta property="og:image" content="https://lobby.getdasha.com/og/dasha-social-card.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="$dasha community — chat and forum"><meta name="twitter:description" content="Live chat and lasting threads for $dasha."><meta name="twitter:image" content="https://lobby.getdasha.com/og/dasha-social-card.png"></head><body>${src}</body></html>`;
}

/** Forum is the threads pane of the lobby. Keep ?t= so copied thread links still open. */
export function forumToLobbyRedirect(url) {
  const dest = new URL('https://www.getdasha.com/lobby');
  const src = url instanceof URL ? url : null;
  const t = src ? src.searchParams.get('t') : '';
  if (t) dest.searchParams.set('t', t);
  /* Hash-only #threads is dropped by some redirect clients. pane= is the durable first-visit signal. */
  dest.searchParams.set('pane', 'threads');
  dest.hash = 'threads';
  return Response.redirect(dest.href, 308);
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
  return headers;
}

const LLMS_DESCRIBEDBY = '</llms.txt>; rel="describedby", </llms-full.txt>; rel="describedby"';
const HOME_TITLE = '$dasha dash_eats — make the timeline stranger';

function attachLlmsDescribedBy(headers) {
  const have = String(headers.get('Link') || headers.get('link') || '');
  const links = have.split(',');
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    if (!links.some(link => link.includes(`<${path}>`) && /\brel=["']?describedby\b/i.test(link))) {
      headers.append('Link', `<${path}>; rel="describedby"`);
    }
  }
  return headers;
}

/** Mood-only Webflow titles hide the mint. Keep the line, name dash_eats. */
export function mintHomeTitle(html) {
  const src = String(html || '');
  if (/<title>[^<]*(?:dash_eats|53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump)[^<]*<\/title>/i.test(src)) return src;
  if (!/<title>[^<]*<\/title>/i.test(src)) {
    const tag = `<title>${HOME_TITLE}</title>`;
    return /<\/head>/i.test(src) ? src.replace(/<\/head>/i, `${tag}</head>`) : tag + src;
  }
  return src.replace(/<title>[^<]*<\/title>/i, `<title>${HOME_TITLE}</title>`);
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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...(credentials ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
    Vary: 'Origin',
  };
}

const PRICE_TTL_MS = 30_000;
const PRICE_STALE_MS = 10 * 60_000;
const PRICE_SERIES_TTL_MS = 5 * 60_000;

function json(body, status, origin, { credentials = false, headers: extraHeaders = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...SECURITY,
      ...corsHeaders(origin, { credentials }),
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
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
const emptyStudioMetrics = since => ({ since, completionSince: since, opens: 0, firstEdits: 0, completions: 0, exports: 0, shareIntents: 0, shareSuccesses: 0, copyEditableLinks: 0, handoffMints: 0, handoffOpens: 0, sources: { home: 0, quiz: 0, direct: 0, 'transmission-001': 0, other: 0 } });
const HANDOFF_TTL_MS = 90 * 24 * 60 * 60_000;
const HANDOFF_MAX = 4000;
const HANDOFF_LOOKS = new Set(['photo', 'poster', 'ticket', 'print', 'marquee', 'signal', 'face']);
const HANDOFF_FORMATS = new Set(['square', 'story', 'banner']);
const HANDOFF_EFFECTS = new Set(['clean', 'fry', 'xerox', 'angel', 'cursed', 'surveillance']);
const HANDOFF_SRC = new Set(['home', 'quiz', 'transmission-001']);
const HANDOFF_STICKERS = new Set(['', '🍒', '✦', '♱', '♢', '☻']);

function handoffId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function sanitizeHandoffBody(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const look = String(input.look || '');
  const format = String(input.format || '');
  const effect = String(input.effect || 'clean');
  if (!HANDOFF_LOOKS.has(look) || !HANDOFF_FORMATS.has(format) || !HANDOFF_EFFECTS.has(effect)) return null;
  const line = String(input.line || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!line) return null;
  const sticker = input.sticker == null ? '' : String(input.sticker);
  if (!HANDOFF_STICKERS.has(sticker)) return null;
  let photo = '';
  if (input.photo != null && input.photo !== '') {
    photo = String(input.photo).slice(0, 40);
    if (!/^[a-z0-9_-]+$/i.test(photo)) return null;
  }
  let src = '';
  if (input.src != null && input.src !== '') {
    src = String(input.src);
    if (!HANDOFF_SRC.has(src)) src = '';
  }
  const parent = input.parent && typeof input.parent === 'object' && !Array.isArray(input.parent)
    ? sanitizeHandoffBody({ ...input.parent, parent: undefined })
    : null;
  const out = { look, format, line, effect };
  if (photo) out.photo = photo;
  if (sticker) out.sticker = sticker;
  if (src) out.src = src;
  if (parent) out.parent = parent;
  return out;
}

export function handoffToStudioHash(state) {
  const p = new URLSearchParams();
  p.set('look', state.look);
  p.set('format', state.format);
  p.set('line', state.line);
  if (state.photo) p.set('photo', state.photo);
  if (state.effect && state.effect !== 'clean') p.set('effect', state.effect);
  if (state.sticker) p.set('sticker', state.sticker);
  if (state.src) p.set('src', state.src);
  if (state.parent) {
    p.set('pLook', state.parent.look);
    p.set('pFormat', state.parent.format);
    p.set('pLine', state.parent.line);
    if (state.parent.photo) p.set('pPhoto', state.parent.photo);
    if (state.parent.effect && state.parent.effect !== 'clean') p.set('pEffect', state.parent.effect);
    if (state.parent.sticker) p.set('pSticker', state.parent.sticker);
  }
  return p.toString();
}

export function handoffCardHtml(id, state, { autoRedirect = true } = {}) {
  const pageUrl = `https://lobby.getdasha.com/h/${id}`;
  const studioUrl = `https://www.getdasha.com/studio#${handoffToStudioHash(state)}`;
  const title = escapeHtml(state.line.slice(0, 80) || '$dasha Studio');
  const lookBit = escapeHtml(String(state.look || 'poster'));
  const formatBit = escapeHtml(String(state.format || 'square'));
  const description = escapeHtml(`${state.look || 'poster'} · ${state.format || 'square'} · Your turn — change one thing, pass it on.`);
  const imageUrl = `https://lobby.getdasha.com/h/${id}/og.png`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="canonical" href="${escapeHtml(pageUrl)}"><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:site_name" content="getdasha"><meta property="og:url" content="${escapeHtml(pageUrl)}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${escapeHtml(imageUrl)}"><meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="600"><meta property="og:image:height" content="314"><meta property="og:image:alt" content="${title}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${escapeHtml(imageUrl)}"><style>body{margin:0;background:#070608;color:#f4eddb;font:18px/1.45 Arial,Helvetica,sans-serif;min-height:100vh;display:grid;place-items:center}.c{max-width:28rem;padding:32px 20px;text-align:left}b{color:#dfff00;font-size:12px;letter-spacing:.12em;text-transform:uppercase}.meta{margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#e6dcc4}h1{margin:8px 0 16px;font-size:clamp(28px,7vw,44px);line-height:.95;letter-spacing:-.04em;text-transform:uppercase}p{margin:0 0 20px;color:#e6dcc4}a.cta{display:inline-flex;min-height:52px;align-items:center;padding:0 20px;background:#dfff00;color:#070608;font-weight:900;text-decoration:none;text-transform:uppercase;letter-spacing:.04em}a.ghost{display:inline-flex;min-height:44px;align-items:center;margin-left:12px;color:#f4eddb;font-weight:800}</style></head><body><main class="c"><b>Your turn · $dasha</b><p class="meta">${lookBit} · ${formatBit}</p><h1>${title}</h1><p>${description}</p><p><a class="cta" href="${escapeHtml(studioUrl)}">Open Studio</a><a class="ghost" href="https://www.getdasha.com/">Home</a></p></main>${autoRedirect ? `<script>location.replace(${JSON.stringify(studioUrl)})</script>` : ''}</body></html>`;
}
const emptyChessMetrics = since => ({ since, pageOpens: 0, localPlayIntents: 0, localCompletions: 0, localRematchIntents: 0, localShareIntents: 0, linkIntents: 0, enrollmentIntents: 0, holderProofIntents: 0, queueIntents: 0, buyIntents: 0, gamesStarted: 0, gamesCompleted: 0, rematchesOffered: 0, rematchesAccepted: 0, replayOpens: 0, replayPlayIntents: 0, replayShareIntents: 0, replayShareHandoffs: 0, challengesCreated: 0, challengesAccepted: 0, challengeShareIntents: 0, tournamentsCreated: 0, tournamentJoins: 0, tournamentsStarted: 0, tournamentsCompleted: 0, tournamentShareIntents: 0 });
const CHESS_TOURNAMENT_REGISTRATION_MS = 24 * 60 * 60_000;
const CHESS_CHALLENGE_MS = 30 * 60_000;
const CHESS_CHALLENGE_RETAIN_MS = 24 * 60 * 60_000;

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
      editToShareIntent: ratio(studio.shareIntents, studio.firstEdits),
      intentToShareSuccess: ratio(studio.shareSuccesses, studio.shareIntents),
      copyEditableLinks: cell(studio.copyEditableLinks),
      handoffMints: cell(studio.handoffMints),
      handoffOpens: cell(studio.handoffOpens),
      mintToOpen: Number(studio.handoffOpens) >= threshold && Number(studio.handoffMints) >= threshold
        ? Math.min(1, Number((Number(studio.handoffOpens) / Number(studio.handoffMints)).toFixed(3)))
        : null,
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
      localPlayIntents: cell(chess.localPlayIntents),
      localCompletions: cell(chess.localCompletions),
      localRematchIntents: cell(chess.localRematchIntents),
      localShareIntents: cell(chess.localShareIntents),
      pageOpenToLocalPlayIntent: ratio(chess.localPlayIntents, chess.pageOpens),
      localPlayToCompletion: ratio(chess.localCompletions, chess.localPlayIntents),
      localCompletionToRematchIntent: ratio(chess.localRematchIntents, chess.localCompletions),
      localCompletionToShareIntent: ratio(chess.localShareIntents, chess.localCompletions),
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
  // Prefer dedicated secret SOLANA_RPC_URL, then SOLANA_RPC_URLS list, then public fallbacks.
  const primary = String(env.SOLANA_RPC_URL || '').trim();
  const extras = String(env.SOLANA_RPC_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const configured = [...new Set([primary, ...extras].filter(Boolean))].slice(0, 3);
  // Official mainnet-beta 403s Cloudflare IPs. These two answered getTokenAccountsByOwner
  // from this host in 2026-08-18 probes; publicnode hangs or 403s.
  const publicPool = [
    'https://solana.leorpc.com/?api_key=FREE',
    'https://api.mainnet.solana.com',
    'https://api.mainnet-beta.solana.com',
    'https://solana-rpc.publicnode.com',
  ];
  // Dedicated first, then public — a 429/abort on the paid URL must not skip free fallbacks.
  const endpoints = [...new Set([...configured, ...publicPool])].slice(0, 6);
  if (endpoints.some((endpoint) => !endpoint.startsWith('https://'))) throw new Error('Solana RPC must use HTTPS');
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

/** Sum raw $dasha balance for a wallet (treasury inventory). */
async function tokenBalanceRaw(env, owner, mint = FAUCET_MINT) {
  let lastError;
  for (const endpoint of solanaRpcEndpoints(env)) {
    try {
      const controller = new AbortController();
      // Keep this short: a hanging dedicated RPC must leave time for public fallbacks
      // inside the Worker/DO request budget. 10s * N endpoints impersonated an empty jar.
      const timer = setTimeout(() => controller.abort(), 3_500);
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccountsByOwner',
            params: [owner, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }],
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      const data = await response.json().catch(() => ({}));
      const host = (() => { try { return new URL(endpoint).host; } catch { return 'rpc'; } })();
      if (!response.ok) throw new Error(`rpc http ${response.status} ${host}`);
      if (data.error) throw new Error(`${data.error.message || data.error.code || 'rpc error'} ${host}`);
      // Missing/empty value ⇒ zero balance (treasury empty is fine).
      const rows = Array.isArray(data.result?.value)
        ? data.result.value
        : Array.isArray(data.result)
          ? data.result
          : [];
      let total = 0n;
      for (const row of rows) {
        const info = row?.account?.data?.parsed?.info;
        if (info?.mint && info.mint !== mint) continue;
        try {
          total += BigInt(info?.tokenAmount?.amount || 0);
        } catch {
          /* skip */
        }
      }
      return total;
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

function htmlPage(title, body, { path = '', description = '', robots = '' } = {}) {
  const url = path ? `https://www.getdasha.com${path}` : '';
  const social = url ? `<meta name="description" content="${description}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:url" content="${url}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="https://lobby.getdasha.com/og/dasha-social-card.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="https://lobby.getdasha.com/og/dasha-social-card.png">` : '';
  const robot = robots ? `<meta name="robots" content="${robots}">` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${robot}${social}
<style>body{font:16px/1.45 Arial,Helvetica,sans-serif;background:#070608;color:#f4eddb;max-width:28rem;margin:3rem auto;padding:0 1rem}a,code{color:#dfff00}.cta{display:inline-flex;align-items:center;min-height:48px;padding:0 16px;background:#dfff00;color:#070608;font-weight:900;text-decoration:none;box-shadow:4px 4px 0 #ff3b81}.skip-link{position:absolute;left:-9999px;top:0;z-index:100;padding:12px 16px;background:#dfff00;color:#070608!important;font-weight:900;text-decoration:none}.skip-link:focus{left:12px;top:12px;outline:3px solid #f4eddb;outline-offset:2px}</style></head>
<body><a class="skip-link" href="#dasha-page">Skip to content</a><main id="dasha-page">${body}</main></body></html>`;
}

const NOT_FOUND_HTML = htmlPage('Not found — $dasha', `<h1>Not this page.</h1>
<p>Studio, Simp Board, Desk, and how to buy live on getdasha.com. This URL is not one of them.</p>
<p><code>53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump</code></p>
<p><a href="https://www.getdasha.com/">Home</a> · <a href="https://www.getdasha.com/studio">Studio</a> · <a href="https://www.getdasha.com/simp">Simp</a> · <a href="https://www.getdasha.com/how-to-buy">How to buy</a> · <a href="https://www.getdasha.com/privacy">Privacy</a></p>`, { robots: 'noindex,follow' });

const CONTRIBUTE_HTML = htmlPage('Contribute to Dasha', `<h1>Build Dasha.</h1>
<p>There’s nothing to join. Open a pull request and you’re a contributor—no wallet, holder status, or Simp Points required.</p>
<p>A docs fix needs no setup: open a file on GitHub, click the pencil, then propose changes.</p>
<p><a class="cta" href="https://github.com/Uuriko/dasha-desk/contribute" target="_blank" rel="noopener noreferrer">Pick a first issue ↗</a></p>
<p><a href="https://github.com/Uuriko/dasha-desk/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">Read the guide ↗</a> · <a href="https://github.com/Uuriko/dasha-desk/discussions/categories/ideas" target="_blank" rel="noopener noreferrer">Propose an idea ↗</a></p>
<p>GitHub review decides what merges. PR points are not live yet.</p>
<p><a href="https://www.getdasha.com/">Home</a> · <a href="https://www.getdasha.com/studio">Studio</a> · <a href="https://www.getdasha.com/simp">Simp Board</a></p>`, { path: '/contribute', description: 'Build Dasha through beginner-friendly code, docs, design, and ideas.' });

const PRIVACY_HTML = htmlPage('Dasha privacy', `<h1>Privacy</h1>
<p>Updated August 21, 2026.</p>
<h2>What Dasha uses</h2>
<p>Logging in with X reads your X account ID, handle, display name, avatar, and verification type. Wallet login stores the signed-in public address only in the signed browser session; it checks no balance and sends no transaction. Either browser session lasts up to 30 days. Dasha does not store the X access token.</p>
<p>If you join the Simp Board or finish its scored quiz, Dasha stores your linked identity, score, badges, contribution links, optional Spotlight profile link, referral milestones, and dated holder-badge status. Referral links record the inviter and invited X-linked Board identities until either person leaves; uncompleted claims are removed after expiry on the next Board or referral request. The wallet address and balance used for that optional badge are checked once and are not retained. Lobby history is limited to roughly 30 minutes and 40 messages. Forum posts can retain a score-neutral mark that holder proof was current when posted; private X IDs deduplicate score-neutral post reactions until the thread expires or is removed, while only counts are public. Completed chess games are public replays showing both X handles, ratings, moves, result, and completion time. Studio, quiz, referral, and chess funnel counts are aggregate only.</p>
<h2>How it is used</h2>
<p>The data provides linked chat identity, Board ranking, quiz results, contribution review, moderation, and optional holder recognition. Public Board rows and season snapshots can show your handle, avatar, score, badges, accepted evidence links, and optional Spotlight profile link. Dasha does not post to X or sell identity data.</p>
<p>Webflow serves the site and Cloudflare hosts the service. X processes OAuth and serves some public images; other public images may load from Wikimedia. Those image hosts receive ordinary request metadata without a page referrer. A Solana RPC receives a wallet address only during an optional holder check; wallet login itself does not query the chain.</p>
<h2>Control and deletion</h2>
<p>Unlink clears the signed browser session. Leave Board removes your profile, referral identity, claims, active quiz state, current linked result, holder challenge, chess rating, games and tournaments involving you, and your rows from retained season snapshots. Anonymous aggregate counts remain.</p>
<p>For access or deletion requests, use the repository's <a href="https://github.com/Uuriko/dasha-desk/security/advisories/new">private report</a>. Do not include wallet keys or seed phrases.</p>
<p><a href="https://www.getdasha.com/">Back to Dasha</a> · <a href="https://www.getdasha.com/how-to-buy">How to buy</a></p>`, { path: '/privacy', description: 'What Dasha stores, and how to leave.' });

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function isoDate(value) {
  const timestamp = Number(value);
  const date = new Date(timestamp);
  return Number.isFinite(timestamp) && timestamp > 0 && Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function xProfileUrl(handle) {
  const value = String(handle || '');
  return /^[A-Za-z0-9_]{1,15}$/.test(value) ? `https://x.com/${value}` : '';
}

function simpProfileUrl(handle, value) {
  const clean = String(handle || '').toLowerCase();
  const canonical = /^[a-z0-9_]{1,15}$/.test(clean) ? `https://www.getdasha.com/simp/u/${clean}` : '';
  return canonical && String(value || '') === canonical ? canonical : '';
}

function xAuthorHtml(handle, profileUrl) {
  const simp = simpProfileUrl(handle, profileUrl);
  const url = simp || xProfileUrl(handle);
  const label = `@${escapeHtml(handle || '')}`;
  return url ? `<a class="df-author" href="${url}"${simp ? '' : ' target="_blank" rel="noopener noreferrer nofollow ugc"'}>${label}</a>` : label;
}

/** First paint for an existing /lobby?t= permalink; the forum client replaces it with the same data. */
export function forumThreadPageHtml(html, thread, posts) {
  const id = String(thread?.id || '');
  const list = Array.isArray(posts) ? posts : [];
  const opener = list[0];
  const published = isoDate(opener?.ts);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || !thread?.title || !opener?.text || !Number.isFinite(Date.parse(published))) return html;
  const pageUrl = `https://www.getdasha.com/lobby?t=${encodeURIComponent(id)}`;
  const liveReplies = list.slice(1).filter(post => post && !post.deleted && post.text && isoDate(post.ts));
  const author = post => {
    const handle = String(post.handle || '');
    const x = xProfileUrl(handle);
    const profile = simpProfileUrl(handle, post.simpUrl);
    return { '@type': 'Person', name: `@${handle.slice(0, 15)}`, ...(profile ? { url: profile, sameAs: [x] } : x ? { url: x } : {}) };
  };
  const reactionCount = post => {
    const count = Number(post?.reactionCount);
    return Number.isInteger(count) && count > 0 && count <= MAX_REACTORS ? count : 0;
  };
  const interactionStatistic = post => {
    const count = reactionCount(post);
    return count ? {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/LikeAction',
      userInteractionCount: count,
    } : null;
  };
  const comment = liveReplies.map(post => ({
    '@type': 'Comment',
    text: String(post.text),
    author: author(post),
    datePublished: isoDate(post.ts),
    url: `${pageUrl}#post-${encodeURIComponent(String(post.id || ''))}`,
    ...(isoDate(post.editedAt) ? { dateModified: isoDate(post.editedAt) } : {}),
    ...(interactionStatistic(post) ? { interactionStatistic: interactionStatistic(post) } : {}),
  }));
  const data = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    mainEntityOfPage: pageUrl,
    headline: String(thread.title),
    text: String(opener.text),
    url: pageUrl,
    author: author(opener),
    datePublished: published,
    ...(interactionStatistic(opener) ? { interactionStatistic: interactionStatistic(opener) } : {}),
    commentCount: liveReplies.length,
    ...(isoDate(opener.editedAt) ? { dateModified: isoDate(opener.editedAt) } : {}),
    ...(comment.length ? { comment } : {}),
  };
  const renderPost = post => {
    const anchor = `post-${String(post.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 48)}`;
    const date = isoDate(post.ts);
    const holder = post.holder ? '<span class="lobby-holder-badge" title="Holder proof was current when posted">$dasha holder</span>' : '';
    const count = reactionCount(post);
    const reactions = count ? ` · <span class="df-reaction">♥ ${count}</span>` : '';
    const quoteId = String(post.quote?.id || '');
    const quoteHandle = /^[A-Za-z0-9_-]{1,48}$/.test(quoteId)
      ? `<a class="df-quote-handle" href="${pageUrl}#post-${quoteId}" aria-label="View quoted post by @${escapeHtml(post.quote.handle || '')}">@${escapeHtml(post.quote.handle || '')}</a>`
      : `<span class="df-quote-handle">@${escapeHtml(post.quote?.handle || '')}</span>`;
    const quote = !post.deleted && post.quote?.id
      ? `<blockquote class="df-quote">${quoteHandle} ${escapeHtml(post.quote.text || '')}</blockquote>`
      : '';
    return `<article class="df-post" id="${anchor}"><p class="df-meta">${xAuthorHtml(post.handle, post.simpUrl)} · <a class="df-post-link" href="${pageUrl}#${anchor}" aria-label="Post permalink"><time datetime="${date}">${date.slice(0, 10)}</time></a>${post.editedAt ? ' · edited' : ''}${holder}${reactions}</p><p class="df-body">${post.deleted ? 'deleted' : escapeHtml(post.text || '').replace(/\n/g, '<br>')}</p>${quote}</article>`;
  };
  const title = escapeHtml(`${thread.title} — $dasha forum`);
  const description = escapeHtml(String(opener.text).replace(/\s+/g, ' ').trim().slice(0, 160));
  const imageUrl = `https://www.getdasha.com/lobby/card/${encodeURIComponent(id)}.png`;
  const firstPaint = `<div class="df-tools"><a class="df-back" href="/lobby?pane=threads#threads">← All threads</a></div><h2 class="df-title">${escapeHtml(thread.title)}</h2><div class="df-posts">${list.map(renderPost).join('')}</div>`;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return String(html)
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${pageUrl}">`)
    .replace(/<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="article">')
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${pageUrl}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${imageUrl}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="600"><meta property="og:image:height" content="314"><meta property="og:image:alt" content="${title}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${imageUrl}"><meta name="twitter:image:alt" content="${title}">`)
    .replace('</head>', `<script type="application/ld+json">${json}</script></head>`)
    .replace('class="lp-hold" data-pane="now"', 'class="lp-hold" data-pane="threads"')
    .replace('id="tab-now" role="tab" aria-controls="dasha-lobby" aria-selected="true"', 'id="tab-now" role="tab" aria-controls="dasha-lobby" aria-selected="false"')
    .replace('id="tab-threads" role="tab" aria-controls="dasha-forum" aria-selected="false"', 'id="tab-threads" role="tab" aria-controls="dasha-forum" aria-selected="true"')
    .replace(/<div id="dasha-forum"([^>]*)><\/div>/, `<div id="dasha-forum"$1>${firstPaint}</div>`);
}

/** Crawlable first page for the existing Lobby forum pane; the client takes over after load. */
export function forumIndexPageHtml(html, threads) {
  const list = (Array.isArray(threads) ? threads : [])
    .filter(thread => /^[A-Za-z0-9_-]{1,40}$/.test(String(thread?.id || '')) && thread?.title)
    .slice(0, 50);
  const rows = list.map(thread => {
    const pageUrl = `https://www.getdasha.com/lobby?t=${encodeURIComponent(thread.id)}`;
    const replies = Math.max(0, Number(thread.replies) || 0);
    const reactionCount = Number(thread.reactions);
    const reactions = Number.isInteger(reactionCount) && reactionCount > 0 && reactionCount <= MAX_POSTS * MAX_REACTORS ? ` · ♥ ${reactionCount}` : '';
    const date = isoDate(thread.lastTs ?? thread.ts);
    const holder = thread.holder ? '<span class="lobby-holder-badge" title="Holder proof was current when posted">$dasha holder</span>' : '';
    const snippet = thread.snippet ? `<p class="df-snippet">${escapeHtml(String(thread.snippet).slice(0, 180))}</p>` : '';
    return `<article class="df-row"><div class="df-row-main"><a class="df-open" href="${pageUrl}">${escapeHtml(thread.title)}</a><p class="df-meta">${xAuthorHtml(thread.handle, thread.simpUrl)} · ${replies} ${replies === 1 ? 'reply' : 'replies'}${reactions}${date ? ` · <time datetime="${date}">${date.slice(0, 10)}</time>` : ''}${holder}</p>${snippet}</div></article>`;
  }).join('');
  const firstPaint = `<div class="df-head"><h2 class="df-title">Forum</h2><p class="df-note">Official room. Read freely. Link X in the lobby to post. · <a class="df-feed" href="https://www.getdasha.com/lobby/feed.xml" type="application/rss+xml" aria-label="Subscribe to public forum threads with RSS">RSS</a></p></div>${rows ? `<div class="df-list">${rows}</div>` : '<p class="df-empty">Start the first thread: meme, question, or build idea.</p>'}`;
  return String(html).replace(/<div id="dasha-forum"([^>]*)><\/div>/, `<div id="dasha-forum"$1>${firstPaint}</div>`);
}

/** RSS 2.0 over the same bounded public index used by first paint and the sitemap. */
export function forumRssXml(threads) {
  const list = [...new Map((Array.isArray(threads) ? threads : [])
    .filter(thread => /^[A-Za-z0-9_-]{1,40}$/.test(String(thread?.id || '')) && thread?.title)
    .map(thread => [String(thread.id), thread])).values()].slice(0, 50);
  const latest = list.map(thread => isoDate(thread.lastTs ?? thread.ts)).filter(Boolean).sort().pop();
  const items = list.map(thread => {
    const url = `https://www.getdasha.com/lobby?t=${encodeURIComponent(thread.id)}`;
    const modified = isoDate(thread.lastTs ?? thread.ts);
    const date = modified ? `<pubDate>${new Date(modified).toUTCString()}</pubDate>` : '';
    const description = thread.snippet ? `<description>${escapeHtml(String(thread.snippet).slice(0, 280))}</description>` : '';
    return `<item><title>${escapeHtml(thread.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid>${description}${date}</item>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>$dasha forum</title><link>https://www.getdasha.com/lobby?pane=threads</link><description>Lasting public threads from the $dasha community.</description><atom:link href="https://www.getdasha.com/lobby/feed.xml" rel="self" type="application/rss+xml" />${latest ? `<lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : ''}${items}</channel></rss>\n`;
}

/** Add the bounded public forum index to the canonical www sitemap. */
export function forumSitemapXml(xml, threads) {
  const list = [...new Map((Array.isArray(threads) ? threads : [])
    .filter(thread => /^[A-Za-z0-9_-]{1,40}$/.test(String(thread?.id || '')))
    .map(thread => [String(thread.id), thread])).values()].slice(0, 50);
  if (!list.length) return String(xml);
  const rows = list.map(thread => {
    const lastmod = isoDate(thread.lastTs ?? thread.ts);
    return `  <url>\n    <loc>https://www.getdasha.com/lobby?t=${encodeURIComponent(thread.id)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
  }).join('\n');
  return String(xml).replace(/\s*<\/urlset>\s*$/, `\n${rows}\n</urlset>\n`);
}

/** Add only the already-enumerated public top-50 Simp profiles. */
export function simpSitemapXml(xml, members) {
  const handles = [...new Set((Array.isArray(members) ? members : [])
    .map(member => String(member?.handle || '').replace(/^@/, '').toLowerCase())
    .filter(handle => /^[a-z0-9_]{1,15}$/.test(handle)))].slice(0, 50);
  if (!handles.length) return String(xml);
  const rows = handles.map(handle => `  <url>\n    <loc>https://www.getdasha.com/simp/u/${handle}</loc>\n  </url>`).join('\n');
  return String(xml).replace(/\s*<\/urlset>\s*$/, `\n${rows}\n</urlset>\n`);
}

export function personalizeChessPage(html, { title, description, url, robots = 'index,follow' }) {
  const safeTitle = escapeHtml(String(title || 'Dasha Chess').slice(0, 100));
  const safeDescription = escapeHtml(String(description || 'Dasha versus Anna. Holder-only rated chess.').slice(0, 180));
  const safeUrl = escapeHtml(String(url || 'https://www.getdasha.com/chess'));
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
  if (request.method === 'HEAD' || !env?.LOBBY) return CHESS_PAGE_HTML;
  const url = new URL(request.url);
  const gameId = url.searchParams.get('game');
  const tournamentId = url.searchParams.get('tournament');
  const challengeId = url.searchParams.get('challenge');
  const valid = value => /^[A-Za-z0-9_-]{6,24}$/.test(value || '');
  const apiPath = valid(gameId) ? `/chess/replay/${gameId}` : valid(challengeId) ? `/chess/challenge/${challengeId}` : valid(tournamentId) ? `/chess/tournament/${tournamentId}` : '';
  const generic = isProductHost(url.hostname)
    ? personalizeChessPage(CHESS_PAGE_HTML, {
        title: 'Dasha Chess',
        description: 'Dasha versus Anna. Holder-only rated chess.',
        url: 'https://www.getdasha.com/chess',
      })
    : CHESS_PAGE_HTML;
  if (!apiPath) return generic;
  try {
    const room = env.LOBBY.idFromName('public');
    const response = await env.LOBBY.get(room).fetch(new Request(`https://lobby.getdasha.com${apiPath}`));
    if (!response.ok) return generic;
    const data = await response.json();
    if (data.replay) {
      const replay = data.replay;
      return personalizeChessPage(CHESS_PAGE_HTML, {
        title: `@${replay.white.handle} ${replay.result} @${replay.black.handle} — Dasha Chess`,
        description: `${replay.moves.length} moves · ${replay.reason} · Replay every move.`,
        url: `https://www.getdasha.com/chess?game=${encodeURIComponent(replay.id)}`,
      });
    }
    if (data.tournament) {
      const tournament = data.tournament;
      const state = tournament.status === 'registration' ? 'Open tournament' : tournament.status === 'active' ? 'Tournament in progress' : `${tournament.champion || 'Champion'} wins`;
      return personalizeChessPage(CHESS_PAGE_HTML, {
        title: `${tournament.name} — Dasha Chess`,
        description: `${state} · ${tournament.entrants.length}/${tournament.maxPlayers} players.`,
        url: `https://www.getdasha.com/chess?tournament=${encodeURIComponent(tournament.id)}`,
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
      return personalizeChessPage(CHESS_PAGE_HTML, {
        title,
        description: state,
        url: `https://www.getdasha.com/chess?challenge=${encodeURIComponent(challenge.id)}`,
        robots: 'noindex,follow',
      });
    }
  } catch {
    /* generic card remains available */
  }
  return generic;
}

const oauthStateCookie = (token = '') => `${OAUTH_COOKIE}=${token}; Path=/; Max-Age=${token ? 900 : 0}; HttpOnly; Secure; SameSite=Lax`;

function oauthHtmlResponse(body, status) {
  return new Response(body, {
    status,
    headers: privateHtmlHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': oauthStateCookie() }),
  });
}

function githubOauthHtmlResponse(body, status, { head = false, nonce = '' } = {}) {
  const headers = new Headers(privateHtmlHeaders({ 'Content-Type': 'text/html; charset=utf-8' }, nonce));
  headers.append('Set-Cookie', githubOauthStateCookie());
  return new Response(head ? null : body, { status, headers });
}

const FORUM_PAGE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Forum — $dasha</title>
<meta name="description" content="Long-form threads for $dasha. Link X to post.">
<link rel="canonical" href="https://lobby.getdasha.com/forum">
<meta property="og:type" content="website">
<meta property="og:url" content="https://lobby.getdasha.com/forum">
<meta property="og:title" content="Forum — $dasha">
<meta property="og:description" content="Longer than chat. Same rules as chat.">
<meta property="og:image" content="https://lobby.getdasha.com/og/dasha-social-card.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Forum — $dasha">
<meta name="twitter:description" content="Longer than chat. Same rules as chat.">
<meta name="twitter:image" content="https://lobby.getdasha.com/og/dasha-social-card.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="getdasha">
<meta property="og:url" content="https://lobby.getdasha.com/forum">
<meta property="og:title" content="Forum — $dasha">
<meta property="og:description" content="Long-form threads for $dasha. Link X to post.">
<meta property="og:image" content="https://lobby.getdasha.com/og/dasha-social-card.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Forum — $dasha">
<meta name="twitter:description" content="Long-form threads for $dasha. Link X to post.">
<meta name="twitter:image" content="https://lobby.getdasha.com/og/dasha-social-card.png">
<link rel="icon" href="https://cdn.prod.website-files.com/5f1458122ba25e70a3ff2bd0/6a767a48e1dd29d210f01235_dasha-icon-32.png">
<style>
:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--muted:#e6dcc4;--line:rgba(244,237,219,.32)}
*{box-sizing:border-box}
body{margin:0;background:var(--ink);color:var(--paper);font-family:Arial,Helvetica,sans-serif;line-height:1.5}
.wrap{width:min(760px,calc(100% - 32px));margin:0 auto;padding:20px 0 64px}
a{color:var(--paper)}
.top{display:flex;align-items:center;gap:16px;border-bottom:1px solid var(--line);padding:8px 0;flex-wrap:wrap}
.brand{margin-right:auto;min-height:44px;display:inline-flex;align-items:center;font-weight:900;font-size:17px;letter-spacing:-.03em;text-transform:uppercase;text-decoration:none}
.brand span{color:var(--acid)}
.top a:not(.brand){min-height:44px;display:inline-flex;align-items:center;font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;text-decoration:none}
h1{font-size:clamp(28px,6vw,44px);line-height:.9;letter-spacing:-.04em;text-transform:uppercase;margin:18px 0 4px}
.lede{color:var(--muted);margin:0 0 20px}
button{font:inherit;font-weight:900;min-height:44px;padding:0 16px;border:1px solid var(--paper);background:transparent;color:var(--paper);cursor:pointer;text-transform:uppercase;letter-spacing:.06em;font-size:12px}
button.primary{background:var(--acid);color:var(--ink);border-color:var(--acid)}
button[disabled]{opacity:.55;cursor:not-allowed}
input,textarea{font:inherit;width:100%;background:#0d0b0f;color:var(--paper);border:1px solid var(--line);padding:10px;min-height:44px}
textarea{min-height:120px;resize:vertical}
label{display:block;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:14px 0 4px}
.thread{display:block;width:100%;text-align:left;border:1px solid var(--line);padding:12px;margin:0 0 8px;background:transparent;min-height:44px;text-transform:none;letter-spacing:0;font-size:16px}
.thread .meta{display:block;color:var(--muted);font-size:12px;font-weight:400;margin-top:4px;text-transform:none;letter-spacing:0}
.post{border-left:3px solid var(--line);padding:8px 0 8px 12px;margin:0 0 14px}
.post .who{font-weight:900;font-size:13px}
.post .when{color:var(--muted);font-size:12px}
.post p{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.note{border-left:4px solid var(--acid);background:rgba(223,255,0,.1);padding:10px 12px;margin:14px 0;font-weight:800}
[hidden]{display:none!important}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
</style></head><body>
<div class="wrap">
<div class="top"><a class="brand" href="https://www.getdasha.com/">$<span>dasha</span></a>
<a href="https://www.getdasha.com/lobby">Lobby</a><a href="https://www.getdasha.com/chess">Chess</a>
<a href="https://www.getdasha.com/">Home</a></div>
<h1>Forum</h1>
<p class="lede">Official $dasha room. No Telegram. No Discord. Longer than chat. Same rules as chat.</p>
<div id="say" class="note" role="status" aria-live="polite" hidden></div>

<main id="list-view">
  <button class="primary" id="new-toggle" aria-expanded="false" aria-controls="new-form">Start a thread</button>
  <form id="new-form" hidden>
    <label for="new-title">Title</label><input id="new-title" maxlength="80" required>
    <label for="new-text">Opening post</label><textarea id="new-text" maxlength="2000" required></textarea>
    <p><button class="primary" type="submit" id="new-submit">Post thread</button>
    <button type="button" id="new-cancel">Cancel</button></p>
  </form>
  <h2 class="sr">Threads</h2>
  <div id="threads" aria-busy="true">Loading threads…</div>
</main>

<main id="thread-view" hidden>
  <button id="back">← All threads</button>
  <button type="button" id="copy-link">Copy link</button>
  <h2 id="thread-title"></h2>
  <div id="posts"></div>
  <form id="reply-form">
    <label for="reply-text">Reply</label><textarea id="reply-text" maxlength="2000" required></textarea>
    <p><button class="primary" type="submit" id="reply-submit">Post reply</button></p>
  </form>
</main>
</div>
<script>
(function(){
var API='https://lobby.getdasha.com';
var $=function(id){return document.getElementById(id)};
var openId=null;
function say(msg,ok){var s=$('say');if(!msg){s.hidden=true;return}s.hidden=false;s.textContent=msg;s.style.borderLeftColor=ok?'#dfff00':'#ff3b81'}
function api(path,opts){return fetch(API+path,Object.assign({credentials:'include',headers:{'Content-Type':'application/json'}},opts||{}))
  .then(function(r){return r.json().then(function(d){return{ok:r.ok,status:r.status,data:d}})})}
function when(ts){var d=new Date(Number(ts));return isNaN(d)?'':d.toISOString().slice(0,16).replace('T',' ')+' UTC'}
function esc(s){var n=document.createElement('div');n.textContent=String(s==null?'':s);return n.innerHTML}
function fail(res){ if(res.status===401){say('Link X in the lobby before posting.');return} say((res.data&&res.data.error)||'That did not go through.') }
function threadQuery(){try{return String(new URLSearchParams(location.search).get('t')||'').trim()}catch(e){return ''}}
function setThreadQuery(id){try{var u=new URL(location.href);if(id)u.searchParams.set('t',id);else u.searchParams.delete('t');history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}}
function threadUrl(id){return 'https://lobby.getdasha.com/forum?t='+encodeURIComponent(id)}
function linkCopiedOk(got,want){return String(got||'').replace(/\s+/g,'')===String(want||'')}

function renderThreads(list){
  var box=$('threads');box.setAttribute('aria-busy','false');
  if(!list.length){box.textContent='No threads yet. Start the first one.';return}
  box.innerHTML=list.map(function(t){
    return '<button class="thread" data-id="'+esc(t.id)+'">'+esc(t.title)+
      '<span class="meta">@'+esc(t.handle)+' · '+t.replies+' repl'+(t.replies===1?'y':'ies')+' · '+when(t.lastTs)+'</span></button>'}).join('');
  Array.prototype.forEach.call(box.querySelectorAll('.thread'),function(b){
    b.addEventListener('click',function(){openThread(b.dataset.id)})});
}
function loadThreads(){say('');return api('/forum/threads').then(function(res){
  if(!res.ok)return fail(res); renderThreads(res.data.threads||[])}).catch(function(){$('threads').textContent='Could not reach the forum.'})}

function openThread(id){
  return api('/forum/thread/'+encodeURIComponent(id)).then(function(res){
    if(!res.ok)return fail(res);
    openId=id;
    setThreadQuery(id);
    $('list-view').hidden=true;$('thread-view').hidden=false;
    $('thread-title').textContent=res.data.thread.title;
    $('posts').innerHTML=(res.data.posts||[]).map(function(p){
      return '<div class="post"><div class="who">@'+esc(p.handle)+' <span class="when">'+when(p.ts)+'</span></div><p>'+esc(p.text)+'</p></div>'}).join('');
    $('thread-title').focus();
  })
}
$('back').addEventListener('click',function(){openId=null;setThreadQuery('');$('thread-view').hidden=true;$('list-view').hidden=false;loadThreads()});
$('copy-link').addEventListener('click',function(){
  if(!openId)return;
  var b=$('copy-link'),want=threadUrl(openId),label=b.textContent;
  var done=function(t){b.textContent=t;setTimeout(function(){b.textContent=label},1800)};
  if(!navigator.clipboard||!navigator.clipboard.writeText){done('Select');return}
  navigator.clipboard.writeText(want).then(function(){
    if(!navigator.clipboard.readText){done('Copied');return}
    return navigator.clipboard.readText().then(function(got){done(linkCopiedOk(got,want)?'Copied':'Select')});
  }).catch(function(){done('Select')});
});
$('new-toggle').addEventListener('click',function(){
  var open=$('new-form').hidden; $('new-form').hidden=!open; this.setAttribute('aria-expanded',String(open));
  if(open)$('new-title').focus()});
$('new-cancel').addEventListener('click',function(){$('new-form').hidden=true;$('new-toggle').setAttribute('aria-expanded','false');$('new-toggle').focus()});
$('new-form').addEventListener('submit',function(e){e.preventDefault();
  var b=$('new-submit');b.disabled=true;
  api('/forum/threads',{method:'POST',body:JSON.stringify({title:$('new-title').value,text:$('new-text').value})})
    .then(function(res){ if(!res.ok)return fail(res);
      $('new-title').value='';$('new-text').value='';$('new-form').hidden=true;
      $('new-toggle').setAttribute('aria-expanded','false'); say('Thread posted.',true); return loadThreads()})
    .catch(function(){say('That did not go through.')})
    .then(function(){b.disabled=false})});
$('reply-form').addEventListener('submit',function(e){e.preventDefault();
  if(!openId)return; var b=$('reply-submit');b.disabled=true;
  api('/forum/thread/'+encodeURIComponent(openId),{method:'POST',body:JSON.stringify({text:$('reply-text').value})})
    .then(function(res){ if(!res.ok)return fail(res); $('reply-text').value='';say('Reply posted.',true); return openThread(openId)})
    .catch(function(){say('That did not go through.')})
    .then(function(){b.disabled=false})});
loadThreads().then(function(){var t=threadQuery();if(t)openThread(t)});
})();
</script></body></html>`;

export class DashaLobby {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.history = [];
    this.rates = new Map();
    this.simpRates = new Map();
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
    this.studioHandoffs = {};
    this.simpQuizResults = {};
    this.simpClaims = {};
    this.simpReferrals = {};
    this.simpReferralMetrics = { since: Date.now(), claims: 0, claimRejects: 0, expirations: 0, activations: 0, cappedActivations: 0, contributions: 0, invalidations: 0, organicEnrollments: 0, referredEnrollments: 0, organicReturns: 0, referredReturns: 0 };
    this.simpSeasons = {};
    this.chessGames = {};
    this.forumIndex = [];
    this.forumReports = [];
    this.forumAudit = [];
    this.chessRatings = {};
    this.chessCurrent = {};
    this.chessQueue = [];
    this.chessChallenges = {};
    this.chessTournaments = {};
    this.chessHidden = {};
    this.chessMetrics = emptyChessMetrics(Date.now());
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
      const muteRows = await this.state.storage.get('mutes');
      if (Array.isArray(muteRows)) {
        const now = Date.now();
        for (const row of muteRows) {
          if (row?.key && row.until > now) this.mutes.set(row.key, row.until);
        }
      }
      const forumIndex = await this.state.storage.get('forum:index');
      if (Array.isArray(forumIndex)) {
        this.forumIndex = pruneIndex(forumIndex, Date.now());
        const live = new Set(this.forumIndex.map((t) => t.id));
        for (const key of (await this.state.storage.list({ prefix: 'forum:t:' })).keys()) {
          if (!live.has(key.slice('forum:t:'.length))) await this.state.storage.delete(key);
        }
      }
      const forumReports = await this.state.storage.get('forum:reports');
      if (Array.isArray(forumReports)) this.forumReports = forumReports.slice(0, 100);
      const forumAudit = await this.state.storage.get('forum:audit');
      if (Array.isArray(forumAudit)) this.forumAudit = forumAudit.slice(0, 100);
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
      const handoffs = await this.state.storage.get('studioHandoffs');
      if (handoffs && typeof handoffs === 'object' && !Array.isArray(handoffs)) this.studioHandoffs = handoffs;
      const results = await this.state.storage.get('simpQuizResults');
      if (results && typeof results === 'object' && !Array.isArray(results)) this.simpQuizResults = results;
      const claims = await this.state.storage.get('simpClaims');
      if (claims && typeof claims === 'object' && !Array.isArray(claims)) this.simpClaims = claims;
      const referrals = await this.state.storage.get('simpReferrals');
      if (referrals && typeof referrals === 'object' && !Array.isArray(referrals)) this.simpReferrals = referrals;
      const referralMetrics = await this.state.storage.get('simpReferralMetrics');
      if (referralMetrics && typeof referralMetrics === 'object' && !Array.isArray(referralMetrics)) this.simpReferralMetrics = { ...this.simpReferralMetrics, ...referralMetrics };
      const seasons = await this.state.storage.get('simpSeasons');
      if (seasons && typeof seasons === 'object' && !Array.isArray(seasons)) this.simpSeasons = seasons;
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
      const next = await this.state.storage.getAlarm();
      if (next == null) await this.state.storage.setAlarm(Date.now() + 5 * 60_000);
    });
  }

  async persistSimp() {
    await this.state.storage.put('simpProfiles', this.simpProfiles);
  }

  async persistSimpState() {
    await this.state.storage.put({ simpProfiles: this.simpProfiles, simpQuizAttempts: this.simpQuizAttempts, simpQuizMetrics: this.simpQuizMetrics, simpQuizResults: this.simpQuizResults, simpClaims: this.simpClaims, simpSeasons: this.simpSeasons, simpReferrals: this.simpReferrals, simpReferralMetrics: this.simpReferralMetrics });
  }

  refreshReferralScores() {
    this.simpProfiles = applyReferralScores(this.simpProfiles, this.simpReferrals);
  }

  pruneReferralState() {
    const result = pruneExpiredReferrals(this.simpReferrals);
    this.simpReferrals = result.referrals;
    this.simpReferralMetrics.expirations += result.expired;
    return result.expired;
  }

  noteReferralEnrollment(xId, created) {
    if (!created) return;
    this.simpReferralMetrics[this.simpReferrals[String(xId)] ? 'referredEnrollments' : 'organicEnrollments']++;
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
    const before = this.chessQueue.length;
    this.chessQueue = this.chessQueue.filter(row => now - Number(row.at) < 15 * 60_000 && this.simpProfiles[row.xId] && Number(this.simpProfiles[row.xId].holderUntil) > now && !this.activeTournamentFor(row.xId) && !this.openChessChallengeFor(row.xId));
    return this.chessQueue.length !== before;
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
      } else if (challenge.status !== 'open' && now - Number(challenge.updatedAt || challenge.createdAt) >= CHESS_CHALLENGE_RETAIN_MS) {
        delete this.chessChallenges[id]; changed = true;
      }
    }
    return changed;
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
    this.chessQueue = this.chessQueue.filter(row => row.xId !== key);
    for (const [id, challenge] of Object.entries(this.chessChallenges)) if (challenge.creatorXId === key || challenge.acceptedByXId === key) delete this.chessChallenges[id];
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

    if (path === '/auth/wallet/challenge') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      if (!this.env.LOBBY_SESSION_SECRET) return json({ error: 'wallet login unavailable' }, 503, allowedOrigin, cred);
      const publicKey = String((await requestJson(request)).publicKey || '');
      if (!isValidSolanaAddress(publicKey)) return json({ error: 'valid Solana address required' }, 400, allowedOrigin, cred);
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const ipAllowed = simpRate(this.simpRates, `wallet-login-ip:${ip}`, 12);
      if (!ipAllowed.ok) return json({ error: 'wallet login rate limited', waitMs: ipAllowed.waitMs }, 429, allowedOrigin, cred);
      const allowed = simpRate(this.simpRates, `wallet-login-challenge:${publicKey}`, 6);
      if (!allowed.ok) return json({ error: 'wallet login rate limited', waitMs: allowed.waitMs }, 429, allowedOrigin, cred);
      const issuedAt = Date.now(), expiresAt = issuedAt + 5 * 60_000;
      const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, '0')).join('');
      const proofOrigin = new URL(allowedOrigin);
      const message = walletLoginMessage({ publicKey, nonce, issuedAt, expiresAt, domain: proofOrigin.host, uri: `${proofOrigin.origin}/login` });
      const challenge = await signPayload(this.env.LOBBY_SESSION_SECRET, { kind: 'wallet_login', publicKey, nonce, message, origin: proofOrigin.origin, exp: expiresAt });
      const saved = await this.state.storage.get('walletLogins');
      const live = Object.fromEntries(Object.entries(saved && typeof saved === 'object' ? saved : {})
        .filter(([, row]) => Number(row?.exp) > issuedAt));
      live[publicKey] = { nonce, exp: expiresAt };
      const bounded = Object.fromEntries(Object.entries(live).sort((a, b) => b[1].exp - a[1].exp).slice(0, 100));
      await this.state.storage.put('walletLogins', bounded);
      return json({ ok: true, message, challenge, expiresAt }, 200, allowedOrigin, cred);
    }

    if (path === '/auth/wallet/verify') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const body = await requestJson(request);
      const challenge = await verifyPayload(this.env.LOBBY_SESSION_SECRET, body.challenge);
      if (!challenge || challenge.kind !== 'wallet_login' || challenge.publicKey !== body.publicKey || challenge.origin !== allowedOrigin) {
        return json({ error: 'invalid wallet login challenge' }, 401, allowedOrigin, cred);
      }
      const allowed = simpRate(this.simpRates, `wallet-login-verify:${body.publicKey}`, 4);
      if (!allowed.ok) return json({ error: 'wallet login rate limited', waitMs: allowed.waitMs }, 429, allowedOrigin, cred);
      const signatureOk = await verifyEd25519(challenge.message, body.publicKey, body.signature).catch(() => false);
      if (!signatureOk) return json({ error: 'invalid wallet signature' }, 400, allowedOrigin, cred);
      const logins = await this.state.storage.get('walletLogins');
      const pending = logins && typeof logins === 'object' ? logins[body.publicKey] : null;
      if (!pending || pending.nonce !== challenge.nonce || pending.exp < Date.now()) return json({ error: 'wallet login challenge already used' }, 409, allowedOrigin, cred);
      delete logins[body.publicKey];
      if (Object.keys(logins).length) await this.state.storage.put('walletLogins', logins);
      else await this.state.storage.delete('walletLogins');
      const token = await createWalletSessionToken(this.env, body.publicKey);
      return json({ ok: true, provider: 'wallet' }, 200, allowedOrigin, {
        credentials: true,
        headers: { 'Set-Cookie': cookieHeader(token) },
      });
    }

    if (path === '/studio/event' && request.method === 'POST') {
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const input = await requestJson(request);
      if (input?.event === 'handoff_mint' || input?.event === 'handoff_open') {
        return json({ ok: true, counted: false, reason: 'server-authoritative' }, 200, allowedOrigin);
      }
      const key = {
        open: 'opens',
        first_edit: 'firstEdits',
        completion: 'completions',
        export: 'exports',
        share_intent: 'shareIntents',
        share_success: 'shareSuccesses',
        copy_editable_link: 'copyEditableLinks',
        handoff_mint: 'handoffMints',
        handoff_open: 'handoffOpens',
      }[input?.event];
      if (!key) return json({ error: 'invalid event' }, 400, allowedOrigin);
      if (this.studioMetrics[key] == null) this.studioMetrics[key] = 0;
      this.studioMetrics[key]++;
      if (input.event === 'open') {
        if (!this.studioMetrics.sources || typeof this.studioMetrics.sources !== 'object') {
          this.studioMetrics.sources = { home: 0, quiz: 0, direct: 0, 'transmission-001': 0, other: 0 };
        }
        const source = ['home', 'quiz', 'direct', 'transmission-001', 'other'].includes(input.source)
          ? input.source
          : 'other';
        this.studioMetrics.sources[source] = (this.studioMetrics.sources[source] || 0) + 1;
      }
      await this.state.storage.put('studioMetrics', this.studioMetrics);
      return json({ ok: true }, 200, allowedOrigin);
    }

    if (path === '/studio/handoff' && request.method === 'POST') {
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const input = await requestJson(request);
      const state = sanitizeHandoffBody(input);
      if (!state) return json({ error: 'invalid handoff state' }, 400, allowedOrigin);
      const now = Date.now();
      /* Light per-IP mint cap (best-effort; DO is single-threaded). */
      const ip = (request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0, 64);
      if (!this.handoffMintHits) this.handoffMintHits = {};
      const windowMs = 60_000;
      const hit = this.handoffMintHits[ip] || { n: 0, t: now };
      if (now - hit.t > windowMs) { hit.n = 0; hit.t = now; }
      hit.n += 1;
      this.handoffMintHits[ip] = hit;
      if (hit.n > 40) return json({ error: 'rate limited' }, 429, allowedOrigin);
      for (const [hid, row] of Object.entries(this.studioHandoffs)) {
        if (!row || row.exp < now) delete this.studioHandoffs[hid];
      }
      const ids = Object.keys(this.studioHandoffs);
      if (ids.length >= HANDOFF_MAX) {
        const oldest = ids.sort((a, b) => (this.studioHandoffs[a]?.at || 0) - (this.studioHandoffs[b]?.at || 0)).slice(0, 200);
        for (const hid of oldest) delete this.studioHandoffs[hid];
      }
      let id = handoffId();
      while (this.studioHandoffs[id]) id = handoffId();
      this.studioHandoffs[id] = { state, at: now, exp: now + HANDOFF_TTL_MS };
      this.studioMetrics.handoffMints = (this.studioMetrics.handoffMints || 0) + 1;
      await this.state.storage.put({ studioHandoffs: this.studioHandoffs, studioMetrics: this.studioMetrics });
      const url = `https://lobby.getdasha.com/h/${id}`;
      return json({ ok: true, id, url }, 200, allowedOrigin);
    }

    if (path.startsWith('/h/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const rest = path.slice('/h/'.length).replace(/\/$/, '');
      const headOnly = request.method === 'HEAD';
      const ogMatch = rest.match(/^([A-Za-z0-9_-]{8,24})\/og\.png$/);
      const id = ogMatch ? ogMatch[1] : rest;
      if (!/^[A-Za-z0-9_-]{8,24}$/.test(id)) {
        return new Response(headOnly ? null : 'Not found', { status: 404, headers: SECURITY });
      }
      const row = this.studioHandoffs[id];
      if (!row || !row.state || row.exp < Date.now()) {
        return new Response(headOnly ? null : 'Handoff expired or missing', { status: 404, headers: SECURITY });
      }
      if (ogMatch) {
        const png = await handoffOgPng(row.state);
        return new Response(headOnly ? null : png, {
          headers: {
            ...SECURITY,
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=600',
          },
        });
      }
      const bot = /bot|crawl|spider|slurp|facebookexternalhit|Twitterbot|LinkedInBot|Discordbot|Slackbot|WhatsApp|TelegramBot|Preview/i.test(request.headers.get('user-agent') || '');
      if (!headOnly && !bot && !row.opened) {
        row.opened = Date.now();
        this.studioMetrics.handoffOpens = (this.studioMetrics.handoffOpens || 0) + 1;
        await this.state.storage.put({ studioHandoffs: this.studioHandoffs, studioMetrics: this.studioMetrics });
      }
      const html = handoffCardHtml(id, row.state, { autoRedirect: !bot });
      return new Response(headOnly ? null : html, {
        headers: htmlHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120' }),
      });
    }

    if (path === '/studio/metrics') {
      if (!modAllowed(request, this.env)) return json({ error: 'unauthorized' }, 401, allowedOrigin);
      if (request.method === 'GET') return json({ ok: true, metrics: this.studioMetrics, quizMetrics: this.simpQuizMetrics, referralMetrics: this.simpReferralMetrics, chessMetrics: this.chessMetrics, chessStorage: { bytes: this.chessStorageBytes(), migrateAtBytes: 1_000_000 } }, 200, allowedOrigin);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin);
      const input = await requestJson(request);
      if (input?.action !== 'reset') return json({ error: 'invalid action' }, 400, allowedOrigin);
      const since = Date.now();
      this.studioMetrics = emptyStudioMetrics(since);
      this.simpQuizMetrics = emptyQuizMetrics(since);
      this.simpReferralMetrics = { since, claims: 0, claimRejects: 0, expirations: 0, activations: 0, cappedActivations: 0, contributions: 0, invalidations: 0, organicEnrollments: 0, referredEnrollments: 0, organicReturns: 0, referredReturns: 0 };
      this.chessMetrics = emptyChessMetrics(since);
      await this.state.storage.put({ studioMetrics: this.studioMetrics, simpQuizMetrics: this.simpQuizMetrics, simpReferralMetrics: this.simpReferralMetrics, chessMetrics: this.chessMetrics });
      await this.persistChess();
      return json({ ok: true, reset: true, since }, 200, allowedOrigin);
    }

    if (path === '/studio/metrics/public' && request.method === 'GET') {
      return json(publicFunnelSummary(this.studioMetrics, this.simpQuizMetrics, this.chessMetrics), 200, allowedOrigin);
    }

    if (path.startsWith('/simp/result/') && request.method === 'GET') {
      const result = this.simpQuizResults[path.slice('/simp/result/'.length)];
      if (!result) return json({ error: 'result not found' }, 404, allowedOrigin);
      const title = storedQuizTitle(result.title, result.correct, result.total);
      return json({ ok: true, result: { correct: result.correct, total: result.total, title, lane: result.lane } }, 200, allowedOrigin);
    }

    if (path.startsWith('/simp/r/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const id = path.slice('/simp/r/'.length).replace(/\/$/, '');
      const result = this.simpQuizResults[id];
      const headOnly = request.method === 'HEAD';
      if (!result) return new Response(headOnly ? null : 'Result not found', { status: 404, headers: SECURITY });
      const title = storedQuizTitle(result.title, result.correct, result.total);
      let html;
      try {
        html = simpResultHtml({ id, title, correct: result.correct, total: result.total });
      } catch {
        return new Response(headOnly ? null : 'Result not found', { status: 404, headers: SECURITY });
      }
      return new Response(headOnly ? null : html, {
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'X-Dasha-Edge': 'simp-share',
        }),
      });
    }

    const simpMemberMatch = path.match(/^\/simp\/member\/([A-Za-z0-9_]{1,15})\/?$/);
    if (simpMemberMatch && request.method === 'GET') {
      if (this.pruneReferralState()) await this.persistSimpState();
      this.refreshReferralScores();
      const handle = simpMemberMatch[1].toLowerCase();
      const member = buildPublicBoard(Object.values(this.simpProfiles), { limit: Number.MAX_SAFE_INTEGER }).measured
        .find((row) => String(row.handle).toLowerCase() === handle);
      return member ? json({ ok: true, member }, 200, allowedOrigin) : json({ error: 'member not found' }, 404, allowedOrigin);
    }

    if (path === '/simp/board' && request.method === 'GET') {
      if (this.pruneReferralState()) await this.persistSimpState();
      this.refreshReferralScores();
      const board = buildPublicBoard(Object.values(this.simpProfiles), {
        limit: PUBLIC_BOARD_LIMIT,
      });
      return json(board, 200, allowedOrigin);
    }

    if (path === '/simp/me' && request.method === 'GET') {
      const session = await sessionFromRequest(this.env, request);
      let referralChanged = Boolean(this.pruneReferralState());
      if (session?.xId) {
        const key = String(session.xId), pending = this.simpReferrals[key];
        const capped = pending && !pending.activatedAt && referralCapReached(this.simpReferrals, pending.inviterXId);
        const before = this.simpReferrals;
        this.simpReferrals = activateReferral(this.simpReferrals, session.xId);
        if (before !== this.simpReferrals) {
          referralChanged = true;
          this.simpReferralMetrics.activations++;
          if (capped) this.simpReferralMetrics.cappedActivations++;
        }
        const profile = this.simpProfiles[key];
        if (profile && !profile.returnedAt && profile.enrolledAt >= this.simpReferralMetrics.since && Date.now() - profile.enrolledAt >= 24 * 60 * 60 * 1000) {
          this.simpProfiles[key] = { ...profile, returnedAt: Date.now() };
          this.simpReferralMetrics[pending ? 'referredReturns' : 'organicReturns']++;
          referralChanged = true;
        }
      }
      this.refreshReferralScores();
      if (referralChanged) await this.persistSimpState();
      const referral = session?.xId ? this.simpReferrals[String(session.xId)] : null;
      const profile = session?.xId ? this.simpProfiles[String(session.xId)] : null;
      return json({
        ...meStatus(this.simpProfiles, session),
        claims: claimsForSession(this.simpClaims, session),
        referral: profile ? {
          ...(profile.referralCode ? { inviteUrl: `https://www.getdasha.com/?ref=${profile.referralCode}#simp` } : {}),
          invited: Object.values(this.simpReferrals).filter((row) => row.inviterXId === String(session.xId)).length,
          activated: Object.values(this.simpReferrals).filter((row) => row.inviterXId === String(session.xId) && row.activatedAt).length,
          contributed: Object.values(this.simpReferrals).filter((row) => row.inviterXId === String(session.xId) && row.contributedAt).length,
          ...(referral ? { state: referral.contributedAt ? 'contributed' : referral.activatedAt ? 'activated' : referral.quizAt ? 'return_pending' : 'quiz_pending' } : {}),
        } : null,
      }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/referral/admin') {
      if (!modAllowed(request, this.env)) return json({ error: 'mod denied' }, 403, allowedOrigin, cred);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const input = await requestJson(request);
      if (input?.action !== 'invalidate' || !this.simpReferrals[String(input.inviteeXId || '')]) return json({ error: 'referral not found' }, 404, allowedOrigin, cred);
      delete this.simpReferrals[String(input.inviteeXId)];
      this.simpReferralMetrics.invalidations++;
      this.refreshReferralScores();
      await this.persistSimpState();
      return json({ ok: true }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/referral') {
      const session = await sessionFromRequest(this.env, request);
      const xId = String(session?.xId || '');
      if (!xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      const allowed = simpRate(this.simpRates, `referral:${xId}`, 8);
      if (!allowed.ok) return json({ error: 'referral rate limited', waitMs: allowed.waitMs }, 429, allowedOrigin, cred);
      const input = await requestJson(request);
      if (input?.action === 'create') {
        if (!this.simpProfiles[xId]) return json({ error: 'join board first' }, 401, allowedOrigin, cred);
        if (!this.simpProfiles[xId].referralCode) this.simpProfiles[xId] = { ...this.simpProfiles[xId], referralCode: randomUrlToken(18) };
        await this.persistSimpState();
        return json({ ok: true, inviteUrl: `https://www.getdasha.com/?ref=${this.simpProfiles[xId].referralCode}#simp` }, 200, allowedOrigin, cred);
      }
      if (input?.action === 'claim') {
        this.pruneReferralState();
        const result = claimReferral(this.simpReferrals, this.simpProfiles, session, input.code);
        if (!result.ok) {
          this.simpReferralMetrics.claimRejects++;
          await this.persistSimpState();
          return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
        }
        this.simpReferrals = result.referrals;
        this.simpReferralMetrics.claims++;
        await this.persistSimpState();
        return json({ ok: true, state: 'quiz_pending' }, 201, allowedOrigin, cred);
      }
      return json({ error: 'invalid action' }, 400, allowedOrigin, cred);
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
        const cutoff = Date.now() - 60 * 60_000;
        for (const [key, attempt] of Object.entries(this.simpQuizAttempts)) if (key.startsWith('anon:') && Number(attempt?.updatedAt) < cutoff) delete this.simpQuizAttempts[key];
        // Scored retakes always allowed — wipe in-progress attempt and start a fresh scored run.
        const mode = input?.mode === 'quick' ? 'quick' : 'deep';
        const attemptId = xId || `anon:${randomUrlToken(18)}`;
        const attempt = startQuizAttempt({ practice: false, mode });
        this.simpQuizAttempts[attemptId] = attempt;
        this.simpQuizMetrics[completed ? 'replays' : 'starts']++;
        countMetric(this.simpQuizMetrics.reached, attempt.current);
        await this.persistSimpState();
        return json({
          ok: true,
          ...quizPublic(),
          mode,
          retake: Boolean(completed),
          ...(xId ? {} : { attemptId: attemptId.slice(5) }),
          ...questionForAttempt(attempt),
        }, 200, allowedOrigin, cred);
      }
      if (input?.action === 'finalize') {
        if (!xId) return json({ error: 'link X to reveal your result' }, 401, allowedOrigin, cred);
        const anonKey = `anon:${String(input.attemptId || '')}`;
        const attempt = this.simpQuizAttempts[anonKey];
        const result = submitQuiz(this.simpProfiles, session, attempt);
        if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
        const resultId = randomUrlToken(9); result.quiz.resultUrl = `https://lobby.getdasha.com/simp/r/${resultId}`; this.simpQuizResults[resultId] = result.quiz;
        this.simpProfiles = result.store;
        this.simpProfiles[xId] = { ...this.simpProfiles[xId], quiz: { ...result.quiz, resultUrl: result.quiz.resultUrl } };
        this.simpReferrals = noteReferralQuiz(this.simpReferrals, xId);
        this.noteReferralEnrollment(xId, result.created);
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
      const attemptKey = xId || `anon:${String(input?.attemptId || '')}`;
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
      const resultId = randomUrlToken(9); result.quiz.resultUrl = `https://lobby.getdasha.com/simp/r/${resultId}`; this.simpQuizResults[resultId] = result.quiz;
      // Keep resultUrl on stored profile so Share always has a permanent link (incl. retakes / Perry).
      this.simpProfiles[xId] = { ...this.simpProfiles[xId], quiz: { ...result.quiz, resultUrl: result.quiz.resultUrl } };
      this.simpReferrals = noteReferralQuiz(this.simpReferrals, xId);
      this.noteReferralEnrollment(xId, result.created);
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

    if (path === '/simp/internal/donate' && request.method === 'POST') {
      const secret = request.headers.get('x-dasha-internal') || '';
      if (!this.env.LOBBY_SESSION_SECRET || secret !== String(this.env.LOBBY_SESSION_SECRET)) {
        return json({ error: 'forbidden' }, 403, allowedOrigin, cred);
      }
      const input = await requestJson(request);
      const session = {
        xId: input?.xId,
        handle: input?.handle,
        avatar: input?.avatar,
        verifiedType: input?.verifiedType,
      };
      const result = creditDonate(this.simpProfiles, session, {
        signature: input?.signature,
        amountRaw: input?.amountRaw,
        at: input?.at,
        proven: input?.proven === true,
      });
      if (!result.ok) return json({ ok: false, awarded: false, error: result.error }, 200, allowedOrigin, cred);
      this.simpProfiles = result.store;
      await this.persistSimpState();
      return json({
        ok: true,
        awarded: true,
        points: result.points,
        donate: result.donate,
      }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/spotlight') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      const session = await sessionFromRequest(this.env, request);
      const xId = String(session?.xId || '');
      const rate = simpRate(this.simpRates, `simp-spotlight:${xId || 'anon'}`, 6);
      if (!rate.ok) return json({ error: 'spotlight updates rate limited', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
      const input = await requestJson(request);
      const result = setSimpSpotlight(this.simpProfiles, session, input?.url);
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      this.simpProfiles = result.store;
      await this.persistSimpState();
      return json({ ok: true, spotlight: result.spotlight, ...meStatus(this.simpProfiles, session) }, 200, allowedOrigin, cred);
    }

    if (path === '/simp/join') {
      if (request.method !== 'POST') {
        return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
      }
      const session = await sessionFromRequest(this.env, request);
      const result = joinBoard(this.simpProfiles, session);
      if (!result.ok) return json({ error: result.error }, result.status || 401, allowedOrigin, cred);
      this.simpProfiles = result.store;
      this.noteReferralEnrollment(session.xId, result.created);
      await this.persistSimpState();
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
      this.simpReferrals = removeReferralIdentity(this.simpReferrals, session.xId);
      this.refreshReferralScores();
      for (const [claimId, claim] of Object.entries(this.simpClaims)) if (claim.xId === String(session.xId)) delete this.simpClaims[claimId];
      delete this.simpQuizAttempts[String(session.xId)];
      const resultId = String(profile?.quiz?.resultUrl || '').match(/\/simp\/r\/([^/?#]+)/)?.[1];
      if (resultId) delete this.simpQuizResults[resultId];
      this.simpSeasons = scrubSeasonSnapshots(this.simpSeasons, session.xId, profile?.handle || session.handle);
      this.deleteChessIdentity(session.xId);
      await this.state.storage.delete(`simpHolder:${session.xId}`);
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
      if (result.claim?.status === 'approved') {
        const reviewed = Object.values(this.simpClaims).find((claim) => claim.id === result.claim.id);
        const before = this.simpReferrals;
        this.simpReferrals = qualifyReferral(this.simpReferrals, reviewed?.xId);
        if (before !== this.simpReferrals) this.simpReferralMetrics.contributions++;
        this.refreshReferralScores();
      }
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
      const publicKey = { page_open: 'pageOpens', local_play_intent: 'localPlayIntents', local_completion: 'localCompletions', local_rematch_intent: 'localRematchIntents', local_share_intent: 'localShareIntents', link_intent: 'linkIntents', enrollment_intent: 'enrollmentIntents', holder_proof_intent: 'holderProofIntents', queue_intent: 'queueIntents', buy_intent: 'buyIntents', replay_open: 'replayOpens', replay_play: 'replayPlayIntents', replay_share: 'replayShareIntents', replay_share_handoff: 'replayShareHandoffs', challenge_share: 'challengeShareIntents', tournament_share: 'tournamentShareIntents' }[input?.event];
      if (publicKey) {
        const blocked = requireOrigin();
        if (blocked) return blocked;
        const subject = xId ? `x:${xId}` : request.headers.get('CF-Connecting-IP');
        if (!subject) return json({ error: 'event subject required' }, 400, allowedOrigin);
        const rate = simpRate(this.simpRates, `chess-event:${subject}`, 60);
        if (!rate.ok) return json({ error: 'event rate limited', waitMs: rate.waitMs }, 429, allowedOrigin);
        countMetric(this.chessMetrics, publicKey);
        await this.persistChessMetrics();
        return json({ ok: true }, 200, allowedOrigin);
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
      return json({ ok: true, ratings, recent }, 200, allowedOrigin);
    }

    const replayMatch = path.match(/^\/chess\/replay\/([A-Za-z0-9_-]{6,24})$/);
    if (replayMatch && request.method === 'GET') {
      const replay = publicChessReplay(this.chessGames[replayMatch[1]]);
      return replay ? json({ ok: true, replay }, 200, allowedOrigin) : json({ error: 'replay not found' }, 404, allowedOrigin);
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
      const existing = this.openChessChallengeFor(xId);
      if (existing) return json({ ok: true, challenge: this.publicChessChallenge(existing, xId, holder) }, 200, allowedOrigin, cred);
      const id = randomUrlToken(9), createdAt = Date.now();
      const challenge = { id, creatorXId: xId, creatorHandle: String(session.handle).toLowerCase(), status: 'open', createdAt, expiresAt: createdAt + CHESS_CHALLENGE_MS, updatedAt: createdAt };
      this.chessChallenges[id] = challenge;
      this.chessQueue = this.chessQueue.filter(row => row.xId !== xId);
      this.chessMetrics.challengesCreated++;
      await this.persistChess();
      return json({ ok: true, challenge: this.publicChessChallenge(challenge, xId, holder) }, 201, allowedOrigin, cred);
    }

    const challengeMatch = path.match(/^\/chess\/challenge\/([A-Za-z0-9_-]{6,24})$/);
    if (challengeMatch) {
      const challenge = this.chessChallenges[challengeMatch[1]];
      if (!challenge) return json({ error: 'challenge not found' }, 404, allowedOrigin, cred);
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
        await this.persistChess();
        return json({ ok: true, challenge: this.publicChessChallenge(challenge, xId, holder) }, 200, allowedOrigin, cred);
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
      this.chessQueue = this.chessQueue.filter(row => row.xId !== challenge.creatorXId && row.xId !== xId);
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
      this.chessQueue = this.chessQueue.filter(row => row.xId !== xId);
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
        this.chessQueue = this.chessQueue.filter(row => row.xId !== xId);
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
        this.chessQueue = this.chessQueue.filter(row => !entrantIds.has(row.xId));
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
        this.chessQueue = this.chessQueue.filter(row => row.xId !== xId);
        await this.persistChess();
        return json({ ok: true, queued: false }, 200, allowedOrigin, cred);
      }
      const currentId = this.chessCurrent[xId];
      const current = currentId && this.chessGames[currentId];
      if (current?.state?.status === 'active') return json({ ok: true, matched: true, game: publicChessGame(current, xId) }, 200, allowedOrigin, cred);
      if (currentId) delete this.chessCurrent[xId];
      if (this.activeTournamentFor(xId)) return json({ error: 'leave or finish the tournament before casual matchmaking' }, 409, allowedOrigin, cred);
      if (this.openChessChallengeFor(xId)) return json({ error: 'cancel your open challenge before matchmaking' }, 409, allowedOrigin, cred);
      this.chessQueue = this.chessQueue.filter(row => row.xId !== xId);
      const opponent = this.chessQueue.shift();
      if (!opponent) {
        this.chessQueue.push({ xId, handle: String(session.handle).toLowerCase(), at: Date.now() });
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
          this.broadcastChess(game);
          return json({ ok: true, game: publicChessGame(game, xId) }, 200, allowedOrigin, cred);
        }
        if (game.rematchOfferBy === xId) return json({ ok: true, game: publicChessGame(game, xId) }, 200, allowedOrigin, cred);
        const opponentProfile = this.simpProfiles[opponentId];
        if (!opponentProfile || Number(opponentProfile.holderUntil) <= Date.now()) return json({ error: 'opponent must refresh holder proof' }, 409, allowedOrigin, cred);
        this.chessQueue = this.chessQueue.filter(row => row.xId !== xId && row.xId !== opponentId);
        const rematch = this.makeChessGame(game.players.b, game.players.w, { swap: true });
        this.chessMetrics.rematchesAccepted++;
        game.rematchGameId = rematch.id;
        game.updatedAt = Date.now();
        this.chessGames[game.id] = game;
        await this.persistChess();
        this.broadcastChess(game);
        return json({ ok: true, game: publicChessGame(rematch, xId) }, 201, allowedOrigin, cred);
      }
      let result;
      if (input?.action === 'resign') result = resignChess(game.state, side);
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
          this.broadcastChess(game);
          return json({ ok: true, game: publicChessGame(game, xId) }, 200, allowedOrigin, cred);
        }
      }
      else {
        if (game.state.turn !== side) return json({ error: 'wait for your turn' }, 409, allowedOrigin, cred);
        result = playMove(game.state, input);
      }
      if (!result.ok) return json({ error: result.error }, result.status || 400, allowedOrigin, cred);
      const now = Date.now();
      const timed = input?.action === 'resign' || input?.action === 'offer_draw' ? game : { ...game, drawOfferBy: null, clock: this.clockAfterMove(game, side, now) };
      const next = this.chessFinish(timed, result.state);
      await this.persistChess();
      this.broadcastChess(next);
      return json({ ok: true, game: publicChessGame(next, xId) }, 200, allowedOrigin, cred);
    }

    return json({ error: 'not found' }, 404, allowedOrigin, cred);
  }

  async alarm() {
    this.history = pruneHistory(this.history);
    await this.state.storage.put('history', this.history.slice(-MAX_HISTORY));
    // Drop expired mutes + idle sockets
    const now = Date.now();
    let chessChanged = this.pruneChessQueue(now);
    if (this.expireChessRegistrations(now)) chessChanged = true;
    if (this.expireChessChallenges(now)) chessChanged = true;
    for (const game of Object.values(this.chessGames)) {
      const result = this.expireChessClock(game, now);
      if (result.expired) { chessChanged = true; this.broadcastChess(result.game); }
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

  broadcastChess(game) {
    if (!game?.id) return;
    const ts = Date.now();
    const frame = JSON.stringify({ type: 'chess', id: game.id, version: game.state?.version, ts });
    for (const ws of this.state.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment() || {};
        if (!att.xId || !publicChessGame(game, att.xId, ts)) continue;
        ws.send(frame);
      } catch {
        /* one dead socket must not stop the other player being told */
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

  /**
   * One Gecko/Dexscreener fetch per TTL for the whole site. Lives on the lobby DO so
   * isolates cannot stampede the free API. Failure never invents a number.
   */
  async handlePrice(request, allowedOrigin) {
    const now = Date.now();
    if (!this.priceCache) this.priceCache = await this.state.storage.get('priceCache') || { at: 0, body: null };
    const dueForRefresh = !this.priceCache.body || now - this.priceCache.at > PRICE_TTL_MS;
    const mayAttempt = now - (this.priceAttemptAt || 0) > PRICE_TTL_MS;
    if (dueForRefresh && mayAttempt) {
      this.priceAttemptAt = now;
      try {
        const base = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${PAIR}`;
        const opts = { signal: AbortSignal.timeout(6000), headers: { accept: 'application/json', 'user-agent': 'dasha-lobby' } };
        const previous = this.priceCache.body;
        let a = null;
        let snapSource = null;
        let snapError = '';
        try {
          const snapRes = await fetch(base, opts);
          if (snapRes.ok) {
            const attrs = (await snapRes.json())?.data?.attributes;
            if (attrs?.base_token_price_usd) {
              a = {
                priceUsd: Number(attrs.base_token_price_usd),
                fdvUsd: Number(attrs.fdv_usd) || null,
                volume24hUsd: Number(attrs.volume_usd?.h24) || null,
                liquidityUsd: Number(attrs.reserve_in_usd) || null,
                change: { h1: Number(attrs.price_change_percentage?.h1), h24: Number(attrs.price_change_percentage?.h24) },
              };
              snapSource = 'geckoterminal';
            }
          } else snapError = `pool ${snapRes.status}`;
        } catch (e) { snapError = `pool ${String(e?.message || e).slice(0, 40)}`; }

        if (!a) {
          const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MINT}`, opts);
          if (!dexRes.ok) throw new Error(`${snapError || 'pool unavailable'}; dex ${dexRes.status}`);
          const pair = ((await dexRes.json())?.pairs || []).find((row) => row?.pairAddress === PAIR);
          if (!pair?.priceUsd) throw new Error(`${snapError || 'pool unavailable'}; dex has no ${PAIR}`);
          a = {
            priceUsd: Number(pair.priceUsd),
            fdvUsd: Number(pair.fdv) || null,
            volume24hUsd: Number(pair.volume?.h24) || null,
            liquidityUsd: Number(pair.liquidity?.usd) || null,
            change: { h1: Number(pair.priceChange?.h1), h24: Number(pair.priceChange?.h24) },
          };
          snapSource = 'dexscreener';
        }
        if (!Number.isFinite(a.priceUsd) || a.priceUsd <= 0) throw new Error('no usable price');

        let series = previous?.series || [];
        if (!series.length || now - (this.seriesAt || 0) > PRICE_SERIES_TTL_MS) {
          try {
            const ohlcvRes = await fetch(`${base}/ohlcv/minute?aggregate=5&limit=288`, opts);
            if (ohlcvRes.ok) {
              const rows = (await ohlcvRes.json())?.data?.attributes?.ohlcv_list;
              if (Array.isArray(rows) && rows.length) {
                series = rows
                  .map((row) => [Number(row[0]), Number(Number(row[4]).toPrecision(6))])
                  .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]) && point[1] > 0)
                  .sort((x, y) => x[0] - y[0]);
                this.seriesAt = now;
              }
            }
          } catch { /* keep previous series */ }
        }
        if (!series.length) throw new Error('no series yet');

        this.priceCache = {
          at: now,
          body: {
            ok: true,
            mint: MINT,
            pair: PAIR,
            priceUsd: a.priceUsd,
            fdvUsd: a.fdvUsd,
            volume24hUsd: a.volume24hUsd,
            liquidityUsd: a.liquidityUsd,
            change: a.change,
            series,
            seriesAsOf: new Date(this.seriesAt || now).toISOString(),
            source: snapSource,
            asOf: new Date(now).toISOString(),
          },
        };
        this.priceError = null;
        await this.state.storage.put('priceCache', this.priceCache);
      } catch (err) {
        this.priceError = String(err?.message || err).slice(0, 120);
        if (!this.priceCache.body || now - this.priceCache.at > PRICE_STALE_MS) {
          return json({ ok: false, error: 'price unavailable', reason: this.priceError }, 503, allowedOrigin || '*');
        }
      }
    }
    if (this.priceCache.body) {
      const age = now - this.priceCache.at;
      this.priceCache.body = age > PRICE_TTL_MS
        ? { ...this.priceCache.body, stale: true, staleForMs: age, reason: this.priceError || null }
        : { ...this.priceCache.body, stale: false, staleForMs: undefined, reason: undefined };
    }
    return json(this.priceCache.body, 200, allowedOrigin || '*', {
      headers: { 'Cache-Control': `public, max-age=${Math.floor(PRICE_TTL_MS / 1000)}` },
    });
  }

  forumKey(id) {
    return `forum:t:${id}`;
  }

  async forumThreadPosts(id) {
    const posts = await this.state.storage.get(this.forumKey(id));
    return Array.isArray(posts) ? posts : null;
  }

  /** Write the index, and delete the post keys the prune orphaned in the same breath. */
  async persistForumIndex(evicted = []) {
    await this.state.storage.put('forum:index', this.forumIndex);
    for (const id of evicted) await this.state.storage.delete(this.forumKey(id));
  }

  async logForumAudit(action, id, by, ts = Date.now()) {
    this.forumAudit.unshift({ action, id, by, ts });
    this.forumAudit = this.forumAudit.slice(0, 100);
    await this.state.storage.put('forum:audit', this.forumAudit);
  }

  /** Ids dropped from the index by a prune, so their posts can go too. */
  forumPrune(next, now) {
    const before = new Set(this.forumIndex.map((t) => t.id));
    this.forumIndex = pruneIndex(next, now);
    const after = new Set(this.forumIndex.map((t) => t.id));
    return [...before].filter((id) => !after.has(id));
  }

  /**
   * Threads and replies. Every rule the chat enforces applies here — validateTitle/validateBody in
   * dasha-forum.mjs delegate to the same validateMessage the socket path uses, so the forum cannot
   * become the door around the automod. Identity comes from the session cookie, never the body.
   */
  async handleForum(request, allowedOrigin) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const cred = { credentials: true };
    const session = await sessionFromRequest(this.env, request);
    const xId = session?.xId ? String(session.xId) : '';
    const handle = session?.handle || '';
    const avatar = session?.avatar || null;
    const now = Date.now();
    const holder = Boolean(xId && Number(this.simpProfiles[xId]?.holderUntil) > now);
    const simpLinks = new Map();
    for (const profile of Object.values(this.simpProfiles)) {
      const current = String(profile?.handle || '').toLowerCase();
      if (!/^[a-z0-9_]{1,15}$/.test(current)) continue;
      simpLinks.set(current, simpLinks.has(current) ? null : `https://www.getdasha.com/simp/u/${current}`);
    }
    const addSimpUrl = row => {
      const simpUrl = simpLinks.get(String(row?.handle || '').toLowerCase());
      return simpUrl ? { ...row, simpUrl } : row;
    };

    if (request.method !== 'GET' && !allowedOrigin) return json({ error: 'origin required' }, 403, null);

    if (path === '/forum/threads' && request.method === 'GET') {
      const evicted = this.forumPrune(this.forumIndex, now);
      if (evicted.length) await this.persistForumIndex(evicted);
      const q = url.searchParams.get('q') || '';
      const list = q ? searchThreads(this.forumIndex, q) : this.forumIndex;
      const page = paginateIndex(list, {
        cursor: url.searchParams.get('cursor') || '',
        limit: url.searchParams.get('limit') || 50,
      });
      return json({ ok: true, threads: page.threads.map(row => addSimpUrl(publicThread(row))), next: page.next }, 200, allowedOrigin, cred);
    }

    if (path === '/forum/reports' && request.method === 'GET') {
      if (!modAllowed(request, this.env)) return json({ error: 'mod denied' }, 403, allowedOrigin, cred);
      return json({ ok: true, reports: this.forumReports, audit: this.forumAudit }, 200, allowedOrigin, cred);
    }

    if (path === '/forum/threads' && request.method === 'POST') {
      if (!xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      const rate = simpRate(this.simpRates, `forum-post:x:${xId}`, 20);
      if (!rate.ok) return json({ error: 'posting too fast', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
      const input = await requestJson(request);
      const id = `t${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const created = newThread({ title: input?.title, text: input?.text, handle, avatar, holder, now, id });
      if (!created.ok) return json({ error: created.error }, 400, allowedOrigin, cred);
      const evicted = this.forumPrune([created.summary, ...this.forumIndex], now);
      await this.state.storage.put(this.forumKey(id), created.posts);
      await this.persistForumIndex(evicted);
      return json({ ok: true, thread: addSimpUrl(publicThread(created.summary)) }, 200, allowedOrigin, cred);
    }

    const threadMatch = path.match(/^\/forum\/thread\/([A-Za-z0-9_-]{1,40})$/);
    if (threadMatch) {
      const id = threadMatch[1];
      const summary = this.forumIndex.find((t) => t.id === id);
      const posts = summary ? await this.forumThreadPosts(id) : null;
      if (!summary || !posts) return json({ error: 'thread not found' }, 404, allowedOrigin, cred);

      if (request.method === 'GET') {
        return json({ ok: true, thread: addSimpUrl(publicThread(summary)), posts: posts.map(row => addSimpUrl(publicPost(row, xId))) }, 200, allowedOrigin, cred);
      }
      if (request.method === 'POST') {
        if (!xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
        const writable = assertWritable(summary);
        if (!writable.ok) return json({ error: writable.error }, 403, allowedOrigin, cred);
        const rate = simpRate(this.simpRates, `forum-post:x:${xId}`, 20);
        if (!rate.ok) return json({ error: 'posting too fast', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
        const input = await requestJson(request);
        const replied = addReply(posts, { text: input?.text, handle, avatar, holder, now, id: `${id}-${posts.length}` });
        if (!replied.ok) return json({ error: replied.error }, 400, allowedOrigin, cred);
        posts.push(replied.post);
        summary.replies = visibleReplies(posts);
        summary.lastTs = now;
        /* Posts first: if the index write fails the thread still has the reply, which is recoverable.
           The other order can acknowledge a post that was never stored. */
        await this.state.storage.put(this.forumKey(id), posts);
        const evicted = this.forumPrune(this.forumIndex, now);
        await this.persistForumIndex(evicted);
        return json({ ok: true, post: addSimpUrl(publicPost(replied.post)) }, 200, allowedOrigin, cred);
      }
    }

    const reactionMatch = path.match(/^\/forum\/thread\/([A-Za-z0-9_-]{1,40})\/post\/([A-Za-z0-9_-]{1,48})\/react$/);
    if (reactionMatch && request.method === 'POST') {
      if (!xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      const id = reactionMatch[1];
      const summary = this.forumIndex.find((t) => t.id === id);
      const posts = summary ? await this.forumThreadPosts(id) : null;
      if (!summary || !posts) return json({ error: 'thread not found' }, 404, allowedOrigin, cred);
      const rate = simpRate(this.simpRates, `forum-react:x:${xId}`, 30);
      if (!rate.ok) return json({ error: 'reacting too fast', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
      const input = await requestJson(request);
      const reacted = toggleReaction(posts, { id: reactionMatch[2], xId, active: input?.active !== false });
      if (!reacted.ok) return json({ error: reacted.error }, 400, allowedOrigin, cred);
      await this.state.storage.put(this.forumKey(id), reacted.posts);
      summary.reactions = threadReactionCount(reacted.posts);
      await this.persistForumIndex([]);
      return json({ ok: true, reactionCount: reacted.reactionCount, reacted: reacted.reacted, points: 0 }, 200, allowedOrigin, cred);
    }

    const postMatch = path.match(/^\/forum\/thread\/([A-Za-z0-9_-]{1,40})\/post\/([A-Za-z0-9_-]{1,48})$/);
    if (postMatch) {
      const id = postMatch[1];
      const postId = postMatch[2];
      const summary = this.forumIndex.find((t) => t.id === id);
      const posts = summary ? await this.forumThreadPosts(id) : null;
      if (!summary || !posts) return json({ error: 'thread not found' }, 404, allowedOrigin, cred);
      if (!xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      if (request.method === 'PATCH') {
        const writable = assertWritable(summary);
        if (!writable.ok) return json({ error: writable.error }, 403, allowedOrigin, cred);
        const rate = simpRate(this.simpRates, `forum-post:x:${xId}`, 20);
        if (!rate.ok) return json({ error: 'posting too fast', waitMs: rate.waitMs }, 429, allowedOrigin, cred);
        const input = await requestJson(request);
        const edited = editPost(posts, { id: postId, text: input?.text, handle, now });
        if (!edited.ok) return json({ error: edited.error }, 400, allowedOrigin, cred);
        await this.state.storage.put(this.forumKey(id), edited.posts);
        return json({ ok: true, post: addSimpUrl(publicPost(edited.post)) }, 200, allowedOrigin, cred);
      }
      if (request.method === 'DELETE') {
        const removed = deletePost(posts, { id: postId, handle });
        if (!removed.ok) return json({ error: removed.error }, 400, allowedOrigin, cred);
        await this.state.storage.put(this.forumKey(id), removed.posts);
        summary.replies = visibleReplies(removed.posts);
        summary.reactions = threadReactionCount(removed.posts);
        await this.persistForumIndex([]);
        return json({ ok: true, post: addSimpUrl(publicPost(removed.post)) }, 200, allowedOrigin, cred);
      }
    }

    const lockMatch = path.match(/^\/forum\/thread\/([A-Za-z0-9_-]{1,40})\/lock$/);
    if (lockMatch && request.method === 'POST') {
      if (!modAllowed(request, this.env)) return json({ error: 'mod denied' }, 403, allowedOrigin, cred);
      const id = lockMatch[1];
      const summary = this.forumIndex.find((t) => t.id === id);
      const input = await requestJson(request);
      const locked = lockThread(summary, { locked: input?.locked !== false });
      if (!locked.ok) return json({ error: locked.error }, 404, allowedOrigin, cred);
      Object.assign(summary, locked.summary);
      await this.persistForumIndex([]);
      await this.logForumAudit(locked.summary.locked ? 'lock' : 'unlock', id, session?.handle || 'operator', now);
      return json({ ok: true, thread: addSimpUrl(publicThread(summary)) }, 200, allowedOrigin, cred);
    }

    const reportMatch = path.match(/^\/forum\/thread\/([A-Za-z0-9_-]{1,40})\/report$/);
    if (reportMatch && request.method === 'POST') {
      if (!xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      const id = reportMatch[1];
      const summary = this.forumIndex.find((t) => t.id === id);
      if (!summary) return json({ error: 'thread not found' }, 404, allowedOrigin, cred);
      const input = await requestJson(request);
      const reason = validateReport(input?.reason);
      if (!reason.ok) return json({ error: reason.error }, 400, allowedOrigin, cred);
      const postId = String(input?.postId || '').slice(0, 48);
      const reports = Array.isArray(this.forumReports) ? this.forumReports : [];
      reports.unshift({ id, postId, reason: reason.reason, by: handle, ts: now });
      this.forumReports = reports.slice(0, 100);
      await this.state.storage.put('forum:reports', this.forumReports);
      return json({ ok: true }, 200, allowedOrigin, cred);
    }

    return json({ error: 'not found' }, 404, allowedOrigin, cred);
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
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/price') {
      const origin = request.headers.get('Origin');
      return this.handlePrice(request, origin && originAllowed(origin, this.env.ALLOWED_ORIGINS || '') ? origin : null);
    }

    if (
      url.pathname.startsWith('/simp/') ||
      url.pathname.startsWith('/auth/wallet/') ||
      url.pathname.startsWith('/studio/') ||
      url.pathname.startsWith('/chess/') ||
      url.pathname.startsWith('/forum/') ||
      url.pathname.startsWith('/h/')
    ) {
      // Origin already checked by worker entry; pass through for CORS on stub responses.
      const origin = request.headers.get('Origin');
      const allowedOrigin =
        origin && originAllowed(origin, this.env.ALLOWED_ORIGINS || '')
          ? origin
          : this.env.ALLOW_ANY_ORIGIN
            ? origin || '*'
            : null;
      if (url.pathname.startsWith('/chess/')) return this.handleChess(request, allowedOrigin);
      if (url.pathname.startsWith('/forum/')) return this.handleForum(request, allowedOrigin);
      return this.handleSimp(request, allowedOrigin);
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
    const holder = Boolean(link?.xId && Number(this.simpProfiles[String(link.xId)]?.holderUntil) > Date.now());
    const limits = linkedLimits(Boolean(link), holder);
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
            holder,
            maxText: limits.maxText,
          }
        : { linked: false, holder: false, maxText: limits.maxText },
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
    const holder = Boolean(linked && Number(this.simpProfiles[String(att.xId)]?.holderUntil) > Date.now());
    const limits = linkedLimits(linked, holder);
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
          ? { linked: true, longerMessages: true, fasterRate: true, reservedSeats: true, badge: true, holder, maxText: limits.maxText }
          : { linked: false, holder: false, maxText: limits.maxText },
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
        holder,
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
    if (url.searchParams.get('continue') !== '1') {
      return oauthHtmlResponse(
        htmlPage('Connect X', '<h1>Connect X</h1><p>Dasha reads your public X identity across the site. It does not post for you.</p><p><a href="/privacy">Privacy</a></p><p><a href="/oauth/x/start?continue=1">Continue with X</a></p>'),
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
      const scriptNonce = randomUrlToken(18);
      const body = htmlPage(
        'Linked',
        `<h1>Linked @${safeHandle}</h1>
        <p>You can close this tab and return to Dasha.</p>
        <p><a href="https://www.getdasha.com/">Open Dasha</a></p>
        <script nonce="${scriptNonce}">try{if(window.opener){var h=${scriptHandle};['https://www.getdasha.com','https://getdasha.com','https://lobby.getdasha.com'].forEach(function(o){try{window.opener.postMessage({type:'dasha-x-linked',handle:h},o);}catch(e){}});}}catch(e){} setTimeout(function(){window.close()},800);</script>`,
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

async function handleGithubOAuth(request, env, allowedOrigin) {
  const url = new URL(request.url);
  const configured = githubConfigured(env);

  if (url.pathname === '/oauth/github/status') {
    const link = configured ? await githubSessionFromRequest(env, request) : null;
    return json({
      configured,
      linked: Boolean(link),
      github: publicGithubLink(link),
      ...(configured ? {} : { error: 'not_configured' }),
    }, 200, allowedOrigin, { credentials: true });
  }

  if (url.pathname === '/oauth/github/logout') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, { credentials: true });
    if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
    const headers = new Headers({
      ...SECURITY,
      ...corsHeaders(allowedOrigin, { credentials: true }),
      'Content-Type': 'application/json; charset=utf-8',
    });
    headers.append('Set-Cookie', githubCookieHeader('', { clear: true }));
    headers.append('Set-Cookie', githubOauthStateCookie());
    return new Response(JSON.stringify({ ok: true, linked: false }), { status: 200, headers });
  }

  if (url.pathname === '/oauth/github/start' && (request.method === 'GET' || request.method === 'HEAD')) {
    if (!configured) {
      const body = htmlPage('GitHub linking is not on yet', '<h1>GitHub linking is not on yet</h1><p>You can still read the board and contribute without linking an account.</p><p><a class="cta" href="https://www.getdasha.com/contribute">Pick a first issue</a></p><p><a href="https://www.getdasha.com/bounties">Back to bounties</a></p>');
      return githubOauthHtmlResponse(body, 200, { head: request.method === 'HEAD' });
    }
    if (request.method === 'HEAD') return githubOauthHtmlResponse('', 200, { head: true });
    const verifier = randomUrlToken(32);
    const challenge = await pkceChallengeS256(verifier);
    const state = randomUrlToken(16);
    const stateToken = await signPayload(env.LOBBY_SESSION_SECRET, {
      v: 1,
      kind: 'github_oauth_state',
      state,
      verifier,
      exp: Date.now() + 15 * 60_000,
    });
    return new Response(null, {
      status: 302,
      headers: {
        ...SECURITY,
        Location: githubAuthorizeUrl({
          clientId: env.GITHUB_CLIENT_ID,
          redirectUri: githubRedirectUri(env),
          state,
          challenge,
        }),
        'Set-Cookie': githubOauthStateCookie(stateToken),
      },
    });
  }

  if (url.pathname === '/oauth/github/callback' && request.method === 'GET') {
    if (!configured) return githubOauthHtmlResponse(htmlPage('Error', '<h1>GitHub linking is not configured</h1>'), 503);
    const providerError = url.searchParams.get('error');
    if (providerError) {
      return githubOauthHtmlResponse(
        htmlPage('Cancelled', `<h1>Link cancelled</h1><p>${escapeHtml(providerError)}</p><p><a href="https://www.getdasha.com/bounties">Back to bounties</a></p>`),
        400,
      );
    }
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthCookie = readCookie(request.headers.get('Cookie') || '', GH_OAUTH_COOKIE);
    const st = oauthCookie ? await verifyPayload(env.LOBBY_SESSION_SECRET, oauthCookie) : null;
    if (!code || !state || st?.v !== 1 || st?.kind !== 'github_oauth_state' || st.state !== state || !st.verifier) {
      return githubOauthHtmlResponse(htmlPage('Error', '<h1>Invalid GitHub OAuth state</h1><p><a href="/oauth/github/start">Try again</a></p>'), 400);
    }
    try {
      const tokens = await exchangeGithubCode(env, { code, verifier: st.verifier });
      const user = await fetchGithubUser(tokens.access_token);
      const session = await createGithubSessionToken(env, user);
      const profile = publicGithubLink(user);
      const safeLogin = escapeHtml(user.login);
      const scriptProfile = JSON.stringify(profile).replace(/</g, '\\u003c');
      const scriptNonce = randomUrlToken(18);
      const body = htmlPage('GitHub linked', `<h1>Linked ${safeLogin}</h1>
        <p>You can close this tab and return to Dasha.</p>
        <p><a href="https://www.getdasha.com/bounties">Open bounties</a></p>
        <script nonce="${scriptNonce}">try{if(window.opener){var p=${scriptProfile};['https://www.getdasha.com','https://getdasha.com','https://lobby.getdasha.com'].forEach(function(o){try{window.opener.postMessage({type:'dasha-github-linked',github:p},o);}catch(e){}});}}catch(e){} setTimeout(function(){window.close()},800);</script>`);
      const headers = new Headers(privateHtmlHeaders({ 'Content-Type': 'text/html; charset=utf-8' }, scriptNonce));
      headers.append('Set-Cookie', githubCookieHeader(session));
      headers.append('Set-Cookie', githubOauthStateCookie());
      return new Response(body, { status: 200, headers });
    } catch (error) {
      return githubOauthHtmlResponse(
        htmlPage('Error', `<h1>Could not link GitHub</h1><p>${escapeHtml(String(error?.message || error).slice(0, 200))}</p><p><a href="/oauth/github/start">Try again</a></p>`),
        502,
      );
    }
  }

  return json({ configured, error: configured ? 'not_found' : 'not_configured' }, configured ? 404 : 501, allowedOrigin, { credentials: true });
}

const BOUNTIES_FEED_SCHEMA = 'dasha-bounties-feed/v1';
const BOUNTIES_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const BOUNTIES_FEED_SOURCES = [
  'https://uuriko.github.io/dasha-desk/bounties.json',
  'https://raw.githubusercontent.com/Uuriko/dasha-desk/main/bounties.json',
];

export function normalizeBountiesFeed(raw) {
  const listings = Array.isArray(raw?.listings)
    ? raw.listings
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        ...row,
        name: typeof row.name === 'string' ? row.name.trim() : '',
        repo: typeof row.repo === 'string' ? row.repo.trim() : '',
        itemUrl: typeof row.itemUrl === 'string' ? row.itemUrl.trim() : row.itemUrl,
        payTo: typeof row.payTo === 'string' ? row.payTo.trim() : '',
      }))
      .filter((row) => row.name
        && row.repo === 'Uuriko/dasha-desk'
        && Number.isFinite(row.amount) && row.amount > 0
        && row.currency === 'USDC'
        && row.chain === 'solana'
        && row.tokenMint === BOUNTIES_USDC_MINT
        && row.payoutStatus !== 'not_implemented'
        && isValidSolanaAddress(row.payTo)
        && row.payTo !== '11111111111111111111111111111111'
        && (row.kind === 'project'
          ? row.itemUrl == null || row.itemUrl === ''
          : row.kind === 'item' && /^https:\/\/github\.com\/Uuriko\/dasha-desk\/(?:issues|pull)\/[1-9]\d*$/.test(row.itemUrl)))
    : [];
  return {
    name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : 'dasha bounties',
    schema: BOUNTIES_FEED_SCHEMA,
    note: "USDC on Solana. We don't hold it.",
    url: typeof raw?.url === 'string' && raw.url.trim() ? raw.url.trim() : 'https://www.getdasha.com/bounties',
    listings,
  };
}

export function bountiesHtml(feed) {
  const listings = normalizeBountiesFeed(feed).listings;
  const rows = listings.map((row) => {
    const title = escapeHtml(row.name);
    const name = row.itemUrl
      ? `<a href="${escapeHtml(row.itemUrl)}" target="_blank" rel="noopener noreferrer">${title} ↗</a>`
      : title;
    const pay = `solana:${row.payTo}?amount=${encodeURIComponent(String(row.amount))}&amp;spl-token=${BOUNTIES_USDC_MINT}&amp;label=${encodeURIComponent(row.name)}`;
    return `<article><h2>${name}</h2><p><strong>${escapeHtml(row.amount)} USDC</strong> · ${escapeHtml(row.repo)}</p><p><a class="cta" href="${pay}">Pay ${escapeHtml(row.amount)} USDC</a></p></article>`;
  }).join('');
  const inventory = rows || '<p>No funded bounties right now. Open-source contributions need no wallet, holder status, or Simp Points.</p>';
  return htmlPage('Bounties — $dasha', `<h1>Bounties</h1>
<p>USDC on Solana. We don’t hold it.</p>
<p><a href="https://github.com/Uuriko/dasha-desk/contribute" target="_blank" rel="noopener noreferrer">Pick a good first issue ↗</a></p>
<section id="bb-app" aria-label="Funded bounties">${inventory}</section>
<p><a href="https://www.getdasha.com/">Home</a> · <a href="https://www.getdasha.com/how-to-buy">How to buy</a> · <a href="https://www.getdasha.com/privacy">Privacy</a></p>`, { path: '/bounties', description: 'Open $dasha contribution bounties.' });
}

async function loadBountiesFeed() {
  for (const url of BOUNTIES_FEED_SOURCES) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
      const raw = response.ok ? await response.json() : null;
      if (raw && (raw.schema === BOUNTIES_FEED_SCHEMA || Array.isArray(raw.listings))) return normalizeBountiesFeed(raw);
    } catch { /* try the next trusted mirror */ }
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

async function bountiesPageResponse(request) {
  return new Response(request.method === 'HEAD' ? null : bountiesHtml(await loadBountiesFeed()), {
    status: 200,
    headers: htmlHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'X-Dasha-Edge': 'bounties',
    }),
  });
}

function isProductHost(host) {
  const h = String(host || '').toLowerCase();
  return h === 'www.getdasha.com' || h === 'getdasha.com';
}

const RETIRED_COMMERCE_PATHS = new Set(['/checkout', '/paypal-checkout', '/order-confirmation']);
/** SEO traps + retired funnels — /faucet is a real product tip page (not in this set). */
const RETIRED_SEO_PATHS = new Set([
  '/rally',
  '/rally/',
  '/airdrop',
  '/airdrop/',
  '/earn',
  '/earn/',
  '/claim',
  '/claim/',
]);

/** Product hosts (www/apex) only serve SEO/howto; everything else goes to Webflow origin. */
async function publicSimpMember(env, handle) {
  const stub = env?.LOBBY?.get(env.LOBBY.idFromName('public'));
  if (!stub) throw new Error('missing lobby');
  const response = await stub.fetch(new Request(`https://lobby.getdasha.com/simp/member/${encodeURIComponent(handle)}`));
  if (!response.ok) throw new Error('member not found');
  const member = (await response.json())?.member;
  if (!member) throw new Error('member not found');
  return member;
}

async function publicSimpMembers(env) {
  const stub = env?.LOBBY?.get(env.LOBBY.idFromName('public'));
  if (!stub) throw new Error('missing lobby');
  const response = await stub.fetch(new Request('https://lobby.getdasha.com/simp/board'));
  if (!response.ok) throw new Error('board unavailable');
  const measured = (await response.json())?.measured;
  if (!Array.isArray(measured)) throw new Error('board unavailable');
  return measured;
}

async function publicForumThread(env, id) {
  const stub = env?.LOBBY?.get(env.LOBBY.idFromName('public'));
  if (!stub) throw new Error('missing lobby');
  const response = await stub.fetch(new Request(`https://lobby.getdasha.com/forum/thread/${encodeURIComponent(id)}`));
  if (!response.ok) throw new Error('thread not found');
  const data = await response.json();
  if (!data?.thread || !Array.isArray(data.posts) || !data.posts.length) throw new Error('thread not found');
  return data;
}

async function publicForumThreads(env) {
  const stub = env?.LOBBY?.get(env.LOBBY.idFromName('public'));
  if (!stub) throw new Error('missing lobby');
  const response = await stub.fetch(new Request('https://lobby.getdasha.com/forum/threads?limit=50'));
  if (!response.ok) throw new Error('forum unavailable');
  const data = await response.json();
  if (!Array.isArray(data?.threads)) throw new Error('forum unavailable');
  return data.threads;
}

async function productEdge(request, url, env) {
  if ((request.method === 'GET' || request.method === 'HEAD') && RETIRED_COMMERCE_PATHS.has(url.pathname)) {
    return new Response(request.method === 'HEAD' ? null : NOT_FOUND_HTML, {
      status: 404,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
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
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/lobby/feed.xml') {
    const feed = forumRssXml(request.method === 'GET' ? await publicForumThreads(env).catch(() => []) : []);
    return new Response(request.method === 'HEAD' ? null : feed, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'forum-feed',
      },
    });
  }
  const forumCardMatch = url.pathname.match(/^\/lobby\/card\/([A-Za-z0-9_-]{1,40})\.png$/);
  if ((request.method === 'GET' || request.method === 'HEAD') && forumCardMatch) {
    const data = await publicForumThread(env, forumCardMatch[1]).catch(() => null);
    if (!data) return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
    const replies = data.posts.slice(1).filter(post => post && !post.deleted && post.text).length;
    const reactions = data.posts.reduce((total, post) => total + (Number.isInteger(post?.reactionCount) && post.reactionCount > 0 && post.reactionCount <= MAX_REACTORS ? post.reactionCount : 0), 0);
    const png = request.method === 'HEAD' ? null : await forumThreadOgPng({ title: data.thread.title, handle: data.posts[0]?.handle, replies, reactions });
    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'forum-card',
      },
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/sitemap.xml') {
    let sitemap = SITEMAP_XML;
    if (request.method === 'GET') {
      const [threads, members] = await Promise.all([
        publicForumThreads(env).catch(() => []),
        publicSimpMembers(env).catch(() => []),
      ]);
      sitemap = simpSitemapXml(forumSitemapXml(sitemap, threads), members);
    }
    return new Response(request.method === 'HEAD' ? null : sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Dasha-Edge': 'sitemap',
      },
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && /^\/bounties\.json\/?$/.test(url.pathname)) {
    return bountiesFeedResponse(request);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/studio.webmanifest') {
    return new Response(request.method === 'HEAD' ? null : STUDIO_WEBMANIFEST, {
      status: 200,
      headers: {
        ...SECURITY,
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'X-Robots-Tag': 'noindex',
        'X-Dasha-Edge': 'studio-manifest',
      },
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && /^\/client\/dasha-icon-(?:192|512)\.png$/.test(url.pathname)) {
    const asset = await env.ASSETS.fetch(request);
    const headers = new Headers(asset.headers);
    headers.set('Content-Type', 'image/png');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Dasha-Edge', 'studio-icon');
    return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, statusText: asset.statusText, headers });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/login' || url.pathname === '/login/')) {
    return new Response(request.method === 'HEAD' ? null : LOGIN_PAGE_HTML, {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'login',
      }),
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/' || url.pathname === '')) {
    const dest = challengeRedirectPath(url.searchParams);
    if (dest) return Response.redirect(`https://www.getdasha.com${dest}`, 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/quiz' || url.pathname === '/quiz/')) {
    return Response.redirect(`https://www.getdasha.com${quizRedirectPath()}`, 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/simp' || url.pathname === '/simp/')) {
    return new Response(request.method === 'HEAD' ? null : simpPageHtml(), {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'simp',
      }),
    });
  }
  const memberCardMatch = url.pathname.match(/^\/simp\/u\/([A-Za-z0-9_]{1,15})\/card\.png$/);
  if ((request.method === 'GET' || request.method === 'HEAD') && memberCardMatch) {
    try {
      const member = await publicSimpMember(env, memberCardMatch[1].toLowerCase());
      const png = request.method === 'HEAD' ? null : await simpMemberOgPng(member);
      return new Response(png, {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=120',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'X-Dasha-Edge': 'simp-member-card',
        }),
      });
    } catch {
      return new Response(null, { status: 404, headers: { ...SECURITY, 'X-Dasha-Edge': 'simp-member-card-missing' } });
    }
  }
  const memberBadgeMatch = url.pathname.match(/^\/simp\/u\/([A-Za-z0-9_]{1,15})\/badge\.svg$/);
  if ((request.method === 'GET' || request.method === 'HEAD') && memberBadgeMatch) {
    try {
      const member = await publicSimpMember(env, memberBadgeMatch[1].toLowerCase());
      return new Response(request.method === 'HEAD' ? null : simpMemberBadgeSvg(member), {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'X-Robots-Tag': 'noindex',
          'X-Dasha-Edge': 'simp-member-badge',
        }),
      });
    } catch {
      return new Response(null, { status: 404, headers: { ...SECURITY, 'X-Dasha-Edge': 'simp-member-badge-missing' } });
    }
  }
  const memberShareMatch = url.pathname.match(/^\/simp\/u\/([A-Za-z0-9_]{1,15})\/?$/);
  if ((request.method === 'GET' || request.method === 'HEAD') && memberShareMatch) {
    const handle = memberShareMatch[1].toLowerCase();
    try {
      const html = simpMemberHtml(await publicSimpMember(env, handle));
      return new Response(request.method === 'HEAD' ? null : html, {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Dasha-Edge': 'simp-member-share',
        }),
      });
    } catch {
      return new Response(request.method === 'HEAD' ? null : NOT_FOUND_HTML, {
        status: 404,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Robots-Tag': 'noindex, nofollow',
          'X-Dasha-Edge': 'simp-member-missing',
        }),
      });
    }
  }

  const shareMatch = url.pathname.match(/^\/simp\/r\/([^/]+)\/?$/);
  if ((request.method === 'GET' || request.method === 'HEAD') && shareMatch) {
    const id = shareMatch[1];
    try {
      const stub = env?.LOBBY?.get(env.LOBBY.idFromName('public'));
      if (!stub) return new Response(request.method === 'HEAD' ? null : 'Result not found', { status: 404, headers: SECURITY });
      const look = await stub.fetch(new Request(`https://lobby.getdasha.com/simp/result/${encodeURIComponent(id)}`));
      if (!look.ok) return new Response(request.method === 'HEAD' ? null : 'Result not found', { status: 404, headers: SECURITY });
      const data = await look.json();
      const result = data?.result;
      if (!result) return new Response(request.method === 'HEAD' ? null : 'Result not found', { status: 404, headers: SECURITY });
      const html = simpResultHtml({
        id,
        title: result.title,
        correct: result.correct,
        total: result.total,
      });
      return new Response(request.method === 'HEAD' ? null : html, {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'X-Dasha-Edge': 'simp-share',
        }),
      });
    } catch {
      return new Response(request.method === 'HEAD' ? null : 'Result not found', { status: 404, headers: SECURITY });
    }
  }
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (url.pathname === '/how-to-buy' || url.pathname === '/how-to-buy/')
  ) {
    return new Response(request.method === 'HEAD' ? null : injectXConnectPrompt(HOWTO_HTML), {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'howto',
      }),
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/lobby' || url.pathname === '/lobby/')) {
    let html = asStandaloneLobbyPage(LOBBY_PAGE_HTML);
    const threadId = url.searchParams.get('t') || '';
    if (/^[A-Za-z0-9_-]{1,40}$/.test(threadId)) {
      try {
        const data = await publicForumThread(env, threadId);
        html = forumThreadPageHtml(html, data.thread, data.posts);
      } catch {}
    } else if (request.method === 'GET') {
      try { html = forumIndexPageHtml(html, await publicForumThreads(env)); } catch {}
    }
    return new Response(request.method === 'HEAD' ? null : injectXConnectPrompt(html), {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'lobby-page',
      }),
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/privacy' || url.pathname === '/privacy/')) {
    return new Response(request.method === 'HEAD' ? null : PRIVACY_HTML, {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Dasha-Edge': 'privacy',
      }),
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/studio' || url.pathname === '/studio/')) {
    const studioHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dasha Studio — make one, pass it on</title><meta name="description" content="Make Dasha posts, stories, banners, and GIFs."><link rel="canonical" href="https://www.getdasha.com/studio"><meta property="og:type" content="website"><meta property="og:url" content="https://www.getdasha.com/studio"><meta property="og:title" content="Dasha Studio — make one, pass it on"><meta property="og:description" content="Make Dasha posts, stories, banners, and GIFs."><meta property="og:image" content="https://cdn.prod.website-files.com/5f1458122ba25e70a3ff2bd0/6a776335157ed9bc2f06777c_dasha-card-studio-v1.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Dasha Studio — make one, pass it on"><meta name="twitter:description" content="Make Dasha posts, stories, banners, and GIFs."><meta name="twitter:image" content="https://cdn.prod.website-files.com/5f1458122ba25e70a3ff2bd0/6a776335157ed9bc2f06777c_dasha-card-studio-v1.png"><meta name="theme-color" content="#070608"><style>@view-transition { navigation: auto; }.skip-link{position:absolute;left:-9999px;top:0;z-index:100;padding:12px 16px;background:#dfff00;color:#070608;font:900 16px/1 Arial,sans-serif}.skip-link:focus{left:12px;top:12px;outline:3px solid #f4eddb;outline-offset:2px}</style></head><body style="margin:0;background:#070608"><a class="skip-link" href="#dasha-studio">Skip to maker</a><div id="dasha-studio" class="dasha-studio-embed" style="display:block;min-height:100vh;background:#070608"><div class="dasha-studio-shell" data-studio-shell style="box-sizing:border-box;margin:0 auto;padding:28px 16px 40px;max-width:40rem;color:#f4eddb;font:16px/1.45 Arial,Helvetica,sans-serif;background:#070608"><p style="margin:0 0 8px;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#dfff00">Dasha Meme Studio</p><h1 style="margin:0 0 14px;font-size:clamp(28px,6vw,42px);line-height:1;font-weight:900;letter-spacing:-.04em;text-transform:uppercase">Make one. Pass it on.</h1><p style="margin:0 0 16px;color:#e6dcc4">Six looks · square, story, banner · PNG + GIF · no wallet, no account, nothing uploaded. Runs in your browser.</p><p style="margin:0 0 8px;font-size:13px;word-break:break-all"><span style="color:#dfff00;font-weight:900">CA</span> 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump</p><p style="margin:0;font-size:13px"><a href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump" style="color:#dfff00;font-weight:900" target="_blank" rel="noopener noreferrer">Buy $dasha ↗</a> · <a href="/" style="color:#f4eddb;font-weight:800">Home</a></p><p style="margin:18px 0 0;font-size:13px;color:#e6dcc4">Loading studio…</p><p style="margin:12px 0 0;font-size:12px;color:#e6dcc4;max-width:42ch">CC0 for what you make here, except Dasha's name or likeness which stays hers.</p></div></div><script src="https://lobby.getdasha.com/client/studio.js" integrity="${STUDIO_CLIENT_SRI}" crossorigin="anonymous"></script></body></html>`;
    return new Response(request.method === 'HEAD' ? null : studioHtml.replace('</head>', '<link rel="manifest" href="/studio.webmanifest"></head>'), {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'studio',
      }),
    });
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/faucet' || url.pathname === '/faucet/')) {
    return new Response(request.method === 'HEAD' ? null : injectXConnectPrompt(FAUCET_PAGE_HTML), {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'faucet',
      }),
    });
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
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/desk' || url.pathname === '/desk/')) {
    return Response.redirect('https://www.getdasha.com/dasha', 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/how' || url.pathname === '/how/')) {
    return Response.redirect('https://www.getdasha.com/how-to-buy', 308);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/forum' || url.pathname === '/forum/')) {
    return forumToLobbyRedirect(url);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/bounties' || url.pathname === '/bounties/')) {
    return bountiesPageResponse(request);
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/contribute' || url.pathname === '/contribute/')) {
    return new Response(request.method === 'HEAD' ? null : CONTRIBUTE_HTML, {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'X-Dasha-Edge': 'contribute',
      }),
    });
  }
  // Retire SEO-trap paths that must never reappear as product pages.
  if ((request.method === 'GET' || request.method === 'HEAD') && RETIRED_SEO_PATHS.has(url.pathname)) {
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
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Dasha-Edge': 'html-404',
      }),
    });
  }
  const isHome = url.pathname === '/' || url.pathname === '';
  if (request.method !== 'GET' || !ct.includes('text/html')) {
    if (isHome && (request.method === 'GET' || request.method === 'HEAD') && ct.includes('text/html')) {
      const headers = new Headers(upstream.headers);
      attachLlmsDescribedBy(headers);
      return new Response(request.method === 'HEAD' ? null : upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }
    return upstream;
  }
  let html = await upstream.text();
  const originalHtml = html;
  html = sanitizePublicJsonLd(html);
  const stripped = html !== originalHtml;
  html = ensureHtmlLang(html);
  html = hardenBlankTargets(html);
  const pageUrl = isHome
    ? 'https://www.getdasha.com/'
    : `https://www.getdasha.com${url.pathname.replace(/\/$/, '')}`;
  html = ensureCanonical(html, pageUrl);
  html = stripDeadNav(html);
  html = stripLegacyFonts(html);
  html = injectXConnectPrompt(html);
  if (isHome) html = mintHomeTitle(html);
  if (stripped) {
    // Also drop any leftover plain mentions in head comments (defensive).
    html = html.replace(/https?:\/\/x\.com\/potterlab/gi, 'https://www.getdasha.com/');
  }
  const headers = applyHtmlSecurity(new Headers(upstream.headers));
  headers.delete('content-length');
  headers.set('X-Dasha-Edge', stripped ? 'html-strip-personal-brand' : 'html-security');
  if (isHome) attachLlmsDescribedBy(headers);
  return new Response(html, { status: upstream.status, statusText: upstream.statusText, headers });
}

/**
 * Tip faucet Durable Object — live production already binds class name DashaFaucet.
 * Keeps claim ledger separate from lobby chat room storage.
 */
export class DashaFaucet {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    /** @type {{ byX?: Record<string, object>, byWallet?: Record<string, object> }} */
    this.faucetClaims = { byX: {}, byWallet: {} };
    /** @type {Record<string, { dest: string, at: number }>} */
    this.faucetBinds = {};
    /** @type {{ dayKey?: string, dayCount?: number, hourKey?: string, hourCount?: number, autoPausedUntil?: number }} */
    this.faucetMetrics = {};
    /** @type {Record<string, { xId: string, dest: string, amountRaw: string, at: number }>} */
    this.faucetDonates = {};
    /** @type {Record<string, object>} preview-only, five-minute burn intents */
    this.burnIntents = {};
    /** @type {Record<string, object>} private receipts keyed by public transaction signature */
    this.burnReceipts = {};
    this.burnConfirming = new Set();
    this.faucetInventory = null;
    this.state.blockConcurrencyWhile(async () => {
      const faucetClaims = await this.state.storage.get('faucetClaims');
      if (faucetClaims && typeof faucetClaims === 'object' && !Array.isArray(faucetClaims)) {
        this.faucetClaims = {
          byX: faucetClaims.byX && typeof faucetClaims.byX === 'object' ? faucetClaims.byX : {},
          byWallet: faucetClaims.byWallet && typeof faucetClaims.byWallet === 'object' ? faucetClaims.byWallet : {},
        };
      }
      const faucetBinds = await this.state.storage.get('faucetBinds');
      if (faucetBinds && typeof faucetBinds === 'object' && !Array.isArray(faucetBinds)) this.faucetBinds = faucetBinds;
      const faucetMetrics = await this.state.storage.get('faucetMetrics');
      if (faucetMetrics && typeof faucetMetrics === 'object' && !Array.isArray(faucetMetrics)) this.faucetMetrics = faucetMetrics;
      const faucetDonates = await this.state.storage.get('faucetDonates');
      if (faucetDonates && typeof faucetDonates === 'object' && !Array.isArray(faucetDonates)) this.faucetDonates = faucetDonates;
      const burnIntents = await this.state.storage.get('burnIntents');
      if (burnIntents && typeof burnIntents === 'object' && !Array.isArray(burnIntents)) this.burnIntents = burnIntents;
      const burnReceipts = await this.state.storage.get('burnReceipts');
      if (burnReceipts && typeof burnReceipts === 'object' && !Array.isArray(burnReceipts)) this.burnReceipts = burnReceipts;
      const faucetInventory = await this.state.storage.get('faucetInventory');
      if (faucetInventory && typeof faucetInventory === 'object') this.faucetInventory = faucetInventory;
    });
  }

  async persistFaucet() {
    await this.state.storage.put({
      faucetClaims: this.faucetClaims,
      faucetBinds: this.faucetBinds,
      faucetMetrics: this.faucetMetrics,
      faucetDonates: this.faucetDonates,
      burnIntents: this.burnIntents,
      burnReceipts: this.burnReceipts,
    });
  }

  async persistBurnState(intents, receipts) {
    await this.state.storage.put({ burnIntents: intents, burnReceipts: receipts });
    this.burnIntents = intents;
    this.burnReceipts = receipts;
  }

  /** Ask the lobby DO to enroll + award donate points. Fail closed to awarded:false. */
  async creditDonateToBoard(session, sig, row = {}) {
    const empty = { awarded: false, points: 0, donate: 0, error: 'award failed' };
    if (!this.env.LOBBY || !session?.xId) return empty;
    try {
      const stub = this.env.LOBBY.get(this.env.LOBBY.idFromName('public'));
      const creditRes = await stub.fetch(new Request('https://lobby.getdasha.com/simp/internal/donate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-dasha-internal': String(this.env.LOBBY_SESSION_SECRET || ''),
        },
        body: JSON.stringify({
          xId: String(session.xId),
          handle: session.handle,
          avatar: session.avatar,
          verifiedType: session.verifiedType,
          signature: sig,
          amountRaw: String(row.amountRaw || ''),
          at: row.at,
          proven: true,
        }),
      }));
      const credit = await creditRes.json().catch(() => ({}));
      if (credit.ok && credit.awarded) {
        return {
          awarded: true,
          points: Number(credit.points) || 0,
          donate: Number(credit.donate) || 0,
        };
      }
      return { ...empty, error: String(credit.error || 'award failed') };
    } catch {
      return empty;
    }
  }

  async faucetStatusPayload() {
    const cfg = faucetConfig(this.env);
    const limits = rateLimitStatusFields(this.faucetMetrics, cfg);
    // Without a tip signer, claims cannot pay — skip RPC and report empty (faster + honest).
    if (!cfg.configured) return { ...buildStatus(cfg, {}), ...limits, signer: false };
    if (!cfg.hasSigner) {
      const empty = buildStatus(cfg, { balanceRaw: 0n, rpcOk: true });
      return { ...empty, ...limits, signer: false };
    }
    // Operator or auto pause still shows as unfunded for claim CTAs.
    if (cfg.paused || limits.autoPaused) {
      const paused = buildStatus({ ...cfg, paused: true }, { balanceRaw: 0n, rpcOk: true });
      return { ...paused, ...limits, signer: true };
    }
    let tipWallet = cfg.treasury;
    try {
      tipWallet = await publicKeyFromSecret(faucetSignerSecret(this.env));
    } catch (e) {
      const bad = buildStatus({ ...cfg, hasSigner: false }, { balanceRaw: 0n, rpcOk: true });
      return { ...bad, ...limits, signer: false, signerError: String(e?.message || e).slice(0, 80) };
    }
    // Pitch-in + inventory use the signer wallet (only address that can pay tips).
    const cfgTip = { ...cfg, treasury: tipWallet };
    let inventory = { balanceRaw: 0n, rpcOk: true };
    try {
      inventory.balanceRaw = await tokenBalanceRaw(this.env, tipWallet, cfg.mint);
      this.faucetInventory = { balanceRaw: String(inventory.balanceRaw), at: Date.now() };
      this.state.storage.put('faucetInventory', this.faucetInventory).catch(() => {});
    } catch (e) {
      const cached = this.faucetInventory;
      const fresh = cached && Date.now() - Number(cached.at || 0) < 15 * 60_000;
      if (fresh && cached.balanceRaw != null) {
        inventory = { balanceRaw: BigInt(cached.balanceRaw), rpcOk: true };
      } else {
        inventory = {
          balanceRaw: 0n,
          rpcOk: false,
          rpcDetail: String(e?.message || e),
          rpcTried: solanaRpcEndpoints(this.env).map((u) => {
            try { return new URL(u).host; } catch { return 'bad'; }
          }),
        };
      }
    }
    const status = buildStatus(cfgTip, inventory);
    return {
      ...status,
      ...limits,
      signer: true,
      ...(inventory.rpcTried ? { rpcTried: inventory.rpcTried } : {}),
    };
  }

  async handleFaucet(request, allowedOrigin) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cred = { credentials: true };
    if (request.method !== 'GET' && request.method !== 'HEAD' && !allowedOrigin) {
      return json({ error: 'origin required' }, 403, null);
    }
    const body = async () => {
      try {
        return await request.json();
      } catch {
        return {};
      }
    };

    if (path === '/faucet/status' && (request.method === 'GET' || request.method === 'HEAD')) {
      const status = await this.faucetStatusPayload();
      return json(status, 200, allowedOrigin || '*', cred);
    }

    if (path === '/faucet/me' && (request.method === 'GET' || request.method === 'HEAD')) {
      const session = await sessionFromRequest(this.env, request);
      const xId = session?.xId ? String(session.xId) : '';
      const bind = xId ? this.faucetBinds[xId] : null;
      const me = meFromSession(session, this.faucetClaims, bind);
      me.configured = faucetConfig(this.env).configured;
      return json(me, 200, allowedOrigin || '*', cred);
    }

    if (path === '/faucet/dest-check' && request.method === 'POST') {
      const input = await body();
      const err = destShapeError(input.dest, input.last4);
      if (err) return json({ ok: false, error: err }, 200, allowedOrigin, cred);
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId) return json({ ok: false, error: 'link X first' }, 200, allowedOrigin, cred);
      // Shape probe only. Never persist a bind. Never label IS_WALLET.
      return json({ ok: true, dest: String(input.dest).trim() }, 200, allowedOrigin, cred);
    }

    if (path === '/faucet/wallet/challenge' && request.method === 'POST') {
      if (!this.env.LOBBY_SESSION_SECRET) return json({ error: 'not_configured' }, 501, allowedOrigin, cred);
      const input = await body();
      const publicKey = String(input.publicKey || '').trim();
      const shape = destShapeError(publicKey);
      if (shape) return json({ ok: false, error: shape }, 400, allowedOrigin, cred);
      const now = Date.now();
      const nonce = randomUrlToken(12);
      const issuedAt = now;
      const expirationTime = now + 10 * 60_000;
      const domain = FAUCET_SIWS_DOMAIN;
      const siws = faucetSiwsInput({ domain, publicKey, nonce, issuedAt, expirationTime });
      const message = `${siws.domain} wants you to sign in with your Solana account:\n${siws.address}\n\n${siws.statement}\n\nURI: ${siws.uri}\nVersion: ${siws.version}\nChain ID: ${siws.chainId}\nNonce: ${siws.nonce}\nIssued At: ${siws.issuedAt}\nExpiration Time: ${siws.expirationTime}`;
      const challenge = await signPayload(this.env.LOBBY_SESSION_SECRET, {
        kind: 'faucet_siws',
        publicKey,
        nonce,
        domain,
        exp: expirationTime,
      });
      return json({ ok: true, challenge, message, siws }, 200, allowedOrigin, cred);
    }

    if (path === '/faucet/wallet/verify' && request.method === 'POST') {
      if (!this.env.LOBBY_SESSION_SECRET) return json({ error: 'not_configured' }, 501, allowedOrigin, cred);
      const input = await body();
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId) return json({ ok: false, error: 'link X first' }, 401, allowedOrigin, cred);
      const xId = String(session.xId);

      if (input.paste) {
        const dest = String(input.dest || '').trim();
        const err = destShapeError(dest, input.last4);
        if (err) return json({ ok: false, error: err }, 400, allowedOrigin, cred);
        /* PASTED, not IS_WALLET: nothing here proves the typer controls this address. It used to
           write IS_WALLET, the same label the signature-verified path writes, so afterwards the
           ledger could not tell them apart — and an unproven bind could take a stranger's
           per-wallet slot, since Solana addresses are public. See DASHA-FAUCET-REVIEW-2026-08-16.md. */
        this.faucetBinds[xId] = { dest, at: Date.now(), kind: 'PASTED' };
        await this.persistFaucet();
        return json({ ok: true, dest, kind: 'PASTED' }, 200, allowedOrigin, cred);
      }

      const publicKey = String(input.publicKey || '').trim();
      const shape = destShapeError(publicKey);
      if (shape) return json({ ok: false, error: shape }, 400, allowedOrigin, cred);
      const challenge = await verifyPayload(this.env.LOBBY_SESSION_SECRET, input.challenge);
      if (!challenge || challenge.kind !== 'faucet_siws' || challenge.publicKey !== publicKey) {
        return json({ ok: false, error: 'invalid faucet challenge' }, 400, allowedOrigin, cred);
      }
      if (Number(challenge.exp) < Date.now()) return json({ ok: false, error: 'invalid faucet challenge' }, 400, allowedOrigin, cred);
      if (challenge.domain && challenge.domain !== FAUCET_SIWS_DOMAIN) {
        return json({ ok: false, error: 'siws_domain' }, 400, allowedOrigin, cred);
      }
      const message = String(input.signedMessage || '');
      const msgErr = siwsMessageError(message, {
        publicKey,
        domain: challenge.domain || FAUCET_SIWS_DOMAIN,
        nonce: challenge.nonce,
      });
      if (msgErr) return json({ ok: false, error: msgErr }, 400, allowedOrigin, cred);
      const ok = await verifyEd25519(message, publicKey, String(input.signature || ''));
      if (!ok) return json({ ok: false, error: 'invalid faucet challenge' }, 400, allowedOrigin, cred);
      this.faucetBinds[xId] = { dest: publicKey, at: Date.now(), kind: 'IS_WALLET' };
      await this.persistFaucet();
      return json({ ok: true, dest: publicKey, kind: 'IS_WALLET' }, 200, allowedOrigin, cred);
    }

    if (path === '/faucet/claim' && request.method === 'POST') {
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      const xId = String(session.xId);
      const bind = this.faucetBinds[xId];
      if (!bind?.dest) return json({ error: 'dest_not_wallet' }, 400, allowedOrigin, cred);
      const cfg = faucetConfig(this.env);
      const xGate = checkXEligibility(session, {
        minXAgeDays: cfg.minXAgeDays,
        minXFollowers: cfg.minXFollowers,
      });
      if (!xGate.ok) return json({ error: xGate.error }, 403, allowedOrigin, cred);
      const rate = checkRateLimits(this.faucetMetrics, cfg);
      if (!rate.ok) {
        if (rate.autoPausedUntil) {
          this.faucetMetrics = { ...this.faucetMetrics, autoPausedUntil: rate.autoPausedUntil };
          await this.persistFaucet();
        }
        return json({ error: rate.error }, 503, allowedOrigin, cred);
      }
      const status = await this.faucetStatusPayload();
      if (!status.configured) return json({ error: 'not_configured' }, 501, allowedOrigin, cred);
      if (status.error === 'faucet_paused') return json({ error: 'faucet_paused' }, 503, allowedOrigin, cred);
      if (!status.funded) return json({ error: status.error || 'treasury_empty' }, 503, allowedOrigin, cred);
      /* Only a signature-verified destination may hold the per-wallet slot. A pasted one still
         deduplicates by X id, so a claimer cannot double-dip; it just cannot lock out the owner
         of an address they merely typed. */
      const proven = bind.kind === 'IS_WALLET';
      if (!proven) return json({ error: 'prove wallet' }, 403, allowedOrigin, cred);
      const allowed = claimAllowed(this.faucetClaims, { xId, wallet: bind.dest, proven });
      if (!allowed.ok) {
        if (allowed.error === 'already claimed') {
          const replay = alreadyClaimedResponse(allowed.prev);
          if (replay) return json(replay, 200, allowedOrigin, cred);
        }
        if (allowed.error === 'confirming') {
          const out = { error: 'confirming' };
          if (allowed.prev?.signature) {
            out.signature = allowed.prev.signature;
            out.solscan = `https://solscan.io/tx/${allowed.prev.signature}`;
          }
          return json(out, 200, allowedOrigin, cred);
        }
        return json({ error: allowed.error }, 409, allowedOrigin, cred);
      }
      this.faucetClaims = reserveClaim(this.faucetClaims, { xId, wallet: bind.dest, proven });
      await this.persistFaucet();
      const sent = await sendTipTransfer(this.env, {
        destOwner: bind.dest,
        amountRaw: BigInt(status.amountRaw || 100_000_000),
        mint: status.mint || FAUCET_MINT,
      });
      if (!sent.ok) {
        this.faucetClaims = clearPendingClaim(this.faucetClaims, { xId, wallet: bind.dest, proven });
        await this.persistFaucet();
        const code =
          sent.error === 'treasury_empty' || sent.error === 'treasury_rent' || sent.error === 'rpc_unavailable'
            ? 503
            : 400;
        return json({ error: sent.error || 'claim failed.', detail: sent.detail || undefined }, code, allowedOrigin, cred);
      }
      this.faucetClaims = recordClaim(this.faucetClaims, {
        xId,
        wallet: bind.dest,
        signature: sent.signature,
        proven,
      });
      this.faucetMetrics = noteSuccessfulClaim(this.faucetMetrics, cfg);
      await this.persistFaucet();
      return json(
        {
          ok: true,
          signature: sent.signature,
          solscan: sent.solscan,
          dest: bind.dest,
          createdAta: Boolean(sent.createdAta),
        },
        200,
        allowedOrigin,
        cred,
      );
    }

    if (path === '/faucet/burn/preview' && request.method === 'POST') {
      if (!BURN_RECEIPTS_ENABLED) return json({ error: 'burn receipts unavailable' }, 503, allowedOrigin, cred);
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      const xId = String(session.xId);
      const bind = this.faucetBinds[xId];
      if (!bind?.dest || bind.kind !== 'IS_WALLET') return json({ error: 'prove wallet' }, 403, allowedOrigin, cred);
      const input = await body();
      const created = createBurnIntent({
        id: randomUrlToken(18),
        xId,
        owner: bind.dest,
        source: input.source,
        amountRaw: input.amountRaw,
      });
      if (!created.ok) return json({ error: created.error }, 400, allowedOrigin, cred);
      const queued = upsertBurnIntent(this.burnIntents, created.intent);
      if (!queued.ok) return json({ error: queued.error || 'burn preview full' }, 503, allowedOrigin, cred);
      this.burnIntents = queued.intents;
      await this.persistFaucet();
      return json({
        ok: true,
        preview: {
          id: created.intent.id,
          owner: created.intent.owner,
          source: created.intent.source,
          mint: created.intent.mint,
          amountRaw: created.intent.amountRaw,
          decimals: created.intent.decimals,
          memo: created.intent.memo,
          expiresAt: created.intent.expiresAt,
          irreversible: true,
          transactionBuilt: false,
          points: 0,
        },
      }, 200, allowedOrigin, cred);
    }

    if (path === '/faucet/burn/status' && (request.method === 'GET' || request.method === 'HEAD')) {
      return json({ ok: true, enabled: BURN_RECEIPTS_ENABLED, mint: FAUCET_MINT, ...burnAggregate(this.burnReceipts), decimals: 6, points: 0, scoreNeutral: true }, 200, allowedOrigin || '*');
    }

    if (path === '/faucet/burn/confirm' && request.method === 'POST') {
      if (!BURN_RECEIPTS_ENABLED) return json({ error: 'burn receipts unavailable' }, 503, allowedOrigin, cred);
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
      const xId = String(session.xId);
      const bind = this.faucetBinds[xId];
      if (!bind?.dest || bind.kind !== 'IS_WALLET') return json({ error: 'prove wallet' }, 403, allowedOrigin, cred);
      const input = await body();
      const signature = String(input.signature || '').trim();
      const intentId = String(input.intentId || '').trim();
      if (donateSigError(signature) || !/^[A-Za-z0-9_-]{16,64}$/.test(intentId)) return json({ error: 'burn miss' }, 400, allowedOrigin, cred);
      const prior = this.burnReceipts[signature];
      if (prior) {
        if (prior.xId !== xId) return json({ error: 'burn already recorded' }, 409, allowedOrigin, cred);
        return json({ ok: true, replay: true, receipt: {
          signature, mint: FAUCET_MINT, amountRaw: prior.amountRaw, decimals: 6, at: prior.at,
          solscan: `https://solscan.io/tx/${signature}`, points: 0,
        } }, 200, allowedOrigin, cred);
      }
      if (burnReceiptsFull(this.burnReceipts)) return json({ error: 'burn receipt pilot full' }, 503, allowedOrigin, cred);
      const intent = this.burnIntents[intentId];
      const shaped = consumeBurnIntent(intent, { xId, owner: bind.dest }, { now: Number(intent?.issuedAt) });
      if (!shaped.ok) return json({ error: shaped.error || 'invalid burn intent' }, 400, allowedOrigin, cred);
      const intentLock = `intent:${intentId}`;
      const signatureLock = `signature:${signature}`;
      if (this.burnConfirming.has(intentLock) || this.burnConfirming.has(signatureLock)) {
        return json({ error: 'burn confirming' }, 409, allowedOrigin, cred);
      }
      this.burnConfirming.add(intentLock);
      this.burnConfirming.add(signatureLock);
      try {
        let tx;
        try {
          tx = await rpc(this.env, 'getTransaction', [
            signature,
            { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'finalized' },
          ]);
        } catch {
          return json({ error: 'burn miss' }, 400, allowedOrigin, cred);
        }
        const inspected = inspectBurnTx(tx, { owner: bind.dest, signature, intentId });
        if (!inspected.ok) return json({ error: inspected.error || 'burn miss' }, 400, allowedOrigin, cred);
        const consumed = consumeBurnIntent(intent, {
          xId,
          owner: bind.dest,
          source: inspected.source,
          mint: FAUCET_MINT,
          amountRaw: String(inspected.amountRaw),
        }, { now: inspected.at });
        if (!consumed.ok) return json({ error: consumed.error }, 400, allowedOrigin, cred);
        const nextIntents = { ...this.burnIntents };
        delete nextIntents[intentId];
        const nextReceipts = { ...this.burnReceipts, [signature]: {
          xId, intentId, amountRaw: String(inspected.amountRaw), at: inspected.at, recordedAt: Date.now(),
        } };
        await this.persistBurnState(nextIntents, nextReceipts);
        return json({ ok: true, replay: false, receipt: {
          signature, mint: FAUCET_MINT, amountRaw: String(inspected.amountRaw), decimals: 6, at: inspected.at,
          solscan: `https://solscan.io/tx/${signature}`, points: 0,
        } }, 200, allowedOrigin, cred);
      } finally {
        this.burnConfirming.delete(intentLock);
        this.burnConfirming.delete(signatureLock);
      }
    }

    if (path.startsWith('/faucet/tx/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const sig = decodeURIComponent(path.slice('/faucet/tx/'.length)).trim();
      const row = this.faucetDonates[sig];
      if (!row) return json({ error: 'not found' }, 404, allowedOrigin, cred);
      return json({ ok: true, signature: sig, at: row.at, dest: row.dest }, 200, allowedOrigin, cred);
    }

    if (path === '/faucet/donate' && request.method === 'POST') {
      const input = await body();
      const sig = String(input.signature || input.sig || '').trim();
      if (donateSigError(sig)) return json(donateFailClosed(input), 200, allowedOrigin, cred);
      const session = await sessionFromRequest(this.env, request);
      if (!session?.xId) return json({ error: 'link X first' }, 200, allowedOrigin, cred);
      const bind = this.faucetBinds[String(session.xId)];
      if (!bind?.dest || bind.kind !== 'IS_WALLET') return json({ error: 'dest not proven' }, 200, allowedOrigin, cred);
      if (this.faucetDonates[sig]) {
        const retry = await this.creditDonateToBoard(session, sig, this.faucetDonates[sig]);
        return json({
          ok: true,
          awarded: retry.awarded,
          replay: true,
          signature: sig,
          points: retry.points,
          donate: retry.donate,
          ...(retry.error ? { error: retry.error } : {}),
        }, 200, allowedOrigin, cred);
      }
      let tx;
      try {
        tx = await rpc(this.env, 'getTransaction', [
          sig,
          { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'finalized' },
        ]);
      } catch {
        return json({ error: 'sig miss' }, 200, allowedOrigin, cred);
      }
      let signer = '';
      try {
        signer = await publicKeyFromSecret(faucetSignerSecret(this.env));
      } catch {
        signer = '';
      }
      const inspected = inspectDonateTx(tx, {
        treasury: String(this.env.FAUCET_TREASURY || '').trim() || undefined,
        mint: String(this.env.MINT || FAUCET_MINT).trim(),
        faucetSigner: signer,
      });
      if (!inspected.ok) return json({ error: inspected.error || 'sig miss' }, 200, allowedOrigin, cred);
      if (inspected.payer !== bind.dest) return json({ error: 'dest not proven' }, 200, allowedOrigin, cred);
      this.faucetDonates[sig] = {
        xId: String(session.xId),
        dest: bind.dest,
        amountRaw: String(inspected.amountRaw),
        at: inspected.at,
      };
      await this.persistFaucet();
      const credit = await this.creditDonateToBoard(session, sig, {
        amountRaw: inspected.amountRaw,
        at: inspected.at,
      });
      return json({
        ok: true,
        awarded: credit.awarded,
        signature: sig,
        points: credit.points,
        donate: credit.donate,
        ...(credit.error && !credit.awarded ? { error: credit.error } : {}),
      }, 200, allowedOrigin, cred);
    }

    return json({ error: 'not found' }, 404, allowedOrigin, cred);
  }

  async fetch(request) {
    const origin = request.headers.get('Origin');
    const allowedOrigin =
      origin && originAllowed(origin, this.env.ALLOWED_ORIGINS || '')
        ? origin
        : this.env.ALLOW_ANY_ORIGIN
          ? origin || '*'
          : null;
    return this.handleFaucet(request, allowedOrigin);
  }
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
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/llms.txt') {
      return new Response(request.method === 'HEAD' ? null : LLMS_TXT, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Strict-Transport-Security': 'max-age=31536000',
          'X-Content-Type-Options': 'nosniff',
          'X-Dasha-Edge': 'llms',
        },
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/llms-full.txt') {
      return new Response(request.method === 'HEAD' ? null : LLMS_FULL_TXT, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Strict-Transport-Security': 'max-age=31536000',
          'X-Content-Type-Options': 'nosniff',
          'X-Dasha-Edge': 'llms-full',
        },
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/which') {
      return new Response(request.method === 'HEAD' ? null : WHICH_HTML, {
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'X-Dasha-Edge': 'which',
          Link: LLMS_DESCRIBEDBY,
        }),
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

    if (url.pathname === '/auth/status' && request.method === 'GET') {
      const session = await authSessionFromRequest(env, request);
      const wallet = session?.provider === 'wallet' ? session.wallet : '';
      return json({
        loggedIn: Boolean(session),
        provider: session?.provider || null,
        x: session?.provider === 'x' ? publicLink(session) : null,
        wallet: wallet ? { address: wallet, display: `${wallet.slice(0, 4)}…${wallet.slice(-4)}` } : null,
      }, 200, allowedOrigin, { credentials: true });
    }

    if (url.pathname === '/auth/logout') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, { credentials: true });
      if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
      return json({ ok: true, loggedIn: false }, 200, allowedOrigin, {
        credentials: true,
        headers: { 'Set-Cookie': cookieHeader('', { clear: true }) },
      });
    }

    if (url.pathname.startsWith('/oauth/github')) {
      return handleGithubOAuth(request, env, allowedOrigin);
    }

    if (url.pathname.startsWith('/oauth/x')) {
      const oauthRes = await handleOAuth(request, env, allowedOrigin);
      if (oauthRes) return oauthRes;
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/privacy') {
      return new Response(request.method === 'HEAD' ? null : PRIVACY_HTML, {
        status: 200,
        headers: htmlHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }),
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/login' || url.pathname === '/login/')) {
      return new Response(request.method === 'HEAD' ? null : LOGIN_PAGE_HTML, {
        status: 200,
        headers: htmlHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120', 'X-Dasha-Edge': 'login' }),
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/.well-known/security.txt') {
      return securityTxtResponse(request, url.hostname);
    }

    if (url.pathname.startsWith('/simp/photo/') || url.pathname.startsWith('/simp/card/') || url.pathname.startsWith('/og/') || url.pathname === '/client/faucet.png' || url.pathname === '/client/faucet.avif' || url.pathname === '/client/faucet.webp') {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      if (asset.ok) headers.set('Cache-Control', 'public, max-age=86400');
      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
    }

    if (url.pathname.startsWith('/faucet/')) {
      if (request.method !== 'GET' && request.method !== 'HEAD' && !allowedOrigin && !env.ALLOW_ANY_ORIGIN) {
        return json({ error: 'origin required' }, 403, null);
      }
      const id = env.FAUCET.idFromName('main');
      return env.FAUCET.get(id).fetch(request);
    }

    // Bare /simp is the board page. /simp/* APIs still go to the lobby DO below.
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/simp' || url.pathname === '/simp/')) {
      return new Response(request.method === 'HEAD' ? null : simpPageHtml(), {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Dasha-Edge': 'simp',
        }),
      });
    }

    if (
      url.pathname.startsWith('/simp/') ||
      url.pathname.startsWith('/auth/wallet/') ||
      url.pathname.startsWith('/studio/') ||
      url.pathname.startsWith('/h/') ||
      (url.pathname.startsWith('/forum/') && url.pathname !== '/forum/') ||
      (url.pathname.startsWith('/chess/') && url.pathname !== '/chess/')
    ) {
      if (request.method !== 'GET' && request.method !== 'HEAD' && origin && !allowedOrigin && !env.ALLOW_ANY_ORIGIN) {
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
      url.pathname === '/client/faucet.js'
    ) {
      return jsAsset(FAUCET_CLIENT_JS, allowedOrigin || '*', { headOnly: request.method === 'HEAD' });
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname === '/client/x-connect.js'
    ) {
      return jsAsset(X_CONNECT_JS, allowedOrigin || '*', { headOnly: request.method === 'HEAD' });
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
    if ((request.method === 'GET' || request.method === 'HEAD') && /^\/bounties\.json\/?$/.test(url.pathname)) {
      return bountiesFeedResponse(request);
    }
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/how-to-buy' || url.pathname === '/how-to-buy/')
    ) {
      return new Response(request.method === 'HEAD' ? null : HOWTO_HTML, {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
        }),
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/chess' || url.pathname === '/chess/')) {
      const html = await chessPageForRequest(request, env);
      return new Response(request.method === 'HEAD' ? null : html, {
        status: 200,
        headers: htmlHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120' }),
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && RETIRED_SEO_PATHS.has(url.pathname)) {
      return Response.redirect('https://www.getdasha.com/', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/studio' || url.pathname === '/studio/')) {
      return Response.redirect('https://www.getdasha.com/studio', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/desk' || url.pathname === '/desk/')) {
      return Response.redirect('https://www.getdasha.com/dasha', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/how' || url.pathname === '/how/')) {
      return Response.redirect('https://www.getdasha.com/how-to-buy', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/quiz' || url.pathname === '/quiz/')) {
      return Response.redirect('https://www.getdasha.com/simp', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/faucet' || url.pathname === '/faucet/')) {
      return new Response(request.method === 'HEAD' ? null : FAUCET_PAGE_HTML, {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Dasha-Edge': 'faucet',
        }),
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/lobby' || url.pathname === '/lobby/')) {
      return new Response(request.method === 'HEAD' ? null : injectXConnectPrompt(asStandaloneLobbyPage(LOBBY_PAGE_HTML)), {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Dasha-Edge': 'lobby-page',
        }),
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/simp' || url.pathname === '/simp/')) {
      return new Response(request.method === 'HEAD' ? null : simpPageHtml(), {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
          'X-Dasha-Edge': 'simp',
        }),
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/bounties' || url.pathname === '/bounties/')) {
      return bountiesPageResponse(request);
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

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/price') {
      const room = env.LOBBY.idFromName('public');
      return env.LOBBY.get(room).fetch(request);
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/forum' || url.pathname === '/forum/')) {
      return forumToLobbyRedirect(url);
    }

    if (url.pathname === '/ws' || url.pathname === '/lobby/ws') {
      const room = env.LOBBY.idFromName('public');
      const stub = env.LOBBY.get(room);
      return stub.fetch(request);
    }

    return json({ error: 'not found' }, 404, allowedOrigin);
  },
};
