---
status: canonical
canonical_for: visual
last_verified: 2026-08-13
source_of_tokens: /home/potter/demigod-head-styles.css (:root lock at design-track 2026-08-05k)
---

# Demigod art direction

Written: 2026-08-13. Owner of the visual system. Landing, WIZ, pricing, bounties, map,
footer, CDN head CSS, and every exported image answer to this file. If a surface disagrees
with it, the surface is wrong.

This is not Dasha. Do not import Dasha acid, hot, violet, or lavender. Do not invent a
sixth Demigod brand colour. Palette does not change.

## What this file owns

Visual + public-facing honesty. Product copy that appears on a surface is in scope here
when it is a visual or trust claim (contact, fee, dual-path labels, empty-state copy).
Runtime identity still comes from `bin/dg truth`. Ship still comes from
`docs/SHIP-AND-CDN.md`. This file wins when a surface looks like a different product.

Hex is copied from the locked `:root` in `demigod-head-styles.css` (the 2026-08-05k
remap). Nowhere else invents colour. Early cascade leftovers (`--dim:#8aa193`,
`--dg-rule` at `.28`, gold `--g:#D4AF37`, Operator Calm paper+cobalt, talentlink-sf gold
canvas) are bugs. Later rules that restore them are bugs.

## Palette

Night forest. Phosphor type. Signal fill. There is no gold, no cobalt, no Dasha acid.

| Token | Aliases | Hex | Role — and only this role |
|---|---|---|---|
| Night | `--dg-night` `--dk` | `#03140d` | Ground. Almost everything sits on it. |
| Ink | `--dg-ink` | `#02100a` | Deeper well — cards, nested panels, modal chrome. Never a second brand. |
| Phosphor | `--dg-phosphor` `--gl` `--yl` | `#a6ffcb` | Display type (H1), outlines, rules, the glow that means "this is Demigod". |
| Signal | `--dg-signal` `--g` | `#10c674` | Primary fill. Hire. Focus rings. One filled action per cluster. |
| Paper | `--dg-paper` `--cr` | `#f3f0e7` | Body type on night. Warm, never pure white. |
| Paper mute | `--dg-paper-mute` `--mu` | `#bdc9bf` | Secondary type, hints, captions. |
| Dim | `--dim` | `#8a9a8e` | Quiet metadata only (counts, timestamps). Not a CTA colour. |
| Rule | `--dg-rule` | `rgba(166,255,203,.18)` | Hairlines, nav border, card edges. |

`--g` is signal `#10c674`. It is not gold. A mid-file remap that reasserts
`--g:#D4AF37` is a leak from the retired talentlink-sf canvas.

Phosphor on night is the brand. Signal on night is the action. Paper on night is the
reading voice. Signal as body type fails the product: it shouts "SaaS CTA" over the
page. Phosphor as a fill on a large field is phosphor nowhere.

There is no sixth.

## Type

Two families. Not three.

- **Body + H1:** sans — Manrope, then system-ui / -apple-system / "Segoe UI".
  `--dg-sans` must keep Manrope first. The late `:root` that drops Manrope and leaves
  only system-ui is the surface being wrong.
- **Section H2 / H3:** Georgia (then "Times New Roman", serif). Editorial, sentence case,
  paper colour, tracking slightly tight. Not uppercase. Not Cinzel. Not a gold shout.
- **Mono:** `--dg-mono` only for machine output (SHAs, USDC amounts, form receipts). A
  costume, not a second brand.

H1 is phosphor, sans, not uppercase, letter-spacing slightly negative. It must paint
solid on first meaningful paint — do not wait for `.title-accent-gold`.

Webflow must not load a gold-era stack (Cinzel, the old "premium" display face) as the
voice of the page. Manrope may load; Georgia is a system serif and must not require a
webfont. Do not load Dasha's Arial Black / Helvetica 900 display stack onto Demigod.

## Dual path

Two cards on the first screen. Equal size, equal type scale, equal min-height.

| Path | Label | Treatment |
|---|---|---|
| Hire | **Hire** | Fill **signal** `#10c674` on night. Type night/ink. Border signal. This is the filled action. |
| Talent | **Share privately** | Phosphor **outline** on night. Transparent / 4% phosphor fill max. Type paper. Never a stronger fill than Hire. |

Hire must be **at least as prominent** as Share privately. Live bug (as of 2026-08-13):
hero `.dg-path-pair` rules paint Hire as a translucent signal wash (phosphor type on a
22% green film) while Share privately reads as a crisp phosphor outline — so Hire is
the dimmer card. That cascade is wrong. The KEEP_WORKING lock at the end of
`demigod-head-styles.css` states the fill correctly; higher-specificity hero rules
undo it. Fix the hero rules. Do not dim Hire to "balance" the pair.

Do not relabel to "I'm hiring" / "I'm looking" as a substitute for the treatment
above. The labels are Hire / Share privately unless this file changes.

