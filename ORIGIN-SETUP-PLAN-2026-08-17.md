---
status: working
generated_by: claude
generated_at: 2026-08-17
---

# Getting everything onto Origin — inventory, plan, and the one thing I cannot do

## RESOLVED 2026-08-17 — claiming the namespace mirrored everything by itself

Namespace `johnpotter` claimed, and **all 14 repos appeared on Origin within seconds**, created
20:58:25–20:58:36Z. Nothing below needed running; the plan's mirroring section is history.

Verified rather than assumed:

| check | result |
|---|---|
| repos on Origin | **14 of 14**, including `eliza` at 1.85 GB |
| `demigod-ops` refs | **122 on Origin, 122 on GitHub, `diff` empty** — byte-exact |
| spot checks | eliza 322/322, dasha-desk 20/20, demigod-site-cdn 19/19, asi 5/5 — all match |
| mirror direction | `Mirror status: inbound` — GitHub is the source, Origin pulls |

**The visibility question is answered, and the answer is the safe one.** Origin exposes no
public/private field at all — not in `repo view`, not in the API record. So I tested it instead:
unauthenticated `git ls-remote` fails and a plain HTTP fetch of `info/refs` returns **401** for
`demigod-ops`, `crispy-garbanzo`, `eat-the-sounds` — *and equally for `dasha-desk`, `eliza` and
`demigod-site-cdn`, which are public on GitHub*. Origin currently has no anonymous access to
anything. The hiring corpus is not exposed; the canary plan was unnecessary but the test still had
to be run, because "no visibility field" is not evidence of privacy.

**What this changes about the plan.** These are inbound mirrors, so GitHub is the upstream by
Origin's own design. The 17 commits that live only on this disk are on neither host, and the clean
route to Origin now runs *through* GitHub — "worry about GitHub later" is not quite available any
more, because GitHub is the input.

A direct push to Origin would work — `git push --dry-run cursor` reports a clean fast-forward
`5ca836b..746f4f0` — but it puts commits on the far side of an inbound mirror, and nothing published
says whether the next sync preserves them or resets to GitHub. The CLI exposes no way to detach or
promote a mirror (`repo` offers only create, create-mirrored, list, view, clone, delete). Until that
is known, pushing to GitHub and letting the mirror pull is the move that cannot lose work.

## Verification pass — 2026-08-17, after the first real push

**The mirror is live, not a snapshot.** Pushed 20 local commits to GitHub
(`5ca836b..6c8cc19`) and Origin carried the same SHA **within 10 seconds**. That was the one
question timestamps could not answer, because GitHub had not been pushed since Origin was created,
so there had been nothing to sync.

**All 14 repos verified ref-for-ref, not spot-checked.** Every repo's full `git ls-remote` output
hashed and compared against GitHub's:

| repo | refs | repo | refs |
|---|---:|---|---:|
| asi | 5 | eat-the-sounds | 3 |
| crispy-garbanzo | 1,199 | eliza | 322 |
| dasha-desk | 20 | firsttimersonly | 3 |
| dasha-utility | 3 | oracle-hole | 2 |
| dasha-utility-full | 2 | Projects | 2 |
| demigod-ops | 122 | social-media-wg-secrets | 2 |
| demigod-site-cdn | 19 | Uuriko | 2 |

**14 of 14 identical.** Nothing partial, nothing lagging.

**The laptop's git config is correct and scoped.** `origin auth login` added two entries, both
bounded to the Origin host:

    credential.https://origin.cursor.com/git.helper  → origin credential-helper
    credential.https://origin.cursor.com.helper      → origin credential-helper

GitHub's pre-existing helpers are untouched and still route to `gh auth git-credential`. No
catch-all helper was installed, so nothing intercepts credentials for other hosts. `~/.local/bin` is
already on PATH via `.profile`, so `origin` resolves in ordinary shells and not only when a script
exports it.

**Push direction settled by evidence.** General mirroring practice warns that writing to both ends of
a mirror creates race conditions and that rewriting mirrored commits makes syncing fail. Combined
with the sub-10-second inbound sync, the rule is simple and needs no coordination: **push to GitHub,
let Origin follow.** Pushing straight to Origin is possible — a dry run reports a clean
fast-forward — and is the thing not to do.

## State before the namespace existed

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

## The part nobody documented: what Origin does with your code

**Neither of Cursor's two authoritative privacy pages mentions Origin, code hosting, or git hosting
at all.** `cursor.com/data-use` and `cursor.com/help/security-and-privacy/privacy` both describe
Privacy Mode as *"your code is never used for training"*, and enumerate the features that store code
— codebase indexing, file caching, Cloud Agents. Origin is not among them, because those pages
predate it.

That matters here more than for most users, because a git host stores your code permanently by
definition. Privacy Mode's promise is about the AI features. What is unstated for hosted repos:

- retention and deletion terms
- whether Origin repos are indexed for agents by default
- whether hosted code is exempt from training in the same way
- data residency for hosted repos (an Enterprise control, unclear if it covers Origin)

`demigod-ops` carries a hiring corpus — candidate evidence, review notes, a demand queue. This site's
own `robots.txt` says `ai-train=no`. Worth asking Cursor directly before that repo lands, or keeping
it on GitHub until the answer is in writing.

**Change of control.** Anysphere was acquired by SpaceX for $60B, announced the same day as Origin.
The entity that would hold the code is not the entity that built the product.

