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
 *   node dasha-ship.mjs --ship --only=studio   # focus gates on Studio; site publish still restages all surfaces
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
  desk: {
    pageId: '6a74b59530c70741b1c574c4',
    element: 'f4239e35-08c6-0874-27bc-8ce5b8ca547f',
    file: join('.tmp-dasha-ship', 'publish-ready', 'dasha-desk-embed.html'),
    label: 'desk',
  },
};
const DOMAINS = ['6a762e813cfcf91448a83e3b', '6a762e833cfcf91448a83e58'];
const STATE = process.env.DASHA_SHIP_STATE || '/tmp/dasha-ship-state.json';
const MANIFEST = process.env.DASHA_SHIP_MANIFEST || join(root, 'DASHA-SHIP-MANIFEST.json');
const NOW_DOC = process.env.DASHA_NOW_DOC || join(root, 'DASHA-NOW.md');

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
const artifactHashes = () =>
  Object.fromEntries(Object.entries(SURFACES).map(([key, surface]) => [key, digest(read(surface.file))]));

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
  const age = previous?.startedAt ? Date.now() - Date.parse(previous.startedAt) : Infinity;
  if (!args.has('--fresh') && previous?.site === SITE && sameHashes(previous.hashes, hashes)) {
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
    schema: 'dasha.ship-state/1',
    runId: `${Date.now()}-${process.pid}`,
    site: SITE,
    hashes,
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
  const embed = read('dasha-studio-embed.html');
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
  if (landing.includes('/how-to-buy')) fail('landing links unpublished how-to-buy');
  if (desk.includes('/how-to-buy')) fail('desk links unpublished how-to-buy');
  if (!landing.includes('jup.ag/swap') || !landing.includes('plugin.jup.ag')) fail('landing lost Jupiter paths');
  if (!landing.includes('https://x.com/dash_eats')) fail('landing missing @dash_eats');
  if (!landing.includes('/studio') || !landing.includes('/dasha')) fail('landing missing dual-path routes');
  if (/thesis card|conviction receipt|receipt-form/i.test(landing)) fail('landing thesis/receipt copy');
  if (!studio.includes("id: 'square'") || !studio.includes("id: 'story'") || !studio.includes("id: 'banner'"))
    fail('studio missing formats');
  if (!embed.includes('attachShadow') || !embed.includes('dasha-studio-embed')) fail('studio embed not shadow-isolated');
  // embed must be fresh
  run('node', ['dasha-studio-embed-build.mjs', '--check']);
  run('node', ['dasha-desk/build.mjs', '--check']);
  gate(receipt, 'productCoherence', 'node', ['dasha-product-coherence.test.mjs'], 'required for every product release');
  gate(receipt, 'growthTrust', 'node', ['dasha-growth.test.mjs'], 'required for every product release');
  const browser = process.env.DASHA_SHIP_SKIP_BROWSER !== '1';
  const why = (surface) => !browser ? 'fixture-only browser skip' : changed.includes(surface) ? `${surface} artifact changed` : `${surface} hash unchanged`;
  gate(receipt, 'landingBrowser', 'node', ['dasha-landing.test.mjs'], why('home'), browser && changed.includes('home'));
  gate(receipt, 'studioBrowser', 'node', ['dasha-meme-studio.test.mjs'], why('studio'), browser && changed.includes('studio'));
  gate(receipt, 'deskBrowser', 'node', ['dasha-desk.test.mjs'], why('desk'), browser && changed.includes('desk'));
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
  if (existsSync(p)) return readFileSync(p, 'utf8').trim();
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
    const value = payload.result?.[0]?.data?.searches?.[0]?.matches?.[0]?.value?.value?.value;
    if (value !== code) throw new Error(`${s.label} Webflow readback differs after write (${value?.length || 0} != ${code.length})`);
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
  /* With --only, verify the surfaces being shipped rather than the whole site. Verifying everything
     sounds stricter, but it blocks a legitimate one-surface fix whenever any other surface is
     unpublished — and a safe path that refuses to run is how people end up publishing around it,
     which is the failure that cost /studio its CC0 dedication three times. */
  const surfaces = only.length && !want.publish
    ? Object.entries(contract.surfaces).filter(([surface]) => only.includes(surface))
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
    agent: process.env.DASHA_AGENT || process.env.CLAUDECODE ? 'claude' : (process.env.USER || 'unknown'),
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
      /* A crashed run must not block publishing forever, but "stale" has to be long enough that a
         slow-but-alive publish is never stolen from underneath itself. */
      if (age > LOCK_STALE_MS) {
        log('lock:stale', { heldBy: held?.agent, ageMinutes: Math.round(age / 60000), action: 'taking over' });
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
        publicationWouldChange: changed.length > 0,
        plannedGates: {
          productCoherence: 'required',
          growthTrust: 'required',
          landingBrowser: changed.includes('home') ? 'required because home changed' : 'skipped because home hash is unchanged',
          studioBrowser: changed.includes('studio') ? 'required because Studio changed' : 'skipped because Studio hash is unchanged',
          deskBrowser: changed.includes('desk') ? 'required because Desk changed' : 'skipped because Desk hash is unchanged',
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
        (want.publish && changed.length > 0 && !receipt.stages.published));
    if (needsWebflow) {
      client = await mcpClient();
      if (want.preflight || !receipt.stages.preflight) {
        await preflight(client);
        receipt.stages.preflight = true;
        checkpoint(receipt);
      }
    }
    /* Before a site-wide publish, push EVERY surface in scope — not just the changed ones.
       publish_site publishes whatever is staged in Webflow, including drafts this script never wrote.
       On 2026-08-08 a --ship that legitimately skipped /studio (hash unchanged) published a stale
       Designer draft of it instead: different CSS, and no CC0 dedication. The hash delta says what
       changed locally; it says nothing about what someone else left staged. Pushing an unchanged
       surface costs one API call and makes live match local by construction. */
    const toPush = want.publish
      ? Object.keys(SURFACES)
      : pending;
    if ((want.push && toPush.length) || want.publish) acquireLock(toPush.length ? toPush : ['publish']);
    if (want.push && toPush.length) await pushEmbeds(client, toPush, receipt);
    else if (want.push) log('push:skip', { reason: 'no changed surfaces' });
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
        writeJson(MANIFEST, { schema: 'dasha.ship-manifest/2', site: SITE, status: 'verified', hashes, release: await releaseIdentity(), verifiedAt: receipt.finishedAt, driftDetectedAt: null });
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

main();
