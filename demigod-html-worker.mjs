/**
 * Demigod product HTML edge — Cloudflare Worker for www.trydemigod.com.
 * Fetch Webflow, then rewrite first HTML. Separate zone/brand from Dasha.
 */
const FEED_SCHEMA = 'demigod-bounties-feed/v1';
const FEED_NOTE =
  "Declared USDC. We don't hold it. Unused bounty rail — not the 10% on-hire matching fee. Demigod listings only — not extraSeed/dasha-desk.";
const FEED_PAGE = 'https://www.trydemigod.com/bounties';
const FEED_SOURCES = [
  'https://raw.githubusercontent.com/Uuriko/demigod-site-cdn/main/bounties-feed.json',
  'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@main/bounties-feed.json',
];

const HTML_SECURITY = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function ensureHtmlLang(html) {
  return String(html || '').replace(/<html\b([^>]*)>/i, (tag, attrs) =>
    /\blang\s*=/i.test(attrs) ? tag : `<html lang="en"${attrs}>`);
}

function applyHtmlSecurity(headers) {
  for (const [name, value] of Object.entries(HTML_SECURITY)) headers.set(name, value);
  return headers;
}

function isProductHost(host) {
  const h = String(host || '').toLowerCase();
  return h === 'www.trydemigod.com' || h === 'trydemigod.com';
}

function isBountiesPath(pathname) {
  return pathname === '/bounties' || pathname === '/bounties/';
}

function honestPayTo(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Remove leftover Webflow gold H1 span from first HTML. Keep red/blue accents. */
export function stripGoldAccent(html) {
  return String(html || '').replace(
    /<span\b(?=[^>]*\bclass=["'][^"']*\btitle-accent-gold\b)[^>]*>[\s\S]*?<\/span>/gi,
    '',
  );
}

/** Blank / whitespace payTo is the same as null. Never emit payTo:"". */
export function normalizeBountiesFeed(raw) {
  const listings = Array.isArray(raw?.listings)
    ? raw.listings.filter((row) => row && typeof row === 'object').map((row) => {
        const dest = honestPayTo(row.payTo);
        return dest ? { ...row, payTo: dest } : { ...row, payTo: null, payoutStatus: 'not_implemented' };
      })
    : [];
  return {
    name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : 'demigod bounties',
    schema: FEED_SCHEMA,
    note: FEED_NOTE,
    url: typeof raw?.url === 'string' && raw.url.trim() ? raw.url.trim() : FEED_PAGE,
    listings,
  };
}

function listingTitle(row) {
  const name = typeof row?.name === 'string' ? row.name.trim() : '';
  const title = typeof row?.title === 'string' ? row.title.trim() : '';
  return name || title;
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

function bountiesBoardHtml(feed) {
  const data = normalizeBountiesFeed(feed);
  const rows = data.listings.length
    ? `<ul>${data.listings.map((row) => {
        const name = escapeHtml(listingTitle(row));
        const href = bountyItemHref(row.itemUrl);
        const title = href ? `<a href="${escapeHtml(href)}">${name}</a>` : name;
        const amount = row.amount == null || row.amount === '' ? '' : String(row.amount);
        const currency = typeof row.currency === 'string' ? row.currency.trim() : '';
        const label = escapeHtml([amount, currency].filter(Boolean).join(' '));
        const dest = honestPayTo(row.payTo);
        const destHtml = dest && row.payoutStatus !== 'not_implemented' ? `<p>${escapeHtml(dest)}</p>` : '';
        return `<li><p>${title}</p><p class="amt">${label}</p>${destHtml}</li>`;
      }).join('')}</ul>`
    : '<p>No bounties listed</p>';
  return `<section id="demigod-bounties" aria-label="Bounties"><style>#demigod-bounties{box-sizing:border-box;margin:0;padding:1.25rem;background:#03140d;color:#f3f0e7;font:16px/1.45 system-ui,sans-serif}#demigod-bounties a{color:#10c674}#demigod-bounties .amt{color:#bdc9bf}#demigod-bounties ul{list-style:none;margin:0;padding:0}#demigod-bounties li{border-top:1px solid rgba(189,201,191,.28);padding:.75rem 0}#demigod-bounties li:first-child{border-top:0}</style>${rows}</section>`;
}

/** /bounties-only: no-JS listings into first HTML. Same feed as CDN bounties-feed.json. */
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

async function readBountiesSource(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const raw = await res.json().catch(() => null);
  if (!raw || typeof raw !== 'object') return null;
  if (raw.schema !== FEED_SCHEMA) return null;
  return normalizeBountiesFeed(raw);
}

async function loadBountiesFeed() {
  for (const src of FEED_SOURCES) {
    try {
      const feed = await readBountiesSource(src);
      if (feed) return feed;
    } catch {
      /* next pin */
    }
  }
  return normalizeBountiesFeed(null);
}

async function productEdge(request, url) {
  const upstream = await fetch(request);
  const ct = String(upstream.headers.get('content-type') || '');
  if (request.method !== 'GET' || !ct.includes('text/html')) return upstream;
  let html = await upstream.text();
  html = stripGoldAccent(html);
  if (isBountiesPath(url.pathname)) {
    html = injectBountiesBoard(html, await loadBountiesFeed());
  }
  html = ensureHtmlLang(html);
  const headers = applyHtmlSecurity(new Headers(upstream.headers));
  headers.delete('content-length');
  headers.set('X-Demigod-Edge', isBountiesPath(url.pathname) ? 'bounties-board' : 'html-rewrite');
  return new Response(html, { status: upstream.status, statusText: upstream.statusText, headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return new Response(null, {
        status: 308,
        headers: { Location: url.href, 'Cache-Control': 'public, max-age=3600' },
      });
    }
    if (isProductHost(url.hostname)) return productEdge(request, url);
    return fetch(request);
  },
};
