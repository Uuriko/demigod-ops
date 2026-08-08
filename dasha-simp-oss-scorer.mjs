import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DAY = 86_400_000;

export function scoreOss({ pulls, reviewsByNumber = {}, config }) {
  const rejected = [], awards = [], byLogin = new Map();
  if (config.status !== 'live' || !config.season.starts_at || !config.season.ends_at) return { awards, by_login: {}, rejected: pulls.map(pr => ({ pr: pr.number, reason: 'season-not-live' })) };
  const starts = Date.parse(config.season.starts_at), ends = Date.parse(config.season.ends_at);
  for (const pr of [...pulls].sort((a, b) => Date.parse(a.merged_at || 0) - Date.parse(b.merged_at || 0))) {
    const labels = (pr.labels || []).map(label => typeof label === 'string' ? label : label.name);
    const impacts = labels.filter(label => Object.hasOwn(config.impact_points, label));
    const author = pr.user?.login, merged = Date.parse(pr.merged_at);
    let reason = !pr.merged_at ? 'not-merged'
      : pr.draft ? 'draft'
      : !config.base_branches.includes(pr.base?.ref) ? 'base-not-allowed'
      : !Number.isFinite(merged) || merged < starts || merged >= ends ? 'outside-season'
      : !author || pr.user?.type === 'Bot' || /\[bot\]$/i.test(author) ? 'bot-or-missing-author'
      : config.operator_logins.some(login => login.toLowerCase() === author.toLowerCase()) ? 'operator'
      : labels.some(label => config.disqualifying_labels.includes(label)) ? 'disqualified-label'
      : impacts.length !== 1 ? 'needs-one-impact-label'
      : null;
    const approvals = new Set((reviewsByNumber[pr.number] || []).filter(review => review.state === 'APPROVED' && review.user?.type !== 'Bot' && review.user?.login?.toLowerCase() !== author?.toLowerCase()).map(review => review.user.login.toLowerCase()));
    if (!reason && approvals.size < config.required_approvals) reason = 'needs-human-approval';
    const state = byLogin.get(author) || { points: 0, merges: 0, mergedAt: [] };
    if (!reason && state.merges >= config.caps.merges_per_season) reason = 'season-merge-cap';
    if (!reason && state.mergedAt.filter(at => merged - at < 7 * DAY).length >= config.caps.merges_per_rolling_7_days) reason = 'rolling-merge-cap';
    if (reason) { rejected.push({ pr: pr.number, login: author || null, reason }); continue; }
    const available = config.caps.points_per_season - state.points;
    if (available <= 0) { rejected.push({ pr: pr.number, login: author, reason: 'season-point-cap' }); continue; }
    const points = Math.min(config.impact_points[impacts[0]], available);
    const award = { repo: pr.base.repo.full_name, pr: pr.number, login: author, points, impact: impacts[0], merged_at: pr.merged_at, evidence_url: pr.html_url };
    awards.push(award);
    state.points += points; state.merges += 1; state.mergedAt.push(merged); byLogin.set(author, state);
  }
  return { awards, by_login: Object.fromEntries([...byLogin].map(([login, state]) => [login, { points: state.points, merges: state.merges }])), rejected };
}

async function github(path) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${path}`);
  return response.json();
}

async function main() {
  const board = JSON.parse(await readFile(new URL('./dasha-simp-board.json', import.meta.url), 'utf8'));
  const config = board.oss_points, pulls = [], reviewsByNumber = {};
  for (const fullName of config.repos) {
    const repoPulls = await github(`/repos/${fullName}/pulls?state=closed&per_page=100`);
    pulls.push(...repoPulls);
    for (const pr of repoPulls.filter(pr => pr.merged_at)) reviewsByNumber[pr.number] = await github(`/repos/${fullName}/pulls/${pr.number}/reviews?per_page=100`);
  }
  console.log(JSON.stringify({ schema: config.schema, season_id: config.season.id, status: config.status, generated_at: new Date().toISOString(), ...scoreOss({ pulls, reviewsByNumber, config }) }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
