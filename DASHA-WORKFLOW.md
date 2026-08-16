---
status: canonical
canonical_for: operations
last_verified: 2026-08-08
---

# Dasha operating workflow

Updated: 2026-08-07

## Scope

Dasha is the active project. A one-off action on another project does not switch the active project. Work continues on Dasha until the user explicitly names a different active project.

## The ship path

There is one, and it is [`dasha-ship.mjs`](dasha-ship.mjs):

```
node dasha-ship.mjs --prep --gate     # prepare embeds + fast gate, publishes nothing
node dasha-ship.mjs --preflight       # auth / site / domain only
node dasha-ship.mjs --ship            # prep → gate → push embeds → publish → verify
```

`--ship` ends in `verifyLive()`, which runs live marker checks, then
[`dasha-audit-live.mjs`](dasha-audit-live.mjs) for the broad audit, then `site-hunt.mjs --site=dasha`
for cross-brand contamination and dead links. Each of those fails the run.

**Publishing any other way is how the Simp Board dies.** A Webflow Designer or MCP publish skips the
SRI drift guard, so the homepage can end up pinning a hash the Worker no longer serves and the
browser silently refuses the script. That happened on 2026-08-11 and again on 2026-08-16, and on the
second occasion Designer nav edits also added links to `/simp`, `/graph` and `/bounties` — pages
that exist in no tree. The lobby Worker half is `npm run dasha:lobby:deploy`, gated by
[`dasha-deploy-guard.mjs`](dasha-deploy-guard.mjs), which refuses to bundle uncommitted work.

Publishing requires explicit authorization in the current user request. A green gate is not a ship.

## Sources of truth

| Concern | Canonical source | Generated or observed surfaces |
|---|---|---|
| Plain product definition | [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md) | Landing copy must not contradict it |
| Product and trust boundaries | [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md) | Roadmap and public copy must not contradict it |
| Threat controls | [`DASHA-THREAT-MODEL.md`](DASHA-THREAT-MODEL.md) | Every listed risk names a runnable check |
| Public claims | [`DASHA-CLAIMS.md`](DASHA-CLAIMS.md) | Copy uses the narrowest supported wording |
| Work order and gates | [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md) | Current phase only |
| Market research | [`DASHA-CRYPTO-LANDSCAPE.md`](archive/dasha-docs/DASHA-CRYPTO-LANDSCAPE.md) | Revisit only when a decision needs new evidence |
| Public homepage | `dasha-landing.html` | Webflow `/` embed |
| Meme Studio product source | `dasha-meme-studio.html` | Root standalone/embed and public-repo `studio/`; do not publish the full root embed over the live thin loader |
| Meme Studio live runtime | `.grok/worktrees/potter/dasha/dasha-meme-studio.html` | Worker `/client/studio.js` + thin `dasha-studio-embed.html` on Webflow `/studio`; reconcile root changes here deliberately before release |
| Studio gallery rights | `dasha-studio-media.json` | Every remote gallery URL must be registered and tested |
| Lobby + X OAuth | `.grok/worktrees/potter/dasha/dasha-lobby-{worker,mod,x}.mjs` | `https://lobby.getdasha.com` |
| Simp Board | `.grok/worktrees/potter/dasha/dasha-simp-{score,actions}.mjs` + `dasha-simp-board-client.js` | Homepage `#simp` + Lobby `/simp/*` |
| Simp Board data contract | `dasha-simp-board.schema.json` + `dasha-simp-board.json` | Opt-in, automatic-event and public-field boundaries |
| Lobby/Board operations | `.grok/worktrees/potter/dasha/DASHA-LOBBY.md` | Wrangler, moderation CLI and live audit |
| How to buy | `dasha-how-to-buy.html` | `https://www.getdasha.com/how-to-buy`, served by the Lobby worker |
| Remix Wall experiment | `dasha-remix-pack.html` | Prepared locally; no live route yet |
| Landing markup | `dasha-desk/src/body.html` | `src/app.html`, `index.html`, `dist/index.html`, root publish-ready Desk embed; Webflow is an observed output |
| Landing styles | `dasha-desk/src/styles.css` | Same generated surfaces |
| Landing behavior | `dasha-desk/src/app.js` | Same generated surfaces |
| Desk Webflow shell/nav | `dasha-desk-shell.html` | Exact Webflow element `bbf324ae-76a0-f4f7-f61b-5882cce71a93` |
| Retired Desk sticky repair | `dasha-desk-retired-repair.html` | Exact Webflow element `bc1be3d0-bf73-7ba8-b662-70ea1f1519bd`; managed empty placeholder |
| Token-facing runtime facts | `dasha-desk/src/body.html` + `src/app.js` | Generated Desk surfaces |
| Machine-readable reference | `dasha-desk/config/dasha.json` | Reference only; not a build input |
| Audit history | [`DASHA-AUDIT-2026-08-06.md`](archive/dasha-docs/DASHA-AUDIT-2026-08-06.md) | Historical measurements; not current state |
| Psychology research | [`DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md`](archive/dasha-docs/DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md) | Candidate evidence; primary-source validation required before public claims |
| Deployment procedure | `dasha-desk/docs/DEPLOY.md` | Webflow, standalone and future Pages |

