/** Browser-origin policy. Missing Origin is legitimate server-to-server Webflow delivery. */
export function webhookOriginPolicy(origin = '', allowed = []) {
  const value = String(origin).trim();
  const matched = value && allowed.includes(value) ? value : '';
  return { allowed: !value || !!matched, responseOrigin: matched };
}

export function privateCapabilityHeaders(extra = {}) {
  return {
    ...extra,
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
  };
}
