/**
 * Dasha /faucet. Classic Token program. HTTP RPC only. No hold check. No board join.
 */
import { MINT, WSOL, originAllowed } from './dasha-lobby-mod.mjs';
import {
  base58Decode,
  isValidSolanaAddress,
  verifyEd25519,
  walletMessage,
} from './dasha-simp-actions.mjs';
import { sessionFromRequest, signPayload, verifyPayload } from './dasha-lobby-x.mjs';

export { MINT, WSOL };
export const JUPITER = `https://jup.ag/swap?sell=${WSOL}&buy=${MINT}`;
export const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
export const SYSTEM_PROGRAM = '11111111111111111111111111111111';
export const SIWS_DOMAINS = new Set(['getdasha.com', 'www.getdasha.com', 'lobby.getdasha.com']);
export const DECIMALS = 6;
export const DEFAULT_AMOUNT_RAW = 100_000_000;
/** Today's getMinimumBalanceForRentExemption(165). SIMD-0437 is documented and still inactive — query live. */
export const ATA_RENT_LAMPORTS = 2_039_280;
export const ATA_ACCOUNT_BYTES = 165;
export const DEFAULT_RENT_ATA_COUNT = 20;
export const DEFAULT_TOKEN_CAP_COUNT = 20;
export const FEE_LAMPORTS = 5_000;
export const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export const PENDING_MS = 15 * 60_000;
export const CONFIRM_TRIES = 4;
export const CONFIRM_WAIT_MS = 400;
export const MINT_SOURCE = 'https://x.com/dash_eats/status/2085405228078432279';
export const NOT_DEV = 'https://x.com/dash_eats/status/2085532923063853316';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const P = (1n << 255n) - 19n;
const te = new TextEncoder();

function modP(a) {
  a %= P;
  return a < 0n ? a + P : a;
}

function powP(base, exp) {
  let r = 1n;
  let b = modP(base);
  for (let n = exp; n > 0n; n >>= 1n) {
    if (n & 1n) r = modP(r * b);
    b = modP(b * b);
  }
  return r;
}

const ED_D = modP(-121665n * powP(121666n, P - 2n));
const ED_I = powP(2n, (P - 1n) / 4n);

