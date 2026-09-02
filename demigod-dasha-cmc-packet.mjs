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
  repository: 'https://github.com/Uuriko/dasha-desk',
  coingeckoId: 'dash_eats',
  representativeEmail: 'potter@trydemigod.com',
  representativeName: 'Jonathan Potter',
  cmcFormUrl: 'https://coinmarketcap.com/request/',
  issueUrl: 'https://github.com/Uuriko/demigod-ops/issues/109',
  productionGateIssue: 'https://github.com/Uuriko/demigod-ops/issues/77',
});

export const FORM_ANSWERS = Object.freeze({
  requesterRelationship:
    'Official project representative / operator of the project website and official account.',
  projectDescription:
    '$DASHA is a Solana community and culture project built around one canonical mint. The public product at getdasha.com is more than a price page: it includes a wallet-optional activity lobby, token-discovery and buy guidance, a meme studio, community games, a faucet, open-source contribution surfaces and emerging bounty/mobile experiments. Browsing does not require a wallet or signature, and transaction actions are designed to remain explicit and non-custodial. The project has continued shipping public software and community tools since launch, with source and contribution history available on GitHub. This request is to establish the correct project identity and canonical Solana mint on CoinMarketCap; it is not a claim of investment safety or guaranteed market activity.',
  differentiator:
    'Dasha treats a meme token as a persistent consumer and open-source culture product rather than a short-lived trading page. The website is useful before wallet connection, exposes the exact mint prominently, and links community activity to public software, creative tools and contribution workflows. The project\'s current work includes reusable Solana activity/bounty primitives and a separate native Android experiment, while keeping custody and automatic trading outside the product boundary.',
  circulatingSupplyNote:
    'No separate circulating-supply methodology is claimed. Total supply and decimals are read from on-chain mint data at submission time; CMC may review rank-affecting supply separately.',
  collisionNote:
    'The ticker DASHA and similar names exist on other chains and assets. Identity is established only by the full Solana mint above; aggregators that map the same mint (CoinGecko dash_eats, Raydium pair, Solscan) are authoritative for this project.',
});

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));

