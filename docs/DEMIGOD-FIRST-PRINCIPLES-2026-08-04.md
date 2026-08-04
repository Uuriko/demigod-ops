# Demigod — first principles, and what my own research got wrong

Written after reading trydemigod.com for the first time. The prior three parts
were built on sources; this one is built on the facts of the operation, and it
overturns several of my own conclusions.

---

## The facts, stripped of narrative

1. **One person.** Potter plus agents. Not a team. This is the binding constraint
   on every other decision and most of the analysis so far ignored it.
2. **Zero transactions.** `boardRoles=3, all sample` · `pairs real=0` ·
   `acceptedForDelivery=0`.
3. **142 tools, 1244 tracked files, 496 tests**, control boards, honesty gates, a
   guarded ship spine, a dashboard, an events bot, systemd timers.
4. **Price is live and it's 10% on hire.** (Part 1 said no price was committed —
   wrong. It's on the site.)
5. The site is a **two-sided self-service marketplace**: dual CTAs, intake forms
   for both sides, a three-step process.

The single most legible fact: **item 3 exists and item 2 is zero.**

---

## The uncomfortable first-principles read

A marketplace is a liquidity business. Nothing else about it matters until
liquidity exists. Demigod has none, and has instead accumulated more internal
infrastructure than most funded startups carry — control boards, honesty gates, a
142-entry tool registry, an audit spine.

Every one of those is well-built. Several are genuinely admirable — the
no-committable-SoR guard, the vacuous-green discipline, the receipts culture.
None of them produce a customer.

I've been phrasing this as "the bottleneck is not tooling." That was too soft.
Stated plainly: **infrastructure at this scale against zero revenue is
displacement activity.** It is the part of the work that is legible, controllable,
and safe, standing in for the part that is none of those — asking a founder for
money.

The audit already priced the carrying cost: 14 failing tests, a guard dead at
import since before the snapshot, a consent check that passed on an empty string
for an unknown length of time. That is what maintaining unneeded infrastructure
costs, and it will grow.

---

## Stress-testing my own research

### ✗ Scarce signaling (§11) — I was wrong, and it was my favourite idea

The AEA mechanism solves **congestion**: thousands of candidates, hundreds of
employers, one synchronised annual cycle, employers skipping candidates they
assume are unreachable.

Demigod has three sample roles and zero real ones. **You cannot have a congestion
problem with no participants.** Signals are scarce and meaningful only when
attention is contested. Here, attention is not contested; it is absent.

I called it "the single most transferable idea in this document." That was
aesthetic enthusiasm, not judgment — an elegant mechanism admired for its elegance.
It is a real idea for a market that is *thick and jammed*. Revisit at ~50
concurrent roles. Not now.

### ⚠ California FEHA (§1) — right finding, wrong customer

The regulations are real and the analysis holds. But FEHA applies to employers
with **five or more employees**, and the natural target — a seed startup making
its first one to three technical hires — is often *below that threshold entirely*,
and is in any case not thinking about ADS liability. They are thinking about
finding someone good, fast, and cheap.

Compliance is a mid-market-and-up concern. So "not an ADS" is not a differentiator
for the stated customer. It is either a later wedge, or it argues for selling to
larger companies — which is a different business with a longer sales cycle.

I mis-assigned a genuine finding to a customer who does not care.

### ⚠ "You have a thickness problem" (§12) — true but close to vacuous

This is "you need customers" in Roth's vocabulary. The one non-obvious part is the
*ordering*: thickness is prerequisite to congestion. Which independently kills the
signaling idea above. Keep the ordering, drop the ceremony.

### ✓ Referral retention (§14) — survives, and is the best finding

10–30% lower quit rate, causal, from nine firms. For a startup's first hires,
early attrition is existential. Defensible and honest.

### ✓ Moderately weak ties (§15) — survives, but it's a refinement

Excellent causal work. But it tells you how to tune a network you already have. It
is not a strategy for acquiring one.

### ✓ Not all referrers are equal + inbreeding risk (§16) — survives

Design guidance plus a real disparate-impact warning. Holds.

---

## What the best configuration actually is

**Demigod is not a marketplace. It is a solo search practice with unusually good
software leverage — and it should stop pretending otherwise.**

