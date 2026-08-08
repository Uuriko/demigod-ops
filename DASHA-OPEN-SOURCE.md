---
status: reference
---

# Making Dasha properly open source

**Updated:** 2026-08-08  
**Operator playbook (checklists + Shaw research):** [`DASHA-OSS-OPERATOR-PLAYBOOK.md`](DASHA-OSS-OPERATOR-PLAYBOOK.md)

**Hard rule:** Thesis Card, conviction receipts, forecasting, and Pair are **permanently scrapped**. They are not open-source product surfaces and must not be reintroduced under a new name.

---

## Current state (honest)

| Piece | Today | License / rights |
|-------|--------|------------------|
| **dasha desk** (`dasha-desk/`) | Intended public repo [Uuriko/dasha-desk](https://github.com/Uuriko/dasha-desk) | **MIT** (`LICENSE`) + `NOTICE` + `assets/ATTRIBUTION.md` |
| **Home** `dasha-landing.html` | Lives in private/ops monorepo (`demigod-ops` / worktree) | **No root OSS license yet** |
| **Meme Studio** `dasha-meme-studio.html` + embed build | Same monorepo | **No root OSS license yet** |
| **How-to-buy / experiments** | Local only | Keep out of v1 public repos unless cleaned |
| **Product docs** (`DASHA-*.md`) | Mix of current + historical in monorepo | Not a public package |
| **Thesis / receipts / FOMO evidence** | Local scrap / old commits | **Never publish as product** |

Desk README and CONTRIBUTING already state: open source, MIT, thesis retired, static app, no
endorsement implied by association.

**Corrected 2026-08-07:** these previously said the project was *unofficial*. It is not — it is the
official project. See
[`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md).

**Blockers for “properly open source” today**

1. **Studio + home are not in the public repo** — only desk is structured as OSS.  
2. **GitHub auth / push** from this machine is unreliable; local desk is **ahead** of remote with the clean neutral desk.  
3. **`receipts/`** (~40 FOMO/raid experiment JSON files) must never be pushed — now gitignored.  
4. **Git history** on desk still has old FOMO ship commits (`V55`–`V57` style). Fine for transparency if README is clear; optional later: orphan `main` or `v1.0.0` tag from a clean tree.  
5. **Third-party media** is not MIT (ATTRIBUTION already says so).  
6. **GitHub Pages** workflow exists but Pages may not be enabled (404).

---

## Recommended public layout (simple)

Do **not** open-source the whole monorepo (Demigod, tokens, Webflow scripts, personal ops).

### Option A — two focused repos (recommended)

```
Uuriko/dasha-desk     # mint verify + sources + neutral buy (exists)
Uuriko/dasha-studio   # meme studio + embed build + seeds (new)
```

Optional later: `Uuriko/getdasha-site` for home only if you want the marketing shell OSS too.

### Option B — one monorepo `getdasha`

```
getdasha/
  packages/desk/
  packages/studio/
  packages/home/          # optional
  LICENSE                 # MIT for code
  NOTICE                  # endorsement + media exclusions
  README.md               # product map + scrap list
```

Option A is easier to review and stars; B is easier for agents on one machine. Either works if **scrap stays out**.

---

## What goes in each public package

### dasha-desk (keep / clean)

**Include**

- `src/{body,styles,app.js}` + `build.mjs` (runtime truth); `config/dasha.json` is a small reference snapshot only
- `docs/PRODUCT.md`, `DEPLOY.md` (sanitized)
- `README`, `CONTRIBUTING`, `SECURITY`, `LICENSE`, `NOTICE`
- `dasha-share.test.mjs` + minimal CI
- Optional: Pages workflow for standalone desk

**Exclude / never add**

- `receipts/**` FOMO/raid evidence  
- Thesis / conviction / worker / D1 schemas  
- Private Webflow tokens, cookies, CDP thrash scripts  
- Unlicensed bulk X media dumps in `assets/x/*` unless rights resolved (prefer **hotlink only** in product HTML)

**Quotes policy:** Public post text + URL is fine as citation. Do not claim endorsement.

### dasha-studio (create)

**Include**

- `dasha-meme-studio.html` (canonical)  
- `dasha-studio-embed-build.mjs` + generated embed (or generate in CI)  
- `dasha-studio-embed.test.mjs` / studio test (without requiring monorepo CDP if possible)  
- MIT + NOTICE (same endorsement / scrap language)  
- README: “no wallet, no upload, fragment remix URLs, not endorsed”

**Exclude**

- Relay lab, remix-pack capsule, logo lab (experiments until gated)  
- Home marketing page (unless you choose a third package)

### Home (optional third package)

Only if you want the full getdasha front door OSS. Otherwise keep home private and link to public desk + studio repos from the footer (“Open source ↗”).

---

## What is permanently not the OSS product

| Scrapped | Why |
|----------|-----|
| Thesis Card | Product killed |
| Conviction receipts / sealed receipts / workers | Product killed |
| Forecasting / Pair / Rounds | Product killed |
| FOMO desk, raid kits, referrals, Telegram community claims | Trust / honesty |

If historical code must exist for audit, put it in an **`archive/scrap-thesis/`** folder with `README: DO NOT USE` — or leave it only in private monorepo history. Prefer **absence** from public repos.

---

## License recipe

| Material | Choice |
|----------|--------|
| Original code (desk, studio, build, tests) | **MIT** (already on desk) |
| Original docs in those repos | MIT or CC0 — stick with MIT for simplicity |
| Seed lines / look names you wrote | MIT with the code |
| Third-party photos / X media | **Not MIT** — ATTRIBUTION + hotlink preferred |
| Wikimedia portrait if used | Keep CC BY-SA obligations |
| Token / trademark / likeness | No grant of brand rights; NOTICE disclaimer |

One root `LICENSE` + `NOTICE` per public repo is enough. Do not invent a custom “culture coin license.”

---

## Trust copy every public README must keep

- ~~Unofficial~~ — **removed: false.** This is the official project (see
  [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md)). Do not reintroduce it.
- ~~association ≠ endorsement~~ — **removed with the rest of the disclaimer copy, 2026-08-08.** If a
  relationship claim is ever wanted on the site, the operator supplies the exact sentence: "works
  directly with", "authorized by" and "endorsed by" are three different public claims. Do not tune it
  by inference.  
- Exact mint string + public source post link  
- One Jupiter path; no custody  
- Thesis/receipts **not part of this project**

---

## Practical ship checklist (make it real)

### Phase 0 — hygiene (disk, can do now)

- [x] Document this plan (`DASHA-OPEN-SOURCE.md`)  
- [x] `receipts/` gitignored in desk  
- [x] `NOTICE` on desk  
- [x] Reduce `config/dasha.json` to a public reference snapshot with no private, retired or unverified fields  
- [ ] Desk `main` matches **neutral** product (no FOMO) before any push  

### Phase 1 — publish desk cleanly

1. `cd dasha-desk && node build.mjs --write && node build.mjs --check && node dasha-share.test.mjs`  
2. Review `git status` — **no `receipts/`**  
3. Commit: neutral desk + OSS docs + NOTICE (no FOMO)  
4. `gh auth login` (or SSH key) then `git push origin main`  
5. GitHub → Settings → Pages → Source: **GitHub Actions** (one-time)  
6. Confirm https://uuriko.github.io/dasha-desk/ (or Pages URL) serves desk  
7. Footer on getdasha already points at GitHub; keep that link accurate  

### Phase 2 — extract Studio as public repo

1. New repo `dasha-studio` (MIT + NOTICE + README)  
2. Copy studio sources + embed build + tests only  
3. CI: `node dasha-studio-embed-build.mjs --check` + unit tests  
4. getdasha Studio page can still be Webflow; README is the OSS home  
5. Link both repos from getdasha footer: Desk source · Studio source  

### Phase 3 — optional

- Home package or monorepo  
- SPDX headers on source files  
- `FUNDING.yml` / sponsorship only if desired  
- Code of conduct (Contributor Covenant) if community PRs appear  
- Tag `v0.1.0` desk + `v0.1.0` studio  

---

## CI minimum (keep ship fast)

**Desk**

```yaml
- node build.mjs --check
- node dasha-share.test.mjs
```

**Studio**

```yaml
- node dasha-studio-embed-build.mjs --check
- node dasha-meme-studio.test.mjs   # optional if CDP available; else static asserts only
```

Do **not** require full monorepo `dasha:test:all` for OSS CI.

---

## Relationship to getdasha.com

| Surface | Production host | OSS source of truth |
|---------|-----------------|---------------------|
| `/dasha` | Webflow embed | `dasha-desk` |
| `/studio` | Webflow embed | `dasha-studio` (after extract) |
| `/` | Webflow embed | optional / private until licensed |

Live may lag disk; README already says that. OSS does **not** require GitHub Pages to replace Webflow — Pages is a nice standalone mirror.

---

## Agent / contributor rules

1. PRs that revive thesis/receipts/FOMO → close.  
2. PRs that add wallet connect or “safe mint” claims → close.  
3. Media dumps without ATTRIBUTION → close.  
4. Prefer smallest static diff (ponytail).  

---

## Success criteria

Dasha is “properly open source” when:

1. **Desk** public repo matches neutral product, MIT + NOTICE, no receipts, push works, README accurate.  
2. **Studio** public repo exists with same bar (or is clearly listed as “coming”).  
3. getdasha footers link to those repos without claiming official endorsement.  
4. Scrapped thesis stack is **absent** from public trees.  
5. Third-party media is either excluded or documented as non-MIT.

Until then: desk is **almost** there on disk; ship is blocked on auth + not pushing scrap; studio still needs extraction + license.

---

## Immediate next actions (ordered)

1. Review desk `git diff` — keep neutral desk, drop any FOMO leftover in tracked files.  
2. Commit + push `dasha-desk` when GitHub auth is available (**never** add `receipts/`).  
3. Enable Pages if standalone URL is wanted.  
4. Scaffold `dasha-studio` public repo from monorepo studio files.  
5. Add MIT + NOTICE at monorepo only if you open-source home from there — otherwise leave monorepo private.

This document is the checklist; it does not publish anything by itself.
