import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEGACY_SITEMAP_PATHS,
  PRODUCT_PATHS,
  isProductPath,
  isSitemapPath,
  sitemapLocs,
  sitemapResponse,
  sitemapXml,
} from './demigod-product-sitemap.mjs';

assert.equal(isSitemapPath('/sitemap.xml'), true);
assert.equal(isSitemapPath('/sitemap.xml/'), true);
assert.equal(isSitemapPath('/sitemap'), false);

assert.equal(isProductPath('/compare'), true);
assert.equal(isProductPath('/pricing/'), true);
assert.equal(isProductPath('/hire'), true);
assert.equal(isProductPath('/proof'), true);
assert.equal(isProductPath('/companies'), false);
assert.equal(isProductPath('/'), false);
assert.equal(isProductPath('/weekly'), false);

const xml = sitemapXml();
assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset /);
assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);

for (const path of PRODUCT_PATHS) {
  assert.match(
    xml,
    new RegExp(`<loc>https://www\\.trydemigod\\.com${path}</loc>`),
    `sitemap must list product ${path}`,
  );
}

for (const path of LEGACY_SITEMAP_PATHS) {
  const loc = path ? `https://www.trydemigod.com${path}` : 'https://www.trydemigod.com';
  assert.match(xml, new RegExp(`<loc>${loc.replaceAll('.', '\\.')}</loc>`), `sitemap must keep live ${loc}`);
}

assert.doesNotMatch(xml, /trydemigod\.com\/\//);
assert.doesNotMatch(xml, /<loc>https:\/\/www\.trydemigod\.com\/<\/loc>/);
assert.equal(new Set(sitemapLocs()).size, sitemapLocs().length);

const required = [
  '/compare',
  '/faq',
  '/hire',
  '/how',
  '/network',
  '/pilot',
  '/pricing',
  '/proof',
  '/talent',
];
assert.deepEqual([...PRODUCT_PATHS], required);

{
  const pagesDir = join(dirname(fileURLToPath(import.meta.url)), 'demigod-pages');
  const pageFiles = readdirSync(pagesDir)
    .filter((name) => name.endsWith('.html'))
    .map((name) => `/${name.replace(/\.html$/, '')}`)
    .sort();
  assert.deepEqual([...PRODUCT_PATHS].slice().sort(), pageFiles, 'sitemap product paths must match demigod-pages inventory');
}

const res = await sitemapResponse(new Request('https://www.trydemigod.com/sitemap.xml'));
assert.equal(res.status, 200);
assert.equal(res.headers.get('x-demigod-edge'), 'sitemap');
assert.match(res.headers.get('content-type') || '', /application\/xml/);
assert.equal(await res.text(), xml);

const head = await sitemapResponse(new Request('https://www.trydemigod.com/sitemap.xml', { method: 'HEAD' }));
assert.equal(head.status, 200);
assert.equal(head.headers.get('x-demigod-edge'), 'sitemap');
assert.equal(await head.text(), '');

assert.equal(await sitemapResponse(new Request('https://www.trydemigod.com/sitemap.xml', { method: 'POST' })), null);

console.log('demigod-product-sitemap: PASS');
