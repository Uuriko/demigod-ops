---
status: reference
---

# Dasha tasks — rethought with outside research

**Updated:** 2026-08-08  
**Inputs:** prior exhaustive list · live lag · OSS state · web research (memecoin culture, OSS launch checklists, static hosting) · Shaw/eliza-style OSS patterns  
**Rule:** Thesis / receipts / FOMO product paths stay **dead**.

---

## How to read this list

Research keeps saying the same things:

1. **Memecoins win on culture + trust signals, not feature count.** Differentiator is narrative and participation, not more chrome.  
2. **Open source is a trust product** for builders (inspectable mint tools, remix code)—not a substitute for a working live site.  
3. **GitHub “community standards”** matter when you want contributors: LICENSE, README, SECURITY, CONTRIBUTING, issue/PR templates.  
4. **Static hosting** (Pages / Cloudflare) is fast when the app is static; Webflow is fine as the pretty primary if publish isn’t blocked.  
5. **Process should match scale.** Don’t build eliza-scale monorepo/plugin theater before strangers use Studio.

So the old 80+ list is still a **backlog inventory**. Below is a **decision order**: what to do, what to park, what to delete from the mental load.

---

## North-star jobs (only three)

| Job | Why research agrees |
|-----|---------------------|
| **A. Truthful buy path** | Culture coins are high-scam environments; mint + Jupiter + NFA is table stakes, not “utility.” |
| **B. Repeatable culture loop** | Memes spread by making/sharing; Studio remix is the only non-generic wedge. |
| **C. Inspectable OSS** | Builders trust what they can clone; Shaw-style “OSS or ngmi” applies to *dev tools*, not to inventing token utility. |

Everything else is supporting cast.

---

## Tier 0 — Until this is done, almost nothing else matters

Live is still behind disk (`home-not-current`, `desk-not-neutral`, studio asset stale). Shipping code users never see is inventory, not product.

| # | Task | Owner type | Done when |
|---|------|------------|-----------|
| 0.1 | Valid Webflow auth / `DASHA_WF_TOKEN` | Human | Token works for MCP/API |
| 0.2 | `npm run dasha:gate:fast` then `npm run dasha:ship` | Agent + token | Three embeds pushed + site published |
| 0.3 | Live verify (home, desk, studio markers) | Agent | `shipLag` empty except deliberate howto-404 |
| 0.4 | Mobile smoke on real phones | Human or CDP | Buy + remix + mint copy work |

**Park until 0.x done:** new Simp features, Studio features, Relay, Capsules, big docs rewrites.

---

## Tier 1 — Trust & culture loop (post-ship)

Memecoin research: value is social/cultural; sites that over-promise utility look like every other pump. Our edge is **honest mint desk + make/share loop**.

| # | Task | Why |
|---|------|-----|
| 1.1 | Keep dual-path crystal: Remix · Verify mint · Buy $dasha · Source | Nav clarity = conversion + trust |
| 1.2 | Measure Studio: export, share intent, remix-link reuse, inbound fragments | Roadmap gates are meaningless without numbers |
| 1.3 | Manual X loop: demo export + link OSS repo in same post | Shaw pattern: demo → GitHub in one breath |
| 1.4 | Seed/copy refresh only from bible + public posts | Culture fluency without endorsement claims |
| 1.5 | Simp board: stay editorial season-zero; no fake points/airdrop | “Points” without rules = scam-adjacent |
| 1.6 | Decide how-to-buy once: ship route **or** fold **or** delete | 404 + tests calling it “primary” is process debt |

**How-to-buy decision rule (pick one):**

- **Ship** if support load shows “how do I buy?” repeatedly after live desk is clean.  
- **Fold** if three steps on home are enough (current lean path).  
- **Delete** if the file only confuses agents and never gets a route.

---

## Tier 2 — Open source that matches GitHub norms (without theater)

GitHub community standards + pre-launch checklists: LICENSE, README, SECURITY, CONTRIBUTING, issue/PR templates; remove secrets; consistent conventions.

### Already in good shape (desk)

- Public repo `Uuriko/dasha-desk`, MIT, NOTICE, SECURITY, CONTRIBUTING, neutral product on main.  
- `receipts/` gitignored; thesis banned in docs.

### Still to do (desk)

| # | Task | Notes |
|---|------|-------|
| 2.1 | `gh auth refresh -s workflow` if pushing Actions YAML | OAuth blocked workflow updates before |
| 2.2 | Land issue templates + PR template + CODEOWNERS (local drafts exist) | Community standards checklist |
| 2.3 | `verify.yml` CI on push/PR (build + share test only—stay fast) | Don’t require full CDP on every PR |
| 2.4 | Enable Pages **or** drop Pages workflow to avoid dead links | Dead Pages URL hurts trust |
| 2.5 | Tag `v0.1.0` + short release notes | Releases signal “this is a product” |
| 2.6 | Fresh-clone CI once | Proves README isn’t lying |
| 2.7 | Secret scanning / push protection on | OSS pre-launch security hygiene |

### Studio OSS (after Tier 0)

| # | Task | Notes |
|---|------|-------|
| 2.8 | Extract `dasha-studio` public repo | Don’t monorepo-with-Demigod |
| 2.9 | MIT + NOTICE + README + embed build CI | Same bar as desk |
| 2.10 | Footer Source → studio repo when public | Desk stays desk source |

