import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createSessionToken, signPayload } from './dasha-lobby-x.mjs';
import { assertPublicSafe } from './dasha-simp-score.mjs';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  ATA_ACCOUNT_BYTES,
  ATA_RENT_LAMPORTS,
  DEFAULT_AMOUNT_RAW,
  DEFAULT_RENT_ATA_COUNT,
  DECIMALS,
  DashaFaucet,
  FEE_LAMPORTS,
  JUPITER,
  MINT,
  SYSTEM_PROGRAM,
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
  WSOL,
  amountUi,
  associatedTokenAddress,
  base58Encode,
  bytesOnCurve,
  claimCooldown,
  classifyDest,
  classifyDestLive,
  encodeCreateAtaIdempotent,
  encodeTransferChecked,
  faucetAmountRaw,
  faucetConfigured,
  faucetDestOk,
  faucetPublicStatus,
  faucetRentCapLamports,
  faucetSolFloorLamports,
  faucetTokenCapRaw,
  faucetPaused,
  DEFAULT_TOKEN_CAP_COUNT,
  faucetSiwsFields,
  faucetWalletMessage,
  hashIp,
  isOnCurveAddress,
  last4,
  destShapeError,
  notConfigured,
  parseFaucetKeypair,
  parseRentExemption,
  parseSiwsMessage,
  preflightFaucet,
  sendFaucetTransfer,
  siwsDomainOk,
  siwsMessageDomain,
  siwsSignedMessageOk,
  solscanUrl,
  utcDay,
} from './dasha-faucet.mjs';
import { isValidSolanaAddress } from './dasha-simp-actions.mjs';

const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const root = new URL('./', import.meta.url);
const workerSrc = await readFile(new URL('./dasha-lobby-worker.mjs', root), 'utf8');
const faucetSrc = await readFile(new URL('./dasha-faucet.mjs', root), 'utf8');
const clientSrc = await readFile(new URL('./dasha-faucet-client.js', root), 'utf8');
const sitemap = await readFile(new URL('./dasha-sitemap.xml', root), 'utf8');

assert.equal(MINT, mint);
assert.equal(WSOL, 'So11111111111111111111111111111111111111112');
assert.equal(JUPITER, 'https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump');
assert.doesNotMatch(JUPITER, /sell=So11111111111111111111111111111111111112&/);
assert.equal(DEFAULT_AMOUNT_RAW, 100000000);
assert.equal(DECIMALS, 6);
assert.equal(amountUi(DEFAULT_AMOUNT_RAW), 100);
assert.equal(faucetAmountRaw({}), 100000000);
assert.equal(faucetAmountRaw({ FAUCET_AMOUNT_RAW: '200000000' }), 200000000);
assert.equal(faucetConfigured({}), false);
assert.deepEqual(notConfigured(), { configured: false, error: 'not_configured' });
assert.deepEqual(faucetPublicStatus({}).body, { configured: false, error: 'not_configured' });
assert.equal(faucetPublicStatus({}).status, 501);
assert.equal(solscanUrl('sig1'), 'https://solscan.io/tx/sig1');
assert.equal(ATA_RENT_LAMPORTS, 2039280);
assert.equal(ATA_ACCOUNT_BYTES, 165);
assert.equal(DEFAULT_RENT_ATA_COUNT, 20);
assert.equal(FEE_LAMPORTS, 5000);
assert.equal(faucetRentCapLamports({}, ATA_RENT_LAMPORTS), 20 * ATA_RENT_LAMPORTS);
assert.equal(faucetRentCapLamports({ FAUCET_RENT_CAP_LAMPORTS: '2039280' }, ATA_RENT_LAMPORTS), 2039280);
assert.equal(faucetSolFloorLamports({}, ATA_RENT_LAMPORTS), ATA_RENT_LAMPORTS + FEE_LAMPORTS);
assert.equal(DEFAULT_TOKEN_CAP_COUNT, 20);
assert.equal(faucetTokenCapRaw({}), 20 * DEFAULT_AMOUNT_RAW);
assert.equal(faucetTokenCapRaw({ FAUCET_TOKEN_CAP_RAW: String(DEFAULT_AMOUNT_RAW) }), DEFAULT_AMOUNT_RAW);
assert.equal(faucetPaused({}), false);
assert.equal(faucetPaused({ FAUCET_PAUSED: '1' }), true);
assert.equal(faucetPaused({ FAUCET_PAUSED: 'true' }), true);
assert.equal(utcDay(Date.parse('2026-08-15T23:00:00Z')), '2026-08-15');
assert.equal(parseRentExemption(2039280), 2039280);
assert.equal(parseRentExemption(null), null);

assert.match(sitemap, /<loc>https:\/\/www\.getdasha\.com\/faucet<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/www\.getdasha\.com\/airdrop<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/www\.getdasha\.com\/earn<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/www\.getdasha\.com\/claim<\/loc>/);
assert.doesNotMatch(sitemap, /\/claim-rewards<\/loc>/);

const WEAK = /not an airdrop|not earn|not official|not advice|she is not the dev|association is not endorsement|neither is required|we will not ask for a phrase|nobody from \$dasha will ask for a phrase|agents do not claim this faucet|tiny sample for newbies|MATCH, not verified/i;

