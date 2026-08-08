import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const html = await readFile(new URL('./dasha-landing.html', import.meta.url), 'utf8');
const rendered = '<style>h1,h2,h3{font-family:Exo,sans-serif!important}</style>' + html;
const studio = await readFile(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
const desk = await readFile(new URL('./dasha-desk/src/body.html', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('./dasha-sitemap.xml', import.meta.url), 'utf8');
const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';

assert(!/thesis|receipt-form|telegram/i.test(html), 'retired thesis/Telegram content leaked into homepage');
assert(!/images\.weserv\.nl|files\.catbox\.moe|gpjyb0\.jpg/.test(html), 'old third-party casino hero image returned');
assert(!/<img\b|pbs\.twimg\.com|cdn\.dexscreener\.com|PerryALPHA|Public tape|Stills from the timeline|Culture tape/.test(html), 'homepage gained a brittle or implied-curation image tape');
for (const required of ['$dasha', mint, '/dasha', '/studio', 'Remix this', 'Remix a story', 'jup.ag/swap', 'plugin.jup.ag/plugin-v1.js', 'x.com/search', 'dexscreener.com', 'Can go to zero']) assert(html.includes(required), `missing ${required}`);
assert(/<script src="https:\/\/plugin\.jup\.ag\/plugin-v1\.js" data-preload defer><\/script>/.test(html), 'Jupiter Plugin lost its documented preload/defer path');
assert(html.includes('Change one thing. Pass it on.'), 'missing concrete product copy');
assert(!/poster:after|MAKE IT STRANGER/.test(html), 'hero collage regained its redundant text overlay');
assert(!/A culture coin on Solana|culture coin with an open remix studio|Jupiter swap opens here|The point|A coin is boring|Come make|House rules|exit liquidity for your own brain/i.test(html), 'deleted explanatory copy returned');
assert(!/culture coin (?:behind|powering|required for|unlocks) (?:an |the )?open remix studio/i.test(html), 'homepage implied unsupported Studio token utility');
for (const copy of ['How to buy', 'self-custody wallet', 'Confirm the mint', 'Swap through <strong>Jupiter</strong>', 'Never use a mint from DMs']) assert(html.includes(copy), `missing qualified buy guidance: ${copy}`);
assert(!html.includes('/how-to-buy'), 'homepage links to the unpublished how-to-buy route');
assert.equal([...html.matchAll(/class="buy-guide"/g)].length, 1, 'buy guidance must stay inside one bounded token panel');
assert(!/official Jupiter|official Dasha|safe token|verified mint/i.test(html), 'homepage must not claim official/safe/verified status');
assert(!html.includes('The casino<br>'), 'speculation-first hero returned');
assert(html.includes('https://x.com/dash_eats/status/2085405228078432279'), 'public mint source post missing');
assert(/https:\/\/x\.com\/dash_eats(?!\/status)/.test(html), 'direct @dash_eats profile link missing');
assert(html.includes('id="voice"'), 'public lines voice section missing');
assert(html.includes('old coin and Im not the dev'), 'not-the-dev honesty line missing');
assert(html.includes('Association is not endorsement'), 'mint provenance must not imply endorsement');
assert(!html.includes('ENTER THE CULT'),'coercive cult framing returned');
for (const format of ['square','story','banner']) assert(html.includes(`format=${format}`), `missing ${format} starter`);
for (const format of ['square','story','banner']) assert(studio.includes(`id: '${format}'`), `homepage promises ${format}, but Studio cannot render it`);
for (const fact of [mint, 'jup.ag/swap', 'dexscreener.com', 'solscan.io/token/', 'rugcheck.xyz/tokens/', 'can go to zero']) assert(desk.toLowerCase().includes(fact.toLowerCase()), `neutral Desk lost required buyer fact: ${fact}`);
assert(!/\braid\b|buy pressure|buys\/hr|buy the dip|referral|telegram|t\.me/i.test(desk), 'Desk reintroduced urgency, raid, referral, or unofficial community mechanics');
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), ['https://www.getdasha.com/','https://www.getdasha.com/studio','https://www.getdasha.com/dasha'], 'bounded sitemap must contain only the three intended canonical public routes');
assert(!/lastmod|thesis|receipt|forecast/i.test(sitemap), 'sitemap contains stale dates or retired routes');
assert.equal([...html.matchAll(/class="seed"/g)].length, 5, 'homepage must expose one curated seed for every Studio look');
for (const tag of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert(/rel="noopener noreferrer"/.test(tag[0]), `unsafe external link: ${tag[0]}`);

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
for (const width of [390, 1440]) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', request => request.url().includes('plugin.jup.ag/plugin-v1.js')
    ? request.respond({ contentType: 'application/javascript', body: 'window.Jupiter={init:config=>window.__jupiterConfig=config}' })
    : request.continue());
  await page.setContent(rendered, { waitUntil: 'networkidle2' });
  assert.equal(await page.$eval('h1', el => getComputedStyle(el).fontFamily), 'Arial, Helvetica, sans-serif', 'legacy Webflow font overrides homepage h1');
  assert.equal(await page.$eval('#remix h2', el => getComputedStyle(el).fontFamily), 'Arial, Helvetica, sans-serif', 'legacy Webflow font overrides homepage h2');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflows horizontally`);
  assert.deepEqual(await page.$eval('h1', heading => ({ text: heading.innerText.replace(/\s+/g, ' ').trim(), stroke: heading.querySelector('.stroke')?.textContent })), { text: 'MAKE THE TIMELINE STRANGER.', stroke: 'timeline stranger.' }, 'hero lost its product-first promise or emphasis');
  assert.deepEqual(await page.$$eval('.dasha-hero .actions a', links => links.map(link => [link.textContent.trim(), link.classList.contains('primary')])), [['Remix a story →', true], ['Buy $dasha ↗', false]], 'hero must make the product primary without removing the qualified buy path');
  assert.deepEqual(await page.$$eval('.buy-guide li', steps => steps.map(step => step.textContent.trim())), ['Get SOL in a self-custody wallet.', 'Confirm the mint matches the exact address above.', 'Swap through Jupiter using the button above or direct link.'], 'qualified buy path lost a step');
  assert.equal(await page.$eval('.ca', row => { const outer=row.getBoundingClientRect(),button=row.querySelector('.copy').getBoundingClientRect();return button.left >= outer.left && button.right <= outer.right; }), true, `${width}px copy control escaped the mint row`);
  assert.equal(await page.$eval('.buy-guide', guide => { const outer=guide.getBoundingClientRect();return [...guide.querySelectorAll('li')].every(item => { const box=item.getBoundingClientRect();return box.left >= outer.left && box.right <= outer.right; }); }), true, `${width}px buy guidance escaped its panel`);
  assert.deepEqual(await page.$$eval('.poster-tile', links => links.map(link => { const url=new URL(link.getAttribute('href'),'https://www.getdasha.com'),state=new URLSearchParams(url.hash.slice(1));return [state.get('look'),state.get('format'),state.get('line')]; })), [['poster','square','The timeline needs adult supervision.'],['ticket','story','I came for the chart. I stayed for the bit.'],['signal','story','Nobody is coming to save the timeline.']], 'hero collage does not open the exact editable artifacts it depicts');
  assert.equal(await page.$$eval('a[href],button', nodes => nodes.filter(node => !node.getAttribute('href') && node.tagName === 'A').length), 0, 'empty clickable link');
  if (width === 390) assert.deepEqual(await page.$eval('.navlinks', nav => [...nav.children].map(link => [link.textContent.trim(), getComputedStyle(link).display !== 'none'])), [
    ['Studio', false], ['@dash_eats ↗', false], ['Mint', false], ['Desk', false], ['Buy $dasha ↗', true],
  ], 'mobile nav must keep only the verified buy handoff visible');
  if (width === 390) {
    await page.click('.micro a');
    await page.waitForFunction(() => location.hash === '#token' && document.querySelector('#token').getBoundingClientRect().top < innerHeight);
    assert.equal(await page.$eval('#mint', node => node.textContent), mint, 'hero verification link did not reach the full mint');
  }
  assert.deepEqual(await page.$$eval('.seed', links => links.map(link => { const url = new URL(link.getAttribute('href'), 'https://www.getdasha.com'), state = new URLSearchParams(url.hash.slice(1)); return [state.get('look'), state.get('format'), state.get('line'), url.search]; })), [
    ['poster', 'square', 'The timeline needs adult supervision.', ''],
    ['ticket', 'story', 'I came for the chart. I stayed for the bit.', ''],
    ['print', 'square', 'No roadmap. Just a signal.', ''],
    ['marquee', 'banner', 'Stay weird. Verify the mint.', ''],
    ['signal', 'story', 'Nobody is coming to save the timeline.', ''],
  ], 'curated remix links lost their exact editable state');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.__copied = value; } } }));
  await page.click('.copy');
  await page.waitForFunction(() => window.__copied);
  assert.equal(await page.evaluate(() => window.__copied), mint, 'copy contract button failed');
  await page.click('.buy-dasha');
  assert.deepEqual(await page.evaluate(() => ({
    input: window.__jupiterConfig?.formProps.initialInputMint,
    output: window.__jupiterConfig?.formProps.initialOutputMint,
    fixed: window.__jupiterConfig?.formProps.fixedMint,
  })), { input: 'So11111111111111111111111111111111111111112', output: mint, fixed: mint }, 'Jupiter buy modal is not pinned to SOL → $dasha');
  await page.addScriptTag({path:new URL('./node_modules/axe-core/axe.min.js',import.meta.url).pathname});
  const axe=await page.evaluate(()=>window.axe.run());
  assert.deepEqual(axe.violations.filter(item=>['critical','serious'].includes(item.impact)&&!['document-title','html-has-lang'].includes(item.id)).map(item=>item.id),[],`${width}px accessibility regression`);
  assert.deepEqual(errors, [], `browser errors at ${width}px`);
  await page.close();
}
// Plugin blocked: every Buy CTA must keep exact Jupiter deep link (no dead click when Jupiter.init is absent).
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', request => request.url().includes('plugin.jup.ag/plugin-v1.js')
    ? request.respond({ status: 503, contentType: 'text/plain', body: 'blocked' })
    : request.continue());
  await page.setContent(rendered, { waitUntil: 'domcontentloaded' });
  const buys = await page.$$eval('a.buy-dasha', links => links.map(a => a.href));
  assert.ok(buys.length >= 2, 'homepage lost Buy CTAs');
  for (const href of buys) {
    assert.ok(href.includes('jup.ag/swap'), `Buy CTA not Jupiter: ${href}`);
    assert.ok(href.includes(mint), `Buy CTA missing exact mint: ${href}`);
    assert.ok(href.includes('sell=So11111111111111111111111111111111111111112'), `Buy CTA not SOL input: ${href}`);
  }
  assert.equal(await page.evaluate(() => !!window.Jupiter?.init), false, 'blocked plugin unexpectedly installed Jupiter');
  await page.close();
}
await browser.disconnect();
console.log('dasha landing: static, mobile, desktop, links, copy, Jupiter modal, and plugin-blocked buy fallback checks passed');
