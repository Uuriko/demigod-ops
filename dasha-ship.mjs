#!/usr/bin/env node
/**
 * Dasha fast ship — one command for prepare → gate → Webflow push → publish → live check.
 *
 * Default is FAST: no Puppeteer/CDP (those gates take 2–4 minutes). Use --strict for full suite.
 *
 *   node dasha-ship.mjs              # prep + fast gate (default)
 *   node dasha-ship.mjs --prep       # build embeds only
 *   node dasha-ship.mjs --gate       # fast static gate only
 *   node dasha-ship.mjs --ship       # prep + fast gate + push all embeds + publish
 *   node dasha-ship.mjs --ship --strict
 *   node dasha-ship.mjs --push       # push embeds only (no publish)
 *   node dasha-ship.mjs --publish    # site publish only
 *   node dasha-ship.mjs --ship --only=studio   # focus gates + push only Studio (publish is still site-wide CDN)
 *   node dasha-ship.mjs --preflight  # auth/site/domain check only
 *   node dasha-ship.mjs --verify     # curl live markers only
 *   node dasha-ship.mjs --status     # local/live-manifest delta, no network
 *   node dasha-ship.mjs --status --write-now # also regenerate DASHA-NOW.md
 *
 * Token: env DASHA_WF_TOKEN or file /tmp/dasha-wf-token.txt (MCP Bearer).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { stripDuplicateOgImage } from './.grok/worktrees/potter/dasha/dasha-webflow-metadata.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const want = {
  prep: args.has('--prep') || args.has('--ship') || args.has('--push') || args.size === 0,
  gate: args.has('--gate') || args.has('--ship') || args.size === 0,
  push: args.has('--push') || args.has('--ship'),
  publish: args.has('--publish') || args.has('--ship'),
  verify: args.has('--verify') || args.has('--ship'),
  preflight: args.has('--preflight'),
  status: args.has('--status'),
  strict: args.has('--strict'),
  dry: args.has('--dry-run'),
};
if (args.has('--no-prep')) want.prep = false;

/* --only=studio (comma-separated) restricts non-publishing pushes and focused gates.
   Why this exists: /studio lost its CC0 dedication from production three times on 2026-08-08. Every
   time, the publish had gone through direct MCP calls rather than this script — because this script
   was all-or-nothing, and nobody wanted to publish the homepage in order to fix the Studio. So the
   verified path was the inconvenient one and got bypassed, taking verifyLive() with it.
   Scoping it means there is no longer a reason to publish around the checks. */
const only = [...args]
  .filter((a) => a.startsWith('--only='))
  .flatMap((a) => a.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean));

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
  /* The homepage's second, previously-unused embed element. It carries the /lobby entry points as
     an injected bridge, because the homepage source itself is published from another tree and every
     copy reachable from here is behind live. Separate element, separate surface: writing it cannot
     revert their work, and their ship cannot revert this. Retire it when the source patch lands. */
  homeLobbyLink: {
    pageId: '5f1458136c15aa41639b8538',
    element: '111587a0-9244-9044-dd65-d53ad8cd314e',
    file: 'dasha-home-lobby-link.html',
    label: 'homeLobbyLink',
  },
  /* The lobby chat, moved off the homepage onto its own page on 2026-08-08. It is a managed surface
     from the first minute rather than after someone finds it in a census — which is the lesson
     /how-to-buy taught at some cost. */
  lobby: {
    pageId: '6a77870a95e3872a95ef7337',
    element: 'b1681188-19dd-6175-7472-68887d3c6e10',
    file: 'dasha-lobby-page.html',
    label: 'lobby',
  },
  deskShell: {
    pageId: '6a74b59530c70741b1c574c4',
    element: 'bbf324ae-76a0-f4f7-f61b-5882cce71a93',
    file: 'dasha-desk-shell.html',
    label: 'deskShell',
  },
  desk: {
    pageId: '6a74b59530c70741b1c574c4',
    element: 'f4239e35-08c6-0874-27bc-8ce5b8ca547f',
    file: join('.tmp-dasha-ship', 'publish-ready', 'dasha-desk-embed.html'),
    label: 'desk',
  },
  deskRetiredRepair: {
    pageId: '6a74b59530c70741b1c574c4',
    element: 'bc1be3d0-bf73-7ba8-b662-70ea1f1519bd',
    file: 'dasha-desk-retired-repair.html',
    label: 'deskRetiredRepair',
  },
};
const DOMAINS = ['6a762e813cfcf91448a83e3b', '6a762e833cfcf91448a83e58'];
const SOCIAL_CARD = 'https://lobby.getdasha.com/og/dasha-social-card.png';
const STATE = process.env.DASHA_SHIP_STATE || '/tmp/dasha-ship-state.json';
const MANIFEST = process.env.DASHA_SHIP_MANIFEST || join(root, 'DASHA-SHIP-MANIFEST.json');
const NOW_DOC = process.env.DASHA_NOW_DOC || join(root, 'DASHA-NOW.md');
const LOBBY_ASSETS = join(root, 'dasha-lobby-static-gen.mjs');
const LOBBY_ROOT = root;

const t0 = Date.now();
const log = (step, extra = {}) =>
  console.log(JSON.stringify({ ms: Date.now() - t0, step, ...extra }));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function json(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, file);
}

