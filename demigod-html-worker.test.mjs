import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import workerModule, {
  injectBountiesBoard,
  normalizeBountiesFeed,
  rewriteCdnPin,
  stripGoldAccent,
} from './demigod-html-worker.mjs';

const root = new URL('./', import.meta.url);
const workerSrc = await readFile(new URL('./demigod-html-worker.mjs', root), 'utf8');
const wrangler = await readFile(new URL('./demigod-html-wrangler.jsonc', root), 'utf8');
const dashaWrangler = await readFile(new URL('./dasha-lobby-wrangler.jsonc', root), 'utf8');

const CDN_PIN_FROM = 'e0fe769c0dca9fc8804f6676e928f42092570d6c';
const CDN_PIN_TO = '94d25aa3d6351c58980c03103dd7b3276e0c40fa';
const PIN_FIXTURE = (sha) => `<!doctype html><html><body>
<link href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@${sha}/head-latest.css">
<script src="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@${sha}/foot-latest.js"></script>
<img src="https://raw.githubusercontent.com/Uuriko/demigod-site-cdn/${sha}/art.png">
</body></html>`;

{
  const fromOld = rewriteCdnPin(PIN_FIXTURE(CDN_PIN_FROM));
  assert.equal(fromOld, PIN_FIXTURE(CDN_PIN_TO));
  assert.doesNotMatch(fromOld, new RegExp(CDN_PIN_FROM));
  assert.equal(fromOld.split(CDN_PIN_TO).length - 1, 3);

  const noPin = '<!doctype html><html><body><p>no cdn pin</p></body></html>';
  assert.equal(rewriteCdnPin(noPin), noPin);

  const already = PIN_FIXTURE(CDN_PIN_TO);
  assert.equal(rewriteCdnPin(already), already);
  assert.equal(rewriteCdnPin(rewriteCdnPin(PIN_FIXTURE(CDN_PIN_FROM))), already);
}

const LIVE_GOLD_H1 =
  '<h1 class="hero-title"><span class="title-accent-gold">SF Startup Talent.</span> <span class="title-accent-red">Tech</span> <span class="title-accent-blue">Matched.</span></h1>';
const HOME_FIXTURE = `<!doctype html><html><head><title>Demigod · SF Startup Talent · Mutual Yes</title>
<meta name="twitter:title" content="Demigod · SF Startup Talent · Mutual Yes"></head>
<body>${LIVE_GOLD_H1}</body></html>`;
const BOUNTIES_SHELL = `<!doctype html><html><head><title>Bounties</title></head>
<body>
<script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js"></script>
<script src="https://cdn.prod.website-files.com/webflow.js"></script>
<script id="demigod-public-roles-data">window.__dgPublicRoles={"schema":"demigod.public-roles/1","roles":[]}</script>
<script src="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@e0fe769c0dca9fc8804f6676e928f42092570d6c/foot-latest.js"></script>
</body></html>`;

