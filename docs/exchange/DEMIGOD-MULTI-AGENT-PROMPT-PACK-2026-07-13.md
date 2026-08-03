# Demigod Multi-Agent Exhaustive Prompt Pack
**Date:** 2026-07-13T16:08:10.365616+00:00  
**Disk foot:** v191 · sha256 `a54ed85481d619c023460129b8b410dfbf3ed2a135b0bc1191751332f3799ada` · 119007 bytes  
**Live (pre-ship):** still CDN f5r4yt.js v190 until freeze lifts + publish  
**Publish freeze:** ON (v190 ship) — disk v191 ready, not live yet  

---

## 0. What we asked and who answered

| Agent | Mode | Output | Status |
|-------|------|--------|--------|
| **Fable** | `bin/df review` | `/tmp/dg-busy/prompt-pack/fable-reply.md` | Partial — answered truth-CDN false-P0 (product map steals first catbox match); full A–D prompt pack weak |
| **Codex EXEC** | `codex exec` | `/tmp/dg-busy/prompt-pack/codex-exec-pack.md` | **Full pack** — 7 self + 4 review + 8 Grok prompts + matrix + smells + forms checklist |
| **Codex REVIEW** | `codex exec review` | `/tmp/dg-busy/prompt-pack/codex-review-pack.md` | **Ranked P1s** + self/Grok fix prompts |
| **Claude Sonnet** | `claude --print --model sonnet` | `/tmp/dg-busy/prompt-pack/claude-sonnet-pack.md` | Forms pixel-spec + design gaps + 7 self + 8 Grok |
| **Claude Opus (Heavy-grade)** | `claude --print --model opus` | `/tmp/dg-busy/prompt-pack/claude-opus-heavy-pack.md` | Strategy S1–S5 + Fable/Codex/Grok prompts + surface matrix + success defs |
| **SuperGrok Heavy (browser)** | demigod-heavy-* CDP | — | **No grok.com tab on CDP** — Opus pack substituted as Heavy-grade strategy |
| **Grok (this session)** | apply + verify | this file + foot v191 | Applied top Codex P1s |

Raw sizes: {
  "claude-sonnet-pack.md": 22510,
  "claude-opus-heavy-pack.md": 15163,
  "codex-exec.log": 821636,
  "live-snap.txt": 953,
  "codex-exec-pack.md": 44159,
  "local-code-scan.json": 1958,
  "codex-review.log": 721143,
  "fable-reply.md": 2306,
  "codex-review-pack.md": 11238
}

---

## 1. Ranked consensus findings (all agents)

### P1 (forms / ship-blocking) — *applied on disk as v191*
1. **Submit confirmation broken** (Codex): `form.closest('.w-form')` returns the form itself because `forms()` adds `.w-form` to `<form>` → sibling `.w-form-done`/`.w-form-fail` never seen → always timeout “Could not confirm submit”.
2. **Force-show done box** (Codex): `showStep` forced `.w-form-done` to `display:block` → can fake success if wrapper lookup ever works.
3. **How link → catbox HTML** (Codex): MIME `text/plain` risk; must use `/?p=how`.
4. **Resume step clobber** (Codex): `showStep(resume)` at 20ms then `showStep(0)` at 50ms.

### P1 (not yet fixed — next sessions)
5. **Product `document.write` race** (Codex) — `demigod-footer-lite.html` dynamic script loaders.
6. **One-question WIZ ownership** (Codex/Sonnet) — multiple force-visible passes fight each other; welcome can leak fields.
7. **WIZ reopen rebuilds chrome** (Codex) — `show()` clears flags and re-`forms()`/`wizBuild()`.
8. **Checkbox validation** (Codex) — `sf-bay` checks `.value` not `.checked`.
9. **Truth CDN false drift** (Fable) — first catbox `.js` in HTML is product map — *fixed in demigod-truth.mjs*.
10. **footer:boot-smoke nondeterministic** (Codex) — aggregate gate sometimes empty stdout while direct smoke passes.

