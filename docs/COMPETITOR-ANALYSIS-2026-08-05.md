# Competitive analysis — adopt / cut / wedge

Executed against `COMPETITOR-DEEP-RESEARCH-PROMPT-2026-08-05.md`. Round 1 of the
research; open questions listed at the end.

---

## The pricing landscape, with Demigod placed in it

| Player | Model | Rate | Who does the work |
| :--- | :--- | :--- | :--- |
| Dover | hourly, no placement fee | $300–$30,000 / hire | contract recruiters |
| **Jack & Jill** | contingency | **10%** | **AI agents** |
| **Demigod** | contingency | **10%** | **one human, every profile** |
| Traditional agency | contingency | 15–20% | human recruiters |
| Pallet | contingency | 20% | community + creator networks |
| **Paraform** | contingency | **20–25%** | **independent human recruiters** |
| Toptal / retained | retained | 25–33% | vetted bench |
| Mercor | take-rate | ~30% | AI vetting at scale |

**The comparison that matters is Paraform.** It is the closest structural analogue
to Demigod — human recruiters doing real sourcing and screening, with software as
leverage — and it charges **20–25%**. Demigod charges 10% for the same category of
labour, matching the price of the most heavily automated player in the set.

Paraform's funding trajectory suggests the model works at that price: $3.6M seed
(Apr 2024) → $20M Series A (Jun 2025) → $40M Series B (Mar 2026).

## The Mercor finding — the biggest strategic signal in the set

Mercor is the category's headline success: **$10B valuation, $614M gross revenue in
H1 2026, ~$2B annualised run rate**, now reportedly raising at $20B.

But **over 90% of that revenue is not recruiting.** It comes from AI foundation
labs — OpenAI, Anthropic, Google — buying domain experts (doctors, lawyers,
scientists) for RLHF, model evaluation, and data labelling. ~30,000 contractors at
~$105/hr, $2M+ paid out daily.

The recruiting product became an on-ramp to an **expert-labour marketplace for AI
labs**. Permanent placement was not where the money was.

This is worth sitting with, because it says the largest value in "AI recruiting"
was captured by changing the buyer and the unit of work — contract expert hours
sold to labs, not permanent hires sold to startups. Demigod is in SF, adjacent to
those labs, with an events channel into exactly that expert population.

---

## ADOPT — present in competitors, absent in Demigod

### A1. Replacement guarantee — the highest-value gap

**Evidence.** 60/90/120-day replacement clauses are the 2026 standard for
permanent roles. Jack & Jill refunds **in full** if the hire doesn't last 3 months.
Toptal runs a two-week no-risk trial. Demigod offers nothing.

**Why it matters more for Demigod than anyone.** The hardest objection to a service
with zero recorded placements is "why would I trust this?" A guarantee answers it
without a track record — it converts an unprovable claim about quality into a
contractual risk transfer. It also pairs exactly with the causal referral evidence
already in the strategy doc: referred hires quit 10–30% less. If that is the pitch,
a retention guarantee is the natural instrument to sell it with, and the one the
evidence actually supports.

**Build plan** — see §Build 1.

### A2. Employer-visible pipeline state

**Evidence.** Paraform ships a candidate CRM showing every submission's interview
stage, a single view of active roles with recruiter counts and success fees, and
in-dashboard chat. Wellfound ships basic ATS with stage tracking.

**Demigod today.** `demigod-role-packet`, `demigod-pilot-batch`, `demigod-pairs-lib`
and the dashboard on `:9878` hold this state — but the dashboard is explicitly *"an
optional projection of canonical receipts… not a second source of truth"* and is
localhost-only. **The employer cannot see anything.** Every status update is a
manual message.

**Build plan** — see §Build 2.

### A3. Interview scheduling — and a live gap in the market

**Evidence.** Wellfound has Instant Scheduling: specify length and interviewer,
candidate picks a slot, event auto-creates. Paraform explicitly **cannot** schedule
— it only records an interview date. That is a documented hole in the closest
competitor.

**Demigod today.** Nothing. Scheduling happens over email.

**Build plan** — see §Build 3.

### A4. Reprice against the right comparable

Not a feature, but it belongs in the adopt list because it is the highest-value
change per unit of work. Paraform, the structural analogue, charges 20–25%.
Demigod charges 10%. At $180k roles: 10% = $18k, needing ~11 placements for $200k
revenue; 22% = $39.6k, needing ~5.

