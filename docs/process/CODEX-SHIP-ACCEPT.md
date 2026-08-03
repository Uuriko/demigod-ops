# CODEX SHIP ACCEPT — demigod-foot-core.js v202 → live

**Role:** Harsh Codex acceptance (no implement).  
**Scope:** Intentional unfreeze ship of foot **v202** only via the single path in `demigod-ship.mjs`.  
**Sources read:** `demigod-ship.mjs`, `demigod-publish-freeze.mjs`, `demigod-foot-cdn-publish.mjs`, `demigod-footer-lite.html`, lock/`truth` contracts (CDN manifest is produced by foot-cdn-publish → `DEMIGOD-FOOT-CDN.json`).  
**Date of criteria:** 2026-07-15

---

## Verdict frame

| State | Meaning |
|-------|---------|
| **BLOCK** | Any veto true, or any must-pass false. Do not claim shipped. |
| **PASS** | Full CLI order completed; all must-pass green; freeze **ON** after; `fullyShipped` true with live==disk v202. |

**Default stance: BLOCK until proven.** Disk ahead of live is not a ship. CDN upload alone is not a ship. Paste without `truth --require-match` is not a ship. Leaving freeze OFF after is a fail.

---

## Pre-ship facts (observed, not proof of live ship)

Use only as orientation. Re-probe before mutate.

| Signal | Expected for this ship |
|--------|------------------------|
| Disk foot | `__dgFootVer='202'` / `dgFootVersion = 'v202'` / banner `dg-foot-v202-core` in `demigod-foot-core.js` |
| Live (pre-ship) | May still be **v198** (or any ≠202) — that is the gap to close |
| Footer lite | Must end as loader pointing at permanent catbox JS for **v202** (comment includes `foot v202`) |
| Manifest | `DEMIGOD-FOOT-CDN.json`: `version`/`footVer` **202**, `ok:true`, `temporary:false`, `host` catbox permanent, `cdnUrl` matches footer `<script src>` |
| Freeze | Mutates require freeze **OFF** (file and env). Ship never auto-unfreezes. |
| Lock | Mutates require valid foot lease + `DG_LOCK_TOKEN` |

Orchestrator contract (`demigod-ship.mjs`):

- **Never** auto-unfreezes.
- **Never** claims live==disk without `demigod-truth.mjs --require-match`.
- Mutating steps (`cdn`, `paste`, `run`) call `assertNotFrozen` + `assertCanWriteFoot`.
- `prepare` / `status` / `verify` are freeze-safe (read-only).

---

## Exact CLI order (canonical)

Do **not** invent alternate publish pipelines (`demigod:deploy:prep`, ad-hoc curl+paste, `DEMIGOD_FORCE_PUBLISH=1`) for this acceptance. One path.

