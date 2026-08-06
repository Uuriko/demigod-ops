#!/usr/bin/env node
/**
 * demigod-webflow — agent-first Webflow workbench
 *
 * Why this exists: agents thrash Designer/CDP/paste/publish. One entrypoint
 * for orientation, freeze safety, tabs, truth, playbooks, and gated tool runs.
 *
 * Usage:
 *   bin/dg-webflow status|--json
 *   bin/dg-webflow doctor
 *   bin/dg-webflow tabs
 *   bin/dg-webflow truth
 *   bin/dg-webflow freeze
 *   bin/dg-webflow open designer|custom-code|live|dashboard
 *   bin/dg-webflow paste-check
 *   bin/dg-webflow playbook [name]
 *   bin/dg-webflow run <tool> [--dry-run]
 *   bin/dg-webflow tools
 *   bin/dg-webflow brief          # markdown for agents
 *   bin/dg-webflow hygiene [--prune]  # tabs + load (laptop snappy)
 *   bin/dg-webflow connect [status|bridge|all|setup]  # MCP/Bridge/token/webhook spine
 *
 * Out: /tmp/dg-busy/webflow-status.json · connect → webflow-connect.json
 */
import fs from 'fs';
import path from 'path';
import {
  buildStatus,
  freezeStatus,
  diskTruth,
  liveTruth,
  listPages,
  openUrl,
  pasteCheck,
  classifyChange,
  runNode,
  PLAYBOOKS,
  TOOL_MAP,
  DESIGNER,
  CUSTOM_CODE,
  LIVE,
  DASHBOARD,
  OUT,
  PLAYBOOK_OUT,
  CDP,
  ROOT,
} from './demigod-webflow-lib.mjs';
import { ensureBusy, atomicWrite, BUSY } from './demigod-agent-tools-lib.mjs';

const args = process.argv.slice(2);
const cmd = args[0] || 'status';
const asJson = args.includes('--json');
const dryRun = args.includes('--dry-run');

function argsValid() {
  const rest = args.slice(1);
  const flags = rest.filter((arg) => arg.startsWith('--'));
  const values = rest.filter((arg) => !arg.startsWith('--'));
  const onlyFlags = (...allowed) => new Set(flags).size === flags.length && flags.every((arg) => allowed.includes(arg));
  if (cmd === '--json') return args.length === 1;
  if (['status', 'doctor', 'tabs', 'truth', 'freeze', 'paste-check', 'tools', 'brief'].includes(cmd)) {
    return values.length === 0 && onlyFlags('--json');
  }
  if (cmd === 'connect') return values.length <= 1 && (!values[0] || ['status', 'bridge', 'all', 'setup'].includes(values[0])) && onlyFlags('--json');
  if (cmd === 'open') return values.length <= 1 && onlyFlags('--json');
  if (cmd === 'change') return values.length > 0 && onlyFlags('--json');
  if (cmd === 'playbook') return values.length <= 1 && onlyFlags('--json');
  if (cmd === 'run') return values.length === 1 && onlyFlags('--json', '--dry-run');
  if (cmd === 'hygiene') return values.length === 0 && onlyFlags('--json', '--prune', '--kill-hung');
  return false;
}

if (!argsValid()) {
  console.error('invalid arguments; run bin/dg-webflow for usage');
  process.exit(2);
}

function print(obj) {
  if (asJson || cmd === 'status' && args.includes('--json')) {
    console.log(JSON.stringify(obj, null, 2));
  } else if (typeof obj === 'string') {
    console.log(obj);
  } else {
    console.log(JSON.stringify(obj, null, 2));
  }
}

