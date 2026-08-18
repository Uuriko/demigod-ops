#!/usr/bin/env node
/**
 * demigod-board-retention — a board we proved once must not be quietly un-proved.
 *
 * WHY THIS EXISTS
 * demigod-board-discover.mjs finds boards whose slug the company's domain cannot produce — that is
 * its entire purpose, because demigod-startup-jobs-enrich.mjs derives candidates from the domain
 * and therefore finds only the boards that were named after one. Pave's Greenhouse board is
 * `paveakatroveinformationtechnologies`. Accord's careers page is at `/company/about#careers`.
 *
 * On 2026-08-18 those two tools were deleting each other's work: every discovery pass attached
 * boards, and the next enrich re-derived from the domain, failed, and stripped exactly the ones
 * discovery had just found. 4 of 24 in a single run. Nobody noticed for three passes because each
 * one still reported finding "a few more" — the pool was being refilled by the previous run's
 * deletions.
 *
 * No unit test could see it. Both tools were individually correct; the loss lived in the handoff.
 * So this checks the invariant across the pipeline instead:
 *
 *   a row that carries boardEvidence still carries a board, or the reason is recorded.
 *
 * A row may legitimately lose its board — the company takes it down, or every posting is foreign
 * and this directory counts US-posted roles (Accord, three jobs, all Toronto). Those show up as a
 * failed or empty read, which is a recorded reason. What must never happen is a board disappearing
 * while the row still claims discovery proved it.
 *
 *   node demigod-board-retention.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');

/**
 * PURE. Classify one discovered row against the map as it stands now.
 *
 * `kept` — the board is still attached.
 * `explained` — the board is gone AND the row records a read that failed or found nothing, which is
 *   the honest outcome for a board that was taken down or has no US-posted roles.
 * `lost` — the board is gone with no such record. This is the regression.
 */
export function retentionOf(row) {
  if (!row) return { state: 'lost', why: 'row missing from the map entirely' };
  if (row.atsSource && row.jobsUrl) return { state: 'kept' };
  const attempt = String(row.lastAttempt || '');
  if (attempt && attempt !== 'missing') return { state: 'explained', why: `read outcome: ${attempt}` };
  if (Number.isSafeInteger(row.openRoles)) return { state: 'explained', why: 'counted, board not retained' };
  return { state: 'lost', why: 'board gone with no recorded read' };
}

/**
 * The set to audit is every row that CARRIES discovery evidence, not the last discovery report.
 *
 * DEMIGOD-BOARD-DISCOVERY.json is overwritten by each pass, so auditing it only ever asks about the
 * most recent run — which is exactly the blind spot that let this bug survive three passes. A row's
 * boardEvidence persists, so it remembers every board discovery ever proved, including the ones a
 * later enrich went on to strip.
 */
export function audit({ map }) {
  const rows = (map.companies || [])
    .filter((c) => c && c.boardEvidence)
    .map((c) => ({ id: c.id, name: c.name, provider: c.atsSource, ...retentionOf(c) }));
  return {
    discovered: rows.length,
    kept: rows.filter((r) => r.state === 'kept').length,
    explained: rows.filter((r) => r.state === 'explained'),
    lost: rows.filter((r) => r.state === 'lost'),
  };
}

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

// --- the classifier must be able to say "lost", or a green run means nothing ---
check(retentionOf({ atsSource: 'Ashby', jobsUrl: 'https://jobs.ashbyhq.com/x' }).state === 'kept',
  'an attached board reads as kept');
check(retentionOf({ lastAttempt: 'error' }).state === 'explained',
  'a failed read explains a missing board');
check(retentionOf({ lastAttempt: 'ok', openRoles: 0 }).state === 'explained',
  'a successful read that found nothing explains it too');
check(retentionOf({ lastAttempt: 'missing' }).state === 'lost',
  'a board that vanished with no read is the regression this file exists for');
check(retentionOf(null).state === 'lost', 'a row deleted outright is lost, not silently fine');
check(retentionOf({}).state === 'lost', 'an empty row is not a pass');

// --- and the same rule against the live artifacts ---
if (fs.existsSync(MAP)) {
  const report = audit({ map: JSON.parse(fs.readFileSync(MAP, 'utf8')) });
  console.log(`  discovered ${report.discovered} · kept ${report.kept} · explained ${report.explained.length} · lost ${report.lost.length}`);
  for (const r of report.explained) console.log(`    explained  ${String(r.name).slice(0, 22).padEnd(23)} ${r.why}`);
  for (const r of report.lost) console.log(`    LOST       ${String(r.name).slice(0, 22).padEnd(23)} ${r.why}`);
  check(report.lost.length === 0,
    `${report.lost.length} discovered board(s) were stripped with no recorded read — the enrich is deleting discovery's work again`);
} else {
  console.log('  (no live artifacts to audit; classifier checks only)');
}

if (failures.length) {
  console.error(`demigod board retention: ${failures.length} FAILURE(S)\n`);
  for (const f of failures) console.error('  · ' + f);
  process.exit(1);
}
console.log('demigod board retention: PASS (a proved board stays proved, or says why not)');
