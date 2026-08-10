# Dasha open-source operator playbook

**Updated:** 2026-08-08  
**Who this is for:** humans + agents shipping `dasha-desk`, future `dasha-studio`, and related public getdasha code.  
**Companion:** [`DASHA-OPEN-SOURCE.md`](DASHA-OPEN-SOURCE.md) (what to open-source) · this file (how to run it like a serious public project).  
**Hard exclusions forever:** Thesis Card, conviction receipts, forecasting, Pair, FOMO/raid/referral product, Telegram community claims, endorsement language.

**Research anchors (Shaw / lalalune / elizaOS — learn patterns, do not clone scale):**

| Identity | Role |
|----------|------|
| [@shawmakesmagic](https://x.com/shawmakesmagic) | Public builder brand; ships demos; defends open source as trust + growth |
| [github.com/lalalune](https://github.com/lalalune) | Personal surface; pins flagship OSS |
| [github.com/elizaOS](https://github.com/elizaOS) | Org for product monorepos, plugins, docs, OS |
| [elizaOS/eliza](https://github.com/elizaOS/eliza) | Flagship: MIT, monorepo, docs site, CLI, plugins, CONTRIBUTING, AGENTS.md, SECURITY advisories |

---

## Part 0 — Agent self-prompt (re-run this when OSS strategy drifts)

Copy this block into a fresh agent turn when you need to re-derive “how Shaw does OSS” or audit Dasha’s public repos:

```text
You are auditing open-source operating practice for getdasha / Dasha.

Primary case study: Shaw (@shawmakesmagic) / lalalune / elizaOS (github.com/elizaOS/eliza and related orgs).
Secondary: any other successful crypto+AI or creative-tool OSS that matches our scale constraints.

TASKS
1) List concrete OSS tactics they use (org structure, monorepo vs plugins, docs, CLI, CI, issues, security, social loop, licensing).
2) For each tactic, classify: ADOPT now for dasha-desk | ADOPT when studio is public | DEFER until real external contributors | NEVER (wrong scale or conflicts with Dasha trust rules).
3) Produce a GitHub-native checklist: repo settings, branch protection, labels, templates, Actions, releases, Discussions, security advisories, Pages.
4) Produce a weekly/monthly operator rhythm (what maintainers actually do).
5) Map every item to Dasha files/repos (dasha-desk today; dasha-studio planned). Do not revive thesis/receipts/FOMO.
6) Prefer weakest sufficient process — ponytail. Do not invent bureaucracy for zero external PRs.

OUTPUT: update DASHA-OSS-OPERATOR-PLAYBOOK.md with dated findings; keep DASHA-OPEN-SOURCE.md as scope of truth.

READ: DASHA-OPEN-SOURCE.md, dasha-desk/README.md, CONTRIBUTING.md, SECURITY.md, NOTICE, LICENSE.
```

---

## Part 1 — What successful OSS operators (Shaw/eliza-style) actually do

Distilled patterns. Dasha is smaller; adopt the *shape*, not the 10k-commit monorepo.

### 1.1 Product + narrative

| Pattern | elizaOS / Shaw | Dasha translation |
|---------|----------------|-------------------|
| **Open source as trust** | “I would never use your product because it’s not open source” — OSS = competitive advantage for builders | Desk + Studio code public so mint tooling and remix logic are inspectable |
| **One clear flagship repo** | `elizaOS/eliza` is the north star | `Uuriko/dasha-desk` now; `dasha-studio` next |
| **Org vs personal** | Org for product; personal account for identity | Keep product under clear owner/org; personal = optional |
| **Demo → repo → docs** | Ship video/demo, link GitHub, link docs | X demo of Studio → GitHub → short docs |
| **MIT by default** | MIT on core | Already MIT on desk |

### 1.2 Repository architecture

| Pattern | elizaOS | Dasha (right-sized) |
|---------|---------|---------------------|
| Monorepo for core product | packages/, plugins/, scripts/ | Desk is one small package; don’t monorepo until 2+ packages |
| Plugin/ecosystem org | `elizaos-plugins` + registry | Later: “look packs” or seed packs as separate tiny repos if strangers contribute |
| Separate distribution repos | `elizaOS/os` for OS images | Webflow stays deploy; Pages = optional mirror |
| Starters / templates | CLI `create project/plugin` | `examples/` or a gist “minimal desk embed” is enough |
| Agent-facing repo guides | `AGENTS.md`, `CLAUDE.md` per package | Desk: keep CONTRIBUTING short; add `AGENTS.md` only if external agents PR |

### 1.3 Docs surface

| Pattern | elizaOS | Dasha |
|---------|---------|-------|
| Marketing site + docs site | elizaos.ai + docs.elizaos.ai | getdasha.com + README is enough at v0 |
| “Choose a starting point” table | Users / runners / builders / contributors | README sections: Use live · Run local · Verify · Contribute |
| Deep docs only when needed | Plugin guides, security package | PRODUCT.md, DEPLOY.md, NOTICE |
| Windows / platform notes | WINDOWS.md | Skip until someone files an issue |

### 1.4 Contribution loop

| Pattern | elizaOS | Dasha |
|---------|---------|-------|
| Issue before non-trivial PR | Required | Put in CONTRIBUTING |
| PR against `develop` | Yes | Use `main` until volume justifies `develop` |
| Issue templates | bug, feature, agent work item | Start with bug + feature templates |
| Human-verifiable evidence | CONTRIBUTING requires it | Require: command run + screenshot or gate output |
| Close low-quality / spam PRs | Reality of AI PRs | Boundaries already in CONTRIBUTING (no FOMO/thesis) |

### 1.5 Quality gates

| Pattern | elizaOS | Dasha |
|---------|---------|-------|
| `verify` / `test` / `test:e2e` | Turbo monorepo | `node build.mjs --check` + share test (desk); fast gate for monorepo |
| Secret scanning | gitleaks config | Depend on GitHub secret scanning; no tokens in repo |
| CI on every PR | Yes | Enable when first external PR lands or on push |

### 1.6 Security

| Pattern | elizaOS | Dasha |
|---------|---------|-------|
| Private vulnerability reporting | Security Advisories | SECURITY.md already points there |
| Scope third parties out | Explicit | Mint/Jupiter/X are out of scope — keep saying so |

### 1.7 Social + distribution (not “growth hacks”)

| Pattern | Shaw | Dasha |
|---------|------|-------|
| Public demos with OSS link in the same post | Eliza videos → github.com/elizaos/eliza | Studio export demo → github.com/Uuriko/dasha-desk (+ studio when live) |
| Repeated “fully open source” framing | Trust narrative | Footer “Source ↗” + README badge |
| Ecosystem lists / awesome repos | Community “awesome-eliza” | Optional later |
| Discord for plugins | Heavy community | **Off site until real server** (see SIMPLIFY) |

### 1.8 What **not** to copy from eliza-scale

- 200+ plugins and multi-language rewrites before one product works  
- Cloud product surface as requirement for OSS  
- Agent-generated PR volume without review standards  
- Token/valuation narrative tied to the repo  

Dasha success = **inspectable mint desk + remixable studio**, not agent framework fame.

---

## Part 2 — GitHub effectiveness checklist (operator)

Use this when creating or upgrading any public Dasha repo.

### 2.1 Repo create / settings

- [ ] Public repo under intended owner (`Uuriko` or future org)
- [ ] Clear name: `dasha-desk`, `dasha-studio` (no demigod, no thesis)
- [ ] Description one line + homepage `https://www.getdasha.com/...`
- [ ] Topics: `solana`, `memecoin`, `static-site`, `open-source`, `javascript` (as relevant)
- [ ] LICENSE (MIT) committed
- [ ] NOTICE (endorsement + media exclusions + scrap list)
- [ ] README with: what / not what / live URL / run local / contribute / security
- [ ] Default branch `main`
- [ ] **Do not** commit: `.env`, tokens, `receipts/`, Webflow cookies, CDP thrash, thesis/receipts code

### 2.2 Branch protection (after first successful push)

- [ ] Require PR before merge to `main` **or** allow direct push only for sole maintainer (document choice)
- [ ] Require status checks when CI exists (`build`, `test`)
- [ ] No force-push to `main`
- [ ] Optional: require linear history

### 2.3 Community health files

| File | Purpose | Dasha status |
|------|---------|--------------|
| README.md | Front door | desk: yes |
| LICENSE | Legal | desk: MIT |
| NOTICE | Rights / scrap / endorsement | desk: yes |
| CONTRIBUTING.md | How to PR + boundaries | desk: yes |
| SECURITY.md | Private vuln path | desk: yes |
| CODE_OF_CONDUCT.md | Behavior | optional until multi-maintainer |
| SUPPORT.md | Where to ask | optional (use issues) |
| GOVERNANCE.md | Decision process | never until needed |

### 2.4 Issue & PR templates (`.github/`)

- [ ] `ISSUE_TEMPLATE/bug_report.md` — mint wrong, link broken, a11y, mobile
- [ ] `ISSUE_TEMPLATE/feature_request.md` — must answer “evidence of demand?”
- [ ] `ISSUE_TEMPLATE/config.yml` — disable blank issues or route security
- [ ] `PULL_REQUEST_TEMPLATE.md` — checklist: gates run, no FOMO/thesis, mint unchanged unless intentional
- [ ] Labels: `bug`, `docs`, `good first issue`, `wontfix`, `trust`, `studio`, `desk`

### 2.5 Actions / CI

**Desk (minimal, fast):**

```yaml
on: [push, pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node build.mjs --check
      - run: node dasha-share.test.mjs
```

- [ ] Pages workflow only if Pages enabled (Settings → Pages → GitHub Actions)
- [ ] To push workflow file changes: token needs **`workflow` scope** (`gh auth refresh -s workflow -h github.com`)
- [ ] Dependabot optional for Actions versions only (no npm tree if none)

### 2.6 Releases

- [ ] Tag `v0.1.0` when desk is the clean neutral product
- [ ] GitHub Release notes: user-visible changes only
- [ ] Attach nothing secret
- [ ] Do not release thesis/FOMO historical builds as “latest”

### 2.7 Security

- [ ] Enable **private vulnerability reporting** (Security → Advisories)
- [ ] Enable secret scanning / push protection (org or repo)
- [ ] SECURITY.md points to Advisories, not public exploit issues
- [ ] Scope: this repo’s HTML/JS only; not Jupiter, Solana, X

### 2.8 Discussions / Wiki / Projects

- [ ] Discussions: **off** until noise is real (Issues first)
- [ ] Wiki: **off** (docs in-repo)
- [ ] Projects: optional kanban for maintainers only

### 2.9 Social proof without lying

- [ ] Stars/forks are vanity — do not claim “community size” on getdasha
- [ ] Link exact repos from site footer: Desk source · (later Studio source)
- [ ] Never “official Dasha Nekrasova OSS”

---

## Part 3 — Ship / operate rhythm

### 3.1 Every code change (solo or agent)

1. Edit canonical sources only (`src/*`, `config/*`, studio source).  
2. Run the **fast** gate (`build --check` + share test, or monorepo `dasha:gate:fast`).  
3. Commit on a branch or `main` with a human-readable message.  
4. Push.  
5. If getdasha.com must match: `npm run dasha:ship` **only with valid Webflow token and current-request auth**.  
6. Verify live URL markers (`dasha:ship:verify` or curl).

### 3.2 Weekly (15 minutes)

- [ ] Open issues / PRs triage  
- [ ] Close spam or FOMO/thesis revival attempts  
- [ ] Check live desk still matches mint in README  
- [ ] No secrets in last week’s commits (`git log -p` spot check)

### 3.3 Monthly

- [ ] Dependency/Actions updates  
- [ ] Re-read NOTICE / README trust language  
- [ ] Decide: still one repo or extract studio  
- [ ] Tag release if user-visible changes shipped

### 3.4 When the first external contributor appears

- [ ] Turn on PR-required for `main`  
- [ ] Add issue templates if missing  
- [ ] Reply within a reasonable time or mark unmaintained honestly  
- [ ] Prefer small docs/a11y PRs first  

---

## Part 4 — Dasha-specific “great OSS” definition of done

### Desk (`Uuriko/dasha-desk`) — **priority**

- [x] MIT + README + CONTRIBUTING + SECURITY + NOTICE  
- [x] Neutral product on `main` (trust-reset commit pushed)  
- [x] `receipts/` gitignored  
- [x] Catbox casino share defaults removed from config  
- [ ] `workflow` scope if updating Pages CI  
- [ ] Pages enabled if standalone URL desired  
- [ ] Issue templates  
- [ ] v0.1.0 release tag  
- [ ] getdasha footer Source link stays correct  

### Studio (planned public repo)

- [ ] Extract from monorepo only studio + embed build + tests  
- [ ] MIT + NOTICE + README (no wallet, fragment remix, not endorsed)  
- [ ] CI: embed `--check`  
- [ ] Link from getdasha Studio footer  

### Never public as product

- [ ] Thesis / receipts / workers / D1 schemas  
- [ ] FOMO evidence JSON under `receipts/`  
- [ ] Webflow tokens, cookies, personal ops monorepo wholesale  

---

## Part 5 — GitHub CLI cheat sheet (this machine)

```bash
# Auth
gh auth status
gh auth login -h github.com -p https -w
gh auth refresh -s workflow -h github.com   # only if you need to push Actions YAML

# Repo
gh repo view Uuriko/dasha-desk
gh repo edit Uuriko/dasha-desk --homepage https://www.getdasha.com/dasha

# After local commit
cd dasha-desk && git push origin main

# Release
gh release create v0.1.0 --title "v0.1.0 neutral desk" --notes "Mint desk, MIT, no FOMO."

# Issues
gh issue list
gh issue create --title "…" --body "…"
```

Remote must be **HTTPS** if using `gh` keyring (SSH needs a separate key):

```bash
git remote set-url origin https://github.com/Uuriko/dasha-desk.git
```

---

## Part 6 — Mapping Shaw tactics → Dasha size

| Shaw / elizaOS tactic | Adopt? | When |
|----------------------|--------|------|
| Public MIT flagship | **Yes** | Now (desk) |
| Org + monorepo + plugins | Defer | Many packages / external plugins |
| docs.site | Defer | README insufficient |
| CLI scaffolding | Defer | Strangers build on Studio API |
| Cloud product | **No** | Conflicts with static/no-account desk |
| Demo videos + OSS link | **Yes** | Every Studio/share demo |
| AGENTS.md for agents | Optional | External agent PRs |
| Plugin registry | **No** | Wrong product |
| SECURITY advisories | **Yes** | Now |
| develop branch | Defer | PR volume |
| “Open source or ngmi” narrative | Careful | Use for **builders**; never as price promise |

---

## Part 7 — One-page push checklist (print this)

**Before push**

- [ ] No secrets, no `receipts/`, no thesis code  
- [ ] Gates green  
- [ ] README mint matches config  
- [ ] NOTICE present  

**Push**

- [ ] `gh auth status` = Uuriko  
- [ ] `origin` = HTTPS github.com/Uuriko/…  
- [ ] `git push origin main`  

**After push**

- [ ] GitHub UI shows latest commit  
- [ ] Clone fresh in /tmp and run gates  
- [ ] Site footer Source URL works  
- [ ] Optional: Pages, release tag, issue templates  

**Never**

- [ ] Claim celebrity endorsement  
- [ ] Ship FOMO desk as “community features”  
- [ ] Revive thesis card as OSS “experiment” without explicit user order  

---

## Changelog

| Date | Note |
|------|------|
| 2026-08-08 | Initial playbook from Shaw/lalalune/elizaOS research + Dasha constraints |
