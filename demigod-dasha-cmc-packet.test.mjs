#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DASHA_CANONICAL,
  FORM_ANSWERS,
  buildUrls,
  extractMintFromHtml,
  pageContainsCanonicalMint,
  scanHowToBuyHtml,
  evaluateConsistencyGate,
  buildEvidencePacket,
  renderPacketMarkdown,
  buildSubmissionRecord,
  writePacketArtifacts,
  fetchOnChainSupply,
  fetchCoinGeckoRecord,
  fetchPoolEvidence,
  fetchWebsiteIdentity,
  fetchHowToBuyPage,
  fetchFaucetPage,
  probeCmcMintSearch,
  buildPacket,
} from './demigod-dasha-cmc-packet.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MINT = DASHA_CANONICAL.mint;
const fixture = (name) => path.join(ROOT, 'fixtures', name);

function mockFetch(routes) {
  return async (url, init = {}) => {
    const key = typeof url === 'string' ? url : String(url);
    for (const [pattern, handler] of routes) {
      if (key.includes(pattern)) return handler(key, init);
    }
    throw new Error(`unexpected_fetch:${key}`);
  };
}

function rpcMock() {
  return async (_url, init = {}) => {
    const body = JSON.parse(String(init.body || '{}'));
    if (body.method === 'getAccountInfo') {
      return {
        ok: true,
        async json() {
          return {
            result: {
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
          return { result: { value: { amount: '999831827594169', uiAmountString: '999831827.594169' } } };
        },
      };
    }
    throw new Error(`unexpected_rpc:${body.method}`);
  };
}

async function fullPacketMocks({ faucetHtml = 'dasha-faucet-no-h1.html', howToBuyHtml = 'dasha-how-to-buy-clean.html' } = {}) {
  const [home, howToBuy, faucet] = await Promise.all([
    readFile(fixture('dasha-home.html'), 'utf8'),
    readFile(fixture(howToBuyHtml), 'utf8'),
    readFile(fixture(faucetHtml), 'utf8'),
  ]);
  return mockFetch([
    ['api.mainnet-beta.solana.com', rpcMock()],
    ['api.coingecko.com', async () => ({
      ok: true,
      async json() {
        return {
          id: 'dash_eats',
          name: 'dash_eats',
          symbol: 'dasha',
          platforms: { solana: MINT },
          links: { homepage: ['https://www.getdasha.com'], repos_url: { github: [] } },
          market_cap_rank: 3101,
          preview_listing: false,
        };
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
              base_token: { data: { id: `solana_${MINT}` } },
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
    ['coinmarketcap.com/dexscan', async () => ({
      ok: false,
      status: 302,
      headers: { get: () => 'https://coinmarketcap.com/dexscan/solana/example/' },
    })],
  ]);
}

test('canonical identity matches issue #109', () => {
  assert.equal(DASHA_CANONICAL.coingeckoId, 'dash_eats');
  assert.equal(DASHA_CANONICAL.pair, '9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7');
  assert.equal(DASHA_CANONICAL.representativeEmail, 'potter@trydemigod.com');
  assert.match(buildUrls().coingecko, /\/coins\/dash_eats$/);
  assert.match(buildUrls().solscan, new RegExp(MINT));
});

test('form answers include required CMC copy', () => {
  assert.match(FORM_ANSWERS.projectDescription, /getdasha\.com/);
  assert.match(FORM_ANSWERS.differentiator, /open-source/);
  assert.match(FORM_ANSWERS.collisionNote, /full Solana mint/);
  assert.match(FORM_ANSWERS.requesterRelationship, /Official project representative/);
});

test('extractMintFromHtml finds canonical mint only once per occurrence set', () => {
  const html = `<p>${MINT}</p><p>${MINT}</p><p>other</p>`;
  assert.deepEqual(extractMintFromHtml(html), [MINT]);
  assert.equal(pageContainsCanonicalMint(html), true);
  assert.equal(pageContainsCanonicalMint('<p>wrong</p>'), false);
});

test('scanHowToBuyHtml flags confusing third-party copy from fixture', async () => {
  const clean = await readFile(fixture('dasha-how-to-buy-clean.html'), 'utf8');
  const confusing = await readFile(fixture('dasha-how-to-buy-confusing.html'), 'utf8');
  const ok = scanHowToBuyHtml(clean);
  const bad = scanHowToBuyHtml(confusing);
  assert.equal(ok.stableForReviewers, true);
  assert.equal(ok.hasH1, true);
  assert.equal(bad.stableForReviewers, false);
  assert.ok(bad.confusingThirdPartyCopy.length > 0);
});

test('evaluateConsistencyGate passes when identity and production checks agree', () => {
  const gate = evaluateConsistencyGate({
    coingecko: { mint: MINT },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true, mintsFound: [MINT] },
    howToBuy: { hasCanonicalMint: true, confusingThirdPartyCopy: [], stableForReviewers: true, source: 'https://www.getdasha.com/how-to-buy' },
    faucet: { hasH1: true, source: 'https://www.getdasha.com/faucet' },
  });
  assert.equal(gate.pass, true);
  assert.equal(gate.identityPass, true);
  assert.equal(gate.productionPass, true);
  assert.equal(gate.checks.length, 7);
});

test('evaluateConsistencyGate fails faucet_h1 while identity may still pass', () => {
  const gate = evaluateConsistencyGate({
    coingecko: { mint: MINT },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true, mintsFound: [MINT] },
    howToBuy: { hasCanonicalMint: true, confusingThirdPartyCopy: [], stableForReviewers: true },
    faucet: { hasH1: false, source: 'https://www.getdasha.com/faucet' },
  });
  assert.equal(gate.pass, false);
  assert.equal(gate.identityPass, true);
  assert.equal(gate.productionPass, false);
  assert.equal(gate.checks.find((row) => row.id === 'faucet_h1').pass, false);
});

test('evaluateConsistencyGate fails on mint mismatch', () => {
  const gate = evaluateConsistencyGate({
    coingecko: { mint: 'wrongmint' },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true, mintsFound: [MINT] },
    howToBuy: { hasCanonicalMint: true, confusingThirdPartyCopy: [], stableForReviewers: true },
    faucet: { hasH1: true },
  });
  assert.equal(gate.pass, false);
  assert.equal(gate.identityPass, false);
  assert.equal(gate.checks.find((row) => row.id === 'coingecko_mint').pass, false);
});

test('buildEvidencePacket includes nine evidence sections and draft form answers', () => {
  const gate = evaluateConsistencyGate({
    coingecko: { mint: MINT },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true },
    howToBuy: { hasCanonicalMint: true, confusingThirdPartyCopy: [], stableForReviewers: true },
    faucet: { hasH1: false, source: 'https://www.getdasha.com/faucet' },
  });
  const packet = buildEvidencePacket({
    at: '2026-09-02T06:00:00.000Z',
    onchain: {
      decimals: 6,
      totalSupplyUi: '999831827.594169',
      mintAuthority: null,
      freezeAuthority: null,
      source: 'rpc',
    },
    coingecko: { name: 'dash_eats', symbol: 'dasha', mint: MINT, marketCapRank: 3101 },
    pool: {
      baseMint: MINT,
      poolCreatedAt: '2025-02-03T15:29:15Z',
      liquidityUsd: '102240.9179',
      volume24hUsd: '82190.7930234802',
      fdvUsd: '747101.115474975',
      source: 'gecko',
    },
    website: { title: '$dasha', hasCanonicalMint: true, mintsFound: [MINT] },
    howToBuy: { stableForReviewers: true, hasCanonicalMint: true, confusingThirdPartyCopy: [] },
    faucet: { hasH1: false, source: 'https://www.getdasha.com/faucet' },
    cmcProbe: { status: 302, source: 'https://coinmarketcap.com/dexscan/solana/' },
    gate,
  });

  assert.equal(packet.schema, 'demigod.dasha-cmc-packet/1');
  assert.equal(packet.costLane, 'free');
  assert.equal(packet.formAnswers.contractMint, MINT);
  assert.equal(packet.productionGate.pass, false);
  assert.equal(packet.reviewerRouting.useStablePage, true);
  assert.equal(packet.reviewerRouting.reason, 'faucet_missing_h1');
  assert.equal(packet.submission.submitted, false);
});

test('renderPacketMarkdown includes mint, gate, and form sections', () => {
  const gate = evaluateConsistencyGate({
    coingecko: { mint: MINT },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true },
    howToBuy: { hasCanonicalMint: true, confusingThirdPartyCopy: [], stableForReviewers: true },
    faucet: { hasH1: true },
  });
  const packet = buildEvidencePacket({
    at: '2026-09-02T06:00:00.000Z',
    onchain: { decimals: 6, totalSupplyUi: '1', mintAuthority: null, freezeAuthority: null, source: 'rpc' },
    coingecko: { name: 'dash_eats', symbol: 'dasha', mint: MINT },
    pool: { baseMint: MINT, poolCreatedAt: '2025-02-03T15:29:15Z', source: 'gecko' },
    website: { title: '$dasha', hasCanonicalMint: true },
    howToBuy: { stableForReviewers: true, hasCanonicalMint: true, confusingThirdPartyCopy: [] },
    faucet: { hasH1: true },
    cmcProbe: { status: 302 },
    gate,
  });
  const md = renderPacketMarkdown(packet);
  assert.match(md, new RegExp(MINT));
  assert.match(md, /Consistency gate/);
  assert.match(md, /CoinGecko/);
  assert.match(md, /Project description/);
});

test('fetchOnChainSupply parses rpc responses', async () => {
  const supply = await fetchOnChainSupply(rpcMock());
  assert.equal(supply.decimals, 6);
  assert.equal(supply.totalSupplyUi, '999831827.594169');
  assert.equal(supply.mintAuthority, null);
});

test('fetchCoinGeckoRecord maps dash_eats identity', async () => {
  const fetchImpl = mockFetch([
    ['api.coingecko.com', async () => ({
      ok: true,
      async json() {
        return {
          id: 'dash_eats',
          name: 'dash_eats',
          symbol: 'dasha',
          platforms: { solana: MINT },
          links: {
            homepage: ['https://www.getdasha.com'],
            twitter_screen_name: 'dash_eats',
            repos_url: { github: ['https://github.com/Uuriko/dasha-desk'] },
          },
          market_cap_rank: 3101,
          preview_listing: false,
        };
      },
    })],
  ]);
  const record = await fetchCoinGeckoRecord(fetchImpl);
  assert.equal(record.id, 'dash_eats');
  assert.equal(record.mint, MINT);
  assert.equal(record.marketCapRank, 3101);
});

test('fetchPoolEvidence reads canonical Raydium pair', async () => {
  const fetchImpl = mockFetch([
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
              base_token: { data: { id: `solana_${MINT}` } },
              dex: { data: { id: 'raydium' } },
            },
          },
        };
      },
    })],
  ]);
  const pool = await fetchPoolEvidence(fetchImpl);
  assert.equal(pool.baseMint, MINT);
  assert.equal(pool.dex, 'raydium');
  assert.equal(pool.poolCreatedAt, '2025-02-03T15:29:15Z');
});

