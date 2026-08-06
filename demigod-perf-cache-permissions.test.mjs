import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fetch as undiciFetch } from 'undici';

test('writeJsonAuto makes private receipts owner-only', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-perf-perms-'));
  const file = path.join(root, 'receipt.json');
  const previousBusy = process.env.DG_BUSY;
  t.after(() => {
    if (previousBusy === undefined) delete process.env.DG_BUSY;
    else process.env.DG_BUSY = previousBusy;
    fs.rmSync(root, { recursive: true, force: true });
  });

  fs.chmodSync(root, 0o775);
  fs.writeFileSync(file, '{"old":true}\n', { mode: 0o664 });
  fs.chmodSync(file, 0o664);

  process.env.DG_BUSY = root;
  const { setCached, writeJsonAuto } =
    await import(`./demigod-perf-cache.mjs?permissions=${Date.now()}`);
  writeJsonAuto(file, { ok: true });
  setCached('private', { secret: true });

  assert.equal(fs.statSync(root).mode & 0o777, 0o700);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  const cacheDir = path.join(root, 'perf-cache');
  const cacheFile = path.join(cacheDir, fs.readdirSync(cacheDir)[0]);
  assert.equal(fs.statSync(cacheDir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(cacheFile).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { ok: true });
});

test('cache entries never outlive the caller freshness limit', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-perf-ttl-'));
  const previousBusy = process.env.DG_BUSY;
  t.after(() => {
    if (previousBusy === undefined) delete process.env.DG_BUSY;
    else process.env.DG_BUSY = previousBusy;
    fs.rmSync(root, { recursive: true, force: true });
  });

  process.env.DG_BUSY = root;
  const writer = await import(`./demigod-perf-cache.mjs?ttl-writer=${Date.now()}`);
  writer.setCached('long-lived', { stale: true }, 86400000);
  const cacheFile = path.join(root, 'perf-cache', fs.readdirSync(path.join(root, 'perf-cache'))[0]);
  const old = new Date(Date.now() - 10000);
  fs.utimesSync(cacheFile, old, old);
  const reader = await import(`./demigod-perf-cache.mjs?ttl-reader=${Date.now()}`);
  assert.equal(reader.getCached('long-lived', 1000).hit, false);
});

test('cachedFetchText retries one transient transport failure when requested', async () => {
  const { cachedFetchText } = await import(`./demigod-perf-cache.mjs?retry=${Date.now()}`);
  let attempts = 0;
  const fetchImpl = async () => {
    if (++attempts === 1) throw Object.assign(new Error('temporary DNS failure'), { code: 'ENOTFOUND' });
    return new Response('ok', { headers: { 'content-type': 'text/plain' } });
  };
  const result = await cachedFetchText('https://public.example/retry', {
    bust: true,
    retries: 1,
    fetchImpl,
  });
  assert.equal(result.text, 'ok');
  assert.equal(attempts, 2);
});

test('cachedFetchText rejects DNS-to-loopback before connecting', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-perf-network-'));
  const previousBusy = process.env.DG_BUSY;
  let hits = 0;
  const server = http.createServer((_request, response) => {
    hits++;
    response.end('PRIVATE');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (previousBusy === undefined) delete process.env.DG_BUSY;
    else process.env.DG_BUSY = previousBusy;
    fs.rmSync(root, { recursive: true, force: true });
  });

  process.env.DG_BUSY = root;
  const { cachedFetchText } =
    await import(`./demigod-perf-cache.mjs?network=${Date.now()}`);
  const { port } = server.address();
  let lookups = 0;
  const lookup = (_hostname, _options, callback) => {
    lookups++;
    callback(null, [{ address: '127.0.0.1', family: 4 }]);
  };
  await assert.rejects(
    cachedFetchText(`http://public.test:${port}/secret`, {
      bust: true,
      timeoutMs: 1000,
      lookup,
    }),
    (error) => /non_public_network_address/.test(
      `${error?.message || ''} ${error?.cause?.message || ''}`,
    ),
  );
  await assert.rejects(
    cachedFetchText(`http://127.0.0.1:${port}/secret`, {
      bust: true,
      timeoutMs: 1000,
    }),
    /invalid_public_url/,
  );
  assert.equal(hits, 0);
  assert.equal(lookups, 1, 'security-policy failures must not retry');
});

