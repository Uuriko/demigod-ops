#!/usr/bin/env node
/**
 * The live price strip: where the number comes from, and how it is allowed to fail.
 *
 * A price is a factual claim about money on a page whose whole pitch is not getting scammed, so the
 * things worth holding are narrow. It must be our own code — a third-party chart widget would put
 * someone else's script in front of every visitor and watch them. It must be fetched once for
 * everybody rather than once per visitor, because the upstream is a free API and the first version
 * of this 503'd six requests in ten by caching in worker module scope, which is per isolate.
 * And it must never show a number it cannot stand behind: stale readings say so, and a dead
 * upstream produces no price at all rather than yesterday's passed off as now.
 *
 *   node dasha-price.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');
const landing = readFileSync(join(root, 'dasha-landing.html'), 'utf8');

// ---- the page runs nobody else's code -----------------------------------------
{
  /* The reason to draw this ourselves rather than paste an embed. A chart iframe or CDN script
     would execute with the page's authority and see every visitor who lands on the homepage. */
  const externalScripts = [...landing.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/g)].map((m) => m[1]);
  for (const src of externalScripts) {
    assert.ok(/^https:\/\/lobby\.getdasha\.com\//.test(src),
      `the homepage may only load scripts from our own worker — found ${src}`);
  }
  assert.ok(!/<iframe/i.test(landing), 'no chart iframe: an embed watches our visitors on our behalf');
  for (const host of ['dexscreener.com/embed', 'geckoterminal.com/embed', 'birdeye', 'tradingview']) {
    assert.ok(!landing.toLowerCase().includes(host), `the price must not come from an embedded ${host} widget`);
  }
  assert.ok(landing.includes('https://lobby.getdasha.com/price'), 'the strip reads our own endpoint');
}

// ---- fetched once for everybody, not once per isolate ---------------------------
{
  /* The bug this replaced: the same code in worker module scope answered 503 about six times in ten,
     because module scope is per isolate and every cold one called the upstream itself. The Durable
     Object is a single instance, so the fetch happens there. */
  assert.ok(/async handlePrice\(/.test(worker), 'the price fetch lives on the Durable Object');
  const outer = worker.slice(worker.indexOf('export default'));
  const route = outer.slice(outer.indexOf("url.pathname === '/price'"), outer.indexOf("url.pathname === '/price'") + 400);
  assert.ok(/env\.LOBBY\.get\(/.test(route), '/price must be forwarded to the Durable Object, not served from the isolate');

  const handler = worker.slice(worker.indexOf('async handlePrice('), worker.indexOf('forumKey(id)'));
  assert.ok(/api\.geckoterminal\.com/.test(handler), 'the upstream is named in one place');
  assert.ok(/PRICE_TTL_MS/.test(handler), 'the fetch is rate-limited by a TTL');
  assert.ok(!/PRICE_CACHE/.test(outer.slice(0, outer.indexOf("url.pathname === '/price'"))),
    'no module-scope price cache may survive — that is the per-isolate bug');
}

// ---- failure never invents a number ---------------------------------------------
{
  const handler = worker.slice(worker.indexOf('async handlePrice('), worker.indexOf('forumKey(id)'));
  assert.ok(/PRICE_STALE_MS/.test(handler), 'there is a bounded window for serving a last-good reading');
  assert.ok(/stale: true/.test(handler), 'a reading past its TTL must be flagged, not passed off as current');
  assert.ok(/'price unavailable'.*503|503/.test(handler), 'past the stale window the answer is no price at all');
  const staleBranch = handler.slice(handler.indexOf('} catch'));
  assert.ok(staleBranch.indexOf('503') < staleBranch.indexOf('stale: true'),
    'the 503 must come first: an empty or long-dead cache cannot fall through to being flagged stale');
}

// ---- the page tells the truth about what it is showing ---------------------------
{
  /* Scoped to the strip's own script. Checking the whole page passed for the wrong reason: the
     footer already carries "can go to zero", so deleting the line from the price strip left the
     assertion green. A guarantee about this element has to be read from this element. */
  const at = landing.indexOf("lobby.getdasha.com/price");
  assert.ok(at > 0, 'the price script must exist to be checked');
  const strip = landing.slice(landing.lastIndexOf('<script', at), landing.indexOf('</script>', at));

  assert.ok(/price-note/.test(strip), 'the strip carries a note line');
  assert.ok(/Last good reading/.test(strip), 'a stale reading is labelled on the page, not silently drawn');
  assert.ok(/asOf/.test(strip), 'the reading is shown with the time it was taken');
  assert.ok(/can go to zero/.test(strip), 'the risk line rides with the price, not somewhere further down');
  assert.ok(/GeckoTerminal/.test(strip), 'the source is named next to the number');

  /* No urgency. watch.mjs fails the build if this copy ever appears anywhere on the site, and a
     price ticker is exactly where it would creep in. */
  for (const bad of [/buy pressure/i, /\braid\b/i, /don'?t miss/i, /last chance/i, /to the moon/i, /\bpump it\b/i, /act now/i]) {
    assert.ok(!bad.test(landing), `the price strip must not add urgency copy — matched ${bad}`);
  }
}

// ---- the chart is described for people who cannot see it --------------------------
{
  assert.ok(/aria-label/.test(landing.slice(landing.indexOf('id="spark"') - 400, landing.indexOf('id="spark"') + 400))
    || /spark.*aria-label|aria-label.*spark/s.test(landing), 'the sparkline gets a text alternative');
  assert.ok(/percent over 24 hours/.test(landing), 'the alternative states the direction and size of the move');
  assert.ok(/role="img"/.test(landing), 'the svg is exposed as an image rather than a pile of paths');
}

console.log('dasha price: PASS (own code only, one upstream call per TTL from the Durable Object, stale is labelled and dead is absent, source and risk shown, sparkline described)');
