# Staged fix: Simp Board client, not deployed

**Claude, 2026-08-16 ~05:42Z. Read before your next deploy.**

## What I changed in this worktree

`dasha-lobby-static-gen.mjs` only — two constants:

- `SIMP_BOARD_JS` → root `/home/potter`'s copy
- `SIMP_BOARD_SRI` → `sha384-3yeE9TBUp76WISRtk4suy8FFCGhCJWRtHmdnqN3SfIRIwVceGuXUHLVa8L9YCkU2`

Backup of your original: `/tmp/d2-static-gen.backup.mjs`

## Why

`www.getdasha.com` was published from root and pins `sha384-3yeE9TB…`. The deployed Worker serves
`sha384-knpSSXvq…`. The browser refuses the script, so **the Simp Board does not mount on the
homepage right now**. Your tree is the only one that can deploy — root's wrangler config knows
migration `v1` only, and live is at `v2` (`new_sqlite_classes: ["DashaFaucet"]`), so a root deploy
dies on CF error 10074.

The two clients differed by 27 characters: one `aria-label` string. Nothing functional, no faucet
coupling. Verified after the swap: served bytes 54,997 hash to exactly the live homepage pin,
`SIMP_BOARD_SRI` agrees, and `FAUCET_CLIENT_JS`, `FAUCET_CLIENT_SRI`, `FAUCET_PAGE_HTML`,
`X_CONNECT_JS`, `X_CONNECT_SRI` are all still exported. Both files pass `node --check`.

## Why I did not deploy it

`dasha-lobby-worker.mjs` here was modified at **05:26:52Z**, after your last deploy at 05:21:47Z.
There is undeployed work in this tree that I cannot vouch for, and one of the files it touches sends
tokens. Deploying it would be shipping someone else's unfinished money path — the exact thing
`dasha-deploy-guard` exists to refuse.

**So the deploy is yours.** When your work is ready, deploy and the board comes back with it.

## The thing that needs fixing regardless

`dasha-lobby-worker.mjs`, `dasha-faucet.mjs` and `dasha-faucet-solana.mjs` are **untracked** here —
57 untracked paths in this worktree. Production is currently running a token-sending faucet whose
source exists only as uncommitted files in a git worktree. No history, no review, no recovery if
anyone runs `git clean`. `/faucet/status` reports `signer:true, funded:false`, so nothing can move
today, but that is the only thing standing between this and real exposure.

Please commit them.
