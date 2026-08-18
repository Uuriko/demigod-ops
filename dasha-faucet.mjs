/**
 * Dasha tip faucet — pure helpers + status/claim ledger (no outbound I/O).
 * Product: one mainnet tip of $dasha for a real human. Not an SEO airdrop farm.
 */
import { isValidSolanaAddress } from './dasha-simp-actions.mjs';

export const FAUCET_MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
export const FAUCET_TREASURY_DEFAULT = 'DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb';
export const FAUCET_SIWS_DOMAIN = 'lobby.getdasha.com';
export const FAUCET_DECIMALS = 6;
export const FAUCET_AMOUNT_UI = 100;
export const FAUCET_AMOUNT_RAW = 100_000_000n;
export const FAUCET_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
/** Default anti-farm knobs (override via env). */
export const FAUCET_DAILY_CAP_DEFAULT = 48;
export const FAUCET_HOURLY_CAP_DEFAULT = 12;
export const FAUCET_MIN_X_AGE_DAYS_DEFAULT = 7;
export const FAUCET_MIN_X_FOLLOWERS_DEFAULT = 0; // soft; 0 = off
export const FAUCET_AUTO_PAUSE_MS = 60 * 60 * 1000; // after hourly trip
/** In-flight reserve older than this is a crashed send, not a live tip. */
export const FAUCET_PENDING_MS = 2 * 60 * 1000;

export function destShapeError(dest, four = '', opts = {}) {
  dest = String(dest || '').trim();
  four = String(four || '').trim();
  const mint = String(opts.mint || FAUCET_MINT).trim();
  const treasury = String(opts.treasury || FAUCET_TREASURY_DEFAULT).trim();
  if (/t\.me|telegram/i.test(dest)) return 'dest_not_wallet';
  if (!isValidSolanaAddress(dest)) return 'dest_not_wallet';
  if (dest === mint) return 'dest_mint';
  if (treasury && dest === treasury) return 'dest_treasury';
  if (four && dest.slice(-4) !== four) return 'last-4 does not match';
  return '';
}

export function humanError(code) {
  const key = String(code || '').trim();
  if (!key || key.charAt(0) === '{') return 'claim failed.';
  const map = {
    dest_not_wallet: 'dest_not_wallet',
    dest_token: 'dest_token',
    dest_mint: 'dest_mint',
    dest_treasury: 'dest_treasury',
    dest_pda: 'dest_pda',
    'last-4 does not match': 'last-4 does not match',
    'link X first': 'link X first',
    'prove wallet': 'prove wallet',
    'already claimed': 'already claimed',
    confirming: 'confirming',
    treasury_empty: 'treasury_empty',
    faucet_paused: 'faucet paused',
    treasury_rent: 'treasury_rent',
    rpc_unavailable: 'rpc_unavailable',
    not_configured: 'not_configured',
    'invalid faucet challenge': 'invalid faucet challenge',
    siws_domain: 'siws_domain',
    'non-json response': 'non-json response',
    transfer_unready: 'faucet paused',
    daily_cap: 'daily tip limit reached — try tomorrow',
    hourly_cap: 'tips paused briefly — try later',
    x_too_new: 'X account is too new for a tip',
    x_reauth: 'Link X again to verify account age',
  };
  return map[key] || key;
}

/** Live CF secret is FAUCET_KEYPAIR; also accept TREASURY/SIGNER aliases. */
export function faucetSignerSecret(env = {}) {
  return String(
    env.FAUCET_KEYPAIR || env.FAUCET_TREASURY_SECRET || env.FAUCET_SIGNER_SECRET || '',
  ).trim();
}

