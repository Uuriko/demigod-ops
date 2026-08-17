#!/usr/bin/env node
/**
 * demigod-route-static — put the page copy we already wrote into the HTML that is actually served.
 *
 * WHY
 * AI crawlers do not execute JavaScript. GPTBot, ClaudeBot, PerplexityBot and the rest issue one
 * request, read the HTML that comes back, and move on; only Gemini renders, by borrowing Googlebot's
 * service. Every route of trydemigod.com is painted by demigod-foot-core.js after load, so fetching
 * as GPTBot returns 590 characters for /how, 590 for /faq and 591 for /blog — a title and one
 * boilerplate sentence — against 15,036 for /startups, the one route with a pre-rendered fragment.
 *
 * The copy is not missing. It is complete, authored HTML inside `DG_PAGES`, in a file that only runs
 * in a browser. This module moves it into the served HTML and rewrites none of it.
 *
 * ONE SOURCE OF TRUTH
 * The page map is read by RUNNING foot-core in a vm sandbox and reading DG_PAGES — the same
 * technique demigod-foot-smoke.mjs already uses — not by parsing it with a regex. A second copy of
 * this copy is the thing most likely to drift, and drifted marketing copy is worse than none: the
 * crawler and the visitor would be told different things about the same company.
 *
 *   node demigod-route-static.mjs --route=faq
 *   node demigod-route-static.mjs --list
 *   node demigod-route-static.mjs --selftest
 *
 * Schema: demigod.route-static/1
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Webflow page custom code ceiling, same number demigod-directory-static.mjs publishes under. */
export const DEPLOYABLE_BYTES = 50000;

/**
 * Run foot-core and hand back its own page map.
 *
 * The sandbox is deliberately the shape demigod-foot-smoke.mjs proved works: enough browser to let
 * the module finish evaluating, and nothing that would let it fetch, time out, or touch a real DOM.
 */
export function loadFootPages(src = FOOT) {
  const code = fs.readFileSync(src, 'utf8');
  const marker = 'window.__dgScrub = scrubStaticLabels;';
  if (!code.includes(marker)) {
    // The hook foot-smoke also relies on. If it moves, both tools must be told rather than quietly
    // returning nothing — an empty page map would publish empty fragments over real copy.
    throw new Error('route-static: foot-core no longer exposes the __dgScrub hook this reads DG_PAGES through');
  }
  const executable = code.replace(
    marker,
    `${marker} window.__dgRouteStatic = { pages: DG_PAGES, paths: DG_PAGE_PATHS };`,
  );
  const makeEl = () => ({
    style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    children: [], attributes: {},
    appendChild() {}, removeChild() {}, remove() {}, setAttribute() {}, removeAttribute() {},
    getAttribute: () => null, addEventListener() {}, removeEventListener() {}, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], focus() {}, click() {}, closest: () => null,
    innerHTML: '', textContent: '', value: '',
  });
  const thenable = { then() { return this; }, catch() { return this; } };
  const document = {
    body: makeEl(), head: makeEl(), documentElement: makeEl(),
    createElement: () => makeEl(),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
  };
  const sandbox = {
    document,
    location: { hash: '', href: 'https://www.trydemigod.com/', pathname: '/', search: '' },
    history: { state: null, replaceState() {}, pushState() {} },
    URL, URLSearchParams,
    navigator: { userAgent: 'route-static' },
    getComputedStyle: () => ({ display: 'block' }),
    MutationObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class { observe() {} disconnect() {} },
    fetch: () => thenable,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    console: { log() {}, warn() {}, error() {} },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(executable, sandbox, { filename: src, timeout: 10000 });
  const state = sandbox.window.__dgRouteStatic;
  const pages = state?.pages;
  const paths = state?.paths;
  if (!pages || typeof pages !== 'object' || !Object.keys(pages).length) {
    throw new Error('route-static: DG_PAGES came back empty — refusing to publish nothing over real copy');
  }
  return { pages, paths: paths || {} };
}

