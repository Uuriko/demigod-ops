import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const board = JSON.parse(await readFile(new URL('./dasha-simp-board.json', import.meta.url), 'utf8'));
const landing = await readFile(new URL('./dasha-landing.html', import.meta.url), 'utf8');
const client = await readFile(new URL('./dasha-simp-board-client.js', import.meta.url), 'utf8');

assert.equal(board.schema, 'dasha-simp-board/v1');
assert.equal(board.mode, 'opt-in');
assert.equal(board.enrollment, 'explicit-x-oauth');
assert.equal(board.manual_evidence_submission, false);
assert.equal(board.lanes.oss.schema, 'dasha-simp-oss/v0');
assert.equal(board.lanes.oss.status, 'prepared');
assert.equal(board.lanes.oss.season.starts_at, null);
assert.equal(board.lanes.oss.season.ends_at, null);
assert.equal(board.lanes.oss.operator_logins.includes('Uuriko'), true);
assert.equal(board.season, null, 'retired Season Zero returned');
assert.deepEqual(board.entries.map(({ position, handle }) => [position, handle]), [[1, 'PerryALPHA']]);
for (const entry of board.entries) {
  assert.equal(entry.points, null, 'editorial entry invented points');
  assert.equal(entry.linked, false, 'editorial entry claims an unverified X link');
  assert.equal(entry.holder, null, 'editorial entry claims unverified holder status');
  assert.ok(entry.evidence_urls.every(url => /^https:\/\/x\.com\//.test(url)), 'editorial evidence is not public X evidence');
}
assert(!('nomination' in board.rules), 'manual nomination contract returned');
assert.match(board.rules.automatic_only, /never submit evidence URLs/i);
assert(!/"(?:balance|amount|usd_value|pct_supply)"\s*:/.test(JSON.stringify(board)), 'board stores a financial ranking field');
for (const value of ['id="simp-door"', 'Simp board.', 'href="/simp"']) assert(landing.includes(value), `landing missing ${value}`);
assert(!landing.includes('id="dasha-simp-board"') && !landing.includes('/client/simp-board.js'), 'Home embeds the first-class Simp Board instead of linking to it');
/* The contribution link is checked by meaning, not by its exact label. It used to be pinned as
   the literal 'Contribute ↗', which broke when the wording was qualified to 'Contribute to open
   source' — a bare "Contribute" on a page with a Buy button in the same nav reads as a request
   for money. What matters here is that the homepage still offers the path and still points at
   the public repo; dasha-landing.test.mjs owns its placement and prominence. */
assert.match(landing, /Contribute[^<]*↗/, 'landing lost its contribution link');
assert.match(landing, /Contribute[^<]*(open source|code|GitHub)[^<]*↗/i,
  'the homepage contribution label must say what is being contributed, or it reads as asking for money');
for (const removed of ['Transmission 001', 'Make me an alibi.', 'Answer →']) assert(!landing.includes(removed), `removed Board preamble returned: ${removed}`);
for (const value of ['@PerryALPHA']) assert(client.includes(value), `board client missing ${value}`);
/* 2026-08-16: the client was reconstructed from the live asset (lobby.getdasha.com/client/simp-board.js),
   which dropped the old 'Founding simp · editorial' badge — the live board has no such label, so the
   test must not pin it. The editorial row itself survives (rank 1 fallback, @PerryALPHA). */
for (const stale of ['editorial, not a measured', 'only merged, reviewed', 'Points are recognition', 'A nomination is not entry', 'No X accounts are connected yet', 'balances will never be public']) assert(!landing.includes(stale), `verbose board copy returned: ${stale}`);
assert(!/Claim a seat|posting a claim|Real ranks start with real linked activity/i.test(landing), 'board promises an unavailable claim or scoring loop');
assert(!/<nav[^>]*>[\s\S]*?(?:Simp|Leaderboard)[\s\S]*?<\/nav>/.test(landing), 'Simp Board expanded the main nav');
assert(/x\.com\/intent\/post\?text=/.test(client), 'share path is not an X intent');
assert(/<h2[^>]*id="simp-title"[^>]*>Simp board\.<\/h2><p class="door-line">[^<]+<\/p><\/div>\s*<a[^>]*href="\/simp"/.test(landing), 'Simp Board door must follow its heading without campaign chrome');
assert(!/top holder|portfolio value|airdrop points/i.test(landing + client), 'board implies financial rewards');
console.log('dasha simp board: opt-in automatic contract, editorial Perry row, and holder privacy checks passed');
