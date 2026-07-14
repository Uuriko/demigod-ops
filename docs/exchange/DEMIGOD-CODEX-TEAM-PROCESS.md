# Demigod Team Process — founder + agent swarm

Operating truth: SF human-matched talent; 10% on hire; mutual yes before intro; 90-day outcome. Live v198, disk v199, publish freeze ON. Evidence beats claims; samples never become pilots, roles, receipts, or proof.

## 1. Process map

| Stage | Executable exit checklist | System of record |
|---|---|---|
| Demand | [ ] Named target and permission basis recorded [ ] outreach sent by authorized human/account [ ] response/status logged [ ] no invented traction | `demigod-ops/demand/outreach-ledger.*` |
| Intake | [ ] `bin/dg inbox` reviewed [ ] identity/contact minimized [ ] consent and role/candidate intent clear [ ] 90-day outcome captured [ ] duplicate/spam dispositioned | `DEMIGOD-SUBMISSIONS-INBOX.json` + intake record |
| Match | [ ] `bin/dg matches` run [ ] must-have evidence scored [ ] conflicts/bias risks reviewed [ ] founder and candidate approval requested separately [ ] pair state updated | `DEMIGOD-PAIRS.json` + `/tmp/dg-busy/match-review-latest.json` |
| Intro | [ ] mutual yes recorded [ ] disclosure boundaries confirmed [ ] intro draft checked [ ] both parties included [ ] timestamp and owner logged | intro receipt linked from pair record |
| Hire | [ ] start/acceptance verified [ ] fee basis and payment terms match signed terms [ ] invoice generated [ ] no Stripe claim unless operational | hire record + invoice/receipt path |
| Proof | [ ] 30/60/90-day check-ins scheduled [ ] outcome recorded [ ] publication consent explicit [ ] anonymize if required [ ] no near-miss presented as placement | outcome record + consent receipt |
| Ops/Ship | [ ] freeze status checked [ ] gates appropriate to change pass [ ] live/disk/CDN labeled separately [ ] artifact and rollback recorded [ ] compressed state updated after an actual ship | `/tmp/dg-busy/` gate JSON + ship ledger |

## 2. Checklist inventory

| ID | Owner hat | When | Commands/tools | Pass criteria | Artifact |
|---|---|---|---|---|---|
| DEM-01 Demand batch | Founder/GTM | Before each outreach batch | control plane; outreach ledger | every send has target, channel, date, template, status; no unsent item counted | `demigod-ops/demand/outreach-ledger.csv` |
| INT-01 Inbox triage | Talent ops | Daily when active | `bin/dg inbox`; Dash `:9878` | all new items are real/duplicate/spam, owner assigned, sensitive fields restricted | `/tmp/dg-busy/submissions-inbox-latest.json` |
| INT-02 Brief acceptance | Talent lead | Before sourcing | intake form + 90-day outcome rubric | role, location, cash/equity, must-haves, interview owner, fee/terms, consent complete | `demigod-ops/intake/<brief-id>.md` |
| MAT-01 Pair review | Matcher | Before either-side pitch | `bin/dg matches`; `match-review`; `DEMIGOD-PAIRS` | evidence-backed fit, gaps stated, conflicts checked, no auto-intro | `/tmp/dg-busy/match-review-latest.json` + pair entry |
| INT-03 Mutual-yes intro | Account lead | Immediately before intro | intro template; pair ledger | two separate affirmative consents, current contact permission, claims checked | `demigod-ops/intros/<pair-id>.md` |
| HIR-01 Hire/invoice | Finance hat | Accepted offer/start | pilot terms; invoice checklist | hire verified, fee calculation reviewed, due date and delivery recorded | `demigod-ops/finance/<hire-id>/` |
| PRF-01 90-day outcome | Success hat | 30/60/90 days | pilot logger; outcome template | check-in facts logged; testimonial/logo use requires separate consent | `demigod-ops/outcomes/<hire-id>.md` |
| BRD-01 Board publish | Board steward | Any board mutation | board honesty verifier; board publish tool; `bin/dg freeze` | real/sample classification evidenced, cap respected, freeze OFF, audit entry written | `DEMIGOD-BOARD-AUDIT.jsonl` |
| WEB-01 Website ship | Release owner | Intentional release only | `bin/dg freeze`; `bin/dg ship-prep`; `bin/dg full-check --release`; `bin/dg live`; `bin/dg mime` | freeze explicitly OFF; source/CDN/live identity proven; smoke and rollback ready | `/tmp/dg-busy/ship-checklist.json` + ship ledger |
| AGT-01 Agent task | Task owner/reviewer | Before nontrivial work | `bin/dg-session-contract`; lock; verify command named in contract | bounded touch list, single writer, stop condition, evidence, honest handoff | `/tmp/dg-busy/contract-*.json` + handoff |
| OPS-01 Session health | Operator | Start/end of workday | `~/agent-dev.sh status`; `bin/dg home`; hygiene prune | dashboard reachable, freeze visible, tabs 4–8, no hung swarm/extra writer | `/tmp/dg-busy/control-plane.json` |

