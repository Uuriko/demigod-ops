---
status: canonical
canonical_for: studio-ui-ux-plan
title: Dasha Studio UI/UX improvement plan
updated: 2026-08-11
implementation: disk-complete
power_pass: variants-inbound-seal-craft-status
related:
  - DASHA-CULTURE-STUDIO-PRODUCT.md
  - dasha-meme-studio.html
---

# Dasha Studio — UI/UX improvement plan

**Goal:** Make Studio feel like a nightclub flyer printer, not a design app: biggest canvas, one ship button, looks as costumes, handoff as “your turn,” everything else in the coat check.

**Scope of this plan:** layout, hierarchy, mobile thumb UX, look/format affordances, handoff chrome, visual polish. Not new product surfaces (seasons, social graph, AI).

**North-star job:** Cold open on a phone → change one thing → Share (image + editable link) in under ~30 seconds, without opening “More options.”

---

## 1. Product constraints (do not violate)

1. **Art direction:** ink `#070608`, paper `#f4eddb`, acid `#dfff00`, hot `#ff3b81`, violet `#7c4dff`. Hard edges, heavy type, cherries mark. No SaaS purple soft UI.
2. **No visible word “remix”** — use “editable link,” “Your turn,” Relay.
3. **No wallet / buy gate** on the creation surface (CA in topbar is identity, not a step).
4. **A11y:** ≥44px targets, focus-visible, status live region, keyboard path for looks/formats.
5. **Self-contained Studio** + embed isolation (shadow root); no new dependencies.
6. **Ponytail:** CSS/markup/copy first; no framework; keep button set intentionally bounded.
7. **Publish gates:** embed-build button count, look/format ids, mint, CC0 carve-out.

---

## 2. Principles (from research + Studio job)

| # | Principle | Studio implication |
|---|-----------|-------------------|
| 1 | Canvas is king | Preview largest; chrome secondary |
| 2 | One primary ship | Share is the climax; PNG / editable link / OCO secondary |
| 3 | &lt;30s to proud | Strong defaults; first edit = type or one chip |
| 4 | Mobile thumb zone | Sticky Share; controls in thumb reach |
| 5 | Looks are visual | Horizontal look strip, not only a dropdown |
| 6 | Format is social | Post / Story / Banner near export, not buried |
| 7 | Handoff is theatrical | Inbound “Your turn” + lineage + Relay readable at a glance |
| 8 | Progressive disclosure | Line → look → share; advanced stays in More options |
| 9 | Thumbnail-legible type | Already strong in canvas; UI type must not steal focus |
| 10 | Honest status | Status near actions; image-only never lies about links |

---

## 3. Current structure (baseline)

```
topbar (brand, CA)
h1 Studio
handoff notes + checklist (when shown)
[ canvas | panel ]
  panel: line, chips, gallery, looks select, Edit,
         Share | Save PNG | Copy editable link,
         More options (format, effect, sticker, zoom, tilt, copy, gif, kit, OCO)
footer
fixed Undo
```

**Problems:** canvas not first on mobile; three peer export actions; looks/formats as selects; format buried; long chrome above canvas; Edit affordance unclear.

---

## 4. Target structure

```
topbar (brand, CA)
handoff strip (inbound only: Your turn + lineage + Relay)
compact first-export (first visit only)

.studio
  .stage
    canvas (hero)
  .panel
    line + suggestion chips
    looks strip (visual radios)
    photo gallery (only when look=photo)
    format chips (Post / Story / Banner)
    [Randomize] (only when photo look + photo chosen)
    .secondary (text actions: Save PNG · Copy editable link)
    More options (effect, sticker, zoom, tilt, copy, gif, kit, OCO)
    status

.ship-bar (sticky bottom on mobile; inline on desktop)
  [ Share ]  ← primary
  status echo optional

footer
Undo (fixed, as today)
```

---

## 5. Detailed work packages

### WP1 — Layout & hierarchy (P0)

**Desktop (≥861px)**
- Grid: `1.2fr` canvas / `minmax(280px, 320px)` panel (canvas slightly dominant).
- Ship bar sits at bottom of panel under primary controls (not a second floating bar).

**Mobile (≤860px)**
- Single column: **canvas first**, then panel.
- `padding-bottom` on main for sticky bar clearance (~72px + safe-area).
- Sticky `.ship-bar`: Share full-width, `position: sticky; bottom: 0`, safe-area insets, backdrop on ink.
- H1: smaller or visually quieter (`clamp` reduced); brand in topbar carries identity.

