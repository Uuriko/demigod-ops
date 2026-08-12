---
status: historical
archived: 2026-08-11
owner: grok
created: 2026-08-11
lane: transmission-001-redteam + referral-evidence
method: read-only source, runbook, relay, metrics and test inspection
authority: DASHA-ROADMAP.md
---

# Dasha Grok red-team — Transmission 001 experiment and referral evidence

## VERDICT

**BLOCKED** for treating the current Transmission 001 contract as G2-ready evidence without the **P0 runbook/operator corrections** below.

**PASS** on instrument architecture and referral non-build: reuse of Studio fragment grammar, Relay Lab material check, allowlisted `src=transmission-001`, aggregate-only metrics, and explicit exclusion of Simp/referral credit before G2/G5 is correct. Do **not** invent identity or referral infrastructure for this test.

Local preparation may continue. Outbound post / G2 claim remains blocked until P0 operator-contract fixes land in `DASHA-TRANSMISSION-001.md` (or equivalent durable runbook). No product code is required for those fixes.

## EVIDENCE

Read-only inspection on 2026-08-11. No publishes, posts, forms, wallets, product edits or registry changes.

| Artifact | Role |
|---|---|
| `DASHA-TRANSMISSION-001.md` | Experiment runbook, ledger, stop/adapt, variants |
| `DASHA-EXECUTION-PLAN-2026-08-11.md` | G0–G5, Workstream 3, referral WS5 after G4 |
| `DASHA-EXECUTION-BASELINE-2026-08-11.md` | Funnel baseline; Studio open→edit loss; export/share below threshold at baseline |
| `DASHA-ROADMAP.md` §Phase 1.5 | G2 gate numbers and kill rules |
| `DASHA-PARTICIPATORY-CULTURE-RESEARCH-2026-08-08.md` | Measurement funnel and evidence that does/doesn't count |
| `dasha-meme-studio.html` (+ root tests) | Campaign allowlist, `src` survival, parent lineage, telemetry |
| `dasha-relay-lab.html` + `dasha-relay-lab.test.mjs` | Material change = look/format/line; domain/path bounds |
| Worker-tree `dasha-lobby-worker.mjs` | `/studio/event` source only on `open`; public funnel strips `sources` |
| `dasha-simp-review.mjs` | Authenticated metrics summary exposes `sources` |
| Live public metrics (session) | Studio opens 89, firstEdits 24, completions 7, exports 6, shares 5; no public source slice |

Key source facts:

1. **Attribution is open-only.** Worker increments `sources.transmission001` only when `event === 'open'` and source is allowlisted; `first_edit` / `export` / `share_*` are global counters only.
2. **Relay material rule is look/format/line equality** on two valid `getdasha.com|/studio` links; photo/effect/sticker deltas are invisible to Relay and to Studio parent (`pLook`/`pFormat`/`pLine`) logic.
3. **Share path often never fires `export`.** Native share / X-intent share track `share_intent` (+ success/completion) without `export`; Save PNG / copy / GIF / kit fire `export`.
4. **`src=transmission-001` survives editable handoff** (Studio test). Starter Relay-parses cleanly (`ticket`/`story`/`At 11:47 PM, I was…`).
5. **Referral pilot remains G5**, after G2→G4; Transmission runbook forbids points/referral credit. Correct.

## FINDINGS

Severity: **P0** = can falsify G2 or force wrong stop/adapt/continue; **P1** = serious bias or missed signal, fix before or during first window; **P2** = polish / residual risk.

### Ranked table

