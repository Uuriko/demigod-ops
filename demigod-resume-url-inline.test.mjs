import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('resume links receive the same inline HTTPS, credential, and length boundary as the server', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  const helper = source.match(/function resumeUrlError[\s\S]+?(?=function talentIsTechnical)/)?.[0];
  assert.ok(helper);
  const context = { URL };
  vm.runInNewContext(`${helper};result=[resumeUrlError('https://drive.google.com/file/d/abc/view'),resumeUrlError('javascript:alert(1)'),resumeUrlError('http://example.com/cv'),resumeUrlError('https://user:secret@example.com/cv'),resumeUrlError('https://example.com/${'a'.repeat(2048)}')]`, context);
  assert.equal(context.result[0], '');
  for (const error of context.result.slice(1)) assert.ok(error);
  assert.match(source, /name="resume-url"[^>]+maxlength="2048"/);
  assert.match(source, /setCustomValidity\(resumeUrlError\(value\)\)/);
});