assert.match(clientSrc, /global\.DashaFaucet/);
assert.match(clientSrc, /faucet paused/);
assert.match(clientSrc, /solana:signIn|signIn/);
assert.match(clientSrc, /dasha-x-linked/);
assert.match(clientSrc, /signedMessage/);
assert.match(clientSrc, /dasha-faucet-static/);
assert.match(clientSrc, /destShapeError/);
assert.match(clientSrc, /last-4 does not match/);
assert.match(clientSrc, /dest_not_wallet/);
assert.match(clientSrc, /dest_token/);
assert.match(clientSrc, /faucet-back/);
assert.match(clientSrc, /holdCard/);
assert.match(clientSrc, /aria-label/);
assert.match(clientSrc, /faucet-hero/);
assert.match(clientSrc, /client\/faucet\.png/);
assert.match(clientSrc, /state\.card = 5/);
assert.match(clientSrc, /\/faucet\/dest-check/);
assert.doesNotMatch(clientSrc, /JSON\.stringify\(res\.data\)/);
assert.doesNotMatch(clientSrc, /live\.textContent = raw/);
assert.doesNotMatch(clientSrc, WEAK);
assert.doesNotMatch(faucetSrc, WEAK);
assert.doesNotMatch(clientSrc, /\bContinue\b/);
assert.doesNotMatch(clientSrc, /\bXP\b|hearts|refer a friend|referral code/i);
assert.match(clientSrc, /body: '\{\}'/);
assert.doesNotMatch(clientSrc, /body: JSON\.stringify\(\{[^}]*\b(mint|amountRaw|amount)\b/);
assert.match(clientSrc, /credentials:\s*'include'/);
assert.match(clientSrc, /\/oauth\/x\/start/);
assert.match(clientSrc, /\/faucet\/wallet\/challenge/);
assert.match(clientSrc, /\/faucet\/claim/);
assert.doesNotMatch(clientSrc, /sell=So11111111111111111111111111111111111112&/);
assert.doesNotMatch(faucetSrc, /sell=So11111111111111111111111111111111111112&/);
assert.doesNotMatch(clientSrc, /\bInter\b|Geist|fonts\.googleapis|system-ui/);
assert.doesNotMatch(clientSrc, /confetti|three\.js|lenis|barba|free money|guaranteed|this is official|airdrop campaign/i);
assert.ok(clientSrc.includes(mint));
assert.doesNotMatch(clientSrc, /\/simp\/wallet\/verify/);
assert.doesNotMatch(clientSrc, /hasPositiveTokenBalance/);

assert.match(faucetSrc, /kind: 'faucet_dest'/);
assert.match(faucetSrc, /idFromName/);
assert.match(faucetSrc, /classifyDest/);
assert.match(faucetSrc, /getMinimumBalanceForRentExemption/);
assert.match(faucetSrc, /rent-reserve/);
assert.match(faucetSrc, /token-reserve/);
assert.match(faucetSrc, /FAUCET_PAUSED/);
assert.match(faucetSrc, /FAUCET_TOKEN_CAP_RAW/);
assert.doesNotMatch(faucetSrc, /hasPositiveTokenBalance/);
assert.doesNotMatch(faucetSrc, /joinBoard/);
assert.doesNotMatch(faucetSrc, /HELIUS_|payTo/);
assert.doesNotMatch(faucetSrc + clientSrc + workerSrc, /DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb/);
assert.match(workerSrc, /X-Dasha-Edge': 'faucet'/);
assert.match(workerSrc, /siteFooter\('\/faucet'\)/);
assert.match(workerSrc, /slimFooterHtml|hamburgerHtml/);
assert.match(workerSrc, /magnetRoute/);
assert.doesNotMatch(workerSrc, /isExactPath\(url\.pathname, '\/claim-rewards'\)/);
assert.doesNotMatch(faucetSrc + clientSrc + workerSrc, /claim your allocation|earn \$dasha|free money/i);

const ix = encodeTransferChecked({
  source: '11111111111111111111111111111112',
  mint,
  dest: '11111111111111111111111111111113',
  owner: '11111111111111111111111111111114',
  amountRaw: DEFAULT_AMOUNT_RAW,
});
assert.equal(ix.accounts[1].pubkey, mint);
assert.equal(ix.data[0], 12);
assert.equal(ix.data[9], 6);
const createIx = encodeCreateAtaIdempotent({
  payer: '11111111111111111111111111111112',
  ata: '11111111111111111111111111111113',
  owner: '11111111111111111111111111111114',
  mint,
});
assert.equal(createIx.accounts[3].pubkey, mint);
assert.equal(createIx.program, ASSOCIATED_TOKEN_PROGRAM);
assert.equal(createIx.data[0], 1);
assert.equal(TOKEN_PROGRAM, 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

assert.equal(faucetDestOk('11111111111111111111111111111111'), false);
assert.equal(faucetDestOk('not-a-wallet'), false);
assert.equal(faucetDestOk(mint), false);

async function genWallet() {
  const keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey));
  const seed = pkcs8.slice(-32);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
  assert.equal(bytesOnCurve(pub), true);
  return {
    keys,
    seed,
    pub,
    address: base58Encode(pub),
    json: JSON.stringify([...seed, ...pub]),
  };
}

const treasury = await genWallet();
const destWallet = await genWallet();
assert.equal(isValidSolanaAddress(destWallet.address), true);
assert.equal(faucetDestOk(destWallet.address), true);
assert.equal(last4(destWallet.address), destWallet.address.slice(-4));
const parsed = parseFaucetKeypair(treasury.json);
assert.equal(parsed.address, treasury.address);
assert.equal(faucetConfigured({ FAUCET_KEYPAIR: treasury.json }), true);
const statusOk = faucetPublicStatus({ FAUCET_KEYPAIR: treasury.json });
assert.equal(statusOk.status, 200);
assert.equal(statusOk.body.amountRaw, 100000000);
assert.equal(statusOk.body.mint, mint);

const destAta = await associatedTokenAddress(destWallet.address);
assert.equal(isOnCurveAddress(destAta.address), false);
assert.equal(faucetDestOk(destAta.address), false);
assert.equal(classifyDest({ address: destWallet.address, account: null, onCurve: true }).kind, 'IS_WALLET');
assert.equal(classifyDest({ address: destWallet.address, account: { owner: SYSTEM_PROGRAM }, onCurve: true }).kind, 'IS_WALLET');
assert.equal(classifyDest({ address: destWallet.address, account: { owner: SYSTEM_PROGRAM, space: 0 }, onCurve: true }).kind, 'IS_WALLET');
assert.equal(classifyDest({ address: destWallet.address, account: { owner: SYSTEM_PROGRAM, space: 80 }, onCurve: true }).error, 'dest_not_wallet');
assert.equal(classifyDest({ address: destWallet.address, account: { owner: SYSTEM_PROGRAM, executable: true }, onCurve: true }).error, 'dest_not_wallet');
assert.equal(classifyDest({ address: destAta.address, account: { owner: SYSTEM_PROGRAM, space: 0 }, onCurve: false }).error, 'dest_pda');
assert.equal(classifyDest({ address: destAta.address, account: null, onCurve: false }).error, 'dest_pda');
assert.equal(classifyDest({ address: mint, account: null, onCurve: true }).error, 'dest_mint');
assert.equal(classifyDest({ address: destWallet.address, account: { owner: TOKEN_PROGRAM, space: 82 }, onCurve: true }).error, 'dest_mint');
assert.equal(classifyDest({ address: destWallet.address, account: { owner: TOKEN_PROGRAM, space: 165 }, onCurve: true }).error, 'dest_token');
assert.equal(classifyDest({ address: destWallet.address, account: { owner: TOKEN_2022_PROGRAM, space: 165 }, onCurve: true }).error, 'dest_token');
assert.equal(classifyDest({ address: destWallet.address, account: { owner: ASSOCIATED_TOKEN_PROGRAM }, onCurve: true }).error, 'dest_not_wallet');
assert.equal(destShapeError('https://t.me/dashacommunity', ''), 'dest_not_wallet');
assert.equal(destShapeError('53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'.slice(0, 20), ''), 'dest_not_wallet');
assert.equal(destShapeError(mint, ''), 'dest_mint');
assert.equal(destShapeError(destWallet.address, 'xxxx'), 'last-4 does not match');
assert.equal(destShapeError(destWallet.address, last4(destWallet.address)), null);

const now = Date.parse('2026-08-15T00:00:00Z');
assert.equal(claimCooldown(null, now), null);
const cool = claimCooldown({ dest: destWallet.address, signature: 'realSig', amountRaw: DEFAULT_AMOUNT_RAW, ts: now }, now + 1000);
assert.equal(cool.signature, 'realSig');
assert.ok(cool.nextAt > now);
const stuck = claimCooldown({ dest: destWallet.address, signature: 'heldSig', pending: true, ts: now - (16 * 60_000) }, now);
assert.equal(stuck.pending, true);
assert.equal(stuck.signature, 'heldSig');
assert.equal(claimCooldown({ dest: destWallet.address, pending: true, ts: now - (16 * 60_000) }, now), null);

function memoryFaucet(env) {
  const shards = new Map();
  return {
    idFromName(name) { return { name: String(name) }; },
    get(id) {
      const name = id.name;
      if (!shards.has(name)) {
        const rows = new Map();
        shards.set(name, new DashaFaucet({
          storage: {
            get: async (key) => rows.get(key),
            put: async (key, value) => rows.set(key, value),
            delete: async (key) => rows.delete(key),
          },
        }, env));
      }
      return shards.get(name);
    },
    names() { return [...shards.keys()]; },
  };
}

globalThis.WebSocketRequestResponsePair ||= class WebSocketRequestResponsePair {};
const workerModule = await import('./dasha-lobby-worker.mjs');
const { FAUCET_CLIENT_JS, FAUCET_CLIENT_SRI, FAUCET_STILL_SRI } = await import('./dasha-lobby-static-gen.mjs');
const faucetSri = `sha384-${createHash('sha384').update(FAUCET_CLIENT_JS).digest('base64')}`;
assert.equal(FAUCET_CLIENT_SRI, faucetSri, 'FAUCET_CLIENT_SRI must hash served client/faucet.js');
assert.match(FAUCET_STILL_SRI, /^sha384-/);

const { magnetPageHtml } = await import('./dasha-magnet-pages.mjs');
const pageHtml = workerModule.faucetPageHtml();
assert.match(pageHtml, /<link rel="canonical" href="https:\/\/www\.getdasha\.com\/faucet">/);
assert.match(pageHtml, /id="dasha-faucet"/);
assert.match(pageHtml, /<noscript>[\s\S]*client\/faucet\.png[\s\S]*<\/noscript>/);
assert.doesNotMatch(pageHtml.replace(/<noscript>[\s\S]*?<\/noscript>/, ''), /<h1>Faucet<\/h1>/);
assert.match(pageHtml, /class="dasha-slim[\s"]/);
assert.match(pageHtml, /href="\/verse">Verse</);
assert.match(pageHtml, /footer\.dasha-foot a,\.dasha-foot a\{display:inline-flex;align-items:center;min-height:48px/);
assert.match(pageHtml, /data-faucet-still/);
assert.match(pageHtml, /data-faucet-still-sri/);
assert.ok(pageHtml.includes(FAUCET_STILL_SRI));
assert.match(pageHtml, /client\/faucet\.png/);
assert.match(pageHtml, /Arial Black|"Arial Black"/);
assert.match(pageHtml, /client\/faucet\.js/);
assert.match(pageHtml, /href="https:\/\/x\.com\/dash_eats"/);
assert.doesNotMatch(pageHtml, WEAK);
assert.doesNotMatch(pageHtml, /\bInter\b|Geist|fonts\.googleapis|system-ui/);
assert.doesNotMatch(pageHtml, /free money|guaranteed|official faucet/i);
for (const kind of ['airdrop', 'earn', 'claim']) {
  const room = magnetPageHtml(kind);
  assert.match(room, /<h1>(AIRDROP|EARN|CLAIM)<\/h1>/);
  assert.match(room, /class="dasha-slim[\s"]/);
  assert.match(room, /class="dasha-crop"/);
  assert.match(room, /href="\/faucet"/);
  assert.doesNotMatch(room, WEAK);
  assert.doesNotMatch(room, /there isn't one|does not pay you to click|the only send/i);
}

for (const host of ['www.getdasha.com', 'lobby.getdasha.com']) {
  for (const method of ['GET', 'HEAD']) {
    const res = await workerModule.default.fetch(new Request(`https://${host}/faucet`, { method }), {});
    assert.equal(res.status, 200, `${host} /faucet ${method}`);
    assert.equal(res.headers.get('x-dasha-edge'), 'faucet');
    const html = await res.text();
    if (method === 'HEAD') assert.equal(html, '');
    else {
      assert.match(html, /client\/faucet\.png/, `${host} /faucet still`);
      assert.doesNotMatch(html, WEAK);
      assert.doesNotMatch(html, /\bInter\b|Geist|fonts\.googleapis|system-ui/);
    }
  }
  const hold = await workerModule.default.fetch(new Request(`https://${host}/simp/hold`), {});
  assert.equal(hold.status, 501);
  assert.deepEqual(await hold.json(), { configured: false, error: 'not_configured' });
  for (const banned of ['/claim-rewards', '/drop', '/free']) {
    const miss = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${banned}`), {});
    assert.notEqual(miss.headers.get('x-dasha-edge'), 'faucet', banned);
    assert.ok(miss.status === 404 || miss.status === 308, `${banned} must not be a faucet route`);
  }
  for (const [path, edge] of [['/airdrop', 'airdrop'], ['/earn', 'earn'], ['/claim', 'claim']]) {
    const room = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
    assert.equal(room.status, 200, `${host} ${path}`);
    assert.equal(room.headers.get('x-dasha-edge'), edge);
    const html = await room.text();
    assert.match(html, /<h1>(AIRDROP|EARN|CLAIM)<\/h1>/);
    assert.match(html, /href="\/faucet"/);
    assert.doesNotMatch(html, WEAK);
    assert.doesNotMatch(html, /claim your allocation|earn \$dasha|\$[0-9]|fake txid|txid/i);
    assert.doesNotMatch(html, /<form[\s\S]*method=["']post["']/i);
    assert.doesNotMatch(html, /\bInter\b|Geist|fonts\.googleapis|system-ui/);
  }
  const aliasAir = await workerModule.default.fetch(new Request(`https://${host}/airdrops`), {});
  assert.ok(aliasAir.status === 200 || aliasAir.status === 308, `${host} /airdrops`);
  if (aliasAir.status === 308) {
    const hop = await workerModule.default.fetch(new Request(aliasAir.headers.get('location')), {});
    assert.equal(hop.status, 200);
  }
  const aliasEarn = await workerModule.default.fetch(new Request(`https://${host}/rewards`), {});
  assert.ok(aliasEarn.status === 200 || aliasEarn.status === 308, `${host} /rewards`);
}

const js = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/client/faucet.js'), {});
assert.equal(js.status, 200);
assert.match(js.headers.get('content-type') || '', /javascript/);
const jsBody = await js.text();
assert.ok(jsBody.includes(mint));
assert.doesNotMatch(jsBody, /\bInter\b|Geist|fonts\.googleapis|system-ui/);
const still = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/client/faucet.png'), {
  ASSETS: { fetch: async (req) => {
    assert.match(String(req.url), /\/simp\/photo\/faucet\.png/);
    return new Response('png', { status: 200, headers: { 'Content-Type': 'image/png' } });
  } },
});
assert.equal(still.status, 200);
assert.match(still.headers.get('content-type') || '', /png/);

