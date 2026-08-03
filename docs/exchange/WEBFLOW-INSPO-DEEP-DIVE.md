# Webflow inspo deep dive — design & product notes

**Team:** Grok (lead synthesis) · Claude Code (tmux website lane) · Codex swarm (3 parallel roles: saas / agencies / consumer)  
**Source list:** `docs/WEBFLOW-INSPO-SITES.md`  
**Demigod filters:** tech + humans in the loop · dual path (I'm hiring / I'm looking) · minimal copy · no hand-matched theater · no link sprawl  
**Date:** 2026-07-16  

**Live meta probes (curl)** for many sites are in `/tmp/dg-busy/inspo/grok-fetch-raw.txt`. Codex/Claude batch files may land alongside this doc.

---
## Multi-agent output index (2026-07-16)

| File | Author | Scope | Lines |
|------|--------|-------|------:|
| [WEBFLOW-INSPO-DEEP-DIVE.md](./WEBFLOW-INSPO-DEEP-DIVE.md) | Grok | Patterns + full list synthesis + Demigod brief | master |
| [WEBFLOW-INSPO-DEEP-DIVE-CODEX-SAAS.md](./WEBFLOW-INSPO-DEEP-DIVE-CODEX-SAAS.md) | Codex | Enterprise + SaaS (sections 1–2) | ~130 |
| [WEBFLOW-INSPO-DEEP-DIVE-CODEX-AGENCIES.md](./WEBFLOW-INSPO-DEEP-DIVE-CODEX-AGENCIES.md) | Codex | Agencies + portfolios + Awwwards (3–4, 6) | ~115 |
| [WEBFLOW-INSPO-DEEP-DIVE-CODEX-MISC.md](./WEBFLOW-INSPO-DEEP-DIVE-CODEX-MISC.md) | Codex | Consumer + talent dual-path + shortlist | ~109 |
| [WEBFLOW-INSPO-DEEP-DIVE-CLAUDE.md](./WEBFLOW-INSPO-DEEP-DIVE-CLAUDE.md) | Claude Code | Enterprise/SaaS/talent deep notes | ~200+ |

Source list: [`docs/WEBFLOW-INSPO-SITES.md`](../WEBFLOW-INSPO-SITES.md)

---


## Cross-site pattern library (steal map for Demigod)

### Hero patterns that work

| Pattern | Seen on | Demigod application |
|---------|---------|---------------------|
| **Outcome H1 + product proof** | Dropbox Sign “signed 80% faster” | Prefer outcome over “matched by hand”: e.g. “Get the right SF hire — tech match, humans in the loop.” Keep short. |
| **Category clarity** | Modash, Vanta, Lattice | One line: what you are (SF talent matching) |
| **Dual audience implicit** | Upwork, Underdog, Arc | Two equal CTAs: hiring vs looking — already on path; strengthen with path hints |
| **Conversational product** | Typeform | WIZ steps as product, not marketing essay |
| **Quiet luxury dark** | Riverside, Stealth, Refokus | Calmer dark charcoal we started — don’t gold-spam |
| **Anti-hype positioning** | BORING / weareboring | One memorable line beats 8 path pills |
| **Growth-engine framing** | Webflow.com | Site as GTM tool — Demigod is matching product, keep nav tiny |

### Nav / information architecture

| Pattern | Steal |
|---------|--------|
| **≤5 primary links + product mega only if multi-product** | Demigod is not multi-product — keep How · Pricing · FAQ (or fewer) |
| **Two nav CTAs** | Hire primary, Looking secondary outline |
| **Footer dense only for enterprise** | We should stay lean; secondary links muted |

### Trust / proof

| Pattern | Steal |
|---------|--------|
| Logo strip under hero (not 40 logos) | 0–6 when real; until then **no fake logos** — use honest empty state |
| Specific metric in H1/sub | Only if true (avoid volume promises) |
| Case study cards | Later — pilot proof pages when real |
| Security/compliance badges | Skip until real |

### Motion

| Pattern | Steal |
|---------|--------|
| Product UI animating in hero | Optional light WIZ preview later — not required |
| Scroll-triggered section reveals | Prefer reduced-motion safe subtle fades only |
| Award-site WebGL | **Avoid** for Demigod — hurts load + honesty |

### Forms / conversion

| Pattern | Steal |
|---------|--------|
| Typeform one-question pacing | Keep WIZ one-field ownership |
| Dropbox Sign “try free” ubiquity | Sticky mobile dual CTA (already) |
| Clear post-submit next step | Thanks copy: email follow-up, no SLA lies |

