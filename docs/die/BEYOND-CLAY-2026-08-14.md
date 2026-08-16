# Beyond Clay — DIE extras Clay does not have (2026-08-14)

**Ask:** what else is useful that is not in Clay, and compounds with Demigod / Dasha.
**Useful =** time (role ledger), place (SF map), quotes (first-party evidence), opt-in taste (Simp).
**Not useful =** people-data, credits, auto-DM, inferred salary, lookalikes-from-employees.

Clay overwrites cells and sprays accounts. We already watch the same job id, sit on an SF map, and keep quotes. Steal none of their marketplace. Build the six below.

Do not mention missing roles or Phase 2. Build product.

---

## Ranked slices

### 1. Role change journal on the company packet — **done 2026-08-14 1:49 ET**

Clay overwrites the cell. We already store `firstSeen`, `lastSeen`, `closedAt`, `reopenCount`, `nativePostedAt` (`first_published` only), `nativeUpdatedAt`.

Add `journal[]` to `demigod.company-packet/1`, derived only from those clocks. No new store. No title-diff (we do not keep prior title). No people.

```text
journal[] ≤20, newest first
  kind: opened | closed | reopened | maintained_stale
  at:   YYYY-MM-DD
  title, url
  extra: { reopenCount?, postedAt?, updatedAt?, postedVsEditedDays? }
```

- `opened` — `firstSeen` set, `closedAt` null, `firstSeen` within 14d of ledger `updatedAt` date
- `closed` — `closedAt` within that 14d window
- `reopened` — `reopenCount > 0`, currently open, `lastSeen` within window
- `maintained_stale` — open, `nativeDateField === first_published`, `postedVsEditedDays >= 14` (reuse `postedVsEditedDays` in `demigod-role-ledger.mjs`)
- quarantine → `journal: []`
- unknown id → no journal field (keep unknown packet shape)
- window `asOf` = UTC date of `ledger.updatedAt` or `map.generatedAt`; fixture tests pass an explicit `today`

**Files:** `demigod-company-packet.mjs` (+ test), reuse ledger helpers. Do not edit map, ledger schema, catalog, or export keys.

**Done when:** `--selftest` still 0; known fixture emits opened + maintained_stale; closed/reopened cases covered; unknown/quarantine stay empty; no network.

### 2. Peer set from role-family on the SF map — **done 2026-08-14 1:52 ET**

Not Clay lookalikes (people who worked at both). Named companies have `neighborhood: null` (map neighborhoods are aggregates only, `locationPrecision: city`). Do not invent pins.

Peers = other map companies that share at least one `roleMix` family (engineering, ai/data, product, …) and currently show `openRoles > 0`. Universe is already SF Bay. Rank by shared-family count, then openRoles, then name. Emit no score field.

```text
peers[] ≤8
  id, name
  sharedFamilies[]   # roleMix keys in common
  openRoles
basis: "sf-map + roleMix overlap"
```

- Unknown id / no roleMix → `peers: []` and an unknown `{ field: "peers", reason: "no_role_mix"|"not_found" }`
- Quarantine → `peers: []`
- Pure map walk. Do not build a packet per candidate.
- No people graph. No neighborhood claim.

**Files:** new `demigod-company-peers.mjs` (`findCompanyPeers`, `--selftest`); attach `peers` + `peerBasis` on known packets in `demigod-company-packet.mjs`. Optional `peers` on table row. No map/ledger schema edits.

**Done when:** peers selftest 0; packet selftest still 0; fixture with shared engineering + openRoles returns the other id; no roleMix → empty; unknown/quarantine empty; no `score` key.

### 3. Share-only research memo — **done 2026-08-14 1:57 ET**

Clay's output is a CRM field. Ours is a one-pager both sides can read before a conversation. Private markdown from a packet. Not a public page. Not email. Not a CRM write.

```text
demigod.company-memo/1
  companyId
  markdown   # bounded, control-safe
  asOf
```

Sections, in order, omit empty:
1. Identity — name, domain, website, source URL
2. Hiring — status, openRoles, ats, jobsUrl
3. Evidence — accepted research quotes (≤20 words) + URL
4. Unknowns — field + reason (unknown is valid)
5. Open roles — title, dept/office, firstSeen, nativePostedAt (first_published only), url
6. Journal — last 14d opened/closed/reopened + maintained_stale
7. Peers — id, name, shared families (basis line, no score)

Rules:
- Render from a packet object only. No network. No RecruitAI import. No send.
- Reuse the existing single-line / markdown-escape projector if one is already imported by packet/review (do not invent a second sanitizer).
- Unknown packet → short memo that says unknown, no invented website/roles.
- Quarantine hides roles, jobsUrl, journal, peers.
- No people fields, no score, no "we recommend".
- CLI writes markdown to stdout; optional `--out=` under /tmp only (refuse paths outside /tmp and the busy root).

