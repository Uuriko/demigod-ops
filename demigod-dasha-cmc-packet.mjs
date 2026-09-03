#!/usr/bin/env node
/**
 * CoinMarketCap new-listing application packet for the canonical $DASHA mint.
 * Gathers on-chain and market evidence, runs the consistency gate, and emits
 * form answers plus a compact evidence document for issue #109 / NIO-32.
 *
 * CLI:
 *   node demigod-dasha-cmc-packet.mjs build [--json] [--out path]
 *   node demigod-dasha-cmc-packet.mjs gate [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DASHA_CANONICAL = Object.freeze({
  mint: '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump',
  pair: '9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7',
  chain: 'Solana',
  website: 'https://www.getdasha.com/',
  stableReviewerPage: 'https://www.getdasha.com/how-to-buy',
  officialX: 'https://x.com/dash_eats',
  officialXHandle: 'dash_eats',
  repository: 'https://github.com/Uuriko/dasha-desk',
  coingeckoId: 'dash_eats',
  vrfdPortal: 'https://verified.jup.ag/tokens',
  representativeEmail: 'potter@trydemigod.com',
  representativeName: 'Jonathan Potter',
  cmcFormUrl: 'https://coinmarketcap.com/request/',
  issueUrl: 'https://github.com/Uuriko/demigod-ops/issues/109',
  productionGateIssue: 'https://github.com/Uuriko/demigod-ops/issues/77',
});

export const FORM_ANSWERS = Object.freeze({
  requesterRelationship:
    'Community maintainer and operator of getdasha.com (manual CMC dropdown selection required).',
  requesterRelationshipNote:
    'Current maintainer is not the original token deployer/issuer. Confirm @dash_eats and website control before selecting the closest truthful CMC relationship option.',
  launchDateNote:
    'UNRESOLVED — select the earliest independently verifiable mint or first-trade date manually before submission. Canonical pool creation time is evidence only, not the CMC launch-date answer.',
  projectDescription:
    '$DASHA is a Solana community and culture project built around one canonical mint. The public product at getdasha.com is more than a price page: it includes a wallet-optional activity lobby, token-discovery and buy guidance, creative tools, community games, a faucet, open-source contribution surfaces and emerging bounty/mobile experiments. Browsing does not require a wallet or signature, and transaction actions are designed to remain explicit and non-custodial. The project has continued shipping public software and community tools since launch, with source and contribution history available on GitHub. This request is to establish the correct project identity and canonical Solana mint on CoinMarketCap; it is not a claim of investment safety or guaranteed market activity.',
  differentiator:
    'Dasha treats a meme token as a persistent consumer and open-source culture product rather than a short-lived trading page. The website is useful before wallet connection, exposes the exact mint prominently, and links community activity to public software, creative tools and contribution workflows. The project\'s current work includes reusable Solana activity/bounty primitives and a separate native Android experiment, while keeping custody and automatic trading outside the product boundary.',
  circulatingSupplyNote:
    'No separate circulating-supply methodology is claimed. Total supply and decimals are read from on-chain mint data at submission time; CMC may review rank-affecting supply separately.',
  collisionNote:
    'The ticker DASHA and similar names exist on other chains and assets. Identity is established only by the full Solana mint above; aggregators that map the same mint (CoinGecko dash_eats, Raydium pair, Solscan) are authoritative for this project.',
  regenerationWarning:
    'Regenerate this packet immediately before CMC submission. Volatile supply, market, and holder figures below are point-in-time captures only.',
});

export const MANUAL_READINESS_BLOCKERS = Object.freeze([
  'launch_date_manual_required',
  'cmc_browser_search_required',
  'representative_authority_manual',
]);

export const EMPTY_MANUAL_CONFIRMATIONS = Object.freeze({
  launchDateConfirmed: false,
  cmcBrowserSearchConfirmed: false,
  representativeAuthorityConfirmed: false,
  stableReviewerRoutingConfirmed: false,
});

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const FINALIZED = { commitment: 'finalized' };

export function buildUrls() {
  const { mint, pair, website, coingeckoId } = DASHA_CANONICAL;
  return {
    solscan: `https://solscan.io/token/${mint}`,
    geckoTerminalPool: `https://www.geckoterminal.com/solana/pools/${pair}`,
    geckoTerminalToken: `https://www.geckoterminal.com/solana/tokens/${mint}`,
    raydium: `https://raydium.io/swap/?inputMint=sol&outputMint=${mint}`,
    coingecko: `https://www.coingecko.com/en/coins/${coingeckoId}`,
    jupiter: `https://jup.ag/tokens/${mint}`,
    vrfdPortal: DASHA_CANONICAL.vrfdPortal,
    cmcDexScan: `https://coinmarketcap.com/dexscan/solana/${mint}/`,
    website,
    howToBuy: `${website.replace(/\/$/, '')}/how-to-buy`,
  };
}

export function extractMintFromHtml(html) {
  const matches = [...String(html || '').matchAll(/53ux[A-Za-z0-9]{32,44}/g)];
  return [...new Set(matches.map((m) => m[0]))];
}

export function pageContainsCanonicalMint(html) {
  return extractMintFromHtml(html).includes(DASHA_CANONICAL.mint);
}

export async function rpcCall(fetchImpl, method, params) {
  const response = await fetchImpl(SOLANA_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`rpc_http_${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`rpc_${body.error.message || 'error'}`);
  return { result: body.result, context: body.result?.context || null };
}

export async function fetchOnChainSupply(fetchImpl = fetch) {
  const [mintInfo, supplyInfo] = await Promise.all([
    rpcCall(fetchImpl, 'getAccountInfo', [DASHA_CANONICAL.mint, { encoding: 'jsonParsed', ...FINALIZED }]),
    rpcCall(fetchImpl, 'getTokenSupply', [DASHA_CANONICAL.mint, FINALIZED]),
  ]);
  const parsed = mintInfo.result?.value?.data?.parsed?.info;
  const supply = supplyInfo.result?.value;
  if (!parsed || !supply) throw new Error('onchain_supply_missing');
  return {
    source: SOLANA_RPC,
    commitment: 'finalized',
    slot: supplyInfo.result?.context?.slot ?? mintInfo.result?.context?.slot ?? null,
    capturedAt: new Date().toISOString(),
    decimals: parsed.decimals,
    totalSupplyRaw: supply.amount,
    totalSupplyUi: supply.uiAmountString,
    mintAuthority: parsed.mintAuthority,
    freezeAuthority: parsed.freezeAuthority,
    isInitialized: parsed.isInitialized === true,
  };
}

export async function fetchCoinGeckoRecord(fetchImpl = fetch) {
  const url = `https://api.coingecko.com/api/v3/coins/${DASHA_CANONICAL.coingeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`coingecko_http_${response.status}`);
  const data = await response.json();
  const mint = data?.platforms?.solana || data?.contract_address || null;
  return {
    source: url,
    capturedAt: new Date().toISOString(),
    id: data.id,
    name: data.name,
    symbol: data.symbol,
    mint,
    homepage: data?.links?.homepage?.[0] || null,
    twitter: data?.links?.twitter_screen_name || null,
    github: data?.links?.repos_url?.github?.[0] || null,
    marketCapRank: data.market_cap_rank ?? null,
    previewListing: data.preview_listing === true,
    image: data?.image?.small || null,
  };
}

export async function fetchJupiterTokenRecord(fetchImpl = fetch) {
  const url = `https://lite-api.jup.ag/tokens/v2/search?query=${DASHA_CANONICAL.mint}`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`jupiter_http_${response.status}`);
  const rows = await response.json();
  const row = Array.isArray(rows)
    ? rows.find((item) => item?.id === DASHA_CANONICAL.mint) || rows[0]
    : null;
  if (!row?.id) throw new Error('jupiter_token_missing');
  return {
    source: url,
    capturedAt: new Date().toISOString(),
    mint: row.id,
    name: row.name || null,
    symbol: row.symbol || null,
    icon: row.icon || null,
    twitter: row.twitter || null,
    website: row.website || null,
    holderCount: Number.isFinite(row.holderCount) ? row.holderCount : null,
    isVerified: row.isVerified === true,
    tags: Array.isArray(row.tags) ? row.tags : [],
    graduatedAt: row.graduatedAt || null,
    graduatedPool: row.graduatedPool || null,
    tokenPage: buildUrls().jupiter,
  };
}

export async function fetchPoolEvidence(fetchImpl = fetch) {
  const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${DASHA_CANONICAL.pair}`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`gecko_terminal_http_${response.status}`);
  const json = await response.json();
  const attrs = json?.data?.attributes;
  if (!attrs) throw new Error('gecko_terminal_pool_missing');
  const baseTokenId = json?.data?.relationships?.base_token?.data?.id || '';
  const baseMint = baseTokenId.replace(/^solana_/, '');
  return {
    source: url,
    capturedAt: new Date().toISOString(),
    pair: DASHA_CANONICAL.pair,
    baseMint,
    poolName: attrs.pool_name || attrs.name || null,
    poolCreatedAt: attrs.pool_created_at || null,
    liquidityUsd: attrs.reserve_in_usd || null,
    volume24hUsd: attrs.volume_usd?.h24 || null,
    fdvUsd: attrs.fdv_usd || null,
    dex: json?.data?.relationships?.dex?.data?.id || null,
  };
}

export async function fetchWebsiteIdentity(fetchImpl = fetch) {
  const response = await fetchImpl(DASHA_CANONICAL.website);
  if (!response.ok) throw new Error(`website_http_${response.status}`);
  const html = await response.text();
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || null;
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1]
    || null;
  return {
    source: DASHA_CANONICAL.website,
    capturedAt: new Date().toISOString(),
    title,
    description,
    mintsFound: extractMintFromHtml(html),
    hasCanonicalMint: pageContainsCanonicalMint(html),
  };
}

export const HOW_TO_BUY_CONFUSING_PATTERNS = Object.freeze([
  /dash\s*coin/i,
  /dash\s*crypto(?!\s*project)/i,
  /digital\s+cash/i,
  /privacy\s+coin/i,
]);

export function scanHowToBuyHtml(html, source = buildUrls().howToBuy) {
  const confusingHits = HOW_TO_BUY_CONFUSING_PATTERNS
    .filter((pattern) => pattern.test(html))
    .map((pattern) => String(pattern));
  const hasCanonicalMint = pageContainsCanonicalMint(html);
  return {
    source,
    hasCanonicalMint,
    hasH1: /<h1\b/i.test(html),
    confusingThirdPartyCopy: confusingHits,
    stableForReviewers: hasCanonicalMint && confusingHits.length === 0,
  };
}

export async function fetchHowToBuyPage(fetchImpl = fetch) {
  const url = buildUrls().howToBuy;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`how_to_buy_http_${response.status}`);
  return scanHowToBuyHtml(await response.text(), url);
}

export async function fetchFaucetPage(fetchImpl = fetch) {
  const url = `${DASHA_CANONICAL.website.replace(/\/$/, '')}/faucet`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`faucet_http_${response.status}`);
  const html = await response.text();
  return {
    source: url,
    hasH1: /<h1\b/i.test(html),
    hasCanonicalMint: pageContainsCanonicalMint(html),
    issue: DASHA_CANONICAL.productionGateIssue,
  };
}

export async function probeVrfdPortalReachability(fetchImpl = fetch) {
  const url = DASHA_CANONICAL.vrfdPortal;
  const response = await fetchImpl(url, { redirect: 'follow' });
  return {
    source: url,
    capturedAt: new Date().toISOString(),
    status: response.status,
    reachable: response.ok || response.status === 307 || response.status === 308,
  };
}

export function buildVrfdDashboard(jupiter, portalProbe) {
  const urls = buildUrls();
  return {
    portalUrl: DASHA_CANONICAL.vrfdPortal,
    portalReachable: portalProbe?.reachable === true,
    portalStatus: portalProbe?.status ?? null,
    portalProbeSource: portalProbe?.source || DASHA_CANONICAL.vrfdPortal,
    tokenPageUrl: jupiter?.tokenPage || urls.jupiter,
    apiSource: jupiter?.source || null,
    capturedAt: jupiter?.capturedAt || portalProbe?.capturedAt || new Date().toISOString(),
    mint: jupiter?.mint || null,
    isVerified: jupiter?.isVerified === true,
    tags: Array.isArray(jupiter?.tags) ? jupiter.tags : [],
    mintMatches: jupiter?.mint === DASHA_CANONICAL.mint,
    note:
      'VRFD verification status is read from Jupiter token search (isVerified/tags). Portal reachability is probed separately at verified.jup.ag/tokens; verification is not an audit or endorsement.',
  };
}

export function probeVrfdDashboard(jupiter, portalProbe = null) {
  return buildVrfdDashboard(jupiter, portalProbe);
}

export async function probeOfficialX(fetchImpl = fetch) {
  const response = await fetchImpl(DASHA_CANONICAL.officialX, { redirect: 'follow' });
  return {
    source: DASHA_CANONICAL.officialX,
    capturedAt: new Date().toISOString(),
    status: response.status,
    reachable: response.ok,
  };
}

export async function probeCmcMintSearch(fetchImpl = fetch) {
  const url = buildUrls().cmcDexScan;
  const response = await fetchImpl(url, { redirect: 'manual' });
  return {
    source: url,
    capturedAt: new Date().toISOString(),
    status: response.status,
    location: response.headers.get('location'),
    duplicateStatusKnown: false,
    note:
      'Browser exact-mint search on CoinMarketCap is required before submission. This HTTP probe does not establish preview/tracked status or absence of an existing request.',
  };
}

export async function fetchMetaplexMetadata(fetchImpl = fetch) {
  const response = await fetchImpl(SOLANA_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAsset',
      params: { id: DASHA_CANONICAL.mint },
    }),
  });
  if (!response.ok) throw new Error(`metaplex_rpc_http_${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`metaplex_rpc_${body.error.message || 'error'}`);
  const asset = body.result;
  const metadata = asset?.content?.metadata || {};
  return {
    source: `${SOLANA_RPC} getAsset`,
    capturedAt: new Date().toISOString(),
    mint: asset?.id || null,
    name: metadata.name || null,
    symbol: metadata.symbol || null,
    jsonUri: asset?.content?.json_uri || null,
    imageUri: asset?.content?.links?.image || null,
    mutable: asset?.mutable === true,
  };
}

export async function resolveMetadataDocument(fetchImpl = fetch, metaplex) {
  const jsonUri = metaplex?.jsonUri;
  if (!jsonUri) {
    return { resolved: false, source: null, document: null, imageUri: metaplex?.imageUri || null };
  }
  const response = await fetchImpl(jsonUri);
  if (!response.ok) {
    return {
      resolved: false,
      source: jsonUri,
      status: response.status,
      document: null,
      imageUri: metaplex?.imageUri || null,
    };
  }
  const document = await response.json();
  return {
    resolved: true,
    source: jsonUri,
    document,
    imageUri: document?.image || metaplex?.imageUri || null,
  };
}

export async function fetchMetaplexRecord(fetchImpl = fetch) {
  const metaplex = await fetchMetaplexMetadata(fetchImpl);
  const document = await resolveMetadataDocument(fetchImpl, metaplex);
  return {
    ...metaplex,
    documentResolved: document.resolved === true,
    documentSource: document.source,
    document,
  };
}

export function namesAlign(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export function evaluateConsistencyGate({
  coingecko,
  pool,
  website,
  howToBuy,
  faucet,
  jupiter,
  xProfile,
  metaplex,
  vrfd,
}) {
  const checks = [];
  const expect = DASHA_CANONICAL.mint;

  checks.push({
    id: 'website_mint',
    pass: website?.hasCanonicalMint === true,
    detail: website?.mintsFound?.join(', ') || 'none',
  });
  checks.push({
    id: 'coingecko_mint',
    pass: coingecko?.mint === expect,
    detail: coingecko?.mint || 'missing',
  });
  checks.push({
    id: 'pool_base_mint',
    pass: pool?.baseMint === expect,
    detail: pool?.baseMint || 'missing',
  });
  checks.push({
    id: 'metaplex_mint',
    pass: metaplex?.mint === expect,
    detail: metaplex?.mint || 'missing',
  });
  checks.push({
    id: 'metaplex_name_symbol',
    pass: Boolean(metaplex?.name && metaplex?.symbol),
    detail: `${metaplex?.name || 'missing'}/${metaplex?.symbol || 'missing'}`,
  });
  checks.push({
    id: 'metaplex_uri_resolves',
    pass: metaplex?.documentResolved === true,
    detail: metaplex?.jsonUri || 'missing',
  });
  checks.push({
    id: 'aggregator_corroboration',
    pass: namesAlign(metaplex?.name, coingecko?.name)
      && namesAlign(metaplex?.symbol, coingecko?.symbol)
      && namesAlign(metaplex?.name, jupiter?.name)
      && namesAlign(metaplex?.symbol, jupiter?.symbol),
    detail: `metaplex=${metaplex?.name}/${metaplex?.symbol}; coingecko=${coingecko?.name}/${coingecko?.symbol}; jupiter=${jupiter?.name}/${jupiter?.symbol}`,
  });
  checks.push({
    id: 'jupiter_mint',
    pass: jupiter?.mint === expect,
    detail: jupiter?.mint || 'missing',
  });
  checks.push({
    id: 'jupiter_graduated_pool',
    pass: jupiter?.graduatedPool === DASHA_CANONICAL.pair,
    detail: jupiter?.graduatedPool || 'missing',
  });
  checks.push({
    id: 'vrfd_mint_verified',
    pass: vrfd?.mintMatches === true && vrfd?.isVerified === true,
    detail: `mint=${vrfd?.mint || 'missing'}; verified=${vrfd?.isVerified === true}; tags=${(vrfd?.tags || []).join(',') || 'none'}`,
  });
  checks.push({
    id: 'vrfd_portal_reachable',
    pass: vrfd?.portalReachable === true,
    detail: `${vrfd?.portalUrl || DASHA_CANONICAL.vrfdPortal} status ${vrfd?.portalStatus ?? 'unknown'}`,
  });
  checks.push({
    id: 'official_x_reachable',
    pass: xProfile?.reachable === true,
    detail: `${DASHA_CANONICAL.officialX} status ${xProfile?.status ?? 'unknown'}`,
  });
  checks.push({
    id: 'official_x_handle',
    pass: String(jupiter?.twitter || '').includes(DASHA_CANONICAL.officialXHandle),
    detail: jupiter?.twitter || 'missing',
  });
  checks.push({
    id: 'holder_count',
    pass: Number.isFinite(jupiter?.holderCount) && jupiter.holderCount > 0,
    detail: Number.isFinite(jupiter?.holderCount) ? String(jupiter.holderCount) : 'unresolved',
  });
  checks.push({
    id: 'how_to_buy_mint',
    pass: howToBuy?.hasCanonicalMint === true,
    detail: howToBuy?.source || 'missing',
  });
  checks.push({
    id: 'how_to_buy_no_confusing_copy',
    pass: (howToBuy?.confusingThirdPartyCopy || []).length === 0,
    detail: (howToBuy?.confusingThirdPartyCopy || []).join('; ') || 'clean',
  });
  checks.push({
    id: 'stable_reviewer_page',
    pass: howToBuy?.stableForReviewers === true,
    detail: DASHA_CANONICAL.stableReviewerPage,
  });
  checks.push({
    id: 'faucet_h1',
    pass: faucet?.hasH1 === true,
    detail: faucet?.hasH1 ? faucet.source : `${faucet?.source || '/faucet'} missing H1 (#77)`,
  });

  const metadataIds = new Set([
    'metaplex_mint',
    'metaplex_name_symbol',
    'metaplex_uri_resolves',
    'aggregator_corroboration',
    'official_x_handle',
  ]);
  const productionIds = new Set(['faucet_h1']);
  const identityIds = new Set(['website_mint', 'coingecko_mint', 'pool_base_mint', 'how_to_buy_mint', 'how_to_buy_no_confusing_copy', 'stable_reviewer_page', 'official_x_reachable', 'vrfd_mint_verified', 'vrfd_portal_reachable']);

  const metadataPass = checks.filter((row) => metadataIds.has(row.id)).every((row) => row.pass);
  const identityPass = checks.filter((row) => identityIds.has(row.id)).every((row) => row.pass);
  const productionPass = checks.filter((row) => productionIds.has(row.id)).every((row) => row.pass);
  const preflightPass = checks.every((row) => row.pass);

  return {
    pass: preflightPass,
    identityPass,
    metadataPass,
    productionPass,
    preflightPass,
    partial: !preflightPass,
    checks,
    productionBlockedBy: productionPass ? null : DASHA_CANONICAL.productionGateIssue,
  };
}

export function evaluateSubmissionReadiness({
  gate,
  cmcProbe,
  holderCount,
  launchDate,
  manualConfirmations = EMPTY_MANUAL_CONFIRMATIONS,
}) {
  const blockers = [];
  const manual = { ...EMPTY_MANUAL_CONFIRMATIONS, ...manualConfirmations };
  if (launchDate != null) blockers.push('launch_date_auto_filled');
  if (!manual.launchDateConfirmed) blockers.push('launch_date_manual_required');
  if (!manual.cmcBrowserSearchConfirmed) blockers.push('cmc_browser_search_required');
  if (!manual.representativeAuthorityConfirmed) blockers.push('representative_authority_manual');
  if (!gate?.productionPass && !manual.stableReviewerRoutingConfirmed) {
    blockers.push('production_gate_faucet_h1');
  }
  if (!gate?.identityPass) blockers.push('identity_preflight_incomplete');
  if (!gate?.metadataPass) blockers.push('metadata_consistency_incomplete');
  if (!Number.isFinite(holderCount) || holderCount <= 0) blockers.push('holder_count_unresolved');
  if (cmcProbe?.duplicateStatusKnown === true) blockers.push('cmc_probe_must_not_infer_duplicate_status');
  const unique = [...new Set(blockers)];
  return {
    preflightOnly: !manual.launchDateConfirmed
      && !manual.cmcBrowserSearchConfirmed
      && !manual.representativeAuthorityConfirmed
      && (gate?.productionPass === true || !manual.stableReviewerRoutingConfirmed),
    ready: unique.length === 0,
    submittable: unique.length === 0,
    blockers: unique,
    manualConfirmations: manual,
    note: 'Clear manual confirmation fields only after human review. This tool does not submit the CMC form.',
  };
}

export function buildEvidencePacket({
  at = new Date().toISOString(),
  onchain,
  coingecko,
  jupiter,
  metaplex,
  vrfd,
  pool,
  website,
  howToBuy,
  faucet,
  xProfile,
  cmcProbe,
  gate,
  manualConfirmations = EMPTY_MANUAL_CONFIRMATIONS,
}) {
  const urls = buildUrls();
  const holderCount = Number.isFinite(jupiter?.holderCount) ? jupiter.holderCount : null;
  const readiness = evaluateSubmissionReadiness({
    gate,
    cmcProbe,
    holderCount,
    launchDate: null,
    manualConfirmations,
  });

  return {
    schema: 'demigod.dasha-cmc-packet/3',
    capturedAt: at,
    costLane: 'free',
    cmcFormUrl: DASHA_CANONICAL.cmcFormUrl,
    regenerationWarning: FORM_ANSWERS.regenerationWarning,
    identity: {
      ...DASHA_CANONICAL,
      name: metaplex?.name || coingecko?.name || jupiter?.name || null,
      symbol: metaplex?.symbol || coingecko?.symbol || jupiter?.symbol || null,
      metadataUri: metaplex?.jsonUri || null,
      metadataImageUri: metaplex?.document?.imageUri || metaplex?.imageUri || null,
      urls,
    },
    formAnswers: {
      ...FORM_ANSWERS,
      contractMint: DASHA_CANONICAL.mint,
      chain: DASHA_CANONICAL.chain,
      marketPairUrl: urls.geckoTerminalPool,
      launchDate: null,
      launchDateNote: FORM_ANSWERS.launchDateNote,
      canonicalPoolCreatedAt: pool?.poolCreatedAt || null,
      teamRepresentative: `${DASHA_CANONICAL.representativeName} <${DASHA_CANONICAL.representativeEmail}>`,
      technicalDocs: [DASHA_CANONICAL.repository, urls.howToBuy],
    },
    evidence: {
      mintAndExplorer: { mint: DASHA_CANONICAL.mint, explorer: urls.solscan },
      marketPair: {
        pair: DASHA_CANONICAL.pair,
        raydium: urls.raydium,
        geckoTerminal: urls.geckoTerminalPool,
        canonicalPoolCreatedAt: pool?.poolCreatedAt || null,
      },
      websiteAndSocial: {
        website: DASHA_CANONICAL.website,
        stableReviewerPage: DASHA_CANONICAL.stableReviewerPage,
        x: DASHA_CANONICAL.officialX,
        xReachable: xProfile?.reachable === true,
      },
      coingeckoListing: {
        url: urls.coingecko,
        mint: coingecko?.mint || null,
        rank: coingecko?.marketCapRank ?? null,
        capturedAt: coingecko?.capturedAt || at,
      },
      jupiterListing: {
        url: urls.jupiter,
        mint: jupiter?.mint || null,
        name: jupiter?.name || null,
        symbol: jupiter?.symbol || null,
        isVerified: jupiter?.isVerified === true,
        tags: jupiter?.tags || [],
        capturedAt: jupiter?.capturedAt || at,
      },
      vrfdDashboard: {
        portalUrl: vrfd?.portalUrl || urls.vrfdPortal,
        portalReachable: vrfd?.portalReachable === true,
        portalStatus: vrfd?.portalStatus ?? null,
        portalProbeSource: vrfd?.portalProbeSource || urls.vrfdPortal,
        tokenPageUrl: vrfd?.tokenPageUrl || urls.jupiter,
        mint: vrfd?.mint || null,
        mintMatches: vrfd?.mintMatches === true,
        isVerified: vrfd?.isVerified === true,
        tags: vrfd?.tags || [],
        apiSource: vrfd?.apiSource || null,
        capturedAt: vrfd?.capturedAt || at,
        note: vrfd?.note || null,
      },
      metaplexMetadata: {
        source: metaplex?.source || null,
        mint: metaplex?.mint || null,
        name: metaplex?.name || null,
        symbol: metaplex?.symbol || null,
        jsonUri: metaplex?.jsonUri || null,
        imageUri: metaplex?.document?.imageUri || metaplex?.imageUri || null,
        documentResolved: metaplex?.documentResolved === true,
        documentSource: metaplex?.documentSource || metaplex?.document?.source || null,
        capturedAt: metaplex?.capturedAt || at,
      },
      supplyAndAuthority: onchain,
      holderCount: {
        count: holderCount,
        source: jupiter?.source || null,
        capturedAt: jupiter?.capturedAt || at,
        methodology: 'Jupiter token search API holderCount for exact mint; regenerate before submission.',
      },
      marketActivity: {
        capturedAt: pool?.capturedAt || at,
        poolCreatedAt: pool?.poolCreatedAt || null,
        liquidityUsd: pool?.liquidityUsd || null,
        volume24hUsd: pool?.volume24hUsd || null,
        fdvUsd: pool?.fdvUsd || null,
        source: pool?.source || null,
      },
      productAndRepository: {
        repository: DASHA_CANONICAL.repository,
        websiteTitle: website?.title || null,
      },
      representative: {
        name: DASHA_CANONICAL.representativeName,
        email: DASHA_CANONICAL.representativeEmail,
        authorityNote: FORM_ANSWERS.requesterRelationshipNote,
      },
      collisionNote: FORM_ANSWERS.collisionNote,
      cmcMintProbe: cmcProbe,
    },
    consistencyGate: gate,
    productionGate: {
      faucet,
      pass: gate?.productionPass === true,
      blockedBy: gate?.productionBlockedBy || null,
    },
    submissionReadiness: readiness,
    manualConfirmations: readiness.manualConfirmations,
    reviewerRouting: gate?.preflightPass
      ? { useStablePage: false, primary: DASHA_CANONICAL.website }
      : {
          useStablePage: howToBuy?.stableForReviewers === true,
          primary: howToBuy?.stableForReviewers
            ? DASHA_CANONICAL.stableReviewerPage
            : DASHA_CANONICAL.website,
          blockedBy: gate?.productionBlockedBy || (gate?.identityPass ? null : DASHA_CANONICAL.productionGateIssue),
          reason: gate?.productionPass === false ? 'faucet_missing_h1' : 'preflight_incomplete',
        },
    submission: {
      submitted: false,
      confirmationId: null,
      note: 'Submit once via the official CMC form; record confirmation here after human submission.',
    },
  };
}

export function renderPacketMarkdown(packet) {
  const e = packet.evidence;
  const lines = [
    '# $DASHA — CoinMarketCap application packet (partial preflight)',
    '',
    `> ${packet.regenerationWarning}`,
    '',
    `Captured: ${packet.capturedAt}`,
    `Cost lane: ${packet.costLane}`,
    `CMC form: ${packet.cmcFormUrl}`,
    `Submission ready: **${packet.submissionReadiness.ready ? 'yes' : 'no'}** (${packet.submissionReadiness.blockers.join(', ')})`,
    `Preflight only: ${packet.submissionReadiness.preflightOnly ? 'yes' : 'no'}`,
    '',
    '## 1. Mint and explorer',
    `- Mint: \`${e.mintAndExplorer.mint}\``,
    `- Explorer: ${e.mintAndExplorer.explorer}`,
    '',
    '## 2. Canonical market pair',
    `- Pair: \`${packet.identity.pair}\``,
    `- GeckoTerminal: ${e.marketPair.geckoTerminal}`,
    `- Raydium: ${e.marketPair.raydium}`,
    `- Canonical pool created (not launch date): ${e.marketPair.canonicalPoolCreatedAt ?? 'n/a'}`,
    '',
    '## 3. Website and official social',
    `- Website: ${e.websiteAndSocial.website}`,
    `- Stable reviewer page: ${e.websiteAndSocial.stableReviewerPage}`,
    `- X: ${e.websiteAndSocial.x} (reachable: ${e.websiteAndSocial.xReachable ? 'yes' : 'no'})`,
    `- VRFD portal: ${e.vrfdDashboard?.portalUrl ?? packet.identity.urls.vrfdPortal} (reachable: ${e.vrfdDashboard?.portalReachable ? 'yes' : 'no'})`,
    `- Jupiter token page: ${e.vrfdDashboard?.tokenPageUrl ?? packet.identity.urls.jupiter}`,
    `- VRFD verified (exact mint): ${e.vrfdDashboard?.mintMatches && e.vrfdDashboard?.isVerified ? 'yes' : 'no'}`,
    '',
    '## 4. CoinGecko listing (same mint)',
    `- URL: ${packet.identity.urls.coingecko}`,
    `- Mint on CoinGecko: \`${e.coingeckoListing.mint}\``,
    `- Captured: ${e.coingeckoListing.capturedAt}`,
  ];
  if (e.coingeckoListing.rank != null) lines.push(`- Rank: ${e.coingeckoListing.rank}`);
  lines.push(
    '',
    '## 5. On-chain Metaplex metadata (primary)',
    `- Mint: \`${e.metaplexMetadata?.mint ?? 'n/a'}\``,
    `- Name/symbol: ${e.metaplexMetadata?.name ?? 'n/a'}/${e.metaplexMetadata?.symbol ?? 'n/a'}`,
    `- JSON URI: ${e.metaplexMetadata?.jsonUri ?? 'n/a'}`,
    `- Image URI: ${e.metaplexMetadata?.imageUri ?? 'n/a'}`,
    `- JSON resolved: ${e.metaplexMetadata?.documentResolved ? 'yes' : 'no'}`,
    `- Source: ${e.metaplexMetadata?.source ?? 'n/a'}`,
    '',
    '## 6. Supply, authority, and holders',
    `- Decimals: ${e.supplyAndAuthority?.decimals ?? 'n/a'}`,
    `- Total supply (UI): ${e.supplyAndAuthority?.totalSupplyUi ?? 'n/a'}`,
    `- RPC slot: ${e.supplyAndAuthority?.slot ?? 'n/a'} (${e.supplyAndAuthority?.commitment || 'finalized'})`,
    `- Mint authority: ${e.supplyAndAuthority?.mintAuthority ?? 'null'}`,
    `- Freeze authority: ${e.supplyAndAuthority?.freezeAuthority ?? 'null'}`,
    `- Supply source: ${e.supplyAndAuthority?.source ?? 'n/a'}`,
    `- Holder count: ${e.holderCount?.count ?? 'unresolved'}`,
    `- Holder source: ${e.holderCount?.source ?? 'n/a'}`,
    `- Holder methodology: ${e.holderCount?.methodology ?? 'n/a'}`,
    `- Circulating supply: ${packet.formAnswers.circulatingSupplyNote}`,
    '',
    '## 7. Market activity',
    `- Pool created: ${e.marketActivity.poolCreatedAt ?? 'n/a'}`,
    `- Liquidity USD: ${e.marketActivity.liquidityUsd ?? 'n/a'}`,
    `- 24h volume USD: ${e.marketActivity.volume24hUsd ?? 'n/a'}`,
    `- FDV USD: ${e.marketActivity.fdvUsd ?? 'n/a'}`,
    `- Source: ${e.marketActivity.source ?? 'n/a'}`,
    `- Captured: ${e.marketActivity.capturedAt}`,
    '',
    '## 8. Product and repository',
    `- Repository: ${e.productAndRepository.repository}`,
    `- Website title: ${e.productAndRepository.websiteTitle ?? 'n/a'}`,
    `- Jupiter token page: ${e.jupiterListing?.url ?? packet.identity.urls.jupiter}`,
    '',
    '## 9. Representative',
    `- ${e.representative.name} <${e.representative.email}>`,
    `- Authority note: ${e.representative.authorityNote}`,
    '',
    '## 10. Name/ticker collision',
    e.collisionNote,
    '',
    '## CMC duplicate search (manual required)',
    `- Probe URL: ${e.cmcMintProbe?.source ?? packet.identity.urls.cmcDexScan}`,
    `- HTTP status: ${e.cmcMintProbe?.status ?? 'n/a'}`,
    `- Duplicate status known: ${e.cmcMintProbe?.duplicateStatusKnown === true ? 'yes' : 'no'}`,
    `- ${e.cmcMintProbe?.note ?? 'Browser exact-mint search required.'}`,
    '',
    '## Consistency gate (partial preflight)',
    ...packet.consistencyGate.checks.map((row) => `- [${row.pass ? 'x' : ' '}] ${row.id}: ${row.detail}`),
    '',
    '## Submission readiness blockers',
    ...packet.submissionReadiness.blockers.map((row) => `- ${row}`),
    '',
    '## Form answers (draft — not submission-ready)',
    `- Relationship: ${packet.formAnswers.requesterRelationship}`,
    `- Relationship note: ${packet.formAnswers.requesterRelationshipNote}`,
    `- Launch date (CMC): ${packet.formAnswers.launchDate ?? 'UNRESOLVED — manual'}`,
    `- Launch date note: ${packet.formAnswers.launchDateNote}`,
    `- Contract: \`${packet.formAnswers.contractMint}\` (${packet.formAnswers.chain})`,
    `- Market pair: ${packet.formAnswers.marketPairUrl}`,
    '',
    '### Project description',
    packet.formAnswers.projectDescription,
    '',
    '### Differentiator',
    packet.formAnswers.differentiator,
  );
  if (packet.reviewerRouting.useStablePage) {
    lines.push('', `> Route reviewers to ${packet.reviewerRouting.primary} until ${packet.reviewerRouting.blockedBy || '#77'} is fully cleared (${packet.reviewerRouting.reason || 'production'}).`);
  }
  return `${lines.join('\n')}\n`;
}

export function packetClaimsSubmittable(packet) {
  const md = renderPacketMarkdown(packet);
  return packet.submissionReadiness.ready === false
    && !/\bsubmission ready:\s*\*\*yes\*\*/i.test(md)
    && packet.formAnswers.launchDate == null;
}

