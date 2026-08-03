#!/usr/bin/env node
/** One-file desk snapshot — LAN, services, Demigod URLs, foot version. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { CDP_URL } from './cdp-config.mjs';

const ROOT = '/home/potter';
const OUT = path.join(ROOT, 'DESK.json');

function run(cmd, args = []) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.stdout?.trim() ?? '';
}

function portUp(port) {
  return new RegExp(`:${port} `).test(run('ss', ['-tln']));
}

function footVersion() {
  try {
    const m = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8').match(/dg-foot-v(\d+)-core/);
    return m ? `v${m[1]}` : null;
  } catch (_) {
    return null;
  }
}

function readJson(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
  } catch (_) {
    return null;
  }
}

function hubPath() {
  try {
    return fs.readFileSync(path.join(ROOT, '.orca/potter-hub.path'), 'utf8').trim();
  } catch (_) {
    return `${ROOT}/orca/workspaces/potter/potter-hub`;
  }
}

async function purposefulTabs() {
  try {
    const tabs = await (await fetch(`${CDP_URL}/json/list`)).json();
    const keep = (url) => {
      const u = url || '';
      if (/stripe|blob:|chrome-extension/i.test(u)) return false;
      return /trydemigod\.com|talentlink-sf\.design\.webflow|grok\.com\/c\//i.test(u)
        || /webflow\.com\/dashboard\/sites\/talentlink-sf/i.test(u);
    };
    return tabs.filter((t) => keep(t.url)).map((t) => t.url);
  } catch (_) {
    return [];
  }
}

const verify = readJson('DEMIGOD-VERIFY-LIVE.json');
const desk = {
  at: new Date().toISOString(),
  project: 'demigod',
  lan: run('hostname', ['-I']).split(/\s+/)[0] || null,
  cdp: CDP_URL,
  orcaMobile: portUp(6768) ? `http://${run('hostname', ['-I']).split(/\s+/)[0] || '127.0.0.1'}:6768` : null,
  services: {
    cdp: portUp(9223),
    orca: run('orca-ide', ['status', '--json']).includes('"reachable": true'),
    game: portUp(8765),
  },
  urls: {
    live: 'https://www.trydemigod.com',
    designer: 'https://talentlink-sf.design.webflow.com/',
    forms: 'https://webflow.com/dashboard/sites/talentlink-sf/forms',
    customCode: 'https://webflow.com/dashboard/sites/talentlink-sf/custom-code',
  },
  footCore: footVersion(),
  verifyLivePass: verify?.pass ?? null,
  hub: hubPath(),
  tabs: await purposefulTabs(),
  commands: {
    ready: '~/agent-dev.sh ready',
    ship: '~/agent-dev.sh ship',
    verify: 'npm run demigod:verify:all',
    publish: 'bin/dg ship run',
  },
};

fs.writeFileSync(OUT, `${JSON.stringify(desk, null, 2)}\n`);

const brief = [
  'Demigod desk — trydemigod.com only (game paused).',
  `LAN ${desk.lan} · foot ${desk.footCore} · verify ${desk.verifyLivePass ? 'PASS' : '?'}`,
  `Hub: ${desk.hub}`,
  'Commands: ~/agent-dev.sh ready | ship | npm run demigod:verify:all',
].join('\n');
fs.writeFileSync(path.join(ROOT, 'DEMIGOD-MOBILE-BRIEF.txt'), `${brief}\n`);

console.log(JSON.stringify({ ok: true, out: OUT, footCore: desk.footCore, lan: desk.lan }));
