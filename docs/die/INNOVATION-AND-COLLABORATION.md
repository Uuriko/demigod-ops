# Clay, the field, and how three agents build something novel on top of it

**Written by Claude, 2026-07-29.** Working doc for Claude, Codex and Grok.

**This does not restate [COMPETITIVE-LANDSCAPE.md](research/COMPETITIVE-LANDSCAPE.md).** That
doc profiles 15 vendors against primary sources and remains the reference for *who exists and
what they claim*. This one carries three things it does not: (1) what changed or was missed as
of today, (2) the mechanisms worth adapting and precisely why each one works, (3) candidate
novel mechanisms and the working agreement for building them.

Claims sourced to a search result are marked **[web]**. Claims from the repo are marked
**[repo]** and were executed, not read. Everything else is inference and labelled as such.

---

## 1. What is new since the landscape doc

The landscape doc was written 2026-07-29 08:52. Four things belong in it.

### 1.1 Clay shipped a natural-language workflow builder — **[web]**

**Sculptor**, added early 2026, lets an operator describe a workflow in chat and have Clay build
it. The landscape doc mentions it zero times.

Why it matters: the DIE spec's permanent non-goals include "recipe DSL". Sculptor is the market
answering the same question the other way — not a DSL, but natural language compiled into a
workflow. It does not change our answer, because our bottleneck was never workflow authoring;
it does mean "operators can't build research workflows without engineers" has stopped being a
gap anyone can sell against.

### 1.2 Clay ships native intent signals — **[web]**

Job changes, website visits, company mentions. Documented gaps: no contact-level intent, no
competitor-activity tracking, no community monitoring.

The landscape doc mentions "intent signal" zero times. This matters more than Sculptor: job
changes are *our* signal domain. Clay now watches the thing our role ledger watches, for a
different buyer.

### 1.3 Claim-level citation with source-span click-through is becoming standard — **[web]**

Enterprise search vendors now prioritise "strong claim-level citations plus click-through to the
exact source span". Academic work in 2026 covers claim-level auditability for deep research
agents and simultaneous document-level and evidence-level citation.

**This is the same erosion that hit "always-on research agent", now hitting our evidence
drawer.** The landscape doc's differentiated bundle leads with "exact source quotation and URL,
live quote replay". Quotation with span click-through is on its way to table stakes.

The part that does *not* erode is the replay: **[repo]** the live receipt re-fetches every quote
and checks it still appears in the fetched page — 142/142 at the current receipt. Citing a span
and *continuously proving the span still says that* are different products. If we keep claiming
"evidence" generically we will be commoditised; if we claim "evidence that is re-verified on a
schedule and fails closed", that is still ours.

### 1.4 The market has independently validated D-002 — **[web]**

> The dominant complaint about AI screening in 2026: a high match score with no reasoning, so
> recruiters read the resume anyway.

D-002 "Evidence, not verdict" was argued from first principles and from FActScore. It now has
external market evidence. Related: a proposed class action was filed against Eightfold AI in
January 2026 over alleged FCRA violations, signalling that how AI affects candidate outcomes has
legal consequences — which is an independent argument for D-012 "public research cannot act" and
for keeping match authority human.

Also **[web]**: predictive hire-quality scoring needs outcome data on hundreds of past hires in
similar roles, and most companies do not have it. That is the roadmap's Phase 3 gate, arrived at
independently.

---

## 2. The mechanisms worth adapting, and why each works

Not features — *mechanisms*. A feature is what a product shows; a mechanism is the property that
makes it hold up. Ordered by how much they would improve Demigod specifically.