Options to model: straight 20%; 15% + retainer; fixed engagement fee; or 10% held
as a deliberate wedge with the guarantee (A1) as the differentiator instead. The
research says 10% is the automation price — pairing it with the most manual product
in the set needs a reason, and "we're cheaper" is the weakest available one.

---

## CUT — Demigod has it, nobody else does, and the reason matters

142 registered tools against zero transactions. Pass B asks, for each: is it a
wedge, invisible-but-load-bearing, or work that produced no buyer value?

| Item | Verdict | Evidence |
| :--- | :--- | :--- |
| `cursor-enable-webflow-mcp.mjs`, `cursor-webflow-mcp-toggle.mjs`, `cursor-webflow-enable-deep.mjs` (~18KB) | **CUT** | Puppeteer driving Cursor's UI to click an MCP toggle. Replaced entirely by one `claude mcp add` line, already done. Zero buyer value. |
| `heavy-send-*.mjs` (30+ files) | **CUT, probably** | Agent-to-agent message plumbing. Superseded by `bin/grok-ask` / `bin/codex-ask` / Orca. Needs a check for live callers first. |
| Eat the Sounds game + tests | **already archived** | Out of scope per CLAUDE.md; still in the tree and still in the test suite. |
| Sample-role board machinery | **KEEP, reclassify** | It exists to prevent claiming samples are real. That is honesty infrastructure, not product. Competitors don't need it because they have real inventory. Keep until real roles exist, then it becomes dead weight. |
| Control board / honesty gates | **WEDGE, not cut** | See W2. |
| `demigod-conversion-audit`, `wiz-a11y-audit`, `forms-full-audit`, `button-audit` | **KEEP** | Genuine QA infrastructure; caught a real defect today. Competitors have equivalents internally. |
| 33 sitemap routes → 15 pages | **CUT the aliases** | 18 alias URLs, correctly canonicalised, but each is a page to maintain and a crawl-budget draw for zero incremental content. |

The honest summary of Pass B: most of the 142 tools are **infrastructure for an
operation with no transactions**. They are not badly built — several are better
than what competitors expose — but they were built ahead of the demand that would
justify them.

---

## WEDGE — Demigod has it and a funded competitor cannot simply copy it

The test for each: *what exactly stops a well-funded competitor shipping this next
quarter?*

### W1. Consent-before-identity — and it now has a legal tailwind

*"Names move only after both sides say yes."* No public profiles, no feed, no
blasts, identity private until mutual approval.

**What stops a competitor:** their supply model. Paraform, Wellfound, Mercor and
every sourcing tool depend on browsable candidate inventory — that is how employers
evaluate and how the marketplace demonstrates liquidity. Consent-gating identity
removes the thing they sell.

**The tailwind:** **Eightfold was sued in January 2026** over allegations it
compiled detailed talent profiles from external sources *without candidate
consent*. Consent posture has moved from ethics to litigation. Demigod's mechanic
is the strongest in the set and is already implemented.

### W2. No-score, human-decided, with mechanical enforcement

`structured_hiring_no_score` fails the build if a `fitScore` or `trustScore`
appears anywhere. Combined with the California FEHA ADS regulations (in force since
Oct 2025), where a deploying employer **retains full liability** for a third-party
tool's discriminatory output.

**What stops a competitor:** their entire product is the score. Removing it removes
the automation that justifies their price.

**Honest caveat, carried forward from the earlier assessment:** FEHA applies at 5+
employees, so the seed-stage buyer may be out of scope. This wedge sells to
mid-market and up, and is a reason to consider that segment, not evidence the
current segment cares.

### W3. Owned SF community + events infrastructure

Pallet's whole model is renting *other people's* communities — Lenny Rachitsky,
Pragmatic Engineer, Packy McCormick — and it works ($3.5M paid to communities,
100k+ hired). Demigod would own one.

**What stops a competitor:** nothing structural. This is a wedge only if the
community actually exists and is active. It is the most falsifiable item here and
the events infrastructure is currently down.

---

## Build 1 — Placement guarantee

**User-visible behaviour.** An engagement carries a stated guarantee: if a placed
hire leaves or is terminated within N days, Demigod re-runs the search at no fee,
or refunds. The guarantee, its window, its exclusions, and its claim process appear
on `/pricing` and in the brief confirmation. Every placement records its guarantee
window; expiry is tracked, not remembered.