const env = {
  LOBBY_SESSION_SECRET: 'faucet-test-secret',
  ALLOWED_ORIGINS: 'https://www.getdasha.com,https://getdasha.com,https://lobby.getdasha.com',
  FAUCET: memoryFaucet({}),
};
env.FAUCET = memoryFaucet(env);

const noKeyStatus = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/status'), env);
assert.equal(noKeyStatus.status, 501);
assert.deepEqual(await noKeyStatus.json(), { configured: false, error: 'not_configured' });

const sessionToken = await createSessionToken(env, { xId: 'fx1', handle: 'newbie' });
const claimNoKey = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
    'CF-Connecting-IP': '203.0.113.9',
  },
  body: '{}',
}), env);
assert.equal(claimNoKey.status, 501);
assert.deepEqual(await claimNoKey.json(), { configured: false, error: 'not_configured' });

env.FAUCET_KEYPAIR = treasury.json;
const funded = {
  ...env,
  FAUCET: memoryFaucet(env),
  FAUCET_KEYPAIR: treasury.json,
};

const okStatus = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/status'), funded);
assert.equal(okStatus.status, 200);
const okStatusBody = await okStatus.json();
assert.equal(okStatusBody.configured, true);
assert.equal(okStatusBody.amountRaw, 100000000);
assert.equal(okStatusBody.mint, mint);
assert.equal(assertPublicSafe(okStatusBody).ok, true);

