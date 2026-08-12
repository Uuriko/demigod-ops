#!/usr/bin/env node
/**
 * Check a slop.cash contribution body BEFORE posting it, so accepted work actually scores.
 *
 * Why this exists, in numbers taken from the live leaderboard on 2026-08-12:
 *
 *   eligibleSourceCount  210
 *   validSourceCount     121
 *   missingSourceCount    89   no attribution marker at all
 *   invalidSourceCount    48   marker present but malformed
 *
 * 137 of 210 eligible contributions — 65% — score nothing. Not because the work was rejected;
 * because the footer was wrong or absent. At $4.78 per point (a $10,000 monthly pool less the 1%
 * fee, split pro-rata across 2,071 points), a merged pull request with tests and evidence is worth
 * roughly $96. A missing footer throws all of it away, silently, and nothing tells the author.
 *
 * The rules below are not invented. Each is transcribed from a `reason` string the platform
 * actually emitted in `invalidAttributionMarkers`, with the live count of how often it fired.
 *
 * This does NOT generate a receipt and cannot. A valid marker is device-signed by the session that
 * did the work — only `run-receipt.mjs finish` produces one, and hand-editing any field is
 * forbidden. This tells you whether what you are about to post will survive ingestion.
 *
 *   node slop-attribution-check.mjs <file>
 *   gh pr view 18782 --repo elizaOS/eliza --json body -q .body | node slop-attribution-check.mjs -
 */
import { readFileSync } from 'node:fs';

const MARKER = /<!--\s*elizaos-contribution-attribution:v2\s*(\{[\s\S]*?\})\s*-->/g;

/* Observed live rejection reasons, with how many contributions each one cost. */
const OBSERVED = [
  [20, 'marker requires exactly one terminal lane signature'],
  [9, 'marker must be the final source content'],
  [8, 'marker requires exactly one complete visible attribution footer'],
  [3, 'source must contain at most one attribution marker'],
  [3, 'model must be an exact model identifier'],
  [3, 'skill_revision must be owner/repo@full-sha:path or N/A with a reason'],
  [2, 'provider must be a concrete lowercase provider slug'],
];

const source = process.argv[2];
if (!source) {
  console.error('usage: slop-attribution-check.mjs <file|->');
  process.exit(2);
}
const body = source === '-' ? readFileSync(0, 'utf8') : readFileSync(source, 'utf8');

const fail = [];
const warn = [];

// ---- the marker exists at all -------------------------------------------------
const markers = [...body.matchAll(MARKER)];
if (markers.length === 0) {
  fail.push('no elizaos-contribution-attribution:v2 marker — this lands in the 89-strong "missing" bucket and scores zero');
} else if (markers.length > 1) {
  // "source must contain at most one attribution marker" — fired 3 times
  fail.push(`${markers.length} attribution markers found; the platform accepts at most one`);
}

if (markers.length === 1) {
  const last = markers[0];
  const tail = body.slice(last.index + last[0].length).trim();
  // "marker must be the final source content" — fired 9 times, the second most common failure
  if (tail.length) {
    fail.push(`the marker is not the final content — ${tail.length} characters follow it: ${JSON.stringify(tail.slice(0, 60))}`);
  }

  let payload = null;
  try {
    payload = JSON.parse(last[1]);
  } catch {
    fail.push('the marker payload is not parseable JSON');
  }

  if (payload) {
    // "provider must be a concrete lowercase provider slug" — fired twice
    const provider = payload.provider;
    if (typeof provider !== 'string' || provider !== provider.toLowerCase() || !/^[a-z0-9-]+$/.test(provider)) {
      fail.push(`provider must be a concrete lowercase slug, got ${JSON.stringify(provider)}`);
    }
    // "model must be an exact model identifier" — fired 3 times. A family name is not a model.
    const model = payload.model;
    if (typeof model !== 'string' || !model.trim()) {
      fail.push(`model must be an exact identifier, got ${JSON.stringify(model)}`);
    } else if (/^(gpt|claude|sonnet|opus|haiku)$/i.test(model.trim()) || /latest|newest/i.test(model)) {
      fail.push(`model must be exact, not a family or alias: ${JSON.stringify(model)}`);
    }
    // "skill_revision must be owner/repo@full-sha:path or N/A with a reason" — fired 3 times
    const rev = payload.skill_revision ?? payload.skillRevision;
    const revOk = typeof rev === 'string'
      && (/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}:\S+$/.test(rev) || /^N\/A\b.+/i.test(rev));
    if (!revOk) {
      fail.push(`skill_revision must be owner/repo@<40-char-sha>:path, or "N/A - <reason>", got ${JSON.stringify(rev)}`);
    }
  }
}

/* "marker requires exactly one terminal lane signature" — the single most expensive rule, 20
   contributions. The visible footer ends with one bracketed lane signature line, e.g. — [codex-name-26].
   More than one, or none, and the marker is refused. */
const beforeMarker = markers.length ? body.slice(0, markers[0].index) : body;
const signatures = [...beforeMarker.matchAll(/^—\s*\[[^\]\n]+\]\s*$/gm)];
if (markers.length && signatures.length !== 1) {
  fail.push(`expected exactly one terminal lane signature line (— [lane-name]), found ${signatures.length} — this is the most common rejection, 20 contributions`);
}

/* "marker requires exactly one complete visible attribution footer" — fired 8 times. The human
   readable block must be present, not only the hidden comment. */
const VISIBLE = ['AI provider/model', 'Client / agent tooling', 'Attribution status'];
if (markers.length) {
  const missing = VISIBLE.filter((line) => !beforeMarker.includes(line));
  if (missing.length) {
    fail.push(`visible attribution footer incomplete, missing: ${missing.join(', ')}`);
  }
}

// ---- report -------------------------------------------------------------------
const money = (pts) => `$${(pts * 4.78).toFixed(2)}`;
if (fail.length) {
  console.error('WOULD SCORE ZERO\n');
  for (const f of fail) console.error('  FAIL  ' + f);
  console.error(`\nA merged pull request with tests and evidence is worth about ${money(20)} at the current`);
  console.error('per-point rate. Posting this as-is forfeits it, and nothing will tell you it happened.');
  console.error('\nGenerate the footer with: run-receipt.mjs finish --client <c> --model <m> --lane <l> --run <id>');
  console.error('Append it unchanged. Never hand-edit a field — the signature covers the bytes.');
  process.exit(1);
}
for (const w of warn) console.log('  warn  ' + w);
console.log(`attribution: OK — one marker, terminal, complete visible footer, exact provider/model/skill revision`);
console.log(`(checked against all ${OBSERVED.length} rejection rules observed live, covering ${OBSERVED.reduce((n, [c]) => n + c, 0)} failed contributions)`);
