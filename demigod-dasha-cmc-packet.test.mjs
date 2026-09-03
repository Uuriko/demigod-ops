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
  fetchMetaplexRecord,
  fetchMetaplexMetadata,
  resolveMetadataDocument,
  probeOfficialX,
  probeVrfdPortalReachability,
  buildVrfdDashboard,
  probeVrfdDashboard,
  probeCmcMintSearch,
  buildPacket,
} from './demigod-dasha-cmc-packet.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MINT = DASHA_CANONICAL.mint;
const METAPLEX_JSON_URI = 'https://ipfs.io/ipfs/dasha-test-metadata';
const fixture = (name) => path.join(ROOT, 'fixtures', name);

function metaplexAssetResult() {
  return {
    id: MINT,
    mutable: false,
    content: {
      metadata: { name: 'dash_eats', symbol: 'dasha' },
      json_uri: METAPLEX_JSON_URI,
      links: { image: 'https://ipfs.io/ipfs/dasha-test-image' },
    },
  };
}

function jupiterRecord(overrides = {}) {
  return {
    mint: MINT,
    name: 'dash_eats',
    symbol: 'dasha',
    holderCount: 1302,
    graduatedPool: DASHA_CANONICAL.pair,
    twitter: 'https://x.com/dash_eats',
    isVerified: true,
    tags: ['launchpad', 'verified'],
    source: 'https://lite-api.jup.ag/tokens/v2/search',
    capturedAt: '2026-09-02T06:00:00.000Z',
    tokenPage: buildUrls().jupiter,
    ...overrides,
  };
}

function vrfdRecord(overrides = {}) {
  const jupiter = jupiterRecord(overrides.jupiter);
  const portal = {
    source: DASHA_CANONICAL.vrfdPortal,
    status: 200,
    reachable: true,
    capturedAt: '2026-09-02T06:00:00.000Z',
    ...overrides.portal,
  };
  return buildVrfdDashboard(jupiter, portal);
}

function metaplexRecord(overrides = {}) {
  return {
    source: 'https://api.mainnet-beta.solana.com getAsset',
    capturedAt: '2026-09-02T06:00:00.000Z',
    mint: MINT,
    name: 'dash_eats',
    symbol: 'dasha',
    jsonUri: METAPLEX_JSON_URI,
    imageUri: 'https://ipfs.io/ipfs/dasha-test-image',
    documentResolved: true,
    documentSource: METAPLEX_JSON_URI,
    document: {
      resolved: true,
      source: METAPLEX_JSON_URI,
      document: {
        name: 'dash_eats',
        symbol: 'dasha',
        image: 'https://ipfs.io/ipfs/dasha-test-image',
      },
      imageUri: 'https://ipfs.io/ipfs/dasha-test-image',
    },
    ...overrides,
  };
}

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
    if (body.method === 'getAsset') {
      return {
        ok: true,
        async json() {
          return { result: metaplexAssetResult() };
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
    faucet: { hasH1: false, source: 'https://www.getdasha.com/faucet' },
    jupiter: jupiterRecord(),
    xProfile: { reachable: true, status: 200 },
    metaplex: metaplexRecord(),
    vrfd: vrfdRecord(),
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
    jupiter: jupiterRecord({ source: 'jupiter', capturedAt: '2026-09-02T06:00:00.000Z' }),
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
    faucet: { hasH1: false, source: 'https://www.getdasha.com/faucet' },
    xProfile: { reachable: true, status: 200 },
    metaplex: metaplexRecord(),
    vrfd: vrfdRecord(),
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
  ]);
}

test('canonical identity matches issue #109', () => {
  assert.equal(DASHA_CANONICAL.coingeckoId, 'dash_eats');
  assert.match(buildUrls().coingecko, /\/coins\/dash_eats$/);
  assert.match(FORM_ANSWERS.projectDescription, /creative tools/);
  assert.doesNotMatch(FORM_ANSWERS.projectDescription, /meme studio/i);
});

