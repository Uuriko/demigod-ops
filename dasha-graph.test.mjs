import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const page = await readFile(new URL('./dasha-graph-page.html', root), 'utf8');
const client = await readFile(new URL('./dasha-graph-client.js', root), 'utf8');
const modSrc = await readFile(new URL('./dasha-graph.mjs', root), 'utf8');
const worker = await readFile(new URL('./dasha-lobby-worker.mjs', root), 'utf8');
const wrangler = await readFile(new URL('./dasha-lobby-wrangler.jsonc', root), 'utf8');
const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const pair = '9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7';
const wsol = 'So11111111111111111111111111111111111111112';
const amm = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

assert.match(page, /<h1>\$DASHA <em>GRAPH<\/em><\/h1>/);
assert.match(page, /Public chain\. Addresses, not people\. Not endorsement\./);
assert.match(page, /class="ticker"/);
assert.match(page, new RegExp(`<code id="mint">${mint}</code>`));
assert.doesNotMatch(page, /MINT\.slice|ellipsis|…pump/);
assert.match(page, /three@0\.170\.0\/build\/three\.module\.js/);
assert.match(page, /three@0\.170\.0\/examples\/jsm\//);
assert.doesNotMatch(page + client, /3d-force-graph|ForceGraph3D/);
assert.match(page, /lobby\.getdasha\.com\/client\/graph\.js/);
assert.match(page, />Reset</);
assert.match(page, />Follow latest</);
assert.match(page, />List</);
assert.match(page, />Highlight me</);
assert.match(page, /id="highlight-me"/);
assert.match(page, />Buy on Jupiter</);
assert.doesNotMatch(page, /id="dasha-lock"/);
assert.match(page, new RegExp(`jup\\.ag/swap\\?sell=${wsol}&amp;buy=${mint}`));
assert.match(page, new RegExp(`dexscreener\\.com/solana/${pair}`));
assert.match(page, /id="hud-price"/);
assert.match(page, /href="\/studio">Studio</);
assert.match(page, /href="\/simp">Simp</);
assert.match(page, /href="\/graph" aria-current="page">Graph</);
assert.match(page, /href="\/verse">Verse</);
assert.match(page, /href="\/how-to-buy">How to buy</);
assert.match(page, /href="\/privacy">Privacy</);
assert.doesNotMatch(page, /fonts\.googleapis|Google Fonts|font-family:[^;]*Inter/i);
assert.doesNotMatch(page, /wallet connect|siws|telegram|t\.me\/|official|verified|safe mint|Arkham|Nansen/i);
assert.doesNotMatch(page + client, /Dasha Nekrasova|John Potter|potterlab/i);
assert.match(client, /prefers-reduced-motion/);
assert.match(client, /Holders: not loaded/);
assert.match(client, /holders unavailable — retry/);
assert.match(client, /import\('three'\)/);
assert.match(client, /OrbitControls/);
assert.match(client, /lobby\.getdasha\.com/);
assert.match(client, /\/oauth\/x\/status/);
assert.match(client, /\/oauth\/x\/start/);
assert.match(client, /\/api\/graph\/wallet\/challenge/);
assert.match(client, /\/api\/graph\/highlight/);
assert.match(client, /Connect X to be highlighted/);
assert.match(client, /wallet does not currently hold \$dasha|res\.data\.error/);
assert.match(client, /role === 'highlight'/);
assert.match(client, /function highlightNodes/);
assert.ok(client.indexOf('concat(marks.nodes)') < client.indexOf('holdersLoaded: body.holdersLoaded'), 'opt-in spheres must overlay even when ring 1 failed to load');
assert.match(client, /IcosahedronGeometry/);
assert.match(client, /TorusGeometry/);
assert.match(client, /OctahedronGeometry/);
assert.match(client, /BoxGeometry/);
assert.match(client, /SphereGeometry/);
assert.doesNotMatch(client, /autoRotate|auto-orbit|autoOrbit/);
assert.doesNotMatch(client, /api\.mainnet-beta\.solana\.com|lite-api\.jup\.ag|api\.dexscreener\.com/);
assert.doesNotMatch(modSrc, /getProgramAccounts/);
assert.doesNotMatch(modSrc + worker + wrangler, /HELIUS|BIRDEYE|SOLSCAN_API|SOLSCAN_KEY|HELIUS_API/);
assert.doesNotMatch(wrangler, /GRAPH_|JUPITER_KEY|RPC_KEY/);
assert.ok(modSrc.includes(amm), 'graph pins the shipped Raydium AMM');
assert.match(modSrc, /import \{ MINT, PAIR, WSOL \}/);
assert.match(modSrc, /getSignaturesForAddress', \[PAIR/);
assert.ok(modSrc.includes('public, s-maxage=90, stale-while-revalidate=60'));

const {
  applyGraphHighlight,
  dropGraphHighlight,
  pruneGraphHighlights,
  buildExpand,
  buildSnapshot,
  collapseOwners,
  dexHud,
  fetchGraphExpand,
  fetchGraphSnapshot,
  mintFields,
  mintNode,
  parseMintTransfers,
  parseRetryAfter,
  pickDexPair,
  pickJupiterToken,
  publicHighlights,
  resetGraphCache,
  supplyFields,
  tagPubkey,
} = await import('./dasha-graph.mjs');

assert.equal(mintNode().id, mint);
assert.equal(mintNode().role, 'mint');
assert.deepEqual(mintFields({ name: 'dash_eats', symbol: 'dasha', icon: 'https://example', launchpad: 'pump.fun', graduatedPool: pair, mcap: 99, circSupply: 1 }), {
  name: 'dash_eats',
  symbol: 'dasha',
  icon: 'https://example',
  launchpad: 'pump.fun',
  graduatedPool: pair,
});
assert.equal(pickJupiterToken([{ id: 'other' }, { id: mint, symbol: 'dasha' }], mint).symbol, 'dasha');
assert.equal(tagPubkey(pair), 'pool');
assert.equal(tagPubkey(amm), 'program');
assert.equal(tagPubkey(mint), '');
assert.equal(parseRetryAfter('2'), 2);
assert.equal(parseRetryAfter('not-a-date'), 0);
assert.deepEqual(dexHud({
  priceUsd: '0.012',
  liquidity: { usd: 12000 },
  volume: { h24: 800 },
  fdv: 12000000,
  quoteToken: { address: wsol },
  marketCap: 99,
}), {
  priceUsd: '0.012',
  liquidityUsd: 12000,
  volume24h: 800,
  fdv: 12000000,
  quote: wsol,
});
assert.deepEqual(dexHud(null), {});
assert.deepEqual(supplyFields({ value: { uiAmount: 999830000, uiAmountString: '999830000.12' } }), {
  uiAmountString: '999830000.12',
  uiAmount: 999830000,
});
assert.equal(pickDexPair({
  pairs: [
    { chainId: 'solana', pairAddress: 'other' },
    { chainId: 'solana', pairAddress: pair, priceUsd: '1' },
  ],
}, pair).priceUsd, '1');

const owners = collapseOwners([
  { owner: pair, uiAmount: 10, uiAmountString: '10' },
  { owner: pair, uiAmount: 5, uiAmountString: '5' },
  { owner: 'not-an-address', uiAmount: 9 },
]);
assert.equal(owners.length, 1);
assert.equal(owners[0].id, pair);
assert.equal(owners[0].kind, 'pool');
assert.equal(owners[0].role, 'pair');
assert.equal(owners[0].uiAmount, 15);

const empty = buildSnapshot({ rpcError: 'rpc_unavailable' });
assert.ok(empty.nodes.some((node) => node.id === mint && node.role === 'mint'));
assert.ok(empty.nodes.some((node) => node.id === pair && node.role === 'pair'));
assert.ok(!empty.nodes.some((node) => node.kind === 'wallet'));
assert.deepEqual(empty.highlights, []);
assert.equal(empty.rings[1].empty, true);
assert.equal(empty.rings[1].reason, 'rpc_unavailable');
assert.equal(empty.holdersLoaded, false);
assert.ok(empty.links.some((link) => link.kind === 'pair' && link.target === pair));

const highlightNow = Date.parse('2026-08-15T00:00:00Z');
assert.deepEqual(publicHighlights({}), []);
assert.deepEqual(publicHighlights({ x1: { handle: 'ava', until: highlightNow - 1 } }, highlightNow), []);
// test double: ava is a fixture handle, not a live person
const marked = applyGraphHighlight({}, { xId: 'x1', handle: 'ava' }, { now: highlightNow, ttlMs: 60_000 });
assert.equal(marked.ok, true);
assert.deepEqual(marked.highlight, { handle: 'ava', href: 'https://x.com/ava', until: highlightNow + 60_000 });
assert.equal(JSON.stringify(marked.highlight).includes('x1'), false);
assert.equal(JSON.stringify(marked.highlight).includes('wallet'), false);
assert.equal(applyGraphHighlight({}, { handle: 'ava' }, { now: highlightNow }).ok, false);
const withMark = buildSnapshot({ highlights: marked.rows, now: highlightNow });
assert.deepEqual(withMark.highlights, [{ handle: 'ava', href: 'https://x.com/ava', until: highlightNow + 60_000 }]);
assert.ok(!withMark.nodes.some((node) => node.handle === 'ava'));
assert.equal(JSON.stringify(withMark.highlights).includes('x1'), false);
assert.equal(JSON.stringify(withMark).includes('11111111111111111111111111111111'), false);
const emptyRingMark = buildSnapshot({ rpcError: 'rpc_unavailable', highlights: marked.rows, now: highlightNow });
assert.equal(emptyRingMark.holdersLoaded, false);
assert.equal(emptyRingMark.rings[1].empty, true);
assert.equal(emptyRingMark.rings[1].reason, 'rpc_unavailable');
assert.deepEqual(emptyRingMark.highlights, [{ handle: 'ava', href: 'https://x.com/ava', until: highlightNow + 60_000 }]);
assert.ok(!emptyRingMark.nodes.some((node) => node.kind === 'wallet'));
assert.deepEqual(dropGraphHighlight(marked.rows, { xId: 'x1' }).rows, {});
assert.deepEqual(pruneGraphHighlights({ x1: { handle: 'ava', until: highlightNow } }, highlightNow), {});

const none = buildSnapshot({ holders: [] });
assert.equal(none.rings[1].empty, true);
assert.equal(none.rings[1].reason, 'no_accounts');
assert.equal(none.holdersLoaded, true);
assert.ok(none.nodes.some((node) => node.id === pair));

const wallet = '11111111111111111111111111111111';
const live = buildSnapshot({
  jup: { launchpad: 'pump.fun', graduatedPool: pair },
  holders: [{ id: wallet, kind: 'wallet', ring: 1, uiAmount: 3, uiAmountString: '3' }],
  transfers: [{ source: wallet, target: pair, kind: 'transfer', signature: 'sig', uiAmountString: '1' }],
  dex: { priceUsd: '0.01', liquidityUsd: 10, quote: wsol },
  supply: { uiAmount: 999830000, uiAmountString: '999830000' },
});
assert.ok(live.nodes.some((node) => node.id === wallet && node.hot === true));
assert.ok(live.nodes.some((node) => node.id === pair && node.role === 'pair'));
assert.ok(live.nodes.some((node) => node.id === wsol && node.role === 'token'));
assert.ok(!live.nodes.some((node) => node.id === 'pump.fun'));
assert.ok(live.links.some((link) => link.kind === 'hold' && link.target === wallet));
assert.ok(live.pulses.some((pulse) => pulse.signature === 'sig' && pulse.source === wallet));
assert.equal(live.rings[1].empty, false);
assert.equal(live.dex.priceUsd, '0.01');
assert.equal(live.supply.uiAmountString, '999830000');

const hopsOnly = buildSnapshot({
  holdersLoaded: false,
  rpcError: 'rpc_unavailable',
  transfers: [{ source: wallet, target: pair, kind: 'transfer', signature: 'pair-sig' }],
});
assert.equal(hopsOnly.holdersLoaded, false);
assert.equal(hopsOnly.rings[1].reason, 'rpc_unavailable');
assert.ok(hopsOnly.nodes.some((node) => node.id === wallet && node.role === 'wallet'));
assert.ok(hopsOnly.pulses.some((pulse) => pulse.signature === 'pair-sig'));

const tx = {
  meta: {
    err: null,
    preTokenBalances: [{ accountIndex: 1, mint, owner: wallet }],
    postTokenBalances: [{ accountIndex: 2, mint, owner: pair }],
    innerInstructions: [],
  },
  transaction: {
    signatures: ['sig1'],
    message: {
      accountKeys: [mint, 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', pair],
      instructions: [{
        program: 'spl-token',
        parsed: {
          type: 'transferChecked',
          info: {
            source: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            destination: pair,
            mint,
            tokenAmount: { uiAmount: 2, uiAmountString: '2' },
          },
        },
      }],
    },
  },
};
const edges = parseMintTransfers(tx, mint);
assert.equal(edges.length, 1);
assert.equal(edges[0].source, wallet);
assert.equal(edges[0].target, pair);
assert.equal(edges[0].uiAmountString, '2');

assert.deepEqual(buildExpand({ owner: wallet, holdings: [] }), {
  id: wallet,
  empty: true,
  reason: 'no_other_holdings',
  nodes: [],
  links: [],
});

resetGraphCache();
const rpc429 = async (url) => {
  if (String(url).includes('lite-api.jup.ag')) {
    return new Response(JSON.stringify([{ id: mint, name: 'dash_eats', symbol: 'dasha' }]), { status: 200 });
  }
  if (String(url).includes('dexscreener.com')) {
    return new Response(JSON.stringify({
      pair: { chainId: 'solana', pairAddress: pair, priceUsd: '0.02', liquidity: { usd: 50 }, volume: { h24: 9 }, fdv: 200 },
    }), { status: 200 });
  }
  return new Response('rate limited', { status: 429, headers: { 'Retry-After': '0' } });
};
const snap = await fetchGraphSnapshot({}, { fetchImpl: rpc429, now: 1, endpoints: ['https://api.mainnet-beta.solana.com'] });
assert.equal(snap.nodes[0].id, mint);
assert.equal(snap.nodes[0].symbol, 'dasha');
assert.ok(snap.nodes.some((node) => node.id === pair));
assert.equal(snap.rings[1].empty, true);
assert.equal(snap.rings[1].reason, 'rpc_unavailable');
assert.equal(snap.holdersLoaded, false);
assert.ok(!snap.nodes.some((node) => node.kind === 'wallet'));
assert.equal(snap.dex.priceUsd, '0.02');
assert.equal(snap.dex.liquidityUsd, 50);

resetGraphCache();
const methods = [];
const mixed = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('lite-api.jup.ag')) {
    return new Response(JSON.stringify([{ id: mint, symbol: 'dasha' }]), { status: 200 });
  }
  if (u.includes('dexscreener.com')) {
    return new Response(JSON.stringify({ pair: { chainId: 'solana', pairAddress: pair, priceUsd: '0.03' } }), { status: 200 });
  }
  const body = JSON.parse(init.body || '{}');
  methods.push(body.method);
  if (body.method === 'getTokenLargestAccounts') {
    return new Response('rate limited', { status: 429, headers: { 'Retry-After': '0' } });
  }
  if (body.method === 'getTokenSupply') {
    return new Response(JSON.stringify({ result: { value: { uiAmount: 999830000, uiAmountString: '999830000' } } }), { status: 200 });
  }
  if (body.method === 'getSignaturesForAddress') {
    assert.equal(body.params[0], pair);
    assert.equal(body.params[1].limit, 20);
    return new Response(JSON.stringify({ result: [{ signature: 'sig1', err: null }] }), { status: 200 });
  }
  if (body.method === 'getTransaction') {
    return new Response(JSON.stringify({ result: tx }), { status: 200 });
  }
  return new Response(JSON.stringify({ error: { message: 'no' } }), { status: 200 });
};
const hopSnap = await fetchGraphSnapshot({}, { fetchImpl: mixed, now: 50_000, endpoints: ['https://api.mainnet-beta.solana.com'] });
assert.equal(hopSnap.holdersLoaded, false);
assert.equal(hopSnap.rings[1].reason, 'rpc_unavailable');
assert.ok(hopSnap.nodes.some((node) => node.id === wallet && node.role === 'wallet'));
assert.ok(hopSnap.pulses.some((pulse) => pulse.signature === 'sig1'));
assert.equal(hopSnap.supply.uiAmountString, '999830000');
assert.ok(methods.includes('getSignaturesForAddress'));
assert.ok(methods.includes('getTokenSupply'));

resetGraphCache();
const expandEmpty = await fetchGraphExpand({}, wallet, {
  now: 1,
  endpoints: ['https://api.mainnet-beta.solana.com'],
  fetchImpl: async () => new Response(JSON.stringify({ result: { value: [] } }), { status: 200 }),
});
assert.equal(expandEmpty.empty, true);
assert.equal(expandEmpty.reason, 'no_other_holdings');

const expandBad = await fetchGraphExpand({}, mint, { now: 1, fetchImpl: async () => { throw new Error('no'); } });
assert.equal(expandBad.reason, 'not_a_wallet');

globalThis.WebSocketRequestResponsePair ||= class WebSocketRequestResponsePair {};
const workerModule = await import('./dasha-lobby-worker.mjs');
for (const host of ['www.getdasha.com', 'lobby.getdasha.com']) {
  for (const method of ['GET', 'HEAD']) {
    const res = await workerModule.default.fetch(new Request(`https://${host}/graph`, { method }), {});
    assert.equal(res.status, 200, `${host} /graph ${method}`);
    assert.equal(res.headers.get('x-dasha-edge'), 'graph');
    const html = await res.text();
    if (method === 'HEAD') assert.equal(html, '');
    else {
      assert.match(html, /\$DASHA <em>GRAPH<\/em>/);
      assert.match(html, /Public chain\. Addresses, not people\. Not endorsement\./);
      assert.match(html, />Follow latest</);
      assert.match(html, new RegExp(mint));
    }
  }
  const hold = await workerModule.default.fetch(new Request(`https://${host}/simp/hold`), {});
  assert.equal(hold.status, 501);
  assert.equal((await hold.json()).error, 'not_configured');
}

resetGraphCache();
await fetchGraphSnapshot({}, { fetchImpl: rpc429, now: 1, endpoints: ['https://api.mainnet-beta.solana.com'] });
const api = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/api/graph'), {});
assert.equal(api.status, 200);
assert.match(api.headers.get('cache-control') || '', /s-maxage=90/);
const body = await api.json();
assert.equal(body.mint, mint);
assert.equal(body.pair, pair);
assert.equal(body.rings[1].empty, true);
assert.equal(body.rings[1].reason, 'rpc_unavailable');
assert.deepEqual(body.highlights, []);
assert.ok(!JSON.stringify(body).includes('demo'));
assert.ok(!JSON.stringify(body.highlights).includes('xId'));
assert.ok(!JSON.stringify(body.highlights).includes('wallet'));

const { createSessionToken } = await import('./dasha-lobby-x.mjs');
const { DashaLobby } = workerModule;
const rows = new Map();
const state = {
  storage: {
    get: async (key) => rows.get(key),
    put: async (key, value) => {
      if (key && typeof key === 'object') {
        for (const [name, item] of Object.entries(key)) rows.set(name, item);
        return;
      }
      rows.set(key, value);
    },
    delete: async (key) => rows.delete(key),
    getAlarm: async () => 1,
    setAlarm: async () => {},
  },
  setWebSocketAutoResponse() {},
  blockConcurrencyWhile(fn) { this.ready = fn(); },
};
const env = {
  LOBBY_SESSION_SECRET: 'graph-highlight-test-secret',
  ALLOWED_ORIGINS: 'https://www.getdasha.com,https://getdasha.com,https://lobby.getdasha.com',
};
const room = new DashaLobby(state, env);
await state.ready;
const sessionToken = await createSessionToken(env, { xId: 'x1', handle: 'ava' });
const graphPost = (path, body, { cookie = sessionToken, origin = 'https://www.getdasha.com' } = {}) => room.fetch(new Request(`https://lobby.getdasha.com${path}`, {
  method: 'POST',
  headers: {
    ...(origin ? { Origin: origin } : {}),
    ...(cookie ? { Cookie: `__Host-dasha_x=${cookie}` } : {}),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
}));

const noX = await graphPost('/api/graph/highlight', {}, { cookie: '' });
assert.equal(noX.status, 401);
assert.equal((await noX.json()).error, 'link X first');

const noXChallenge = await graphPost('/api/graph/wallet/challenge', { publicKey: '11111111111111111111111111111111' }, { cookie: '' });
assert.equal(noXChallenge.status, 401);
assert.equal((await noXChallenge.json()).error, 'link X first');

const boardGate = await graphPost('/simp/wallet/challenge', { publicKey: '11111111111111111111111111111111' });
assert.equal(boardGate.status, 401);
assert.equal((await boardGate.json()).error, 'join board first');

const proofAddress = '11111111111111111111111111111111';
const challengeRes = await graphPost('/api/graph/wallet/challenge', { publicKey: proofAddress });
assert.equal(challengeRes.status, 200);
const challenge = await challengeRes.json();
assert.match(challenge.message, /graph-highlight/);
assert.match(challenge.message, /Wallet is not retained/);
assert.equal(rows.has('graphHolder:x1'), true);

const keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
const rawPub = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
const toBase58 = (bytes) => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = BigInt(`0x${Buffer.from(bytes).toString('hex')}`);
  let out = '';
  while (value) {
    out = alphabet[Number(value % 58n)] + out;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte) break;
    out = `1${out}`;
  }
  return out || '1';
};
const signedAddress = toBase58(rawPub);
const signedChallenge = await (await graphPost('/api/graph/wallet/challenge', { publicKey: signedAddress })).json();
const signedBytes = new Uint8Array(await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(signedChallenge.message)));
const verifyBody = { challenge: signedChallenge.challenge, publicKey: signedAddress, signature: toBase58(signedBytes) };

