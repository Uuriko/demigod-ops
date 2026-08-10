#!/usr/bin/env node

import { createHash } from 'node:crypto';

const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const PAIR = '9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7';
const WSOL = 'So11111111111111111111111111111111111111112';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const RAYDIUM_AMM_V4 = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const PUMP_BONDING_CURVE = '9jLz2oviGgKvTEaKzvGumjo9eqqyynNUiCFYvHfoQgJi';
const PUMP_CREATOR = '65PayE2oiZgpSRXpdZDreJwafnkWwjtGtFwdfckTtpdo';
const RAYDIUM_LP_MINT = '8GDvsE3NbiKuo5uUFR9zgRY76mdhXuJfeDsy8hn7h3Aj';
const METADATA_PROGRAM = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const METADATA_ACCOUNT = 'ArJZQKqW1YuKgSwr4VWkVgavag1u7R8nDYSnCZASXJt3';
const METADATA_UPDATE_AUTHORITY = 'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM';
const METADATA_URI = 'https://ipfs.io/ipfs/QmU9TM9DYc8YCxZiZSmvdBcdwWvhHhZvBneoxEAkmgiLxV';
const IMAGE_URI = 'https://ipfs.io/ipfs/Qmb4fcJYbM1RSU43bvNPwUjhwGXK42L9xGvjEEijmWtAcg';
const METADATA_SHA256 = 'ce378102fe207277062b0c866a9c1848397b6ed52129a7010c347ef075c4f36f';
const IMAGE_SHA256 = '99af4d07ca80185e658fdd6c83146a7342aca99d141b01f69a33eeacae624e72';
const METADATA_X = 'https://x.com/dash_eats/status/1886425751458877863';
const MINT_SOURCE_X = 'https://x.com/dash_eats/status/2085405228078432279';
const X_PROFILE = 'https://x.com/dash_eats';
const WEBSITE = 'https://www.getdasha.com';
const EXPLORER = 'https://explorer.solana.com';
const VRFD_API = 'https://token-verify-api.jup.ag';
const QUOTE_AMOUNT = '10000000'; // 0.01 SOL
const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const get = async (url, init = {}) => {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return data;
};

const getPage = async url => {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10_000) });
  const text = await response.text();
  if (!response.ok || !text) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return { url: response.url, text };
};

const getBytes = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok || !bytes.length) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return { bytes, contentType: response.headers.get('content-type') || '' };
};

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

const base58 = bytes => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = BigInt(`0x${Buffer.from(bytes).toString('hex')}`), out = '';
  while (value) { out = alphabet[Number(value % 58n)] + out; value /= 58n; }
  for (const byte of bytes) { if (byte) break; out = `1${out}`; }
  return out || '1';
};

const decodeMetadata = encoded => {
  const bytes = Buffer.from(encoded, 'base64');
  let offset = 1;
  const updateAuthority = base58(bytes.subarray(offset, offset += 32));
  const mint = base58(bytes.subarray(offset, offset += 32));
  const string = () => {
    const size = bytes.readUInt32LE(offset); offset += 4;
    const value = bytes.subarray(offset, offset += size).toString('utf8').replace(/\0+$/g, '');
    return value;
  };
  const name = string(), symbol = string(), uri = string();
  offset += 2; // seller fee basis points
  const creators = [];
  if (bytes[offset++]) {
    const count = bytes.readUInt32LE(offset); offset += 4;
    for (let index = 0; index < count; index++) {
      creators.push({ address: base58(bytes.subarray(offset, offset += 32)), verified: Boolean(bytes[offset++]), share: bytes[offset++] });
    }
  }
  offset++; // primary sale happened
  const isMutable = Boolean(bytes[offset]);
  return { updateAuthority, mint, name, symbol, uri, creators, isMutable };
};

const decodePumpCreator = encoded => {
  const bytes = Buffer.from(encoded, 'base64');
  return bytes.length >= 81 ? base58(bytes.subarray(49, 81)) : null;
};

const account = await get(RPC, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [MINT, { encoding: 'jsonParsed', commitment: 'finalized' }] }),
});
const value = account.result?.value;
const info = value?.data?.parsed?.info;
const failures = [];
if (value?.owner !== TOKEN_PROGRAM) failures.push(`unexpected token program: ${value?.owner || 'missing'}`);
if (value?.data?.parsed?.type !== 'mint' || info?.isInitialized !== true) failures.push('mint is missing or uninitialized');
if (info?.decimals !== 6) failures.push(`unexpected decimals: ${info?.decimals}`);
if (info?.mintAuthority !== null) failures.push('mint authority is not null');
if (info?.freezeAuthority !== null) failures.push('freeze authority is not null');
try { if (BigInt(info?.supply || 0) <= 0n) failures.push('supply is not positive'); } catch { failures.push('invalid supply'); }

const poolAccount = await get(RPC, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'getAccountInfo', params: [PAIR, { encoding: 'base64', commitment: 'finalized' }] }),
});
if (poolAccount.result?.value?.owner !== RAYDIUM_AMM_V4 || poolAccount.result?.value?.executable !== false) failures.push('canonical pool account owner mismatch');

