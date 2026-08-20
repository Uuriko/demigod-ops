import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import workerModule, {
  companiesIndexHtml,
  companyPageHtml,
  injectBountiesBoard,
  isCompaniesPath,
  isCompanyPath,
  isHomePath,
  normalizeBountiesFeed,
  rewriteCdnPin,
  rewriteStaleSnapshotDates,
  stripGoldAccent,
} from './demigod-html-worker.mjs';
import { demigodHomeHtml } from './demigod-home-motley.mjs';

const root = new URL('./', import.meta.url);
const workerSrc = await readFile(new URL('./demigod-html-worker.mjs', root), 'utf8');
const homeSrc = await readFile(new URL('./demigod-home-motley.mjs', root), 'utf8');
const wrangler = await readFile(new URL('./demigod-html-wrangler.jsonc', root), 'utf8');
const dashaWrangler = await readFile(new URL('./dasha-lobby-wrangler.jsonc', root), 'utf8');
const siteMaster = await readFile(new URL('./docs/process/SITE-MASTER-PROMPT.md', root), 'utf8');
const bible = await readFile(new URL('./DEMIGOD-BIBLE.md', root), 'utf8');

const CDN_PIN_FROM = 'e0fe769c0dca9fc8804f6676e928f42092570d6c';
const CDN_PIN_TO = '85246d21f8e0794a45adbe5f9a9ac5b2add0b6d2';
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

const LIVE_MAP_DATE = '2026-08-14';
const LIVE_MAP_GENERATED_AT = '2026-08-14T15:20:31.483Z';
const STALE_ROLES_GENERATED_AT = '2026-08-06T14:33:36.175Z';
const STARTUPS_DATE_FIXTURE = `<!doctype html><html><head><title>Startups</title></head>
<body>
<script id="demigod-public-roles-data">window.__dgPublicRoles={"schema":"demigod.public-roles/1","generatedAt":"${STALE_ROLES_GENERATED_AT}","roles":[{"company":"Affirm","title":"Staff Analytics Analyst","firstObservedAt":"2026-08-06"}]}</script>
<noscript>
<details class="dg-static" data-generated-at="2026-08-02">
<summary>Browse 501 companies with verified open roles in this 2026-08-02 snapshot</summary>
<p>11442 open roles observed 2026-08-02. Counts are a dated snapshot.</p>
<p>Affirm — Staff Analytics Analyst · first observed 2026-08-06</p>
</details>
</noscript>
</body></html>`;

