---
status: reference
---

# Dasha documentation system backlog

**Updated:** 2026-08-08  
**Status:** Operational improvement backlog. This file owns documentation-system work; it does not own product priorities.

## Objective

Make it possible for a person or agent to answer five questions quickly:

1. What is Dasha now?
2. What is live, staged, experimental, historical or dead?
3. Which file owns each kind of truth?
4. What evidence supports the current decision?
5. What is the next authorized action and its verification gate?

## P0 — stop contradiction and drift

- [x] Reduce active product ownership to one brief and one roadmap; strategy alternatives are historical or gated.
- [x] Make `DASHA-DOCS.md` the only active entry page; the dated Doc-of-Docs is an exhaustive snapshot.
- [x] Add machine-readable lifecycle metadata to canonical owners and the highest-risk superseded directions.
- [ ] Define one controlled status vocabulary and remove synonyms such as prepared/current/active/checkpoint when they mean the same thing.
- [x] Remove the mutable publication matrix from the workflow; manifest/live commands now own current state.
- [ ] Move deployment facts out of product strategy and into the deployment runbook.
- [ ] Move voice and palette facts out of strategy documents and into the Bible/art-direction owners.
- [ ] Move metrics and gates out of brainstorm documents and into the roadmap owner.
- [ ] Mark every dated research file as evidence, decision record, review or history—never simply “current.”
- [x] Add visible warnings and lifecycle metadata to the highest-risk scrapped documents.
- [ ] Remove links in current docs to deleted public-repo research files.
- [x] Resolve Discord as historical; Lobby is the current community surface.
- [ ] Resolve contradictory claims about whether Simp Board is live, prepared or merely specified.
- [ ] Keep public repository docs scoped to the Desk; do not leak private product speculation into its roadmap.

## P1 — make navigation obvious

- [ ] Add a three-line “read this next” path at the top of every owner document.
- [ ] Give each major doc a one-sentence ownership boundary: what it owns and what it must not repeat.
- [ ] Add a topic-to-owner table for product, roadmap, voice, art, licensing, deployment, verification, community and research.
- [ ] Add audience labels: public contributor, operator, product strategy, design, research or archive.
- [ ] Add a compact directory tree to the entry map.
- [ ] Add backlinks from research decisions to the brief and roadmap sections they changed.
- [ ] Add forward links from the brief and roadmap to their supporting evidence.
- [ ] Use stable filenames for owners and dated filenames for snapshots.
- [ ] Create one archive index that explains why each retired direction died.
- [ ] Separate “possible someday” from “next if evidence appears.”
- [ ] Replace exhaustive tables in the entry page with summaries linking to the registry.
- [ ] Add a glossary for Transmission, Studio artifact, remix parent, canon, association, endorsement and holder proof.
- [ ] Add a claims ledger linking public claims to evidence and allowed wording.
- [ ] Add a routes/surfaces map linking each live URL to source, test and deploy procedure.

## P1 — improve research quality

- [ ] Use a standard research-note template: question, date, sources, evidence, inference, decision impact and residual uncertainty.
- [ ] Label primary, secondary, academic and community-anecdote sources separately.
- [ ] Record publication date and access date for unstable sources.
- [ ] Preserve direct URLs and avoid uncited numerical claims.
- [ ] State when an academic result has a narrow population, simulated environment or short duration.
- [ ] Separate “source says” from “Dasha implication.”
- [ ] Add a confidence field to product-relevant conclusions.
- [ ] Add explicit falsifiers to every product hypothesis.
- [ ] Time-box freshness for market, platform, API and social-account facts.
- [ ] Recheck external links automatically and report redirects separately from failures.
- [ ] Prefer official product documentation for feature claims and papers for behavioral claims.
- [ ] Keep weak community signals as discovery leads, not final evidence.
- [ ] Record negative findings so future agents do not repeat dead searches.
- [ ] Add a small bibliography grouped by topic rather than duplicating source lists across files.

## P1 — make decisions durable

- [ ] Introduce short Architecture/Product Decision Records for irreversible or cross-document choices.
- [ ] Give each decision a stable ID, status, context, choice, alternatives and reversal condition.
- [ ] Record why a direction was rejected, not merely that it is dead.
- [ ] Connect roadmap branches to the decision records that activate them.
- [ ] Record authority boundaries for publishing, public claims, spending and community moderation.
- [ ] Add a decision log to the docs entry page with newest decisions first.
- [ ] Distinguish a working default from a verified fact and hard constraint.
- [ ] Give experiments a named owner, start condition, end condition and evidence location.
- [ ] Require kill criteria before an experiment begins.
- [ ] Close completed experiments with a result note rather than leaving their spec “current.”
- [ ] Never allow a brainstorm to silently become a roadmap commitment.