/** PURE. Every page key that carries any copy at all, in a stable order. */
export function routeKeysWithCopy(pages = {}) {
  return Object.keys(pages)
    .filter((key) => typeof pages[key]?.html === 'string' && pages[key].html.trim().length > 200)
    .sort();
}

/**
 * Measured 2026-08-17, crawlable characters per route: faq 3,765 · legal 1,873 · refer 1,677 ·
 * how 1,525 · events 1,446 · sample 1,414 · talent 1,052 · map 1,039 · hire 957 · private 939 ·
 * pricing 876 · about 755 · press 661 · contact 531 — then a gap to notfound 232, blog 180,
 * event 147, bounties 41.
 *
 * That gap is not a quality difference, it is a kind difference. The four at the bottom are shells
 * whose content arrives from a dataset at runtime: blog from DG_BLOG_POSTS, bounties from its seed,
 * event from a single record. Pre-rendering their shell would publish a heading and nothing else,
 * which is the current defect wearing a different hat. They need their data joined first, and that
 * is a separate task per dataset.
 */
export const PROSE_MIN_CHARS = 400;

/** PURE. The routes whose copy stands on its own and can be served as-is. */
export function routeKeysWithProse(pages = {}) {
  return routeKeysWithCopy(pages).filter((key) => crawlableText(pages[key].html).length >= PROSE_MIN_CHARS);
}

/**
 * PURE. One route's copy as a fragment safe to paste into that page.
 *
 * Deliberately NOT trimmed to fit. demigod-directory-static trims its listing and says so, which is
 * honest for a list — the reader is told they are seeing 365 of 471. Cutting an argument in half
 * mid-sentence is a different act, so an oversized page fails here and a human decides what goes.
 */
export function routeStaticFragment(key, { pages, maxBytes = DEPLOYABLE_BYTES } = {}) {
  const page = pages?.[key];
  if (!page || typeof page.html !== 'string' || !page.html.trim()) {
    throw new Error(`route-static: no copy for route key ${JSON.stringify(key)}`);
  }
  const title = String(page.title || key);
  const html = `<section id="dg-static-${key}" data-dg-static="${key}" aria-label="${title}">\n${page.html}\n</section>\n`;
  const bytes = Buffer.byteLength(html);
  if (bytes > maxBytes) {
    throw new Error(`route-static: ${key} fragment is ${bytes} bytes, over the ${maxBytes} ceiling — shorten the copy rather than truncating it`);
  }
  return { key, title, html, bytes, headroom: maxBytes - bytes };
}

/**
 * PURE. The Q&A a reader actually sees, out of the `<details><summary>` markup the FAQ page uses.
 *
 * demigod-seo-audit already has faqPairsFromHtml for the SCHEMA side and faqPairsMatch to compare
 * the two, but the visible side has only ever been extracted from a rendered DOM. That is why the
 * schema generator has sat exported and uncalled: nothing could produce the other half of the
 * comparison without a browser. This is that half, from source.
 */
export function faqPairsFromDetails(html) {
  const pairs = [];
  for (const [, question, answer] of String(html || '')
    .matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)) {
    const q = crawlableText(question);
    const a = crawlableText(answer);
    if (q && a) pairs.push({ q, a });
  }
  return pairs;
}

/** Visible text a crawler would read, so a fragment can be measured the way site-health measures live. */
export function crawlableText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The FAQ page as a crawler should receive it: the visible answers, plus FAQPage schema generated
 * from those same answers.
 *
 * Generated from the visible pairs rather than maintained beside them, because seo-audit enforces
 * that the two match exactly and the cheapest way to keep two things identical is to derive one
 * from the other.
 */