export function base58Encode(bytes) {
  const src = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  let zeros = 0;
  while (zeros < src.length && src[zeros] === 0) zeros++;
  const size = Math.ceil((src.length * 138) / 100) + 1;
  const buf = new Uint8Array(size);
  for (const byte of src) {
    let carry = byte;
    for (let j = size - 1; j >= 0; j--) {
      carry += 256 * buf[j];
      buf[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
  }
  let i = 0;
  while (i < size && buf[i] === 0) i++;
  let out = '1'.repeat(zeros);
  for (; i < size; i++) out += B58[buf[i]];
  return out || '1';
}

function bytesToLe(bytes) {
  let n = 0n;
  for (let i = 0; i < bytes.length; i++) n |= BigInt(bytes[i]) << (8n * BigInt(i));
  return n;
}

/** Solana / dalek CompressedEdwardsY decompress. */
export function bytesOnCurve(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) return false;
  const sign = bytes[31] >> 7;
  const y = bytesToLe(bytes) & ((1n << 255n) - 1n);
  if (y >= P) return false;
  const y2 = modP(y * y);
  const u = modP(y2 - 1n);
  const v = modP(ED_D * y2 + 1n);
  const v3 = modP(v * v * v);
  const v7 = modP(v3 * v3 * v);
  let x = modP(u * v3 * powP(modP(u * v7), (P - 5n) / 8n));
  const vx2 = modP(v * x * x);
  if (vx2 === modP(-u)) x = modP(x * ED_I);
  else if (vx2 !== u) return false;
  if (x === 0n && sign === 1) return false;
  if ((x & 1n) !== BigInt(sign)) x = modP(-x);
  return true;
}

export function isOnCurveAddress(value) {
  if (!isValidSolanaAddress(value)) return false;
  try {
    return bytesOnCurve(base58Decode(value));
  } catch {
    return false;
  }
}

export function faucetDestOk(value) {
  return isValidSolanaAddress(value) && value !== SYSTEM_PROGRAM && value !== MINT && isOnCurveAddress(value);
}

export function siwsDomainOk(domain) {
  const host = String(domain || '').trim().toLowerCase();
  if (!host) return false;
  return SIWS_DOMAINS.has(host);
}

export function siwsMessageDomain(message) {
  const line = String(message || '').split('\n')[0] || '';
  const match = line.match(/^(\S+) wants you to sign in with your Solana account:$/);
  return match ? match[1] : '';
}

export function parseSiwsMessage(message) {
  const text = String(message || '');
  const lines = text.split('\n');
  const field = (name) => {
    const prefix = `${name}: `;
    const line = lines.find((row) => row.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : '';
  };
  return {
    domain: siwsMessageDomain(text),
    address: (lines[1] || '').trim(),
    nonce: field('Nonce'),
    requestId: field('Request ID'),
    uri: field('URI'),
  };
}

export function siwsSignedMessageOk({ message, publicKey, nonce }) {
  const fields = parseSiwsMessage(message);
  return Boolean(
    siwsDomainOk(fields.domain)
    && fields.requestId === 'faucet_dest'
    && fields.address === publicKey
    && fields.nonce === nonce,
  );
}

export function faucetWalletMessage({ handle, publicKey, nonce, issuedAt, expiresAt, domain, uri }) {
  if (!siwsDomainOk(domain)) return null;
  return walletMessage({
    handle,
    publicKey,
    nonce,
    issuedAt,
    expiresAt,
    domain,
    uri: uri || `https://${domain}/`,
    requestId: 'faucet_dest',
  });
}

export function faucetSiwsFields({ handle, publicKey, nonce, issuedAt, expiresAt, domain, uri }) {
  if (!siwsDomainOk(domain)) return null;
  return {
    domain,
    address: publicKey,
    statement: `Dest-proof for the /faucet sample for @${handle}. Not a claim-airdrop signature. No transaction. We will not ask for a phrase.`,
    uri: uri || `https://${domain}/`,
    version: '1',
    chainId: 'mainnet',
    nonce,
    issuedAt: new Date(issuedAt).toISOString(),
    expirationTime: new Date(expiresAt).toISOString(),
    requestId: 'faucet_dest',
  };
}

function accountDataLen(value) {
  const data = value?.data;
  if (Array.isArray(data) && typeof data[0] === 'string') {
    try { return atob(data[0]).length; } catch { return 0; }
  }
  return Number(value?.space) || 0;
}

/** Solana verify-address: only IS_WALLET may receive. No ATA for off-curve. */
export function classifyDest({ address, account, onCurve }) {
  if (!isValidSolanaAddress(address) || address === SYSTEM_PROGRAM) return { ok: false, kind: 'invalid', error: 'dest_not_wallet' };
  if (address === MINT) return { ok: false, kind: 'mint', error: 'dest_mint' };
  if (!onCurve) return { ok: false, kind: 'pda', error: 'dest_pda' };
  if (!account) return { ok: true, kind: 'IS_WALLET', unfunded: true };
  const owner = String(account.owner || '');
  if (owner === SYSTEM_PROGRAM) {
    if (account.executable || accountDataLen(account) > 0) return { ok: false, kind: 'other', error: 'dest_not_wallet' };
    return { ok: true, kind: 'IS_WALLET', unfunded: false };
  }
  if (owner === TOKEN_PROGRAM || owner === TOKEN_2022_PROGRAM) {
    return { ok: false, kind: accountDataLen(account) === 82 ? 'mint' : 'token', error: accountDataLen(account) === 82 ? 'dest_mint' : 'dest_token' };
  }
  return { ok: false, kind: 'other', error: 'dest_not_wallet' };
}

export async function classifyDestLive(endpoints, dest) {
  if (!isValidSolanaAddress(dest) || dest === SYSTEM_PROGRAM) {
    return { ok: false, status: 400, kind: 'invalid', error: 'dest_not_wallet' };
  }
  if (dest === MINT) return { ok: false, status: 400, kind: 'mint', error: 'dest_mint' };
  let destInfo;
  try {
    destInfo = await rpcOne(endpoints, 'getAccountInfo', [dest, { encoding: 'base64' }]);
  } catch {
    return { ok: false, status: 503, error: 'rpc_unavailable' };
  }
  const destClass = classifyDest({
    address: dest,
    account: destInfo?.value ?? null,
    onCurve: isOnCurveAddress(dest),
  });
  if (!destClass.ok) return { ok: false, status: 400, kind: destClass.kind, error: destClass.error };
  return { ok: true, status: 200, kind: destClass.kind, unfunded: destClass.unfunded };
}

export function last4(addr) {
  return String(addr || '').slice(-4);
}

export function destShapeError(dest, four) {
  const d = String(dest || '').trim();
  const f = String(four || '').trim();
  if (/t\.me|telegram/i.test(d)) return 'dest_not_wallet';
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(d)) return 'dest_not_wallet';
  if (d === MINT) return 'dest_mint';
  if (f && last4(d) !== f) return 'last-4 does not match';
  return null;
}

export function faucetConfigured(env = {}) {
  return Boolean(parseFaucetKeypair(env.FAUCET_KEYPAIR));
}

export function faucetAmountRaw(env = {}) {
  const raw = env.FAUCET_AMOUNT_RAW;
  if (raw == null || raw === '') return DEFAULT_AMOUNT_RAW;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > Number.MAX_SAFE_INTEGER) return DEFAULT_AMOUNT_RAW;
  return n;
}

export function envInt(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > Number.MAX_SAFE_INTEGER) return fallback;
  return n;
}

export function faucetRentCapLamports(env = {}, rent = ATA_RENT_LAMPORTS) {
  return envInt(env.FAUCET_RENT_CAP_LAMPORTS, DEFAULT_RENT_ATA_COUNT * rent);
}

export function faucetSolFloorLamports(env = {}, rent = ATA_RENT_LAMPORTS) {
  return envInt(env.FAUCET_SOL_FLOOR_LAMPORTS, rent + FEE_LAMPORTS);
}

export function faucetTokenCapRaw(env = {}) {
  return envInt(env.FAUCET_TOKEN_CAP_RAW, DEFAULT_TOKEN_CAP_COUNT * faucetAmountRaw(env));
}

export function faucetPaused(env = {}) {
  const v = String(env.FAUCET_PAUSED || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

export function parseRentExemption(result) {
  const n = Number(result);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function amountUi(raw) {
  return Number(raw) / 10 ** DECIMALS;
}

export function parseFaucetKeypair(raw) {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  try {
    let bytes;
    if (text.startsWith('[')) {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr) || arr.length !== 64 || arr.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
      bytes = Uint8Array.from(arr);
    } else {
      bytes = base58Decode(text);
      if (bytes.length !== 64) return null;
    }
    return { seed: bytes.subarray(0, 32), publicKey: bytes.subarray(32), raw: bytes, address: base58Encode(bytes.subarray(32)) };
  } catch {
    return null;
  }
}

export async function hashIp(ip) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(String(ip || 'missing'))));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function claimCooldown(row, now = Date.now()) {
  if (!row || !Number(row.ts)) return null;
  if (row.pending && row.signature) {
    return {
      pending: true,
      signature: row.signature,
      dest: row.dest || null,
      amountRaw: row.amountRaw,
      nextAt: Number(row.ts) + PENDING_MS,
    };
  }
  if (row.pending && !row.signature) {
    if (now - Number(row.ts) < PENDING_MS) return { pending: true, nextAt: Number(row.ts) + PENDING_MS };
    return null;
  }
  if (!row.signature) return null;
  const nextAt = Number(row.ts) + COOLDOWN_MS;
  if (now < nextAt) return { nextAt, signature: row.signature, dest: row.dest || null, amountRaw: row.amountRaw };
  return null;
}

