#!/usr/bin/env node
/**
 * demigod-origin-mirror — verify the Origin mirrors still match GitHub.
 *
 * WHAT CHANGED
 * This was written to create repos and push them. It never needed to: claiming the Origin namespace
 * mirrored all 14 GitHub repos automatically, in eleven seconds, before a single command ran. What
 * is actually useful is the opposite job — checking that the mirrors have not drifted.
 *
 * WHY IT CANNOT PUSH
 * The mirrors are `inbound`: GitHub is the source and Origin pulls, measured at under ten seconds
 * from push to appearance. Writing to both ends of a mirror is how mirroring breaks — the general
 * practice warns of race conditions and of rewrites making sync fail — so the rule is: push to
 * GitHub, let Origin follow. The local `cursor` remote has its push URL deliberately set to a
 * non-repository string so an accidental `git push cursor` fails with a message saying so, while
 * fetch keeps working for exactly this verification.
 *
 *   node demigod-origin-mirror.mjs            # verify every repo against GitHub
 *   node demigod-origin-mirror.mjs --json
 *
 * Schema: demigod.origin-mirror/1
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** The Origin remote is named `cursor`, never `origin` — that name belongs to GitHub here. */
export const ORIGIN_REMOTE = 'cursor';
export const ORIGIN_HOST = 'https://origin.cursor.com';

/**
 * The repos worth a second home, and the one fact about each that decides how it is treated.
 *
 * demigod-ops-23 is deliberately absent: it is a stale checkout of demigod-ops, not a repo, and
 * mirroring a mirror creates a third thing to keep in sync.
 */
export const NAMESPACE = process.env.CURSOR_ORIGIN_NAMESPACE || 'johnpotter';
export const GITHUB_OWNER = 'Uuriko';

/** Every repo mirrored on Origin. Forks included, because the question is drift, not worth. */
export const REPOS = [
  'asi', 'crispy-garbanzo', 'dasha-desk', 'dasha-utility', 'dasha-utility-full',
  'demigod-ops', 'demigod-site-cdn', 'eat-the-sounds', 'eliza', 'firsttimersonly',
  'oracle-hole', 'Projects', 'social-media-wg-secrets', 'Uuriko',
];

/**
 * demigod-site-cdn keeps GitHub as its home whatever Origin does: jsDelivr's /gh/ endpoint serves
 * the live foot and head CSS from it, pinned by commit, and the publish path triggers a GitHub
 * Actions workflow. Mirroring is additive and changes none of that.
 */
export const DELIVERY_PATH_REPO = 'demigod-site-cdn';

function git(dir, args) {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  return { ok: result.status === 0, out: (result.stdout || '').trim(), err: (result.stderr || '').trim() };
}

/** PURE. Whether a namespace looks usable as an Origin owner segment. */
export function validNamespace(value) {
  return /^[a-z0-9][a-z0-9-]{0,38}$/.test(String(value || ''));
}

/** PURE. The remote URL for a repo, so the format is in one place and testable. */
export function originUrl(namespace, repo, { host = ORIGIN_HOST } = {}) {
  if (!validNamespace(namespace)) throw new Error(`origin-mirror: unusable namespace ${JSON.stringify(namespace)}`);
  if (!validNamespace(repo)) throw new Error(`origin-mirror: unusable repo name ${JSON.stringify(repo)}`);
  return `${host}/${namespace}/${repo}.git`;
}

/** PURE. The two URLs a repo should be reachable at. */
export function repoUrls(repo, { namespace = NAMESPACE, owner = GITHUB_OWNER } = {}) {
  if (!validNamespace(namespace)) throw new Error(`origin-mirror: unusable namespace ${JSON.stringify(namespace)}`);
  return {
    origin: `${ORIGIN_HOST}/${namespace}/${repo}.git`,
    github: `https://github.com/${owner}/${repo}.git`,
  };
}

