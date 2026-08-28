import assert from 'node:assert/strict';
import { ensureBuildDiscovery, ensureBuildInSitemap } from './dasha-build-discovery.mjs';

const html = '<html><body><section id="compute-door"><h2>Compute</h2></section><footer><p><a href="/compute">Compute</a></p></footer></body></html>';
const out = ensureBuildDiscovery(html);
assert.match(out, /id="build-door"/);
assert.match(out, /href="\/build"/);
assert.equal((out.match(/id="build-door"/g) || []).length, 1);
assert.equal(ensureBuildDiscovery(out), out);

const sitemap = '<?xml version="1.0"?><urlset><url><loc>https://www.getdasha.com/</loc></url></urlset>';
const map = ensureBuildInSitemap(sitemap);
assert.match(map, /https:\/\/www\.getdasha\.com\/build/);
assert.equal(ensureBuildInSitemap(map), map);

console.log('dasha-build-discovery: PASS');