const pumpCoin = await get(`https://frontend-api-v3.pump.fun/coins/${MINT}`);
if (pumpCoin.mint !== MINT || pumpCoin.bonding_curve !== PUMP_BONDING_CURVE) failures.push('Pump coin identity mismatch');
if (pumpCoin.creator !== PUMP_CREATOR) failures.push('Pump frontend creator record mismatch');
if (pumpCoin.complete !== true || pumpCoin.raydium_pool !== PAIR) failures.push('Pump migration record mismatch');
const pumpBondingCurve = await get(RPC, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'getAccountInfo', params: [PUMP_BONDING_CURVE, { encoding: 'base64', commitment: 'finalized' }] }),
});
const pumpBondingValue = pumpBondingCurve.result?.value;
const pumpOnchainCreator = pumpBondingValue?.data?.[0] ? decodePumpCreator(pumpBondingValue.data[0]) : null;
if (pumpBondingValue?.owner !== PUMP_PROGRAM || pumpBondingValue?.executable !== false) failures.push('Pump bonding curve owner mismatch');
if (pumpOnchainCreator && pumpOnchainCreator !== PUMP_CREATOR) failures.push('Pump finalized creator field mismatch');

const metadataAccounts = await get(RPC, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'getProgramAccounts', params: [METADATA_PROGRAM, { encoding: 'base64', commitment: 'finalized', filters: [{ memcmp: { offset: 33, bytes: MINT } }] }] }),
});
if (metadataAccounts.result?.length !== 1) failures.push(`expected one metadata account, found ${metadataAccounts.result?.length ?? 'none'}`);
const metadataRow = metadataAccounts.result?.[0];
const metadata = metadataRow?.account?.data?.[0] ? decodeMetadata(metadataRow.account.data[0]) : null;
if (metadataRow?.pubkey !== METADATA_ACCOUNT) failures.push('metadata account address mismatch');
if (metadataRow?.account?.owner !== METADATA_PROGRAM) failures.push('metadata account owner mismatch');
if (metadata?.updateAuthority !== METADATA_UPDATE_AUTHORITY) failures.push('metadata update authority mismatch');
if (metadata?.mint !== MINT) failures.push('metadata mint mismatch');
if (metadata?.name !== 'dash_eats' || metadata?.symbol !== 'dasha') failures.push('metadata name or symbol mismatch');
if (metadata?.uri !== METADATA_URI) failures.push('metadata URI mismatch');
if (metadata?.isMutable !== false) failures.push('metadata is mutable');