const noX = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
  method: 'POST',
  headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
  body: '{}',
}), funded);
assert.equal(noX.status, 401);

const nativeFetch = globalThis.fetch;
function classifyFetch(destWalletAccount = null) {
  return async (input, init) => {
    const body = typeof init?.body === 'string' ? init.body : '';
    const parsed = body.startsWith('[') ? JSON.parse(body || '[]') : [JSON.parse(body || '{"method":""}')];
    const out = parsed.map((row) => {
      if (row.method === 'getAccountInfo') {
        const addr = row.params?.[0];
        if (addr === destAta.address) return { jsonrpc: '2.0', id: row.id, result: { value: null } };
        if (addr === mint) return { jsonrpc: '2.0', id: row.id, result: { value: { owner: TOKEN_PROGRAM, space: 82 } } };
        return { jsonrpc: '2.0', id: row.id, result: { value: destWalletAccount } };
      }
      return { jsonrpc: '2.0', id: row.id, error: { message: 'unexpected' } };
    });
    return new Response(JSON.stringify(body.startsWith('[') ? out : out[0]), { headers: { 'Content-Type': 'application/json' } });
  };
}
globalThis.fetch = classifyFetch();

const offCurve = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destAta.address, last4: last4(destAta.address), paste: true }),
}), funded);
assert.equal(offCurve.status, 400);
assert.equal((await offCurve.json()).error, 'dest_pda');

const last4Miss = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: 'xxxx', paste: true }),
}), funded);
assert.equal(last4Miss.status, 400);
assert.equal((await last4Miss.json()).error, 'last-4 does not match');

const telegramPaste = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: 'https://t.me/dashacommunity', last4: 'nity', paste: true }),
}), funded);
assert.equal(telegramPaste.status, 400);
assert.equal((await telegramPaste.json()).error, 'dest_not_wallet');

const destCheckLast4 = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/dest-check', {
  method: 'POST',
  headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json' },
  body: JSON.stringify({ dest: destWallet.address, last4: 'xxxx' }),
}), funded);
assert.equal(destCheckLast4.status, 400);
assert.equal((await destCheckLast4.json()).error, 'last-4 does not match');

const pasteOk = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), funded);
assert.equal(pasteOk.status, 200);
const pasteBody = await pasteOk.json();
assert.equal(pasteBody.dest, destWallet.address);
assert.equal(pasteBody.kind, 'IS_WALLET');
assert.equal(JSON.stringify(pasteBody).includes('fx1'), false);
assert.equal(assertPublicSafe(pasteBody).ok, true);

globalThis.fetch = classifyFetch({ owner: TOKEN_PROGRAM, space: 165 });
const tokenVerify = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), funded);
assert.equal(tokenVerify.status, 400);
assert.equal((await tokenVerify.json()).error, 'dest_token');
const destCheck = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/dest-check', {
  method: 'POST',
  headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json' },
  body: JSON.stringify({ dest: destWallet.address }),
}), funded);
assert.equal(destCheck.status, 400);
assert.equal((await destCheck.json()).error, 'dest_token');
globalThis.fetch = classifyFetch();
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), funded);

const challenge = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/challenge', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ publicKey: destWallet.address }),
}), funded);
assert.equal(challenge.status, 200);
const challengeBody = await challenge.json();
assert.match(challengeBody.message, /^www\.getdasha\.com wants you to sign in/);
assert.match(challengeBody.message, /Request ID: faucet_dest/);
assert.match(challengeBody.message, /Dest-proof for the \/faucet sample/);
assert.doesNotMatch(challengeBody.message, /we will not ask for a phrase|not an airdrop|claim-airdrop|not earn|not the dev|association is not endorsement|neither is required|not official|not advice/i);
assert.doesNotMatch(challengeBody.message, /holder badge/);
assert.equal(challengeBody.siws.domain, 'www.getdasha.com');
assert.equal(challengeBody.siws.requestId, 'faucet_dest');
assert.equal(JSON.stringify(challengeBody).includes('fx1'), false);
assert.equal(assertPublicSafe(challengeBody).ok, true);
const challengePayload = JSON.parse(Buffer.from(String(challengeBody.challenge).split('.')[0], 'base64url').toString());
assert.equal(challengePayload.xId, undefined);
assert.equal(assertPublicSafe(challengePayload).ok, true);

