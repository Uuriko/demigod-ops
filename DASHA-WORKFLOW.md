# Dasha operating workflow

Updated: 2026-08-07

## Scope

Dasha is the active project. A one-off action on another project does not switch the active project. Work continues on Dasha until the user explicitly names a different active project.

## Sources of truth

| Concern | Canonical source | Generated or observed surfaces |
|---|---|---|
| Plain product definition | [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md) | Landing copy must not contradict it |
| Strategy and trust contract | [`DASHA-PRODUCT-STRATEGY.md`](DASHA-PRODUCT-STRATEGY.md) | Roadmap and Discord inherit these boundaries |
| Work order and gates | [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md) | Current phase only |
| Discord setup | [`DASHA-DISCORD-BLUEPRINT.md`](DASHA-DISCORD-BLUEPRINT.md) | Controlled invite does not exist yet |
| Market research | [`DASHA-CRYPTO-LANDSCAPE.md`](DASHA-CRYPTO-LANDSCAPE.md) | Revisit only when a decision needs new evidence |
| Public homepage | `dasha-landing.html` | Webflow `/` embed |
| Meme Studio | `dasha-meme-studio.html` | Webflow `/studio` embed |
| Remix Wall experiment | `dasha-remix-pack.html` | Prepared locally; no live route yet |
| Landing markup | `dasha-desk/src/body.html` | `src/app.html`, `index.html`, `dist/index.html` |
| Landing styles | `dasha-desk/src/styles.css` | Same generated surfaces |
| Landing behavior | `dasha-desk/src/app.js` | Same generated surfaces |
| Token-facing runtime facts | `dasha-desk/src/body.html` + `src/app.js` | Generated Desk surfaces |
| Machine-readable reference | `dasha-desk/config/dasha.json` | Reference only; not a build input |
| Audit history | [`DASHA-AUDIT-2026-08-06.md`](DASHA-AUDIT-2026-08-06.md) | Historical measurements; not current state |
| Psychology research | [`DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md`](DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md) | Candidate evidence; primary-source validation required before public claims |
| Deployment procedure | `dasha-desk/docs/DEPLOY.md` | Webflow, standalone and future Pages |

Never edit generated landing files as independent sources. Run `node dasha-desk/build.mjs --write` after changing body, styles or behavior.

## Work loop

1. **Orient**
   - Read [`DASHA-DOCS.md`](DASHA-DOCS.md).
   - Check both Git worktrees.
   - Verify the live Webflow page rather than trusting an old receipt.
2. **Choose one lane**
   - Landing and mint desk
   - Discord and community operations
   - Meme Studio and culture products
   - Research and trust
   - Documentation and workflow
3. **State the smallest outcome**
   - Name the user-visible result and its proof.
   - Do not expand a one-off action into a project switch.
4. **Edit canonical sources**
   - Reuse native browser, Webflow and Discord capabilities.
   - Do not introduce wallet, trading or custom-bot scope by accident.
5. **Build and verify**

   ```bash
   node dasha-desk/build.mjs --write
   node dasha-desk/build.mjs --check
   node dasha-desk.test.mjs
   node dasha-landing.test.mjs
   node dasha-meme-studio.test.mjs
   git -C dasha-desk diff --check
   git diff --check -- 'DASHA-*.md' dasha-desk.test.mjs
   ```

   Run only the checks relevant to the changed lane. The Desk test requires Chrome CDP on `127.0.0.1:9223`.
6. **Publish verified website checkpoints under standing authorization**
   - Build first.
   - Record the exact target and artifact.
   - Never substitute an unverified community link.
   - Publish completed Dasha website changes periodically during long work and at a clean stopping point; include every configured production domain and staging target.
   - Do not ship a failing, misleading, security-sensitive or partially migrated state merely because publication is authorized.
   - Verify the public response after publishing.
   - This standing authority does not cover posts, messages, forms, Discord changes, payments or another project's website.
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

## Current publication matrix

Observed 2026-08-07:

| Surface | State | Truth |
|---|---|---|
| Webflow home | Published | Culture landing with verified mint and official Jupiter modal |
| Webflow Studio | Published | Canvas generator, PNG export and native-share/X fallback at `/studio` |
| Webflow Desk | Disk trust-reset; publish blocked | Neutral mint/Jupiter/sources/risk at `/dasha` (no FOMO/raid/referral). Live update needs Webflow token. |
| Standalone Catbox | Published | `https://files.catbox.moe/aughx9.html`; `text/html`; framing denied by host |
| GitHub Pages | Blocked | `https://uuriko.github.io/dasha-desk/` returns 404 until Pages is enabled and a push succeeds |
| GitHub repository | Local commits ahead | Push authentication unavailable in the current session |
| Discord | Proposed/prepared | Blueprint exists; no controlled invite yet |
| Old thesis/receipt work | Archived | Permanently scrapped; never test, deploy, integrate or revive |

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
| 2026-08-06 | Discord replaces unassociated Telegram as the intended community home | Control and provenance |
| 2026-08-06 | Dasha Desk became the primary live product | Establish one truthful token surface |
| 2026-08-07 | Thesis/receipt direction permanently scrapped; culture-production platform selected | Build a repeatable creative and sharing loop instead of forecasting artifacts |
| 2026-08-06 | Canonical landing source split into body, CSS and JS | One reproducible build serves Webflow, standalone and Pages |
| 2026-08-06 | Direct Webflow embed replaces third-party iframe | Indexability, accessibility and reliable interaction |

## Next workflow improvements

1. Keep the dependency-free public tests and workspace browser test aligned.
2. Add a controlled Discord invite only after the server exists; wire the runtime source first, then update the reference snapshot.
3. Keep GitHub Pages as the standalone preview and `getdasha.com/dasha` canonical.
4. Use `dasha-live-verify.mjs` for live identity and publication drift.