## 3. Missing checklists, ranked

P0 — required before handling a real search or money:

- [ ] `INTAKE-ACCEPTANCE`: client authority, lawful role criteria, compensation, location, 90-day outcome, consent, terms.
- [ ] `CANDIDATE-CONSENT-AND-DISCLOSURE`: representation consent, data fields allowed to share, salary/location, withdrawal/deletion route.
- [ ] `MUTUAL-YES-INTRO`: independent yes receipts, disclosure scope, duplicate/ownership check, intro receipt.
- [ ] `CLIENT-TERMS-FEE-INVOICE`: 10% definition, guarantee/replacement if any, payment trigger/due date, tax/vendor path, disputes.
- [ ] `INCIDENT-AND-DATA-RESPONSE`: exposure triage, containment, notification decision, evidence preservation, key rotation.
- [ ] `HIRE-AND-90DAY-OUTCOME`: hire verification, invoice, 30/60/90 follow-ups, proof consent.

P1 — add once the first real pilot enters intake:

- [ ] `MATCH-QUALITY-RUBRIC`: must-have evidence, calibrated score, adverse-impact/bias check, conflicts, reviewer sign-off.
- [ ] `SOURCE-AND-OUTREACH-COMPLIANCE`: source provenance, opt-out, channel rules, suppression list, message approval.
- [ ] `PILOT-LAUNCH/CLOSE`: capacity, owner, cadence, escalation, retrospective; never create a pilot record without a real counterparty.
- [ ] `VENDOR-AND-ACCESS-REVIEW`: Webflow/CDN/email/Stripe processors, least privilege, offboarding, backup owner.
- [ ] `BUSINESS-CONTINUITY`: submission export, pair ledger backup, manual intro/invoice fallback, recovery rehearsal.

P2 — scale controls after repeat volume:

- [ ] interviewer calibration and structured-feedback QA; client/candidate complaint and appeal; placement ownership disputes.
- [ ] portfolio SLA measurement only after actual service data; quarterly access recertification; vendor risk renewal.
- [ ] cohort metrics dictionary for briefs→matches→mutual yes→intros→hires→90-day outcomes, with denominator rules.

## 4. Weekly operating rhythm

| Day | Default checklist |
|---|---|
| Monday — demand/capacity | [ ] `bin/dg home` [ ] inspect freeze [ ] choose one weekly outcome [ ] review active briefs/pairs [ ] authorize outreach batch [ ] name owners and WIP limits |
| Tuesday — intake/sourcing | [ ] `bin/dg inbox` [ ] disposition new items [ ] accept/reject briefs [ ] source only against accepted must-haves [ ] log provenance |
| Wednesday — match/review | [ ] `bin/dg matches` [ ] review pair evidence and bias/conflicts [ ] request separate yeses [ ] no unsolicited intro |
| Thursday — intros/success | [ ] send approved intros [ ] chase only consented threads [ ] run due 30/60/90 check-ins [ ] record factual learnings |
| Friday — truth/finance/ship | [ ] reconcile hires/invoices [ ] board honesty review [ ] `bin/dg full-check` [ ] `bin/dg live` [ ] `bin/dg mime` [ ] prune tabs [ ] ship only if planned and freeze explicitly OFF |
| Weekend/default | [ ] no cosmetic churn [ ] incident response only for P0 [ ] queue decisions for Monday |

## 5. Definitions of Ready / Done

