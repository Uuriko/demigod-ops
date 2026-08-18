import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* One share string everywhere (DUEL-PLAN 2026-08-16):
   Beat N/M · {title} / Beat this / $dasha / https://www.getdasha.com/simp/r/{id}
   Lane never in share. Beat chip href is the public dare URL, not /?challenge=. */
const src = await readFile(new URL('./dasha-simp-board-client.js', import.meta.url), 'utf8');
const fn = (name) => {
  const m = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n    \\}`));
  assert(m, `${name} missing from client`);
  return m[0];
};
const QUIZ_INVITE_URL = 'https://www.getdasha.com/simp';
const { resultShareUrl, quizShareText } = new Function(
  'QUIZ_INVITE_URL',
  `${fn('resultShareUrl')}\n${fn('quizShareText')}\nreturn { resultShareUrl, quizShareText };`
)(QUIZ_INVITE_URL);

assert.equal(resultShareUrl('https://lobby.getdasha.com/simp/r/xvojI8Cdg8B6'), 'https://www.getdasha.com/simp/r/xvojI8Cdg8B6');
assert.equal(resultShareUrl('xvojI8Cdg8B6'), 'https://www.getdasha.com/simp/r/xvojI8Cdg8B6');
assert.equal(resultShareUrl(''), QUIZ_INVITE_URL);
assert.equal(
  quizShareText({ correct: 9, total: 28, title: 'Still loading', lane: 'Cinema obsessive', resultUrl: 'https://lobby.getdasha.com/simp/r/xvojI8Cdg8B6' }),
  'Beat 9/28 · Still loading\nBeat this\n$dasha\nhttps://www.getdasha.com/simp/r/xvojI8Cdg8B6'
);
assert(!/challenge=/.test(fn('beatChip')), 'Beat chip still links /?challenge=');
assert(/resultShareUrl\(key\)/.test(fn('beatChip')), 'Beat chip href must be the /simp/r/{id} dare URL');
assert(!/lane/.test(fn('paintChallengeNote')), 'lane leaked into the challenge note');
const cardStart = src.indexOf('function quizCardBlob');
assert(cardStart > 0, 'quizCardBlob missing');
assert(!/result\.lane/.test(src.slice(cardStart, src.indexOf('function openXIntent'))), 'lane leaked onto the share card');

/* 2026 clipboard hijack: writeText resolving does not prove the clipboard still holds our text by
   the time the user pastes it. Both copy paths must read back and refuse to claim success on a
   mismatch, not just resolve-and-declare-victory. */
const linkCopiedOkSrc = src.match(/function linkCopiedOk\([^)]*\) \{[\s\S]*?\n  \}/);
assert(linkCopiedOkSrc, 'linkCopiedOk missing from client');
const { linkCopiedOk } = new Function(`${linkCopiedOkSrc[0]}\nreturn { linkCopiedOk };`)();
assert.equal(linkCopiedOk('https://www.getdasha.com/simp', 'https://www.getdasha.com/simp'), true);
assert.equal(linkCopiedOk('https://www.getdasha.com/simp\n', 'https://www.getdasha.com/simp'), true, 'trailing whitespace from a selection still counts');
assert.equal(linkCopiedOk('', 'https://www.getdasha.com/simp'), false);
assert.equal(linkCopiedOk('https://evil.example/simp', 'https://www.getdasha.com/simp'), false, 'hijacked clipboard is not a match');
for (const copier of ['copyQuizInvite', 'copyText']) {
  const body = fn(copier === 'copyText' ? 'copyText' : copier);
  assert(/navigator\.clipboard\.readText/.test(body), `${copier} must read back after writing`);
  assert(/linkCopiedOk\(got, text\)/.test(body), `${copier} must gate success on linkCopiedOk`);
}
console.log('dasha simp share: one share string, www dare URL, no lane, clipboard read-back honesty — passed');
