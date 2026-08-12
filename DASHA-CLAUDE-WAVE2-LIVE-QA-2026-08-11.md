---
status: working
owner: claude
created: 2026-08-11
task: Wave 2 independent live QA (Codex, bus 2026-08-11T15:23Z)
---

# Dasha Wave 2 — independent live QA

Read-only. Live `www.getdasha.com` and `lobby.getdasha.com`, driven through CDP at **390×844** and
**1440×900** on 2026-08-11. No publish, posts, messages, forms or wallet actions.

**No production counter was written.** Two techniques, both labelled at the finding that used them:
- **Request interception** — every `POST` to `/studio/event` and `/simp/*` was aborted in-browser, so
  the Studio edit/export walk below exercised the real live client while writing nothing. 4 such
  writes were blocked per Studio run.
- **Write-free probes** — `POST /simp/quiz {action:"finalize"}` returns `401` *before* touching any
  state (`dasha-lobby-worker.mjs`: the `!xId` guard is the first statement in the branch), so
  probing it is free. I did **not** send `{action:"start"}`, which increments
  `simpQuizMetrics.starts` and persists.

Sources are marked **[live]** (I drove it), **[served-source]** (read the deployed client bytes) or
**[worker-source]** (read the worker in the tree that live is built from).

---

## Result against Codex's checklist

| # | Check | 390×844 | 1440×900 |
|---|-------|---------|----------|
| 1a | No popup until an explicit click | **PASS** | **PASS** |
| 1b | Anonymous quiz score before OAuth | **FAIL** | **FAIL** |
| 2 | Desk: skip link · one H1 · AA gradient | **PASS** | **PASS** |
| 3 | Studio: thin loader · transmission `src` handoff · edit/export/share · 44px ranges | **PASS** | **PASS** |
| 4 | How-to-buy: Solscan · footer targets | **PASS** with one new P2 | **PASS** with one new P2 |

Five of my six Wave 1 findings are fixed. The sixth (1b) is unchanged, and one new small defect
appeared inside the fix for another.

---

## 1a · No popup until click — PASS *(was Wave 1 P1-1)*

- **[live]** Loaded home, scrolled `#dasha-simp-board` into view, waited 5s at both viewports with a
  `window.open` shim installed before any page script and a Puppeteer `popup` listener attached:
  `openedWithoutInteraction: []`, `popupsSeen: []`. The board mounted in both runs.
- **[served-source]** All three `window.open(base+'/oauth/x/start')` call sites in the deployed
  `client/simp-board.js` are inside handlers: two are `primary.addEventListener('click', …)`, the
  third is `function linkX()`, whose every call site is itself inside an event handler. The only
  programmatic `.click()` in the file is the 1–3 keyboard shortcut that selects a quiz answer.

The Wave 1 defect — an OAuth window opening as the reward for answering question 20 — is gone.

## 1b · Anonymous score before OAuth — FAIL

A player still cannot see any score without linking X. This is enforced server-side, so it is not a
UI regression that a client fix could reach.

- **[live]** `POST /simp/quiz {"action":"finalize"}` with no session, from an allowed origin:
  ```
  HTTP 401
  {"error":"link X to reveal your result"}
  ```
- **[worker-source]** The `finalize` branch opens with `if (!xId) return json({ error: 'link X to
  reveal your result' }, 401, …)`. The score is computed by `submitQuiz(...)` only after that guard.
- **[served-source]** The client has no local scoring path — no `localScore`/`computeScore`
  equivalent exists. Its finish handler calls `postQuiz({action:'finalize'})` and renders
  `quizResult.points` from the response, so when the response is a 401 there is no number to show.
- **[live]** The up-front copy is `"How big of a Dasha simp are you? Take the quiz · Finishing joins
  the Board."` — identical at both viewports. A regex for any "link X to see/reveal/view your
  score" disclosure returns **false**.

**Two separable problems.** The first is the product decision that the result is link-gated; that is
Codex's and the operator's call, not a QA verdict. The second is that **the gate is not disclosed
before the 20-question investment** — the copy promises "finishing joins the Board", which reads as
a consequence of finishing, not a precondition for seeing anything. Whatever is decided about the
gate, a player should know about it before question 1.

- **Smallest correction for the disclosure alone:** say it in the quiz intro — "finish and link X to
  see your score" — which costs nothing and does not touch the gate.

## 2 · Desk — PASS *(all three were Wave 1 findings)*

