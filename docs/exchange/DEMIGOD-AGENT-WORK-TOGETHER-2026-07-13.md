# How agents work together better — 2026-07-13

## Health check (all green as of this session)
| Agent | How to invoke | Auth | Status |
|-------|---------------|------|--------|
| **Fable** | `bin/df review "..."` or `claude --print --model fable` | Claude Code login | OK |
| **Sonnet** | `claude --print --model sonnet --add-dir /home/potter "..."` | Claude Code | OK |
| **Opus** | `claude --print --model opus --add-dir /home/potter "..."` | Claude Code | OK |
| **Codex (Pro+)** | `codex exec "..."` (ChatGPT session) | Codex CLI 0.144.1 | OK |
| **Codex API key** | needs `OPENAI_API_KEY` | **missing in env** — Pro path works; API path not required if Pro auth live |
| **Grok** | this session + CDP | local | OK |

## Single-writer protocol
1. Claim foot with note in `/tmp/dg-busy/foot-lock.txt` (pid + agent + time)  
2. Edit only `demigod-foot-core.js` for site JS  
3. `node --check` + `node demigod-foot-smoke.mjs` + `npm run demigod:verify:source`  
4. Upload catbox → update `demigod-footer-lite.html` → `node demigod-cm6-paste-publish.mjs --footer-only`  
5. Confirm live CDN hash + update `DEMIGOD-COMPRESSED-STATE.md`

## Handoff shapes
**Fable → Grok:** plan with exact cmds, max 250 words, anti-list  
**Sonnet → Grok:** ranked micro-fixes with risk  
**Opus → Grok:** strategy / roadmap only (no code)  
**Codex → Grok:** P0 bug list + verify pass/fail  
**Grok → all:** ship note in compressed state + `/tmp/dg-multi/ship-*.md`

## Shared folders
- `/tmp/dg-multi/` multi-agent raw  
- `/tmp/fable-*.txt` plans  
- `/tmp/dg-busy/` swarm logs + locks  
- `docs/exchange/` durable notes  
- `DEMIGOD-COMPRESSED-STATE.md` SSOT

## Prompt context
```
Demigod (Webflow talent matching). Use current disk truth and task-specific context.
Read DEMIGOD-COMPRESSED-STATE.md. FIX not rewrite. Demand first. No 48h/SLA. Pending SMS/Stripe.
One foot-core writer. Verify after edits.
```

## Busy without thrash
- Prefer docs, research, GTM prep, audits when site green  
- Foot only for P0 or intentional UX micro-ship  
- Cap concurrent Claude/Codex to ~2–4  
- Always `bin/dg-hygiene` after CDP storms  



## Research pack
See `docs/research/DEMIGOD-DEEP-RESEARCH-STRATEGY-2026-07-13.md` and consensus `docs/research/DEMIGOD-MULTI-AGENT-RESEARCH-CONSENSUS-2026-07-13.md`.