| # | Mechanism | Where it is proven | The property that makes it work | Fit for us |
|---|---|---|---|---|
| 1 | **Small-sample preview before committing spend** · **PARKED (2026-07-29)** — no cost/token fields on `sourceChecks`; see `/tmp/dg-busy/die-cost-per-fact-park.md` | Clay tests on 5–10 records before a full run | Cost and quality are discovered on a sample the operator can inspect, not predicted | Direct **when** metered transport exists; unmeasurable today |
| 2 | **Waterfall with early exit on confidence** | Clay, Common Room | Stop paying the moment a cheaper source answered | Only after a second source exists — D-010 |
| 3 | **Change-triggered refresh, not scheduled rerun** | Firecrawl change tracking, Common Room | Work is proportional to what actually changed | Direct. Most company pages do not change weekly |
| 4 | **Re-verification of stored claims** | Rare; our receipt does it | A claim's truth decays; nobody re-checks | **Already ours.** Under-claimed |
| 5 | **Abstention as a product output** | Weak across the field | "Unknown with a reason" beats a confident wrong value | **UNLOCKED 2026-07-30** — optional `unknownReason` closed enum on the grader; 7/8 gold abstentions annotated; ledger informative. See §3.2 stamp. D-007 still holds |
| 6 | **Explainable score decomposition** | Skima, heymilo — the 2026 complaint | Recruiters distrust a number without components | We refuse a global score entirely — **verified [repo]**: zero `globalScore`/`fitScore`/`overallScore`/`confidenceScore` in the matching engine or evidence module. Decomposition is the honest middle |
| 7 | **Evidence generated by the process** | Mokka pre-screens to create evidence that does not exist in the application | New evidence beats better ranking of old evidence | Adjacent to our review step |
| 8 | **Natural-language workflow authoring** | Clay Sculptor | Removes the engineer from the loop | Low fit. Not our bottleneck |
| 9 | **Persistent account memory** | Clay Account Research Agents | The agent remembers what it learned | **Overstated.** **[repo]** the history store is a *mutable current-state* record with boundary timestamps — 142 claims, one `firstVerifiedAt` generation, **no** per-claim history array and **no** `supersedes`. Useful, but not the append-only shape I claimed |

---

## 3. Novel mechanisms — candidates, not decisions

Each is stated as a falsifiable proposal with a kill condition. None is approved; several
collide with existing decisions and say so.

### 3.1 Decay-aware evidence — from "does it still say that" to "when was absence first observed"

We already re-fetch every quote and fail closed. Keeping per-claim history yields the honest
observation interval `(lastVerifiedAt, stoppedMatchingAt]`: the exact quote was last verified
at the first boundary and first observed absent at the second. This does **not** prove when the
underlying business claim became false.

Delivered as private diagnostic infrastructure only: claim identity includes the normalized
quote hash, and transport or fallback failure cannot manufacture absence. Product use such as
`company_context_during_tenure` remains gated. **Kill if:** re-fetch noise (page redesigns, bot
walls) produces more false absence observations than real ones over 30 companies.

**PARKED 2026-07-29 — kill condition is unmeasurable, not unmet.** `company-research-source-history.json`
covers the required 30 companies (142 claims / 5 fields) but spans **4.23 hours** in a **single**
observation round, with **zero** absence observations of either kind: `absent: 0`, `unknown: 0`,
`stoppedMatchingAt` null on all 142. False-vs-real is 0 vs 0 — undefined, so the condition can be
neither passed nor failed. Encouraging side-evidence: 13 transport failures across 8 claims did occur
and produced **no** absence, which is the fail-closed design working, and that invariant is pinned by
`demigod-source-history-poison.test.mjs` (gated at `demigod-verify-all.mjs:61`, green). **Resume when**
≥30 days of periodic re-fetch over the same 30 companies has produced ≥1 absence observation, each
classified false or real. Full falsification attempt: `/tmp/dg-busy/die-31-falsify.md`.

### 3.2 The abstention ledger — KILLED as written, replaced by what the data showed

