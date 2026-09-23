#!/usr/bin/env node
/** Full laptop + Demigod dev environment audit → DEMIGOD-LAPTOP-AUDIT.json in DEMIGOD_ROOT.
 * The command does not publish and does not fetch the live site.
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
  return path.join(dataRoot(), 'DEMIGOD-LAPTOP-AUDIT.json');
}
function cdpUrl() {
  return process.env.CDP_URL || 'http://127.0.0.1:9223';
}
function liveOrigin() {
  return process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
}

function run(cmd, args = []) {
  const r = spawnSync(cmd, args, {
    cwd: dataRoot(),
    encoding: 'utf8',
    timeout: 2000,
    env: { ...process.env, PATH: process.env.PATH },
  });
  return { ok: r.status === 0, status: r.status, stdout: r.stdout?.trim() ?? '', stderr: r.stderr?.trim() ?? '' };
}

function portUp(port) {
  const r = run('ss', ['-tln']);
  return r.ok && new RegExp(`:${port} `).test(r.stdout);
}

function binary(name) {
  const r = run('bash', ['-c', `command -v ${name} && ${name} --version 2>/dev/null | head -1`]);
  if (!r.ok || !r.stdout) return { present: false };
  const [bin, ...ver] = r.stdout.split('\n');
  return { present: !!bin, path: bin, version: ver.join(' ').trim() || null };
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(path.join(dataRoot(), file), 'utf8')); } catch { return fallback; }
}

function readFoot() {
  try { return fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8'); } catch { return ''; }
}

function footVersion(foot) {
  const m = foot.match(/dg-foot-v(\d+)-core/);
  return m ? `v${m[1]}` : null;
}

function gitDirty() {
  const r = run('git', ['status', '--short']);
  return r.ok ? r.stdout.split('\n').filter(Boolean).length : null;
}

function rootArtifacts() {
  let n = 0;
  try {
    for (const pat of ['DEMIGOD', 'HEAVY', 'CURSOR']) {
      for (const f of fs.readdirSync(dataRoot())) {
        if (f.startsWith(`${pat}-`) && fs.statSync(path.join(dataRoot(), f)).isFile()) n++;
      }
    }
  } catch { /* missing root */ }
  return n;
}

function requiredFiles() {
  const files = [
    'AGENTS.md', 'DEMIGOD-AGENTS.md', 'DEMIGOD-WORKFLOW.md',
    'demigod-foot-core.js', 'demigod-head-minimal.html', 'demigod-footer-lite.html',
    'demigod-verify-all.mjs', 'demigod-open-workspace.mjs', 'launch-demigod-chrome.sh',
    'agent-dev.sh', 'orca-demigod.sh', '.cursor/mcp.json', '.cursor/rules/demigod.mdc',
  ];
  return files.map((f) => ({ file: f, ok: fs.existsSync(path.join(dataRoot(), f)) }));
}

