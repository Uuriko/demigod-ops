# Demigod Events Bot — Master Product + Visual Spec

**Status:** Source of truth for all agents (Grok / Fable / Codex / Cursor).  
**Audience:** Implementers redesigning UI/UX, building autonomy, or reviewing Events Bot.  
**Date:** 2026-07-22  
**Constraint:** Must feel like **trydemigod.com homepage** (gold Demigod), **not** Night District MUD phosphor green.  
**Implemented surface:** Public = one optional direction and one **private draft** action. Dashboard = one private planning button with diagnostics inside closed details.

---

## 0. One-sentence product

**Events Bot privately drafts and advances plans for fun, high-quality in-person San Francisco nights** (built by Demigod). The public page produces one feasible draft from an optional direction; the private dashboard runs one lifecycle planning tick. It may prepare venue, sponsor, volunteer, invite, run-of-show, follow-up, and debrief materials, but it **never sends, publishes, books, or charges**.

---

## 1. Product purpose & success

### 1.1 Why it exists
Running great SF events is ops-heavy. Events Bot turns a blank or lightly directed prompt into a practical private plan, then lets the operator continue that plan from one private dashboard action. Demigod-related nights are optional.

### 1.2 Success metrics (honest)
| Metric | Real only |
|--------|-----------|
| Nights actually held in SF | Count when host confirms |
| Invited / confirmed / attended | Null until real; never invent zeros as proof |
| Mutual-interest pairs / second meetings | From debrief |
| Offers received (sponsor/venue/volunteer) | From store |
| Outreach **queued** (not “sent”) | From outbox |

**Not success:** idea count, tool-call volume, fake RSVP totals, green CI alone.

### 1.3 Hard rules (non-negotiable)
1. **San Francisco only** — in-person SF proper / SF neighborhoods. Decline NYC, LA, remote-only, Oakland-as-city-of-record, Peninsula, etc. Offer SF alternative.
2. **No fake sends** — outreach remains `queued`/draft; Events Bot has no delivery path. No `sent_stub`.
3. **No external execution** — ticks and public drafts never send messages, publish invite pages, reserve venues, or spend/charge money.
4. **No fake RSVPs / attendance / SLA clocks.**
5. **Stripe pending** — money records are intent only; Events Bot does not charge.
6. **Public never sees offer emails** — counts + non-contact blurbs only.
7. **Mutual yes** before post-event intros (same as hiring).
8. **Identity in outreach drafts** — bot names itself and points to `/?p=events` for product context.
9. **Talent never pays Demigod**; placement fee only if later hire starts (10% first-year cash).
10. **Contact:** potter@trydemigod.com (not hello@ for public copy).

### 1.4 Who uses what surface
| Persona | Surface | Goal |
|---------|---------|------|
| Public visitor | `/?p=events` | Optionally give one direction; receive one private event-plan draft |
| Private operator | Dashboard Events Bot card | Run one draft-mode planning tick; inspect diagnostics only when needed |
| Guest | Real Demigod invite URL, when explicitly opened | Submit a real RSVP; never see private planning data |
| Sponsor / venue / volunteer | Private records and APIs | Offer resources without appearing on the public default surface |

---

## 2. Functional specification (every capability)

### 2.1 Lifecycle stages (ordered)
```
ideate → resource → plan → rsvp → run → followup → debrief → (next → ideate)
```
| Stage | Bot may prepare privately | Required real-world evidence |
|-------|---------------------------|------------------------------|
| ideate | Original idea, outcome, seats, SF windows | None; all are draft assumptions |
| resource | Match offers; draft venue/sponsor/volunteer asks | Venue acceptance is not inferred |
| plan | Guest framing, invite copy, agenda, checklist | Future date/time and venue evidence before advancing |
| rsvp | RSVP structure and reminder drafts | A real recorded invite URL; no invented counts |
| run | Day-of run-of-show | Real host execution, outside the bot |
| followup | Thanks, feedback, mutual-interest drafts | Mutual yes before any intro |
| debrief | Learnings and next seed | Host-attested outcomes; omitted counts remain null |

### 2.2 Public private-draft action (`POST /api/events-bot/chat`)
- One optional direction; blank means “surprise me.”
- One action: **Imagine my event**.
- Returns one practical SF plan covering audience, format, size, timing, venue type, run of show, and resources.
- Public chat is read-only and receives no ops authority.
- No private guest or contact information belongs in the prompt.
- OpenAI when configured; honest local draft fallback otherwise; rate limited per IP.
- Never sends, publishes, books, charges, mutates lifecycle, or invents RSVPs.

