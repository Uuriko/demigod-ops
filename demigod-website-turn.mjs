#!/usr/bin/env node
/**
 * Demigod website autopilot turn:
 *   metrics + live markers → CDP screenshot → Fable plan → handoff file
 *   Optional: spawn grok -p with continue prompt (DEMIGOD_AUTO_GROK=1)
 *
 * Usage:
 *   node demigod-website-turn.mjs              # audit + fable + handoff
 *   node demigod-website-turn.mjs --ship       # also apply simple auto-slice if fable outputs SEARCH/REPLACE
 *   DEMIGOD_AUTO_GROK=1 node demigod-website-turn.mjs  # queue headless grok continue
 *   node demigod-website-turn.mjs --status     # print last handoff path
 */
import fs from 'fs';
import path from 'path';
import { spawnSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const OUT_DIR = '/tmp';
const HANDOFF = path.join(OUT_DIR, 'demigod-website-turn-latest.md');
const STATE = path.join(OUT_DIR, 'demigod-website-turn-state.json');
const args = new Set(process.argv.slice(2));

function sh(cmd, opts = {}) {
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: opts.timeout || 120000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    code: r.status ?? 1,
    out: (r.stdout || '') + (r.stderr || ''),
  };
}

function read(p, max = 4000) {
  try { return fs.readFileSync(p, 'utf8').slice(0, max); } catch { return ''; }
}

function nowIso() { return new Date().toISOString(); }

function liveMarkers() {
  const r = sh(`curl -sL "https://www.trydemigod.com/?cb=$(date +%s)" | head -c 120000`);
  const html = r.out;
  const pub = (html.match(/Last Published: ([^<]+)/) || [])[1] || '?';
  const cdn = [...html.matchAll(/files\.catbox\.moe\/([a-z0-9]+\.js)/g)].map((m) => m[1]);
  return {
    pub: pub.slice(0, 40),
    cdn: cdn[0] || 'none',
    bytes: html.length,
    h24: /within\s*24\s*hours?/i.test(html),
    lorem: /lorem/i.test(html),
    v5: /unhide-v5/i.test(html),
    ld: /application\/ld\+json/i.test(html),
  };
}

function metrics() {
  const r = sh('~/bin/dg-site-metrics 2>&1 | tail -25');
  const score = (r.out.match(/score\s+(\d+)\/100/) || [])[1] || '?';
  return { score, tail: r.out.slice(-1500) };
}

function footVer() {
  const core = read(path.join(ROOT, 'demigod-foot-core.js'), 200);
  const m = core.match(/__dgFootVer='(\d+)'/) || core.match(/v(\d+)/);
  return m ? m[1] : '?';
}

function cdpScreenshot() {
  const script = `
import json, urllib.request, asyncio, base64
try:
  import websockets
except ImportError:
  print('no-websockets'); raise SystemExit(0)

def tabs():
  return [t for t in json.load(urllib.request.urlopen('http://127.0.0.1:9223/json/list', timeout=5)) if t.get('type')=='page']

live=next((t for t in tabs() if 'trydemigod.com' in t.get('url','') and 'design' not in t.get('url','')), None)
if not live:
  # open a new tab to live site
  try:
    req=urllib.request.Request('http://127.0.0.1:9223/json/new?https://www.trydemigod.com/?cb=turn', method='PUT')
    live=json.load(urllib.request.urlopen(req, timeout=10))
  except Exception:
    # fallback: navigate any page
    anyp=next((t for t in tabs() if t.get('webSocketDebuggerUrl')), None)
    if not anyp:
      print('no-cdp'); raise SystemExit(0)
    live=anyp

async def main():
  ws=await websockets.connect(live['webSocketDebuggerUrl'], max_size=20_000_000, open_timeout=15)
  mid=0
  async def call(method, params=None, timeout=30):
    nonlocal mid; mid+=1
    msg={'id':mid,'method':method}
    if params is not None: msg['params']=params
    await ws.send(json.dumps(msg))
    while True:
      r=json.loads(await asyncio.wait_for(ws.recv(), timeout=timeout))
      if r.get('id')==mid:
        if 'error' in r: raise RuntimeError(r['error'])
        return r.get('result',{})
  await call('Page.enable')
  url=live.get('url','')
  if 'trydemigod.com' not in url or 'design' in url:
    await call('Page.navigate', {'url': 'https://www.trydemigod.com/?cb=turn'})
    await asyncio.sleep(4)
  else:
    await call('Page.reload', {'ignoreCache': True})
    await asyncio.sleep(3)
  shot=await call('Page.captureScreenshot', {'format':'png', 'fromSurface': True})
  open('/tmp/demigod-website-turn.png','wb').write(base64.b64decode(shot['data']))
  print('/tmp/demigod-website-turn.png')
  await ws.close()
asyncio.run(main())
`;
  fs.writeFileSync('/tmp/dg-turn-shot.py', script);
  const r = sh('python3 /tmp/dg-turn-shot.py 2>&1', { timeout: 60000 });
  const line = r.out.trim().split('\n').pop();
  return line.includes('.png') ? line : null;
}

