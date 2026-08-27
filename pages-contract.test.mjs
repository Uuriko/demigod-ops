import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Keep every source-owned product page discoverable, shareable, and accessible.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = path.join(ROOT, 'demigod-pages');
const ORIGIN = 'https://www.trydemigod.com';
const SOCIAL_IMAGE = 'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@ab05fd5f005415f03e157fe47dcd5b75b9ef62c5/art/frege-hero.jpg';
const SOCIAL_ALT = 'Demigod — human-reviewed startup talent matching';

const pages = new Map([
  ['compare.html', '/compare'],
  ['faq.html', '/faq'],
  ['hire.html', '/hire'],
  ['how.html', '/how'],
  ['network.html', '/network'],
  ['pilot.html', '/pilot'],
  ['pricing.html', '/pricing'],
  ['proof.html', '/proof'],
  ['talent.html', '/talent'],
]);

function firstMatch(html, pattern, label) {
  const match = html.match(pattern);
  assert.ok(match, `missing ${label}`);
  return match[1].trim();
}

function metaByName(html, name) {
  return firstMatch(
    html,
    new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'),
    `meta name=${name}`,
  );
}

function metaByProperty(html, property) {
  return firstMatch(
    html,
    new RegExp(`<meta\\s+[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'),
    `meta property=${property}`,
  );
}

test('the product-page inventory is explicit', () => {
  const actual = fs.readdirSync(PAGES_DIR).filter((name) => name.endsWith('.html')).sort();
  assert.deepEqual(actual, [...pages.keys()].sort());
});

for (const [file, route] of pages) {
  test(`${route} has complete metadata and accessible structure`, () => {
    const html = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
    const title = firstMatch(html, /<title>([^<]+)<\/title>/i, 'title');
    const description = metaByName(html, 'description');
    const canonical = firstMatch(
      html,
      /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i,
      'canonical URL',
    );

    assert.match(html, /<html\s+[^>]*lang=["']en["']/i);
    assert.match(html, /<meta\s+[^>]*name=["']viewport["']/i);
    assert.ok(title.includes('Demigod'), 'title must identify Demigod');
    assert.ok(title.length >= 12 && title.length <= 65, `title length is ${title.length}`);
    assert.ok(description.length >= 50 && description.length <= 170, `description length is ${description.length}`);
    assert.equal(canonical, `${ORIGIN}${route}`);
    assert.equal(metaByName(html, 'robots'), 'index,follow');

    assert.equal(metaByProperty(html, 'og:title'), title);
    assert.equal(metaByProperty(html, 'og:description'), description);
    assert.equal(metaByProperty(html, 'og:url'), canonical);
    assert.equal(metaByProperty(html, 'og:type'), 'website');
    assert.equal(metaByProperty(html, 'og:site_name'), 'Demigod');
    assert.equal(metaByProperty(html, 'og:image'), SOCIAL_IMAGE);
    assert.equal(metaByProperty(html, 'og:image:alt'), SOCIAL_ALT);
    assert.equal(metaByProperty(html, 'og:image:width'), '1280');
    assert.equal(metaByProperty(html, 'og:image:height'), '720');

    assert.equal(metaByName(html, 'twitter:card'), 'summary_large_image');
    assert.equal(metaByName(html, 'twitter:title'), title);
    assert.equal(metaByName(html, 'twitter:description'), description);
    assert.equal(metaByName(html, 'twitter:image'), SOCIAL_IMAGE);
    assert.equal(metaByName(html, 'twitter:image:alt'), SOCIAL_ALT);

    assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'page must have exactly one h1');
    assert.match(html, /<main\b[^>]*\bid=["']main["']/i, 'page must expose a main landmark target');
    assert.match(html, /<a\b[^>]*class=["'][^"']*\bskip\b[^"']*["'][^>]*href=["']#main["']/i, 'page must expose a skip link');

    const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'page must not contain duplicate ids');

    const startupLinks = [...html.matchAll(/href=["']([^"']*\?wiz=startup[^"']*)["']/gi)];
    for (const [, href] of startupLinks) {
      const url = new URL(href, ORIGIN);
      for (const key of ['company', 'name', 'role']) {
        assert.equal(url.searchParams.has(key), false, `${href} must not prefill ${key}`);
      }
    }

    assert.doesNotMatch(html, /Ray Fernando|Sign in with Grok Bot/i);
  });
}
