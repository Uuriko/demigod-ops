---
status: historical
superseded_by: DASHA-PRODUCT-BRIEF.md
archived: 2026-08-08
---

# Spec — gamification that cannot be farmed

> Scrapped Thesis Card/settlement direction. Historical research only; do not implement.

2026-08-06. Research-backed. Sources at the end.

---

## The one-line answer

**Do not score whether people were right. Score whether they came back and settled.**

Everything else in this document follows from that, and the research says every obvious
alternative actively backfires.

---

## 1. What the literature says about the obvious version

The obvious version is a leaderboard of top callers, points per card, badges for winners.
Here is what each produces:

| Obvious mechanic | What it actually produces | Evidence |
|---|---|---|
| Leaderboard of who was right | **Escalating commitment to bad calls** — the exact disease this product treats | Lerner & Tetlock: accountability for outcomes people do not control |
| Points per card written | Sybil spam, volume over conviction | Crypto quest programs needed soulbound Passports to filter bots |
| Badges for winning calls | **Goal displacement** — safe, vague, unfalsifiable theses | Badges/leaderboards/points are the elements most reported as causing harm |
| Global rank | Demotivates everyone outside the top | Ranked 3,847th there is no visible path; the majority disengage |
| Rewards for participating | **Overjustification** — crowds out the interest already there, leaving people *less* motivated once points stop | Deci 1971 |

The literature has a name for shipping this anyway: **"BPL gamification"** — Badges, Points
and Leaderboards bolted onto an unchanged experience — and identifies it as *the* reason
gamification underperforms expectations. A 2022 study (Hanus & Fox) found gamified courses
producing *lower* motivation and *lower* exam scores than the ungamified version.

**So the design constraint is unusually strict: almost every standard mechanic is
disqualified on evidence, not taste.**

---

## 2. The thing worth scoring

The behaviour that is genuinely hard, genuinely good, and currently unrewarded is
**settlement**: you wrote a call with a condition and a resolution date, the date arrived,
and you came back and settled it — including when it went against you.

Why this one survives where the others do not:

- **It is process, not outcome.** Tetlock's evidence supports process accountability and
  specifically warns that outcome accountability produces escalating commitment.
- **It is fully within the person's control.** Nothing about a price chart can make you fail
  it. That is precisely why it cannot generate the pathology.
- **It is hard in the way that matters.** The temptation in this product is to quietly ghost
  a losing call. Settlement is the moment that temptation bites.
- **The state already exists.** `UNSETTLED` is defined in `DASHA-SPEC-SETTLEMENT.md`. This
  changes it from a displayed fact into the thing you can lose.

### Pushing on it — what does this incentivise that is bad?

Two real exploits, named rather than ignored:

1. **Trivial conditions.** "Invalid if the price becomes exactly zero" is easy to settle and
   means nothing. *Mitigation:* settlement rate is shown **alongside** the conditions
   themselves, never as a bare number. A profile of trivially-settled calls is visibly
   worthless to a reader, which is the only enforcement that does not require a judge.
2. **Short horizons to farm settlements faster.** *Mitigation:* the streak counts **settled
   calls**, not calls per week, and there is no time bonus. Ten one-day calls settle to
   exactly the same score as ten ninety-day calls, so there is nothing to gain by shortening.

Neither mitigation is perfect. Both are honest, and both avoid introducing a scoring
authority the product does not have.

---

## 3. Invert the status hierarchy

**The highest-status artifact in this product is a call you were publicly wrong about and
honoured anyway.**

Every competitor shows winners. If being visibly wrong is the prestigious thing here, then:

- the product cannot be farmed by people optimising to look right — there is nothing to gain
- it implements CHI 2026's **reflexive self-correction** credibility marker as a status symbol
- it makes the invalidation field, currently the one "most people skip," the point

**The marker: `Called it wrong. Said so.`**

Wording matters more than mechanics here. It must read as respect, not as a scarlet letter —
the phrasing is *earned*, active, and in the author's own voice. Compare the versions that do
not work: "Failed" (punishment), "Invalidated" (clinical, sounds like something done *to*
them), "Wrong" alone (no credit for the honouring, which is the whole point).

If this reads as punishment, nobody opts in and the entire design collapses. Test the copy
with real people before shipping it.

---

## 4. The streak, scoped so it cannot become the point

Streaks are the strongest mechanic in the research — loss aversion runs roughly 2:1 against
equivalent gains, with the behavioural inflection around **day 7** — and the most corruptible.

**The streak counts consecutive calls settled. Not days active.**

| Breaks it | Does not break it |
|---|---|
| A call passes its resolution date unsettled | Not opening the page for a month |
| — | Being wrong. Being wrong repeatedly. |

A days-opened streak would be engagement farming, and it directly contradicts a product whose
honest position is that you should use it **rarely and deliberately**. If a mechanic would
ever make someone feel bad for not opening the page, it is the wrong mechanic here.

