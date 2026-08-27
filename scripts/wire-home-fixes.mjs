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
      "from './dasha-home-compute.mjs';\nimport { pinLiveXConnectSri } from './dasha-sri-x-connect.mjs';\nimport { ensureFaucetHeading } from './dasha-faucet-heading.mjs';\n",
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
      "request.method === 'HEAD' ? null : faucetPageHtml()",
      "request.method === 'HEAD' ? null : ensureFaucetHeading(pinLiveXConnectSri(faucetPageHtml()))",
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