function refsOf(url) {
  const result = spawnSync('git', ['ls-remote', url], { encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) return null;
  return (result.stdout || '').trim().split('\n').filter(Boolean).sort();
}

/** PURE. Compare two ref listings and say precisely how they differ. */
export function compareRefs(originRefs, githubRefs) {
  if (originRefs === null || githubRefs === null) {
    return { ok: null, reason: originRefs === null ? 'origin unreachable' : 'github unreachable' };
  }
  const o = new Set(originRefs);
  const g = new Set(githubRefs);
  const onlyOrigin = originRefs.filter((ref) => !g.has(ref));
  const onlyGithub = githubRefs.filter((ref) => !o.has(ref));
  return {
    ok: onlyOrigin.length === 0 && onlyGithub.length === 0,
    originRefs: originRefs.length,
    githubRefs: githubRefs.length,
    onlyOrigin: onlyOrigin.slice(0, 3),
    onlyGithub: onlyGithub.slice(0, 3),
  };
}

export function verifyAll({ repos = REPOS, namespace = NAMESPACE } = {}) {
  const rows = repos.map((repo) => {
    const urls = repoUrls(repo, { namespace });
    const result = compareRefs(refsOf(urls.origin), refsOf(urls.github));
    return { repo, ...result, deliveryPath: repo === DELIVERY_PATH_REPO || undefined };
  });
  return {
    schema: 'demigod.origin-mirror/1',
    namespace,
    checked: rows.length,
    identical: rows.filter((row) => row.ok === true).length,
    drifted: rows.filter((row) => row.ok === false),
    unreachable: rows.filter((row) => row.ok === null).map((row) => ({ repo: row.repo, reason: row.reason })),
    rows,
  };
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`origin-mirror selftest: ${msg}`); };
  assert(repoUrls('checkout', { namespace: 'acme' }).origin === 'https://origin.cursor.com/acme/checkout.git', 'documented URL shape');
  assert(validNamespace('uuriko') && !validNamespace('Uuriko'), 'namespaces are lower case');
  assert(!validNamespace('') && !validNamespace('has space') && !validNamespace('-leading'), 'obvious junk is refused');
  for (const bad of ['../evil', 'a/b', '']) {
    let threw = false;
    try { repoUrls('x', { namespace: bad }); } catch { threw = true; }
    assert(threw, `a namespace of ${JSON.stringify(bad)} must not reach a git remote`);
  }
  assert(REPOS.includes('demigod-ops') && REPOS.length === 14, `expected all 14 mirrored repos, got ${REPOS.length}`);
  assert(DELIVERY_PATH_REPO === 'demigod-site-cdn', 'the repo jsDelivr serves must stay named, or someone tidies up its GitHub remote');
  assert(ORIGIN_REMOTE !== 'origin', 'the Origin remote must not take the name GitHub already uses here');
  assert(repoUrls('demigod-ops').github === 'https://github.com/Uuriko/demigod-ops.git', 'github url shape');

  // Drift detection has to be able to say drift, or a green run means nothing.
  const same = compareRefs(['a\trefs/heads/main'], ['a\trefs/heads/main']);
  assert(same.ok === true, 'identical listings compare equal');
  const moved = compareRefs(['b\trefs/heads/main'], ['a\trefs/heads/main']);
  assert(moved.ok === false && moved.onlyOrigin.length === 1 && moved.onlyGithub.length === 1, 'a moved ref is drift on both sides');
  const extra = compareRefs(['a\trefs/heads/main', 'c\trefs/heads/x'], ['a\trefs/heads/main']);
  assert(extra.ok === false && extra.onlyOrigin.length === 1, 'a ref only on Origin is drift');
  assert(compareRefs(null, ['a']).ok === null, 'unreachable is not a verdict');
  assert(compareRefs(['a'], null).ok === null, 'and neither is the other direction');
  console.log(JSON.stringify({ ok: true, selftest: 'origin-mirror' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
  } else {
    const report = verifyAll();
    if (args.includes('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`origin-mirror · ${report.identical}/${report.checked} identical to GitHub (namespace ${report.namespace})`);
      for (const row of report.rows) {
        const state = row.ok === true ? 'identical' : row.ok === false ? 'DRIFTED' : row.reason;
        console.log(`  ${String(row.originRefs ?? '?').padStart(5)} refs  ${String(row.repo).padEnd(24)} ${state}`);
      }
      if (report.drifted.length) console.log('  push to GitHub and let the mirror follow — never push to the Origin remote');
    }
    process.exit(report.drifted.length ? 1 : 0);
  }
}
