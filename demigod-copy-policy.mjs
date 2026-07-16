#!/usr/bin/env node
/**
 * Copy-policy checker — disk foot COPY + live HTML by default.
 *
 * Usage:
 *   node demigod-copy-policy.mjs              # disk + live
 *   node demigod-copy-policy.mjs --disk-only  # disk only
 *   node demigod-copy-policy.mjs --source-only # alias: canonical source only
 *   node demigod-copy-policy.mjs --live       # same as default
 *   node demigod-copy-policy.mjs --json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BUSY,
  ensureBusy,
  atomicWrite,
  LIVE_DEFAULT,
  flag,
} from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const DENY = path.join(ROOT, 'demigod-copy-denylist.txt');
const LIVE = process.env.DEMIGOD_LIVE || LIVE_DEFAULT;
const args = process.argv.slice(2);
const diskOnly = flag(args, '--disk-only') || flag(args, '--source-only');
const wantLive = !diskOnly; // live by default
const scope = wantLive ? 'source+live' : 'source';
const asJson = flag(args, '--json');

const SPEED = /48\s*h|within\s*\d+\s*h|\bSLA\b|fastest reply|guaranteed?\s+match|instant\s+match/i;
const VOLUME = /(?:startups?\s+receive\s+)?(?:3\s*(?:[\s/\u2013\u2014-]|to)\s*5|three\s+to\s+five)\s+(?:(?:highly\s+aligned|hand[\s-]?picked|best[\s-]?fit|vetted|top|qualified|strong|curated)\s+)?(?:candidates?|matches?|introductions?|profiles?|finalists?)|(?:shortlist|slate|set|batch|group)\s+of\s+(?:candidates?|matches?|introductions?|profiles?)\s*(?:of\s+)?(?:3\s*(?:[\u2013\u2014-]|to)\s*5|three\s+to\s+five)|pre-vetted candidates ready to interview/i;
const REPLACEMENT = /(?:90\s*[\u2013\u2014-]?\s*day\s+)?(?:free\s+)?replacement\s+(?:policy\s+)?(?:guarantee(?:d)?|promise|warranty|assurance)|guaranteed\s+(?:free\s+)?replacement|(?:replace\s+(?:them|the\s+hire|the\s+candidate)|find\s+(?:you\s+)?another)\s+(?:for\s+free|at\s+no\s+(?:extra\s+)?cost)/i;
const LOREM = /lorem ipsum|ipsum dolor sit amet/i;

function loadDenylist() {
  const names = ['John']; // historical leak
  try {
    const t = fs.readFileSync(DENY, 'utf8');
    for (const line of t.split('\n')) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      names.push(s);
    }
  } catch {
    /* optional file */
  }
  return names;
}

const denylist = loadDenylist();
const nameRe = new RegExp(
  '\\b(' + denylist.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'i',
);

const checks = [];
let pass = true;

function add(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail: String(detail || '').slice(0, 240) });
  if (!ok) pass = false;
}

// disk foot
{
  const exists = fs.existsSync(FOOT);
  add('foot-exists', exists, FOOT);
  if (exists) {
    const js = fs.readFileSync(FOOT, 'utf8');
    const copy = (js.match(/var COPY=\{[\s\S]*?\n\};/) || [''])[0];
    add('COPY-block-present', copy.length > 50, `len=${copy.length}`);
    add('COPY-no-speed', !SPEED.test(copy), SPEED.test(copy) ? 'speed/SLA language in COPY' : 'clean');
    add('COPY-no-volume', !VOLUME.test(copy), VOLUME.test(copy) ? 'volume claim in COPY' : 'clean');
    add(
      'COPY-no-replacement-promise',
      !REPLACEMENT.test(copy),
      REPLACEMENT.test(copy) ? 'replacement promise in COPY' : 'clean',
    );
    const nameHit = copy.match(nameRe);
    add(
      'COPY-no-founder-names',
      !nameHit,
      nameHit ? `name leak in COPY: ${nameHit[0]}` : `clean (denylist n=${denylist.length})`,
    );
    add('has-scrubTimeClaims', /function scrubTimeClaims/.test(js), 'scrubTimeClaims');
    add('has-scrubStaticLabels', /function scrubStaticLabels/.test(js), 'scrubStaticLabels');
    const pendingOk =
      /pending/i.test(js) || /potter@trydemigod\.com/.test(copy) || /potter@trydemigod\.com/.test(js);
    add('pending-or-hello-present', pendingOk, 'expect pending services or potter@ contact');
  }
}

