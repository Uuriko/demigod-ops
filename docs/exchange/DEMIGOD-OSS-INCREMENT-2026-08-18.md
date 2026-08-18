# Competitor → increment · 2026-08-18

| Product | What they teach | What we built |
|---|---|---|
| **Wellfound** / daily.dev Recruiter | Two-sided / double opt-in before a conversation | `recordMutualYes` + `bookSlot` refuses `book_requires_mutual` until both sides are true. Holds stay one-sided. |
| **Ashby** | Calendar after the process, not instead of it | Book is still first-party; no invite is sent. Mutual yes is the missing gate Ashby does not own. |
| **Greenhouse** | Structured hiring before a hire decision | Existing: scorecard to screen, debrief to hire. Unchanged this slice. |
| **Harmonic** | Company signal is not a hire | Observation still never blocks `book`/`hire` (CONTRACTS §29). |
| **Employ / StaffingHub 2026** | Faster fill, worse 90-day retention | Prior slice: dated 90-day check before `recordOutcome` on a filled mission. |

DIE stays the internal kernel name. No hire score. No Clay people-waterfall.
