---
status: working
generated_by: claude
generated_at: 2026-08-16
---

# Making root deployable again — the actual inventory

Root `/home/potter` cannot deploy the lobby Worker at all. Live is at migration `v2`
(`new_sqlite_classes: ["DashaFaucet"]`); root's `dasha-lobby-wrangler.jsonc` declares only `v1`, so
`wrangler deploy` dies on Cloudflare error 10074, *"Cannot apply new-sqlite-class migration to class
DashaLobby that is already depended on by existing Durable Objects."*

That is not a config typo. Root has none of the faucet, and a Durable Object class cannot be bound
without being defined. **Root is permanently undeployable until it absorbs the faucet or the
`DashaFaucet` class is retired** — and retiring it means `deleted_classes`, which destroys the
Durable Object's state.

I scoped this to do it, and stopped. What follows is the verified inventory, including two things
that were not in my earlier estimate.

## What I got wrong twice, so the next estimate starts honest

- I first sized the faucet at **82 lines** from a grep count. It is ~1,100 across four files.
- I then recommended copying `dasha-lobby-static-gen.mjs` wholesale from root into `dasha-2` as a
  "one file" fix. It would have **broken the live faucet and X-connect**: root's static-gen does not
  export `FAUCET_CLIENT_JS`, `FAUCET_CLIENT_SRI`, `FAUCET_PAGE_HTML`, `X_CONNECT_JS` or
  `X_CONNECT_SRI`, all of which dasha-2's worker imports.

## Inventory

### 1. A new runtime dependency — not previously flagged

`dasha-faucet-solana.mjs` imports `@noble/ed25519`. It is **not** in root's `package.json` and
**not** in root's `node_modules`. dasha-2 carries its own `node_modules` containing it.

So the merge starts with a dependency addition to the production Worker bundle. That deserves its
own decision, not a silent `npm install` inside a larger change.

### 2. Four files to copy

| File | Lines | Note |
|---|---|---|
| `dasha-faucet.mjs` | ~360 | already carries the `paste:true` fix (`c7c2f6f`) |
| `dasha-faucet-solana.mjs` | ~430 | signs and sends SPL transfers |
| `dasha-faucet-client.js` | — | browser client |
| `dasha-faucet-page.html` | — | the `/faucet` page |

`dasha-simp-actions.mjs` is already in root and already imported by root's worker, so
`base58Decode` / `isValidSolanaAddress` resolve without change.

### 3. Worker merge — the hard part

Root's `dasha-lobby-worker.mjs` is 3,308 lines; dasha-2's is 3,158. `diff` gives **36 hunks, 585
lines root-only, 435 dasha-2-only.** They are divergent forks, not one ahead of the other. Needed
from dasha-2:

- `class DashaFaucet` (~249 lines)
- `/faucet` and `/faucet/` route handling, plus `env.FAUCET.idFromName('main')` dispatch
- helpers root lacks: `injectXConnectPrompt`, `tokenBalanceRaw`, `FAUCET_MINT`
- `/client/faucet.js` asset route

Do **not** take dasha-2's other 435 lines. Root's `/price` and `/forum` are newer and live currently
404s both.

### 4. Static generation — the second surprise

The worker imports `FAUCET_CLIENT_JS`, `FAUCET_CLIENT_SRI`, `FAUCET_PAGE_HTML`, `X_CONNECT_JS`,
`X_CONNECT_SRI` from `dasha-lobby-static-gen.mjs`, which is **generated** by
`dasha-lobby-assets-build.mjs`. Root's build does not know about the faucet client or page, so root
cannot regenerate a static-gen containing those exports until the build is taught about them.

That means the merge touches the build system, not just sources. Copying a generated file across
would work exactly once and then drift — which is the failure this repo already has a name for.

### 5. Config

```jsonc
"durable_objects": { "bindings": [
  { "name": "LOBBY",  "class_name": "DashaLobby" },
  { "name": "FAUCET", "class_name": "DashaFaucet" }
]},
"migrations": [
  { "tag": "v1", "new_sqlite_classes": ["DashaLobby"] },
  { "tag": "v2", "new_sqlite_classes": ["DashaFaucet"] }
]
```

Tags must match live exactly. A missing tag replays every migration from scratch — which is the
10074 error.

## Order

1. Add `@noble/ed25519` to root. Decide it deliberately.
2. Copy the four faucet files.
3. Teach `dasha-lobby-assets-build.mjs` about the faucet client and page; regenerate static-gen;
   confirm the five exports appear and `--check` passes.
4. Merge the worker pieces. `node --check`, then `dasha-worker-routes.test.mjs` and
   `dasha-faucet.test.mjs` from dasha-2 must pass against root.
5. Update the wrangler config.
6. `node dasha-deploy-guard.mjs` must say clear — commit first, never `--force`.
7. Deploy, then verify: `/faucet/status` still reports the same treasury and caps, `/price` and
   `/forum` answer 200, and the served `simp-board.js` hashes to the pin on live home.

## Why this is not done yet

Every step above is doable. Together they are a dependency addition, a build-system change, a
36-hunk merge of a 3,300-line production Worker, and a Durable Object migration against live state —
on money code whose author has not answered six messages.

Four times tonight a careful check caught something an estimate missed. The next one lands on a
Worker holding real Simp Board, chess, forum, referral and faucet state, and root becomes the deploy
source immediately afterwards, so a subtle error is not discovered by anyone else first.

It wants a fresh session, the author reachable, and the tree-ownership question answered — because
if `dasha-2` is going to stay the deploy source, none of this work is needed at all.
