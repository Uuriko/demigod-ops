#!/usr/bin/env node
/**
 * demigod-review-gates — targeted verify based on which files changed
 * Gate success = exit status 0 ONLY (never trust OK/PASS strings in output).
 */
import { sh } from './demigod-review-lib.mjs';

/**
 * @param {string[]} files
 * @returns {{ id: string, cmd: string, why: string }[]}
 */
export function suggestGates(files) {
  const set = new Set(files.map((f) => f.replace(/\\/g, '/')));
  const has = (re) => [...set].some((f) => re.test(f));
  const gates = [];

  if (has(/foot-core|footer-lite|head-minimal|head-styles/)) {
    gates.push({
      id: 'verify-source',
      cmd: 'npm run demigod:verify:source',
      why: 'foot/head/footer sources changed',
    });
  }
  if (has(/submissions-lib|board-lib|BOARD|board-/)) {
    gates.push({
      id: 'board-honesty',
      cmd: 'node demigod-verify-board-honesty.mjs',
      why: 'board path touched',
    });
  }
  if (has(/pairs|match-review|intro-draft|auto-propose|sprint-selftest/)) {
    gates.push({
      id: 'sprint-selftest',
      cmd: 'node demigod-sprint-selftest.mjs',
      why: 'matching/pair lifecycle tools',
    });
  }
  if (has(/agent-dashboard|user-test/) && !has(/demigod-review/)) {
    gates.push({
      id: 'usertest-dash',
      cmd: 'npm run demigod:usertest:dash -- --quick',
      why: 'dashboard / usertest surface',
    });
  }
  if (has(/demigod-review|bin\/dg-review/)) {
    gates.push({
      id: 'review-selftest',
      cmd: 'node demigod-review-selftest.mjs',
      why: 'review tooling itself',
    });
  }
  return gates;
}

/**
 * Run gates. Success requires status === 0 (strict).
 * Override only with DEMIGOD_GATE_ALLOW_OUTPUT_PASS=1 (legacy, discouraged).
 * @returns {{ id: string, ok: boolean, detail: string, ms: number, status: number }[]}
 */
export function runGates(files, { only = null, timeout = 120000 } = {}) {
  let list = suggestGates(files);
  if (only?.length) list = list.filter((g) => only.includes(g.id));
  if (!list.length) {
    list = [
      { id: 'board-honesty', cmd: 'node demigod-verify-board-honesty.mjs', why: 'default' },
    ];
  }
  const allowOutputPass = process.env.DEMIGOD_GATE_ALLOW_OUTPUT_PASS === '1';
  const results = [];
  for (const g of list) {
    const t0 = Date.now();
    const r = sh(g.cmd, { timeout });
    const statusOk = r.status === 0;
    const outputOk = allowOutputPass && /(?:^|\n|\s)(OK|PASS|ALL PASS)\b/i.test(r.out);
    results.push({
      id: g.id,
      ok: statusOk || outputOk,
      status: r.status,
      detail: r.out.slice(-240),
      ms: Date.now() - t0,
      cmd: g.cmd,
      why: g.why,
      strict: !allowOutputPass,
    });
  }
  return results;
}
