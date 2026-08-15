/**
 * Dasha /faucet — tiny sample, not an airdrop, not earn.
 * Classic Token program. HTTP RPC only. No hold check. No board join.
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
export const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
export const SYSTEM_PROGRAM = '11111111111111111111111111111111';
export const DECIMALS = 6;
export const DEFAULT_AMOUNT_RAW = 100_000_000;
export const ATA_RENT_LAMPORTS = 2_039_280;
export const FEE_LAMPORTS = 5_000;
export const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export const PENDING_MS = 15 * 60_000;
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
  return isValidSolanaAddress(value) && value !== SYSTEM_PROGRAM && isOnCurveAddress(value);
}

export function last4(addr) {
  return String(addr || '').slice(-4);
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
  if (row.pending && !row.signature) {
    if (now - Number(row.ts) < PENDING_MS) return { pending: true, nextAt: Number(row.ts) + PENDING_MS };
    return null;
  }
  if (!row.signature) return null;
  const nextAt = Number(row.ts) + COOLDOWN_MS;
  if (now < nextAt) return { nextAt, signature: row.signature, dest: row.dest || null, amountRaw: row.amountRaw };
  return null;
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

export async function preflightFaucet({ endpoints, treasury, dest, amountRaw }) {
  const treasuryAta = (await associatedTokenAddress(treasury.address)).address;
  const destAta = (await associatedTokenAddress(dest)).address;
  let rows;
  try {
    rows = await rpcBatch(endpoints, [
      { jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash', params: [{ commitment: 'confirmed' }] },
      { jsonrpc: '2.0', id: 2, method: 'getBalance', params: [treasury.address] },
      { jsonrpc: '2.0', id: 3, method: 'getTokenAccountBalance', params: [treasuryAta] },
      { jsonrpc: '2.0', id: 4, method: 'getAccountInfo', params: [destAta, { encoding: 'base64' }] },
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
  const need = (destExists ? 0 : ATA_RENT_LAMPORTS) + FEE_LAMPORTS;
  if (sol < need) return { ok: false, status: 503, error: 'treasury_rent' };
  return {
    ok: true,
    blockhash,
    treasuryAta,
    destAta,
    destExists,
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
  let sig;
  try {
    const raw = btoa(String.fromCharCode(...signed.tx));
    sig = await rpcOne(endpoints, 'sendTransaction', [raw, { encoding: 'base64', preflightCommitment: 'confirmed' }]);
  } catch {
    return { ok: false, status: 503, error: 'rpc_unavailable' };
  }
  if (typeof sig !== 'string' || sig.length < 32) return { ok: false, status: 503, error: 'rpc_unavailable' };
  try {
    await rpcOne(endpoints, 'getSignatureStatuses', [[sig], { searchTransactionHistory: true }]);
  } catch {
    /* signature is real; confirm is best-effort */
  }
  return {
    ok: true,
    signature: sig,
    dest,
    amountRaw,
    amountUi: amountUi(amountRaw),
    mint: MINT,
    solscan: solscanUrl(sig),
  };
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

