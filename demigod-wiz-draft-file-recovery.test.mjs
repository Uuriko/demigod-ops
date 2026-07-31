import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('draft restore discards unrestorable files and rewinds to their required step', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  const body = source.match(/qa\('input\[type="file"\]'[\s\S]+?\n  \}\);/)?.[0];
  assert.ok(body, 'file-draft recovery block exists');
  const context = {
    answers: { resume: 'resume.pdf', 'resume-url': 'https://example.com/resume.pdf' },
    resumeStep: 8,
    steps: [['welcome'], ['resume'], ['__submit__']],
    form: {},
    qa: () => [{ name: 'resume', id: '' }],
    Object,
  };
  vm.runInNewContext(body, context);
  assert.equal(context.answers.resume, undefined);
  assert.equal(context.answers['resume-url'], 'https://example.com/resume.pdf');
  assert.equal(context.resumeStep, 1);
});

test('current answer is saved before wizard enhancement on input', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  assert.match(source, /form\.addEventListener\('input', function\(\)\{ collect\(\); enhanceWIZ\(\); \}\);/);
});
