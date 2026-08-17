#!/usr/bin/env node
/**
 * demigod-origin-mirror — mirror the GitHub repos to Cursor's Origin, additively.
 *
 * WHY ADDITIVE
 * GitHub is not just where this code lives, it is part of how the product is delivered:
 * `cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@<sha>/foot-latest.js` serves the foot on every page,
 * and jsDelivr's /gh/ endpoint reads GitHub only. The CDN publish path also triggers a GitHub
 * Actions workflow. So Origin is a second home, never a move, and nothing here changes `origin`
 * (the GitHub remote) or touches the delivery path.
 *
 * WHY NOT `git push --mirror`
 * --mirror deletes remote refs that are absent locally and rewrites the remote to match this disk
 * exactly. Against a fresh repo that is harmless; run twice, or from a tree that has fallen behind,
 * and it removes work. This pushes `--all --tags` instead: additive, and a diverged branch fails
 * loudly rather than being erased.
 *
 *   node demigod-origin-mirror.mjs            # dry run: preconditions + what would happen
 *   node demigod-origin-mirror.mjs --push     # actually create and push
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
export const REPOS = [
  {
    dir: '.',
    name: 'demigod-ops',
    private: true,
    note: 'the operations repo — private on GitHub, so private on Origin or not at all',
  },
  {
    dir: 'demigod-site-cdn',
    name: 'demigod-site-cdn',
    private: false,
    note: 'MUST stay on GitHub: jsDelivr /gh/ serves the live foot and head CSS from it, pinned by commit',
  },
  {
    dir: 'dasha-desk',
    name: 'dasha-desk',
    private: false,
    note: 'public repo the site links to',
  },
];

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

/**
 * Preconditions, each reported separately so a failure names the step rather than the script.
 * Nothing here mutates anything.
 */
export function inspect({ root = ROOT } = {}) {
  const cli = spawnSync('origin', ['--version'], { encoding: 'utf8' });
  const authed = cli.status === 0 ? spawnSync('origin', ['auth', 'status'], { encoding: 'utf8' }).status === 0 : false;
  const repos = REPOS.map((repo) => {
    const dir = repo.dir === '.' ? root : path.join(root, repo.dir);
    if (!fs.existsSync(path.join(dir, '.git'))) return { ...repo, dir, present: false };
    const branches = git(dir, ['branch', '--format=%(refname:short)']).out.split('\n').filter(Boolean);
    const unpushed = git(dir, ['log', '--oneline', '@{u}..']).out.split('\n').filter(Boolean).length;
    const hasRemote = git(dir, ['remote', 'get-url', ORIGIN_REMOTE]).ok;
    return {
      ...repo,
      dir,
      present: true,
      branches: branches.length,
      // Unpushed work means GitHub and this disk already disagree. Mirroring from here would give
      // Origin a state GitHub has never seen, which is a confusing thing to discover later.
      unpushedToGitHub: unpushed,
      originRemoteConfigured: hasRemote,
    };
  });
  return {
    schema: 'demigod.origin-mirror/1',
    cliInstalled: cli.status === 0,
    cliVersion: cli.status === 0 ? (cli.stdout || '').trim() : null,
    authenticated: authed,
    repos,
  };
}

