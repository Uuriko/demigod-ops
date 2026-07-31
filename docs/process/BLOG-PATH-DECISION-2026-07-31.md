# Blog path decision — 2026-07-31

## Question

Do we rebuild the trydemigod.com blog in Webflow CMS from scratch, or keep the existing agent-owned path?

## Answer

**Keep the disk SoR + foot SPA.** Do not dual-SoR Webflow CMS yet. Do not rebuild from scratch.

| Option | Verdict |
|--------|---------|
| Webflow CMS-only from scratch | Reject for now. Loses `demigod-blog-quality` gates, ship-time sync, JSON-LD fan-out, and agent edit loop. Designer CMS also cannot be fully automated from this repo without extra rights. |
| Webflow CMS dual SoR | Optional later. `demigod-webflow-blog-cms-setup.mjs` is a dry-run Notes schema only. Dual SoR without a single writer is how blogs drift. |
| **JSON + foot embed (current)** | **Chosen.** `demigod-blog-posts.json` → `node demigod-blog-sync.mjs` → `DG_BLOG_POSTS` in foot-core + head Blog JSON-LD. Ship runs `--check` then sync. |

## What was wrong live

1. **One published post** (Epicurus essay) — thin catalog.
2. **Drafts blocked** by missing hero images (quality gate `image_missing`).
3. **Reading UX** — collapsed “Full note” details, card measure that felt cramped on mobile, weak body contrast/size.
4. **Product topics missing** — fee, mutual yes, ninety-day outcome, human review, privacy were not notes yet.

## What we fixed (this pass)

- Reading CSS: full-width page shell, ~40rem body measure, larger type, better mobile padding, single-post auto-open, click-to-reading-mode.
- Heroes: generated + catbox CDN for letter / masterpiece / trial / ninety-day; wired product assets already on disk.
- **9 published notes**: 5 Product + 4 Market (including the three historical drafts).
- Quality gate green for all published posts; warnings only (word_band on long essays, some shared product phrases).

## Operator loop

```bash
# edit SoR
$EDITOR demigod-blog-posts.json
node demigod-blog-quality.mjs
node demigod-blog-sync.mjs
# ship when publish is authorized (foot CDN + Webflow)
DEMIGOD_CURRENT_REQUEST_PUBLISH=1 bin/dg ship run   # only with explicit user auth
```

## Later (not now)

- Optional Webflow CMS mirror **after** Notes collection exists, fed **from** JSON, never the reverse.
- Host heroes on `demigod-site-cdn` if catbox becomes unreliable.
- Tighten essay length toward the 140–320 quality band if we want fewer warnings (optional; long Market essays can stay long).
