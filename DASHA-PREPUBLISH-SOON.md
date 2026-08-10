# Dasha — pre-publish (urgent)

**Updated:** 2026-08-08 · worktree `recovery/competitor-flow-v903`  
**Scope:** getdasha.com only (not Demigod)

## Status snapshot

| Check | Result |
|-------|--------|
| `npm run dasha:gate:fast` | **PASS** (~0.27s) |
| Live `/` `/studio` `/dasha` | 200 · mint + Jupiter present · desk neutral |
| Live lag (non-strict) | **howto-404 only** (intentional — do not ship route) |
| Webflow token file | `/tmp/dasha-wf-token.txt` present (not API-probed this pass) |
| Publish | **Not run** — needs explicit “ship/publish” in current request |

## Peer agents (Claude + Codex)

**Pinged:** publish-soon sync + follow-up after gate fix. Receipts:

- `/tmp/dg-busy/dasha-claude-prepublish.md` (first recon)
- `/tmp/dg-busy/dasha-codex-prepublish.md`
- follow-ups: `dasha-*-prepublish-2.md` when they land

### Shared verdicts

| Source | Verdict | Own unfinished work? |
|--------|---------|----------------------|
| Claude | Was **BLOCKED** on missing `dasha-studio-embed-build.mjs` + home vs worktree Studio divergence | **None** of their own |
| Codex | **BLOCKED** on process debt (howto contradiction in *strict* suite, fail-open verifyLive, missing studio test path) | **None** of their own |

Neither agent has private half-finished Dasha product work that must land before ship. They need **Grok** to keep gate green + **human** for token validity + explicit publish auth.

### Claude (first reply) — still useful

1. Do **not** blind-merge `/home/potter` Studio “Cherry/face” into this worktree without a deliberate pick.  
2. Ship script already falls back to token file (token env not required).  
3. After build script is present → run gate + dry push + real ship when authorized.

**We already did:** copy build + live-verify scripts into worktree; regenerate embed from **this** worktree’s Studio; gate green.

### Codex — still useful before / during ship

1. **How-to-buy:** fast gate correctly **bans** `/how-to-buy` links; `dasha:test:all` / howto tests still expect them → **use fast ship**, not strict, until policy is one decision (fold/delete).  
2. `dasha:test:studio` may reference missing `dasha-meme-studio.test.mjs` on some checkouts — not on fast path.  
3. Optional harden: `verifyLive()` fail-closed after push (post-ship polish if time).

## Most important polishes before publish

Ordered for “publish very soon” — **do / skip** clarity:

### Must (blocks honest ship)

1. **Valid Webflow token** — confirm `/tmp/dasha-wf-token.txt` still works (MCP/API). Human.  
2. **`npm run dasha:gate:fast` green** — already PASS. Re-run once before ship.  
3. **Ship three surfaces** with current worktree embeds (home, studio, desk) — `npm run dasha:ship` when authorized.  
4. **Post-ship live check** — `node dasha-live-verify.mjs` (or `dasha-ship --verify`); lag should stay at most `howto-404`.

### Should (same session if token works)

5. **Landing OSS wording** — disk “Open source ↗” vs live “Contribute ↗” (same GitHub target). Ship disk wins; no extra polish needed unless you want “Contribute” back.  
6. **Studio embed freshness** — already regenerated; `--check` is in fast gate.  
7. **Desk embed** — `build.mjs --write` PASS; neutral (no FOMO/raid). Confirm mint still `53ux…pump`.

### Park (do **not** block publish)

| Item | Why park |
|------|----------|
| Ship `/how-to-buy` route | Intentional 404; fold already on home |
| `dasha:test:all` / CDP / axe | Strict path; worktree missing `node_modules/axe-core` |
| Studio OSS extract, Relay, metrics | Post-launch |
| Merge home Cherry/face Studio | Content decision; not required for this publish |
| Fail-closed verifyLive | Nice; push with eyes open if short on time |
| Demigod anything | Out of scope |

## Exact ship command (when you authorize)

```bash
cd /home/potter/.grok/worktrees/potter/dasha
npm run dasha:gate:fast
# token already at /tmp/dasha-wf-token.txt OR:
# export DASHA_WF_TOKEN='…'
npm run dasha:ship          # prep + gate + push 3 embeds + publish + verify
# if push-only first:
# npm run dasha:ship:push
```

**Authorization note:** current request said “publish very soon” and prep/coordination — **not** an explicit “run ship/publish now.” Say **ship** / **publish now** to execute.

## What Grok already fixed this pass

- Restored `dasha-studio-embed-build.mjs` + `dasha-live-verify.mjs` in the Dasha worktree  
- Regenerated `dasha-studio-embed.html` / `.js` from worktree Studio  
- Fast gate green  
- Live-verify markers updated so culture headline + inline studio embed count as current (stale ALL-CAPS / external-only JS checks removed)  
- Claude + Codex informed publish is imminent  

## Residual risk

- Token file may be **expired** (last write ~17:25 same day) — fail will show at MCP connect.  
- Two disk trees (`/home/potter` vs this worktree) can diverge again — **ship from this worktree only**.  
- Live already has much of the culture home; remaining ship is mostly embed parity + OSS link wording + any desk/studio deltas.

### Claude follow-up (landed)

- Owns stale `dasha-how-to-buy.test.mjs` that required home/desk → `/how-to-buy` while fast gate bans those links.
- **Fixed on disk:** test now asserts **no** unpublished how-to-buy links (matches growth + landing + gate).
- Still wants: token dry-hit against Webflow before ship; no own product polish left.
