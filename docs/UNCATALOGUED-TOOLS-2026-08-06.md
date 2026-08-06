# Uncatalogued modules — decide, do not sweep

Eight root modules have no importer, no npm script, no systemd unit, no `bin/dg`
subcommand, no pipeline spawn, and no entry in `demigod-tools-registry.mjs`. All
date from the 2026-08-02 recovery and none has been touched since.

They are **not** proposed for deletion. Absence from the registry is weak evidence
right now because the registry is actively being populated — `axe-routes`,
`blog-sync` and `button-audit` were added to it today. A tool missing from a list
someone is still writing is not dead.

| Module | Lines | What it is | Read |
|---|---|---|---|
| `demigod-truth-lock-selftest.mjs` | 193 | selftest for the truth oracle + foot-lock mutex | **keep** — safety check |
| `demigod-pricing-fragment.mjs` | 54 | pricing table built from `feeCents` in demigod-revenue, so displayed fee cannot drift from charged fee | **keep** — the pricing decision is open |
| `demigod-site-counters.mjs` | 71 | trust-strip counters computed only from board-verified coverage | keep — honest-by-construction |
| `demigod-pulse-page.mjs` | 73 | wraps hiring-pulse and injects the AI/data classification caveat | check — hiring-pulse is live; this wrapper may be superseded |
| `demigod-intro-generator.mjs` | 48 | compat wrapper; does real `assertCurrentMutualPairEligibility` gating | check — wrapper, but gated |
| `demigod-gtm-status.mjs` | 160 | one-shot GTM status for handoffs | check — control-board may supersede |
| `demigod-full-audit.mjs` | 106 | puppeteer step-aware wizard audit | check — button-audit/axe-routes/conversion-audit overlap |
| `demigod-create-shell-pages.mjs` | 190 | Webflow Designer page creation | check — likely a one-time setup already done |

`demigod-copy-scrub-audit.mjs` was on this list and is NOT: its artifact
`DEMIGOD-COPY-SCRUB-AUDIT.json` was regenerated 2026-08-05 21:15, so it is run
manually. Unreferenced is not unused.

Two were excluded for having real code references — `demigod-webflow-blog-cms-setup`
(used by `demigod-webflow-lib.mjs`) and `demigod-write-desk` (used by `agent-dev.sh`).
Two more are the other worker's uncommitted/untracked work and were not considered.

## Method note

`demigod-directory-filter.mjs` showed 60 "references" on a naive grep. Every one
was an agent conversation transcript under `.claude/projects/` or `.grok/sessions/`
— my own history discussing the file, not code using it. The same self-citation
shape that once made three `cursor-*` scripts look referenced when the only
citations were my own deletion-candidate document. Transcripts and deletion
proposals are not references.
