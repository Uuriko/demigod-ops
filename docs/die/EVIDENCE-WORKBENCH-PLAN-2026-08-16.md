# Candidate Evidence Intake & Review Workbench — execution plan

**Status:** executable plan · local/private scope · no publish or connector authority

## 1. Mission

Turn a permitted candidate-submitted artifact or public-work excerpt into inspectable evidence for
one founder-authored Role Mission criterion, with a human approval gate and a preserved correction
and withdrawal history.

The complete useful loop is:

```text
artifact → normalized preview → human approve/reject → immutable assertion
  → Role Mission evidence question → cited human review note
  → correction or withdrawal → current + historical projections
```

The weakest sufficient hypothesis is that this loop can be useful with the existing JSON corpus,
role packets, structured-hiring composer, and loopback dashboard. It does not require a connector,
model, ranker, universal graph, hosted app, or new database.

## 2. Outcomes and boundaries

The slice is complete when an operator can:

1. choose an existing role and exact must-have;
2. paste a candidate-submitted artifact or permitted public-work excerpt;
3. preview the exact assertion before any durable write;
4. inspect automatically derived content hash, source reference, purpose, basis, policy, and
   retention deadline;
5. explicitly approve or reject the preview;
6. see approved evidence as a cell under the correct Role Mission question;
7. cite its immutable evidence ID in an existing structured human review note;
8. correct it by appending a successor, or withdraw it by appending a stop event;
9. inspect an earlier `at` projection without later events rewriting history.

Hard boundaries:

- private loopback operation only;
- no fetching or scraping from a submitted URL;
- no model-generated claim, rating, score, rank, verdict, recommendation, contact, consent, intro,
  publish, or external write;
- no protected-trait inference or general candidate profile;
- rejected previews do not become candidate evidence;
- inactive raw claim/span text is withheld by projections;
- the operational use basis is metadata, not a legal conclusion.

## 3. Reused architecture

| Need | Existing owner | Work in this slice |
|---|---|---|
| immutable corpus and time projection | `demigod-candidate-evidence.mjs` | add preview and append-only commands |
| role and must-have truth | `demigod-role-packet.mjs` | load, never duplicate |
| Role Mission questions/citations | `demigod-structured-hiring.mjs` | expose current and historical evidence cells |
| atomic owner-only persistence | `atomicWrite` + `withFileLock` | reuse with mode `0600` |
| local mutation boundary | dashboard host/origin policy | add same-origin POST routes |
| operator surface | existing role workspace card | add a native form and evidence cells |
| verification | module selftests + Demigod verifier | add one focused browserless contract test |

No dependency or new service is added. JSON remains sufficient while the workbench has one local
writer and bounded scans; a database becomes justified only by measured concurrency or query pain.

## 4. State and data design

### 4.1 Preview

`previewCandidateEvidence({ input, packet, corpus, at })` is pure. The human supplies role,
candidate, criterion, claim, source type, exact artifact text, exact selected span, optional public
URL, and optional predecessor. The function:

- verifies the criterion against the current role packet and captures its label;
- verifies the selected span occurs in the supplied artifact;
- computes SHA-256 over the exact artifact text;
- derives a stable source reference when none is supplied;
- sets observation time, purpose, use basis, policy version, and a 90-day retention deadline;
- creates a stable evidence ID and preview hash from the normalized assertion;
- revalidates the whole corpus and refuses duplicates or invalid correction targets;
- returns `committable: false`, `authority.externalAction: none`, and the exact proposed assertion.

The artifact body is used to compute the hash but is not stored. Only the bounded selected span is
retained in an approved assertion.

### 4.2 Approval and rejection

Approval requires the exact preview plus its hash and a non-empty human reviewer ID. Inside one file
lock the server recomputes the hash, reloads the latest corpus, revalidates all constraints, adds an
approval receipt to the assertion, and atomically writes the owner-only store. A stale or tampered
preview fails closed.

Rejection returns a bounded local receipt containing the preview hash, reviewer, time, and reason.
It does not append candidate content to the evidence corpus. Durable rejected-content storage is
excluded because it would retain person data that the operator explicitly declined.

### 4.3 Correction

A correction uses the same preview/approval path with `supersedes`. Its predecessor must exist in
the same candidate, role, and criterion scope, must precede the successor, and must not already be
corrected, withdrawn, or expired. Approval appends; it never edits the predecessor.

### 4.4 Withdrawal

Withdrawal requires exact role, candidate, evidence IDs, reason, and human actor. It appends a
`demigod.candidate-evidence-withdrawal/1` event under the same lock. Missing, duplicate,
cross-candidate, cross-role, future, or already inactive targets fail closed.

