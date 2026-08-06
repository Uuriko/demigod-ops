# Self-prompt — next Demigod work (agent)

**Audience:** Grok / Codex / Claude / any coding agent on this machine.  
**User standing order:** KEEP_WORKING is ON (`/tmp/dg-busy/KEEP_WORKING`) until the user clears it. Goal: **make trydemigod.com the best-designed, honest SF talent site.**  
**Do not** stop after a status report. Do not assign Publish/DMs/fees to the human.  
**Do** agent work, verify, write a short pass note under `/tmp/dg-busy/design-track/`, then pick the next unblocked item.

---

## 0) Orient first (always)

```bash
export DEMIGOD_ROOT=/home/potter   # systemd + ship SoR — prefer home over lagging worktrees
cd /home/potter
bin/dg truth
bin/dg lock status
node demigod-work-find.mjs
test -f /tmp/dg-busy/KEEP_WORKING && cat /tmp/dg-busy/KEEP_WORKING
head -3 demigod-foot-core.js
```

- **Truth wins.** Never hardcode release versions into `AGENTS.md` / SIMPLE / handbook.  
- **Doc map:** [`DOCS.md`](../DOCS.md) · ship: [`docs/SHIP-AND-CDN.md`](SHIP-AND-CDN.md) · roles: [`docs/ROLES-PIPELINE.md`](ROLES-PIPELINE.md).  
- **One foot writer:** `bin/dg lock claim --owner … --why …` before editing `demigod-foot-core.js`.  
- **Ponytail:** YAGNI → reuse → stdlib → min diff.  
- **Maximize-weakness** when choosing among design fixes under sparse evidence.

### Current snapshot (re-check with truth; do not trust this paragraph if stale)

At write time of this prompt: **disk ahead of live** (prepare-only lag after continuous design), freeze OFF, lock free, board honesty OK, KEEP_WORKING ON. Live was last fully shipped in a prior authorized publish; later foot versions may still be disk-only.

---

## 1) Priority lanes (pick ONE per pass)

### Lane A — Authorized ship only (blocked without current user words)

**Only if** the current user message explicitly authorizes publish (e.g. “publish now”, “ship live”).

Then:

1. Prefer SoR `/home/potter` (not a detached worktree).  
2. `bin/dg ship prepare` green.  
3. Claim lock; `DEMIGOD_CURRENT_REQUEST_PUBLISH=1`; `bin/dg ship run`.  
4. If CDN fails with `gh not authenticated`:  
   - `GITHUB_TOKEN` + `demigod-cdn-actions-publish.mjs` / foot-cdn `uploadViaActions`, **or**  
   - catbox stage → GitHub MCP `ingest-site-bundle` on `Uuriko/demigod-site-cdn` → finalize loaders → CM6 paste (see SHIP-AND-CDN).  
5. `bin/dg truth` must show disk==live / shipped.  
6. Release lock. Receipt under `/tmp/dg-busy/`.

Without that language: **do not ship**. Disk lag is expected.

### Lane B — Design excellence (default when keep-working)

Goal: frege-night, honest copy, dual-path equality, calm process/pricing, dense but scannable chrome.

**Already done recently (do not re-thrash without new evidence):**

| Pass | What |
|------|------|
| ~39 | WIZ Enter hint stack (column, not “Start the briefEnter”) |
| ~40 | Observed roles 2-col; footer/obs pad densify |
| ~42 | Dual-path talent peer border; pricing H2 editorial; quieter obs meta |
| ~43 | Footer panel/CTA/legal densify |
| ~44 | Mobile bar + footer talent peer chrome; process/pricing pad |

**Next design defects to investigate (CDP + disk inject; fix only if still true):**

1. **Hero hierarchy**  
   - Wordmark character (uppercase tracking + soft glow) still present?  
   - Outcome line → dual-path rise; no competing hero-description thrash.  
   - Trust line under CTAs: one calm sentence, not chip spam.  
   - H1 empty-band / min-height FOUC still frege night (not gold mid-file).

