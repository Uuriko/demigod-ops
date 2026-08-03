# Demigod complete audit — 2026-07-21

> Archived historical context; not operating truth.

## Executive verdict

Demigod is currently a strong, local, service-first recruiting operating system with a public acquisition layer—not yet a durable hosted marketplace or SaaS product.

The core thesis is coherent: a startup submits one consequential role, talent submits evidence, software narrows the pool, a human validates the evidence, both sides consent, Demigod introduces them, and a fee is earned only after a hire. The public website should sell that narrow promise. The private dashboard should operate that loop. The data layer should prove every state transition.

The strongest part of the system is its honesty and safety posture: draft-only external actions, explicit authorization gates, evidence receipts, sample/real separation, mutual-consent controls, source verification, and a cautious billing gate. The weakest part is durability: the same business objects are spread across many JSON ledgers and legacy paths, several writers can lose concurrent updates, the private dashboard can present stale or contradictory projections, and the repository/tool surface is much larger than the current business needs.

Current operating truth is pre-transaction:

- 133 funnel records: 109 disqualified, 18 policy-held, 4 drafted, and 2 approved.
- Zero sent, replied, form-filled, reviewed, proposed, mutual-yes, intro, hired, invoiced, or paid records.
- Zero attributable real open pilots.
- Existing match pairs are samples; no real placement loop has completed.
- Website source is v723 while the last attested release manifest is v698. The newer fixes are unshipped until a separately authorized release.

The right product shape for the next stage is therefore not “build a general recruiting platform.” It is:

1. One truthful website and two excellent intake paths.
2. One operator dashboard for the placement loop.
3. One transactional ontology and event ledger.
4. One evidence-backed path from role to paid outcome.

## Audit scope and evidence

Four agents split the work into public website/forms, private dashboard, workflows/data truth, and whole-repository/tooling. The audit used source tracing, caller scans, current ledger reads, HTTP probes, targeted browser checks, policy tests, source verification, and current primary-source research. No message, form submission, publish, or other external mutation was performed.

The final live HTML probe returned HTTP 200 and referenced the attested v698 foot asset; the CDN body itself could not be freshly fetched from the restricted sandbox. This report therefore distinguishes disk truth, last-attested release truth, and runtime findings. Mobile/accessibility coverage of the public site is not certified by this audit; that remains a test gap rather than a claimed pass.

## What Demigod should model

The previously discussed “ontology” belongs in the data model, not in a new branding layer. The minimum useful graph is:

| Object | Canonical relationship |
|---|---|
| Person | belongs to a talent profile and/or startup team |
| Company | owns roles and hires |
| Role | belongs to one company and defines a 90-day outcome |
| Evidence | supports a profile, role, match, consent, or outcome |
| Match | connects one role and one talent profile |
| Decision | records approve/pass with actor, reason, and time |
| Consent | records each side's observed yes and evidence |
| Intro | exists only after two valid consents |
| Outcome | records interview, offer, hire, or closed reason |
| Invoice | derives from one verified hire and one fee basis |
| Event | append-only record of every state transition |

This gives Demigod one operational language for the website, dashboard, matching, billing, analytics, and later agents. SQLite is enough for this now; a distributed ontology platform is not.

## Ranked findings

### P0 — fix before trusting live operations

1. **Concurrent JSON writers can lose business state.** The canonical submission helper has a locked update path, but triage, Gmail patching, SMS, funnel contact patching, auto-feature, the funnel ledger, pilot OS, and one legacy intro consent path still use unlocked load/mutate/save cycles. Two simultaneous writes can silently overwrite one another.

2. **There is no single source of truth for the placement loop.** Leads, pilots, pairs, matches, and consent each have canonical and legacy representations. Reconcile previously compared 133 funnel records with only three legacy outreach rows and could still report `ok: true`; that meant the integrity command ran, not that the business loop was healthy.

3. **The public calendar accepted unauthenticated mutations.** The POST route allowed a public caller to alter the event store. This was fixed on disk by requiring the operations secret before rate limiting, body parsing, validation, or mutation. A new regression proves a denied request returns 401 and leaves the store byte-identical while public calendar reads and idea submissions remain reachable.