function humanStatus(s) {
  const lines = [];
  lines.push(`# Webflow workbench · ${s.site}`);
  lines.push(`at: ${s.at}`);
  lines.push('');
  lines.push(`## Freeze: ${s.freeze.frozen ? 'ON ⛔' : 'OFF'}${s.freeze.why ? ' — ' + s.freeze.why : ''}`);
  lines.push(`## CDP: ${s.cdp.ok ? 'UP' : 'DOWN'} ${s.cdp.browser || s.cdp.error || ''}`);
  lines.push(`## Tabs: ${s.tabs.pages} pages · ${JSON.stringify(s.tabs.byRole)}`);
  lines.push(
    `## Disk foot: ${s.disk.footVer || '?'} · loader ${s.disk.footerLoaderVer || '?'} · footerReady=${s.disk.footerShipReady} · manMatch=${s.disk.diskMatchesManifest}`,
  );
  lines.push(
    `## Live: ${s.live.ok ? 'OK' : 'FAIL'} · hint ${s.live.footVerHint || '?'} · loader ${s.live.footerLoaderVer || '?'} · ${s.live.footCdn || ''}`,
  );
  lines.push(`## Ready: read=${s.ready.readOnly} paste=${s.ready.paste} publish=${s.ready.publish}`);
  lines.push('');
  lines.push('## Tips');
  for (const t of s.tips || []) lines.push(`- ${t}`);
  lines.push('');
  lines.push('## URLs');
  lines.push(`- live: ${s.urls.live}`);
  lines.push(`- designer: ${s.urls.designer}`);
  lines.push(`- custom-code: ${s.urls.customCode}`);
  lines.push(`- cdp: ${s.urls.cdp}`);
  lines.push('');
  lines.push('## Next');
  if (!s.cdp.ok) lines.push(s.cdp.error?.includes('EPERM') ? '- CDP unobservable in this namespace' : '- Fix CDP first');
  else if (s.freeze.frozen) lines.push('- Freeze ON — only read-only playbooks');
  else if (!s.freeze.authorized) lines.push('- Prepare only — current request has not authorized publish or paste');
  else if (!s.ready.paste) lines.push('- Open custom-code tab, then paste-check');
  else lines.push('- bin/dg-webflow playbook prep-footer-paste');
  return lines.join('\n') + '\n';
}

