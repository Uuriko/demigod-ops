#!/usr/bin/env node
/**
 * Demigod CDP WIZ audit helper (internal tool).
 * For Cursor / Grok / Fable to quickly check vis, 90day, review, scroll lock, labels.
 * Safe, non-site-JS. Uses --local playtest logic or can be extended for real CDP.
 *
 * Usage:
 *   node demigod-cdp-wiz-audit.mjs --local
 *   node demigod-cdp-wiz-audit.mjs --help
 *
 * Always run after WIZ changes (with verify:source).
 */

import { execSync } from 'child_process';
import fs from 'fs';

const args = process.argv.slice(2);
if (args.includes('--help') || args.length === 0) {
  console.log(`Demigod CDP WIZ audit
--local   run the wiz-cdp-playtest --local and parse key flags (vis, has90, review)
--cdp     (future) direct CDP checks via MCP or puppeteer
Outputs summary + exits 0 on basic pass, 1 on issues.
Ties to P0 WIZ vis + scroll from keep-going issues list.`);
  process.exit(0);
}

console.log('Demigod CDP WIZ audit (fresh ' + new Date().toISOString() + ')');

if (args.includes('--local')) {
  try {
    const out = execSync('node demigod-wiz-cdp-playtest.mjs --local 2>&1 | cat', { encoding: 'utf8', timeout: 180000 });
    // Lean, user-visible checks per Playwright best practices + YAGNI (bare min for P0s + labels).
    const has90 = /has90|90day/i.test(out) && !/has90.*false|vis=0.*90/i.test(out);
    const vis = !/vis=0|fields not visible/i.test(out);
    const review = /hasReview|review/i.test(out);
    const scroll = /scroll|lock|fixed|overflow.*hidden/i.test(out);
    const labels = /label|for=|aria|contact-email|90day/i.test(out);
    console.log('local playtest summary:');
    console.log('  vis likely good:', vis);
    console.log('  has90 detected:', has90);
    console.log('  review step:', review);
    console.log('  scroll/lock mentions:', scroll);
    console.log('  labels signal:', labels);
    console.log('Raw tail (last lines):');
    console.log(out.split('\n').slice(-10).join('\n'));
    const ok = vis && has90 && scroll;
    console.log(ok ? 'BASIC PASS (local, key P0s)' : 'ISSUES (see above + full log)');
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('playtest error', e.message);
    process.exit(1);
  }
}

console.log('For full CDP use chrome-devtools MCP or agent-dev CDP + evaluate.');
process.exit(0);