export class DashaFaucet {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace(/^\//, ''));
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
    const issuedAt = Date.now();
    const expiresAt = issuedAt + 5 * 60_000;
    const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const proofOrigin = new URL(allowedOrigin);
    const message = walletMessage({
      handle: session.handle,
      publicKey,
      nonce,
      issuedAt,
      expiresAt,
      domain: proofOrigin.host,
      uri: `${proofOrigin.origin}/`,
      requestId: 'faucet_dest',
    });
    const challenge = await signPayload(env.LOBBY_SESSION_SECRET, {
      kind: 'faucet_dest',
      xId: String(session.xId),
      publicKey,
      nonce,
      message,
      origin: proofOrigin.origin,
      exp: expiresAt,
    });
    await faucetWrite(env, 'x', String(session.xId), `faucetSiws:${session.xId}`, { nonce, exp: expiresAt });
    return json({ ok: true, message, challenge, expiresAt }, 200, allowedOrigin, cred);
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
      if (!faucetDestOk(dest)) return json({ error: 'valid Solana address required' }, 400, allowedOrigin, cred);
      if (last4(dest) !== String(body.last4 || '')) return json({ error: 'last-4 does not match' }, 400, allowedOrigin, cred);
      await faucetWrite(env, 'x', xId, `faucetDest:${xId}`, { dest, method: 'paste', ts: Date.now() });
      return json({ ok: true, dest, method: 'paste' }, 200, allowedOrigin, cred);
    }
    if (!env.LOBBY_SESSION_SECRET) return json({ configured: false, error: 'not_configured' }, 501, allowedOrigin, cred);
    const challenge = await verifyPayload(env.LOBBY_SESSION_SECRET, body.challenge);
    if (
      !challenge
      || challenge.kind !== 'faucet_dest'
      || challenge.xId !== xId
      || challenge.publicKey !== body.publicKey
      || challenge.origin !== allowedOrigin
    ) {
      return json({ error: 'invalid faucet challenge' }, 401, allowedOrigin, cred);
    }
    if (!faucetDestOk(body.publicKey)) return json({ error: 'valid Solana address required' }, 400, allowedOrigin, cred);
    const signatureOk = await verifyEd25519(challenge.message, body.publicKey, body.signature).catch(() => false);
    if (!signatureOk) return json({ error: 'invalid wallet signature' }, 400, allowedOrigin, cred);
    const pending = await faucetRead(env, 'x', xId, `faucetSiws:${xId}`);
    if (!pending || pending.nonce !== challenge.nonce || pending.exp < Date.now()) {
      return json({ error: 'faucet challenge already used' }, 409, allowedOrigin, cred);
    }
    await faucetWrite(env, 'x', xId, `faucetDest:${xId}`, { dest: body.publicKey, method: 'siws', ts: Date.now() });
    await faucetWrite(env, 'x', xId, `faucetSiws:${xId}`, { nonce: pending.nonce, exp: 0 });
    return json({ ok: true, dest: body.publicKey, method: 'siws' }, 200, allowedOrigin, cred);
  }

  if (path === '/faucet/claim') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, allowedOrigin, cred);
    if (!allowedOrigin) return json({ error: 'origin required' }, 403, null);
    if (!configured) return failUnconfigured();
    const session = await sessionFromRequest(env, request);
    if (!session?.xId) return json({ error: 'link X first' }, 401, allowedOrigin, cred);
    const xId = String(session.xId);
    const destRow = await faucetRead(env, 'x', xId, `faucetDest:${xId}`);
    const dest = destRow?.dest;
    if (!faucetDestOk(dest)) return json({ error: 'bind a destination first' }, 400, allowedOrigin, cred);
    const claim = await faucetRead(env, 'x', xId, `faucetClaim:${xId}`);
    const xBlock = claimCooldown(claim);
    if (xBlock?.pending) return json({ error: 'claim already sending', nextAt: xBlock.nextAt }, 409, allowedOrigin, cred);
    if (xBlock?.signature) return json({ error: 'already claimed', nextAt: xBlock.nextAt, signature: xBlock.signature, dest: xBlock.dest }, 429, allowedOrigin, cred);
    const ipHash = await hashIp(clientIp(request));
    const ipRow = await faucetRead(env, 'ip', ipHash, `faucetIp:${ipHash}`);
    if (ipRow?.ts && Date.now() < Number(ipRow.ts) + COOLDOWN_MS) {
      return json({ error: 'already claimed', nextAt: Number(ipRow.ts) + COOLDOWN_MS }, 429, allowedOrigin, cred);
    }
    const keypair = parseFaucetKeypair(env.FAUCET_KEYPAIR);
    const amountRaw = faucetAmountRaw(env);
    const ready = await preflightFaucet({ endpoints, treasury: keypair, dest, amountRaw });
    if (!ready.ok) return json({ error: ready.error }, ready.status, allowedOrigin, cred);
    const pending = { dest, amountRaw, ts: Date.now(), ipHash, pending: true };
    await faucetWrite(env, 'x', xId, `faucetClaim:${xId}`, pending);
    const sent = await sendFaucetTransfer({ endpoints, keypair, dest, amountRaw, preflight: ready });
    if (!sent.ok) {
      await faucetWrite(env, 'x', xId, `faucetClaim:${xId}`, { ...pending, pending: false, ts: 0 });
      return json({ error: sent.error }, sent.status, allowedOrigin, cred);
    }
    const done = { dest, signature: sent.signature, amountRaw, ts: Date.now(), ipHash };
    await faucetWrite(env, 'x', xId, `faucetClaim:${xId}`, done);
    await faucetWrite(env, 'ip', ipHash, `faucetIp:${ipHash}`, { ts: done.ts });
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

  return null;
}

export function isFaucetApiPath(pathname) {
  const path = String(pathname || '').replace(/\/$/, '');
  return path === '/faucet/status' || path === '/faucet/me'
    || path === '/faucet/wallet/challenge' || path === '/faucet/wallet/verify'
    || path === '/faucet/claim';
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