### P2 elegance / health
- Gold hex hardcoded ~30× instead of `var(--g)` (Sonnet)
- Spacing scale absent; strip components reinvent padding (Sonnet)
- Partner WIZ_CFG dead without DOM (Sonnet)
- 117KB single IIFE still large after v190 cuts (Codex)
- Dead `schedule()`/`timer` after MO removal (Codex)
- Manifest missing sha256 (Fable/Codex)

---

## 2. PROMPTS FOR FABLE (self) — run via `bin/df review "..."` or `bin/df cursor "..."`

### F1 — Forms contract authority
```
Demigod (Webflow talent matching). Phase: retired setup framing.
Author the canonical WIZ forms contract for startup + engineer against demigod-foot-core.js v191.
Require: 90day-outcome REQUIRED, __submit__ = review then native POST, thanks only after .w-form-done visible via outer wrapper (not form.closest('.w-form') self).
Design dry-submit e2e assertions for demigod-wiz-cdp-playtest.mjs --local.
Save /tmp/fable-forms-spec.txt with @file diffs Cursor can apply.
Verify cmds: npm run demigod:verify:source; node demigod-wiz-cdp-playtest.mjs --local
```

### F2 — Elegance rubric + remediation
```
Demigod. Audit live + disk head/foot v191 against elegance: ≤2 type families, 8pt spacing, one gold token, CLS≈0, no FOUC, 5s squint 375+1440, zero dups/lorem.
P0 blank/broken → P1 hierarchy → P2 polish. Exact file:line + unified diffs. Save /tmp/fable-design-audit.txt.
```

### F3 — Gate hardening (mutation suite)
```
Demigod. Design mutation tests: break wizBuild/run/show/version/90day one at a time; source-gate + boot-smoke must FAIL; restore byte-identical.
Add VERIFY-SOURCE.json mtime vs foot-core mtime assert; vm.Script parse every head inline script.
Save /tmp/fable-gate-harden.txt.
```

### F4 — One-question WIZ ownership plan
```
Demigod. Plan single owner for field visibility (showStep only). List every force-visible path in foot-core (showStep, forceWizVisible, modal CSS, intervals) with line numbers. Propose minimal deletions preserving shell guards (dgIsPageShell, body display guard). No full-document MO. Save /tmp/fable-wiz-visibility.txt.
```

### F5 — Product route architecture
```
Demigod. Replace document.write product loaders with deterministic contract for /?p=hire|talent|how|pricing|pilot|proof|faq|compare. Failure = visible fallback + body unhide. Map vs DEMIGOD-PAGES.json. Save /tmp/fable-product-routes.txt.
```

### F6 — Board honesty + CDN identity
```
Demigod. Single writer path for board; disk board CDN const == published JSON; sha256 in DEMIGOD-FOOT-CDN.json; 2 seeds real0. Save /tmp/fable-board-cdn.txt.
```

---

## 3. PROMPTS FOR CODEX EXEC (self)

### CX-E1 — Forms state machine proof (read-only first)
```
Demigod. READ-ONLY. Model startup+engineer WIZ as state machines from open → every step → review → native POST → done/fail/timeout → thanks. Prove .w-form-done visibility ownership. Report one-field-per-step counts. Do not edit.
```

### CX-E2 — Apply Fable forms plan under lock
```
Demigod. Implement /tmp/fable-forms-spec.txt on demigod-foot-core.js only. Acquire dg-lock. md5 before/after. After: demigod:verify:source, foot-smoke, board-honesty, loop-state, wiz-playtest --local. Revert on any fail.
```

### CX-E3 — Product loader non-destructive
```
Demigod. Replace footer-lite dynamic document.write with proven non-destructive render for all 8 product routes. Fallback contact+home on error. Never bulk-replace catbox URLs. Manifest + verify.
```

### CX-E4 — Checkbox/url/file validity
```
Demigod. Fix per-step validation: checkValidity(), checkbox .checked, url types, JD 10MB like resume, company-name required policy consistency. Tests first.
```

