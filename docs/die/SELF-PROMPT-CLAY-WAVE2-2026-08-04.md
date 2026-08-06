# Self-prompt — Clay / DIE Wave 2 (post-ledger rebuild)

**Agent:** Grok · **When:** 2026-08-04 · **Root:** `/home/potter`  
**Predecessor:** Wave 1 recovery (`docs/die/SELF-PROMPT-CLAY-RECOVERY-2026-08-04.md`) — ledger restored day-0, 15 856 open roles, aging/pulse/static/export green.  
**Authority cascade:** current user request → live receipts (`bin/dg truth`, accepted-role, ledger file) → `AGENTS.md` / `DEMIGOD-DIE-SPEC.md` → `docs/die/CLAY-DIE-MULTI-AGENT.md` → this prompt.

---

## 0. Who you are in this pass

You are the **harbor master after the storm**. Wave 1 rebuilt the lighthouse logbook (role ledger) from zero. Wave 2 does four things only a careful harbor master does next:

1. **Keeps the light watching itself** — daily poll must run unattended again (systemd timer died with the home wipe).  
2. **Reads more of the sky without inventing weather** — capture Greenhouse `updated_at` as an *edited* signal next to `first_published`, never as a substitute for observed age.  
3. **Reseals the research vault** if the queue is due — company-research evidence was `no-evidence` after wipe.  
4. **Names the ghosts** — which boards failed, which companies shout “no agencies,” what day-0 honesty still forbids claiming.

You are **not** building Clay.com, a recipe DSL, a people-data waterfall, an email sender, a second product, or Phase-2 match-review UI. `acceptedForDelivery` is still 0; say so every time you write a receipt.

**Ponytail:** YAGNI → reuse → one tight field → one timer → one reseal. Prefer a boring systemd unit over a new orchestrator.

---

## 1. Mission statement (copy into the receipt)

> After day-0 ledger rebuild, restore **unattended observation**, capture **attributable board-edit dates** on Greenhouse, **reseal research** if due, and leave a **Wave-2 receipt** that is honest about observed vs posted vs edited ages — without publish, outbound, or Phase-2 product claims.

---

## 2. Mental model (do not confuse these clocks)

| Clock | Source | May claim publicly / in private ops |
|-------|--------|--------------------------------------|
| **Observed open age** | Our `firstSeen` → today | “We have seen this req open ≥ N days” **only after N days of polls** |
| **Posted age** | Greenhouse `first_published` only (`nativeDateField === 'first_published'`) | “Board’s posting date is N days ago” (attributed) |
| **Edited age (new)** | Greenhouse `updated_at` when present | “Board last updated the posting on DATE” — **not** “open for N days” |
| **Closed** | Successful poll that omits the job | Fail-closed; timeouts never close |

Day-0 truth: observed ages are ~0. Posted ages can still be huge. Edited ages tell you a 300-day-posted req was touched yesterday — gold for “stale vs maintained” without lying about observation.

---

## 3. Hard stops (exit if you violate these)

- No Webflow publish, CDN ship, CM6 paste, money, auto-DM, forms spam.  
- No brokered people emails/phones, inferred comp from JD prose, global fit scores.  
- No Clay clone / recipe platform / knowledge-graph product.  
- Do not claim observed ≥7d / ≥30d / ≥90d until calendar time + polls earn it.  
- Do not treat `requisition_id` freeform boards (Airbnb ONE/MULTI) as real distinct openings — use `requisitionSignal` abstention if you touch that.  
- Do not enable events public tunnel “for fun” if it requires secrets you don’t have; heal only if existing scripts + env allow.  
- Dirty-tree discipline: smallest files; no drive-by refactors of foot-core or game.

---

## 4. Inventory you must re-read before coding

```bash
export PATH="$HOME/.nvm/versions/node/v24.17.0/bin:$PATH"
cd /home/potter
test -f DEMIGOD-ROLE-LEDGER.json && node -e "const L=require('./DEMIGOD-ROLE-LEDGER.json'); console.log(L.schema,L.updatedAt,Object.keys(L.roles).length)"
node demigod-accepted-role.mjs --json | head -25
node demigod-reseal-queue.mjs due
systemctl --user list-timers --all 2>/dev/null | head -20 || echo 'no user timers'
bin/dg truth | tail -8
```