```bash
# 0) Orient (read-only) — establish baseline
bin/dg ship status --facts
bin/dg truth --json | tee /tmp/dg-busy/truth-pre-ship.json
# Expect: diskVer=202; live may be ≠202; note freeze + lock

# 1) Prepare (freeze-safe). MUST exit 0 before any mutate.
bin/dg ship prepare
# Internals (all hard except truth/review allowFail):
#   npm run demigod:verify:source
#   node demigod-verify-board-honesty.mjs
#   node demigod-foot-smoke.mjs
#   node demigod-truth.mjs            # allowFail
#   node demigod-review.mjs --format summary --fail-on high  # allowFail
# Artifact: /tmp/dg-busy/ship-prepare.json  ok:true

# 2) Intentional unfreeze (explicit human/agent decision — not auto)
node demigod-publish-freeze.mjs status   # note prior why
node demigod-publish-freeze.mjs off
# Confirm frozen:false (file). Unset any DEMIGOD_PUBLISH_FREEZE=1|true|yes|on in this shell.
unset DEMIGOD_PUBLISH_FREEZE 2>/dev/null || true
node demigod-publish-freeze.mjs status   # exit 0 only when not frozen

# 3) Foot lock (required for cdn/paste/run)
bin/dg lock claim --owner "$USER" --why "ship foot v202 intentional unfreeze"
# Capture token from claim JSON:
export DG_LOCK_TOKEN=<token from claim>
export DG_LOCK_OWNER="${DG_LOCK_OWNER:-$USER}"
# Optional: source /tmp/dg-busy/foot-lock-token.env if written by claim path
bin/dg lock require   # must pass with token in env

# 4) Full ship run OR stepwise equivalent (same gates)
# Preferred single shot:
bin/dg ship run
# run = prepare → cdn → paste → verify
#   cdn  → node demigod-foot-cdn-publish.mjs
#   paste→ node demigod-cm6-paste-publish.mjs --footer-only
#   verify→ node demigod-truth.mjs --require-match
# Artifact: /tmp/dg-busy/ship-run.json

# If stepwise (only if run split for diagnosis — still same order):
#   bin/dg ship prepare   # again if prepare aged out / failed mid-way
#   bin/dg ship cdn
#   bin/dg ship paste
#   bin/dg ship verify

# 5) Independent confirm (must-pass, not optional)
bin/dg ship verify
# or: node demigod-truth.mjs --require-match
# Prefer also: node demigod-truth.mjs --strict   # fullyShipped hard gate

# 6) Freeze ON immediately after green ship (mandatory)
node demigod-publish-freeze.mjs on --why "post-ship v202 live==disk; demand-first no thrash"
node demigod-publish-freeze.mjs status   # frozen:true, exit 2 is OK for status when frozen

# 7) Release lock (hygiene; not a substitute for freeze)
bin/dg lock release --owner "$USER" --token "$DG_LOCK_TOKEN"
# or release --force only if token lost and lease abandoned
```

### CDP precondition for paste (hard)

`demigod-cm6-paste-publish.mjs` requires an open page:

- URL starts with `https://webflow.com/dashboard/sites/talentlink-sf/custom-code`
- CDP at `CDP_URL` default `http://127.0.0.1:9223`
- ≥2 CodeMirror editors ready; footer paste `ok`; Save; then queue-publish to `www.trydemigod.com` + `talentlink-sf.webflow.io` (unless `--no-publish`, which is **forbidden** for this accept)

No custom-code tab → paste exits 2 → **VETO**.

---

## Must-pass checks

Every line below is **required** for PASS. Record receipts under `/tmp/dg-busy/` (ship-prepare.json, ship-run.json, truth.json, publish-freeze.json, DEMIGOD-FOOT-CDN.json).

### A. Disk identity = v202

| # | Check | How |
|---|--------|-----|
| A1 | Source version 202 | `rg -n "__dgFootVer='202'|dgFootVersion = 'v202'|dg-foot-v202-core" demigod-foot-core.js` |
| A2 | Syntax clean | `node --check demigod-foot-core.js` exit 0 |
| A3 | Prepare green | `bin/dg ship prepare` → ok; hard steps: verify-source, board-honesty, foot-smoke all ✓ |

### B. Freeze / lock discipline

| # | Check | How |
|---|--------|-----|
| B1 | Unfreeze intentional | freeze **off** only after prepare green; not because “agent guessed green” |
| B2 | No FORCE backdoor | `DEMIGOD_FORCE_PUBLISH` unset / not `1` for the ship path |
| B3 | No lock skip | `DG_FOOT_LOCK_SKIP` unset / not `1` |
| B4 | Lease valid during mutate | `assertCanWriteFoot` would pass: lock held, not expired, `DG_LOCK_TOKEN` matches |
| B5 | Freeze restored | after verify green: `publish-freeze.json` `on:true` with why mentioning post-ship / v202 |

### C. CDN publish (`demigod-foot-cdn-publish.mjs`)

