import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('resume files are bounded to PDF or Word before upload', () => {
  const source = fs.readFileSync('demigod-foot-core.js', 'utf8');
  const fn = source.match(/function resumeFileError\(file\)\{[\s\S]+?\n\}/)?.[0];
  assert.ok(fn);
  const context = {};
  vm.runInNewContext(`${fn};this.check=resumeFileError`, context);
  assert.equal(context.check({ name: 'resume.PDF', size: 100 }), '');
  assert.equal(context.check({ name: 'resume.docx', size: 100 }), '');
  assert.match(context.check({ name: 'resume.exe', size: 100 }), /PDF or Word/);
  assert.match(context.check({ name: 'resume.pdf', size: 10485761 }), /10MB/);
});
