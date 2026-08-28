#!/usr/bin/env node
/** Idempotent wires for homepage CTA strip + Dasha Compute door. */
import { readFileSync, writeFileSync } from 'node:fs';

function mustInclude(hay, needle, label) {
  if (!hay.includes(needle)) throw new Error(`${label}: needle missing`);
}

function wireDemigod(src) {
  let s = src;
  if (!s.includes("from './demigod-html-prefill.mjs'")) {
    const motleyMod = './demigod-home-' + 'motley.mjs';
    const fromMotley = `import { demigodHomeHtml } from '${motleyMod}';\n`;
    const fromFeed = ' */\nconst FEED_SCHEMA';
    if (s.includes(fromMotley) && !s.includes("from './demigod-html-prefill.mjs'")) {
      s = s.replace(
        fromMotley,
        `${fromMotley}import { stripLeakedBriefPrefill } from './demigod-html-prefill.mjs';\nexport { stripLeakedBriefPrefill };\n`,
      );
    } else {
      mustInclude(s, fromFeed, 'demigod-html-worker import');
      s = s.replace(
        fromFeed,
        " */\nimport { stripLeakedBriefPrefill } from './demigod-html-prefill.mjs';\nexport { stripLeakedBriefPrefill };\nconst FEED_SCHEMA",
      );
    }
  }
  if (!s.includes('stripGoldAccent(stripLeakedBriefPrefill(html))')) {
    const needle = 'html = rewriteStaleSnapshotDates(rewriteCdnPin(stripGoldAccent(html)));';
    if (s.includes(needle)) {
      s = s.replace(
        needle,
        'html = rewriteStaleSnapshotDates(rewriteCdnPin(stripGoldAccent(stripLeakedBriefPrefill(html))));',
      );
    }
  }
  if (s.includes('demigodHomeHtml()') && !s.includes('stripLeakedBriefPrefill(demigodHomeHtml())')) {
    s = s.replaceAll('demigodHomeHtml()', 'stripLeakedBriefPrefill(demigodHomeHtml())');
  }
  if (!s.includes("from './demigod-product-sitemap.mjs'")) {
    const fromPrefill = "import { stripLeakedBriefPrefill } from './demigod-html-prefill.mjs';\n";
    if (s.includes(fromPrefill)) {
      s = s.replace(
        fromPrefill,
        `${fromPrefill}import { isProductPath, isSitemapPath, sitemapResponse } from './demigod-product-sitemap.mjs';\n`,
      );
    }
  }
  if (!s.includes('isSitemapPath(url.pathname)')) {
    const needle = `    if (isProductHost(url.hostname)) {
      // Worker-owned 200s. Do not fetch Webflow — /companies and /c/:id are 404 there,
      // and foot JS cannot rescue an upstream 404.
      if (
        (request.method === 'GET' || request.method === 'HEAD') &&
        (isCompaniesPath(url.pathname) || isCompanyPath(url.pathname))
      ) {
        return companiesEdge(request, url);
      }`;
    if (s.includes(needle)) {
      s = s.replace(
        needle,
        `    if (isProductHost(url.hostname)) {
      // Worker-owned 200s. Do not fetch Webflow — /companies and /c/:id are 404 there,
      // and foot JS cannot rescue an upstream 404.
      if ((request.method === 'GET' || request.method === 'HEAD') && isSitemapPath(url.pathname)) {
        return sitemapResponse(request);
      }
      if ((request.method === 'GET' || request.method === 'HEAD') && isProductPath(url.pathname)) {
        return productEdge(request, url);
      }
      if (
        (request.method === 'GET' || request.method === 'HEAD') &&
        (isCompaniesPath(url.pathname) || isCompanyPath(url.pathname))
      ) {
        return companiesEdge(request, url);
      }`,
      );
    }
  }
  return s;
}