export async function faqStaticBundle({ pages, maxBytes = DEPLOYABLE_BYTES } = {}) {
  const { faqJsonLdScript } = await import('./demigod-faq-schema.mjs');
  const fragment = routeStaticFragment('faq', { pages, maxBytes });
  const pairs = faqPairsFromDetails(pages.faq.html);
  if (!pairs.length) throw new Error('route-static: faq page carries no <details> Q&A to describe');
  const schema = faqJsonLdScript(pairs);
  const html = `${fragment.html}${schema}\n`;
  const bytes = Buffer.byteLength(html);
  if (bytes > maxBytes) {
    throw new Error(`route-static: faq fragment plus schema is ${bytes} bytes, over the ${maxBytes} ceiling`);
  }
  return { ...fragment, html, bytes, headroom: maxBytes - bytes, pairs: pairs.length };
}

/**
 * Stage one route's fragment where an authorized publish can paste it, in the shape
 * demigod-directory-static already stages /startups: the HTML, its SHA256, and a prepare record.
 *
 * The point of staging is that publishing later is a paste rather than a build. A publish that has
 * to regenerate first is a publish that can ship different bytes than the ones anyone reviewed.
 */
export function stageRoutePastePackage(fragment, { busy = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy' } = {}) {
  const dir = path.join(busy, 'route-paste', fragment.key);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = `dg-static-${fragment.key}.html`;
  fs.writeFileSync(path.join(dir, file), fragment.html);
  const sha256 = createHash('sha256').update(fragment.html).digest('hex');
  fs.writeFileSync(path.join(dir, 'SHA256'), `${sha256}  ${file}\n`);
  const record = {
    schema: 'demigod.route-paste-prepare/1',
    at: new Date().toISOString(),
    route: fragment.key,
    bytes: fragment.bytes,
    crawlableChars: crawlableText(fragment.html).length,
    deployableCeilingBytes: DEPLOYABLE_BYTES,
    deployable: fragment.bytes <= DEPLOYABLE_BYTES,
    headroom: fragment.headroom,
    sha256,
    source: 'DG_PAGES in demigod-foot-core.js — regenerate rather than editing this file',
    authBoundary: 'Paste into the Webflow page custom code for this route. Publishing needs authorization in the current request.',
    target: `Webflow ${fragment.key} page-settings custom code — page-scoped only`,
    packagePath: dir + path.sep,
  };
  fs.writeFileSync(path.join(dir, 'prepare.json'), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

/** PURE. HTML-escape text that came from a data file, not from authored markup. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * The blog page a crawler should receive: the shell, plus the bodies of the posts that are actually
 * published.
 *
 * /blog is one of the four data shells — its own copy is 180 crawlable characters, and the essays
 * arrive at runtime from DG_BLOG_POSTS. So a crawler gets a hero and a call to action while 4,448
 * characters of essay sit behind JavaScript it will never run.
 *
 * `published !== false` is the same rule demigod-blog-sync uses to decide what reaches the foot.
 * Three of the four posts are drafts and must not appear here: publishing a draft because it was
 * convenient to render is a worse failure than an empty page.
 */
export function blogStaticBundle({ pages, posts, maxBytes = DEPLOYABLE_BYTES } = {}) {
  const shell = routeStaticFragment('blog', { pages, maxBytes });
  const published = (Array.isArray(posts) ? posts : []).filter((post) => post?.published !== false && post?.body);
  const articles = published.map((post) => {
    const paragraphs = String(post.body)
      .split(/\n{2,}/)
      .map((para) => para.trim())
      .filter(Boolean)
      .map((para) => `<p>${esc(para)}</p>`)
      .join('');
    const dated = post.publishedAt
      ? `<p class="dg-static-date"><time datetime="${esc(post.publishedAt)}">${esc(post.publishedAt)}</time></p>`
      : '';
    return `<article id="note-${esc(post.slug)}"><h2>${esc(post.title)}</h2>${dated}<p><em>${esc(post.summary || '')}</em></p>${paragraphs}</article>`;
  }).join('\n');
  const html = `${shell.html}<section id="dg-static-blog-posts" data-dg-static="blog-posts">\n${articles}\n</section>\n`;
  const bytes = Buffer.byteLength(html);
  if (bytes > maxBytes) {
    throw new Error(`route-static: blog bundle is ${bytes} bytes, over the ${maxBytes} ceiling — paginate rather than truncating an essay`);
  }
  return { ...shell, html, bytes, headroom: maxBytes - bytes, posts: published.length, drafts: (posts || []).length - published.length };
}

function selftestPages(pages) {
  const assert = (cond, msg) => { if (!cond) throw new Error(`route-static selftest: ${msg}`); };
  const paths = {};
  const keys = routeKeysWithProse(pages);
  assert(keys.length >= 10, `expected many routes with standalone prose, got ${keys.length}`);
  assert(keys.includes('faq') && keys.includes('how'), `faq and how must carry prose, got ${keys.join(',')}`);
  // The shells stay out on purpose: serving a heading with no dataset is the defect, not the fix.
  const shells = routeKeysWithCopy(pages).filter((key) => !keys.includes(key));
  assert(shells.includes('blog'), `blog is a data shell and must be excluded until its posts are joined, got shells ${shells.join(',')}`);

  const faq = routeStaticFragment('faq', { pages });
  assert(faq.bytes <= DEPLOYABLE_BYTES, `faq fragment ${faq.bytes} over ceiling`);
  const faqText = crawlableText(faq.html);
  assert(faqText.length > 2000, `faq fragment carries only ${faqText.length} crawlable characters`);
  assert(/demigod/i.test(faqText), 'faq fragment should mention the product it answers for');

  // Every route with copy must produce a fragment. A key that yields nothing is the bug.
  for (const key of keys) {
    const fragment = routeStaticFragment(key, { pages });
    assert(crawlableText(fragment.html).length >= PROSE_MIN_CHARS, `${key} produced an almost-empty fragment`);
  }

  // Two routes must not carry the same text — that duplication is the live defect being fixed.
  const texts = new Map();
  for (const key of keys) {
    const text = crawlableText(routeStaticFragment(key, { pages }).html);
    const clash = [...texts.entries()].find(([, other]) => other === text);
    assert(!clash, `${key} and ${clash?.[0]} would serve identical crawlable text`);
    texts.set(key, text);
  }

  // Fail closed, loudly, on the two ways this could silently publish nothing.
  let threw = false;
  try { routeStaticFragment('no-such-route', { pages }); } catch { threw = true; }
  assert(threw, 'an unknown route key must throw rather than return an empty fragment');
  threw = false;
  try { routeStaticFragment('faq', { pages, maxBytes: 10 }); } catch { threw = true; }
  assert(threw, 'a fragment over the ceiling must fail rather than truncate an argument');

  assert(typeof paths === 'object', 'DG_PAGE_PATHS should come back with the pages');
  return { keys, faqText };
}

async function faqSelftest(pages) {
  const assert = (cond, msg) => { if (!cond) throw new Error(`route-static selftest: ${msg}`); };
  const { faqPairsFromHtml, faqPairsMatch } = await import('./demigod-seo-audit.mjs');
  const visible = faqPairsFromDetails(pages.faq.html);
  assert(visible.length === 17, `expected the 17 documented Q&A pairs, got ${visible.length}`);
  const bundle = await faqStaticBundle({ pages });
  // The round trip seo-audit checks against a live page, checked here against the source instead:
  // generate the schema, parse it back out of the HTML, and require an exact pair-for-pair match.
  const schemaPairs = faqPairsFromHtml(bundle.html);
  assert(schemaPairs.length === visible.length, `schema carries ${schemaPairs.length} pairs, visible has ${visible.length}`);
  assert(faqPairsMatch(visible, schemaPairs), 'visible FAQ answers and the schema they generate must match exactly');
  assert(bundle.bytes <= DEPLOYABLE_BYTES, `faq bundle ${bundle.bytes} over the ceiling`);
  return bundle;
}

function blogSelftest(pages) {
  const assert = (cond, msg) => { if (!cond) throw new Error(`route-static selftest: ${msg}`); };
  const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'demigod-blog-posts.json'), 'utf8'));
  const list = Array.isArray(posts) ? posts : posts.posts || [];
  const bundle = blogStaticBundle({ pages, posts: list });
  const text = crawlableText(bundle.html);
  const drafts = list.filter((post) => post?.published === false);
  assert(bundle.posts >= 1, 'the published essay must reach the fragment');
  assert(text.length > 3000, `blog bundle carries only ${text.length} crawlable characters`);
  for (const draft of drafts) {
    assert(!text.includes(String(draft.title)), `draft "${draft.title}" must not be published by a renderer`);
    const opening = String(draft.body || '').slice(0, 60);
    assert(!opening || !text.includes(opening), `draft "${draft.title}" body leaked into the fragment`);
  }
  // A body that arrives as data is escaped, not trusted: the essays are a file anyone can edit.
  const escaped = blogStaticBundle({
    pages,
    posts: [{ slug: 'x', title: '<script>alert(1)</script>', summary: 's', body: 'Body & more', published: true }],
  });
  assert(!/<script>alert/.test(escaped.html), 'a post title must be escaped, never rendered as markup');
  assert(escaped.html.includes('&amp;'), 'a body ampersand must be escaped');
  return bundle;
}

