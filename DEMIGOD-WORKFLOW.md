# Demigod workflow (human + agent)

## What we're building

**trydemigod.com** — SF startup talent matching. Webflow site + custom foot JS + native forms.  
**Startup ops** — submissions, outreach, partnerships, proof logging (see `bin/dg home`).

## Daily agent session

```bash
~/agent-dev.sh audit           # laptop audit + control-plane JSON
~/agent-dev.sh status
~/agent-dev.sh up              # Chrome CDP only
npm run dev:workspace          # Designer + live + Grok tabs
```

If Chrome has >10 tabs: `npm run dev:tabs-cleanup`

## Edit → verify → release when authorized

1. **Edit** one file: usually `demigod-foot-core.js`, head CSS, or a `demigod-*-pass.mjs` script.
2. **During development, run the smallest targeted check.** Do not repeat a full audit immediately before release; the ship command reruns its own release gates.
3. **Publish only when explicitly authorized in the current request.** With freeze OFF and a fresh foot lock/token, set `DEMIGOD_CURRENT_REQUEST_PUBLISH=1` and run `bin/dg ship run`. Sequence: prepare gates → CDN → Webflow CM6 paste/publish → strict truth + live attestation. Detail: [`docs/SHIP-AND-CDN.md`](docs/SHIP-AND-CDN.md).
4. **Treat `truth --require-match` plus `live-attest` as completion.** Do not rerun the same gates or republish after a successful attestation.
5. **Visual smoke is optional and separate.** Reuse the existing CDP browser and cap it at 20 seconds. A timeout after strict SHA attestation means “visual unverified,” never “publish again.”
6. **If CDN git push fails** (no local `gh` auth): catbox + Actions path or GitHub MCP dispatch — same guide.

### Load / publish failure modes (2026-07-09)

See `docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md`.

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Endless spinner / freeze | Doubled/corrupt custom-code paste or a blocking network path | Restore the exact canonical head/footer split; zero MO in `<head>` |
| “Publish did nothing” | Only staging domain selected | Check **www.trydemigod.com** in publish dialog; compare Last Published |
| Blank hero | Designer interaction or visibility regression | Keep Designer GSAP/IX absent; run the raw-asset gate and visual smoke |
| Gates green, site wrong | Disk ≠ live custom code | Always curl production after publish |

**Never** reintroduce attribute `MutationObserver` in HEAD that writes styles.

## Who does what

| Step | Agent | Human |
|------|-------|-------|
| JS/CSS logic + canonical edits | ✓ (full cycles) | |
| Review, verify, dry GTM/pilot prep, CDP audits | ✓ (autonomous within rules) | |
| Webflow Designer structure | MCP when asked | ✓ masters / IX |
| Publish click | ✓ only when the current request explicitly authorizes it | |
| Form spam test (incognito) | prepare + dry scripts | ✓ |
| Advisory strategy / copy | `ask-claude` / `grok-ask` | review |

Agent runs safe autonomy cycles (see DEMIGOD-AGENTS.md "Autonomous Operation").

## Out of scope (unless asked)

- Eat the Sounds game files and `npm run verify:all`
- Auto agent loops (`demigod:continuous`, `continuous-improve-loop.mjs`)
- Cursor cloud dispatch without explicit user request

## Useful status commands

```bash
bin/dg home --json
npm run demigod:verify:live
npm run demigod:audit:forms
```

---

## Full-team process OS (2026-07-14)

Checklists, RACI, cadences: **`docs/process/README.md`**  
Ship: `docs/process/WEBSITE-SHIP-CHECKLIST.md` · Incident: `docs/process/INCIDENT-DATA-RESPONSE.md`