const lobbyChallenge = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/challenge', {
  method: 'POST',
  headers: {
    Origin: 'https://lobby.getdasha.com',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ publicKey: destWallet.address }),
}), funded);
assert.equal(lobbyChallenge.status, 200);
const lobbyChallengeBody = await lobbyChallenge.json();
assert.match(lobbyChallengeBody.message, /^lobby\.getdasha\.com wants you to sign in/);
assert.equal(lobbyChallengeBody.siws.domain, 'lobby.getdasha.com');

const evilChallenge = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/challenge', {
  method: 'POST',
  headers: {
    Origin: 'https://evil.example',
    Cookie: `__Host-dasha_x=${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ publicKey: destWallet.address }),
}), { ...funded, ALLOW_ANY_ORIGIN: '1' });
assert.equal(evilChallenge.status, 400);
assert.equal((await evilChallenge.json()).error, 'siws_domain');

const omitted = faucetWalletMessage({
  handle: 'newbie',
  publicKey: destWallet.address,
  nonce: 'aabbcc',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 1000,
});
assert.equal(omitted, null);
assert.equal(faucetWalletMessage({
  handle: 'newbie',
  publicKey: destWallet.address,
  nonce: 'aabbcc',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 1000,
  domain: 'evil.com',
}), null);
assert.equal(siwsDomainOk(''), false);
assert.equal(siwsDomainOk(null), false);
assert.equal(siwsDomainOk('evil.com'), false);
assert.equal(siwsSignedMessageOk({
  message: `www.getdasha.com wants you to sign in with your Solana account:\n${destWallet.address}\n\nDest-proof\n\nURI: https://www.getdasha.com/\nVersion: 1\nChain ID: mainnet\nNonce: aabbcc\nIssued At: 2026-08-15T00:00:00.000Z\nExpiration Time: 2026-08-15T00:05:00.000Z\nRequest ID: faucet_dest`,
  publicKey: destWallet.address,
  nonce: 'aabbcc',
}), true);
assert.equal(parseSiwsMessage('wants you to sign in with your Solana account:\naddr\n\nNonce: x\nRequest ID: faucet_dest').domain, '');
assert.equal(siwsDomainOk('getdasha.com'), true);
assert.equal(siwsDomainOk('lobby.getdasha.com'), true);
assert.equal(siwsMessageDomain('not a siws message'), '');
assert.equal(siwsDomainOk(siwsMessageDomain('not a siws message')), false);
assert.equal(faucetSiwsFields({
  handle: 'newbie',
  publicKey: destWallet.address,
  nonce: 'aabbcc',
  issuedAt: 1,
  expiresAt: 2,
}), null);

const omitX = await createSessionToken(funded, { xId: 'fx-siws', handle: 'siws' });
const badMessage = `wants you to sign in with your Solana account:\n${destWallet.address}\n\nDest-proof\n\nURI: https://www.getdasha.com/\nVersion: 1\nChain ID: mainnet\nNonce: aabbcc\nIssued At: 2026-08-15T00:00:00.000Z\nExpiration Time: 2026-08-15T00:05:00.000Z\nRequest ID: faucet_dest`;
const badChallenge = await signPayload(funded.LOBBY_SESSION_SECRET, {
  kind: 'faucet_dest',
  xId: 'fx-siws',
  publicKey: destWallet.address,
  nonce: 'aabbcc',
  message: badMessage,
  origin: 'https://www.getdasha.com',
  exp: Date.now() + 60_000,
});
await funded.FAUCET.get(funded.FAUCET.idFromName('x:fx-siws')).fetch(new Request('https://faucet.internal/faucetSiws%3Afx-siws', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ value: { nonce: 'aabbcc', exp: Date.now() + 60_000 } }),
}));
const omitVerify = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${omitX}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ challenge: badChallenge, publicKey: destWallet.address, signature: destWallet.address }),
}), funded);
assert.equal(omitVerify.status, 400);
assert.equal((await omitVerify.json()).error, 'siws_domain');

const evilMessage = `evil.com wants you to sign in with your Solana account:\n${destWallet.address}\n\nDest-proof\n\nURI: https://evil.com/\nVersion: 1\nChain ID: mainnet\nNonce: ccddee\nIssued At: 2026-08-15T00:00:00.000Z\nExpiration Time: 2026-08-15T00:05:00.000Z\nRequest ID: faucet_dest`;
const evilTok = await signPayload(funded.LOBBY_SESSION_SECRET, {
  kind: 'faucet_dest',
  xId: 'fx-siws',
  publicKey: destWallet.address,
  nonce: 'ccddee',
  message: evilMessage,
  origin: 'https://www.getdasha.com',
  exp: Date.now() + 60_000,
});
const evilVerify = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${omitX}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ challenge: evilTok, publicKey: destWallet.address, signature: destWallet.address }),
}), funded);
assert.equal(evilVerify.status, 400);
assert.equal((await evilVerify.json()).error, 'siws_domain');

let sawHoldCheck = false;
function rpcMock({
  sol = ATA_RENT_LAMPORTS + FEE_LAMPORTS + 1,
  tokens = String(DEFAULT_AMOUNT_RAW),
  destExists = false,
  dest = destWallet.address,
  destWalletAccount = null,
  rent = ATA_RENT_LAMPORTS,
  sendCount = { n: 0 },
  fail = '',
  sigStatus = 'confirmed',
  sendWait = null,
} = {}) {
  return async (input, init) => {
    const body = typeof init?.body === 'string' ? init.body : '';
    if (body.includes('getTokenAccountsByOwner')) {
      sawHoldCheck = true;
      throw new Error('faucet SIWS must not check hold');
    }
    if (fail === 'rpc') throw new Error('network');
    const parsedBody = body.startsWith('[') ? JSON.parse(body) : [JSON.parse(body || '{"method":""}')];
    const reply = (row) => {
      if (row.method === 'getLatestBlockhash') {
        return { jsonrpc: '2.0', id: row.id, result: { value: { blockhash: destWallet.address } } };
      }
      if (row.method === 'getBalance') {
        if (fail === 'rent') return { jsonrpc: '2.0', id: row.id, result: { value: 100 } };
        return { jsonrpc: '2.0', id: row.id, result: { value: sol } };
      }
      if (row.method === 'getTokenAccountBalance') {
        if (fail === 'empty') return { jsonrpc: '2.0', id: row.id, error: { message: 'could not find account' } };
        return { jsonrpc: '2.0', id: row.id, result: { value: { amount: tokens, decimals: 6 } } };
      }
      if (row.method === 'getAccountInfo') {
        const addr = row.params?.[0];
        if (addr === dest) {
          return { jsonrpc: '2.0', id: row.id, result: { value: destWalletAccount } };
        }
        return { jsonrpc: '2.0', id: row.id, result: { value: destExists ? { lamports: ATA_RENT_LAMPORTS } : null } };
      }
      if (row.method === 'simulateTransaction') {
        if (fail === 'simulate') return { jsonrpc: '2.0', id: row.id, result: { value: { err: 'InstructionError' } } };
        return { jsonrpc: '2.0', id: row.id, result: { value: { err: null } } };
      }
      if (row.method === 'sendTransaction') {
        sendCount.n++;
        const raw = row.params[0];
        const bin = Uint8Array.from(Buffer.from(raw, 'base64'));
        const sig = base58Encode(bin.subarray(1, 65));
        return { jsonrpc: '2.0', id: row.id, result: sig };
      }
      if (row.method === 'getSignatureStatuses') {
        if (sigStatus === 'dropped') return { jsonrpc: '2.0', id: row.id, result: { value: [null] } };
        if (sigStatus === 'pending') return { jsonrpc: '2.0', id: row.id, result: { value: [{ confirmationStatus: 'processed' }] } };
        if (sigStatus === 'failed') return { jsonrpc: '2.0', id: row.id, result: { value: [{ err: { InstructionError: [0, 'Custom'] } }] } };
        return { jsonrpc: '2.0', id: row.id, result: { value: [{ confirmationStatus: 'confirmed' }] } };
      }
      if (row.method === 'getMinimumBalanceForRentExemption') {
        if (fail === 'no_rent') return { jsonrpc: '2.0', id: row.id, error: { message: 'unavailable' } };
        return { jsonrpc: '2.0', id: row.id, result: rent };
      }
      return { jsonrpc: '2.0', id: row.id, error: { message: 'unexpected' } };
    };
    if (fail === 'rpc') throw new Error('network');
    const out = [];
    for (const row of parsedBody) {
      if (row.method === 'sendTransaction' && sendWait) await sendWait;
      out.push(reply(row));
    }
    return new Response(JSON.stringify(body.startsWith('[') ? out : out[0]), { headers: { 'Content-Type': 'application/json' } });
  };
}

