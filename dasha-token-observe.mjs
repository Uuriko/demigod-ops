#!/usr/bin/env node
/**
 * dasha-token-observe — one dated observation of $dasha, appended, never rewritten.
 *
 * WHY THIS EXISTS
 * Every number in DASHA-GROWTH-CHECKLIST-2026-08-18.md was read by hand on one afternoon. A
 * point-in-time reading cannot answer the only question that matters afterwards — did any of this
 * work — because there is nothing to compare it against. So this takes the same reading on a
 * schedule and appends it, and the file it appends to is the series.
 *
 * WHAT IT REFUSES TO DO
 * Record a source that would not answer as a zero. Every field carries its own reachability: a
 * throttled RPC leaves `chain: null` with a reason, not `mintAuthority: "revoked"` inherited from
 * last week and not a 0 that later reads as a collapse. This matters more here than in most places
 * because the numbers are small enough that a false zero looks like real news.
 *
 * The clone census has the same rule. Jupiter returning nothing is not eleven clones disappearing.
 *
 *   node dasha-token-observe.mjs              # take one observation and append it
 *   node dasha-token-observe.mjs --dry         # take it, print it, write nothing
 *   node dasha-token-observe.mjs --report      # the series so far, with deltas
 *   node dasha-token-observe.mjs --selftest
 *
 * Schema: dasha.token-observation/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
export const LEDGER = path.join(ROOT, 'DASHA-TOKEN-OBSERVATIONS.jsonl');
/** Raydium LP mint for the canonical pool — the claim in C15 is about this account. */
export const LP_MINT = '8GDvsE3NbiKuo5uUFR9zgRY76mdhXuJfeDsy8hn7h3Aj';
const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DEXSCREENER = 'https://api.dexscreener.com/latest/dex/tokens';
const JUP_SEARCH = 'https://lite-api.jup.ag/tokens/v2/search';

/** A source that did not answer. Kept as an object so a null field always carries its reason. */
const unreachable = (why) => ({ ok: false, why: String(why).slice(0, 160) });

const askJson = async (url, init) => {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  const data = await response.json();
  if (!data) throw new Error(`${new URL(url).hostname} returned no body`);
  return data;
};

/**
 * PURE. Market shape from a DexScreener token response.
 *
 * The ratios are computed here rather than at read time because they are the numbers that carry
 * meaning: 24h volume against FDV says whether trading is proportionate to size (2–10% is the
 * healthy band), and liquidity against FDV says how deep the book is for what the token is worth.
 * Absolute dollars on a $90k token tell you almost nothing on their own.
 */
export function marketFrom(payload) {
  const pairs = Array.isArray(payload?.pairs) ? payload.pairs : [];
  if (!pairs.length) return unreachable('no pairs returned');
  // Deepest pool is the one whose price and depth actually describe the market.
  const pair = pairs.slice().sort((a, b) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0))[0];
  const fdv = Number(pair.fdv) || null;
  const liquidity = Number(pair.liquidity?.usd) || null;
  const volume = Number(pair.volume?.h24) || null;
  const buys = Number(pair.txns?.h24?.buys) || 0;
  const sells = Number(pair.txns?.h24?.sells) || 0;
  return {
    ok: true,
    pairs: pairs.length,
    dexId: pair.dexId || null,
    priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
    fdv,
    liquidityUsd: liquidity,
    volume24hUsd: volume,
    txns24h: buys + sells,
    buyShare: buys + sells ? Number((buys / (buys + sells)).toFixed(4)) : null,
    volumeToFdv: fdv && volume !== null ? Number((volume / fdv).toFixed(4)) : null,
    liquidityToFdv: fdv && liquidity !== null ? Number((liquidity / fdv).toFixed(4)) : null,
  };
}

