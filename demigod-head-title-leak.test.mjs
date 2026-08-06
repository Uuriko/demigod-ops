/**
 * Guards the head soft-SEO leak: raw <title>…</title> must not appear in
 * demigod-head-minimal.html (even in comments — crawlers match the string).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

test('head-minimal has no raw HTML title tags', () => {
  const head = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
  assert.equal(/<title\b/i.test(head), false, 'raw title tag would leak into live HTML');
});

test('verify-source encodes the title-leak gate', () => {
  const v = fs.readFileSync(path.join(ROOT, 'demigod-verify-source.mjs'), 'utf8');
  assert.match(v, /head:no-raw-title-tag-in-source/);
  assert.match(v, /<title\\b/);
});

test('foot scrubs Untitled document.title', () => {
  const foot = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  assert.match(foot, /\^Untitled\$/);
});
