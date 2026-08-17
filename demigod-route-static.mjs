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

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`route-static selftest: ${msg}`); };
  // Against the REAL foot, not a fixture. A fixture would prove the wrapper works while the
  // extraction quietly returned nothing, which is the failure that matters.
  const { pages, paths } = loadFootPages();
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
  console.log(JSON.stringify({
    ok: true,
    selftest: 'route-static',
    routes: keys.length,
    faqCrawlableChars: faqText.length,
  }));
}

if (isMain) {
  const args = process.argv.slice(2);
  const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  if (args.includes('--selftest')) {
    selftest();
  } else if (args.includes('--list')) {
    const { pages } = loadFootPages();
    const rows = routeKeysWithCopy(pages).map((key) => {
      const fragment = routeStaticFragment(key, { pages });
      const chars = crawlableText(fragment.html).length;
      return { key, bytes: fragment.bytes, crawlableChars: chars, kind: chars >= PROSE_MIN_CHARS ? 'prose' : 'data-shell' };
    });
    console.log(JSON.stringify({ schema: 'demigod.route-static/1', routes: rows }, null, 2));
  } else if (flag('route')) {
    const { pages } = loadFootPages();
    process.stdout.write(routeStaticFragment(flag('route'), { pages }).html);
  } else {
    console.log('usage: demigod-route-static.mjs [--route=KEY | --list | --selftest]');
  }
}