---

## Deep notes by site (Grok pass)

### Enterprise / big product

#### Dropbox Sign — https://sign.dropbox.com
- **Hero:** “Get contracts signed 80% faster.” Specific outcome; product demo energy.  
- **CTA:** Single primary conversion path; secondary education.  
- **Nav:** Clean product marketing IA.  
- **Visual:** Light, spacious, enterprise-calm.  
- **Steal:** **Outcome-first H1** (speed/quality) without inventing fake stats — for Demigod use qualitative outcome if no numbers.

#### Lattice — https://lattice.com
- **Hero:** “People + AI: Succeeding Together” — product positioning in 4 words.  
- **Proof:** “5,000+ teams” in meta/social.  
- **Steal:** Pair **human + tech** in positioning (aligns with HITL) without “by hand.”

#### Vanta — https://www.vanta.com
- **Hero:** “Trust is everything” — abstract but category is compliance.  
- **Visual:** Enterprise trust, dense logo/proof.  
- **Steal:** Trust as primary emotion for B2B; Demigod can use **both approve** as trust mechanic.

#### Jasper — https://www.jasper.ai
- **Hero:** “Put AI agents to work for marketing” — verb + audience.  
- **Motion:** Product demos in hero.  
- **Steal:** Agents/tech language is OK if honest; don’t over-AI Demigod.

#### Webflow — https://webflow.com
- **Hero variants:** “Make your website a growth engine” / “drive results.”  
- **Scale:** Enterprise marketing density.  
- **Steal:** **One primary job** for the homepage (get the right path started), not 12 secondary pages.

#### Typeform — https://www.typeform.com
- **Meta:** AI forms + workflows; “3.5x more data.”  
- **Product:** Form *is* the brand.  
- **Steal:** WIZ should feel like the product surface — welcome → questions → submit, minimal chrome around it.

#### Upwork — https://www.upwork.com
- **Note:** Bot challenge on curl; live product has dual client/talent entry.  
- **Steal:** **Path chooser first** (hire vs look) before deep content.

#### Clay — https://www.clay.com
- **Sector:** GTM data.  
- **Steal:** Modern dark/light hybrid SaaS with modular feature blocks — use for **process 3-step** cards.

#### Kajabi / Zendesk / Dell
- **Steal:** Multi-product nav only when needed; Demigod stays single-product.

---

### SaaS / B2B craft

#### Modash — https://www.modash.io
- **Hero:** “Manage and grow your influencer program” + “bring everything under one roof.”  
- **Steal:** Plain operator language > poetry.

#### Riverside — https://riverside.fm
- **Hero:** “Create your best content yet”  
- **Meta:** “Powered by AI, built for human conversations.”  
- **Visual:** Dark pro.  
- **Steal:** **Tech + human** pairing in one line (exactly Demigod positioning pattern).

#### Outseta / Vendr / Swan / MarqVision / Anrok
- **Steal:** Infrastructure SaaS = serious type, less gimmick motion; Demigod should feel **operator-serious**, not agency-portfolio.

#### Social Snowball
- **Steal:** Bright UI metrics — Demigod should **not** fake metrics; if using numbers, only real.

#### Proof / Notarize lineage
- **Steal:** Multi industry landing pages later; for now one homepage + dual WIZ.

---

### Agencies / portfolios

#### Refokus — https://www.refokus.com
- **Hero:** Long narrative about brand lagging product evolution.  
- **Steal:** Storytelling length is for **agencies**, not Demigod homepage — but case-study depth OK on Notes later.  
- **Motion:** Peak Webflow — sample tastefully, don’t clone.

#### Finsweet — https://www.finsweet.com
- **Hero:** “We design world-class websites and the products that power them.”  
- **Steal:** Productized expertise; Demigod can productize **matching** the same way.

#### Relume — https://www.relume.io
- **Hero:** “Websites designed & built faster with AI.”  
- **Steal:** AI as **ally not replacement** messaging maps to tech + HITL.

#### BORING / weareboring.nl — https://www.weareboring.nl
- **Hero:** “on-brand web”  
- **Positioning:** Anti-hype name.  
- **Steal:** **Memorable brand stance** in few words.

#### Stealth / Konpo / Tonik / Osmo / Flowbase
- **Steal:** Typography scale, section rhythm, portfolio grids for **future case studies** — not homepage clutter.