4. **Recovery is local and incomplete.** Private ledgers are excluded from Git, but there is no durable encrypted backup and restore drill. Some corrupt-ledger readers fail open to an empty object, which a later write could make canonical.

### P1 — next implementation block

1. **The secured calendar backend and public UI now disagree.** The public calendar form still offers a write that correctly returns 401. It should become view-only; event suggestions should use the existing public idea path.

2. **Public CTA copy regressed on injected mini-pages.** Canonical copy is “Hire talent” and “Join the talent network,” but `pageCtas()` still renders ambiguous “I'm hiring” and “I'm looking.” It should reuse the existing `COPY.ctaFounder` and `COPY.ctaEngineer` values, with a source gate covering the dynamic path.

3. **Events Bot marketing exceeds demonstrated capability.** Public/SEO copy alternates between autonomous execution claims and the honest reality that sending is pending and execution is private/operator-led. Until transport receipts exist, every surface should describe planning, drafting, and calendar discovery—not “organizer of record” or autonomous execution.

4. **The fee basis is inconsistent.** Public and legal surfaces alternate between “first-year cash” and “first-year cash salary,” while the calculator uses `firstYearCash`. One defined basis must drive pricing, FAQ, agreement, founder copy, and calculation.

5. **The private dashboard is vulnerable to DNS-rebinding reads until its updated process is loaded.** Disk now validates an exact loopback `Host`; the older running process returned 200 to a hostile Host probe. The source fix is tested, but activating all concurrent dirty dashboard changes through an unreviewed restart would be unsafe.

6. **Mutable third-party code executes in the private origin.** The dashboard loads `mermaid@10` from jsDelivr without an immutable version, SRI, or CSP. It can read private same-origin APIs. The Ponytail solution is to remove Mermaid and retain the already escaped text representation, then add a restrictive CSP.

7. **Slim dashboard state can lie by omission.** The initial slim status omits Inbox fields the UI expects; the polling key excludes Inbox and Matches; switching tabs does not guarantee a rerender. A live snapshot showed null slim statistics while `/api/inbox` had populated counts.

8. **Matches contradict themselves.** The summary counted 13 sample pairs while the visible table correctly hid samples and showed no rows. The adjacent “Seed fixtures” control does not seed fixtures—it only refreshes match review.

9. **Running source/process drift is invisible.** Health does not report the loaded source hash or “restart required,” so a healthy old daemon is indistinguishable from the current source.

10. **Consent and identity rules diverge.** Canonical pairs require attestations and evidence, while the legacy intro path does not. Requested intro lookup can fall back to the first mutual match if identifiers do not match. That fallback must fail closed.

11. **Billing is honestly gated but incomplete.** Hire evidence and explicit cash are required and nothing falsely marks invoices paid. Stripe remains disabled, local invoice files lack explicit private modes, and real receipt minting does not yet require transport evidence.

12. **The home directory is still a risky repository boundary.** Ignore rules now cover more personal configurations and private source-of-record patterns, but the working tree still has more than 900 status entries. Cloud CI or broader GitHub automation should wait until Demigod is extracted into a dedicated repository with an explicit tracked-file allowlist.

### P2 — quality and operator efficiency

- One Inbox control (`btnInboxNew`) is inert.
- The private dashboard has wide tables without an overflow container, no skip link, and no end-to-end mobile/focus/action test.
- Public status/MUD copy leaks implementation jargon such as WIZ, raw routes, version markers, and local Node commands.
- Dashboard artifacts can be group-readable on cold start because the service lacks `UMask=0077`; several writers do not set an explicit private mode.
- Dogfood telemetry treats policy refusals and truth-red findings like infrastructure failures, making reliable tools look unreliable.
- Evidence `latest-<producer>` can be overwritten out of completion order by concurrent runs.
- The legacy real-pilot logger cannot satisfy its own authorization contract and an older tracker still contains prohibited SLA/guarantee copy.
- Focus mode exposes eight dashboard tabs, full mode eleven, and old `plane` aliases survive only as compatibility paths.

## Fixes completed during this audit

