#!/usr/bin/env node
import tls from 'node:tls';

const checks = [];
const note = (id, ok, detail = {}) => checks.push({ id, ok, ...detail });
const get = (url) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });

async function doh(name, type) {
  const url = new URL('https://cloudflare-dns.com/dns-query');
  url.search = new URLSearchParams({ name, type });
  const response = await fetch(url, { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`DNS ${type} HTTP ${response.status}`);
  return response.json();
}

function certificate(host) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: true });
    socket.setTimeout(10_000, () => socket.destroy(new Error('TLS timeout')));
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve(cert);
    });
    socket.once('error', reject);
  });
}

function hstsOk(value) {
  const seconds = Number(String(value || '').match(/max-age=(\d+)/i)?.[1] || 0);
  return seconds >= 31_536_000;
}

try {
  const [ns, ds, caa, dnskey, cds, cdnskey, mx, txt, dmarc, apexA, wwwA, lobbyA] = await Promise.all([
    ...['NS', 'DS', 'CAA', 'DNSKEY', 'CDS', 'CDNSKEY'].map((type) => doh('getdasha.com', type)),
    doh('getdasha.com', 'MX'),
    doh('getdasha.com', 'TXT'),
    doh('_dmarc.getdasha.com', 'TXT'),
    ...['getdasha.com', 'www.getdasha.com', 'lobby.getdasha.com'].map((host) => doh(host, 'A')),
  ]);
  const nameservers = (ns.Answer || []).map((row) => row.data);
  const dsRecords = (ds.Answer || []).map((row) => row.data);
  const dnskeyRecords = (dnskey.Answer || []).map((row) => row.data);
  const cdsRecords = (cds.Answer || []).map((row) => row.data);
  const cdnskeyRecords = (cdnskey.Answer || []).map((row) => row.data);
  const parentDelegated = dsRecords.length > 0;
  const zoneSigned = dnskeyRecords.length > 0;
  const dnssecState = parentDelegated && zoneSigned
    ? 'active'
    : parentDelegated
      ? 'broken-delegation'
      : zoneSigned
        ? 'awaiting-parent-delegation'
        : 'off';
  note('dns-cloudflare', nameservers.some((name) => /\.ns\.cloudflare\.com\.?$/i.test(name)), { nameservers });
  const addresses = (answer) => (answer.Answer || []).filter((row) => row.type === 1).map((row) => row.data);
  const apexAddresses = addresses(apexA);
  note('dns-edge-topology', true, {
    mode: apexAddresses.includes('198.202.211.1') ? 'standard-webflow-dns-only-apex' : 'other',
    apex: apexAddresses,
    www: addresses(wwwA),
    lobby: addresses(lobbyA),
    apexWorkerEligible: !apexAddresses.includes('198.202.211.1'),
  });
  note('dnssec', dnssecState === 'active', {
    soft: dnssecState !== 'broken-delegation',
    state: dnssecState,
    parentDelegated,
    zoneSigned,
    dsRecords,
    dnskeyRecords,
    cdsRecords,
    cdnskeyRecords,
  });
  note('caa-policy', true, {
    mode: (caa.Answer || []).length ? 'restricted' : 'unrestricted-universal-ssl',
    records: (caa.Answer || []).map((row) => row.data),
  });
  const mxRecords = (mx.Answer || []).map((row) => row.data);
  const txtRecords = (txt.Answer || []).map((row) => row.data.replaceAll('"', ''));
  const dmarcRecords = (dmarc.Answer || []).map((row) => row.data.replaceAll('"', ''));
  note('mail-null-mx', mxRecords.some((value) => /^0\s+\.?$/.test(value.trim())), { soft: true, records: mxRecords });
  note('mail-spf-no-send', txtRecords.includes('v=spf1 -all'), { soft: true, records: txtRecords.filter((value) => /^v=spf1\b/i.test(value)) });
  note('mail-dmarc-reject', dmarcRecords.some((value) => /^v=DMARC1;.*\bp=reject\b/i.test(value) && /\bsp=reject\b/i.test(value)), { soft: true, records: dmarcRecords });

  for (const host of ['getdasha.com', 'www.getdasha.com', 'lobby.getdasha.com']) {
    const cert = await certificate(host);
    const days = Math.floor((Date.parse(cert.valid_to) - Date.now()) / 86_400_000);
    note(`tls-${host}`, days >= 14, { days, issuer: cert.issuer?.O || cert.issuer?.CN, validTo: cert.valid_to });
  }

  const redirects = [
    ['http-apex', 'http://getdasha.com/', 'https://getdasha.com/'],
    ['https-apex', 'https://getdasha.com/', 'https://www.getdasha.com/'],
    ['http-www', 'http://www.getdasha.com/', 'https://www.getdasha.com/'],
    ['http-lobby', 'http://lobby.getdasha.com/lobby', 'https://lobby.getdasha.com/lobby'],
    ['http-apex-path-query', 'http://getdasha.com/studio?from=domain-check', 'https://getdasha.com/studio?from=domain-check'],
    ['https-apex-path-query', 'https://getdasha.com/studio?from=domain-check', 'https://www.getdasha.com/studio?from=domain-check'],
    ['http-www-path-query', 'http://www.getdasha.com/lobby?quiz=1', 'https://www.getdasha.com/lobby?quiz=1'],
    ['http-lobby-path-query', 'http://lobby.getdasha.com/simp/r/DBd2weeQJ4cN?from=domain-check', 'https://lobby.getdasha.com/simp/r/DBd2weeQJ4cN?from=domain-check'],
  ];
  for (const [id, url, expected] of redirects) {
    const response = await get(url);
    note(id, [301, 308].includes(response.status) && response.headers.get('location') === expected, {
      status: response.status,
      location: response.headers.get('location'),
    });
  }

  const home = await get('https://www.getdasha.com/');
  note('www-home', home.status === 200, { status: home.status });
  note('www-hsts', hstsOk(home.headers.get('strict-transport-security')), { value: home.headers.get('strict-transport-security') });

  const health = await get('https://lobby.getdasha.com/health');
  note('lobby-health', health.status === 200 && /application\/json/i.test(health.headers.get('content-type') || ''), { status: health.status });
  note('lobby-health-policy', hstsOk(health.headers.get('strict-transport-security')) && health.headers.get('x-content-type-options') === 'nosniff' && /no-store/i.test(health.headers.get('cache-control') || ''), {
    hsts: health.headers.get('strict-transport-security'),
    nosniff: health.headers.get('x-content-type-options'),
    cache: health.headers.get('cache-control'),
  });

  const lobby = await get('https://lobby.getdasha.com/lobby');
  const csp = lobby.headers.get('content-security-policy') || '';
  note('lobby-html-policy', lobby.status === 200 && hstsOk(lobby.headers.get('strict-transport-security')) && lobby.headers.get('x-frame-options') === 'DENY' && /frame-ancestors 'none'/.test(csp), {
    status: lobby.status,
    hsts: lobby.headers.get('strict-transport-security'),
    frame: lobby.headers.get('x-frame-options'),
    csp,
  });

  for (const host of ['getdasha.com', 'www.getdasha.com', 'lobby.getdasha.com']) {
    const response = await get(`https://${host}/.well-known/security.txt`);
    const body = await response.text();
    const canonical = `https://${host}/.well-known/security.txt`;
    const expires = body.match(/^Expires:\s*(\S+)/mi)?.[1] || '';
    const ok = response.status === 200 &&
      /^text\/plain\b/i.test(response.headers.get('content-type') || '') &&
      /^Contact: https:\/\/github\.com\/Uuriko\/dasha-desk\/security\/advisories\/new$/mi.test(body) &&
      body.split(/\r?\n/).includes(`Canonical: ${canonical}`) &&
      Date.parse(expires) > Date.now() + 30 * 86_400_000;
    note(`security-${host}`, ok, { soft: host === 'getdasha.com', status: response.status, canonical, expires,
      ...(host === 'getdasha.com' && !ok ? { reason: 'standard Webflow DNS-only apex bypasses Cloudflare Worker routes' } : {}) });
  }
} catch (error) {
  note('probe', false, { error: String(error?.message || error) });
}

const hard = checks.filter((row) => !row.ok && !row.soft).map((row) => row.id);
const soft = checks.filter((row) => !row.ok && row.soft).map((row) => row.id);
const report = { ok: hard.length === 0, checkedAt: new Date().toISOString(), hard, soft, checks };
console.log(JSON.stringify(report, null, 2));
if (hard.length) process.exit(1);