const metadataPayload = await getBytes(METADATA_URI);
const metadataJson = JSON.parse(metadataPayload.bytes.toString('utf8'));
if (metadataJson.name !== 'dash_eats' || metadataJson.symbol !== 'dasha') failures.push('off-chain metadata name or symbol mismatch');
if (metadataJson.image !== IMAGE_URI) failures.push('off-chain metadata image mismatch');
if (metadataJson.twitter !== METADATA_X || metadataJson.description !== METADATA_X) failures.push('off-chain metadata X source mismatch');
if (metadataJson.createdOn !== 'https://pump.fun') failures.push('off-chain metadata launch source mismatch');
if (['website', 'telegram', 'discord'].some(field => Object.hasOwn(metadataJson, field))) failures.push('off-chain metadata contains an unexpected community link');
const imagePayload = await getBytes(IMAGE_URI);
if (!/^image\//.test(imagePayload.contentType)) failures.push('token image is unavailable');
const metadataHash = sha256(metadataPayload.bytes), imageHash = sha256(imagePayload.bytes);
if (metadataHash !== METADATA_SHA256) failures.push('IPFS metadata bytes do not match the pinned digest');
if (imageHash !== IMAGE_SHA256) failures.push('IPFS image bytes do not match the pinned digest');

let mintSourcePost = null, mintSourcePostError = null;
try {
  mintSourcePost = await get(`https://publish.x.com/oembed?url=${encodeURIComponent(MINT_SOURCE_X)}&omit_script=true`);
  if (mintSourcePost.url !== MINT_SOURCE_X || mintSourcePost.author_url !== X_PROFILE) failures.push('public mint-source post identity mismatch');
  if (!String(mintSourcePost.html || '').includes(MINT)) failures.push('public mint-source post does not contain the exact mint');
} catch (error) {
  mintSourcePostError = String(error?.message || error);
}

const altGateway = async url => {
  try { return { ok: true, ...(await getBytes(url.replace('https://ipfs.io/', 'https://dweb.link/'))) }; }
  catch (error) { return { ok: false, error: String(error?.message || error) }; }
};
const [alternateMetadata, alternateImage] = await Promise.all([altGateway(METADATA_URI), altGateway(IMAGE_URI)]);
if (alternateMetadata.ok && !alternateMetadata.bytes.equals(metadataPayload.bytes)) failures.push('IPFS gateways disagree on metadata bytes');
if (alternateImage.ok && !alternateImage.bytes.equals(imagePayload.bytes)) failures.push('IPFS gateways disagree on image bytes');

const rugcheck = await get(`https://api.rugcheck.xyz/v1/tokens/${MINT}/report`);
if (rugcheck.mint !== MINT || rugcheck.tokenProgram !== TOKEN_PROGRAM) failures.push('Rugcheck token identity mismatch');
if (rugcheck.token?.mintAuthority !== null || rugcheck.token?.freezeAuthority !== null) failures.push('Rugcheck authority readback mismatch');
if (rugcheck.tokenMeta?.name !== 'dash_eats' || rugcheck.tokenMeta?.symbol !== 'dasha' || rugcheck.tokenMeta?.uri !== METADATA_URI) failures.push('Rugcheck metadata identity mismatch');
if (rugcheck.tokenMeta?.mutable !== false) failures.push('Rugcheck does not report immutable metadata');

const canonicalMarket = rugcheck.markets?.find?.(market => market.pubkey === PAIR);
if (!canonicalMarket || canonicalMarket.marketType !== 'raydium') failures.push('Rugcheck canonical Raydium market missing');
if (canonicalMarket && ![canonicalMarket.mintA, canonicalMarket.mintB].includes(MINT)) failures.push('Rugcheck market lost Dasha mint');
if (canonicalMarket && ![canonicalMarket.mintA, canonicalMarket.mintB].includes(WSOL)) failures.push('Rugcheck market lost WSOL mint');
if (canonicalMarket?.mintLP !== RAYDIUM_LP_MINT) failures.push('Rugcheck market LP mint mismatch');
let finalizedVaults = null;
if (canonicalMarket?.liquidityA && canonicalMarket?.liquidityB) {
  finalizedVaults = await get(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'getMultipleAccounts', params: [[canonicalMarket.liquidityA, canonicalMarket.liquidityB], { encoding: 'jsonParsed', commitment: 'finalized' }] }),
  });
  for (const [index, expected] of [canonicalMarket.liquidityAAccount, canonicalMarket.liquidityBAccount].entries()) {
    const row = finalizedVaults.result?.value?.[index];
    const parsed = row?.data?.parsed?.info;
    if (row?.owner !== TOKEN_PROGRAM || row?.executable !== false) failures.push(`canonical pool vault ${index + 1} owner mismatch`);
    if (parsed?.mint !== expected?.mint || parsed?.owner !== expected?.owner) failures.push(`canonical pool vault ${index + 1} identity mismatch`);
  }
}
const marketVaults = new Set((rugcheck.markets || []).flatMap(market => [market.liquidityA, market.liquidityB]).filter(Boolean));
const largestAccounts = (rugcheck.topHolders || []).slice(0, 10).map(row => ({
  address: row.address,
  owner: row.owner,
  pct: Number(row.pct),
  marketVault: marketVaults.has(row.address),
}));
if (largestAccounts.some(row => !Number.isFinite(row.pct) || row.pct < 0 || row.pct > 100)) failures.push('invalid largest-token-account percentage');

const jupiterTokenRows = await get(`https://lite-api.jup.ag/tokens/v2/search?query=${MINT}`);
const jupiterToken = jupiterTokenRows.find?.(row => row.id === MINT);
const jupiterNameRows = await get('https://lite-api.jup.ag/tokens/v2/search?query=dash_eats');
const jupiterNameCanonical = jupiterNameRows.find?.(row => row.id === MINT);
const jupiterNameCanonicalRank = jupiterNameRows.findIndex?.(row => row.id === MINT) + 1 || null;
const jupiterIdentityCollisions = jupiterNameRows.filter?.(row => row.id !== MINT && row.name?.toLowerCase() === 'dash_eats' && row.symbol?.toLowerCase() === 'dasha') || [];
if (!jupiterToken) failures.push('Jupiter token discovery record missing');
if (jupiterToken?.name !== 'dash_eats' || jupiterToken?.symbol !== 'dasha') failures.push('Jupiter token name or symbol mismatch');
if (jupiterToken?.icon !== IMAGE_URI) failures.push('Jupiter token image mismatch');
if (![METADATA_X, X_PROFILE].includes(jupiterToken?.twitter)) failures.push('Jupiter token X identity mismatch');
if (jupiterToken?.decimals !== 6 || jupiterToken?.tokenProgram !== TOKEN_PROGRAM) failures.push('Jupiter token program or decimals mismatch');
if (jupiterToken?.launchpad !== 'pump.fun' || jupiterToken?.graduatedPool !== PAIR) failures.push('Jupiter launch identity mismatch');
if (jupiterToken?.audit?.isSus === true) failures.push('Jupiter audit flags the token');
if (jupiterToken?.verification === 'banned' || jupiterToken?.tags?.includes('banned')) failures.push('Jupiter explicitly bans the token');

const vrfdVerification = (await get(`${VRFD_API}/verifications/token/${MINT}`)).data;
const vrfdAudit = (await get(`${VRFD_API}/audit/verifications/token/${MINT}`)).data?.[0];
if (vrfdVerification?.tokenId !== MINT) failures.push('Jupiter VRFD verification record mint mismatch');
if (vrfdAudit?.tokenId !== MINT) failures.push('Jupiter VRFD audit record mint mismatch');
for (const field of ['tokenId', 'twitterHandle', 'senderTwitterHandle', 'status', 'evaluationCount', 'description']) {
  if (vrfdAudit?.[field] !== vrfdVerification?.[field]) failures.push(`Jupiter VRFD core/audit ${field} mismatch`);
}