export function readSignatureStatus(result) {
  const row = Array.isArray(result?.value) ? result.value[0] : result?.value;
  if (row == null) return { state: 'absent' };
  if (row.err) return { state: 'failed', err: row.err };
  const status = row.confirmationStatus;
  if (status === 'confirmed' || status === 'finalized') return { state: 'confirmed' };
  return { state: 'pending' };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sha256(parts) {
  let len = 0;
  for (const p of parts) len += p.length;
  const buf = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    buf.set(p, o);
    o += p.length;
  }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
}

export async function findProgramAddress(seeds, programId58) {
  const programId = base58Decode(programId58);
  const marker = te.encode('ProgramDerivedAddress');
  for (let bump = 255; bump >= 0; bump--) {
    const hash = await sha256([...seeds, Uint8Array.of(bump), programId, marker]);
    if (!bytesOnCurve(hash)) return { address: base58Encode(hash), bytes: hash, bump };
  }
  throw new Error('unable to find program address');
}

export async function associatedTokenAddress(owner, mint = MINT) {
  return findProgramAddress(
    [base58Decode(owner), base58Decode(TOKEN_PROGRAM), base58Decode(mint)],
    ASSOCIATED_TOKEN_PROGRAM,
  );
}

function compactU16(n) {
  const out = [];
  let rem = n >>> 0;
  while (true) {
    let byte = rem & 0x7f;
    rem >>= 7;
    if (rem) byte |= 0x80;
    out.push(byte);
    if (!rem) break;
  }
  return Uint8Array.from(out);
}

function concat(chunks) {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function u64le(n) {
  const out = new Uint8Array(8);
  let v = BigInt(n);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 255n);
    v >>= 8n;
  }
  return out;
}

export function encodeTransferChecked({ source, mint, dest, owner, amountRaw, decimals = DECIMALS }) {
  return {
    program: TOKEN_PROGRAM,
    accounts: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: dest, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
    ],
    data: concat([Uint8Array.of(12), u64le(amountRaw), Uint8Array.of(decimals)]),
  };
}

export function encodeCreateAtaIdempotent({ payer, ata, owner, mint }) {
  return {
    program: ASSOCIATED_TOKEN_PROGRAM,
    accounts: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
    ],
    data: Uint8Array.of(1),
  };
}

export function compileMessage({ payer, instructions, recentBlockhash }) {
  const metas = new Map();
  const add = (pubkey, { isSigner, isWritable }) => {
    const prev = metas.get(pubkey) || { isSigner: false, isWritable: false };
    metas.set(pubkey, { isSigner: prev.isSigner || isSigner, isWritable: prev.isWritable || isWritable });
  };
  add(payer, { isSigner: true, isWritable: true });
  for (const ix of instructions) {
    add(ix.program, { isSigner: false, isWritable: false });
    for (const acc of ix.accounts) add(acc.pubkey, acc);
  }
  const keys = [...metas.entries()].map(([pubkey, flags]) => ({ pubkey, ...flags }));
  const writableSigners = keys.filter((k) => k.isSigner && k.isWritable);
  const readonlySigners = keys.filter((k) => k.isSigner && !k.isWritable);
  const writable = keys.filter((k) => !k.isSigner && k.isWritable);
  const readonly = keys.filter((k) => !k.isSigner && !k.isWritable);
  const ordered = [...writableSigners, ...readonlySigners, ...writable, ...readonly];
  const index = new Map(ordered.map((k, i) => [k.pubkey, i]));
  const header = Uint8Array.of(writableSigners.length + readonlySigners.length, readonlySigners.length, readonly.length);
  const accountKeys = concat(ordered.map((k) => base58Decode(k.pubkey)));
  const ixBytes = instructions.map((ix) => {
    const accs = Uint8Array.from(ix.accounts.map((a) => index.get(a.pubkey)));
    return concat([
      Uint8Array.of(index.get(ix.program)),
      compactU16(accs.length),
      accs,
      compactU16(ix.data.length),
      ix.data,
    ]);
  });
  const message = concat([
    header,
    compactU16(ordered.length),
    accountKeys,
    base58Decode(recentBlockhash),
    compactU16(instructions.length),
    ...ixBytes,
  ]);
  return { message, ordered, index };
}

const PKCS8_PREFIX = Uint8Array.of(0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20);

export async function signEd25519Seed(seed, message) {
  const pkcs8 = concat([PKCS8_PREFIX, seed]);
  const key = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('Ed25519', key, message));
}

export async function signLegacyTx({ keypair, instructions, recentBlockhash }) {
  const { message } = compileMessage({ payer: keypair.address, instructions, recentBlockhash });
  const signature = await signEd25519Seed(keypair.seed, message);
  const tx = concat([compactU16(1), signature, message]);
  return { tx, signature: base58Encode(signature), message };
}

export function solscanUrl(signature) {
  return `https://solscan.io/tx/${signature}`;
}

