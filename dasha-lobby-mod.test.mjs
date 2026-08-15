import assert from 'node:assert/strict';
import {
  MINT,
  PAIR,
  DASHA_TAPE_EMBED_SRC,
  isDashaTapeEmbedSrc,
  PIN,
  MAX_SOCKETS,
  validateNick,
  validateMessage,
  checkRate,
  checkRepeat,
  pruneHistory,
  pruneForumThreads,
  publicForumRow,
  publicForumThread,
  parseForumThreadPath,
  MAX_FORUM_THREADS,
  MAX_FORUM_REPLIES,
  parseClientFrame,
  originAllowed,
  linkOk,
  avatarOk,
  nickTaken,
  isCapsSpam,
  linkifySegments,
  checkIpJoin,
  roomSlowLimits,
  studioRemixHref,
  RATE_MS,
  MAX_HISTORY,
  HISTORY_TTL_MS,
  REPEAT_WINDOW_MS,
  SLOW_MODE_AT,
  MAX_PER_IP,
} from './dasha-lobby-mod.mjs';

assert.equal(MINT, '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump');
assert.equal(PAIR, '9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7');
assert.equal(isDashaTapeEmbedSrc(DASHA_TAPE_EMBED_SRC), true);
assert.equal(isDashaTapeEmbedSrc(`https://dexscreener.com/solana/${PAIR}?embed=1`), true);
assert.equal(isDashaTapeEmbedSrc(`https://dexscreener.com/solana/${PAIR}`), false);
assert.equal(isDashaTapeEmbedSrc('https://dexscreener.com/solana/otherpair?embed=1'), false);
assert.equal(PIN.mint, MINT);
assert.equal(PIN.text, 'Public lobby.');
assert.equal(MAX_SOCKETS, 80, 'public room concurrent cap');
assert.ok(MAX_PER_IP >= 2 && MAX_PER_IP <= 8);
assert.equal(validateNick('dash_eats').ok, false, 'reserved public handle blocked for anon');
assert.equal(validateNick('dash.eats').ok, false, 'lookalike reserved nick blocked');
assert.equal(validateNick('officialdasha').ok, false);
assert.equal(validateNick('dash_eats', { allowAtHandle: false }).ok, false);
assert.equal(validateNick('@someone', { allowAtHandle: true, linkedHandle: 'someone' }).ok, true);

const ip = { times: [] };
const tIp = 5_000_000;
for (let i = 0; i < 10; i++) assert.equal(checkIpJoin(ip, tIp + i * 1000).ok, true);
assert.equal(checkIpJoin(ip, tIp + 11_000).ok, false);