export async function buildPacket(fetchImpl = fetch, { manualConfirmations = EMPTY_MANUAL_CONFIRMATIONS } = {}) {
  const at = new Date().toISOString();
  const [onchain, coingecko, jupiter, metaplex, pool, website, howToBuy, faucet, xProfile, cmcProbe, vrfdPortal] = await Promise.all([
    fetchOnChainSupply(fetchImpl),
    fetchCoinGeckoRecord(fetchImpl),
    fetchJupiterTokenRecord(fetchImpl),
    fetchMetaplexRecord(fetchImpl),
    fetchPoolEvidence(fetchImpl),
    fetchWebsiteIdentity(fetchImpl),
    fetchHowToBuyPage(fetchImpl),
    fetchFaucetPage(fetchImpl),
    probeOfficialX(fetchImpl),
    probeCmcMintSearch(fetchImpl),
    probeVrfdPortalReachability(fetchImpl),
  ]);
  const vrfd = buildVrfdDashboard(jupiter, vrfdPortal);
  const gate = evaluateConsistencyGate({
    coingecko,
    pool,
    website,
    howToBuy,
    faucet,
    jupiter,
    xProfile,
    metaplex,
    vrfd,
  });
  return buildEvidencePacket({
    at,
    onchain,
    coingecko,
    jupiter,
    metaplex,
    vrfd,
    pool,
    website,
    howToBuy,
    faucet,
    xProfile,
    cmcProbe,
    gate,
    manualConfirmations,
  });
}