- Added exact loopback Host validation to the private dashboard HTTP policy and early request guard, with a regression test.
- Secured calendar POST mutations behind the operations secret before parsing or mutation, with a byte-preservation regression test.
- Reused the canonical attributable-pilot classifier in operations reconciliation. The false open-pilot count changed from one fixture to zero real pilots.
- Made coordination claims, digests, and briefs atomically replace with mode `0600`, including a permissive-umask/preexisting-file regression. The supervisor was reloaded and current digest/brief modes are now `600`.
- Updated two stale workflow tests to the actual private-writer and required-resume contracts; both pass without production changes.
- Expanded private/personal ignore coverage and the “no committable source of record” verifier. The privacy tests and verifier pass.
- Replaced duplicated agent-entry/rules documents with pointers to canonical documents and removed stale hard-coded release truth and blanket external-action authority.

No public release was performed. Disk v723 and manifest v698 remain deliberately distinct in this report.

## Ponytail whole-repository audit

The repository has 458 tracked files, 283 tracked top-level `demigod-*.mjs` files, 410 such files on disk, 284 npm scripts, 58 tracked `bin/dg*` wrappers, and several very large deploy/test units. The problem is not dependency bloat—there are only four direct npm dependencies—it is option and script bloat.

Ranked deletion/simplification findings:

1. `demigod-archive-scripts.mjs` — delete or quarantine this stale 82-line destructive archiver; its keep-list no longer represents the active system and it has no dry-run.
2. `package.json` — remove nine deprecated commands that only print a failure, after preserving one migration note in the handbook.
3. `package.json` — remove the direct `chrome-launcher` development dependency; no source caller exists and the established browser paths use Playwright/Puppeteer/CDP.
4. `demigod-agent-dashboard-ui.html` — delete the Mermaid network dependency and render the existing escaped text diagram.
5. `demigod-agent-dashboard-ui.html` / `demigod-control.mjs` — remove the legacy `plane` tab alias after callers are migrated.
6. `demigod-foot-v19.js` and its old resolve/fix callers — migrate the few remaining callers to canonical foot truth, then delete the 429-line fossil.
7. `demigod-heavy-*` and pass/fix/audit/probe/loop/watch scripts — place the roughly 11,900-line pool behind usage receipts, then delete only scripts with no current caller or operational receipt. Blind bulk deletion is unsafe.
8. `demigod-agent-dashboard.mjs`, `demigod-agent-dashboard-ui.html`, and `demigod-foot-core.js` — do not perform a speculative framework rewrite. First delete dead branches and compatibility paths; split a unit only when a tested ownership boundary appears.

Conservative confirmed cleanup opportunity: at least 82 source lines, one direct dependency, nine dead package commands, and one mutable browser dependency. The larger potential pool is roughly 12,000 lines, but it requires receipt-based classification before deletion. The payoff is fewer false choices, fewer stale fixers that can touch canonical files, faster agent orientation, and a smaller review/security surface.

## Tool research and decisions

The selection rule is the same as Ponytail: one tool should close a measured gap and preferably replace custom code or several overlapping vendors.

