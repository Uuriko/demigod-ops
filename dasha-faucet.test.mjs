import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createSessionToken } from './dasha-lobby-x.mjs';
import { assertPublicSafe } from './dasha-simp-score.mjs';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  ATA_RENT_LAMPORTS,
  DEFAULT_AMOUNT_RAW,
  DECIMALS,
  DashaFaucet,
  FEE_LAMPORTS,
  MINT,
  TOKEN_PROGRAM,
  amountUi,
  associatedTokenAddress,
  base58Encode,
  bytesOnCurve,
  claimCooldown,
  encodeCreateAtaIdempotent,
  encodeTransferChecked,
  faucetAmountRaw,
  faucetConfigured,
  faucetDestOk,
  faucetPublicStatus,
  hashIp,
  isOnCurveAddress,
  last4,
  notConfigured,
  parseFaucetKeypair,
  preflightFaucet,
  sendFaucetTransfer,
  solscanUrl,
} from './dasha-faucet.mjs';
import { isValidSolanaAddress } from './dasha-simp-actions.mjs';

const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const root = new URL('./', import.meta.url);
const workerSrc = await readFile(new URL('./dasha-lobby-worker.mjs', root), 'utf8');
const faucetSrc = await readFile(new URL('./dasha-faucet.mjs', root), 'utf8');
const clientSrc = await readFile(new URL('./dasha-faucet-client.js', root), 'utf8');
const sitemap = await readFile(new URL('./dasha-sitemap.xml', root), 'utf8');

assert.equal(MINT, mint);
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
assert.equal(FEE_LAMPORTS, 5000);

assert.match(sitemap, /<loc>https:\/\/www\.getdasha\.com\/faucet<\/loc>/);
assert.doesNotMatch(sitemap, /\/earn<\/loc>|\/airdrop<\/loc>|\/claim-rewards<\/loc>/);

assert.match(clientSrc, /global\.DashaFaucet/);
assert.match(clientSrc, /a tiny sample for newbies\. not an airdrop\. not earn\./);
assert.match(clientSrc, /we will not ask for a phrase/i);
assert.match(clientSrc, /MATCH, not verified/);
assert.match(clientSrc, /dasha-x-linked/);
assert.match(clientSrc, /credentials:\s*'include'/);
assert.match(clientSrc, /\/oauth\/x\/start/);
assert.match(clientSrc, /\/faucet\/wallet\/challenge/);
assert.match(clientSrc, /\/faucet\/claim/);
assert.match(clientSrc, /\/how-to-buy/);
assert.match(clientSrc, /\/learn/);
assert.doesNotMatch(clientSrc, /\bInter\b|Geist|fonts\.googleapis|system-ui/);
assert.doesNotMatch(clientSrc, /confetti|three\.js|lenis|barba|free money|guaranteed|this is official|airdrop campaign/i);
assert.ok(clientSrc.includes(mint));
assert.doesNotMatch(clientSrc, /\/simp\/wallet\/verify/);
assert.doesNotMatch(clientSrc, /hasPositiveTokenBalance/);