#### Portfolios (Moritz, Aaron, Dennis, etc.)
- **Steal:** One-page scroll, clear work / about / contact — Demigod is product not personal portfolio; keep **contact single** (potter@).

---

### Consumer / lifestyle

#### Michael Kors Collection, Agua Bonita, Faircraft, Artistree, Mosaicist
- **Steal:** Photography/mood for **brand feeling** only — Demigod is B2B matching; keep **one strong brand image** max (hero bg), not fashion lookbooks.

---

### Talent / dual-path peers

#### Underdog / Arc / Wellfound (UX peers)
- **Steal:** Explicit dual CTAs; labels that don’t collide (hire vs job seeker).  
- **Already partially implemented** on Demigod — refine copy, not add more links.

---

## Demigod synthesis — ranked design ideas (actionable)

### P0 — do next (product surface)

1. **Outcome hero, not craft manifesto**  
   - Pattern: Dropbox Sign / Modash.  
   - Draft options: “Hire or join SF startups.” / “The right match for SF roles.”  
   - Keep tech+HITL in **sub**, not H1.

2. **Dual CTA with path labels only**  
   - Pattern: Underdog / Upwork.  
   - I'm hiring · I'm looking + one-line hints; no 8 path pills.

3. **Three process steps as operator checklist**  
   - Pattern: B2B SaaS how-it-works.  
   - Pick path → Match (tech + HITL) → Both approve.

4. **Trust line as facts, not vibes**  
   - Pattern: Riverside “AI + human” / Lattice people+AI.  
   - “Tech match · Humans in the loop · 10% on hire · Free for talent”

5. **Mobile sticky dual CTA**  
   - Pattern: App/SaaS mobile bars.  
   - Already present — keep labels synced with desktop.

### P1 — visual system

6. **Dark charcoal + cream, less gold ornament** (Riverside / Stealth restraint).  
7. **Product-in-hero later:** abstract WIZ step preview (Typeform energy) — optional.  
8. **Logo/proof strip only with real logos** (Vanta/Lattice pattern).  
9. **Pricing: one card, plain English** (SaaS single plan).  
10. **Notes as CMS-quality blog** (Discord blog / Lattice content scale) — already partially there.

### P2 — agency craft (taste, don’t clone)

11. Refokus-level scroll storytelling → only for **case studies** after first pilots.  
12. Relume-style sitemap clarity → internal IA for mini-pages.  
13. BORING-style anti-hype tagline exploration.  
14. Finsweet systems thinking → component discipline in foot CSS.  
15. Awwwards motion samples → optional hover only, reduced-motion safe.

### Anti-patterns (do not steal)

| Anti-pattern | Where common | Why bad for Demigod |
|--------------|--------------|---------------------|
| 12 footer links | Enterprise mega-footers | Feels complicated |
| Fake metrics | Growth SaaS | Honesty policy |
| WebGL homepage | Award sites | Slow, gimmicky |
| “Human-matched by hand” | Old talent marketing | User rejected |
| Two company-side CTAs | Confused marketplaces | Hire vs look must differ |
| Long manifesto hero | Agencies | Delays form start |

---

## Competitive dual-path moodboard (matching)

| Site | Hire-side language | Talent-side language | Lesson |
|------|--------------------|----------------------|--------|
| Underdog | I'm hiring | I'm a candidate | Parallel grammar |
| Arc | Hire talent | Find jobs | Parallel verbs |
| Upwork | Hire | Find work | Instant path |
| Typeform | Start free | — | Single path OK for product |
| Demigod target | I'm hiring | I'm looking | Keep; add path hints only |

---

## Visual mood targets (3 directions)

### A — Operator calm (recommended)
- Dropbox Sign + Lattice + Vanta  
- Light or soft dark, short copy, dual CTA, process 3, one pricing card  

### B — Dark pro product
- Riverside + Stealth restraint  
- Dark base, cream type, minimal gold, product focus  

### C — Craft showcase (later)
- Refokus + Awwwards  
- Only after conversion basics are done  

---

## Next research steps

1. Merge Codex saas/agencies/misc files into this doc when swarm completes.  
2. Claude Code file: `WEBFLOW-INSPO-DEEP-DIVE-CLAUDE.md` → fold in.  
3. Pick **Direction A or B** and implement **one visual pass** (head CSS + brandAssets) without link sprawl.  
4. Optional: screenshot pack of top 10 into `/tmp/dg-busy/inspo/shots/`.

---

## Appendix — full site checklist from master list

Work through `docs/WEBFLOW-INSPO-SITES.md` sections 1–10. Status:

