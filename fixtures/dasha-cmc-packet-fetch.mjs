import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DASHA_CANONICAL } from '../demigod-dasha-cmc-packet.mjs';

const METAPLEX_JSON_URI = 'https://ipfs.io/ipfs/dasha-test-metadata';

function metaplexAssetResult(mint) {
  return {
    id: mint,
    mutable: false,
    content: {
      metadata: { name: 'dash_eats', symbol: 'dasha' },
      json_uri: METAPLEX_JSON_URI,
      links: { image: 'https://ipfs.io/ipfs/dasha-test-image' },
    },
  };
}

function rpcMock(mint, { slot = 12345 } = {}) {
  return async (_url, init = {}) => {
    const body = JSON.parse(String(init.body || '{}'));
    if (body.method === 'getAccountInfo') {
      return {
        ok: true,
        async json() {
          return {
            result: {
              context: { slot },
              value: {
                data: {
                  parsed: {
                    info: {
                      decimals: 6,
                      mintAuthority: null,
                      freezeAuthority: null,
                      isInitialized: true,
                    },
                  },
                },
              },
            },
          };
        },
      };
    }
    if (body.method === 'getTokenSupply') {
      return {
        ok: true,
        async json() {
          return {
            result: {
              context: { slot },
              value: { amount: '999831827594169', uiAmountString: '999831827.594169' },
            },
          };
        },
      };
    }
    if (body.method === 'getAsset') {
      return {
        ok: true,
        async json() {
          return { result: metaplexAssetResult(mint) };
        },
      };
    }
    throw new Error(`unexpected_rpc:${body.method}`);
  };
}

export async function createPacketFixtureFetch({
  root,
  mint = DASHA_CANONICAL.mint,
  pair = DASHA_CANONICAL.pair,
  faucetHtml = 'dasha-faucet-no-h1.html',
  howToBuyHtml = 'dasha-how-to-buy-clean.html',
} = {}) {
  const fixture = (name) => path.join(root, 'fixtures', name);
  const [home, howToBuy, faucet] = await Promise.all([
    readFile(fixture('dasha-home.html'), 'utf8'),
    readFile(fixture(howToBuyHtml), 'utf8'),
    readFile(fixture(faucetHtml), 'utf8'),
  ]);

  const routes = [
    ['api.mainnet-beta.solana.com', rpcMock(mint)],
    ['api.coingecko.com', async () => ({
      ok: true,
      async json() {
        return {
          id: 'dash_eats',
          name: 'dash_eats',
          symbol: 'dasha',
          platforms: { solana: mint },
          links: { homepage: ['https://www.getdasha.com'], repos_url: { github: [] } },
          market_cap_rank: 3101,
          preview_listing: false,
        };
      },
    })],
    ['lite-api.jup.ag', async () => ({
      ok: true,
      async json() {
        return [{
          id: mint,
          name: 'dash_eats',
          symbol: 'dasha',
          holderCount: 1302,
          graduatedPool: pair,
          twitter: 'https://x.com/dash_eats',
          isVerified: true,
          tags: ['launchpad', 'verified'],
        }];
      },
    })],
    ['geckoterminal.com', async () => ({
      ok: true,
      async json() {
        return {
          data: {
            attributes: {
              pool_name: 'dasha / SOL',
              pool_created_at: '2025-02-03T15:29:15Z',
              reserve_in_usd: '102240.9179',
              volume_usd: { h24: '82190.79' },
              fdv_usd: '747101.11',
            },
            relationships: {
              base_token: { data: { id: `solana_${mint}` } },
              dex: { data: { id: 'raydium' } },
            },
          },
        };
      },
    })],
    ['www.getdasha.com/how-to-buy', async () => ({ ok: true, text: async () => howToBuy })],
    ['www.getdasha.com/faucet', async () => ({ ok: true, text: async () => faucet })],
    ['www.getdasha.com', async (key) => {
      if (key.includes('/how-to-buy') || key.includes('/faucet')) throw new Error(`leaked:${key}`);
      return { ok: true, text: async () => home };
    }],
    ['x.com/dash_eats', async () => ({ ok: true, status: 200 })],
    ['coinmarketcap.com/dexscan', async () => ({
      status: 302,
      headers: { get: () => null },
    })],
    ['verified.jup.ag/tokens', async () => ({ ok: true, status: 200 })],
    ['ipfs.io/ipfs/dasha-test-metadata', async () => ({
      ok: true,
      async json() {
        return {
          name: 'dash_eats',
          symbol: 'dasha',
          image: 'https://ipfs.io/ipfs/dasha-test-image',
        };
      },
    })],
  ];

  return async (url, init = {}) => {
    const key = typeof url === 'string' ? url : String(url);
    for (const [pattern, handler] of routes) {
      if (key.includes(pattern)) return handler(key, init);
    }
    throw new Error(`unexpected_fetch:${key}`);
  };
}