export function faucetConfig(env = {}) {
  const treasury = String(env.FAUCET_TREASURY || FAUCET_TREASURY_DEFAULT).trim();
  const mint = String(env.MINT || FAUCET_MINT).trim();
  const hasSession = Boolean(env.LOBBY_SESSION_SECRET);
  const hasSigner = Boolean(faucetSignerSecret(env));
  const paused = String(env.FAUCET_PAUSED || '') === '1' || String(env.FAUCET_PAUSED || '').toLowerCase() === 'true';
  const amountUi = Number(env.FAUCET_AMOUNT_UI || FAUCET_AMOUNT_UI) || FAUCET_AMOUNT_UI;
  const decimals = Number(env.FAUCET_DECIMALS || FAUCET_DECIMALS) || FAUCET_DECIMALS;
  const amountRaw = BigInt(env.FAUCET_AMOUNT_RAW || FAUCET_AMOUNT_RAW);
  const cooldownDays = Number(env.FAUCET_COOLDOWN_DAYS || 30) || 30;
  const dailyCap = Math.max(1, Number(env.FAUCET_DAILY_CAP || FAUCET_DAILY_CAP_DEFAULT) || FAUCET_DAILY_CAP_DEFAULT);
  const hourlyCap = Math.max(1, Number(env.FAUCET_HOURLY_CAP || FAUCET_HOURLY_CAP_DEFAULT) || FAUCET_HOURLY_CAP_DEFAULT);
  const minXAgeDays = Math.max(0, Number(env.FAUCET_MIN_X_AGE_DAYS ?? FAUCET_MIN_X_AGE_DAYS_DEFAULT));
  const minXFollowers = Math.max(0, Number(env.FAUCET_MIN_X_FOLLOWERS ?? FAUCET_MIN_X_FOLLOWERS_DEFAULT));
  const configured = hasSession && isValidSolanaAddress(treasury) && mint === FAUCET_MINT;
  return {
    treasury,
    mint,
    hasSigner,
    paused,
    amountUi,
    decimals,
    amountRaw,
    cooldownDays,
    dailyCap,
    hourlyCap,
    minXAgeDays,
    minXFollowers,
    configured,
  };
}

export function utcDayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD
}

export function utcHourKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

/**
 * Soft X age gate. Missing createdAt on old sessions → reauth (fail closed for new links only when field present).
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function checkXEligibility(session, { minXAgeDays = 7, minXFollowers = 0, now = Date.now() } = {}) {
  if (!session?.xId) return { ok: false, error: 'link X first' };
  if (minXAgeDays > 0) {
    if (!Number.isFinite(session.xCreatedAt)) {
      // Fail closed: an old cookie without created_at must re-link X before a funded tip.
      return { ok: false, error: 'x_reauth' };
    }
    const ageMs = now - Number(session.xCreatedAt);
    const need = minXAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < need) return { ok: false, error: 'x_too_new' };
  }
  if (minXFollowers > 0 && typeof session.xFollowers === 'number' && session.xFollowers < minXFollowers) {
    return { ok: false, error: 'x_too_new' }; // same public copy: account not seasoned enough
  }
  return { ok: true };
}

/**
 * @param {{ dayKey?: string, dayCount?: number, hourKey?: string, hourCount?: number, autoPausedUntil?: number }} metrics
 */
export function checkRateLimits(metrics, cfg, { now = Date.now() } = {}) {
  const m = metrics || {};
  if (cfg.paused) return { ok: false, error: 'faucet_paused' };
  if (Number(m.autoPausedUntil) > now) return { ok: false, error: 'hourly_cap', autoPausedUntil: m.autoPausedUntil };
  const day = utcDayKey(now);
  const hour = utcHourKey(now);
  const dayCount = m.dayKey === day ? Number(m.dayCount) || 0 : 0;
  const hourCount = m.hourKey === hour ? Number(m.hourCount) || 0 : 0;
  if (dayCount >= cfg.dailyCap) return { ok: false, error: 'daily_cap', dayCount, dailyCap: cfg.dailyCap };
  if (hourCount >= cfg.hourlyCap) {
    return {
      ok: false,
      error: 'hourly_cap',
      hourCount,
      hourlyCap: cfg.hourlyCap,
      autoPausedUntil: now + FAUCET_AUTO_PAUSE_MS,
    };
  }
  return { ok: true, dayCount, hourCount, day, hour };
}