### 2.3 Offers (`POST /api/events-bot/offer`, private/backend; not public default)
Kinds: `sponsor` | `venue` | `volunteer`  
Fields: name, email, org, city (default San Francisco), capacity (venue), offer text.  
SF city gate via `isSfLocation`.  
Private store; public GET counts only (exclude `money:true` mirrors).

### 2.4 Ideas (`POST /api/events-bot/idea`, private/backend; not public default)
- User suggestion or `generate:true` autonomy tick.
- Dedup by normalized title.
- City always San Francisco.
- **Scope:** any fun SF event; user ideas unrestricted (still SF).
- **Bot-generated:** prefer sponsorable angles (audience, fundable needs, brand moment); field `sponsorable` optional on records.

### 2.5 Feedback (`POST /api/events-bot/feedback`, private/backend; not public default)
- Free text + optional name/email/topic.

### 2.6 Money (`POST /api/events-bot/money`, private/backend; not public default)
- Intent only while Stripe pending; never a charge.
- Mirrors to sponsor offer with `money:true` (hidden from public sponsor count).

### 2.7 Private planning tick (`POST /api/events-bot/agent/tick`)
- Dashboard primary action: **Imagine & plan my event** when empty; **Continue planning** when active.
- Runs `events-tick` in draft mode behind ops authentication.
- The main card shows only the event, stage, next planning need, safety line, and one button.
- API, resource, venue, invite, and draft-queue diagnostics live in a closed **System details** disclosure.
- Tools may write private planning state and draft files. They do not send, publish, book, or charge.
- Lifecycle gates, SF-only checks, idempotency, real-URL evidence, and null-until-real outcomes remain mandatory.

### 2.8 Platforms
- **Luma:** not connected. Luma’s official API requires a per-calendar API key, and API access requires Luma Plus. Events Bot creates a ready-to-paste draft only; a generic environment key is not treated as a connection or authority.
- **Partiful:** manual/draft only. No official public event-creation API was found; Events Bot prepares title, description, timing, location, and a host checklist.
- A real external invite URL can be recorded only from explicit foreground evidence. Background/model tools cannot invent or attest one.

### 2.9 Outbox
- Files under `events-bot-outbox/` + store.outreach.
- CLI: `bin/dg-events-outbox` for human drain.
- Status: `queued`/draft only; Events Bot never sends it.

### 2.10 Lifecycle read (`GET /api/events-bot/lifecycle`)
Returns stages, activeEvent (incl. outcomes nulls), offerCounts, geo banner.

---

## 3. Visual and interaction contract

Both surfaces use the homepage’s **Demigod gold**, not Night District phosphor:

| Token | Value | Role |
|-------|-------|------|
| Gold | `#C9A84C` | Primary accent, headings, CTAs |
| Gold light | `#E8D5A3` | Secondary text, outlines |
| Cream | `#F5F0E6` | Body on dark |
| Dark | `#0A0A0A` / `#060606` | Page ground |
| Mute | `#A8A29E` | Supporting copy |
| Card | `rgba(14,14,18,.92)` / `#121212` | Surfaces |
| Border | `rgba(201,168,76,.22–.35)` | Hairlines |
| Display font | **Cinzel**, Georgia, serif | H1/H2/H3 |
| Body font | **Manrope**, system-ui, sans | UI, forms, chat body |
| Radius | 12–16px | Cards, buttons |
| Focus | 2px solid `#C9A84C`, offset 3px | a11y |

**Rules:** no phosphor green, terminal chrome, decorative progress, or competing actions.

### 3.1 Public page
Order is fixed and intentionally small:
1. `Events Bot` page title.
2. One-line value proposition.
3. Pill: `San Francisco · in person · private draft`.
4. Safety line: `Nothing is sent, published, booked, or charged.`
5. One optional-direction textarea and one gold **Imagine my event** button.
6. Private draft result region.
7. One closed “What happens after the draft?” explanation.

Do not restore lifecycle strips, status dashboards, calendar authoring, offer tabs, idea/feedback/money forms, shortcut bands, or email fallbacks to this default surface.

### 3.2 Private dashboard
- One Events Bot card; one full-width primary planning button.
- Empty state: **Imagine & plan my event**. Active state: **Continue planning**.
- Show title, stage, next planning need, and the no-external-action safety line.
- Put API health, resources, venue evidence, invite evidence, and queued-draft diagnostics inside closed **System details**.
- A planning failure remains visible in the card status; it never silently advances a gated lifecycle stage.

### 3.3 Shared behavior
- Controls are at least 44×44px; text inputs use 16px type.
- Visible 2px gold focus ring with 3px offset.
- Status and result regions use `aria-live`; the running form exposes `aria-busy`.
- Mobile is one column and the primary action becomes full width.
- Respect reduced motion; no confetti, fake progress, or loop animation.
- Never show ports, secrets, transport internals, or private contact data in public copy.
- No new image asset is required for this minimal surface.