const base = { rateMs: 1200, maxPerMin: 20 };
assert.equal(roomSlowLimits(SLOW_MODE_AT - 1, base).slow, undefined);
assert.equal(roomSlowLimits(SLOW_MODE_AT, base).slow, true);
assert.ok(roomSlowLimits(SLOW_MODE_AT, base).rateMs >= 5000);
assert.match(studioRemixHref('hello $dasha'), /\/studio#/);
assert.match(studioRemixHref('hello $dasha'), /line=/);
assert.match(studioRemixHref('hi', { look: 'poster', format: 'square' }), /look=poster/);
assert.equal(validateNick('dashaeat').ok, false);

assert.equal(validateNick('ok').ok, true);
assert.equal(validateNick('a').ok, false);
assert.equal(validateNick('admin').ok, false);
assert.equal(validateNick('moderator').ok, false);
assert.equal(validateNick('nice-nick_1').ok, true);
assert.equal(validateNick('bad<script>').ok, false);

assert.equal(validateMessage('gm $dasha').ok, true);
assert.equal(validateMessage('').ok, false);
assert.equal(validateMessage('x'.repeat(201)).ok, false);
assert.equal(validateMessage('claim free sol now airdrop').ok, false);
assert.equal(validateMessage('air drop free sol').ok, false);
assert.equal(validateMessage('join t.me/scam').ok, false);
assert.equal(validateMessage('https://evil.com/x').ok, false);
assert.equal(validateMessage(`see https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${MINT}`).ok, true);
assert.equal(validateMessage('https://lobby.getdasha.com/health').ok, true);
assert.equal(validateMessage('THIS IS ALL CAPS SPAM MESSAGE BRO').ok, false);
assert.equal(isCapsSpam('THIS IS ALL CAPS SPAM MESSAGE BRO'), true);
assert.equal(isCapsSpam('normal message ok'), false);
assert.equal(linkOk(`https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${MINT}`), true);
assert.equal(linkOk('https://jup.ag/swap?buy=WrongMint1111111111111111111111111111111'), false);
assert.equal(linkOk(`https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${MINT}&buy=WrongMint1111111111111111111111111111111`), false);
assert.equal(linkOk(`https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${MINT}&ref=attacker`), false);
assert.equal(linkOk('http://jup.ag/swap'), false);
assert.equal(linkOk('https://pump.fun/coin/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), true);
assert.equal(linkOk('https://phantom.com/tokens/solana/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), true);
assert.equal(linkOk('https://raydium.io/swap/?inputMint=sol&outputMint=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), true);
assert.equal(linkOk('https://phantom.com/tokens/solana/WrongMint1111111111111111111111111111111'), false);
assert.equal(linkOk('https://solscan.io/token/WrongMint1111111111111111111111111111111'), false);
assert.equal(linkOk('https://www.geckoterminal.com/solana/pools/9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7'), true);
assert.equal(avatarOk('https://pbs.twimg.com/profile_images/x.jpg'), true);
assert.equal(avatarOk('https://evil.com/x.png'), false);
assert.equal(avatarOk('javascript:alert(1)'), false);

const rate = { lastMs: 0, times: [] };
const t0 = 1_000_000;
assert.equal(checkRate(rate, t0).ok, true);
assert.equal(checkRate(rate, t0 + 100).ok, false);
assert.equal(checkRate(rate, t0 + RATE_MS).ok, true);
for (let i = 0; i < 10; i++) assert.equal(checkRate(rate, t0 + RATE_MS * (i + 2)).ok, true);
assert.equal(checkRate(rate, t0 + RATE_MS * 12).ok, false);

const rep = { lastText: '', lastTextMs: 0 };
assert.equal(checkRepeat(rep, 'gm', t0).ok, true);
assert.equal(checkRepeat(rep, 'gm', t0 + 1000).ok, false);
assert.equal(checkRepeat(rep, 'gm', t0 + REPEAT_WINDOW_MS + 1).ok, true);
assert.equal(checkRepeat(rep, 'hi', t0 + REPEAT_WINDOW_MS + 2).ok, true);

const map = new Map([
  ['a', 'Alice'],
  ['b', 'bob'],
]);
assert.equal(nickTaken(map, 'alice', 'x'), true);
assert.equal(nickTaken(map, 'alice', 'a'), false);
assert.equal(nickTaken(map, 'carol', 'x'), false);

const segs = linkifySegments(`go https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${MINT} and https://evil.com/x`);
assert.ok(segs.some(s => s.type === 'link' && s.value.includes('jup.ag')));
assert.ok(segs.some(s => s.type === 'text' && s.value.includes('evil.com')));

const now = Date.now();
const hist = pruneHistory([
  { ts: now - HISTORY_TTL_MS - 1, text: 'old' },
  { ts: now - 1000, text: 'new' },
  ...Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({ ts: now - i, text: String(i) })),
], now);
assert.ok(hist.length <= MAX_HISTORY);
assert.ok(!hist.some(m => m.text === 'old'));

const forumKept = pruneForumThreads([
  ...Array.from({ length: MAX_FORUM_THREADS + 3 }, (_, i) => ({ id: `t${i}`, text: `thread ${i}`, replies: [] })),
]);
assert.equal(forumKept.length, MAX_FORUM_THREADS);
assert.equal(forumKept[0].text, 'thread 3');
const withReplies = pruneForumThreads([{
  id: 'keep',
  text: 'hello',
  replies: Array.from({ length: MAX_FORUM_REPLIES + 2 }, (_, i) => ({ id: `r${i}`, text: `r${i}` })),
}]);
assert.equal(withReplies[0].replies.length, MAX_FORUM_REPLIES);
assert.equal(withReplies[0].replies[0].text, 'r2');
assert.deepEqual(parseForumThreadPath('/forum/threads'), { list: true, id: '' });
assert.deepEqual(parseForumThreadPath('/forum/threads/abc123'), { list: false, id: 'abc123' });
assert.equal(parseForumThreadPath('/forum'), null);
{
  const row = publicForumRow({
    id: 't1',
    text: 'first line is the topic\nmore',
    ts: 100,
    nick: 'ava',
    replies: [{ id: 'r1', text: 'reply', ts: 200, nick: 'ben' }],
  });
  assert.equal(row.replies, 1);
  assert.equal(row.lastTs, 200);
  assert.equal(row.text, 'first line is the topic\nmore');
  const open = publicForumThread({
    id: 't1',
    text: 'first line is the topic\nmore',
    ts: 100,
    nick: 'ava',
    replies: [{ id: 'r1', text: 'reply', ts: 200, nick: 'ben' }],
  });
  assert.equal(open.replies.length, 1);
  assert.equal(open.replies[0].text, 'reply');
}

assert.equal(parseClientFrame('{"type":"hello","nick":"ava"}').ok, true);
assert.equal(parseClientFrame('{"type":"chat","text":"gm"}').ok, true);
assert.equal(parseClientFrame('{"type":"chat","text":"airdrop free sol"}').ok, false);
assert.equal(parseClientFrame('{"type":"report","nick":"ava"}').ok, false, 'dead report protocol stays closed');
assert.equal(parseClientFrame('not-json').ok, false);
assert.equal(parseClientFrame('{"type":"dm"}').ok, false);

assert.equal(originAllowed('https://www.getdasha.com', 'https://www.getdasha.com,https://getdasha.com'), true);
assert.equal(originAllowed('https://evil.com', 'https://www.getdasha.com'), false);

console.log('dasha-lobby-mod: PASS');
