# Demigod tools · roadmap, docs habits, Webflow — 2026-07-13

Living notes while founder AFK. Agents (Grok / Codex / Fable) should extend, not thrash foot-core while freeze ON.

## Shipped this session (v4 ops)

| Area | What |
|------|------|
| Shared lib | `isFrozen`, `gateFreshness`, `footScriptIdFromHtml`, mutate locks in `demigod-agent-tools-lib.mjs` |
| Brief | **FREEZE first**, then NEXT, then snapshot; verify freshness flags |
| Status | v4 + `freshness` + `jobQueue` |
| Jobs | Async 202, freeze+mutate+Origin guards, mutate-job-lock.json |
| UI | Simple default, Diagnostics rename, job strip, owner tags, help `?`, mutate confirm, "Check site" |
| Swarm UX | Codex + Fable + Claude plans applied (cut bloat, human glance) |

## What agents want most (consensus)

1. **Freshness** — never trust stale verify/smoke vs foot-core  
2. **Freeze-first** — every brief/next  
3. **Durable jobs + queue visibility**  
4. **Shared freeze/lock/mint** — one path, no split-brain  
5. **Contract tests** — tools-selftest expanded  
6. **Typed next/jobs schemas** (Codex)  
7. **Human Simple mode sacred** (Fable)

## How to document work better

### Daily / session (agents)

```bash
# Start
curl -sS http://127.0.0.1:9878/api/next
curl -sS http://127.0.0.1:9878/api/agent-brief | head -40

# End — always
curl -sS -X POST http://127.0.0.1:9878/api/handoff \
  -H 'Content-Type: application/json' \
  -d '{"from":"agent","text":"DONE: … | NEXT: … | risk: …"}'
```

### Artifacts (single places)

| Kind | Path |
|------|------|
| Brief | `/tmp/dg-busy/AGENT-BRIEF.md` |
| Status | `/tmp/dg-busy/dashboard-status.json` |
| Handoffs | `/tmp/dg-busy/dashboard-handoff.json` |
| Jobs last | `/tmp/dg-busy/dashboard-job-last.json` |
| Swarm | `/tmp/dg-busy/swarm/*.md` |
| Exchange docs | `docs/exchange/DEMIGOD-*.md` |
| Living SSOT | `DEMIGOD-COMPRESSED-STATE.md` (short updates only) |

### Rules of thumb

- One exchange doc per **theme + day**, not 20 files.  
- Prefer **append handoff** over new markdown novels.  
- Screenshots: only for UX bugs; path under `/tmp/dg-busy/shots/`.  
- Never claim live ship without cockpit `shipped` + hash match.  
- Freeze ON → document experiments as **tools/docs**, not publish.

### Human re-entry checklist

1. Open http://127.0.0.1:9878/ Simple  
2. Glance Site / Changes / Whose turn  
3. Read sticky NEXT + last handoffs  
4. `Diagnostics` only if digging  

---

## Demigod / trydemigod.com product ideas (non-GTM spam)

### Product clarity (site)

- Keep **two doors** only: I’m hiring / Find a job — everything else secondary.  
- **Pending honesty** for Twilio/Stripe/SMS until real.  
- Proof assets: 1 white-glove match story when real (no fake volume).  
- Board: ≤2–3 samples until real roles.  
- Product routes (`?p=`) via fetch+DOMParser only (already).  

### Matching ops (behind site)

- Pilot log: one sheet or JSON of intros / outcomes.  
- 90-day outcome field already high-signal for matching — use in brief when submissions land.  
- Manual matching first; automations only after 5 real intros.  

### Tools that would unlock product

| Tool idea | Why |
|-----------|-----|
| Submission inbox viewer | See Webflow form posts without dashboard thrash |
| Intro template + log | One pasteable intro, one receipt |
| Weekly honesty report | roles/real/receipts one page |
| Freeze-aware ship wizard | When freeze OFF: one guided CDN→paste→verify |

---

## Webflow — use effectively

### Do

- **Designer** for layout/CMS structure only.  
- **Custom Code** (head/foot) for Demigod behavior — source of truth on disk:  
  - head: `demigod-head-minimal.html` / styles  
  - foot: `demigod-footer-lite.html` → catbox foot-core  
- **Publish** is a deliberate human (or gated agent) action when freeze OFF.  
- Keep **Custom Code tab** + Designer + live in tab budget (≤6–10).  
- Forms: native Webflow forms + JS enhance (WIZ stepper); don’t rebuild CMS for pilots yet.  

### Don’t

- Don’t edit published HTML by hand in Designer for JS logic.  
- Don’t multi-writer foot-core.  
- Don’t trust Webflow “saved” = “live” without live probe / smoke.  
- Don’t add new site pages unless product needs them — prefer modals/WIZ.  

### Effective workflow

```
disk foot-core → verify:source → (freeze OFF) catbox CDN → footer-lite src
  → CM6 paste custom code → Designer Publish → smoke + truth
```

### Webflow strengths to lean on

- Visual marketing polish without React SPA  
- Forms + email notifications for early demand  
- Hosting + SSL free at this stage  
- CMS later for public roles/receipts when real  

### Weaknesses to work around

- Custom code deploy friction (paste + Publish)  
- No real multi-env — use freeze + disk as “staging”  
- Limited server logic — ops stay on local agent dashboards  

---

## Experiments queue (AFK agents)

Priority order for autonomous work (no foot thrash while freeze ON):

1. Expand `demigod-tools-selftest` / contract tests for next/jobs/freeze  
2. Wire `isFrozen()` into more ship scripts that still grep freeze ad-hoc  
3. Job history persistence across dash restart  
4. Board mint choke-point design doc + stub  
5. Submit fixture e2e polish  
6. Documentation consolidation (archive stale exchange noise)  
7. Optional: thin “submission peek” CLI if form dumps exist  

## Session start (agents)

```bash
bin/dg-cockpit && bin/dg-smoke
curl -sS http://127.0.0.1:9878/api/agent-brief | head -50
# only NEXT.cmd unless human handoff says otherwise
```