| Sev | Area | Finding | Minimal correction |
|---|---|---|---|
| **P0** | Dedupe / distinct people | “Participant key” is free-form operator label; not bound to the public reply’s account. Distinctness and non-operator status are not operationalized. | Define **distinct person** = unique public X handle (or account id) from the **public reply URL**. Participant key = that handle (or stable hash of it). One valid first submission per handle. |
| **P0** | Operator-example exclusion | “Keep operator examples separate” has no named operator identity list. Contamination of the 5-submission G2 count is easy and unfalsifiable after the fact. | Add a closed **operator handle list** in the runbook before launch. Any reply from those handles is forced `operator-example`, never gate-counted. |
| **P0** | Stop / adapt / continue evidence | “Real distribution,” “same shared step,” and the band between stop (&lt;2) and G2 pass (5) are undefined. Metrics cannot prove distribution or per-step failure. | Define: **real distribution** = authorized original post live ≥N hours with recorded URL + non-zero `sources.transmission001` open delta *or* ≥1 non-operator reply. **Adapt** only when ≥2 credible non-operator attempts fail the **same ledger-coded step** (open / edit / export / reply-with-link / ack). **Continue** = ≥2 valid artifacts and window not closed, without claiming G2. Record decision evidence in closing template fields. |
| **P0** | Material change / validity tiers | Runbook says a valid row needs material change **and** safe editable link, then says missing editability can still count as a submitted artifact. Roadmap counts “submissions” and “materially changed” separately. | Use three explicit tiers: **submitted** (public reply under original with image *or* link), **material** (Relay `material_edit:true` vs prepared starter), **editable-handoff** (Relay-valid child URL present). Map G2: submissions ≥5, material ≥3, editable ≥1. Do not call PNG-only rows `valid` for the material or handoff counts. |
| **P1** | Attribution | `sources.transmission001` is **opens only**. Global first-edit/export/share cannot be attributed to the campaign. Soft reading of global completion as Transmission success will mislead. | Keep runbook rule (already stated). Add: **G2 never uses metrics alone**. Closing record must pair `sources.transmission001` Δ with ledger counts; treat openΔ as “reached Studio from starter,” not conversion. Optional later (post-G2): source-scoped counters — **not required now**. |
| **P1** | Variant comparison | Three post variants share one `src=transmission-001`. No post-id in metrics or ledger. Entry-point quality cannot be compared. | Launch **one** original post for the seven-day window (runbook already prefers this). If multiple entry points are used later, add ledger column **entry_point** (post URL only) — not new product identity. Do not mint `src=transmission-001-a/b` without a deliberate metrics allowlist change. |
| **P1** | Editable-link handoff | Share UX can drop the fragment (image-only arm, user posts PNG only, platform strips URL). Ledger allows missing editability as submission but G2 needs ≥1 editable. | In the authorized post copy, require **both** image and editable link in the reply. In review: if only PNG, mark `submitted` / not material-via-Relay unless a later reply supplies a link. Prefer Relay observation over eyeballing screenshots. |
| **P1** | Submission path | Single public-reply queue is good. Quote-posts only count if also replied under original — easy to miss in ops. DMs/forms are correctly banned. | At launch, write post URL into the runbook. Review SOP: **queue = replies under that URL only**; quote URL may be linked *inside* a reply, never as a second inbox. |
| **P1** | Public acknowledgement | “End of next calendar day” has no timezone, no received-at clock start, no coverage if operator is offline. Research shows *any* reply matters more than tone. | Fix timezone (e.g. UTC or PT) in runbook. **Received** = reply timestamp. Ack = project’s public reply URL in ledger by deadline. Missed ack fails that row’s G2 ack rate even if artifact is material. |
| **P1** | Abuse resistance | (a) `/studio/event` has origin allowlist but **no rate limit**; reload/console can inflate `transmission001` opens. (b) Trivial line edits / homoglyphs satisfy Relay. (c) Multi-account public replies pass weak distinctness. (d) No points/referral — good, removes farm incentive. | (a) Never gate on open counts; note inflation in interpretation. (b) Add **minimal material bar**: at least one of look/format change **or** line edit that is not whitespace/punctuation-only vs starter (operator judgment recorded in notes; Relay remains first filter). (c) Distinct = public handle; do not invent PoP. (d) Keep zero rewards. |
| **P1** | Metrics / share vs export | Completions can rise without exports when users only Share. Baseline and public funnel understate “export” relative to share completion. | Interpret **completion ∪ export ∪ share_intent** for Studio health; for Transmission, **ledger owns truth**. Do not adapt Studio on export-only reading during the campaign. |
| **P2** | Studio `first_edit` vs material | `first_edit` fires on photo/effect/sticker/gesture as well as look/format/line. Unchanged look/format/line can still set first_edit and produce a different PNG, but Relay = no material. | Document: **telemetry first_edit ≠ gate material**. Gate material = Relay only. |
| **P2** | Return / remix evidence | Column exists; no rubric for “return,” “remix,” or “request for another.” Roadmap needs ≥1. | Rubric: **return** = second public reply from same handle in window; **remix** = child URL whose parent state matches another participant’s or the starter with further material change; **request** = explicit ask for next prompt in public reply. One is enough for G2. |
| **P2** | Pre-submit guidance | Research favors guidance before submission; draft variants mention image+link but not source/permission/non-endorsement. | One short clause in the authorized post: stay transformative, no endorsement/price claims, no others’ private media without permission. |
| **P2** | Transmission view step | Research funnel step 1 is “Transmission view”; only Studio open with `src` is instrumented. | Accept as limitation: **post impressions are not product metrics**. Do not build view tracking for G2. |
| **P2** | Fixture coverage | `dasha-simp-review` summary fixtures omit `transmission001` source key (worker has it). | When next touching review tests, include `transmission001: 0` in source fixture — not launch-blocking. |

