import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const studioUrl = new URL('./dasha-meme-studio.html', import.meta.url);
const studioSource = await readFile(studioUrl, 'utf8');
const fallbackImage = await readFile(new URL('./dasha-og-card.png', import.meta.url));
const photoSource = studioSource.slice(studioSource.indexOf('const PHOTOS'), studioSource.indexOf('];', studioSource.indexOf('const PHOTOS')) + 2);
const photoUrls = [...photoSource.matchAll(/\['[^']+',\s*'([^']+)'\]/g)].map(match => new URL(match[1]));
assert.equal(photoUrls.length, 18, 'the reviewed gallery inventory changed without a test update');
for (const url of photoUrls) {
  assert.equal(url.protocol, 'https:');
  assert.ok(['pbs.twimg.com', 'upload.wikimedia.org'].includes(url.hostname), `unreviewed Studio image origin: ${url.hostname}`);
}
assert.equal((studioSource.match(/<button\b/g) || []).length, 7, 'the minimal Studio must keep seven static actions');
assert.match(studioSource, /<summary>More options<\/summary>/);
assert.match(studioSource, /type: 'file', accept: 'image\/\*'/);
assert.match(studioSource, /let photoLoadVersion = 0/);
assert.ok((studioSource.match(/version !== photoLoadVersion|version === photoLoadVersion/g) || []).length >= 2, 'stale photo completion must be ignored');
assert.match(studioSource, /else if \(look\.id === 'photo'\) photoId = PHOTOS\[0\]\[0\]/, 'PHOTO look must select a starter still before first paint');
assert.match(studioSource, /starterPhoto\) loadPhoto\(\.\.\.starterPhoto/, 'PHOTO look must load the starter still without a click');
assert.match(studioSource, /params\.get\('effect'\)/, 'Studio must honor effect= from the URL');
assert.match(studioSource, /params\.get\('sticker'\)/, 'Studio must honor sticker= from the URL');
assert.match(studioSource, /loading: index < 5 \? 'eager' : 'lazy'/, 'known thumbs must not start as empty lazy tiles');
assert.match(studioSource, /blob\.size <= 5_000_000/);
assert.match(studioSource, /'image\/jpeg', 0\.9/);
assert.match(studioSource, /if \(shareBusy\) return/);
const telemetrySource = studioSource.slice(studioSource.indexOf('const trackedStudioEvents'), studioSource.indexOf('/* Every look'));
assert.match(telemetrySource, /JSON\.stringify\(\{ event, source: 'studio' \}\)/);
assert.doesNotMatch(telemetrySource, /caption|line|photo|wallet|handle|xId|draft/i, 'aggregate telemetry must not send creative or identity data');

async function instrument(context) {
  const events = [];
  await context.route('https://lobby.getdasha.com/studio/event', async route => {
    events.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } });
  });
  for (const pattern of ['https://pbs.twimg.com/**', 'https://upload.wikimedia.org/**']) {
    await context.route(pattern, route => route.fulfill({ contentType: 'image/png', body: fallbackImage }));
  }
  return events;
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('dasha-studio-image: source PASS (playwright not installed)');
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const events = await instrument(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(studioUrl.href);

  assert.equal(await page.locator('#gallery input[type=radio]').count(), 18);
  assert.equal(await page.locator('#gallery input[type=file]').count(), 1);
  assert.equal(await page.locator('#chips .chip').count(), 4);
  assert.equal(await page.locator('button').count(), 11, 'seven actions plus four caption chips');
  for (const id of ['edit', 'share', 'download']) assert.equal(await page.locator(`#${id}`).isVisible(), true);
  assert.equal(await page.locator('.advanced').isVisible(), false, 'secondary controls must start collapsed');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  await page.locator('#gallery label').first().click();
  await page.waitForFunction(() => document.querySelector('#looks').value === 'photo');
  await page.locator('#chips .chip').nth(1).click();
  assert.match(await page.locator('#line').inputValue(), /time \$dasha/i);
  const beforeEdit = await page.locator('canvas').evaluate(canvas => canvas.toDataURL());
  await page.locator('#edit').click();
  assert.notEqual(await page.locator('canvas').evaluate(canvas => canvas.toDataURL()), beforeEdit);
  assert.equal(await page.locator('#undo').isVisible(), true);
  await page.locator('#undo').click();

  await page.locator('summary').click();
  assert.equal(await page.locator('.advanced').isVisible(), true);
  await page.locator('#effects').selectOption('cursed');
  await page.locator('#stickers').selectOption('🍒');
  await page.locator('#formats').selectOption('story');
  assert.equal(await page.locator('#formats').inputValue(), 'story');
  await page.locator('#gallery input[type=file]').setInputFiles(fileURLToPath(new URL('./dasha-og-card.png', import.meta.url)));
  await page.waitForFunction(() => document.querySelector('#status').textContent !== 'That image could not be opened.');

  const oversize = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas'), original = canvas.toBlob.bind(canvas);
    let calls = 0;
    canvas.toBlob = (callback, type) => callback(new Blob([new Uint8Array(++calls === 1 ? 5_000_001 : 1234)], { type: type || 'image/png' }));
    try { const image = await shareImage(); return { calls, type: image.type, ext: image.ext, size: image.blob.size }; }
    finally { canvas.toBlob = original; }
  });
  assert.deepEqual(oversize, { calls: 2, type: 'image/jpeg', ext: 'jpg', size: 1234 });

  await page.evaluate(() => {
    window.__shares = [];
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: data => {
      window.__shares.push({ count: data.files.length, type: data.files[0].type, size: data.files[0].size, text: data.text, url: data.url });
      return new Promise(resolve => { window.__finishShare = resolve; });
    } });
    document.querySelector('#share').click();
    document.querySelector('#share').click();
  });
  await page.waitForFunction(() => window.__shares.length === 1);
  const share = await page.evaluate(() => window.__shares[0]);
  assert.equal(share.count, 1);
  assert.equal(share.type, 'image/png');
  assert(share.size <= 5_000_000);
  assert.match(share.text, /\$dasha/);
  assert(!share.text.includes(share.url), 'native share must carry the editable URL once');
  assert.match(share.url, /#.+format=/);
  assert.equal(await page.locator('#share').isDisabled(), true);
  await page.evaluate(() => window.__finishShare());
  await page.waitForFunction(() => !document.querySelector('#share').disabled);

  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    window.__realToBlob = canvas.toBlob;
    canvas.toBlob = () => { throw new DOMException('Canvas is tainted', 'SecurityError'); };
    document.querySelector('#share').click();
  });
  await page.waitForFunction(() => !document.querySelector('#share').disabled);
  assert.equal(await page.locator('#status').textContent(), 'Could not export this image. Try another.');
  await page.evaluate(() => { document.querySelector('canvas').toBlob = window.__realToBlob; });

  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button,summary,select,textarea,.gallery label')].filter(node => node.getClientRects().length).some(node => { const box = node.getBoundingClientRect(); return box.width < 44 || box.height < 44; })), false);
  assert.deepEqual(errors, []);
  for (const event of ['open', 'first_edit', 'share_intent', 'share_success', 'completion']) assert(events.some(row => row.event === event), `missing Studio event: ${event}`);
  assert(events.every(row => Object.keys(row).sort().join(',') === 'event,source'));
  await context.close();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await instrument(desktop);
  const desktopPage = await desktop.newPage();
  const desktopErrors = [];
  desktopPage.on('pageerror', error => desktopErrors.push(String(error)));
  await desktopPage.goto(studioUrl.href);
  assert.equal(await desktopPage.locator('.advanced').isVisible(), false);
  assert.equal(await desktopPage.locator('#edit').isVisible(), true);
  assert.equal(await desktopPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(desktopErrors, []);
  await desktop.close();

  console.log('dasha-studio-image: PASS (minimal mobile + desktop, gallery, edit, share, telemetry)');
} finally {
  await browser.close();
}