test('evaluateSubmissionReadiness keeps manual blockers when confirmations absent', () => {
  const readiness = evaluateSubmissionReadiness({
    gate: { identityPass: true, metadataPass: true, productionPass: false },
    cmcProbe: { duplicateStatusKnown: false },
    holderCount: 1302,
    launchDate: null,
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.submittable, false);
  assert.equal(readiness.preflightOnly, true);
  for (const blocker of MANUAL_READINESS_BLOCKERS) {
    assert.ok(readiness.blockers.includes(blocker));
  }
  assert.ok(readiness.blockers.includes('production_gate_faucet_h1'));
});

test('evaluateSubmissionReadiness stays blocked when manual items cleared but production routing not confirmed', () => {
  const readiness = evaluateSubmissionReadiness({
    gate: { identityPass: true, metadataPass: true, productionPass: false },
    cmcProbe: { duplicateStatusKnown: false },
    holderCount: 1302,
    launchDate: null,
    manualConfirmations: {
      launchDateConfirmed: true,
      cmcBrowserSearchConfirmed: true,
      representativeAuthorityConfirmed: true,
      stableReviewerRoutingConfirmed: false,
    },
  });
  assert.equal(readiness.ready, false);
  assert.ok(readiness.blockers.includes('production_gate_faucet_h1'));
});

test('evaluateSubmissionReadiness clears blockers when confirmations set and production routing acknowledged', () => {
  const readiness = evaluateSubmissionReadiness({
    gate: { identityPass: true, metadataPass: true, productionPass: false },
    cmcProbe: { duplicateStatusKnown: false },
    holderCount: 1302,
    launchDate: null,
    manualConfirmations: {
      launchDateConfirmed: true,
      cmcBrowserSearchConfirmed: true,
      representativeAuthorityConfirmed: true,
      stableReviewerRoutingConfirmed: true,
    },
  });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.submittable, true);
  assert.equal(readiness.preflightOnly, false);
  for (const blocker of MANUAL_READINESS_BLOCKERS) {
    assert.equal(readiness.blockers.includes(blocker), false);
  }
  assert.equal(readiness.blockers.includes('production_gate_faucet_h1'), false);
});