| # | Check | How |
|---|--------|-----|
| C1 | Upload exit 0 | cdn step / script exit 0 |
| C2 | Permanent host only | `cdnUrl` matches `^https://files\.catbox\.moe/.+\.js$` — **not** `litter.catbox.moe` |
| C3 | Not temporary | manifest `temporary:false` (no `TEMP-litterbox-72h` in footer comment) |
| C4 | Remote body gates | fetch CDN: len > 40000; `/dg-foot-v\d+-core/`; includes `function hero`; `#dg-bar` or `__dgFootVer`; **remoteVer === 202** |
| C5 | Manifest written | `DEMIGOD-FOOT-CDN.json`: `version`/`footVer` **202**, `ok:true`, `sha256` set, `bytes`/`liveLen` sensible |
| C6 | Loader rewritten | `demigod-footer-lite.html` **and** `demigod-footer-loader.html` identical loader with `foot v202` + same `cdnUrl` |
| C7 | Disk sha == CDN body | truth / ship-status: live CDN body sha matches disk foot after full ship (pre-paste: disk==manifest; post-ship: disk==live body) |

**Note:** Mid-ship may already show footer → `files.catbox.moe/leqhep.js` and manifest v202. That only clears **CDN** stage; live may still be old until paste+publish+match.

### D. Webflow paste + publish (`--footer-only`)

| # | Check | How |
|---|--------|-----|
| D1 | Footer-only | ship paste uses `--footer-only` (do not thrash head for this accept) |
| D2 | Paste ok | script logs foot `{ok:true,…}`; exit 0 |
| D3 | Saved | Save path ran (keyboard and/or Save button) |
| D4 | Published | queue-publish (or UI fallback) targeted **www.trydemigod.com** (and webflow.io); no `--no-publish` |
| D5 | API footer has catbox | pre/post queue: site code postBody contains permanent catbox `.js` matching loader |

### E. Live truth match (release gate)

| # | Check | How |
|---|--------|-----|
| E1 | `bin/dg ship verify` exit 0 | runs `demigod-truth.mjs --require-match` |
| E2 | disk ver == live ver | both **202** |
| E3 | live CDN body sha == disk | `liveBodyMatchesDisk` true |
| E4 | board honesty | still pass (roles honesty gate; do not mint fake roles to green) |
| E5 | fullyShipped (strict) | `syntaxOk && liveHtml.ok && diskEqualsLiveVer && liveBodyMatchesDisk && boardOk && (diskMatchesManifest \|\| !man.sha256)` |
| E6 | No claim without match | Do not write “shipped” / “live==disk” anywhere unless E1–E5 hold |

### F. Post-ship freeze

| # | Check | How |
|---|--------|-----|
| F1 | Freeze ON | `node demigod-publish-freeze.mjs status` → `frozen:true` |
| F2 | Why recorded | non-empty `why` (post-ship / v202 / no thrash) |
| F3 | Env hygiene | do not leave `DEMIGOD_PUBLISH_FREEZE` off-by-accident in long-lived shells; file freeze is the durable switch |

---

## Veto conditions (any one → BLOCK)

### Hard vetoes (stop ship / abort claim)