function pushRepo(repo, namespace) {
  const url = originUrl(namespace, repo.name);
  const existing = git(repo.dir, ['remote', 'get-url', ORIGIN_REMOTE]);
  if (!existing.ok) {
    const added = git(repo.dir, ['remote', 'add', ORIGIN_REMOTE, url]);
    if (!added.ok) return { repo: repo.name, ok: false, step: 'remote add', error: added.err };
  } else if (existing.out !== url) {
    const set = git(repo.dir, ['remote', 'set-url', ORIGIN_REMOTE, url]);
    if (!set.ok) return { repo: repo.name, ok: false, step: 'remote set-url', error: set.err };
  }
  // --all --tags, never --mirror: additive, and a diverged branch fails instead of being deleted.
  const pushed = git(repo.dir, ['push', ORIGIN_REMOTE, '--all']);
  const tagged = git(repo.dir, ['push', ORIGIN_REMOTE, '--tags']);
  return {
    repo: repo.name,
    ok: pushed.ok && tagged.ok,
    url,
    branches: pushed.ok ? 'pushed' : pushed.err.slice(0, 200),
    tags: tagged.ok ? 'pushed' : tagged.err.slice(0, 200),
  };
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`origin-mirror selftest: ${msg}`); };
  assert(originUrl('acme', 'checkout') === 'https://origin.cursor.com/acme/checkout.git', 'documented URL shape');
  assert(validNamespace('uuriko') && !validNamespace('Uuriko'), 'namespaces are lower case');
  assert(!validNamespace('') && !validNamespace('has space') && !validNamespace('-leading'), 'obvious junk is refused');
  for (const bad of ['../evil', 'a/b', 'x'.repeat(50)]) {
    let threw = false;
    try { originUrl('acme', bad); } catch { threw = true; }
    assert(threw, `a repo name of ${JSON.stringify(bad)} must not reach a git remote`);
  }
  // The delivery-path repo must stay flagged, or someone eventually "tidies up" the GitHub remote.
  const cdn = REPOS.find((repo) => repo.name === 'demigod-site-cdn');
  assert(/jsDelivr/.test(cdn.note) && /MUST stay/.test(cdn.note), 'the CDN repo carries its warning');
  assert(REPOS.every((repo) => repo.name !== 'demigod-ops-23'), 'a stale checkout is not a repo to mirror');
  assert(ORIGIN_REMOTE !== 'origin', 'the Origin remote must not take the name GitHub already uses here');
  console.log(JSON.stringify({ ok: true, selftest: 'origin-mirror' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  if (args.includes('--selftest')) {
    selftest();
  } else {
    const state = inspect();
    const namespace = flag('namespace') || process.env.CURSOR_ORIGIN_NAMESPACE || null;
    const wantPush = args.includes('--push');
    const blockers = [];
    const notes = [];
    if (!state.cliInstalled) blockers.push('origin CLI not installed — curl -fsSL https://downloads.cursor.com/origin/install.sh | sh');
    if (state.cliInstalled && !state.authenticated) blockers.push('not signed in — origin auth login (browser flow, needs a plan with Origin access)');
    if (!namespace) blockers.push('no namespace — claim one at cursor.com/codebase, then pass --namespace=<name>');
    for (const repo of state.repos) {
      if (!repo.present) blockers.push(`${repo.name}: no git repo at ${repo.dir}`);
      else if (repo.unpushedToGitHub) {
        /* A note, not a blocker. Origin-first is the chosen order, so Origin simply receives the
           complete local history and ends up ahead of GitHub — which is the intended state, not a
           conflict. It is still worth saying out loud, because "the two hosts disagree" is
           confusing to discover later without knowing it was deliberate. */
        notes.push(`${repo.name}: ${repo.unpushedToGitHub} local commit(s) GitHub does not have — Origin will receive them, so Origin leads GitHub by that much`);
      }
    }
    if (!wantPush || blockers.length) {
      console.log(JSON.stringify({
        ...state,
        namespace,
        wouldPush: state.repos.filter((repo) => repo.present).map((repo) => ({
          repo: repo.name,
          branches: repo.branches,
          url: namespace ? originUrl(namespace, repo.name) : null,
          note: repo.note,
        })),
        blockers,
        notes,
        dryRun: !wantPush,
      }, null, 2));
      process.exit(blockers.length && wantPush ? 1 : 0);
    }
    const results = state.repos.filter((repo) => repo.present).map((repo) => pushRepo(repo, namespace));
    console.log(JSON.stringify({ schema: 'demigod.origin-mirror/1', namespace, results }, null, 2));
    process.exit(results.every((row) => row.ok) ? 0 : 1);
  }
}
