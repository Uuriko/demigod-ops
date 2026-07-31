# AI-native evidence without building an OA

**Purpose:** Demigod response to Exceptional Builders / Sierra / CodeSignal-style AI-allowed assessments.  
**Stance:** Accept portable work evidence. Do **not** build another coding assessment product.  
**Product truth:** Demigod remains SF tech-matched talent · human review · mutual yes · 10% on start (`DEMIGOD-SIMPLE.md`).

---

## The problem

Engineers now ship with Claude Code, Codex, Cursor. Traditional screens (LeetCode, no-AI OAs) measure the wrong job. Campaigns like [exceptional.builders](https://exceptional.builders/) and processes like Sierra’s Plan → Build → Review are filling that gap.

Demigod’s edge is **match + mutual yes + 90-day outcome**, not a better sandbox.

---

## What Demigod should do

| Do | Don’t |
|----|--------|
| Treat strong AI-native work evidence as **profile signal** | Build Exceptional / CodeSignal / Promptster |
| Let talent link: pass receipts, take-home repos, debrief notes, Promptster case IDs, interview.iogood scores | Require every candidate to re-take a Demigod OA |
| Human reviewer **replays judgment** (scope, tradeoffs, ownership of AI output) | Auto-rank solely on “passed X” |
| Company brief can say “AI-native builders preferred” | Promise “skip all screens at 20 cos” (we don’t control partners) |
| One optional lightweight **work sample** only when brief demands it | Hosted IDE, proctoring, agent telemetry product |

---

## Evidence tiers (reviewer checklist)

Use in match review — not as a public product:

1. **Strong (portable bar)**  
   - Named campaign pass (e.g. Exceptional Builders window) with debrief notes  
   - Promptster / similar process-telemetry case with human-readable brief  
   - Recent real product PR / ship with agent-assisted workflow they can explain  

2. **Useful**  
   - Self-hosted take-home repo + short written tradeoffs  
   - Live pair session notes (interviewing.io, company screen)  
   - Portfolio that shows end-to-end ownership, not only prompts  

3. **Weak alone**  
   - “I use Cursor” with no artifact  
   - LeetCode percentile  
   - Unverified “FAANG reject / hire” stories  

Reviewer asks (same spirit as Exceptional debrief / Sierra Review):

- What did you scope out, and why?  
- Where did the agent fail, and how did you steer?  
- What would you change before production?  
- Can you explain the data model / state flow without the model open?

---

## Funnel fit

```
Talent wizard / profile
  → optional evidence fields (links + 3 bullets)
  → matching engine ranks role fit as today
  → human review reads evidence (tier 1–2 get less re-test pressure)
  → mutual yes
  → intro
```

Company side: brief can request “AI-native product engineer”; Demigod does not guarantee partner-style multi-company intros.

---

## Competitive boundary

| Player | Owns | Demigod relation |
|--------|------|------------------|
| **Builders (builders.cv)** / Exceptional | Proof-of-work network + AI take-home cert + multi-co placement | **Closest category peer** — managed bar + intros; Demigod stays match/mutual-yes/fee |
| CodeSignal / CoderPad | Per-company assessment SaaS | Out of scope |
| Promptster | Process telemetry | Optional evidence type |
| interviewing.io | Paid mocks → intros | Adjacent network |
| Mercor | Paid expert gigs for labs | Different job type |
| **Demigod** | SF match, mutual yes, 10% fee, outcomes | Relationship + placement |

---

## Already on Demigod (do not rebuild)

Engineer wizard already collects:

- **experience** — “Work you are proud of?” / shipped outcomes (feeds matching `work evidence` terms)  
- **resume / resume-url** — PDF or HTTPS portfolio / work link (private until mutual yes)

That is enough to accept Builders/Exceptional links, GitHub ships, and take-home repos **today**. Ops: use match checklist AI-native bullet (`docs/process/MATCH-QUALITY-CHECKLIST.md`).

## Implementation minimum (only if a pilot is blocked)

Ponytail order:

1. Match review notes: optional free-text “AI-native bar” (strong|useful|none) — ops only.  
2. **No** new wizard step unless evidence is routinely lost.  
3. **No** assessment service, IDE, or proctoring product.

Defer: integrations, webhooks from Builders/Exceptional, auto-import of Promptster scores.

---

## One-line pitch (internal)

> Demigod does not re-test builders for sport. We accept real AI-native work evidence, a human checks ownership of the ship, and we intro only on mutual yes — 10% when they start.

---

## Related research

- `docs/research/EXCEPTIONAL-BUILDERS-COMPETITIVE-2026-07-31.md`  
- `docs/research/BUILDERS-CV-PARTNER-DEMAND-2026-07-31.md`  
- `docs/gtm/DEMIGOD-VS-BUILDERS.md`  
- `docs/die/research/COMPETITIVE-LANDSCAPE.md` (DIE / intel layer)  
- Fee terms: `docs/gtm/FEE-ONE-PAGER.md`  
- Match ops: `docs/process/MATCH-QUALITY-CHECKLIST.md`