test('fetchWebsiteIdentity parses title, description, and mint from fixture', async () => {
  const html = await readFile(fixture('dasha-home.html'), 'utf8');
  const fetchImpl = mockFetch([
    ['www.getdasha.com', async () => ({ ok: true, text: async () => html })],
  ]);
  const site = await fetchWebsiteIdentity(fetchImpl);
  assert.equal(site.title, '$dasha');
  assert.match(site.description, /dash_eats/);
  assert.equal(site.hasCanonicalMint, true);
});

test('fetchHowToBuyPage uses scanHowToBuyHtml on fixture HTML', async () => {
  const html = await readFile(fixture('dasha-how-to-buy-clean.html'), 'utf8');
  const fetchImpl = mockFetch([
    ['how-to-buy', async () => ({ ok: true, text: async () => html })],
  ]);
  const page = await fetchHowToBuyPage(fetchImpl);
  assert.equal(page.hasCanonicalMint, true);
  assert.equal(page.stableForReviewers, true);
});

test('fetchFaucetPage reports missing H1 from fixture', async () => {
  const html = await readFile(fixture('dasha-faucet-no-h1.html'), 'utf8');
  const fetchImpl = mockFetch([
    ['/faucet', async () => ({ ok: true, text: async () => html })],
  ]);
  const faucet = await fetchFaucetPage(fetchImpl);
  assert.equal(faucet.hasH1, false);
  assert.match(faucet.issue, /issues\/77/);
});