**Status 2026-07-30 — UNLOCKED (narrow).** Optional `unknownReason` on `status:'unknown'` claims
against closed enum `not_applicable|not_found|unresolved` (`UNKNOWN_CLAIM_REASONS` in
`demigod-evidence.mjs`; abstention ledger aliases the same SoR). Existing all-null unknowns stay
valid. Gold annotated **7** pricing reasons from the on-site classify; 1 `likelyBuyer` left
unstated. Live ledger: 8 abstentions · 7 stated · pricing raw **0.7667** → excl. category errors
**0.8519** (still &lt; 0.9) so **D-007 withhold holds**. Adversarial review PASS; poison suite locks
junk reasons / value+reason conflicts / no auto-accept. Receipts:
`/tmp/dg-busy/codex-clay-unknownreason-grader.md`, `codex-clay-unknownreason-poison.md`,
`claude-unknownreason-review.md`. Grader coverage still uses the full denominator — adjusted
coverage is ledger-only, not a product gate.

**Killed 2026-07-29 by its own kill condition.** I wrote "we already carry `unknown` with reason
codes". **[repo]** We did not at that stamp. The only keys on an `unknown` field were `value`,
`status`, `url`, `quote`, all null — the grader actively *required* them null. Reason codes were a
proposal in the source thread; I wrote them up as if they were built. And the abstention distribution
was degenerate: 8 unknown claims out of 150, **7 of them on `pricingStatus`** — 87.5% in one bucket,
which is the second half of the same kill condition.

**2026-07-29 probe (Claude):** 7 pricing unknowns classified via homepage fetch —
`/tmp/dg-busy/die-32-pricing-classify.md`. Defensible **not_applicable** ≈3; **not_found** remainder.
Corrected coverage ~85% of pricing-coherent companies; still **below** 0.9 so **D-007 withhold holds**.
`not_applicable` as a *status* remains unbuilt; the unlock is reason codes + ledger, not a new status.

**Status 2026-07-30 — UNLOCKED:** optional `unknownReason` is now a closed enum (`not_applicable|not_found|unresolved`); all 7 pricing unknowns are annotated, but corrected coverage is still 23/27 = **0.8519**, so D-007 holds. Receipts: `/tmp/dg-busy/codex-clay-unknownreason-grader.md` and `/tmp/dg-busy/codex-clay-unknownreason-poison.md`.

**What survives is narrower and better, because it came from the seven actual cases.** Those 7
pricing abstentions are not one kind of thing:

**Classified on-site by Grok, 2026-07-29** — the check I said was needed, run through the
pipeline's own safe fetch path. Zero pricing links, pricing words, contact-sales CTAs or free-trial
offers on any of the seven; all three dollar-sign hits were false positives once context was pulled
(GigaGen's is a $35M BARDA contract, Shorenstein's is 0.3B AUM, Frisson's is a 50–200K salary
posting).

| Company | Classification | Why |
|---|---|---|
| Kabam | **not_applicable** | consumer games — category decides, no page content could overturn it |
| GigaGen (Grifols subsidiary) | **not_applicable** | biopharma subsidiary |
| Shorenstein | **not_applicable** | real estate; the row itself says "legal entity varies by context" |
| InMobi | **not_found** | pricing exists, merely unpublished — an ordinary coverage miss |
| Frisson Labs | **not_found** | pricing will exist as a concept; not yet published |
| Quin | **not_found** | same |
| Tara AI | **unresolved** | no company URL at all, only a YC directory page; its `canonicalCompany` conflict makes this an identity problem before it is a pricing problem |

**This corrects my own table**, which grouped the early-stage companies alongside the category
errors and so implied more of them than exist. Early-stage-with-no-pricing-page is a coverage miss,
not a category error. Defensible category errors: **3**, not 4–5.

**The revised proposal still stands: separate `not-applicable` from `not-found`.** Asking a
real-estate holding company or a biopharma subsidiary for its "pricing status" is a **category
error, not missing data**. But the correction matters for what follows.

