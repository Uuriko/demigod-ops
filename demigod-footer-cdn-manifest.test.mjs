/**
 * footer-lite must point at the attested DEMIGOD-FOOT-CDN.json loader URL
 * so the next CM6 paste does not re-introduce a stale pin.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function footerLoaderSrc(html) {
  const m =
    html.match(
      /<script\b(?=[^>]*\bid=["']demigod-foot-cdn-loader["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*>/i,
    ) ||
    html.match(
      /<script\b(?=[^>]*\bsrc=["']([^"']+)["'])(?=[^>]*\bid=["']demigod-foot-cdn-loader["'])[^>]*>/i,
    );
  return m?.[1] || '';
}

test('footer-lite loader src equals DEMIGOD-FOOT-CDN.json cdnUrl', () => {
  const manPath = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
  assert.equal(fs.existsSync(manPath), true, 'manifest present');
  const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
  const foot = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
  const src = footerLoaderSrc(foot);
  assert.ok(src, 'loader src parsed');
  assert.equal(src, man.cdnUrl);
});

test('verify-source includes footer:cdn-matches-manifest gate', () => {
  const v = fs.readFileSync(path.join(ROOT, 'demigod-verify-source.mjs'), 'utf8');
  assert.match(v, /footer:cdn-matches-manifest/);
});

test('verify-source passes on this product root', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-verify-source.mjs')], {
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env, DEMIGOD_ROOT: ROOT },
    timeout: 120000,
  });
  assert.equal(r.status, 0, (r.stderr || r.stdout || '').slice(0, 400));
  const line = (r.stdout || '').trim().split('\n').filter(Boolean).pop() || '{}';
  const j = JSON.parse(line);
  assert.equal(j.pass, true, JSON.stringify(j.failed || j));
});
