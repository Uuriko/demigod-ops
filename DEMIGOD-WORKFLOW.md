# Demigod workflow (human + agent)

## What we're building

**trydemigod.com** — SF startup talent matching. Webflow site + custom foot JS + native forms.  
**Startup ops** — submissions, outreach, partnerships, SLA pager, proof logging (see `npm run demigod:status`).

## Daily agent session

```bash
~/agent-dev.sh audit           # full laptop + Demigod audit JSON
~/agent-dev.sh status
~/agent-dev.sh up              # Chrome CDP only
npm run dev:workspace          # Designer + live + Grok tabs
```

If Chrome has >10 tabs: `npm run dev:tabs-cleanup`

## Edit → verify → publish

1. **Edit** one file: usually `demigod-foot-core.js`, head CSS, or a `demigod-*-pass.mjs` script.
2. **Verify:** `npm run demigod:verify:all` (or `demigod:verify:source` + board-honesty + loop-state).
3. **CDN** (if foot-core changed): `npm run demigod:foot:cdn` then ensure footer embed still points at working catbox loader (`xngres.js`). Do not republish foot CDN casually.
4. **Custom code paste (once, full replace):**
   - HEAD = full `demigod-head-minimal.html` (must include `unhide-v5-safe`; **never** paste twice).
   - FOOTER = full `demigod-footer-lite.html` (must include `xngres.js`).
5. **Publish:** Webflow → check **both** `talentlink-sf.webflow.io` **and** `www.trydemigod.com` → “Publish to selected domains”.
6. **Confirm production (not staging only):**
   ```bash
   curl -sL "https://www.trydemigod.com/?v=$(date +%s)" | grep -o 'Last Published: [^<]*'
   curl -sL "https://www.trydemigod.com/?v=$(date +%s)" | grep -c unhide-v5-safe   # ≥1
   ```
7. **Smoke:** hard-refresh live — page must paint quickly (no endless spinner). Incognito form → `hello@trydemigod.com` copy.

### Load / publish failure modes (2026-07-09)

See `docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md`.

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Endless spinner / freeze | HEAD unhide MutationObserver thrash or doubled head paste | Ship `unhide-v5-safe` **once**; zero MO in `<head>` |
| “Publish did nothing” | Only staging domain selected | Check **www.trydemigod.com** in publish dialog; compare Last Published |
| Blank hero | IX hide + broken unhide | v5 CSS unhide + finite ticks |
| Gates green, site wrong | Disk ≠ live custom code | Always curl production after publish |

**Never** reintroduce attribute `MutationObserver` in HEAD that writes styles.

## Who does what

| Step | Agent | Human |
|------|-------|-------|
| JS/CSS logic + canonical edits | ✓ (full cycles) | |
| Review, verify, dry GTM/pilot prep, CDP audits | ✓ (autonomous within rules) | |
| Webflow Designer structure | MCP when asked | ✓ masters / IX |
| Publish click | | ✓ |
| Form spam test (incognito) | prepare + dry scripts | ✓ |
| Strategy / copy (Heavy) | Heavy via Grok/Fable | review |

Agent runs safe autonomy cycles (see DEMIGOD-AGENTS.md "Autonomous Operation").

## Out of scope (unless asked)

- Eat the Sounds game files and `npm run verify:all`
- Auto agent loops (`demigod:continuous`, `continuous-improve-loop.mjs`)
- Cursor cloud dispatch without explicit user request

## Useful status commands

```bash
npm run demigod:status
npm run demigod:verify:live
npm run demigod:audit:forms
npm run demigod:leverage:status
```

---

## Full-team process OS (2026-07-14)

Checklists, RACI, cadences: **`docs/process/README.md`**  
Ship: `docs/process/WEBSITE-SHIP-CHECKLIST.md` · Incident: `docs/process/INCIDENT-DATA-RESPONSE.md`
