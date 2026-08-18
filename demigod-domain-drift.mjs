#!/usr/bin/env node
/**
 * demigod-domain-drift — which companies moved, which are gone, and which we merely could not read.
 *
 * WHAT THIS FOUND
 * 134 companies in the map are still listed on an `http://` website. Running the https upgrade pass
 * over them upgraded exactly one. The refusals were the finding: probing 16 of them by hand gave 8
 * that redirect to a *different domain* and 3 that do not answer at all.
 *
 * The eight are not broken links. They are rebrands and pivots — Survata answering at upwave.com,
 * Verge Genomics at vergelabs.com, PresenceLearning at presence.com, GoodData at gooddata.ai,
 * Hedgehog Foods at hedgehogmushrooms.com. A company still listed under an http domain is usually a
 * company that stopped maintaining that domain, and following the redirect says what happened next.
 * That is the same class of signal as a hiring change, arriving through a different door.
 *
 * THE DISTINCTION THAT MATTERS
 * `blocked` is not `dead`. Bitmovin, Brex, Dropbox, Minted and Wefunder all answer 403 or 429 to an
 * unattended fetch — they are among the healthiest companies in the map. A checker that folded those
 * into "gone" would publish that Brex is defunct. An absent observation is not an observation of
 * absence, so a refusal to serve us is recorded as a refusal to serve us and nothing more.
 *
 *   node demigod-domain-drift.mjs               # the http-only cohort
 *   node demigod-domain-drift.mjs --all         # every company with a website (slow, be sure)
 *   node demigod-domain-drift.mjs --limit 40
 *   node demigod-domain-drift.mjs --selftest
 *
 * Schema: demigod.domain-drift/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const OUT = path.join(ROOT, 'DEMIGOD-DOMAIN-DRIFT.json');
const CONCURRENCY = Math.max(1, Number(process.env.DEMIGOD_DRIFT_CONCURRENCY) || 8);
const TIMEOUT_MS = 9000;

/** Identify ourselves. An unattended fetch that hides what it is deserves the 403 it gets. */
const UA = 'DemigodDirectoryBot/1.0 (+https://trydemigod.com; directory link check)';

/**
 * Hosts that mean "this domain was sold", not "this company rebranded".
 *
 * The first run made this necessary: Autonet Mobile "moved" to kedai69vvip.com, CoMentis and GCA
 * both "moved" to hugedomains.com, Boundary to domaineasy.com. Those are a squatter, two for-sale
 * listings and a reseller. Recording them as rebrands would have the directory assert that a dead
 * startup is now a gambling site — the exact failure this codebase exists to avoid, arriving as a
 * redirect instead of a missing field.
 *
 * ponytail: a hostname allowlist, not classification. It catches the marketplaces that actually
 * appeared; a parked domain on a bespoke host still reads as `moved`. Upgrade path is checking the
 * landing page for sale language, and only if this list starts missing cases.
 */
export const PARKING_HOSTS = [
  'hugedomains.com', 'domaineasy.com', 'afternic.com', 'sedo.com', 'dan.com',
  'buydomains.com', 'undeveloped.com', 'domainmarket.com', 'namecheap.com', 'godaddy.com',
];

/**
 * A redirect to an encyclopedia is not a corporate address. Caustic Graphics "moved" to
 * en.wikipedia.org, which means it was acquired and someone pointed the domain at its article.
 */
export const REFERENCE_HOSTS = ['wikipedia.org', 'crunchbase.com', 'linkedin.com'];

