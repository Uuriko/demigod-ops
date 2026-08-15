import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SIMP_BOARD_JS } from './dasha-lobby-static-gen.mjs';

async function readOptional(rel) {
  try {
    return await readFile(new URL(rel, import.meta.url), 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return '';
    throw err;
  }
}

const html = await readFile(new URL('./dasha-landing.html', import.meta.url), 'utf8');
const rendered = '<style>h1,h2,h3{font-family:Exo,sans-serif!important}</style>' + html;
const studio = await readFile(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
const desk = await readOptional('./dasha-desk/src/body.html');
const howto = await readFile(new URL('./dasha-how-to-buy.html', import.meta.url), 'utf8');
const lobbyClient = await readFile(new URL('./dasha-lobby-client.js', import.meta.url), 'utf8');
const simpClient = await readFile(new URL('./dasha-simp-board-client.js', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('./dasha-sitemap.xml', import.meta.url), 'utf8');
const socialCardSource = await readFile(new URL('./dasha-og-card.svg', import.meta.url), 'utf8');
const socialCard = await readFile(new URL('./dasha-og-card.png', import.meta.url));
const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1] || 'null');
assert.equal(jsonLd?.['@type'], 'WebSite');
assert.equal(jsonLd?.sameAs, 'https://x.com/dash_eats');
assert.equal(jsonLd?.about?.identifier?.propertyID, 'Solana mint address');
assert.equal(jsonLd?.about?.identifier?.value, mint);
assert(jsonLd?.about?.sameAs?.every(url => url.includes(mint) || url.startsWith('https://x.com/dash_eats/status/')), 'JSON-LD identity references must preserve the mint or canonical source post');
const negativeCoinCopy = /(?:can|might|could|will) go to zero|go(?:es|ing)? to zero|not financial advice|\bNFA\b|association (?:is|≠) not endorsement|no endorsement|no price promises|culture coin|old coin and Im not the dev|high risk|rugcheck|never trust|wrong one|lookalikes? are (?:easy )?fakes?|token warnings?|make a token safe|lose (?:your )?money|lose it all|worthless|dead coin/i;
for (const [name, source] of Object.entries({ homepage: html, howto, ...(desk ? { desk } : {}), studio, simpClient })) {
  assert(!negativeCoinCopy.test(source), `${name}: negative coin copy returned`);
}
assert(!/(?:can|might|could|will) go to zero|not financial advice|\bNFA\b|culture coin|high risk|never trust|wrong one|lose it all|worthless|dead coin/i.test(lobbyClient), 'lobbyClient: negative coin copy returned');
assert(!negativeCoinCopy.test(socialCardSource) && !/thesis|receipt|forecast/i.test(socialCardSource), 'social card has retired or negative copy');
assert.equal(socialCard.subarray(1, 4).toString(), 'PNG');
assert.equal(socialCard.readUInt32BE(16), 1200);
assert.equal(socialCard.readUInt32BE(20), 630);

assert(!/thesis|receipt-form|telegram/i.test(html), 'retired thesis/Telegram content leaked into homepage');
for (const [name, source] of Object.entries({ homepage: html, howto, ...(desk ? { desk } : {}), studio, lobbyClient, simpClient })) assert(!/dasha\.cam|t\.me\//i.test(source), `${name}: unowned token-profile link returned`);
assert(!/images\.weserv\.nl|files\.catbox\.moe|gpjyb0\.jpg/.test(html), 'old third-party casino hero image returned');
// Curated stills allowed (id=stills + pbs/wikimedia). Ban casino tape hosts and Perry image strip.
assert(!/cdn\.dexscreener\.com|Public tape|Stills from the timeline|Culture tape/.test(html), 'homepage regained retired tape copy');
assert(!/<img\b[^>]*(?:PerryALPHA|Perry)/i.test(html), 'Perry founding spot must not revive the retired image tape');
assert(html.includes('id="stills"') && html.includes('stills-grid'), 'culture stills section missing');
assert(html.includes('hero-still'), 'hero still missing');
assert((html.match(/<img\b/g) || []).length >= 6, 'expected multiple stills');
for (const tag of html.matchAll(/<img\b[^>]*>/g)) {
  assert(/referrerpolicy="no-referrer"/.test(tag[0]), `still missing no-referrer: ${tag[0].slice(0, 80)}`);
  assert(
    /pbs\.twimg\.com|upload\.wikimedia\.org/.test(tag[0]),
    `still host not allowlisted: ${tag[0].slice(0, 100)}`,
  );
}
for (const required of ['$dasha', mint, '/dasha', '/studio', 'Open →', 'Open Studio', 'jup.ag/swap', 'x.com/search', 'geckoterminal.com/solana/pools/']) assert(html.includes(required), `missing ${required}`);
assert(!/<a\b[^>]*href=["']https:\/\/(?:www\.)?dexscreener\.com/i.test(html), 'homepage links stale Dexscreener profile');
assert(!/can go to zero|not financial advice|\bNFA\b|association is not endorsement|old coin and Im not the dev/i.test(html), 'negative coin copy returned');
assert(!/plugin\.jup\.ag|loadJupiter|window\.Jupiter/.test(html), 'homepage must not execute an embedded swap plugin');
assert(html.includes('name=small') && html.includes('fetchpriority="high"'), 'sized hero/stills perf path missing');
assert(!/upload\.wikimedia\.org/.test(html), 'heavy wikimedia still must stay off homepage');
assert(
  html.includes('IntersectionObserver') && html.includes('lobby.getdasha.com/client/simp-board.js'),
  'simp client must lazy-load near #simp',
);
assert(/const SIMP_SRI='sha384-[A-Za-z0-9+/=]+'/.test(html) && html.includes('s.integrity=SIMP_SRI') && html.includes("s.crossOrigin='anonymous'"), 'cross-origin Simp client must be SRI-pinned');
assert(!/Remix this|Remix a story|Change one thing\. Pass it on\.|Steal a signal|Short, deadpan|Sourced from public posts/i.test(html), 'removed explanatory copy returned');
assert(!/poster:after|MAKE IT STRANGER/.test(html), 'hero collage regained its redundant text overlay');
assert(!/A culture coin on Solana|culture coin with an open remix studio|Jupiter swap opens here|The point|A coin is boring|Come make|House rules|exit liquidity for your own brain/i.test(html), 'deleted explanatory copy returned');
assert(!/culture coin (?:behind|powering|required for|unlocks) (?:an |the )?open remix studio/i.test(html), 'homepage implied unsupported Studio token utility');
for (const copy of ['How to buy', 'wallet you control', 'full mint', 'Jupiter']) assert(html.includes(copy), `missing buy guidance: ${copy}`);
assert(!/pump\.fun|phantom\.com\/tokens|raydium\.io\/swap/i.test(html), 'homepage must keep one buy venue');
assert(html.includes('id="buy-sticky"'), 'mobile sticky buy bar missing');
assert(html.includes('Opens Jupiter with SOL and $dasha selected'), 'Jupiter handoff note missing');
assert.match(html, /href=["']\/how-to-buy["']/, 'homepage must crawlably link the live buying guide');
assert.equal([...html.matchAll(/class="buy-guide"/g)].length, 1, 'buy guidance must stay inside one bounded token panel');
assert(!/official Jupiter|official Dasha|safe token|verified mint/i.test(html), 'homepage must not claim official/safe/verified status');
assert(!html.includes('The casino<br>'), 'speculation-first hero returned');
assert(html.includes('https://x.com/dash_eats/status/2085405228078432279'), 'public mint source post missing');
assert(/https:\/\/x\.com\/dash_eats(?!\/status)/.test(html), 'direct @dash_eats profile link missing');
assert(html.includes('id="voice"'), 'public lines voice section missing');
assert(!html.includes('id="dasha-lobby"'), 'lobby must not mount on homepage');
assert(!/discord\.gg|discord\.com\/invite/i.test(html), 'lobby must not link out to Discord');
assert(html.includes('Skip to board') || html.includes('href="#simp"'), 'skip-to-board missing');
assert(html.includes('Skip to mint') || /class="skip"[^>]*href="#token"/.test(html), 'skip-to-mint missing');
assert(html.includes('scroll-margin-top') || html.includes('scroll-padding-top'), 'hash scroll padding missing');
assert(html.includes('href="/lobby"'), 'dedicated lobby discovery links missing');
// Webflow custom-code hard limit — measure UTF-8 bytes (not JS string length).
{
  const landingBytes = Buffer.byteLength(html, 'utf8');
  assert.ok(
    landingBytes <= 49000,
    `landing ${landingBytes}B exceeds Webflow ~49KB custom-code cap`,
  );
  if (landingBytes > 48000) {
    console.warn(
      `landing size soft budget: ${landingBytes}B > 48000B (cap 49000, free ${49000 - landingBytes})`,
    );
  }
}
assert(html.includes('class="pill lobby"'), 'lobby must be a top-level pill control');
assert(/class="pill lobby"[^>]*href="\/lobby"[^>]*>Open lobby/s.test(html), 'hero must link to dedicated lobby');
assert(/"description":"[^"]*Chess[^"]*"/.test(html), 'structured site description must include Chess');
assert(!/discord\.gg|discord\.com\/invite/i.test(html), 'homepage must not advertise Discord invites');
assert(!html.includes('spiny-helmet'), 'temporary lobby host must not remain');
// Opt-in Simp Board (OAuth-linked measured mode) — compact, not nav hero
assert(html.includes('id="simp"'), 'simp board section missing');
assert(html.includes('id="dasha-simp-board"'), 'simp board mount missing');
assert(
  html.includes('DashaSimpBoard') ||
    html.includes('dasha-simp-board-client') ||
    html.includes('lobby.getdasha.com/client/simp-board.js'),
  'simp board client missing',
);
assert(!html.includes('lobby.getdasha.com/client/lobby.js'), 'homepage must not load the lobby client');
assert(
  html.includes('Take the quiz') && html.includes('ranked by lore') && !html.includes('10Q') && !html.includes('20Q'),
  'board intro must name one quiz without Quick/Deep lengths',
);
assert(html.includes('id="oss"'), 'open-source section missing');
assert(html.includes('github.com/Uuriko/dasha-desk/contribute'), 'OSS CTAs must use GitHub /contribute surface');
assert(html.includes('Start with a good first issue'), 'primary OSS CTA should surface good first issues');
assert(html.includes('Contribute on GitHub'), 'contribute-on-GitHub CTA missing');
assert(html.includes('open-source project contributor'), 'aria/copy must say open-source project contributor');
assert(html.includes('How to contribute'), 'how-to-contribute path missing');
assert(html.includes('Propose an idea'), 'propose-an-idea path missing');
assert(!/>Contribute ↗</.test(html), 'ambiguous Contribute-only CTA returned');
// Prefer /contribute over bare repo root for primary contribute pills
assert.equal(
  [...html.matchAll(/href="https:\/\/github\.com\/Uuriko\/dasha-desk\/contribute"/g)].length >= 3,
  true,
  'expected multiple /contribute hrefs (token, oss, endband/footer)',
);
assert(simpClient.includes('Link X to join'), 'board link-state CTA missing in client');
assert(simpClient.includes('Join board'), 'board join-state CTA missing in client');
assert(simpClient.includes('Leave board'), 'board leave-state CTA missing in client');
assert(simpClient.includes('/oauth/x/start') || lobbyClient.includes('/oauth/x/start'), 'board must reuse lobby X OAuth start');
assert(simpClient.includes('/simp/join') && simpClient.includes('/simp/leave') && simpClient.includes('/simp/board'), 'board client must call simp API');
assert(simpClient.includes('@PerryALPHA') || simpClient.includes('PerryALPHA'), 'Perry founding row missing from board client/fallback');
assert(simpClient.includes('Founding simp') || simpClient.includes('editorial'), 'Perry must be labeled editorial founding');
assert(/not a measured|Founding simp · editorial|kind:\s*['"]editorial['"]/i.test(simpClient), 'Perry must not be marked measured');
assert(!/<nav[^>]*>[\s\S]*?(?:Simp|Leaderboard)[\s\S]*?<\/nav>/i.test(html), 'Simp Board must not expand main navigation');
assert.ok(html.indexOf('id="simp"') > html.indexOf('id="lobby"'), 'board should sit after lobby, not replace it');
assert(html.includes('All I want is free healthcare, honey'), 'replacement Dasha line missing');
assert(!html.includes('ENTER THE CULT'),'coercive cult framing returned');
for (const format of ['square','story','banner']) assert(html.includes(`format=${format}`), `missing ${format} starter`);
for (const format of ['square','story','banner']) assert(studio.includes(`id: '${format}'`), `homepage promises ${format}, but Studio cannot render it`);
assert.match(html, /class="micro"[\s\S]*href="\/graph"[^>]*>Graph →</, 'hero micro hops must include Graph');
assert.match(html, /class="micro"[\s\S]*href="\/chess"[^>]*>Chess →</, 'hero micro hops must include Chess');
assert.match(html, /<footer[\s\S]*href="\/graph"[^>]*>Graph</, 'homepage footer must include Graph');
assert.match(html, /<footer[\s\S]*href="\/chess"[^>]*>Chess</, 'homepage footer must include Chess');
assert.doesNotMatch(html, /href=["']https:\/\/lobby\.getdasha\.com\/chess/, 'landing Chess hrefs must be same-origin');
assert.doesNotMatch(html, /href=["']https:\/\/lobby\.getdasha\.com\/forum/, 'landing must not keep leftover Forum hrefs');
assert.doesNotMatch(html.match(/<div class="navlinks">[\s\S]*?<\/div>/)?.[0] || '', /\/graph/, 'Graph stays out of the four-item top nav');
if (desk) {
  for (const fact of [mint, 'jup.ag/swap', 'geckoterminal.com/solana/pools/', 'solscan.io/token/']) assert(desk.toLowerCase().includes(fact.toLowerCase()), `neutral Desk lost required buyer fact: ${fact}`);
  assert(!/<a\b[^>]*href=["']https:\/\/(?:www\.)?dexscreener\.com/i.test(desk), 'Desk links stale Dexscreener profile');
  assert(!/can go to zero|not financial advice|\bNFA\b|association is not endorsement|high risk/i.test(desk), 'negative Desk copy returned');
  assert(!/\braid\b|buy pressure|buys\/hr|buy the dip|referral|telegram|t\.me/i.test(desk), 'Desk reintroduced urgency, raid, referral, or unofficial community mechanics');
}
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).sort(), [
  'https://www.getdasha.com/',
  'https://www.getdasha.com/studio',
  'https://www.getdasha.com/lobby',
  'https://www.getdasha.com/dasha',
  'https://www.getdasha.com/how-to-buy',
  'https://www.getdasha.com/privacy',
  'https://www.getdasha.com/bounties',
  'https://www.getdasha.com/simp',
  'https://www.getdasha.com/verse',
  'https://www.getdasha.com/chess',
  'https://www.getdasha.com/graph',
  'https://www.getdasha.com/learn',
  'https://www.getdasha.com/faucet',
  'https://www.getdasha.com/airdrop',
  'https://www.getdasha.com/earn',
  'https://www.getdasha.com/claim',
].sort(), 'bounded sitemap must list home, studio, lobby, desk, how-to-buy, privacy, bounties, simp, verse, www chess, graph, learn, faucet, and honesty rooms exactly once');
assert.doesNotMatch(sitemap, /forum/i, 'sitemap must not add Forum');
assert.match(sitemap, /\n  <url>\n    <loc>https:\/\/www\.getdasha\.com\/chess<\/loc>\n  <\/url>\n/, 'www chess loc must keep the same indent as other sitemap urls');
assert(!/lastmod|thesis|receipt|forecast/i.test(sitemap), 'sitemap contains stale dates or retired routes');
assert.equal([...html.matchAll(/class="seed"/g)].length, 5, 'homepage must expose one curated seed for every Studio look');
for (const tag of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert(/rel="noopener noreferrer"/.test(tag[0]), `unsafe external link: ${tag[0]}`);

let browser = null;
try {
  const puppeteer = await import('puppeteer-core');
  browser = await puppeteer.default.connect({ browserURL: 'http://127.0.0.1:9223' });
} catch {
  browser = null;
}
if (browser) {
for (const width of [390, 1440]) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', request => request.url().includes('/client/simp-board.js')
      ? request.respond({ contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: SIMP_BOARD_JS })
      : request.continue());
  await page.setContent(rendered, { waitUntil: 'networkidle2' });
  assert.equal(await page.$eval('h1', el => getComputedStyle(el).fontFamily), 'Arial, Helvetica, sans-serif', 'legacy Webflow font overrides homepage h1');
  assert.equal(await page.$eval('#remix h2', el => getComputedStyle(el).fontFamily), 'Arial, Helvetica, sans-serif', 'legacy Webflow font overrides homepage h2');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflows horizontally`);
  assert.deepEqual(await page.$eval('h1', heading => ({ text: heading.innerText.replace(/\s+/g, ' ').trim(), stroke: heading.querySelector('.stroke')?.textContent })), { text: 'MAKE THE TIMELINE STRANGER.', stroke: 'timeline stranger.' }, 'hero lost its product-first promise or emphasis');
  assert.deepEqual(await page.$$eval('.dasha-hero .actions a', links => links.map(link => [link.textContent.trim(), link.classList.contains('primary'), link.classList.contains('lobby')])), [['Open Studio →', true, false], ['Take quiz →', false, false], ['Open lobby →', false, true], ['Buy $dasha ↗', false, false]], 'hero must lead with Studio, then quiz, lobby, and buy');
  assert.ok(await page.$('.hero-still img'), 'hero still image missing');
  assert.ok((await page.$$('#stills .still img')).length >= 6, 'stills grid too thin');
  assert.deepEqual(await page.$$eval('.buy-guide li', steps => steps.map(step => step.textContent.trim())), ['Get SOL in a wallet you control.', 'Match the full mint on this page.', 'Swap on Jupiter.'], 'buy path lost a step');
  assert.ok(await page.$('#buy-sticky'), 'sticky buy bar missing from DOM');
  assert.equal(await page.$eval('.buy-plugin-note', note => getComputedStyle(note).display), 'none', 'obsolete embedded-swap note is visible');
  assert.equal(await page.$eval('.ca', row => { const outer=row.getBoundingClientRect(),button=row.querySelector('.copy').getBoundingClientRect();return button.left >= outer.left && button.right <= outer.right; }), true, `${width}px copy control escaped the mint row`);
  assert.equal(await page.$eval('.buy-guide', guide => { const outer=guide.getBoundingClientRect();return [...guide.querySelectorAll('li')].every(item => { const box=item.getBoundingClientRect();return box.left >= outer.left && box.right <= outer.right; }); }), true, `${width}px buy guidance escaped its panel`);
  assert.deepEqual(await page.$$eval('.poster-tile', links => links.map(link => { const url=new URL(link.getAttribute('href'),'https://www.getdasha.com'),state=new URLSearchParams(url.hash.slice(1));return [state.get('look'),state.get('format'),state.get('line')]; })), [['poster','square','How u crying at the casino and u can’t even get in'],['ticket','story','It’s time $dasha'],['print','square','All I want is free healthcare, honey']], 'hero collage does not open the exact editable artifacts it depicts');
  assert.equal(await page.$$eval('a[href],button', nodes => nodes.filter(node => !node.getAttribute('href') && node.tagName === 'A').length), 0, 'empty clickable link');
  assert.deepEqual(await page.$eval('.navlinks', nav => [...nav.children].map(link => link.textContent.trim())), ['Studio', 'Chess', 'Lobby', 'Buy $dasha ↗'], 'top navigation must stay limited to four durable destinations');
  if (width === 390) assert.deepEqual(await page.$eval('.navlinks', nav => [...nav.children].map(link => [link.textContent.trim(), getComputedStyle(link).display !== 'none'])), [
    ['Studio', false], ['Chess', false], ['Lobby', true], ['Buy $dasha ↗', true],
  ], 'mobile nav must keep Lobby + Buy pills visible');
  if (width === 390) {
    await page.click('.micro a[href="#token"]');
    await page.waitForFunction(() => location.hash === '#token', { timeout: 5000 });
    await page.evaluate(() => document.getElementById('token')?.scrollIntoView({ block: 'start' }));
    await page.waitForFunction(() => document.querySelector('#token').getBoundingClientRect().top < innerHeight, { timeout: 5000 });
    assert.equal(await page.$eval('#mint', node => node.textContent), mint, 'hero verification link did not reach the full mint');
  }
  assert.deepEqual(await page.$$eval('.seed', links => links.map(link => { const url = new URL(link.getAttribute('href'), 'https://www.getdasha.com'), state = new URLSearchParams(url.hash.slice(1)); return [state.get('look'), state.get('format'), state.get('line'), url.search]; })), [
    ['poster', 'square', 'How u crying at the casino and u can’t even get in', ''],
    ['ticket', 'story', 'It’s time $dasha', ''],
    ['print', 'square', 'All I want is free healthcare, honey', ''],
    ['marquee', 'banner', 'Friday in the 4HL you can really feel the pull of the weekend', ''],
    ['signal', 'story', 'Nobody is coming to save the timeline.', ''],
  ], 'curated remix links lost their exact editable state');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.__copied = value; } } }));
  await page.click('.copy');
  await page.waitForFunction(() => window.__copied);
  assert.equal(await page.evaluate(() => window.__copied), mint, 'copy contract button failed');
  const buys = await page.$$eval('a.buy-dasha', links => links.map(a => ({ href: a.href, target: a.target, rel: a.rel })));
  assert.ok(buys.length >= 2, 'homepage lost Buy CTAs');
  for (const buy of buys) {
    assert.ok(buy.href.includes('jup.ag/swap') && buy.href.includes(mint), `Buy CTA lost exact Jupiter mint: ${buy.href}`);
    assert.ok(buy.href.includes('sell=So11111111111111111111111111111111111111112'), `Buy CTA not SOL input: ${buy.href}`);
    assert.deepEqual([buy.target, buy.rel], ['_blank', 'noopener noreferrer'], 'Buy CTA lost safe external-link behavior');
  }
  await page.addScriptTag({path:new URL('./node_modules/axe-core/axe.min.js',import.meta.url).pathname});
  const axe=await page.evaluate(()=>window.axe.run());
  assert.deepEqual(axe.violations.filter(item=>['critical','serious'].includes(item.impact)&&!['document-title','html-has-lang'].includes(item.id)).map(item=>item.id),[],`${width}px accessibility regression`);
  assert.deepEqual(errors, [], `browser errors at ${width}px`);
  await page.close();
}
await browser.disconnect();
}
console.log('dasha landing: static, sitemap, Graph door, and SRI checks passed');
