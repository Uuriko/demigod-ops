/**
 * Hero must NOT download Unbounded (CLS / budget). System sans via --dg-cyber.
 * Preconnect budget: only jsDelivr in custom head (Webflow already hits fonts CDN).
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
  /* Preconnect is a scarce resource — each one costs a DNS + TCP + TLS handshake the browser may
     never use — so the contract is an ALLOW-LIST of hosts actually on the critical path, not a
     bare count. Bumping a count from 1 to 2 would let any future host in silently; naming them
     means a new preconnect has to be justified here first.
       cdn.jsdelivr.net  — foot-core JS, the render-blocking dependency
       files.catbox.moe  — hero image (head-minimal:253), favicon, apple-touch-icon
     Both are verified fetched from this file. A host with no request on the critical path must
     not be preconnected. */
  const ALLOWED_PRECONNECT = ['https://cdn.jsdelivr.net', 'https://files.catbox.moe'];
  const hosts = [...head.matchAll(/rel="preconnect" href="([^"]+)"/g)].map((m) => m[1]);
  assert.match(head, /rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"/, 'jsDelivr preconnect required');
  for (const h of hosts) {
    assert.ok(ALLOWED_PRECONNECT.includes(h), `unlisted preconnect ${h} — justify it in ALLOWED_PRECONNECT or remove it`);
  }
  assert.ok(hosts.length <= ALLOWED_PRECONNECT.length, `${hosts.length} preconnects for ${ALLOWED_PRECONNECT.length} allowed hosts — duplicates waste a handshake`);
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