### 4.5 Review notes

The existing `demigod.review-note/1` contract remains the human judgment record. A rating may cite
approved evidence through bounded `evidenceIds`. The workbench displays the exact citation ID and a
copyable CLI/API-shaped hint; it does not manufacture the rating or review prose.

## 5. Failure matrix

| Condition | Result |
|---|---|
| role packet or criterion missing | refuse preview |
| source span absent from artifact | refuse preview |
| public work without safe HTTP(S) URL | refuse preview |
| unsafe/local/credentialed URL | refuse preview |
| expired retention at approval | refuse append |
| duplicate evidence ID or same scoped artifact | refuse append |
| correction across candidate/role/criterion | refuse |
| correction of corrected/withdrawn/expired evidence | refuse |
| withdrawal across candidate/role | refuse |
| withdrawal of missing/already inactive evidence | refuse |
| preview body changed after review | preview-hash mismatch; refuse |
| malformed existing corpus | visible error; no evidence and no write |
| concurrent writer | serialize through one file lock |
| browser from non-loopback origin | existing dashboard policy returns 403 |
| correction/withdrawal after historical timestamp | historical projection remains unchanged |

## 6. Private UI

The current Role workspace card gains one accessible `<form>` beneath the role projection:

- candidate ID;
- criterion selector sourced from the selected role packet;
- source type;
- public URL shown only when relevant;
- claim;
- artifact text;
- exact source span;
- optional predecessor evidence ID;
- human reviewer;
- Preview, Approve, Reject, and Clear actions.

Approval is disabled until a successful preview. Any field edit invalidates the preview. The preview
shows the assertion, hash, provenance, retention, and explicit lack of action authority. Evidence
cells show current state, candidate, evidence ID, claim when active, provenance, retention, and
Correct/Withdraw actions. Correct prefills a successor; Withdraw requires a reason and confirmation.

The UI never fetches the public URL and never exposes candidate evidence in the mutual projection.

## 7. HTTP and CLI surface

Private same-origin routes:

```text
POST /api/candidate-evidence/preview
POST /api/candidate-evidence/approve
POST /api/candidate-evidence/reject
POST /api/candidate-evidence/withdraw
```

The module also exposes equivalent local commands:

```text
node demigod-candidate-evidence.mjs preview …
node demigod-candidate-evidence.mjs approve … --preview-hash=… --by=…
node demigod-candidate-evidence.mjs reject --preview-hash=… --reason=… --by=…
node demigod-candidate-evidence.mjs withdraw --role=… --cand=… --evidence=… --reason=… --by=…
```

Both surfaces call the same exported validation and persistence functions.

## 8. Execution sequence

1. Freeze the contracts above in this plan.
2. Add deterministic normalization, hashing, duplicate detection, approval receipts, and mutation
   functions to the corpus module.
3. Extend its selftest through preview, approve, duplicate refusal, correction, withdrawal, and
   historical projection using a temporary store.
4. Add dashboard POST routes behind the existing host/origin mutation guard.
5. Render the intake form, preview, and evidence cells in the existing role workspace.
6. Add a static dashboard test for form accessibility, preview invalidation, explicit approval, and
   mutation routes.
7. Update contracts and roadmap with only verified capabilities.
8. Run targeted module/UI/security tests, source verification, then the full Demigod verifier.
9. Inspect the scoped diff and stop without publishing.

## 9. Acceptance checks

- pure preview computes the known SHA-256 of a fixture and writes nothing;
- approval persists exactly one assertion with approval metadata and mode `0600`;
- duplicate approval and tampered preview are refused;
- rejection writes no candidate evidence;
- public-work URL policy rejects unsafe URLs;
- correction changes current state but not an earlier snapshot;
- withdrawal withholds raw content from current state but not an earlier snapshot;
- cross-scope correction and withdrawal are refused;
- Role Mission question contains the evidence cell and an existing review note can cite its ID;
- mutual Role Mission JSON contains no candidate evidence payload;
- API POST is protected by the existing local mutation guard;
- no code path produces a score, verdict, contact, consent, intro, publish, or external action.

## 10. Deferred until evidence justifies it

- remote artifact fetching, OAuth, ATS/CRM connectors, and provider waterfalls;
- OCR/file upload and malware scanning;
- durable rejected-preview queue;
- multi-user identity, tenant authorization, legal deletion orchestration, and hosted storage;
- automated extraction, ranking, recommendation, or employment decisions;
- database migration and background jobs.

These are roadmap capabilities, not prerequisites for proving the first complete private evidence
loop.