assert.match(wrangler, /"pattern": "www\.trydemigod\.com\/\*"/);
assert.match(wrangler, /"zone_name": "trydemigod\.com"/);
assert.match(wrangler, /"main": "demigod-html-worker\.mjs"/);
assert.doesNotMatch(wrangler, /getdasha\.com/);
assert.doesNotMatch(dashaWrangler, /trydemigod/);
assert.doesNotMatch(workerSrc, /#dfff00|#ff3b81|#dasha-bounties|htmlPage\(/);
assert.doesNotMatch(workerSrc, /\/oauth\/|createSessionToken|mintReceipt|eliza/i);
assert.doesNotMatch(workerSrc, /trydemigod\.com\/bounties\.json/);
assert.match(workerSrc, /demigod-bounties-feed\/v1/);
assert.match(workerSrc, /bounties-feed\.json/);
assert.match(workerSrc, /#03140d|#f3f0e7|#10c674/);

{
  const out = stripGoldAccent(HOME_FIXTURE);
  assert.doesNotMatch(out, /title-accent-gold/);
  const h1 = out.match(/<h1 class="hero-title">[\s\S]*?<\/h1>/)?.[0] || '';
  assert.doesNotMatch(h1, /SF Startup Talent/);
  assert.match(h1, /title-accent-red/);
  assert.match(h1, /title-accent-blue/);
  assert.match(h1, />Tech</);
  assert.match(h1, />Matched\.</);
  assert.match(out, /<title>Demigod · SF Startup Talent · Mutual Yes<\/title>/);
}

{
  const emptyPay = normalizeBountiesFeed({
    schema: 'demigod-bounties-feed/v1',
    listings: [{ kind: 'item', name: 'docs', payTo: '' }, { kind: 'project', name: 'desk', payTo: '   ' }],
  });
  assert.equal(emptyPay.schema, 'demigod-bounties-feed/v1');
  assert.equal(emptyPay.listings[0].payTo, null);
  assert.equal(emptyPay.listings[0].payoutStatus, 'not_implemented');
  assert.equal(emptyPay.listings[1].payTo, null);
  assert.equal(emptyPay.listings[1].payoutStatus, 'not_implemented');
  assert.doesNotMatch(JSON.stringify(emptyPay), /"payTo":""/);
}

{
  const emptyListed = injectBountiesBoard(BOUNTIES_SHELL, { listings: [] });
  const emptyFallback = injectBountiesBoard(BOUNTIES_SHELL, normalizeBountiesFeed(null));
  for (const empty of [emptyListed, emptyFallback]) {
    assert.match(empty, /id="demigod-bounties"/);
    assert.match(empty, /aria-label="Bounties"/);
    assert.match(empty, /No bounties listed/);
    assert.doesNotMatch(empty, /<li\b/);
    assert.doesNotMatch(empty, /payTo:""/);
    assert.doesNotMatch(empty, /#dasha-bounties|#dfff00|#ff3b81/);
    assert.match(empty, /id="demigod-bounties"[\s\S]*(?:jquery|webflow\.js)/);
  }
  const blankPay = injectBountiesBoard(BOUNTIES_SHELL, {
    listings: [
      { kind: 'item', name: 'docs', amount: 25, currency: 'USDC', payTo: '' },
      { kind: 'project', name: 'desk', amount: 50, currency: 'USDC', payTo: '   ' },
    ],
  });
  const nullPay = injectBountiesBoard(BOUNTIES_SHELL, {
    listings: [{ kind: 'item', name: 'docs', amount: 25, currency: 'USDC', payTo: null }],
  });
  for (const html of [blankPay, nullPay]) {
    assert.match(html, /id="demigod-bounties"/);
    assert.match(html, /docs/);
    assert.match(html, /25 USDC/);
    assert.doesNotMatch(html, /payTo:""/);
    assert.doesNotMatch(html, /payTo="\s*"/);
    assert.doesNotMatch(html, /<p>\s*<\/p>/);
    assert.doesNotMatch(html, /\bClaim\b|\bPay\b|log\s*in/i);
  }
  const listed = injectBountiesBoard(BOUNTIES_SHELL, {
    schema: 'demigod-bounties-feed/v1',
    listings: [
      { kind: 'item', name: 'First listing', amount: 25, currency: 'USDC', payTo: null },
    ],
  });
  const section = listed.match(/<section\b[^>]*id=["']demigod-bounties["'][\s\S]*?<\/section>/i)?.[0] || '';
  assert.match(section, /First listing/);
  assert.match(section, /25 USDC/);
  assert.doesNotMatch(section, /payTo:""/);
  assert.doesNotMatch(section, /\bClaim\b|\bPay\b|log\s*in/i);
  assert.doesNotMatch(section, /#dfff00|#ff3b81|#dasha-bounties/);
}

function urlOf(input) {
  return String(input?.url || input);
}

{
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(PIN_FIXTURE(CDN_PIN_FROM), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    const pinned = await workerModule.fetch(new Request('https://www.trydemigod.com/'), {});
    const pinnedHtml = await pinned.text();
    assert.equal(pinned.headers.get('x-demigod-edge'), 'html-rewrite');
    assert.doesNotMatch(pinnedHtml, new RegExp(CDN_PIN_FROM));
    assert.equal(pinnedHtml.split(CDN_PIN_TO).length - 1, 3);

    globalThis.fetch = async () => new Response(PIN_FIXTURE(CDN_PIN_TO), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    const alreadyHtml = await (await workerModule.fetch(new Request('https://www.trydemigod.com/'), {})).text();
    assert.equal(alreadyHtml.split(CDN_PIN_TO).length - 1, 3);

    const noPin = '<!doctype html><html lang="en"><body><p>no cdn pin</p></body></html>';
    globalThis.fetch = async () => new Response(noPin, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    const bareHtml = await (await workerModule.fetch(new Request('https://www.trydemigod.com/'), {})).text();
    assert.doesNotMatch(bareHtml, new RegExp(CDN_PIN_FROM));
    assert.doesNotMatch(bareHtml, new RegExp(CDN_PIN_TO));
    assert.match(bareHtml, /<p>no cdn pin<\/p>/);
  } finally {
    globalThis.fetch = nativeFetch;
  }
}

{
  const nativeFetch = globalThis.fetch;
  const fetched = [];
  try {
    globalThis.fetch = async (input) => {
      const u = urlOf(input);
      fetched.push(u);
      if (u.includes('bounties-feed.json')) {
        return new Response(JSON.stringify({
          name: 'demigod bounties',
          schema: 'demigod-bounties-feed/v1',
          listings: [],
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      if (/trydemigod\.com\/bounties\.json/.test(u)) {
        return new Response(JSON.stringify({ slug: 'bounties' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const path = new URL(u).pathname;
      const body = path === '/' || path === '' ? HOME_FIXTURE : BOUNTIES_SHELL;
      return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    };

    const home = await workerModule.fetch(new Request('https://www.trydemigod.com/'), {});
    const homeHtml = await home.text();
    assert.equal(home.status, 200);
    assert.equal(home.headers.get('x-demigod-edge'), 'html-rewrite');
    assert.equal(home.headers.get('x-dasha-edge'), null);
    assert.doesNotMatch(homeHtml, /title-accent-gold/);
    const homeH1 = homeHtml.match(/<h1 class="hero-title">[\s\S]*?<\/h1>/)?.[0] || '';
    assert.doesNotMatch(homeH1, /SF Startup Talent/);
    assert.match(homeH1, /title-accent-red/);
    assert.match(homeH1, /title-accent-blue/);
    assert.doesNotMatch(homeHtml, /id="demigod-bounties"/);

    for (const path of ['/bounties', '/bounties/']) {
      const page = await workerModule.fetch(new Request(`https://www.trydemigod.com${path}`), {});
      const html = await page.text();
      assert.equal(page.status, 200, `${path} must rewrite`);
      assert.equal(page.headers.get('x-demigod-edge'), 'bounties-board');
      assert.equal(page.headers.get('x-dasha-edge'), null);
      assert.match(html, /id="demigod-bounties"/, `${path} must inject the no-JS board`);
      assert.match(html, /No bounties listed/);
      assert.doesNotMatch(html, /<li\b/);
      assert.doesNotMatch(html, /payTo:""/);
      assert.doesNotMatch(html, /#dasha-bounties|#dfff00|#ff3b81/);
      assert.match(html, /id="demigod-public-roles-data"/);
    }

    const json = await workerModule.fetch(new Request('https://www.trydemigod.com/bounties.json'), {});
    assert.equal(json.status, 200);
    assert.equal(json.headers.get('x-demigod-edge'), null);
    const jsonBody = await json.json();
    assert.equal(jsonBody.slug, 'bounties');
    assert.equal(fetched.some((u) => /trydemigod\.com\/bounties\.json/.test(u) && !u.includes('bounties-feed')), true);
    assert.equal(fetched.some((u) => u.includes('bounties-feed.json')), true);

    globalThis.fetch = async (input) => {
      const u = urlOf(input);
      if (u.includes('bounties-feed.json')) throw new Error('offline');
      return new Response(BOUNTIES_SHELL, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    };
    const thrown = await workerModule.fetch(new Request('https://www.trydemigod.com/bounties'), {});
    const thrownHtml = await thrown.text();
    assert.match(thrownHtml, /id="demigod-bounties"/);
    assert.match(thrownHtml, /No bounties listed/);
    assert.doesNotMatch(thrownHtml, /<li\b/);

    globalThis.fetch = async (input) => {
      const u = urlOf(input);
      if (u.includes('bounties-feed.json')) {
        return new Response(JSON.stringify({ slug: 'bounties', pageId: 'webflow' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(BOUNTIES_SHELL, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    };
    const unusable = await workerModule.fetch(new Request('https://www.trydemigod.com/bounties'), {});
    const unusableHtml = await unusable.text();
    assert.match(unusableHtml, /No bounties listed/);
    assert.doesNotMatch(unusableHtml, /<li\b/);
    assert.doesNotMatch(unusableHtml, /pageId/);
  } finally {
    globalThis.fetch = nativeFetch;
  }
}

{
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      const u = urlOf(input);
      if (u.includes('bounties-feed.json')) {
        return new Response(JSON.stringify({
          schema: 'demigod-bounties-feed/v1',
          listings: [{ name: 'First listing', amount: 25, currency: 'USDC', payTo: '' }],
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(BOUNTIES_SHELL, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    };
    const page = await workerModule.fetch(new Request('https://www.trydemigod.com/bounties'), {});
    const html = await page.text();
    const section = html.match(/<section\b[^>]*id=["']demigod-bounties["'][\s\S]*?<\/section>/i)?.[0] || '';
    assert.match(section, /First listing/);
    assert.match(section, /25 USDC/);
    assert.doesNotMatch(section, /payTo:""/);
    assert.doesNotMatch(section, /\bClaim\b|\bPay\b|log\s*in/i);
  } finally {
    globalThis.fetch = nativeFetch;
  }
}

console.log('demigod html worker: PASS');
