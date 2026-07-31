# Claude next-work prompt — 2026-07-31

**Written by:** Claude, for Claude (or any agent picking up this lane).
**Status:** non-normative. The current user request, live receipts, `AGENTS.md`, `DEMIGOD-AGENTS.md`,
and `DEMIGOD-DIE-SPEC.md` all override this file.
**Lane:** per `CLAY-DIE-MULTI-AGENT.md` §6.1 — architecture honesty, adversarial path audits,
kill-condition writing. Grok holds implementation/shipping; Codex holds adversarial gate review.

---

## 0. Verified state (checked 2026-07-31, not remembered)

| Fact | Value | How to re-check |
|---|---|---|
| Local suite | 484/484 | `node --test --test-concurrency=4 *.test.mjs` |
| `verify-all` | pass, failed 0 | `node demigod-verify-all.mjs` |
| **CI** | **460/460 hermetic, 9 excluded** | `gh run list --limit 1` |
| Site | disk==live v859, shipped=true | `bin/dg truth` |
| Remote | everything pushed, 0 ahead | `git log origin/<branch>..HEAD` |
| Gates untracked | **0** (was 26) | `node demigod-import-integrity.mjs` |
| Role ledger | 13,298 roles · 12,394 open | `jq '.updatedAt' DEMIGOD-ROLE-LEDGER.json` |
| Posting-date recycling | **0 observed — instrument has no data yet** | `summarize().postedDateRecycled` |
| Poll timer | installed, next ~00:17 PDT | `systemctl --user list-timers` |
| Directory | median posting age + percentile live, 80 companies | `node demigod-hiring-freshness.mjs` |

**Do not copy these numbers forward.** They are dated. Re-run the commands.

---

## 1. Boundaries (non-negotiable)

**Forbidden regardless of how useful it looks:**
- Clay clone, recipe DSL, graph-DB platform, public company-research SaaS
- Brokered / login-gated / inferred people data; guessed emails or phones
- Inferred product pricing; a global fit or quality score
- Automatic match, consent, intro, or outbound of any kind
- Work on the archived game
- Claiming intent from data. We observe posting age; we never assert an employer
  "doesn't intend to hire". No "ghost job" verdict in any shipped surface.

**Requires explicit current-request authorization:** publishing, CDN ship, Webflow paste, money,
durable CRM/pair mutation, broad `git add`. Standing grants from older notes authorize nothing —
but note the user granted publish + tracking authority in the 2026-07-30 session; confirm it still
applies before assuming.

**Out of my purview entirely:** roles, GTM, outreach, demand. The user was explicit. Build systems,
website, and technical things. Do not reason about product gating on accepted roles.

---

## 2. Method (the part that actually matters)

Five times in one session, verification corrected a confident claim of mine — a fabricated "93%
inflation", three phantom route mismatches, a wrong "no npm ci needed", a wrong "437 files would
leak", a wrong "agent-tools-lib has no test". None were caught by re-reading code. All were caught
by running something with a control.

**Therefore:**

1. **Every check gets a poison control.** Break the logic, watch the exact assertion fail, restore,
   verify the sha. A check that has never failed is not known to work. Confirm the poison trips the
   assertion you *intended* — twice this session a poison tripped a different one and hid a
   coverage hole.
2. **A baseline must pass.** Before trusting a probe that reports "all attacks fail closed", prove
   the untampered case is *accepted*. My first export probe rejected everything including the
   baseline and proved nothing.
3. **Attribute before claiming.** Three agents write this tree. Before calling a failure yours or
   theirs: check mtimes, revert *only* your change, re-run. I mis-attributed roughly six findings
   before adopting this.
4. **Read the artifact users get.** Served HTML ≠ rendered DOM. `bin/dg truth` proving
   `live body == disk` proves bytes, not that a human sees anything.
5. **Grep the shared tail, not the symbol name.** Duplicated constants here have *different names*
   and *different ranges*; a name-based search finds one of six.
6. **Assert invariants, not shape.** The two dominant local defect classes are tests pinning
   implementation shape and vacuous greens. Never pin an exact list that a legitimate addition
   would break.

---

## 3. Work queue

### 3.1 — Measure posting-date recycling *(do this first)*

**Why:** The directory publishes a median posting age per company. That rests on Greenhouse
`first_published`, and ATS platforms auto-renew listings on 30–90 day cycles. The ledger stores the
earliest date and never moves it, so published ages are an honest **lower bound** — but until
2026-07-30 the recycling was silently discarded and unmeasurable. The counter now exists and reads
zero only because no poll has run since it was added.

**Do:** run one poll (`node demigod-role-ledger.mjs poll`), then read
`summarize().postedDateRecycled` and the distribution of `postedDateChangeCount`.

**Interpretation, decided in advance so the result cannot be rationalized:**
- **> ~10% of dated roles recycled** → the public median is materially understated. Qualify the
  directory copy (e.g. "posted at least Nd ago") and say so plainly.
- **1–10%** → note it in the tool's `--json` output; leave public copy alone.
- **< 1%** → the claim is stronger than we can currently assert; record the measurement and stop.

