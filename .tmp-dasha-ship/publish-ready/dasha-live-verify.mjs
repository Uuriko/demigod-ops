#!/usr/bin/env node
/** Live marker check for getdasha.com — fetch-only, no auth.
 *  Default: report lag (howto 404, old desk FOMO) without failing.
 *  DASHA_LIVE_STRICT=1: hard-fail until desk is neutral + howto is live.
 */
import assert from 'node:assert/strict';
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const base = process.env.DASHA_LIVE_BASE || 'https://www.getdasha.com';
const strict = process.env.DASHA_LIVE_STRICT === '1';
async function get(path) {
  const r = await fetch(base + path, { redirect: 'follow' });
  const text = await r.text();
  return { status: r.status, text, final: r.url };
}
const home = await get('/');
const desk = await get('/dasha');
const studio = await get('/studio');
const howto = await get('/how-to-buy');
assert.equal(home.status, 200, 'home');
assert.equal(desk.status, 200, 'desk');
assert.equal(studio.status, 200, 'studio');
assert.ok(home.text.includes(MINT) && home.text.includes('jup.ag'), 'home mint+jup');
assert.ok(desk.text.includes(MINT) && desk.text.includes('jup.ag'), 'desk mint+jup');
assert.ok(!/t\.me\/dashacommunity/i.test(home.text + desk.text + studio.text), 'telegram ban');
assert.ok(!/thesis card|conviction receipt/i.test(home.text), 'no thesis on home');
const deskNeutral = !/buy the dip|dd-fomo|raid kit/i.test(desk.text);
const howtoLive = howto.status === 200;
if (howtoLive) {
  assert.ok(howto.text.includes(MINT) && howto.text.includes('01 · Wallet'), 'howto content');
  assert.ok(!/04 · Share|Copy share pack/i.test(howto.text), 'howto no promo pack');
}
if (strict) {
  assert.ok(deskNeutral, 'strict: desk still has FOMO/raid chrome');
  assert.ok(howtoLive, 'strict: how-to-buy not live');
}
const lag = [];
if (!deskNeutral) lag.push('desk-not-neutral');
if (!howtoLive) lag.push('howto-404');
console.log(JSON.stringify({
  ok: true,
  base,
  home: home.status,
  desk: desk.status,
  studio: studio.status,
  howto: howto.status,
  deskNeutral,
  howtoLive,
  shipLag: lag,
  strict,
  note: lag.length
    ? 'disk ahead of live — publish when Webflow auth returns'
    : 'live matches ship markers',
}, null, 2));
