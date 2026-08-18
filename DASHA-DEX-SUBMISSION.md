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
- Jupiter: treat status as **Not Verified** until a real path completes.

  **The pending VRFD request is NOT ours.** Corrected 2026-08-18 after reading the live record.
  Verification `15201` / audit event `23806` was filed 2026-08-07 with
  `senderTwitterHandle: radbrilio` and `twitterHandle: Dashaonsol` — neither is `@dash_eats` and
  neither appears anywhere in this tree. Its description reads *"this is the official dasha
  nekrasova coin"*, which is an authority claim [`DASHA-CLAIMS.md`](DASHA-CLAIMS.md) C1/C5 does not
  support us making. It sits at `evaluationCount: 0`.

  This entry previously read "correct or supersede the existing request instead", which assumed
  23806 was ours to edit. It is not: no credential here owns that request, so there is nothing to
  correct. Anything we filed would be a *second concurrent* request, which is the thing the old
  wording was trying to prevent.

  **The mechanism also changed.** Jupiter no longer accepts verification applications
  ([FAQ](https://verified.jup.ag/faq)). Verification is now discovered automatically from **organic
  score** plus community *smart likes* on the Jupiter token page, or bought via **Express** by
  burning **1,000 JUP**. Our organic score is **0** and tags are `["launchpad","unknown"]`. Express
  is money movement and needs its own authorization in the request that asks for it.

  Re-read this record before acting: `GET https://token-verify-api.jup.ag/verifications/token/<mint>`.
- Prefer correcting DexScreener / Jupiter metadata to getdasha.com + `@dash_eats` over new site features.

Provider forms change; re-check primary sources before any outbound submission. Outbound submissions need **current-user authorization**.