### Deliberately later / never for OSS

| Item | Why |
|------|-----|
| Full monorepo public (ops + Demigod) | Secrets, noise, wrong brand |
| Plugin ecosystem / registry | eliza-scale; zero demand |
| Cloud/backend accounts | Conflicts with static no-wallet product |
| Thesis/receipts as “archive product” | Confuses mandate; scrap only |

---

## Tier 3 — Deploy architecture (optional speed insurance)

Research: Cloudflare Pages / GitHub Pages excel at **static + git push**; Webflow is a CMS/design host. Dasha’s product *is* static HTML.

| # | Task | When to do it |
|---|------|----------------|
| 3.1 | Keep Webflow as primary if publish unblocks | Prefer least change |
| 3.2 | GitHub Pages for **desk** standalone mirror | After 2.4; docs currently 404 risk |
| 3.3 | Cloudflare Pages for full three-route site | Only if Webflow stays blocked weeks |
| 3.4 | DNS already on Cloudflare — Pages attach is cheap | Don’t re-buy domains |

**Decision rule:** If Webflow auth is flaky **and** ship is P0, stand up Cloudflare Pages for home/studio/desk as **fallback origin**, not a second product.

---

## Tier 4 — Experiments (strict kill clocks)

Culture coins don’t need more features; they need **repeatable bits**.

| Experiment | Start only if | Kill if |
|------------|---------------|---------|
| Remix Relay | ≥10 real handoffs after Studio is live | &lt;2 second-gen edits / 10 handoffs |
| Culture capsule | Recurring multi-person moments | No non-operator contribution in 3 runs |
| Simp Points | Maintainer-labeled PR process real | Looks like airdrop farming |
| Discord | Real moderation capacity | Just another empty server |

Until then: **no build**. Docs can stay gated.

---

## Tier 5 — Engineering polish (only with spare capacity)

| # | Task | Priority signal |
|---|------|-----------------|
| 5.1 | Single mint constant module | When a third file drifts again |
| 5.2 | Thin CDP tests; prefer static gates for ship | Already mostly true (`dasha:gate:fast`) |
| 5.3 | Branch protection when 2nd maintainer or first external PR | Don’t block solo ship now |
| 5.4 | Dependabot for Actions | After CI exists |
| 5.5 | Skip-link / contrast / fetch timeout | Mostly done; re-audit quarterly |
| 5.6 | Commit author identity cleanup | Cosmetic history |

---

## Tier 6 — Explicit anti-tasks (strike from the list)

Do **not** schedule:

- Thesis card, receipts, forecasting, Pair  
- FOMO/raid/referral desk  
- Telegram official community  
- Endorsement / “safe mint” / price targets  
- Wallet connect for culture  
- Gallery to save failed Relay  
- Multi-plugin framework  
- Demigod work while Dasha is active  
- Exhaustive doc writing as a substitute for ship  

---

## Re-prioritized “do next week” (max 10)

If only ten things get done:

1. Webflow token + ship three surfaces  
2. Live verify green  
3. X demo of Studio + link `dasha-desk`  
4. Land issue/PR templates on desk (with workflow scope if needed)  
5. `v0.1.0` desk tag  
6. Pages enable **or** remove dead Pages promises from README  
7. How-to-buy decision (ship / fold / delete) — written decision only  
8. Minimal Studio metrics (even a spreadsheet)  
9. Studio repo extract **or** explicitly date-defer 30 days  
10. Weekly 15‑min issue triage (even if zero issues)

---

## Mapping: old exhaustive list → this model

| Old bucket | Fate |
|------------|------|
| P0 ship parity | **Tier 0** — keep, compress |
| P0 OSS desk | **Tier 2** — finish hygiene, don’t expand |
| P1 Studio OSS | **Tier 2** after Tier 0 |
| P1 measurement | **Tier 1** — critical for roadmap honesty |
| P1 how-to-buy | **Tier 1** one decision, not three builds |
| P2 site features | **Tier 1** thin; culture over chrome |
| P2 Relay/capsules | **Tier 4** kill-clocked |
| P3 engineering / GitHub theater | **Tier 5** spare capacity |
| Do-not list | **Tier 6** permanent |

---

## Research takeaways in one paragraph

Memecoins are culture and speculation, not utility platforms—so Dasha should **not** compete by adding trading features. It should compete by being **harder to scam-yourself on** (mint desk) and **easier to participate in the bit** (Studio). Open source multiplies that only if the **live site matches the repo** and the repo meets basic GitHub trust hygiene. Static hosting is a lever if Webflow remains the bottleneck; process automation is a lever only after real external contributors appear.

---

## Related docs

- Scope of OSS: [`DASHA-OPEN-SOURCE.md`](DASHA-OPEN-SOURCE.md)  
- Shaw-informed operator checklist: [`DASHA-OSS-OPERATOR-PLAYBOOK.md`](DASHA-OSS-OPERATOR-PLAYBOOK.md)  
- Kill list / three routes: [`DASHA-SIMPLIFY.md`](DASHA-SIMPLIFY.md)  
- Fast ship: [`DASHA-SHIP-FAST.md`](DASHA-SHIP-FAST.md)  
