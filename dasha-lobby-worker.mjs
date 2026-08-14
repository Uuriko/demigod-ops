/**
 * Dasha public lobby — Cloudflare Worker + single Durable Object room.
 * Optional X account link (OAuth 2 PKCE). Linking is never required.
 */
import {
  MINT,
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
} from './dasha-simp-score.mjs';
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
  SIMP_BOARD_JS,
  STUDIO_CLIENT_JS,
  ROBOTS_TXT,
  SITEMAP_XML,
  HOWTO_HTML,
  CHESS_PAGE_HTML,
  LOBBY_PAGE_HTML,
  ASSET_HASH,
} from './dasha-lobby-static-gen.mjs';
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

function htmlPage(title, body) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:16px/1.45 system-ui;background:#070608;color:#f4eddb;max-width:28rem;margin:3rem auto;padding:0 1rem}a{color:#dfff00}code{color:#c8b6ff}</style>
<body>${body}</body></html>`;
}

const PRIVACY_HTML = htmlPage('Dasha privacy', `<h1>Privacy</h1>
<p>Updated August 10, 2026.</p>
<h2>What Dasha uses</h2>
<p>Linking X reads your X account ID, handle, display name, avatar, and verification type. The browser session lasts up to 30 days. Dasha does not store the X access token.</p>
<p>If you join the Simp Board or finish its scored quiz, Dasha stores your linked identity, score, badges, contribution links, and dated holder-badge status. The wallet address and balance used for that optional badge are checked once and are not retained. Lobby history is limited to roughly 30 minutes and 40 messages. Completed chess games are public replays showing both X handles, ratings, moves, result, and completion time. Studio, quiz, and chess funnel counts are aggregate only.</p>
<h2>How it is used</h2>
<p>The data provides linked chat identity, Board ranking, quiz results, contribution review, moderation, and optional holder recognition. Public Board rows and season snapshots can show your handle, avatar, score, badges, and accepted evidence links. Dasha does not post to X or sell identity data.</p>
<p>Webflow serves the site and Cloudflare hosts the service. X processes OAuth and serves some public images; other public images may load from Wikimedia. Those image hosts receive ordinary request metadata without a page referrer. A Solana RPC receives a wallet address only during an optional holder check.</p>
<h2>Control and deletion</h2>
<p>Unlink clears the signed browser session. Leave Board removes your profile, claims, active quiz state, current linked result, holder challenge, chess rating, games and tournaments involving you, and your rows from retained season snapshots. Anonymous aggregate counts remain.</p>
<p>For access or deletion requests, use the repository's <a href="https://github.com/Uuriko/dasha-desk/security/advisories/new">private report</a>. Do not include wallet keys or seed phrases.</p>
<p><a href="https://www.getdasha.com/">Back to Dasha</a></p>`);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function personalizeChessPage(html, { title, description, url, robots = 'index,follow' }) {
  const safeTitle = escapeHtml(String(title || 'Dasha Chess').slice(0, 100));
  const safeDescription = escapeHtml(String(description || 'Dasha versus Anna. Holder-only rated chess.').slice(0, 180));
  const safeUrl = escapeHtml(String(url || 'https://lobby.getdasha.com/chess'));
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
  if (!apiPath) return CHESS_PAGE_HTML;
  try {
    const room = env.LOBBY.idFromName('public');
    const response = await env.LOBBY.get(room).fetch(new Request(`https://lobby.getdasha.com${apiPath}`));
    if (!response.ok) return CHESS_PAGE_HTML;
    const data = await response.json();
    if (data.replay) {
      const replay = data.replay;
      return personalizeChessPage(CHESS_PAGE_HTML, {
        title: `@${replay.white.handle} ${replay.result} @${replay.black.handle} — Dasha Chess`,
        description: `${replay.moves.length} moves · ${replay.reason} · Replay every move.`,
        url: `https://lobby.getdasha.com/chess?game=${encodeURIComponent(replay.id)}`,
      });
    }
    if (data.tournament) {
      const tournament = data.tournament;
      const state = tournament.status === 'registration' ? 'Open tournament' : tournament.status === 'active' ? 'Tournament in progress' : `${tournament.champion || 'Champion'} wins`;
      return personalizeChessPage(CHESS_PAGE_HTML, {
        title: `${tournament.name} — Dasha Chess`,
        description: `${state} · ${tournament.entrants.length}/${tournament.maxPlayers} players.`,
        url: `https://lobby.getdasha.com/chess?tournament=${encodeURIComponent(tournament.id)}`,
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
        url: `https://lobby.getdasha.com/chess?challenge=${encodeURIComponent(challenge.id)}`,
        robots: 'noindex,follow',
      });
    }
  } catch {
    /* generic card remains available */
  }
  return CHESS_PAGE_HTML;
}