async function runSelftest() {
  const { pages } = loadFootPages();
  const { keys, faqText } = selftestPages(pages);
  const bundle = await faqSelftest(pages);
  const blog = blogSelftest(pages);
  console.log(JSON.stringify({
    ok: true,
    selftest: 'route-static',
    routes: keys.length,
    faqCrawlableChars: faqText.length,
    faqPairs: bundle.pairs,
    faqBundleBytes: bundle.bytes,
    blogPosts: blog.posts,
    blogDrafts: blog.drafts,
    blogCrawlableChars: crawlableText(blog.html).length,
  }));
}

if (isMain) {
  const args = process.argv.slice(2);
  const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  if (args.includes('--selftest')) {
    await runSelftest();
  } else if (args.includes('--list')) {
    const { pages } = loadFootPages();
    const rows = routeKeysWithCopy(pages).map((key) => {
      const fragment = routeStaticFragment(key, { pages });
      const chars = crawlableText(fragment.html).length;
      return { key, bytes: fragment.bytes, crawlableChars: chars, kind: chars >= PROSE_MIN_CHARS ? 'prose' : 'data-shell' };
    });
    console.log(JSON.stringify({ schema: 'demigod.route-static/1', routes: rows }, null, 2));
  } else if (args.includes('--stage')) {
    const { pages } = loadFootPages();
    const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'demigod-blog-posts.json'), 'utf8'));
    const list = Array.isArray(posts) ? posts : posts.posts || [];
    const staged = [];
    for (const key of routeKeysWithProse(pages)) {
      const fragment = key === 'faq' ? await faqStaticBundle({ pages }) : routeStaticFragment(key, { pages });
      staged.push(stageRoutePastePackage(fragment));
    }
    staged.push(stageRoutePastePackage(blogStaticBundle({ pages, posts: list })));
    console.log(JSON.stringify({
      schema: 'demigod.route-static/1',
      staged: staged.length,
      totalCrawlableChars: staged.reduce((sum, row) => sum + row.crawlableChars, 0),
      routes: staged.map((row) => ({ route: row.route, bytes: row.bytes, crawlableChars: row.crawlableChars, deployable: row.deployable })),
    }, null, 2));
  } else if (flag('route')) {
    const { pages } = loadFootPages();
    process.stdout.write(routeStaticFragment(flag('route'), { pages }).html);
  } else {
    console.log('usage: demigod-route-static.mjs [--route=KEY | --list | --stage | --selftest]');
  }
}