Expect roughly: ledger present ~15k roles; phase2 closed; reseal due; user systemd empty/missing after wipe; site truth PASS prepare-only.

---

## 5. Work packages (execute in order; skip only with written BLOCK reason)

### WP-A — Long-form prompt on disk ✅ (this file)

Path: `docs/die/SELF-PROMPT-CLAY-WAVE2-2026-08-04.md`

### WP-B — Unattended daily observation (timer restore)

**Why:** Without this, Wave 1 dies again after a reboot; observed ages never accrue.

1. Ensure `~/.config/systemd/user` exists.  
2. Install from repo templates:

```bash
mkdir -p ~/.config/systemd/user
cp /home/potter/systemd-user/demigod-role-ledger.service \
   /home/potter/systemd-user/demigod-role-ledger.timer \
   ~/.config/systemd/user/
# If research reseal unit exists and is oneshot-safe:
cp /home/potter/systemd-user/demigod-research-reseal.service \
   /home/potter/systemd-user/demigod-research-reseal.timer \
   ~/.config/systemd/user/ 2>/dev/null || true
systemctl --user daemon-reload
systemctl --user enable --now demigod-role-ledger.timer
systemctl --user enable --now demigod-research-reseal.timer 2>/dev/null || true
systemctl --user list-timers --all | grep demigod || true
```

3. Confirm `ExecStart` uses Node 24 path and `DEMIGOD_ROOT=/home/potter`.  
4. Do **not** `start` the heavy oneshot mid-session unless idle — timer enable is enough; optional: `systemctl --user start demigod-role-ledger.service` only if you need a second poll for `updated_at` backfill.

### WP-C — Greenhouse `updated_at` → ledger (creative + concrete)

**Backlog item:** ENRICHMENT-BACKLOG #9 (posting-edited signal).

**Code intent (minimal):**

1. In `POLLERS.Greenhouse` map, also set:
   - `nativeUpdatedAt: toDate(j.updated_at)`  
   - `nativeUpdatedField: j.updated_at ? 'updated_at' : null`  
2. In `upsertLedger` new-row branch: store `nativeUpdatedAt` / `nativeUpdatedField`.  
3. In existing-row branch: **always refresh** `nativeUpdatedAt` when the board sends a day (this is a *current* board claim, not a floor like firstSeen). Do not move `firstSeen` or `nativePostedAt` floor.  
4. Export helper:

```js
export const editedDaysAgo = (row, today) =>
  row.nativeUpdatedAt ? daysBetween(row.nativeUpdatedAt, today) : null;
export const postedVsEditedDays = (row) => {
  if (!row.nativePostedAt || !row.nativeUpdatedAt) return null;
  return daysBetween(row.nativePostedAt, row.nativeUpdatedAt); // how long after post until last edit
};
```

5. In `report()` JSON path (or summarize), add counts:
   - `withUpdatedAt`  
   - `editedAfterPost` (updated_at day > first_published day)  
   - sample 5 titles where posted age ≥90d **and** edited within 14d (maintained stale postings)

6. Selftests: unit-level on helpers + Greenhouse field map if fixtures exist; full `--selftest` must pass.  
7. **Strict loadLedger:** optional fields must not be required; corrupt-day values rejected only if present and invalid — match existing day validation style or leave unvalidated optional strings if that would explode scope; prefer same `isDay` checks when field present.

8. Re-poll **or** document that next timer poll backfills. Prefer one focused re-poll if Node/network free (15 min timeout exists on service). If re-poll too heavy, patch + selftest + note “backfill on next timer fire.”

### WP-D — Name the failed boards (diagnostics)

Last poll: 2 Greenhouse failures of 500. Write a tiny diagnostic (inline node or `demigod-role-ledger-failed-boards.mjs` only if reuse is hard — prefer **no new file**: one-shot under `/tmp` or a `--diagnose` flag).

Output `/tmp/dg-busy/clay-failed-boards-2026-08-04.json`:
- list of `{provider, slug, company, jobsUrl}` where fetch `ok:false`  
- HTTP/error class if cheap to capture  

Do not thrash retries more than once.

### WP-E — Research reseal queue

```bash
node demigod-reseal-queue.mjs status
node demigod-reseal-queue.mjs run
# or --force if due says research_not_green and queue pending
```