function siteGreen(met, live) {
  const score = Number(met.score);
  return score >= 95 && !live.h24 && !live.lorem;
}

function fablePlan(live, met, ver) {
  const green = siteGreen(met, live);
  const prompt = green
    ? `Demigod autopilot. Phase: GTM + pre-services honesty. No user — Fable decides.
Site is GREEN: foot v${ver}, CDN ${live.cdn}, metrics ${met.score}/100, h24=${live.h24}, lorem=${live.lorem}.
**DO NOT propose foot/head SEARCH/REPLACE or version bumps.** Site done enough.
Rank 3 next GTM/ops S-slices (max 2 agent-shippable without human send).
Context: 8 founder ready DMs SENT-CONFIRMED=0; Douglas call 2026-07-14 13:30 PT; engineers.csv empty (no inventing people).
Tools: demigod-gtm-status.mjs, demigod-reply-check.mjs, demigod-dm-mark-sent.mjs, demigod-cdp-tab-prune.mjs.
Short files/cmds only.`
    : `Demigod website autopilot turn. Current phase: GTM + pre-services honesty. No user — Fable decides.

Live: foot v${ver}, CDN ${live.cdn}, published ${live.pub}, metrics ${met.score}/100, h24_source=${live.h24}, lorem=${live.lorem}, unhide-v5=${live.v5}.
Screenshot: /tmp/demigod-website-turn.png (if present).

Task: Ranked 3 next website-only S-slices. Exact SEARCH/REPLACE for #1 as next foot/head version only if metrics fail or honesty regression. Prefer conversion/honesty/a11y/mobile. Pending language. Compact Cursor-ready.`;
  const pfile = '/tmp/dg-turn-fable-prompt.txt';
  fs.writeFileSync(pfile, prompt);
  const r = sh(
    `export PATH="$HOME/.local/bin:$PATH"; claude --print --model sonnet --add-dir ${ROOT} < ${pfile} 2>/tmp/dg-turn-fable.err | tee /tmp/fable-website-turn-latest.txt`,
    { timeout: 240000 },
  );
  return {
    ok: r.code === 0 && r.out.length > 80,
    text: r.out.slice(0, 8000),
    path: '/tmp/fable-website-turn-latest.txt',
    green,
  };
}

