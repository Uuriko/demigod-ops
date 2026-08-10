# Dasha Studio — fast create + fast share

**Date:** 2026-08-08  
**Audience:** any coding agent continuing Studio work  
**Canonical source:** `dasha-meme-studio.html` only  
**Artifacts:** regenerate embed → Worker `studio.js` → Webflow embed only via ship path  
**Related:** [`DASHA-STUDIO-QUICK-SHARE-EXECUTION-PROMPT-2026-08-08.md`](DASHA-STUDIO-QUICK-SHARE-EXECUTION-PROMPT-2026-08-08.md) (prior progressive-disclosure pass)

---

## 1. Mission

Make the **shortest successful Studio session** feel like:

1. Open `/studio` (already has a photo on canvas — never blank).
2. Optional: one tap **Surprise** for a full new take (photo + line + style).
3. Optional: one chip for a different line, or type.
4. Tap **Share on X** (or sticky Share on mobile).
5. Within ~1 interaction delay: system share sheet with **PNG file + caption + remix URL**, or honest desktop fallback (download PNG + X intent).

Create and share must both be **fast**. Power stays under **More options**. No wallet. No account. No FOMO. No AI generation. No new deps.

---

## 2. Why this matters (product + research)

| Insight | Studio implication |
|--------|---------------------|
| Memecoin culture spreads by **remixable images**, not utility pages | Studio is the growth engine; Desk is trust plumbing |
| Share rate dies if export waits on network or re-encodes cold | Share path must be local-first and cache-warm |
| Zero-decision “new take” beats empty canvas + many knobs | Surprise = full new take, not only a filter |
| Pre-auth gates and OAuth on the click path kill completion | X credit is optional; never `await` OAuth before `navigator.share` |
| Result/export is the product | Warm PNG after every still render so Share is near-instant |

Do **not** “grow traffic” by adding Telegram, FOMO, post-to-earn, or a second Studio.

---

## 3. Hard constraints (non-negotiable)

### 3.1 Source of truth

- Edit **`dasha-meme-studio.html` only**.
- Never hand-edit `dasha-studio-embed.html` / `dasha-studio-embed.js`.
- Build: `node dasha-studio-embed-build.mjs`
- Lobby assets (if Worker serves `studio.js`): `node dasha-lobby-assets-build.mjs --write`
- Deploy Worker: `npx wrangler deploy -c dasha-lobby-wrangler.jsonc` (or `npm run dasha:lobby:deploy`)
- Webflow: `npm run dasha:ship -- --studio-only` **only** when token is valid; exact readback required
- Live Studio shell may still be thin until Webflow push succeeds — Worker client can still update independently

### 3.2 Product / honesty

- Mint remains `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` wherever CA/Buy appear.
- Association ≠ endorsement. No “official / safe / verified mint.”
- No `t.me/dashacommunity` or banned FOMO copy.
- Studio requires **no wallet, no account**. X link is optional credit only.
- Culture caption seeds stay on public `@dash_eats` / Perry lines enforced by `dasha-culture-seeds.test.mjs`.

### 3.3 Architecture

- Single-file Studio, no package deps, no server-side image pipeline.
- Webflow embed = empty host + `https://lobby.getdasha.com/client/studio.js` (shadow root).
- Light-DOM shell (mint + lede) may exist for first paint; client **clears** it on mount.
- Keep formats: Post / Story / Banner; looks; effects; stickers; GIF; kit; copy; remix URL; undo; upload; Simp claim after share.

### 3.4 Ponytail

- Prefer smallest diff that removes the real latency and decision cost.
- Reuse existing Surprise / chips / sticky share / draft / hash state.
- Do not invent a second share stack, React, or CDN of templates.

---

## 4. Friction map (what was wrong)

### Create friction

| Friction | Effect | Fix direction |
|----------|--------|----------------|
| Blank mental model (“what do I do?”) | Abandon | Default photo already loads; Surprise = **new take** (photo + line + style) |
| Style-only Surprise | User still picks line/photo | Cycle library still + caption + SURPRISES pack |
| Tools disabled until photo | Confusion | First library still auto-loads |
| Deep controls on main surface | Overwhelm | Keep Filter/Sticker quick; Look/Style/frame/GIF under More |