async function cdpTabs() {
  try {
    const r = await fetch(`${cdpUrl()}/json/list`, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return { up: false, tabs: [] };
    const tabs = await r.json();
    const classify = (url) => {
      if (/localhost:8765|eat-the-sounds/i.test(url)) return 'game';
      if (/grok\.com/i.test(url)) return 'grok';
      if (/talentlink-sf\.design\.webflow/i.test(url)) return 'designer';
      if (/trydemigod\.com/i.test(url)) return 'live';
      if (/webflow\.com\/dashboard/i.test(url)) return 'webflow-dash';
      if (/stripe|hcaptcha/i.test(url)) return 'iframe-noise';
      if (/chrome:\/\//i.test(url)) return 'chrome-ui';
      return 'other';
    };
    const byRole = {};
    for (const t of tabs) {
      const role = classify(t.url || '');
      byRole[role] = (byRole[role] || 0) + 1;
    }
    const purposeful = tabs.filter((t) =>
      /trydemigod\.com|talentlink-sf\.design\.webflow|grok\.com|webflow\.com\/dashboard/i.test(t.url || ''),
    );
    return {
      up: true,
      count: tabs.length,
      purposefulCount: purposeful.length,
      byRole,
      urls: tabs.map((t) => ({ role: classify(t.url || ''), url: (t.url || '').slice(0, 120) })),
    };
  } catch {
    return { up: false, tabs: [] };
  }
}

function orcaWorktrees() {
  const r = run('orca-ide', ['worktree', 'list']);
  if (!r.ok) return [];
  return r.stdout.split('\n').filter((l) => l.includes('displayName:')).map((l) => l.replace('displayName:', '').trim());
}

function buildRecommendations(audit) {
  const rec = [];
  const deskOk = fs.existsSync(path.join(dataRoot(), 'DEMIGOD-DESK.json'))
    || fs.existsSync(path.join(dataRoot(), 'DESK.json'));
  const mobileOk = fs.existsSync(path.join(dataRoot(), '.orca/mobile-grok.path'));
  if (!audit.binaries.node?.present) rec.push('Add node to agent PATH — run ~/agent-dev.sh path and use in shells');
  if (!audit.services.cdp) rec.push('Start session: ~/agent-dev.sh ready');
  if ((audit.chrome.purposefulCount ?? audit.chrome.count) > 6) {
    rec.push(`Trim browser tabs (${audit.chrome.purposefulCount ?? '?'} purposeful): ~/agent-dev.sh tabs-cleanup`);
  }
  if (audit.chrome.byRole?.game) rec.push('Close game tabs in Chrome — game project is paused');
  if (!audit.demigod.verifyLive?.pass) rec.push('Live site drift — run ~/agent-dev.sh ship');
  if (!audit.demigod.verifySource?.pass) rec.push('Source drift — run npm run demigod:verify:source');
  if (audit.git.dirtyFiles > 200) rec.push('Archive run artifacts: ~/agent-dev.sh archive');
  if (!audit.orca.reachable) rec.push('Orca IDE offline — ~/orca-ide.sh');
  if (!mobileOk) rec.push('Prime Orca mobile: ~/orca-setup.sh mobile-ready');
  if (!deskOk) rec.push('Write desk snapshot: ~/agent-dev.sh ready');
  rec.push('Start of day: ~/agent-dev.sh ready · Before publish: ~/agent-dev.sh ship');
  return rec;
}

async function buildAudit() {
  const root = dataRoot();
  const foot = readFoot();
  const disk = run('df', ['-h', root]);
  const mem = run('free', ['-h']);
  const load = run('uptime');
  const lan = run('hostname', ['-I']);
  const verifyLive = readJson('DEMIGOD-VERIFY-LIVE.json');
  const verifySource = readJson('DEMIGOD-VERIFY-SOURCE.json');
  const chrome = await cdpTabs();
  const orcaStatus = run('orca-ide', ['status', '--json']);
  let orcaReachable = false;
  try { orcaReachable = orcaStatus.stdout.includes('"reachable": true'); } catch { /* ignore */ }

  const audit = {
    at: new Date().toISOString(),
    path: reportPath(),
    source: 'disk',
    project: 'demigod',
    system: {
      host: run('hostname').stdout,
      os: run('lsb_release', ['-ds']).stdout || run('uname', ['-sr']).stdout,
      lan: lan.stdout.split(/\s+/)[0] || null,
      disk: disk.stdout.split('\n').slice(-1)[0] || null,
      mem: mem.stdout.split('\n').find((l) => l.startsWith('Mem:')) || null,
      load: load.stdout,
    },
    binaries: {
      grok: binary('grok'),
      orcaIde: binary('orca-ide'),
      node: binary('node'),
      npm: binary('npm'),
      bun: binary('bun'),
      cursorAgent: binary('cursor-agent'),
      gh: binary('gh'),
      python3: binary('python3'),
    },
    services: {
      cdp: portUp(9223),
      cdpUrl: cdpUrl(),
      orcaMobile: portUp(6768),
      gameServer: portUp(8765),
    },
    demigod: {
      live: liveOrigin(),
      designer: 'https://talentlink-sf.design.webflow.com/',
      footCore: footVersion(foot),
      footMarker: (foot.match(/Harbor \S+ keep/) || [''])[0],
      verifyLive,
      verifySource,
    },
    chrome,
    git: { dirtyFiles: gitDirty(), rootArtifacts: rootArtifacts() },
    orca: { reachable: orcaReachable, worktrees: orcaWorktrees() },
    files: requiredFiles(),
    mcp: readJson('.cursor/mcp.json'),
    ...localFlags,
  };

  audit.issues = [];
  if (!audit.services.cdp) audit.issues.push('Chrome CDP off — agents cannot verify or automate browser');
  if (!audit.binaries.node.present) audit.issues.push('node not on default agent PATH');
  if (audit.demigod.verifyLive && !audit.demigod.verifyLive.pass) audit.issues.push('demigod:verify:live failing');
  if (audit.demigod.verifySource && !audit.demigod.verifySource.pass) audit.issues.push('demigod:verify:source failing');
  for (const f of audit.files.filter((x) => !x.ok)) audit.issues.push(`missing: ${f.file}`);

  audit.recommendations = buildRecommendations(audit);
  audit.score = audit.issues.length === 0 ? 'green' : audit.issues.length <= 2 ? 'yellow' : 'red';
  return audit;
}

async function main() {
  const audit = await buildAudit();
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(audit, null, 2));
  console.log(JSON.stringify({
    ok: true,
    path: audit.path,
    source: audit.source,
    score: audit.score,
    issues: audit.issues.length,
    out: audit.path,
    footMarker: audit.demigod.footMarker,
    footCore: audit.demigod.footCore,
    cdp: audit.services.cdp,
    cdpUrl: audit.services.cdpUrl,
    verifyLive: audit.demigod.verifyLive?.pass ?? null,
    verifySource: audit.demigod.verifySource?.pass ?? null,
    chromeTabs: audit.chrome.count ?? 0,
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
    console.error(JSON.stringify({ ok: false, error: 'laptop_audit_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  });
}
