# Demigod website redesign — MASTER EXECUTION PROMPT

**For:** Grok (primary implementer) · Claude Code (peer implementer + scorer) · Codex swarm (challenger) · Fable (brief owner)  
**Date:** 2026-07-16  
**Phase:** retired setup framing · **tools unlocked:** Webflow MCP + Designer Bridge + agent instructions  
**Live now:** foot ~v570 shipped · title still says “Human-Matched” (positioning debt) · foot-as-page-builder problem intact  

---

## 0. One-line mission

Build a homepage that **looks like a different product** under a blur test, teaches **tech + humans in the loop** in three seconds, offers **equal dual paths** (hiring / looking), and is **honest** (no fake proof, no SLA, no hand-matched theater)—using the new Webflow MCP stack **without** inventing a second ship path.

---

## 1. Hard constraints (non-negotiable)

| Rule | Detail |
|------|--------|
| Positioning | **Tech ranks fit; humans review; mutual intro only.** Not “hand-matched.” Not fully autonomous black-box. |
| Dual path | **I'm hiring** / **I'm looking** — equal weight first screen. Both open existing WIZ branches. |
| Honesty | No fake logos, metrics, candidate counts, “48h”, SLA, Stripe-live, Twilio-live. Pre-services = **pending**. Contact: `hello@trydemigod.com will follow up`. |
| SoR | Product runtime → `demigod-foot-core.js` CDN. Structure/static → Designer MCP. Early CSS → head. Ship → `bin/dg` spine only. |
| Ponytail | Delete before add. One visual system per experiment. No parallel publish scripts. |
| Out of scope | Auto-DM, game, inventing inventory. |
| Agent rules | Webflow `rules/demigod-agent.md` + `docs/WEBFLOW-AGENT-INSTRUCTIONS.md`. |

### Blur / screenshot pass-fail

Before/after at **1440×900** and **390×844**, blurred so copy unreadable:

- **Pass:** warm light (or clearly different) canvas; oversized headline mass; two large path panels; more whitespace; no chip clutter.
- **Fail:** same charcoal stack with new words/gold shades only.

---

## 2. Research synthesis (2026 — use, don’t re-research forever)

### 2.1 B2B SaaS LP anatomy (converging industry pattern)

Typical high-converting structure is **5–8 sections**, not infinite scroll theater:

1. **Hero** — outcome headline, how-subhead, primary action(s), product artifact  
2. **Trust bridge** — only *real* proof; if none, **omit** (do not invent logos)  
3. **Problem → solution** — ICP language  
4. **Features as benefits** — 3–6 max  
5. **Evidence** — named only if real; else skip  
6. **Pricing / path** — transparent for hiring; free for talent  
7. **Closing CTA** — repeat dual path  

Key research claims to treat carefully:

- Outcome headlines beat generic product labels (~20–30% engagement lift in industry writeups).  
- Dual-path CTAs (self-serve vs talk / role A vs role B) are standard for mid-market.  
- Above-fold social proof lifts conversion **only if real** — for Demigod, **honest empty > fake logos**.  
- Speed: each second of delay hurts conversion; foot thrash and FOUC fight this — prefer less runtime rewrite.  
- One page, one goal: competing nav links kill dual-path focus.

Sources to cite in debates (not load-bearing dogma): DesignRevision B2B SaaS LP 2026; Unbounce best LPs 2026; Webflow SaaS examples; career/recruitment LP clarity/speed/trust patterns.

### 2.2 Talent marketplace comps (steal structure, not lies)

| Pattern | Steal | Reject for Demigod |
|---------|-------|---------------------|
| Toptal / boutique | Strong path split employer vs talent | Elite mystique, guarantee language |
| Wellfound / AngelList | Startup-native tone, role clarity | Job-board inventory we don’t have |
| Arc / Turing | Process steps, tech-forward | Fake “AI match %” theater |
| Linear / Stripe LP | Confidence, whitespace, product artifact | Enterprise logo walls we lack |

### 2.3 Webflow / agent stack (this machine)

```
Data MCP     → CMS, SEO title/desc, pages, publish, agent instructions
Designer MCP → structure, styles, components (Bridge open)
CDP ship     → CM6 head/footer only
foot CDN     → WIZ + honesty + dual-path product
chrome-devtools → screenshots, a11y, console
bin/dg-webflow connect · dash :9878 · dogfood
```

**Architectural correction (Codex):** stop using foot as a second page builder. Experiments must **reduce** selector thrash and move permanent chrome toward Designer + head CSS where possible.

---

## 3. Variant matrix (implement ≥5, score all, ship winner)

Each variant is a **full visual idea**, not a copy tweak. Name, first-screen, palette, delete list, ship surface.

### V1 — Operator Calm (Codex baseline · default challenger target)

- **Canvas:** warm paper `#F7F4EF` · type near-black · cobalt accents · charcoal only for product artifact + footer  
- **Hero:** editorial H1 left; two 50/50 path panels; static “HOW A MATCH MOVES” 01→02→03  
- **Delete:** role wall, chips, gold gradients, FAQ accordion, sticky desktop bar, link farm  
- **Copy seed:** “The right people, with signal.” / tech ranks · human reviews · both approve  
- **Ship:** head CSS tokens + foot brandAssets cut-back + Designer static SEO title (drop Human-Matched)