globalThis.fetch = rpcMock({ fail: 'empty' });
try {
  const row = await preflightFaucet({
    endpoints: ['https://api.mainnet-beta.solana.com'],
    treasury: parsed,
    dest: destWallet.address,
    amountRaw: DEFAULT_AMOUNT_RAW,
  });
  assert.equal(row.error, 'treasury_empty');
  assert.equal(row.status, 503);
} finally {
  globalThis.fetch = nativeFetch;
}

globalThis.fetch = rpcMock({ fail: 'rent' });
try {
  const row = await preflightFaucet({
    endpoints: ['https://api.mainnet-beta.solana.com'],
    treasury: parsed,
    dest: destWallet.address,
    amountRaw: DEFAULT_AMOUNT_RAW,
  });
  assert.equal(row.error, 'treasury_rent');
  assert.equal(row.status, 503);
} finally {
  globalThis.fetch = nativeFetch;
}

globalThis.fetch = rpcMock({ fail: 'rpc' });
try {
  const row = await preflightFaucet({
    endpoints: ['https://api.mainnet-beta.solana.com'],
    treasury: parsed,
    dest: destWallet.address,
    amountRaw: DEFAULT_AMOUNT_RAW,
  });
  assert.equal(row.error, 'rpc_unavailable');
  assert.equal(row.status, 503);
} finally {
  globalThis.fetch = nativeFetch;
}

globalThis.fetch = rpcMock({ fail: 'no_rent' });
try {
  const row = await preflightFaucet({
    endpoints: ['https://api.mainnet-beta.solana.com'],
    treasury: parsed,
    dest: destWallet.address,
    amountRaw: DEFAULT_AMOUNT_RAW,
  });
  assert.equal(row.error, 'rpc_unavailable');
  assert.equal(row.status, 503);
} finally {
  globalThis.fetch = nativeFetch;
}

globalThis.fetch = rpcMock({ rent: 3_000_000, sol: ATA_RENT_LAMPORTS + FEE_LAMPORTS + 1 });
try {
  const row = await preflightFaucet({
    endpoints: ['https://api.mainnet-beta.solana.com'],
    treasury: parsed,
    dest: destWallet.address,
    amountRaw: DEFAULT_AMOUNT_RAW,
  });
  assert.equal(row.error, 'treasury_rent');
  assert.equal(row.status, 503);
} finally {
  globalThis.fetch = nativeFetch;
}

globalThis.fetch = rpcMock({ destExists: true, sol: FEE_LAMPORTS + 1 });
try {
  const row = await preflightFaucet({
    endpoints: ['https://api.mainnet-beta.solana.com'],
    treasury: parsed,
    dest: destWallet.address,
    amountRaw: DEFAULT_AMOUNT_RAW,
  });
  assert.equal(row.ok, false);
  assert.equal(row.error, 'faucet_paused');
  assert.equal(row.status, 503);
} finally {
  globalThis.fetch = nativeFetch;
}

async function assertRejectBeforeSend({ dest, destWalletAccount, error }) {
  const sendCount = { n: 0 };
  globalThis.fetch = rpcMock({ dest, destWalletAccount, sendCount });
  try {
    const row = await preflightFaucet({
      endpoints: ['https://api.mainnet-beta.solana.com'],
      treasury: parsed,
      dest,
      amountRaw: DEFAULT_AMOUNT_RAW,
    });
    assert.equal(row.ok, false);
    assert.equal(row.error, error);
    assert.equal(row.status, 400);
    const sent = await sendFaucetTransfer({
      endpoints: ['https://api.mainnet-beta.solana.com'],
      keypair: parsed,
      dest,
      amountRaw: DEFAULT_AMOUNT_RAW,
    });
    assert.equal(sent.ok, false);
    assert.equal(sent.error, error);
    assert.equal(sendCount.n, 0);
  } finally {
    globalThis.fetch = nativeFetch;
  }
}

await assertRejectBeforeSend({ dest: destAta.address, destWalletAccount: null, error: 'dest_pda' });
await assertRejectBeforeSend({ dest: mint, destWalletAccount: { owner: TOKEN_PROGRAM, space: 82 }, error: 'dest_mint' });
await assertRejectBeforeSend({
  dest: destWallet.address,
  destWalletAccount: { owner: TOKEN_PROGRAM, space: 165 },
  error: 'dest_token',
});

const tokenSend = { n: 0 };
globalThis.fetch = rpcMock({ destWalletAccount: { owner: TOKEN_PROGRAM, space: 165 }, sendCount: tokenSend });
try {
  const tokenClaim = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${sessionToken}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.8',
    },
    body: '{}',
  }), funded);
  assert.equal(tokenClaim.status, 400);
  assert.equal((await tokenClaim.json()).error, 'dest_token');
  assert.equal(tokenSend.n, 0);
} finally {
  globalThis.fetch = nativeFetch;
}