/** After a successful claim, bump counters; may set autoPausedUntil when hourly trips. */
export function noteSuccessfulClaim(metrics, cfg, { now = Date.now() } = {}) {
  const day = utcDayKey(now);
  const hour = utcHourKey(now);
  const prev = metrics || {};
  const dayCount = (prev.dayKey === day ? Number(prev.dayCount) || 0 : 0) + 1;
  const hourCount = (prev.hourKey === hour ? Number(prev.hourCount) || 0 : 0) + 1;
  let autoPausedUntil = Number(prev.autoPausedUntil) || 0;
  if (hourCount >= cfg.hourlyCap) autoPausedUntil = Math.max(autoPausedUntil, now + FAUCET_AUTO_PAUSE_MS);
  return {
    dayKey: day,
    dayCount,
    hourKey: hour,
    hourCount,
    autoPausedUntil,
    lastClaimAt: now,
  };
}

export function rateLimitStatusFields(metrics, cfg, { now = Date.now() } = {}) {
  const day = utcDayKey(now);
  const hour = utcHourKey(now);
  const m = metrics || {};
  const dayCount = m.dayKey === day ? Number(m.dayCount) || 0 : 0;
  const hourCount = m.hourKey === hour ? Number(m.hourCount) || 0 : 0;
  const autoPausedUntil = Number(m.autoPausedUntil) || 0;
  return {
    dailyCap: cfg.dailyCap,
    dailyUsed: dayCount,
    dailyRemaining: Math.max(0, cfg.dailyCap - dayCount),
    hourlyCap: cfg.hourlyCap,
    hourlyUsed: hourCount,
    minXAgeDays: cfg.minXAgeDays,
    autoPaused: autoPausedUntil > now,
    autoPausedUntil: autoPausedUntil > now ? autoPausedUntil : null,
  };
}

/**
 * @param {{ configured: boolean, paused?: boolean, hasSigner?: boolean, amountRaw: bigint, amountUi: number, decimals: number, cooldownDays: number, mint: string, treasury: string }} cfg
 * @param {{ balanceRaw?: bigint|null, rpcOk?: boolean }} inventory
 */
function statusBase(cfg, extra = {}) {
  return {
    configured: true,
    funded: false,
    amountRaw: Number(cfg.amountRaw),
    amountUi: cfg.amountUi,
    mint: cfg.mint,
    decimals: cfg.decimals,
    cooldownDays: cfg.cooldownDays,
    treasury: cfg.treasury,
    ...extra,
  };
}

export function buildStatus(cfg, inventory = {}) {
  if (!cfg.configured) {
    return {
      configured: false,
      funded: false,
      amountRaw: Number(cfg.amountRaw),
      amountUi: cfg.amountUi,
      mint: cfg.mint,
      decimals: cfg.decimals,
      cooldownDays: cfg.cooldownDays,
      treasury: cfg.treasury,
      error: 'not_configured',
    };
  }
  if (cfg.paused) {
    return statusBase(cfg, { error: 'faucet_paused' });
  }
  if (inventory.rpcOk === false) {
    // Soft-empty when signer exists but RPC is flaky: still show tip jar as empty, not “network busy”,
    // so pitch-in remains the clear call-to-action. Flag rpc for operators.
    if (cfg.hasSigner) {
      return statusBase(cfg, {
        error: 'treasury_empty',
        rpc: 'unavailable',
        rpcDetail: inventory.rpcDetail ? String(inventory.rpcDetail).slice(0, 120) : undefined,
      });
    }
    return statusBase(cfg, { error: 'rpc_unavailable' });
  }
  const bal = inventory.balanceRaw == null ? 0n : BigInt(inventory.balanceRaw);
  // Funded for UX only when inventory covers a tip AND a signer exists (no false claim CTAs).
  const funded = bal >= cfg.amountRaw && Boolean(cfg.hasSigner);
  return statusBase(cfg, {
    funded,
    error: funded ? null : bal < cfg.amountRaw ? 'treasury_empty' : 'not_configured',
    balanceRaw: Number(bal > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : bal),
  });
}

/* `proven` means the destination was demonstrated by an ed25519 signature over the SIWS challenge,
   not merely typed in. Only a proven wallet may occupy the byWallet index: addresses are public, so
   an unproven bind lets anyone spend a stranger's per-wallet slot and lock them out for the whole
   cooldown. Unproven claims still dedup by X id, so nobody double-dips. Defaults to true so a call
   site that has not been updated errs toward more deduplication, never less. */
