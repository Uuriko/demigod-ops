#!/usr/bin/env node
/** Snapshot free-tool readiness for Demigod agents. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const bin = (name) => {
  const local = path.join(root, 'node_modules', '.bin', name);
  if (fs.existsSync(local)) return local;
  const r = spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' });
  return (r.stdout || '').trim() || null;
};
const hasMod = (name) => {
  try {
    require.resolve(name);
    return true;
  } catch {
    return false;
  }
};
const ver = (cmd, args = ['--version']) => {
  if (!cmd) return null;
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 8000 });
  const t = ((r.stdout || r.stderr || '') + '').trim().split('\n')[0];
  return r.status === 0 || t ? t.slice(0, 80) : null;
};

const cfCert = path.join(process.env.HOME || '', '.cloudflared', 'cert.pem');
const pwCache = path.join(process.env.HOME || '', '.cache', 'ms-playwright');
const report = {
  at: new Date().toISOString(),
  tools: {
    lighthouse: { ok: !!bin('lighthouse'), path: bin('lighthouse'), version: ver(bin('lighthouse')) },
    lhci: { ok: !!bin('lhci'), path: bin('lhci') },
    axeCli: { ok: !!bin('axe'), path: bin('axe'), version: ver(bin('axe')) },
    axeCore: { ok: hasMod('axe-core') },
    playwright: { ok: hasMod('playwright'), browsers: fs.existsSync(pwCache) },
    puppeteerCore: { ok: hasMod('puppeteer-core') },
    sharp: { ok: hasMod('sharp') },
    imagemagick: {
      ok: !!(bin('convert') || bin('magick')),
      note: 'needs: sudo apt install imagemagick (password); sharp works without it',
    },
    webflowCli: { ok: !!bin('webflow'), path: bin('webflow'), version: ver(bin('webflow'), ['-v']) },
    cloudflared: { ok: !!bin('cloudflared'), path: bin('cloudflared') },
    namedTunnelCert: { ok: fs.existsSync(cfCert), path: cfCert },
    gh: { ok: !!bin('gh') },
    chromeCdp: { ok: null, url: process.env.CDP_URL || 'http://127.0.0.1:9223' },
  },
  scripts: {
    'demigod:verify:lighthouse': 'node demigod-lighthouse.mjs',
    'demigod:verify:axe': 'node demigod-axe-routes.mjs',
    'demigod:verify:seo': 'node demigod-seo-audit.mjs',
    'demigod:verify:routes': 'node demigod-route-health.mjs',
    'demigod:verify:web': 'routes + seo + axe',
    namedTunnel: 'bin/dg-named-tunnel-setup [status|login|create|run]',
  },
  stillNeedHuman: [
    'Webflow MCP re-auth in Grok/Cursor MCP settings',
    'cloudflared tunnel login (bin/dg-named-tunnel-setup login) for sticky Events URL',
    'sudo apt install imagemagick — optional; sharp is installed',
    'PageSpeed Insights API key — optional remote scoring',
  ],
};

// CDP ping
try {
  const u = report.tools.chromeCdp.url + '/json/version';
  const r = spawnSync('curl', ['-sS', '-m', '2', u], { encoding: 'utf8' });
  report.tools.chromeCdp.ok = r.status === 0 && /Browser/i.test(r.stdout || '');
} catch {
  report.tools.chromeCdp.ok = false;
}

const out = '/tmp/dg-busy/tools-status.json';
fs.mkdirSync('/tmp/dg-busy', { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.log('# demigod tools status');
  for (const [k, v] of Object.entries(report.tools)) {
    const ok = v && v.ok;
    console.log(`${ok ? '✓' : '·'} ${k}${v?.version ? ' · ' + v.version : ''}${v?.note ? ' — ' + v.note : ''}`);
  }
  console.log('\nHuman still needed:');
  for (const line of report.stillNeedHuman) console.log('  - ' + line);
  console.log('\nreport: ' + out);
}