### Share friction

| Friction | Effect | Fix direction |
|----------|--------|----------------|
| `await refreshLinkedHandle()` on share click | 200–800ms+ and can drop user-activation on mobile | Use last-known handle; refresh **after** or non-blocking |
| Cold `canvas.toBlob` every share | Share feels laggy after edits | Debounced **warm PNG cache** after still `render(0)` |
| Double-tap race | Two sheets / broken state | Keep disable-guard on share buttons |
| Desktop can’t attach to X | User loses image | Download PNG + open intent; soft-copy remix URL |
| Claim/OAuth noise before share | Drop-off | Claim row only **after** successful share path |

---

## 5. Target behavior (definition of done)

### Create

- [ ] Landing on Studio with no hash/draft shows first library still within image load time (already).
- [ ] **Surprise** produces a visibly different postable frame: next photo + caption + style/sticker/frame pack, with Undo restoring prior snapshot.
- [ ] Caption chips still one-tap set the line; culture seeds pass.
- [ ] Filter / Sticker remain one-tap cycles without opening More.
- [ ] More options still exposes Look, Style chips, framing, X bar, GIF, kit, copy, remix link, reset.

### Share

- [ ] Share click path does **not** `await` OAuth status.
- [ ] After idle ~50ms post-render, PNG cache is warm; second share of same state is effectively instant encode-skip.
- [ ] `navigator.canShare({ files })` → one PNG `File` + text + remix `url` (unless `arm=flat`).
- [ ] AbortError clears status quietly; buttons re-enable.
- [ ] Fallback: save PNG + X intent with text+URL; status explains attach.
- [ ] Soft-copy remix URL after share (best-effort clipboard); never block share on clipboard failure.
- [ ] Double-tap cannot start two concurrent shares.
- [ ] Optional Simp claim remains after share, not before.

### Ship / verify

- [ ] `node dasha-studio-image.test.mjs` PASS (mobile + desktop).
- [ ] `node dasha-studio-embed-build.mjs --check` PASS.
- [ ] `npm run dasha:test:studio` PASS.
- [ ] Lobby `studio.js` matches disk embed script (asset hash).
- [ ] If Webflow token valid: studio-only ship + live HTML contains shell mint + studio.js; smoke Share on phone.

---

## 6. Implementation spec (what is already on disk)

Agents should **verify and extend**, not re-litigate, these mechanisms if present:

### 6.1 PNG warm cache

- `exportKey()` from look, format, line, photoId, effect, sticker, zoom, tilt, offsets, canvas size.
- `png()` returns cached blob when key matches; coalesces inflight encodes.
- `render(phase)`: on `phase === 0`, invalidate cache then `warmPng()` (~48ms debounce).
- GIF phases `phase !== 0` must **not** thrash the still cache incorrectly; still export is phase 0 only.

### 6.2 Share path

```text
click Share
  → disable buttons
  → if !xStatusReady: fire-and-forget refreshLinkedHandle()
  → status: cached ? "Opening share…" : "Preparing…"
  → blob = await png()
  → File + shareText + remixURL
  → canShare(files)? navigator.share : save + X intent
  → softCopyRemixLink()
  → showClaimRow(...)
  → refreshLinkedHandle() for next time
  → finally re-enable buttons
```

### 6.3 Surprise = new take

On `#edit` click (label remains **Surprise** unless tests/product rename):

1. `photoToolReady()` (forces photo look when using photo tools).
2. `remember()` for Undo.
3. Advance `SURPRISES[editIndex]` + `CAPTIONS[editIndex]`.
4. Next library photo after current `photoId` (wrap).
5. Apply effect/sticker/zoom/tilt/offsets; set line; check radio; `loadPhoto(..., { keepLook: true, framing, note })`.

Do not require opening More options for a postable frame.

### 6.4 Soft remix copy

`softCopyRemixLink()` uses `navigator.clipboard.writeText(remixURL())` best-effort. Failures ignored.

### 6.5 Embed shell (separate from create/share latency)

Loader HTML should expose mint + lede for no-JS/first paint; client clears light DOM before shadow attach. Ship gate should require mint in embed file when that shell ships.

---

## 7. What NOT to do