const oauthStateCookie = (token = '') => `${OAUTH_COOKIE}=${token}; Path=/; Max-Age=${token ? 900 : 0}; HttpOnly; Secure; SameSite=Lax`;

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
    await this.state.storage.put({ simpProfiles: this.simpProfiles, simpQuizAttempts: this.simpQuizAttempts, simpQuizMetrics: this.simpQuizMetrics, simpQuizResults: this.simpQuizResults, simpClaims: this.simpClaims, simpSeasons: this.simpSeasons });
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
      return result ? json({ ok: true, result: { correct: result.correct, total: result.total, title: result.title, lane: result.lane } }, 200, allowedOrigin) : json({ error: 'result not found' }, 404, allowedOrigin);
    }

    if (path.startsWith('/simp/r/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const id = path.slice('/simp/r/'.length);
      const result = this.simpQuizResults[id];
      const headOnly = request.method === 'HEAD';
      if (!result) return new Response(headOnly ? null : 'Result not found', { status: 404, headers: SECURITY });
      const identity = `${result.title} · ${result.lane}`;
      const description = `${result.correct}/${result.total} on the Dasha simp quiz. Beat this score.`;
      const resultUrl = `https://lobby.getdasha.com/simp/r/${id}`;
      const imageUrl = 'https://lobby.getdasha.com/simp/card/quiz.png';
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${identity}</title><link rel="canonical" href="${resultUrl}"><meta property="og:type" content="website"><meta property="og:site_name" content="getdasha"><meta property="og:url" content="${resultUrl}"><meta property="og:title" content="${identity}"><meta property="og:description" content="${description}"><meta property="og:image" content="${imageUrl}"><meta property="og:image:secure_url" content="${imageUrl}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="628"><meta property="og:image:alt" content="Dasha simp quiz"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${identity}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${imageUrl}"><meta name="twitter:image:alt" content="Dasha simp quiz"><style>body{margin:0;background:#070608;color:#f4eddb;font:20px/1.4 system-ui;display:grid;place-items:center;min-height:100vh}.r{max-width:36rem;padding:32px}h1{font-size:clamp(42px,9vw,76px);line-height:.95}b{color:#dfff00}a{display:inline-block;background:#dfff00;color:#070608;padding:14px 20px;font-weight:900;text-decoration:none}</style></head><body><main class="r"><b>DASHA SIMP QUIZ</b><h1>${result.correct}/${result.total}<br>${identity}</h1><p>${description}</p><a href="https://www.getdasha.com/?challenge=${id}#simp">Beat this score</a></main></body></html>`;
      return new Response(headOnly ? null : html, { headers: htmlHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }) });
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

function isProductHost(host) {
  const h = String(host || '').toLowerCase();
  return h === 'www.getdasha.com' || h === 'getdasha.com';
}

const RETIRED_COMMERCE_PATHS = new Set(['/checkout', '/paypal-checkout', '/order-confirmation']);

/** Product hosts (www/apex) serve SEO/howto plus a few footer aliases; everything else goes to Webflow origin. */
async function productEdge(request, url, env) {
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
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (url.pathname === '/how-to-buy' || url.pathname === '/how-to-buy/')
  ) {
    return new Response(request.method === 'HEAD' ? null : HOWTO_HTML, {
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
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (url.pathname === '/forum' || url.pathname === '/forum/')
  ) {
    return Response.redirect('https://lobby.getdasha.com/forum', 308);
  }
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (url.pathname === '/privacy' || url.pathname === '/privacy/')
  ) {
    return new Response(request.method === 'HEAD' ? null : PRIVACY_HTML, {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Dasha-Edge': 'privacy',
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
  if (request.method !== 'GET' || !ct.includes('text/html')) return upstream;
  let html = await upstream.text();
  const originalHtml = html;
  html = sanitizePublicJsonLd(html);
  const stripped = html !== originalHtml;
  html = ensureHtmlLang(html);
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
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/.well-known/security.txt') {
      return securityTxtResponse(request, url.hostname);
    }

    if (url.pathname.startsWith('/simp/photo/') || url.pathname.startsWith('/simp/card/') || url.pathname.startsWith('/og/')) {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      if (asset.ok) headers.set('Cache-Control', 'public, max-age=86400');
      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
    }

    if (url.pathname.startsWith('/simp/') || url.pathname.startsWith('/studio/') || (url.pathname.startsWith('/chess/') && url.pathname !== '/chess/')) {
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
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/rally' || url.pathname === '/rally/')
    ) {
      return Response.redirect('https://www.getdasha.com/', 308);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/lobby' || url.pathname === '/lobby/')) {
      return new Response(request.method === 'HEAD' ? null : LOBBY_PAGE_HTML, {
        status: 200,
        headers: htmlHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
        }),
      });
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

    return json({ error: 'not found' }, 404, allowedOrigin);
  },
};
