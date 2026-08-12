#!/usr/bin/env node
/**
 * Disk identity matrix — one place that fails if mint/claims/love wiring drift across surfaces.
 *
 *   node dasha-identity-matrix.mjs           # JSON scoreboard
 *   node dasha-identity-matrix.mjs --quiet   # exit code only
 *
 * Exit 0 only when every hard cell passes.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PUBLIC_METRICS_KEYS, publicFunnelKeyChecklist } from './dasha-public-metrics-schema.mjs';
import { NEGATIVE_COIN_COPY, MISLEADING_COIN_COPY, publicCopyFromHtml } from './dasha-public-copy.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const FORBIDDEN = /thesis card|conviction receipt|\bt\.me\/dashacommunity\b|official Dasha|safe token|verified mint/i;

const SURFACES = [
  ['landing', 'dasha-landing.html'],
  ['studio', 'dasha-meme-studio.html'],
  ['lobby-page', 'dasha-lobby-page.html'],
  ['howto', 'dasha-how-to-buy.html'],
  ['desk-shell', 'dasha-desk-shell.html'],
];

function read(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

function cell(id, ok, detail = {}) {
  return { id, ok: Boolean(ok), ...detail };
}

/** Pure checks over disk — no network. */
export function runIdentityMatrix() {
  const cells = [];
  const hard = [];
  const soft = [];

  const push = (c, { softFail = false } = {}) => {
    cells.push(c);
    if (!c.ok) (softFail ? soft : hard).push(c.id);
  };

  // —— mint + forbidden product language on public surfaces ——
  for (const [id, file] of SURFACES) {
    const html = read(file);
    if (html == null) {
      push(cell(`surface-${id}-present`, false, { file }), { softFail: id === 'howto' });
      continue;
    }
    push(cell(`surface-${id}-present`, true, { file, bytes: html.length }));
    // Mint identity is required on token-facing surfaces; lobby/desk shell may omit.
    if (id === 'studio' || id === 'landing' || id === 'howto') {
      push(cell(`surface-${id}-mint`, html.includes(MINT), { file }));
    }
    push(cell(`surface-${id}-no-forbidden`, !FORBIDDEN.test(html), { file }));
    const copy = publicCopyFromHtml(html);
    push(cell(`surface-${id}-no-negative-coin`, !NEGATIVE_COIN_COPY.test(copy), { file }));
    push(cell(`surface-${id}-no-misleading-coin`, !MISLEADING_COIN_COPY.test(copy), { file }));
  }

  // —— Studio love-loop wiring (source) ——
  const studio = read('dasha-meme-studio.html') || '';
  const studioMarkers = [
    ['studio-ensure-handoff', /ensureHandoffUrl/],
    ['studio-handoff-api', /studio\/handoff/],
    ['studio-handoff-mint-event', /handoff_mint/],
    ['studio-share-primary', /id="share"|function share\b/],
    ['studio-copy-link', /id="copy-link"/],
    ['studio-after-share', /after-share|make another|Pass-it-on/i],
    ['studio-poster-default', /id: 'poster'/],
    ['studio-surprise', /function surpriseMe/],
    ['studio-today', /todaysRitual|ritual-today/],
    ['studio-no-wallet-gate', !/connect wallet|require.*wallet|wallet required/i.test(studio)],
  ];
  for (const [id, re] of studioMarkers) {
    const ok = typeof re === 'boolean' ? re : re.test(studio);
    push(cell(id, ok));
  }

  // —— Worker handoff + public funnel keys ——
  const worker = read('dasha-lobby-worker.mjs') || '';
  push(cell('worker-handoff-post', /path === '\/studio\/handoff'/.test(worker) || /\/studio\/handoff/.test(worker)));
  push(cell('worker-handoff-get', /path\.startsWith\('\/h\/'\)|pathname\.startsWith\('\/h\/'\)/.test(worker)));
  push(cell('worker-handoff-og', /\/og\.png|handoffOgPng/.test(worker)));
  push(cell('worker-handoff-metrics', /handoffMints/.test(worker) && /handoffOpens/.test(worker)));
  push(cell('worker-public-funnel', /export function publicFunnelSummary/.test(worker)));

  const funnelStart = worker.indexOf('export function publicFunnelSummary');
  const funnelSlice = funnelStart >= 0 ? worker.slice(funnelStart, funnelStart + 4500) : '';
  const missingKeys = publicFunnelKeyChecklist(funnelSlice);
  push(cell('worker-funnel-studio-keys', missingKeys.length === 0, { missing: missingKeys }));

  // —— Embed / thin loader pins ——
  const embed = read('dasha-studio-embed.js') || '';
  const embedHtml = read('dasha-studio-embed.html') || '';
  push(
    cell(
      'embed-studio-client',
      /client\/studio\.js/.test(embed + embedHtml) || /attachShadow/.test(embed),
    ),
  );
  push(cell('embed-or-inline-shadow', /attachShadow/.test(embed) || /integrity=.*sha384-/.test(embedHtml + embed)));

  // —— OG helpers present ——
  push(cell('handoff-og-module', existsSync(join(root, 'dasha-handoff-og.mjs'))));
  push(cell('love-spec-doc', existsSync(join(root, 'DASHA-LOVE-SPEC.md'))));

  // —— Schema module agrees with audit import surface ——
  push(cell('schema-studio-has-handoff', PUBLIC_METRICS_KEYS.studio.includes('handoffMints')));
  push(cell('schema-studio-has-mint-to-open', PUBLIC_METRICS_KEYS.studio.includes('mintToOpen')));

  // —— Asset hash file if present ——
  const assets = read('dasha-lobby-assets.json') || read('dasha-lobby-static/assets.json');
  if (assets) {
    try {
      const j = JSON.parse(assets);
      push(cell('lobby-assets-json', Boolean(j.hash || j.assets || j.version), { keys: Object.keys(j).slice(0, 8) }));
    } catch {
      push(cell('lobby-assets-json', false, { error: 'invalid-json' }));
    }
  } else {
    push(cell('lobby-assets-json', true, { note: 'absent-ok' }), { softFail: true });
  }

  // —— Social card bytes exist ——
  for (const card of ['dasha-social-card.png', 'dasha-social-card-studio.png']) {
    const path = join(root, card);
    push(cell(`card-${card}`, existsSync(path), { path: card }), { softFail: true });
  }

  const ok = hard.length === 0;
  return {
    ok,
    hard,
    soft,
    cells,
    mint: MINT,
    ms: 0,
  };
}

function main() {
  const quiet = process.argv.includes('--quiet');
  const t0 = Date.now();
  const report = runIdentityMatrix();
  report.ms = Date.now() - t0;
  if (!quiet) console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
