# Demigod Agent Collaboration Protocol — 2026-07-12

**Purpose:** One clear way for Grok, Fable/Claude, Codex, Cursor, Heavy, and humans to work without thrash.  
**Phase:** retired setup framing. Site = mostly done. Demand first.  
**Decision basis:** `docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md`

---

## 1. Roles (rigid)

| Actor | Authority | Default tools | May edit |
|-------|-----------|---------------|----------|
| **Heavy (Supergrok)** | Strategy / GTM priority | Chat / heavy scripts | Docs only (strategy) |
| **Fable / Claude (opus/sonnet)** | Plan, audit, single-next | `bin/df`, `claude --print` | Prefer **read-only**; plans → `/tmp/fable-*.txt` |
| **Codex** | Code review + careful edits | codex CLI | `demigod-*.mjs`, foot-core **only with lock** |
| **Cursor** | Precise multi-file when tasked | Editor | Same as Codex; plan-mode first for foot |
| **Grok** | Execute, verify, CDP, docs, GTM prep | Full local + CDP | Canonical sources + docs; publish prep/auto when authorized |
| **Human** | Publish + real-world DMs | Webflow UI | Publish click; founder outreach |

**Equal authority note:** User has directed that Fable/Claude plans and Grok execution run autonomously. Still: **one writer** on foot-core; **hash before claiming live**.

---

## 2. Shared truth (read order every session)

1. `DEMIGOD-COMPRESSED-STATE.md` — living SSOT  
2. Latest `docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-*.md`  
3. This protocol  
4. `docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-*.md`  
5. Gates: `DEMIGOD-VERIFY-SOURCE.json` + board honesty  
6. Live: curl Last Published + foot CDN hash (never trust memory)

**Write order after ship:** compressed state → exchange note → checklist boxes → gate outputs under `/tmp` or project JSON.

---

## 3. Communication pattern

```
Heavy / Fable:  decide WHAT + WHY (plan file)
     ↓
Grok / Codex:   implement HOW (one writer)
     ↓
Grok:           verify:source + board + loop-state
     ↓
Grok:           prepare CDN/custom-code pastes + /tmp/READY*
     ↓
Human or auto:  Publish → confirm Last Published + CDN hash
     ↓
Any agent:      append exchange note + update compressed state
```

### Prompt templates

**Fable / Claude**
```
Demigod (Webflow talent matching). Use current disk truth and task-specific context.
Read DEMIGOD-COMPRESSED-STATE.md + docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md.
Role: [auditor|planner]. Task: [...].
Constraints: FIX not rewrite; demand first; ≤3 sample roles; no SLA/48h; pending Twilio/Stripe;
one canonical demigod-foot-core.js; no concurrent writers; verify after any edit.
Output: decision, ranked steps, exact cmds for Grok, anti-list. Prefer no site change.
```

**Codex**
```
Demigod technical pass. Do not thrash product UI.
Scope: [file]. Run npm run demigod:verify:source after edits.
Report pass/fail raw + exact failure. Prefer FIX over architecture change.
```

**Grok self-start**
```
Load compressed state → curl live markers/hash → run gates → execute checklist P0 → document.
```

### Shared drop folder
- Plans: `/tmp/fable-*.txt`, `/tmp/demigod-plan-*.md`  
- Multi-agent raw: `/tmp/dg-multi/`  
- Gate latest: `/tmp/demigod-gate-latest.txt`  
- Exchange (durable): `docs/exchange/`

---

## 4. Writer lock (foot-core)

1. Only one of Grok / Codex / Cursor edits `demigod-foot-core.js` at a time.  
2. Before edit: check git status + `loop-state` + no other agent claim.  
3. After edit: smoke + `verify:source` + board + loop-state.  
4. CDN: new catbox upload → new hash → update `demigod-footer-lite.html` only → paste/publish.  
5. Never edit live HTML by hand outside Webflow custom code pipeline.

If lock tooling exists (`writer lock` / commit 8736d60 era), **use it**. If missing, enforce via protocol + short session claims in `/tmp/dg-writer-claim.txt` (pid, agent, file, started).

---

## 5. Verify gates (non-negotiable)

```bash
npm run demigod:verify:source
node demigod-verify-board-honesty.mjs
node demigod-verify-loop-state.mjs
# when touching WIZ:
node demigod-wiz-cdp-playtest.mjs --local
# when claiming live:
curl -sS https://www.trydemigod.com/ | head
# foot hash:
curl -sS https://files.catbox.moe/<hash>.js | sha256sum
sha256sum demigod-foot-core.js
```

Green source ≠ green live. Always separate **disk** vs **CDN** vs **published HTML**.

---

## 6. Conflict resolution

| Conflict | Winner |
|----------|--------|
| Strategy vs polish | Heavy/Fable GTM priority |
| Plan vs gate failure | Gate (fix first) |
| Two foot editors | Abort both; re-claim lock; re-read disk |
| Rewrite urge vs FIX decision | FIX decision (this review) until ≥10 WIZ/week or P0 architecture break |
| Fake data vs honesty | Honesty always |

---

## 7. What “done enough” means for website

- Hero + HIRE + JOIN visible  
- Forms submit to a readable destination (e2e once proven)  
- Board ≤3 samples, real=0 until real  
- No 48h/SLA/founder-name promises  
- Pending language for Twilio/Stripe/SMS  
- Unhide works (no endless spinner)  

After that: **stop website builds** unless live breakage or real conversion data.

---

## 8. Session hygiene

- Tab budget ~6–10 (Designer, live, agent, dashboards)  
- No continuous-improve loops unless user asks  
- Game / Eat the Sounds: hard stop  
- Close CDP extras when done  

---

*Agreed synthesis from Fable + Opus + Codex + Grok, 2026-07-12.*
