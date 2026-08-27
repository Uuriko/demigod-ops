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

test('/pricing makes the 10% fee concrete without inventing compensation scope', () => {
  const html = fs.readFileSync(path.join(PAGES_DIR, 'pricing.html'), 'utf8');
  assert.match(html, /id=["']fee-example["']/i);
  assert.match(html, /<data\s+value=["']180000["']>\$180,000<\/data>/i);
  assert.match(html, /<data\s+value=["']18000["']>\$18,000<\/data>/i);
  assert.match(html, /written terms name the cash-salary figure to which 10% applies/i);
  assert.match(html, /If nobody starts, the fee is \$0/i);
  assert.match(html, /No card or deposit is collected when you submit a brief/i);
  assert.doesNotMatch(html, /\b(?:15|20|25)%[^<]{0,80}(?:agency|contingency)/i);
});

test('/how and /faq explain post-submit review and role-specific mutual consent', () => {
  const how = fs.readFileSync(path.join(PAGES_DIR, 'how.html'), 'utf8');
  const faq = fs.readFileSync(path.join(PAGES_DIR, 'faq.html'), 'utf8');
  for (const html of [how, faq]) {
    assert.match(html, /does not publish the role/i);
    assert.match(html, /does not .*charge a card/i);
    assert.match(html, /candidate(?:’|')s name or profile/i);
    assert.match(html, /specific company and role/i);
    assert.doesNotMatch(html, /(?:reply|respond|response|intro)[^<]{0,40}(?:within|in)\s+(?:24|48|72)\s*(?:h|hours?)/i);
  }
});

test('product navigation remains available at narrow viewport widths', () => {
  const compactHeaderPages = new Set(['how.html', 'network.html', 'pricing.html']);
  for (const [file] of pages) {
    const html = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
    assert.doesNotMatch(
      html,
      /(?:^|[},])\s*(?:nav|\.nav)\s*\{[^}]*\bdisplay\s*:\s*none/i,
      `${file} must not hide the product navigation on mobile`,
    );
    if (compactHeaderPages.has(file)) {
      assert.match(
        html,
        /nav a\{[^}]*min-width:44px[^}]*min-height:44px/i,
        `${file} product links need 44px minimum touch targets`,
      );
    }
  }
});

test('/talent and /network separate private review from per-match consent', () => {
  for (const file of ['talent.html', 'network.html']) {
    const html = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
    assert.match(html, /private human review/i);
    assert.match(html, /does not publish the profile or send (?:it|your identity) to a company/i);
    assert.match(html, /specific company and role/i);
    assert.match(html, /silence is not consent/i);
    assert.match(html, /(?:earlier yes does not authorize|approval does not carry over)/i);
    assert.match(html, /startup (?:must )?also wants? the conversation/i);
    assert.doesNotMatch(html, /(?:~\s*2\s*min|about two minutes)/i);
  }
});
