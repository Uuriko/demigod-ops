---
status: reference
last_verified: 2026-08-11
---

# Dasha listing / verification pack (compact)

**Full historical pack:** [`archive/dasha-docs/DASHA-DEX-SUBMISSION-FULL.md`](archive/dasha-docs/DASHA-DEX-SUBMISSION-FULL.md)  
**Claims:** [`DASHA-CLAIMS.md`](DASHA-CLAIMS.md) · **Marketing boundary:** [`DASHA-CRYPTO-MARKETING-BOUNDARY-2026-08-09.md`](DASHA-CRYPTO-MARKETING-BOUNDARY-2026-08-09.md)

## Identity (submit only these)

| Field | Value |
|---|---|
| Mint | `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` |
| Website | `https://www.getdasha.com` |
| X | `https://x.com/dash_eats` |
| Icon hash (when required) | `48797c99d751dc140b9782ae01026b0dcdbc95fd1b4a95d0a9979ab67723e0d3` |

## Do / do not

- Do not submit `t.me/dashacommunity` (banned / unofficial).
- Avoid bare authority claims without a scoped noun (site vs token vs account stay separate).
- **Do not** invent a second mint or a fake verification path.
- **Do not create or substitute a fake** social or website for provider forms.
- Jupiter: treat status as **Not Verified** until a real path completes. **Prepared V4 verification note** / **VRFD V4** context: **Standard review is free**; Express historically **1,000 JUP**; materials must be **dedicated exclusively to the project**. Audit/event refs in use: **23806**. **Do not create a second blind Standard application** while one is pending.

  **Correction 2026-08-18 — request 23806 is NOT ours.** This entry used to end "correct or
  supersede the existing request instead", which reads as though we could edit it. Reading the live
  record shows we cannot:

  | field | value |
  |---|---|
  | verification / audit | `15201` / `23806`, `pending`, `evaluationCount: 0`, filed 2026-08-07 |
  | `twitterHandle` | `Dashaonsol` — not `@dash_eats` |
  | `senderTwitterHandle` | `radbrilio` — not us |
  | `description` | *"this is the official dasha nekrasova coin…"* |

  Neither handle appears anywhere in this tree, so no credential here owns that request and there is
  nothing for us to correct. Its description is an authority claim [`DASHA-CLAIMS.md`](DASHA-CLAIMS.md)
  C1/C5 does not support us making, so we would not want it verified in that wording even though it
  names our mint. The standing rule is unchanged and now for the right reason: anything we filed
  while it is pending would be a *second* concurrent request.

  Current market-side status, read the same day: Jupiter tags are `["launchpad","unknown"]` and
  **organic score is 0**, which is the discovery signal that moves independently of any submission.

  Re-read the record rather than this file before acting:
  `GET https://token-verify-api.jup.ag/verifications/token/<mint>`.
- Prefer correcting DexScreener / Jupiter metadata to getdasha.com + `@dash_eats` over new site features.

Provider forms change; re-check primary sources before any outbound submission. Outbound submissions need **current-user authorization**.
