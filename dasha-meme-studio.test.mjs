import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const axeSrc = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const html = await readFile(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
const webflowHelper = await readFile(new URL('./dasha-call-webflow-mcp.mjs', import.meta.url), 'utf8');
const rendered = html.replace('</head>', '<style>h1,label,.eyebrow{color:#4f70df}</style></head>');
// Word-bounded: the bare substring also matched "hypothesis" and "synthesis" in ordinary prose,
// which fails the gate for a leak that is not there. Still catches "Thesis Card"/"receipt".
assert(!/\b(thesis|receipt|telegram)\b/i.test(html), 'scrapped or unofficial product leaked into studio');
/* Remote images used to be banned outright, because a strip of hotlinked thumbnails is brittle and
   was never worth the dependency. The operator decided on 2026-08-08 to keep a photo gallery and
   narrow the CC0 claim instead, so the rule became an allowlist rather than a prohibition: the hosts
   the gallery uses are named, and anything else still fails. dexscreener stays banned outright — a
   live chart image is a different thing from a picture, and it rots on someone else's schedule. */
const PHOTO_HOSTS = /^https:\/\/(pbs\.twimg\.com|static1\.squarespace\.com|www\.moviemaker\.com|m\.media-amazon\.com|br\.web\.img2\.acsta\.net|avatars\.mds\.yandex\.net|upload\.wikimedia\.org)\//;
assert(!/cdn\.dexscreener\.com/.test(html), 'Studio gained a live chart image, which rots on someone else\u2019s schedule');
const remoteImages = [...html.matchAll(/https?:\/\/[^\s"'`)<>]+\.(?:jpe?g|png|gif|webp)(?:\?[^\s"'`)<>]*)?/gi)].map((m) => m[0]);
const strangers = [...new Set(remoteImages.filter((u) => !PHOTO_HOSTS.test(u)))];
assert.deepEqual(strangers, [], `Studio pulls images from a host nobody approved: ${strangers.join(', ')}`);
/* And the drawn looks must not depend on any of it. A photo failing to load is normal — the host can
   block us or delete the post — and when it does, every other look still has to work. */
assert(/crossOrigin/.test(html), 'gallery images must be loaded with crossOrigin, or export taints the canvas');
for (const text of ['Dasha Meme Studio', '$dasha', 'Studio.', 'Save PNG', 'Prepare 3 sizes', '>Share<', 'no wallet', 'getdasha.com', 'Format', 'Story', 'Banner', 'Verify mint', 'Buy $dasha']) assert(html.includes(text), `missing ${text}`);
assert(!/MAKE SOMETHING|keep it or change the look|Everything happens in this browser|What you write is yours/.test(html), 'deleted generic or explanatory Studio copy returned');
for (const line of ['It’s time $dasha', 'You’re not gonna believe this', 'Well Im still alive', 'Go ahead and doubt me see what happens', 'Cmon', 'They are angels actually']) assert(html.includes(`line: '${line}'`), `Studio lost sourced default: ${line}`);
assert(webflowHelper.includes('.dgnav a:focus-visible{outline:3px solid #c4a5ff'), 'Webflow Studio nav lost visible keyboard focus');
const buyURL = new URL(html.match(/<a class="buy" href="([^"]+)"/)[1].replaceAll('&amp;', '&'));
assert.equal(buyURL.origin + buyURL.pathname, 'https://jup.ag/swap', 'Studio buy route is not Jupiter');
assert.equal(buyURL.searchParams.get('buy'), '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump', 'Studio buy route has wrong mint');

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
for (const width of [320, 390, 1440]) {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height: 900 });
  await page.setContent(rendered, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflow`);
  assert.equal(await page.$eval('.topbar', nav => nav.getAttribute('aria-label')), 'Dasha', `${width}px top navigation lost its label`);
  assert.equal(await page.$eval('h1', heading => getComputedStyle(heading).color), 'rgb(244, 237, 219)', `${width}px legacy heading color leaked in`);
  assert.equal(await page.$eval('label', label => getComputedStyle(label).color), 'rgb(244, 237, 219)', `${width}px form label contrast regressed`);
  /* The roadmap's Phase 0 bar is zero serious axe violations, and every other public surface was
     held to it. This page had never been checked. The rule count guards the check itself: a
     failed injection would otherwise report zero violations and read as a pass. */
  await page.addScriptTag({ content: axeSrc });
  const axeRun = await page.evaluate(async () => {
    const result = await axe.run(document, {});
    return { rules: result.passes.length + result.inapplicable.length,
      bad: result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
        .map(v => `${v.id} (${v.nodes.length}: ${v.nodes[0]?.target})`) };
  });
  assert.ok(axeRun.rules > 30, `axe evaluated only ${axeRun.rules} rules — it did not really run`);
  assert.deepEqual(axeRun.bad, [], `${width}px serious/critical axe violations: ${axeRun.bad.join(', ')}`);
  assert.deepEqual(await page.$eval('#canvas', canvas => ({ width: canvas.width, height: canvas.height, png: canvas.toDataURL().startsWith('data:image/png;base64,') })), { width: 1080, height: 1080, png: true });
  /* Format, GIF, the remix link and the three-size kit now live inside a collapsed <details>
     ("More options"), so none of them are clickable until it is opened. Puppeteer reports that as
     "Node is either not clickable or not an Element", which reads like a broken selector rather than
     progressive disclosure. Open every details block first and test what a user can actually reach. */
  await page.$$eval('details', (blocks) => blocks.forEach((d) => { d.open = true; }));

  /* Look and format are <select> now, not button groups. Driving them means setting value and
     firing 'change' — a click does nothing to a select, which is how this read as "buttons.find(...)
     is undefined" rather than as a UI change. */
  const choose = async (id, label) => {
    const ok = await page.$eval(`#${id}`, (el, want) => {
      const option = [...el.options].find((o) => o.textContent.trim() === want);
      if (!option) return false;
      el.value = option.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, label);
    assert.ok(ok, `#${id} has no "${label}" option`);
  };
  await choose('looks', 'Ticket');
  assert.equal(await page.$eval('#looks', el => el.selectedOptions[0].textContent.trim()), 'Ticket');
  await choose('formats', 'Story');
  assert.deepEqual(await page.$eval('#canvas', canvas => ({ width: canvas.width, height: canvas.height })), { width: 1080, height: 1920 }, 'story dimensions');
  assert.equal(await page.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).get('format')), 'story');
  await choose('formats', 'Banner');
  assert.deepEqual(await page.$eval('#canvas', canvas => ({ width: canvas.width, height: canvas.height })), { width: 1200, height: 628 }, 'banner dimensions');
  await page.$eval('#line', input => { input.value = 'A'.repeat(120); input.dispatchEvent(new Event('input', { bubbles: true })); });
  assert((await page.$eval('#canvas', canvas => canvas.toDataURL())).length > 10000, 'rendered PNG is unexpectedly empty');
  assert.equal(await page.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).get('look')), 'ticket');
  assert.equal((await page.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).get('line'))).length, 120);
  assert.equal(await page.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).has('pLine')), false, 'blank Studio invented a parent');
  assert.equal(await page.evaluate(() => new URL(remixURL()).search), '', 'new remix URL exposed its state to the server query');
  await page.click('#kit');
  await page.waitForFunction(() => document.querySelectorAll('#kit-links a').length === 3);
  assert.deepEqual(await page.$$eval('#kit-links a', links => links.map(link => ({ text:link.textContent, name:link.download, blob:link.href.startsWith('blob:') }))), [
    { text:'post ↓', name:'dasha-ticket-square.png', blob:true },
    { text:'story ↓', name:'dasha-ticket-story.png', blob:true },
    { text:'banner ↓', name:'dasha-ticket-banner.png', blob:true },
  ], 'three-size kit links drifted');
  assert.deepEqual(await page.$eval('#canvas', canvas => ({ width:canvas.width, height:canvas.height })), { width:1200, height:628 }, 'three-size export did not restore the selected format');
  assert.equal(await page.$eval('#status', status => status.textContent), 'Three sizes ready.');
  await page.click('summary');
  /* The standalone copy-link button is gone by operator decision on 2026-08-08 — the objection was
     the word "remix", not the behaviour. So what has to be protected now is that the editable link
     still travels: it rides along with the image in Share (asserted below), and nothing may quietly
     reintroduce a control that copies state under a name nobody chose. */
  assert.equal(await page.$('#remix'), null, 'the standalone copy-link control came back');
  assert.ok(!/remix/i.test(await page.$eval('main', el => el.innerText)),
    'the word "remix" is back in visible Studio copy');
  assert.equal(await page.$eval('#remix-note', note => note.hidden), true, 'blank Studio should not pretend it received a handoff');
  // An unspaced run once measured 12825px inside a 904px box. A non-empty PNG passes straight
  // through that, so the wrapped lines have to be measured: this is the defect, not the symptom.
  assert(await page.evaluate(() => { ctx.font = '900 148px Arial,Helvetica,sans-serif';
    return wrap('W'.repeat(200), 904).every(line => ctx.measureText(line).width <= 904); }),
    'a wrapped line runs past its box — an image with text off the edge is unpostable');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => data.files?.length === 1 });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__nativeShare = { files: data.files.length, text: data.text, url: data.url }; } });
  });
  await page.click('#share');
  await page.waitForFunction(() => window.__nativeShare);
  assert.deepEqual(await page.evaluate(() => window.__nativeShare), { files: 1, text: `${'A'.repeat(120)}\n\n$dasha 🍒`, url: await page.evaluate(() => remixURL()) }, 'native share did not carry the PNG and editable state together');
  await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); window.open = url => { window.__shareUrl = String(url); }; });
  await page.click('#share');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('attach it'));
  const xIntent = new URL(await page.evaluate(() => window.__shareUrl));
  assert.equal(xIntent.origin + xIntent.pathname, 'https://x.com/intent/post', 'X fallback did not open');
  assert.equal(xIntent.searchParams.get('url'), await page.evaluate(() => remixURL()), 'X fallback dropped the editable remix URL');
  // Keep copy and destination separate so the official X `url` parameter handles the link once.
  assert(!/https?:\/\/|getdasha\.com/.test(await page.evaluate(() => shareText())),
    'the remix URL was duplicated inside the post text');
  assert.deepEqual(errors, [], `${width}px browser errors`);
  await page.close();
}
const inbound = await browser.newPage();
await inbound.setRequestInterception(true);
inbound.once('request', request => request.respond({ status: 200, contentType: 'text/html', body: rendered }));
await inbound.goto('https://www.getdasha.com/studio#look=signal&line=pass%20it%20on', { waitUntil: 'domcontentloaded' });
assert.deepEqual(await inbound.evaluate(() => ({ line: $('line').value, look: $('looks').selectedOptions[0].textContent.trim(), format: $('formats').selectedOptions[0].textContent.trim(), hidden: $('remix-note').hidden })), { line: 'pass it on', look: 'Signal', format: 'Post', hidden: false });
assert.equal(await inbound.$eval('#remix-note', note => note.textContent), 'Your turn.');
await inbound.$eval('#line', input => { input.value = 'pass it forward'; input.dispatchEvent(new Event('input', { bubbles: true })); });
assert.deepEqual(await inbound.evaluate(() => { const p = new URLSearchParams(new URL(remixURL()).hash.slice(1)); return { look:p.get('pLook'), format:p.get('pFormat'), line:p.get('pLine') }; }), { look:'signal', format:'square', line:'pass it on' }, 'material edit did not preserve its immediate parent');
await inbound.close();
const child = await browser.newPage();
await child.setRequestInterception(true);
child.once('request', request => request.respond({ status: 200, contentType: 'text/html', body: rendered }));
await child.goto('https://www.getdasha.com/studio#look=ticket&format=story&line=child&pLook=signal&pFormat=square&pLine=parent%20signal', { waitUntil: 'domcontentloaded' });
assert.deepEqual(await child.$eval('#lineage', row => ({ hidden:row.hidden, text:row.textContent.trim(), href:row.querySelector('a').href })), { hidden:false, text:'From “parent signal”', href:'https://www.getdasha.com/studio#look=signal&format=square&line=parent+signal' }, 'valid immediate parent was not visibly reconstructable');
assert.equal(await child.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).get('pLine')), 'parent signal', 'unchanged child dropped its parent');
await child.$eval('#line', input => { input.value = 'grandchild'; input.dispatchEvent(new Event('input', { bubbles: true })); });
assert.deepEqual(await child.evaluate(() => { const p = new URLSearchParams(new URL(remixURL()).hash.slice(1)); return { look:p.get('pLook'), format:p.get('pFormat'), line:p.get('pLine') }; }), { look:'ticket', format:'story', line:'child' }, 'next generation retained a grandparent instead of its immediate parent');
await child.close();
const hostileParent = await browser.newPage();
await hostileParent.setRequestInterception(true);
hostileParent.once('request', request => request.respond({ status: 200, contentType: 'text/html', body: rendered }));
await hostileParent.goto(`https://www.getdasha.com/studio#look=poster&line=child&pLook=wrong&pFormat=square&pLine=${'x'.repeat(121)}`, { waitUntil: 'domcontentloaded' });
assert.equal(await hostileParent.$eval('#lineage', row => row.hidden), true, 'invalid parent state became a lineage link');
assert.equal(await hostileParent.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).has('pLine')), false, 'invalid parent state survived into the next link');
await hostileParent.close();
const legacy = await browser.newPage();
await legacy.setRequestInterception(true);
legacy.once('request', request => request.respond({ status: 200, contentType: 'text/html', body: rendered }));
await legacy.goto('https://www.getdasha.com/studio?look=poster&line=old%20link', { waitUntil: 'domcontentloaded' });
assert.deepEqual(await legacy.evaluate(() => ({ line: $('line').value, search: location.search, state: new URLSearchParams(location.hash.slice(1)).get('line') })), { line: 'old link', search: '', state: 'old link' }, 'legacy query remix did not load and normalize to private fragment state');
await legacy.close();
const flat = await browser.newPage();
await flat.setRequestInterception(true);
flat.once('request', request => request.respond({ status: 200, contentType: 'text/html', body: rendered }));
await flat.goto('https://www.getdasha.com/studio#look=poster&format=square&line=image%20only&arm=flat', { waitUntil: 'domcontentloaded' });
assert.equal(await flat.$eval('#remix-note', note => note.textContent), 'Image only.');
await flat.evaluate(() => {
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__flatShare = { text: data.text, hasUrl: 'url' in data }; } });
});
await flat.click('#share');await flat.waitForFunction(() => window.__flatShare);
assert.deepEqual(await flat.evaluate(() => window.__flatShare), { text: 'image only\n\n$dasha 🍒', hasUrl: false }, 'image-only arm leaked an editable link into native share');
assert.equal(await flat.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).get('arm')), 'flat', 'image-only arm was lost while editing');
await flat.evaluate(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); window.open = url => { window.__flatIntent = String(url); }; });
await flat.click('#share');await flat.waitForFunction(() => window.__flatIntent);
assert.equal(new URL(await flat.evaluate(() => window.__flatIntent)).searchParams.has('url'), false, 'image-only X fallback leaked an editable link');
await flat.close();
await browser.disconnect();
console.log('dasha meme studio: mobile, desktop, canvas, remix URL, PNG, native-share fallback, and X checks passed');
