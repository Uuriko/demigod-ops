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
for (const text of ['$dasha', 'Studio</span>', 'Save image', 'Prepare 3 sizes', 'Share image', 'getdasha.com', '>Size<', 'Story', 'Banner', 'Contract address 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump']) assert(html.includes(text), `missing ${text}`);
for (const removed of ['Dasha Meme Studio · free · no wallet', '>Desk<', 'Buy $dasha ↗']) assert(!html.includes(removed), `removed Studio chrome returned: ${removed}`);
assert(!/MAKE SOMETHING|keep it or change the look|Everything happens in this browser|What you write is yours/.test(html), 'deleted generic or explanatory Studio copy returned');
for (const line of ['It’s time $dasha', 'You’re not gonna believe this', 'Well Im still alive', 'Go ahead and doubt me see what happens', 'Cmon', 'They are angels actually']) assert(html.includes(`line: '${line}'`), `Studio lost sourced default: ${line}`);
assert(webflowHelper.includes('.dgnav a:focus-visible{outline:3px solid #c4a5ff'), 'Webflow Studio nav lost visible keyboard focus');
assert.match(html, /href="\/#token" aria-label="Contract address 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump">CA 53ux…pump<\/a>/, 'Studio lost its compact exact-mint identity link');
assert.match(html, /\['home', 'quiz', 'transmission-001'\]/, 'Studio lost its bounded campaign-source allowlist');
assert.match(html, /pickSrc\(fragmentParams\.get\('src'\)\) \|\| pickSrc\(queryParams\.get\('src'\)\)/, 'Studio dropped query∪fragment campaign src');
assert.match(html, /JSON\.stringify\(\{ event, source: metricSource \}\)/, 'Studio telemetry lost its aggregate source');
assert.match(html, /copy_editable_link/, 'Studio lost copy-link funnel event');
assert.match(html, /ensureHandoffUrl|studio\/handoff/, 'Studio lost path-based handoff mint');
assert.match(html, /handoff_mint/, 'Studio lost handoff_mint funnel event');
assert.match(html, /fillVariantThumbs|v-thumb|lookThumb/, 'Studio lost look variant mini-thumbs');
assert.match(html, /fillLookStripThumbs|strip-thumb|lookThumbs/, 'Studio lost look-strip mini-thumbs');
assert.match(html, /need-photo|pick or paste/i, 'Studio lost empty photo cue');
assert.match(html, /key === 'r'|key === 't'/, 'Studio lost R/T keyboard craft shortcuts');
assert.doesNotMatch(html.slice(html.indexOf('function trackStudio'), html.indexOf('/* Every look')), /caption|line|photo|wallet|handle|xId|draft/i, 'Studio telemetry sends creative or identity data');
assert.match(html, /id="copy-link"/, 'Copy editable link control missing from Studio markup');
assert.match(html, /error\.name === 'AbortError'[\s\S]*?save\(image\.blob/, 'Share no longer falls through to download+X after a non-abort share failure');
assert.match(html, /STATE_KEYS = \['look', 'format', 'line', 'photo', 'effect', 'sticker'\]/,
  'Studio material state dropped photo/effect/sticker from the handoff');
assert.match(html, /pPhoto|pEffect|pSticker/, 'Studio parent lineage no longer carries photo/effect/sticker');
assert.match(html, /Could not render the GIF/, 'GIF export lost its failure path');
assert.match(html, /raw && typeof raw === 'object' && !Array\.isArray\(raw\)/,
  'first-export localStorage no longer rejects non-object values');
assert.match(html, /dasha-oco\/v0/, 'Open Culture Object schema missing');
assert.match(html, /id="oco-export"/, 'Save object control missing');
assert.match(html, /id="oco-import"/, 'Open object control missing');
assert.match(html, /function relayCheck/, 'Relay material-change check missing');
assert.match(html, /Relay: material/, 'Relay material copy missing from diff UI');
assert.match(html, /function useLocalImage/, 'Studio paste and upload paths no longer share validation');
assert.match(html, /addEventListener\('paste'/, 'Studio lost clipboard image paste');

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const mockHandoff = async (page) => {
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/studio/handoff') && request.method() === 'POST') {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: true, id: 'testHand01', url: 'https://lobby.getdasha.com/h/testHand01' }),
      });
    }
    if (request.method() === 'OPTIONS' && url.includes('/studio/handoff')) {
      return request.respond({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type',
        },
      });
    }
    return request.continue();
  });
};
for (const width of [320, 390, 1440]) {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height: 900 });
  await mockHandoff(page);
  await page.setContent(rendered, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflow`);
  assert.equal(await page.$eval('.topbar', nav => nav.getAttribute('aria-label')), 'Dasha', `${width}px top navigation lost its label`);
  assert.equal(await page.$eval('h1', heading => getComputedStyle(heading).color), 'rgb(244, 237, 219)', `${width}px legacy heading color leaked in`);
  assert.equal(await page.$eval('label', label => getComputedStyle(label).color), 'rgb(244, 237, 219)', `${width}px form label contrast regressed`);
  assert.deepEqual(await page.$$eval('main button', buttons => buttons
    .filter(button => !button.closest('details:not([open])') && !button.closest('[hidden]') && getComputedStyle(button).visibility !== 'hidden')
    .map(button => button.textContent.trim())), ['New idea', 'Save image', 'Share image'], `${width}px cold open regained button clutter`);
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
  const initialCanvas = await page.$eval('#canvas', canvas => ({ width: canvas.width, height: canvas.height, format: document.querySelector('#formats').value, png: canvas.toDataURL().startsWith('data:image/png;base64,') }));
  const expectedSize = { square: [1080, 1080], story: [1080, 1920], banner: [1200, 628] }[initialCanvas.format];
  assert.deepEqual([initialCanvas.width, initialCanvas.height, initialCanvas.png], [...expectedSize, true]);
  /* GIF, kit, OCO and advanced effects live inside collapsed <details>. Open them before clicking. */
  await page.$$eval('details', (blocks) => blocks.forEach((d) => { d.open = true; }));

  /* Looks/formats use the visible selects; hidden chip strips stay as renderer sync targets. */
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
  assert.ok(await page.$('#look-strip'), `${width}px look strip missing`);
  assert.ok(await page.$('#format-strip'), `${width}px format strip missing`);
  assert.ok(await page.$('#ship-bar, .ship-bar'), `${width}px ship bar missing`);
  assert.ok(await page.$('#variants'), `${width}px variant rail missing`);
  assert.ok(await page.$('#relay-seal'), `${width}px relay seal missing`);
  assert.ok(await page.$('#stage-frame'), `${width}px stage frame missing`);
  assert.ok(await page.$('#moods'), `${width}px moods missing`);
  assert.ok(await page.$('#surprise'), `${width}px surprise missing`);
  assert.ok(await page.$('#history'), `${width}px history missing`);
  assert.ok(await page.$('#after-share'), `${width}px after-share tray missing`);
  assert.ok(await page.$('#effect-strip'), `${width}px effect strip missing`);
  assert.ok(await page.$('#sticker-strip'), `${width}px sticker strip missing`);
  assert.ok(await page.$('#after-text'), `${width}px after-text control missing`);
  if (width === 390) {
    await page.evaluate(async () => {
      const sample = document.createElement('canvas'); sample.width = 2; sample.height = 2;
      sample.getContext('2d').fillRect(0, 0, 2, 2);
      const blob = await new Promise(resolve => sample.toBlob(resolve, 'image/png'));
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { files: [new File([blob], 'pasted.png', { type: 'image/png' })] } });
      document.dispatchEvent(event);
    });
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Pasted image.');
    assert.equal(await page.evaluate(() => Boolean(photo)), true, 'pasted image did not enter the renderer');
    assert.deepEqual(await page.evaluate(() => ({
      wrongType: useLocalImage(new File(['x'], 'bad.svg', { type: 'image/svg+xml' })),
      wrongTypeStatus: $('status').textContent,
      tooLarge: useLocalImage(new File([new Uint8Array(20_000_001)], 'large.png', { type: 'image/png' })),
      tooLargeStatus: $('status').textContent,
    })), {
      wrongType: false,
      wrongTypeStatus: 'Choose a PNG, JPEG, WebP, or GIF image.',
      tooLarge: false,
      tooLargeStatus: 'Choose an image under 20 MB.',
    }, 'local image validation accepted an unsafe type or oversized file');
  }
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
  /* Editable handoff is "Copy editable link" — never a control named remix, and never the word
     "remix" in visible copy. Share still carries the link in the system sheet / X intent. */
  assert.equal(await page.$('#remix'), null, 'a control named remix came back');
  assert.ok(await page.$('#copy-link'), 'Copy editable link control missing');
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
  {
    const shared = await page.evaluate(() => window.__nativeShare);
    const fragment = await page.evaluate(() => remixURL());
    assert.equal(shared.files, 1, 'native share dropped the PNG file');
    assert.equal(shared.text, `${'A'.repeat(120)}\n\n$dasha 🍒`, 'native share text drifted');
    assert.ok(shared.url === fragment || /\/h\/[A-Za-z0-9_-]+/.test(String(shared.url || '')),
      'native share must carry fragment DNA or a path handoff URL');
  }
  assert.equal(await page.$eval('#fe-link', el => el.classList.contains('done')), false,
    'native share marked the copy-link checklist step without copying');
  await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); window.open = url => { window.__shareUrl = String(url); return { closed: false }; }; });
  await page.click('#share');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('attach it'));
  const xIntent = new URL(await page.evaluate(() => window.__shareUrl));
  assert.equal(xIntent.origin + xIntent.pathname, 'https://x.com/intent/post', 'X fallback did not open');
  {
    const got = xIntent.searchParams.get('url');
    const fragment = await page.evaluate(() => remixURL());
    assert.ok(got === fragment || /lobby\.getdasha\.com\/h\/[A-Za-z0-9_-]+/.test(String(got || '')),
      'X fallback dropped the editable handoff URL');
  }
  assert.equal(await page.$eval('#fe-link', el => el.classList.contains('done')), false,
    'X fallback marked the copy-link checklist step without copying');
  // Keep copy and destination separate so the official X `url` parameter handles the link once.
  assert(!/https?:\/\/|getdasha\.com/.test(await page.evaluate(() => shareText())),
    'the remix URL was duplicated inside the post text');
  /* canShare({files}) true but share() rejects — must still download + open X, not dead-end. */
  await page.evaluate(() => {
    window.__shareUrl = '';
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => { const err = new Error('data not supported'); err.name = 'TypeError'; throw err; },
    });
    window.open = url => { window.__shareUrl = String(url); return { closed: false }; };
  });
  await page.click('#share');
  await page.waitForFunction(() => window.__shareUrl && document.querySelector('#status').textContent.includes('attach it'));
  assert.equal(new URL(await page.evaluate(() => window.__shareUrl)).origin + new URL(await page.evaluate(() => window.__shareUrl)).pathname,
    'https://x.com/intent/post', 'share() throw did not fall through to X intent');
  assert.deepEqual(errors, [], `${width}px browser errors`);
  await page.close();
}
const inbound = await browser.newPage();
await inbound.setRequestInterception(true);
inbound.on('request', request => {
  const url = request.url();
  if (url.includes('/studio/event')) return request.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  if (url.includes('getdasha.com/studio') || url.startsWith('https://www.getdasha.com')) {
    return request.respond({ status: 200, contentType: 'text/html', body: rendered });
  }
  return request.continue();
});
await inbound.goto('https://www.getdasha.com/studio#look=signal&line=pass%20it%20on&src=transmission-001', { waitUntil: 'domcontentloaded' });
assert.deepEqual(await inbound.evaluate(() => ({ line: $('line').value, look: $('looks').selectedOptions[0].textContent.trim(), format: $('formats').selectedOptions[0].textContent.trim(), hidden: $('remix-note').hidden })), { line: 'pass it on', look: 'Signal', format: 'Post', hidden: false });
assert.match(await inbound.$eval('#remix-note', note => note.textContent), /Your turn/);
assert.equal(await inbound.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).get('src')), 'transmission-001', 'Transmission source did not survive the editable handoff');
await inbound.$eval('#line', input => { input.value = 'pass it forward'; input.dispatchEvent(new Event('input', { bubbles: true })); });
assert.deepEqual(await inbound.evaluate(() => { const p = new URLSearchParams(new URL(remixURL()).hash.slice(1)); return { look:p.get('pLook'), format:p.get('pFormat'), line:p.get('pLine') }; }), { look:'signal', format:'square', line:'pass it on' }, 'material edit did not preserve its immediate parent');
await inbound.close();
/* Query campaign src must survive even when the fragment carries look/line. */
const querySrc = await browser.newPage();
await querySrc.setRequestInterception(true);
querySrc.on('request', request => {
  const url = request.url();
  if (url.includes('/studio/event')) return request.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  if (url.includes('getdasha.com/studio') || url.startsWith('https://www.getdasha.com')) {
    return request.respond({ status: 200, contentType: 'text/html', body: rendered });
  }
  return request.continue();
});
await querySrc.goto('https://www.getdasha.com/studio?src=quiz#look=poster&line=from%20home', { waitUntil: 'domcontentloaded' });
assert.equal(await querySrc.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).get('src')), 'quiz',
  'query campaign src was dropped when the fragment carried look/line');
await querySrc.close();
/* Effect + photo must travel in the editable link and count as material change for parent. */
const treatment = await browser.newPage();
await treatment.setRequestInterception(true);
treatment.on('request', request => {
  const url = request.url();
  if (url.includes('/studio/event')) return request.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  if (url.includes('getdasha.com/studio') || url.startsWith('https://www.getdasha.com')) {
    return request.respond({ status: 200, contentType: 'text/html', body: rendered });
  }
  if (request.resourceType() === 'image') return request.abort();
  return request.continue();
});
await treatment.goto('https://www.getdasha.com/studio#look=photo&photo=hero&line=base%20line&effect=clean', { waitUntil: 'domcontentloaded' });
await treatment.$$eval('details', (blocks) => blocks.forEach((d) => { d.open = true; }));
await treatment.$eval('#effects', (el) => {
  el.value = 'fry';
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
assert.equal(await treatment.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).get('effect')), 'fry',
  'effect change did not enter the editable link');
assert.deepEqual(await treatment.evaluate(() => {
  const p = new URLSearchParams(new URL(remixURL()).hash.slice(1));
  return { pLook: p.get('pLook'), pLine: p.get('pLine'), pPhoto: p.get('pPhoto') };
}), { pLook: 'photo', pLine: 'base line', pPhoto: 'hero' },
  'effect change did not parent the inbound photo state');
assert.match(await treatment.$eval('#diff-note', (el) => el.textContent), /effect/,
  'diff note ignored effect as a material change');
await treatment.close();
const rehydrate = await browser.newPage();
await rehydrate.setRequestInterception(true);
rehydrate.on('request', request => {
  const url = request.url();
  if (url.includes('/studio/event')) return request.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  if (url.includes('getdasha.com/studio') || url.startsWith('https://www.getdasha.com')) {
    return request.respond({ status: 200, contentType: 'text/html', body: rendered });
  }
  if (request.resourceType() === 'image') return request.abort();
  return request.continue();
});
await rehydrate.goto(`https://www.getdasha.com/studio#look=photo&photo=hero&line=shot&effect=fry&sticker=${encodeURIComponent('✦')}`, { waitUntil: 'domcontentloaded' });
assert.deepEqual(await rehydrate.evaluate(() => ({
  effect: effect[0],
  sticker,
  photo: photoId,
  selectEffect: $('effects').value,
  selectSticker: $('stickers').value,
})), { effect: 'fry', sticker: '✦', photo: 'hero', selectEffect: 'fry', selectSticker: '✦' },
  'effect/sticker/photo failed to rehydrate from the fragment');
await rehydrate.close();
/* OCO lite round-trip + Relay boolean. */
const ocoPage = await browser.newPage();
await ocoPage.setRequestInterception(true);
ocoPage.on('request', request => {
  const url = request.url();
  if (url.includes('/studio/event')) return request.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  if (url.includes('getdasha.com/studio') || url.startsWith('https://www.getdasha.com')) {
    return request.respond({ status: 200, contentType: 'text/html', body: rendered });
  }
  if (request.resourceType() === 'image') return request.abort();
  return request.continue();
});
await ocoPage.goto('https://www.getdasha.com/studio#look=signal&line=pass%20it%20on', { waitUntil: 'domcontentloaded' });
await ocoPage.$eval('#line', (input) => { input.value = 'pass it forward'; input.dispatchEvent(new Event('input', { bubbles: true })); });
assert.deepEqual(await ocoPage.evaluate(() => {
  const r = relayCheck();
  return { material: r.material, keys: r.keys, schema: toOco().schema, line: toOco().state.line };
}), { material: true, keys: ['line'], schema: 'dasha-oco/v0', line: 'pass it forward' },
  'Relay/OCO did not record a material line change');
const ocoJson = await ocoPage.evaluate(() => JSON.stringify(toOco()));
await ocoPage.goto('https://www.getdasha.com/studio', { waitUntil: 'domcontentloaded' });
assert.deepEqual(await ocoPage.evaluate((raw) => {
  const data = readOco(raw);
  applyCultureState(data.state);
  const importedParent = normalizeParent(data.parent);
  if (importedParent) {
    liveParent = importedParent;
    showParentLineage(importedParent);
  }
  refreshDiffNote();
  return {
    look: look.id,
    line: $('line').value,
    format: format.id,
    note: $('diff-note').textContent,
    material: relayCheck().material,
  };
}, ocoJson), {
  look: 'signal',
  line: 'pass it forward',
  format: 'square',
  note: 'Relay: material · lineWas “pass it on”',
  material: true,
}, 'OCO import did not restore culture state with Relay parent');
await ocoPage.close();
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
assert.match(await flat.$eval('#remix-note', note => note.textContent), /Image only/);
await flat.evaluate(() => {
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__flatShare = { text: data.text, hasUrl: 'url' in data }; } });
});
await flat.click('#share');await flat.waitForFunction(() => window.__flatShare);
assert.deepEqual(await flat.evaluate(() => window.__flatShare), { text: 'image only\n\n$dasha 🍒', hasUrl: false }, 'image-only arm leaked an editable link into native share');
assert.equal(await flat.evaluate(() => new URLSearchParams(new URL(remixURL()).hash.slice(1)).get('arm')), 'flat', 'image-only arm was lost while editing');
await flat.evaluate(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); window.open = url => { window.__flatIntent = String(url); return { closed: false }; }; });
await flat.click('#share');await flat.waitForFunction(() => window.__flatIntent);
assert.equal(new URL(await flat.evaluate(() => window.__flatIntent)).searchParams.has('url'), false, 'image-only X fallback leaked an editable link');
await flat.close();
await browser.disconnect();
console.log('dasha meme studio: mobile, desktop, canvas, remix URL, PNG, native-share fallback, and X checks passed');
