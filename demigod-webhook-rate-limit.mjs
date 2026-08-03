import net from 'node:net';

function normalizeIp(value = '') {
  const ip = String(value).trim();
  return ip.startsWith('::ffff:') && net.isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
}

export function webhookClientIp(req, trustedProxies = ['127.0.0.1', '::1']) {
  const remote = normalizeIp(req?.socket?.remoteAddress || '') || 'unknown';
  const trusted = trustedProxies.map(normalizeIp).filter((ip) => net.isIP(ip));
  if (!trusted.includes(remote)) return remote;
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',').map(normalizeIp).filter((ip) => net.isIP(ip));
  for (let i = forwarded.length - 1; i >= 0; i--) if (!trusted.includes(forwarded[i])) return forwarded[i];
  return remote;
}

export function allowWebhookRequest(hits, key, { now = Date.now(), windowMs = 60_000, max = 30, maxKeys = 2048 } = {}) {
  const bucket = (hits.get(key) || []).filter((time) => now - time < windowMs);
  if (bucket.length >= max) return false;
  if (!hits.has(key) && hits.size >= maxKeys) hits.delete(hits.keys().next().value);
  bucket.push(now);
  hits.set(key, bucket);
  return true;
}