**[repo] D-007 SURVIVES THE CORRECTED DENOMINATOR.** Threshold is 0.9, the numerator is fixed at 23,
and the crossing point is exactly exclude-5 (23/25 = 0.92). The defensible 3 exclusions give
23/27 = **0.8519**, which still fails. So what changes is the number's *meaning* — 76.7% → 85.2% —
**not the verdict**. Pricing stays withheld, now for an audited reason rather than an unaudited one.

**Structural fact I did not know when I wrote this** — **[repo]** `verifySources` never fetches an
`unknown` field, so those seven pages had never been read by the pipeline and no future receipt
would have read them. The abstentions were unexamined *by construction*, which is why an on-site
pass was the only way to classify them.

Note **[repo]** that `conflict` is not hypothetical either: `canonicalCompany` carries 3 real ones
— Artifact ("will no longer operate as a standalone app"), Shorenstein (entity varies by context),
and Tara AI.

### 3.3 Role-ledger cross-check as a company-claim verifier

**Status: KILLED (2026-07-29)** — local falsification in `/tmp/dg-busy/die-33-falsify.md`
(`task_22321cefdba3`). Do **not** implement as an automatic company-research `conflict` source.

**[repo]** We hold 13.6k roles with first-seen dates and honest open-lifetime invariants. That is
an independent signal against a company's own website claims. A company page saying "rapidly
growing" while its ATS has had the same three roles open for 200 days is a *conflict*, and our
model already has a first-class `conflict` status. No competitor in the landscape doc joins
first-party ATS observation to company self-description.
**Kill if:** conflicts are almost always explained by board hygiene rather than reality.
**Killed because:** native posted ages 200–365d concentrate at always-hiring brands; Demigod
`observedOpenDays` max is ~3 (wrong clock for “open 200 days”); local map descriptions carry
**0** strong self-growth claims (n=2568). Long-posted multi-role cases = evergreen/board hygiene
already separated as evergreen signals — keep as hiring hygiene only, never company-truth conflict.

### 3.4 Evidence that records whether it was used

Roadmap Phase 3 already wants evidence-shown/consulted markers. The novel part is the inversion:
a field nobody consults across many reviews is a field we should stop paying to collect. That
turns the review loop into the thing that prunes the pipeline.
**Kill if:** reviewers consult everything, or nothing, making the signal flat.

**PARKED 2026-07-29 — unmeasurable on three independent counts, one of them permanent.** (1) No
consult telemetry exists anywhere in the repo — `evidenceConsulted`, `consultedAt`, `evidenceShown`,
`shownAt`, `evidenceViewed`, `consultCount`, `fieldConsult` all return **zero** hits. (2) No real
review carries evidence: all 13 rows in `DEMIGOD-PAIRS.json` are `sample: true`, and
`demigod-match-review.mjs:132` sets `companyEvidence: p.sample === false ? … : null`, so evidence is
null by construction on every stored pair and **0** pairs carry the key. (3) The permanent one — the
dashboard renders evidence as a **single blob** (`demigod-agent-dashboard-ui.html:1259`,
`const evidence = p.companyEvidence`), never per field, so "which field was consulted" is not
observable even in principle on the current surface; this blocks the mechanism regardless of how many
real reviews arrive. **Resume when** per-field rendering exists, a consult event is captured against
it, and ≥1 real (non-sample) review has produced evidence. Precedent for the cheap capture already
works here: `#evidenceDetails` uses a native `<details>` `toggle` listener
(`demigod-agent-dashboard-ui.html:1983`) — wired to gates, not evidence. Full attempt:
`/tmp/dg-busy/die-34-falsify.md`.

### 3.5 Sample-preview honesty applied to ourselves

Clay's 5–10 record preview is for the buyer. Applied internally, the same mechanism gives us
cost-per-accepted-fact before a full run. **This is mechanism 1 above with no new concept —
the cheapest item here and the one I would build first.**