### V2 — Signal Split (split-screen dual world)

- **Canvas:** left warm light (hiring), right cool slate (talent), center join seam  
- **Hero:** two mirrored headlines + CTAs; one shared process strip under fold  
- **Risk:** can feel like two products — mitigate with shared wordmark + shared 10% line  
- **Ship:** mostly foot CSS grid; light Designer section shells

### V3 — Process Theater (product-first, Linear-ish)

- **Canvas:** near-white, mono accents, single column  
- **Hero:** product artifact **dominates** (rank → review → mutual); copy secondary  
- **Risk:** abstract UI without real product screenshots must stay non-fake  
- **Ship:** Designer component for artifact + foot openWIZ hooks only

### V4 — Editorial Manifesto (type-led, agency-quiet)

- **Canvas:** large serif H1, long measure, minimal chrome  
- **Hero:** one sentence philosophy + dual text links as big underlines  
- **Risk:** under-converts B2B if no path panels — keep two large text-CTAs  
- **Ship:** head typography + foot minimal

### V5 — Operator Desk (dashboard-adjacent)

- **Canvas:** soft gray app shell; “brief inbox” metaphor without fake rows  
- **Hero:** empty-state honest: “No public board yet — start a brief” + dual path  
- **Risk:** looks like logged-in app — keep marketing clarity  
- **Ship:** foot UI kit only

### V6 — Night Operator (dark, but not gold-recruiter)

- **Canvas:** deep navy/ink, white type, single electric accent (not gold)  
- **Hero:** same IA as V1 but night mode — tests if dark can work without boutique feel  
- **Ship:** CSS tokens flip of V1

### V7 — One Screen Close (extreme minimal)

- **Canvas:** only first viewport ships conversion: logo, H1, sub, two paths, fee line  
- **Below fold:** almost empty or single process line  
- **Risk:** SEO/scroll depth — acceptable for experiment week  
- **Ship:** foot hide almost everything below hero

**Lab rule:** implement prototypes in `design-lab/` first (static HTML) for fast debate; promote top 2 to live foot/head; ship one winner.

---

## 4. Scoring rubric (0–10 each · weight in parens)

| Dimension | Weight | 10 means |
|-----------|--------|----------|
| **Clarity (3s)** | 2.0 | Any SF founder/engineer says what it is without scrolling |
| **Dual-path equality** | 1.5 | Hiring and looking both read as primary |
| **Honesty** | 2.0 | Zero fake proof / SLA / hand-matched / services-live claims |
| **Visual novelty** | 1.5 | Blur test vs current live **passes** |
| **Shippability** | 1.0 | Can land via MCP + head + foot without new meta-tools |
| **Mobile** | 1.0 | Thumb CTAs, single column, no horizontal thrash |
| **WIZ integrity** | 1.0 | Paths open correct branches; review step intact |

**Total max 100 × (sum weight=10)** → report weighted score.  
**Kill rule:** honesty &lt; 7 or dual-path &lt; 6 → variant dies regardless of beauty.  
**Ship rule:** weighted ≥ 80 and blur pass and verify:source green.

---

## 5. Multi-agent loop (run ≥2 full cycles)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Fable brief  │────►│ Grok/Claude  │────►│ CDP screens  │
│ + research   │     │ implement Vi │     │ desktop+mob  │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                    │
                            ▼                    ▼
                     ┌──────────────┐     ┌──────────────┐
                     │ Codex debate │◄────│ Claude score │
                     │ kill/keep    │     │ rubric JSON  │
                     └──────┬───────┘     └──────────────┘
                            │
                            ▼
                     promote / next variant / ship winner
