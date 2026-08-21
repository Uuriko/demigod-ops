import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import edgeWorker from './dasha-lobby-worker.mjs';
import { ensureStudioManifestLink } from './dasha-webflow-metadata.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const manifestSource = readFileSync(join(root, 'dasha-studio.webmanifest'), 'utf8');
const manifest = JSON.parse(manifestSource);

assert.equal(manifest.id, '/studio');
assert.equal(manifest.start_url, '/studio');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.prefer_related_applications, false);
assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);

function pngSize(bytes) {
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

for (const [name, size] of [['dasha-icon-192.png', 192], ['dasha-icon-512.png', 512]]) {
  const relative = join('dasha-worker-assets/client', name);
  const rootBytes = readFileSync(join(root, relative));
  assert.deepEqual(pngSize(rootBytes), [size, size]);
}

const env = {
  ASSETS: {
    fetch(request) {
      const path = new URL(request.url).pathname.replace(/^\//, '');
      return new Response(readFileSync(join(root, 'dasha-worker-assets', path)), {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    },
  },
};

const unrelatedHead = '<meta name="robots" content="index,follow">\n';
const studioHead = ensureStudioManifestLink(unrelatedHead);
assert.ok(studioHead.startsWith(unrelatedHead), 'Studio manifest sync must preserve unrelated head code');
assert.equal((studioHead.match(/<link rel="manifest" href="\/studio\.webmanifest">/g) || []).length, 1);
assert.equal(ensureStudioManifestLink(studioHead), studioHead, 'Studio manifest sync must be idempotent');
assert.equal((ensureStudioManifestLink('<link rel="manifest" href="/old.webmanifest">\n').match(/rel="manifest"/g) || []).length, 1,
  'Studio manifest sync must replace a stale manifest instead of adding a second one');
const shipSource = readFileSync(join(root, 'dasha-ship.mjs'), 'utf8');
assert.match(shipSource, /ensureStudioManifestLink\(studioHead\)/, 'the ship path must sync the Studio page head');

const response = await edgeWorker.fetch(new Request('https://www.getdasha.com/studio.webmanifest'), env);
assert.equal(response.status, 200);
assert.match(response.headers.get('content-type'), /^application\/manifest\+json/);
assert.deepEqual(await response.json(), manifest);

const head = await edgeWorker.fetch(new Request('https://www.getdasha.com/studio.webmanifest', { method: 'HEAD' }), env);
assert.equal(head.status, 200);
assert.equal(await head.text(), '');

for (const name of ['dasha-icon-192.png', 'dasha-icon-512.png']) {
  const icon = await edgeWorker.fetch(new Request(`https://www.getdasha.com/client/${name}`), env);
  assert.equal(icon.status, 200);
  assert.equal(icon.headers.get('content-type'), 'image/png');
  assert.equal(icon.headers.get('x-dasha-edge'), 'studio-icon');
  assert.ok((await icon.arrayBuffer()).byteLength > 1000);
}

console.log('dasha-studio-install.test.mjs ok');