### CX-E5 — Idempotent show()
```
Demigod. Make modal open idempotent: one WIZ chrome after 3 open/close cycles; do not delete flags and rebuild listeners every open.
```

---

## 4. PROMPTS FOR CODEX REVIEW (self)

### CX-R1 — Adversarial submit path
```
Demigod. Review only waitPost/dgWfStatusRoot/showStep done-box handling in current foot-core. Confirm false-success and false-timeout cannot recur. CONFIRMED/PLAUSIBLE each risk.
```

### CX-R2 — Shell hide safety
```
Demigod. Review dgIsPageShell/dgHide/hideCard/forceMainVisible/head unhide/footer body guard. Prove no path hides body/main/hero. Flag over-broad reveals.
```

### CX-R3 — Elegance scorecard
```
Demigod. Score live-equivalent build 0/1 on Opus S2 rubric with file:line for misses. Punch-list by visual severity.
```

### CX-R4 — Diff gate for any foot change
```
Demigod. Review uncommitted foot-core as adversary blocking bad publish: parse, wizBuild/run/show defined, __submit__ reachable, no unquoted selectors, no 48h/SLA/founder, esc() on board HTML, board 2/real0, no gamed gates.
```

---

## 5. PROMPTS FOR SUPERGROK HEAVY / OPUS (strategy)

### H1 — Truth table every session
```
Before any health claim: disk md5+ver, live CDN hash, board disk vs BOARD_CDN. If VERIFY-SOURCE mtime < foot mtime → STALE, rerun. Table first.
```

### H2 — Elegance operational definition
```
Elegant = testable: ≤2 type families, 4–6 type scale, 8pt grid, one accent, reduced-motion, CLS≈0, 5s squint 375+1440, zero orphan/dup. Checklist Codex can score.
```

### H3 — Forms-perfection authority
```
WIZ is the product. Contract: both steppers, 90day required, review before submit, real POST, success/error/double-submit, no invisible required. Reject edits that break contract.
```

### H4 — Publish honesty
```
Published only when live CDN hash == disk AND live ver == __dgFootVer AND board honest. Ban word published without fresh fetch. Pre-empt catbox immutability + CM6 paste mangling.
```

### H5 — Anti-churn
```
One writer holds dg-lock; md5 snapshot before apply; abort if md5 changed mid-plan. Heavy arbitrates conflicts.
```

---

## 6. PROMPTS FOR GROK (executor) — ordered, do next

### G1 — DONE (this session): submit + how + resume + truth CDN match
Disk v191. Verify:source PASS, smoke PASS, board OK. Freeze still ON → live remains v190 until unfreeze+CDN+publish.

### G2 — Fixture test for waitPost success/fail
```
Goal: deterministic local test that outer .w-form wrapper + sibling done/fail is observed; form-as-.w-form does not break.
Files: new or existing demigod form test harness only.
Verify: node … + demigod:verify:source
Stop: when red on pre-v191 code path and green on v191.
```

### G3 — Hide #dg-bar when WIZ open
```
Goal: mobile sticky bar not under modal.
Files: demigod-foot-core.js show()/hide()/mob()
Verify: CDP 375 screenshot modal open.
```

### G4 — Product loader deterministic fallback
```
Goal: /?p=* never blank; no document.write race.
Files: demigod-footer-lite.html only after tests.
```

### G5 — One-question ownership (after F4 plan)
```
Minimal showStep-only visibility; narrow forceWizVisible.
Stop if any first-field/90day/review/body geometry regresses.
```

### G6 — CDN ship v191 when freeze lifted
```
foot-cdn-publish → hash match → paste footer/head via CM6 → Publish → live-poll ver 191 + body display + h1 rect + wiz open.
```

### G7 — Board CDN byte match + sha256 in DEMIGOD-FOOT-CDN.json

### G8 — Reconcile DEMIGOD-COMPRESSED-STATE + loop-state to v191 (post-live)

---

## 7. FORMS PERFECT checklist (merged Sonnet + Codex)