function writeHandoff({ live, met, ver, shot, fable }) {
  const green = fable.green || siteGreen(met, live);
  const continuePrompt = green
    ? `Demigod GTM. Read ${HANDOFF}. Site GREEN metrics ${met.score}/100 foot v${ver} CDN ${live.cdn}.
**No foot/head bump.** Ship Fable #1 GTM/ops slice (max 2). Never auto-send founder DMs.
Verify gates if code changed. Write handoff. Self-continue GTM until human sends DMs or Douglas call.`
    : `Demigod website. Read ${HANDOFF}. Current metrics ${met.score}/100, foot v${ver}, CDN ${live.cdn}.
Implement Fable #1 SEARCH/REPLACE from ${fable.path}, verify (source+board+loop-state), CDN publish + Webflow CM6 paste+Publish, screenshot confirm.
Then call Fable again for next slice. Self-continue: keep shipping website until metrics improve or 3 slices done this turn.`;

  const body = `# Demigod website turn handoff
**at:** ${nowIso()}
**mode:** ${green ? 'GTM (site green — no foot bump)' : 'SITE (metrics/regression)'}
**foot_ver_disk:** v${ver}
**live_cdn:** ${live.cdn}
**last_published:** ${live.pub}
**metrics:** ${met.score}/100
**h24_source:** ${live.h24} | **lorem:** ${live.lorem}
**screenshot:** ${shot || 'none'}
**fable_plan:** ${fable.path} (ok=${fable.ok})

## Metrics tail
\`\`\`
${met.tail}
\`\`\`

## Fable next (top)
\`\`\`
${(fable.text || '').slice(0, 3500)}
\`\`\`

## Grok continue prompt
${continuePrompt}
No user questions — Fable/Heavy authority. Pending language. No game.
`;
  fs.writeFileSync(HANDOFF, body);
  fs.writeFileSync(STATE, JSON.stringify({
    at: nowIso(),
    ver,
    score: met.score,
    cdn: live.cdn,
    mode: green ? 'gtm' : 'site',
    handoff: HANDOFF,
    fable: fable.path,
    shot,
  }, null, 2));
  return HANDOFF;
}

function maybeSpawnGrok() {
  if (process.env.DEMIGOD_AUTO_GROK !== '1') return null;
  const prompt = fs.readFileSync(HANDOFF, 'utf8');
  const cont = `Continue Demigod website work autonomously.\n\n${prompt.slice(0, 6000)}`;
  const pf = '/tmp/dg-turn-grok-prompt.txt';
  fs.writeFileSync(pf, cont);
  // fire-and-forget headless grok in background
  const log = '/tmp/dg-turn-grok.log';
  const child = spawn('bash', ['-lc', `cd ${ROOT} && grok -p "$(cat ${pf})" --cwd ${ROOT} --yolo >> ${log} 2>&1`], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return { pid: child.pid, log };
}

function gtmStatusSnippet() {
  const script = path.join(ROOT, 'demigod-gtm-status.mjs');
  if (!fs.existsSync(script)) return '';
  const r = sh(`node ${script} 2>&1 | head -45`, { timeout: 180000 });
  return (r.out || '').slice(0, 2500);
}

function main() {
  if (args.has('--status')) {
    console.log(read(STATE) || 'no state');
    process.exit(0);
  }
  console.log('=== demigod-website-turn start', nowIso());
  const ver = footVer();
  const live = liveMarkers();
  const met = metrics();
  const green = siteGreen(met, live);
  // Skip heavy CDP shot when green GTM (often hangs); allow force with DEMIGOD_FORCE_SHOT=1
  let shot = null;
  if (!green || process.env.DEMIGOD_FORCE_SHOT === '1') {
    shot = cdpScreenshot();
  } else {
    console.log('skip CDP shot (green GTM mode; set DEMIGOD_FORCE_SHOT=1 to force)');
  }
  console.log(JSON.stringify({ ver, live, score: met.score, green, shot }, null, 2));

  // When site green, always refresh GTM status into /tmp for handoffs
  let gtm = '';
  if (green) {
    try {
      gtm = gtmStatusSnippet();
      console.log('gtm-status refreshed');
    } catch (e) {
      console.log('gtm-status err', e.message);
    }
  }

  const fable = fablePlan(live, met, ver);
  const handoff = writeHandoff({ live, met, ver, shot, fable });
  if (gtm) {
    try {
      fs.appendFileSync(
        HANDOFF,
        `\n## GTM status snapshot\n\`\`\`\n${gtm}\n\`\`\`\n`
      );
    } catch {
      /* ignore */
    }
  }
  console.log('handoff →', handoff);
  const grok = maybeSpawnGrok();
  if (grok) console.log('spawned grok', grok);
  console.log('=== demigod-website-turn done mode=' + (green ? 'gtm' : 'site'));
  process.exit(0);
}

main();