**Why it fits the architecture.** It is a commitment about *outcome*, not a claim
about candidate quality — so it survives the no-invented-metrics rule. It is the
honest instrument for the retention argument the causal evidence supports.

**Data model.** Extend the pair/placement record with:
`guarantee: { days, startedAt, expiresAt, terms, state: 'active'|'expired'|'claimed'|'honoured', claim: {...} }`.
State transitions are explicit and receipted; no derived or inferred state.

**Files.** `demigod-pairs-lib.mjs` (record + transitions), a new
`demigod-guarantee.mjs` (windows, expiry, claim intake, report), `demigod-control-board.mjs`
(a `guarantee_windows_tracked` control so an expiring window cannot be silently
missed), `/pricing` copy via `demigod-foot-core.js` COPY, and legal terms in the
`/legal` page.

**Gates.** `verify:source`, board-honesty, `structured_hiring_no_score` (the
guarantee must not become a quality score), plus a new unit test asserting a claim
inside the window is honoured and outside is not — proven non-vacuous by flipping
the date.

**Rollout.** Terms and copy first (sellable immediately, zero engineering risk),
tracking second, claim workflow third. The first two are days; the third can wait
until a placement exists.

**What could go wrong.** A guarantee is a real liability. The window and exclusions
need legal review before publication, and the honest failure mode is offering a
guarantee whose claim process doesn't exist yet — which is why terms ship with
tracking, not before it.

## Build 2 — Employer pipeline view

**User-visible behaviour.** Each engaged employer gets a private, tokenised URL
showing only their roles: current stage per candidate (submitted / reviewed /
mutual-yes pending / intro made / declined), what Demigod is waiting on, and what
they are waiting on. No candidate identity before mutual yes — the consent mechanic
holds inside the product surface, which is itself the demo.

**Data model.** Read-only projection of existing receipts. No new source of truth —
`DEMIGOD-COMPRESSED-STATE.md` is explicit that the dashboard is a projection, and
this must be too. Access via signed, expiring, per-engagement token; no accounts,
no passwords.

**Files.** New `demigod-employer-view.mjs` (projection + token mint/verify), a
static render reusing the `demigod-directory-static.mjs` pattern, `demigod-pairs-lib.mjs`
(read only), and a route on the existing events/API surface.

**Gates.** A privacy test asserting no pre-consent identity ever reaches the
projection — the single most important check in this build. Plus token expiry,
scope isolation between engagements, and `verify:source`.

**Rollout.** Static per-engagement page first, live projection second, chat never —
messaging is a separate consent surface and shouldn't ride in on this.

**What could go wrong.** The privacy boundary. A projection bug that leaks a name
before mutual yes destroys the wedge that justifies the whole product. That test
gates the feature.

## Build 3 — Interview scheduling

**User-visible behaviour.** After mutual yes, Demigod proposes times; the candidate
picks; a calendar event is created for both. Paraform can't do this and Wellfound
can, so it is a documented gap in the nearest competitor.

**Files.** New `demigod-schedule.mjs`; Google Calendar via the connector already
configured in this environment; slot state on the pair record.

**Gates.** No event may be created before mutual yes — same consent boundary as
Build 2, asserted in test. Outbound calendar invites are outbound messages and sit
behind the existing authorisation rule.

**Rollout.** Propose-times-by-link first (no calendar write at all), then
auto-create. The first half captures most of the value and touches no external
system.

**What could go wrong.** Calendar writes are outbound actions. This must not become
a path that sends anything without explicit per-request authorisation.

---

## Open questions this round could not settle

1. **Paraform's recruiter economics** — what split do recruiters take of the
   20–25%? Determines whether Demigod could operate *as* a recruiter on Paraform
   for immediate demand, rather than only competing with it.
2. **Mercor's expert-supply acquisition** — how do they recruit 30,000 contractors?
   That mechanism, not their matching, is the actual asset.
3. Whether any competitor publishes a bias audit — would show whether the
   compliance wedge is already contested.
4. Actual conversion and time-to-hire numbers behind the marketing claims. All
   speed claims here are claims.
5. Whether the SF community exists in a form events can activate. Falsifiable, and
   the events stack is down.
