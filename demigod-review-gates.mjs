#!/usr/bin/env node
/**
 * demigod-review-gates — targeted verify based on which files changed
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
  if (has(/agent-dashboard|user-test|review/)) {
    gates.push({
      id: 'usertest-dash',
      cmd: 'npm run demigod:usertest:dash -- --quick',
      why: 'dashboard / review / usertest surface',
    });
  }
  if (has(/review/)) {
    gates.push({
      id: 'review-selftest',
      cmd: 'node demigod-review-selftest.mjs',
      why: 'review tooling itself',
    });
  }
  return gates;
}

/**
 * Run gates (subset or all suggested).
 * @returns {{ id: string, ok: boolean, detail: string, ms: number }[]}
 */
export function runGates(files, { only = null, timeout = 120000 } = {}) {
  let list = suggestGates(files);
  if (only?.length) list = list.filter((g) => only.includes(g.id));
  // always safe minimum when empty and --gates
  if (!list.length) {
    list = [
      { id: 'board-honesty', cmd: 'node demigod-verify-board-honesty.mjs', why: 'default' },
    ];
  }
  const results = [];
  for (const g of list) {
    const t0 = Date.now();
    const r = sh(g.cmd, { timeout });
    results.push({
      id: g.id,
      ok: r.status === 0 || /OK|PASS|ALL PASS/i.test(r.out),
      detail: r.out.slice(-240),
      ms: Date.now() - t0,
      cmd: g.cmd,
      why: g.why,
    });
  }
  return results;
}