/** PURE. The identity and discovery signals Jupiter exposes for our own mint. */
export function jupiterFrom(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const mine = list.find((row) => row?.id === MINT);
  if (!mine) return unreachable('own mint absent from the search response');
  return {
    ok: true,
    symbol: mine.symbol || null,
    name: mine.name || null,
    tags: Array.isArray(mine.tags) ? mine.tags : [],
    /* The signal that moves without any submission. Zero is a real reading, so it is recorded as a
       number — which is exactly why an unreachable source must never also produce a 0. */
    organicScore: typeof mine.organicScore === 'number' ? mine.organicScore : null,
    holderCount: typeof mine.holderCount === 'number' ? mine.holderCount : null,
    isVerified: mine.isVerified === true,
    audit: mine.audit
      ? {
        mintAuthorityDisabled: mine.audit.mintAuthorityDisabled ?? null,
        freezeAuthorityDisabled: mine.audit.freezeAuthorityDisabled ?? null,
        topHoldersPercentage: typeof mine.audit.topHoldersPercentage === 'number'
          ? Number(mine.audit.topHoldersPercentage.toFixed(2)) : null,
        devBalancePercentage: typeof mine.audit.devBalancePercentage === 'number'
          ? Number(mine.audit.devBalancePercentage.toFixed(4)) : null,
      }
      : null,
  };
}

/**
 * PURE. The clone census.
 *
 * Everything sharing our name or ticker that is not our mint. Recorded with liquidity and holders
 * so the interesting event is visible: one clone at $2k is noise, and the same clone at $50k is an
 * active attack that wants a different response. Counting them without their size would flatten
 * exactly the difference worth watching.
 */
export function clonesFrom(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return unreachable('search returned nothing — not a census of zero');
  const others = list.filter((row) => row?.id && row.id !== MINT);
  const sized = others.map((row) => ({
    mint: row.id,
    symbol: row.symbol || null,
    liquidityUsd: Math.round(Number(row.liquidity) || 0),
    holderCount: Number(row.holderCount) || 0,
  })).sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  return {
    ok: true,
    ourRank: list.findIndex((row) => row?.id === MINT) + 1 || null,
    count: sized.length,
    largestLiquidityUsd: sized.length ? sized[0].liquidityUsd : 0,
    mostHolders: sized.reduce((n, row) => Math.max(n, row.holderCount), 0),
    mints: sized,
  };
}

/** PURE. Mint-account facts, from a jsonParsed getAccountInfo result. */
export function chainFrom(result) {
  const info = result?.value?.data?.parsed?.info;
  if (!info) return unreachable('mint account not returned');
  return {
    ok: true,
    decimals: info.decimals ?? null,
    supply: info.supply ?? null,
    mintAuthorityRevoked: info.mintAuthority === null,
    freezeAuthorityRevoked: info.freezeAuthority === null,
  };
}

/**
 * PURE. Outstanding claim on the pooled liquidity, from the LP mint account.
 *
 * Supply 0 while the pool holds reserves means every LP token was burned, so nobody holds a claim
 * to withdraw what is in there. It is the single most-checked liquidity signal and it is the reason
 * this is monitored rather than stated once: the LP mint authority belongs to Raydium and is live,
 * so liquidity added later mints new LP that its depositor could withdraw. A supply that stops
 * being 0 is therefore real news about a published claim (C15), not a rounding change.
 */
export function lpFrom(result) {
  const info = result?.value?.data?.parsed?.info;
  if (!info) return unreachable('LP mint account not returned');
  const supply = String(info.supply ?? '');
  if (!/^\d+$/.test(supply)) return unreachable(`LP supply unparseable: ${supply.slice(0, 24)}`);
  return {
    ok: true,
    mint: LP_MINT,
    supply,
    decimals: info.decimals ?? null,
    /* The claim C15 rests on. False here means someone holds LP again and the published wording
       has to change before the next publish. */
    noOutstandingClaim: supply === '0',
  };
}

async function observe({ at = new Date() } = {}) {
  const settle = async (fn) => { try { return await fn(); } catch (error) { return unreachable(error?.message || error); } };

  const market = await settle(async () => marketFrom(await askJson(`${DEXSCREENER}/${MINT}`)));
  const mine = await settle(async () => jupiterFrom(await askJson(`${JUP_SEARCH}?query=${MINT}`)));
  const clones = await settle(async () => clonesFrom(await askJson(`${JUP_SEARCH}?query=dash_eats`)));
  const chain = await settle(async () => chainFrom((await askJson(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'getAccountInfo',
      params: [MINT, { encoding: 'jsonParsed', commitment: 'finalized' }],
    }),
  })).result));

  const lp = await settle(async () => lpFrom((await askJson(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 2, method: 'getAccountInfo',
      params: [LP_MINT, { encoding: 'jsonParsed', commitment: 'finalized' }],
    }),
  })).result));

  return { schema: 'dasha.token-observation/1', at: at.toISOString(), mint: MINT, market, jupiter: mine, clones, chain, lp };
}

