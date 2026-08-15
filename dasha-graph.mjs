/**
 * Public $DASHA chain graph — live Solana + Jupiter lite only.
 * Never invent holders, balances, names, or related coins.
 */
import { MINT, PAIR, WSOL } from './dasha-lobby-mod.mjs';
import { isValidSolanaAddress } from './dasha-simp-actions.mjs';

export { MINT, PAIR, WSOL };
export const RAYDIUM_AMM_V4 = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
export const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const JUPITER_SEARCH = 'https://lite-api.jup.ag/tokens/v2/search';
export const GRAPH_CACHE_CONTROL = 'public, s-maxage=90, stale-while-revalidate=60';
export const SNAPSHOT_TTL_MS = 90_000;
export const MAX_TXS = 8;
export const MAX_EXPAND_MINTS = 8;
export const MAX_RETRY_WAIT_MS = 2000;

const JUP_PASS = ['name', 'symbol', 'icon', 'launchpad', 'graduatedPool'];

class RpcUnavailable extends Error {
  constructor(retryAfterSec = 0) {
    super('rpc_unavailable');
    this.retryAfterSec = retryAfterSec;
  }
}

const mem = {
  snapshot: null,
  snapshotAt: 0,
  cooldownUntil: 0,
  expand: new Map(),
};

export function resetGraphCache() {
  mem.snapshot = null;
  mem.snapshotAt = 0;
  mem.cooldownUntil = 0;
  mem.expand.clear();
}

export function parseRetryAfter(header, now = Date.now()) {
  if (header == null || header === '') return 0;
  const raw = String(header).trim();
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.max(0, Number(raw));
  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, (at - now) / 1000);
}

export function tagPubkey(pubkey) {
  if (pubkey === PAIR) return 'pool';
  if (pubkey === RAYDIUM_AMM_V4) return 'program';
  return '';
}

export function pickJupiterToken(rows, mint = MINT) {
  if (!Array.isArray(rows)) return null;
  return rows.find((row) => row && row.id === mint) || null;
}

export function mintFields(token) {
  if (!token || typeof token !== 'object') return {};
  const out = {};
  for (const key of JUP_PASS) {
    const value = token[key];
    if (typeof value === 'string' && value) out[key] = value;
  }
  return out;
}

