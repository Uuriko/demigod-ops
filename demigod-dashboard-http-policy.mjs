const SECURITY_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
});

export function privateDashboardSecurityHeaders() {
  return SECURITY_HEADERS;
}

/** Return the exact loopback dashboard Origin allowed to read private agent APIs. */
export function dashboardCorsOrigin(origin = '', port = 9878) {
  try {
    const url = new URL(String(origin));
    return url.protocol === 'http:'
      && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      && url.port === String(port)
      ? url.origin
      : '';
  } catch {
    return '';
  }
}

/** Reject DNS-rebound/private API requests before routing. */
export function dashboardLocalHost(host = '', port = 9878) {
  const value = String(host).trim().toLowerCase();
  return value === `127.0.0.1:${port}` || value === `localhost:${port}`;
}

export function dashboardLocalRequest(origin = '', referer = '', port = 9878) {
  const local = (value) => dashboardCorsOrigin(value, port) !== '';
  return origin ? local(origin) : !referer || local(referer);
}

export function dashboardMutationIntent(method = 'GET', pathname = '', search = '') {
  const verb = String(method).toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(verb)) return true;
  if (verb !== 'GET') return false;
  const query = new URLSearchParams(String(search).replace(/^\?/, ''));
  const refresh = query.get('refresh') === '1' || query.get('run') === '1';
  return ((pathname === '/api/jobs' || pathname === '/api/job/start')
      && Boolean(query.get('run') || query.get('id') || query.get('type')))
    || (pathname === '/api/review' && refresh)
    || (pathname === '/api/inbox' && query.get('refresh') === '1')
    || ((pathname === '/api/matches' || pathname === '/api/match-review' || pathname === '/api/webflow') && refresh)
    || (pathname === '/api/smoke' && query.get('run') === '1')
    || (['/api/status', '/api/status.json', '/api/agent-brief', '/api/brief'].includes(pathname)
      && query.get('force') === '1')
    || ((pathname === '/api/control' || pathname === '/api/control-plane')
      && (refresh || query.get('force') === '1'))
    || ((pathname === '/api/craft' || pathname === '/api/craft-log') && Boolean(query.get('mint')));
}

export function privateDashboardJsonHeaders(corsOrigin = '', custom = {}) {
  const protectedNames = new Set([
    'content-type',
    'cache-control',
    'access-control-allow-origin',
    ...Object.keys(SECURITY_HEADERS).map((name) => name.toLowerCase()),
  ]);
  const headers = {
    ...SECURITY_HEADERS,
    ...Object.fromEntries(Object.entries(custom).filter(([name]) => !protectedNames.has(name.toLowerCase()))),
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  if (corsOrigin) headers['Access-Control-Allow-Origin'] = corsOrigin;
  return headers;
}