- Do not await network (OAuth, claims, analytics) on the Share click path.
- Do not add “Connect X to share.”
- Do not replace native share with “only open X” on mobile when `canShare({files})` works.
- Do not auto-download PNG when native share succeeds.
- Do not add AI image gen, stock template marketplaces, or server uploads of user photos.
- Do not grow the main surface with more primary buttons (button budget still gated in embed-build).
- Do not rename culture seed lines away from research/gate strings.
- Do not tell the human to “post more on X” as a substitute for product latency work.

---

## 8. Test plan (must stay green)

### Automated

```bash
node dasha-studio-embed-build.mjs --write
node dasha-studio-embed-build.mjs --check
node dasha-studio-image.test.mjs
node dasha-culture-seeds.test.mjs
npm run dasha:test:studio
node dasha-lobby-assets-build.mjs --write   # when Worker hosts studio.js
npx wrangler deploy -c dasha-lobby-wrangler.jsonc
```

### Image test expectations

- Quick tools: Surprise / Filter / Sticker visible; Style under More.
- Surprise changes effect **and** advances photo + line (wait for async load).
- Undo restores prior effect (and snapshot fields).
- Share mock: double-click → one `navigator.share`; PNG file; text has `$dasha`; url has hash state.
- Share must complete even if `/oauth/x/status` is artificially slow (e.g. 2.5s) — assert share within ~1.5s.
- Draft restore on reload without URL state.
- Mobile sticky share; desktop no sticky chrome.
- No page errors; no sub-44px targets; no horizontal overflow.

### Manual (phone)

1. Open live `/studio` on iOS Safari / Android Chrome.
2. Wait one beat after photo loads; tap Share → sheet should open with image.
3. Tap Surprise twice → different stills + lines; Undo once.
4. Edit line; wait ~100ms; Share again (should feel instant).
5. Desktop Chrome: Share downloads PNG + opens X intent; remix URL on clipboard if permitted.

---

## 9. Future improvements (only if measured need)

Ranked; do not all ship at once:

1. **Story-first sticky format toggle** on mobile if Stories outshare Posts (measure first).
2. **Web Share Level 2** title/text tuning per format.
3. **JPEG export option** for smaller share files (quality vs stickers/alpha).
4. **Service-worker cache** of library stills for repeat visits (careful with third-party pbs.twimg hotlink policy).
5. **Home hero → Studio** deep links already exist; ensure each collage tile still opens exact state.
6. **Quiz result → Studio** handoff with prefilled line (cross-surface) — only after quiz share is healthy.
7. Webflow re-auth so mint shell + loader publish to www (ops, not code).

---

## 10. Agent execution checklist

```text
[ ] Read this prompt + dasha-meme-studio.html share/create sections
[ ] Confirm friction still real on disk/live (don't re-add fixed work)
[ ] Implement or polish only create/share latency and one-tap new take
[ ] Keep culture seeds + honesty gates
[ ] Rebuild embed + lobby static gen
[ ] Run studio + culture-seeds tests
[ ] Deploy lobby Worker
[ ] Ship Webflow studio-only if token valid; else note block in DASHA-LIVE-CONTEXT
[ ] Peer-ping short note of what shipped
[ ] Stop when DoD green; do not pile speculative features
```

---

## 11. Success metric (honest)

Not “traffic number.” Product metric:

- **Time from Studio open → first Share sheet** under a few seconds on mid-range mobile after first photo paint.
- **Time from last edit → Share** near-instant when cache warm.
- **Surprise → postable frame** in one tap without More options.

If those three hold, create/share is fast enough; growth then is distribution (quiz invite, X posts of exports), not more knobs.

---

## 12. Commands cheat sheet

```bash
# develop
# edit dasha-meme-studio.html

node dasha-studio-embed-build.mjs
node dasha-lobby-assets-build.mjs --write
npm run dasha:test:studio
npx wrangler deploy -c dasha-lobby-wrangler.jsonc

# when Webflow token is good
printf %s 'TOKEN' > /tmp/dasha-wf-token.txt
npm run dasha:token:check
npm run dasha:ship -- --studio-only
```

---

*End of prompt. Prefer shipping the checklist over expanding this document.*
