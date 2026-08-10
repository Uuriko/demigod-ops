/** Retired Culture Rally route contract. Source artifacts remain on the shelf. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const landing = readFileSync(join(root, 'dasha-landing.html'), 'utf8');
const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');
const sitemap = readFileSync(join(root, 'dasha-sitemap.xml'), 'utf8');
const builder = readFileSync(join(root, 'dasha-lobby-assets-build.mjs'), 'utf8');

assert.doesNotMatch(landing, /href=["']\/rally(?:["'#?])/i, 'Home must not promote retired Rally');
assert.doesNotMatch(sitemap, /<loc>[^<]*\/rally<\/loc>/i, 'sitemap must not advertise retired Rally');
assert.match(worker, /url\.pathname === '\/rally'/, 'old Rally links need an explicit route');
assert.match(worker, /Response\.redirect\('https:\/\/www\.getdasha\.com\/', 308\)/, 'Rally must permanently redirect to the product hub');
assert.doesNotMatch(builder, /RALLY_HTML|dasha-culture-rally\.html/, 'retired Rally must not ship in Worker bytes');

console.log('dasha-culture-rally retirement: PASS');