| Tool/category | Decision | Why for Demigod |
|---|---|---|
| Native Node SQLite | **Adopt first** | Node v24.17 is already installed and `node:sqlite` was verified locally. Transactions, uniqueness, foreign keys, and an outbox eliminate whole classes of JSON locks and duplicate ledgers without adding a dependency. [Node SQLite docs](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) |
| Restic | **Adopt first** | The largest operational risk is unbacked private state. Restic provides encrypted/versioned repositories, integrity checks, snapshots, and testable restores. It is not installed yet. [Restic quickstart](https://restic.readthedocs.io/en/stable/010_introduction.html) · [restore guide](https://restic.readthedocs.io/en/stable/050_restore.html) |
| GitHub Actions + CodeQL + push protection + Dependabot | **Adopt after repo extraction** | There are no workflows today. Native scheduled CI, code scanning, secret blocking, and weekly dependency PRs cover more ground with fewer vendors. Do not upload the home-root repository as-is. [scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) · [CodeQL](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning) · [push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection) · [Dependabot](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates) |
| Knip | **Run as a one-off audit** | It finds unused files, exports, and dependencies and can run without permanent installation. Dynamic scripts will create false positives, so its output should feed the existing receipt/claim audit, never auto-delete. [Knip docs](https://knip.dev/) |
| Playwright trace + axe-core | **Add to existing tests** | Playwright is already installed. Failure traces plus automated accessibility checks directly cover the missing mobile/focus/control behavior. [Playwright accessibility](https://playwright.dev/docs/accessibility-testing) · [trace viewer](https://playwright.dev/docs/next/trace-viewer) |
| PostHog | **Pilot with maximum privacy** | One SDK can cover funnels, paths, feature flags, surveys, replay, and errors, replacing several possible tools. Never capture form answers, resumes, emails, or free text; mask inputs and redact URLs. [product analytics](https://posthog.com/docs/product-analytics) · [replay privacy](https://posthog.com/docs/session-replay/privacy) |
| Cloudflare Access + Tunnel | **Use for private remote dashboard access** | `cloudflared` is already installed. Tunnel uses outbound connections and Access can enforce identity. This exposes the current laptop service only while the laptop is online; it is not hosting. [Tunnel docs](https://developers.cloudflare.com/tunnel/) · [Access integration](https://developers.cloudflare.com/tunnel/integrations/) |
| Stripe Billing/Invoicing/Tax | **Integrate after one canonical hire ledger** | Stripe should create reviewed invoice drafts, use idempotency keys, verify webhooks, and reconcile `invoice.paid`; it should not become another competing source of truth. |
| Supabase/Postgres + private object storage | **Defer until hosted or multi-instance** | This becomes useful when resumes and operations must live off-laptop. At current zero-real-transaction volume, native SQLite plus encrypted backup is smaller and safer. [Supabase overview](https://supabase.com/docs) · [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) |
| Checkly/Sentry/Trigger.dev/Temporal/n8n/ATS/CRM | **Defer** | Existing Playwright, local evidence, and a SQLite outbox cover the immediate jobs. Add hosted monitoring/orchestration only after real traffic or multiple workers make those boundaries real. |

The GitHub plugin was requested and approved during the audit, but its tools were not yet available in this session. Stripe Directory was also attempted as the preferred vendor-discovery path, but the local Stripe CLI was unavailable, so tool comparisons use official primary documentation instead of invented directory results.

## Implementation sequence

### Now: make the local concierge loop durable

1. Define the SQLite schema for the ontology above and migrate one vertical slice: role → match → two consents → intro.
2. Add a transactional outbox even while all sends remain disabled; it becomes the only future delivery boundary.
3. Preserve immutable JSON exports during migration and build parity checks before switching readers.
4. Add encrypted Restic backup, repository checks, and a restore self-test for private ledgers and uploaded evidence.
5. Remove the public calendar write UI, normalize CTAs/fee language/events honesty, and ship only after the normal release truth gate.
6. Reload the reviewed dashboard source; verify hostile Host rejection, slim/full parity, and visible sample totals.
7. Add Playwright trace-on-failure and one axe/mobile/keyboard suite for both public forms and the private dashboard.

### After the first real end-to-end match

1. Extract Demigod into a dedicated repository and enable the native GitHub security/CI stack.
2. Run Knip and the existing usage receipts to delete confirmed dead scripts.
3. Add privacy-minimized PostHog events for CTA → form start → valid submit → reviewed → proposed; keep resume/form content out.
4. Connect Stripe invoice drafts to verified hire events and reconcile signed webhooks back into the same ledger.

### Only when laptop-off availability is required

1. Move the operator service and database to a hosted boundary.
2. Put resumes in private object storage with short-lived signed access.
3. Replace SQLite with managed Postgres only when multiple concurrent instances require it.
4. Add hosted synthetic monitoring and error telemetry at that boundary.

## Final assessment

Demigod does not need more autonomous surface area yet. It needs fewer truths, fewer scripts, and one completed, observable placement loop. Ponytail is useful because it pushes directly toward that outcome. The complementary tools worth adding are the ones that remove custom risk: SQLite for transactions, Restic for recovery, GitHub-native security/CI for repository discipline, Playwright/axe for interaction confidence, privacy-restricted PostHog for conversion evidence, and Cloudflare Access for private remote reachability.
