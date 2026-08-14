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

const CDN_PIN_FROM = 'e0fe769c0dca9fc8804f6676e928f42092570d6c';
const CDN_PIN_TO = 'd3cce0d74a24ba5d2bacb984e710dcb27e260d3e';
const LIVE_MAP_DATE = '2026-08-14';
const LIVE_MAP_GENERATED_AT = '2026-08-14T15:20:31.483Z';
const STALE_ROLES_GENERATED_AT = '2026-08-06T14:33:36.175Z';
const COMPANIES_CAP = 400;
const CDN_JSON_TTL = 300;
const PAGE_CSS =
  'body{box-sizing:border-box;margin:0 auto;padding:1.25rem;max-width:52rem;background:#03140d;color:#f3f0e7;font:16px/1.45 system-ui,sans-serif}a{color:#10c674}.muted{color:#bdc9bf}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:.55rem .75rem .55rem 0;border-top:1px solid rgba(189,201,191,.28)}th{color:#bdc9bf;font-weight:600}ul{margin:.4rem 0 0;padding-left:1.15rem}h1{font-size:1.45rem}h2{font-size:1.05rem;margin:1.4rem 0 .4rem}';

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

export function isCompaniesPath(pathname) {
  return pathname === '/companies' || pathname === '/companies/';
}

export function isCompanyPath(pathname) {
  return /^\/c\/[^/]+\/?$/.test(String(pathname || ''));
}