Delivered locally: the partner sourcer now projects at most the requested small sample from the
complete validated RecruitAI artifact, with exact YC identity/dedupe and no CRM, queue, score,
contact, or send authority. Strict offsets expose deterministic non-overlapping review windows,
while a reconciled receipt accounts for every selected, skipped, abstained, or upstream-omitted
row. The same ordered preview includes existing ledger-change, trusted posting-age, and positive
PeopleOps-role evidence as review reasons; it never relabels first observation as a new posting,
closure as a hire, or a zero role count as proof of no in-house team. Each role-derived signal
must match a `has_open_role`-connected role under the same ATS board: exact title and URL, or
exact supported status, quote, and URL for no-agency evidence.

The existing demand collector also now handles exact public Work at a Startup job payloads
without a new provider layer: one bounded no-redirect fetch, exact job/company binding, safe
company URL, and a founder LinkedIn only when exactly one named profile is present. Fourteen of
fifteen current rows yielded company evidence; Ploy and Ardent yielded local LinkedIn review
drafts, while the unavailable row and ambiguous teams abstained. No message or DM was sent.
Structured profile disagreements persist as bounded private conflict receipts. They block the
LinkedIn draft route and, when that profile is the only usable identity, form, match, pair, and
intro bridges until matching public evidence clears them; independently usable non-noise email
or person-shaped X contacts remain eligible.

### 3.7 One field unblocks change-triggered refresh; without it the decision is unmakeable

**Status: INSTRUMENTED (2026-07-29)** — `sha256ChangeCount` / `lastSha256ChangedAt` live on
`/tmp/dg-busy/company-research-source-history.json` (schema `/2`). First multi-run snapshot:
142 claims, **63** with `sha256ChangeCount≥1` (max 1) after reseals same day — churn is real;
do **not** skip refresh yet (kill condition needs ~10 runs). Mechanism 3 still not productized.

Mechanism 2/#3 (refresh on change, not on schedule) needs exactly one number to justify itself:
**how often does a source page actually change between runs?** The infrastructure to answer it
almost exists — the history store records `lastSha256` per claim — but **[repo]** that field is
*overwritten* every run, so the previous hash is gone and the churn rate is not derivable. Two runs
are recorded (19:10 and 23:12) across 48 distinct URLs and I cannot say whether one page changed or
all of them.

Ask: a `sha256ChangeCount` (or `shaChangedAt`) incremented when the fetched hash differs from the
stored one. Same shape as the cost gap — do not build the mechanism, record the one number that
says whether to. **Kill if:** after ~10 runs the churn rate is high enough that skipping unchanged
pages saves little, in which case scheduled refresh was right all along.

#### Built and measured, 2026-07-29 — and the result is not the one the mechanism needed

`sha256ChangeCount` shipped, and the first measurement over a ~4h gap: **[repo]** **24 of 48 source
pages changed hash — 50%.** Every changed page shows a count of 2, i.e. it changed in *both*
recorded intervals. Mechanism 2/#3 was justified by "most company pages do not change weekly";
that assumption is wrong at the document level.

**But every one of the 142 claims stayed `verified`.** The hash moved and the quoted spans did not.
So the churn is not content churn — it is CSRF tokens, session ids, render timestamps, analytics
nonces, A/B variants, cache busters. Notably the `ycombinator.com/companies/*` and `wikidata.org`
pages change every single run.

**The real conclusion, which is more useful than the rate:** a raw document hash is the wrong change
signal for this job. It answers "did any byte move" when the question is "did the evidence move".
If refresh-on-change is worth building, the thing to hash is the **extracted visible text**, or the
block surrounding each quote — not the response body.

Honest limit on that inference: a surviving quote proves those specific spans survived, not that the
rest of the document is unchanged. Distinguishing the two needs the text-level hash above, which is
exactly the next cheap step.

#### Built the text-level hash and measured both — a 25× gap

**Status: FIXED (2026-07-29)** — private evidence-text hashing is instrumented; no refresh skipping or product behavior was added.

`textSha256` (sha256 of the normalized visible text) now rides alongside the body hash on every
source check, tracked through the same helper so both get identical discipline. **[repo]** First
side-by-side measurement over 48 pages:

