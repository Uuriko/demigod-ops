# Demigod Handbook

**Documentation map:** [`DOCS.md`](../DOCS.md) routes canonical rules, workflows, research, archives, source files, and verification receipts. This handbook owns studio standards and onboarding; it does not replace release truth or the documentation map.

**Who this is for**

| Reader | Use this for |
|--------|----------------|
| **AI agents** (Fable, Codex, Cursor, Grok, Claude, …) | How to plan, ship, verify, and not invent reality |
| **Future teammates** (ops, eng, GTM, design) | What Demigod is, how we work, what “good” looks like |
| **Anyone new** | Day-one orientation before touching production |

This is the studio playbook: product, standards, roles, ship path, honesty.  
It is **not** a marketing site, a legal contract, or a novel.

**The bar:** a new agent *or* a new person can open this, orient in about 15 minutes, and know how not to break the product or the trust model. If they can’t, **this handbook is wrong** — fix it the same day.

**Precedence:** if this file disagrees with **live production or disk source of truth**, production/disk wins — then update this file.

---

## 1. What Demigod is

### In one paragraph
Demigod helps **SF startups** hire and **candidates** find fit without application spam. Startups submit a brief with the role, real constraints, and one concrete first result. Candidates share preferences privately. Software compares fit; **a human decides what to propose**. Candidate contact details move only after **both sides say yes**. Fee: **10% of first-year base salary when a hire starts**. Candidates never pay.

### Who we serve
| Side | What they get | What they don’t get |
|------|----------------|---------------------|
| **Founders / hiring** | Curated, evidence-backed intros when both approve | Volume shortlists, “3–5 ready tomorrow,” fake urgency |
| **Talent** | One private profile, shared only with mutual interest | Cold blasts of their contact info, job-board spam |

### How a match is supposed to work
1. Startup brief *or* talent profile lands (WIZ on the site).  
2. System ranks fit; human checks evidence and gaps.  
3. Each side reviews privately.  
4. **Mutual yes** → intro. No mutual yes → no intro.  
5. Hire → 10% fee. No hire → no fee theater.

### Service boundaries
We are **pre-services** on payments/SMS automation. Public copy uses **pending** for Twilio/Stripe/SMS-style promises. **No SLA clocks** on the live site (“48h guarantee,” etc.). Contact: **potter@trydemigod.com**.

### What we are not
- Not a job board flood.  
- Not a fake “LIVE roles” wall.  
- Not a content farm.  
- Not a place to invent pilots, receipts, or social proof.

### The real bottleneck
When the site is healthy, the bottleneck is almost never another logo or CSS tweak — it’s **demand and delivery**: warm outreach, real conversations, pilots, proof from real work. Polishing a green site while demand is empty is busywork.

---

## 2. Principles (culture)

These apply to agents **and** people.

1. **Honesty over theater**  
   Empty-and-true beats full-and-fake. Seeds and samples are labeled. Never mint a pilot, receipt, “sent,” or “live role” without the real event.

2. **Mutual yes is the product**  
   One-sided “we’ll connect you” is not a match. Privacy is the default until both sides opt in.

3. **Audience only sees the final cut**  
   “Works on my machine” / “file on disk” / “tool returned 200” is not shipped. **Live** (or the real ops record) is what counts.

4. **Write it down so anyone can run the show**  
   `AGENTS.md` holds authority; current receipts hold state. Tribal knowledge is a bug.

5. **Smallest complete work**  
   Prefer reuse and delete over new systems. See Ponytail for code (`docs/PONYTAIL-AGENTS.md`). Same spirit for ops: one checklist, not three dashboards that lie.

6. **Evidence over vibes**  
   Handoffs carry commands run, versions, and failures — not “should be fine.”

7. **Protect trust boundaries**  
   Security, accessibility, data integrity, and validation are not optional “polish.”

8. **Every task needs a reason**  
   If it doesn’t help **demand**, **match quality**, or **revenue (honest 10% path)** — skip or park it.

9. **Fix the process when it fails**  
   Burned once → row in § Cost of mistakes *same day*. Don’t repay the same incident.

10. **Respect the human authority, don’t assign homework**  
    Agents own in-scope work and verified publishing. Pause only at the narrow external boundaries in `AGENTS.md`.

---

## 3. Who does what

### Humans (founders / future employees)
| Focus | Examples |
|-------|----------|
| **Authority** | Money, contracts, real DMs when judgment is personal, account ownership |
| **GTM** | Warm founder outreach, pilot conversations, proof assets from real work |
| **Product judgment** | What we promise publicly; when services leave “pending” |
| **Optional tooling** | Designer canvas cleanup |