function companyIdFromPath(pathname) {
  const match = String(pathname || '').match(/^\/c\/([^/]+)\/?$/);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function honestPayTo(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Swap the live Webflow CDN pin so product HTML loads the merged foot. */
export function rewriteCdnPin(html) {
  return String(html || '').replaceAll(CDN_PIN_FROM, CDN_PIN_TO);
}

/**
 * Webflow still embeds a 2026-08-02 noscript list and a 2026-08-06
 * __dgPublicRoles generatedAt. JS already loads the live CDN map
 * (generatedAt 2026-08-14). Date-correct those snapshot labels only —
 * do not invent company rows or rewrite firstObservedAt.
 */
export function rewriteStaleSnapshotDates(html) {
  return String(html || '')
    .replaceAll('data-generated-at="2026-08-02"', `data-generated-at="${LIVE_MAP_DATE}"`)
    .replaceAll('2026-08-02 snapshot', `${LIVE_MAP_DATE} snapshot`)
    .replaceAll('observed 2026-08-02', `observed ${LIVE_MAP_DATE}`)
    .replaceAll(`"generatedAt":"${STALE_ROLES_GENERATED_AT}"`, `"generatedAt":"${LIVE_MAP_GENERATED_AT}"`);
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

function cdnJsonUrl(file) {
  return `https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@${CDN_PIN_TO}/${file}`;
}

async function loadCdnJson(file) {
  const res = await fetch(cdnJsonUrl(file), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cf: { cacheTtl: CDN_JSON_TTL, cacheEverything: true },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const raw = await res.json().catch(() => null);
  return raw && typeof raw === 'object' ? raw : null;
}

function demigodPage(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${PAGE_CSS}</style></head><body>${body}</body></html>`;
}

function pageNav() {
  return '<p><a href="/">Demigod</a> · <a href="/companies">Companies</a> · <a href="/startups">Startups</a></p>';
}

function factsFooter(asOf) {
  const when = asOf ? `Snapshot as of ${escapeHtml(asOf)}. ` : '';
  return `<p class="muted">${when}Public company facts. Not a recommendation.</p>`;
}

function mapRows(map) {
  return Array.isArray(map?.companies) ? map.companies.filter((row) => row && typeof row === 'object') : [];
}

function findMapCompany(map, id) {
  const want = String(id || '');
  return want ? mapRows(map).find((row) => row.id === want) || null : null;
}

function snapshotDay(map) {
  const raw = typeof map?.generatedAt === 'string' ? map.generatedAt.trim() : '';
  if (!raw) return '';
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : raw;
}

function openRoleCount(company) {
  const n = Number(company?.openRoles);
  return Number.isFinite(n) ? n : null;
}

function roleMixKeys(company) {
  const mix = company?.roleMix;
  if (!mix || typeof mix !== 'object' || Array.isArray(mix)) return [];
  return Object.keys(mix).filter(Boolean);
}

function httpUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
}

function httpsHref(value) {
  const href = httpUrl(value);
  return href.startsWith('https:') ? href : '';
}

function websiteDomain(value) {
  const href = httpUrl(value);
  if (!href) return '';
  try {
    return new URL(href).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

function companyHref(id) {
  const raw = String(id || '');
  return `/c/${/^[A-Za-z0-9:._-]+$/.test(raw) ? raw : encodeURIComponent(raw)}`;
}

function linkedText(href, label) {
  const text = escapeHtml(label);
  return href ? `<a href="${escapeHtml(href)}">${text}</a>` : text;
}

function hiringCompanies(map) {
  return mapRows(map)
    .filter((row) => openRoleCount(row) > 0)
    .sort((a, b) =>
      (openRoleCount(b) || 0) - (openRoleCount(a) || 0) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' }));
}

/** Public roles-feed join is exact `role.company === map.name`. No id or jobsUrl join. */
function rolesForCompany(company, feed) {
  const name = company?.name;
  if (typeof name !== 'string' || !name) return [];
  const roles = Array.isArray(feed?.roles) ? feed.roles : [];
  return roles.filter((role) => role && typeof role === 'object' && role.company === name);
}

function companyPeers(map, company, cap = 8) {
  const families = new Set(roleMixKeys(company));
  if (!families.size) return [];
  const peers = [];
  for (const other of mapRows(map)) {
    if (!other || other.id === company.id) continue;
    if (!(openRoleCount(other) > 0)) continue;
    const shared = roleMixKeys(other).filter((key) => families.has(key)).length;
    if (shared < 1) continue;
    peers.push({
      other,
      shared,
      open: openRoleCount(other) || 0,
      name: String(other.name || ''),
    });
  }
  peers.sort((a, b) =>
    b.shared - a.shared ||
    b.open - a.open ||
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  return peers.slice(0, cap);
}

function companyUnknowns(company) {
  const unknown = [];
  if (!httpUrl(company.website)) unknown.push('missing website');
  if (!String(company.description || '').trim()) unknown.push('missing description');
  if (!roleMixKeys(company).length) unknown.push('no roleMix');
  if (!(openRoleCount(company) > 0)) unknown.push('no openRoles');
  return unknown;
}

export function companiesIndexHtml(map) {
  const asOf = snapshotDay(map);
  const hiring = hiringCompanies(map);
  const shown = hiring.slice(0, COMPANIES_CAP);
  const note = hiring.length > COMPANIES_CAP
    ? `Showing ${shown.length} of ${hiring.length} hiring companies.`
    : `${hiring.length} hiring companies.`;
  const rows = shown.length
    ? shown.map((row) => {
        const mix = escapeHtml(roleMixKeys(row).sort((a, b) => a.localeCompare(b)).join(', '));
        const ats = escapeHtml(typeof row.atsSource === 'string' ? row.atsSource : '');
        return `<tr><td>${linkedText(companyHref(row.id), row.name || row.id || 'Company')}</td><td>${escapeHtml(String(openRoleCount(row)))}</td><td>${ats}</td><td>${mix}</td></tr>`;
      }).join('')
    : '<tr><td colspan="4">No hiring companies in this snapshot.</td></tr>';
  const asOfLine = asOf ? `Snapshot as of ${escapeHtml(asOf)}. ` : '';
  return demigodPage(
    'Companies — Demigod',
    `${pageNav()}<h1>Companies</h1><p class="muted">${asOfLine}${escapeHtml(note)}</p><table><thead><tr><th>Name</th><th>Open roles</th><th>ATS</th><th>Role mix</th></tr></thead><tbody>${rows}</tbody></table>${factsFooter(asOf)}`,
  );
}

export function companyPageHtml(map, id, rolesFeed) {
  const company = findMapCompany(map, id);
  if (!company) {
    return demigodPage(
      'Company not found — Demigod',
      `${pageNav()}<h1>Company not found</h1><p>No public map row for ${escapeHtml(String(id || ''))}.</p>`,
    );
  }
  const asOf = snapshotDay(map);
  const name = String(company.name || company.id || 'Company');
  const domain = websiteDomain(company.website);
  const siteHref = httpsHref(company.website);
  const sourceHref = httpsHref(company.sourceUrl);
  const jobsHref = httpsHref(company.jobsUrl);
  const open = openRoleCount(company);
  const mix = roleMixKeys(company).sort((a, b) => a.localeCompare(b));
  const unknowns = companyUnknowns(company);
  const peers = companyPeers(map, company);
  const roles = rolesForCompany(company, rolesFeed);
  const sourceLabel = String(company.source || '').trim() || company.sourceUrl || '';
  const identity = [
    domain ? `<p>Domain ${escapeHtml(domain)}</p>` : '',
    company.website ? `<p>Website ${linkedText(siteHref, company.website)}</p>` : '',
    sourceLabel ? `<p>Source ${linkedText(sourceHref, sourceLabel)}</p>` : '',
  ].join('');
  const desc = String(company.description || '').trim()
    ? `<section><h2>Description</h2><p>${escapeHtml(company.description)}</p></section>`
    : '';
  const hiring = `<section><h2>Hiring</h2><p>Open roles ${open == null ? 'unknown' : escapeHtml(String(open))}</p>${
    company.atsSource ? `<p>ATS ${escapeHtml(String(company.atsSource))}</p>` : ''
  }${
    company.jobsUrl ? `<p>Jobs ${linkedText(jobsHref, company.jobsUrl)}</p>` : ''
  }${
    company.openRolesAt ? `<p>Open roles at ${escapeHtml(String(company.openRolesAt))}</p>` : ''
  }${
    mix.length ? `<p>Role mix ${escapeHtml(mix.join(', '))}</p>` : ''
  }</section>`;
  const roleItems = roles.map((role) => {
    const title = String(role.title || '').trim();
    if (!title) return '';
    const loc = String(role.location || '').trim();
    return `<li>${linkedText(httpsHref(role.url), title)}${loc ? ` · ${escapeHtml(loc)}` : ''}</li>`;
  }).filter(Boolean).join('');
  const rolesHtml = roleItems
    ? `<section><h2>Open roles</h2><ul>${roleItems}</ul></section>`
    : company.jobsUrl
      ? `<section><h2>Open roles</h2><p>Roles are on ${linkedText(jobsHref, company.jobsUrl)}.</p></section>`
      : '';
  const peerHtml = peers.length
    ? `<section><h2>Peers</h2><p class="muted">sf-map + roleMix overlap</p><ul>${
        peers.map((row) => `<li>${linkedText(companyHref(row.other.id), row.other.name || row.other.id)} · ${escapeHtml(String(row.open))} open roles</li>`).join('')
      }</ul></section>`
    : '';
  const unknownHtml = unknowns.length
    ? `<section><h2>Unknowns</h2><ul>${unknowns.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
    : '';
  return demigodPage(
    `${name} — Demigod`,
    `${pageNav()}<h1>${escapeHtml(name)}</h1>${identity}${desc}${hiring}${rolesHtml}${peerHtml}${unknownHtml}${factsFooter(asOf)}`,
  );
}

function htmlResponse(html, status, edge) {
  const headers = applyHtmlSecurity(new Headers());
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', `public, max-age=${CDN_JSON_TTL}`);
  headers.set('X-Demigod-Edge', edge);
  return { html, status, headers };
}

async function companiesEdge(request, url) {
  const map = await loadCdnJson('sf-startup-map.json').catch(() => null);
  if (isCompanyPath(url.pathname)) {
    const id = companyIdFromPath(url.pathname);
    const company = findMapCompany(map, id);
    const feed = company ? await loadCdnJson('roles-feed.json').catch(() => null) : null;
    const { html, status, headers } = htmlResponse(
      companyPageHtml(map, id, feed),
      company ? 200 : 404,
      'company',
    );
    return new Response(request.method === 'HEAD' ? null : html, { status, headers });
  }
  const { html, status, headers } = htmlResponse(companiesIndexHtml(map), 200, 'companies');
  return new Response(request.method === 'HEAD' ? null : html, { status, headers });
}

async function productEdge(request, url) {
  const upstream = await fetch(request);
  const ct = String(upstream.headers.get('content-type') || '');
  if (request.method !== 'GET' || !ct.includes('text/html')) return upstream;
  let html = await upstream.text();
  html = rewriteStaleSnapshotDates(rewriteCdnPin(stripGoldAccent(html)));
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
    if (isProductHost(url.hostname)) {
      if (
        (request.method === 'GET' || request.method === 'HEAD') &&
        (isCompaniesPath(url.pathname) || isCompanyPath(url.pathname))
      ) {
        return companiesEdge(request, url);
      }
      return productEdge(request, url);
    }
    return fetch(request);
  },
};
