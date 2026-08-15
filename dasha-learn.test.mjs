import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { applyLearnAward, assertPublicSafe, meStatus, scoreProfile } from './dasha-simp-score.mjs';
import { MODULES, MINT, publicBank, isLearnTrack } from './dasha-learn-bank.mjs';
import { createSessionToken } from './dasha-lobby-x.mjs';

const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const root = new URL('./', import.meta.url);
const workerSrc = await readFile(new URL('./dasha-lobby-worker.mjs', root), 'utf8');
const clientSrc = await readFile(new URL('./dasha-learn-client.js', root), 'utf8');
const sitemap = await readFile(new URL('./dasha-sitemap.xml', root), 'utf8');

assert.equal(MINT, mint);
assert.equal(MODULES.length, 32);
assert.equal(MODULES.filter((row) => row.track === 'crypto').length, 12);
assert.equal(MODULES.filter((row) => row.track === 'crypto-ai').length, 10);
assert.equal(MODULES.filter((row) => row.track === 'ai').length, 10);
assert.ok(isLearnTrack('crypto') && isLearnTrack('crypto-ai') && isLearnTrack('ai'));
const bank = publicBank();
assert.equal(bank.mint, mint);
assert.equal(Object.hasOwn(bank, 'disclaimer'), false, 'bank must not ship a disclaimer lecture');
assert.match(JSON.stringify(bank), /how-to-buy/);
const BANNED = /not an airdrop|not earn|not [“"]i earned \$dasha|she is not the dev|\bnot the dev\b|association is not endorsement|association ≠ endorsement|neither is required|we will not ask for a phrase|this is not advice|\bnot advice\b|We never take your card|Nobody from \$dasha|We never take the phrase|We never take a card|Who from \$dasha will ask|A tx is not required to pass|We do not tell you which|Other networks sell inference\. We do not|If someone else has the phrase, they have the keys\. We do not|you do not have to buy to pass|No transaction required|No purchase required/i;
const bankNotesChips = bank.modules.flatMap((row) => [
  row.goal, row.body, row.note, row.prompt, row.fallback?.prompt,
  ...(row.proves || []).flatMap((p) => [p.prompt, ...(p.choices || [])]),
  ...(row.chips || []).map((chip) => chip.text),
]).join('\n');
assert.doesNotMatch(bankNotesChips, BANNED, 'bank notes/chips must not lecture');
assert.doesNotMatch(
  JSON.stringify(bank.modules.map((row) => [row.goal, row.body, row.note, row.prompt].join(' '))),
  /\b(this is official|safe mint|verified token|endorsed|guaranteed)\b/i,
);
const i10 = bank.modules.find((row) => row.id === 'I10');
assert.deepEqual((i10?.chips || []).filter((chip) => chip.required).map((chip) => chip.id).sort(), ['howto', 'mint', 'source']);
assert.ok((i10?.chips || []).some((chip) => chip.id === 'official' && chip.forbidden), 'stamp chip stays forbidden');
assert.ok(!(i10?.chips || []).some((chip) => chip.id === 'not-dev' || chip.id === 'assoc'), 'lecture chips are out');

assert.doesNotMatch(sitemap, /<loc>https:\/\/www\.getdasha\.com\/learn<\/loc>/, 'sitemap must not feature /learn');
assert.doesNotMatch(sitemap, /\/hold|\/academy|\/university<\/loc>/);

assert.match(clientSrc, /global\.DashaLearn/);
assert.match(clientSrc, /MATCH/);
assert.match(clientSrc, /NOT THIS TOKEN/);
assert.match(clientSrc, /t\.me\/dashacommunity/);
assert.match(clientSrc, /0\.02/);
assert.match(clientSrc, /dasha_learn_v1/);
assert.match(clientSrc, /dasha-x-linked/);
assert.match(clientSrc, /credentials:\s*'include'/);
assert.match(clientSrc, /\/simp\/wallet\/challenge/);
assert.match(clientSrc, /\/simp\/learn/);
assert.match(clientSrc, /signTx/);
assert.doesNotMatch(clientSrc, BANNED, 'learn client must not paint banned lecture copy');
assert.match(clientSrc, /Class\. Points on Simp\./);
assert.doesNotMatch(clientSrc, /el\('h1', '', 'Learn'\)/, 'client must not paint a second Learn heading');
assert.match(clientSrc, /learn-mint-copy/);
assert.doesNotMatch(clientSrc, /\bInter\b|Geist|fonts\.googleapis|system-ui/);
assert.doesNotMatch(clientSrc, /confetti|three\.js|lenis|barba/i);
assert.ok(clientSrc.includes(mint));
assert.ok((clientSrc.match(/NOT THIS TOKEN/g) || []).length >= 1);
assert.ok(DRILL_COUNT(clientSrc) >= 12);

function DRILL_COUNT(src) {
  const m = src.match(/var DRILL = \[([\s\S]*?)\];/);
  if (!m) return 0;
  return (m[1].match(/\{ text:/g) || []).length;
}

for (const tool of ['mint-check', 'fees', 'siws', 'sandbox', 'phish-siws', 'chip', 'glossary', 'halluc']) {
  assert.match(clientSrc, new RegExp(tool));
}

assert.match(workerSrc, /isLeftoverLearnPath/);
assert.doesNotMatch(workerSrc, /learnPageHtml|X-Dasha-Edge': 'learn'/);
assert.match(workerSrc, /client\/learn\.js/);
assert.match(workerSrc, /\/simp\/learn/);
assert.doesNotMatch(workerSrc, /isExactPath\(url\.pathname, '\/hold'\)/);
assert.doesNotMatch(workerSrc, /isExactPath\(url\.pathname, '\/academy'\)/);
assert.doesNotMatch(workerSrc, /isExactPath\(url\.pathname, '\/university'\)/);
assert.match(workerSrc, /<noscript>/);
assert.match(clientSrc, /dasha-learn-static/);

const { LEARN_CLIENT_JS, LEARN_CLIENT_SRI } = await import('./dasha-lobby-static-gen.mjs');
const learnSri = `sha384-${createHash('sha384').update(LEARN_CLIENT_JS).digest('base64')}`;
assert.equal(LEARN_CLIENT_SRI, learnSri, 'LEARN_CLIENT_SRI must hash served client/learn.js');

globalThis.WebSocketRequestResponsePair ||= class WebSocketRequestResponsePair {};
const workerModule = await import('./dasha-lobby-worker.mjs');
const { parseLearnPath } = workerModule;

assert.deepEqual(parseLearnPath('/learn'), { track: '', mod: '' });
assert.deepEqual(parseLearnPath('/learn/crypto/C08'), { track: 'crypto', mod: 'C08' });
assert.equal(parseLearnPath('/learn/nope')?.invalid, true);
assert.equal(parseLearnPath('/simp'), null);

for (const host of ['www.getdasha.com', 'lobby.getdasha.com']) {
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/learn', '/learn/', '/learn/crypto', '/learn/crypto/C08', '/learn/academy']) {
      const res = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
      assert.equal(res.status, 308, `${host} ${path} ${method} must 308 home`);
      assert.equal(res.headers.get('location'), 'https://www.getdasha.com/');
    }
  }
  const hold = await workerModule.default.fetch(new Request(`https://${host}/simp/hold`), {});
  assert.equal(hold.status, 501);
  assert.deepEqual(await hold.json(), { configured: false, error: 'not_configured' });
}

const js = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/client/learn.js'), {});
assert.equal(js.status, 200);
assert.match(js.headers.get('content-type') || '', /javascript/);
const jsBody = await js.text();
assert.ok(jsBody.includes(mint));
assert.doesNotMatch(jsBody, /\bInter\b|Geist|fonts\.googleapis|system-ui/);

const rows = new Map();
const state = {
  storage: {
    get: async (key) => rows.get(key),
    put: async (key, value) => {
      if (key && typeof key === 'object') {
        for (const [name, item] of Object.entries(key)) rows.set(name, item);
        return;
      }
      rows.set(key, value);
    },
    delete: async (key) => rows.delete(key),
    getAlarm: async () => 1,
    setAlarm: async () => {},
  },
  setWebSocketAutoResponse() {},
  blockConcurrencyWhile(fn) { this.ready = fn(); },
};
const env = {
  LOBBY_SESSION_SECRET: 'learn-test-secret',
  ALLOWED_ORIGINS: 'https://www.getdasha.com,https://getdasha.com,https://lobby.getdasha.com',
};
const room = new workerModule.DashaLobby(state, env);
await state.ready;
const sessionToken = await createSessionToken(env, { xId: 'lx1', handle: 'pupil' });
const postLearn = (body, { cookie = sessionToken, origin = 'https://www.getdasha.com' } = {}) => room.fetch(new Request('https://lobby.getdasha.com/simp/learn', {
  method: 'POST',
  headers: {
    ...(origin ? { Origin: origin } : {}),
    ...(cookie ? { Cookie: `__Host-dasha_x=${cookie}` } : {}),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
}));

const noX = await postLearn({ moduleId: 'C01' }, { cookie: '' });
assert.equal(noX.status, 401);
const enrolled = await postLearn({ moduleId: 'C01' });
assert.equal(enrolled.status, 200);
const enrolledBody = await enrolled.json();
assert.equal(enrolledBody.awarded, true);
assert.equal(enrolledBody.enrolled, true);
assert.equal(enrolledBody.board.components.learn, 4);
assert.equal(enrolledBody.board.components.holder, 0);
assert.equal(assertPublicSafe(enrolledBody).ok, true);
assert.equal(JSON.stringify(enrolledBody).includes('lx1'), false);
const again = await postLearn({ moduleId: 'C01', difficulty: 2, tool: 'siws' });
assert.equal((await again.json()).retake, true);
assert.equal(scoreProfile(room.simpProfiles.lx1).components.learn, 4);

const now = Date.parse('2026-08-15T00:00:00Z');
const unit = applyLearnAward({}, { xId: 'u', handle: 'u' }, { moduleId: 'C08', difficulty: 1, tool: 'live-buy' }, { now });
assert.equal(unit.points, 6);
assert.equal(meStatus(unit.store, { xId: 'u', handle: 'u' }).board.learnModules.includes('C08'), true);
assert.equal(assertPublicSafe(meStatus(unit.store, { xId: 'u', handle: 'u' })).ok, true);

console.log('dasha-learn: PASS');