**Acceptance:** a number, a decision applied, and the reasoning written down. Not "it looks fine".

**Trap:** the first poll gives *prevalence* (roles currently drifted from our floor), not a *rate*.
Rate needs two or more polls. Do not report the first census as a rate.

### 3.2 — Evidence scoping and ignore-filters — **DONE by Grok (quote-window-v1)**

**Why:** measured 2026-07-29 — 24 of 48 pages changed `sha256` in four hours while all 142 quotes
still matched. Body hash tracks CSRF tokens, render timestamps, analytics nonces. `textSha256` over
visible text was the right instinct; changedetection.io's **CSS/xPath scoping + ignore-filters** are
the mature form. Hash the region the quote lives in, not the page.

**Superseded 2026-07-31:** Grok shipped a +/-256 char window around the accepted quote
(evidenceTextSha256, EVIDENCE_TEXT_HASH_VERSION). Better than the CSS/xPath proposal — no selector
or config system at all. Do not rebuild.

**Original acceptance:** churn measurably drops on a re-run over the same corpus, with the before/after
numbers recorded. Quote-match behaviour must be unchanged — poison it to prove a moved quote still
fails.

### 3.3 — Append-only, hash-chained receipt log

**Why:** `company-research-source-history.json` is a mutable file. Rekor's idea is that a receipt
cannot be quietly rewritten. This makes "green" unforgeable rather than merely checked, which is the
threat the spec already worries about.

**Trap:** must not break `reduceSourceVerificationHistory`'s deliberate design — counts describe the
whole store, not the batch, and an empty batch must never zero a populated store. Two poison tests
freeze that. Do not "fix" the counts.

### 3.4 — Failure fingerprinting

**Why:** Sentry's best idea. Recurring flakes currently cost a fresh diagnosis every time — this
session lost real time to exactly that, and §3.8 of the innovation doc records 13 transport failures
against 2 flaky URLs. Group by (source, failure class) so a repeat is one tracked object.

### 3.5 — The 9 excluded CI tests

**Why:** they need gitignored PII SoRs, installed systemd units, or local pause state. Excluded and
printed, not hidden. If any becomes hermetic-able with a fixture that invents no data, reclaim it.
**Do not** commit PII or fake a fixture to turn one green.

### 3.6 — Entity-resolution explainability

**Why:** company identity spans YC, Wikidata, HN and seven ATS namespaces. Fuzzy merges are
forbidden, so the transferable part from Splink/Zingg is *explainability and abstention*: show why
two rows might be one company, never auto-merge, queue ambiguity for review.

---

### 3.7 — Wire the reporters into a continuous surface — **2 of 4 DONE**

Four reporters exist and NONE run on a schedule: `hiring-freshness`, `roles-feed`,
`source-flakiness`, `identity-review`. A reporter nobody runs finds nothing, so their real value is
currently zero. `demigod-control-board.mjs` (Grok's) is the right home — `control(id, severity, ok,
reason, evidence)` is a clean seam.

Two are ready to wire as one-liners today:
- `hiringFreshness().corpus.claimQualificationNeeded` — already a computed boolean against a
  pre-committed 10% threshold. When it flips true, a live public claim needs qualifying.
- `identityReview().counts.reviewCandidates` — currently 6; each is a possible duplicate row in a
  directory that publishes a company count.

**Done 2026-07-31:** posting_age_claim_qualified and directory_identity_candidates are live in
demigod-control-board.mjs (18 controls). Verified on the  path, not just the selftest.
Still unwired: roles-feed (an artifact, not an invariant) and source-flakiness (wire when a
recurring flake actually costs someone time).

## 4. Explicitly do NOT do

- Do not add a test to raise a count. The dominant defect class here is bad checks, not missing ones.
- Do not consolidate duplicated code while a peer is mid-edit in those files. Check mtimes first.
- Do not run `git add -A` without the sensitive-path and >90MB scans. Both have already caught real
  problems (a 192MB AppImage; an unignored draft carrying a third-party address).
- Do not touch `demigod-foot-core.js` without the foot lock, and remember a refused claim looks like
  success.
- Do not trust a CDN upload as a ship. Live loads a *pinned commit*; the Webflow paste is what
  repoints it.
- Do not re-litigate `sourceHistory` counts, the `categorizeRole` taxonomy (potter's call), or the
  benchmark's frozen 0.90/0.95 thresholds.

---

## 5. Definition of done for any item

1. The failing invariant is named, with a receipt that proves it.
2. Root cause fixed once, where all callers route through — not per caller.
3. One runnable check, poison-verified to fail on the exact intended assertion.
4. Local suite + `verify-all` green; CI green.
5. Attribution checked if anything unrelated broke.
6. Committed with the reasoning, pushed. Peer modules tracked if a tracked file imports them.

---

### 3.8 — The crawlable directory is not crawlable *(found 2026-07-31, needs a product call)*

**Measured, not inferred.** `curl https://www.trydemigod.com/startups` served HTML contains:
- 0 occurrences of `OpenAI`, `Databricks`, `Anthropic`, `Stripe`, `Neuralink`
- 0 occurrences of `dg-dir-list`, `median posting`, `open roles on`, `longest tracked`

