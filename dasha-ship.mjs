#!/usr/bin/env node
/**
 * Dasha fast ship — one command for prepare → gate → Webflow push → publish → live check.
 *
 * Default is FAST: no Puppeteer/CDP (those gates take 2–4 minutes). Use --strict for full suite.
 *
 *   node dasha-ship.mjs              # prep + fast gate (default)
 *   node dasha-ship.mjs --prep       # build embeds only
 *   node dasha-ship.mjs --gate       # fast static gate only
 *   node dasha-ship.mjs --ship       # prep + gate + push + lobby deploy + publish + verify
 *   node dasha-ship.mjs --ship --strict
 *   node dasha-ship.mjs --push       # push embeds only (no publish)
 *   node dasha-ship.mjs --push --home-only # push homepage only
 *   node dasha-ship.mjs --push --desk-only --no-prep # push an exact prepared Desk
 *   node dasha-ship.mjs --publish    # site publish only
 *   node dasha-ship.mjs --verify     # dasha-audit-live --fast (worker+site)
 *   node dasha-ship.mjs --lobby-deploy # wrangler deploy lobby worker only
 *   node dasha-ship.mjs --ship --no-lobby-deploy  # skip worker deploy
 *   DASHA_AUDIT_PROTOCOL=1 … --verify  # full WS protocol after ship
 *   DASHA_SHIP_VERIFY_ATTEMPTS=8 DASHA_SHIP_VERIFY_DELAY_SEC=10  # CDN lag retries
 *   node dasha-ship.mjs --token-check  # MCP auth smoke only (no write)
 *
 * Token: env DASHA_WF_TOKEN or file /tmp/dasha-wf-token.txt (MCP Bearer).
 */
import { createHash } from 'node:crypto';
import { NEGATIVE_COIN_COPY } from './dasha-public-copy.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const want = {
  prep: args.has('--prep') || args.has('--ship') || args.has('--push') || args.size === 0,
  gate: args.has('--gate') || args.has('--ship') || args.size === 0,
  push: args.has('--push') || args.has('--ship'),
  publish: args.has('--publish') || args.has('--ship'),
  verify: args.has('--verify') || args.has('--ship'),
  tokenCheck: args.has('--token-check'),
  strict: args.has('--strict'),
  dry: args.has('--dry-run'),
};
if (args.has('--no-prep')) want.prep = false;
// token-check alone: do not also prep/gate
if (args.has('--token-check') && args.size === 1) {
  want.prep = false;
  want.gate = false;
  want.push = false;
  want.publish = false;
  want.verify = false;
}

const SITE = '5f1458122ba25e70a3ff2bd0';
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const SURFACES = {
  home: {
    pageId: '5f1458136c15aa41639b8538',
    element: 'b1681188-19dd-6175-7472-68887d3c6e10',
    file: 'dasha-landing.html',
    label: 'home',
  },
  studio: {
    pageId: '6a763858748c216defe621b9',
    element: 'b1681188-19dd-6175-7472-68887d3c6e10',
    file: 'dasha-studio-embed.html',
    label: 'studio',
  },
  lobby: {
    pageId: '6a77870a95e3872a95ef7337',
    element: 'b1681188-19dd-6175-7472-68887d3c6e10',
    file: 'dasha-lobby-page.html',
    label: 'lobby',
  },
  desk: {
    pageId: '6a74b59530c70741b1c574c4',
    element: 'f4239e35-08c6-0874-27bc-8ce5b8ca547f',
    file: join('.tmp-dasha-ship', 'publish-ready', 'dasha-desk-embed.html'),
    label: 'desk',
  },
};
// Full ship: studio → lobby → desk → home last. Homepage is the highest-risk surface;
// writing it last reduces "Designer ok, live stale/wrong embed" races.
const shipSurfaces = args.has('--home-only')
  ? [SURFACES.home]
  : args.has('--desk-only')
    ? [SURFACES.desk]
    : args.has('--studio-only')
      ? [SURFACES.studio]
      : [SURFACES.studio, SURFACES.lobby, SURFACES.desk, SURFACES.home];
const DOMAINS = ['6a762e813cfcf91448a83e3b', '6a762e833cfcf91448a83e58'];
const wantLobbyDeploy =
  (args.has('--ship') || args.has('--lobby-deploy')) && !args.has('--no-lobby-deploy');