const discoveryGaps = [];
if (mintSourcePostError) discoveryGaps.push('Public mint-source post could not be corroborated through X oEmbed');
const dex = await get(`https://api.dexscreener.com/latest/dex/tokens/${MINT}`);
const pair = dex.pairs?.find(row => row.chainId === 'solana' && row.pairAddress?.toLowerCase() === PAIR.toLowerCase());
if (!pair) failures.push('canonical Dexscreener pair missing');
if (pair?.dexId !== 'raydium') failures.push(`unexpected DEX: ${pair?.dexId || 'missing'}`);
if (pair?.baseToken?.address !== MINT) failures.push('pair base mint mismatch');
if (pair?.quoteToken?.address !== WSOL) failures.push('pair quote is not wrapped SOL');
const dexWebsites = (pair?.info?.websites || []).map(row => row?.url).filter(Boolean);
const dexSocials = (pair?.info?.socials || []).map(row => ({ type: row?.type || null, url: row?.url || null })).filter(row => row.url);
if (dexWebsites.some(url => url !== WEBSITE)) discoveryGaps.push(`Dexscreener profile links a non-canonical website: ${dexWebsites.join(', ')}`);
if (dexSocials.some(row => { try { return /(?:^|\.)t\.me$/i.test(new URL(row.url).hostname) || /telegram/i.test(row.type || ''); } catch { return true; } })) discoveryGaps.push('Dexscreener profile still exposes Telegram');
if (!dexSocials.some(row => row.url === X_PROFILE || row.url.startsWith(`${X_PROFILE}/status/`))) discoveryGaps.push('Dexscreener profile does not link the canonical X identity');

const gecko = await get(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${PAIR}?include=base_token,quote_token`);
const geckoToken = await get(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${MINT}`);
if (gecko.data?.attributes?.address !== PAIR) failures.push('GeckoTerminal canonical pool missing');
if (gecko.data?.relationships?.dex?.data?.id !== 'raydium') failures.push('GeckoTerminal DEX mismatch');
if (gecko.data?.relationships?.base_token?.data?.id !== `solana_${MINT}`) failures.push('GeckoTerminal base mint mismatch');
if (gecko.data?.relationships?.quote_token?.data?.id !== `solana_${WSOL}`) failures.push('GeckoTerminal quote mint mismatch');
if (geckoToken.data?.id !== `solana_${MINT}` || geckoToken.data?.attributes?.name !== 'dash_eats' || geckoToken.data?.attributes?.symbol !== 'dasha') failures.push('GeckoTerminal token identity mismatch');
if (!geckoToken.data?.attributes?.coingecko_coin_id) discoveryGaps.push('GeckoTerminal exact-mint record has no CoinGecko coin ID');

// Raydium's own canonical registry must agree with the two independent market indexes.
const raydiumPools = await get(`https://api-v3.raydium.io/pools/info/ids?ids=${PAIR}`);
const raydiumPool = raydiumPools.success === true && Array.isArray(raydiumPools.data)
  ? raydiumPools.data.find(row => row.id === PAIR)
  : null;
if (!raydiumPool) failures.push('Raydium canonical pool missing');
if (raydiumPool?.programId !== RAYDIUM_AMM_V4 || raydiumPool?.type !== 'Standard') failures.push('Raydium pool is not canonical AMM v4');
if (raydiumPool?.lpMint?.address !== RAYDIUM_LP_MINT || raydiumPool?.lpMint?.programId !== TOKEN_PROGRAM) failures.push('Raydium LP mint mismatch');
const raydiumMints = [raydiumPool?.mintA, raydiumPool?.mintB];
const raydiumDasha = raydiumMints.find(mint => mint?.address === MINT);
const raydiumWsol = raydiumMints.find(mint => mint?.address === WSOL);
if (!raydiumDasha || raydiumDasha.programId !== TOKEN_PROGRAM || raydiumDasha.decimals !== 6) failures.push('Raydium Dasha mint mismatch');
if (!raydiumWsol || raydiumWsol.programId !== TOKEN_PROGRAM || raydiumWsol.decimals !== 9) failures.push('Raydium WSOL mint mismatch');

if (!alternateMetadata.ok || !alternateImage.ok) discoveryGaps.push('Independent IPFS gateway corroboration is temporarily unavailable');
if (jupiterToken?.website !== WEBSITE) discoveryGaps.push('Jupiter metadata does not link getdasha.com');
if (jupiterToken?.twitter !== X_PROFILE) discoveryGaps.push('Jupiter metadata still links the source post instead of the canonical X profile');
if (jupiterToken?.isVerified !== true) discoveryGaps.push('Jupiter response does not positively report V4 verification');
if (vrfdVerification?.status === 'pending' && vrfdVerification?.twitterHandle !== 'dash_eats') discoveryGaps.push('Pending Jupiter request uses a different X handle than getdasha.com');
if (vrfdVerification?.status === 'pending' && /\bofficial\b/i.test(vrfdVerification?.description || '')) discoveryGaps.push('Pending Jupiter request makes an unproven official-token claim');
if (!jupiterNameCanonical) discoveryGaps.push('Jupiter dash_eats name search does not surface the exact mint');
if (jupiterNameCanonicalRank > 1) discoveryGaps.push(`Jupiter dash_eats name search ranks the exact mint #${jupiterNameCanonicalRank}`);
if (jupiterIdentityCollisions.length) discoveryGaps.push(`Jupiter dash_eats name search contains ${jupiterIdentityCollisions.length} competing name/symbol mints`);

