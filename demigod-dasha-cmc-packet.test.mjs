#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DASHA_CANONICAL,
  FORM_ANSWERS,
  MANUAL_READINESS_BLOCKERS,
  buildUrls,
  extractMintFromHtml,
  pageContainsCanonicalMint,
  scanHowToBuyHtml,
  evaluateConsistencyGate,
  evaluateSubmissionReadiness,
  buildEvidencePacket,
  renderPacketMarkdown,
  packetClaimsSubmittable,
  buildSubmissionRecord,
  writePacketArtifacts,
  fetchOnChainSupply,
  fetchCoinGeckoRecord,
  fetchJupiterTokenRecord,
  fetchPoolEvidence,
  fetchWebsiteIdentity,
  fetchHowToBuyPage,
  fetchFaucetPage,
  probeOfficialX,
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

function rpcMock({ slot = 12345 } = {}) {
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
    throw new Error(`unexpected_rpc:${body.method}`);
  };
}

function baseGateInput(overrides = {}) {
  return {
    coingecko: { mint: MINT, name: 'dash_eats', symbol: 'dasha' },
    pool: { baseMint: MINT },
    website: { hasCanonicalMint: true, mintsFound: [MINT] },
    howToBuy: { hasCanonicalMint: true, confusingThirdPartyCopy: [], stableForReviewers: true },
    faucet: { hasH1: true, source: 'https://www.getdasha.com/faucet' },
    jupiter: {
      mint: MINT,
      name: 'dash_eats',
      symbol: 'dasha',
      holderCount: 1302,
      graduatedPool: DASHA_CANONICAL.pair,
      twitter: 'https://x.com/dash_eats',
    },
    xProfile: { reachable: true, status: 200 },
    ...overrides,
  };
}

