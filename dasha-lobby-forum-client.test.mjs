#!/usr/bin/env node
/**
 * Disk forum client talks to the disk worker API, not the older live /forum/reply paths.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const client = await readFile(new URL('./dasha-lobby-client.js', import.meta.url), 'utf8');
const pageHtml = await readFile(new URL('./dasha-lobby-page.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('./dasha-lobby-worker.mjs', import.meta.url), 'utf8');

assert.match(client, /function mountForum/);
assert.match(client, /global\.DashaLobby = api/);
assert.match(client, /mountForum: mountForum/);
assert.match(client, /\/forum\/threads/);
assert.match(client, /\?q=/);
assert.match(client, /method: 'PATCH'/);
assert.match(client, /method: 'DELETE'/);
assert.match(client, /\/report/);
assert.match(client, /Nothing matches that search/);
assert.match(client, /\/forum\/thread\/' \+ encodeURIComponent/);
assert.doesNotMatch(client, /['"]\/forum\/reply['"]/);
assert.doesNotMatch(client, /['"]\/forum\/thread['"]/);
assert.match(client, /\.get\('t'\)/);
assert.match(client, /maxlength: '80'/);
assert.match(client, /maxlength: '2000'/);
assert.match(pageHtml, /Official room\. No Telegram\. No Discord\./);
assert.match(worker, /Official \$dasha room\. No Telegram/);
assert.match(worker, /\.get\('t'\)/);
assert.match(worker, /id="copy-link"/);

const hits = [];
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  hits.push(req.method + ' ' + url.pathname);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (url.pathname === '/' || url.pathname === '/lobby') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="dasha-forum" data-forum-api="http://127.0.0.1:${server.address().port}"></div>
<script>${client}</script></body></html>`);
    return;
  }
  if (url.pathname === '/simp/me') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ linked: true, x: { handle: 'dash_eats' } }));
    return;
  }
  if (url.pathname === '/forum/threads' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: true,
      threads: [{ id: 't1', title: 'First thread', handle: 'dash_eats', replies: 0, lastTs: Date.now() }],
    }));
    return;
  }
  if (url.pathname === '/forum/thread/t1' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: true,
      thread: { id: 't1', title: 'First thread', handle: 'dash_eats' },
      posts: [{ id: 't1-0', handle: 'dash_eats', text: 'hello', ts: Date.now() }],
    }));
    return;
  }
  res.statusCode = 404;
  res.end('{"error":"not found"}');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/?t=t1`, { waitUntil: 'networkidle2', timeout: 20000 });
await page.waitForFunction(() => document.querySelector('.df-title')?.textContent === 'First thread', { timeout: 10000 });
const title = await page.$eval('.df-title', (el) => el.textContent);
assert.equal(title, 'First thread');
assert.ok(hits.includes('GET /forum/thread/t1'), `permalink must hit disk thread route, got ${hits.join(', ')}`);
assert.ok(!hits.some((h) => h.includes('/forum/reply')), 'must not use the retired reply route');
await page.close();
browser.disconnect();
server.close();
console.log('dasha lobby forum client: mountForum uses disk routes, ?t= opens a thread');
