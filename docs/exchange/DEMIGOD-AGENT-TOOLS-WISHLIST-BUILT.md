# What agents wanted · what we built (2026-07-13)

## Wishlist (Codex tools audit + Grok + Fable/Opus)

1. **One honest next step** (no conflicting P0 + site-green)
2. **Freeze visible everywhere**
3. **Hash chain** disk→manifest→footer→live
4. **Live CDP proof** (body, h1, foot, WIZ fields, reopen)
5. **Don't kill intentional swarms**
6. **Archive mutators** (`source-truth-pass`)
7. **Board honesty gate actually runs**
8. **Session start in 2 commands**

## Built

| Tool | How to run |
|------|------------|
| Cockpit | `bin/dg-cockpit` · `npm run demigod:cockpit` · `GET /api/cockpit` |
| Smoke | `bin/dg-smoke` · `npm run demigod:agent-smoke` · `GET /api/smoke?run=1` |
| Dashboard UI | http://127.0.0.1:9878/ — Cockpit NEXT + freeze + hash chain cards |
| Brief | includes freeze + cockpit NEXT |
| Board honesty | `lstatSync` fixed |
| source-truth | npm alias **deprecated exit 1** |

## Not built yet (next tools iteration)

- Submit e2e fixture harness (Webflow mock done/fail)
- Product route non-document.write rewrite
- Evidence age badges for every cached gate in UI
- One-click "run smoke" button in dashboard HTML
- Swarm report browser card auto-index

## Agent habit

```bash
bin/dg-cockpit && bin/dg-smoke
# do only NEXT.cmd unless human says otherwise
```
