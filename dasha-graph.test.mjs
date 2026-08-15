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
assert.match(page, new RegExp(`<code id="mint">${mint}</code>`));
assert.doesNotMatch(page, /MINT\.slice|ellipsis|…pump/);
assert.match(page, /cdn\.jsdelivr\.net\/npm\/3d-force-graph@1\.80\.0\/dist\/3d-force-graph\.min\.js/);
assert.match(page, /lobby\.getdasha\.com\/client\/graph\.js/);
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
assert.match(client, /holders unavailable — retry/);
assert.doesNotMatch(client, /autoRotate|auto-orbit|autoOrbit/);
assert.doesNotMatch(modSrc, /getProgramAccounts/);
assert.doesNotMatch(modSrc + worker + wrangler, /HELIUS|BIRDEYE|SOLSCAN_API|SOLSCAN_KEY|HELIUS_API/);
assert.doesNotMatch(wrangler, /GRAPH_|JUPITER_KEY|RPC_KEY/);
assert.ok(modSrc.includes(amm), 'graph pins the shipped Raydium AMM');
assert.match(modSrc, /import \{ MINT, PAIR, WSOL \}/);
assert.ok(modSrc.includes('public, s-maxage=90, stale-while-revalidate=60'));

const {
  buildExpand,
  buildSnapshot,
  collapseOwners,
  fetchGraphExpand,
  fetchGraphSnapshot,
  mintFields,
  mintNode,
  parseMintTransfers,
  parseRetryAfter,
  pickJupiterToken,
  resetGraphCache,
  tagPubkey,
} = await import('./dasha-graph.mjs');

assert.equal(mintNode().id, mint);
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

const owners = collapseOwners([
  { owner: pair, uiAmount: 10, uiAmountString: '10' },
  { owner: pair, uiAmount: 5, uiAmountString: '5' },
  { owner: 'not-an-address', uiAmount: 9 },
]);
assert.equal(owners.length, 1);
assert.equal(owners[0].id, pair);
assert.equal(owners[0].kind, 'pool');
assert.equal(owners[0].uiAmount, 15);

const empty = buildSnapshot({ rpcError: 'rpc_unavailable' });
assert.equal(empty.nodes.length, 1);
assert.equal(empty.nodes[0].id, mint);
assert.equal(empty.rings[1].empty, true);
assert.equal(empty.rings[1].reason, 'rpc_unavailable');
assert.equal(empty.links.length, 0);

const none = buildSnapshot({ holders: [] });
assert.equal(none.rings[1].empty, true);
assert.equal(none.rings[1].reason, 'no_accounts');
assert.equal(none.nodes.length, 1);

const wallet = '11111111111111111111111111111111';
const live = buildSnapshot({
  jup: { launchpad: 'pump.fun', graduatedPool: pair },
  holders: [{ id: wallet, kind: 'wallet', ring: 1, uiAmount: 3, uiAmountString: '3' }],
  transfers: [{ source: wallet, target: mint, kind: 'transfer', signature: 'sig', uiAmountString: '1' }],
});
assert.ok(live.nodes.some((node) => node.id === wallet));
assert.ok(live.nodes.some((node) => node.id === pair && node.ring === 3));
assert.ok(live.nodes.some((node) => node.id === 'pump.fun' && node.label === 'minted on pump.fun'));
assert.ok(live.links.some((link) => link.kind === 'hold' && link.target === wallet));
assert.equal(live.rings[1].empty, false);

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
const rpc429 = async (url, init = {}) => {
  if (String(url).includes('lite-api.jup.ag')) {
    return new Response(JSON.stringify([{ id: mint, name: 'dash_eats', symbol: 'dasha' }]), { status: 200 });
  }
  return new Response('rate limited', { status: 429, headers: { 'Retry-After': '0' } });
};
const snap = await fetchGraphSnapshot({}, { fetchImpl: rpc429, now: 1, endpoints: ['https://api.mainnet-beta.solana.com'] });
assert.equal(snap.nodes[0].id, mint);
assert.equal(snap.nodes[0].symbol, 'dasha');
assert.equal(snap.rings[1].empty, true);
assert.equal(snap.rings[1].reason, 'rpc_unavailable');
assert.ok(!snap.nodes.some((node) => node.kind === 'wallet'));

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
      assert.match(html, new RegExp(mint));
    }
  }
  const hold = await workerModule.default.fetch(new Request(`https://${host}/simp/hold`), {});
  assert.equal(hold.status, 501);
  assert.equal((await hold.json()).error, 'not_configured');
}

resetGraphCache();
const nativeFetch = globalThis.fetch;
globalThis.fetch = rpc429;
try {
  const api = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/api/graph'), {});
  assert.equal(api.status, 200);
  assert.match(api.headers.get('cache-control') || '', /s-maxage=90/);
  const body = await api.json();
  assert.equal(body.mint, mint);
  assert.equal(body.rings[1].empty, true);
  assert.equal(body.rings[1].reason, 'rpc_unavailable');
  assert.ok(!JSON.stringify(body).includes('demo'));
} finally {
  globalThis.fetch = nativeFetch;
}

console.log('dasha-graph: PASS');