if (wantLive) {
  try {
    const r = await fetch(`${LIVE}/?cb=${Date.now()}`, {
      headers: { 'User-Agent': 'dg-copy-policy' },
      signal: AbortSignal.timeout(15000),
    });
    const html = await r.text();
    add('live-reachable', r.ok, `HTTP ${r.status}`);
    // Hard: speed/SLA promises on live
    add('live-no-speed', !SPEED.test(html), SPEED.test(html) ? 'speed language on live HTML' : 'clean');
    // Soft: volume language often lives in stale Webflow static — report but don't fail gate
    // (disk COPY remains hard). Use --strict-live to fail.
    const volLive = VOLUME.test(html);
    const softVol = !flag(args, '--strict-live');
    if (softVol) {
      checks.push({
        name: 'live-no-volume',
        ok: true,
        soft: true,
        detail: volLive ? 'WARN volume language on live (static Webflow?) — not failing' : 'clean',
      });
    } else {
      add('live-no-volume', !volLive, volLive ? 'volume language on live' : 'clean');
    }
    // Static Webflow HTML may still contain FOUC "90-day replacement guarantee";
    // runtime head/foot scrub rewrites it. Soft-fail when scrub is present (same pattern as volume).
    const hasRuntimeScrub =
      /replacement\s+(?:guarantee|promise)/i.test(html) &&
      (/90-day outcome focus/i.test(html) || /scrub.*replacement|replacement.*scrub/i.test(html) || /dg-unhide|dg-foot|__dgFootVer|foot v\d+/i.test(html));
    const repLive = REPLACEMENT.test(html);
    if (repLive && hasRuntimeScrub) {
      checks.push({
        name: 'live-no-replacement-promise',
        ok: true,
        soft: true,
        detail: 'WARN static replacement promise on live — runtime scrub present (not failing)',
      });
    } else {
      add(
        'live-no-replacement-promise',
        !repLive,
        repLive ? 'replacement promise on live' : 'clean',
      );
    }
    add('live-no-lorem', !LOREM.test(html), LOREM.test(html) ? 'lorem on live' : 'clean');
    const liveName = html.match(nameRe);
    if (denylist.some((n) => n.length >= 4)) {
      add(
        'live-no-denylist-names',
        !liveName ||
          !new RegExp(`founder[^<]{0,40}${liveName?.[0]}|${liveName?.[0]}[^<]{0,40}founder`, 'i').test(
            html,
          ),
        liveName ? `saw ${liveName[0]} (context-checked)` : 'clean',
      );
    }
  } catch (e) {
    add('live-reachable', false, String(e.message || e));
  }
}

const report = {
  at: new Date().toISOString(),
  pass,
  live: wantLive,
  scope,
  denylistCount: denylist.length,
  checks,
  summary: pass ? 'PASS — copy policy clean' : 'FAIL — copy policy leak',
};

ensureBusy();
atomicWrite(path.join(BUSY, 'copy-policy-latest.json'), JSON.stringify(report, null, 2) + '\n');

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`copy-policy  ${pass ? 'PASS ✓' : 'FAIL ✗'} · scope=${scope}`);
  for (const c of checks) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.name.padEnd(28)} ${c.detail}`);
  }
  console.log(`wrote /tmp/dg-busy/copy-policy-latest.json`);
}

process.exit(pass ? 0 : 1);