**Exit is asymmetric.** The code itself is never locked in — it is git, and `git clone` always works.
What does not come out is the metadata: pull requests, reviews, comments and rulesets live in Origin
and have no export path anyone has published. Mirroring is cheap to undo; moving the review process
is not.

## A cost of the naming choice, stated plainly

The Origin remote is called `cursor` here so that `origin` keeps meaning GitHub. The price is that
`origin pr` and `origin api` infer the repo from **the remote literally named `origin`**, which on
this machine is GitHub — so they will guess wrong. Two ways round it, both fine:

    origin pr list -R uuriko/demigod-ops
    ORIGIN_REPO=uuriko/demigod-ops origin pr list

Worth knowing before the first `origin pr` command returns something confusing.

## Two smaller things

- **The PR model is "changes", not pull requests.** `origin pr create` speaks of resolving head and
  base refs to capture initial version SHAs — the Graphite stacked-diff lineage. It behaves like
  stacked changes rather than GitHub PRs, which is an adjustment, not a defect.
- **The CLI updates on a channel.** `origin config get-channel` / `set-channel` — currently `stable`.
  Worth pinning deliberately for a tool that holds git credentials.
- **Plan and entitlement are not introspectable.** `/plan`, `/subscription`, `/entitlements` and
  `/features` all 404, so the only way to know what tier this account has is the billing page.

## What does not move, and why

`demigod-site-cdn` mirrors to Origin fine, but GitHub stays its home: `cdn.jsdelivr.net/gh/…` serves
the live foot on every page of trydemigod.com, pinned by commit SHA, and jsDelivr's `/gh/` endpoint
reads GitHub only. The SRI pins hash bytes fetched from that exact URL. Mirroring is additive here —
nothing about the delivery path changes.

## The backup audit — what "everything is mirrored" actually turned out to mean

Mirroring 14 repos proves nothing about whether the repos hold the work. The real question is how
many commits exist **only on this laptop**, and the honest answer on 2026-08-17 was **65**:

| Where | Commits at risk | What they were |
|---|---|---|
| `dasha-desk` / `provider-url-hardening` | 60 | back to 2026-08-07 |
| `dasha-desk` / two leftover branches | 2 | |
| `demigod-ops` / `dasha/bounty-github-oauth` | 2 | lobby-edge bounty JSON + OAuth |
| `demigod-site-cdn` / `leftover-hire-card-contrast` | 1 | live foot + head CSS |

All 65 were scanned for credentials before anything was pushed, and all are now on GitHub — and
therefore on Origin, which picked up every new branch on its own (`dasha-desk` 20→23 refs,
`demigod-ops` 122→124, `demigod-site-cdn` 19→20, all still ref-for-ref identical). Nothing was
merged and nothing was deployed; these are backup branches. `demigod-site-cdn`'s new branch is not
`main`, so the jsDelivr pin is untouched.

**Two findings mattered more than the commits.**

`demigod-site-cdn` had `remote.origin.fetch` narrowed to `+refs/heads/main:refs/remotes/origin/main`.
Every local check of "is my work backed up?" in that repo was answering a question about `main` and
presenting it as an answer about the repo — it was hiding two remote branches and reporting a pushed
commit as unbacked. Widened to the standard refspec.

Nine of twelve git worktrees pointed at `/tmp` directories that no longer existed, and one of them
held the only copy of a commit. It is now `backup/pr9-lobby-404` on GitHub; the dead entries are
pruned. Three worktrees remain, all real.

Recorded because both failures are the same shape as the bug this codebase keeps finding: a check
that reports on a narrower thing than the question it appears to answer.

## Privacy: what is settled, and the one switch only you can see

**Exposure did not widen.** Origin returns HTTP 401 to anonymous git clients for every repo,
including ones that are *public* on GitHub (`social-media-wg-secrets` is PUBLIC upstream and still
401s on Origin). So mirroring `demigod-ops` — which holds the hiring corpus — did not make it
readable by anyone who could not already read it.

**Training is a per-account setting, not an Origin property.** Cursor's data-use documentation is
explicit in both directions: with Privacy Mode on, "Customer Data will not be used for training by
Cursor" and zero-retention agreements cover the model providers; with it off, "we may use and store
codebase data, prompts, editor actions, code snippets, and other code data and actions to improve
our AI features and train our models." The document does not carve out git-hosted repos, so the
uniform reading is that it applies to Origin too.

That setting is not introspectable from here: `origin config` exposes only the release channel,
`/api/privacy`, `/api/me`, `/api/user` and `/api/settings` all 404, and no local Cursor config on
this machine records it. **It has to be read off the Cursor dashboard.** Until it is confirmed on,
treat the corpus as hosted under standard terms.

## One thing worth deleting

`Uuriko/social-media-wg-secrets` is public on GitHub and now mirrored to Origin. It is a fork of
`BekaValentine/social-media-wg-secrets` — the Noisebridge hackerspace social-media working group —
containing `Passwords.kdbx`, a KeePass 2 database whose last content commit is 2019-01-06 and whose
upstream has been public since 2018. Nothing in it is Demigod or Dasha data, the credentials are
seven years old, and the file is encrypted; the exposure is not new and is not ours to fix upstream.

But the fork adds nothing, and it is the one repo of the fourteen whose name and payload read as a
credential leak under this account. Deleting the fork removes it from Origin as well. That is a
destructive, account-level action, so it is left for the operator to call.