test('evaluateSubmissionReadiness clears manual blockers when production gate passes', () => {
  const readiness = evaluateSubmissionReadiness({
    gate: { identityPass: true, metadataPass: true, productionPass: true },
    cmcProbe: { duplicateStatusKnown: false },
    holderCount: 1302,
    launchDate: null,
    manualConfirmations: {
      launchDateConfirmed: true,
      cmcBrowserSearchConfirmed: true,
      representativeAuthorityConfirmed: true,
    },
  });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.submittable, true);
  assert.equal(readiness.preflightOnly, false);
  for (const blocker of MANUAL_READINESS_BLOCKERS) {
    assert.equal(readiness.blockers.includes(blocker), false);
  }
  assert.equal(readiness.blockers.includes('production_gate_faucet_h1'), false);
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

test('evaluateConsistencyGate requires metaplex metadata and corroboration', () => {
  const gate = evaluateConsistencyGate(baseGateInput());
  assert.equal(gate.metadataPass, true);
  assert.equal(gate.identityPass, true);
  assert.ok(gate.checks.some((row) => row.id === 'metaplex_mint' && row.pass));
  assert.ok(gate.checks.some((row) => row.id === 'metaplex_uri_resolves' && row.pass));
  assert.ok(gate.checks.some((row) => row.id === 'aggregator_corroboration' && row.pass));
  assert.ok(gate.checks.some((row) => row.id === 'holder_count' && row.pass));
  assert.ok(gate.checks.some((row) => row.id === 'vrfd_mint_verified' && row.pass));
  assert.ok(gate.checks.some((row) => row.id === 'vrfd_portal_reachable' && row.pass));
});

test('evaluateConsistencyGate fails metadata without metaplex resolution', () => {
  const gate = evaluateConsistencyGate(baseGateInput({
    metaplex: metaplexRecord({ documentResolved: false, jsonUri: null }),
  }));
  assert.equal(gate.metadataPass, false);
  assert.ok(gate.checks.some((row) => row.id === 'metaplex_uri_resolves' && !row.pass));
});

test('buildEvidencePacket does not auto-fill launch date', () => {
  const packet = buildEvidencePacket(basePacketInput());
  assert.equal(packet.formAnswers.launchDate, null);
  assert.equal(packet.evidence.marketPair.canonicalPoolCreatedAt, '2025-02-03T15:29:15Z');
  assert.equal(packet.submissionReadiness.ready, false);
  assert.equal(packet.schema, 'demigod.dasha-cmc-packet/3');
  assert.equal(packet.identity.metadataUri, METAPLEX_JSON_URI);
  assert.equal(packet.evidence.metaplexMetadata.mint, MINT);
  assert.equal(packet.evidence.vrfdDashboard.isVerified, true);
});

test('renderPacketMarkdown includes CMC probe limitation and readiness blockers', () => {
  const packet = buildEvidencePacket(basePacketInput());
  const md = renderPacketMarkdown(packet);
  assert.match(md, /partial preflight/i);
  assert.match(md, /CMC duplicate search \(manual required\)/);
  assert.match(md, /Browser exact-mint search/i);
  assert.match(md, /Submission ready: \*\*no\*\*/);
  assert.match(md, /On-chain Metaplex metadata \(primary\)/);
  assert.match(md, /Preflight only: yes/);
  assert.match(md, /Canonical pool created \(not launch date\)/);
  assert.match(md, /UNRESOLVED — manual/);
  assert.doesNotMatch(md, /meme studio/i);
  assert.match(md, /VRFD portal: https:\/\/verified\.jup\.ag\/tokens \(reachable: yes\)/);
  assert.match(md, /VRFD verified \(exact mint\): yes/);
  assert.match(md, /vrfd_mint_verified/);
});

test('renderPacketMarkdown shows VRFD failure when mint mismatches', () => {
  const wrongMint = '11111111111111111111111111111111';
  const jupiter = jupiterRecord({ mint: wrongMint, isVerified: true, tags: ['verified'] });
  const vrfd = probeVrfdDashboard(jupiter);
  const packet = buildEvidencePacket(basePacketInput({
    gateInput: { jupiter, vrfd },
    jupiter,
    vrfd,
  }));
  const md = renderPacketMarkdown(packet);
  assert.match(md, /VRFD verified \(exact mint\): no/);
  assert.match(md, /\[ \] vrfd_mint_verified/);
});

test('renderPacketMarkdown shows VRFD portal unreachable', () => {
  const packet = buildEvidencePacket(basePacketInput({
    gateInput: {
      vrfd: vrfdRecord({ portal: { reachable: false, status: 503 } }),
    },
    vrfd: vrfdRecord({ portal: { reachable: false, status: 503 } }),
  }));
  const md = renderPacketMarkdown(packet);
  assert.match(md, /VRFD portal: https:\/\/verified\.jup\.ag\/tokens \(reachable: no\)/);
  assert.match(md, /\[ \] vrfd_portal_reachable/);
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

test('probeVrfdPortalReachability records portal HTTP status', async () => {
  const probe = await probeVrfdPortalReachability(mockFetch([
    ['verified.jup.ag/tokens', async () => ({ ok: true, status: 200 })],
  ]));
  assert.equal(probe.reachable, true);
  assert.equal(probe.status, 200);
});

test('evaluateConsistencyGate fails when VRFD portal is unreachable', () => {
  const gate = evaluateConsistencyGate(baseGateInput({
    vrfd: vrfdRecord({ portal: { reachable: false, status: 503 } }),
  }));
  assert.equal(gate.identityPass, false);
  assert.ok(gate.checks.some((row) => row.id === 'vrfd_portal_reachable' && !row.pass));
});

test('probeVrfdDashboard maps Jupiter VRFD fields for exact mint', () => {
  const vrfd = probeVrfdDashboard(jupiterRecord(), {
    source: DASHA_CANONICAL.vrfdPortal,
    status: 200,
    reachable: true,
  });
  assert.equal(vrfd.mintMatches, true);
  assert.equal(vrfd.isVerified, true);
  assert.ok(vrfd.tags.includes('verified'));
  assert.match(vrfd.portalUrl, /verified\.jup\.ag\/tokens/);
  assert.equal(vrfd.portalReachable, true);
});

test('probeVrfdDashboard fails mint match for wrong mint', () => {
  const wrongMint = '11111111111111111111111111111111';
  const vrfd = probeVrfdDashboard(jupiterRecord({ mint: wrongMint, isVerified: true, tags: ['verified'] }));
  assert.equal(vrfd.mintMatches, false);
  assert.equal(vrfd.isVerified, true);
  const gate = evaluateConsistencyGate(baseGateInput({
    jupiter: jupiterRecord({ mint: wrongMint }),
    vrfd,
  }));
  assert.equal(gate.identityPass, false);
  assert.ok(gate.checks.some((row) => row.id === 'vrfd_mint_verified' && !row.pass));
});

test('evaluateConsistencyGate fails VRFD check when mint is not verified', () => {
  const gate = evaluateConsistencyGate(baseGateInput({
    jupiter: jupiterRecord({ isVerified: false, tags: [] }),
    vrfd: probeVrfdDashboard(jupiterRecord({ isVerified: false, tags: [] })),
  }));
  assert.equal(gate.identityPass, false);
  assert.ok(gate.checks.some((row) => row.id === 'vrfd_mint_verified' && !row.pass));
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
          isVerified: true,
          tags: ['launchpad', 'verified'],
        }];
      },
    })],
  ]);
  const record = await fetchJupiterTokenRecord(fetchImpl);
  assert.equal(record.holderCount, 1302);
  assert.equal(record.graduatedPool, DASHA_CANONICAL.pair);
  assert.equal(record.isVerified, true);
});

