# Loop iteration CE — gamify the thing that is hard, not the thing that is easy

## What the research says, before designing anything

Four searches, and they converge on a warning rather than a recipe:

- **"BPL gamification"** — bolting Badges, Points and Leaderboards onto an unchanged
  experience — is named in the literature as *the* reason gamification underperforms. Adding
  a leaderboard to the current product would be exactly this.
- **Leaderboards demotivate the majority.** Ranked 3,847th globally there is no visible path;
  ranked 12th with 11th in reach there is a closable gap. Global boards backfire. For people
  performing poorly, a leaderboard is negative feedback and social pressure, which lowers
  intrinsic motivation.
- **Overjustification (Deci 1971).** Extrinsic rewards crowd out the interest that was
  already there, leaving people *less* motivated once the points stop. Reward people for
  making calls and they will make calls for points rather than conviction.
- **Streaks work through loss aversion** — losing hurts roughly twice as much as gaining
  feels good — with the inflection around **day 7**. But the durable version is identity
  ("I am someone who keeps this"), not fear.
- **Crypto specifically:** points and quest programs attract Sybils and mercenaries. Galxe
  needed soulbound Passports to filter bots. Farming is not usage.
- **Backfire modes** are cheating, sabotage, reactance and goal displacement — people
  optimise the metric rather than the thing. Badges, leaderboards, competitions and points
  are the elements most often reported as causing harm.

Add the constraint I already established from Tetlock: **accountability for outcomes people
do not control produces escalating commitment to bad calls.** That is the disease this
product exists to treat.

## The design problem, stated precisely

Every obvious mechanic here is actively harmful:

| Obvious idea | What it actually produces |
|---|---|
| Leaderboard of who was right | escalating commitment; the exact pathology |
| Points per card written | Sybil spam; overjustification; volume over conviction |
| Badges for winning calls | goal displacement — safe, vague, unfalsifiable theses |
| Global rank | demotivates everyone outside the top |

So the task is not "add gamification." It is to find the behaviour that is genuinely hard,
genuinely good, and currently unrewarded — and make *that* the scoreboard.

## Task 1 — identify the right thing to score, and defend it

I think it is **settlement**: did you come back and settle the call you made? Not did you win.

The reasoning to check rather than assume:
- It is process, not outcome — which is what Tetlock's evidence supports.
- It is entirely within the person's control, so it cannot produce escalating commitment.
- It is hard in exactly the way that matters: the temptation is to ghost a losing call.
- The `UNSETTLED` state from `DASHA-SPEC-SETTLEMENT.md` already exists and is currently
  displayed as information. Making it the thing you lose is a one-concept change.

Then push on it. What does scoring settlement incentivise that is bad? At minimum: writing
easily-settled trivial conditions, and writing short horizons to farm settlements faster.
Say how the design handles both, or admit it does not.

## Task 2 — invert the status hierarchy, deliberately

The highest-status artifact in this product should be **a call you were publicly wrong about
and honoured anyway.** Every competitor shows winners. If being visibly wrong is the
prestigious thing here, the product cannot be farmed by people optimising for looking right,
and it is the CHI 2026 "reflexive self-correction" marker implemented as a status symbol.

Design the badge or marker that carries that, and make sure it reads as respect rather than
as a scarlet letter. This is a copy problem as much as a mechanics problem — get the wording
right or it will feel like punishment and nobody will opt in.

## Task 3 — the streak, scoped so it cannot become the point

Streaks are the strongest mechanic in the research and the easiest to corrupt. Define what
breaks it and what does not. A streak of *days opened the app* would be pure engagement
farming and contradicts a product whose honest position is that you should use it rarely and
deliberately.

Anchor it to settlement, and be explicit that missing a day is not a failure — only ghosting
a call is. If the mechanic would ever make someone feel bad for not opening the page, it is
the wrong mechanic.

## Task 4 — solve identity, or say the leaderboard cannot exist

There is no account and nothing is uploaded. **A leaderboard requires identity, so it cannot
exist under the current architecture.** Do not hand-wave this.

The one credible path is the one already in the settlement spec: the card gets posted
publicly, and the platform provides both the timestamp and the identity. Work out whether
that is sufficient, what it costs, and what the Sybil exposure looks like — the crypto
research is unambiguous that anything farmable will be farmed.

If the honest answer is "no leaderboard until posting is the flow", say that plainly.

## Task 5 — cohorts, not a global board

Where a ranked view is warranted, use small comparison sets so the gap is closable. The
research is specific: 12th of 20 with 11th in reach motivates; 3,847th of anything does not.

## Task 6 — write it as a design doc with the evidence attached

Every mechanic proposed gets the reason it will not backfire, cited. A gamification spec
without the failure analysis is how BPL gamification gets shipped, and the failure analysis
is the entire value of having done the reading.

State plainly which mechanics I am **rejecting** and why. That list matters more than the
accepted one — it is what stops someone adding a wins leaderboard in three weeks.

## Constraints

- No code this run. Design deliverable only.
- Nothing that rewards volume of cards written.
- Nothing that ranks people by whether they were right.
- No mechanic requiring daily engagement with a tool meant to be used deliberately.
- Every accepted mechanic names the research that supports it and the backfire it avoids.
- If a mechanic cannot exist under the current no-account architecture, say so rather than
  quietly assuming a server.
