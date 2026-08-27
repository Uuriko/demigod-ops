/**
 * Demigod edge sitemap + product-route passthrough (live leftover-redirect).
 *
 * Live /sitemap.xml is Worker-owned (`x-demigod-edge: sitemap`) and lists 11
 * legacy URLs. The nine source-owned product pages in demigod-pages/ are
 * omitted; eight of them 308 home as leftover-redirect / hire-home, and
 * /proof 404s as not-found. Webflow staging already 200s eight of nine
 * (`/proof` is still unpublished). This module:
 *   1. Serves a sitemap that keeps the live 11 URLs and adds the nine product
 *      paths the production verifier requires.
 *   2. Names those product paths so the Worker can fetch origin instead of
 *      leftover-redirecting them.
 */
const ORIGIN = 'https://www.trydemigod.com';
const LEGACY_LASTMOD = '2026-08-21';
const PRODUCT_LASTMOD = '2026-08-27';

export const LEGACY_SITEMAP_PATHS = Object.freeze([
  '',
  '/contact',
  '/legal',
  '/companies',
  '/weekly',
  '/packets',
  '/journal',
  '/peers',
  '/memo',
  '/ticket',
  '/grok',
]);

export const PRODUCT_PATHS = Object.freeze([
  '/compare',
  '/faq',
  '/hire',
  '/how',
  '/network',
  '/pilot',
  '/pricing',
  '/proof',
  '/talent',
]);

const SECURITY = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

function normalizePath(pathname) {
  const path = String(pathname || '');
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
}

export function isSitemapPath(pathname) {
  return normalizePath(pathname) === '/sitemap.xml';
}

export function isProductPath(pathname) {
  return PRODUCT_PATHS.includes(normalizePath(pathname));
}

function locFor(path) {
  return path ? `${ORIGIN}${path}` : ORIGIN;
}

function urlEntry(path, lastmod) {
  return `    <url>\n        <loc>${locFor(path)}</loc>\n        <lastmod>${lastmod}</lastmod>\n    </url>`;
}

export function sitemapLocs() {
  const locs = [];
  const seen = new Set();
  for (const path of [...LEGACY_SITEMAP_PATHS, ...PRODUCT_PATHS]) {
    const loc = locFor(path);
    if (seen.has(loc)) continue;
    seen.add(loc);
    locs.push(loc);
  }
  return locs;
}

export function sitemapXml() {
  const entries = [
    ...LEGACY_SITEMAP_PATHS.map((path) => urlEntry(path, LEGACY_LASTMOD)),
    ...PRODUCT_PATHS.map((path) => urlEntry(path, PRODUCT_LASTMOD)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

export function sitemapResponse(request) {
  const method = request?.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') return null;
  const headers = new Headers();
  for (const [name, value] of Object.entries(SECURITY)) headers.set(name, value);
  headers.set('Content-Type', 'application/xml; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=300');
  headers.set('X-Demigod-Edge', 'sitemap');
  return new Response(method === 'HEAD' ? null : sitemapXml(), { status: 200, headers });
}