const t0 = Date.now();
const log = (step, extra = {}) =>
  console.log(JSON.stringify({ ms: Date.now() - t0, step, ...extra }));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    ...opts,
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').slice(-2000);
    throw new Error(`${cmd} ${cmdArgs.join(' ')} failed (${r.status}): ${err}`);
  }
  return r.stdout;
}

function prep() {
  log('prep:start');
  run('node', ['dasha-desk/build.mjs', '--write']);
  run('node', ['dasha-studio-embed-build.mjs']);
  // Assets before landing tags so Worker static gen matches what we deploy.
  run('node', ['dasha-lobby-assets-build.mjs', '--write']);
  // Rebuild the thin Studio loader with the SRI of the exact Worker bytes just frozen above.
  run('node', ['dasha-studio-embed-build.mjs']);
  run('node', ['dasha-lobby-embed-build.mjs', '--write']);
  run('node', ['dasha-simp-board-embed-build.mjs', '--write']);
  // Re-freeze assets after embed tag writers (they may rewrite landing size only;
  // hash is from clients+robots+sitemap+howto, not landing).
  run('node', ['dasha-lobby-assets-build.mjs', '--check']);
  const shipDir = join(root, '.tmp-dasha-ship', 'publish-ready');
  mkdirSync(shipDir, { recursive: true });
  // desk embed shell from build.mjs
  const deskEmbed = existsSync('/tmp/dasha-webflow-embed.html')
    ? readFileSync('/tmp/dasha-webflow-embed.html', 'utf8')
    : `<div style="min-height:100vh;background:#07060a;padding:8px 0 28px">${read('dasha-desk/src/app.html')}</div>`;
  writeFileSync(join(shipDir, 'dasha-desk-embed.html'), deskEmbed);
  writeFileSync(join(shipDir, 'dasha-landing.html'), read('dasha-landing.html'));
  writeFileSync(join(shipDir, 'dasha-meme-studio.html'), read('dasha-meme-studio.html'));
  writeFileSync(join(shipDir, 'dasha-studio-embed.html'), read('dasha-studio-embed.html'));
  writeFileSync(join(shipDir, 'dasha-desk-dist.html'), read('dasha-desk/dist/index.html'));
  log('prep:done', {
    deskEmbed: deskEmbed.length,
    landing: read('dasha-landing.html').length,
    studioEmbed: read('dasha-studio-embed.html').length,
  });
}

/** Deploy lobby Worker so /client/* + howto assets match disk hash after prep. */
function deployLobby() {
  log('lobby:deploy:start');
  if (want.dry) {
    log('lobby:deploy:dry-run');
    return;
  }
  run('npx', ['wrangler', 'deploy', '-c', 'dasha-lobby-wrangler.jsonc']);
  log('lobby:deploy:done');
}

/** Webflow custom-code hard limit (~49KB). Prefer UTF-8 **bytes**, not JS string length. */
const LANDING_CAP_BYTES = 49000;
/** Leave headroom so a11y/skip/copy tweaks do not silently hit the cap at publish time. */
const LANDING_BUDGET_BYTES = 48000;
function utf8Bytes(s) {
  return Buffer.byteLength(s, 'utf8');
}

function checkExecutionBoundary(name, html, fail) {
  if (/<iframe\b/i.test(html)) fail(`${name} contains an iframe`);
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const tag = match[0], src = match[1];
    if (!src.startsWith('https://lobby.getdasha.com/client/')) fail(`${name} executes an unapproved script: ${src}`);
    if (!/\bintegrity=["']sha384-[A-Za-z0-9+/=]+["']/i.test(tag) || !/\bcrossorigin=["']anonymous["']/i.test(tag)) {
      fail(`${name} has an unpinned cross-origin script: ${src}`);
    }
  }
}