---

## 4. Copy principles
- Calm, frege, specific. No hype. No “AI live on :3460”.
- Lead with the private planning outcome and state the execution boundary once near the action.
- One primary verb per surface; diagnostics are disclosure, not another dashboard.

### 4.1 Canonical strings
- Public lead: “One click, one event plan. Leave the direction blank and Events Bot will invent the room, audience, format, timing, and first operating draft.”
- Public field: “Optional direction.”
- Public action: “Imagine my event.”
- Public safety: “Nothing is sent, published, booked, or charged. Do not add private guest or contact information here.”
- Dashboard actions: “Imagine & plan my event” / “Continue planning.”
- Dashboard safety: “Private planning only. Nothing is sent, published, booked, or charged.”

---

## 5. Information architecture (IA)
```
/?p=events
├── Intro + SF pill
├── No-external-action safety line
├── Optional direction + Imagine my event
├── Private draft result
└── What happens next? (closed)

Private dashboard Home
└── Events Bot card
    ├── Event + stage + next need
    ├── One private planning action
    └── System details (closed diagnostics)
```

---

## 6. Implementation map (files)
| File | Role |
|------|------|
| `demigod-foot-core.js` | `DG_PAGES.events` HTML + `pageCss` events section + mount functions |
| `demigod-events-app.mjs` | API :3460 |
| `demigod-events-bot-chat.mjs` | Chat brain |
| `demigod-events-bot-agent.mjs` | Autonomy tools |
| `demigod-agent-dashboard-ui.html` | Private one-action card + closed diagnostics |
| `demigod-agent-dashboard.mjs` | Private `events-tick` job contract |
| `bin/dg-events-tick` | Authenticated draft-mode planning tick |
| `DEMIGOD-EVENTS.json` | Private store (gitignored) |
| `DEMIGOD-EVENTS-BOT.md` | Product docs |
| `docs/events/EVENTBOT-MASTER-SPEC.md` | **This file** |

## 7. Explicit non-goals (this redesign)
- Not a Luma clone / public ticket marketplace.
- Not green terminal aesthetic.
- Not multi-city.
- Not an external executor: no send, publish, reservation, or charge path.
- Not a public lifecycle dashboard, calendar editor, partner marketplace, or ops console.
- Not Webflow Designer rebuild of the mini-page (foot IIFE only).

---

## 8. Agent instructions (how to use this prompt)

When implementing or reviewing Events Bot:

1. Read this entire document.
2. Prefer **homepage gold Cinzel system** over any MUD/phosphor pattern.
3. Preserve all hard rules in §1.3, lifecycle evidence gates, and the SF gate.
4. Keep public draft generation read-only and the dashboard planning action ops-authenticated.
5. Luma and Partiful remain ready-to-paste drafts until explicit foreground evidence records a real URL.
6. Do not add more public fields or actions without evidence that the one-direction flow cannot cover the need.
7. After code changes: run the smallest relevant EventsBot tests plus source verification.

### Acceptance checklist for redesign
- [ ] No `#a6ffcb` / phosphor chat chrome on Events page
- [ ] Exactly one optional public direction and one public action
- [ ] Public result is explicitly a private draft
- [ ] Nothing sends, publishes, books, or charges
- [ ] Dashboard exposes exactly one primary EventsBot planning action
- [ ] Dashboard diagnostics are inside closed System details
- [ ] Luma says not connected; Partiful says manual/draft
- [ ] SF pill visible near the public action
- [ ] Form uses 16px text, 48px action, and gold focus
- [ ] Mobile single column readable
- [ ] Public mount still binds `#dg-events-chat`, `#dg-ec-form`, `#dg-ec-input`, and `#dg-ec-send`
- [ ] Lifecycle cannot advance without required evidence
- [ ] Source verify green

---

## 9. Narrative experience (UX story)

**First 10 seconds:** A visitor sees the SF/private-draft boundary, an optional direction, and one action.

**Minute 1:** Blank input produces a complete surprise concept; a short direction steers the same one-click draft. Public use changes no lifecycle state.

**Private operator:** The dashboard runs one authenticated draft-mode planning tick. The card shows the next need; detailed evidence and queue diagnostics remain closed unless inspected.

**Later:** Any real invite URL, venue confirmation, RSVP count, attendance, or debrief outcome enters only through its evidence-gated foreground path.

---

## 10. End state vision (still SF-only)
Events Bot can privately invent, resource, and advance an SF event plan while producing ready-to-paste Luma and Partiful materials. External execution remains deliberately separate: no sends, publishing, bookings, or charges.

---

*Hand this file to Grok, Fable, and Codex as the single Events Bot redesign brief.*
