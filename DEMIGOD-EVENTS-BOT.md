# Demigod Events Bot

**Status:** minimal public private-draft page (`/?p=events`, `/events`) · one-click private operator planning in the dashboard · API on `:3460`  
**Contact:** potter@trydemigod.com · subject “Events Bot” or “Dinner”

## Vision

Events Bot is the private planning operator for **San Francisco** nights: from first idea through resource drafts, run-of-show, follow-up, debrief, and the next cycle. Events do **not** have to be Demigod-branded or talent-matching. The public page accepts one optional direction and returns one private draft; the dashboard runs one authenticated draft-mode planning tick. It may prepare venue, sponsor, volunteer, invite, and outreach materials, but it never sends, publishes, books, or charges.

## Geography rule (standing — for now)

**San Francisco only.** All events, venues, ideas, and outreach are in-person **San Francisco** (SF proper / named SF neighborhoods).  

- Decline NYC / LA / remote-only / Oakland / Peninsula / other cities; offer an SF alternative.  
- Enforced in: chat prompt, `isSfLocation()` allow/deny lists, agent tools, offer API, identity blurb.  
- Expand to other cities only when this rule is explicitly lifted.

## Honesty rails (2026-07-22)

- **No fake sends** — outreach remains `queued`/draft; Events Bot has no delivery path (no `sent_stub`).  
- **No external execution** — public drafts and dashboard ticks never send messages, publish events, reserve venues, or spend/charge money.  
- **Idempotent ticks** — duplicate idea titles and same `toEmail+kind` unsent outreach are deduped.  
- **Money intents** do not inflate public sponsor counts (`money: true` excluded).  
- **Ops routes** (`agent/tick`, `outbox`, `POST /event`, `agent/status`) require `x-dg-events-ops` when `DEMIGOD_EVENTS_OPS_SECRET` is set.  
- Outcome fields on active event: `invited|confirmed|attended|mutualInterestPairs|secondMeetings|debrief` (null until real).

## Lifecycle

| Stage | Bot prepares privately | Evidence required to progress |
|-------|------------------------|-------------------------------|
| **Ideate** | Idea, outcome, seats, SF windows | None; all are draft assumptions |
| **Resource** | Venue shortlist, matched offers, draft asks | A selection is not a booking |
| **Plan** | Agenda, invite, Luma/Partiful drafts | Future date/time and venue evidence |
| **RSVP** | Tally structure and reminder drafts | Real recorded invite URL; counts stay null until real |
| **Run** | Day-of checklist and host frame | Real-world host execution |
| **Follow-up** | Thanks, feedback, mutual-interest drafts | Mutual yes before intros |
| **Debrief → next** | Learnings, recycled offers, next seed | Host-attested outcomes only |

## Public and private surfaces

### Public `/?p=events`

- One optional **Direction** textarea; blank means the bot invents the event.
- One **Imagine my event** action.
- One private draft result; no lifecycle mutation and no private guest/contact data.
- Explicit boundary: nothing is sent, published, booked, or charged.

### Private dashboard

- One Events Bot primary action: **Imagine & plan my event** when empty, **Continue planning** when active.
- The card shows event, stage, next need, and the same no-external-action boundary.
- API, resource, venue, invite, and queued-draft diagnostics are inside closed **System details**.
- The action runs authenticated `events-tick` in draft mode and preserves every lifecycle evidence gate.

## Offers (private/backend; not the public default surface)

- **Sponsor** — contribution intent (no exclusivity / attendance promises)
- **Venue** — space, area, capacity (offer only; host accepts)
- **Volunteer** — services (check-in, photo, setup, …)

Stored in private `DEMIGOD-EVENTS.json`. Public GET returns **counts + non-contact recent blurbs only** (no emails).

## API (`node demigod-events-app.mjs` → `:3460`)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/events-bot/health` | Probe (openai flag) |
| POST | `/api/events-bot/chat` | Public read-only private-draft generator |
| GET | `/api/events-bot/lifecycle` | Stages + active event summary |
| POST | `/api/events-bot/offer` | Record sponsor/venue/volunteer |
| GET | `/api/events-bot/offers` | Public-safe counts |
| POST | `/api/events-bot/event` | Host brief / stage (ops) |
| POST | `/api/events-bot/agent/tick` | Authenticated private draft-mode planning tick |

The public page probes localhost:3460 or `window.DG_EVENTS_BOT_API`; founder-facing copy never shows ports. The public action receives no ops authority.

## Invite platforms

- **Luma:** not connected. The official API requires a per-calendar API key, and API access requires Luma Plus. Events Bot prepares ready-to-paste Luma drafts only; a generic `LUMA_API_KEY` is not treated as a connection or external authority.
- **Partiful:** manual/draft only. No official public event-creation API was found, so Events Bot prepares the event fields and host checklist for manual creation.
- Neither platform is published by a dashboard tick. A real invite URL is recorded only from explicit foreground evidence.

## Visual system

**Homepage gold Demigod** (Cinzel / `#C9A84C` / cream / dark) — **not** Night District phosphor green.  
**Master prompt (all agents):** [`docs/events/EVENTBOT-MASTER-SPEC.md`](docs/events/EVENTBOT-MASTER-SPEC.md)  

## Files

| File | Role |
|------|------|
| `DEMIGOD-EVENTS.json` | Private lifecycle + offers store |
| `demigod-events-app.mjs` | HTTP API + static events HTML |
| `demigod-events-bot-chat.mjs` | Chat brain (OpenAI or offline) |
| `demigod-events-bot-agent.mjs` | Autonomy tools + SF gate |
| `demigod-agent-dashboard-ui.html` | Private one-action Events Bot card + closed diagnostics |
| `demigod-agent-dashboard.mjs` | Private `events-tick` job |
| `bin/dg-events-tick` | Authenticated draft-mode planning action |
| `demigod-foot-core.js` | Minimal public `DG_PAGES.events` private-draft UI |
| `demigod-events-data.json` | Public marketing feed (no private offers) |
| `docs/events/EVENTBOT-MASTER-SPEC.md` | Full product + visual + function prompt |

## Live vs pending

| Layer | State |
|-------|--------|
| Public optional direction + private draft action | **Implemented on disk** |
| Dashboard one-click private planning + closed diagnostics | **Implemented on disk** |
| Local API draft generation / private records | **Live when app is running** |
| Luma API | **Not connected** — per-calendar key + Luma Plus required |
| Partiful API | **Unavailable/not found** — manual draft path only |
| SMS, external publishing, venue booking, Stripe charge | **Not performed by Events Bot** |

## Do not build (yet)

DB, accounts, more public forms, auto-send, auto-publish, ticketing, public attendee list, ungated stage flips, venue booking, or charge capture.

## Honesty

No fake RSVP counts. No SLA clocks. Placement fee only if a hire starts later from an intro (10% of first-year base salary; equity, discretionary bonus, commission, and benefits excluded). Talent never pays Demigod.
