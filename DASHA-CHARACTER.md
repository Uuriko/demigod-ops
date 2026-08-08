# The Dasha cherry

**Status: drawn and shipped, 2026-08-07.** Source: [`dasha-character.svg`](dasha-character.svg).
Canvas version: `drawFace()` in `dasha-meme-studio.html`, used by the Cherry look.

## What it is

One of the cherries from the mark, with a face on it.

That is the whole design. The mark and the character are the same object, so the visual vocabulary
never grows: anyone who can draw the logo can draw the character, and anyone who meets the character
already recognises the logo. Nouns got this for free with noggles — one device that works as identity
*and* as a meme. Most projects carry a logo and a mascot that have nothing to do with each other, and
pay for both.

## Construction

Same 64-unit grid as `dasha-mark.svg`, so the two are interchangeable at any size.

- **Body:** circle, centre `(32, 40)`, radius `22`.
- **Stem:** `M32 18 C33 12 38 7 45 5`, stroke `6`, round cap. Same curve as the mark's right stem.
- **Eyes:** dots radius `3.6` at `(24, 37)` and `(40, 37)`.
- **Mouth:** a flat line from `(26, 50)` to `(38, 50)`, stroke `3.4`, round cap.
- **No leaf.** At small sizes a leaf merges into the stem and the silhouette turns to mush.
- Face features are cut in the ground colour, not a third colour. Two colours per character, always.

## Expressions

| Mood | When |
|---|---|
| **Deadpan** | The default, and the voice. Reads at 32px, which the others do not always. |
| **Blink** | Animation only — a short window of the loop. An eye is open or shut; a fading eyelid reads as a rendering bug, not a blink. |
| **Wide** | Surprise. Use sparingly; it is the least on-voice. |
| **Smug** | Half-lidded eyes, small curved mouth. |
| **Zeroed** | X eyes. Exists because a character that can only be happy would be lying. The site dropped its risk boilerplate; this is the honesty that survived, because it is a face rather than a sentence nobody reads. |

## Provenance

Drawn in coordinates by Claude on 2026-08-07 — a pen-tool exercise, not an image-model prompt. That
distinction is the one that matters against the 2026 slop backlash: the objection is to generated
imagery passed off as craft, not to the tool that types the numbers.

It is deliberately replaceable. **When the artist friends make a version, theirs wins**, and this
becomes the fallback. What must survive any redraw:

1. it stays a cherry from the mark, not a new creature;
2. it survives being redrawn badly from memory — that is what makes it spread;
3. it reads at 32px;
4. it is not a likeness of Dasha Nekrasova or of any real person;
5. it can be released CC0, and the artist is credited by name here and on the site even though CC0
   does not require it. Attribution is how the work stays attached to a human hand.

## Licence

CC0 1.0, like the rest of the kit — see [`DASHA-KIT-LICENSE.md`](DASHA-KIT-LICENSE.md). Copy it,
change it, sell it, no permission and no credit required.