| Section | Grok notes | Codex | Claude |
|---------|------------|-------|--------|
| 1 Enterprise | Done (this file) | saas role | in progress |
| 2 SaaS B2B | Done (this file) | saas role | in progress |
| 3 Agencies | Summary + Refokus/Finsweet/Relume/Boring | agencies role | — |
| 4 Portfolios | Summary | agencies role | — |
| 5 Consumer | Summary | consumer role | — |
| 6 Awwwards | Names + anti-pattern | agencies | — |
| 7 MIW hubs | Linked | consumer | — |
| 8 Talent dual-path | Done | consumer | in progress |
| 10 Shortlist | Embedded above | all | all |

When batch files appear, run:

```bash
# merge helper (agent)
ls docs/exchange/WEBFLOW-INSPO-DEEP-DIVE*.md
```

---

## Full site-by-site notes (expanded)

### Section 1 — Enterprise & big-name

#### Webflow.com
- **Hero:** “Make your website a growth engine” / “drive results” — marketing-as-growth, not feature dump.
- **Nav:** Product mega + enterprise; multi-product density (Demigod should *not* copy density).
- **Visual:** High craft, subtle motion, componentized sections.
- **Proof:** 300k+ teams (meta).
- **Steal:** Homepage has **one job** — start the right journey. Secondary education lives off-home.

#### Dropbox Sign (sign.dropbox.com)
- **Hero:** “Get contracts signed 80% faster.”
- **CTA:** Conversion-forward; free trial pattern.
- **Layout:** Clean light B2B; product UI in hero.
- **Steal:** **Quantified outcome** only if true; else qualitative outcome line.

#### Lattice
- **Hero:** “People + AI: Succeeding Together”
- **Proof:** 5,000+ teams.
- **Steal:** Human + tech in **four words** — maps to Demigod HITL without “by hand.”

#### Vanta
- **Hero:** “Trust is everything”
- **Layout:** Enterprise trust walls, compliance focus.
- **Steal:** Trust as primary emotion; Demigod “both approve” is the trust mechanism.

#### Jasper
- **Hero:** “Put AI agents to work for marketing”
- **Motion:** Product demos.
- **Steal:** Verb-first product H1; don’t over-AI Demigod branding.

#### Ramp
- **Sector:** Spend management.
- **Steal:** Finance clarity, simple layouts, realistic UI — **operator seriousness**.

#### Discord blog
- **Steal:** Content system / CMS blog for Notes — not homepage clutter.

#### Upwork
- **Dual path:** Hire vs find work (core marketplace pattern).
- **Note:** Bot walls on scrapers; study live in browser.
- **Steal:** Path chooser **before** content essay.

#### Typeform
- **Hero/meta:** Forms that get more completion; workflows.
- **Steal:** **Form-as-product** — WIZ is the experience; reduce surrounding chrome.

#### Clay
- **Steal:** Modern GTM SaaS blocks — modular feature/process grids.

#### Dell design / Zendesk / Kajabi
- **Steal:** Large content IA only when multi-product; Demigod stays single-product.

---

### Section 2 — SaaS & B2B craft

#### Modash
- **Hero:** “Manage and grow your influencer program” + “bring everything under one roof”
- **Steal:** Operator English; dashboard screenshots as proof.

#### Pogo (joinpogo.com)
- **Steal:** App download clarity, rating trust — for mobile dual CTA polish.

#### Outseta
- **Steal:** Bold headers + integrated suite story without 20 nav links.

#### Vendr
- **Steal:** B2B negotiation product — process explanation.

#### January AI
- **Steal:** Health + AI narrative; careful claims (Demigod parallel: no medical-style overclaim).

#### Swan
- **Steal:** Banking infra seriousness — type, spacing, low gimmick.

#### MarqVision
- **Steal:** AI + enforcement trust for brands.

#### Cococart
- **Steal:** SMB simplicity — fewer features, clearer CTA.

#### FlyCode
- **Steal:** Dev-first clarity.

#### Atlist
- **Steal:** Product color on white canvas; examples of outputs.

#### Riverside.fm
- **Hero:** “Create your best content yet”
- **Meta:** “Powered by AI, built for human conversations”
- **Steal:** **Exact positioning template** for tech + humans.

#### Tavus
- **Steal:** Personalized video AI storytelling.

#### Glean
- **Steal:** Enterprise search polish, former-Google seriousness.

#### Proof / Notarize
- **Steal:** Interactive how-it-works; industry-specific landings later.