test('probeCmcMintSearch records redirect status without following', async () => {
  const fetchImpl = mockFetch([
    ['coinmarketcap.com/dexscan', async () => ({
      status: 302,
      headers: { get: () => 'https://coinmarketcap.com/dexscan/solana/example/' },
    })],
  ]);
  const probe = await probeCmcMintSearch(fetchImpl);
  assert.equal(probe.status, 302);
  assert.match(probe.source, /dexscan\/solana/);
  assert.match(probe.note, /duplicate/);
});

test('buildPacket assembles mocked evidence and gates faucet H1', async () => {
  const fetchImpl = await fullPacketMocks();
  const packet = await buildPacket(fetchImpl);
  assert.equal(packet.evidence.mintAndExplorer.mint, MINT);
  assert.equal(packet.consistencyGate.identityPass, true);
  assert.equal(packet.consistencyGate.productionPass, false);
  assert.equal(packet.reviewerRouting.useStablePage, true);
  assert.equal(packet.cmcMintProbe.status, 302);
});

test('buildPacket passes production gate when faucet has H1', async () => {
  const fetchImpl = await fullPacketMocks({ faucetHtml: 'dasha-faucet-ok.html' });
  const packet = await buildPacket(fetchImpl);
  assert.equal(packet.consistencyGate.pass, true);
  assert.equal(packet.productionGate.pass, true);
  assert.equal(packet.reviewerRouting.useStablePage, false);
});