Rendered DOM has 20 company rows, so **users are fine and crawlers see nothing**. The directory is
the largest content asset we have (2,735 companies) and it is invisible to any crawler that does not
execute JS.

`sf-startups-static.html` was built to close this and **nothing deploys it** — grep found only
producers (`demigod-enrichment.mjs:293`, `demigod-directory-refresh.mjs:26`, a `verify-all`
selftest). At 518,658 bytes it is ~10x the ~50k embed ceiling, which is the likely reason it never
shipped. The generator reported `{ok:true}` either way; it now reports `deployable` and warns.

**Not fixed here, deliberately.** The three options trade off against each other and the choice is
not a generator's to make:
1. Trim to top N companies — fits, but publishes an arbitrary subset
2. Paginate into per-letter or per-segment pages — most SEO value, most surface area
3. Serve from the CDN — cheapest, but off-domain and worth little for SEO

**Trap for whoever takes it:** `bin/dg truth` reporting `live body == disk` proves bytes match, not
that a crawler sees content. Two redirect layers sit in front of `/startups` (Webflow 301s + the
`dg-path-redirects` head shim that rewrites even 200 pages to `/?p=`) — read the shim before
rewiring the route.

**Also:** `demigod-tools-registry.mjs:111` describes the generator as emitting "JobPosting/ItemList
JSON-LD". It emits ItemList only; the JobPosting guard is deliberate (we do not own those roles).

### 3.9 — Producers with no deployer *(the pattern behind 3.8)*

Three separate producers generate correct output that never reaches a user. This is one defect
class, not three bugs, and it is worth checking for whenever a "we already built that" claim shows up.

1. **`sf-startups-static.html`** — 518KB, generated every refresh, deployed by nothing (3.8).
2. **`startupsSeo(map)` in `demigod-site-health.mjs`** — derives the exact `/startups` title, og:title
   and description from the map so no human retypes a count. **It has no caller.** `grep -n
   'startupsSeo('` outside site-health returns nothing; it exists only for its own selftest.
   Consequence, measured 2026-07-31: live head claims **2,737 companies / 339 hiring**, disk map
   holds **2,735 / 338**. `startupsSeoDrift` correctly reds — and will red forever, because the
   deriver was never wired to a publisher.
3. **Reporters from 3.7** — `roles-feed` and `source-flakiness` still run on no schedule.

**Do not "fix" #2 by hand-editing the live head.** The map churns on every refresh, so a manual
correction is stale within hours and the gate goes back to red. The real fix wires `startupsSeo(map)`
into whatever republishes page SEO. That needs the Webflow MCP, which was **not available in the
2026-07-31 session** (no webflow tools in the deferred set) — check availability before planning it.

**Design tension to settle first, because it decides the shape of the fix:** exact counts in indexed
metadata go stale on every refresh by construction. Either the publish is driven by the refresh, or
the copy stops claiming an exact number. Picking "republish on every refresh" means a Webflow publish
per refresh — check the rate before committing to it.

**Ruled out, do not re-investigate:** canonical tags. Absent from served HTML *by design*
(`demigod-site-health.mjs:19-21`); foot-core injects them at runtime and they correctly consolidate
`/pilot` and `/founders` onto `/hire` and `/network` onto `/talent`. Verified via CDP 2026-07-31.
The 26-of-32 sitemap URLs that the head shim bounces are already reconciled by those canonicals.

**Instance #4, found 2026-07-31 by auditing my own ship:** `roles-feed.json` is genuinely live —
`https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@8d5a78a017ee/roles-feed.json`, HTTP 200, 54,018
bytes, sha256 `50fdb73e…` matching the manifest exactly, `demigod.roles-feed/1`, 200 roles. And it is
**undiscoverable**: `demigod-foot-core.js` has 0 references, no page links it, it is absent from
robots.txt and sitemap.xml. Only the generator, the publisher, and the tools registry mention it.
A correct public artifact nobody can reach is the same defect as one that was never uploaded.

**Verification note worth keeping.** My first hash check reported a MISMATCH. It was wrong: `$(curl …)`
strips trailing newlines, so I hashed 54,017 of 54,018 bytes. `curl -o file` then `sha256sum file`
matched. Never hash a command substitution — the shell mutates the subject before you measure it.

**Gap this leaves:** the publisher verifies every asset at PUBLISH time (`fetchExact` per asset, and
it correctly refuses to advertise an asset that does not resolve). Nothing re-verifies afterward, so
post-publish CDN drift or a dropped asset is invisible until someone checks by hand. And nothing
checks whether an advertised asset is *referenced* by anything — which is how #4 happened.

**Next action for this lane (not a new check — make one artifact reach users):** wire foot-core to
consume `rolesFeed` from the manifest and surface recently-observed roles on /startups. That converts
a live-but-orphaned asset into a feature. Needs the foot lock and a CM6 paste; the paste path DOES
work — `ship: directory sort control live` (2fa62fe) went out that way this session, so this lane is
not blocked on the missing Webflow MCP.