| Signal | Pages that changed | Share |
|---|---|---|
| Response-body `sha256` | 24 / 48 | **50%** |
| Visible-text `textSha256` | 1 / 48 | **2%** |

One page — `thisismason.com` — had a genuine visible-text change. All 142 claims stayed `verified`.

**So mechanism 2/#3 is vindicated and its naive implementation is dead.** Refresh-on-change keyed on
the body hash would skip almost nothing; keyed on the visible text it would skip ~98% of re-fetches.
The body hash is ~96% noise for this purpose. Both counters stay, because the *ratio* is the finding
and we want to know if it ever inverts.

Honest limit: this is one interval and one measurement. 2% could be luck, and a single changed page
is a single data point. What is already solid is the *gap* — a 25× difference between the two signals
is not explained by sampling noise.

### 3.8 Persistent transport failure would create a silently-stale "verified" claim

**Status: DIAGNOSTIC DELIVERED (2026-07-29)** — private `counts.staleVerified` +
`isStaleVerifiedClaim()` (`lastTransportFailureAt > lastVerifiedAt` while `currentState=verified`).
Full third state `unverifiable` still **PARKED** (product semantics; kill after a week of runs).

**[repo]** Live evidence that the 3.1 guard is doing real work: 13 transport failures were recorded
against 2 genuinely flaky URLs — `investors.chime.com/news-releases/...` (10) and
`ready.net/careers` (3), touching 8 claims. **All 8 remain `verified` with `stoppedMatchingAt`
null.** Without that guard those 8 claims — 5.6% of the corpus — would have been reported as
claims that stopped being true, from two URLs having a bad afternoon.

The latent gap: if a URL failed *persistently across runs*, `currentState` would stay `verified`
while `lastVerifiedAt` fell behind, and nothing computes that gap. The store already carries
`lastVerifiedAt`, `lastAttemptAt` and `updatedAt`, so detection is a subtraction — it just is not
done. **[repo]** Today the count is **0** claims behind, so this is latent, not actual. That is
exactly why it is cheap to add now: the assertion can be written while the correct answer is zero.

**[repo]** Delivered: `reduceSourceVerificationHistory` emits `counts.staleVerified`; poison suite
locks fail→staleVerified=1 and recover→0. Live probe after reseal: **staleVerified=0** (all TF
claims recovered). Report `/tmp/dg-busy/die-38-probe.md`.

**[repo]** RecruitAI export now binds private `researchEvidence.sourceHistory` counts
(`textStableFlaky` / `staleVerified` / claims / verified) from the sealed benchmark history —
diagnostics only; partner preview still forbids `companyResearch` / `sourceHistory` keys. Report
`/tmp/dg-busy/codex-clay-source-history-bind.md`.

Proposed third state, distinct from verified and absent: **`unverifiable`** — last successful
verification is older than the current run *and* the only thing standing between is transport.
**Kill if:** the count never leaves zero across a week of runs, meaning retry already handles it.

**Bound into the export 2026-07-30 — private diagnostics only.** `researchEvidence.sourceHistory`
now carries the §3.7/§3.8 counts (`claims`/`verified`/`absent`/`unknown`/`staleVerified`/
`textStableFlaky`) through `normalizeSourceHistory`, which rebuilds `counts` from a fixed key list
and returns `null` on any malformed shape rather than inventing a number. It does **not** reach the
partner preview: `sourceHistory` appears zero times in `demigod-lead-sourcer.mjs`, whose `source`
block is a five-field whitelist, and a leak test with research-bearing rows actually inside the
selection returned zero hits. See `/tmp/dg-busy/codex-clay-source-history-bind.md` and
`/tmp/dg-busy/claude-clay-source-history-review.md`.

### 3.6 What I would refuse

- Any global fit score, decomposed or not, before real outcome data exists — **[web]** confirms
  it needs hundreds of tracked hires.
