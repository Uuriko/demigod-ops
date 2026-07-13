#!/usr/bin/env node
/**
 * One-shot GTM status for Demigod autopilot handoffs.
 * Usage: node demigod-gtm-status.mjs
 * Writes: /tmp/demigod-gtm-status-latest.md + .json
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const roots = [__dirname, '/home/potter'];
const find = (...parts) => {
  for (const r of roots) {
    const p = path.join(r, ...parts);
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, ...parts);
};

function countSentConfirmed(logPath) {
  if (!fs.existsSync(logPath)) return { total: 0, confirmed: 0, lines: [] };
  const lines = fs
    .readFileSync(logPath, 'utf8')
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  const confirmed = lines.filter((l) => /SENT-CONFIRMED/i.test(l));
  return { total: lines.length, confirmed: confirmed.length, lines: confirmed.slice(-8) };
}

function listReady(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.txt')).sort();
}

function main() {
  const sendLog = find('demigod-outreach', 'dm-send-log.txt');
  const ready = find('demigod-outreach', 'ready-emails');
  const engReady = find('demigod-outreach', 'ready-emails-eng');
  const pilotLog = find('demigod-ops', 'PILOT-LOG.md');
  const douglas = find('demigod-ops', 'DOUGLAS-GREEN-PREP-2026-07-14.md');
  const sendPack = find('demigod-outreach', 'SEND-PACK-2026-07-09.md');

  const sent = countSentConfirmed(sendLog);
  const founders = listReady(ready, 'dm-2026-07-09-');
  const engs = listReady(engReady, 'eng-2026-07-09-');

  // Top-3 priority remaining (handles already SENT-CONFIRMED)
  const TOP3 = [
    { name: 'T0', handle: '@lancectk', file: 'dm-2026-07-09-t0.txt' },
    { name: 'Hellyeah', handle: '@hellyeah_ai', file: 'dm-2026-07-09-hellyeah.txt' },
    { name: 'Weave', handle: '@adambcohen93', file: 'dm-2026-07-09-weave.txt' },
  ];
  const confirmedBlob = (sent.lines || []).join('\n');
  const top3Left = TOP3.filter((t) => !confirmedBlob.includes(t.handle));
  const douglasCall = new Date('2026-07-14T20:30:00Z'); // 13:30 PT
  const daysToDouglas = ((douglasCall - Date.now()) / 86400000).toFixed(1);
  const blocked = sent.confirmed === 0;

  const met = spawnSync('bash', ['-lc', '~/bin/dg-site-metrics 2>&1 | tail -20'], {
    encoding: 'utf8',
    timeout: 120000,
  });
  const score = (met.stdout.match(/score\s+(\d+)\/100/) || [])[1] || '?';
  const fails = (met.stdout.match(/fails=(\d+)/) || [])[1] || '?';

  const report = spawnSync('node', [path.join(__dirname, 'demigod-pilot-logger.mjs'), '--report'], {
    encoding: 'utf8',
    timeout: 30000,
    cwd: __dirname,
  });

  // Reply-check: prefer latest dump; always --scan-local fallback
  const replyScript = path.join(__dirname, 'demigod-reply-check.mjs');
  let replyOut = '';
  let replyJson = null;
  if (fs.existsSync(replyScript)) {
    const gmailDump = '/tmp/demigod-gmail-inbound.json';
    const args = fs.existsSync(gmailDump)
      ? [replyScript, `--file=${gmailDump}`]
      : [replyScript, '--scan-local'];
    const rr = spawnSync('node', args, {
      encoding: 'utf8',
      timeout: 30000,
      cwd: __dirname,
    });
    replyOut = (rr.stdout || '').trim();
    try {
      replyJson = JSON.parse(fs.readFileSync('/tmp/demigod-reply-check-latest.json', 'utf8'));
    } catch {
      replyJson = null;
    }
  }

  // CDP page budget snapshot
  let cdpPages = null;
  try {
    const cdp = spawnSync(
      'python3',
      [
        '-c',
        "import json,urllib.request;t=json.load(urllib.request.urlopen('http://127.0.0.1:9223/json/list',timeout=3));print(sum(1 for x in t if x.get('type')=='page'))",
      ],
      { encoding: 'utf8', timeout: 8000 }
    );
    if (cdp.status === 0) cdpPages = Number((cdp.stdout || '').trim()) || null;
  } catch {
    cdpPages = null;
  }

  const lines = [];
  lines.push('# Demigod GTM status');
  lines.push(`**at:** ${new Date().toISOString()}`);
  lines.push(`**mode:** ${blocked ? 'BLOCKED — human DMs' : 'ACTIVE — track replies'}`);
  lines.push('');
  lines.push('## Site');
  lines.push(`- metrics: **${score}/100** fails=${fails}`);
  // Disk foot ver + events URL if present
  let footDisk = '?';
  try {
    const core = fs.readFileSync(path.join(__dirname, 'demigod-foot-core.js'), 'utf8');
    footDisk = (core.match(/__dgFootVer='(\d+)'/) || [])[1] || '?';
  } catch {
    /* ignore */
  }
  const footLite = (() => {
    try {
      return fs.readFileSync(path.join(__dirname, 'demigod-footer-lite.html'), 'utf8');
    } catch {
      return '';
    }
  })();
  const footCdn = (footLite.match(/files\.catbox\.moe\/[a-z0-9]+\.js/) || [])[0] || 'unknown';
  lines.push(`- foot disk: **v${footDisk}** · loader CDN: \`${footCdn}\``);
  if (cdpPages != null) lines.push(`- CDP page tabs: **${cdpPages}** (budget ~6–10)`);
  lines.push(`- events: local :3460 + https://files.catbox.moe/th1yzx.html`);
  lines.push('');
  lines.push('## Founder outbound');
  lines.push(`- ready batch: **${founders.length}** files`);
  lines.push(`- SENT-CONFIRMED: **${sent.confirmed}** / 8`);
  lines.push(`- Top 3 remaining: ${top3Left.length || 'none — top3 done'}`);
  top3Left.forEach((t) => {
    lines.push(`  - ${t.name} (${t.handle}) · \`demigod-outreach/ready-emails/${t.file}\` · mark: \`node demigod-dm-mark-sent.mjs --name=${t.name}\``);
  });
  lines.push(`- fast pack: demigod-outreach/SEND-PACK-TOP3.md`);
  lines.push(`- full pack: ${fs.existsSync(sendPack) ? 'yes' : 'missing'} → demigod-outreach/SEND-PACK-2026-07-09.md`);
  if (sent.confirmed) {
    lines.push('- recent confirmed:');
    sent.lines.slice(-5).forEach((l) => lines.push(`  - ${l}`));
  }
  lines.push('');
  lines.push('## Engineer outbound');
  lines.push(`- templates: **${engs.length}** (handles empty until warm path)`);
  lines.push('- demand map: demigod-outreach/ROLE-DEMAND-FROM-FOUNDERS.md');
  lines.push('');
  lines.push('## Warm inbound / reply-check');
  lines.push(
    `- Douglas: call **2026-07-14 13:30 PT** (T-${daysToDouglas}d) · prep email SENT · pack: demigod-ops/DOUGLAS-CALL-PACK-2026-07-14.md`
  );
  lines.push(`- PILOT-LOG: ${fs.existsSync(pilotLog) ? 'yes' : 'missing'}`);
  if (replyJson) {
    lines.push(
      `- reply-check: scanned=${replyJson.scanned ?? '?'} human=${replyJson.human ?? '?'} realForms=${replyJson.realForms ?? '?'} test=${replyJson.test ?? '?'}`
    );
  } else {
    lines.push('- reply-check: run `node demigod-reply-check.mjs --scan-local` (or refresh Gmail dump)');
  }
  lines.push('');
  lines.push('## Human blockers (not agent-shippable)');
  lines.push('1. Send Top 3 DMs (T0 → Hellyeah → Weave) from SEND-PACK-TOP3.md');
  lines.push('2. Douglas call Tue Jul 14 → notes + intros');
  lines.push('3. First real brief → white-glove → pilot-logger');
  if (blocked) {
    lines.push('');
    lines.push('## Autopilot idle policy');
    lines.push('- Site green → **no foot/head bump**');
    lines.push('- Do **not** invent eng handles or re-churn ready-emails');
    lines.push('- Agent may only: metrics, gates, gtm-status, reply-check, Douglas day-of confirm');
    lines.push('- Unblock when: SENT-CONFIRMED>0 or metrics fail or Douglas call day');
  }
  lines.push('');
  lines.push('## pilot-logger --report');
  lines.push('```');
  lines.push((report.stdout || '').trim().slice(0, 1500));
  lines.push('```');
  lines.push('');
  lines.push('## reply-check (tail)');
  lines.push('```');
  lines.push(replyOut.slice(0, 1200) || '(no output)');
  lines.push('```');
  lines.push('');
  lines.push('## metrics tail');
  lines.push('```');
  lines.push((met.stdout || '').trim().slice(0, 1200));
  lines.push('```');

  const md = lines.join('\n') + '\n';
  const mdPath = '/tmp/demigod-gtm-status-latest.md';
  const jsonPath = '/tmp/demigod-gtm-status-latest.json';
  fs.writeFileSync(mdPath, md);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        mode: blocked ? 'blocked_human_dms' : 'active',
        score,
        fails,
        sent_confirmed: sent.confirmed,
        top3_remaining: top3Left.map((t) => t.name),
        founder_ready: founders.length,
        eng_templates: engs.length,
        douglas_call: '2026-07-14T13:30-07:00',
        days_to_douglas: Number(daysToDouglas),
        reply_check: replyJson,
        cdp_pages: cdpPages,
        md: mdPath,
      },
      null,
      2
    )
  );
  console.log(md);
  console.log('→', mdPath);
}

main();
