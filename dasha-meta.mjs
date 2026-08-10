#!/usr/bin/env node
/**
 * Dasha meta-layer gate — docs truth, legacy quarantine, SEO artifacts, ship wiring.
 *
 *   node dasha-meta.mjs              # check (exit 1 on hard fail)
 *   node dasha-meta.mjs --fix      # also run SEO page-title MCP? no — check only
 *
 * Soft: www robots/sitemap still empty (Webflow site SEO UI)
 * Hard: disk robots/sitemap missing, legacy publish not retired, wrong doc pointers
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const hard = [];
const soft = [];
const checks = [];

function note(id, ok, detail = {}, softFail = false) {
  checks.push({ id, ok, soft: softFail && !ok, ...detail });
  if (!ok) (softFail ? soft : hard).push(id);
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function exists(rel) {
  return existsSync(join(root, rel));
}

// --- SEO disk artifacts ---
note('robots-disk', exists('dasha-robots.txt') && /User-agent:/i.test(read('dasha-robots.txt')));
note(
  'sitemap-disk',
  exists('dasha-sitemap.xml') &&
    read('dasha-sitemap.xml').includes('www.getdasha.com/') &&
    read('dasha-sitemap.xml').includes('/studio') &&
    read('dasha-sitemap.xml').includes('/dasha'),
);
note(
  'landing-sitemap-link',
  exists('dasha-landing.html') && read('dasha-landing.html').includes('lobby.getdasha.com/sitemap.xml'),
);

// --- ship / publish truth ---
const ship = exists('dasha-ship.mjs') ? read('dasha-ship.mjs') : '';
note('ship-readback', /readbackSurface|push:readback/.test(ship));
note(
  'ship-readback-test',
  exists('dasha-ship-readback.test.mjs') && /embedHash|hashMatch/.test(read('dasha-ship-readback.test.mjs')),
);
note('ship-audit', ship.includes('dasha-audit-live'));
note('howto-disk', exists('dasha-how-to-buy.html') && read('dasha-how-to-buy.html').includes('53uxQtB9'));
note(
  'lobby-www-routes',
  exists('dasha-lobby-wrangler.jsonc') &&
    /www\.getdasha\.com\/\*/.test(read('dasha-lobby-wrangler.jsonc')) &&
    /getdasha\.com\/\*/.test(read('dasha-lobby-wrangler.jsonc')),
);
const pub = exists('bin/dasha-publish') ? read('bin/dasha-publish') : '';
note('publish-retired', /retired|ABORT/i.test(pub) && !/catbox\.moe/i.test(pub));

// --- legacy quarantine markers ---
const legacyFiles = [
  'dasha-call-webflow-get.mjs',
  'dasha-call-webflow-mcp.mjs',
  'dasha-call-webflow-publish.mjs',
  'dasha-call-webflow-pub-now.mjs',
  'dasha-call-webflow-set-now.mjs',
  'dasha-conviction-receipt.html',
  'dasha-receipts-worker.mjs',
];
let legacyMarked = 0;
for (const f of legacyFiles) {
  if (!exists(f)) continue;
  const head = read(f).slice(0, 400);
  if (/LEGACY|RETIRED|ARCHIVED|do not ship|scrapped/i.test(head)) legacyMarked++;
}
note('legacy-headers', legacyMarked >= 4, { marked: legacyMarked, of: legacyFiles.length });

// --- docs truth ---
const docs = exists('DASHA-DOCS.md') ? read('DASHA-DOCS.md') : '';
const workflow = exists('DASHA-WORKFLOW.md') ? read('DASHA-WORKFLOW.md') : '';
const domainRunbook = exists('DASHA-DOMAIN-WEBFLOW-LAUNCH.md') ? read('DASHA-DOMAIN-WEBFLOW-LAUNCH.md') : '';
note(
  'metadata-contract',
  exists('dasha-webflow-metadata.mjs') &&
    /WEBFLOW_METADATA/.test(read('dasha-webflow-metadata.mjs')) &&
    /dasha-webflow-metadata\.mjs/.test(docs),
);
note('docs-lobby-live', /lobby\.getdasha\.com/i.test(docs));
note('docs-no-casino-live-truth', !/Live drift: home still says `THE CASINO IS OPEN`/i.test(docs));
note('workflow-ship', /dasha-ship\.mjs|dasha-audit-live/i.test(workflow));
note('workflow-no-thesis-lane', !/Thesis Card experiment/i.test(workflow));
note(
  'domain-runbook-current',
  /Current override — 2026-08-09/.test(domainRunbook) &&
    /\$dasha — make the timeline stranger/.test(domainRunbook) &&
    /Do not create a disclaimer route/.test(domainRunbook),
);
note('meta-doc', exists('DASHA-META.md'));
note('live-context', exists('DASHA-LIVE-CONTEXT.md'));
note(
  'context-scripts',
  exists('dasha-context-refresh.mjs') && exists('dasha-peer-ping.mjs'),
);