test('buildSubmissionRecord tracks unsubmitted CMC state', () => {
  const gate = evaluateConsistencyGate({
    coingecko: { mint: MINT },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true },
    howToBuy: { hasCanonicalMint: true, confusingThirdPartyCopy: [], stableForReviewers: true },
    faucet: { hasH1: false },
  });
  const packet = buildEvidencePacket({
    at: '2026-09-02T06:00:00.000Z',
    onchain: { decimals: 6, totalSupplyUi: '1', source: 'rpc' },
    coingecko: { mint: MINT },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true },
    howToBuy: { stableForReviewers: true, hasCanonicalMint: true, confusingThirdPartyCopy: [] },
    faucet: { hasH1: false },
    cmcProbe: { status: 302 },
    gate,
  });
  const record = buildSubmissionRecord(packet);
  assert.equal(record.submitted, false);
  assert.equal(record.confirmationId, null);
  assert.equal(record.identityPass, true);
  assert.equal(record.productionPass, false);
  assert.match(record.issueUrl, /issues\/109/);
});

test('writePacketArtifacts writes markdown and submission record', async (context) => {
  const { mkdtemp, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const dir = await mkdtemp(path.join(tmpdir(), 'dasha-packet-'));
  context.after(() => rm(dir, { recursive: true, force: true }));
  const gate = evaluateConsistencyGate({
    coingecko: { mint: MINT },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true },
    howToBuy: { hasCanonicalMint: true, confusingThirdPartyCopy: [], stableForReviewers: true },
    faucet: { hasH1: true },
  });
  const packet = buildEvidencePacket({
    at: '2026-09-02T06:00:00.000Z',
    onchain: { decimals: 6, totalSupplyUi: '1', source: 'rpc' },
    coingecko: { mint: MINT },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true },
    howToBuy: { stableForReviewers: true, hasCanonicalMint: true, confusingThirdPartyCopy: [] },
    faucet: { hasH1: true },
    cmcProbe: { status: 302 },
    gate,
  });
  const { target, recordPath } = writePacketArtifacts(packet, path.join(dir, 'packet.md'));
  const md = await readFile(target, 'utf8');
  const record = JSON.parse(await readFile(recordPath, 'utf8'));
  assert.match(md, /CoinMarketCap application packet/);
  assert.equal(record.submitted, false);
});

test('CLI syntax check passes', () => {
  const result = spawnSync(process.execPath, ['--check', path.join(ROOT, 'demigod-dasha-cmc-packet.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('CLI rejects unknown subcommand', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'demigod-dasha-cmc-packet.mjs'), 'nope'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /usage:/);
});