The durable form is identity, not fear: the research finds people who maintain a streak
because they *identify* as someone who does are more durable than those driven by loss
aversion alone. So the framing is **"you settle your calls"** — a description of the kind of
person you are — rather than a number you are at risk of losing.

---

## 5. Identity — and why the leaderboard cannot exist yet

**There is no account and nothing is uploaded. A leaderboard requires identity. Therefore
a leaderboard cannot exist under the current architecture.** This is not a detail to solve
later; it gates the entire ranked half of this document.

The one credible path is already in the settlement spec: **the card gets posted publicly,
and the platform supplies both the timestamp and the identity.** One move solves the two
hardest problems at once — credibility and identity — with no server and no account.

Sybil exposure under that model is real but bounded: a throwaway account can post cards, but
it cannot manufacture *history*, and history is the only thing being scored. The crypto
research is unambiguous that anything farmable gets farmed — Galxe needed soulbound Passports
— so the defence has to be that there is nothing worth farming. Under this design there
isn't: no token, no airdrop, no points with value. **Do not attach a reward with resale
value to any of this, or every conclusion here is void.**

**Recommendation: no leaderboard until posting is the flow.** Until then, ship the personal
mechanics — settlement record, streak, the wrong-and-said-so marker — all of which work
perfectly well for an audience of one and require no identity at all.

---

## 6. Cohorts, never a global board

When a ranked view does become possible: small comparison sets only. The research is
specific — 12th of 20 with 11th in reach motivates; 3,847th of anything does not, because
there is no visible path to improvement.

Cohort by something that makes the gap closable and the comparison fair: people who started
the same month, or who called the same token. Never one global ladder.

---

## 7. Rejected, and why — the important list

This list matters more than the accepted one. It is what stops someone shipping a wins
leaderboard in three weeks.

- **Leaderboard of who was right** — escalating commitment (Tetlock). Never build this.
- **Points for writing cards** — Sybil spam; volume over conviction.
- **Daily login streak** — engagement farming; contradicts deliberate use.
- **Badges for winning calls** — goal displacement toward vague, unfalsifiable theses.
- **Global rank** — demotivates the majority, who then leave.
- **Any token, airdrop, or points program with resale value** — converts every honest
  mechanic above into a farm. This is the single highest-risk item on the list because it is
  the most tempting in this market.
- **Accuracy percentage as a headline number** — outcome dressed as process, and it will be
  read as a track record whatever the caption says.

---

## 8. What to build, in order

1. **Personal settlement record** — settled / unsettled, visible to you. No identity needed.
2. **`Called it wrong. Said so.`** — the marker, with the copy tested on real people.
3. **Settlement streak** — framed as identity, broken only by ghosting.
4. **Post-as-timestamp** — the flow change from the settlement spec. Unlocks everything below.
5. **Cohort comparison** — only after 4, and only in small sets.

Steps 1–3 need no server, no account, and no identity. They are the entire personal loop and
they are shippable against the current architecture.

---

## Sources

- [Gamification enhances intrinsic motivation, autonomy and relatedness — meta-analysis, Springer](https://link.springer.com/article/10.1007/s11423-023-10337-7)
- [How gamification motivates: experimental study of specific game design elements — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S074756321630855X)
- [Trophies, achievements and badges: SDT and hexad player-type — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2451958826000564)
- [The Dark Side of Gamification: negative effects in education (PDF)](https://www.researchgate.net/publication/326876949_The_Dark_Side_of_Gamification_An_Overview_of_Negative_Effects_of_Gamification_in_Education)
- [Uncovering the dark side of gamification at work: engagement and well-being](https://www.researchgate.net/publication/344330163_Uncovering_the_dark_side_of_gamification_at_work_Impacts_on_engagement_and_well-being)
- [Gamification Gone Wrong: When Streaks and Badges Become the Point (2026)](https://nerdsip.com/blog/gamification-gone-wrong-when-streaks-become-the-point)
- [The Psychology Behind Duolingo's Streak Feature](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature)
- [Game Theory and Habit Formation: Streaks, Loss Aversion & Mastery](https://scholaty.com/health-and-wellness/articles/habits/game-theory-and-habit-formation-streaks-loss-aversion-mastery.html)
- [Quest Love: A First Look at Blockchain Loyalty Programs — arXiv](https://arxiv.org/html/2501.18810v2)
- [Crypto Quests Guide 2026: Types, Rewards, Where to Find](https://www.directionsmag.com/crypto/crypto-quests)
- [Lerner & Tetlock, Accounting for the Effects of Accountability (Harvard)](https://projects.iq.harvard.edu/files/lernerlab/files/lerner_tetlock_1999.pdf)
- [Credibility Matters: Crypto Key Opinion Leaders — CHI 2026 preprint](https://arxiv.org/html/2603.12000v1)