const capEnv = {
  ...env,
  FAUCET: memoryFaucet(env),
  FAUCET_KEYPAIR: treasury.json,
  FAUCET_RENT_CAP_LAMPORTS: String(ATA_RENT_LAMPORTS),
};
const capA = await createSessionToken(capEnv, { xId: 'fx-cap-a', handle: 'capa' });
const capB = await createSessionToken(capEnv, { xId: 'fx-cap-b', handle: 'capb' });
globalThis.fetch = classifyFetch();
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${capA}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), capEnv);
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${capB}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), capEnv);
const capSend = { n: 0 };
globalThis.fetch = rpcMock({ sendCount: capSend });
try {
  const capFirst = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${capA}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.21',
    },
    body: '{}',
  }), capEnv);
  assert.equal(capFirst.status, 200);
  assert.equal(capSend.n, 1);
  const capSecond = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${capB}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.22',
    },
    body: '{}',
  }), capEnv);
  assert.equal(capSecond.status, 503);
  assert.equal((await capSecond.json()).error, 'faucet_paused');
  assert.equal(capSend.n, 1);
  assert.ok(capEnv.FAUCET.names().some((n) => n.startsWith('rent:')));
} finally {
  globalThis.fetch = nativeFetch;
}

const floorEnv = {
  ...env,
  FAUCET: memoryFaucet(env),
  FAUCET_KEYPAIR: treasury.json,
  FAUCET_SOL_FLOOR_LAMPORTS: '10000000',
};
const floorTok = await createSessionToken(floorEnv, { xId: 'fx-floor', handle: 'floor' });
globalThis.fetch = classifyFetch();
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${floorTok}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), floorEnv);
const floorSend = { n: 0 };
globalThis.fetch = rpcMock({ sendCount: floorSend, sol: ATA_RENT_LAMPORTS + FEE_LAMPORTS + 1 });
try {
  const floorClaim = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${floorTok}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.23',
    },
    body: '{}',
  }), floorEnv);
  assert.equal(floorClaim.status, 503);
  assert.equal((await floorClaim.json()).error, 'faucet_paused');
  assert.equal(floorSend.n, 0);
} finally {
  globalThis.fetch = nativeFetch;
}

const pausedEnv = {
  ...env,
  FAUCET: memoryFaucet(env),
  FAUCET_KEYPAIR: treasury.json,
  FAUCET_PAUSED: '1',
};
const pausedTok = await createSessionToken(pausedEnv, { xId: 'fx-pause', handle: 'pause' });
globalThis.fetch = classifyFetch();
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${pausedTok}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), pausedEnv);
const pausedSend = { n: 0 };
globalThis.fetch = rpcMock({ destExists: true, sendCount: pausedSend });
try {
  const pausedClaim = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${pausedTok}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.24',
    },
    body: '{}',
  }), pausedEnv);
  assert.equal(pausedClaim.status, 503);
  assert.equal((await pausedClaim.json()).error, 'faucet_paused');
  assert.equal(pausedSend.n, 0);
} finally {
  globalThis.fetch = nativeFetch;
}

const tokenCapEnv = {
  ...env,
  FAUCET: memoryFaucet(env),
  FAUCET_KEYPAIR: treasury.json,
  FAUCET_TOKEN_CAP_RAW: String(DEFAULT_AMOUNT_RAW),
};
const tokenCapA = await createSessionToken(tokenCapEnv, { xId: 'fx-tok-a', handle: 'toka' });
const tokenCapB = await createSessionToken(tokenCapEnv, { xId: 'fx-tok-b', handle: 'tokb' });
globalThis.fetch = classifyFetch();
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${tokenCapA}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), tokenCapEnv);
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${tokenCapB}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), tokenCapEnv);
const tokenCapSend = { n: 0 };
globalThis.fetch = rpcMock({ destExists: true, sendCount: tokenCapSend });
try {
  const tokenCapFirst = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${tokenCapA}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.25',
    },
    body: '{}',
  }), tokenCapEnv);
  assert.equal(tokenCapFirst.status, 200);
  assert.equal(tokenCapSend.n, 1);
  const tokenCapSecond = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${tokenCapB}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.26',
    },
    body: '{}',
  }), tokenCapEnv);
  assert.equal(tokenCapSecond.status, 503);
  assert.equal((await tokenCapSecond.json()).error, 'faucet_paused');
  assert.equal(tokenCapSend.n, 1);
  assert.ok(tokenCapEnv.FAUCET.names().some((n) => n.startsWith('token:')));
} finally {
  globalThis.fetch = nativeFetch;
}

const wwwOpt = await workerModule.default.fetch(new Request('https://www.getdasha.com/faucet/claim', {
  method: 'OPTIONS',
  headers: { Origin: 'https://www.getdasha.com' },
}), funded);
assert.equal(wwwOpt.status, 204);
assert.equal(wwwOpt.headers.get('access-control-allow-origin'), 'https://www.getdasha.com');
const lobbyOpt = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
  method: 'OPTIONS',
  headers: { Origin: 'https://www.getdasha.com' },
}), funded);
assert.equal(lobbyOpt.status, 204);

const sendCount = { n: 0 };
globalThis.fetch = rpcMock({ sendCount });
try {
  const sent = await sendFaucetTransfer({
    endpoints: ['https://api.mainnet-beta.solana.com'],
    keypair: parsed,
    dest: destWallet.address,
    amountRaw: DEFAULT_AMOUNT_RAW,
  });
  assert.equal(sent.ok, true);
  assert.ok(sent.signature);
  assert.equal(sent.mint, mint);
  const readyOk = await preflightFaucet({
    endpoints: ['https://api.mainnet-beta.solana.com'],
    treasury: parsed,
    dest: destWallet.address,
    amountRaw: DEFAULT_AMOUNT_RAW,
  });
  assert.equal(readyOk.ok, true);
  assert.equal(readyOk.rentLamports, ATA_RENT_LAMPORTS);
  assert.equal(sent.amountRaw, 100000000);
  assert.match(sent.solscan, /^https:\/\/solscan\.io\/tx\//);
  assert.equal(sendCount.n, 1);

  const first = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${sessionToken}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.9',
    },
    body: '{}',
  }), funded);
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.ok, true);
  assert.equal(firstBody.mint, mint);
  assert.equal(firstBody.amountRaw, 100000000);
  assert.ok(firstBody.signature);
  assert.equal(firstBody.solscan, `https://solscan.io/tx/${firstBody.signature}`);
  assert.equal(JSON.stringify(firstBody).includes('fx1'), false);
  assert.equal(assertPublicSafe(firstBody).ok, true);
  assert.equal(sendCount.n, 2);

  const again = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${sessionToken}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.10',
    },
    body: '{}',
  }), funded);
  assert.equal(again.status, 429);
  assert.equal(sendCount.n, 2);

  const otherToken = await createSessionToken(funded, { xId: 'fx2', handle: 'copycat' });
  await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${otherToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
  }), funded);
  const ipReuse = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${otherToken}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.9',
    },
    body: '{}',
  }), funded);
  assert.equal(ipReuse.status, 429);
  assert.equal(sendCount.n, 2);

  const me = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/me', {
    headers: { Cookie: `__Host-dasha_x=${sessionToken}` },
  }), funded);
  const meBody = await me.json();
  assert.equal(meBody.linked, true);
  assert.equal(meBody.claimed, true);
  assert.ok(meBody.signature);
  assert.equal(JSON.stringify(meBody).includes('fx1'), false);
  assert.equal(assertPublicSafe(meBody).ok, true);

  const names = funded.FAUCET.names();
  assert.ok(names.some((n) => n.startsWith('x:')));
  assert.ok(names.some((n) => n.startsWith('ip:')));
  assert.ok(names.some((n) => n.startsWith('rent:')));
  assert.ok(!names.includes('public'));
} finally {
  globalThis.fetch = nativeFetch;
}

