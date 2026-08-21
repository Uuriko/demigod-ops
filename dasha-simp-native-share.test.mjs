import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('./dasha-simp-board-client.js', import.meta.url), 'utf8');
const match = src.match(/function sendQuizCard\([^)]*\) \{[\s\S]*?\n    \}/);
assert(match, 'sendQuizCard missing from client');

async function run({ native = true, blob = false, canShare = true, reject = null } = {}) {
  let shared = null, opened = null, tracked = 0;
  const navigator = native ? {
    canShare: () => canShare,
    share: data => { shared = data; return reject ? Promise.reject(reject) : Promise.resolve(); },
  } : {};
  class FileStub {
    constructor(_parts, name, options) { this.name = name; this.type = options.type; }
  }
  const sendQuizCard = new Function(
    'navigator', 'File', 'quizShareText', 'setStatus', 'trackQuiz', 'openXIntent',
    `${match[0]}\nreturn sendQuizCard;`,
  )(navigator, FileStub, () => 'quiz share text', () => {}, () => { tracked += 1; }, text => { opened = text; });
  sendQuizCard({}, blob ? {} : null);
  await new Promise(resolve => setImmediate(resolve));
  return { shared, opened, tracked };
}

assert.deepEqual((await run()).shared, { text: 'quiz share text' });
assert.equal((await run()).tracked, 1, 'native fallback must not duplicate share intent');
assert.equal((await run({ blob: true })).shared.files[0].name, 'dasha-simp-result.png');
assert.deepEqual((await run({ blob: true, canShare: false })).shared, { text: 'quiz share text' });
assert.equal((await run({ reject: { name: 'AbortError' } })).opened, null);
assert.equal((await run({ reject: { name: 'NotAllowedError' } })).opened, 'quiz share text');
assert.equal((await run({ native: false })).opened, 'quiz share text');
console.log('dasha simp native share: file, text, cancel, blocked, and X fallback passed');