1. **Disk not v202** — `__dgFootVer` ≠ 202 or banner not v202-core.
2. **`bin/dg ship prepare` fails** — verify-source, board-honesty, or foot-smoke red.
3. **Board honesty FAIL** — ship must not launder dishonest board to live.
4. **Freeze still ON at mutate** without intentional `off` — and **never** use `DEMIGOD_FORCE_PUBLISH=1` as the “unfreeze” for this accept.
5. **No valid foot lock / missing `DG_LOCK_TOKEN`** during cdn/paste/run.
6. **`DG_FOOT_LOCK_SKIP=1`** used to bypass lock.
7. **CDN upload fail** or dead URL written (script correctly refuses overwrite on fail — if footer was hand-edited to a dead URL: VETO).
8. **Litterbox / temporary CDN** (`DEMIGOD_ALLOW_LITTER=1`, `temporary:true`, `litter.catbox.moe`) for production live ship.
9. **Remote CDN ver ≠ 202** or body fails fetchOk gates (len, core marker, hero, ver match).
10. **No Webflow custom-code CDP tab** or paste footer not ok / editors not ready.
11. **Paste with `--no-publish`** presented as ship.
12. **queue-publish / publish failure** leaving live on old foot URL.
13. **`truth --require-match` fail** after paste (disk≠live ver or body mismatch).
14. **Partial ship left freeze OFF** after attempt (success or fail mid-flight after unfreeze) without re-freeze or explicit incident note — success path **must** freeze on; failure path should freeze on with why `abort-ship …` to stop thrash.
15. **Head thrash** — non-footer paste as part of “v202 foot ship” without separate accept.
16. **Version lie** — claiming live v202 while live HTML still serves prior catbox id / prior `__dgFootVer`.
17. **Auto-unfreeze scripts** or continuous loops that turn freeze off without this CLI order.
18. **Game / out-of-scope** edits bundled into ship (hard stop per AGENTS).
19. **Copy policy regression** introduced in foot (48h/SLA promises, founder names on live) — if review/high or known scrub fails, VETO go-live.
20. **Concurrent foreign lock owner** thrashing foot mid-ship without token handoff.

### Soft vetoes (fix before re-run; do not stamp PASS)

- Stale truth/ship-status artifacts used as “proof” without re-probe after paste.
- Manifest matches disk but live still old (CDN done, publish not) — stage incomplete, not PASS.
- High review findings with `--fail-on high` if re-run as hard (prepare currently allowFails review — harsh accept may still block on new HIGH if introduced by v202).
- CDP tab budget chaos (many tabs) risking wrong page paste — prune then re-paste.

---

## Freeze on after (mandatory)

**Rule:** Intentional unfreeze is a lease, not a lifestyle. Ship window ends only when freeze is **ON** again.

```bash
node demigod-publish-freeze.mjs on --why "post-ship v202 live==disk; demand-first no thrash"
```

Accept only if:

1. Mutating window was freeze OFF **only** for prepare-green → cdn → paste → verify.
2. Immediately after green verify (or after abort), freeze **ON** with recorded `why` + `at` + `by` in `/tmp/dg-busy/publish-freeze.json`.
3. Subsequent agents see freeze ON and do not re-ship without a new intentional off.

**Ship does not auto-freeze.** Forgetting step 6 is a **failed accept** even if live briefly matches.

---

## Acceptance checklist (copy at seal)

```
[ ] A1–A3 disk v202 + prepare OK
[ ] B1–B4 unfreeze intentional; no FORCE; lock+token; no SKIP
[ ] C1–C7 permanent catbox v202; footer-lite + loader + DEMIGOD-FOOT-CDN.json aligned
[ ] D1–D5 footer-only paste + Save + publish to www.trydemigod.com
[ ] E1–E6 truth --require-match (prefer --strict fullyShipped)
[ ] F1–F3 freeze ON post-ship
[ ] Lock released
[ ] No live==disk claim without E*
```

**PASS stamp requires all boxes.** Anything missing → **BLOCK**.

---

## Explicit non-goals (this document)

- No implementation, no CDN re-upload by Codex, no freeze toggle by this accept doc alone.
- No GTM/DM work as substitute for ship proof.
- No head CSS ship unless separately accepted.
- No “close enough” versions (201, 199, 198).

---

## One-line ship definition

> **v202 is shipped iff** permanent catbox serves foot 202 matching disk sha, Webflow footer custom code loads that URL on **www.trydemigod.com**, `demigod-truth.mjs --require-match` (and preferably `--strict`) exits 0, board honesty still passes, and publish freeze is **ON** afterward — all via `bin/dg ship` + lock + intentional freeze off/on. Anything less is **BLOCK**.