### Agents (AI crew)
| Role | Job | Does not |
|------|-----|----------|
| **Fable** (plan/review via `bin/df`) | Specs, audits, stop conditions | Claim “I shipped”; apply plan without gates |
| **Codex** | Design assist, deep diagnosis, scoped implementation | Silently overwrite the plan; dual-write foot-core |
| **Cursor / Grok** | Edit sources, verify, ship CDN/Webflow custom code, hygiene | Invent GTM strategy mid-ship; invent business facts |
| **Any agent** | Surface production-safety issues with proof | Fake green; hide failed gates |

**Default:** one agent on a task. Add Fable/Codex when the change is ambiguous or high-risk.

**Handoff rule:** transfer **evidence** (what you ran, versions, failures), not confidence.

---

## 4. Systems map (plain language)

You don’t need every path memorized — you need to know **what is canonical**.

| What | Canonical place | Notes |
|------|-----------------|--------|
| Live site | https://www.trydemigod.com | What users see |
| Site JavaScript | `demigod-foot-core.js` on disk | **Only** source of truth for behavior |
| How JS is delivered | CDN + `demigod-footer-lite.html` | Delivery, not a second SoR |
| Head / SEO / favicon | `demigod-head-minimal.html` | Webflow head budget is real (~50k) |
| Matching board samples | `DEMIGOD-BOARD.json` | ≤3 seeds; honesty-gated; not inventory |
| Observed public roles | Roles pipeline → `DEMIGOD-PUBLIC-ROLES.json` + footer embed | ATS first-seen; not fill claims ([`ROLES-PIPELINE.md`](ROLES-PIPELINE.md)) |
| Ship path | [`SHIP-AND-CDN.md`](SHIP-AND-CDN.md) | CDN + CM6 paste; current-request auth |
| Doc map | [`DOCS.md`](../DOCS.md) | Where to find every living guide |
| Current status | `bin/dg orient` + `bin/dg truth` | Fresh receipts, not copied prose |
| Agent authority | `AGENTS.md` | One short policy |
| This playbook | `docs/DEMIGOD-HANDBOOK.md` | Standards + process |
| Code taste | `docs/PONYTAIL-AGENTS.md` | Lazy-senior / YAGNI ladder |
| Control plane | `bin/dg home` · http://127.0.0.1:9878 | Modules + next actions |

**Glossary (quick)**

| Term | Meaning |
|------|---------|
| **WIZ** | On-site multi-step form (hire / talent) |
| **foot-core** | Canonical site JS file |
| **SoR** | System of record — the file/state that wins |
| **Truth** | `bin/dg truth` — disk vs live vs freeze vs board |
| **Freeze** | When ON: disk work OK, no live CDN/Webflow mutate unless lifted |
| **Mutual yes** | Both sides approved before intro |
| **Seed / sample** | Fake or example data — must be labeled |
| **Observed role** | Public ATS job Demigod first saw (not a match claim) |
| **Pending** | Service not live yet — say so publicly |
| **Ponytail** | Minimum code that works; no unsolicited complexity |
| **CM6 / CDN ship** | How custom code and JS reach production ([`SHIP-AND-CDN.md`](SHIP-AND-CDN.md)) |

---

## 5. How work gets done (everyone)

```
Clarify outcome → Change the canonical thing → Prove it → Confirm what the audience sees → Stop
```

1. **Outcome in one sentence** + what you will *not* do.  
2. **Change the real source** (not a screenshot, not a mirror).  
3. **Prove** with the smallest check that would fail if wrong.  
4. **Confirm live / real ops** when the work was meant for users.  
5. **Stop.** “While I’m here” polish is a new task.

### For product / site changes (agents & technical people)

```
PLAN → EDIT SoR → VERIFY (disk) → SHIP → CONFIRM LIVE → LOG → RELEASE LOCKS → STOP
```

Full ship checklist: §7. Command spine: `bin/dg ship help` (when freeze allows).

### For demand / matching (humans & agents)

- Record reality; don’t advance states without the event.  
- **Proposed match ≠ intro. Intro ≠ pilot. Pilot ≠ revenue.**  
- Before any send: no double-DM; queue matches real history.  
- Checklists: §8.

---

## 6. Honesty rules (non-negotiable)

| Do | Don’t |
|----|--------|
| Label samples and seeds | Pretend seeds are customers |
| Keep board seed count honest | Inflate “live roles” for screenshots |
| Say **pending** for unpaid automation | Promise SLAs or replacement guarantees you don’t run |
| Write tests to temp dirs | Let test runs pollute prod JSON |
| Claim the least advanced proven state | Say “shipped” when only disk changed |
| Scrub/fix dishonest canvas copy | Delete runtime honesty without replacing canvas truth |

