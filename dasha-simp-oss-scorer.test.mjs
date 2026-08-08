import assert from 'node:assert/strict';
import { scoreOss } from './dasha-simp-oss-scorer.mjs';

const config = {
  status: 'live', season: { starts_at: '2026-08-01T00:00:00Z', ends_at: '2026-09-01T00:00:00Z' },
  base_branches: ['main'], operator_logins: ['Uuriko'], required_approvals: 1,
  impact_points: { 'impact:tiny': 5, 'impact:small': 15, 'impact:medium': 40, 'impact:large': 100, 'impact:critical': 200 },
  caps: { points_per_season: 300, merges_per_season: 8, merges_per_rolling_7_days: 3 },
  disqualifying_labels: ['simp:no-score', 'spam'],
};
const pr = (number, login, impact = 'impact:small', extra = {}) => ({ number, merged_at: `2026-08-${String(number).padStart(2, '0')}T12:00:00Z`, draft: false, user: { login, type: 'User' }, labels: [{ name: impact }], base: { ref: 'main', repo: { full_name: 'Uuriko/dasha-desk' } }, html_url: `https://github.com/Uuriko/dasha-desk/pull/${number}`, ...extra });
const approval = login => [{ state: 'APPROVED', user: { login, type: 'User' } }];
const pulls = [
  pr(1, 'alice', 'impact:small'),
  pr(2, 'Uuriko', 'impact:critical'),
  pr(3, 'bob', 'impact:large'),
  pr(4, 'carol', 'impact:small', { labels: [{ name: 'impact:small' }, { name: 'impact:medium' }] }),
  pr(5, 'dependabot[bot]', 'impact:small', { user: { login: 'dependabot[bot]', type: 'Bot' } }),
  pr(6, 'dave', 'impact:small', { merged_at: null }),
];
const result = scoreOss({ pulls, reviewsByNumber: { 1: approval('reviewer'), 2: approval('reviewer'), 3: approval('bob'), 4: approval('reviewer'), 5: approval('reviewer') }, config });
assert.deepEqual(result.awards.map(({ login, points }) => [login, points]), [['alice', 15]]);
assert.deepEqual(Object.fromEntries(result.rejected.map(item => [item.pr, item.reason])), { 2: 'operator', 3: 'needs-human-approval', 4: 'needs-one-impact-label', 5: 'bot-or-missing-author', 6: 'not-merged' });

const capped = scoreOss({ pulls: [pr(7, 'eve', 'impact:critical'), pr(8, 'eve', 'impact:critical')], reviewsByNumber: { 7: approval('r1'), 8: approval('r2') }, config });
assert.deepEqual(capped.awards.map(({ points }) => points), [200, 100]);
assert.equal(capped.by_login.eve.points, 300);
console.log('dasha OSS Simp Points: merge, impact, approval, operator, bot, label, and cap rules passed');