/** PURE. Host identity the way the rest of the codebase compares it: no `www.`, lower case. */
export function hostKey(url) {
  try { return new URL(String(url)).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
}

/**
 * PURE. Turn one probe result into a verdict.
 *
 * The four outcomes are deliberately not three. Collapsing `blocked` into `dead` is the mistake this
 * function exists to make impossible, and collapsing `moved` into `live` throws away the signal.
 */
export function driftVerdict(website, probe) {
  const from = hostKey(website);
  if (!from) return { state: 'unusable', reason: 'unparseable website' };
  if (!probe || probe.ok !== true) return { state: 'unreachable', reason: probe?.reason || 'no answer' };
  if (probe.status === 401 || probe.status === 403 || probe.status === 429) {
    return { state: 'blocked', status: probe.status, reason: 'the site refused an unattended request — this is not evidence the company is gone' };
  }
  if (probe.status >= 500) return { state: 'unreachable', status: probe.status, reason: 'server error' };
  if (probe.status >= 400) return { state: 'unreachable', status: probe.status, reason: `http ${probe.status}` };
  const to = hostKey(probe.finalUrl);
  if (!to) return { state: 'unusable', reason: 'unparseable answer' };
  if (to === from) return { state: 'live', status: probe.status, host: to };
  const bare = to.split('.').slice(-2).join('.');
  if (PARKING_HOSTS.includes(to) || PARKING_HOSTS.includes(bare)) {
    return { state: 'expired', status: probe.status, from, to, reason: 'the domain is listed for sale — the company did not move here' };
  }
  if (REFERENCE_HOSTS.includes(bare)) {
    return { state: 'expired', status: probe.status, from, to, reason: 'the domain points at a reference page, not a company site' };
  }
  return { state: 'moved', status: probe.status, from, to };
}

/**
 * PURE. Rows that are the same company listed twice.
 *
 * An acquisition or a rebrand creates a duplicate by a predictable route: the old company keeps its
 * row under the old domain, someone later adds the acquirer under the new one, and nothing connects
 * them. The redirect is the connection. InsideView redirects to demandbase.com and Demandbase is
 * already its own row with 11 open roles; Survata redirects to upwave.com and Upwave is already a
 * row. So the directory counts two companies and attributes Survata's four roles to a name that no
 * longer exists.
 *
 * Never merged automatically. Merging identities moves role counts and hiring history between rows,
 * and a wrong merge is far more expensive than a duplicate — a redirect can also mean a landing page
 * a big company parked on a small acquisition's domain without the two being one employer.
 */
export function mergeCandidates(rows, companies) {
  const byHost = new Map();
  for (const company of companies || []) {
    const host = hostKey(company?.website);
    if (!host) continue;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(company);
  }
  const out = [];
  for (const row of rows || []) {
    if (row.state !== 'moved') continue;
    for (const target of byHost.get(row.to) || []) {
      if (target.id === row.id) continue;
      out.push({
        reason: 'redirects to a domain another row already occupies',
        from: { id: row.id, name: row.name, host: row.from, openRoles: target.openRoles === undefined ? null : (companies.find((c) => c.id === row.id)?.openRoles ?? null) },
        to: { id: target.id, name: target.name, host: row.to, openRoles: target.openRoles ?? null },
      });
    }
  }
  return out;
}

/** PURE. Company name reduced to what survives a rebrand of its suffix and punctuation. */
export function nameKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s*\((?:united states|usa|us)\)\s*$/, '')
    .replace(/\b(?:inc|llc|corp|ltd|co)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * PURE. Rows sharing a name, split into the ones that are probably one company and the ones that
 * are probably two.
 *
 * The discriminator is the website. Charge Robotics appears twice — once from YC with
 * chargerobotics.com and 15 open roles, once from its Ashby board with no website at all — and those
 * are one company whose hiring is split across two rows. Alex appears twice with alexcodes.app and
 * alex.com, which are two companies that picked the same word.
 *
 * ponytail: agreeing hosts, nothing cleverer. It under-detects by design — Reddit is listed under
 * both reddit.com and redditinc.com and reads as two companies here, because a rule loose enough to
 * merge those would also merge Atlas (atlascard.com) with Atlas (atlas.so). Under-detecting leaves a
 * duplicate; over-detecting fuses two real companies' hiring data, which is much worse to undo.
 */
export function nameDuplicates(companies) {
  const groups = new Map();
  for (const company of companies || []) {
    const key = nameKey(company?.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(company);
  }
  const same = [];
  const collisions = [];
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const hosts = [...new Set(rows.map((r) => hostKey(r.website)).filter(Boolean))];
    const entry = {
      name: rows[0].name,
      rows: rows.map((r) => ({ id: r.id, website: r.website || null, openRoles: r.openRoles ?? null })),
      hosts,
    };
    (hosts.length <= 1 ? same : collisions).push(entry);
  }
  return { same, collisions };
}

/** PURE. Counts by state, so the report leads with what was learned rather than a row dump. */
export function summarize(rows) {
  const by = {};
  for (const row of rows) by[row.state] = (by[row.state] || 0) + 1;
  return by;
}

async function probe(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { ok: true, status: res.status, finalUrl: res.url };
  } catch (err) {
    return { ok: false, reason: String(err?.message || err).slice(0, 60) };
  }
}