// Explorer direct-address identity, search discovery, and provider badges are separate surfaces.
const explorerUrl = `${EXPLORER}/address/${MINT}`;
const [explorerPage, explorerMintSearch, explorerNameSearch, explorerRugcheck, explorerJupiter, explorerCoinGecko, explorerBluprynt] = await Promise.all([
  getPage(explorerUrl),
  get(`${EXPLORER}/api/search?q=${MINT}`),
  get(`${EXPLORER}/api/search?q=${encodeURIComponent('dash_eats')}`),
  get(`${EXPLORER}/api/verification/rugcheck/${MINT}`),
  get(`${EXPLORER}/api/verification/jupiter/${MINT}`),
  get(`${EXPLORER}/api/verification/coingecko/${MINT}`),
  get(`${EXPLORER}/api/verification/bluprynt/${MINT}`),
]);
const explorerIdentityMatched = explorerPage.text.includes(MINT) && explorerPage.text.includes('dash_eats');
const explorerSearchHasMint = result => result?.results?.tokens?.some?.(token => token.tokenAddress === MINT) === true;
const explorerNameTokens = explorerNameSearch?.results?.tokens || [];
const explorerSameImageCompetitors = explorerNameTokens.filter(token => token.tokenAddress !== MINT && token.icon === IMAGE_URI);
if (!explorerIdentityMatched) failures.push('Solana Explorer direct token page identity mismatch');
if (!explorerSearchHasMint(explorerMintSearch)) discoveryGaps.push('Solana Explorer exact-mint search does not surface the token');
if (!explorerSearchHasMint(explorerNameSearch)) discoveryGaps.push('Solana Explorer dash_eats search does not surface the token');
if (explorerSameImageCompetitors.length) discoveryGaps.push(`Solana Explorer dash_eats search contains ${explorerSameImageCompetitors.length} same-image competing mints`);
if (explorerRugcheck.score !== rugcheck.score_normalised) discoveryGaps.push('Solana Explorer Rugcheck score disagrees with the current direct Rugcheck report');

const phantomUrl = `https://phantom.com/tokens/solana/${MINT}`;
const phantomPage = await getPage(phantomUrl);
const phantomHtml = phantomPage.text;
if (!phantomHtml.includes(MINT) || !phantomHtml.includes('dash_eats')) failures.push('Phantom token page identity mismatch');
const phantomUnverified = /This token is unverified/i.test(phantomHtml);
const phantomSourcePost = phantomHtml.includes(METADATA_X);
if (phantomUnverified) discoveryGaps.push('Phantom does not positively report token verification');
if (phantomSourcePost) discoveryGaps.push('Phantom About still shows the immutable source post instead of getdasha.com');

const solflareUrl = `https://www.solflare.com/prices/dash-eats/${MINT}/`;
const solflarePage = await getPage(solflareUrl);
const solflareHtml = solflarePage.text;
const solflareIdentityMatched = solflareHtml.includes(MINT) && solflareHtml.includes('dash_eats');
const solflareUnverified = /Unverified token|Not verified/i.test(solflareHtml);
const solflareMutableYes = /marketDataCardTitle[^>]*>Mutable<\/h3><div[^>]*marketDataCardValue[^>]*>Yes<\/div>/i.test(solflareHtml);
if (!solflareIdentityMatched) failures.push('Solflare token page identity mismatch');
if (solflareUnverified) discoveryGaps.push('Solflare does not positively report token verification');
if (solflareMutableYes && metadata?.isMutable === false && rugcheck.tokenMeta?.mutable === false) discoveryGaps.push('Solflare renders stale mutable metadata even though finalized Metaplex and current Rugcheck both report immutable');

const routeUrls = {
  jupiter: `https://jup.ag/swap?sell=${WSOL}&buy=${MINT}`,
  pump: `https://pump.fun/coin/${MINT}`,
  raydium: `https://raydium.io/swap/?inputMint=sol&outputMint=${MINT}`,
};
const routePages = Object.fromEntries(await Promise.all(Object.entries(routeUrls).map(async ([name, url]) => [name, await getPage(url)])));
for (const [name, page] of Object.entries({ ...routePages, phantom: phantomPage })) {
  if (!page.url.includes(MINT)) failures.push(`${name} route lost the exact mint after redirects`);
}
if (!routePages.pump.text.includes('dash_eats')) failures.push('Pump.fun coin page identity mismatch');