// --- package scripts ---
const pkg = JSON.parse(read('package.json'));
note('script-audit-tools', Boolean(pkg.scripts['dasha:audit:tools']));
note('script-audit-live', Boolean(pkg.scripts['dasha:audit:live']));
note('script-meta', Boolean(pkg.scripts['dasha:meta']));
note(
  'test-all-breadth',
  /mint-consistency|culture-seeds|landing-mint-check/.test(pkg.scripts['dasha:test:all'] || ''),
);

// --- assets gen includes SEO ---
const gen = exists('dasha-lobby-static-gen.mjs') ? read('dasha-lobby-static-gen.mjs') : '';
note('static-gen-seo', /ROBOTS_TXT|SITEMAP_XML/.test(gen) || !exists('dasha-lobby-static-gen.mjs'), {
  hint: 'run node dasha-lobby-assets-build.mjs --write',
});

// --- live soft checks (optional network) ---
if (process.env.DASHA_META_OFFLINE !== '1') {
  try {
    const [wwwRobots, wwwMap, lobRobots, lobMap] = await Promise.all([
      fetch('https://www.getdasha.com/robots.txt', { signal: AbortSignal.timeout(10000) }),
      fetch('https://www.getdasha.com/sitemap.xml', { signal: AbortSignal.timeout(10000) }),
      fetch('https://lobby.getdasha.com/robots.txt', { signal: AbortSignal.timeout(10000) }),
      fetch('https://lobby.getdasha.com/sitemap.xml', { signal: AbortSignal.timeout(10000) }),
    ]);
    const wr = await wwwRobots.text();
    const wm = await wwwMap.text();
    const lr = await lobRobots.text();
    const lm = await lobMap.text();
    note('live-lobby-robots', lobRobots.status === 200 && /User-agent:/i.test(lr), {
      status: lobRobots.status,
    });
    note('live-lobby-sitemap', lobMap.status === 200 && /urlset|getdasha\.com/i.test(lm), {
      status: lobMap.status,
    });
    if (!(wwwRobots.status === 200 && wr.trim().length > 0)) {
      note('live-www-robots', false, { status: wwwRobots.status, bytes: wr.length }, true);
    } else note('live-www-robots', true);
    if (!(wwwMap.status === 200 && /urlset/i.test(wm))) {
      note('live-www-sitemap', false, { status: wwwMap.status }, true);
    } else note('live-www-sitemap', true);

    const home = await (await fetch('https://www.getdasha.com/', { signal: AbortSignal.timeout(10000) })).text();
    note('live-no-casino-title', !/<title>[^<]*casino is open/i.test(home), {
      title: (home.match(/<title>([^<]+)/i) || [])[1],
    });
  } catch (e) {
    note('live-meta-fetch', false, { error: String(e.message || e).slice(0, 120) }, true);
  }
}

const report = {
  ok: hard.length === 0,
  hard: [...new Set(hard)],
  soft: [...new Set(soft)],
  checks,
  note:
    hard.length === 0
      ? soft.length
        ? `meta ok with soft: ${[...new Set(soft)].join(', ')}`
        : 'meta ok'
      : `meta hard fails: ${[...new Set(hard)].join(', ')}`,
};

writeFileSync('/tmp/dasha-meta.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

// Stamp shared NOW file without re-entering meta (offline uses JSON just written).
if (process.env.DASHA_META_NO_CONTEXT !== '1') {
  try {
    const { spawnSync } = await import('node:child_process');
    spawnSync(
      process.execPath,
      [
        join(root, 'dasha-context-refresh.mjs'),
        '--offline',
        '--agent',
        'meta',
        '--note',
        report.ok ? `meta ok${report.soft.length ? ` soft:${report.soft.join(',')}` : ''}` : `meta FAIL ${report.hard.join(',')}`,
      ],
      { cwd: root, encoding: 'utf8', env: { ...process.env, DASHA_META_NO_CONTEXT: '1' } },
    );
  } catch {
    /* ignore */
  }
}

process.exit(report.ok ? 0 : 1);