## Product claims that are visual

These sentences are the product. Surfaces that imply otherwise are wrong.

- Software **compares**. A human **proposes**. Intro only on **mutual yes**.
- Fee: **10% of first-year base when a hire starts.** Not "of cash comp" theater, not
  a monthly SaaS price, not "free forever" for companies.
- Trial: **paid, 2–5 days.** EOR / W-2 for SF onsite. Not an unpaid take-home. Not a
  weekend homework test dressed as a trial.
- Status is **not a black hole.** After submit, the person can see that it landed.
  No fake "we'll be in touch in 48h" clock.

## Contact

**`potter@trydemigod.com` only.**

Banned on every surface, including meta, footer, WIZ done-states, and agent copy:

- `hello@trydemigod.com`
- live chat widgets
- 8am–5pm SLA / "our team replies within one business day"
- fake team photos, fake headcount, fake "operators on shift"
- "vetted network"
- pay-online theater (Stripe-live, checkout, "start your plan")

If a doc still says hello@, the doc is wrong. Strike it. Do not add a second inbox
to look bigger.

## Bounties

Declared **USDC**. We do not hold it. The feed is allowed to be empty; an empty feed
is honest. Never seed `dasha-desk`. Never borrow Dasha board chrome, acid ticks, or
cherry marks to make the Demigod feed look alive.

A bounty with no sponsor, no amount, or a made-up claimant is a lie. Omit it.

## Webflow + CDN

JS-off canvas must equal JS-on. The head CSS and the Webflow canvas are one picture.
If the page is a different product with JavaScript disabled, the canvas is lying.

One CDN SHA pin on `Uuriko/demigod-site-cdn` for **css / foot / map / art**. Do not
ship head CSS from commit A, foot from commit B, map from a catbox, art from a third
host. `docs/SHIP-AND-CDN.md` is the spine; this file forbids a split pin as a visual
bug (the page becomes two eras at once).

Honest JS-off means: dual-path cards, fee sentence, contact, and process spine are in
the canvas (or in head CSS that does not depend on foot). Foot may enhance. Foot may
not be the only place the product exists.

## Retired (do not revive)

- **Operator Calm** — paper canvas + cobalt. A 2026 experiment. Dead.
- **talentlink-sf gold canvas** — `#D4AF37`, gold glows, "premium" pill CTAs. Dead.
  `--g` is signal now.
- **Statue / pantheon** — `.statue-frame`, statue SVG, marble/god imagery. Hide and
  delete. Demigod is not a pantheon brand.

Mid-file comments that say "Mercury calm + gold charge" describe the retired look.

## Forbidden

- A sixth brand colour.
- Gold `#D4AF37` (and gold-named tokens, `.title-accent-gold` as the H1 voice).
- Dasha acid `#dfff00`, hot `#ff3b81`, violet `#7c4dff`, lavender `#c4a5ff` /
  `#f6f1ff`. Demigod is not Dasha with the saturation turned down.
- Cinzel / gold uppercase section titles.
- Statue, pantheon, marble, lightning-bolt "god" illustration as identity.
- Soft SaaS glow as the look (`0 8px 32px` gold, glassmorphism as the brand).
  A 1px phosphor rule is the edge, not a drop shadow.
- Fake logos, fake metrics, fake candidate counts, "48h", SLA, Stripe-live,
  Twilio-live, "vetted network".
- Seeding bounties from dasha-desk.
- `hello@`, live chat, office-hours theater, a pictured "team".
- Unpaid take-home as the trial.
- Two CDN SHAs for css/foot/map/art.
- A JS-on page that is a different layout from JS-off.

## CSS sources of truth

| Surface | File | What to copy |
|---|---|---|
| Every public page | `/home/potter/demigod-head-styles.css` locked `:root` (2026-08-05k) | the table above |
| CDN twin | `Uuriko/demigod-site-cdn` `head-latest.css` at the **same SHA** as foot/map/art | same tokens |
| This file | `/home/potter/DEMIGOD-ART-DIRECTION.md` | roles, bans, dual-path, copy that is visual |

If live CSS and this table disagree, **this table wins**, then the CSS is patched to
match — not the other way around. Known live drift to kill, not honour:

- file-top `:root { --dim:#8aa193 }` → must be `#8a9a8e`
- mid-file `--dg-rule: rgba(166,255,203,.28)` → must be `.18`
- `--dg-sans` without Manrope
- hero Hire card dimmer than Share privately
- any remaining `#D4AF37`

## How this stays true

Head CSS is the enforcement mechanism for colour and type. WIZ, pricing, and the
footer loader must consume those tokens, not invent locals. Bounties consume the same
`:root`. Map art sits on night with phosphor rules.

A new surface starts from this file, not from a Dasha screenshot and not from a 2026
gold prototype. When in doubt: night ground, phosphor H1, Georgia section titles,
signal fill on Hire, phosphor outline on Share privately, `potter@trydemigod.com`.