const order = await get(`https://api.jup.ag/swap/v2/order?inputMint=${WSOL}&outputMint=${MINT}&amount=${QUOTE_AMOUNT}`);
if (order.inputMint !== WSOL || order.outputMint !== MINT || order.inAmount !== QUOTE_AMOUNT) failures.push('Jupiter order pair mismatch');
try { if (BigInt(order.outAmount || 0) <= 0n) failures.push('Jupiter returned no output'); } catch { failures.push('invalid Jupiter output'); }
if (!order.routePlan?.length) failures.push('Jupiter returned no route');

const report = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  slot: account.result?.context?.slot || null,
  mint: MINT,
  tokenProgram: value?.owner || null,
  decimals: info?.decimals ?? null,
  mintAuthority: info?.mintAuthority ?? null,
  freezeAuthority: info?.freezeAuthority ?? null,
  supplyRaw: info?.supply || null,
  poolAccount: { address: PAIR, owner: poolAccount.result?.value?.owner || null, executable: poolAccount.result?.value?.executable ?? null, slot: poolAccount.result?.context?.slot || null },
  economicControl: {
    pumpCreator: pumpOnchainCreator,
    pumpFrontendCreator: pumpCoin.creator || null,
    metadataCreators: metadata?.creators || [],
    bondingCurve: PUMP_BONDING_CURVE,
    bondingCurveOwner: pumpBondingValue?.owner || null,
    finalizedSlot: pumpBondingCurve.result?.context?.slot || null,
    migratedTo: pumpCoin.raydium_pool || null,
    complete: pumpCoin.complete ?? null,
    cashbackEnabled: pumpCoin.is_cashback_enabled ?? null,
    note: pumpOnchainCreator
      ? 'The finalized Pump creator field identifies the protocol fee-recipient identity. It does not prove who controls that wallet, a relationship to getdasha.com, token ownership, endorsement, or current fee income.'
      : 'This completed legacy bonding curve predates the onchain creator-field extension. Pump frontend and Metaplex creator records are provenance signals, not proof of the current fee recipient, wallet control, a relationship to getdasha.com, token ownership, endorsement, or current fee income.',
  },
  metadata: metadata ? { account: metadataRow.pubkey, ...metadata, image: metadataJson.image || null, twitter: metadataJson.twitter || null, imageType: imagePayload.contentType } : null,
  xProvenance: {
    immutableLorePost: METADATA_X,
    publicMintSourcePost: MINT_SOURCE_X,
    mintSourceCorroborated: Boolean(mintSourcePost && String(mintSourcePost.html || '').includes(MINT)),
    mintSourceAuthor: mintSourcePost?.author_url || null,
    mintSourceError: mintSourcePostError,
    note: 'The immutable metadata post establishes the original lore link; the later public post contains the complete mint. Neither is a substitute for finalized account identity.',
  },
  ipfsGateways: {
    primary: 'ipfs.io',
    alternate: 'dweb.link',
    metadata: { corroborated: alternateMetadata.ok && alternateMetadata.bytes.equals(metadataPayload.bytes), bytes: metadataPayload.bytes.length, sha256: metadataHash },
    image: { corroborated: alternateImage.ok && alternateImage.bytes.equals(imagePayload.bytes), bytes: imagePayload.bytes.length, sha256: imageHash },
  },
  rugcheck: { mint: rugcheck.mint || null, tokenProgram: rugcheck.tokenProgram || null, mutable: rugcheck.tokenMeta?.mutable ?? null, mintAuthority: rugcheck.token?.mintAuthority ?? null, freezeAuthority: rugcheck.token?.freezeAuthority ?? null, risks: Array.isArray(rugcheck.risks) ? rugcheck.risks.length : null, score: rugcheck.score_normalised ?? null },
  marketReserves: canonicalMarket && finalizedVaults ? {
    pool: canonicalMarket.pubkey,
    finalizedSlot: finalizedVaults.result?.context?.slot || null,
    vaults: [canonicalMarket.liquidityA, canonicalMarket.liquidityB].map((address, index) => {
      const vault = finalizedVaults.result?.value?.[index]?.data?.parsed?.info;
      const rugcheckAmount = String([canonicalMarket.liquidityAAccount, canonicalMarket.liquidityBAccount][index]?.amount ?? '');
      return { address, mint: vault?.mint || null, owner: vault?.owner || null, amount: vault?.tokenAmount?.amount || null, uiAmount: vault?.tokenAmount?.uiAmountString || null, rugcheckAmount, sameAtRead: vault?.tokenAmount?.amount === rugcheckAmount };
    }),
    note: 'Finalized token-account reserves, not a promise of price, depth, or permanence.',
  } : null,
  tokenAccountConcentration: {
    source: 'Rugcheck topHolders',
    totalHolders: rugcheck.totalHolders ?? null,
    top10Pct: largestAccounts.reduce((sum, row) => sum + row.pct, 0),
    top10NonMarketPct: largestAccounts.filter(row => !row.marketVault).reduce((sum, row) => sum + row.pct, 0),
    accounts: largestAccounts,
    note: 'Token accounts are not unique people or beneficial owners; market vaults are labeled and not counted as non-market concentration.',
  },
  jupiterToken: jupiterToken ? { id: jupiterToken.id, name: jupiterToken.name, symbol: jupiterToken.symbol, icon: jupiterToken.icon, twitter: jupiterToken.twitter || null, website: jupiterToken.website || null, verification: jupiterToken.verification || null, isVerified: jupiterToken.isVerified ?? null, isSus: jupiterToken.audit?.isSus ?? null, organicScore: jupiterToken.organicScore ?? null, organicScoreLabel: jupiterToken.organicScoreLabel || null, holderCount: jupiterToken.holderCount ?? null, audit: { mintAuthorityDisabled: jupiterToken.audit?.mintAuthorityDisabled ?? null, freezeAuthorityDisabled: jupiterToken.audit?.freezeAuthorityDisabled ?? null, topHoldersPercentage: jupiterToken.audit?.topHoldersPercentage ?? null }, organicActivity: { stats6h: jupiterToken.stats6h || null, stats24h: jupiterToken.stats24h || null, note: 'Provider-relative discovery telemetry, not unique people, product success, safety, or a public performance claim. Never optimize with raids, wash activity, or rewards.' }, tags: jupiterToken.tags || [], updatedAt: jupiterToken.updatedAt || null, decimals: jupiterToken.decimals, tokenProgram: jupiterToken.tokenProgram, launchpad: jupiterToken.launchpad, graduatedPool: jupiterToken.graduatedPool } : null,
  holderCountObservations: {
    jupiter: jupiterToken?.holderCount ?? null,
    rugcheck: rugcheck.totalHolders ?? null,
    comparable: false,
    note: 'Provider holder counts use undisclosed or incompatible definitions; token accounts are not unique people. Do not use either count as a product KPI or public claim.',
  },
  jupiterNameSearch: { canonicalFound: Boolean(jupiterNameCanonical), canonicalRank: jupiterNameCanonicalRank, total: jupiterNameRows.length, collisions: jupiterIdentityCollisions.map(row => ({ id: row.id, name: row.name, symbol: row.symbol, tokenProgram: row.tokenProgram || null, isVerified: row.isVerified ?? null, iconReferencesCanonicalMint: row.icon?.includes(MINT) || false })) },
  vrfd: vrfdVerification ? { workflow: 'V4', coreId: vrfdVerification.id, auditEventId: vrfdAudit?.id ?? null, tokenId: vrfdVerification.tokenId, status: vrfdVerification.status, evaluationCount: vrfdVerification.evaluationCount ?? null, twitterHandle: vrfdVerification.twitterHandle || null, senderTwitterHandle: vrfdVerification.senderTwitterHandle || null, requestOrigin: vrfdVerification.requestOrigin || null, createdAt: vrfdVerification.createdAt || null, updatedAt: vrfdVerification.updatedAt || null, verifiedAt: vrfdVerification.verifiedAt || null, descriptionClaimsOfficial: /\bofficial\b/i.test(vrfdVerification.description || '') } : null,
  pair: pair ? { address: pair.pairAddress, dex: pair.dexId, quote: pair.quoteToken?.address } : null,
  dexscreenerProfile: { websites: dexWebsites, socials: dexSocials, mutablePresentationOnly: true },
  geckoTerminal: { address: gecko.data?.attributes?.address || null, dex: gecko.data?.relationships?.dex?.data?.id || null, base: gecko.data?.relationships?.base_token?.data?.id?.replace(/^solana_/, '') || null, quote: gecko.data?.relationships?.quote_token?.data?.id?.replace(/^solana_/, '') || null, tokenId: geckoToken.data?.id || null, coinGeckoId: geckoToken.data?.attributes?.coingecko_coin_id || null },
  raydium: raydiumPool ? { address: raydiumPool.id, type: raydiumPool.type, programId: raydiumPool.programId, lpMint: raydiumPool.lpMint?.address || null, mints: raydiumMints.map(mint => ({ address: mint?.address || null, programId: mint?.programId || null, decimals: mint?.decimals ?? null })) } : null,
  routes: Object.fromEntries(Object.entries({ ...routePages, phantom: phantomPage }).map(([name, page]) => [name, { finalUrl: page.url, mintPreserved: page.url.includes(MINT) }])),
  phantom: { url: phantomUrl, identityMatched: phantomHtml.includes(MINT) && phantomHtml.includes('dash_eats'), explicitlyUnverified: phantomUnverified, aboutUsesSourcePost: phantomSourcePost },
  solflare: { url: solflareUrl, identityMatched: solflareIdentityMatched, explicitlyUnverified: solflareUnverified, reportsMutable: solflareMutableYes, onchainMutable: metadata?.isMutable ?? null, rugcheckMutable: rugcheck.tokenMeta?.mutable ?? null },
  explorer: {
    url: explorerUrl,
    identityMatched: explorerIdentityMatched,
    search: {
      mint: { found: explorerSearchHasMint(explorerMintSearch), total: explorerMintSearch.meta?.total ?? null },
      name: { found: explorerSearchHasMint(explorerNameSearch), total: explorerNameSearch.meta?.total ?? null, matches: explorerNameTokens.map(token => ({ tokenAddress: token.tokenAddress, name: token.name, ticker: token.ticker, isVerified: token.isVerified, sameCanonicalImage: token.icon === IMAGE_URI })) },
    },
    providers: {
      rugcheckScore: explorerRugcheck.score ?? null,
      jupiterVerified: explorerJupiter.verified ?? null,
      coinGeckoVerified: explorerCoinGecko.verified ?? null,
      blupryntVerified: explorerBluprynt.verified ?? null,
    },
  },
  jupiter: { api: 'swap/v2/order', inputMint: order.inputMint || null, outputMint: order.outputMint || null, inAmount: order.inAmount || null, outAmount: order.outAmount || null, router: order.router || null, routes: order.routePlan?.length || 0 },
  discoveryGaps,
  failures,
};