export function buildUrls() {
  const { mint, pair, website, coingeckoId } = DASHA_CANONICAL;
  return {
    solscan: `https://solscan.io/token/${mint}`,
    geckoTerminalPool: `https://www.geckoterminal.com/solana/pools/${pair}`,
    geckoTerminalToken: `https://www.geckoterminal.com/solana/tokens/${mint}`,
    raydium: `https://raydium.io/swap/?inputMint=sol&outputMint=${mint}`,
    coingecko: `https://www.coingecko.com/en/coins/${coingeckoId}`,
    jupiter: `https://jup.ag/tokens/${mint}`,
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
  return body.result;
}

export async function fetchOnChainSupply(fetchImpl = fetch) {
  const [mintInfo, supplyInfo] = await Promise.all([
    rpcCall(fetchImpl, 'getAccountInfo', [DASHA_CANONICAL.mint, { encoding: 'jsonParsed' }]),
    rpcCall(fetchImpl, 'getTokenSupply', [DASHA_CANONICAL.mint]),
  ]);
  const parsed = mintInfo?.value?.data?.parsed?.info;
  if (!parsed || !supplyInfo?.value) throw new Error('onchain_supply_missing');
  return {
    source: SOLANA_RPC,
    decimals: parsed.decimals,
    totalSupplyRaw: supplyInfo.value.amount,
    totalSupplyUi: supplyInfo.value.uiAmountString,
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
    id: data.id,
    name: data.name,
    symbol: data.symbol,
    mint,
    homepage: data?.links?.homepage?.[0] || null,
    twitter: data?.links?.twitter_screen_name || null,
    github: data?.links?.repos_url?.github?.[0] || null,
    marketCapRank: data.market_cap_rank ?? null,
    previewListing: data.preview_listing === true,
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

export async function probeCmcMintSearch(fetchImpl = fetch) {
  const url = buildUrls().cmcDexScan;
  const response = await fetchImpl(url, { redirect: 'manual' });
  return {
    source: url,
    status: response.status,
    location: response.headers.get('location'),
    note: 'Search exact mint on CMC before submitting to avoid duplicate requests.',
  };
}

export function evaluateConsistencyGate({ coingecko, pool, website, howToBuy, faucet }) {
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

  const identityPass = checks
    .filter((row) => row.id !== 'faucet_h1')
    .every((row) => row.pass);
  const productionPass = faucet?.hasH1 === true;
  const pass = checks.every((row) => row.pass);
  return {
    pass,
    identityPass,
    productionPass,
    checks,
    productionBlockedBy: productionPass ? null : DASHA_CANONICAL.productionGateIssue,
  };
}

export function buildEvidencePacket({
  at = new Date().toISOString(),
  onchain,
  coingecko,
  pool,
  website,
  howToBuy,
  faucet,
  cmcProbe,
  gate,
}) {
  const urls = buildUrls();
  return {
    schema: 'demigod.dasha-cmc-packet/1',
    capturedAt: at,
    costLane: 'free',
    cmcFormUrl: DASHA_CANONICAL.cmcFormUrl,
    identity: {
      ...DASHA_CANONICAL,
      name: coingecko?.name || null,
      symbol: coingecko?.symbol || null,
      urls,
    },
    formAnswers: {
      ...FORM_ANSWERS,
      contractMint: DASHA_CANONICAL.mint,
      chain: DASHA_CANONICAL.chain,
      marketPairUrl: urls.geckoTerminalPool,
      launchDate: pool?.poolCreatedAt || null,
      teamRepresentative: `${DASHA_CANONICAL.representativeName} <${DASHA_CANONICAL.representativeEmail}>`,
      technicalDocs: [DASHA_CANONICAL.repository, urls.howToBuy],
    },
    evidence: {
      mintAndExplorer: { mint: DASHA_CANONICAL.mint, explorer: urls.solscan },
      marketPair: {
        pair: DASHA_CANONICAL.pair,
        raydium: urls.raydium,
        geckoTerminal: urls.geckoTerminalPool,
      },
      websiteAndSocial: {
        website: DASHA_CANONICAL.website,
        stableReviewerPage: DASHA_CANONICAL.stableReviewerPage,
        x: DASHA_CANONICAL.officialX,
      },
      coingeckoListing: {
        url: urls.coingecko,
        mint: coingecko?.mint || null,
        rank: coingecko?.marketCapRank ?? null,
      },
      supplyAndAuthority: onchain,
      marketActivity: {
        capturedAt: at,
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
      },
      collisionNote: FORM_ANSWERS.collisionNote,
    },
    consistencyGate: gate,
    productionGate: {
      faucet,
      pass: gate?.productionPass === true,
      blockedBy: gate?.productionBlockedBy || null,
    },
    cmcMintProbe: cmcProbe,
    reviewerRouting: gate?.pass
      ? { useStablePage: false, primary: DASHA_CANONICAL.website }
      : {
          useStablePage: howToBuy?.stableForReviewers === true,
          primary: howToBuy?.stableForReviewers
            ? DASHA_CANONICAL.stableReviewerPage
            : DASHA_CANONICAL.website,
          blockedBy: gate?.productionBlockedBy || (gate?.identityPass ? null : DASHA_CANONICAL.productionGateIssue),
          reason: gate?.productionPass === false ? 'faucet_missing_h1' : 'identity_mismatch',
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
    '# $DASHA — CoinMarketCap application packet',
    '',
    `Captured: ${packet.capturedAt}`,
    `Cost lane: ${packet.costLane}`,
    `CMC form: ${packet.cmcFormUrl}`,
    '',
    '## 1. Mint and explorer',
    `- Mint: \`${e.mintAndExplorer.mint}\``,
    `- Explorer: ${e.mintAndExplorer.explorer}`,
    '',
    '## 2. Canonical market pair',
    `- Pair: \`${packet.identity.pair}\``,
    `- GeckoTerminal: ${e.marketPair.geckoTerminal}`,
    `- Raydium: ${e.marketPair.raydium}`,
    '',
    '## 3. Website and official social',
    `- Website: ${e.websiteAndSocial.website}`,
    `- Stable reviewer page: ${e.websiteAndSocial.stableReviewerPage}`,
    `- X: ${e.websiteAndSocial.x}`,
    '',
    '## 4. CoinGecko listing (same mint)',
    `- URL: ${packet.identity.urls.coingecko}`,
    `- Mint on CoinGecko: \`${e.coingeckoListing.mint}\``,
  ];
  if (e.coingeckoListing.rank != null) lines.push(`- Rank: ${e.coingeckoListing.rank}`);
  lines.push(
    '',
    '## 5. Supply and authority',
    `- Decimals: ${e.supplyAndAuthority?.decimals ?? 'n/a'}`,
    `- Total supply (UI): ${e.supplyAndAuthority?.totalSupplyUi ?? 'n/a'}`,
    `- Mint authority: ${e.supplyAndAuthority?.mintAuthority ?? 'null'}`,
    `- Freeze authority: ${e.supplyAndAuthority?.freezeAuthority ?? 'null'}`,
    `- Source: ${e.supplyAndAuthority?.source ?? 'n/a'}`,
    `- Circulating supply: ${packet.formAnswers.circulatingSupplyNote}`,
    '',
    '## 6. Market activity',
    `- Pool created: ${e.marketActivity.poolCreatedAt ?? 'n/a'}`,
    `- Liquidity USD: ${e.marketActivity.liquidityUsd ?? 'n/a'}`,
    `- 24h volume USD: ${e.marketActivity.volume24hUsd ?? 'n/a'}`,
    `- FDV USD: ${e.marketActivity.fdvUsd ?? 'n/a'}`,
    `- Source: ${e.marketActivity.source ?? 'n/a'}`,
    '',
    '## 7. Product and repository',
    `- Repository: ${e.productAndRepository.repository}`,
    `- Website title: ${e.productAndRepository.websiteTitle ?? 'n/a'}`,
    '',
    '## 8. Representative',
    `- ${e.representative.name} <${e.representative.email}>`,
    '',
    '## 9. Name/ticker collision',
    e.collisionNote,
    '',
    '## Consistency gate',
    ...packet.consistencyGate.checks.map((row) => `- [${row.pass ? 'x' : ' '}] ${row.id}: ${row.detail}`),
    '',
    '## Form answers (draft)',
    `- Relationship: ${packet.formAnswers.requesterRelationship}`,
    `- Launch date: ${packet.formAnswers.launchDate ?? 'use earliest on-chain trading date'}`,
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

export async function buildPacket(fetchImpl = fetch) {
  const at = new Date().toISOString();
  const [onchain, coingecko, pool, website, howToBuy, faucet, cmcProbe] = await Promise.all([
    fetchOnChainSupply(fetchImpl),
    fetchCoinGeckoRecord(fetchImpl),
    fetchPoolEvidence(fetchImpl),
    fetchWebsiteIdentity(fetchImpl),
    fetchHowToBuyPage(fetchImpl),
    fetchFaucetPage(fetchImpl),
    probeCmcMintSearch(fetchImpl),
  ]);
  const gate = evaluateConsistencyGate({ coingecko, pool, website, howToBuy, faucet });
  return buildEvidencePacket({
    at,
    onchain,
    coingecko,
    pool,
    website,
    howToBuy,
    faucet,
    cmcProbe,
    gate,
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
    productionPass: packet.consistencyGate.productionPass,
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
      ok: packet.consistencyGate.identityPass,
      identityPass: packet.consistencyGate.identityPass,
      productionPass: packet.consistencyGate.productionPass,
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