2. **Dual-path equality audit (desktop + mobile + footer + #dg-bar)**  
   - Hire may keep stronger *fill*; talent must not look disabled (border/weight).  
   - Hint text readable, not smashed into label.  
   - Noscript / dual-path email fallbacks still honest.

3. **Process “three gates”**  
   - Editorial serif titles, solid under-hero paint, no SaaS card thrash.  
   - Mobile: steps stack 1-col, readable type, no huge empty band.

4. **Pricing card**  
   - H2 “Nothing until a hire starts.” left-aligned spine.  
   - Bullets distinct (not thrash “Human review / guarantee”).  
   - CTA sans, phosphor, full-width; no gold.

5. **Observed roles**  
   - SF-prefer still applied (`demigod-public-roles.mjs`).  
   - List 2-col desktop; quiet meta (“Observed YYYY-MM-DD”).  
   - Honesty: not matching inventory; links to employer ATS.  
   - Optional: denser type if still sparse after 2-col.

6. **Footer**  
   - If still “link farm” height after densify: consider fewer Explore links (ponytail: hide low-use pages behind About) **only if** nav still covers them; do not break route aliases.  
   - Fee line + copyright one row desktop.

7. **Optional warm-paper trial** (lowest priority)  
   - Only if frege night feels flat; keep phosphor signal; do not reintroduce mid-file gold `:root`.

**Design pass procedure:**

```text
claim lock → smallest CSS/copy in foot (and head only if FOUC) → bump foot version markers
→ npm run demigod:verify:source (+ brand/hero tests if you touched those areas)
→ CDP inject disk foot against live HTML if Chrome :9223 up; screenshot
→ release lock → /tmp/dg-busy/design-track/grok-pass{N}.md → update SHIP-READY.md
```

Do **not** bump version for drive-by renames. Prefer head CSS only for FOUC/critical geometry.

### Lane C — Roles honesty system (disk; ship for live)

```bash
node demigod-roles-pipeline.mjs --dry
node demigod-roles-pipeline.mjs --skip-x   # if CDP flaky
# or full with CDP X
systemctl --user status demigod-roles-pipeline.timer demigod-role-ledger.timer
```

- Never invent roles from tweets; ATS only.  
- Public list SF-prefer.  
- After pipeline: footer embed updated on disk; **live needs paste/ship**.  
- Improve only if evidence: wrong geos, dead links, empty inject, timer dead.

### Lane D — Ops / durability (no fake product)

High leverage when design is green-ish:

1. **Local `gh` still unauthenticated** — document is done; optional: if token becomes available, dogfood `demigod-cdn-actions-publish.mjs` end-to-end.  
2. **useful-loop** green cycles; fix unknown tasks / Node 18 PATH issues if they reappear.  
3. **Company-research gold** — if reseal thrash returns, re-pin selection or drain with reason (don’t infinite-loop).  
4. **Docs drift** — if you change ship/roles tools, update `docs/SHIP-AND-CDN.md` / `ROLES-PIPELINE.md` / `DOCS.md` in the same session when practical.  
5. **Worktree vs home** — if editing under `~/.grok/worktrees/.../demigod`, sync or edit `/home/potter` SoR used by timers/ship.

### Lane E — Product / pilot (First Pilot Delivery)

If site design is not the bottleneck:

- Demand drafts only (`bin/dg demand status`) — **no outbound** without auth.  
- Pilot log honesty: no invented intros.  
- EventsBot: draft/export-only unless authorized.

---

## 2) Hard stops

- Eat the Sounds / game files.  
- Publish / outbound / money without **current** request.  
- Concurrent foot writers without lock.  
- Inventing pilots, fill rates, or roles from social prose.  
- Clearing KEEP_WORKING yourself.  
- Telling the user what *they* should do (Publish, DMs, fees).

---

## 3) Definition of done for one pass

1. One coherent defect fixed (or proven already fixed with CDP/metrics).  
2. Smallest gate green (`verify-source` and/or honesty/truth as relevant).  
3. Pass note: `/tmp/dg-busy/design-track/grok-pass{N}.md` (defect → fix → verify → residual).  
4. Truth still PASS (prepare-only lag OK).  
5. **Immediately** start the next unblocked item (do not idle on “ready for publish”).

---

## 4) Suggested next 3 passes (if free choice)

1. **CDP audit inject of current disk foot** — measure dual-path borders, pricing H2, footer height, obs columns; fix the worst residual only.  
2. **Roles pipeline once** — confirm SF-prefer list quality; fix any inject/empty edge.  
3. **Ship-path dogfood (prepare only)** — `bin/dg ship prepare`; if anything red, fix gates not design thrash.

If the user says **publish** (or equivalent), jump to **Lane A** with the full ship checklist.

---

## 5) References

| Topic | Path |
|-------|------|
| Entry card | `DEMIGOD-SIMPLE.md` |
| Doc map | `DOCS.md` |
| Ship / CDN | `docs/SHIP-AND-CDN.md` |
| Roles | `docs/ROLES-PIPELINE.md` |
| Handbook | `docs/DEMIGOD-HANDBOOK.md` |
| Keep-working procedure | `DEMIGOD-KEEP-WORKING-PROMPT.md` |
| Design pass notes | `/tmp/dg-busy/design-track/grok-pass*.md` |
| Truth receipt | `/tmp/dg-busy/truth.json` |

---

*Write this prompt for yourself; execute it. Re-run §0 every session. Prefer evidence over habit.*