Never edit generated landing files as independent sources. Run `node dasha-desk/build.mjs --write` after changing body, styles or behavior.

## Work loop

1. **Orient**
   - Read [`DASHA-DOCS.md`](DASHA-DOCS.md).
   - Check both Git worktrees.
   - Verify the live Webflow page rather than trusting an old receipt.
2. **Choose one lane**
   - Landing and mint desk
   - Lobby, Board and community operations
   - Meme Studio and culture products
   - Research and trust
   - Documentation and workflow
3. **State the smallest outcome**
   - Name the user-visible result and its proof.
   - Do not expand a one-off action into a project switch.
4. **Edit canonical sources**
   - Reuse native browser, Webflow and Cloudflare capabilities.
   - Do not introduce wallet, trading or custom-bot scope by accident.
5. **Build and verify**

   ```bash
   npm run dasha:test:docs
   node dasha-desk/build.mjs --write
   node dasha-desk/build.mjs --check
   node dasha-desk.test.mjs
   node dasha-landing.test.mjs
   node dasha-meme-studio.test.mjs
   git -C dasha-desk diff --check
   git diff --check -- 'DASHA-*.md' dasha-desk.test.mjs
   ```

   Run only the checks relevant to the changed lane. The Desk test requires Chrome CDP on `127.0.0.1:9223`.
6. **Publish only when the current request authorizes it**
   - Build first.
   - The canonical root shipper must confirm the live Lobby `/health.assets` hash matches the
     prepared Worker bundle before any site-wide Webflow publish. Deploy and read back the Worker
     first when they differ; never knowingly create a split client/server release.
   - Record the exact target and artifact.
   - Never substitute an unverified community link.
   - Prepare, gate and read back changes by default. Publish only when the current user request explicitly asks for publication.
   - Do not ship a failing, misleading, security-sensitive or partially migrated state merely because publication is authorized.
   - Verify the public response after publishing. The root ship path requires both its host/marker
     readback and the canonical Worker/site live audit before advancing the verified manifest.
   - Prior publication requests do not carry forward. Posts, messages, forms, Discord changes, payments and wallet actions require their own current authorization.
   - **Who runs which deploy.** Recorded 2026-08-09 because Grok's usage ran out and two publish
     paths had no other named owner. Claude holds the `/how-to-buy` worker deploy
     (`dasha-lobby-assets-build.mjs --write`, then `dasha:lobby:deploy` in the worker tree) and the
     public Studio embed push to `Uuriko/dasha-desk`. Both still require authorization in the current
     request like any other publish; holding a path is not standing permission to use it. If Grok
     returns, hand them back explicitly rather than letting two owners accumulate.
   - The worker tree runs on Node 22+; the main root's default Node is 18, so prefix worker commands
     with the nvm path (`/home/potter/.nvm/versions/node/v24.17.0/bin`) or wrangler refuses to start.
7. **Handoff**
   - Report what is live, what is only local, verification results and the next unblocked Dasha task.
   - Close disposable automation tabs.

## Status vocabulary

Use these words consistently:

- **Observed:** fetched directly from the public surface during this session.
- **Prepared:** source and generated artifacts match; not necessarily public.
- **Published:** the intended public URL was fetched after publication and contains the expected markers.
- **Blocked:** an external capability such as authentication prevents the action.
- **Proposed:** strategy or future behavior, not built.

Do not call a local commit, upload receipt or Webflow save “published.”

## Current publication state

Do not copy mutable release status into this document. Read it from the release truth:

```bash
npm run dasha:ship:status
npm run dasha:verify:live
```

The manifest owns expected artifact identity; the live verifier owns observed public behavior. A dated audit is never current release state.

## Documentation rules

- One fact, one owner document. Other docs link to it instead of copying long sections.
- Date unstable claims and label their evidence source.
- Separate token association, account control, endorsement and safety; they are different claims.
- Research notes preserve evidence. Product docs preserve decisions. The roadmap preserves order.
- Move superseded facts into a short history note or delete them; never leave two “current truths.”
- New documents must be added to [`DASHA-DOCS.md`](DASHA-DOCS.md) with an owner and status.
- Every workflow command must be runnable from `/home/potter` unless the doc explicitly changes directory.

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-08-06 | The unassociated Telegram and Discord-as-HQ proposal were rejected | Control and provenance |
| 2026-08-08 | Lobby, X OAuth and the opt-in measured Simp Board shipped | Community conversation and reviewed recognition |
| 2026-08-08 | All publication became current-request-gated | Prevent stale authorization from causing external changes |
| 2026-08-06 | Dasha Desk became the primary live product | Establish one truthful token surface |
| 2026-08-07 | Thesis/receipt direction permanently scrapped; culture-production platform selected | Build a repeatable creative and sharing loop instead of forecasting artifacts |
| 2026-08-06 | Canonical landing source split into body, CSS and JS | One reproducible build serves Webflow, standalone and Pages |
| 2026-08-06 | Direct Webflow embed replaces third-party iframe | Indexability, accessibility and reliable interaction |

## Next workflow improvements

1. Keep the dependency-free public tests and workspace browser test aligned.
2. Keep GitHub Pages as the standalone preview and `getdasha.com/dasha` canonical.
3. Use `dasha-live-verify.mjs` for live identity and publication drift.
