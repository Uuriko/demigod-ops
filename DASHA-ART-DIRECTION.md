# Dasha art direction

Written: 2026-08-07. Owner of the visual system. Landing, Desk, Studio and every exported image
answer to this file. If a surface disagrees with it, the surface is wrong.

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

Weak: everything is typographic. There is no hand, no character, no drawn mark beyond the cherries,
and no written statement that anyone is allowed to remix any of it.

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

### Type

Arial Black / Helvetica 900, uppercase, letter-spacing about `-0.05em`, line-height under 1. No
second display face. No light weights. Body copy is the same family at normal weight — the voice
comes from *weight and spacing*, not from collecting typefaces.

Monospace (`ui-monospace`) appears in exactly one place: machine-ish output — contract addresses,
the Printout look, transmission labels. It is a costume, not a second brand.

### The three motifs

Every surface should carry at least one, and never more than two:

- **The band** — a full-bleed acid strip carrying repeating uppercase text. The ticker.
- **The arc** — concentric rings, violet and acid, implying broadcast.
- **The offset** — a hard shadow at 4px, no blur, usually hot. Nothing in Dasha has a soft shadow.

### The mark

Slot-machine cherries. Two circles, two stems, nothing thinner than 7 units on a 64 grid, and
deliberately no leaf — at 16px a leaf merges into the stem. `dasha-favicon.svg` carries its own ink
tile because acid on transparent disappears against a light tab strip.

It passes the noggles test: redrawable from memory, and it has a free typeable equivalent — 🍒 —
which means holders can carry the mark in a display name the day they decide to.

**Write the ASCII form down and use it**: `(:` is wrong, `🍒` is the mark. In plain text, `$dasha 🍒`.

### Forbidden

- A sixth colour, a second display typeface, a soft shadow, a gradient behind body text.
- Stock photography, and any third-party image whose reuse rights are not recorded **in a file we
  ship**. This is narrower than it sounds, and the distinction matters because three docs looked
  like they disagreed until it was written down:

  | Act | Rule | Owner |
  |---|---|---|
  | **Hotlinking** X media in page HTML (`pbs.twimg.com`, `referrerpolicy="no-referrer"`, honest alt, "not endorsement" caption) | Allowed | [`DASHA-BIBLE.md`](DASHA-BIBLE.md) §5 image policy |
  | **Redistributing a copy** in the repo, the kit or an export | Only with recorded rights | [`dasha-desk/assets/ATTRIBUTION.md`](dasha-desk/assets/ATTRIBUTION.md) |
  | **Drawing it ourselves** in canvas or SVG | Always fine, and the default | this file |

  Embedding someone's public post is not the same as shipping their file, and `assets/x/*` is
  already flagged in the ledger as having no documented redistribution licence. When in doubt, draw
  it — the Studio exists so that is the cheap option.
- **AI-generated imagery as brand art.** Use AI for throughput — drafts, variants, code — never as
  the finished public image. This is a positioning decision, not a taste one: the 2026 audience
  identifies slop quickly and reads it as carelessness, which is exactly the opposite of a project
  whose whole differentiator is not being slimy.
- Any likeness of Dasha Nekrasova, or anything implying her participation or endorsement.

## The three moves that would change how this looks

Ranked by effect per unit of work. Status as of 2026-08-07.

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
3. **Put the mark everywhere at every scale — DONE.** Favicon on all three live routes, drawn into
   every Studio look from the favicon's own geometry via one shared `drawMark`, and 🍒 in the
   Studio's chrome and in every share. Gated: `dasha-brand.test.mjs` renders each look with and
   without the mark and fails if any look stops carrying it, or if it dies at GIF scale.

## How this stays true

The Studio is the enforcement mechanism: it can only draw from this palette and this type, so
anything it exports is on-brand by construction. That is the reason to keep adding looks to the
Studio rather than making one-off images by hand — a one-off drifts, a look cannot.
