import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('./dasha-simp-board-client.js', import.meta.url), 'utf8');
const take = name => {
  const match = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n    \\}`));
  assert(match, `${name} missing`);
  return match[0];
};

const memberSource = take('copyMemberInvite');
assert.doesNotMatch(memberSource, /textContent/, 'attribution must not relabel the generic quiz invite UI');
async function memberInvite(meData, response) {
  let copied = '', request = null, status = null;
  const btn = { disabled: false, textContent: '' };
  const fn = new Function(
    'meData', 'copyQuizInvite', 'fetchJson', 'base', 'setStatus',
    `${memberSource}\nreturn copyMemberInvite;`,
  )(
    meData,
    (_btn, url) => { copied = url || 'generic'; },
    (url, options) => { request = { url, options }; return Promise.resolve(response); },
    'https://lobby.getdasha.com',
    (text, kind) => { status = { text, kind }; },
  );
  fn(btn);
  await new Promise(resolve => setImmediate(resolve));
  return { btn, copied, request, status, meData };
}

let result = await memberInvite({ enrolled: true, referral: { inviteUrl: 'https://www.getdasha.com/?ref=existing#simp' } });
assert.equal(result.copied, 'https://www.getdasha.com/?ref=existing#simp');
assert.equal(result.request, null, 'an existing invite must not create another code');

result = await memberInvite({ enrolled: true }, { data: { ok: true, inviteUrl: 'https://www.getdasha.com/?ref=abcdefghijklmnop#simp' } });
assert.equal(result.request.url, 'https://lobby.getdasha.com/simp/referral');
assert.deepEqual(JSON.parse(result.request.options.body), { action: 'create' });
assert.equal(result.copied, 'https://www.getdasha.com/?ref=abcdefghijklmnop#simp');
assert.equal(result.meData.referral.inviteUrl, result.copied);
assert.equal(result.btn.disabled, false);

const claimSource = take('claimPendingReferral');
async function claim(meData, response) {
  let cleared = 0, request = null;
  const fn = new Function(
    'pendingReferralCode', 'meData', 'clearPendingReferral', 'fetchJson', 'base',
    `${claimSource}\nreturn claimPendingReferral;`,
  )(
    () => 'abcdefghijklmnop',
    meData,
    () => { cleared += 1; },
    (url, options) => { request = { url, options }; return Promise.resolve(response); },
    'https://lobby.getdasha.com',
  );
  await fn();
  return { cleared, request };
}

assert.equal((await claim({ linked: false }, {})).request, null, 'do not claim before X links');
assert.equal((await claim({ linked: true, enrolled: true }, {})).cleared, 1, 'members cannot retroactively claim');
result = await claim({ linked: true, enrolled: false }, { status: 201, data: { ok: true } });
assert.deepEqual(JSON.parse(result.request.options.body), { action: 'claim', code: 'abcdefghijklmnop' });
assert.equal(result.cleared, 1);
assert.equal((await claim({ linked: true, enrolled: false }, { status: 409, data: {} })).cleared, 1,
  'terminal claims must not retry');
assert.equal((await claim({ linked: true, enrolled: false }, { status: 500, data: {} })).cleared, 0,
  'transient failures must preserve attribution for a later user-driven refresh');

const storage = new Map();
const referralCode = new Function(
  'location', 'sessionStorage', 'REFERRAL_SS',
  `${take('pendingReferralCode')}\nreturn pendingReferralCode;`,
)({ search: '?ref=abcdefghijklmnop' }, {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
}, 'ref-key');
assert.equal(referralCode(), 'abcdefghijklmnop');
assert.equal(storage.get('ref-key'), 'abcdefghijklmnop', 'invite must survive the X popup');

let replaced = '';
const clearReferral = new Function(
  'location', 'sessionStorage', 'REFERRAL_SS', 'history',
  `${take('clearPendingReferral')}\nreturn clearPendingReferral;`,
)({ href: 'https://www.getdasha.com/simp?ref=abcdefghijklmnop&quiz=1#holder' }, {
  removeItem: key => storage.delete(key),
}, 'ref-key', {
  replaceState: (_state, _title, url) => { replaced = url; },
});
clearReferral();
assert.equal(storage.has('ref-key'), false);
assert.equal(replaced, '/simp?quiz=1#holder', 'settled referral cleanup must preserve unrelated route state');

assert.match(src, /return refresh\(\)\.then\(function\(\) \{[\s\S]*?if \(autoJoin && !meData\.enrolled\)/,
  'auto-join must wait for refresh');
assert.match(src, /function refresh\(\)[\s\S]*?return claimPendingReferral\(\);[\s\S]*?\.catch\(function\(\)/,
  'refresh must settle a pending referral before resolving');
assert.match(src, /if \(quizAttemptId\) \{\s*return refresh\(\)\.then\(function\(\) \{\s*return postQuiz\(\{\s*action: 'finalize'/,
  'OAuth quiz finalization must wait for refresh and referral claim');
console.log('dasha Simp referral client: existing invite, create, and pre-join claim passed');