async function doctor() {
  const s = await buildStatus();
  const checks = [];
  const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 160) });
  check('cdp', s.cdp.ok, s.cdp.browser || s.cdp.error);
  check('freeze readable', true, s.freeze.frozen ? `ON ${s.freeze.why || ''}` : 'OFF');
  check('disk foot-core', s.disk.files.footCore, s.disk.footVer);
  check('disk footer-lite', s.disk.files.footerLite, s.disk.footerLoaderVer);
  check('disk footer redirects', s.disk.footerShipReady, 'blog/notes + canonical legacy aliases');
  check('disk head-minimal', s.disk.files.headMinimal, s.disk.bytes.headMinimal);
  check('live fetch', s.live.ok, s.live.footCdn || s.live.error);
  check(
    'live SEO meta unique',
    s.live.metaCounts?.description === 1 && s.live.metaCounts?.ogTitle === 1,
    `description=${s.live.metaCounts?.description ?? '?'} og:title=${s.live.metaCounts?.ogTitle ?? '?'}`,
  );
  check(
    'live sitemap',
    s.live.sitemap?.valid === true,
    `status=${s.live.sitemap?.status ?? '?'} type=${s.live.sitemap?.type || '?'} bytes=${s.live.sitemap?.bytes ?? '?'}`,
  );
  check(
    'robots advertises sitemap',
    s.live.robots?.hasSitemap === true,
    `status=${s.live.robots?.status ?? '?'} bytes=${s.live.robots?.bytes ?? '?'}`,
  );
  check('designer tab', (s.tabs.byRole.designer || 0) > 0, s.tabs.byRole.designer || 0);
  const ccN = s.tabs.byRole['custom-code'] || 0;
  const loginN = s.tabs.byRole['webflow-login'] || 0;
  check(
    'custom-code tab',
    ccN > 0,
    loginN > 0 && ccN === 0
      ? `login wall (${loginN}) — re-auth CDP Chrome, then open custom-code`
      : ccN,
  );
  check('live tab', (s.tabs.byRole.live || 0) > 0, s.tabs.byRole.live || 0);
  check('tab budget ≤12', s.tabs.pages <= 12, s.tabs.pages);
  check('cm6 paste script', fs.existsSync(path.join(ROOT, 'demigod-cm6-paste-publish.mjs')));
  check('tab-prune script', fs.existsSync(path.join(ROOT, 'demigod-cdp-tab-prune.mjs')));
  check('foot-cdn script', fs.existsSync(path.join(ROOT, 'demigod-foot-cdn-publish.mjs')));
  // designer/custom-code/live missing is warn not hard fail for doctor
  const namespaceBlocked = s.cdp.error?.includes('EPERM');
  const liveUnobservable = !s.live.ok && s.live.status == null;
  // Sitemap/robots: soft when live SEO is unobservable, fetch failed (status 0), or
  // publish is unauthorized (prepare-only SEO — tip already says so; don't red the module).
  const seoFetchUnobservable =
    Number(s.live?.sitemap?.status) === 0 ||
    Number(s.live?.robots?.status) === 0 ||
    Boolean(s.live?.sitemap?.error) ||
    Boolean(s.live?.robots?.error);
  const prepareOnlySeo = s.freeze?.authorized !== true;
  const softSeo = liveUnobservable || seoFetchUnobservable || prepareOnlySeo;
  const soft = [
    'designer tab',
    'custom-code tab',
    'live tab',
    'live SEO meta unique',
    ...(softSeo ? ['live sitemap', 'robots advertises sitemap'] : []),
    ...(namespaceBlocked ? ['cdp', 'live fetch'] : []),
  ];
  const hard = checks.filter((c) => !c.ok && !soft.includes(c.name));
  const out = {
    at: new Date().toISOString(),
    pass: hard.length === 0,
    checks,
    tips: s.tips,
    freeze: s.freeze,
  };
  // A sandboxed agent cannot observe host CDP; don't replace the host receipt with synthetic failures.
  if (!s.cdp.error?.includes('EPERM')) {
    atomicWrite(path.join(BUSY, 'webflow-doctor.json'), JSON.stringify(out, null, 2) + '\n');
    atomicWrite(OUT, JSON.stringify({ ...s, doctor: out }, null, 2) + '\n');
  }
  return out;
}