const nativeFetch = globalThis.fetch;
globalThis.fetch = async () => Response.json({ result: { value: [] } });
try {
  const noHold = await graphPost('/api/graph/highlight', verifyBody);
  assert.equal(noHold.status, 400);
  assert.equal((await noHold.json()).error, 'wallet does not currently hold $dasha');
  assert.deepEqual(publicHighlights(room.graphHighlights), []);
} finally {
  globalThis.fetch = nativeFetch;
}

const retryChallenge = await (await graphPost('/api/graph/wallet/challenge', { publicKey: signedAddress })).json();
const retryBytes = new Uint8Array(await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(retryChallenge.message)));
const retryBody = { challenge: retryChallenge.challenge, publicKey: signedAddress, signature: toBase58(retryBytes) };
globalThis.fetch = async () => Response.json({
  result: { value: [{ account: { data: { parsed: { info: { owner: signedAddress, mint, tokenAmount: { amount: '1' } } } } } }] },
});
try {
  const ok = await graphPost('/api/graph/highlight', retryBody);
  assert.equal(ok.status, 200);
  const okBody = await ok.json();
  assert.equal(okBody.ok, true);
  assert.equal(okBody.highlight.handle, 'ava');
  assert.equal(okBody.highlight.href, 'https://x.com/ava');
  assert.ok(Number(okBody.highlight.until) > Date.now());
  assert.equal(JSON.stringify(okBody).includes(signedAddress), false);
  assert.equal(JSON.stringify(okBody).includes('x1'), false);
  assert.equal(JSON.stringify(okBody).includes('wallet'), false);
  assert.deepEqual(okBody.highlights.map((row) => row.handle), ['ava']);
} finally {
  globalThis.fetch = nativeFetch;
}

