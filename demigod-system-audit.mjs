#!/usr/bin/env node
/**
 * Workspace + machine snapshot for Demigod ops.
 * Writes DEMIGOD-SYSTEM-AUDIT.json in DEMIGOD_ROOT. The command does not publish.
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
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-SYSTEM-AUDIT.json');
}
function cdpUrl() {
  return process.env.CDP_URL || 'http://127.0.0.1:9223';
}

function sh(cmd, args = []) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 8000 });
  return (r.stdout || r.stderr || '').trim();
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function readText(name) {
  try { return fs.readFileSync(path.join(dataRoot(), name), 'utf8'); } catch { return ''; }
}

function listRoot() {
  try { return fs.readdirSync(dataRoot()); } catch { return []; }
}

function buildSnapshot() {
  const root = dataRoot();
  const foot = readText('demigod-foot-core.js');
  const footer = readText('demigod-footer-lite.html');
  const verify = readJson(path.join(root, 'DEMIGOD-VERIFY-LIVE.json'));
  const cdp = cdpUrl();
  const code = sh('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '2', `${cdp}/json/version`]);
  const names = listRoot();
  return {
    at: new Date().toISOString(),
    path: reportPath(),
    host: sh('hostname'),
    os: sh('uname', ['-sr']),
    node: sh('node', ['-v']),
    disk: sh('df', ['-h', root]).split('\n').slice(-1)[0] || null,
    memory: sh('free', ['-h']).split('\n')[1] || null,
    cdp: { url: cdp, status: code === '200' ? 'up' : 'down', code },
    workspace: root,
    demigod: {
      footVersion: Number((foot.match(/dg-foot-v(\d+)/) || [])[1]) || null,
      footMarker: (foot.match(/Harbor \S+ keep/) || [''])[0],
      headFile: fs.existsSync(path.join(root, 'demigod-head-minimal.html')),
      footerLoader: Boolean(foot),
      scriptCount: names.filter((f) => f.startsWith('demigod-') && f.endsWith('.mjs')).length,
      verifyPass: verify?.pass ?? null,
      formsMode: verify?.htmlScan?.formsMode ?? null,
      footCoreOnCdn: (footer.match(/catbox\.moe\/\w+\.js/) || [])[0] || null,
    },
    envPresent: {
      SLACK_WEBHOOK: !!(process.env.SLACK_WEBHOOK_URL || process.env.DEMIGOD_SLACK_WEBHOOK),
      WEBFLOW: !!process.env.WEBFLOW_API_TOKEN,
    },
    recentArtifacts: names
      .filter((f) => /^DEMIGOD-|^HEAVY-(DEMIGOD|LEVERAGE|PARTNERSHIP)/.test(f) && f.endsWith('.json'))
      .map((f) => ({ file: f, mtime: fs.statSync(path.join(root, f)).mtime.toISOString() }))
      .sort((a, b) => b.mtime.localeCompare(a.mtime))
      .slice(0, 15),
    ...localFlags,
  };
}

function main() {
  const snapshot = buildSnapshot();
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify(snapshot, null, 2));
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  if (process.argv.includes('--publish')) {
    console.error(JSON.stringify({ ok: false, error: 'publish_refused', ...localFlags }));
    process.exit(1);
  }
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'audit_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