export function buildSubmissionRecord(packet) {
  return {
    schema: 'demigod.dasha-cmc-submission/1',
    issueUrl: DASHA_CANONICAL.issueUrl,
    capturedAt: packet.capturedAt,
    submitted: packet.submission.submitted,
    confirmationId: packet.submission.confirmationId,
    submittedAt: null,
    cmcFormUrl: packet.cmcFormUrl,
    reviewerRouting: packet.reviewerRouting,
    identityPass: packet.consistencyGate.identityPass,
    metadataPass: packet.consistencyGate.metadataPass,
    productionPass: packet.consistencyGate.productionPass,
    submissionReady: packet.submissionReadiness.ready,
    preflightOnly: packet.submissionReadiness.preflightOnly,
    blockers: packet.submissionReadiness.blockers,
    manualConfirmations: packet.manualConfirmations,
    note: packet.submission.note,
  };
}

export function writePacketArtifacts(packet, outPath, { asJson = false } = {}) {
  const target = path.isAbsolute(outPath) ? outPath : path.join(ROOT, outPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const body = asJson ? JSON.stringify(packet, null, 2) : renderPacketMarkdown(packet);
  fs.writeFileSync(target, body);
  const recordPath = path.join(path.dirname(target), 'DASHA-CMC-SUBMISSION-RECORD.json');
  fs.writeFileSync(recordPath, `${JSON.stringify(buildSubmissionRecord(packet), null, 2)}\n`);
  return { target, recordPath };
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'build';
  const asJson = args.includes('--json');
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

  if (cmd === 'gate') {
    const packet = await buildPacket();
    const payload = {
      ok: packet.consistencyGate.preflightPass,
      identityPass: packet.consistencyGate.identityPass,
      metadataPass: packet.consistencyGate.metadataPass,
      productionPass: packet.consistencyGate.productionPass,
      submissionReady: packet.submissionReadiness.ready,
      blockers: packet.submissionReadiness.blockers,
      gate: packet.consistencyGate,
      reviewerRouting: packet.reviewerRouting,
    };
    console.log(JSON.stringify(payload, null, 2));
    process.exit(packet.consistencyGate.identityPass ? 0 : 1);
  }

  if (cmd !== 'build') {
    console.error('usage: node demigod-dasha-cmc-packet.mjs build|gate [--json] [--out path]');
    process.exit(2);
  }

  const packet = await buildPacket();
  if (outPath) {
    const { target, recordPath } = writePacketArtifacts(packet, outPath, { asJson });
    console.error(`wrote ${target}`);
    console.error(`wrote ${recordPath}`);
  } else {
    const body = asJson ? JSON.stringify(packet, null, 2) : renderPacketMarkdown(packet);
    process.stdout.write(body);
  }
  process.exit(packet.consistencyGate.identityPass ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }, null, 2));
    process.exit(1);
  });
}