### Dimension notes (concise)

**Submission path** — Strong: one public reply queue, no DM/form/wallet. Weak: ops discipline on quote-posts; post URL must be frozen at launch.

**Attribution** — Correctly limited: open-only `transmission001` + manual ledger. Weak: temptation to over-read global Studio completions as campaign success.

**Dedupe** — Weakest gate integrity point. Free-text keys without handle binding.

**Public acknowledgement** — Conceptually right (reply URL, not likes). SLA clock and timezone missing.

**Operator-example exclusion** — Intent correct; mechanism incomplete without named handles.

**Abuse resistance** — Appropriate for zero-reward test. Residual: open inflation, trivial edits, multi-account. Do not “fix” with identity systems before G2.

**Editable-link handoff** — Product path (Share carries `remixURL()` with `src`) is tested and sound. Human strip of the link is the main failure mode; ledger already partially accounts for it if tiers are clarified.

**Variant comparison** — Not instrumented. Prefer single post; do not invent multi-src product surface for this experiment.

**Stop / adapt / continue** — Numbers exist (2 stop, 5 G2) but middle band and adapt trigger lack operational definitions tied to ledger-coded steps.

**Referral evidence design** — **Sound non-design.** Roadmap G5 + execution WS5 correctly require G2→G4 first; Transmission forbids referral credit. Prefer existing aggregate metrics and Relay Lab. **Do not build** opaque invite graphs, delayed connector scoring, or self-referral fixtures for Transmission 001.

### Strengths (do not break)

- No new route, account, upload, reward or automated ingestion for the experiment.
- Relay Lab dual grammar + material observation without storage/submission.
- Campaign source allowlist (`home` / `quiz` / `transmission-001`) with tests; unknown `src` discarded.
- Telemetry body is `{ event, source }` only — no creative text or identity.
- Public metrics threshold suppress small cohorts and strip source slices.
- Parent lineage is immediate-parent only; hostile/overlong parent rejected.
- Explicit zero points/referral for this test.

## Precise minimal corrections (runbook-only)

Apply to `DASHA-TRANSMISSION-001.md` before outbound authorization. **No product/code change required for launch integrity.**

1. **Identity for the ledger**
   - Distinct person = unique public reply author handle.
   - Operator handle denylist listed explicitly; those rows are always `operator-example`.

2. **Validity tiers**
   - `submitted` | `material` | `editable-handoff` | `invalid` | `operator-example`.
   - Material ⇔ Relay Lab observation vs **prepared starter URL**, `material_edit: true`.
   - Editable-handoff ⇔ material **and** Relay-valid child Studio URL in the reply.
   - G2 mapping matches Roadmap counts using those tiers.

3. **Stop / adapt / continue**
   - Freeze original post URL + baseline metrics timestamp at launch.
   - Real distribution, adapt (same step, ≥2 failures), continue, and G2 pass definitions as in the P0 table.
   - Closing template adds: baseline/close `sources.transmission001`, openΔ, tier counts, ack on-time rate, decision evidence sentence.

4. **Variants**
   - One authorized original post for the seven-day window.
   - Other drafts stay unposted unless a later authorized adapt run chooses a single different copy (still one `src`).

5. **Ack SLA**
   - Timezone + received-at = reply time; ack = project public reply URL by end of next calendar day in that zone.

6. **Interpretation guardrails (already half-stated; harden)**
   - Metrics prove attributed opens and global Studio health only.
   - Ledger + Relay own people, material, handoffs, returns.
   - Never reset shared metrics for this experiment.
   - Never award Simp/referral credit.

## HANDOFF

| Item | Action owner | Notes |
|---|---|---|
| Apply P0 runbook corrections | Codex (experiment owner) or authorized writer | Claim `DASHA-TRANSMISSION-001.md` on bus before edit |
| Independent check of corrected contract | Claude (rubric) + Grok (this red-team) | Read-only review; no product code |
| Outbound post | **Current-request auth required** | Prepared variants ≠ posted |
| G2 claim | Only after ledger tiers + operator denylist + frozen post URL | Metrics alone insufficient |
| Referral / identity work | **Do not start** | Gated on G2 then G4; this red-team does not unlock G5 |
| Product/code changes | None required for P0 | Optional P2 test fixture only if already editing review tests |
| Save this receipt | Bus → `DASHA-GROK-TRANSMISSION-REDTEAM-2026-08-11.md` | This session did not write the file |

**Bottom line:** The creative instrument and aggregate observation stack are good enough. The experiment is **blocked as G2 evidence** until distinct-person, operator exclusion, validity tiers and stop/adapt definitions are made mechanical in the runbook—still without building identity or referral systems.