resetGraphCache();
globalThis.fetch = rpc429;
let mergedBody;
try {
  const merged = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/api/graph'), {
    LOBBY: { idFromName: () => 'public', get: () => room },
  });
  assert.equal(merged.status, 200);
  mergedBody = await merged.json();
} finally {
  globalThis.fetch = nativeFetch;
}
assert.equal(mergedBody.mint, mint);
assert.equal(mergedBody.pair, pair);
assert.ok(mergedBody.nodes.some((node) => node.id === mint));
assert.ok(mergedBody.nodes.some((node) => node.id === pair));
assert.equal(mergedBody.holdersLoaded, false);
assert.equal(mergedBody.rings[1].empty, true);
assert.equal(mergedBody.rings[1].reason, 'rpc_unavailable');
assert.ok(!mergedBody.nodes.some((node) => node.kind === 'wallet' || node.role === 'wallet'));
assert.deepEqual(mergedBody.highlights.map((row) => row.handle), ['ava']);
assert.equal(JSON.stringify(mergedBody.highlights).includes('x1'), false);
assert.equal(JSON.stringify(mergedBody).includes(signedAddress), false);

room.simpProfiles.x1 = { xId: 'x1', handle: 'ava', enrolledAt: Date.now(), awards: [] };
const left = await graphPost('/simp/leave', {});
assert.equal(left.status, 200);
assert.deepEqual(publicHighlights(room.graphHighlights), []);
assert.equal(rows.has('graphHighlights') ? Object.keys(rows.get('graphHighlights') || {}).length : 0, 0);

room.graphHighlights = { x1: { handle: 'ava', href: 'https://x.com/ava', until: Date.now() + 60_000, checkedAt: Date.now() } };
await room.persistGraphHighlights();
const unlinked = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/logout', {
  method: 'POST',
  headers: { Origin: 'https://www.getdasha.com', Cookie: `__Host-dasha_x=${sessionToken}` },
}), {
  ...env,
  X_CLIENT_ID: 'test',
  X_CLIENT_SECRET: 'test',
  LOBBY: { idFromName: () => 'public', get: () => room },
});
assert.equal(unlinked.status, 200);
assert.deepEqual(publicHighlights(room.graphHighlights), []);

room.graphHighlights = { x1: { handle: 'ava', href: 'https://x.com/ava', until: Date.now() - 1, checkedAt: Date.now() - 2 } };
const expiredList = await room.fetch(new Request('https://lobby.getdasha.com/api/graph/highlights'));
assert.deepEqual((await expiredList.json()).highlights, []);
assert.deepEqual(room.graphHighlights, {});

const stillHold = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/simp/hold'), {});
assert.equal(stillHold.status, 501);
assert.equal((await stillHold.json()).error, 'not_configured');

console.log('dasha-graph: PASS');
