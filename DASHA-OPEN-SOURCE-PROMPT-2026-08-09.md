---
status: reference
scope: Supporting open source across the Dasha project
updated: 2026-08-09
---

# Prompt: support open source properly, and stop hiding the parts that already work

A standing brief, written to be re-run. The audit below ages; the reasoning does not.

## Why this matters here specifically

Three reasons, in descending order of how much evidence stands behind them.

1. **The Studio is the only compounding loop this project has.** Every image made in it carries a
   `getdasha.com` mark into someone else's feed, and CC0 is the legal permission that lets that
   happen. `dasha-brand.test.mjs` puts it better than a strategy doc could: *an unseen licence
   produces no remixes*. Open source here is not community theatre — it is the distribution
   mechanism.
2. **Contributors are the one form of "organic community" that cannot be faked.** Jupiter's
   verification measures organic score and smart likes precisely because both are hard to buy. A
   merged pull request from a real person is the same class of signal, and it is the only one this
   project can grow by doing honest work rather than by spending.
3. **A tool people can host themselves outlives the token's attention cycle.** The pasteable embed
   already runs on sites nobody here controls. That is reach that does not decay when a chart does.

## Hard constraints — read before writing a word of copy

Open-source growth advice is full of things this project must not do.

- **Never promise money, airdrops or token allocation for contributions.** `DASHA-CLAIMS.md` C9 is
  explicit: no airdrop entitlement, no payment, no purchase score, no claim about objective human
  worth. Points are recognition. If a sentence could be read as "contribute and you will be paid,"
  it is wrong and it is also a securities-shaped problem nobody here wants.
- **Never manufacture engagement.** No fake issues to look busy, no sockpuppet stars, no
  contributor counts that include the operator's own agents. The differentiator is not telling
  those stories.
- **Never widen a claim to make the project look bigger.** "Official project" means the operator
  builds it; it does not mean token control, account control or endorsement. See C1, C3, C4, C5.
- **Third-party media is not CC0.** Gallery photos, Dasha Nekrasova's name and likeness, and any
  trademark are carved out. Every licence statement must survive a copy edit with both carve-outs
  intact — this has already been broken twice by well-meaning reduction passes.
- **Do not publish `receipts/`.** Old FOMO experiment JSON. Gitignored; keep it that way.

## Audit, 2026-08-09

Verify each line before trusting it; this section is the part that rots.

**Already good, do not rebuild:**

- `Uuriko/dasha-desk` is MIT, has `LICENSE`, `NOTICE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, `CODEOWNERS`, `dependabot.yml`, a PR template, and three issue templates
  (bug / idea / config).
- Issues are enabled, Discussions are enabled, and there are real open issues labelled
  `good first issue` with an `impact:` scale.
- Twelve topics set, description written, homepage points at the Desk.
- `receipts/` is gitignored and has zero tracked files. Confirmed, not assumed.
- The Studio ships as source *and* build in `studio/`, with its own `LICENSE`, `README`,
  `media.json`, `embed-build.mjs` and `studio.test.mjs`.
- `studio.test.mjs` pins the copy-paste snippet's SHA-384 and fails when the published bytes drift,
  which caught a real broken-SRI publish on 2026-08-09.

**The gap that matters most:**

`dasha-simp-oss-scorer.mjs` converts merged pull requests into public Simp Board points —
`impact:tiny` 5, `impact:small` 15, `impact:medium` 40, `impact:large` 100, `impact:critical` 200 —
requiring a merge, a non-draft PR, an allowed base branch and an approving review from someone other
than the author, with per-season and rolling-7-day caps and bot rejection. It is implemented, it is
gated by `dasha-simp-oss-scorer.test.mjs`, and the public issues are **already labelled with the
impact scale it reads**.

It is documented nowhere a contributor can see. Somebody browsing the repo sees a label reading
`impact:large` and no explanation anywhere of what that means or that it does anything at all. The
reciprocity mechanism was built and then never mentioned to the people it exists for.

**Smaller gaps:**

- No `FUNDING.yml`. Worth having only if it points at something real; do not invent a funding route.
- No `CITATION.cff`.
- `DASHA-OPEN-SOURCE.md` still lists blockers that have since been fixed (Studio not in the public
  repo; Pages possibly not enabled). Stale docs about openness are their own barrier.
- Home (`dasha-landing.html`) and the how-to-buy page remain monorepo-only with no OSS licence.
  That may be correct — not everything needs publishing — but the doc should say which it is.

## The work

Ordered by value per unit of effort. Stop when the next item stops earning its place.

### 1. Tell contributors the points exist

Document the OSS scoring rules where a contributor actually looks: `CONTRIBUTING.md`, and a line in
`README.md` pointing at it. State the impact scale, the approval requirement, the caps, and the fact
that bots and self-approval are rejected. State just as plainly that points are **recognition on a
public board and nothing else** — no payment, no allocation, no entitlement. Link the board.

Write the caps as a feature, not fine print: they exist so the board measures contribution rather
than volume, and so nobody can farm it.

### 2. Make the impact labels self-explaining

A label is the first thing a contributor reads and the last thing anyone documents. Give every
`impact:` label a GitHub description so it explains itself in the picker and on hover, and make sure
`good first issue` is on issues that genuinely are.

### 3. Reconcile `DASHA-OPEN-SOURCE.md` with reality

Fix the blockers that are no longer blockers, and state plainly which surfaces are deliberately not
open source rather than leaving them as unfinished business. An honest "we are not publishing this,
here is why" is better documentation than a stale TODO.

### 4. Lower the first-contribution barrier

The repo already has good first issues. Check that the path from "I want to add a look" to a merged
PR is documented end to end, that the Studio's own README explains the one-file architecture, and
that running the tests locally is one command a stranger can find.

### 5. Only then, the small stuff

`CITATION.cff`, funding links if a real route exists, topics review. These are polish; they do not
move a contributor.

## Verification

Nothing here ships unverified. Minimum gates:

```bash
node dasha-simp-oss-scorer.test.mjs     # scoring rules still hold
node dasha-desk/dasha-oss-docs.test.mjs # public OSS docs coherent
npm run dasha:test:docs                 # registry, links, claim coherence
node dasha-desk/studio/studio.test.mjs  # published Studio + SRI
```

Any claim added to public copy must pass `dasha-product-coherence.test.mjs`, which is where the
"official" scoping and the C1–C10 boundaries are enforced. If a new sentence about contribution
rewards cannot survive that gate, the sentence is wrong, not the gate.

## What success looks like

Not stars. A stranger lands on the repo, understands in under a minute what the tool is, what
licence lets them take it, what a good first change looks like, and that doing one is noticed. That
is the whole objective, and every item above is judged against it.