export function mintNode(jup) {
  return { id: MINT, kind: 'mint', ring: 0, ...mintFields(jup) };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function collapseOwners(accounts) {
  const byOwner = new Map();
  for (const row of accounts || []) {
    const owner = typeof row?.owner === 'string' ? row.owner : '';
    if (!owner || !isValidSolanaAddress(owner)) continue;
    const uiAmount = Number(row.uiAmount);
    const prev = byOwner.get(owner) || { owner, uiAmount: 0, uiAmountString: '' };
    if (Number.isFinite(uiAmount)) prev.uiAmount += uiAmount;
    if (typeof row.uiAmountString === 'string' && row.uiAmountString && !prev.uiAmountString) {
      prev.uiAmountString = row.uiAmountString;
    }
    byOwner.set(owner, prev);
  }
  return [...byOwner.values()].map((row) => {
    const tag = tagPubkey(row.owner);
    const node = {
      id: row.owner,
      kind: tag || 'wallet',
      ring: 1,
    };
    if (Number.isFinite(row.uiAmount)) node.uiAmount = row.uiAmount;
    if (row.uiAmountString) node.uiAmountString = row.uiAmountString;
    else if (Number.isFinite(row.uiAmount)) node.uiAmountString = String(row.uiAmount);
    if (tag) node.tag = tag;
    return node;
  });
}

function parsedIxs(tx) {
  const out = [];
  const walk = (list) => {
    for (const ix of list || []) {
      if (ix?.parsed) out.push(ix);
      if (Array.isArray(ix?.instructions)) walk(ix.instructions);
    }
  };
  walk(tx?.transaction?.message?.instructions);
  for (const inner of tx?.meta?.innerInstructions || []) walk(inner.instructions);
  return out;
}

function tokenOwnerByAccount(tx) {
  const map = new Map();
  const keys = tx?.transaction?.message?.accountKeys || [];
  const keyAt = (i) => {
    const row = keys[i];
    if (typeof row === 'string') return row;
    return row?.pubkey || '';
  };
  for (const row of [...(tx?.meta?.preTokenBalances || []), ...(tx?.meta?.postTokenBalances || [])]) {
    if (row?.mint !== MINT) continue;
    const acc = keyAt(row.accountIndex);
    if (acc && row.owner) map.set(acc, row.owner);
  }
  return map;
}

export function parseMintTransfers(tx, mint = MINT) {
  if (!tx || tx?.meta?.err) return [];
  const sig = tx?.transaction?.signatures?.[0] || '';
  const owners = tokenOwnerByAccount(tx);
  const edges = [];
  for (const ix of parsedIxs(tx)) {
    const type = ix.parsed?.type;
    if (type !== 'transfer' && type !== 'transferChecked') continue;
    const info = ix.parsed?.info || {};
    const sourceAcc = info.source || info.tokenSource || '';
    const destAcc = info.destination || info.tokenDestination || '';
    const from = owners.get(sourceAcc) || (isValidSolanaAddress(info.authority) ? info.authority : '');
    const to = owners.get(destAcc) || '';
    if (!from || !to || from === to) continue;
    const amount = info.tokenAmount?.uiAmount;
    const amountString = info.tokenAmount?.uiAmountString
      || (info.amount != null ? String(info.amount) : '');
    if (ix.program !== 'spl-token' && ix.programId && ix.program !== 'spl-token-2022') {
      /* still accept parsed transfers that name this mint via balances */
    }
    const mintHint = info.mint || '';
    if (mintHint && mintHint !== mint) continue;
    if (!mintHint && !owners.has(sourceAcc) && !owners.has(destAcc)) continue;
    const edge = { source: from, target: to, signature: sig, kind: 'transfer' };
    if (Number.isFinite(Number(amount))) edge.amount = Number(amount);
    if (amountString) edge.uiAmountString = amountString;
    edges.push(edge);
  }
  return edges;
}

export function ring3Nodes(jup, extra = {}) {
  const nodes = [];
  const links = [];
  const seen = extra.seen instanceof Set ? extra.seen : new Set();
  const pool = typeof jup?.graduatedPool === 'string' ? jup.graduatedPool : '';
  if (pool && isValidSolanaAddress(pool) && !seen.has(pool)) {
    const tag = tagPubkey(pool);
    nodes.push({ id: pool, kind: tag || 'pool', ring: 3, ...(tag ? { tag } : {}) });
    links.push({ source: MINT, target: pool, kind: 'graduated' });
    seen.add(pool);
  }
  if (jup?.launchpad === 'pump.fun' && !seen.has('pump.fun')) {
    nodes.push({ id: 'pump.fun', kind: 'launchpad', ring: 3, label: 'minted on pump.fun' });
    links.push({ source: MINT, target: 'pump.fun', kind: 'launchpad' });
    seen.add('pump.fun');
  }
  if (extra.wsol && !seen.has(WSOL)) {
    nodes.push({ id: WSOL, kind: 'mint', ring: 3, symbol: 'WSOL' });
    const from = extra.wsolFrom && isValidSolanaAddress(extra.wsolFrom) ? extra.wsolFrom : MINT;
    links.push({ source: from, target: WSOL, kind: 'wsol' });
    seen.add(WSOL);
  }
  return { nodes, links };
}

export function buildSnapshot({ jup = null, holders = [], transfers = [], rpcError = '' } = {}) {
  const mint = mintNode(jup);
  const nodes = [mint];
  const links = [];
  const seen = new Set([MINT]);
  const rings = { 0: { empty: false } };
  if (rpcError) {
    rings[1] = { empty: true, reason: rpcError };
  } else if (!holders.length) {
    rings[1] = { empty: true, reason: 'no_accounts' };
  } else {
    rings[1] = { empty: false };
    for (const node of holders) {
      if (seen.has(node.id)) continue;
      nodes.push(node);
      seen.add(node.id);
      const hold = { source: MINT, target: node.id, kind: 'hold' };
      if (Number.isFinite(node.uiAmount)) hold.amount = node.uiAmount;
      if (node.uiAmountString) hold.uiAmountString = node.uiAmountString;
      links.push(hold);
    }
  }
  for (const edge of transfers) {
    if (!seen.has(edge.source) || !seen.has(edge.target)) continue;
    links.push(edge);
  }
  const showWsol = Boolean(jup?.graduatedPool) || holders.some((node) => node.id === WSOL);
  const extra = ring3Nodes(jup, { seen, wsol: showWsol });
  if (extra.nodes.length) {
    nodes.push(...extra.nodes);
    links.push(...extra.links);
    rings[3] = { empty: false };
  }
  return { mint: MINT, nodes, links, rings };
}

export function buildExpand({ owner, holdings = [], symbols = {}, wsol = false } = {}) {
  if (!holdings.length && !wsol) {
    return { id: owner, empty: true, reason: 'no_other_holdings', nodes: [], links: [] };
  }
  const nodes = [];
  const links = [];
  for (const row of holdings) {
    const node = { id: row.mint, kind: 'mint', ring: 2 };
    const meta = symbols[row.mint];
    if (meta?.symbol) node.symbol = meta.symbol;
    if (meta?.name) node.name = meta.name;
    if (Number.isFinite(row.uiAmount)) node.uiAmount = row.uiAmount;
    if (row.uiAmountString) node.uiAmountString = row.uiAmountString;
    nodes.push(node);
    const link = { source: owner, target: row.mint, kind: 'hold' };
    if (Number.isFinite(row.uiAmount)) link.amount = row.uiAmount;
    if (row.uiAmountString) link.uiAmountString = row.uiAmountString;
    links.push(link);
  }
  if (wsol) {
    nodes.push({ id: WSOL, kind: 'mint', ring: 3, symbol: 'WSOL' });
    links.push({ source: owner, target: WSOL, kind: 'wsol' });
  }
  return { id: owner, empty: false, nodes, links };
}

async function jupiterSearch(query, fetchImpl) {
  const url = `${JUPITER_SEARCH}?query=${encodeURIComponent(query)}`;
  const res = await fetchImpl(url, { method: 'GET', signal: AbortSignal.timeout(4000) });
  if (res.status !== 200) return null;
  return res.json().catch(() => null);
}

async function rpcOnce(endpoint, method, params, fetchImpl) {
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(6000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (res.status === 429) {
    throw new RpcUnavailable(parseRetryAfter(res.headers.get('Retry-After')));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error('rpc_failed');
  return data.result;
}

function rpcEndpoints(env = {}) {
  const configured = String(env.SOLANA_RPC_URLS || env.SOLANA_RPC_URL || '').split(',').map((value) => value.trim()).filter(Boolean);
  const list = configured.length ? [...new Set(configured)].slice(0, 2) : ['https://api.mainnet-beta.solana.com'];
  if (list.some((endpoint) => !endpoint.startsWith('https://'))) throw new Error('Solana RPC must use HTTPS');
  return list;
}

export async function solanaRpc(env, method, params, { fetchImpl = fetch, now = Date.now(), endpoints } = {}) {
  const list = endpoints || rpcEndpoints(env);
  let lastWait = 0;
  let lastErr;
  for (const endpoint of list) {
    try {
      return await rpcOnce(endpoint, method, params, fetchImpl);
    } catch (err) {
      lastErr = err;
      if (err instanceof RpcUnavailable) {
        lastWait = err.retryAfterSec;
        const waitMs = Math.min(MAX_RETRY_WAIT_MS, Math.round(err.retryAfterSec * 1000));
        if (waitMs > 0) await sleep(waitMs);
        try {
          return await rpcOnce(endpoint, method, params, fetchImpl);
        } catch (retryErr) {
          lastErr = retryErr;
          if (retryErr instanceof RpcUnavailable) lastWait = retryErr.retryAfterSec;
        }
      }
    }
  }
  if (lastErr instanceof RpcUnavailable || lastWait) {
    mem.cooldownUntil = now + Math.round((lastWait || 1) * 1000);
    throw new RpcUnavailable(lastWait);
  }
  throw lastErr || new RpcUnavailable();
}

function accountInfo(value) {
  const info = value?.data?.parsed?.info;
  if (!info) return null;
  const owner = typeof info.owner === 'string' ? info.owner : '';
  const amt = info.tokenAmount || {};
  return {
    owner,
    uiAmount: Number(amt.uiAmount),
    uiAmountString: typeof amt.uiAmountString === 'string' ? amt.uiAmountString : '',
  };
}

async function loadHolders(env, opts) {
  const largest = await solanaRpc(env, 'getTokenLargestAccounts', [MINT], opts);
  const rows = Array.isArray(largest?.value) ? largest.value : [];
  const addrs = rows.map((row) => row?.address).filter((addr) => isValidSolanaAddress(addr));
  if (!addrs.length) return [];
  const multi = await solanaRpc(env, 'getMultipleAccounts', [addrs, { encoding: 'jsonParsed', commitment: 'finalized' }], opts);
  const values = Array.isArray(multi?.value) ? multi.value : [];
  const accounts = [];
  for (let i = 0; i < addrs.length; i++) {
    const parsed = accountInfo(values[i]);
    if (!parsed) continue;
    const fallback = rows[i] || {};
    accounts.push({
      owner: parsed.owner,
      uiAmount: Number.isFinite(parsed.uiAmount) ? parsed.uiAmount : Number(fallback.uiAmount),
      uiAmountString: parsed.uiAmountString || fallback.uiAmountString || '',
    });
  }
  return collapseOwners(accounts);
}

async function loadTransfers(env, opts) {
  const sigs = await solanaRpc(env, 'getSignaturesForAddress', [MINT, { limit: 20 }], opts);
  const list = Array.isArray(sigs) ? sigs : [];
  const ok = list.filter((row) => row && row.err == null && row.signature).slice(0, MAX_TXS);
  const edges = [];
  for (const row of ok) {
    const tx = await solanaRpc(env, 'getTransaction', [row.signature, {
      encoding: 'jsonParsed',
      maxSupportedTransactionVersion: 0,
      commitment: 'finalized',
    }], opts);
    edges.push(...parseMintTransfers(tx, MINT));
  }
  return edges;
}

export async function fetchGraphSnapshot(env, { fetchImpl = fetch, now = Date.now(), endpoints } = {}) {
  if (mem.snapshot && now - mem.snapshotAt < SNAPSHOT_TTL_MS) return mem.snapshot;
  const opts = { fetchImpl, now, endpoints };
  let jup = null;
  try {
    jup = pickJupiterToken(await jupiterSearch(MINT, fetchImpl));
  } catch {
    jup = null;
  }
  if (now < mem.cooldownUntil) {
    const body = buildSnapshot({ jup, rpcError: 'rpc_unavailable' });
    mem.snapshot = body;
    mem.snapshotAt = now;
    return body;
  }
  try {
    const holders = await loadHolders(env, opts);
    let transfers = [];
    try {
      transfers = await loadTransfers(env, opts);
    } catch (err) {
      if (!(err instanceof RpcUnavailable) && err?.message !== 'rpc_failed') throw err;
    }
    const body = buildSnapshot({ jup, holders, transfers });
    mem.snapshot = body;
    mem.snapshotAt = now;
    return body;
  } catch (err) {
    const reason = err instanceof RpcUnavailable || err?.message === 'rpc_failed' || err?.message === 'rpc_unavailable'
      ? 'rpc_unavailable'
      : 'rpc_unavailable';
    const body = buildSnapshot({ jup, rpcError: reason });
    mem.snapshot = body;
    mem.snapshotAt = now;
    return body;
  }
}

function parseHolding(value) {
  const info = value?.account?.data?.parsed?.info || value?.data?.parsed?.info;
  if (!info) return null;
  const mint = typeof info.mint === 'string' ? info.mint : '';
  const amt = info.tokenAmount || {};
  const uiAmount = Number(amt.uiAmount);
  if (!mint || !Number.isFinite(uiAmount) || uiAmount <= 0) return null;
  return {
    mint,
    uiAmount,
    uiAmountString: typeof amt.uiAmountString === 'string' ? amt.uiAmountString : '',
  };
}

export async function fetchGraphExpand(env, id, { fetchImpl = fetch, now = Date.now(), endpoints } = {}) {
  const owner = String(id || '').trim();
  if (!isValidSolanaAddress(owner) || owner === MINT) {
    return { id: owner, empty: true, reason: 'not_a_wallet', nodes: [], links: [] };
  }
  const hit = mem.expand.get(owner);
  if (hit && now - hit.at < SNAPSHOT_TTL_MS) return hit.body;
  const opts = { fetchImpl, now, endpoints };
  try {
    const result = await solanaRpc(env, 'getTokenAccountsByOwner', [
      owner,
      { programId: TOKEN_PROGRAM },
      { encoding: 'jsonParsed', commitment: 'finalized' },
    ], opts);
    const values = Array.isArray(result?.value) ? result.value : [];
    const parsed = values.map(parseHolding).filter(Boolean);
    const wsolRow = parsed.find((row) => row.mint === WSOL);
    const others = [];
    const seen = new Set();
    for (const row of parsed) {
      if (row.mint === MINT || row.mint === WSOL) continue;
      if (seen.has(row.mint)) continue;
      seen.add(row.mint);
      others.push(row);
      if (others.length >= MAX_EXPAND_MINTS) break;
    }
    const symbols = {};
    if (others.length) {
      try {
        const rows = await jupiterSearch(others[0].mint, fetchImpl);
        const allowed = new Set(others.map((row) => row.mint));
        for (const row of Array.isArray(rows) ? rows : []) {
          if (row?.id && allowed.has(row.id)) symbols[row.id] = mintFields(row);
        }
      } catch {
        /* symbols stay omitted */
      }
    }
    const body = buildExpand({ owner, holdings: others, symbols, wsol: Boolean(wsolRow) });
    mem.expand.set(owner, { at: now, body });
    return body;
  } catch {
    return { id: owner, empty: true, reason: 'rpc_unavailable', nodes: [], links: [] };
  }
}