- Network + possible model/cache use — allow long timeout (10–20+ min).  
- On success: evidence under `/tmp/dg-busy/evidence/`.  
- On BLOCK (no API key, freeze, budget): write reason; do not fake green research.  
- After reseal, optional: `node demigod-recruitai-export.mjs --json` once so export researchEvidence reflects new seal (stdout is huge — redirect to `/tmp/dg-busy/…`).

### WP-F — Creative ops artifacts (no new product surface)

Produce **private** artifacts only:

1. **Shipping log** `/tmp/dg-busy/clay-wave2-shipping-log.md` — prose for humans: what the harbor saw (top boards by open roles, weirdest long-posted-but-freshly-edited Greenhouse jobs if data exists, TRM Labs / Kikoff no-agency quotes already in export).  
2. **Machine receipt** `/tmp/dg-busy/clay-wave2-2026-08-04.json` — schema `demigod.clay-wave2/1` with outcome, files, timers, reseal, enrichment counts, accepted-role still closed, externalActions none.  
3. Optional: `node demigod-role-ledger.mjs report --posted --days 90` snippet in the log.

### WP-G — Events heal (only if unblocked and fast to attempt)

Work-find still shows P0 events tunnel down. **Attempt once:**

```bash
# if units exist
cp systemd-user/demigod-events-*.service systemd-user/demigod-events-*.timer ~/.config/systemd/user/ 2>/dev/null
# or existing heal script
node demigod-events-heal.mjs 2>&1 | tail -40   # if present
```

If cloudflare token / tunnel binary missing → **BLOCK with reason**, do not invent public URL. Clay wave does not depend on events green.

### WP-H — Verification gate

```bash
node demigod-role-ledger.mjs --selftest
node demigod-ats-providers.mjs --selftest 2>/dev/null || true
node demigod-accepted-role.mjs --json   # phase2Ready false
bin/dg truth | tail -12                 # still PASS; map drift prepare-only ok
systemctl --user is-enabled demigod-role-ledger.timer
```

Do not run full `demigod:verify:all` unless you touched verify surface; prefer focused tests.

---

## 6. Creativity that is in-bounds vs out-of-bounds

**In-bounds**

- Harbor / shipping-log metaphor in private receipts.  
- “Maintained stale” cohort: long `first_published`, recent `updated_at`.  
- Timer poetry: “the logbook writes itself at dawn.”  
- Counting date-recycle via existing `postedDateChangeCount` after multi-day polls (not day-0).

**Out-of-bounds**

- Public homepage copy about “AI intelligence engine.”  
- Scoring companies for “hotness.”  
- Scraping LinkedIn.  
- Auto-emailing Douglas from the warm list (separate product track; drafts-only if ever touched).  
- Committing the multi‑MB role ledger to git (it is gitignored daily SoR for a reason).

---

## 7. Acceptance criteria (all must hold for PASS)

1. This prompt exists on disk.  
2. `demigod-role-ledger.timer` is enabled for the user (or BLOCK with install error).  
3. Code path captures Greenhouse `updated_at` when present; selftest passes.  
4. Failed-board diagnostic receipt exists (even if zero failures on re-check).  
5. Reseal either green or explicitly BLOCKED with reason.  
6. Wave-2 JSON receipt + shipping log written.  
7. `acceptedForDelivery: 0` still reported.  
8. No publish / no outbound messages.  
9. Site truth still PASS (or only prepare-only map drift from local enrich).

---

## 8. Completion report template

```text
Outcome: PASS | BLOCK
Wave: 2
Invariant / goal:
Evidence before:
Root cause / choice:
Files changed:
Timers:
Reseal:
Enrichment (updated_at) counts:
Failed boards:
Focused checks:
Website truth:
Accepted-role gate:
External actions: none
Remaining unblocked agent work:
```

---

## 9. What “done” unlocks next (do not do all now)

- After ~7 daily polls: observed≥7 badges become real → re-enrich map.  
- Backlog #1–7 list fields already in GH payload — only if load is low.  
- Douglas warm review (product NEXT).  
- Events public heal when tunnel credentials exist.  
- Optional hermetic clay soak unit if still desired.

---

## 10. Execute

Do not stop at the plan. Run WP-B → WP-C → WP-D → WP-E → WP-F → WP-G(attempt) → WP-H. Write receipts. Report in the user chat with the template above, short and evidence-backed.