export function candidates({ all = false, limit = 0, mapPath = MAP } = {}) {
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const rows = (map.companies || []).filter((c) => c?.website
    && (all || /^http:\/\//i.test(c.website)));
  return limit > 0 ? rows.slice(0, limit) : rows;
}

export async function run(options = {}) {
  const list = candidates(options);
  const rows = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= list.length) return;
      const company = list[index];
      // Probe over https regardless: an http-only listing that answers on https is the common case,
      // and asking over http would only measure the redirect the site was always going to send.
      const target = company.website.replace(/^http:/i, 'https:');
      const verdict = driftVerdict(company.website, await probe(target));
      rows.push({ id: company.id, name: company.name, website: company.website, ...verdict });
    }
  }));
  rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const report = {
    schema: 'demigod.domain-drift/1',
    checked: rows.length,
    scope: options.all ? 'all companies with a website' : 'companies still listed on http',
    counts: summarize(rows),
    moved: rows.filter((r) => r.state === 'moved'),
    expired: rows.filter((r) => r.state === 'expired'),
    mergeCandidates: mergeCandidates(rows, JSON.parse(fs.readFileSync(options.mapPath || MAP, 'utf8')).companies || []),
    nameDuplicates: nameDuplicates(JSON.parse(fs.readFileSync(options.mapPath || MAP, 'utf8')).companies || []).same,
    rows,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 1)}\n`);
  return report;
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`domain-drift selftest: ${msg}`); };

  assert(hostKey('https://www.Acme.com/x') === 'acme.com', 'host identity ignores www and case');
  assert(hostKey('not a url') === null, 'junk has no host');

  const moved = driftVerdict('http://survata.com/', { ok: true, status: 200, finalUrl: 'https://upwave.com/' });
  assert(moved.state === 'moved' && moved.to === 'upwave.com', 'a redirect to another domain is a move');
  const live = driftVerdict('http://www.acme.com/', { ok: true, status: 200, finalUrl: 'https://acme.com/careers' });
  assert(live.state === 'live', 'www-stripping and a deeper path are still the same site');

  // The rule this file exists for: a refusal is never a death certificate.
  for (const status of [401, 403, 429]) {
    const v = driftVerdict('http://brex.com/', { ok: true, status, finalUrl: 'https://brex.com/' });
    assert(v.state === 'blocked', `http ${status} must be blocked, not dead`);
    assert(/not evidence/.test(v.reason), 'and must say so in the row itself');
  }
  assert(driftVerdict('http://x.com/', { ok: false, reason: 'fetch failed' }).state === 'unreachable', 'no answer is unreachable');
  assert(driftVerdict('http://x.com/', { ok: true, status: 503, finalUrl: 'https://x.com/' }).state === 'unreachable', 'a server error is not a move');
  assert(driftVerdict('http://x.com/', { ok: true, status: 404, finalUrl: 'https://x.com/' }).state === 'unreachable', 'a 404 is not live');
  assert(driftVerdict('garbage', {}).state === 'unusable', 'an unparseable website is its own state');

  // A blocked site must never be counted as moved just because the CDN answered elsewhere.
  const cdn = driftVerdict('http://acme.com/', { ok: true, status: 403, finalUrl: 'https://edge.cloudflare.com/' });
  assert(cdn.state === 'blocked', 'a refusal outranks the host comparison');

  // A sold domain is not a rebrand. This is what the first live run got wrong.
  const sold = driftVerdict('http://comentis.com/', { ok: true, status: 200, finalUrl: 'https://www.hugedomains.com/x' });
  assert(sold.state === 'expired', 'a for-sale listing is an expired domain, never a move');
  const squat = driftVerdict('http://gcasavvian.com/', { ok: true, status: 200, finalUrl: 'https://sedo.com/y' });
  assert(squat.state === 'expired', 'the whole marketplace list is covered');
  const wiki = driftVerdict('http://caustic.com/', { ok: true, status: 200, finalUrl: 'https://en.wikipedia.org/wiki/Caustic' });
  assert(wiki.state === 'expired' && /reference page/.test(wiki.reason), 'an encyclopedia article is not a corporate address');
  assert(driftVerdict('http://survata.com/', { ok: true, status: 200, finalUrl: 'https://upwave.com/' }).state === 'moved', 'a real rebrand still reads as moved');

  // A rebrand that lands on a domain we already list is one company counted twice.
  const companies = [{ id: 'a', name: 'Survata', website: 'http://survata.com' }, { id: 'b', name: 'Upwave', website: 'https://upwave.com', openRoles: 7 }];
  const cands = mergeCandidates([{ id: 'a', name: 'Survata', state: 'moved', from: 'survata.com', to: 'upwave.com' }], companies);
  assert(cands.length === 1 && cands[0].to.name === 'Upwave' && cands[0].to.openRoles === 7, 'a rebrand onto an existing row is a merge candidate');
  assert(mergeCandidates([{ id: 'a', state: 'moved', from: 'x.com', to: 'nobody.com' }], companies).length === 0, 'a move to a domain we do not list is not a duplicate');
  assert(mergeCandidates([{ id: 'a', state: 'expired', from: 'x.com', to: 'hugedomains.com' }], companies).length === 0, 'an expired domain is never a merge candidate');
  assert(mergeCandidates([{ id: 'b', name: 'Upwave', state: 'moved', from: 'upwave.com', to: 'upwave.com' }], companies).length === 0, 'a row never merges with itself');

  assert(nameKey('Harness Inc.') === nameKey('Harness'), 'a legal suffix is not a different company');
  assert(nameKey('PresenceLearning (United States)') === 'presencelearning', 'the geography disambiguator is stripped');
  assert(nameKey('') === '' && nameKey(null) === '', 'no name, no key');

  const dup = nameDuplicates([
    { id: 'yc:charge-robotics', name: 'Charge Robotics', website: 'https://chargerobotics.com', openRoles: 15 },
    { id: 'hn:ashby/charge-robotics', name: 'Charge Robotics' },
    { id: 'yc:alex', name: 'Alex', website: 'https://alexcodes.app' },
    { id: 'yc:alex-com', name: 'Alex', website: 'https://alex.com' },
    { id: 'yc:solo', name: 'Solo', website: 'https://solo.com' },
  ]);
  assert(dup.same.length === 1 && dup.same[0].name === 'Charge Robotics', 'one row with no website is the same company, not a second one');
  assert(dup.collisions.length === 1 && dup.collisions[0].name === 'Alex', 'two live sites sharing a name are two companies');
  assert(dup.same[0].rows.length === 2 && dup.same[0].rows.some((r) => r.openRoles === 15), 'the roles at stake are carried into the report');
  assert(!dup.same.concat(dup.collisions).some((g) => g.name === 'Solo'), 'a unique name is not a group');

  const counts = summarize([{ state: 'live' }, { state: 'moved' }, { state: 'moved' }]);
  assert(counts.moved === 2 && counts.live === 1, 'counts by state');

  assert(candidates({ limit: 3 }).length === 3, 'the limit is honoured so a dry run stays small');
  assert(candidates({}).every((c) => /^http:/i.test(c.website)), 'the default scope is the http cohort');

  console.log(JSON.stringify({ ok: true, selftest: 'domain-drift' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else {
    const limitAt = args.indexOf('--limit');
    const report = await run({ all: args.includes('--all'), limit: limitAt >= 0 ? Number(args[limitAt + 1]) : 0 });
    console.log(JSON.stringify({ schema: report.schema, checked: report.checked, scope: report.scope, counts: report.counts, moved: report.moved.length }, null, 2));
    for (const row of report.moved.slice(0, 30)) console.log(`  moved  ${row.from} -> ${row.to}   ${row.name}`);
    for (const row of report.rows.filter((r) => r.state === 'expired').slice(0, 15)) console.log(`  expired ${row.from} -> ${row.to}   ${row.name}`);
    for (const c of report.mergeCandidates) console.log(`  SAME?  "${c.from.name}" (${c.from.host}) is probably "${c.to.name}" (${c.to.host}, roles=${c.to.openRoles}) — review, never auto-merged`);
    for (const g of report.nameDuplicates) console.log(`  DUP?   "${g.name}" is ${g.rows.length} rows: ${g.rows.map((r) => `${r.id}[roles=${r.openRoles ?? '-'}]`).join(' + ')}`);
  }
}
