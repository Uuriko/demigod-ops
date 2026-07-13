#!/usr/bin/env node
/** Workspace + machine snapshot for Demigod ops. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-SYSTEM-AUDIT.json');

function sh(cmd, args = []) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 15000 });
  return (r.stdout || r.stderr || '').trim();
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function footVersion() {
  try {
    const s = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    return Number((s.match(/dg-foot-v(\d+)/) || [])[1]) || null;
  } catch { return null; }
}

function demigodScripts() {
  return fs.readdirSync(ROOT).filter((f) => f.startsWith('demigod-') && f.endsWith('.mjs')).length;
}

const verify = readJson(path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json'));
const cdp = sh('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', 'http://127.0.0.1:9223/json/version']);

const snapshot = {
  at: new Date().toISOString(),
  host: sh('hostname'),
  os: sh('uname', ['-sr']),
  node: sh('node', ['-v']),
  disk: sh('df', ['-h', '/home/potter']).split('\n').slice(-1)[0] || null,
  memory: sh('free', ['-h']).split('\n')[1] || null,
  cdp: { url: 'http://127.0.0.1:9223', status: cdp === '200' ? 'up' : 'down', code: cdp },
  workspace: ROOT,
  demigod: {
    footVersion: footVersion(),
    headFile: fs.existsSync(path.join(ROOT, 'demigod-head-minimal.html')),
    footerLoader: fs.existsSync(path.join(ROOT, 'demigod-foot-core.js')),
    scriptCount: demigodScripts(),
    verifyPass: verify?.pass ?? null,
    formsMode: verify?.htmlScan?.formsMode ?? null,
    footCoreOnCdn: (fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8').match(/catbox\.moe\/\w+\.js/) || [])[0] || null,
  },
  envPresent: {
    SLACK_WEBHOOK: !!(process.env.SLACK_WEBHOOK_URL || process.env.DEMIGOD_SLACK_WEBHOOK),
    WEBFLOW: !!process.env.WEBFLOW_API_TOKEN,
  },
  recentArtifacts: fs.readdirSync(ROOT)
    .filter((f) => /^DEMIGOD-|^HEAVY-(DEMIGOD|LEVERAGE|PARTNERSHIP)/.test(f) && f.endsWith('.json'))
    .map((f) => ({ file: f, mtime: fs.statSync(path.join(ROOT, f)).mtime.toISOString() }))
    .sort((a, b) => b.mtime.localeCompare(a.mtime))
    .slice(0, 15),
};

fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
console.log(JSON.stringify(snapshot, null, 2));