### Startup steps (order)
welcome → contact-email* → company-name → company-stage* → role-title* → stack-needs* → 90day-outcome* → salary-range? → timeline? → team-size? → why-this-role? → role-jd? → __submit__ (review, 90day first) → __thanks__

### Engineer steps
welcome → full-name* → seeker-email* → linkedin-url* → skills-stack* → experience* → sf-bay* (must use checked) → availability? → salary-expectation? → why-startups? → links? → phone? → resume? → __submit__ → __thanks__

### Pass criteria
- [ ] Exactly one answer field group visible per answer step
- [ ] Welcome: zero answer fields
- [ ] Required blank cannot advance + aria-invalid
- [ ] 90day empty blocks advance
- [ ] Review lists answers; Back edits without data loss
- [ ] Submit: exactly one POST; thanks only after .w-form-done visible
- [ ] Fail/timeout: honest error, no fake success; retry works
- [ ] Resume lands on saved step within 7 days
- [ ] Pending SMS/payments language; no 48h/SLA/founder names
- [ ] Mobile 375: no #dg-bar under modal; 44px targets; 16px inputs

---

## 8. EVERY-SURFACE DETAIL CHECKLIST

| Surface | Disk v191 | Live (freeze) | Next |
|---------|-----------|---------------|------|
| Body display | forceMainVisible + head + footer guard | v190 OK | Keep |
| Hero / H1 | force + clamp mobile | measure | CDP h1 rect |
| Path pills I'm hiring/looking | present | OK | |
| Nav CTA | remapped | OK | scope # interception |
| WIZ open | show() rebuild risk | | G5 |
| Submit confirm | **fixed dgWfStatusRoot** | needs ship | G6 |
| How link | **/?p=how** | needs ship | G6 |
| Resume step | **startIdx** | needs ship | G6 |
| Product /?p=* | document.write race | | G4 |
| Board | 2 samples real0 | check BOARD_CDN | G7 |
| Copy policy | scrubs present | | product pages grep |
| Truth tool | **src= match** | | done |
| Freeze | ON | no live ship | human/Grok unfreeze |

---

## 9. DO NOT TOUCH (stability)

- dgIsPageShell / dgHide / hideCard body climb guards
- OBS=null (no full-document MO)
- wizBuild form MO fire-cap + disconnect
- head early-unhide finite ticks
- footer dg-body-display-guard
- scrubTimeClaims / scrubStaticLabels / head copy scrub
- One canonical foot-core writer + dg-lock
- Game files

---

## 10. Applied this session (v191)

1. `dgWfStatusRoot` — outer Webflow wrapper / sibling done-fail discovery
2. Exclude `.w-form-done`/`.w-form-fail` from showStep force-visible
3. `HOW_IT_WORKS='/?p=how'` + FAQ copy
4. Resume: `startIdx` not clobbered by showStep(0)
5. `demigod-truth.mjs` match `src="…catbox…js"` not first map URL
6. Gates: `node --check` OK · foot-smoke pass v191 · demigod:verify:source **PASS** · board honesty OK

**Not shipped to CDN/Webflow** (publish freeze ON).

---

## 11. How to re-run agents (copy-paste)

```bash
# Fable
bin/df review '…paste F1…' | tee /tmp/fable-forms-spec.txt

# Codex both
codex exec --full-auto '…paste CX-E1…'
codex exec review --full-auto '…paste CX-R1…'

# Claude
claude --print --model sonnet --add-dir /home/potter < prompts/…
claude --print --model opus --add-dir /home/potter < prompts/…

# Heavy (needs grok.com SuperGrok tab on CDP :9223)
node demigod-heavy-improve-prompt.mjs
node demigod-heavy-full-audit.mjs
```

Agent source files also at:
- `/tmp/dg-busy/prompt-pack/claude-sonnet-pack.md`
- `/tmp/dg-busy/prompt-pack/claude-opus-heavy-pack.md`
- `/tmp/dg-busy/prompt-pack/codex-exec-pack.md`
- `/tmp/dg-busy/prompt-pack/codex-review-pack.md`
- `/tmp/dg-busy/prompt-pack/fable-reply.md`