export function faucetPublicStatus(env = {}) {
  const configured = faucetConfigured(env);
  if (!configured) return { status: 501, body: { configured: false, error: 'not_configured' } };
  const raw = faucetAmountRaw(env);
  return {
    status: 200,
    body: {
      configured: true,
      amountRaw: raw,
      amountUi: amountUi(raw),
      mint: MINT,
      decimals: DECIMALS,
      cooldownDays: 30,
    },
  };
}

export function notConfigured() {
  return { configured: false, error: 'not_configured' };
}

async function rpcBatch(endpoints, calls) {
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calls),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data) || data.length !== calls.length) throw new Error('rpc');
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('rpc');
}

async function rpcOne(endpoints, method, params) {
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.error) throw new Error('rpc');
      return data.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('rpc');
}

export async function preflightFaucet({ endpoints, treasury, dest, amountRaw, env = {} }) {
  if (faucetPaused(env)) return { ok: false, status: 503, error: 'faucet_paused' };
  let destInfo;
  try {
    destInfo = await rpcOne(endpoints, 'getAccountInfo', [dest, { encoding: 'base64' }]);
  } catch {
    return { ok: false, status: 503, error: 'rpc_unavailable' };
  }
  const destClass = classifyDest({
    address: dest,
    account: destInfo?.value ?? null,
    onCurve: isOnCurveAddress(dest),
  });
  if (!destClass.ok) return { ok: false, status: 400, error: destClass.error };
  const treasuryAta = (await associatedTokenAddress(treasury.address)).address;
  const destAta = (await associatedTokenAddress(dest)).address;
  let rows;
  try {
    rows = await rpcBatch(endpoints, [
      { jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash', params: [{ commitment: 'confirmed' }] },
      { jsonrpc: '2.0', id: 2, method: 'getBalance', params: [treasury.address] },
      { jsonrpc: '2.0', id: 3, method: 'getTokenAccountBalance', params: [treasuryAta] },
      { jsonrpc: '2.0', id: 4, method: 'getAccountInfo', params: [destAta, { encoding: 'base64' }] },
      { jsonrpc: '2.0', id: 5, method: 'getMinimumBalanceForRentExemption', params: [ATA_ACCOUNT_BYTES] },
    ]);
  } catch {
    return { ok: false, status: 503, error: 'rpc_unavailable' };
  }
  const blockhash = rows[0]?.result?.value?.blockhash;
  if (!blockhash) return { ok: false, status: 503, error: 'rpc_unavailable' };
  const sol = Number(rows[1]?.result?.value);
  if (!Number.isFinite(sol)) return { ok: false, status: 503, error: 'rpc_unavailable' };
  const tokenAmount = rows[2]?.result?.value?.amount;
  if (rows[2]?.error || tokenAmount == null) return { ok: false, status: 503, error: 'treasury_empty' };
  let tokens;
  try { tokens = BigInt(tokenAmount); } catch { return { ok: false, status: 503, error: 'treasury_empty' }; }
  if (tokens < BigInt(amountRaw)) return { ok: false, status: 503, error: 'treasury_empty' };
  const destExists = Boolean(rows[3]?.result?.value);
  const rentLamports = parseRentExemption(rows[4]?.result);
  if (rentLamports == null) return { ok: false, status: 503, error: 'rpc_unavailable' };
  const need = (destExists ? 0 : rentLamports) + FEE_LAMPORTS;
  if (sol < need) return { ok: false, status: 503, error: 'treasury_rent' };
  const floor = faucetSolFloorLamports(env, rentLamports);
  if (sol < floor) return { ok: false, status: 503, error: 'faucet_paused' };
  return {
    ok: true,
    blockhash,
    treasuryAta,
    destAta,
    destExists,
    rentLamports,
    mint: MINT,
    amountRaw,
  };
}

export async function sendFaucetTransfer({ endpoints, keypair, dest, amountRaw, preflight }) {
  const ready = preflight || await preflightFaucet({ endpoints, treasury: keypair, dest, amountRaw });
  if (!ready.ok) return ready;
  const instructions = [
    encodeCreateAtaIdempotent({ payer: keypair.address, ata: ready.destAta, owner: dest, mint: MINT }),
    encodeTransferChecked({
      source: ready.treasuryAta,
      mint: MINT,
      dest: ready.destAta,
      owner: keypair.address,
      amountRaw,
    }),
  ];
  const signed = await signLegacyTx({ keypair, instructions, recentBlockhash: ready.blockhash });
  let raw;
  try {
    raw = btoa(String.fromCharCode(...signed.tx));
    const sim = await rpcOne(endpoints, 'simulateTransaction', [raw, {
      encoding: 'base64',
      sigVerify: false,
      commitment: 'confirmed',
      replaceRecentBlockhash: true,
    }]);
    if (sim?.err || sim?.value?.err) return { ok: false, status: 503, error: 'rpc_unavailable' };
  } catch {
    return { ok: false, status: 503, error: 'rpc_unavailable' };
  }
  let sig;
  try {
    sig = await rpcOne(endpoints, 'sendTransaction', [raw, { encoding: 'base64', preflightCommitment: 'confirmed' }]);
  } catch {
    return { ok: false, status: 503, error: 'rpc_unavailable' };
  }
  if (typeof sig !== 'string' || sig.length < 32) return { ok: false, status: 503, error: 'rpc_unavailable' };
  const confirmed = await confirmFaucetSignature(endpoints, sig);
  const sent = {
    signature: sig,
    dest,
    amountRaw,
    amountUi: amountUi(amountRaw),
    mint: MINT,
    solscan: solscanUrl(sig),
  };
  if (confirmed.state === 'confirmed') return { ok: true, ...sent };
  if (confirmed.state === 'failed') return { ok: false, status: 503, error: 'rpc_unavailable', ...sent, dropped: false };
  if (confirmed.state === 'dropped') return { ok: false, status: 503, error: 'rpc_unavailable', ...sent, dropped: true };
  return { ok: false, status: 202, error: 'confirming', ...sent };
}

export async function confirmFaucetSignature(endpoints, sig, { tries = CONFIRM_TRIES, waitMs = CONFIRM_WAIT_MS, retry = false } = {}) {
  let last = { state: 'pending' };
  for (let i = 0; i < tries; i++) {
    if (i) await sleep(waitMs);
    last = await signatureOutcome(endpoints, sig, { retry });
    if (last.state === 'confirmed' || last.state === 'failed' || last.state === 'dropped') return last;
  }
  return last;
}

export async function signatureOutcome(endpoints, sig, { retry = false } = {}) {
  try {
    const result = await rpcOne(endpoints, 'getSignatureStatuses', [[sig], { searchTransactionHistory: true }]);
    const read = readSignatureStatus(result);
    if (read.state === 'absent') return { state: retry ? 'dropped' : 'pending' };
    return read;
  } catch {
    return { state: 'pending' };
  }
}

function faucetStub(env, kind, id) {
  if (!env?.FAUCET) return null;
  return env.FAUCET.get(env.FAUCET.idFromName(`${kind}:${id}`));
}

async function faucetRead(env, kind, id, key) {
  const stub = faucetStub(env, kind, id);
  if (!stub) return null;
  const res = await stub.fetch(new Request(`https://faucet.internal/${encodeURIComponent(key)}`));
  const data = await res.json().catch(() => null);
  return data?.value ?? null;
}

async function faucetWrite(env, kind, id, key, value) {
  const stub = faucetStub(env, kind, id);
  if (!stub) throw new Error('faucet store missing');
  await stub.fetch(new Request(`https://faucet.internal/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  }));
}

async function rentOp(env, op, body) {
  const day = body.day;
  const stub = faucetStub(env, 'rent', day);
  if (!stub) throw new Error('faucet store missing');
  const res = await stub.fetch(new Request(`https://faucet.internal/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return res.json().catch(() => ({ ok: false, error: 'faucet_paused' }));
}

async function tokenOp(env, op, body) {
  const day = body.day;
  const stub = faucetStub(env, 'token', day);
  if (!stub) throw new Error('faucet store missing');
  const res = await stub.fetch(new Request(`https://faucet.internal/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return res.json().catch(() => ({ ok: false, error: 'faucet_paused' }));
}

async function claimOp(env, kind, id, op, body) {
  const stub = faucetStub(env, kind, id);
  if (!stub) throw new Error('faucet store missing');
  const res = await stub.fetch(new Request(`https://faucet.internal/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return res.json().catch(() => ({ ok: false, error: 'faucet store missing' }));
}

export class DashaFaucet {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.tail = Promise.resolve();
  }

  async fetch(request) {
    let release;
    const prev = this.tail;
    this.tail = new Promise((resolve) => { release = resolve; });
    await prev;
    try {
      return await this.handle(request);
    } finally {
      release();
    }
  }

  async handle(request) {
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (request.method === 'POST' && (key === 'claim-begin' || key === 'claim-bind-sig' || key === 'claim-finish' || key === 'claim-release')) {
      const body = await request.json().catch(() => ({}));
      const storeKey = String(body.key || '');
      if (!storeKey || storeKey.length > 200) return Response.json({ ok: false, error: 'bad key' }, { status: 400 });
      const row = (await this.state.storage.get(storeKey)) || null;
      if (key === 'claim-begin') {
        const blocked = claimCooldown(row);
        if (blocked?.pending && blocked.signature) {
          return Response.json({
            ok: false,
            error: 'confirming',
            signature: blocked.signature,
            dest: blocked.dest,
            nextAt: blocked.nextAt,
          });
        }
        if (blocked?.pending) return Response.json({ ok: false, error: 'claim already sending', nextAt: blocked.nextAt });
        if (blocked?.signature) {
          return Response.json({
            ok: false,
            error: 'already claimed',
            nextAt: blocked.nextAt,
            signature: blocked.signature,
            dest: blocked.dest,
          });
        }
        const pending = {
          dest: body.dest || row?.dest || null,
          amountRaw: body.amountRaw,
          ts: Date.now(),
          ipHash: body.ipHash || row?.ipHash || null,
          pending: true,
        };
        await this.state.storage.put(storeKey, pending);
        return Response.json({ ok: true, pending: true });
      }
      if (key === 'claim-bind-sig') {
        if (!row?.pending) return Response.json({ ok: false, error: 'not pending' });
        if (row.signature && row.signature !== body.signature) return Response.json({ ok: false, error: 'sig mismatch' });
        if (typeof body.signature !== 'string' || body.signature.length < 32) {
          return Response.json({ ok: false, error: 'bad signature' }, { status: 400 });
        }
        await this.state.storage.put(storeKey, {
          dest: body.dest || row.dest,
          amountRaw: body.amountRaw ?? row.amountRaw,
          ts: row.ts || Date.now(),
          ipHash: body.ipHash || row.ipHash || null,
          signature: body.signature,
          pending: true,
        });
        return Response.json({ ok: true, pending: true, signature: body.signature });
      }
      if (key === 'claim-finish') {
        if (typeof body.signature !== 'string' || body.signature.length < 32) {
          return Response.json({ ok: false, error: 'bad signature' }, { status: 400 });
        }
        await this.state.storage.put(storeKey, {
          dest: body.dest || row?.dest,
          signature: body.signature,
          amountRaw: body.amountRaw ?? row?.amountRaw,
          ts: Date.now(),
          ipHash: body.ipHash || row?.ipHash || null,
        });
        return Response.json({ ok: true });
      }
      if (body.dropped !== true && row?.signature && row.pending) {
        return Response.json({ ok: false, error: 'has signature' });
      }
      await this.state.storage.delete(storeKey);
      return Response.json({ ok: true, released: true });
    }
    if (request.method === 'POST' && (key === 'rent-reserve' || key === 'rent-release' || key === 'token-reserve' || key === 'token-release')) {
      const body = await request.json().catch(() => ({}));
      const day = String(body.day || '');
      const add = Number(body.add);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isInteger(add) || add < 0) {
        return Response.json({ ok: false, error: 'bad rent' }, { status: 400 });
      }
      const storeKey = key.startsWith('token') ? `faucetToken:${day}` : `faucetRent:${day}`;
      const row = (await this.state.storage.get(storeKey)) || { spent: 0, day };
      const spent = Number(row.spent) || 0;
      if (key === 'rent-release') {
        const next = { spent: Math.max(0, spent - add), day };
        await this.state.storage.put(storeKey, next);
        return Response.json({ ok: true, spent: next.spent });
      }
      const cap = Number(body.cap);
      if (!Number.isInteger(cap) || cap < 0 || spent + add > cap) {
        return Response.json({ ok: false, error: 'faucet_paused', spent });
      }
      const next = { spent: spent + add, day };
      await this.state.storage.put(storeKey, next);
      return Response.json({ ok: true, spent: next.spent });
    }
    if (!key || key.length > 200) return Response.json({ error: 'bad key' }, { status: 400 });
    if (request.method === 'GET') {
      return Response.json({ value: (await this.state.storage.get(key)) ?? null });
    }
    if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      await this.state.storage.put(key, body.value);
      return Response.json({ ok: true });
    }
    if (request.method === 'DELETE') {
      await this.state.storage.delete(key);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'not found' }, { status: 404 });
  }
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'missing';
}

async function requestJson(request) {
  const text = await request.text().catch(() => '');
  if (new TextEncoder().encode(text).length > 4096) return {};
  try { return JSON.parse(text || '{}'); } catch { return {}; }
}

function publicMe({ linked, configured, claim, dest }) {
  const blocked = claimCooldown(claim);
  return {
    linked,
    configured,
    claimed: Boolean(blocked && blocked.signature),
    nextAt: blocked?.nextAt || null,
    ...(blocked?.dest || dest ? { dest: blocked?.dest || dest } : {}),
    ...(blocked?.signature ? { signature: blocked.signature } : {}),
  };
}

export async function handleFaucetApi(request, env, { json, allowedOrigin, endpoints }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const cred = { credentials: true };
  const configured = faucetConfigured(env);
  const failUnconfigured = () => json(notConfigured(), 501, allowedOrigin, cred);

  if (path === '/faucet/status' && (request.method === 'GET' || request.method === 'HEAD')) {
    const out = faucetPublicStatus(env);
    return json(out.body, out.status, allowedOrigin, cred);
  }

  if (path === '/faucet/me' && request.method === 'GET') {
    const session = await sessionFromRequest(env, request);
    if (!session?.xId) return json(publicMe({ linked: false, configured }), 200, allowedOrigin, cred);
    const xId = String(session.xId);
    const claim = await faucetRead(env, 'x', xId, `faucetClaim:${xId}`);
    const destRow = await faucetRead(env, 'x', xId, `faucetDest:${xId}`);
    return json(publicMe({ linked: true, configured, claim, dest: destRow?.dest }), 200, allowedOrigin, cred);
  }

  if (path === '/faucet/wallet/challenge') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
    if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
    if (!configured) return failUnconfigured();
    if (!env.LOBBY_SESSION_SECRET) return json({ configured: false, error: 'not_configured' }, 501, allowedOrigin, cred);
    const session = await sessionFromRequest(env, request);
    if (!session?.xId || !session.handle) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
    const publicKey = String((await requestJson(request)).publicKey || '');
    if (!faucetDestOk(publicKey)) return json({ error: 'valid Solana address required' }, 400, allowedOrigin, cred);
    const challengeClass = await classifyDestLive(endpoints, publicKey);
    if (!challengeClass.ok) return json({ error: challengeClass.error }, challengeClass.status, allowedOrigin, cred);
    const issuedAt = Date.now();
    const expiresAt = issuedAt + 5 * 60_000;
    const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const proofOrigin = new URL(allowedOrigin);
    const domain = proofOrigin.host;
    const uri = `${proofOrigin.origin}/`;
    const message = faucetWalletMessage({
      handle: session.handle,
      publicKey,
      nonce,
      issuedAt,
      expiresAt,
      domain,
      uri,
    });
    if (!message) return json({ error: 'siws_domain' }, 400, allowedOrigin, cred);
    const siws = faucetSiwsFields({
      handle: session.handle,
      publicKey,
      nonce,
      issuedAt,
      expiresAt,
      domain,
      uri,
    });
    const challenge = await signPayload(env.LOBBY_SESSION_SECRET, {
      kind: 'faucet_dest',
      publicKey,
      nonce,
      message,
      origin: proofOrigin.origin,
      exp: expiresAt,
    });
    await faucetWrite(env, 'x', String(session.xId), `faucetSiws:${session.xId}`, { nonce, exp: expiresAt });
    return json({ ok: true, message, challenge, expiresAt, siws }, 200, allowedOrigin, cred);
  }

  if (path === '/faucet/dest-check') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
    if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
    if (!configured) return failUnconfigured();
    const destBody = await requestJson(request);
    const dest = String(destBody.dest || '');
    const shape = destShapeError(dest, destBody.last4);
    if (shape) return json({ error: shape }, 400, allowedOrigin, cred);
    const destClass = await classifyDestLive(endpoints, dest);
    return json({
      ok: destClass.ok,
      kind: destClass.kind || null,
      ...(destClass.error ? { error: destClass.error } : {}),
    }, destClass.status, allowedOrigin, cred);
  }

  if (path === '/faucet/wallet/verify') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
    if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
    if (!configured) return failUnconfigured();
    const session = await sessionFromRequest(env, request);
    if (!session?.xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
    const body = await requestJson(request);
    const xId = String(session.xId);
    if (body.paste || body.last4) {
      const dest = String(body.dest || body.publicKey || '');
      const shape = destShapeError(dest, body.last4);
      if (shape) return json({ error: shape }, 400, allowedOrigin, cred);
      const destClass = await classifyDestLive(endpoints, dest);
      if (!destClass.ok) return json({ error: destClass.error }, destClass.status, allowedOrigin, cred);
      await faucetWrite(env, 'x', xId, `faucetDest:${xId}`, { dest, method: 'paste', kind: destClass.kind, ts: Date.now() });
      return json({ ok: true, dest, method: 'paste', kind: destClass.kind }, 200, allowedOrigin, cred);
    }
    if (!env.LOBBY_SESSION_SECRET) return json({ configured: false, error: 'not_configured' }, 501, allowedOrigin, cred);
    const challenge = await verifyPayload(env.LOBBY_SESSION_SECRET, body.challenge);
    if (
      !challenge
      || challenge.kind !== 'faucet_dest'
      || challenge.publicKey !== body.publicKey
      || challenge.origin !== allowedOrigin
    ) {
      return json({ error: 'invalid faucet challenge' }, 401, allowedOrigin, cred);
    }
    const payload = String(body.signedMessage || challenge.message || '');
    if (!siwsDomainOk(siwsMessageDomain(payload))) {
      return json({ error: 'siws_domain' }, 400, allowedOrigin, cred);
    }
    if (!siwsSignedMessageOk({ message: payload, publicKey: body.publicKey, nonce: challenge.nonce })) {
      return json({ error: 'invalid faucet challenge' }, 401, allowedOrigin, cred);
    }
    const destClass = await classifyDestLive(endpoints, body.publicKey);
    if (!destClass.ok) return json({ error: destClass.error }, destClass.status, allowedOrigin, cred);
    const signatureOk = await verifyEd25519(payload, body.publicKey, body.signature).catch(() => false);
    if (!signatureOk) return json({ error: 'invalid wallet signature' }, 400, allowedOrigin, cred);
    const pending = await faucetRead(env, 'x', xId, `faucetSiws:${xId}`);
    if (!pending || pending.nonce !== challenge.nonce || pending.exp < Date.now()) {
      return json({ error: 'faucet challenge already used' }, 409, allowedOrigin, cred);
    }
    await faucetWrite(env, 'x', xId, `faucetDest:${xId}`, { dest: body.publicKey, method: 'siws', kind: destClass.kind, ts: Date.now() });
    await faucetWrite(env, 'x', xId, `faucetSiws:${xId}`, { nonce: pending.nonce, exp: 0 });
    return json({ ok: true, dest: body.publicKey, method: 'siws', kind: destClass.kind }, 200, allowedOrigin, cred);
  }

  if (path === '/faucet/claim') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
    if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
    if (!configured) return failUnconfigured();
    if (faucetPaused(env)) return json({ error: 'faucet_paused' }, 503, allowedOrigin, cred);
    const session = await sessionFromRequest(env, request);
    if (!session?.xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
    const xId = String(session.xId);
    const destRow = await faucetRead(env, 'x', xId, `faucetDest:${xId}`);
    const dest = destRow?.dest;
    if (!faucetDestOk(dest)) return json({ error: 'bind a destination first' }, 400, allowedOrigin, cred);
    const destClass = await classifyDestLive(endpoints, dest);
    if (!destClass.ok) return json({ error: destClass.error }, destClass.status, allowedOrigin, cred);
    const keypair = parseFaucetKeypair(env.FAUCET_KEYPAIR);
    const amountRaw = faucetAmountRaw(env);
    const ipHash = await hashIp(clientIp(request));
    const xKey = `faucetClaim:${xId}`;
    const ipKey = `faucetIp:${ipHash}`;
    const begun = await claimOp(env, 'x', xId, 'claim-begin', { key: xKey, dest, amountRaw, ipHash });
    if (begun?.error === 'already claimed') {
      return json({ error: 'already claimed', nextAt: begun.nextAt, signature: begun.signature, dest: begun.dest }, 429, allowedOrigin, cred);
    }
    if (begun?.error === 'claim already sending') {
      return json({ error: 'claim already sending', nextAt: begun.nextAt }, 409, allowedOrigin, cred);
    }
    if (begun?.error === 'confirming' && begun.signature) {
      const outcome = await signatureOutcome(endpoints, begun.signature, { retry: true });
      if (outcome.state === 'confirmed') {
        await claimOp(env, 'x', xId, 'claim-finish', {
          key: xKey, dest: begun.dest || dest, signature: begun.signature, amountRaw, ipHash,
        });
        await claimOp(env, 'ip', ipHash, 'claim-finish', {
          key: ipKey, dest: begun.dest || dest, signature: begun.signature, amountRaw, ipHash,
        });
        return json({
          error: 'already claimed',
          signature: begun.signature,
          dest: begun.dest || dest,
          solscan: solscanUrl(begun.signature),
        }, 429, allowedOrigin, cred);
      }
      if (outcome.state === 'dropped' || outcome.state === 'failed') {
        await claimOp(env, 'x', xId, 'claim-release', { key: xKey, dropped: true });
        return json({ error: 'rpc_unavailable' }, 503, allowedOrigin, cred);
      }
      return json({
        ok: false,
        error: 'confirming',
        signature: begun.signature,
        solscan: solscanUrl(begun.signature),
      }, 202, allowedOrigin, cred);
    }
    if (!begun?.ok) return json({ error: begun?.error || 'claim already sending' }, 409, allowedOrigin, cred);

    const ipBegun = await claimOp(env, 'ip', ipHash, 'claim-begin', { key: ipKey, dest, amountRaw, ipHash });
    if (!ipBegun?.ok) {
      await claimOp(env, 'x', xId, 'claim-release', { key: xKey });
      if (ipBegun?.error === 'already claimed') {
        return json({ error: 'already claimed', nextAt: ipBegun.nextAt, signature: ipBegun.signature }, 429, allowedOrigin, cred);
      }
      if (ipBegun?.error === 'confirming' && ipBegun.signature) {
        return json({
          ok: false,
          error: 'confirming',
          signature: ipBegun.signature,
          solscan: solscanUrl(ipBegun.signature),
        }, 202, allowedOrigin, cred);
      }
      return json({ error: ipBegun?.error || 'claim already sending' }, 409, allowedOrigin, cred);
    }

    const ready = await preflightFaucet({ endpoints, treasury: keypair, dest, amountRaw, env });
    if (!ready.ok) {
      await claimOp(env, 'x', xId, 'claim-release', { key: xKey });
      await claimOp(env, 'ip', ipHash, 'claim-release', { key: ipKey });
      return json({ error: ready.error }, ready.status, allowedOrigin, cred);
    }
    const rentAdd = ready.destExists ? 0 : ready.rentLamports;
    const day = utcDay();
    if (rentAdd > 0) {
      const reserved = await rentOp(env, 'rent-reserve', {
        day,
        add: rentAdd,
        cap: faucetRentCapLamports(env, ready.rentLamports),
      });
      if (!reserved?.ok) {
        await claimOp(env, 'x', xId, 'claim-release', { key: xKey });
        await claimOp(env, 'ip', ipHash, 'claim-release', { key: ipKey });
        return json({ error: 'faucet_paused' }, 503, allowedOrigin, cred);
      }
    }
    const tokenReserved = await tokenOp(env, 'token-reserve', {
      day,
      add: amountRaw,
      cap: faucetTokenCapRaw(env),
    });
    if (!tokenReserved?.ok) {
      if (rentAdd > 0) await rentOp(env, 'rent-release', { day, add: rentAdd });
      await claimOp(env, 'x', xId, 'claim-release', { key: xKey });
      await claimOp(env, 'ip', ipHash, 'claim-release', { key: ipKey });
      return json({ error: 'faucet_paused' }, 503, allowedOrigin, cred);
    }
    const sent = await sendFaucetTransfer({ endpoints, keypair, dest, amountRaw, preflight: ready });
    if (sent.signature) {
      await claimOp(env, 'x', xId, 'claim-bind-sig', {
        key: xKey, dest, amountRaw, ipHash, signature: sent.signature,
      });
      await claimOp(env, 'ip', ipHash, 'claim-bind-sig', {
        key: ipKey, dest, amountRaw, ipHash, signature: sent.signature,
      });
    }
    if (sent.ok) {
      await claimOp(env, 'x', xId, 'claim-finish', {
        key: xKey, dest, signature: sent.signature, amountRaw, ipHash,
      });
      await claimOp(env, 'ip', ipHash, 'claim-finish', {
        key: ipKey, dest, signature: sent.signature, amountRaw, ipHash,
      });
      return json({
        ok: true,
        signature: sent.signature,
        dest,
        amountRaw,
        amountUi: sent.amountUi,
        mint: MINT,
        solscan: sent.solscan,
      }, 200, allowedOrigin, cred);
    }
    if (sent.error === 'confirming' && sent.signature) {
      return json({
        ok: false,
        error: 'confirming',
        signature: sent.signature,
        solscan: sent.solscan,
      }, 202, allowedOrigin, cred);
    }
    if (sent.signature) {
      await claimOp(env, 'x', xId, 'claim-release', { key: xKey, dropped: sent.dropped === true || sent.error !== 'confirming' });
      await claimOp(env, 'ip', ipHash, 'claim-release', { key: ipKey, dropped: sent.dropped === true || sent.error !== 'confirming' });
    } else {
      await claimOp(env, 'x', xId, 'claim-release', { key: xKey });
      await claimOp(env, 'ip', ipHash, 'claim-release', { key: ipKey });
    }
    if (rentAdd > 0) await rentOp(env, 'rent-release', { day, add: rentAdd });
    await tokenOp(env, 'token-release', { day, add: amountRaw });
    return json({ error: sent.error }, sent.status || 503, allowedOrigin, cred);
  }

  return null;
}

export function isFaucetApiPath(pathname) {
  const path = String(pathname || '').replace(/\/$/, '');
  return path === '/faucet/status' || path === '/faucet/me'
    || path === '/faucet/wallet/challenge' || path === '/faucet/wallet/verify'
    || path === '/faucet/dest-check' || path === '/faucet/claim';
}

export function isFaucetPagePath(pathname) {
  return pathname === '/faucet' || pathname === '/faucet/';
}

export function allowedOriginOf(request, env) {
  const origin = request.headers.get('Origin');
  return origin && originAllowed(origin, env.ALLOWED_ORIGINS || '')
    ? origin
    : env.ALLOW_ANY_ORIGIN
      ? origin || '*'
      : null;
}