test('probeCmcMintSearch never claims duplicate status', async () => {
  const probe = await probeCmcMintSearch(mockFetch([
    ['coinmarketcap.com/dexscan', async () => ({ status: 302, headers: { get: () => null } })],
  ]));
  assert.equal(probe.duplicateStatusKnown, false);
  assert.match(probe.note, /does not establish/);
});

test('probeOfficialX records reachability', async () => {
  const reachable = await probeOfficialX(mockFetch([
    ['x.com/dash_eats', async () => ({ ok: true, status: 200 })],
  ]));
  assert.equal(reachable.reachable, true);
  assert.equal(reachable.status, 200);

  const unreachable = await probeOfficialX(mockFetch([
    ['x.com/dash_eats', async () => ({ ok: false, status: 404 })],
  ]));
  assert.equal(unreachable.reachable, false);
  assert.equal(unreachable.status, 404);
});

test('fetchMetaplexRecord resolves json_uri document', async () => {
  const fetchImpl = mockFetch([
    ['api.mainnet-beta.solana.com', rpcMock()],
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
  ]);
  const record = await fetchMetaplexRecord(fetchImpl);
  assert.equal(record.mint, MINT);
  assert.equal(record.name, 'dash_eats');
  assert.equal(record.documentResolved, true);
  assert.equal(record.document.imageUri, 'https://ipfs.io/ipfs/dasha-test-image');
});

test('resolveMetadataDocument fails cleanly when json_uri fetch fails', async () => {
  const result = await resolveMetadataDocument(mockFetch([
    ['ipfs.io/ipfs/bad-metadata', async () => ({ ok: false, status: 404 })],
  ]), {
    jsonUri: 'https://ipfs.io/ipfs/bad-metadata',
    imageUri: 'https://ipfs.io/ipfs/dasha-test-image',
  });
  assert.equal(result.resolved, false);
  assert.equal(result.status, 404);
  assert.equal(result.document, null);
});

test('fetchMetaplexRecord leaves documentResolved false when json_uri missing', async () => {
  const fetchImpl = mockFetch([
    ['api.mainnet-beta.solana.com', async (_url, init = {}) => {
      const body = JSON.parse(String(init.body || '{}'));
      if (body.method === 'getAsset') {
        return {
          ok: true,
          async json() {
            return {
              result: {
                id: MINT,
                content: {
                  metadata: { name: 'dash_eats', symbol: 'dasha' },
                  json_uri: null,
                },
              },
            };
          },
        };
      }
      throw new Error(`unexpected_rpc:${body.method}`);
    }],
  ]);
  const record = await fetchMetaplexRecord(fetchImpl);
  assert.equal(record.documentResolved, false);
  assert.equal(record.jsonUri, null);
});

test('buildPacket assembles mocked evidence with holder count, metaplex, and VRFD', async () => {
  const packet = await buildPacket(await fullPacketMocks());
  assert.equal(packet.evidence.holderCount.count, 1302);
  assert.equal(packet.evidence.metaplexMetadata.mint, MINT);
  assert.equal(packet.evidence.vrfdDashboard.isVerified, true);
  assert.equal(packet.consistencyGate.identityPass, true);
  assert.equal(packet.consistencyGate.metadataPass, true);
  assert.equal(packet.submissionReadiness.ready, false);
});

test('buildSubmissionRecord tracks blockers and passes', () => {
  const packet = buildEvidencePacket(basePacketInput());
  const record = buildSubmissionRecord(packet);
  assert.equal(record.submitted, false);
  assert.equal(record.submissionReady, false);
  assert.ok(record.blockers.includes('cmc_browser_search_required'));
  assert.ok(record.blockers.includes('production_gate_faucet_h1'));
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

test('verify script entry point passes', () => {
  const result = spawnSync('bash', [path.join(ROOT, 'scripts', 'verify.sh')], {
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
});