function basePacketInput(overrides = {}) {
  const gate = evaluateConsistencyGate(baseGateInput(overrides.gateInput));
  return {
    at: '2026-09-02T06:00:00.000Z',
    onchain: {
      decimals: 6,
      totalSupplyUi: '999831827.594169',
      mintAuthority: null,
      freezeAuthority: null,
      slot: 12345,
      commitment: 'finalized',
      source: 'rpc',
    },
    coingecko: { name: 'dash_eats', symbol: 'dasha', mint: MINT, marketCapRank: 3101, capturedAt: '2026-09-02T06:00:00.000Z' },
    jupiter: {
      mint: MINT,
      name: 'dash_eats',
      symbol: 'dasha',
      holderCount: 1302,
      graduatedPool: DASHA_CANONICAL.pair,
      twitter: 'https://x.com/dash_eats',
      source: 'jupiter',
      capturedAt: '2026-09-02T06:00:00.000Z',
    },
    pool: {
      baseMint: MINT,
      poolCreatedAt: '2025-02-03T15:29:15Z',
      liquidityUsd: '102240.9179',
      volume24hUsd: '82190.79',
      source: 'gecko',
      capturedAt: '2026-09-02T06:00:00.000Z',
    },
    website: { title: '$dasha', hasCanonicalMint: true, mintsFound: [MINT] },
    howToBuy: { stableForReviewers: true, hasCanonicalMint: true, confusingThirdPartyCopy: [] },
    faucet: { hasH1: true },
    xProfile: { reachable: true, status: 200 },
    cmcProbe: {
      status: 302,
      source: 'https://coinmarketcap.com/dexscan/solana/',
      duplicateStatusKnown: false,
      note: 'Browser exact-mint search required.',
    },
    gate,
    ...overrides,
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
    ['lite-api.jup.ag', async () => ({
      ok: true,
      async json() {
        return [{
          id: MINT,
          name: 'dash_eats',
          symbol: 'dasha',
          holderCount: 1302,
          graduatedPool: DASHA_CANONICAL.pair,
          twitter: 'https://x.com/dash_eats',
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
    ['x.com/dash_eats', async () => ({ ok: true, status: 200 })],
    ['coinmarketcap.com/dexscan', async () => ({
      status: 302,
      headers: { get: () => null },
    })],
  ]);
}

test('canonical identity matches issue #109', () => {
  assert.equal(DASHA_CANONICAL.coingeckoId, 'dash_eats');
  assert.match(buildUrls().coingecko, /\/coins\/dash_eats$/);
  assert.match(FORM_ANSWERS.projectDescription, /creative tools/);
  assert.doesNotMatch(FORM_ANSWERS.projectDescription, /meme studio/i);
});

test('evaluateSubmissionReadiness keeps manual blockers even when preflight passes', () => {
  const readiness = evaluateSubmissionReadiness({
    gate: { identityPass: true, metadataPass: true },
    cmcProbe: { duplicateStatusKnown: false },
    holderCount: 1302,
    launchDate: null,
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.submittable, false);
  for (const blocker of MANUAL_READINESS_BLOCKERS) {
    assert.ok(readiness.blockers.includes(blocker));
  }
});

test('evaluateSubmissionReadiness fails when launch date auto-filled', () => {
  const readiness = evaluateSubmissionReadiness({
    gate: { identityPass: true, metadataPass: true },
    cmcProbe: { duplicateStatusKnown: false },
    holderCount: 1302,
    launchDate: '2025-02-03T15:29:15Z',
  });
  assert.ok(readiness.blockers.includes('launch_date_auto_filled'));
});

test('evaluateConsistencyGate includes metadata and holder checks', () => {
  const gate = evaluateConsistencyGate(baseGateInput());
  assert.equal(gate.metadataPass, true);
  assert.equal(gate.identityPass, true);
  assert.ok(gate.checks.some((row) => row.id === 'holder_count' && row.pass));
  assert.ok(gate.checks.some((row) => row.id === 'jupiter_mint' && row.pass));
});

test('buildEvidencePacket does not auto-fill launch date', () => {
  const packet = buildEvidencePacket(basePacketInput());
  assert.equal(packet.formAnswers.launchDate, null);
  assert.equal(packet.evidence.marketPair.canonicalPoolCreatedAt, '2025-02-03T15:29:15Z');
  assert.equal(packet.submissionReadiness.ready, false);
  assert.equal(packet.schema, 'demigod.dasha-cmc-packet/2');
});

test('renderPacketMarkdown includes CMC probe limitation and readiness blockers', () => {
  const packet = buildEvidencePacket(basePacketInput());
  const md = renderPacketMarkdown(packet);
  assert.match(md, /partial preflight/i);
  assert.match(md, /CMC duplicate search \(manual required\)/);
  assert.match(md, /Browser exact-mint search/i);
  assert.match(md, /Submission ready: \*\*no\*\*/);
  assert.match(md, /Canonical pool created \(not launch date\)/);
  assert.match(md, /UNRESOLVED — manual/);
  assert.doesNotMatch(md, /meme studio/i);
});

test('packetClaimsSubmittable rejects ready-looking partial packets', () => {
  const packet = buildEvidencePacket(basePacketInput());
  assert.equal(packetClaimsSubmittable(packet), true);
});

test('fetchOnChainSupply records finalized slot context', async () => {
  const supply = await fetchOnChainSupply(rpcMock({ slot: 999 }));
  assert.equal(supply.slot, 999);
  assert.equal(supply.commitment, 'finalized');
});

test('fetchJupiterTokenRecord maps holder count and graduated pool', async () => {
  const fetchImpl = mockFetch([
    ['lite-api.jup.ag', async () => ({
      ok: true,
      async json() {
        return [{
          id: MINT,
          name: 'dash_eats',
          symbol: 'dasha',
          holderCount: 1302,
          graduatedPool: DASHA_CANONICAL.pair,
          twitter: 'https://x.com/dash_eats',
        }];
      },
    })],
  ]);
  const record = await fetchJupiterTokenRecord(fetchImpl);
  assert.equal(record.holderCount, 1302);
  assert.equal(record.graduatedPool, DASHA_CANONICAL.pair);
});

test('probeCmcMintSearch never claims duplicate status', async () => {
  const probe = await probeCmcMintSearch(mockFetch([
    ['coinmarketcap.com/dexscan', async () => ({ status: 302, headers: { get: () => null } })],
  ]));
  assert.equal(probe.duplicateStatusKnown, false);
  assert.match(probe.note, /does not establish/);
});

test('buildPacket assembles mocked evidence with holder count', async () => {
  const packet = await buildPacket(await fullPacketMocks());
  assert.equal(packet.evidence.holderCount.count, 1302);
  assert.equal(packet.consistencyGate.identityPass, true);
  assert.equal(packet.submissionReadiness.ready, false);
});

test('buildSubmissionRecord tracks blockers and passes', () => {
  const packet = buildEvidencePacket(basePacketInput());
  const record = buildSubmissionRecord(packet);
  assert.equal(record.submitted, false);
  assert.equal(record.submissionReady, false);
  assert.ok(record.blockers.includes('cmc_browser_search_required'));
});

test('writePacketArtifacts writes markdown and submission record', async (context) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'dasha-packet-'));
  context.after(() => rm(dir, { recursive: true, force: true }));
  const packet = buildEvidencePacket(basePacketInput());
  const { target, recordPath } = writePacketArtifacts(packet, path.join(dir, 'packet.md'));
  const md = await readFile(target, 'utf8');
  const record = JSON.parse(await readFile(recordPath, 'utf8'));
  assert.match(md, /CoinMarketCap application packet/);
  assert.equal(record.submissionReady, false);
});

test('CLI build --out writes artifacts', async (context) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'dasha-cli-'));
  context.after(() => rm(dir, { recursive: true, force: true }));
  const out = path.join(dir, 'packet.md');
  const result = spawnSync(process.execPath, [path.join(ROOT, 'demigod-dasha-cmc-packet.mjs'), 'build', '--out', out], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const md = await readFile(out, 'utf8');
  assert.match(md, /partial preflight/);
  assert.ok(fs.existsSync(path.join(dir, 'DASHA-CMC-SUBMISSION-RECORD.json')));
});

test('scanHowToBuyHtml flags confusing third-party copy from fixture', async () => {
  const clean = await readFile(fixture('dasha-how-to-buy-clean.html'), 'utf8');
  const confusing = await readFile(fixture('dasha-how-to-buy-confusing.html'), 'utf8');
  assert.equal(scanHowToBuyHtml(clean).stableForReviewers, true);
  assert.equal(scanHowToBuyHtml(confusing).stableForReviewers, false);
});

test('CLI rejects unknown subcommand', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'demigod-dasha-cmc-packet.mjs'), 'nope'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 2);
});
