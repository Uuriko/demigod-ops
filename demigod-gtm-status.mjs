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
import { buildStatus } from './demigod-demand.mjs';

process.umask(0o077);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const roots = [__dirname, '/home/potter'];
const find = (...parts) => {
  for (const r of roots) {
    const p = path.join(r, ...parts);
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, ...parts);
};

function listReady(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
}

function main() {
  const ready = find('demigod-outreach', 'ready-emails');
  const engReady = find('demigod-outreach', 'ready-emails-eng');
  const pilotLog = find('demigod-ops', 'PILOT-LOG.md');

  const demand = buildStatus();
  const founders = listReady(ready);
  const engs = listReady(engReady);

  const met = spawnSync('bash', ['-lc', '~/bin/dg-site-metrics 2>&1 | tail -20'], {
    encoding: 'utf8',
    timeout: 120000,
  });
  const score = (met.stdout.match(/score\s+(\d+)\/100/) || [])[1] || '?';
  const fails = (met.stdout.match(/fails=(\d+)/) || [])[1] || '?';

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
  lines.push('**mode:** DRAFTS-ONLY');
  lines.push(`**next:** ${demand.next}`);
  lines.push('');
  lines.push('## Site');
  lines.push(score === '?' || fails === '?' ? '- metrics: unavailable (see tail)' : `- metrics: **${score}/100** fails=${fails}`);
  // Disk foot version + configured loader URL when observed.
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
  const footCdn = (footLite.match(/<script id="demigod-foot-cdn-loader" src="([^"]+)"/) || [])[1];
  if (footDisk !== '?') lines.push(`- foot disk: **v${footDisk}**`);
  if (footCdn) lines.push(`- loader CDN: \`${footCdn}\``);
  if (cdpPages != null) lines.push(`- CDP page tabs: **${cdpPages}** (budget ~6–10)`);
  lines.push('');
  lines.push('## Founder queue (drafts only)');
  lines.push(`- ready .txt files observed: **${founders.length}**`);
  lines.push(`- queue: **${demand.queue.pending}** pending / ${demand.queue.total} total`);
  lines.push(`- SENT-CONFIRMED: **${demand.dms.sentConfirmed}**`);
  lines.push(`- top pending: ${demand.queue.top3.map((t) => `${t.name} (${t.handle})`).join(', ') || 'none'}`);
  if (demand.dms.sentConfirmed) {
    lines.push('- recent confirmed:');
    demand.dms.recent.forEach((l) => lines.push(`  - ${l}`));
  }
  lines.push('');
  lines.push('## Engineer drafts');
  lines.push(`- ready .txt files observed: **${engs.length}**`);
  lines.push('');
  lines.push('## Warm inbound');
  lines.push(`- signals: **${demand.warmInbound.count}** · overdue actions=${demand.warmInbound.freshness.overdueActionCount} · due today=${demand.warmInbound.freshness.dueTodayActionCount} · scheduled=${demand.warmInbound.freshness.scheduledActionCount}`);
  lines.push(`- ${demand.warmInbound.note}`);
  lines.push(`- PILOT-LOG: ${fs.existsSync(pilotLog) ? 'yes' : 'missing'}`);
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
        mode: 'drafts_only',
        next: demand.next,
        score,
        fails,
        sent_confirmed: demand.dms.sentConfirmed,
        top3_remaining: demand.queue.top3.map((t) => t.name),
        queue: {
          total: demand.queue.total,
          pending: demand.queue.pending,
          sentConfirmedInQueue: demand.queue.sentConfirmedInQueue,
          top3: demand.queue.top3.map(({ name, handle }) => ({ name, handle })),
        },
        dms: {
          sentConfirmed: demand.dms.sentConfirmed,
          sentUnattested: demand.dms.sentUnattested,
          malformedReceipts: demand.dms.malformedReceipts,
          malformedReceiptReasons: demand.dms.malformedReceiptReasons,
        },
        warm_inbound: {
          count: demand.warmInbound.count,
          freshness: demand.warmInbound.freshness,
          note: demand.warmInbound.note,
        },
        founder_ready: founders.length,
        eng_templates: engs.length,
        cdp_pages: cdpPages,
        md: mdPath,
      },
      null,
      2
    )
  );
  fs.chmodSync(mdPath, 0o600);
  fs.chmodSync(jsonPath, 0o600);
  console.log(md);
  console.log('→', mdPath);
}

main();