## P1 — connect docs to verification

- [ ] Add a small machine-readable manifest mapping public routes to sources, tests and owners.
- [x] Test that every local file linked from `DASHA-DOCS.md` exists.
- [x] Test that every canonical owner has required metadata and unique ownership.
- [ ] Test that no current document links to known scrapped surfaces.
- [ ] Test that forbidden claims and retired product terms stay out of live-copy sources.
- [ ] Check mint consistency across every public and operational source.
- [ ] Check that live-state sections carry a verification timestamp.
- [ ] Generate link-check output as a report, not by rewriting documentation.
- [ ] Verify headings and anchors used by cross-document links.
- [x] Add docs checks to the existing product-coherence test and `dasha:test:all`; no second framework.
- [ ] Keep generated status data visibly generated and prohibit hand edits.
- [ ] Store current verification receipts separately from narrative docs.

## P2 — reduce maintenance cost

- [ ] Archive dated audits after their findings are resolved or transferred to owners.
- [ ] Merge overlapping product strategy and product brief material.
- [ ] Merge overlapping Docs and Doc-of-Docs roles if agents continue treating both as entry pages.
- [ ] Delete one-use prompt documents after their reusable parts move into a template.
- [ ] Move raw multi-agent transcripts out of the default reading path.
- [ ] Remove duplicated live-state paragraphs from research and review documents.
- [ ] Replace copy-pasted mint, URLs and site IDs with links to one reference source where practical.
- [ ] Keep public docs concise enough for first-time contributors; link to depth rather than embedding internal history.
- [ ] Apply an explicit retention policy: owner, decision, evidence, receipt, archive or delete.
- [ ] Run a quarterly contradiction audit rather than continuously adding reconciliation notes.
- [ ] Add a “last reviewed” field distinct from “last edited.”
- [ ] Assign freshness windows by doc type: live receipt hours/days, platform research weeks, strategy until superseded.

## P2 — make contribution documentation welcoming

- [ ] Add a visual “first contribution” path from issue to local preview to pull request.
- [ ] Provide one browser-only documentation contribution path.
- [ ] Add examples of acceptable non-code contributions: attribution, archive research, copy corrections and accessibility review.
- [ ] Define what evidence a contribution must include.
- [ ] Explain generated files and sources of truth in one place.
- [ ] Label issues by skill, expected time, impact and review availability.
- [ ] Add a maintainer response-time expectation only when it can be honored.
- [ ] Add a contributor recognition policy before awarding points.
- [ ] Document how contributors can correct attribution or request removal.
- [ ] Add a path from repeat contributor to reviewer or maintainer.
- [ ] Include an AI-assisted contribution policy emphasizing comprehension and accountability.
- [ ] Keep setup dependency-free where the project already supports it.

## P2 — community and moderation docs

- [ ] Publish concise community rules before opening submissions.
- [ ] Create a moderator handbook covering scope, escalation, copyright, impersonation, harassment and financial promotion.
- [ ] Define how a Transmission is proposed, selected, opened and closed.
- [ ] Define the first-contribution acknowledgement window and response owner before opening a Transmission.
- [ ] Define submission reuse terms in plain language.
- [ ] Define sourced fact, project continuity, featured work and community fiction separately; do not imply official canon.
- [ ] Document editorial selection and conflicts of interest.
- [ ] Document score corrections, appeals and seasonal resets before automated ranking.
- [ ] Keep wallet and holder information private by default.
- [ ] Document incident response for malicious links, fake mints and impersonation.
- [ ] Maintain one official-links page and never infer a community channel from token metadata.

## P3 — polish and discovery

- [ ] Add concise descriptions and search keywords to top-level docs.
- [ ] Add diagrams only for relationships that prose cannot show clearly.
- [ ] Use tables for exact ownership mappings and prose for decisions.
- [ ] Add examples immediately after abstract rules.
- [ ] Standardize headings so agents can search reliably.
- [ ] Use sentence-case headings and consistent terminology.
- [ ] Add a changelog only for meaningful decisions, not every wording edit.
- [ ] Generate a public docs landing page only if repository navigation becomes insufficient.
- [ ] Add RSS or release notes only after an external audience exists.
- [ ] Translate contributor entry docs only after non-English participation appears.

## Definition of done for the docs system

- A new agent reaches the correct source of truth without reading a dated audit.
- Two current documents never own the same mutable fact.
- Every product commitment has evidence, a decision owner and a reversal condition.
- Every live claim has a timestamped verification path.
- Every retired direction is clearly historical or scrapped.
- Public contributors see only the context necessary to contribute safely.
- Documentation checks fail on broken navigation, stale prohibited claims and source-of-truth violations.
