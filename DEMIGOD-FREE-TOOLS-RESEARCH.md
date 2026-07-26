# Free tools/APIs for Demigod — research (2026-07-26)

Free-tier only, ranked by concrete plug-in value to the directory / ledger / Pulse / funnel beacon.
Licenses + PII flagged (the directory uses only openly-licensed, attributed data + no PII — a legal/sourcing constraint, not a positioning claim). All ATS feeds below are public
*employer* job data — no candidate PII.

## 1. More ATS providers → widen directory + role-ledger (no auth, no keys, no PII)
| Provider | Public feed | URL pattern | Verdict |
|----------|-------------|-------------|---------|
| SmartRecruiters | ✅ | `api.smartrecruiters.com/v1/companies/{id}/postings` (+ `/{id}` detail) | **ADD — top pick.** Clean paginated REST. |
| Workable | ✅ | `apply.workable.com/api/v1/widget/accounts/{account}` | **ADD.** One call = full board. |
| Recruitee | ✅ | `{company}.recruitee.com/api/offers/` | **ADD.** Published offers JSON. |
| Personio | ✅ (XML) | `{company}.jobs.personio.de/xml?language=en` | **ADD (XML parse).** No auth/anti-bot. |
| Workday | ✅ (per-tenant POST) | `POST {co}.wdN.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` | Phase-2, named big employers only (per-tenant slug+region). |
| Teamtailor / JazzHR / Comeet | ⚠️ per-customer key/opt-in | — | SKIP (no universal unauth surface). |
| BambooHR / Rippling | ❌ auth required | — | SKIP. |
**Plug-in:** 4 new adapters (SmartRecruiters, Workable, Recruitee, Personio) in the ledger poller +
enrich — same "poll public board, diff first-seen roles" mechanic, ~doubles ATS coverage.

## 2. Kill the rotating quick-tunnel (funnel beacon fragility)
- **Cloudflare Workers — recommended.** 100k req/day, no credit card, stable `*.workers.dev`. ~15-line
  POST-and-log sink → Workers KV (1GB / 1k writes-day free; batch if beacons exceed). Eliminates the
  self-host + tunnel entirely.
- **Named Cloudflare Tunnel** — free w/ a domain on CF DNS; stable hostname, keep the current events-bot
  sink. Smallest change.
- Runners-up: Deno Deploy (1M req/mo, no CC), Val.town (tiny; public-code is fine for a beacon sink).

## 3. Daily ledger poll without an always-on laptop
- **GitHub Actions cron on a PUBLIC repo — top pick.** Unlimited free minutes; the daily job commits the
  updated first-seen ledger back (versioned + attributed). Traps: private-repo
  cron fires unreliably + burns quota (keep it public); scheduled workflows auto-disable after 60 days of
  no activity (the daily commit keeps it alive); 5-min min, UTC.
- **Cloudflare Cron Triggers** if the beacon already lives on a Worker (one platform).

## 4. Free SF company / hiring-signal data (honest enrichment) — license is the constraint
| Source | License | Fit |
|--------|---------|-----|
| **SEC EDGAR** | US public domain (cleanest) | **BEST.** Funding/S-1, real HQ, WARN cross-ref. 10 req/s, UA w/ email. |
| **YC-oss** (in use) | CC0 mirror | KEEP. Note `changes/latest.json` diff = free "who's new" Pulse signal. |
| **layoffs.fyi** | free **with attribution** | USE (attributed) — layoffs = strong honest hiring signal. No API; public sheet/Kaggle. |
| **GitHub org activity** | public API (5k/hr auth) | USE — per-company "is it actually building" signal, public handles only. |
| **OpenVC** | redistribution unstated | ⚠️ internal enrichment only, do NOT republish. |
| **levels.fyi** | license forbids redistributing derived/aggregate data | ✗ AVOID public-facing — republishing it would violate their license (redistribution forbidden). |

## 5. Analytics — keep the beacon (it does custom anonymized funnel events these don't)
Add only for *site traffic*: Cloudflare Web Analytics (no-cookie, but 10% sampling / 30d retention) or
self-host Umami (MIT, exact, cookie-free). Not a beacon replacement.

## Top plug-ins, in order (all buildable, all free, all honest)
1. **Ledger/enrich:** add SmartRecruiters + Workable + Recruitee + Personio adapters (~2× ATS coverage).
2. **Beacon:** move the sink to a Cloudflare Worker (durable, no rotation) — the tunnel-fragility fix.
3. **Scheduling:** daily ledger poll via GitHub Actions cron on a public repo (ledger versioned free).
4. **Pulse:** SEC EDGAR + layoffs.fyi (attributed) + YC-oss change feed + GitHub org activity signals.

**License red flags:** levels.fyi (no redistribution) and OpenVC (unstated) — do not publish either.
Everything else is public-domain / CC0 / MIT / free-with-attribution — no redistribution constraint.