| Work item | Ready | Done |
|---|---|---|
| Website ship | approved change + rollback; canonical files identified; single writer; freeze decision owner named | freeze OFF at execution; `ship-prep` and `full-check --release` pass; CDN/live/disk proven; live smoke; ship ledger + compressed state updated; freeze restored if policy says |
| Pilot | real named counterparty; accepted brief; owner/capacity; consent/terms; success outcome and cadence | agreed scope completed/closed; all intros and outcomes logged; invoice/waiver reconciled; retrospective factual; proof published only with consent |
| Intro email | current pair; two yes receipts; share scope; names/contact verified; conflicts cleared | sent once to both parties; timestamp/message ID logged; pair state advanced; follow-up owner/date set |
| Board publish | real role evidence or clearly labeled sample; owner; expiry; board cap; freeze OFF | honesty gate passes; public render verified; audit log includes classification/source/time; expired data removed |
| Agent task | session contract has goal, touch, owner, verify, stop, forbid; dependencies and lock clear | scoped files only; checks pass or exact failure recorded; artifacts linked; lock released; no live claim without evidence; handoff states next action |

## 6. Quality gates

| Gate | Checkbox | Block condition / evidence |
|---|---|---|
| Honesty | [ ] samples labeled [ ] real counts receipt-backed [ ] disk/live separated [ ] no SLA/Stripe/SMS overclaim | any unsupported role, pilot, receipt, hire, outcome, availability, or version claim; board audit + truth reports |
| Legal | [ ] signed client terms [ ] candidate/client consent [ ] lawful criteria [ ] privacy/retention route [ ] proof permission | missing terms/consent; discriminatory criteria; unclear fee trigger; public proof without permission; counsel review required before novel terms |
| Accessibility | [ ] keyboard path [ ] labels/errors [ ] focus/contrast [ ] reduced motion [ ] mobile zoom/touch [ ] WIZ smoke | critical flow cannot be completed without mouse/sight; artifact: dated a11y check and screenshots |
| Security/keys | [ ] no secrets in repo/logs/prompts [ ] least privilege [ ] keys stored in approved secret store [ ] rotation/revocation owner [ ] PII redacted | exposed key/PII, shared personal credential, unknown owner, or unbounded export; stop and run incident checklist |
| Laptop hygiene | [ ] 4–8 CDP pages [ ] no hung agents [ ] memory/load sane [ ] Designer/live/Dash retained | >10 tabs or resource pressure: run `bin/dg hygiene --prune`; never kill CDP Chrome; record control-plane state |

## 7. Concrete process file tree

```text
docs/process/
  README.md                         # index, owners, triggers, version/retirement policy
  DEMAND-BATCH-CHECKLIST.md
  INTAKE-ACCEPTANCE-CHECKLIST.md
  CANDIDATE-CONSENT-CHECKLIST.md
  MATCH-QUALITY-CHECKLIST.md
  MUTUAL-YES-INTRO-CHECKLIST.md
  PILOT-LIFECYCLE-CHECKLIST.md
  HIRE-INVOICE-OUTCOME-CHECKLIST.md
  BOARD-PUBLISH-CHECKLIST.md
  WEBSITE-SHIP-CHECKLIST.md
  INCIDENT-DATA-RESPONSE.md
  AGENT-TASK-CHECKLIST.md
demigod-ops/                       # restricted operational records; no public proof by default
  demand/outreach-ledger.csv
  intake/<brief-id>.md
  intros/<pair-id>.md
  finance/<hire-id>/{fee-review.md,invoice-receipt.txt}
  outcomes/<hire-id>.md
  incidents/<incident-id>.md
  releases/SHIP-LEDGER.jsonl
```

## 8. Merge/retire to reduce sprawl

- [ ] Keep `DEMIGOD-COMPRESSED-STATE.md` as state SSOT; move dated state prose out after facts land there.
- [ ] Merge `DEMIGOD-WORKFLOW.md`, ship-checklist usage, and session-contract usage into `docs/process/README.md`; leave compatibility stubs linking to canonical checklists.
- [ ] Merge `docs/exchange/DEMIGOD-STARTUP-ROADMAP.md` + `DEMIGOD-LIVING-ROADMAP.md` + 14-day checklist into one outcome roadmap; archive the dated 14-day file read-only.
- [ ] Merge the collab protocol and `DEMIGOD-PAIRS` operating rules into `AGENT-TASK-CHECKLIST.md` and `MATCH-QUALITY-CHECKLIST.md`; retain protocol as historical decision record.
- [ ] Treat `pilot-log`, `ROUND4`, info-exchange, and postmortems as immutable evidence/history, not active instructions; index them from `docs/process/README.md` and retire duplicate commands.
- [ ] Keep generated JSON/JSONL and `/tmp/dg-busy` artifacts out of narrative docs; link them by path and timestamp. Do not mark a migration complete until every old doc has a canonical replacement link.