async function main() {
  ensureBusy();

  if (cmd === 'status' || cmd === '--json') {
    const s = await buildStatus();
    if (asJson || cmd === '--json' || args.includes('--json')) print(s);
    else console.log(humanStatus(s));
    process.exit(0);
  }

  if (cmd === 'doctor') {
    const d = await doctor();
    if (asJson) print(d);
    else {
      console.log(`webflow-doctor ${d.pass ? 'PASS' : 'ISSUES'}`);
      for (const c of d.checks) {
        console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
      }
      if (d.tips?.length) {
        console.log('tips:');
        for (const t of d.tips.slice(0, 6)) console.log('  ·', t);
      }
    }
    process.exit(d.pass ? 0 : 1);
  }

  if (cmd === 'connect') {
    const sub = args[1] && !args[1].startsWith('--') ? args[1] : 'status';
    const r = runNode(['demigod-webflow-connect.mjs', sub, ...(asJson ? ['--json'] : [])]);
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    process.exit(r.status ?? 1);
  }

  if (cmd === 'tabs') {
    const pages = await listPages();
    const pageOnly = pages.filter((p) => p.type === 'page');
    const byRole = {};
    for (const p of pageOnly) byRole[p.role] = (byRole[p.role] || 0) + 1;
    const out = { at: new Date().toISOString(), pages: pageOnly.length, byRole, list: pageOnly };
    if (asJson) print(out);
    else {
      console.log(`tabs ${pageOnly.length} · ${JSON.stringify(byRole)}`);
      for (const p of pageOnly) {
        console.log(`  [${p.role}] ${(p.title || '').slice(0, 36).padEnd(36)} ${p.url.slice(0, 70)}`);
      }
    }
    process.exit(0);
  }

  if (cmd === 'truth') {
    const disk = diskTruth();
    const live = await liveTruth();
    const freeze = freezeStatus();
    const out = {
      at: new Date().toISOString(),
      freeze,
      disk,
      live,
      align: {
        footVer:
          disk.footVer && live.footVerHint ? disk.footVer === live.footVerHint : null,
        manifest: disk.diskMatchesManifest,
      },
    };
    print(out);
    process.exit(0);
  }

  if (cmd === 'freeze') {
    print(freezeStatus());
    process.exit(freezeStatus().frozen ? 2 : 0);
  }

  if (cmd === 'open') {
    const which = args[1] || 'designer';
    const map = {
      designer: DESIGNER,
      custom: CUSTOM_CODE,
      'custom-code': CUSTOM_CODE,
      code: CUSTOM_CODE,
      live: LIVE,
      site: LIVE,
      dashboard: DASHBOARD,
      dash: DASHBOARD,
    };
    const url = map[which] || which;
    if (!/^https?:\/\//.test(url)) {
      console.error('usage: open designer|custom-code|live|dashboard|<url>');
      process.exit(1);
    }
    const r = await openUrl(url);
    print({ ok: true, opened: url, result: r });
    process.exit(0);
  }

  if (cmd === 'paste-check') {
    const r = await pasteCheck();
    print(r);
    process.exit(r.ok ? 0 : 1);
  }

  if (cmd === 'change') {
    const intent = args.slice(1).filter((arg) => !arg.startsWith('--')).join(' ').trim();
    if (!intent) {
      console.error('usage: bin/dg-webflow change "describe the site change"');
      process.exit(1);
    }
    const route = classifyChange(intent);
    if (asJson) print(route);
    else {
      console.log(`# Webflow change → ${route.type}`);
      console.log(`intent: ${route.intent}`);
      console.log(`files: ${route.files.length ? route.files.join(', ') : 'Webflow Designer/API'}`);
      console.log('next:');
      for (const command of route.commands) console.log(`  ${command}`);
      if (route.note) console.log(`note: ${route.note}`);
    }
    process.exit(0);
  }

  if (cmd === 'tools') {
    if (asJson) print(TOOL_MAP);
    else {
      console.log('Webflow-related tools (run via: bin/dg-webflow run <id>)');
      for (const [id, t] of Object.entries(TOOL_MAP)) {
        console.log(`  ${id.padEnd(18)} ${t.mutate ? 'MUTATE' : 'safe  '}  ${t.purpose}`);
        console.log(`  ${''.padEnd(18)} ${t.cmd}`);
      }
    }
    process.exit(0);
  }

  if (cmd === 'playbook') {
    const name = args[1];
    if (!name || name === 'list') {
      const out = Object.entries(PLAYBOOKS).map(([id, p]) => ({
        id,
        title: p.title,
        mutate: p.mutate,
        steps: p.steps.length,
      }));
      if (asJson) print(out);
      else {
        console.log('playbooks:');
        for (const p of out) {
          console.log(`  ${p.id.padEnd(22)} ${p.mutate ? 'MUTATE' : 'safe  '}  ${p.title}`);
        }
        console.log('\nbin/dg-webflow playbook <id>');
      }
      process.exit(0);
    }
    const pb = PLAYBOOKS[name];
    if (!pb) {
      console.error('unknown playbook', name);
      process.exit(1);
    }
    const freeze = freezeStatus();
    const md = [
      `# Playbook: ${pb.title}`,
      `id: ${name}`,
      `mutate: ${pb.mutate}`,
      `freeze: ${freeze.frozen ? 'ON' : 'OFF'}`,
      '',
      ...(freeze.frozen && pb.mutate
        ? ['**BLOCKED by freeze** — read-only prep only until freeze off.', '']
        : []),
      '## Steps',
      ...pb.steps.map((s, i) => `${i + 1}. \`${s}\``),
      '',
      '## Agent rules',
      '- Prefer bin/dg-webflow status/doctor before any mutate',
      '- CM6 paste only via demigod-cm6-paste-publish.mjs',
      '- After paste/publish: bin/dg-webflow playbook post-publish-confirm',
      '',
    ].join('\n');
    atomicWrite(PLAYBOOK_OUT, md + '\n');
    if (asJson) print({ ...pb, id: name, freeze, path: PLAYBOOK_OUT });
    else console.log(md);
    process.exit(freeze.frozen && pb.mutate ? 2 : 0);
  }

  if (cmd === 'run') {
    const id = args[1];
    const tool = TOOL_MAP[id];
    if (!tool) {
      console.error('unknown tool. bin/dg-webflow tools');
      process.exit(1);
    }
    const freeze = freezeStatus();
    if (dryRun) {
      print({ ok: true, dryRun: true, wouldRun: tool.cmd, mutate: tool.mutate, freeze });
      process.exit(0);
    }
    if (tool.mutate && (freeze.frozen || !freeze.authorized)) {
      print({
        ok: false,
        error: freeze.frozen ? 'freeze_blocks_mutate' : 'current_request_publish_required',
        freeze,
        tool: id,
        cmd: tool.cmd,
        hint: freeze.frozen
          ? 'Freeze ON. Mutation is blocked.'
          : 'This foreground request has not authorized external publication.',
      });
      process.exit(3);
    }
    // parse cmd into node args
    const parts = tool.cmd.split(/\s+/);
    const nodeArgs = parts[0] === 'node' ? parts.slice(1) : [tool.cmd];
    const r = runNode(nodeArgs, { timeout: 300000 });
    const out = {
      ok: r.status === 0,
      status: r.status,
      tool: id,
      cmd: tool.cmd,
      stdout: (r.stdout || '').slice(-4000),
      stderr: (r.stderr || '').slice(-2000),
    };
    atomicWrite(path.join(BUSY, `webflow-run-${id}.json`), JSON.stringify(out, null, 2) + '\n');
    print(out);
    process.exit(r.status === 0 ? 0 : 1);
  }

  if (cmd === 'hygiene') {
    const extra = [];
    if (args.includes('--prune')) extra.push('--prune');
    if (args.includes('--kill-hung')) extra.push('--kill-hung');
    if (asJson) extra.push('--json');
    const r = runNode(['demigod-laptop-hygiene.mjs', ...extra], { timeout: 60000 });
    process.stdout.write(r.stdout || '');
    if (r.stderr) process.stderr.write(r.stderr);
    process.exit(r.status === 0 ? 0 : 1);
  }

  if (cmd === 'brief') {
    const s = await buildStatus();
    const lines = [];
    lines.push('# Webflow agent brief');
    lines.push(humanStatus(s));
    lines.push('## Do / Do not');
    lines.push('- DO start with bin/dg-webflow doctor + tabs');
    lines.push(`- Publish freeze is ${s.freeze.frozen ? 'ON; DO NOT mutate' : 'OFF; DO claim the foot lock before CDN/paste mutations'}`);
    lines.push('- DO use demigod-cm6-paste-publish for Custom Code');
    lines.push('- DO NOT keyboard.type large pastes into CM6');
    lines.push('- DO NOT open 10+ Designer tabs — prune first');
    lines.push('- DO NOT edit game files');
    lines.push('- DO NOT claim live==disk without bin/dg-webflow truth');
    lines.push('');
    lines.push('## Playbooks');
    for (const [id, p] of Object.entries(PLAYBOOKS)) {
      lines.push(`- ${id}: ${p.title}`);
    }
    const md = lines.join('\n');
    atomicWrite(path.join(BUSY, 'webflow-brief.md'), md + '\n');
    console.log(md);
    process.exit(0);
  }

  console.error(`usage:
  bin/dg-webflow status|doctor|connect|tabs|truth|freeze|tools|brief
  bin/dg-webflow open designer|custom-code|live|dashboard
  bin/dg-webflow paste-check
  bin/dg-webflow change "describe the site change"
  bin/dg-webflow playbook [list|name]
  bin/dg-webflow run <tool> [--dry-run]
`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
