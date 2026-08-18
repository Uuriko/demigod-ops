#!/usr/bin/env node
/**
 * demigod-die-accounts — who is asking, which is the question the desk currently cannot answer.
 *
 * WHAT IS WRONG TODAY
 * The hosted desk is gated by one shared password. Everyone who gets in is the same anonymous
 * someone, so no action can be attributed, no access can be withdrawn from one person without
 * changing it for everybody, and the activity log records what happened but never who did it.
 * That is adequate for one operator on a laptop and is the single largest gap between this and a
 * product other people can be given.
 *
 * WHAT THIS ADDS
 * Named accounts, a role each, and sessions that can be revoked individually. Nothing else — no
 * organisations, no invitations, no SSO. Those are real needs later and inventing them now would be
 * scaffolding for a product nobody has yet asked for.
 *
 * THE RULES IT WILL NOT BEND
 * - **No store, no access.** A missing or unreadable accounts file grants nothing. The tempting
 *   failure is to treat "no users configured" as "no restrictions", which is how an internal tool
 *   becomes a public one by accident.
 * - **Disabling a person ends their sessions.** A revocation that leaves live cookies working is
 *   not a revocation, and this is the check people forget.
 * - **Passwords are never stored, compared with ===, or logged.** scrypt with a per-user salt, and
 *   a timing-safe comparison, both from node's own crypto.
 * - **A role is checked, never assumed.** `can()` answers for an explicit action; there is no
 *   "logged in therefore allowed".
 *
 *   node demigod-die-accounts.mjs --add alice@example.com --role operator
 *   node demigod-die-accounts.mjs --list
 *   node demigod-die-accounts.mjs --disable alice@example.com
 *   node demigod-die-accounts.mjs --selftest
 *
 * Schema: demigod.die-accounts/1
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Kept out of the repo: it holds password hashes. */
export const ACCOUNTS_PATH = process.env.DEMIGOD_DIE_ACCOUNTS
  || path.join(process.env.HOME || ROOT, '.config', 'demigod', 'die-accounts.json');

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/**
 * What each role may do. Deliberately small and explicit.
 *
 * `viewer` can look. `operator` can also record the things a hiring desk records. `admin` can also
 * change who has access. Publishing, sending and spending are NOT here on purpose: those need
 * authorisation in the moment, from a human, and a role that granted them permanently would quietly
 * become the authorisation this codebase requires be given per request.
 */
export const ROLES = {
  viewer: ['read'],
  operator: ['read', 'write'],
  admin: ['read', 'write', 'admin'],
};

/** PURE. Normalised account identifier. */
export function normalizeEmail(value) {
  const raw = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(raw) ? raw : null;
}

/** PURE. May a role take an action? Unknown role or unknown action is always no. */
export function can(role, action) {
  const grants = ROLES[String(role || '')];
  return Array.isArray(grants) && grants.includes(String(action || ''));
}

