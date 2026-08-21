import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { settleMotion } from './dasha-motion-settle.mjs';

const html = await readFile(new URL('./dasha-landing.html', import.meta.url), 'utf8');
const rendered = '<style>h1,h2,h3{font-family:Exo,sans-serif!important}a,strong,code{color:#10051d!important}</style>' + html;
const studio = await readFile(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
const desk = await readFile(new URL('./dasha-desk/src/body.html', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('./dasha-sitemap.xml', import.meta.url), 'utf8');
const notFound = await readFile(new URL('./dasha-404.html', import.meta.url), 'utf8');
const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const sol = 'So11111111111111111111111111111111111111112';
const navHtml = html.match(/<nav class="nav wrap"[\s\S]*?<\/nav>/)?.[0] || '';

assert(!/thesis|receipt-form|telegram/i.test(html), 'retired thesis/Telegram content leaked into homepage');
assert(!/images\.weserv\.nl|files\.catbox\.moe|gpjyb0\.jpg/.test(html), 'old third-party casino hero image returned');
assert(!/<img\b|pbs\.twimg\.com|cdn\.dexscreener\.com|Public tape|Stills from the timeline|Culture tape/.test(html), 'homepage gained a brittle or implied-curation image tape');
assert(!/<img\b[^>]*(?:PerryALPHA|Perry)/i.test(html), 'Perry founding spot must not revive the retired image tape');
for (const required of ['$dasha', mint, '/dasha', '/studio', '/lobby', 'href="/simp"', 'Make something', 'Simp board', 'Contribute', 'jup.ag/swap', 'geckoterminal.com', 'id="chess-door"', 'Dasha vs Anna', 'href="/chess"', 'www.getdasha.com/chess', 'id="grwm"', 'grwm-loop.mp4', 'Play GRWM']) assert(html.includes(required), `missing ${required}`);
assert.doesNotMatch(html, /lobby\.getdasha\.com\/chess/, 'Home must link and share the canonical www Chess URL');
assert.match(html, /prefers-reduced-motion:reduce[\s\S]*grwm[\s\S]*removeAttribute\('autoplay'\)|matchMedia\('\(prefers-reduced-motion:reduce\)'\)/, 'GRWM must not autoplay when the visitor asked for less motion');
assert(!html.includes('id="dasha-simp-board"') && !html.includes('/client/simp-board.js'), 'Home must link to the first-class Simp Board without embedding it');
assert(/location\.hash==='\#simp'.*q\.has\('quiz'\).*q\.has\('challenge'\).*location\.replace\('\/simp'\+location\.search\)/.test(html), 'legacy Home Simp links must redirect to /simp and preserve the query');
assert(!/plugin\.jup\.ag|window\.Jupiter|Jupiter\.init/.test(html), 'unpinned Jupiter code returned; Buy must stay an exact external link');
assert(!/poster:after|MAKE IT STRANGER/.test(html), 'hero collage regained its redundant text overlay');
assert(!/A culture coin on Solana|culture coin with an open remix studio|Jupiter swap opens here|The point|A coin is boring|Come make|House rules|exit liquidity for your own brain/i.test(html), 'deleted explanatory copy returned');
assert(!/culture coin (?:behind|powering|required for|unlocks) (?:an |the )?open remix studio/i.test(html), 'homepage implied unsupported Studio token utility');
assert(!/self-custody wallet|Confirm the mint|Swap through <strong>Jupiter<\/strong>/.test(html), 'explanatory buy tutorial returned');
assert(!/wrong one|never trust|fakes exist|old coin|not the dev/i.test(html), 'negative coin copy returned');
assert(html.includes('href="/how-to-buy"') && !html.includes('href="/rally"'), 'homepage route set drifted');
assert.match(html, /class="navlinks"[^>]*>[\s\S]*href="\/how-to-buy"/, 'first-paint nav must expose the buy guide');
assert.doesNotMatch(navHtml, /buy-dasha/, 'nav must not duplicate the mint-adjacent Buy action');
assert.match(html, /class="linkrow"[^>]*>[\s\S]*href="\/how-to-buy"/, 'mint card must link How to buy at the swap moment');
assert.match(html, /class="linkrow"[^>]*>[\s\S]*href="\/simp#holder"[^>]*aria-label="[^"]*current \$dasha holder proof[^"]*zero Simp Points"[^>]*>24h holder perks: Chess \+ chat<\/a>/,
  'the mint card must expose existing score-neutral holder utility without another button');
assert(!html.includes('class="buy-guide"'), 'removed buy guide returned');
assert.ok(notFound.includes(`jup.ag/swap?sell=${sol}&amp;buy=${mint}`), '404 Buy must use exact wrapped-SOL + mint');
assert.ok(!notFound.includes('So11111111111111111111111111111111111112&'), '404 must not truncate wrapped SOL');
assert(!/official Jupiter|official Dasha|safe token|verified mint/i.test(html), 'homepage must not claim official/safe/verified status');
assert(!html.includes('The casino<br>'), 'speculation-first hero returned');
assert(html.includes('https://x.com/dash_eats/status/2085405228078432279'), 'public mint source post missing');
assert(/https:\/\/x\.com\/dash_eats(?!\/status)/.test(html), 'direct @dash_eats profile link missing');
assert(!html.includes('id="voice"'), 'voice explanation section returned');
assert(!/old coin|not the dev/i.test(html), 'negative coin joke returned');
assert(!html.includes('ENTER THE CULT'),'coercive cult framing returned');
for (const format of ['square','story','banner']) assert(html.includes(`format=${format}`), `missing ${format} starter`);
for (const format of ['square','story','banner']) assert(studio.includes(`id: '${format}'`), `homepage promises ${format}, but Studio cannot render it`);
for (const fact of [mint, 'jup.ag/swap', 'geckoterminal.com', 'solscan.io/token/']) assert(desk.toLowerCase().includes(fact.toLowerCase()), `neutral Desk lost required buyer fact: ${fact}`);
assert(!/rugcheck|source, risk/i.test(desk), 'negative Desk risk framing returned');
assert(!/href="https:\/\/dexscreener\.com/i.test(desk), 'Desk exposes the editable Dexscreener profile instead of the canonical pool chart');
const tape = desk.match(/<section class="dd-tape[\s\S]*?<\/section>/)?.[0] || '';
assert.equal([...tape.matchAll(/<a\b[^>]*aria-label=/g)].length, 6, 'every clickable Desk still needs an accessible name');
assert(!/\braid\b|buy pressure|buys\/hr|buy the dip|referral|telegram|t\.me/i.test(desk), 'Desk reintroduced urgency, raid, referral, or unofficial community mechanics');
/* Chess joined this list on 2026-08-10. It is a real public route — games, ratings, shareable
   challenges — and it had been in the live sitemap for a while before this file's copy caught up.
   It is listed on lobby.getdasha.com because that is the host its page declares canonical, and a
   sitemap entry that disagrees with a page's own canonical only asks a crawler to pick between them.
   The list stays exact rather than becoming a length check: the point is that adding or dropping a
   public route is a deliberate edit here, not something that happens quietly somewhere else. */
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), ['https://www.getdasha.com/','https://www.getdasha.com/simp','https://www.getdasha.com/studio','https://www.getdasha.com/lobby','https://www.getdasha.com/dasha','https://www.getdasha.com/faucet','https://www.getdasha.com/bounties','https://www.getdasha.com/contribute','https://www.getdasha.com/how-to-buy','https://www.getdasha.com/privacy','https://www.getdasha.com/chess','https://www.getdasha.com/which','https://www.getdasha.com/llms.txt','https://www.getdasha.com/llms-full.txt','https://www.getdasha.com/ai.txt'], 'bounded sitemap must contain the intended canonical public routes');
assert(!html.includes('href="/faq"'), 'home must not advertise the removed faq route');
assert(html.includes('href="/lobby"'), 'home footer must open the official room');
assert(!html.includes('lobby.getdasha.com/forum'), 'forum is the lobby — no second community door');
assert(!/lastmod|thesis|receipt|forecast/i.test(sitemap), 'sitemap contains stale dates or retired routes');
assert(!/<priority>|<changefreq>/.test(sitemap), 'sitemap restored crawler hints Google ignores');
assert.equal([...html.matchAll(/class="poster-tile"/g)].length, 3, 'homepage must stay to three concise editable lines');
for (const tag of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert(/rel="noopener noreferrer"/.test(tag[0]), `unsafe external link: ${tag[0]}`);

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
for (const width of [320, 390, 1440]) {
  const page = await browser.newPage();
  await settleMotion(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height: 900 });
  await page.setContent(rendered, { waitUntil: 'networkidle2' });
  assert.equal(await page.$eval('h1', el => getComputedStyle(el).fontFamily), 'Arial, Helvetica, sans-serif', 'legacy Webflow font overrides homepage h1');
  assert.equal(await page.$eval('#simp-door h2', el => getComputedStyle(el).fontFamily), 'Arial, Helvetica, sans-serif', 'legacy Webflow font overrides homepage h2');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflows horizontally`);
  assert.deepEqual(await page.$eval('h1', heading => ({ text: heading.innerText.replace(/\s+/g, ' ').trim(), stroke: heading.querySelector('.stroke')?.textContent })), { text: 'It’s time $dasha.', stroke: '$dasha.' }, 'hero lost its sourced voice or emphasis');
  /* Shape pinned, wording not. This asserted the literal 'Contribute ↗' until the label was
     qualified to 'Contribute to open source ↗' — on a page with a Buy button elsewhere, a bare
     "Contribute" reads as a request for money, which is the one thing this site must never imply by
     accident. The structure is what protects the hero: exactly two actions, the product one primary,
     the contribution one not, and the second must still say what it is. Same reasoning as the
     meaning-not-phrasing check in dasha-studio-embed.test.mjs. */
  const heroActions = await page.$$eval('.dasha-hero .actions a', links => links.map(link => ({ text: link.textContent.trim(), primary: link.classList.contains('primary'), href: link.getAttribute('href') || '' })));
  assert.equal(heroActions.length, 2, `hero must keep exactly two actions, found ${heroActions.length}`);
  assert.deepEqual([heroActions[0].text, heroActions[0].primary], ['Make something →', true], 'hero lost its one primary product action');
  assert.equal(heroActions[1].primary, false, 'the contribution link must not compete with the product action');
  assert.match(heroActions[1].text, /contribute/i, 'hero lost its contribution path');
  assert.match(heroActions[1].text, /open source|code|github/i, `the hero contribution label must say what is being contributed — got "${heroActions[1].text}"`);
  assert.equal(heroActions[1].href, '/contribute', 'the contribution link must open the first-party onboarding page');
  assert.equal(await page.$eval('body', el => parseFloat(getComputedStyle(el).fontSize) >= 16), true, 'body copy fell below readable size');
  assert.equal(await page.$eval('footer', el => parseFloat(getComputedStyle(el).fontSize) >= 14), true, 'footer risk copy fell below readable size');
  for (const selector of ['.ca code', '.linkrow a', 'footer a']) assert.equal(await page.$eval(selector, el => getComputedStyle(el).color), 'rgb(244, 237, 219)', `${selector} lost contrast under legacy Webflow styles`);
  assert.equal(await page.$eval('main', el => el.innerText.trim().split(/\s+/).length < 180), true, 'homepage chrome became text-heavy again');
  assert.equal(await page.$eval('.ca', row => { const outer=row.getBoundingClientRect(),button=row.querySelector('.copy').getBoundingClientRect();return button.left >= outer.left && button.right <= outer.right; }), true, `${width}px copy control escaped the mint row`);
  assert.equal(await page.$eval('.ca', row => { const card=row.closest('.contract').getBoundingClientRect(),box=row.getBoundingClientRect();return box.left >= card.left && box.right <= card.right; }), true, `${width}px mint row escaped the contract card`);
  assert.equal(await page.$eval('#simp-door', section => section.scrollWidth <= section.clientWidth), true, `${width}px Simp Board door overflows its section`);
  assert.match(await page.$eval('#simp-door .door-line', el => el.textContent), /quiz|row/i, 'Simp door must say what the board is, not only name it');
  assert.equal(await page.$eval('#simp-door a.pill', a => a.getAttribute('href')), '/simp', 'Simp door CTA must open /simp');
  assert.equal(await page.$eval('#chess-door', section => section.scrollWidth <= section.clientWidth), true, `${width}px chess door overflows its section`);
  assert.match(await page.$eval('#chess-door .door-line', el => el.textContent), /link|Anna/i, 'chess door must say the share is a game for two');
  assert.equal(await page.$eval('#chess-door a.pill.primary', a => a.getAttribute('href')), '/chess', 'chess door must open the canonical site page');
  assert.ok(await page.$('#chess-copy'), 'chess door must expose Copy challenge link on first paint');
  assert.equal(await page.$$eval('a.buy-dasha', links => links.length), 1, 'home must expose one Buy action');
  assert.equal(await page.$$eval('.navlinks a.buy-dasha', links => links.length), 0, 'nav must stay free of a duplicate Buy action');
  assert.deepEqual(await page.$$eval('.poster-tile', links => links.map(link => { const url=new URL(link.getAttribute('href'),'https://www.getdasha.com'),state=new URLSearchParams(url.hash.slice(1));return [state.get('look'),state.get('format'),state.get('line')]; })), [['poster','square','How u crying at the casino and u can’t even get in'],['ticket','story','It’s time $dasha'],['signal','banner','Well im still alive']], 'hero collage does not open the exact sourced editable lines it depicts');
  assert.equal(await page.$$eval('a[href],button', nodes => nodes.filter(node => !node.getAttribute('href') && node.tagName === 'A').length), 0, 'empty clickable link');
  if (width === 390) assert.deepEqual(await page.$eval('.navlinks', nav => [...nav.children].map(link => [link.textContent.trim(), getComputedStyle(link).display !== 'none'])), [
    ['Studio', false], ['Lobby', false], ['CA 53ux…pump', false], ['How to buy', false], ['Log in', true],
  ], 'mobile nav must keep login visible while Buy stays beside the full mint');
  if (width === 390) {
    await page.$eval('#token', section => section.scrollIntoView());
    await page.waitForFunction(() => document.querySelector('#token').getBoundingClientRect().top < innerHeight);
    assert.equal(await page.$eval('#mint', node => node.textContent), mint, 'mobile scroll did not reach the full mint');
  }
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.__copied = value; } } }));
  await page.click('.copy');
  await page.waitForFunction(() => window.__copied);
  assert.equal(await page.evaluate(() => window.__copied), mint, 'copy contract button failed');
  if (width === 390) {
    await page.evaluate(() => { navigator.clipboard.writeText = () => new Promise(() => {}); });
    await page.click('#chess-copy');
    await page.waitForFunction(() => /select/i.test(document.querySelector('#chess-copy').textContent), { timeout: 2000 });
  }
  await page.addScriptTag({path:new URL('./node_modules/axe-core/axe.min.js',import.meta.url).pathname});
  const axe=await page.evaluate(()=>window.axe.run());
  assert.deepEqual(axe.violations.filter(item=>['critical','serious'].includes(item.impact)&&!['document-title','html-has-lang'].includes(item.id)).map(item=>item.id),[],`${width}px accessibility regression`);
  assert.deepEqual(errors, [], `browser errors at ${width}px`);
  await page.close();
}
// Every Buy CTA is a plain exact-mint Jupiter link; no wallet-capable script runs in Dasha's origin.
{
  const page = await browser.newPage();
  await settleMotion(page);
  await page.setViewport({ width: 390, height: 900 });
  await page.setContent(rendered, { waitUntil: 'domcontentloaded' });
  const buys = await page.$$eval('a.buy-dasha', links => links.map(a => a.href));
  assert.equal(buys.length, 1, 'homepage must keep one mint-adjacent Buy CTA');
  for (const href of buys) {
    assert.ok(href.includes('jup.ag/swap'), `Buy CTA not Jupiter: ${href}`);
    assert.ok(href.includes(mint), `Buy CTA missing exact mint: ${href}`);
    assert.ok(href.includes('sell=So11111111111111111111111111111111111111112'), `Buy CTA not SOL input: ${href}`);
  }
  await page.close();
}
await browser.disconnect();
console.log('dasha landing: static, mobile, desktop, links, copy, and script-free Jupiter handoff passed');