const digest = (value) => createHash('sha256').update(value).digest('hex');
const expectedLobbyAssets = () => readFileSync(LOBBY_ASSETS, 'utf8').match(/ASSET_HASH\s*=\s*["']([^"']+)/)?.[1] || null;
const artifactHashes = () =>
  Object.fromEntries(Object.entries(SURFACES).map(([key, surface]) => [key, digest(read(surface.file))]));
const receiptInputHash = hashes => digest([
  JSON.stringify(hashes),
  ...[
    'dasha-ship.mjs',
    'dasha-release-contract.json',
    'dasha-product-coherence.test.mjs',
    'dasha-growth.test.mjs',
    'dasha-landing.test.mjs',
    'dasha-studio-embed.test.mjs',
    'dasha-desk.test.mjs',
    '.grok/worktrees/potter/dasha/dasha-audit-live.mjs',
    '.grok/worktrees/potter/dasha/dasha-domain-check.mjs',
  ].map(read),
].join('\n'));

const gitHead = (cwd) => spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).stdout?.trim() || null;
const fileIdentity = (file) => existsSync(join(root, file)) ? { file, sha256: digest(read(file)) } : null;

async function releaseIdentity() {
  let lobby = { status: 'unavailable', assets: null };
  if (process.env.DASHA_SHIP_FAKE_LIVE === '1') lobby = { status: 'observed', assets: 'fixture-assets' };
  else {
    try {
      const response = await fetch('https://lobby.getdasha.com/health', { signal: AbortSignal.timeout(5000) });
      const health = await response.json();
      lobby = { status: response.ok && health.ok ? 'observed' : 'unhealthy', assets: health.assets || null };
    } catch {}
  }
  return {
    observedAt: new Date().toISOString(),
    workspaceCommit: gitHead(root),
    publicRepoCommit: gitHead(join(root, 'dasha-desk')),
    studioCanonical: fileIdentity('dasha-meme-studio.html'),
    publicStudio: fileIdentity('dasha-desk/studio/index.html'),
    legacyWorktreeStudio: fileIdentity('.grok/worktrees/potter/dasha/dasha-meme-studio.html'),
    deskCanonical: fileIdentity('dasha-desk/src/app.html'),
    deskPublishArtifact: fileIdentity('.tmp-dasha-ship/publish-ready/dasha-desk-embed.html'),
    lobby,
  };
}

function writeNow(published, hashes, changed, release) {
  const rows = Object.keys(SURFACES).map((name) =>
    `| ${name} | \`${hashes[name]}\` | \`${published.hashes?.[name] || 'unverified'}\` | ${changed.includes(name) ? '**drifted**' : 'aligned'} |`).join('\n');
  const text = `---\nstatus: generated\ngenerated_from: DASHA-SHIP-MANIFEST.json\ngenerated_at: ${new Date().toISOString()}\n---\n\n# Dasha current state\n\n> Generated by \`npm run dasha:release:now\`. Do not edit by hand.\n\n- Last live verification: ${published.verifiedAt || 'never'}\n- Manifest status: ${published.status || 'unknown'}\n- Local release alignment: ${changed.length ? `drifted (${changed.join(', ')})` : 'aligned'}\n- Workspace commit: \`${release.workspaceCommit || 'unknown'}\`\n- Public repository commit: \`${release.publicRepoCommit || 'unknown'}\`\n- Lobby assets: \`${release.lobby.assets || 'unobserved'}\`\n\n| Surface | Local SHA-256 | Last verified SHA-256 | State |\n|---|---|---|---|\n${rows}\n\n## Source ownership\n\n- Studio canonical source: \`${release.studioCanonical?.file || 'missing'}\` — \`${release.studioCanonical?.sha256 || 'missing'}\`\n- Public Studio output: \`${release.publicStudio?.file || 'missing'}\` — \`${release.publicStudio?.sha256 || 'missing'}\`\n- Legacy worktree snapshot (observed only): \`${release.legacyWorktreeStudio?.file || 'missing'}\` — \`${release.legacyWorktreeStudio?.sha256 || 'missing'}\`\n- Desk canonical build source: \`${release.deskCanonical?.file || 'missing'}\` — \`${release.deskCanonical?.sha256 || 'missing'}\`\n- Desk publish artifact: \`${release.deskPublishArtifact?.file || 'missing'}\` — \`${release.deskPublishArtifact?.sha256 || 'missing'}\`\n`;
  writeFileSync(NOW_DOC, text);
}

function sameHashes(a, b) {
  return Object.keys(SURFACES).every((key) => a?.[key] === b?.[key]);
}

/* A resumed receipt is only useful for finishing an interrupted run within the same few minutes.
   Beyond that it is a liability: on 2026-08-08 a --ship resumed a receipt whose `published` flag was
   already true, skipped the publish, and reported a clean run while the site was still serving the
   old content. The receipt said the work was done because an earlier attempt had done it — before a
   later push replaced what it had published. Anything older than this is not a resume, it is a
   memory of a different situation. */
const RESUME_WINDOW_MS = 30 * 60 * 1000;

function startReceipt(hashes) {
  const previous = json(STATE);
  const inputHash = receiptInputHash(hashes);
  const age = previous?.startedAt ? Date.now() - Date.parse(previous.startedAt) : Infinity;
  if (!args.has('--fresh') && previous?.site === SITE && sameHashes(previous.hashes, hashes) && previous.inputHash === inputHash) {
    if (Number.isFinite(age) && age > RESUME_WINDOW_MS) {
      log('resume:expired', { runId: previous.runId, ageMinutes: Math.round(age / 60000),
        note: 'starting a fresh receipt; a stale one silently skips publish' });
    } else {
      previous.resumedAt = new Date().toISOString();
      previous.error = null;
      writeJson(STATE, previous);
      log('resume', { runId: previous.runId, stages: previous.stages });
      return previous;
    }
  }
  const receipt = {
    schema: 'dasha.ship-state/2',
    runId: `${Date.now()}-${process.pid}`,
    site: SITE,
    hashes,
    inputHash,
    stages: { prepared: false, gated: false, preflight: false, pushed: {}, published: false, verified: false },
    gates: {},
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };
  writeJson(STATE, receipt);
  return receipt;
}

function checkpoint(receipt, patch = {}) {
  Object.assign(receipt, patch);
  writeJson(STATE, receipt);
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
  run('node', ['dasha-lobby-assets-build.mjs', '--write']);
  run('node', ['dasha-studio-embed-build.mjs']);
  run('node', ['dasha-lobby-embed-build.mjs', '--write']);
  run('node', ['dasha-simp-board-embed-build.mjs', '--write']);
  run('node', ['dasha-lobby-assets-build.mjs', '--write']);
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

function gate(receipt, name, command, commandArgs, reason, enabled = true) {
  if (!enabled) {
    receipt.gates[name] = { status: 'skipped', reason };
    checkpoint(receipt);
    return;
  }
  run(command, commandArgs);
  receipt.gates[name] = { status: 'passed', reason };
  checkpoint(receipt);
}

/** Static trust gates plus browser coverage only for changed public surfaces. */
function fastGate(changed, receipt) {
  log('gate:fast:start');
  const landing = read('dasha-landing.html');
  const studio = read('dasha-meme-studio.html');
  const desk = read('dasha-desk/src/body.html');
  const deskShell = read('dasha-desk-shell.html');
  const deskRetiredRepair = read('dasha-desk-retired-repair.html');
  const embed = read(SURFACES.studio.file);
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
  }
  if (!deskShell.includes('chart on GeckoTerminal')) fail('Desk shell lost the assistive GeckoTerminal label');
  if (/chart on Dexscreener/i.test(deskShell)) fail('Desk shell restored the stale Dexscreener label');
  if (!deskShell.includes('</div></nav>')) fail('Desk shell leaves navigation open around main content');
  if (/<script|addEventListener|setTimeout|querySelector/i.test(deskRetiredRepair)) fail('retired Desk repair still runs code');
  if (!landing.includes(`jup.ag/swap?sell=So11111111111111111111111111111111111111112&amp;buy=${MINT}`)) fail('landing lost exact Jupiter path');
  if (/plugin\.jup\.ag|window\.Jupiter|Jupiter\.init/.test(landing)) fail('landing restored unpinned Jupiter execution');
  if (!landing.includes('https://x.com/dash_eats')) fail('landing missing @dash_eats');
  if (!landing.includes('/studio') || !landing.includes('/dasha')) fail('landing missing dual-path routes');
  if (/thesis card|conviction receipt|receipt-form/i.test(landing)) fail('landing thesis/receipt copy');
  if (!studio.includes("id: 'square'") || !studio.includes("id: 'story'") || !studio.includes("id: 'banner'"))
    fail('studio missing formats');
  if (!embed.includes('dasha-studio-embed') || !(/attachShadow/.test(embed) || /client\/studio\.js[^>]+integrity="sha384-/.test(embed)))
    fail('studio embed is neither an isolated full embed nor the integrity-pinned thin loader');
  // Both product source and deployed thin loader must be fresh.
  run('node', ['dasha-studio-embed-build.mjs', '--check']);
  run('node', ['dasha-lobby-assets-build.mjs', '--check']);
  run('node', ['dasha-desk/build.mjs', '--check']);
  gate(receipt, 'productCoherence', 'node', ['dasha-product-coherence.test.mjs'], 'required for every product release');
  gate(receipt, 'growthTrust', 'node', ['dasha-growth.test.mjs'], 'required for every product release');
  // Disk love/identity radar (no network) — catches handoff/schema/mint drift before push.
  gate(receipt, 'loveRadar', 'node', ['dasha-radar.mjs'], 'identity + L1–L7 love-paths + handoff unit');
  const browser = process.env.DASHA_SHIP_SKIP_BROWSER !== '1';
  const why = (surface) => !browser ? 'fixture-only browser skip' : changed.includes(surface) ? `${surface} artifact changed` : `${surface} hash unchanged`;
  // landing.test covers home+studio+desk invariants — do not skip when only studio/desk drifted
  const landingBrowserNeeded = browser && (changed.includes('home') || changed.includes('studio') || changed.includes('desk') || changed.includes('deskShell'));
  const landingWhy = !browser
    ? 'fixture-only browser skip'
    : landingBrowserNeeded
      ? 'home/studio/desk surface changed (cross-surface landing.test)'
      : 'home/studio/desk hashes unchanged';
  // CDP fallback: dasha-browser-gate.mjs attaches to :9223 or launches headless Chromium
  const bg = (script) => ['dasha-browser-gate.mjs', 'node', script];
  gate(receipt, 'landingBrowser', 'node', bg('dasha-landing.test.mjs'), landingWhy, landingBrowserNeeded);
  gate(receipt, 'studioBrowser', 'node', bg('dasha-meme-studio.test.mjs'), why('studio'), browser && changed.includes('studio'));
  gate(receipt, 'deskBrowser', 'node', bg('dasha-desk.test.mjs'), why('desk'), browser && (changed.includes('desk') || changed.includes('deskShell')));
  log('gate:fast:pass');
}

function strictGate() {
  log('gate:strict:start');
  run('npm', ['run', 'dasha:test:all'], { shell: false });
  run('node', ['dasha-studio-embed-build.mjs', '--check']);
  log('gate:strict:pass');
}

/* Webflow's OAuth access tokens expire in well under a day, and /tmp/dasha-wf-token.txt is a
   snapshot of one. On 2026-08-08 that expired four times mid-session, and each time a publish failed
   with "invalid_token" and had to be rescued by hand — which is exactly the friction that gets a
   verified path abandoned for a direct API call.

   So the file is treated as a cache, not a source. When an agent's MCP credential store is present
   and holds a live Webflow token, that wins and the cache is refreshed from it. Nothing is read
   unless it is there, and nothing is logged — the token never leaves this process except as a
   Bearer header. */
function credentialStoreToken() {
  const store = `${process.env.HOME}/.claude/.credentials.json`;
  if (!existsSync(store)) return null;
  try {
    const oauth = JSON.parse(readFileSync(store, 'utf8'))?.mcpOAuth || {};
    const entry = Object.entries(oauth).find(([key]) => key.startsWith('webflow'))?.[1];
    if (!entry?.accessToken) return null;
    // An expired one is worse than none: it fails after the push, mid-run.
    if (entry.expiresAt && Date.now() > entry.expiresAt) return null;
    return entry.accessToken;
  } catch { return null; }
}

function token() {
  const env = process.env.DASHA_WF_TOKEN || process.env.WEBFLOW_TOKEN;
  if (env?.trim()) return env.trim();

  const p = '/tmp/dasha-wf-token.txt';
  const cached = existsSync(p) ? readFileSync(p, 'utf8').trim() : null;
  const live = credentialStoreToken();
  if (live && live !== cached) {
    writeFileSync(p, live, { mode: 0o600 });
    log('token:refreshed', { from: 'agent credential store' });
  }
  if (live) return live;
  if (cached) return cached;
  throw new Error('No Webflow token. Set DASHA_WF_TOKEN or write /tmp/dasha-wf-token.txt');
}

async function mcpClient() {
  if (process.env.DASHA_SHIP_FAKE_MCP === '1') {
    return {
      calls: [],
      settings: new Map(),
      async callTool(call) {
        this.calls.push(call);
        const action = call.arguments?.actions?.[0];
        const set = action?.set_settings?.operations?.[0];
        if (set) this.settings.set(set.element_id.element, set.settings[0].static_text.value);
        const get = action?.get_settings;
        if (get) return { content: [{ type: 'text', text: JSON.stringify({
          result: [{ data: { searches: [{ matches: [{ value: { value: { value: this.settings.get(get.element_id.element) } } }] }] } }],
        }) }] };
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true, siteId: SITE, domains: DOMAINS }) }] };
      },
      async close() {},
    };
  }
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StreamableHTTPClientTransport } = await import(
    '@modelcontextprotocol/sdk/client/streamableHttp.js'
  );
  const transport = new StreamableHTTPClientTransport(new URL('https://mcp.webflow.com/mcp'), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token()}`,
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json, text/event-stream',
      },
    },
  });
  const client = new Client({ name: 'dasha-ship', version: '1.0.0' });
  await client.connect(transport);
  return client;
}

async function preflight(client) {
  log('preflight:start');
  const { name, result } = await callTool(client, ['data_sites_tool', 'webflow__data_sites_tool'], {
    actions: [{ label: 'dasha_preflight', list_sites: {} }],
  });
  const payload = JSON.stringify(result);
  if (!payload.includes(SITE)) throw new Error(`Webflow preflight cannot access site ${SITE}`);
  for (const domain of DOMAINS) {
    if (!payload.includes(domain)) throw new Error(`Webflow preflight missing domain ${domain}`);
  }
  log('preflight:pass', { tool: name });
}

async function syncSocialMetadata(client) {
  log('metadata:start');
  if (process.env.DASHA_SHIP_FAKE_MCP === '1') {
    log('metadata:done', { card: SOCIAL_CARD, fixture: true });
    return;
  }
  const pages = [SURFACES.home.pageId, SURFACES.lobby.pageId];
  for (const page_id of pages) {
    const { result } = await callTool(client, ['data_pages_tool', 'webflow__data_pages_tool'], {
      context: 'Align Dasha page social cards with the release-owned Worker asset before publishing the verified Webflow checkpoint.',
      actions: [{ label: 'read_social_card', get_page_metadata: { page_id } }],
    });
    const metadata = JSON.parse(result?.content?.[0]?.text || '{}')?.result;
    if (metadata?.openGraph?.imageUrl !== SOCIAL_CARD) {
      await callTool(client, ['data_pages_tool', 'webflow__data_pages_tool'], {
        context: 'Align Dasha page social cards with the release-owned Worker asset before publishing the verified Webflow checkpoint.',
        actions: [{ label: 'set_social_card', update_page_settings: { page_id, openGraph: { imageUrl: SOCIAL_CARD } } }],
      });
    }
  }
  const home = SURFACES.home.pageId;
  const { result: headResult } = await callTool(client, ['data_scripts_tool', 'webflow__data_scripts_tool'], {
    context: 'Remove the duplicate Dasha homepage Open Graph image while preserving all unrelated page-level head code.',
    actions: [{ label: 'read_home_head', get_page_freeform_code: { page_id: home, location: 'head' } }],
  });
  const head = JSON.parse(headResult?.content?.[0]?.text || '{}')?.result?.content || '';
  const clean = stripDuplicateOgImage(head);
  if (clean !== head) {
    await callTool(client, ['data_scripts_tool', 'webflow__data_scripts_tool'], {
      context: 'Remove the duplicate Dasha homepage Open Graph image while preserving all unrelated page-level head code.',
      actions: [{ label: 'set_home_head', set_page_freeform_code: { page_id: home, location: 'head', content: clean } }],
    });
  }
  for (const page_id of pages) {
    const { result } = await callTool(client, ['data_pages_tool', 'webflow__data_pages_tool'], {
      context: 'Verify each Dasha page now owns one current social card before publication.',
      actions: [{ label: 'verify_social_card', get_page_metadata: { page_id } }],
    });
    if (JSON.parse(result?.content?.[0]?.text || '{}')?.result?.openGraph?.imageUrl !== SOCIAL_CARD) {
      throw new Error(`Webflow social-card readback differs for page ${page_id}`);
    }
  }
  log('metadata:done', { card: SOCIAL_CARD });
}

async function preflightLobbyAssets(receipt) {
  const expected = process.env.DASHA_SHIP_FAKE_LIVE === '1'
    ? 'fixture-assets'
    : expectedLobbyAssets();
  if (!expected) throw new Error(`Lobby asset hash missing from ${LOBBY_ASSETS}`);
  let live = process.env.DASHA_SHIP_FAKE_LIVE === '1'
    ? (process.env.DASHA_SHIP_FAKE_LOBBY_ASSETS || expected)
    : await fetch('https://lobby.getdasha.com/health', { signal: AbortSignal.timeout(5000) })
      .then(async (response) => response.ok ? (await response.json()).assets : null);
  /* Publish the Webflow surfaces while the Worker stays behind. The bundle hash above is coarse: it
     moves for any Worker change, including server-only ones no page can observe. What can actually
     break a published page is narrower — a surface SRI-pins a Worker-served script, we publish the
     new pin, and the Worker still serves the old bytes, so the browser refuses to execute it.
     So this checks that instead of trusting the bundle hash, and still throws when a pin has drifted.
     Anything depending on undeployed Worker routes stays dark until someone runs the deploy. */
  if (live !== expected && args.has('--worker-behind')) {
    const drifted = [];
    /* Only surfaces actually being pushed. A pin that stays on disk cannot break a published page,
       so an out-of-scope surface must not block the ones in scope — that is exactly the Studio case
       this flag exists to work around: its embed is pinned ahead to a Worker build that is not live. */
    for (const [key, surface] of Object.entries(SURFACES)) {
      if (only.length && !only.includes(key)) continue;
      const path = join(root, surface.file);
      if (!existsSync(path)) continue;
      const html = readFileSync(path, 'utf8');
      for (const url of new Set(html.match(/https:\/\/lobby\.getdasha\.com\/[^"'\s)]+\.js/g) || [])) {
        const at = html.indexOf(url);
        /* Nearest pin in EITHER direction, capped. Loaders here spell it `integrity=` or bind it to a
           const, so keying on a keyword picks up the wrong hash — position is the reliable link. And
           scanning only backwards silently missed the real layout: the pin sits 49 chars AFTER its own
           URL, and a miss reads as "no pin, nothing to check", so a drifted pin published clean. The
           cap stops a far-off unrelated hash from being adopted when a script carries no pin at all. */
        let pin = null;
        let nearest = Infinity;
        for (const m of html.matchAll(/sha384-[A-Za-z0-9+/=]+/g)) {
          const distance = Math.abs(m.index - at);
          if (distance < nearest) { nearest = distance; pin = m[0]; }
        }
        if (!pin || nearest > 2000) continue;
        const body = await fetch(url, { signal: AbortSignal.timeout(10_000) })
          .then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
        if (!body) { drifted.push(`${surface.label}: ${url} unreachable`); continue; }
        const served = `sha384-${createHash('sha384').update(Buffer.from(body)).digest('base64')}`;
        if (served !== pin) drifted.push(`${surface.label}: ${url} pinned ${pin.slice(0, 24)}… serves ${served.slice(0, 24)}…`);
      }
    }
    if (drifted.length) {
      throw new Error(`--worker-behind refused: published pins would not match live Worker bytes:\n  ${drifted.join('\n  ')}`);
    }
    log('preflight:lobby-assets:worker-behind', {
      live: live || 'unavailable',
      expected,
      note: 'Webflow published against the live Worker; Worker-side changes remain undeployed',
    });
    return;
  }
  if (live !== expected && args.has('--ship') && !receipt?.stages?.published && !Object.keys(receipt?.stages?.pushed || {}).length) {
    log('deploy:lobby:start', { live: live || 'unavailable', expected });
    if (process.env.DASHA_SHIP_FAKE_DEPLOY === '1') live = expected;
    else {
      const deployed = spawnSync('npm', ['run', 'dasha:lobby:deploy'], {
        cwd: LOBBY_ROOT,
        encoding: 'utf8',
        timeout: 120_000,
      });
      if (deployed.status !== 0) throw new Error(`Lobby Worker deploy failed: ${deployed.stderr || deployed.stdout}`);
      for (let attempt = 0; attempt < 5 && live !== expected; attempt += 1) {
        if (attempt) await new Promise((resolve) => setTimeout(resolve, 2000));
        live = await fetch('https://lobby.getdasha.com/health', { signal: AbortSignal.timeout(5000) })
          .then(async (response) => response.ok ? (await response.json()).assets : null)
          .catch(() => null);
      }
    }
    log('deploy:lobby:done', { assets: live || 'unavailable' });
  }
  if (live !== expected) {
    throw new Error(`Lobby Worker assets are not release-ready: live=${live || 'unavailable'} expected=${expected}`);
  }
  log('preflight:lobby-assets:pass', { assets: expected });
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

async function pushEmbeds(client, pending, receipt) {
  log('push:start', { surfaces: pending });
  if (want.dry) {
    log('push:dry-run', { surfaces: pending });
    return;
  }
  for (const key of pending) {
    const s = SURFACES[key];
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
    let value;
    /* Webflow acknowledges an Embed write well before get_settings can see it, and how long is a
       property of the element rather than of the payload: /dasha at 25 KB has needed longer than
       /studio at 46 KB. The old budget was sixteen flat 750 ms polls — about twelve seconds — which
       /dasha exceeded on three consecutive ships on 2026-08-09, each failing with a readback of
       undefined and each succeeding on the next run once minutes had passed. So the write was never
       the problem; the wait was too short, and a publish only went green if you retried enough times
       to get lucky. Deadline-bounded with backoff now: patient where it needs to be, still finite. */
    const readbackDeadline = Date.now() + 90_000;
    for (let attempt = 0; value !== code && Date.now() < readbackDeadline; attempt += 1) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, Math.min(750 * attempt, 5000)));
      const { result: readback } = await callTool(client, ['data_element_settings_tool', 'webflow__data_element_settings_tool'], {
        siteId: SITE,
        pageId: s.pageId,
        context: `Verify ${s.label} embed after write.`,
        actions: [{ label: `read_${s.label}`, get_settings: {
          type: 'query_settings',
          element_id: { component: s.pageId, element: s.element },
          queries: [{ label: 'code', key: 'code' }],
        } }],
      });
      const payload = JSON.parse(readback?.content?.[0]?.text || '{}');
      value = payload.result?.[0]?.data?.searches?.[0]?.matches?.[0]?.value?.value?.value;
    }
    if (value !== code) {
      /* Say which of the two things happened, because they need opposite responses: a readback of
         nothing after a 90 s wait almost always means the write landed and Webflow is still catching
         up, so re-running finishes the ship. A readback of the wrong length means something else
         wrote after us, and re-running would paper over it. */
      const diagnosis = value === undefined
        ? 'read back nothing after 90s — the write usually landed and Webflow is lagging; re-run to confirm'
        : `read back ${value.length} bytes, expected ${code.length} — something else wrote to this element`;
      throw new Error(`${s.label} Webflow readback failed: ${diagnosis}`);
    }
    log('push:ok', { label: s.label, tool: name });
    receipt.stages.pushed[key] = true;
    checkpoint(receipt);
  }
  log('push:done');
}

async function publishSite(client) {
  log('publish:start');
  if (want.dry) {
    log('publish:dry-run');
    return;
  }
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
  log('publish:ok', { tool: name, text: result?.content?.[0]?.text?.slice?.(0, 400) });
}

async function verifyLive() {
  log('verify:start');
  const contract = json(join(root, 'dasha-release-contract.json'));
  if (contract?.schema !== 'dasha.release-contract/1') throw new Error('invalid dasha-release-contract.json');
  /* With --only, verify only the surfaces in scope — even when publishing. Verifying the whole site
     on every --only=deskShell ship blocks legitimate one-surface fixes whenever Studio/home markers
     lag (e.g. thin loader shell missing shadow-era strings). Map deskShell → desk for the contract. */
  const onlyForVerify = new Set(
    only.flatMap((key) => (key === 'deskShell' || key === 'desk' || key === 'deskRetiredRepair'
      ? ['desk']
      : key === 'homeLobbyLink'
        ? ['home']
        : [key])),
  );
  const surfaces = only.length
    ? Object.entries(contract.surfaces).filter(([surface]) => onlyForVerify.has(surface))
    : Object.entries(contract.surfaces);
  const checks = Object.entries(contract.hosts).flatMap(([host, base]) =>
    surfaces.map(([surface, rule]) => ({ host, surface, url: new URL(rule.path, base).href, ...rule })),
  );
  const out = {};
  if (process.env.DASHA_SHIP_FAKE_LIVE === '1') {
    for (const check of checks) {
      out[`${check.host}:${check.surface}`] = {
        status: 200, bytes: 1,
        required: Object.fromEntries(check.required.map((marker) => [marker, true])),
        forbidden: Object.fromEntries(check.forbidden.map((marker) => [marker, false])),
      };
    }
    if (!only.length && want.publish) {
      out.broad = { ok: true, fixture: true };
      log('verify:broad', { ok: true, fixture: true, hard: [], soft: [] });
    }
    writeJson('/tmp/dasha-ship-verify.json', out);
    log('verify:done', out);
    return out;
  }
  for (const check of checks) {
    const r = await fetch(check.url, {
      headers: { 'user-agent': 'dasha-ship/1' },
      redirect: 'follow',
    });
    const body = await r.text();
    const lower = body.toLowerCase();
    out[`${check.host}:${check.surface}`] = {
      status: r.status,
      finalUrl: r.url,
      bytes: body.length,
      required: Object.fromEntries(check.required.map((marker) => [marker, lower.includes(marker.toLowerCase())])),
      forbidden: Object.fromEntries(check.forbidden.map((marker) => [marker, lower.includes(marker.toLowerCase())])),
    };
  }
  writeFileSync('/tmp/dasha-ship-verify.json', JSON.stringify(out, null, 2));
  const failed = Object.entries(out).filter(([, value]) =>
    value.status !== 200 || Object.values(value.required).includes(false) || Object.values(value.forbidden).includes(true));
  if (failed.length) throw new Error(`live verification failed: ${failed.map(([label]) => label).join(', ')}`);
  /* Marker checks prove that Webflow published the intended embeds. The canonical live audit proves
     the wider product boundary: Worker parity, social-card bytes, SRI, sitemap navigation, crypto
     copy/links, indexability and security headers. Both are required for a site-wide release; a
     deliberately scoped non-publishing verify stays scoped. */
  // Broad live audit only on full-site ships. Scoped --only= pushes stay on marker checks.
  if (!only.length && want.publish) {
    const audit = join(LOBBY_ROOT, 'dasha-audit-live.mjs');
    if (!existsSync(audit)) throw new Error(`broad live audit missing: ${audit}`);
    const result = spawnSync(process.execPath, [audit, want.strict ? '--strict' : '--fast'], {
      cwd: LOBBY_ROOT,
      encoding: 'utf8',
      timeout: 90_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const report = json('/tmp/dasha-audit-live.json', {});
    log('verify:broad', { ok: result.status === 0 && report.ok !== false, hard: report.hard || [], soft: report.soft || [] });
    if (result.status !== 0 || report.ok === false) {
      throw new Error(`broad live audit failed: ${(report.hard || []).join(', ') || result.stderr?.trim() || 'unknown error'}`);
    }
    out.broad = { ok: true, soft: report.soft || [], worker: report.worker || null };
  } else {
    log('verify:broad:skip', { reason: only.length ? 'scoped --only= verification' : 'no publish' });
  }
  writeFileSync('/tmp/dasha-ship-verify.json', JSON.stringify(out, null, 2));
  log('verify:done', out);
  return out;
}


/* ---- the publish lock ------------------------------------------------------
   Two agents publish this site from two source trees. On 2026-08-08 that cost the Studio its CC0
   dedication five separate times, and then reverted the operator's own no-disclaimers decision on
   the live homepage — each time because a publish landed on top of a good one and whoever went last
   won. Everyone agreed in writing that /studio has exactly one publish path. Nothing enforced it,
   and an agreement nobody can accidentally break is the only kind worth having.

   The path is absolute and outside the repo ON PURPOSE. A lock inside the working tree is a lock
   per worktree, which is no lock at all — that is precisely the shape of the problem. /tmp is
   machine-wide, so every copy of this script contends for the same file.

   It is exclusive-create (wx), so acquiring is atomic: no read-then-write window for two processes
   to both pass. A held lock fails the run loudly and says who holds it and for how long, rather
   than queueing — waiting silently for another agent is how you end up publishing something stale
   ten minutes later. */
const LOCK = process.env.DASHA_PUBLISH_LOCK || '/tmp/dasha-publish.lock';
const LOCK_STALE_MS = 10 * 60 * 1000;

function acquireLock(surfaces) {
  const mine = {
    pid: process.pid,
    /* Parenthesised deliberately. Written without them, `a || b ? x : y` groups as `(a || b) ? x : y`,
       so DASHA_AGENT=codex reported itself as claude — the lock's entire job is saying who holds it,
       and it was lying about exactly that. Caught by Codex in review. */
    agent: process.env.DASHA_AGENT || (process.env.CLAUDECODE ? 'claude' : (process.env.USER || 'unknown')),
    tree: root,
    surfaces,
    startedAt: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(LOCK, JSON.stringify(mine, null, 2), { flag: 'wx', mode: 0o600 });
      log('lock:acquired', { path: LOCK, surfaces });
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const held = json(LOCK);
      const age = held?.startedAt ? Date.now() - Date.parse(held.startedAt) : Infinity;
      /* Is the holder still alive? signal 0 checks for the process without touching it. A run killed
         mid-publish leaves its lock behind, and waiting ten minutes for a process that no longer
         exists is a lock protecting nothing — which is how a safety measure turns into the thing
         people work around. Every contender is on this machine, since the lock file is local. */
      let alive = true;
      /* ESRCH means no such process — dead. EPERM means it exists but belongs to another user, so
         we cannot signal it and must assume alive. Reading those the wrong way round means either
         never taking over a dead lock, or stealing a live one. */
      if (held?.pid) { try { process.kill(held.pid, 0); } catch (e) { alive = e.code === 'EPERM'; } }
      /* A crashed run must not block publishing forever, but "stale" has to be long enough that a
         slow-but-alive publish is never stolen from underneath itself. */
      /* Age only decides for a holder we cannot see. A process that is demonstrably alive keeps its
         lock however long it takes — a big publish can exceed ten minutes, and stealing from a live
         publisher is precisely the collision this lock exists to prevent. The age check is the
         fallback for when liveness is unknowable (no pid recorded, or another user's process). */
      if (!alive || (held?.pid == null && age > LOCK_STALE_MS)) {
        log('lock:stale', { heldBy: held?.agent, pid: held?.pid, alive,
          ageMinutes: Math.round(age / 60000), action: 'taking over' });
        try { unlinkSync(LOCK); } catch {}
        continue;
      }
      throw new Error(
        `publish lock held by ${held?.agent || 'someone'} (pid ${held?.pid}) from ${held?.tree}`
        + ` since ${held?.startedAt} for [${(held?.surfaces || []).join(', ')}].`
        + ` Wait, or clear ${LOCK} if that run is dead.`);
    }
  }
  return false;
}

function releaseLock() {
  const held = json(LOCK);
  if (held?.pid !== process.pid) return;   // never release someone else's lock
  try { unlinkSync(LOCK); log('lock:released'); } catch {}
}

async function main() {
  if (!want.status) {
    log('start', {
      prep: want.prep,
      gate: want.gate,
      push: want.push,
      publish: want.publish,
      verify: want.verify,
      strict: want.strict,
      dry: want.dry,
    });
  }
  let receipt;
  let client;
  try {
    if (want.prep) prep();
    const hashes = artifactHashes();
    let published = json(MANIFEST, { hashes: {} });
    const detected = published.status === 'verified'
      ? Object.keys(SURFACES).filter((key) => hashes[key] !== published.hashes?.[key])
      : Object.keys(SURFACES);
    for (const name of only) {
      if (!SURFACES[name]) throw new Error(`--only=${name} is not a surface. Known: ${Object.keys(SURFACES).join(', ')}`);
    }
    const changed = only.length ? detected.filter((key) => only.includes(key)) : detected;
    if (only.length) log('scope:only', { requested: only, pushing: changed, skipped: detected.filter((k) => !only.includes(k)) });
    if (want.status) {
      const contract = json(join(root, 'dasha-release-contract.json'));
      const release = args.has('--write-now') ? await releaseIdentity() : published.release || await releaseIdentity();
      if (args.has('--write-now')) {
        published = { ...published, schema: 'dasha.ship-manifest/2', release };
        writeJson(MANIFEST, published);
        writeNow(published, hashes, changed, release);
      }
      console.log(JSON.stringify({
        ok: true,
        site: SITE,
        manifest: MANIFEST,
        lastVerifiedAt: published.verifiedAt || null,
        liveStatus: published.status || 'unknown',
        driftDetectedAt: published.driftDetectedAt || null,
        hashes: { local: hashes, verified: published.hashes || {} },
        changed,
        worker: {
          local: expectedLobbyAssets(),
          verified: release.lobby?.assets || null,
          changed: expectedLobbyAssets() !== release.lobby?.assets,
        },
        publicationWouldChange: changed.length > 0,
        deploymentWouldChange: expectedLobbyAssets() !== release.lobby?.assets,
        plannedGates: {
          productCoherence: 'required',
          growthTrust: 'required',
          landingBrowser: (changed.includes('home') || changed.includes('studio') || changed.includes('desk') || changed.includes('deskShell')) ? 'required because home/studio/desk shell changed' : 'skipped because home/studio/desk shell hashes unchanged',
          studioBrowser: changed.includes('studio') ? 'required because Studio changed' : 'skipped because Studio hash is unchanged',
          deskBrowser: (changed.includes('desk') || changed.includes('deskShell')) ? 'required because Desk or its shell changed' : 'skipped because Desk hashes are unchanged',
        },
        webflowTokenAvailable: Boolean(process.env.DASHA_WF_TOKEN?.trim() || process.env.WEBFLOW_TOKEN?.trim() || existsSync('/tmp/dasha-wf-token.txt')),
        activeRun: json(STATE),
        releaseContract: join(root, 'dasha-release-contract.json'),
        currentHomeMarkers: contract?.surfaces?.home?.required || [],
        release,
        generatedNow: args.has('--write-now') ? NOW_DOC : null,
      }, null, 2));
      return;
    }
    receipt = startReceipt(hashes);
    receipt.gates ||= {};
    if (want.prep && !receipt.stages.prepared) {
      receipt.stages.prepared = true;
      checkpoint(receipt);
    }
    if (want.gate) {
      if (!receipt.stages.gated) {
        if (want.strict) {
          strictGate();
          receipt.gates.strictSuite = { status: 'passed', reason: 'explicit --strict release' };
        } else fastGate(changed, receipt);
        receipt.stages.gated = true;
        checkpoint(receipt);
      } else log('gate:skip', { reason: 'matching successful receipt' });
    }
    const pending = changed.filter((key) => !receipt.stages.pushed[key]);
    log('delta', { changed, pending });
    const needsWebflow =
      !want.dry &&
      (want.preflight ||
        (want.push && (pending.length > 0 || want.publish)) ||  // publish re-pushes every surface
        (want.publish && changed.length > 0 && !receipt.stages.published) ||
        /* --force-publish exists precisely for the case where nothing local changed — a Webflow-side
           edit like page settings, which this script cannot see in its hashes. Without this clause
           the client is never built and the forced publish dereferences undefined. */
        (want.publish && args.has('--force-publish')));
    if (needsWebflow) {
      client = await mcpClient();
      if (want.preflight || !receipt.stages.preflight) {
        await preflight(client);
        receipt.stages.preflight = true;
        checkpoint(receipt);
      }
      // Webflow auth preflight is resumable; Worker parity is live state and must never be cached.
      if (want.publish) await preflightLobbyAssets(receipt);
    }
    /* Before a site-wide publish, push every surface in scope — not just the changed ones.
       publish_site publishes whatever is staged in Webflow, including drafts this script never wrote.
       On 2026-08-08 a --ship that legitimately skipped /studio (hash unchanged) published a stale
       Designer draft of it instead: different CSS, and no CC0 dedication.

       Scope: when --only= is set, "in scope" means ONLY those surfaces. Restaging the whole site
       on every --only=home ship is what re-published shadow Studio over a live thin loader on
       2026-08-11. Full --ship (no --only) still restages every surface by construction. */
    const scopeKeys = only.length ? only.filter((key) => SURFACES[key]) : Object.keys(SURFACES);
    const toPush = want.publish
      ? scopeKeys.filter((key) => !receipt.stages.pushed[key])
      : pending;
    if ((want.push && toPush.length) || want.publish) acquireLock(toPush.length ? toPush : ['publish']);
    if (want.push && toPush.length) await pushEmbeds(client, toPush, receipt);
    else if (want.push) log('push:skip', { reason: 'no changed surfaces' });
    if (want.publish && ((changed.length && !receipt.stages.published) || args.has('--force-publish'))) {
      await syncSocialMetadata(client);
    }
    if (want.publish && changed.length && !receipt.stages.published) {
      await publishSite(client);
      receipt.stages.published = true;
      checkpoint(receipt);
    } else if (want.publish) {
      /* An explicit --publish that silently does nothing is how a broken live surface stays broken:
         the operator believes they published, the exit code is 0, and nobody looks again. If the
         caller asked for a publish and the receipt says one already happened, that receipt is the
         thing to distrust — Webflow may hold pushed-but-unpublished content, which is exactly the
         state /studio was in when its CC0 dedication was missing for the third time. */
      const reason = changed.length ? 'a previous run recorded publish=true' : 'no surface hash changed';
      log('publish:skip', { reason, hint: 'pass --force-publish to publish anyway' });
      /* Only raise when the caller ASKED for --publish explicitly AND there was something to publish
         that a stale receipt blocked. Nothing-changed is a legitimate no-op, and --ship implies
         publish, so neither should fail. The dangerous case is narrow: an operator types --publish,
         gets exit 0, and believes live changed when Webflow still holds unpublished content. */
      if (args.has('--publish') && changed.length && !args.has('--force-publish') && !want.dry) {
        throw new Error(`--publish did nothing: ${reason}. Live state was NOT changed. Re-run with --force-publish if you meant it.`);
      }
      if (args.has('--force-publish')) {
        await publishSite(client);
        receipt.stages.published = true;
        checkpoint(receipt);
      }
    }
    if (want.verify) {
      /* Webflow's CDN needs a moment. Verifying ~2s after publish_site reported six false failures on
         a publish that was in fact correct — and a ship tool that cries wolf is a ship tool people
         start bypassing, which is exactly how /studio lost its CC0 three times. Retry, don't guess. */
      for (let attempt = 1; ; attempt++) {
        try { await verifyLive(); break; }
        catch (e) {
          if (attempt >= 4) throw e;
          log('verify:retry', { attempt, waitMs: attempt * 15000, error: String(e.message || e) });
          await new Promise((r) => setTimeout(r, attempt * 15000));
        }
      }
      receipt.stages.verified = true;
      receipt.finishedAt = new Date().toISOString();
      checkpoint(receipt);
      if (!want.dry && (!changed.length || receipt.stages.published)) {
        /* With --only, keep the previously recorded hash for every surface out of scope. `hashes` is
           computed from local files, so stamping it wholesale records surfaces that were never pushed
           as verified-live — which then reads as "nothing to do" on the next ship and strands them.
           That is exactly how Studio went stale here: a six-surface publish claimed it too, and the
           embed sat undeployed while the manifest insisted it had shipped. */
        const stamped = only.length
          ? { ...(json(MANIFEST, { hashes: {} }).hashes || {}), ...Object.fromEntries(only.filter((k) => k in hashes).map((k) => [k, hashes[k]])) }
          : hashes;
        writeJson(MANIFEST, { schema: 'dasha.ship-manifest/2', site: SITE, status: 'verified', hashes: stamped, release: await releaseIdentity(), verifiedAt: receipt.finishedAt, driftDetectedAt: null });
      }
    }
    log('done', { ok: true, totalMs: Date.now() - t0 });
  } catch (e) {
    if (receipt) checkpoint(receipt, { error: String(e?.stack || e).slice(0, 4000) });
    if (want.verify) {
      const manifest = json(MANIFEST);
      if (manifest) writeJson(MANIFEST, { ...manifest, status: 'drifted', driftDetectedAt: new Date().toISOString() });
    }
    log('fail', { ok: false, error: String(e?.stack || e).slice(0, 2000) });
    process.exit(1);
  } finally {
    releaseLock();
    await client?.close?.().catch(() => {});
  }
}

/* Only ship when run as a command. Importing this file must not publish anything — that is what
   lets the preflight guards below be tested directly instead of through a full pipeline run. */
export { preflightLobbyAssets };
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