assert.match(faucetSrc, /kind: 'faucet_dest'/);
assert.match(faucetSrc, /idFromName/);
assert.doesNotMatch(faucetSrc, /hasPositiveTokenBalance/);
assert.doesNotMatch(faucetSrc, /joinBoard/);
assert.doesNotMatch(faucetSrc, /HELIUS_|payTo/);
assert.match(workerSrc, /X-Dasha-Edge': 'faucet'/);
assert.match(workerSrc, /href="\/faucet">Faucet/);
assert.doesNotMatch(workerSrc, /isExactPath\(url\.pathname, '\/earn'\)/);
assert.doesNotMatch(workerSrc, /isExactPath\(url\.pathname, '\/airdrop'\)/);
assert.doesNotMatch(workerSrc, /isExactPath\(url\.pathname, '\/claim-rewards'\)/);

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

const now = Date.parse('2026-08-15T00:00:00Z');
assert.equal(claimCooldown(null, now), null);
const cool = claimCooldown({ dest: destWallet.address, signature: 'realSig', amountRaw: DEFAULT_AMOUNT_RAW, ts: now }, now + 1000);
assert.equal(cool.signature, 'realSig');
assert.ok(cool.nextAt > now);

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
const { FAUCET_CLIENT_JS, FAUCET_CLIENT_SRI } = await import('./dasha-lobby-static-gen.mjs');
const faucetSri = `sha384-${createHash('sha384').update(FAUCET_CLIENT_JS).digest('base64')}`;
assert.equal(FAUCET_CLIENT_SRI, faucetSri, 'FAUCET_CLIENT_SRI must hash served client/faucet.js');

const pageHtml = workerModule.faucetPageHtml();
assert.match(pageHtml, /<link rel="canonical" href="https:\/\/www\.getdasha\.com\/faucet">/);
assert.match(pageHtml, /id="dasha-faucet"/);
assert.ok(pageHtml.includes(mint));
assert.match(pageHtml, /Arial Black/);
assert.match(pageHtml, /client\/faucet\.js/);
assert.match(pageHtml, /href="\/faucet"/);
assert.doesNotMatch(pageHtml, /\bInter\b|Geist|fonts\.googleapis|system-ui/);
assert.doesNotMatch(pageHtml, /free money|guaranteed|official faucet/i);

for (const host of ['www.getdasha.com', 'lobby.getdasha.com']) {
  for (const method of ['GET', 'HEAD']) {
    const res = await workerModule.default.fetch(new Request(`https://${host}/faucet`, { method }), {});
    assert.equal(res.status, 200, `${host} /faucet ${method}`);
    assert.equal(res.headers.get('x-dasha-edge'), 'faucet');
    const html = await res.text();
    if (method === 'HEAD') assert.equal(html, '');
    else {
      assert.ok(html.includes(mint), `${host} /faucet mint`);
      assert.doesNotMatch(html, /\bInter\b|Geist|fonts\.googleapis|system-ui/);
    }
  }
  const hold = await workerModule.default.fetch(new Request(`https://${host}/simp/hold`), {});
  assert.equal(hold.status, 501);
  assert.deepEqual(await hold.json(), { configured: false, error: 'not_configured' });
  for (const banned of ['/earn', '/airdrop', '/claim-rewards', '/claim', '/drop', '/free']) {
    const miss = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${banned}`), {});
    assert.notEqual(miss.headers.get('x-dasha-edge'), 'faucet', banned);
    assert.ok(miss.status === 404 || miss.status === 308, `${banned} must not be a faucet route`);
  }
}

const js = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/client/faucet.js'), {});
assert.equal(js.status, 200);
assert.match(js.headers.get('content-type') || '', /javascript/);
const jsBody = await js.text();
assert.ok(jsBody.includes(mint));
assert.doesNotMatch(jsBody, /\bInter\b|Geist|fonts\.googleapis|system-ui/);

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
assert.equal(JSON.stringify(pasteBody).includes('fx1'), false);
assert.equal(assertPublicSafe(pasteBody).ok, true);

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
assert.match(challengeBody.message, /Request ID: faucet_dest/);
assert.doesNotMatch(challengeBody.message, /holder badge/);
assert.equal(JSON.stringify(challengeBody).includes('fx1'), false);

let sawHoldCheck = false;
const nativeFetch = globalThis.fetch;
function rpcMock({ sol = ATA_RENT_LAMPORTS + FEE_LAMPORTS + 1, tokens = String(DEFAULT_AMOUNT_RAW), destExists = false, sendCount = { n: 0 }, fail = '' } = {}) {
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
        return { jsonrpc: '2.0', id: row.id, result: { value: destExists ? { lamports: ATA_RENT_LAMPORTS } : null } };
      }
      if (row.method === 'sendTransaction') {
        sendCount.n++;
        const raw = row.params[0];
        const bin = Uint8Array.from(Buffer.from(raw, 'base64'));
        const sig = base58Encode(bin.subarray(1, 65));
        return { jsonrpc: '2.0', id: row.id, result: sig };
      }
      if (row.method === 'getSignatureStatuses') {
        return { jsonrpc: '2.0', id: row.id, result: { value: [{ confirmationStatus: 'confirmed' }] } };
      }
      return { jsonrpc: '2.0', id: row.id, error: { message: 'unexpected' } };
    };
    if (fail === 'rpc') throw new Error('network');
    const out = parsedBody.map(reply);
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
  assert.ok(!names.includes('public'));
} finally {
  globalThis.fetch = nativeFetch;
}

assert.equal(sawHoldCheck, false);
assert.ok(!faucetSrc.includes('walletHoldsDasha'));
const hashed = await hashIp('203.0.113.9');
assert.equal(hashed.length, 64);
assert.doesNotMatch(hashed, /203\.0\.113/);

const leaked = assertPublicSafe({ xId: 'fx1', dest: destWallet.address });
assert.equal(leaked.ok, false);

console.log('dasha-faucet: PASS');