**Status vocabulary (use precisely)**  
`idea` → `on disk` → `pasted` → `published` → `verified live` → `frozen`  
`proposed` → `mutual yes` → `intro` → `pilot` → `hire`

---

## 7. Ship checklist (site / code)

Use for anything that can hit production.

- [ ] Outcome + non-goals written  
- [ ] Canonical file identified (`demigod-foot-core.js`, head, ops module, …)  
- [ ] Existing path checked first (don’t invent a second system)  
- [ ] Smallest complete change  
- [ ] Honesty / a11y / safety not cut  
- [ ] Verify green **this session** (`npm run demigod:verify:source` or targeted)  
- [ ] Board honesty if board touched  
- [ ] Foot lock if editing foot-core  
- [ ] Permanent CDN host only (no short-lived free hosts for production JS)  
- [ ] Head + footer kept in sync when both matter  
- [ ] Live version / behavior matches intent (`bin/dg truth`)  
- [ ] Lock released; short handoff written  

**Gates see disk more than live.** Green gates + broken live has happened. Always confirm the audience surface.

---

## 8. Demand & match checklists

### Demand / outreach
- [ ] Source real and attributable  
- [ ] Role, constraints, unknowns recorded  
- [ ] Interest distinguished from active hiring  
- [ ] No double-contact  
- [ ] No inflated “pipeline” for show  
- [ ] Next step recorded without fake completion  

### Matching
- [ ] Both records current  
- [ ] Constraints actually met; gaps visible  
- [ ] No conflicting intros  
- [ ] Language specific and non-deceptive  
- [ ] State written back to the system of record  

### Product dogfood
After form/site changes: exercise hire + talent paths (playtest / usertest tools if you have the env). Don’t assume the money path works.

---

## 9. Day one

### New agent session (~15 min)
1. Read `AGENTS.md`; use this handbook only when the task needs detail.
2. Run orient: `bin/dg orient` (or `bin/dg home`) + `bin/dg truth`.  
3. Rerun any red item yourself before “fixing” it.  
4. If editing site JS: check foot lock; one writer only.  
5. Prefer one small end-to-end change through verify and ship before a large one.

**Agent standing rules:** Ponytail · no human homework dumps · when told to choose, execute one path · Eat the Sounds game archived unless reopened · keep browser tabs lean.

### New human teammate (first day)
1. Read §1–3 and §6 of this handbook (product + principles + honesty).  
2. Use the live site as a founder and as talent — note friction.  
3. Learn the vocabulary (mutual yes, pending, seed).  
4. Use `AGENTS.md` for authority; do not invent public promises.
5. For technical work, pair with the agent entry path above or an engineer who knows the ship pipeline.  
6. Don’t invent dashboard numbers; ask what the system of record is.

---

## 10. Cost of mistakes (learn once)

Add a row the same day something expensive happens.

| What went wrong | Lesson |
|-----------------|--------|
| Tool said “saved” but production unchanged (e.g. head over budget) | Confirm live content / Last Published, not only HTTP 200 |
| JS hosted on a temporary free host that expired | Production only on permanent CDN; truth must match permanence |
| Greps green, site dead from a syntax error | Run / parse real code; don’t ship on greps alone |
| Two writers edited foot-core at once | One lock, one writer |
| Feature coded but never called at runtime | Ship includes the **path users hit**, not just a file |
| Long redesign thrash with no live proof | One change, one ship, live check |

---

## 11. Speed without chaos

- Speed comes from a **trusted pipeline**, not from skipping checks.  
- Shortest complete work wins.  
- When site is green and shipped: prioritize demand and delivery, not endless chrome.  
- “Hold green” is a state — not a full-time job.

---

## 12. Where to go next

| Need | Open |
|------|------|
| Authority | `AGENTS.md` |
| Current status | `bin/dg orient` · `bin/dg truth` |
| Detailed reference | `docs/DEMIGOD-HANDBOOK.md` |
| Code style | `docs/PONYTAIL-AGENTS.md` |
| Agent comms | `AGENT-COMMS.md` |
| Orient / modules | `bin/dg home` · dash `:9878` |
| Ship sequence | `bin/dg ship help` |
| Truth oracle | `bin/dg truth` |
| Business/ops checklists (deeper) | `docs/process/OPS.md` if present |

---

## 13. Non-goals of this document

- Not a complete API reference.  
- Not a substitute for running commands.  
- Not permission to skip honesty for growth.  
- Not a backlog of logo experiments.

---

*Anyone should be able to run the show. Keep it that way.*

*For agents and humans. Drafted with Fable + Codex; revised for multi-audience clarity (product · culture · ship · honesty).*
