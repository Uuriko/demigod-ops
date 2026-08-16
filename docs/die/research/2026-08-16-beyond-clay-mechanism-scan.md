---
status: research
canonical_for: nothing
generated_by: claude
generated_at: 2026-08-16
companion_to: docs/die/research/2026-08-15-similar-product-scan.md
---

# Mechanisms worth taking from products that are not Clay

The 2026-08-15 scan read Clay and concluded the winning unit is a role workspace. That is right and
it left a gap: Clay is a data workbench, so a scan of Clay mostly returns workbench mechanisms.
This one deliberately looks elsewhere — startup-signal platforms, job-change trackers, signal-based
GTM, recruiting marketplaces, interview intelligence, and ontology platforms.

**Rule applied throughout:** a mechanism only earns a place if Demigod can implement it on evidence
it observed or was consented to. A bought signal cannot be shown to a founder as the reason someone
was contacted. That constraint is not a limitation here; it is the product.

**Status key:** ✅ built · 🔶 partial, primitives exist · ⬜ not started

---

## 1. Harmonic / Specter — momentum instead of attributes ✅ already built, on a better basis

**What they do.** Score private companies on *change* rather than static firmographics. Harmonic
processes job postings, headcount trends, funding and product announcements across ~20M+ private
companies to surface "moments of active growth"; Specter runs the same idea across web, hiring and
product signals. ([Harmonic review](https://www.rings.ai/blog/harmonic-ai-review),
[Specter vs Harmonic](https://signals.gitdealflow.com/vs/specter-vs-harmonic-ai))

**Why Demigod should care.** The earlier GTM research found trigger events beat cold outreach, and
that 85% of recruiting business comes from referral and word of mouth. Momentum tells you *when* a
company is worth a conversation.

**Already built — `demigod-enrichment.mjs velocity`.** `hiringVelocity(ledger, {days})` counts
opened and closed roles per board from per-role `firstSeen` / `closedAt` on the role ledger. Its
declared basis is the observation clock, not employer post dates, and it attributes to company.

**I rebuilt it before finding it, which produced a warning worth keeping.** I wrote a second module
that differenced `DEMIGOD-HIRING-HISTORY.jsonl` snapshots instead, and it was wrong in an instructive
way. That panel is unbalanced: board coverage across the seven usable snapshots runs
406 → 339 → 501 → 339, with panel totals 11,691 → 8,124 → 11,442 → 8,307 roles. The same company
reads ~200 roles on a wide-crawl day and ~30 on a narrow one. **The first working version reported
the twelve largest employers as contracting at up to −173 roles/month** — it was measuring the crawl,
not the market. Bucketing into coverage regimes and scoring inside one fixed it (323 scored,
100 expanding / 137 steady / 86 contracting), but that is a workaround for a basis that should not
have been used.

**So the module was deleted.** An event basis is structurally immune to the problem — a role never
observed generates no open or close event, so absence can never be read as decline, and no regime
machinery is needed. Two conclusions, both durable:

- **Do not difference `DEMIGOD-HIRING-HISTORY.jsonl` per company.** It is a coverage-varying panel.
  Anyone who tries will get confident nonsense for the largest employers first, because they have the
  most roles to lose to a narrower crawl.
- If per-month normalization or a full ranking beyond `topBoards` is wanted, extend the existing
  `hiringVelocity` rather than adding a second one. It already has the right input.

## 2. UserGems / Champify — the job change as the warmest signal 🔶

**What they do.** Watch known contacts for job changes and raise a warm lead when one lands
somewhere new. Roughly 20% of CRM contacts change jobs a year; warm intros convert 3–5× cold, and
champion job changes are quoted at 60%+ intro-to-meeting.
([UserGems vs Champify](https://marketbetter.ai/blog/usergems-vs-champify-comparison/),
[relationship intelligence guide](https://www.getboomerang.ai/glossaries/relationship-intelligence-platforms-2026))

**Adaptation.** Demigod's equivalent of a CRM is its *consented* submissions, plus owned touch
history and prior pairs. A candidate who consented, was not placed, and has since moved is the
warmest possible re-open — and it is also a company signal, because they now sit inside a company
Demigod tracks. `demigod-candidate-touch.mjs` (rediscovery) and `demigod-intro-path.mjs` (manual
warm paths) are the primitives; what is missing is the trigger.

**Already built: the ranking. Missing: the trigger — and it may have to stay missing.**
`rediscover()` in `demigod-candidate-touch.mjs` ranks owned touch history by recency, channel weight
and optional role match, with a suppression set and deliberately no global fit score. Given a role,
it already answers "who that we know is worth re-opening".

What it cannot do is notice that someone *moved*, because noticing requires watching people, and
Demigod has no consented feed of employment changes. UserGems and Champify get theirs from CRM
records their customer owns plus open-web monitoring. Demigod owns the first kind at seed scale and
has ruled out the second.

**So this is a boundary, not a backlog item.** The honest close is either an explicit opt-in — a
person tells Demigod where they now work — or nothing. Do not close it by adding a scraper; that
would trade the one property that makes an intro from Demigod worth taking.

## 3. Common Room — person-level resolution and stack-ranked signals 🔶

**What they do.** Unify signals from 50+ sources, resolve them to a *person* rather than a domain,
then let the operator stack-rank by calculated fields — and choose fit-first or signal-first as the
entry point. ([signal-based selling](https://www.commonroom.io/blog/how-to-run-a-signal-based-go-to-market-motion/),
[calculated fields](https://www.commonroom.io/blog/calculated-fields/),
[person-level signals](https://www.commonroom.io/blog/person-level-signals-abm-stack/))

**Adaptation.** The transferable part is not the integrations, it is **fit-first vs signal-first as a
switch**. DIE's role workspace is fit-first by construction: start from an accepted brief, then find
people. Signal-first is the other door — start from "who is moving right now" (mechanism 1) and ask
which accepted roles it serves. The company table plus hiring velocity is most of a signal-first
view; it needs the ranking to compose with role fit.

## 4. Mercor / Paraform — outcome-weighted supply 🔶

**What they do.** Paraform runs a marketplace of independent recruiters competing on bounties, and
tracks recruiter performance across thousands of searches — placement success, candidate quality,
hiring-manager satisfaction. Mercor goes the other way: AI-led interviews and semantic sourcing for
contract work. ([Paraform review](https://tooldirectory.ai/tools/paraform),
[Mercor review](https://remowork.life/blog/mercor-review-how-it-works-pay-and-is-it-worth-it-in-2026))

**Adaptation.** Not the marketplace — Demigod is deliberately one human's judgment, and Mercor's
AI-interview model collides directly with DIE's rule against employment decisions by an unexplained
model. What transfers is **scoring the source, not the candidate**: which channel, which evidence
type, which intro path actually produced good outcomes. The DIE roadmap already asks to "learn which
evidence/channels helped"; Paraform demonstrates the shape of that ledger.

## 5. Metaview / BrightHire — a rating must carry the line that produced it ✅ already built

**What they do.** Join interviews, transcribe, and map answers to a competency rubric, so the
scorecard traces back to what the candidate actually said — every rating shipping with the phrase and
what it demonstrated. ([Metaview on scorecards](https://www.metaview.ai/resources/blog/create-effective-interview-scorecards),
[interview intelligence platforms](https://www.socialtalent.com/blog/recruiting/top-12-interview-intelligence-platforms))

**Already built, and further than this scan first credited.** `assertNote` in
`demigod-role-packet.mjs` enforces exactly the rule: every must-have on the packet needs a rating
(`note_missing_rating`), the rating must be in a four-value enum, and **evidence under 8 characters
is rejected per rating** (`note_evidence_short`). A rating for an unknown must-have is refused, and
`evidenceIds` are bounded and validated. There is no path to a saved judgment without the line it
rests on.

It also carries something the vendors do not: a `rehearsal` block with `initialView`,
`contraryEvidence`, `changeCondition` and `finalRationale`. That is a considered-the-opposite step —
the reviewer records what would have changed their mind. Metaview and BrightHire structure the
*capture*; this structures the *reasoning*, which is the harder half.

**What is left is narrow.** Transcription and recording are a consent and jurisdiction question and
are deliberately absent. The structure already works with hand-typed notes and no recorder, which
was the recommendation before checking — the recommendation was already implemented.

## 6. Palantir Foundry — the ontology as the organizing idea ⬜

**What they do.** Model the business as Objects (real-world entities), Relations (how they connect)
and Actions (what changes them), with entity resolution de-duplicating records and lineage attached
from the first sync. ([Foundry Ontology](https://www.palantir.com/explore/platforms/foundry/ontology/),
[entity resolution](https://www.palantir.com/foundry-entity-resolution/))

**Adaptation.** DIE already has the nouns — company, role, candidate, pair, outcome — and already
has trust zones, which is the part Foundry does not give you for free. What it lacks is the explicit
**Action** layer: the small set of state changes anything is allowed to make (accept a role, propose
a fit, record consent, prepare an intro, record an outcome), each with its authority boundary
attached. Writing that down is cheap and would make the authority rules enforceable rather than
documented.

---

## Correction: this scan over-claimed the gaps

Two of the six were written up as partial and turned out to be built, and both corrections point the
same way — DIE is further along than a read of the spec suggests, because the spec describes the
target and the code quietly implements more of it.

| Mechanism | First written as | Actually |
|---|---|---|
| 1 · Harmonic momentum | build it | built, on a better basis; my rebuild was deleted |
| 5 · rating carries its quote | partial | built, plus a considered-the-opposite step |
| 2 · job-change trigger | partial | ranking built; the trigger is a deliberate boundary |

The practical lesson for anyone extending DIE: **grep before designing.** Both times, the module
that already existed used a sounder input than the one I reached for — the role ledger rather than
snapshot diffs, `assertNote` rather than a new note type. The registry (`bin/dg tools`, 166 entries)
is the index, and CLAUDE.md's "reuse, don't rebuild" is not a style note.

## What this scan changes

The 2026-08-15 conclusion stands: build the role workspace. This adds a second axis to it.

- **Fit-first is only half the product.** Mechanisms 1 and 3 open the signal-first door: start from
  companies in motion rather than from an accepted brief. Demigod can now compute that door's input
  from its own observations.
- **The strongest untapped asset is consented history, not new sourcing.** Mechanism 2 says the
  warmest signal is someone already known who has moved. That is a re-read of data Demigod holds,
  not a new acquisition — and it is the one place where a narrow, consent-bounded dataset beats a
  broad bought one, because the intro is actually warm.
- **Learn about sources, not just candidates.** Mechanism 4 turns the outcome ledger from a record
  into a feedback loop.
- **Every scoring mechanism here failed the same way first.** Harmonic's is a bought feed, so its
  quality is unauditable by the buyer. Demigod's version was auditable and *still* produced a
  confident wrong answer until the coverage regimes were separated. The lesson generalizes: any
  score computed over Demigod's own crawl needs to state which observations it used and which it
  refused, or it will eventually report the crawl as the world.