**CSS tokens**
- Keep CSS variables; add `--ship-h` for sticky clearance.
- 8px spacing rhythm for panel gaps.

### WP2 — Action hierarchy (P0)

- **Share** only full primary button in ship zone.
- **Save PNG** and **Copy editable link** as `.text-action` buttons (minimal chrome, still real buttons for a11y/tests).
- Keep ids `#share`, `#download`, `#copy-link` so tests and handlers stay stable.
- Status (`#status`) lives just above ship bar on mobile / under secondary on desktop.

### WP3 — Format chips (P0)

- Move format out of More options into panel as radio strip (`#format-strip`).
- Keep hidden or sync’d `#formats` select for script compatibility **or** drive format only from radios and keep select in DOM for tests (`display:none` / visually hidden).
- Preferred: visible chips + `select#formats` class `sr-only` / `visually-hidden` for progressive enhancement and existing `choose('formats')` tests.

### WP4 — Look strip (P1)

- Replace primary looks UI with horizontal chip strip `#look-strip` (radio labels named after looks).
- Keep `select#looks` visually hidden, synced both ways so tests and keyboard path work.
- Selected chip: acid border (match gallery selected pattern).

### WP5 — Photo gallery context (P1)

- Wrap gallery in `#photo-block`; `hidden` when `look.id !== 'photo'`.
- Show when Photo look selected; Randomize only when photo look + photo present.

### WP6 — Randomize affordance (P1)

- Rename visible label of `#edit` from “Edit” to **“Randomize”** (id stays `#edit`).
- Hide control when not applicable (`hidden` when no photo or not photo look).

### WP7 — Handoff chrome (P1)

- Group remix-note, lineage, diff-note in `.handoff` with slightly stronger inbound presence.
- First-export: tighter padding; already auto-hides when complete.
- Do not invent “remix” copy.

### WP8 — More options content (P1)

- Remove format from advanced (moved out).
- Keep: effect, sticker, zoom, tilt, copy image, GIF, kit, OCO save/open.
- Summary label remains “More options”.

### WP9 — Polish (P1)

- Safe-area: `padding-bottom: calc(... + env(safe-area-inset-bottom))` on ship bar and main.
- Slightly reduce mobile background gradient intensity if it reduces canvas contrast.
- Focus-visible preserved on chips and ship bar.
- `prefers-reduced-motion` unchanged for buttons.

### WP10 — Tests & gates (required)

- Update tests if format/look interaction needs chip click path (prefer keeping selects in DOM).
- embed-build: recount `<button>` if markup buttons change; keep ids required.
- No “remix” in `main` innerText.
- overflow checks at 320 / 390 / 1440.
- Rebuild embed + public pack; do **not** publish unless separately authorized.

---

## 6. Implementation order (execute this)

1. Write this plan (done).
2. Rewrite CSS layout + ship-bar + chips + handoff + photo-block.
3. Rewrite panel markup (structure only; keep ids).
4. Wire JS: look strip sync, format strip sync, photo-block visibility, Randomize visibility.
5. Adjust fillSelect / event listeners to keep selects authoritative.
6. Update embed-build button count if needed.
7. Update tests for new labels (“Randomize”) and overflow.
8. Run meme-studio + embed + publish --check.
9. Promote to worktrees; report residual (publish separate).

---

## 7. Acceptance criteria

| Criterion | Pass |
|-----------|------|
| Mobile 390px: canvas above fold before long form | yes |
| Share reachable without scrolling after first paint (sticky) | yes |
| Format change without opening More options | yes |
| Look change via visible strip | yes |
| Photo gallery hidden for non-photo looks | yes |
| Secondary exports still work; not equal visual weight to Share | yes |
| Inbound still shows Your turn + lineage + Relay | yes |
| No “remix” in visible UI | yes |
| axe serious/critical clean; overflow ok at 320/390/1440 | yes |
| look/format ids + mint + CC0 gates green | yes |

---

## 8. Explicit non-goals (this pass)

- New looks or templates
- Visual before/after dual canvas Relay
- Bottom sheet component library
- Redesign art palette
- Home page redesign
- Live publish (unless requested)

---

## 9. Success signal after ship (later)

- Rise in first_edit and share_intent without more opens alone
- Format ≠ square appears in some sessions
- Fewer “More options” opens required for a successful share (qualitative / session replay if available)

---

*Owner for Studio UI execution against `dasha-meme-studio.html`. Product ambition remains `DASHA-CULTURE-STUDIO-PRODUCT.md`.*