test('cachedFetchText rejects private IP URL hosts without egress', async () => {
  const { cachedFetchText, isPublicNetworkAddress } =
    await import(`./demigod-perf-cache.mjs?private-literals=${Date.now()}`);
  // host in URL → address after WHATWG normalize (obfuscated forms collapse to dotted-quad)
  const cases = [
    ['127.0.0.1', '127.0.0.1', 4],
    ['10.23.45.67', '10.23.45.67', 4],
    ['192.168.1.2', '192.168.1.2', 4],
    ['[::1]', '::1', 6],
    ['169.254.169.254', '169.254.169.254', 4],
    ['2130706433', '127.0.0.1', 4], // bare integer 127.0.0.1
    ['0x7f000001', '127.0.0.1', 4], // hex
    ['127.1', '127.0.0.1', 4], // short form
    ['0177.0.0.1', '127.0.0.1', 4], // octal leading
  ];
  let fetches = 0;
  const fetchImpl = async () => {
    fetches++;
    return new Response('unexpected egress');
  };

  for (const [host, address, family] of cases) {
    assert.equal(isPublicNetworkAddress(address, family), false, address);
    await assert.rejects(
      cachedFetchText(`http://${host}/secret`, { bust: true, fetchImpl }),
      /invalid_public_url/,
      host,
    );
  }
  assert.equal(fetches, 0);
});

test('cachedFetchText rechecks a private redirect target before egress', async () => {
  const { cachedFetchText } =
    await import(`./demigod-perf-cache.mjs?private-redirect=${Date.now()}`);
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), redirect: options.redirect });
    return new Response(null, {
      status: 302,
      headers: { location: 'http://169.254.169.254/latest/meta-data/' },
    });
  };

  await assert.rejects(
    cachedFetchText('https://public.example/start', { bust: true, fetchImpl }),
    /invalid_public_url/,
  );
  assert.deepEqual(requests.map(({ redirect }) => redirect), ['manual']);
  assert.match(requests[0].url, /^https:\/\/public\.example\/start\?v=/);
});

test('cachedFetchText rejects a redirected DNS name resolving to loopback', async (t) => {
  let hits = 0;
  const server = http.createServer((_request, response) => {
    hits++;
    response.end('PRIVATE');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { cachedFetchText } =
    await import(`./demigod-perf-cache.mjs?private-redirect-dns=${Date.now()}`);
  const { port } = server.address();
  let fetches = 0;
  const lookups = [];
  const fetchImpl = async (url, options) => {
    fetches++;
    if (fetches === 1) {
      return new Response(null, {
        status: 302,
        headers: { location: `http://redirect.test:${port}/secret` },
      });
    }
    return undiciFetch(url, options);
  };
  const lookup = (hostname, _options, callback) => {
    lookups.push(hostname);
    callback(null, [{ address: '127.0.0.1', family: 4 }]);
  };

  await assert.rejects(
    cachedFetchText('https://public.example/start', {
      bust: true,
      fetchImpl,
      lookup,
    }),
    (error) => /non_public_network_address/.test(
      `${error?.message || ''} ${error?.cause?.message || ''}`,
    ),
  );
  assert.equal(fetches, 2);
  assert.deepEqual(lookups, ['redirect.test']);
  assert.equal(hits, 0);
});

test('cachedFetchText rechecks each redirect hop (public→public→private)', async () => {
  const { cachedFetchText } =
    await import(`./demigod-perf-cache.mjs?multi-hop=${Date.now()}`);
  const requests = [];
  const fetchImpl = async (url, options) => {
    const href = String(url);
    requests.push({ url: href, redirect: options.redirect });
    if (href.includes('public.example/start')) {
      return new Response(null, {
        status: 302,
        headers: { location: 'https://cdn.example/next' },
      });
    }
    if (href.includes('cdn.example/next')) {
      return new Response(null, {
        status: 302,
        headers: { location: 'http://127.0.0.1/steal' },
      });
    }
    return new Response('unexpected egress');
  };

  await assert.rejects(
    cachedFetchText('https://public.example/start', { bust: true, fetchImpl }),
    /invalid_public_url/,
  );
  assert.equal(requests.length, 2, 'second hop must never connect to 127.0.0.1');
  assert.ok(requests.every((r) => r.redirect === 'manual'));
  assert.match(requests[0].url, /^https:\/\/public\.example\/start\?v=/);
  assert.equal(requests[1].url, 'https://cdn.example/next');
});

test('cachedFetchText rejects redirect with credentials or .internal host', async () => {
  const { cachedFetchText } =
    await import(`./demigod-perf-cache.mjs?redir-policy=${Date.now()}`);
  for (const location of [
    'https://user:pass@evil.example/x',
    'http://metadata.internal/creds',
    'http://printer.lan/status',
  ]) {
    const fetchImpl = async () =>
      new Response(null, { status: 302, headers: { location } });
    await assert.rejects(
      cachedFetchText('https://public.example/start', { bust: true, fetchImpl }),
      /invalid_public_url/,
      location,
    );
  }
});
