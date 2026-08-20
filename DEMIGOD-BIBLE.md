# Demigod bible — 2026-08-19

Lock from the Claude design artifact `47e4ad1c-c427-468d-a837-eb46437d634d`.
This replaces the gold (`#C9A84C`) lock, the later green phosphor night (`#10c674` / `#a6ffcb` / `#03140d`), and the first-paint-only charcoal page.
`docs/process/SITE-MASTER-PROMPT.md` gold line is dead. This file wins.

Live first paint is worker-owned on `www.trydemigod.com/`. Do not let Webflow, `head-latest.css`, or `foot-latest.js` paint the home hero.

## What the site is

SF Bay Area. Seed and Series A. Engineering seats. A person reads the fit. Names move only after both sides say yes. 10% on hire. Free for talent. `potter@trydemigod.com`.

Public site is the matching desk, not a people dump. No candidate names, no invented briefs, no fake live board.

## Seven bands

Same page. No extra nav. Alternating ink `#0B120F` and bone `#EFE9DD`. Artifact bands 1–5 plus `WHO THIS IS FOR` and `TWO DOORS`.

1. Hero (ink). Header: `SF BAY AREA` · wordmark `Demigod` · `EST. 2025`. Kicker: `CHAPTER ONE`. Headline: `A motley crew is assembled quietly.` Body: `You're not filling a seat. You're deciding who's in the boat. The first five people decide what the company becomes — so we don't send names into the world automatically. A person reads the fit, then knocks once.` Tonight: honest, no person names, no invented counts. Default: `A person reads every brief.` / `Names move after mutual yes.` Primary: `Start a brief` → `/?wiz=startup`. Secondary: `Join the network` → `/?wiz=engineer`. Motley home does not load `foot-latest.js`.
2. How it goes (bone). Kicker: `HOW IT GOES`. Headline: `Every crew starts with two people who recognised each other.` Steps: `01 You say it once` / `02 A person chooses` / `03 You meet`.
3. What gets checked (ink). Headline: `Some things arrive like weather.` 4-up hairline grid of field kinds only: `ROLE` the actual work / `COMP` the real range / `LOCATION` SF Bay / `REVIEWED BY` a person. Do not ship `MATCH NO. 0412`, `Founding engineer`, `180–220K`, or `Ellis`.
4. Pricing (bone). Headline: `We're paid only if someone joins you.` Body: `10% of first-year salary, invoiced after they start.` `Talent pays nothing.` Founder quote is anonymous — no name, no company.
5. Who this is for (ink). Kicker: `WHO THIS IS FOR`. Headline: `The first seats. The ones who stay.` Founders start a brief. Engineers join the network. Talent pays nothing.
6. Two doors (bone). Kicker: `TWO DOORS`. Headline: `A brief, or a profile. Once.` Same desk. Write to `potter@trydemigod.com`.
7. Close (ink). Headline: `The first five decide what it becomes.` Footer: `potter@trydemigod.com` — not `hello@`.

No Menu. No statue. No pantheon. No sample roles. No “Tech Matched.” No HIRE TALENT / FIND TALENT pair on home. No team, FAQ, testimonials, events, or company list on home.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| ink | `#0B120F` | odd bands (hero, checked, who, close) |
| bone | `#EFE9DD` | even bands (how it goes, pricing, two doors) |
| clay | `#D3A093` | kickers, hairlines, accent |
| bone-text | `#E4DED2` | type on ink |
| dark | `#23211D` | type on bone |
| signal | `#d9a08a` | optional live dot only. Never a person name next to it. |

Square buttons. Grain overlay. Forbidden on home: `#C9A84C`, `#10c674`, `#a6ffcb`, `#03140d` as the page color, Webflow gold statue, phosphor glow.

## Type

`Instrument Serif`, `IM Fell English`, `Hanken Grotesk`, `JetBrains Mono`, `Sorts Mill Goudy`.
Wordmark and H1: editorial serif. Labels and step numbers: tracked grotesk / mono.
No Manrope-on-home. No Cinzel temple lock. No Iowan-only charcoal lock.

## Voice

Quiet. Specific. No marketplace lecture. No SLA. No “guarantee.” No “AI-matched.” No weak disclaimers. Do not say there is no real role.

## Pages

`/` this bible (no `wiz` or `p=`). `/?wiz=` falls through to Webflow+foot so the form opens, then `paintHireMotley` (`home-wiz`). `/hire?wiz=` GET/HEAD 308s to `/?wiz=<kind>` (`hire-wiz`). Bare `/hire` stays hire-motley. `/companies` and `/c/:id` stay public-safe. `/events` stays honest. Do not publish an ATS dump.

## Kill

Gold accent spans. Green night tokens on home. Dual hire CTAs. Sample names. Fake `3 briefs open` unless the desk number is real that hour. Fake match numbers. Named people next to a live dot. `hello@` on home.
