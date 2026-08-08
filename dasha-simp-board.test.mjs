import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const board = JSON.parse(await readFile(new URL('./dasha-simp-board.json', import.meta.url), 'utf8'));
const landing = await readFile(new URL('./dasha-landing.html', import.meta.url), 'utf8');

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
for (const value of ['id="simp"', '#1', '@PerryALPHA', 'Founding simp', 'Transmission 001', 'make%20me%20an%20alibi.', 'Make me an alibi.', 'Answer →', 'Submit work ↗', 'Editorial.', 'No bought spots.', 'Contribute ↗']) assert(landing.includes(value), `landing missing ${value}`);
for (const stale of ['editorial, not a measured', 'only merged, reviewed', 'Points are recognition', 'A nomination is not entry', 'No X accounts are connected yet', 'balances will never be public']) assert(!landing.includes(stale), `verbose board copy returned: ${stale}`);
assert(!/Claim a seat|posting a claim|Real ranks start with real linked activity/i.test(landing), 'board promises an unavailable claim or scoring loop');
assert(!/href="\/simp/.test(landing), 'landing links an unpublished /simp route');
assert(!/<nav[^>]*>[\s\S]*?(?:Simp|Leaderboard)[\s\S]*?<\/nav>/.test(landing), 'Simp Board expanded the main nav');
assert(/x\.com\/intent\/post\?text=/.test(landing), 'claim path is not an X intent');
assert(/class="season-prompt" href="\/studio#look=signal&amp;format=story&amp;line=make%20me%20an%20alibi\."/.test(landing), 'Transmission does not make Studio participation primary');
assert(/Transmission%20001.+paste%20your%20editable%20Dasha%20link/.test(landing), 'X intent is not a bounded Transmission submission');
assert(!/your score|linked account|top holder|portfolio value|airdrop points/i.test(landing), 'board implies unavailable identity or financial rewards');
console.log('dasha simp board: opt-in automatic contract, Perry founding spot, and holder privacy checks passed');