const output = process.argv.includes('--summary') ? {
  ok: report.ok,
  checkedAt: report.checkedAt,
  slot: report.slot,
  mint: report.mint,
  durableIdentity: {
    tokenProgram: report.tokenProgram,
    decimals: report.decimals,
    mintAuthority: report.mintAuthority,
    freezeAuthority: report.freezeAuthority,
    metadataImmutable: report.metadata?.isMutable === false,
    canonicalPoolOwner: report.poolAccount.owner,
    jupiterRoute: report.jupiter.routes > 0,
  },
  providerIdentity: {
    dexscreener: report.dexscreenerProfile,
    jupiter: {
      website: report.jupiterToken?.website || null,
      twitter: report.jupiterToken?.twitter || null,
      verified: report.jupiterToken?.isVerified === true,
    },
    vrfd: report.vrfd,
    geckoTerminal: report.geckoTerminal,
    explorer: {
      directIdentityMatched: report.explorer.identityMatched,
      exactMintSearchFound: report.explorer.search.mint.found,
      nameSearchFound: report.explorer.search.name.found,
      providers: report.explorer.providers,
    },
    phantom: report.phantom,
    solflare: report.solflare,
  },
  preparedMetadataCorrection: {
    needed: report.jupiterToken?.website !== WEBSITE || report.jupiterToken?.twitter !== X_PROFILE,
    target: { tokenId: MINT, website: WEBSITE, twitter: X_PROFILE },
    current: {
      website: report.jupiterToken?.website || null,
      twitter: report.jupiterToken?.twitter || null,
    },
    pendingVerificationIdentityConflict:
      report.vrfd?.status === 'pending' &&
      (String(report.vrfd.twitterHandle || '').replace(/^@/, '').toLowerCase() !== 'dash_eats' || report.vrfd.descriptionClaimsOfficial),
    note: 'Prepared read-only target. Submission, payment, support contact, or public posting remains separately authorized.',
  },
  discoveryActionQueue: [
    {
      priority: 1,
      action: 'Correct Jupiter website and X metadata',
      state: report.jupiterToken?.website === WEBSITE && report.jupiterToken?.twitter === X_PROFILE ? 'done' : 'prepared-external',
      reason: 'Explorer search currently discovers tokens through Jupiter Tokens V2; the exact correction payload is prepared.',
    },
    {
      priority: 2,
      action: 'Jupiter verification review',
      state: report.vrfd?.status === 'pending' ? 'wait-existing-request' : report.jupiterToken?.isVerified === true ? 'done' : 'review-before-action',
      reason: report.vrfd?.status === 'pending' ? 'An exact-mint request already exists; do not submit a duplicate.' : 'Re-read VRFD state before any new request.',
    },
    {
      priority: 3,
      action: 'CoinGecko or GeckoTerminal identity review',
      state: report.geckoTerminal?.coinGeckoId ? 'done' : 'externally-gated',
      reason: report.geckoTerminal?.coinGeckoId ? 'The exact GeckoTerminal token record has a CoinGecko ID.' : 'Requires consistent public website/social evidence, an authenticated request, and a public verification-post sequence.',
    },
    {
      priority: 4,
      action: 'Read back downstream providers',
      state: 'monitor-only',
      reason: 'Explorer, Phantom, Solflare, and Dexscreener presentation cannot be repaired by another local integration or duplicate submission.',
    },
  ],
  marketQualityObservation: {
    pool: report.marketReserves?.pool || null,
    finalizedSlot: report.marketReserves?.finalizedSlot || null,
    reserveAccountsMatchProviderRead: report.marketReserves?.vaults?.every(vault => vault.sameAtRead) ?? null,
    top10TokenAccountPct: report.tokenAccountConcentration.top10Pct,
    top10NonMarketTokenAccountPct: report.tokenAccountConcentration.top10NonMarketPct,
    providerHolderCountsAgree: report.holderCountObservations.jupiter === report.holderCountObservations.rugcheck,
    note: 'Internal observation only. Token accounts are not unique people or beneficial owners; concentration alone does not establish safety, control, organic activity, or manipulation.',
  },
  discoveryGaps: report.discoveryGaps,
  failures: report.failures,
} : report;

console.log(JSON.stringify(output, null, 2));

if (failures.length) process.exitCode = 1;