```

### Roles

| Agent | Does | Does not |
|-------|------|----------|
| **Fable** | Owns brief, stop criteria, honesty veto | Pixel push |
| **Grok** | Implements lab + live, dogfoods tools, ships | Infinite research |
| **Claude Code** | Parallel variants, scores screenshots, Bridge edits | Auto-DM |
| **Codex swarm** | Challenges “looks same”, proposes kills, protocol | Duplicate ship scripts |

### Cycle checklist

1. `bin/dg-webflow connect` · Bridge open · dash `:9878` glance  
2. Pick Vi · implement lab HTML **or** live token theme  
3. Screenshots → `design-lab/out/Vi-{desktop,mobile}.png`  
4. Score JSON → `design-lab/out/Vi-score.json`  
5. Debate note → `docs/exchange/WEBSITE-DESIGN-DEBATE-LOG.md`  
6. Dogfood: wrap ship/connect/hygiene; if tool fail ≥2× → fix/remove  
7. Next variant or ship if pass  

### Stop criteria

- Winner shipped + blur pass + truth PASS + honesty PASS, **or**  
- 7 variants scored and top two re-debated with no score gain ≥3, **or**  
- Explicit user halt  

---

## 6. Implementation protocol (per variant)

### 6.1 Lab (fast, preferred first)

```bash
# edit design-lab/V{n}-{slug}.html
# serve + screenshot via CDP / chrome-devtools
node design-lab/capture.mjs --variant V1
```

### 6.2 Live promote (only top candidates)

1. `npm run demigod:verify:source`  
2. Foot: theme tokens + dual path panels; **cut** page-builder chrome for that theme  
3. Head: FOUC-safe background/color tokens  
4. Designer MCP: SEO title/description (drop Human-Matched); optional static section shells  
5. `bin/dg ship` / lock spine — one path  
6. `bin/dg truth` + live screenshots  

### 6.3 WIZ / forms

- Dual path must call existing open-wiz branches  
- No new form stack  
- Playtest: `node demigod-wiz-cdp-playtest.mjs --local` when wiz UX touched  

---

## 7. Dogfood & tool policy

**Must use each cycle:**

| Tool | Why |
|------|-----|
| `bin/dg-webflow connect` | Bridge/MCP spine |
| `bin/dg hygiene --prune` | Tab budget |
| Dash `http://127.0.0.1:9878` · `/api/control` | Module health |
| Webflow MCP Designer/Data | Structure/SEO when Bridge up |
| chrome-devtools | Screenshots / a11y |
| `node demigod-tool-dogfood.mjs wrap` | Judgment log |

**If tool not useful:**

1. Log `--ok=0 --useful=0 --why=…`  
2. Fix once (timeout, docs, prune)  
3. If still useless for redesign: demote from hot path in playbook; do **not** add a parallel tool  

**Allowed new tools only if:** replaces ≥1 step, &lt;100 LOC, documented in connect/playbook, dogfoodable.

---

## 8. Exact copy banks (scrub-safe · pick per variant)

### Set A — Signal (Operator Calm default)

- Eyebrow: `SF STARTUP TALENT MATCHING`  
- H1: `The right people, with signal.`  
- Sub: `Demigod tech ranks the fit. A human reviews every potential match. Both sides approve before an intro.`  
- Paths: `I'm hiring` / `I'm looking`  
- Trust: `SF Bay Area · 10% on hire · Free for talent · No intro without mutual interest`  

### Set B — Brief

- H1: `Start a hiring brief. Or a profile.`  
- Sub: `Software narrows fit. People review it. Intros only when both sides want them.`  

### Set C — Gates

- H1: `Three gates to every intro.`  
- Sub: `Signal in. Ranked fit. Human review. Mutual yes.`  

**SEO title target:** `Demigod · SF startup talent matching` (not Human-Matched)  
**Meta:** `Demigod ranks fit with tech, reviews with people, introduces only with mutual interest. 10% on hire. Free for talent. hello@trydemigod.com`

---

## 9. Process + pricing (shared across variants)

**Process heading:** `A match has three gates.`  
1. Add the signal (role + 90-day outcome / profile)  
2. Rank, then review  
3. Both say yes  

**Pricing:** `10%` of first-year cash comp when someone starts · free for talent · services (SMS/pay) **pending** where true  

---

## 10. Deliverables (files)

| Path | Owner |
|------|--------|
| `docs/exchange/WEBSITE-REDESIGN-MASTER-PROMPT.md` | this file |
| `docs/exchange/WEBSITE-RESEARCH-SYNTHESIS.md` | research |
| `docs/exchange/WEBSITE-DESIGN-DEBATE-LOG.md` | ongoing debate |
| `docs/exchange/CODEX-WEBSITE-EXPERIMENT-PROTOCOL.md` | Codex |
| `design-lab/V*.html` | prototypes |
| `design-lab/out/*` | screenshots + scores |
| Live promote | foot + head + Designer SEO |

---

## 11. Immediate first actions (Grok + Claude, cycle 1)

1. Confirm Bridge: Designer mode readable via MCP.  
2. Build lab HTML for **V1 Operator Calm**, **V2 Signal Split**, **V7 One Screen**.  
3. Capture desktop+mobile screenshots.  
4. Claude + Codex score; Grok implements fixes on top scorer.  
5. Promote winner path to live foot/head; fix SEO title via MCP; ship once; blur-compare to current live.  
6. Dogfood dash + connect; prune tabs if &gt;8.  

---

## 12. Prompt block (paste to start a worker)

```
Demigod (Webflow talent matching). retired setup framing.
Execute docs/exchange/WEBSITE-REDESIGN-MASTER-PROMPT.md cycle 1.
Use Webflow MCP + Bridge, foot CDN, head CSS, chrome-devtools, bin/dg-webflow connect, dash :9878.
Build design-lab V1, V2, V7 → screenshot → score → debate note.
Positioning: tech+HITL, dual path, no fake metrics. Ponytail. No auto-DM. No game.
Dogfood tools; fix or demote if useless. Stop when blur test passes or 7 variants scored.
```

---

*Synthesized from: Codex Operator Calm brief, Webflow agent connect stack, B2B SaaS LP research 2026, Demigod honesty/GTM rules. Fable/Claude/Codex agent outputs append to debate log as they land.*