export function claimLookup(store, { xId, wallet, proven = true }) {
  const byX = xId ? store?.byX?.[String(xId)] : null;
  const byW = proven && wallet ? store?.byWallet?.[String(wallet)] : null;
  return byX || byW || null;
}

export function claimAllowed(store, { xId, wallet, proven = true, now = Date.now(), cooldownMs = FAUCET_COOLDOWN_MS }) {
  if (!xId) return { ok: false, error: 'link X first' };
  if (!wallet || destShapeError(wallet)) return { ok: false, error: destShapeError(wallet) || 'dest_not_wallet' };
  if (!proven) return { ok: false, error: 'prove wallet' };
  const prev = claimLookup(store, { xId, wallet, proven });
  // In-flight reservation (multi-tab): wait / poll.
  // A reserve with no signature that is older than FAUCET_PENDING_MS is a crashed
  // send (HackerOne-style double-claim races die here if we never expire).
  if (prev?.pending) {
    const age = now - Number(prev.at || 0);
    if (age < FAUCET_PENDING_MS) return { ok: false, error: 'confirming', prev };
  }
  if (prev?.signature) {
    const at = Number(prev.at || 0);
    if (!cooldownMs || now - at < cooldownMs) return { ok: false, error: 'already claimed', prev };
  }
  return { ok: true };
}

/**
 * Reserve claim slot before broadcast (prevents double-send).
 * Clear with clearPendingClaim on hard failure; finalize with recordClaim on success.
 */
export function reserveClaim(store, { xId, wallet, at = Date.now(), proven = true }) {
  const next = {
    byX: { ...(store?.byX || {}) },
    byWallet: { ...(store?.byWallet || {}) },
  };
  const row = {
    xId: String(xId),
    wallet: String(wallet),
    signature: '',
    at,
    pending: true,
    proven: Boolean(proven),
  };
  next.byX[String(xId)] = row;
  if (proven) next.byWallet[String(wallet)] = row;
  return next;
}

export function recordClaim(store, { xId, wallet, signature, at = Date.now(), proven = true }) {
  const next = {
    byX: { ...(store?.byX || {}) },
    byWallet: { ...(store?.byWallet || {}) },
  };
  const row = {
    xId: String(xId),
    wallet: String(wallet),
    signature: String(signature),
    at,
    pending: false,
    proven: Boolean(proven),
  };
  next.byX[String(xId)] = row;
  if (proven) next.byWallet[String(wallet)] = row;
  return next;
}

/* Rollback must only ever undo the caller's OWN reservation.
   An unproven claim no longer consults byWallet, so two claims can be in flight for the same
   wallet — the owner's proven one and a stranger's pasted one. Without these guards the
   stranger's failed send would delete the owner's in-flight byWallet row. */
export function clearPendingClaim(store, { xId, wallet, proven = true }) {
  const next = {
    byX: { ...(store?.byX || {}) },
    byWallet: { ...(store?.byWallet || {}) },
  };
  const px = xId ? next.byX[String(xId)] : null;
  const pw = proven && wallet ? next.byWallet[String(wallet)] : null;
  if (px?.pending) delete next.byX[String(xId)];
  if (pw?.pending && String(pw.xId) === String(xId)) delete next.byWallet[String(wallet)];
  return next;
}

/** Idempotent claim response helper when already paid. */
export function alreadyClaimedResponse(prev) {
  if (!prev?.signature) return null;
  return {
    ok: true,
    signature: prev.signature,
    solscan: `https://solscan.io/tx/${prev.signature}`,
    dest: prev.wallet || null,
    replay: true,
  };
}

export function meFromSession(session, store, bind) {
  const xId = session?.xId ? String(session.xId) : '';
  const linked = Boolean(xId);
  const dest = bind?.dest || store?.byX?.[xId]?.wallet || null;
  const claim = xId ? store?.byX?.[xId] : null;
  return {
    linked,
    configured: true,
    claimed: Boolean(claim?.signature),
    nextAt: claim?.at && FAUCET_COOLDOWN_MS ? claim.at + FAUCET_COOLDOWN_MS : null,
    dest: dest || null,
    signature: claim?.signature || null,
    x: linked
      ? { handle: session.handle || null, display: session.handle ? `@${session.handle}` : null }
      : null,
  };
}

