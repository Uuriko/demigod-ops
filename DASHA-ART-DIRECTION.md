---
status: canonical
canonical_for: visual
last_verified: 2026-08-14
---

# Dasha art direction

Written: 2026-08-07. Overhauled: 2026-08-13. Revised: 2026-08-14 (research + user-test lock).
Owner of the visual system. Landing, Desk, Studio, Lobby, Board, Chess and every exported image
answer to this file. If a surface disagrees with it, the surface is wrong.

Palette changes **only in this file**. Five colours until this file names a sixth. There is no
secret sixth on a surface.

## What the projects with real aesthetics actually do

Researched 2026-08-07 across Nouns, mfers, Milady/Remilia, Azuki, Pudgy Penguins and the 2026
AI-slop backlash. Five things recur, and none of them is "a nice logo".

1. **The brand is a generator, not a picture.** Nouns is 32×32 traits assembled by rule. Milady is a
   generative neochibi system. Azuki is a house style anyone in the studio can draw in. What gets
   recognised is the *system's fingerprint*, visible across thousands of different images.
2. **One primitive anyone can reproduce badly.** Noggles spread because you can put them on any face,
   and they survived being redrawn as ASCII in bios and code comments. The test is not "is it
   beautiful" — it is *can a fan redraw it from memory in five seconds and still be right*.
3. **Explicit permission.** Nouns, mfers and Milady are CC0. a16z's read is that CC0 is exceptional
   at producing grassroots engagement: derivative work multiplies the parent instead of competing
   with it. Ambiguity about rights is friction, and friction is fatal to proliferation.
4. **Restraint is the lever.** Fewer colours, fewer type weights, one consistent treatment. Art
   direction is mostly deciding what to say no to.
5. **An identifiable hand.** mfers is sartoshi's drawing. In 2026 the opposite reads instantly:
   "slop" was Merriam-Webster's 2025 word of the year, and Valentino and McDonald's both pulled AI
   campaigns after audiences called them flat. Brands that win use AI invisibly for throughput and
   keep the customer-facing image human-made.

## Where Dasha already stands

Strong, and better than it looks. There is a committed palette, one type voice, three repeating
motifs, and — the part most projects lack — the Studio, which is already the generator layer. Most
projects have to *build* the thing that lets a community produce on-brand work. Ours ships.

Weak: Desk still ships lavender glass. That is a bug, not a variant. `src/styles.css` must be
rewritten to the tokens below. That rewrite *is* the overhaul.

## The system

### Palette

Five colours. There is no sixth.

| Token | Hex | Role — and only this role |
|---|---|---|
| Ink | `#070608` | Ground. Almost everything sits on it. |
| Paper | `#f4eddb` | Type and surfaces. Warm, never pure white — white reads as a default, paper reads as a choice. |
| Acid | `#dfff00` | One thing per image: the primary action, the mark, or the band. Acid everywhere is acid nowhere. |
| Hot | `#ff3b81` | Offset shadows and the risk line. Never a background for body text. |
| Violet | `#7c4dff` | Depth only — glows, panels, arcs. Never type. |

Acid on paper fails contrast at small sizes. Acid belongs on ink.

### Every live surface

Home, Studio, Lobby, Desk, Board — all of them sit on **ink**, set type in **paper**, put the
primary action in **acid**, and offset it **4px hard, usually hot**. Display type is **Arial Black /
Helvetica 900**, uppercase. Violet is never type.

A soft shadow is a bug. `0 8px 24px` is a bug. `backdrop-filter` as the look is a bug.

### Type

Arial Black / Helvetica 900, uppercase, letter-spacing about `-0.05em`, line-height under 1. No
second display face. No light weights. Body copy is the same family at normal weight — the voice
comes from *weight and spacing*, not from collecting typefaces.

Monospace (`ui-monospace`) appears in exactly one place: machine-ish output — contract addresses,
the Printout look, transmission labels. It is a costume, not a second brand.

**Webflow must not load a second font stack.** Drop Exo, Bangers, and Raleway. The WebFont.load of
those three is a leak from the old Demigod/Webflow project, not Dasha.

### The three motifs

Every surface should carry at least one, and never more than two:

- **The band** — a full-bleed acid strip carrying repeating uppercase text. The ticker. **Required
  on home.** Empty markup plus `animation: none` is not a ticker.