const raceEnv = {
  ...env,
  FAUCET: memoryFaucet(env),
  FAUCET_KEYPAIR: treasury.json,
};
const raceTok = await createSessionToken(raceEnv, { xId: 'fx-race', handle: 'race' });
globalThis.fetch = classifyFetch();
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${raceTok}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), raceEnv);
let releaseSend;
const sendGate = new Promise((resolve) => { releaseSend = resolve; });
const raceSend = { n: 0 };
globalThis.fetch = rpcMock({ sendCount: raceSend, sendWait: sendGate });
try {
  const claimInit = {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${raceTok}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.40',
    },
    body: '{}',
  };
  const racing = Promise.all([
    workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', claimInit), raceEnv),
    workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', claimInit), raceEnv),
  ]);
  await new Promise((resolve) => setTimeout(resolve, 20));
  releaseSend();
  const [raceA, raceB] = await racing;
  const raceStatuses = [raceA.status, raceB.status].sort();
  assert.equal(raceSend.n, 1, 'overlapping claims must send once');
  assert.ok(raceStatuses.includes(200));
  assert.ok(raceStatuses.includes(409) || raceStatuses.includes(429));
} finally {
  globalThis.fetch = nativeFetch;
}

const heldEnv = {
  ...env,
  FAUCET: memoryFaucet(env),
  FAUCET_KEYPAIR: treasury.json,
};
const heldTok = await createSessionToken(heldEnv, { xId: 'fx-held', handle: 'held' });
globalThis.fetch = classifyFetch();
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${heldTok}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), heldEnv);
await heldEnv.FAUCET.get(heldEnv.FAUCET.idFromName('x:fx-held')).fetch(new Request('https://faucet.internal/faucetClaim%3Afx-held', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    value: {
      dest: destWallet.address,
      signature: 'heldSigheldSigheldSigheldSigheldSigheldSig12',
      pending: true,
      ts: Date.now() - (20 * 60_000),
      amountRaw: DEFAULT_AMOUNT_RAW,
    },
  }),
}));
const heldSend = { n: 0 };
globalThis.fetch = rpcMock({ sendCount: heldSend, sigStatus: 'pending' });
try {
  const heldClaim = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${heldTok}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.41',
    },
    body: '{}',
  }), heldEnv);
  assert.notEqual(heldClaim.status, 200);
  assert.equal(heldSend.n, 0);
  const heldBody = await heldClaim.json();
  assert.equal(heldBody.error, 'confirming');
  assert.ok(heldBody.signature);
} finally {
  globalThis.fetch = nativeFetch;
}

const dropEnv = {
  ...env,
  FAUCET: memoryFaucet(env),
  FAUCET_KEYPAIR: treasury.json,
};
const dropTok = await createSessionToken(dropEnv, { xId: 'fx-drop', handle: 'drop' });
globalThis.fetch = classifyFetch();
await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/wallet/verify', {
  method: 'POST',
  headers: {
    Origin: 'https://www.getdasha.com',
    Cookie: `__Host-dasha_x=${dropTok}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dest: destWallet.address, last4: last4(destWallet.address), paste: true }),
}), dropEnv);
await dropEnv.FAUCET.get(dropEnv.FAUCET.idFromName('x:fx-drop')).fetch(new Request('https://faucet.internal/faucetClaim%3Afx-drop', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    value: {
      dest: destWallet.address,
      signature: 'deadSigdeadSigdeadSigdeadSigdeadSigdeadSig12',
      pending: true,
      ts: Date.now(),
      amountRaw: DEFAULT_AMOUNT_RAW,
    },
  }),
}));
const dropSend = { n: 0 };
globalThis.fetch = rpcMock({ sendCount: dropSend, sigStatus: 'dropped' });
try {
  const dropClaim = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/faucet/claim', {
    method: 'POST',
    headers: {
      Origin: 'https://www.getdasha.com',
      Cookie: `__Host-dasha_x=${dropTok}`,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.42',
    },
    body: '{}',
  }), dropEnv);
  const dropBody = await dropClaim.json();
  assert.notEqual(dropBody.ok, true);
  assert.notEqual(dropBody.error, 'already claimed');
  assert.equal(dropSend.n, 0);
  const dropRow = await dropEnv.FAUCET.get(dropEnv.FAUCET.idFromName('x:fx-drop')).fetch(new Request('https://faucet.internal/faucetClaim%3Afx-drop'));
  const dropVal = (await dropRow.json()).value;
  assert.ok(!dropVal || dropVal.pending || !dropVal.signature || dropVal.signature !== 'deadSigdeadSigdeadSigdeadSigdeadSigdeadSig12' || dropVal.pending === true);
  assert.ok(!(dropVal && dropVal.signature && !dropVal.pending && dropVal.signature.startsWith('deadSig')));
} finally {
  globalThis.fetch = nativeFetch;
}

globalThis.fetch = classifyFetch();
const liveClass = await classifyDestLive(['https://api.mainnet-beta.solana.com'], destAta.address);
assert.equal(liveClass.error, 'dest_pda');
globalThis.fetch = nativeFetch;

assert.equal(sawHoldCheck, false);
assert.ok(!faucetSrc.includes('walletHoldsDasha'));
const hashed = await hashIp('203.0.113.9');
assert.equal(hashed.length, 64);
assert.doesNotMatch(hashed, /203\.0\.113/);

const leaked = assertPublicSafe({ xId: 'fx1', dest: destWallet.address });
assert.equal(leaked.ok, false);

console.log('dasha-faucet: PASS');