{
  const out = rewriteStaleSnapshotDates(STARTUPS_DATE_FIXTURE);
  assert.doesNotMatch(out, /2026-08-02/);
  assert.match(out, new RegExp(`data-generated-at="${LIVE_MAP_DATE}"`));
  assert.match(out, new RegExp(`${LIVE_MAP_DATE} snapshot`));
  assert.match(out, new RegExp(`observed ${LIVE_MAP_DATE}`));
  assert.match(out, new RegExp(`"generatedAt":"${LIVE_MAP_GENERATED_AT}"`));
  assert.doesNotMatch(out, new RegExp(STALE_ROLES_GENERATED_AT));
  assert.match(out, /"firstObservedAt":"2026-08-06"/);
  assert.match(out, /first observed 2026-08-06/);
  assert.match(out, /Browse 501 companies/);
  assert.equal(rewriteStaleSnapshotDates(out), out);
  assert.equal(rewriteStaleSnapshotDates('<p>no dates</p>'), '<p>no dates</p>');
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
assert.match(workerSrc, /sf-startup-map\.json/);
assert.match(workerSrc, /roles-feed\.json/);
assert.match(workerSrc, /#03140d|#f3f0e7|#10c674/);
assert.match(workerSrc, /demigod-home-motley/);
assert.match(workerSrc, /home-motley/);
assert.doesNotMatch(workerSrc, /cdn\.jsdelivr\.net\/gh\/Uuriko\/demigod-site-cdn@[a-f0-9]{40}\/(sf-startup-map|roles-feed)/);
assert.match(bible, /47e4ad1c-c427-468d-a837-eb46437d634d/);
assert.match(siteMaster, /DEMIGOD-BIBLE\.md/);
assert.doesNotMatch(siteMaster, /Gold `#C9A84C` \/ black \/ stone system consistent/);
assert.doesNotMatch(homeSrc, /Manrope|Cinzel/);
assert.doesNotMatch(homeSrc, /#C9A84C|#10c674|#a6ffcb|#03140d/);
assert.doesNotMatch(homeSrc, /Ellis|3 briefs open|Tech Matched|HIRE TALENT|FIND TALENT/);
assert.match(homeSrc, /How a name moves\./);
assert.match(homeSrc, /Who this is for\./);
assert.match(homeSrc, /The fee\./);
assert.match(homeSrc, /#0d0d0d|#efe8dc|#8a847a/);

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
    const pinned = await workerModule.fetch(new Request('https://www.trydemigod.com/hire'), {});
    const pinnedHtml = await pinned.text();
    assert.equal(pinned.headers.get('x-demigod-edge'), 'html-rewrite');
    assert.doesNotMatch(pinnedHtml, new RegExp(CDN_PIN_FROM));
    assert.equal(pinnedHtml.split(CDN_PIN_TO).length - 1, 3);

    globalThis.fetch = async () => new Response(PIN_FIXTURE(CDN_PIN_TO), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    const alreadyHtml = await (await workerModule.fetch(new Request('https://www.trydemigod.com/hire'), {})).text();
    assert.equal(alreadyHtml.split(CDN_PIN_TO).length - 1, 3);

    const noPin = '<!doctype html><html lang="en"><body><p>no cdn pin</p></body></html>';
    globalThis.fetch = async () => new Response(noPin, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    const bareHtml = await (await workerModule.fetch(new Request('https://www.trydemigod.com/hire'), {})).text();
    assert.doesNotMatch(bareHtml, new RegExp(CDN_PIN_FROM));
    assert.doesNotMatch(bareHtml, new RegExp(CDN_PIN_TO));
    assert.match(bareHtml, /<p>no cdn pin<\/p>/);

    globalThis.fetch = async () => new Response(STARTUPS_DATE_FIXTURE, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    const startups = await workerModule.fetch(new Request('https://www.trydemigod.com/startups'), {});
    const startupsHtml = await startups.text();
    assert.equal(startups.headers.get('x-demigod-edge'), 'html-rewrite');
    assert.doesNotMatch(startupsHtml, /2026-08-02/);
    assert.match(startupsHtml, new RegExp(`"generatedAt":"${LIVE_MAP_GENERATED_AT}"`));
    assert.match(startupsHtml, /"firstObservedAt":"2026-08-06"/);
    const hireDated = await (await workerModule.fetch(new Request('https://www.trydemigod.com/hire'), {})).text();
    assert.doesNotMatch(hireDated, /2026-08-02/);
    assert.match(hireDated, new RegExp(`"generatedAt":"${LIVE_MAP_GENERATED_AT}"`));
    assert.match(hireDated, /first observed 2026-08-06/);
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
      const body = path === '/contact' ? HOME_FIXTURE : BOUNTIES_SHELL;
      return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    };

    const rewritePage = await workerModule.fetch(new Request('https://www.trydemigod.com/contact'), {});
    const rewriteHtml = await rewritePage.text();
    assert.equal(rewritePage.status, 200);
    assert.equal(rewritePage.headers.get('x-demigod-edge'), 'html-rewrite');
    assert.equal(rewritePage.headers.get('x-dasha-edge'), null);
    assert.doesNotMatch(rewriteHtml, /title-accent-gold/);
    const rewriteH1 = rewriteHtml.match(/<h1 class="hero-title">[\s\S]*?<\/h1>/)?.[0] || '';
    assert.doesNotMatch(rewriteH1, /SF Startup Talent/);
    assert.match(rewriteH1, /title-accent-red/);
    assert.match(rewriteH1, /title-accent-blue/);
    assert.doesNotMatch(rewriteHtml, /id="demigod-bounties"/);

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

{
  assert.equal(isHomePath('/'), true);
  assert.equal(isHomePath('/hire'), false);
  assert.equal(isHomePath('/companies'), false);
  assert.equal(isHomePath(''), false);

  const homeHtml = demigodHomeHtml();
  assert.match(homeHtml, /<h1>A motley crew is assembled quietly\.<\/h1>/);
  assert.match(homeHtml, /You’re not filling a seat/);
  assert.match(homeHtml, /CHAPTER ONE/);
  assert.match(homeHtml, /SF BAY AREA/);
  assert.match(homeHtml, /EST\. 2025/);
  assert.match(homeHtml, /href="\/hire">Start a brief</);
  assert.match(homeHtml, /href="\/hire\?wiz=engineer">Join the network</);
  assert.match(homeHtml, /A person reads every brief\./);
  assert.match(homeHtml, /Names move after mutual yes\./);
  assert.match(homeHtml, /CHAPTER TWO/);
  assert.match(homeHtml, /<h2>How a name moves\.<\/h2>/);
  assert.match(homeHtml, /You send a brief\. A person reads it\./);
  assert.match(homeHtml, /CHAPTER THREE/);
  assert.match(homeHtml, /<h2>Who this is for\.<\/h2>/);
  assert.match(homeHtml, /The first engineering seats/);
  assert.match(homeHtml, /CHAPTER FOUR/);
  assert.match(homeHtml, /<h2>The fee\.<\/h2>/);
  assert.match(homeHtml, /10% when you hire\. Nothing until then\./);
  assert.doesNotMatch(homeHtml, /foot-latest|head-latest|Manrope|Cinzel/);
  assert.doesNotMatch(homeHtml, /#C9A84C|#10c674|#a6ffcb|#03140d/);
  assert.doesNotMatch(homeHtml, /Ellis|3 briefs open|1 intro pending|Tech Matched|HIRE TALENT|FIND TALENT/);
  assert.doesNotMatch(homeHtml, /\bMenu\b|statue|pantheon|testimonial|FAQ|\bevents\b|sample roles/i);
  assert.doesNotMatch(homeHtml, /href="\/(?:companies|events|team|faq)"/);
  assert.match(homeHtml, /#0d0d0d|#efe8dc|#8a847a/);
}

{
  const nativeFetch = globalThis.fetch;
  const fetched = [];
  try {
    globalThis.fetch = async (input) => {
      fetched.push(urlOf(input));
      return new Response('webflow home', { status: 200, headers: { 'Content-Type': 'text/html' } });
    };
    for (const host of ['www.trydemigod.com', 'trydemigod.com']) {
      const page = await workerModule.fetch(new Request(`https://${host}/`), {});
      const html = await page.text();
      assert.equal(page.status, 200, host);
      assert.equal(page.headers.get('x-demigod-edge'), 'home-motley');
      assert.equal(page.headers.get('x-dasha-edge'), null);
      assert.match(html, /A motley crew is assembled quietly\./);
      assert.match(html, /You’re not filling a seat/);
      assert.match(html, /Start a brief/);
      assert.match(html, /Join the network/);
      assert.match(html, /A person reads every brief\./);
      assert.match(html, /Names move after mutual yes\./);
      assert.match(html, /How a name moves\./);
      assert.match(html, /Who this is for\./);
      assert.match(html, /The fee\./);
      assert.doesNotMatch(html, /webflow home|foot-latest|head-latest/);
      assert.doesNotMatch(html, /Ellis|3 briefs open|Tech Matched|HIRE TALENT|FIND TALENT/);
      assert.doesNotMatch(html, /#C9A84C|#10c674|#a6ffcb|#03140d/);

      const head = await workerModule.fetch(new Request(`https://${host}/`, { method: 'HEAD' }), {});
      assert.equal(head.status, 200, `${host} HEAD`);
      assert.equal(head.headers.get('x-demigod-edge'), 'home-motley');
      assert.equal(await head.text(), '');
    }
    assert.equal(fetched.length, 0, 'home must not fetch Webflow');
  } finally {
    globalThis.fetch = nativeFetch;
  }
}

{
  assert.equal(isCompaniesPath('/companies'), true);
  assert.equal(isCompaniesPath('/companies/'), true);
  assert.equal(isCompaniesPath('/company'), false);
  assert.equal(isCompaniesPath('/c/yc:abundant'), false);
  assert.equal(isCompaniesPath('/startups'), false);
  assert.equal(isCompanyPath('/c/yc:abundant'), true);
  assert.equal(isCompanyPath('/c/yc:abundant/'), true);
  assert.equal(isCompanyPath('/c/wd:Q16153666'), true);
  assert.equal(isCompanyPath('/c/hn:job-boards.greenhouse.io/verkada'), true);
  assert.equal(isCompanyPath('/c/unknown'), true);
  assert.equal(isCompanyPath('/c/'), false);
  assert.equal(isCompanyPath('/c'), false);
  assert.equal(isCompanyPath('/companies'), false);
  assert.equal(isCompanyPath('/companies/yc:abundant'), false);
}

const TINY_MAP = {
  generatedAt: '2026-08-14T15:20:31.483Z',
  companies: [
    {
      id: 'yc:abundant',
      name: 'Abundant',
      description: 'Agent simulation and RL for researchers',
      website: 'https://www.abundant.ai/',
      source: 'Y Combinator',
      sourceUrl: 'https://www.ycombinator.com/companies/abundant',
      jobsUrl: 'https://jobs.ashbyhq.com/abundant',
      openRoles: 4,
      atsSource: 'Ashby',
      openRolesAt: '2026-08-14',
      roleMix: { operations: 1, product: 1, engineering: 2 },
    },
    {
      id: 'yc:zero',
      name: 'ZeroCorp',
      website: 'https://zero.example/',
      openRoles: 0,
      roleMix: { engineering: 1 },
    },
    {
      id: 'yc:peer-eng',
      name: 'Peer Eng',
      openRoles: 6,
      roleMix: { engineering: 3 },
    },
    {
      id: 'yc:peer-both',
      name: 'Peer Both',
      openRoles: 2,
      roleMix: { engineering: 1, product: 1 },
    },
    {
      id: 'yc:sales-only',
      name: 'Sales Only',
      openRoles: 9,
      roleMix: { sales: 4 },
    },
    {
      id: 'yc:closed-eng',
      name: 'Closed Eng',
      openRoles: 0,
      roleMix: { engineering: 2 },
    },
  ],
};

{
  const html = companiesIndexHtml(TINY_MAP);
  assert.match(html, /Abundant/);
  assert.match(html, /\/c\/yc:abundant/);
  assert.match(html, /Ashby/);
  assert.match(html, /engineering/);
  assert.match(html, /2026-08-14/);
  assert.match(html, /4 hiring companies/);
  assert.doesNotMatch(html, /ZeroCorp/);
  assert.doesNotMatch(html, /Closed Eng/);
  assert.doesNotMatch(html, /we recommend/i);
  assert.doesNotMatch(html, /\bscore\b/i);
  assert.doesNotMatch(html, /#dfff00|#ff3b81|#dasha-bounties/);
  assert.match(html, /Public company facts\. Not a recommendation\./);
}

{
  const many = {
    generatedAt: '2026-08-14T00:00:00.000Z',
    companies: Array.from({ length: 402 }, (_, i) => ({
      id: `yc:co-${String(i).padStart(3, '0')}`,
      name: `Co ${String(i).padStart(3, '0')}`,
      openRoles: i === 0 ? 50 : 1,
      atsSource: 'Ashby',
      roleMix: { engineering: 1 },
    })),
  };
  const html = companiesIndexHtml(many);
  assert.match(html, /Showing 400 of 402 hiring companies/);
  assert.match(html, /Co 000/);
  assert.doesNotMatch(html, /Co 401/);
}

{
  const html = companyPageHtml(TINY_MAP, 'yc:abundant', {
    roles: [
      {
        company: 'Abundant',
        title: 'Founding Engineer',
        location: 'San Francisco',
        url: 'https://jobs.ashbyhq.com/abundant/role-1',
      },
      { company: 'Other Co', title: 'Invented Title', url: 'https://jobs.ashbyhq.com/other/role' },
    ],
  });
  assert.match(html, /<h1>Abundant<\/h1>/);
  assert.match(html, /abundant\.ai/);
  assert.match(html, /https:\/\/www\.abundant\.ai\//);
  assert.match(html, /Y Combinator/);
  assert.match(html, /Ashby/);
  assert.match(html, /https:\/\/jobs\.ashbyhq\.com\/abundant/);
  assert.match(html, /Founding Engineer/);
  assert.doesNotMatch(html, /Invented Title/);
  assert.match(html, /sf-map \+ roleMix overlap/);
  assert.match(html, /Peer Both/);
  assert.match(html, /Peer Eng/);
  assert.doesNotMatch(html, /Sales Only/);
  assert.doesNotMatch(html, /Closed Eng/);
  assert.doesNotMatch(html, /ZeroCorp/);
  const bothAt = html.indexOf('Peer Both');
  const engAt = html.indexOf('Peer Eng');
  assert.ok(bothAt >= 0 && engAt >= 0 && bothAt < engAt);
  assert.doesNotMatch(html, /we recommend/i);
  assert.doesNotMatch(html, /\bscore\b/i);
  assert.match(html, /href="\/companies"/);
  assert.match(html, /href="\/startups"/);
}

{
  const missing = companyPageHtml(TINY_MAP, 'unknown');
  assert.match(missing, /Company not found/);
  assert.doesNotMatch(missing, /abundant\.ai|ycombinator|ashbyhq|invent/i);
  assert.doesNotMatch(missing, /<a href="https?:\/\/(?!www\.trydemigod)/);
  const noMap = companyPageHtml(null, 'yc:abundant');
  assert.match(noMap, /Company not found/);
  assert.doesNotMatch(noMap, /abundant\.ai/);
}

{
  const httpSite = companyPageHtml({
    generatedAt: '2026-08-14T00:00:00.000Z',
    companies: [{
      id: 'wd:Q1',
      name: 'Http Co',
      website: 'http://www.httpco.example/',
      sourceUrl: 'http://example.com/source',
      jobsUrl: 'http://jobs.example.com/httpco',
      openRoles: 1,
      roleMix: { product: 1 },
    }],
  }, 'wd:Q1');
  assert.match(httpSite, /httpco\.example/);
  assert.match(httpSite, /http:\/\/www\.httpco\.example\//);
  assert.doesNotMatch(httpSite, /href="http:/);
}

{
  const noJoin = companyPageHtml(TINY_MAP, 'yc:abundant', {
    roles: [
      { company: 'abundant', title: 'Case Mismatch', url: 'https://jobs.ashbyhq.com/abundant/1' },
      { companyId: 'yc:abundant', company: 'Other', title: 'Id Only', url: 'https://jobs.ashbyhq.com/abundant/2' },
      { company: 'Unrelated', title: 'Ghost Role', url: 'https://jobs.ashbyhq.com/abundant/3' },
    ],
  });
  assert.doesNotMatch(noJoin, /Case Mismatch|Id Only|Ghost Role/);
  assert.match(noJoin, /Roles are on/);
  assert.match(noJoin, /Open roles 4/);
  assert.match(noJoin, /Role mix/);
  assert.match(noJoin, /engineering/);
  assert.match(noJoin, /https:\/\/jobs\.ashbyhq\.com\/abundant/);
}

{
  const xssMap = {
    generatedAt: '2026-08-14T00:00:00.000Z',
    companies: [{
      id: 'yc:xss',
      name: '<script>alert(1)</script>',
      description: '<img src=x onerror=alert(2)>',
      website: 'https://xss.example/',
      openRoles: 3,
      atsSource: '<svg onload=alert(3)>',
      roleMix: { 'engineering<script>': 1 },
    }],
  };
  const index = companiesIndexHtml(xssMap);
  const page = companyPageHtml(xssMap, 'yc:xss');
  for (const html of [index, page]) {
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  }
  assert.doesNotMatch(page, /<img src=x/);
  assert.match(page, /&lt;img src=x onerror=alert\(2\)&gt;/);
}

{
  const nativeFetch = globalThis.fetch;
  const fetched = [];
  try {
    globalThis.fetch = async (input) => {
      const u = urlOf(input);
      fetched.push(u);
      if (u.includes('sf-startup-map.json')) {
        assert.match(u, new RegExp(CDN_PIN_TO));
        return new Response(JSON.stringify(TINY_MAP), { headers: { 'Content-Type': 'application/json' } });
      }
      if (u.includes('roles-feed.json')) {
        assert.match(u, new RegExp(CDN_PIN_TO));
        return new Response(JSON.stringify({
          roles: [{ company: 'Abundant', title: 'Founding Engineer', url: 'https://jobs.ashbyhq.com/abundant/role-1' }],
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('webflow miss', { status: 404, headers: { 'Content-Type': 'text/html' } });
    };

    for (const path of ['/companies', '/companies/']) {
      const page = await workerModule.fetch(new Request(`https://www.trydemigod.com${path}`), {});
      const html = await page.text();
      assert.equal(page.status, 200, path);
      assert.equal(page.headers.get('x-demigod-edge'), 'companies');
      assert.match(html, /Abundant/);
      assert.doesNotMatch(html, /ZeroCorp/);
      assert.doesNotMatch(html, /webflow miss/);
    }

    for (const host of ['www.trydemigod.com', 'trydemigod.com']) {
      const found = await workerModule.fetch(new Request(`https://${host}/c/yc:abundant`), {});
      const foundHtml = await found.text();
      assert.equal(found.status, 200, host);
      assert.equal(found.headers.get('x-demigod-edge'), 'company');
      assert.match(foundHtml, /<h1>Abundant<\/h1>/);
      assert.match(foundHtml, /Founding Engineer/);
      assert.doesNotMatch(foundHtml, /webflow miss/);
    }

    const encoded = await workerModule.fetch(new Request('https://www.trydemigod.com/c/yc%3Aabundant'), {});
    assert.equal(encoded.status, 200);
    assert.match(await encoded.text(), /<h1>Abundant<\/h1>/);

    const missing = await workerModule.fetch(new Request('https://www.trydemigod.com/c/unknown'), {});
    const missingHtml = await missing.text();
    assert.equal(missing.status, 404);
    assert.match(missingHtml, /Company not found/);
    assert.doesNotMatch(missingHtml, /abundant\.ai|ycombinator|ashbyhq/i);
    assert.doesNotMatch(missingHtml, /webflow miss/);

    const slashId = await workerModule.fetch(new Request('https://www.trydemigod.com/c/hn:job-boards.greenhouse.io/verkada'), {});
    assert.equal(slashId.headers.get('x-demigod-edge'), 'company');
    assert.doesNotMatch(await slashId.text(), /webflow miss/);

    assert.equal(fetched.every((u) => u.includes('cdn.jsdelivr.net') && !/trydemigod\.com/.test(u)), true);
  } finally {
    globalThis.fetch = nativeFetch;
  }
}

console.log('demigod html worker: PASS');