- **Skip link [live]** — first focusable is `Skip to content`; on focus it is **121×40 at (12, 12)**
  with `outline: solid 3px`, `visibleWhenFocused: true`. Wave 1 measured 1×1 at `x:-9999` before and
  after focus. **Fixed.**
- **One H1 [live]** — `h1Count: 1`, text `$dasha`. Wave 1 found two competing H1s. **Fixed.**
- **AA gradient [live]** — computed `background-image` on `.dd-btn-primary` is
  `linear-gradient(135deg, rgb(124, 58, 237), rgb(91, 33, 182))` — i.e. `#7c3aed → #5b21b6`.
  `hasAaStop: true`, `hasLegacyStop: false`. White on the lightest stop `#7c3aed` is **5.7:1**,
  clearing the 4.5:1 floor. Wave 1 measured 3.13–3.28:1 against the live `#a78bfa` gradient.
  **Fixed — and the reconciliation took root's `dasha-desk/src/styles.css`, which is what my Wave 1
  reconciliation note asked for.** Had it resolved toward the worker tree, this would still fail.

## 3 · Studio — PASS

- **Thin loader [live]** — page HTML is **7,446 bytes**, references `client/studio.js`, contains no
  inline `attachShadow`, and `.dasha-studio-embed` has a live `shadowRoot` after mount.
- **Transmission `src` handoff [live]** — loaded
  `/studio#look=signal&line=pass%20it%20on&src=transmission-001`, made a real edit, then read the
  rewritten hash: `#look=signal&format=square&src=transmission-001&line=WAVE2+EDIT+CHECK&pLook=…`.
  **`src=transmission-001` survives the editable handoff**, and lineage (`pLook`/`pFormat`) is
  recorded alongside it.
- **Edit [live]** — typing into the caption changed the rendered canvas (`editChangedCanvas: true`).
- **Export [live]** — "Save PNG" (177×52) announced `Saved dasha-signal-square.png.` in an
  `aria-live` region. Telemetry POSTs were blocked throughout, so this wrote nothing.
- **Share [live]** — Share 153×52, Copy image 176×44 — both clear 44px.
- **44px ranges [live]** — `zoom` and `tilt` are **336×44**, `meets44: true` for both. Wave 1
  measured them at 339×**16**. **Fixed.**

## 4 · How-to-buy — PASS, with one new P2

- **Solscan [live]** — `https://solscan.io/token/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` is
  now present, alongside 2 exact-mint Jupiter links. This was Wave 1 P2-4. **Fixed.**
- **Footer targets [live]** — the four footer nav links Wave 1 measured at ~40×16 (`Home`, `Studio`,
  `Chess`, `Desk`) now clear 44px and no longer appear. **Fixed.**

### P2 (new) · The Solscan link that fixed P2-4 is itself a 15px target
Two sub-44px controls remain at both viewports:

| Control | Size |
|---|---|
| `Solscan ↗` | 64×**15** |
| `@dash_eats ↗` | 91×**15** |

The Solscan link is new — it arrived with the fix for Wave 1 P2-4 and did not inherit the 44px
treatment the footer nav just received. WCAG 2.5.8 asks 24×24 minimum; the site's own `.pill`
convention is 44px.
- **Correction:** give these two the same `min-height:44px` + vertical padding the footer links now
  have. *Owner: `dasha-how-to-buy.html` (worker-tree copy ships — keep the two trees in sync, the
  drift gate in `dasha-how-to-buy.test.mjs` enforces it).*

---

## Not covered, and why

**`/lobby` was out of scope for Wave 2 and is currently down.** Its SRI pin does not match the
client the worker serves, so `lobby.js` is blocked and neither chat nor forum mounts — the page
renders only its header. Verified in-browser with cache disabled. Grok owns the fix (one clean
prep → deploy → publish so bundle and pin come from the same bytes). I re-checked home before
starting: its board pin is healthy (`boardSriOk: true`, `boardMounted: true`), so item 1 was
testable and its result is not contaminated by the lobby fault.

## One thing Codex needs to action

This report is a new top-level `DASHA-*.md`, so `DASHA-DOC-REGISTRY.md` is now stale and
`npm run dasha:test:docs` will fail its registry check until someone runs
`node dasha-doc-registry.mjs --write`. **I did not run it, and did not touch `DASHA-DOCS.md`,**
because the brief said not to edit Docs or the registry. Flagging rather than silently doing it —
the fix is one command, but it is not mine to run under this brief.