/** Static trust gates only — no CDP, no browser (~milliseconds). */
function fastGate() {
  log('gate:fast:start');
  const landing = read('dasha-landing.html');
  const studio = read('dasha-meme-studio.html');
  const desk = read('dasha-desk/src/body.html');
  const embed = read('dasha-studio-embed.html');
  const lobbyPage = read('dasha-lobby-page.html');
  const howto = read('dasha-how-to-buy.html');
  const sitemap = read('dasha-sitemap.xml');
  const deskPage = read('dasha-desk/dist/index.html');
  const socialCard = read('dasha-og-card.svg');
  const fail = (m) => {
    throw new Error(`fast gate: ${m}`);
  };

  for (const [name, html] of [
    ['landing', landing],
    ['studio', studio],
    ['desk', desk],
  ]) {
    if (!html.includes(MINT)) fail(`${name} missing mint`);
    if (/t\.me\/dashacommunity/i.test(html)) fail(`${name} has banned telegram`);
    if (/official Dasha|safe token|verified mint/i.test(html)) fail(`${name} forbidden claim`);
    if (NEGATIVE_COIN_COPY.test(html)) fail(`${name} has negative coin copy`);
  }
  if (NEGATIVE_COIN_COPY.test(socialCard) || /thesis|receipt|forecast/i.test(socialCard)) fail('social card has retired or negative copy');
  for (const [name, html] of [['landing', landing], ['studio', studio], ['desk', desk], ['studio embed', embed], ['lobby', lobbyPage], ['how-to-buy', howto], ['desk page', deskPage]]) {
    checkExecutionBoundary(name, html, fail);
    if (/<a\b[^>]*href=["']https:\/\/(?:www\.)?dexscreener\.com/i.test(html)) fail(`${name} links the stale Dexscreener profile`);
  }
  if (desk.includes('/how-to-buy')) fail('desk links unpublished how-to-buy');
  for (const match of sitemap.matchAll(/<loc>https:\/\/www\.getdasha\.com(\/[^<]*)<\/loc>/g)) {
    if (match[1] !== '/' && !landing.includes(`href="${match[1]}"`)) fail(`landing orphaned sitemap route ${match[1]}`);
  }
  if (!landing.includes('jup.ag/swap')) fail('landing lost Jupiter path');
  if (/plugin\.jup\.ag|loadJupiter|window\.Jupiter/.test(landing)) fail('landing regained embedded swap plugin');
  if (!landing.includes('https://x.com/dash_eats')) fail('landing missing @dash_eats');
  if (!landing.includes('/studio') || !landing.includes('/dasha')) fail('landing missing dual-path routes');
  if (/thesis card|conviction receipt|receipt-form/i.test(landing)) fail('landing thesis/receipt copy');
  // Landing size: hard cap (bytes) + budget margin. Prefer Worker clients over more inline HTML.
  const landingBytes = utf8Bytes(landing);
  if (landingBytes > LANDING_CAP_BYTES) {
    fail(
      `landing ${landingBytes}B exceeds Webflow custom-code cap (${LANDING_CAP_BYTES}B UTF-8). Move UI to lobby.getdasha.com/client/* or cut CSS/copy.`,
    );
  }
  if (landing.length > LANDING_CAP_BYTES) {
    fail(`landing ${landing.length} chars exceeds safety cap (${LANDING_CAP_BYTES})`);
  }
  if (landingBytes > LANDING_BUDGET_BYTES) {
    log('gate:fast:warn', {
      landingBytes,
      budget: LANDING_BUDGET_BYTES,
      free: LANDING_CAP_BYTES - landingBytes,
      hint: 'Landing over soft budget — prefer external clients before more homepage HTML',
    });
  } else {
    log('gate:fast:landing-size', {
      landingBytes,
      budget: LANDING_BUDGET_BYTES,
      cap: LANDING_CAP_BYTES,
      free: LANDING_CAP_BYTES - landingBytes,
    });
  }
  if (!landing.includes('href="/lobby"') || landing.includes('id="dasha-lobby"')) {
    fail('landing must link to dedicated /lobby without mounting chat');
  }
  if (landing.includes('id="simp"') && !landing.includes('lobby.getdasha.com/client/simp-board.js')) {
    fail('simp section present but client not loaded from lobby host');
  }
  if (!studio.includes("id: 'square'") || !studio.includes("id: 'story'") || !studio.includes("id: 'banner'"))
    fail('studio missing formats');
  if (!embed.includes('lobby.getdasha.com/client/studio.js') || !embed.includes('dasha-studio-embed')) {
    fail('studio embed must use the bounded Worker loader');
  }
  if (!embed.includes(MINT) || !embed.includes('dasha-studio-shell')) {
    fail('studio embed shell must expose mint for first paint / no-JS');
  }
  // embed must be fresh
  run('node', ['dasha-studio-embed-build.mjs', '--check']);
  run('node', ['dasha-desk/build.mjs', '--check']);
  // pure share pack unit (no browser)
  run('node', ['dasha-growth.test.mjs']);
  log('gate:fast:pass');
}

function strictGate() {
  log('gate:strict:start');
  run('npm', ['run', 'dasha:test:all'], { shell: false });
  run('node', ['dasha-studio-embed-build.mjs', '--check']);
  log('gate:strict:pass');
}

function token() {
  const env = process.env.DASHA_WF_TOKEN || process.env.WEBFLOW_TOKEN;
  if (env?.trim()) return env.trim();
  const p = '/tmp/dasha-wf-token.txt';
  if (existsSync(p)) {
    const t = readFileSync(p, 'utf8').trim();
    if (t) return t;
  }
  throw new Error(
    'No Webflow token. Set DASHA_WF_TOKEN or: printf %s \'TOKEN\' > /tmp/dasha-wf-token.txt — then: npm run dasha:token:check',
  );
}

const TOKEN_HELP =
  'Webflow MCP token is invalid/expired. Re-auth in Webflow (MCP/OAuth), then: printf %s \'NEW_TOKEN\' > /tmp/dasha-wf-token.txt && npm run dasha:token:check';

async function mcpClient() {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StreamableHTTPClientTransport } = await import(
    '@modelcontextprotocol/sdk/client/streamableHttp.js'
  );
  let tok;
  try {
    tok = token();
  } catch (e) {
    throw e;
  }
  const transport = new StreamableHTTPClientTransport(new URL('https://mcp.webflow.com/mcp'), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${tok}`,
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json, text/event-stream',
      },
    },
  });
  const client = new Client({ name: 'dasha-ship', version: '1.0.0' });
  try {
    await client.connect(transport);
  } catch (e) {
    const msg = String(e?.message || e);
    if (/invalid_token|401|Auth required|not.?authorized|unauthorized/i.test(msg)) {
      throw new Error(`${TOKEN_HELP}\n(detail: ${msg.slice(0, 240)})`);
    }
    throw e;
  }
  return client;
}

/** Connect + one read-only tool call. Fails loud before any embed write. */
async function assertToken() {
  log('token:check:start');
  const client = await mcpClient();
  try {
    const toolArgs = {
      actions: [
        {
          label: 'dasha_token_ping',
          get_site: { site_id: SITE },
        },
      ],
      context: 'Dasha ship token check — read site only, no publish.',
    };
    await callTool(client, ['data_sites_tool', 'webflow__data_sites_tool'], toolArgs);
    log('token:check:pass', { site: SITE });
  } catch (e) {
    const msg = String(e?.message || e);
    if (/invalid_token|401|Auth required|not.?authorized|unauthorized/i.test(msg)) {
      throw new Error(`${TOKEN_HELP}\n(detail: ${msg.slice(0, 240)})`);
    }
    throw e;
  } finally {
    await client.close().catch(() => {});
  }
}

async function callTool(client, names, toolArgs) {
  let last;
  for (const name of names) {
    try {
      const result = await client.callTool({ name, arguments: toolArgs });
      if (result?.isError) {
        last = new Error(`${name}: ${result?.content?.[0]?.text || 'isError'}`);
        continue;
      }
      return { name, result };
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error('all tool names failed');
}

/** Walk MCP get_settings payload for the longest HTML/JS string (embed body). */
function extractEmbedCode(result) {
  let best = '';
  const walk = (o, depth = 0) => {
    if (!o || depth > 14) return;
    if (typeof o === 'string') {
      if (o.length > best.length && (o.includes('<') || o.includes('function') || o.includes('dasha'))) {
        best = o;
      }
      return;
    }
    if (Array.isArray(o)) {
      for (const x of o) walk(x, depth + 1);
      return;
    }
    if (typeof o === 'object') {
      for (const v of Object.values(o)) walk(v, depth + 1);
    }
  };
  const text = result?.content?.[0]?.text;
  if (typeof text === 'string') {
    try {
      walk(JSON.parse(text));
    } catch {
      walk({ t: text });
    }
  } else {
    walk(result);
  }
  return best;
}

/** Normalize only line endings so OS/JSON path noise does not false-fail; body must match. */
function normalizeEmbed(s) {
  return String(s || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function embedHash(s) {
  return createHash('sha256').update(normalizeEmbed(s), 'utf8').digest('hex');
}

async function readbackSurface(client, s, expected) {
  const toolArgs = {
    siteId: SITE,
    pageId: s.pageId,
    context: `Readback ${s.label} after ship push — catch silent Webflow truncate.`,
    actions: [
      {
        label: `get_${s.label}`,
        get_settings: {
          type: 'query_settings',
          element_id: { component: s.pageId, element: s.element },
          queries: [{ label: 'code', key: 'code' }],
        },
      },
    ],
  };
  const { result } = await callTool(
    client,
    ['data_element_settings_tool', 'webflow__data_element_settings_tool'],
    toolArgs,
  );
  const stored = extractEmbedCode(result);
  const markers = [MINT, 'jup.ag'].filter((m) => expected.includes(m));
  const missing = markers.filter((m) => !stored.includes(m));
  const wantHash = embedHash(expected);
  const gotHash = embedHash(stored);
  const hashMatch = wantHash === gotHash;
  const ratio = expected.length ? stored.length / expected.length : 0;
  // Prefer exact content hash (after line-ending normalize). Keep markers as belt.
  const ok = hashMatch && missing.length === 0 && stored.length >= 100;
  return {
    label: s.label,
    expectedBytes: expected.length,
    storedBytes: stored.length,
    ratio: Math.round(ratio * 1000) / 1000,
    expectedHash: wantHash.slice(0, 16),
    storedHash: gotHash.slice(0, 16),
    hashMatch,
    missing,
    ok,
  };
}

async function pushEmbeds() {
  log('push:start');
  if (want.dry) {
    log('push:dry-run', { surfaces: shipSurfaces.map((surface) => surface.label) });
    return;
  }
  const client = await mcpClient();
  const readbacks = [];
  try {
    for (const s of shipSurfaces) {
      const code = read(s.file);
      log('push:surface', { label: s.label, bytes: code.length });
      const toolArgs = {
        siteId: SITE,
        pageId: s.pageId,
        context: `Ship ${s.label} embed from dasha-ship.mjs (fast path).`,
        actions: [
          {
            label: `set_${s.label}`,
            set_settings: {
              operations: [
                {
                  label: `${s.label}_code`,
                  element_id: { component: s.pageId, element: s.element },
                  settings: [{ key: 'code', static_text: { value: code } }],
                },
              ],
            },
          },
        ],
      };
      const { name } = await callTool(
        client,
        ['data_element_settings_tool', 'webflow__data_element_settings_tool'],
        toolArgs,
      );
      log('push:ok', { label: s.label, tool: name });
      // Readback — push:ok alone lied when Webflow silently truncated ~50KB embeds.
      // Fail closed: query/parse errors must not skip readback (Codex P0 2026-08-08).
      const rb = await readbackSurface(client, s, code);
      readbacks.push(rb);
      log('push:readback', rb);
      if (!rb.ok) {
        throw new Error(
          `Webflow readback failed for ${s.label}: hashMatch=${rb.hashMatch} stored ${rb.storedBytes}b vs disk ${rb.expectedBytes}b (ratio ${rb.ratio}); hash ${rb.storedHash}≠${rb.expectedHash}; missing ${rb.missing.join(',') || 'n/a'}`,
        );
      }
    }
  } finally {
    await client.close().catch(() => {});
  }
  if (readbacks.length !== shipSurfaces.length) {
    throw new Error(
      `Webflow readback incomplete: ${readbacks.length}/${shipSurfaces.length} surfaces`,
    );
  }
  writeFileSync('/tmp/dasha-ship-readback.json', JSON.stringify(readbacks, null, 2));
  log('push:done', { readbacks: readbacks.length });
}

async function publishSite() {
  log('publish:start');
  if (want.dry) {
    log('publish:dry-run');
    return;
  }
  const client = await mcpClient();
  try {
    const toolArgs = {
      context: 'Publish getdasha three-route checkpoint (home, studio, desk).',
      actions: [
        {
          label: 'publish_dasha',
          publish_site: {
            site_id: SITE,
            publishToWebflowSubdomain: true,
            customDomains: DOMAINS,
          },
        },
      ],
    };
    const { name, result } = await callTool(
      client,
      ['data_sites_tool', 'webflow__data_sites_tool'],
      toolArgs,
    );
    writeFileSync('/tmp/dasha-ship-publish.json', JSON.stringify(result, null, 2));
    const text = result?.content?.[0]?.text || '';
    let payload;
    try { payload = JSON.parse(text); } catch {}
    if (result?.isError || payload?.error || payload?.action?.error || /"error"\s*:/.test(text)) {
      throw new Error(`Webflow publish failed: ${text.slice(0, 500) || 'unknown MCP error'}`);
    }
    log('publish:ok', { tool: name, text: text.slice(0, 400) });
  } finally {
    await client.close().catch(() => {});
  }
}

async function verifyLive() {
  log('verify:start');
  // Full protocol on --strict or DASHA_AUDIT_PROTOCOL=1; default ship uses --fast (~2s).
  // Webflow O2O can lag after publish — retry a few times before failing the ship.
  const maxAttempts = Number(process.env.DASHA_SHIP_VERIFY_ATTEMPTS || 5);
  const delaySec = Number(process.env.DASHA_SHIP_VERIFY_DELAY_SEC || 8);
  let report = { ok: false };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const auditArgs = ['dasha-audit-live.mjs'];
    if (!(want.strict || process.env.DASHA_AUDIT_PROTOCOL === '1')) auditArgs.push('--fast');
    if (want.strict) auditArgs.push('--strict');
    const r = spawnSync('node', auditArgs, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
    const outPath = '/tmp/dasha-audit-live.json';
    report = { ok: r.status === 0 };
    if (existsSync(outPath)) {
      try {
        report = JSON.parse(readFileSync(outPath, 'utf8'));
      } catch {
        /* ignore */
      }
    }
    const ok = r.status === 0 && report.ok !== false;
    log('verify:attempt', {
      attempt,
      maxAttempts,
      ok,
      hard: report.hard,
      homeBytes: report.siteSummary?.homeBytes,
    });
    if (ok) {
      try {
        run('node', ['dasha-domain-check.mjs']);
        log('verify:domain', { ok: true });
      } catch (error) {
        log('verify:domain', { ok: false, error: String(error?.message || error).slice(0, 400) });
        if (attempt < maxAttempts) {
          spawnSync('sleep', [String(delaySec)], { encoding: 'utf8' });
          continue;
        }
        throw error;
      }
      writeFileSync('/tmp/dasha-ship-verify.json', JSON.stringify(report, null, 2));
      log('verify:done', {
        ok: true,
        announceReady: report.announceReady,
        hard: report.hard,
        soft: report.soft,
        ms: report.ms,
        attempts: attempt,
      });
      return report;
    }
    if (attempt < maxAttempts) spawnSync('sleep', [String(delaySec)], { encoding: 'utf8' });
  }
  writeFileSync('/tmp/dasha-ship-verify.json', JSON.stringify(report, null, 2));
  log('verify:done', {
    ok: false,
    announceReady: report.announceReady,
    hard: report.hard,
    soft: report.soft,
    ms: report.ms,
    attempts: maxAttempts,
  });
  throw new Error(
    `live audit failed: ${(report.hard || []).join('; ') || 'see /tmp/dasha-audit-live.json'}`,
  );
}

function stampContext(note) {
  try {
    const r = spawnSync(
      process.execPath,
      ['dasha-context-refresh.mjs', '--agent', 'ship', '--note', note, '--no-audit'],
      { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
    );
    if (r.status === 0) log('context:refresh', { ok: true, note });
    else log('context:refresh', { ok: false, err: (r.stderr || r.stdout || '').slice(0, 200) });
  } catch (e) {
    log('context:refresh', { ok: false, err: String(e?.message || e).slice(0, 120) });
  }
}

async function main() {
  log('start', {
    prep: want.prep,
    gate: want.gate,
    push: want.push,
    publish: want.publish,
    verify: want.verify,
    tokenCheck: want.tokenCheck,
    strict: want.strict,
    dry: want.dry,
  });
  try {
    if (want.tokenCheck) await assertToken();
    // Fail before prep mutates generated artifacts or gates spend time on an unshippable release.
    if (!want.tokenCheck && !want.dry && (want.push || want.publish)) await assertToken();
    if (want.prep) prep();
    if (want.gate) {
      if (want.strict) strictGate();
      else fastGate();
    }
    // Push/readback first so a failed Home write never leaves Worker assets ahead of site.
    // Then deploy lobby so /client/* matches disk before (or without) site publish.
    if (want.push) await pushEmbeds();
    if (wantLobbyDeploy) deployLobby();
    if (want.publish) await publishSite();
    if (want.verify) await verifyLive();
    log('done', { ok: true, totalMs: Date.now() - t0 });
    if (!want.dry && (want.push || want.publish || want.verify || wantLobbyDeploy)) {
      stampContext(
        `ship ok prep=${want.prep} push=${want.push} publish=${want.publish} verify=${want.verify} lobby=${wantLobbyDeploy} ${Date.now() - t0}ms`,
      );
    }
  } catch (e) {
    log('fail', { ok: false, error: String(e?.stack || e).slice(0, 2000) });
    if (!want.dry && (want.push || want.publish || want.verify)) {
      stampContext(`ship FAIL: ${String(e?.message || e).slice(0, 160)}`);
    }
    process.exit(1);
  }
}

main();
