/**
 * Integrity-Policy-Report-Only for Worker HTML.
 *
 * Chrome 138+ / Edge 138+ send integrity-violation reports. Firefox 145+ logs
 * to the console only. Safari has no Integrity-Policy yet. Report-only first:
 * live Webflow pages load CDN scripts without SRI, so enforcing Integrity-Policy
 * would block them. Do not set the enforcing header until every script on the
 * document has an integrity attribute and CORS.
 *
 * W3C SRI: omitting sources == sources=(inline), meaning the integrity
 * *attribute* must be present on blocked destinations. That is external
 * classic scripts, not inline <script> bodies.
 *
 * Reporting API v1 POSTs application/reports+json with mode "cors" and
 * credentials "same-origin" (W3C Reporting 1 §2.2). That MIME is not a
 * CORS-safelisted Content-Type, so the UA preflights OPTIONS even to a
 * same-origin endpoint. Echo the same-origin Origin; never grant a foreign
 * one. Do not add blocked-destinations=(style): Chrome has no style support
 * and Webflow CSS would flood the sink.
 *
 * COOP is report-only same-origin-allow-popups. Enforcing same-origin would
 * drop window.opener on the X OAuth popup (lobby client window.open).
 */
export const INTEGRITY_REPORT_PATH = '/integrity-reports';
export const INTEGRITY_REPORT_MAX_BYTES = 32 * 1024;
export const INTEGRITY_POLICY_REPORT_ONLY =
  'blocked-destinations=(script), endpoints=(integrity-endpoint)';
export const INTEGRITY_REPORTING_ENDPOINTS_RELATIVE =
  `integrity-endpoint="${INTEGRITY_REPORT_PATH}"`;
export const HTML_PERMISSIONS_POLICY =
  'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), accelerometer=(), gyroscope=(), magnetometer=(), midi=(), display-capture=(), bluetooth=()';
export const COOP_REPORT_ONLY =
  'same-origin-allow-popups; report-to="integrity-endpoint"';

export function isIntegrityReportPath(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  return path === INTEGRITY_REPORT_PATH;
}

export function reportingEndpointsHeader(requestUrl) {
  try {
    const origin = new URL(requestUrl).origin;
    if (origin && origin !== 'null' && /^https:\/\//i.test(origin)) {
      return `integrity-endpoint="${origin}${INTEGRITY_REPORT_PATH}"`;
    }
  } catch {
    /* fall through to the relative endpoint */
  }
  return INTEGRITY_REPORTING_ENDPOINTS_RELATIVE;
}

export function applyIntegrityPolicyHeaders(headers, requestUrl) {
  headers.set('Integrity-Policy-Report-Only', INTEGRITY_POLICY_REPORT_ONLY);
  headers.set('Reporting-Endpoints', reportingEndpointsHeader(requestUrl));
  headers.set('Cross-Origin-Opener-Policy-Report-Only', COOP_REPORT_ONLY);
  headers.delete('Integrity-Policy');
  headers.delete('Cross-Origin-Opener-Policy');
  return headers;
}

function reportHeaders(request, { cors = false } = {}) {
  const headers = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    Allow: 'POST, OPTIONS',
  };
  if (cors) {
    const origin = request.headers.get('Origin');
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST';
    headers['Access-Control-Allow-Headers'] = 'content-type';
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Max-Age'] = '7200';
    headers.Vary = 'Origin';
  }
  return headers;
}

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function corsGrant(request) {
  return Boolean(request.headers.get('Origin')) && sameOrigin(request);
}

export async function integrityReportResponse(request) {
  const headers = reportHeaders(request, { cors: corsGrant(request) });
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers });
  }
  if (!sameOrigin(request)) {
    return new Response(null, { status: 403, headers });
  }
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > INTEGRITY_REPORT_MAX_BYTES) {
    return new Response(null, { status: 413, headers });
  }
  const buf = await request.arrayBuffer();
  if (buf.byteLength > INTEGRITY_REPORT_MAX_BYTES) {
    return new Response(null, { status: 413, headers });
  }
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(buf));
  } catch {
    return new Response(null, { status: 400, headers });
  }
  const reports = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  let n = 0;
  let coop = 0;
  for (const report of reports.slice(0, 20)) {
    if (!report || typeof report !== 'object') continue;
    if (report.type === 'integrity-violation') n += 1;
    if (report.type === 'coop') coop += 1;
  }
  console.log(JSON.stringify({ integrityReports: n, coopReports: coop, bytes: buf.byteLength }));
  return new Response(null, { status: 204, headers });
}