- Natural-language workflow authoring. Sculptor exists; it is not our bottleneck.
- Contact-level intent. Clay's documented gap is a gap for a reason — it is person-level tracking,
  which our non-goals already exclude.

---

## 4. How the three of us actually build these

This section is descriptive before prescriptive: what follows is drawn from what measurably
worked on 2026-07-29, not from a theory of collaboration.

### 4.1 What happened today, as evidence

One chain, start to finish:

1. Claude found HN ingestion keyed ATS-only posts by ATS host, so every such company collided
   on one row and all but the first were silently dropped. Fixed at root, test added.
2. Claude added a cache-boundary guard so a row cached before a host joined the ban list could
   not re-enter the map.
3. **Grok BLOCKED it.** The parse path still accepted four third-party hosts; the guard closed
   one replay path and left the source open. The BLOCK was right and the targeted selftests were
   all green at the time.
4. Codex implemented the wider identity guard, rebuilt, shipped, verified.
5. Claude re-verified independently — live CDN, 0 bad rows — and found that its *own* test had
   become vacuous once the cache was re-collected clean, then fixed that.

Nobody in that chain was redundant, and step 3 is why it worked.

### 4.2 The four rules that produced it

1. **Whoever builds does not certify.** A different agent verifies, executing rather than
   reading. Grok's BLOCK is the load-bearing example.
2. **Verify the verifier, every time.** Today produced four vacuous greens caught by their own
   authors: a route audit that followed redirects, an SEO audit reading only the rendered DOM, a
   badhost test asserting against live data that had been cleaned, and a duplicate-metadata scan
   whose regex matched nothing because Webflow emits attributes in the other order. **A green
   whose subject is empty is the default failure mode here, not an edge case.**
3. **Report the negative result.** "I checked X and it is clean" prevents three agents
   re-auditing it. Several messages today existed only to close a question.
4. **Escalate, do not decide, on anything that is a product or safety call.** Copy policy,
   directory scope, publish authorization. Surface with evidence and a recommendation; let potter
   choose.

### 4.2b What the day actually produced — the tally, so the rules are evidence not opinion

Counted at the end of 2026-07-29. The point of writing these down is that two defect classes
dominate everything else, and neither is a bug in product logic.

| Class | Count | What it looked like |
|---|---|---|
| **Test pins implementation shape, not invariant** | **8** | form-attribution, hero-brand-guard, startup-comp-step (×2), dashboard-events-native-invite, ship-prepare-contract, demand-selftest-isolation, atlas-web route anchor |
| **Vacuous green — the check had no subject** | **5** | route audit following redirects; SEO audit reading only the rendered DOM; badhost test asserting against live data since cleaned; duplicate-metadata scan whose regex matched nothing (attribute order); source-history guard asserting against a cache that had been re-collected |
| Real defect in new code | 2 | Phase 2 gate threw on a null inbox (`param = {}` is not a null guard); churn counter left `undefined` where the read site coerced it to 0 |
| Proposal killed by data | 3 | 3.2 by its own kill condition; 3.3 by `observedOpenDays` max being 3; mechanism #1 parked as unmeasurable |
| Conclusion reversed by measurement | 1 | mechanism #3: assumed low churn → measured 50% → measured 2% at the level that matters |

Three consequences worth keeping:

1. **Every one of the eight went red on a change that was neutral or an improvement.** An assertion
   that pins syntax will eventually punish a refactor, and the cost lands on whoever holds the
   release lane. Assert what must be true, never how it is currently written.
2. **The five vacuous greens were all caught by their own authors**, usually while reading output
   rather than while writing the check. That is why "run it and read the numbers" beats "review the
   code" — a vacuous green looks correct in review and wrong in output.
3. **Two of the three real product decisions could not be closed by any agent** — copy policy,
   directory scope, publish authority. Recognising that early saved re-litigating them; the
   adaptive-form red was left standing 17 iterations deliberately rather than quietly re-expressed.

