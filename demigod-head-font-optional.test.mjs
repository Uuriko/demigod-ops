/**
 * Hero must NOT download Unbounded (CLS / budget). System sans via --dg-cyber.
 * Preconnect budget: none. Critical CSS and the desktop hero preload are discovered immediately.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

test('head-minimal does not load Unbounded webfont', () => {
  const head = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
  assert.equal(/family=Unbounded/.test(head), false, 'no Google Fonts Unbounded download');
  const hosts = [...head.matchAll(/rel="preconnect" href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(hosts.length, 0, `redundant preconnects: ${hosts.join(', ')}`);
});

test('head CSS uses system cyber stack', () => {
  const css = fs.readFileSync(path.join(ROOT, 'demigod-head-styles.css'), 'utf8');
  assert.match(css, /--dg-cyber:ui-sans-serif,system-ui,sans-serif/);
});

test('verify-source encodes hero-font-no-layout-swap as no-Unbounded', () => {
  const v = fs.readFileSync(path.join(ROOT, 'demigod-verify-source.mjs'), 'utf8');
  assert.match(v, /head:hero-font-no-layout-swap/);
  assert.match(v, /!\/family=Unbounded\//);
});

test('verify-source passes on this product root', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-verify-source.mjs')], {
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env, DEMIGOD_ROOT: ROOT },
    timeout: 120000,
  });
  assert.equal(r.status, 0, (r.stderr || r.stdout || '').slice(0, 500));
  const line = (r.stdout || '').trim().split('\n').filter(Boolean).pop() || '{}';
  const j = JSON.parse(line);
  assert.equal(j.pass, true, JSON.stringify(j.failed || j));
});