- **The arc** — concentric rings, violet and acid, implying broadcast.
- **The offset** — a hard shadow at 4px, no blur, usually hot. Nothing in Dasha has a soft shadow.

### The mark

Slot-machine cherries. Two circles, two stems, nothing thinner than 7 units on a 64 grid, and
deliberately no leaf — at 16px a leaf merges into the stem. `dasha-favicon.svg` carries its own ink
tile because acid on transparent disappears against a light tab strip.

Favicon is **acid cherries on ink**, never the Webflow default `favicon.ico`, never a Nekrasova
likeness.

It passes the noggles test: redrawable from memory, and it has a free typeable equivalent — 🍒 —
which means holders can carry the mark in a display name the day they decide to.

**Write the ASCII form down and use it**: `(:` is wrong, `🍒` is the mark. In plain text, `$dasha 🍒`.

### CSS sources of truth

Hex is copied from these files. Nowhere else invents colour.

| Surface | File | What to copy |
|---|---|---|
| Home / landing | landing `:root` (getdasha home / `dasha-home.html` inline) | `--ink --paper --acid --hot --violet` |
| Studio | `studio/index.html` `:root` | same five + `--line --muted` |
| Board | `bounties/board.css` `:root` | same five |

**`src/styles.css` must be rewritten to those tokens.** Until it is, Desk is the surface that
disagrees, and the surface is wrong. Do not "harmonise" landing toward lavender. Pull Desk onto ink.

### Forbidden

- A sixth colour, a second display typeface, a soft shadow, a gradient behind body text.
- **Lavender / glass Desk.** Explicitly banned on every surface, especially `/dasha`:
  - `#c4a5ff` (lavender accent)
  - `#f6f1ff` (lilac paper)
  - soft shadows `0 8px 24px`
  - `backdrop-filter` as the look
  - `system-ui` as the display face
  - gradient CTA `#7c3aed` (the old `.dd-btn-primary`)
- Exo, Bangers, Raleway — Webflow must not load them.
- Demigod `.dgnav` class names on Dasha surfaces.
- Webflow default favicon. Cherries on ink, or it is not shipped.
- Stock photography, and any third-party image whose reuse rights are not recorded **in a file we
  ship**. This is narrower than it sounds, and the distinction matters because three docs looked
  like they disagreed until it was written down:

  | Act | Rule | Owner |
  |---|---|---|
  | **Hotlinking** X media in page HTML (`pbs.twimg.com`, `referrerpolicy="no-referrer"`, honest alt, "not endorsement" caption) — optional tape only | Allowed | [`DASHA-BIBLE.md`](DASHA-BIBLE.md) §5 image policy |
  | **Redistributing a copy** in the repo, the kit or an export | Only with recorded rights | [`dasha-desk/assets/ATTRIBUTION.md`](dasha-desk/assets/ATTRIBUTION.md) |
  | **Drawing it ourselves** in canvas or SVG | Always fine, and the default | this file |
  | **Shipped brand art** (logo, favicon, mark, Studio chrome, default poster) | No Nekrasova likeness. Cherries. | **this file wins** |

  Embedding someone's public post is not the same as shipping their file, and `assets/x/*` is
  already flagged in the ledger as having no documented redistribution licence. When in doubt, draw
  it — the Studio exists so that is the cheap option.
- **AI-generated imagery as brand art.** Use AI for throughput — drafts, variants, code — never as
  the finished public image. This is a positioning decision, not a taste one: the 2026 audience
  identifies slop quickly and reads it as carelessness, which is exactly the opposite of a project
  whose whole differentiator is not being slimy.
- Any likeness of Dasha Nekrasova **as the mark**, or anything implying her participation or
  endorsement. Optional tape may hotlink a still under bible §5. The cherries are the logo.

## The three moves that would change how this looks

Ranked by effect per unit of work. Status as of 2026-08-13.

1. **Declare the kit CC0, visibly — DONE.** [`DASHA-KIT-LICENSE.md`](DASHA-KIT-LICENSE.md) covers the
   mark, the looks and everything the Studio exports, with the CC0 1.0 legal text in `LICENSE-KIT`.
   Stated in the Studio itself, not only in the repo, because a licence nobody sees produces no
   remixes. Both carve-outs are stated and gated: CC0 waives copyright, and touches neither
   trademark nor anyone's name and likeness.