A fourth, uncomfortable one: **the two defects in new code were both mine**, found by reading my own
output after the tests passed. Neither would have been caught by more careful writing; both were
caught by looking at what the code actually emitted.

### 4.3 Division that matched capability

| Agent | Held today | Why it fits |
|---|---|---|
| **Codex** | Implementation and shipping — foot-core, map rebuilds, Webflow publish | Holds the release lane and the locks |
| **Grok** | Adversarial review, gate blocking | Produced the one BLOCK that mattered; reviews without owning the code |
| **Claude** | Cross-cutting verification, root-cause hunting, instrument repair | Found the blind spots *in the checking tools themselves* |

Inference, not established: this split works because the reviewer has no sunk cost in the
implementation. It is worth preserving deliberately rather than by accident.

### 4.4 The mechanism to add: a novel-feature proposal has to survive the same gauntlet as code

Proposals are currently prose in messages and get accepted by agreement. Code is not — it is
attacked. Apply the code standard to proposals:

1. **Proposer** states the mechanism, the kill condition, and which existing decision it collides
   with. Section 3 above is written in that shape deliberately.
2. **Adversary** (a different agent) tries to kill it — cheapest disproof first, using repo data
   rather than argument.
3. **Implementer** builds only what survives, behind the existing gates.
4. **Verifier** (a third agent) executes the kill condition against the built thing.

The asymmetry that makes it work: **proposing is cheap, killing is cheap, building is
expensive.** Today's cost of a bad proposal is a build; under this it is one query.

---

## 5. Open questions this doc does not answer

1. Does re-verification decay (3.1) survive real page churn? Unmeasured.
2. Is the role-ledger conflict signal (3.3) real or board hygiene? **Measured — board hygiene.**
   See §3.3 KILLED + `/tmp/dg-busy/die-33-falsify.md`.
3. Does the market's move to claim-level citation erode our evidence position faster than
   re-verification differentiates it? Judgement, not measurable yet.
4. Should the directory carry non-startups? Grok flagged it; the repo's own `isMegaCorp()` rejects
   7 rows admitted via other sources, contributing 1.2% of the role count. Scope call, unresolved.

---

## Sources

Web, 2026-07-29:
[Clay — Account Research Agents](https://www.clay.com/blog/account-research-agents) ·
[Clay — Claygent](https://www.clay.com/claygent) ·
[Clay review, Lindy](https://www.lindy.ai/blog/clay-review) ·
[What Clay really does, Amplemarket](https://www.amplemarket.com/blog/what-does-clay-really-do) ·
[Claygent in 2026, Databar](https://databar.ai/blog/article/claygent-in-2025-how-clays-ai-research-assistant-works) ·
[Top AI assistants for accurate source citations, Glean](https://www.glean.com/perspectives/top-ai-assistants-for-accurate-source-citations) ·
[Explicit Evidence Grounding via Structured Inline Citation Generation](https://arxiv.org/pdf/2606.07130) ·
[Explainable AI for recruiting: the match score problem, heymilo](https://www.heymilo.ai/blog/ai-match-score-problem-explainable-screening) ·
[AI recruiting tools comparison 2026, Treegarden](https://treegarden.io/blog/ai-recruiting-tools-comparison-2026/) ·
[AI recruiting platform comparison 2026, Mokka](https://www.gomokka.com/resources/choosing-ai-recruiting-partner.html) ·
[AI recruiting tools, Juicebox](https://juicebox.ai/blog/ai-recruiting-tools)

Repo: [ROADMAP](ROADMAP.md) · [CONTRACTS](CONTRACTS.md) · [SPEC](../../DEMIGOD-DIE-SPEC.md) ·
[competitive landscape](research/COMPETITIVE-LANDSCAPE.md) ·
[synthesis](research/SYNTHESIS.md) · [DIE brief](../../DEMIGOD-DIE-BRIEF.md)
