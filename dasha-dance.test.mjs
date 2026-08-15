import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const danceSrc = await readFile(new URL('./dasha-dance-client.js', root), 'utf8');
const chessPage = await readFile(new URL('./dasha-chess-page.html', root), 'utf8');
const simpClient = await readFile(new URL('./dasha-simp-board-client.js', root), 'utf8');
const graphPage = await readFile(new URL('./dasha-graph-page.html', root), 'utf8');
const landing = await readFile(new URL('./dasha-landing.html', root), 'utf8');
const modSrc = await readFile(new URL('./dasha-lobby-mod.mjs', root), 'utf8');
const wrangler = await readFile(new URL('./dasha-lobby-wrangler.jsonc', root), 'utf8');
const awardChrome = await readFile(new URL('./dasha-award-chrome.mjs', root), 'utf8');
const { default: worker, danceDockPath, injectDanceDock, rewriteHomeFirstViewport, simpPageHtml, faucetPageHtml, bountiesPageHtml } = await import('./dasha-lobby-worker.mjs');
const { DANCE_CLIENT_JS, DANCE_CLIENT_SRI, ASSET_HASH } = await import('./dasha-lobby-static-gen.mjs');

assert.equal(mint, '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump');
assert.match(modSrc, /53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/);
assert.match(wrangler, /53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/);
assert.doesNotMatch(danceSrc, /53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump|payTo|holders/i);
assert.doesNotMatch(danceSrc + DANCE_CLIENT_JS, /Mixamo|Sketchfab|Spline|pbs\.twimg\.com|tap to (?:play|hear)|play button/i);
assert.doesNotMatch(DANCE_CLIENT_JS, /Umplix|Polygons|OpenGameArt|lyric|credit line|Now playing/i);
assert.equal([...danceSrc.matchAll(/createElement\('button'\)/g)].length, 2, 'dancer hit + visible speaker');
assert.match(danceSrc, /dasha-dance-speaker/);
assert.match(danceSrc, /speakerSvg/);
assert.match(danceSrc, /z-index:12/, 'dock sits under Buy (sticky is z-index 40)');
assert.doesNotMatch(danceSrc + DANCE_CLIENT_JS, /sitemap|\/airdrop|\/earn/i);
assert.match(danceSrc, /three@0\.170\.0/, 'same Three pin as /graph');
assert.match(danceSrc, /GLTFLoader/);
assert.match(danceSrc, /AnimationMixer/);
assert.match(danceSrc, /IntersectionObserver/, 'pause the loop when the dock is off-screen');
assert.match(danceSrc, /visibilitychange/, 'pause the loop when the tab is hidden');
assert.match(danceSrc, /document\.hidden/);
assert.match(danceSrc, /!scrolling/, 'live() is false while the user is scrolling');
assert.match(danceSrc, /addEventListener\('scroll', onScrollPulse/);
assert.match(danceSrc, /addEventListener\('wheel', onScrollPulse/);
assert.match(danceSrc, /addEventListener\('touchmove', onScrollPulse/);
assert.match(danceSrc, /setTimeout\(afterScroll, 150\)/, 'restart the loop after scroll settles');
assert.match(danceSrc, /clock\.getDelta\(\)/, 'reset the mixer clock so she does not lurch');
assert.match(danceSrc, /ratioCap/, 'drop pixelRatio while scrolling or on low-end');
assert.doesNotMatch(danceSrc, /Lenis|Locomotive|ScrollTrigger|scroll-snap/);
assert.doesNotMatch(danceSrc, /onScrollPulse[\s\S]{0,120}preventDefault/);
assert.match(danceSrc, /OrthographicCamera/, 'feet on an implied floor, not a perspective hover');
assert.match(danceSrc, /lookHold/, 'short look-at-camera beat after crossings');
assert.match(danceSrc, /onBeforeCompile/, 'thin acid rim + killed spec, not a plastic doll');
assert.match(danceSrc, /0\.874, 1\.0, 0\.0/, 'rim is #dfff00');
assert.match(danceSrc, /dasha-dance-speaker\{position:absolute;right:/, 'speaker stays on the right');
assert.doesNotMatch(danceSrc, /dasha-dance-speaker\{[^}]*left:/);
assert.doesNotMatch(danceSrc, /CapsuleGeometry|SphereGeometry|buildRig|CircleGeometry|PlaneGeometry/);
assert.match(danceSrc, /\/client\/dasha-loop\.mp3/);
assert.match(danceSrc, /\/client\/dasha\.glb/);
assert.match(danceSrc, /\/client\/dasha-face\.webp/);
assert.doesNotMatch(danceSrc + DANCE_CLIENT_JS, /dasha-sheet|dasha-dance-sheet/);
assert.match(danceSrc, /dashaMute/);
assert.match(danceSrc, /playsInline/);
assert.match(danceSrc, /autoplay/);
assert.match(danceSrc, /prefers-reduced-motion/);
assert.doesNotMatch(danceSrc, /if \(prefersReduced\(\)\) return;/, 'reduced-motion must not hide the dock');
assert.doesNotMatch(awardChrome, /#dasha-dance\{display:none/, 'chrome must not hide the still pose');
assert.match(danceSrc, /pagehide/);
assert.match(danceSrc, /requestAnimationFrame/);
assert.match(danceSrc, /position\.x/, 'client drives world X, clip stays in-place');
assert.match(danceSrc, /rotation\.y/, 'turns to face travel');
assert.match(DANCE_CLIENT_JS, /\/client\/dasha-loop\.mp3/);
assert.match(DANCE_CLIENT_JS, /\/client\/dasha\.glb/);
assert.match(DANCE_CLIENT_JS, /GLTFLoader/);
assert.match(DANCE_CLIENT_JS, /three@0\.170\.0/);
assert.match(DANCE_CLIENT_JS, /visibilitychange/);
assert.match(DANCE_CLIENT_JS, /lookHold/);
assert.match(DANCE_CLIENT_JS, /OrthographicCamera/);
assert.match(DANCE_CLIENT_JS, /dasha-dance-speaker\{position:absolute;right:/);
assert.equal(`sha384-${createHash('sha384').update(DANCE_CLIENT_JS).digest('base64')}`, DANCE_CLIENT_SRI);
assert.match(ASSET_HASH, /^[0-9a-f]{16}$/);

for (const path of ['/', '/lobby', '/lobby/', '/forum', '/forum/', '/studio', '/dasha', '/simp', '/chess', '/verse', '/how-to-buy', '/bounties', '/learn', '/learn/crypto', '/faucet', '/graph', '/graph/']) {
  assert.equal(danceDockPath(path), false, `danceDockPath(${path}) must be false`);
}

const boot = '<!doctype html><html><body><h1>IT\'S TIME $DASHA</h1><a class="buy-dasha">Buy $dasha ↗</a></body></html>';
assert.equal(injectDanceDock(boot), boot, 'injectDanceDock must return html unchanged');
assert.doesNotMatch(injectDanceDock(boot), /dasha-dance\.js/);
const firstPaint = rewriteHomeFirstViewport('<!doctype html><html><body><header class="dasha-hero"><h1>IT\'S TIME $DASHA</h1><p class="actions"><a class="pill primary buy-dasha" href="https://jup.ag/swap">Buy $dasha ↗</a></p></header></body></html>');
assert.doesNotMatch(firstPaint, /dasha-dance/, 'first paint is headline + Buy, not the dancer');
assert.match(firstPaint, /IT'S TIME \$DASHA/);
assert.match(firstPaint, /buy-dasha/);

for (const html of [simpPageHtml(), faucetPageHtml(), bountiesPageHtml({ listings: [] })]) {
  assert.doesNotMatch(html, /dasha-dance\.js/, 'dock stays off /simp /faucet /bounties');
  assert.doesNotMatch(html, /<nav[^>]*dasha-dance|id="dasha-dance-nav"/i, 'dock must not grow a second nav');
}

assert.doesNotMatch(graphPage, /dasha-dance/);
assert.doesNotMatch(chessPage, /dasha-dance|three@|import\(['"]three/);
assert.doesNotMatch(simpClient, /three@|import\(['"]three|from ['"]three/);
assert.doesNotMatch(landing, /dasha-dance/, 'home HtmlEmbed must not grow the dancer');

const glbBuild = await readFile(new URL('./dasha-dance-glb-build.py', root), 'utf8');
const sheetLicense = await readFile(new URL('./dasha-worker-assets/client/LICENSE', root), 'utf8');
const refsLicense = await readFile(new URL('./dasha-dance-refs/LICENSE', root), 'utf8');
assert.match(glbBuild, /wiki-2022/);
assert.match(glbBuild, /cotton-2014/);
assert.match(glbBuild, /berlinale-2021/);
assert.doesNotMatch(glbBuild, /public\.jpg|press\.jpg|chart\.jpg|bull\.jpg/);
assert.doesNotMatch(glbBuild + danceSrc, /dailymail|pbs\.twimg|Mixamo|fuku|sailor/i);
assert.match(sheetLicense, /Umplix|Polygons N' Light/);
assert.match(sheetLicense + refsLicense, /CC BY 3\.0/);
assert.match(sheetLicense + refsLicense, /CC BY-SA 4\.0/);
assert.match(sheetLicense + refsLicense, /After Hours Productions/);
assert.match(sheetLicense + refsLicense, /IgorCalzone1/);
assert.match(sheetLicense, /dasha\.glb/);

const face = await stat(new URL('./dasha-worker-assets/client/dasha-face.webp', root));
const glb = await stat(new URL('./dasha-worker-assets/client/dasha.glb', root));
const loop = await stat(new URL('./dasha-worker-assets/client/dasha-loop.mp3', root));
assert.ok(face.size > 0 && face.size < 400 * 1024, 'face still must stay under ~400KB');
assert.ok(glb.size > 8 * 1024 && glb.size < 400 * 1024, 'one compressed GLB');
assert.ok(loop.size > 200 * 1024 && loop.size < 2.2 * 1024 * 1024, 'loop should be ~128kbps');

const glbBytes = await readFile(new URL('./dasha-worker-assets/client/dasha.glb', root));
assert.equal(glbBytes.subarray(0, 4).toString(), 'glTF');
const jsonLen = glbBytes.readUInt32LE(12);
const gltf = JSON.parse(glbBytes.subarray(20, 20 + jsonLen).toString());
assert.ok(gltf.skins?.length && gltf.animations?.length, 'GLB must ship skin + clip');
assert.equal(gltf.meshes?.length, 1, 'identity is one mesh');
assert.ok(gltf.animations[0].channels.every((c) => c.target.path === 'rotation'), 'clip is in-place');
assert.doesNotMatch(JSON.stringify(gltf), /Mixamo|Stacy|ReadyPlayer/i);

const assets = {
  ASSETS: {
    fetch: async (req) => {
      const path = new URL(req.url).pathname;
      if (path.endsWith('.mp3')) return new Response('mp3', { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
      if (path.endsWith('.webp')) return new Response('webp', { status: 200, headers: { 'Content-Type': 'image/webp' } });
      if (path.endsWith('.glb')) return new Response('glb', { status: 200, headers: { 'Content-Type': 'model/gltf-binary' } });
      return new Response('no', { status: 404 });
    },
  },
};

const graph = await worker.fetch(new Request('https://www.getdasha.com/graph'), assets);
assert.equal(graph.status, 308, 'shelved /graph 308s home');
assert.equal(graph.headers.get('location'), 'https://www.getdasha.com/');
const graphHtml = await graph.text();
assert.doesNotMatch(graphHtml, /dasha-dance|three@0\.170/, '308 /graph must not boot the dancer or graph Three');

{
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    '<!doctype html><html><body><header class="dasha-hero"><h1>IT\'S TIME $DASHA</h1><p class="actions"><a class="pill primary buy-dasha" href="https://jup.ag/swap">Buy $dasha ↗</a></p></header></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
  try {
    const home = await worker.fetch(new Request('https://www.getdasha.com/'), assets);
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /IT'S TIME \$DASHA/);
    assert.match(html, /buy-dasha/);
    assert.doesNotMatch(html, /dasha-dance\.js/, 'home must not inject the dock');
    assert.doesNotMatch(html, /Polygons|Umplix|Play music|tap to (?:play|hear)/i);
  } finally {
    globalThis.fetch = nativeFetch;
  }
}

{
  const forum = await worker.fetch(new Request('https://lobby.getdasha.com/forum'), assets);
  assert.equal(forum.status, 308, 'lobby /forum 308s home');
  assert.equal(forum.headers.get('location'), 'https://www.getdasha.com/');
}
for (const [host, path] of [
  ['lobby.getdasha.com', '/how-to-buy'],
  ['www.getdasha.com', '/bounties'],
  ['www.getdasha.com', '/how-to-buy'],
]) {
  const res = await worker.fetch(new Request(`https://${host}${path}`), assets);
  assert.equal(res.status, 308, `${host}${path} 308s home`);
  assert.equal(res.headers.get('location'), 'https://www.getdasha.com/');
}
for (const [host, path] of [
  ['lobby.getdasha.com', '/chess'],
  ['www.getdasha.com', '/simp'],
  ['www.getdasha.com', '/faucet'],
  ['www.getdasha.com', '/chess'],
]) {
  const res = await worker.fetch(new Request(`https://${host}${path}`), assets);
  assert.equal(res.status, 200, `${host}${path} must stay 200`);
  const html = await res.text();
  assert.doesNotMatch(html, /dasha-dance\.js/, `${host}${path} must not inject the dock`);
  assert.doesNotMatch(html, /tap to (?:play|hear)|Play music|click to play/i, `${host}${path} must not grow a play CTA`);
  assert.doesNotMatch(html, /Mixamo|Sketchfab|Spline/);
  assert.doesNotMatch(html, /payTo/);
}

const danceJs = await worker.fetch(new Request('https://lobby.getdasha.com/client/dasha-dance.js'), assets);
assert.equal(danceJs.status, 200);
const danceBody = await danceJs.text();
assert.equal(danceBody, DANCE_CLIENT_JS);
assert.match(danceBody, /\/client\/dasha-loop\.mp3/);
assert.match(danceBody, /\/client\/dasha\.glb/);
assert.match(danceBody, /three@0\.170\.0/);
assert.doesNotMatch(danceBody, /tap to (?:play|hear)|Mixamo|Sketchfab|Spline/);
assert.doesNotMatch(chessPage, /import\(['"]three/);
assert.doesNotMatch(simpClient, /import\(['"]three/);

const loopRes = await worker.fetch(new Request('https://lobby.getdasha.com/client/dasha-loop.mp3'), assets);
assert.equal(loopRes.status, 200);
assert.match(loopRes.headers.get('content-type') || '', /audio\/mpeg|octet-stream|text\/plain/);

const faceRes = await worker.fetch(new Request('https://lobby.getdasha.com/client/dasha-face.webp'), assets);
assert.equal(faceRes.status, 200);
assert.match(faceRes.headers.get('content-type') || '', /image\/webp|octet-stream|text\/plain/);

const glbRes = await worker.fetch(new Request('https://lobby.getdasha.com/client/dasha.glb'), assets);
assert.equal(glbRes.status, 200);
assert.match(glbRes.headers.get('content-type') || '', /model\/gltf-binary|octet-stream|text\/plain/);

console.log('dasha-dance: PASS');