A marketplace needs liquidity, scale, and network effects. A solo operator with
taste, an SF network, and strong honesty instincts is a **boutique search firm**.
That is not a downgrade. It is a business that works at n=1 and can actually
reach revenue this quarter.

Configuration:

| Dimension | Marketplace framing (today) | First-principles version |
| :--- | :--- | :--- |
| Product | platform matching two sides | **potter's judgment and network** |
| Software's job | control plane, honesty gates, ship spine | **memory, receipts, time saved** |
| Customers | anyone who fills the form | **3–5 named seed startups** |
| Roles | a board | **1–3 roles each, worked personally** |
| Price | 10% on hire | see below — probably wrong |
| Proof | sample entries | **first real placement** |
| Events | adjacent project | **the only way the network compounds** |

The marketplace becomes a real option after roughly 20–30 placements, when you
know from experience which part is mechanical. Automating before that is guessing.

### The 10% problem

10% is roughly **half the market rate** (contingency runs 20–25%). Three problems,
in increasing severity:

1. **It contradicts the positioning.** "Humans read every profile, curated,
   careful" is a premium claim sold at a discount price. Buyers read price as a
   quality signal; 10% says *cheap*, not *better*.
2. **The arithmetic is punishing.** A $180k role at 10% is $18k. Reaching $200k of
   revenue needs ~11 placements a year. At 20% it needs 5–6. For one person doing
   genuinely manual matching, 5–6 is achievable and 11 is not.
3. **Contingency is a volume model and this is a low-volume operation.** Paid only
   on hire means unbounded unpaid work per unit of revenue, absorbed entirely by
   the one person who is also the product.

A retainer, a deposit, or a fixed engagement fee fits a high-touch low-volume
practice far better. **Charge for the search, not only the placement.** That also
removes the incentive to inflate salary, which the honesty positioning needs.

---

## The website

Its current job is to run a two-sided marketplace: dual CTAs, intake forms for
both sides, a three-step process, a price. That architecture is correct for a
liquid marketplace and wrong for what exists.

**The structural honesty problem.** "GET MATCHED TO SF STARTUPS" plus a resume
form implies there is a pool of roles waiting. There are three, and all three are
samples. No copy is false — the board honesty gate makes sure of that — but **the
site's architecture makes a claim the honesty gates cannot police.** A form implies
a queue. That is the one dishonest thing on the site, and it is structural rather
than textual.

**What is already right, and undersold.** This line:

> *"Names move only after both sides say yes."*

That is the best sentence on the site. It is a genuine consent mechanic, it is
rare, and in market-design terms it is a *safety* property — one of the three
things that determines whether a market functions. It is currently a supporting
detail. It should be the headline.

Also right: "SF Bay Area startups only" (real constraint, real focus) and "humans
read every profile — no spam."

**What the site should be at zero placements.** Its only job is to make *one
specific founder* send an email. That is a different artifact:

- Who potter is, specifically, and why they can do this
- Which roles, at which stage, in which city — narrower than "SF startups"
- The consent mechanic as the headline
- The retention argument, stated honestly: referred and vetted hires quit less;
  for your first three hires that is the whole ballgame
- One CTA. Email. No forms, no dual path, no three-step diagram
- No implication of a pool that does not exist

Candidate intake can stay as a single quiet link. Two-sided self-service is the
right design later and is actively counterproductive now, because it splits
attention and promises liquidity as a side effect of its layout.

---

## What I'd do, in order

1. **Rewrite the site as one page addressed to one buyer.** Consent mechanic as
   headline, retention as the argument, email as the only CTA. A day of work.
2. **Re-price.** Move off 10% contingency toward a retainer or fixed engagement.
3. **Pick five named seed startups** and work them personally. Not a funnel — five
   names.
4. **Freeze tooling.** No new tools until a real placement exists. Every hour on
   the control plane is an hour not spent on item 3.
5. **Keep events running** — it is the only mechanism that compounds the network,
   and the network is the actual asset.

## What to ignore, including from my own research

- Scarce signaling until the market is thick enough to jam
- FEHA positioning until the customer is large enough to care
- Any further matching automation
- The remaining test failures and the MCP work, until there is a customer
- The marketplace framing itself