2. **A drawn character — DONE.** [`DASHA-CHARACTER.md`](DASHA-CHARACTER.md): one of the mark's
   cherries with a face on it, five expressions, drawn in coordinates. The mark and the character
   are the same object, so the vocabulary does not grow — the logo teaches the character and the
   character teaches the logo. It ships as the Studio's Cherry look and is deliberately replaceable:
   when the artist friends draw a version, theirs wins.

   The rule this replaced — "wait for a human" — was wrong, and the correction is worth keeping:
   never park work because it would be nicer if someone else did it. The slop objection is to
   *generated* imagery passed off as craft, not to the tool that types the coordinates.
3. **Put the mark everywhere at every scale — DONE, with a remaining leak.** Favicon on Studio and
   Board is cherries. Home must not ship the Webflow default ico. Desk must stop using a likeness as
   if it were the mark. Gated: `dasha-brand.test.mjs` renders each look with and without the mark
   and fails if any look stops carrying it, or if it dies at GIF scale.
4. **Rewrite Desk onto the five tokens — THE OVERHAUL.** `src/styles.css` still is lavender glass.
   Copy landing / studio / `bounties/board.css` `:root`. Acid CTA, 4px hot offset, Arial Black
   uppercase. Then Desk agrees with this file.


## 2026-08-14 — first paint, type as architecture, one job

Researched 2026-08-14: landing-page 2026 (Muzli), tactile brutalism (Fireart), brutalist editorial
(Social Animal, Brainy), cute-alism clash (VistaPrint). The pages that still look like a choice
are type-led, hard-edged, and human. Soft UI, bento, and Web3 glass are the default now. We do
the opposite.

This section **authorizes a significant home rewrite**. Worker-owned first HTML may replace
Webflow chrome when they disagree. Association is still not endorsement.

### First paint (all public HTML)

1. **One job above the fold.** Home's job is **play Simp**. Not mint-first, not a link farm, not
   a ticker with a quiz buried under it. `/simp`, lobby, and home all mount the same playable
   quiz. Desk and How-to-buy keep the one Jupiter path. Chess's job is 1v1 (invite link or find
   match). Studio's job is make one and pass it on.
2. **Type is the hero.** Display is still Arial Black / Helvetica 900, uppercase, tracking tight,
   line-height under 1. The first line on home is a claim, not a logo lockup. No second display
   face. No Exo, Bangers, Raleway, no `WebFont.load`.
3. **Hard geometry.** 0px radius, or a full pill. Nothing in between. 1px solid paper/acid
   borders. 4px hard hot offset. Soft shadow, `backdrop-filter` as the look, and 8px "friendly"
   radius are still bugs.
4. **Thumb.** Primary actions are at least 48×48 CSS px. No hover-only path to play, buy, or
   challenge. Finish the home quiz path in under two minutes (Quick 10).
5. **JS-off is honest.** First HTML shows the job (quiz start, Link X, board opening position).
   A disabled "Wait" / "Checking your seat…" with an empty mount is a bug.
6. **Forum is not a product.** Do not link `/forum`. The 404 may stay. Chess, Studio, Simp,
   Lobby, Desk, Bounties, How-to-buy are the doors.

### Surfaces this file now names

Home `/` · Studio `/studio` · Lobby `lobby.getdasha.com` and www `/lobby` · Desk `/dasha` ·
Board `/bounties` · Chess `/chess` · How-to-buy `/how-to-buy` · Simp `/simp` and `/simp/r/:id`.

### Cute-alism is already ours — lean in

Cherries + acid + brutal type is the clash. Do not sand it down. Do not add kawaii stickers,
glitter, or a sixth candy colour. The mark stays 🍒. The character stays a cherry with a face.

### Contrast

Acid on paper fails at small sizes. Acid belongs on ink. Paper on ink for body. Hot is offset
and risk, never a paragraph background.

### What a significant home change looks like

A stranger hits `/` and can start the quiz without scrolling. Take Simp is the quiz, not a
link to a leaderboard. Mint/CA/Jupiter live below the fold or on How-to-buy. The acid band
stays. Webflow leftover chrome (Forum, font zoo, unstyled Privacy) gets stripped by the worker
if origin will not.



## 2026-08-14 — user-test lock

Measured 2026-08-14 on live www.getdasha.com, 1280×800, first-time visitor. This section is
**law, not a diary.** It authorizes a significant visual rewrite. Where this lock and the
morning first-paint pass disagree, **this lock wins.**