export function readLedger(file = LEDGER) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch { return []; }
}

/**
 * PURE. Compare two observations, skipping any field either side could not read.
 *
 * A delta against an unreachable reading is not a delta, and printing one would manufacture news
 * out of a throttle.
 */
export function deltas(previous, current) {
  const out = [];
  const pairs = [
    ['price', previous?.market?.priceUsd, current?.market?.priceUsd, 6],
    ['fdv', previous?.market?.fdv, current?.market?.fdv, 0],
    ['liquidity', previous?.market?.liquidityUsd, current?.market?.liquidityUsd, 0],
    ['volume24h', previous?.market?.volume24hUsd, current?.market?.volume24hUsd, 0],
    ['holders', previous?.jupiter?.holderCount, current?.jupiter?.holderCount, 0],
    ['organicScore', previous?.jupiter?.organicScore, current?.jupiter?.organicScore, 2],
    ['clones', previous?.clones?.count, current?.clones?.count, 0],
    ['largestCloneLiq', previous?.clones?.largestLiquidityUsd, current?.clones?.largestLiquidityUsd, 0],
  ];
  for (const [name, before, after, digits] of pairs) {
    if (typeof before !== 'number' || typeof after !== 'number') {
      out.push({ name, change: null, why: 'not readable on both sides' });
      continue;
    }
    out.push({ name, before, after, change: Number((after - before).toFixed(digits)) });
  }
  return out;
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`token-observe selftest: ${msg}`); };

  const market = marketFrom({ pairs: [
    { dexId: 'shallow', fdv: 90000, liquidity: { usd: 1000 }, volume: { h24: 100 }, txns: { h24: { buys: 1, sells: 1 } }, priceUsd: '0.00009' },
    { dexId: 'deep', fdv: 90000, liquidity: { usd: 30000 }, volume: { h24: 5800 }, txns: { h24: { buys: 18, sells: 24 } }, priceUsd: '0.00009' },
  ] });
  assert(market.dexId === 'deep', 'the deepest pool describes the market, not whichever came first');
  assert(market.volumeToFdv === 0.0644, `volume/FDV is computed, got ${market.volumeToFdv}`);
  assert(market.liquidityToFdv === 0.3333, `liquidity/FDV is computed, got ${market.liquidityToFdv}`);
  assert(market.txns24h === 42 && market.buyShare === 0.4286, 'txn count and buy share');
  assert(marketFrom({ pairs: [] }).ok === false, 'no pairs is unreachable, not a market of zero');

  // an unreachable source must never look like a reading of zero
  const noJup = jupiterFrom([]);
  assert(noJup.ok === false && noJup.organicScore === undefined,
    'absent Jupiter data carries no organicScore at all, rather than 0');
  const jup = jupiterFrom([{ id: MINT, symbol: 'dasha', tags: ['launchpad', 'unknown'], organicScore: 0, holderCount: 978,
    audit: { mintAuthorityDisabled: true, freezeAuthorityDisabled: true, topHoldersPercentage: 41.30841, devBalancePercentage: 0.35600235 } }]);
  assert(jup.organicScore === 0, 'a real zero IS recorded as zero — that is why the absent case must differ');
  assert(jup.audit.topHoldersPercentage === 41.31 && jup.audit.devBalancePercentage === 0.356, 'audit figures are rounded, not dropped');
  assert(jup.isVerified === false, 'verification defaults to false rather than undefined');

  const clones = clonesFrom([
    { id: MINT, symbol: 'dasha', liquidity: 15314, holderCount: 978 },
    { id: 'CLONEa', symbol: 'dasha', liquidity: 2303, holderCount: 2 },
    { id: 'CLONEb', symbol: 'DASHA', liquidity: 2178, holderCount: 1 },
  ]);
  assert(clones.count === 2 && clones.ourRank === 1, 'ours is excluded from its own clone census and ranked');
  assert(clones.largestLiquidityUsd === 2303, 'the biggest clone is what makes this actionable');
  assert(clonesFrom([]).ok === false, 'an empty search is unreachable, not eleven clones vanishing');

  const chain = chainFrom({ value: { data: { parsed: { info: { decimals: 6, supply: '999831949035000', mintAuthority: null, freezeAuthority: null } } } } });
  assert(chain.mintAuthorityRevoked && chain.freezeAuthorityRevoked, 'null authority reads as revoked');
  assert(chainFrom({}).ok === false, 'a missing mint account is unreachable, not an unrevoked mint');
  const live = chainFrom({ value: { data: { parsed: { info: { decimals: 6, supply: '1', mintAuthority: 'SomeAuthority', freezeAuthority: null } } } } });
  assert(live.mintAuthorityRevoked === false, 'a real authority reads as NOT revoked — the check can fail');

  const lp = lpFrom({ value: { data: { parsed: { info: { supply: '0', decimals: 9 } } } } });
  assert(lp.ok && lp.noOutstandingClaim === true, 'LP supply 0 means no outstanding claim on the pooled liquidity');
  const held = lpFrom({ value: { data: { parsed: { info: { supply: '1', decimals: 9 } } } } });
  assert(held.ok && held.noOutstandingClaim === false,
    'a single LP token means someone CAN withdraw — the check must be able to fail, or C15 is a slogan');
  assert(lpFrom({}).ok === false, 'an unreadable LP mint is unreachable, not a burn');
  assert(lpFrom({ value: { data: { parsed: { info: { supply: null } } } } }).ok === false,
    'a missing supply is unreachable, not zero — the whole claim turns on that difference');

  const d = deltas(
    { market: { priceUsd: 0.00009, fdv: 90000, liquidityUsd: 30000, volume24hUsd: 5800 }, jupiter: { holderCount: 978, organicScore: 0 }, clones: { count: 11, largestLiquidityUsd: 2303 } },
    { market: { priceUsd: 0.0001, fdv: 100000, liquidityUsd: 31000, volume24hUsd: 6000 }, jupiter: { holderCount: 1000, organicScore: 0 }, clones: { count: 12, largestLiquidityUsd: 2303 } },
  );
  assert(d.find((r) => r.name === 'holders').change === 22, 'holder delta');
  assert(d.find((r) => r.name === 'clones').change === 1, 'a new clone shows as a change');
  const blind = deltas({ market: {} }, { market: { fdv: 100000 } });
  assert(blind.find((r) => r.name === 'fdv').change === null, 'no delta is claimed against a reading nobody took');

  console.log(JSON.stringify({ ok: true, selftest: 'dasha-token-observe' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else if (args.includes('--report')) {
    const rows = readLedger();
    if (!rows.length) { console.error('no observations yet — run without --report first'); process.exit(1); }
    console.log(`observations: ${rows.length}  (${rows[0].at.slice(0, 10)} → ${rows[rows.length - 1].at.slice(0, 10)})`);
    for (const row of rows.slice(-8)) {
      const m = row.market, j = row.jupiter, c = row.clones;
      console.log(`  ${row.at.slice(0, 16)}  fdv ${m?.ok ? `$${Math.round(m.fdv).toLocaleString()}` : m?.why || '—'}`
        + `  liq ${m?.ok ? `$${Math.round(m.liquidityUsd).toLocaleString()}` : '—'}`
        + `  vol/fdv ${m?.ok && m.volumeToFdv !== null ? `${(m.volumeToFdv * 100).toFixed(1)}%` : '—'}`
        + `  holders ${j?.ok ? j.holderCount : '—'}`
        + `  organic ${j?.ok ? j.organicScore : '—'}`
        + `  clones ${c?.ok ? c.count : '—'}`);
    }
    if (rows.length > 1) {
      console.log('\nsince the previous observation:');
      for (const row of deltas(rows[rows.length - 2], rows[rows.length - 1])) {
        console.log(row.change === null
          ? `  ${row.name.padEnd(17)} —  (${row.why})`
          : `  ${row.name.padEnd(17)} ${row.change > 0 ? '+' : ''}${row.change}`);
      }
    }
  } else {
    const row = await observe();
    const unread = ['market', 'jupiter', 'clones', 'chain', 'lp'].filter((k) => row[k]?.ok === false);
    if (args.includes('--dry')) { console.log(JSON.stringify(row, null, 1)); }
    else {
      fs.appendFileSync(LEDGER, `${JSON.stringify(row)}\n`);
      console.log(JSON.stringify({
        ok: true, at: row.at, appended: path.basename(LEDGER),
        observations: readLedger().length,
        /* Named, not silently absent. An observation with three of four sources read is still worth
           keeping; one that pretends it read four is not. */
        unread: unread.length ? unread.map((k) => `${k}: ${row[k].why}`) : [],
      }, null, 1));
    }
  }
}
