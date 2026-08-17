---
status: working
generated_by: claude
generated_at: 2026-08-17
---

# Getting everything onto Origin — inventory, plan, and the one thing I cannot do

## State right now

| | |
|---|---|
| CLI | `origin 2026.08.15-22-58-04-922a05a` at `~/.local/bin/origin` |
| Auth | signed in as `jjohnpotter@gmail.com`, token valid |
| Git credentials | already wired — `origin auth login` installed a credential helper for `origin.cursor.com` in the global git config |
| Namespace | **none.** This is the blocker. |

The namespace is web-only. There is no API route for it: `/namespaces`, `/namespace`, `/orgs`,
`/me` and `/account` all 404 on GET and POST. `/repos/{namespace}` answers
`"Namespace uuriko was not found on Origin"`, which confirms repos are namespace-scoped and the
namespace must exist first. **Claim one at `cursor.com/codebase`.**

## What "everything" actually is

14 repos on GitHub, 2,019.7 MB — but that number is misleading.

**Five are forks of other people's work, and they are 1.96 GB of the 2.02 GB:**

| repo | size | fork of |
|---|---:|---|
| `eliza` | 1,853 MB | elizaOS/eliza |
| `asi` | 95 MB | elizaOS/asi |
| `social-media-wg-secrets` | 11 KB | BekaValentine/… (Noisebridge WG) |
| `firsttimersonly` | 702 KB | shanselman/… (2015) |
| `Projects` | 9 MB | karan/… (2015) |

Mirroring those copies 1.96 GB of upstream code to a second host to gain nothing: the upstream is
on GitHub, and a fork is one click to recreate. `eliza` alone is 92% of the total. My
recommendation is to skip all five, and if any is wanted it should be a deliberate choice rather
than a side effect of the word "everything".

**Nine repos are actually yours, and they total roughly 110 MB:**

| repo | size | visibility | note |
|---|---:|---|---|
| `demigod-ops` | 94 MB | **private** | the operations repo; 14 local commits GitHub does not have |
| `crispy-garbanzo` | 7.9 MB | **private** | |
| `demigod-site-cdn` | 6.2 MB | public | **must stay on GitHub** — jsDelivr `/gh/` serves the live foot and head CSS from it, pinned by commit |
| `dasha-desk` | 741 KB | public | linked from the site |
| `eat-the-sounds` | 254 KB | **private** | archived game |
| `dasha-utility` | 13 KB | public | |
| `oracle-hole` | 4 KB | public | |
| `dasha-utility-full` | 0 KB | public | empty |
| `Uuriko` | 0 KB | public | GitHub profile repo |

## Two ways to mirror, and which applies where

**`origin repo create-mirrored <owner/repo> --namespace=<ns>`** — mirrors server-side straight from
GitHub. No local clone, no upload from this machine. This is the right tool for the eight repos that
are not checked out here, and the only sane way to move anything large.

**`origin repo create` + `git push --all --tags`** — from this disk. Needed for exactly one repo:
`demigod-ops` has **14 commits that exist only here**, and a server-side mirror would copy GitHub's
history and silently omit them.

Never `git push --mirror`: it deletes remote refs absent locally. `--all --tags` is additive and a
diverged branch fails loudly instead of disappearing.

## What is genuinely unknown

These are not documented anywhere I could find, and the docs subpages under `cursor.com/docs/origin/`
return 404 for repositories, namespaces and quickstart:

- **Repository visibility.** Whether Origin has private repos at all, and how it is set. There is no
  `--private` flag on `origin repo create`. Three of your repos are private, one of them carrying a
  hiring corpus. This is the risk worth being slow about.
- **Size limits.** Nothing published on repo size, file size, or LFS. `demigod-ops` carries a 4.8 MB
  PNG and packs to 35 MB locally.
- **Plan gating.** Docs say Pro, Teams and Enterprise. Auth succeeded, so the account has some
  access; repo creation has not been exercised.

**How I will handle the visibility unknown:** create `dasha-utility` first — 13 KB, public on GitHub,
nothing sensitive. Inspect what visibility Origin gave it with `origin repo view`. Only then decide
about `demigod-ops`, `crispy-garbanzo` and `eat-the-sounds`. If Origin turns out to be public-only
from the CLI, I stop and say so rather than pushing a private repo into the open.

## The sequence

**You, once:** claim a namespace at `cursor.com/codebase`. `uuriko` matches your GitHub owner.

**Then, in order:**

1. `origin repo create uuriko/dasha-utility` → `origin repo view` → **learn the visibility default**.
2. If private repos are supported: mirror the eight GitHub-current repos with `create-mirrored`.
   If not: mirror the public ones only, and stop for a decision on the three private ones.
3. `demigod-ops`: `create` + `git push cursor --all --tags` from this disk, so Origin gets the 14
   commits GitHub lacks. Origin ends up ahead of GitHub by that much, deliberately.
4. `node demigod-origin-mirror.mjs --push --namespace=uuriko` does step 3 and the two other local
   repos in one command, creating each if absent.
5. Verify: `origin repo list`, and for each repo compare `git ls-remote cursor` against
   `git ls-remote origin` so "mirrored" is a checked claim rather than an assumption.

## Finishing the setup beyond mirroring

Available from the CLI now:

- `origin ssh-key add` — optional. HTTPS already works through the credential helper.
- `origin ruleset list` / `view` — read-only here; merge-time and push-time rules are configured in
  the web UI.
- `origin pr` — pull requests, the Graphite lineage Cursor bought. This is the part actually worth
  having.
- `origin api` — an authenticated `gh api` equivalent, useful for anything the CLI does not expose.

Needs the web UI:

- namespace (the blocker)
- **CI**: Origin runs none of its own. You connect Depot or Buildkite, both of which execute your
  existing GitHub Actions workflows. For `demigod-site-cdn` this matters — its publish path triggers
  a GitHub Actions workflow, so that stays on GitHub regardless.
- **Vercel**: connect from a repo's Apps tab for per-PR preview deployments.
- **GitHub connection** for the sync UI, if you prefer clicking to `create-mirrored`.

## What does not move, and why

`demigod-site-cdn` mirrors to Origin fine, but GitHub stays its home: `cdn.jsdelivr.net/gh/…` serves
the live foot on every page of trydemigod.com, pinned by commit SHA, and jsDelivr's `/gh/` endpoint
reads GitHub only. The SRI pins hash bytes fetched from that exact URL. Mirroring is additive here —
nothing about the delivery path changes.