**Files:** new `demigod-company-memo.mjs` (`renderCompanyMemo(packet)`, `--selftest`, `show --id=`). Do not edit map/ledger/catalog.

**Done when:** `--selftest` 0; fixture packet renders identity + a quote + an unknown + a journal line; unknown id memo has no fixture website; no score/recommend strings.

### 4. Founder hiring ticket — **done 2026-08-14 2:01 ET**

Clay starts from accounts to spray. Demigod starts from a founder need. DIE fills a **review-only ticket** from the company packet + open roles. Human still authors must-haves and the 90-day outcome (`ROLE-PACKET-DESIGN.md`). This module does **not** write `DEMIGOD-ROLE-PACKETS.json` or invent criteria.

```text
demigod.hiring-ticket/1
  companyId
  need { family?, titleHint? }     # caller-supplied; never invented
  company { id, name, domain, website, hiring }
  roles[]                          # open roles, filtered by family/titleHint if given
  journal[] peers[] unknowns[]
  memoMarkdown                     # from renderCompanyMemo
  blanks { outcome90d: null, mustHaves: [] }
  authority: "review_only"
```

- Unknown company → ticket status unknown, no invented roles.
- Quarantine → roles/journal/peers empty.
- `need.family` must be a roleMix key (engineering, product, …) or omitted. Filter via `categorizeRole` from `demigod-startup-jobs-enrich.mjs` (same helper the ledger uses) and/or titleHint substring (case-insensitive). No family → all open roles, cap 10.
- No score, no recommend, no RolePacket write, no CRM, no send.

**Files:** new `demigod-hiring-ticket.mjs` (`fillHiringTicket`, `--selftest`, `show --id= --family=`). Reuse packet + memo + peers. Do not edit role-packet store.

**Done when:** selftest 0; fixture with family=engineering returns only eng-ish open roles; blanks stay empty; unknown id invents nothing; `show` does not write RolePackets.

### 5. Opt-in Simp / $Dasha-hold taste prior — **today**

Dasha-only. Soft prior on match review when a **local opt-in receipt** exists. No receipt → `unknown`. Never scrape, never call Dasha, never invent a hold or a Simp result.

```text
demigod.taste-prior/1
  subjectId
  status: unknown | opted_in
  simp: null | { resultId, at }
  hold: null | { proven: true, at }
  use: "soft_prior_on_review_only"
```

- Read only a caller-supplied receipts object or a local JSON path under the busy root / a fixture. Missing file → unknown, not an error.
- `opted_in` only when the receipt has `optIn === true` and a subjectId match. Hold only when `hold.proven === true` with an `at` day.
- No score, no people waterfall, no network, no write to match/pair/consent.
- Do not attach this to the company packet (companies are not people).

**Files:** new `demigod-taste-prior.mjs` (`readTastePrior`, `--selftest`). No Dasha API. No dashboard.

**Done when:** selftest 0; missing receipt → unknown + null simp/hold; opted-in fixture projects resultId; forged hold without optIn stays unknown; no `score` key.

### 6. Maintained-stale badge

Folded into journal kind `maintained_stale` in slice 1. Also project onto export/review later if missing. Stops zombie reqs looking like heat.

---

## Refuse

People waterfalls, Claygent-as-agent, credit meters, recipe marketplace, auto-DM, inferred pricing, global scores, login scrape, title-change events we cannot prove.

## Authority

Current user request, then `DEMIGOD-DIE-SPEC.md`, then this file. Slice 1 is next local work. Claude remains on Clay slice 6 (evidence panel + RecruitAI writeback). Do not collide on the dashboard.

## Already in older DIE docs (do not lose)

These were already written. They are not Clay. Rank below slice 1 unless a failing invariant needs them first.

- Hiring velocity from the ledger (`ENRICHMENT-BACKLOG.md`) — opens/closes per board over the observation span, not a vendor "intent" score.
- JD tech as "mentioned in a JD", never "uses" (`ENRICHMENT-BACKLOG.md`).
- As-of directory reconstruction (`CROSS-VERTICAL-FEATURE-SURVEY.md`) — replay the map+ledger at a day.
- Decay-aware evidence / refresh on visible-text hash (`INNOVATION-AND-COLLABORATION.md`).
- Role packet stays side evidence, never auto-ratings (`ROLE-PACKET-DESIGN.md`).
- Clay slice 6 still in flight: evidence panel + RecruitAI writeback of the packet (dashboard only).

## Web app (2026-08-14 2:04 ET)

Potter: nothing only-local. Public surface is trydemigod.com.

- `/startups` already live.
- First ship: worker `/companies` (hiring table) + `/c/:id` (packet page) from the public CDN map + roles-feed. Cloud agent on `Uuriko/demigod-ops` `worker-tree/dasha-lobby`.
- Public only: map, roles-feed, journal-like clocks already on those JSON files, roleMix peers.
- Stay private: RecruitAI, role ledger file, research catalog, match/consent/intro, 127.0.0.1 table, taste receipts.