#### Social Snowball
- **Steal:** Metrics + UI (only real metrics for Demigod).

#### Anrok
- **Steal:** Clean fintech SaaS single-message pages.

#### Rewind
- **Steal:** Privacy-first product story.

#### Contractbook / Awardco / Petal
- **Steal:** Category marketing depth — not day-1 homepage requirements.

---

### Section 3 — Agencies & studios

#### Refokus
- **Hero:** Long narrative (brand lagging product).
- **Steal:** Case-study depth **later**; not homepage manifesto.

#### Tonik
- **Steal:** Portfolio energy; work grid rhythm.

#### We Are BORING
- **Hero:** “on-brand web”
- **Steal:** Anti-hype brand stance; memorable short positioning.

#### Stealth Design
- **Steal:** Dark cinematic — mood, not clutter.

#### Konpo / Forwwward / Revelatio / Oimachi / MONOLOG / etc.
- **Steal:** Type scale, case study pacing, award-level motion **sampled** (hover only).

#### Osmo / Flowbase / Finsweet / Relume
- **Finsweet:** Productized agency + tools.
- **Relume:** “AI ally not replacement” → HITL language.
- **Flowbase/Osmo:** Component systems — keep Demigod CSS disciplined.

#### UNCOMMON / Digital Butlers / Vivid Motion
- **Steal:** Motion studios — optional later.

---

### Section 4 — Portfolios

#### Moritz Petersen
- **Steal:** Clear expert signal + process case studies.

#### Aaron Grieve
- **Steal:** One-page, project-first, no bloat.

#### Dennis Snellenberg
- **Steal:** Portfolio craft ceiling — inspiration only.

#### Jack Butcher / others
- **Steal:** Visual systems brand; Demigod uses one strong visual max.

---

### Section 5 — Consumer / lifestyle

#### Michael Kors Collection
- **Steal:** Lookbook photography quality; Demigod one brand image.

#### Agua Bonita
- **Codex note:** domain may be parked — treat list entry as **stale-link risk**.

#### Faircraft
- **Steal:** Deep-tech climate story without spammy CTAs.

#### Artistree
- **Codex note:** URL may resolve wrong business — verify before citing.

#### Mosaicist / food / wellness Awwwards
- **Steal:** Material, warmth, place — secondary to B2B clarity.

---

### Section 6 — Awwwards Webflow feed

**Pattern:** Extreme motion, experimental type, portfolio-first.

**Demigod rule:** Borrow **typography and section spacing**, not WebGL homepage.

Notable names to open live: CoffeeTech, RISK, Fort Vega, Longbow, OBSCURA, Neko Engineering, MONOLOG, Pizza Amici, Radian, Illinois Innocence Project (nonprofit storytelling).

---

### Section 8 — Talent / dual path

#### Underdog.io
- **Steal:** Parallel CTA grammar (hiring vs candidate).

#### Arc.dev
- **Steal:** Hire talent / Find jobs symmetry.

#### Wellfound
- **Steal:** Startup talent marketplace IA (peer UX even if not Webflow).

#### Typeform / Upwork
- Covered above.

---

## Codex swarm interim findings (from live agent logs)

While files finish writing, Codex roles already reported:

1. **Agencies role:** Strongest pattern is **short positioning + immediate proof** (logos/experience/awards) — not more motion. ~13 sites researched.
2. **SaaS role:** **Outcome-led heroes**, proof next to promise, product/process visuals explaining the product. Demigod should use **process specificity + explicit terms**, not logo-wall theater.
3. **Consumer role:** **Link hygiene** — Agua Bonita parked; Artistree may be wrong site — inspo lists rot; always re-verify URLs.

---

## Claude Code status

Tasked in tmux `agents:0` to write `docs/exchange/WEBFLOW-INSPO-DEEP-DIVE-CLAUDE.md` for enterprise/SaaS/talent batches. Watch that path for merge.

---

## Demigod design brief distilled (one page)

**Homepage structure to aim for:**
1. Badge (SF Bay)
2. H1 ≤ 6 words (outcome or category)
3. Sub ≤ 2 lines (tech + HITL + both approve)
4. Dual CTAs + path hints only
5. Trust line (facts)
6. Optional 3 process steps
7. One pricing card
8. Footer: How · Pricing · FAQ · Contact (+ quiet legal)

**Visual:** Direction A (operator calm) or B (dark pro) from earlier moodboard.  
**Don’t:** award-site WebGL, 12 links, fake logos, hand-matched copy.