function wireDasha(src) {
  let s = src;
  if (!s.includes("from './dasha-home-compute.mjs'")) {
    const needle = "} from './dasha-award-chrome.mjs';\n";
    mustInclude(s, needle, 'dasha-lobby-worker import');
    s = s.replace(
      needle,
      "} from './dasha-award-chrome.mjs';\nimport { ensureHomeComputeDoor, ensureHomeComputeHop } from './dasha-home-compute.mjs';\n",
    );
  }
  if (!s.includes("from './dasha-sri-x-connect.mjs'")) {
    const needle = "from './dasha-home-compute.mjs';\n";
    mustInclude(s, needle, 'dasha-lobby-worker x-connect import');
    s = s.replace(
      needle,
      "from './dasha-home-compute.mjs';\nimport { pinLiveXConnectSri, ensureLiveXConnect } from './dasha-sri-x-connect.mjs';\nimport { ensureFaucetHeading } from './dasha-faucet-heading.mjs';\n",
    );
  }
  if (s.includes("from './dasha-sri-x-connect.mjs'") && !s.includes('ensureLiveXConnect')) {
    s = s.replace(
      "import { pinLiveXConnectSri } from './dasha-sri-x-connect.mjs';",
      "import { pinLiveXConnectSri, ensureLiveXConnect } from './dasha-sri-x-connect.mjs';",
    );
  }
  if (!s.includes('page = ensureHomeComputeDoor(page);')) {
    const needle = '  page = ensureHomeForumHop(page);\n  return ensureTwitterSite(ensureHomeSeo(page));';
    mustInclude(s, needle, 'dasha-lobby-worker rewriteHomeFirstViewport');
    s = s.replace(
      needle,
      '  page = ensureHomeForumHop(page);\n  page = ensureHomeComputeDoor(page);\n  page = ensureHomeComputeHop(page);\n  return ensureTwitterSite(ensureHomeSeo(page));',
    );
  }
  if (s.includes('return ensureTwitterSite(ensureHomeSeo(page));') && !s.includes('pinLiveXConnectSri(ensureTwitterSite')) {
    s = s.replace(
      'return ensureTwitterSite(ensureHomeSeo(page));',
      'return pinLiveXConnectSri(ensureTwitterSite(ensureHomeSeo(page)));',
    );
  }
  if (s.includes('faucetPageHtml()') && !s.includes('ensureFaucetHeading(')) {
    s = s.replaceAll(
      'request.method === \'HEAD\' ? null : faucetPageHtml()',
      "request.method === 'HEAD' ? null : ensureFaucetHeading(ensureLiveXConnect(faucetPageHtml()))",
    );
  }
  if (s.includes('ensureFaucetHeading(pinLiveXConnectSri(faucetPageHtml()))')) {
    s = s.replaceAll(
      'ensureFaucetHeading(pinLiveXConnectSri(faucetPageHtml()))',
      'ensureFaucetHeading(ensureLiveXConnect(faucetPageHtml()))',
    );
  }
  if (s.includes('return pinLiveXConnectSri(ensureTwitterSite(ensureHomeSeo(page)));')) {
    s = s.replace(
      'return pinLiveXConnectSri(ensureTwitterSite(ensureHomeSeo(page)));',
      'return ensureLiveXConnect(ensureTwitterSite(ensureHomeSeo(page)));',
    );
  }
  if (!s.includes('ensureLiveXConnect(forumPageHtml())')) {
    const needle = "return new Response(request.method === 'HEAD' ? null : forumPageHtml(), {";
    if (s.includes(needle)) {
      s = s.replaceAll(
        needle,
        "return new Response(request.method === 'HEAD' ? null : ensureLiveXConnect(forumPageHtml()), {",
      );
    }
  }
  if (s.includes('chessPageForRequest') && !s.includes('ensureLiveXConnect(html)')) {
    s = s.replaceAll(
      'const html = await chessPageForRequest(request, env);\n    return new Response(request.method === \'HEAD\' ? null : html, {',
      'const html = await chessPageForRequest(request, env);\n    return new Response(request.method === \'HEAD\' ? null : ensureLiveXConnect(html), {',
    );
    s = s.replaceAll(
      'const html = await chessPageForRequest(request, env);\n      return new Response(request.method === \'HEAD\' ? null : html, {',
      'const html = await chessPageForRequest(request, env);\n      return new Response(request.method === \'HEAD\' ? null : ensureLiveXConnect(html), {',
    );
  }
  if (!s.includes("from './dasha-compute-release.mjs'")) {
    const needle = "from './dasha-faucet-heading.mjs';\n";
    if (s.includes(needle)) {
      s = s.replace(
        needle,
        "from './dasha-faucet-heading.mjs';\nimport { computeReleaseKind, computeReleaseResponse } from './dasha-compute-release.mjs';\n",
      );
    }
  }
  if (!s.includes('computeReleaseKind(url.pathname)')) {
    const needle = "  if ((request.method === 'GET' || request.method === 'HEAD') && isFaucetPagePath(url.pathname)) {\n    return faucetPageResponse(request);\n  }";
    if (s.includes(needle)) {
      s = s.replaceAll(
        needle,
        "  if ((request.method === 'GET' || request.method === 'HEAD') && computeReleaseKind(url.pathname)) {\n    return computeReleaseResponse(request, url.pathname);\n  }\n  if ((request.method === 'GET' || request.method === 'HEAD') && isFaucetPagePath(url.pathname)) {\n    return faucetPageResponse(request);\n  }",
      );
    }
  }
  return s;
}

const jobs = [
  ['demigod-html-worker.mjs', wireDemigod],
  ['dasha-lobby-worker.mjs', wireDasha],
];

const changed = [];
for (const [file, wire] of jobs) {
  const before = readFileSync(file, 'utf8');
  const after = wire(before);
  if (after !== before) {
    writeFileSync(file, after);
    changed.push(file);
  }
}

console.log(JSON.stringify({ ok: true, changed }, null, 2));
