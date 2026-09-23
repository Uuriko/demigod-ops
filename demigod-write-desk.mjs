#!/usr/bin/env node
/**
 * One-file desk snapshot — LAN, services, foot marker.
 * Writes DEMIGOD-DESK.json and DEMIGOD-MOBILE-BRIEF.txt in DEMIGOD_ROOT.
 * The command does not publish.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false };

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}
function deskPath() {
  return path.join(dataRoot(), 'DEMIGOD-DESK.json');
}
function briefPath() {
  return path.join(dataRoot(), 'DEMIGOD-MOBILE-BRIEF.txt');
}
function cdpUrl() {
  return process.env.CDP_URL || 'http://127.0.0.1:9223';
}
function liveOrigin() {
  return process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
}

function run(cmd, args = []) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 2000 });
  return r.stdout?.trim() ?? '';
}

function portUp(port) {
  return new RegExp(`:${port} `).test(run('ss', ['-tln']));
}

function readFoot() {
  try {
    return fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8');
  } catch {
    return '';
  }
}

function readJson(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataRoot(), name), 'utf8'));
  } catch {
    return null;
  }
}

function hubPath() {
  try {
    return fs.readFileSync(path.join(dataRoot(), '.orca/potter-hub.path'), 'utf8').trim();
  } catch {
    return null;
  }
}

async function purposefulTabs() {
  try {
    const tabs = await (await fetch(`${cdpUrl()}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
    const keep = (url) => {
      const u = url || '';
      if (/stripe|blob:|chrome-extension/i.test(u)) return false;
      return /trydemigod\.com|talentlink-sf\.design\.webflow|grok\.com\/c\//i.test(u)
        || /webflow\.com\/dashboard\/sites\/talentlink-sf/i.test(u);
    };
    return tabs.filter((t) => keep(t.url)).map((t) => t.url);
  } catch {
    return [];
  }
}

async function main() {
  const foot = readFoot();
  const verify = readJson('DEMIGOD-VERIFY-LIVE.json');
  const marker = (foot.match(/Harbor \S+ keep/) || [''])[0];
  const version = (foot.match(/dg-foot-v(\d+)-core/) || [])[1];
  const desk = {
    at: new Date().toISOString(),
    project: 'demigod',
    path: deskPath(),
    lan: run('hostname', ['-I']).split(/\s+/).filter(Boolean)[0] || null,
    cdp: cdpUrl(),
    services: {
      cdp: portUp(9223),
      orca: run('orca-ide', ['status', '--json']).includes('"reachable": true'),
    },
    urls: {
      live: liveOrigin(),
    },
    footCore: version ? `v${version}` : null,
    footMarker: marker,
    verifyLivePass: verify?.pass ?? null,
    hub: hubPath(),
    tabs: await purposefulTabs(),
    ...localFlags,
  };

  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(deskPath(), `${JSON.stringify(desk, null, 2)}\n`);
  const brief = [
    'Demigod desk',
    `foot ${desk.footCore || '?'}`,
    marker,
    desk.hub ? `Hub: ${desk.hub}` : '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(briefPath(), `${brief}\n`);
  console.log(JSON.stringify({
    ok: true,
    path: deskPath(),
    brief: briefPath(),
    footCore: desk.footCore,
    footMarker: marker,
    ...localFlags,
  }));
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  if (process.argv.includes('--publish')) {
    console.error(JSON.stringify({ ok: false, error: 'publish_refused', ...localFlags }));
    process.exit(1);
  }
  main().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: 'desk_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  });
}
