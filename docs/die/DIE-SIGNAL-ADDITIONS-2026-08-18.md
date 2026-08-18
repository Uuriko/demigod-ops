---
status: proposal
generated_by: claude
generated_at: 2026-08-18
---

# Signals to add to DIE, and the one that is already sitting in the ledger

Researched 2026-08-18. Every proposal names the buyer behaviour it serves and whether our data can
actually produce it today. Numbers marked **live** were computed from this repo's artifacts.

## What the market says it wants

- **Hiring signals lead buying intent by 60–90 days.** By the time a company posts, budget is
  approved and the pain is acute.
- **Latency decides value.** Outreach within 48 hours of a signal gets ~3× the response rate of
  outreach on signals older than two weeks. **Our own funnel violates this**: the two approved leads
  have been sitting since 2026-07-17, 32 days.
- **A first GTM hire is its own trigger.** "A startup hiring their first sales rep has different
  urgency than an enterprise adding to an existing team."
- **Careers-page change alerts are a product people buy** — Visualping sells exactly that, and we
  already poll boards daily.
- **Reposting is read as a retention or difficulty signal.** A role reappearing every 60–90 days,
  or live 60+ days without an update, is treated as the tell. Reposts often return "with a slightly
  different title or a revised salary range."
- Incumbent scale for context: platforms advertise 700+ signals from 35+ sources.

## A. Buildable now, from data we already hold

**1. New function at a company — the first-GTM-hire signal.**
Roles already carry `fn`, classified across ten functions: engineering 6,845, sales 3,149, other
2,395, ai/data 1,769, operations 1,621, marketing 1,032, finance/legal 884, product 732, people 517,
design 411. **Live: 237 company/function pairs** where every role of that function appeared after the
ledger's initial load — a company that had no sales roles and now has one.

*The honest constraint:* the ledger opened 2026-08-04, so this is **first observed**, never "first
ever". A company that posted a sales role in June, closed it, and reposted in August looks identical
to a genuine first. Ship it labelled as first-observed or not at all.

**2. Reposting and date rewriting.** `postedDateChangeCount` is live on **129 roles** — companies
that rewrote a posting's own date — and `reopenCount` tracks close-then-reopen. The market reads
both as the ghost/retention tell, and measures them by eye against LinkedIn's "Reposted" badge. We
measure them from observation, which nobody else here can do retroactively.

**3. Board-change alerts.** We poll daily and hold `firstSeen`/`closedAt`. A "this board changed
today" feed is a small build on top of the existing poll receipt, and it is a product other people
already charge for.

**4. Long-open roles by cohort.** **Live: 69.1% of 9,600 attributable open roles have been posted
more than 30 days**, 34.3% past 90, 6.3% past a year. The market's own quoted figure is one in seven.
Publishing the distribution — and refusing the ghost-job label, since a hard role stays open — is the
differentiated position.

## B. Buildable, needs one new input

**5. Company status from YC's own dataset.** `yc-oss/api` is public, rebuilt daily from YC's Algolia
index rather than scraped, and carried **6,180 companies** as of 2026-08-18T00:40. It exposes
`status` (Active 4,281 · Acquired 808 · Inactive 1,068 · Public 23), `isHiring`, `team_size`,
`stage`, `batch`, `all_locations`. That is an authoritative death/acquisition signal, better than
inferring it from a redirect.

*What it showed on arrival:* of 3,097 SF companies in that dataset, 1,059 are not in our map — but
only **one** is Active and hiring (Bunting Labs, S22). Our filtering is already right. Conversely our
map holds **0** companies YC marks Inactive and **1** it marks Acquired, so we are not listing dead
companies either.

**6. Board discovery by asking, not guessing.** Built today as `demigod-board-discover.mjs`. 803 of
our rows are marked hiring by YC and we hold a board for only 207; the enrich derives ATS slugs from
domains, so a company whose board is named anything else is invisible to it forever. Reading the
careers page they publish finds boards like Pave → `paveakatroveinformationtechnologies` and
Ironclad → `ironcladhq` that no domain guess reaches.

**7. Funding and leadership events.** Repeatedly named as the signals that sit next to a hiring
spike. We hold none of them, and Crunchbase's free API tier ended in 2026. Needs a source decision
before it is a roadmap item.

## C. Deliberately not doing

**8. Ghost-job scoring.** Everyone sells a verdict. Our methodology already refuses it: a long-open
role is not evidence of a fake one, because hard roles stay open. Publishing the measurement and
naming what it cannot prove is the stronger position and the actual differentiator.

**9. Candidate screening / interview automation.** The crowded middle of the funnel — Gem with 800M+
profiles, Humanly on high-volume hourly. What is being automated there is "the repetitive middle of
the funnel, not judgement." Not our data and not our edge.

## The uncomfortable one

Every signal above decays. The research is explicit that a signal older than two weeks is worth about
a third of a fresh one. Our pipeline currently produces signals daily and acts on none of them: 129
leads, zero ever contacted, two approved 32 days ago. **Adding signals to DIE is worth less than
shortening the distance between a signal and someone acting on it.**