### Home

1. **Delete `#dasha-home-cta` entirely.** First paint IS the real hero (`#content` — "It's Time
   $Dasha."). No 100vh decoy, no second h1, no Webflow-embed fallback (`.w-embed w-script`) that
   paints before `#content`. A system-ui `<h1>$dasha</h1>`, "Take Simp.", a bare acid rectangle
   "Simp", and pink "How to buy" at y=0 while the real hero starts at y≈876 is unfinished and
   reads as a scam. Illegal.

2. **Above the fold at 1280×800, in this order:** wordmark + one-line what-this-is ("Make Dasha
   posters. Pass them on." or the current bible line), display h1, ONE primary acid CTA, one
   quiet secondary, poster stack fully inside the viewport. An off-canvas clip that reads as a
   bug is a bug.

3. **Primary CTA lands on a finished surface.** If Simp is the primary, `/simp` is the playable
   quiz — same type and color as home — on first HTML, not an unstyled h1, an editorial note,
   and a raw `<ol>` of 20 `#N @handle` links. If Studio is primary, `/studio` shows a real
   poster on first paint, not an empty PHOTO stage. A dead-end from the home CTA is a
   ship-blocker.

4. **Contract chip + BUY leave the top nav.** They live in `#token`. A first-time visitor
   reaches a value proposition before a mint address ending in `pump`.

### Site-wide

5. **One type + color system on every public route.** Ink `#070608`, paper `#f4eddb`, acid
   `#dfff00`, hot `#ff3b81`. Body background is **ink**, not maroon-purple `#1F041C`
   (`rgb(31,4,28)`). Acid and hot are the only tokens currently honored site-wide; that is not
   permission to keep the rest. Forbidden on public HTML: violet/indigo page systems
   (`rgb(196,165,255)`, `rgb(240,231,255)`, `rgb(79,112,223)`, purple buttons), default link
   blue `#0000EE`, browser-blue h1, Arial-only unstyled pages, "server not configured",
   "Payout not live" as first-paint copy, leftover chrome that 404s (Forum).

6. **Do not ship a footer or nav link to a path that only says the thing is not here.**
   `https://lobby.getdasha.com/forum` shipping "The Dasha forum is not here." is a 404-in-prose.
   Remove Forum until a forum exists, or hop the link to lobby chat.

7. **`/simp` and `/bounties` use the same display face and tokens as `/studio` and
   `/how-to-buy`.** No third type system. No unstyled Arial. No browser-blue h1
   (`rgb(79,112,223)`).

8. **Honest empty states only.** "No rated games yet" not "Table unavailable" / "The board is
   quiet". Never "server not configured yet" or "Optional X link (server not configured yet)"
   on a public page. Never "Connecting…" as the finished lobby. Never "Payout not live" as the
   first thing on a bounty.

9. **Contrast.** Paper-on-ink body copy ≥ 4.5:1. Outlined decorative text (e.g. chess "VS ANNA"
   in cornflower) is not body copy; if it is readable chrome it must pass contrast.

10. **`/how-to-buy` step 01 GET SOL** must have at least one real exchange path, or be removed
    from the stepper.

11. **One canonical lobby URL.** Pick `www.getdasha.com/lobby` OR `lobby.getdasha.com/lobby`.
    308 the other. Two layouts for the same job is a bug.

12. **`/dasha` desk is not a second brand.** No violet/indigo desk, no `#0000EE` links, no empty
    Share card as first paint.

13. **Studio first paint is a poster.** LOOK=PHOTO default must not be a black empty stage with
    late thumbs. A home deep-link (`look=photo&effect=xerox&sticker=🍒`) must land on a real
    poster.

14. **`/bounties` is a Dasha surface.** Same tokens, same nav, same display face. A form that
    collects contact must have privacy nearby. Post must submit into a real path, or the form
    does not ship.

15. **Nav does not lead with the mint.** CA `53ux…pump` and BUY are not the first words a
    stranger reads.

## Contrast law (2026-08-14 research)

Computed WCAG 2.x. Do not invent a new yellow to "fix" acid.

| Pair | Ratio | Body AA | Notes |
|---|---:|---|---|
| Acid `#dfff00` on ink `#070608` | 17.76 | pass AAA | only legal acid type/CTA |
| Ink on acid | 17.76 | pass AAA | the button |
| Paper `#f4eddb` on ink | 17.31 | pass AAA | body and display |
| Hot `#ff3b81` on ink | 5.96 | pass AA | labels / risk, never long body |
| Violet `#7c4dff` on ink | 4.20 | **fail body** | never type |
| Acid on paper | 1.03 | **fail** | illegal at any size |
| Hot on paper | 2.90 | **fail** | illegal |

CTA: acid fill, ink type, 4px hot offset, min-height 48px. Outline/secondary: paper hairline, no fill.

## Visible four / technical fifth

Four colors you see. A fifth you almost never see. Nothing else.

| Token | Hex | You may |
|---|---|---|
| Ink | `#070608` | Ground. Theme-color. Favicon tile. |
| Paper | `#f4eddb` | Type, hairlines, `--line: rgba(244,237,219,.18)` |
| Acid | `#dfff00` | One thing: CTA or band or mark |
| Hot | `#ff3b81` | Offset, risk, one sticker |
| Violet | `#7c4dff` | **Technical.** One arc. 0% of hero wash. |

`--line` and `rgba(acid,.14)` are tints of existing tokens, not new colors. Ban inventing `--hot-deep`, `#ff9db8`, `#F2EDE7`, `#100a18`, `#27235f`, `#c21f5a`, any slate/lilac.

Violet radial / mesh on `.dasha` (or any hero) is the 2026 cheap-token tell. Forbidden, same class as lavender glass.

## Type tokens

```
--display: 900  clamp(3.25rem, 11vw, 6.5rem)/0.88 Arial Black, Helvetica, sans-serif
--tracking-display: -0.05em
--body: 400  1rem/1.45 Arial, Helvetica, sans-serif
--mono: ui-monospace  /* CA, printout, transmission only */
```

No `system-ui` as a Dasha face. No Google Fonts request, even if unused. WebFont.load of Exo/Bangers/Raleway is a **ship-blocker**.

## Motion budget

| Allowed | Spec |
|---|---|
| Acid band | CSS translate, ~28s loop, pause on hover/focus. **Required on home.** Empty + `animation: none` fails. |
| View transition | 180ms, `none` when `prefers-reduced-motion` |
| Offset | Instant. No ease. 4px. |
| Price spark | Hidden until numbers exist |

Forbidden motion: WebGL/Spline orb, Lottie, parallax, bounce, 3D coin, autoplay audio.

## First-paint contract (the overhaul)

Home's first viewport **must** contain, and nothing else:

1. Live acid band (repeating uppercase culture lines).
2. Brand `$DASHA` + cherries.
3. Nav: Studio · **Simp** · Bounties · `@dash_eats` · Buy. Lobby / Desk / Chess live in footer or overflow. Forum is not a door.
4. **One** display line. Culture, not a pitch.
5. **The playable Simp quiz in this same viewport** (not a 100vh stub above `#content`). One acid primary. How-to-buy / Jupiter may be a ghost pill.
6. Association, one line, paper, small: *References describe internet culture. Not endorsement.*

First viewport must **not** contain: `#dasha-home-cta` or any 100vh block above `#content`, a likeness collage, a 3-card feature grid, a price as the hero, tokenomics, roadmap, Telegram, "official coin", Inter/Geist, `rounded-2xl` + soft shadow, emoji in CTAs, a 3D coin.

LCP: the display line on ink. No webfont. No hero photo.

## Simp-on-home

Home shows the quiz *inside* the real hero, same tokens, same type, same 4px offset. Not a second homepage. `/simp` and lobby mount the same client. No email gate. Result is a verdict (type name) + optional Studio handoff. If it looks like Typeform, it is wrong.

## Overhaul rank (do these)

1. Kill the 100vh Simp stub. Quiz lives in the real hero.
2. Ship the acid band.
3. Kill WebFont.load, leftover `favicon.ico`, hero radials, extra hexes.
4. Rewrite Desk onto the tokens.
5. Put `@dash_eats` in nav. Strip Forum links.


## How this stays true


The Studio is the enforcement mechanism: it can only draw from this palette and this type, so
anything it exports is on-brand by construction. That is the reason to keep adding looks to the
Studio rather than making one-off images by hand — a one-off drifts, a look cannot.

Home enforces the band. Board enforces the tokens in `bounties/board.css`. Desk must join them.
