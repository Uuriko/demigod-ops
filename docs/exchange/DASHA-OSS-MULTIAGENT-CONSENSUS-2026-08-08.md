# Dasha OSS multi-agent consensus — 2026-08-08

**Agents:** Grok (orchestrate + implement) · Claude (consult) · Codex (consult)  
**Prompt:** [`DASHA-OSS-MULTIAGENT-PROMPT-2026-08-08.md`](./DASHA-OSS-MULTIAGENT-PROMPT-2026-08-08.md)  
**Research:** opensource.guide (license, README, CONTRIBUTING, CoC); GitHub `/contribute` + good-first-issue patterns; reject star farms / fake community traction.

## Consensus (intersection)

| # | Change | Source |
|---|--------|--------|
| 1 | Primary OSS entry = `github.com/Uuriko/dasha-desk/contribute` | Claude + Codex |
| 2 | Landing `#oss` primary CTA → good first issues | Codex (Claude: href swap) |
| 3 | README + CONTRIBUTING: browser-first, `/contribute`, live `#oss` | Codex + Claude |
| 4 | ROADMAP **Resolved** list — honest, **not** “community-shipped” | Claude (Codex: no fake community claims) |
| 5 | Issue chooser “Start contributing” → `/contribute` | Codex |
| 6 | Tests assert `/contribute`, `#oss`, disambiguation | Codex |
| 7 | No new GFI spam; no monorepo dump; no token rewards | both REJECT |

## Rejected

- “Shipped from community” before external PRs  
- Extra GFI scaffolding files  
- Studio extract / Demigod public dump now  
- Screenshot close of #8 without a real capture (left open)

## Shipped

### Worktree (`…/dasha/`)
- `dasha-landing.html` — `#oss` + `/contribute` hrefs + GFI primary pill  
- `dasha-desk/*` docs, body links, tests (mirror)  
- `dasha-meme-studio.html` footer → `/contribute`  
- Rebuild desk + studio embed; gates PASS  

### Public GitHub `Uuriko/dasha-desk`
- Commit pushed to `main` (README, CONTRIBUTING, ROADMAP, oss-docs test, issue config, body CTAs)

### Live site
- **Not** Webflow-published in this pass (needs explicit ship auth). Disk ready.

## Gates

- `dasha-oss-docs.test.mjs` PASS  
- `dasha-share` / mint-consistency / build --check PASS  
- `dasha:test:landing` PASS  
- `dasha-growth` PASS  

## Peer files

- Prompt: `docs/exchange/DASHA-OSS-MULTIAGENT-PROMPT-2026-08-08.md`  
- Claude reply: `/tmp/dasha-oss-claude-reply.txt`  
- Codex reply: `/tmp/dasha-oss-codex-reply.txt`  
