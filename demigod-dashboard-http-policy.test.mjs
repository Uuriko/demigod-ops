import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dashboardCorsOrigin, dashboardLocalHost, dashboardLocalRequest, dashboardMutationIntent, privateDashboardJsonHeaders, privateDashboardSecurityHeaders } from './demigod-dashboard-http-policy.mjs';

test('dashboard private API CORS allows only its exact loopback origin', () => {
  for (const origin of ['http://127.0.0.1:9878', 'http://localhost:9878']) assert.equal(dashboardCorsOrigin(origin), origin);
  for (const origin of ['', 'null', 'https://evil.example', 'http://localhost:9999', 'https://localhost:9878', 'http://127.0.0.1.evil:9878']) {
    assert.equal(dashboardCorsOrigin(origin), '');
  }
});

test('dashboard accepts only its exact loopback Host before routing private APIs', () => {
  for (const host of ['127.0.0.1:9878', 'localhost:9878', 'LOCALHOST:9878']) assert.equal(dashboardLocalHost(host), true);
  for (const host of ['', 'evil.example:9878', '127.0.0.1.evil:9878', 'localhost:9999', 'localhost:9878@evil.example']) {
    assert.equal(dashboardLocalHost(host), false);
  }
  const server = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
  assert.match(server, /if \(!dashboardLocalHost\(req\.headers\.host \|\| ['"]['"], PORT\)\)/);
});

test('dashboard JSON privacy headers cannot be weakened by caller overrides', () => {
  assert.deepEqual(privateDashboardJsonHeaders('http://127.0.0.1:9878', {
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': 'text/html',
    'Referrer-Policy': 'unsafe-url',
    'Access-Control-Allow-Origin': '*',
    'Content-Security-Policy': 'default-src *',
    'cache-control': 'public',
    'access-control-allow-origin': 'https://evil.example',
    'X-Test': 'kept',
  }), {
    ...privateDashboardSecurityHeaders(),
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Test': 'kept',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:9878',
  });
});

test('dashboard mutation policy blocks cross-origin simple requests but preserves local CLI', () => {
  assert.equal(dashboardMutationIntent('POST', '/api/handoff'), true);
  assert.equal(dashboardMutationIntent('GET', '/api/jobs', '?run=tab-prune'), true);
  assert.equal(dashboardMutationIntent('GET', '/api/jobs'), false);
  assert.equal(dashboardMutationIntent('GET', '/api/review', '?run=1'), true);
  assert.equal(dashboardMutationIntent('GET', '/api/inbox', '?refresh=1'), true);
  for (const request of [
    ['/api/matches', '?refresh=1'],
    ['/api/webflow', '?refresh=1'],
    ['/api/smoke', '?run=1'],
    ['/api/status', '?force=1'],
    ['/api/agent-brief', '?force=1'],
    ['/api/control', '?force=1'],
  ]) assert.equal(dashboardMutationIntent('GET', ...request), true, request.join(''));
  assert.equal(dashboardMutationIntent('GET', '/api/review'), false);
  assert.equal(dashboardLocalRequest('https://evil.example', '', 9878), false);
  assert.equal(dashboardLocalRequest('', 'https://evil.example/page', 9878), false);
  assert.equal(dashboardLocalRequest('', '', 9878), true);
  assert.equal(dashboardLocalRequest('http://127.0.0.1:9878', '', 9878), true);
  const server = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
  assert.match(server, /if \(req\.method !== 'POST'\) \{[\s\S]{0,240}job dispatch requires POST/);
  assert.match(server, /runJob\('smoke'\)[\s\S]{0,180}writeHead\(job\.ok === false \? 409 : 200/);
  assert.match(server, /const \{ buildQueue \}[\s\S]{0,800}catch \(e\) \{[\s\S]{0,160}writeHead\(500,/);
});

test('private dashboard executes no remote scripts and keeps workflows as lightweight links', () => {
  const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /<script[^>]+src=/i);
  assert.doesNotMatch(ui, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  assert.doesNotMatch(ui, /control-plane-ambient\.jpg|has-ambient/);
  assert.match(ui, /<link rel="icon" href="\/assets\/brand\/favicon\.svg"/);
  for (const map of ['agents', 'workflow', 'website', 'resources']) assert.match(ui, new RegExp(`href="/api/maps/${map}"`));
});

test('every dashboard response gets an enforcing same-origin browser policy', () => {
  const headers = privateDashboardSecurityHeaders();
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.match(headers['Content-Security-Policy'], /default-src 'self'/);
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  const server = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
  assert.match(server, /Object\.entries\(privateDashboardSecurityHeaders\(\)\).*res\.setHeader/);
});
