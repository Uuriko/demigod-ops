#!/usr/bin/env node
// One-command refresh of the whole SF startup directory system. Run monthly (or on a timer) to keep
// coverage, job data, the Pulse, and the crawlable snapshot fresh. Order matters: refresh the HN
// cache BEFORE the map rebuild so the rebuild merges the latest "Who is hiring?" companies.
//
//   node demigod-directory-refresh.mjs           full refresh (network; several minutes)
//   node demigod-directory-refresh.mjs --dry      list the steps only
//
// Steps:
//   1. demigod-hn-hiring.mjs        — refresh HN Who-is-Hiring cache (fresh actively-hiring SF startups)
//   2. demigod-startup-map-data.mjs --with-jobs
//                                   — rebuild map (YC + Wikidata-broad + HN) → enrich jobs + roles → floors
//   3. demigod-hiring-pulse.mjs     — regenerate the Pulse (json + html) + append today's history snapshot
//   4. demigod-directory-static.mjs — regenerate the crawlable static /startups snapshot
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const steps = [
  // 12 months, not 3: backfilling a year of threads adds ~220 SF companies the directory does not
  // otherwise have (~96 with a company-posted ATS board link). Rows from threads older than 120d
  // carry hiring:'unknown' — see isFreshHnThread — so the extra reach never fakes a live claim.
  ['demigod-hn-hiring.mjs', ['--months', '12']],
  ['demigod-startup-map-data.mjs', ['--with-jobs']],
  ['demigod-role-ledger.mjs', ['poll']], // accrue per-role open-lifetime (observed age; native posting dates)
  ['demigod-roles-feed.mjs', []], // rebuild the public recent-role feed from that same fresh ledger
  ['demigod-directory-aging.mjs', ['--enrich-map']], // tag companies with open-role aging (posted 90-365d) for the directory badge
  ['demigod-hiring-pulse.mjs', []],
  ['demigod-directory-static.mjs', []],
];

if (process.argv.includes('--dry')) {
  for (const [s, a] of steps) console.log('→ node', s, a.join(' '));
  process.exit(0);
}

for (const [script, args] of steps) {
  console.log(`\n→ node ${script} ${args.join(' ')}`);
  const r = spawnSync('node', [path.join(ROOT, script), ...args], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`FAILED at ${script} (exit ${r.status}) — directory NOT fully refreshed`);
    process.exit(1);
  }
}
console.log('\n✓ SF startup directory system refreshed (map + jobs + roles + pulse + static).');