/** Fail-closed donate: never award, never mark funded. Live junk and unverified sigs both return sig miss. */
export function donateFailClosed(input = {}) {
  const sig = String(input?.signature ?? input?.sig ?? '').trim();
  if (donateSigError(sig)) return { error: 'sig miss' };
  return { error: 'sig miss' };
}

export function donateSigError(sig) {
  const s = String(sig || '').trim();
  if (!s || s.length < 64 || s.length > 88 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(s)) return 'sig miss';
  return '';
}

export const DONATE_LAUNCH_MS = Date.parse('2026-08-16T00:00:00.000Z');
export const DONATE_MIN_RAW = 1_000_000_000n; // 1000 $dasha at 6 decimals

function tokenOwnerMintAmount(balances, owner, mint) {
  const rows = Array.isArray(balances) ? balances : [];
  let raw = null;
  for (const row of rows) {
    if (String(row?.owner || '') !== owner) continue;
    if (String(row?.mint || '') !== mint) continue;
    const amt = row?.uiTokenAmount?.amount;
    if (amt == null) continue;
    try {
      const n = BigInt(amt);
      raw = raw == null ? n : raw + n;
    } catch {
      return null;
    }
  }
  return raw;
}

function messagePayer(tx) {
  const keys = tx?.transaction?.message?.accountKeys;
  const first = Array.isArray(keys) ? keys[0] : null;
  if (!first) return '';
  if (typeof first === 'string') return first;
  return String(first.pubkey || first.toString?.() || '');
}

/**
 * Fail-closed on-chain donate inspect. Any doubt → `{ error: 'sig miss' }`.
 * Does not award. Does not trust client amounts.
 */
export function inspectDonateTx(tx, {
  treasury = FAUCET_TREASURY_DEFAULT,
  mint = FAUCET_MINT,
  faucetSigner = '',
  now = Date.now(),
  launchAt = DONATE_LAUNCH_MS,
  minRaw = DONATE_MIN_RAW,
  windowMs = 7 * 24 * 60 * 60 * 1000,
} = {}) {
  if (!tx || tx.meta?.err) return { error: 'sig miss' };
  const blockTime = Number(tx.blockTime) * 1000;
  if (!Number.isFinite(blockTime) || blockTime > now + 60_000) return { error: 'sig miss' };
  if (blockTime < launchAt) return { error: 'sig miss' };
  if (now - blockTime > windowMs) return { error: 'sig miss' };
  const payer = messagePayer(tx);
  if (!payer) return { error: 'sig miss' };
  if (faucetSigner && payer === faucetSigner) return { error: 'sig miss' };
  const pre = tokenOwnerMintAmount(tx.meta.preTokenBalances, treasury, mint);
  const post = tokenOwnerMintAmount(tx.meta.postTokenBalances, treasury, mint);
  if (pre == null || post == null) return { error: 'sig miss' };
  const delta = post - pre;
  if (delta < minRaw) return { error: 'sig miss' };
  return { ok: true, amountRaw: delta, at: blockTime, payer };
}

export function faucetSiwsInput({ domain, publicKey, nonce, issuedAt, expirationTime }) {
  return {
    domain,
    address: publicKey,
    statement:
      'Prove this wallet is yours to claim a Dasha tip. This is not a transaction and does not spend SOL or approve tokens.',
    uri: `https://${domain}/`,
    version: '1',
    chainId: 'mainnet',
    nonce,
    issuedAt: new Date(issuedAt).toISOString(),
    expirationTime: new Date(expirationTime).toISOString(),
  };
}

/** Signed SIWS text must name our domain, the key, the tip statement, and the issued nonce. */
export function siwsMessageError(message, { publicKey, domain, nonce } = {}) {
  const msg = String(message || '');
  const key = String(publicKey || '').trim();
  if (!key || !msg.includes(key) || !msg.includes('Dasha tip')) return 'invalid faucet challenge';
  if (domain && !msg.includes(String(domain))) return 'siws_domain';
  if (nonce && !msg.includes(String(nonce))) return 'invalid faucet challenge';
  return '';
}
