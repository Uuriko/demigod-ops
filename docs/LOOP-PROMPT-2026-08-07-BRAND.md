# Brand work order — make the aesthetic a system, not a preference

Derived from [`DASHA-ART-DIRECTION.md`](../DASHA-ART-DIRECTION.md) and the 2026-08-07 research into
Nouns, mfers, Milady/Remilia, Azuki, Pudgy Penguins and the AI-slop backlash. That research found
five things the aesthetically-known projects share; three of them are missing here. This order
closes the two that can be closed with code, and prepares the one that cannot.

## Task 1 — Declare the kit CC0, and make the declaration visible

The single cheapest move available. Nouns, mfers and Milady are all CC0, and a16z's read is that CC0
is exceptional at producing grassroots engagement, because derivative work multiplies the parent
brand instead of competing with it. Nobody remixes what they are unsure they are allowed to touch,
and right now nothing anywhere says they are allowed.

Requirements:

- A real dedication file, not a sentence. Use the CC0 1.0 Universal public domain dedication, and
  state exactly what it covers: the mark, the Studio's looks, and every image the Studio exports.
- State the two things CC0 does **not** waive, because getting this wrong is worse than not doing it:
  trademark and publicity rights are untouched by CC0. So the dedication must not be read as
  permission to imply Dasha Nekrasova's endorsement, and must not be read as permission to pass work
  off as issued by the project.
- Visible in the product, not just the repo. A licence nobody sees produces no remixes.
- Gate it: if the Studio ever stops saying it, the gate fails.

## Task 2 — Put the mark everywhere, at every scale

Recognition comes from repetition under restraint. Noggles spread because they went on everything and
survived being redrawn badly, including as ASCII in bios and code comments.

Requirements:

- Draw the cherries **in canvas**, from the same geometry as `dasha-favicon.svg`, so every exported
  image carries the mark itself rather than only the wordmark. One shared function, called by every
  look — not five hand-placed copies that will drift apart.
- The mark must never collide with the look's own text, and must stay legible after the export is
  scaled down for a GIF.
- Carry the typeable form (🍒) in the Studio's own chrome and in the share text, so the mark travels
  in plain text where an image cannot go.
- Gate it: every look must carry the mark, at every format.

## Task 3 — Prepare the character commission (do not fake it)

Every project in the research has a face or a creature. Dasha has type and geometry, which is why it
reads as designed but not as *alive*. This is the biggest gap and the only one that needs money and a
human.

**Do not generate a character with AI and ship it as brand art.** The 2026 audience identifies slop
quickly and reads it as carelessness — Valentino and McDonald's both pulled AI campaigns after
exactly that. For a project whose entire differentiator is not being slimy, that trade is bad.

So the deliverable here is a **commission brief**, not a character: what is being asked for, the
constraints it must satisfy, the rights that must transfer, and how a candidate is judged. Written so
it can be handed to an illustrator without a follow-up conversation.

## Constraints

- Every claim about what CC0 does must be accurate. Do not overstate the waiver.
- The Studio stays self-contained: no new dependency, no network, no external asset.
- Everything gated. A brand rule that is not enforced by a test is a preference, and preferences drift.
- Regenerate the embed and re-run every gate before reporting done.
- Nothing published without the user's explicit say-so.