/** Hash a password with a fresh salt. Returns the storable string, never the password. */
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('accounts: a password under 12 characters is not one');
  }
  const key = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT).toString('hex');
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${key}`;
}

/** PURE-ish. Timing-safe verify. Any malformed record fails closed rather than throwing. */
export function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, salt, key] = parts;
  let derived;
  try {
    derived = crypto.scryptSync(String(password), salt, SCRYPT.keylen, { N: Number(N), r: Number(r), p: Number(p) });
  } catch { return false; }
  const expected = Buffer.from(key, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export function loadAccounts(file = ACCOUNTS_PATH) {
  try {
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { schema: 'demigod.die-accounts/1', users: Array.isArray(doc.users) ? doc.users : [] };
  } catch {
    // No store is no access. Returning an empty set here is what makes that true downstream.
    return { schema: 'demigod.die-accounts/1', users: [] };
  }
}

export function saveAccounts(doc, file = ACCOUNTS_PATH) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(doc, null, 1)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/** PURE. The account for an email, or null. Disabled accounts are returned so callers can say why. */
export function findUser(doc, email) {
  const id = normalizeEmail(email);
  return id ? (doc.users || []).find((u) => normalizeEmail(u?.email) === id) || null : null;
}

/**
 * PURE. Authenticate. One rejection shape for every failure, so a caller cannot use the error to
 * learn whether an address exists.
 */
export function authenticate(doc, email, password) {
  const user = findUser(doc, email);
  if (!user) return { ok: false, reason: 'invalid' };
  if (user.disabledAt) return { ok: false, reason: 'invalid' };
  if (!verifyPassword(password, user.passwordHash)) return { ok: false, reason: 'invalid' };
  return { ok: true, user: { email: normalizeEmail(user.email), role: user.role } };
}

/** PURE. A signed session value: email, expiry, and a MAC over both. */
export function issueSession(user, secret, { now = Date.now(), ttlMs = SESSION_TTL_MS } = {}) {
  const email = normalizeEmail(user?.email);
  if (!email || !ROLES[user?.role]) throw new Error('accounts: refusing to issue a session for an unusable account');
  if (!secret) throw new Error('accounts: refusing to sign a session with no secret');
  const expiry = String(now + ttlMs);
  const body = `${Buffer.from(email).toString('base64url')}.${expiry}`;
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

/**
 * PURE. Verify a session against the CURRENT accounts, not against what was true when it was
 * issued. A session that still verifies for someone who has since been disabled or removed is the
 * whole reason revocation gets believed and does not work.
 */
export function verifySession(value, secret, doc, { now = Date.now() } = {}) {
  if (!secret) return { ok: false, reason: 'no_secret' };
  const parts = String(value || '').split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [emailB64, expiry, mac] = parts;
  if (!/^\d{11,15}$/.test(expiry)) return { ok: false, reason: 'malformed' };
  const expected = crypto.createHmac('sha256', secret).update(`${emailB64}.${expiry}`).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' };
  if (Number(expiry) <= now) return { ok: false, reason: 'expired' };
  let email;
  try { email = Buffer.from(emailB64, 'base64url').toString('utf8'); } catch { return { ok: false, reason: 'malformed' }; }
  const user = findUser(doc, email);
  if (!user) return { ok: false, reason: 'no_such_user' };
  if (user.disabledAt) return { ok: false, reason: 'disabled' };
  if (!ROLES[user.role]) return { ok: false, reason: 'unknown_role' };
  return { ok: true, email: normalizeEmail(user.email), role: user.role };
}

/**
 * PURE. Add or replace an account.
 *
 * `reinstate` exists because this function rebuilds the record, and two fields must survive that
 * rebuild or it quietly undoes security decisions someone made on purpose:
 *
 * - KEYS. Changing a role used to drop `keys` on the floor, so demoting a colleague also deleted
 *   every API key they held — with no record that it happened, and no error, because the keys were
 *   simply not copied onto the new object. Found by a test asserting demotion reaches the key: the
 *   key was not demoted, it was gone.
 * - DISABLEDAT. It reset to null, so upserting a disabled account silently re-enabled it. A role
 *   edit is not a reinstatement, and the fail-closed default is to stay disabled. Re-enabling is
 *   now something a caller has to ask for by name.
 */
export function upsertUser(doc, { email, password, role = 'viewer', reinstate = false, now = new Date().toISOString() }) {
  const id = normalizeEmail(email);
  if (!id) throw new Error(`accounts: ${JSON.stringify(email)} is not a usable address`);
  if (!ROLES[role]) throw new Error(`accounts: ${JSON.stringify(role)} is not a role (${Object.keys(ROLES).join(', ')})`);
  const users = (doc.users || []).filter((u) => normalizeEmail(u?.email) !== id);
  const previous = findUser(doc, id);
  users.push({
    email: id,
    role,
    passwordHash: password ? hashPassword(password) : previous?.passwordHash,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    disabledAt: reinstate ? null : (previous?.disabledAt ?? null),
    keys: previous?.keys || [],
  });
  if (!users[users.length - 1].passwordHash) throw new Error('accounts: a new account needs a password');
  return { ...doc, users };
}

/** PURE. Disable an account. Its live sessions stop verifying immediately, by construction. */
export function disableUser(doc, email, { now = new Date().toISOString() } = {}) {
  const id = normalizeEmail(email);
  return {
    ...doc,
    users: (doc.users || []).map((u) => (normalizeEmail(u?.email) === id ? { ...u, disabledAt: now } : u)),
  };
}

/* ------------------------------------------------------------------------ *
 * API keys — the same accounts, reached by a program instead of a browser.
 * ------------------------------------------------------------------------ */

export const KEY_PREFIX = 'dgk';

/** Role strength, so a key can be weaker than its owner but never stronger. */
const RANK = { viewer: 1, operator: 2, admin: 3 };

/**
 * PURE. The role a key actually has RIGHT NOW: the weaker of what it was granted and what its
 * owner currently holds.
 *
 * Demoting a person has to demote their programs too. Storing the key's role and trusting it would
 * leave an operator key writing on behalf of someone who has since been reduced to a viewer, which
 * is the same "verified against what was true at issue time" mistake that revocation usually dies
 * of. Both values are read at verification and the lower one wins.
 */
export function effectiveRole(keyRole, userRole) {
  const a = RANK[String(keyRole || '')];
  const b = RANK[String(userRole || '')];
  if (!a || !b) return null;
  return Object.keys(RANK).find((name) => RANK[name] === Math.min(a, b)) || null;
}

/**
 * Hash an API key secret.
 *
 * SHA-256 rather than the scrypt used for passwords, deliberately. scrypt is slow ON PURPOSE
 * because a human password carries maybe 30 bits and must be made expensive to guess. This secret
 * is 32 bytes from the CSPRNG — 256 bits — so there is no dictionary to run and no brute force to
 * slow down, and scrypt would only add ~100ms to every single API request in exchange for nothing.
 * The comparison is still timing-safe, because that cost is real and near-zero.
 */
function hashKeySecret(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest('hex');
}

/**
 * Issue a key for an account. Returns the updated doc and the secret, which is the only time the
 * secret exists — only its hash is stored, so a lost key is reissued rather than recovered.
 */
export function issueApiKey(doc, { email, label = '', role, now = new Date().toISOString() } = {}) {
  const user = findUser(doc, email);
  if (!user) throw new Error(`accounts: no account for ${JSON.stringify(email)}`);
  if (user.disabledAt) throw new Error('accounts: refusing to issue a key for a disabled account');
  const want = role || user.role;
  if (!ROLES[want]) throw new Error(`accounts: ${JSON.stringify(want)} is not a role`);
  if (RANK[want] > RANK[user.role]) {
    throw new Error(`accounts: refusing to issue a ${want} key for a ${user.role} account`);
  }
  const id = crypto.randomBytes(6).toString('hex');
  const secret = crypto.randomBytes(32).toString('base64url');
  const record = {
    id,
    label: String(label || '').slice(0, 80),
    role: want,
    hash: hashKeySecret(secret),
    createdAt: now,
    revokedAt: null,
    lastUsedAt: null,
  };
  const users = (doc.users || []).map((u) => (normalizeEmail(u?.email) === normalizeEmail(email)
    ? { ...u, keys: [...(u.keys || []), record] }
    : u));
  return { doc: { ...doc, users }, secret: `${KEY_PREFIX}_${id}_${secret}`, id };
}

/**
 * PURE. Verify a presented key against the CURRENT accounts.
 *
 * The key id travels in the token so the right record is found directly. Hashing the presented
 * secret against every stored key instead would be O(keys) work on each request and would leak,
 * through timing, roughly how many keys exist.
 */
export function verifyApiKey(value, doc, { now = Date.now() } = {}) {
  /* Matched, not split. The secret is base64url, whose alphabet includes '_' — so splitting on '_'
     tore the secret into pieces and every valid key read as malformed. The id is fixed-width hex,
     so anchoring it lets the secret keep the rest of the string, separators and all. */
  const parts = new RegExp(`^${KEY_PREFIX}_([0-9a-f]{12})_(.+)$`).exec(String(value || ''));
  if (!parts) return { ok: false, reason: 'malformed' };
  const [, id, secret] = parts;
  for (const user of doc.users || []) {
    const key = (user.keys || []).find((k) => k?.id === id);
    if (!key) continue;
    const a = Buffer.from(hashKeySecret(secret), 'hex');
    const b = Buffer.from(String(key.hash || ''), 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'invalid' };
    if (key.revokedAt) return { ok: false, reason: 'revoked' };
    if (user.disabledAt) return { ok: false, reason: 'disabled' };
    if (key.expiresAt && Date.parse(key.expiresAt) <= now) return { ok: false, reason: 'expired' };
    const role = effectiveRole(key.role, user.role);
    if (!role) return { ok: false, reason: 'unknown_role' };
    return { ok: true, email: normalizeEmail(user.email), role, keyId: id };
  }
  return { ok: false, reason: 'invalid' };
}

/** PURE. Revoke one key by id. Revoked, never deleted — a key that vanishes takes its history too. */
export function revokeApiKey(doc, id, { now = new Date().toISOString() } = {}) {
  return {
    ...doc,
    users: (doc.users || []).map((u) => ({
      ...u,
      keys: (u.keys || []).map((k) => (k?.id === id ? { ...k, revokedAt: k.revokedAt || now } : k)),
    })),
  };
}

/** PURE. Keys with no secret in them, for showing an operator what exists. */
export function listApiKeys(doc) {
  return (doc.users || []).flatMap((u) => (u.keys || []).map((k) => ({
    id: k.id,
    label: k.label,
    role: k.role,
    email: normalizeEmail(u.email),
    createdAt: k.createdAt,
    revokedAt: k.revokedAt || null,
    lastUsedAt: k.lastUsedAt || null,
    active: !k.revokedAt && !u.disabledAt,
  })));
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`die-accounts selftest: ${msg}`); };

  assert(normalizeEmail(' Alice@Example.COM ') === 'alice@example.com', 'addresses normalise');
  assert(normalizeEmail('nope') === null && normalizeEmail('') === null, 'junk is not an address');

  assert(can('viewer', 'read') && !can('viewer', 'write'), 'a viewer reads and nothing else');
  assert(can('operator', 'write') && !can('operator', 'admin'), 'an operator writes but does not grant access');
  assert(can('admin', 'admin'), 'an admin grants access');
  assert(!can('admin', 'publish') && !can('admin', 'send') && !can('admin', 'spend'),
    'publishing, sending and spending are never a standing grant — they are authorised per request');
  assert(!can('nonsense', 'read') && !can('viewer', ''), 'an unknown role or action is always no');

  const hash = hashPassword('correct horse battery staple');
  assert(hash.startsWith('scrypt$') && !hash.includes('correct horse'), 'the password itself is never stored');
  assert(verifyPassword('correct horse battery staple', hash), 'the right password verifies');
  assert(!verifyPassword('wrong horse battery staple', hash), 'the wrong one does not');
  assert(!verifyPassword('x', 'garbage') && !verifyPassword('x', ''), 'a malformed record fails closed rather than throwing');
  assert(hashPassword('a'.repeat(12)) !== hashPassword('a'.repeat(12)), 'two hashes of one password differ — the salt is real');
  let threw = false;
  try { hashPassword('short'); } catch { threw = true; }
  assert(threw, 'a password under twelve characters is refused');

  // No store is no access.
  const empty = { users: [] };
  assert(authenticate(empty, 'alice@example.com', 'anything').ok === false,
    'an empty account store grants nothing — "no users configured" must never mean "no restrictions"');

  let doc = upsertUser({ users: [] }, { email: 'Alice@Example.com', password: 'correct horse battery staple', role: 'operator' });
  assert(doc.users.length === 1 && doc.users[0].email === 'alice@example.com', 'the account is stored normalised');
  assert(authenticate(doc, 'alice@example.com', 'correct horse battery staple').ok, 'the right password authenticates');
  assert(!authenticate(doc, 'alice@example.com', 'nope').ok, 'the wrong one does not');
  assert(authenticate(doc, 'nobody@example.com', 'x').reason === authenticate(doc, 'alice@example.com', 'x').reason,
    'a wrong password and a missing account are indistinguishable to the caller');

  const secret = 'test-secret';
  const token = issueSession({ email: 'alice@example.com', role: 'operator' }, secret);
  const good = verifySession(token, secret, doc);
  assert(good.ok && good.email === 'alice@example.com' && good.role === 'operator', 'a fresh session verifies with its role');
  assert(!verifySession(token, 'other-secret', doc).ok, 'a session signed elsewhere is refused');
  assert(verifySession(token, secret, doc, { now: Date.now() + SESSION_TTL_MS + 1000 }).reason === 'expired', 'sessions expire');
  assert(verifySession('a.b', secret, doc).reason === 'malformed', 'a malformed cookie is refused');
  assert(verifySession(token, '', doc).reason === 'no_secret', 'no signing secret means no session, not an open door');

  // The check people forget.
  const disabled = disableUser(doc, 'alice@example.com');
  assert(verifySession(token, secret, disabled).reason === 'disabled',
    'disabling a person must kill the sessions they already hold, or the revocation is imaginary');
  assert(!authenticate(disabled, 'alice@example.com', 'correct horse battery staple').ok, 'and they cannot log back in');
  assert(verifySession(token, secret, { users: [] }).reason === 'no_such_user', 'removing the account also ends the session');

  // A role changed after issue takes effect on the next request, because role is read from the store.
  const demoted = upsertUser(doc, { email: 'alice@example.com', role: 'viewer' });
  assert(verifySession(token, secret, demoted).role === 'viewer',
    'the role comes from the store now, not from what was true when the cookie was signed');

  let bad = false;
  try { issueSession({ email: 'alice@example.com', role: 'wizard' }, secret); } catch { bad = true; }
  assert(bad, 'no session is issued for a role that does not exist');
  bad = false;
  try { upsertUser({ users: [] }, { email: 'b@example.com', role: 'viewer' }); } catch { bad = true; }
  assert(bad, 'a new account without a password is refused');

  // --- API keys ---
  assert(effectiveRole('admin', 'viewer') === 'viewer' && effectiveRole('viewer', 'admin') === 'viewer',
    'the weaker of key and owner wins, whichever side it is on');
  assert(effectiveRole('operator', 'operator') === 'operator', 'equal roles pass through');
  assert(effectiveRole('wizard', 'admin') === null, 'an unknown role on either side is not a role');

  const issued = issueApiKey(doc, { email: 'alice@example.com', label: 'ci' });
  const rawKey = issued.secret;
  assert(rawKey.startsWith('dgk_'), 'a key is recognisable as one');
  assert(!JSON.stringify(issued.doc).includes(rawKey.split('_')[2]),
    'the secret itself is never stored — only its hash');

  const okKey = verifyApiKey(rawKey, issued.doc);
  assert(okKey.ok && okKey.email === 'alice@example.com' && okKey.role === 'operator', 'a fresh key verifies with its role');
  assert(verifyApiKey('dgk_zzzzzzzzzzzz_secret', issued.doc).reason === 'malformed'
    || verifyApiKey('dgk_zzzzzzzzzzzz_secret', issued.doc).reason === 'invalid', 'an unknown id does not verify');
  assert(verifyApiKey('nonsense', issued.doc).reason === 'malformed', 'junk is refused');
  assert(verifyApiKey(`dgk_${issued.id}_wrongsecret`, issued.doc).reason === 'invalid',
    'the right id with the wrong secret is refused');

  // the same three revocation checks the sessions get, because a key is a credential too
  assert(verifyApiKey(rawKey, revokeApiKey(issued.doc, issued.id)).reason === 'revoked',
    'a revoked key stops working');
  assert(verifyApiKey(rawKey, disableUser(issued.doc, 'alice@example.com')).reason === 'disabled',
    'disabling a person must kill the keys their programs hold, not just their browser session');
  assert(verifyApiKey(rawKey, { users: [] }).reason === 'invalid', 'removing the account ends the key');

  // demotion reaches the key, which is the whole point of computing the role at verify time
  const demotedDoc = upsertUser(issued.doc, { email: 'alice@example.com', role: 'viewer' });
  assert(verifyApiKey(rawKey, demotedDoc).role === 'viewer',
    'demoting the owner demotes the key on its next request, not at its next reissue');

  let refused = false;
  try { issueApiKey(demotedDoc, { email: 'alice@example.com', role: 'admin' }); } catch { refused = true; }
  assert(refused, 'a key cannot be issued stronger than the account it belongs to');
  refused = false;
  try { issueApiKey(disableUser(issued.doc, 'alice@example.com'), { email: 'alice@example.com' }); } catch { refused = true; }
  assert(refused, 'a disabled account issues nothing');

  const listed = listApiKeys(issued.doc);
  assert(listed.length === 1 && listed[0].active && !JSON.stringify(listed).includes('hash'),
    'listing keys shows what exists without showing anything that could be used');

  console.log(JSON.stringify({ ok: true, selftest: 'die-accounts' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  if (args.includes('--selftest')) selftest();
  else if (args.includes('--list')) {
    const doc = loadAccounts();
    console.log(`accounts: ${doc.users.length} (${ACCOUNTS_PATH})`);
    for (const u of doc.users) console.log(`  ${u.email.padEnd(34)} ${String(u.role).padEnd(9)} ${u.disabledAt ? 'DISABLED' : 'active'}`);
  } else if (arg('--add')) {
    const password = process.env.DEMIGOD_DIE_PASSWORD;
    if (!password) { console.error('set DEMIGOD_DIE_PASSWORD (12+ chars) rather than passing it on the command line, where it lands in shell history'); process.exit(2); }
    saveAccounts(upsertUser(loadAccounts(), { email: arg('--add'), password, role: arg('--role') || 'viewer' }));
    console.log(JSON.stringify({ ok: true, added: normalizeEmail(arg('--add')), role: arg('--role') || 'viewer' }));
  } else if (arg('--disable')) {
    saveAccounts(disableUser(loadAccounts(), arg('--disable')));
    console.log(JSON.stringify({ ok: true, disabled: normalizeEmail(arg('--disable')) }));
  } else if (arg('--key-new')) {
    const { doc, secret, id } = issueApiKey(loadAccounts(), {
      email: arg('--key-new'), label: arg('--label') || '', role: arg('--role') || undefined,
    });
    saveAccounts(doc);
    /* Printed once, on purpose. Only the hash is stored, so this is the single moment the secret
       exists anywhere — a key that can be re-read later is a key an attacker can re-read too. */
    console.log(JSON.stringify({ ok: true, id, key: secret, shown: 'once — store it now, it cannot be recovered' }, null, 1));
  } else if (args.includes('--key-list')) {
    const keys = listApiKeys(loadAccounts());
    console.log(`api keys: ${keys.length} (${ACCOUNTS_PATH})`);
    for (const k of keys) {
      console.log(`  ${k.id}  ${String(k.email).padEnd(28)} ${String(k.role).padEnd(9)} ${k.active ? 'active  ' : 'INACTIVE'} ${k.label || ''}`);
    }
  } else if (arg('--key-revoke')) {
    saveAccounts(revokeApiKey(loadAccounts(), arg('--key-revoke')));
    console.log(JSON.stringify({ ok: true, revoked: arg('--key-revoke') }));
  } else {
    console.log([
      'usage:',
      '  --add <email> --role viewer|operator|admin   (password from DEMIGOD_DIE_PASSWORD)',
      '  --list | --disable <email>',
      '  --key-new <email> [--role r] [--label text]  issue an API key, printed once',
      '  --key-list | --key-revoke <id>',
      '  --selftest',
    ].join('\n'));
  }
}
