#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { agentTips, classifyChange, freezeStatus, liveTruth, openUrl } from './demigod-webflow-lib.mjs';

for (const [intent, type] of [
  ['add favicon', 'head-meta'],
  ['update page title and meta description', 'page-settings-seo'],
  ['correct Home seo.description', 'page-settings-seo'],
  ['update canonical URL', 'head-meta'],
  ['add structured data schema', 'head-meta'],
  ['add CTA button', 'foot-js'],
  ['add Webflow File Upload component', 'designer-layout'],
  ['add native Webflow form field', 'designer-layout'],
  ['edit the Webflow form field label', 'designer-layout'],
  ['move a form input', 'designer-layout'],
  ['change form submit behavior', 'foot-js'],
  ['improve mobile spacing', 'head-css'],
]) assert.equal(classifyChange(intent).type, type, intent);

assert.equal(classifyChange('add Webflow File Upload component for talent résumé').commands[0], 'npm run demigod:resume-field');

assert.match(agentTips({ freeze: { frozen: true, why: 'green hold' }, cdp: {}, tabs: {} })[1], /enabled — green hold/);
assert.match(agentTips({ freeze: { frozen: false, authorized: false }, cdp: {}, tabs: {} })[1], /has not authorized/);
assert.match(agentTips({ freeze: { frozen: false, authorized: true }, cdp: {}, tabs: {} })[1], /authorizes publication/);

const cdnPublisher = fs.readFileSync(new URL('./demigod-foot-cdn-publish.mjs', import.meta.url), 'utf8');
const footPublisher = fs.readFileSync(new URL('./demigod-publish-foot.mjs', import.meta.url), 'utf8');
const webflowCli = fs.readFileSync(new URL('./demigod-webflow.mjs', import.meta.url), 'utf8');
const webflowLib = fs.readFileSync(new URL('./demigod-webflow-lib.mjs', import.meta.url), 'utf8');
const aiShip = fs.readFileSync(new URL('./demigod-webflow-ai-ship.mjs', import.meta.url), 'utf8');
for (const source of [cdnPublisher, footPublisher]) assert.match(source, /\\\/partners\\\/?/);
assert.match(cdnPublisher, /night-district/);
assert.match(cdnPublisher, /events-bot/);
assert.match(webflowCli, /tool\.mutate && \(freeze\.frozen \|\| !freeze\.authorized\)/);
assert.match(webflowLib, /paste: Boolean\([^)]+freeze\.authorized\)/);
assert.doesNotMatch(webflowCli, /--force/);
for (const args of [['status', '--typo'], ['status', '--json', '--json'], ['hygiene', '--kill-hugn'], ['run', 'truth', 'extra']]) {
  const result = spawnSync(process.execPath, [new URL('./demigod-webflow.mjs', import.meta.url).pathname, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 2, `reject ${args.join(' ')}`);
}
for (const args of [['unknown'], ['bridge', '--typo'], ['status', '--json', '--json']]) {
  const result = spawnSync(process.execPath, [new URL('./demigod-webflow-connect.mjs', import.meta.url).pathname, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 2, `reject connect ${args.join(' ')}`);
}
assert.ok(
  aiShip.indexOf("assertNotFrozen('webflow-ai-ship')") < aiShip.indexOf('submitWebflowAiPrompt(AI_PROMPT)'),
  'AI ship checks current-request authorization before mutating Webflow',
);

const originalFetch = globalThis.fetch;
const originalAuthorization = process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH;
try {
  delete process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH;
  assert.equal(freezeStatus().authorized, false);
  process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH = '1';
  assert.equal(freezeStatus().authorized, true);

  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.endsWith('/robots.txt')) return new Response('Sitemap: https://www.trydemigod.com/sitemap.xml');
    if (href.endsWith('/sitemap.xml')) return new Response('<urlset/>', { headers: { 'content-type': 'application/xml' } });
    return new Response('<html></html>');
  };
  const live = await liveTruth();
  assert.equal(live.robots.hasSitemap, true);
  assert.equal(live.sitemap.valid, true);
  globalThis.fetch = async (url) =>
    String(url).endsWith('/robots.txt')
      ? new Response('Sitemap: https://www.trydemigod.com/sitemap.xml', { status: 404 })
      : new Response(String(url).endsWith('/sitemap.xml') ? '<urlset/>' : '<html></html>');
  assert.equal((await liveTruth()).robots.hasSitemap, false);

  globalThis.fetch = async () => new Response('', { status: 500 });
  await assert.rejects(openUrl('https://example.com'), /CDP \/json\/new HTTP 500/);
} finally {
  globalThis.fetch = originalFetch;
  if (originalAuthorization == null) delete process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH;
  else process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH = originalAuthorization;
}

console.log('webflow-change-selftest PASS');
