---
status: canonical
canonical_for: demigod-roadmap
last_verified: 2026-08-13
---

# Demigod site + automation roadmap

**Dated:** 2026-08-13  
**Owner surfaces:** trydemigod.com · WIZ · Hire / Share privately · `/legal` · `/bounties` · CDN `Uuriko/demigod-site-cdn` · laptop `demigod-head-styles.css`  
**Visual owner:** [`DEMIGOD-ART-DIRECTION.md`](../DEMIGOD-ART-DIRECTION.md)  
**Ship spine:** [`SHIP-AND-CDN.md`](SHIP-AND-CDN.md)  
**Laptop canonical:** [`../DEMIGOD-ROADMAP.md`](../DEMIGOD-ROADMAP.md) — this file is the `docs/` copy.

This is not Dasha. Do not import acid, hot, violet, lavender, cherries, Arial Black, Simp Board, or `$dasha` CTAs. Palette does not change. There is no sixth Demigod colour. Gold `#D4AF37` is dead.

**Rule of this file:** every task has a done-when, an automation plan, and named edge cases — even steps we may never auto-send. **Do not** dispatch Claude, TUI, or eliza from this file. Do not auto-email Horton packets without the kill switch. Do not seed `dasha-desk` onto the Demigod feed.

Software **compares**. A human **proposes**. Intro only on **mutual yes**. Fee: **10% of first-year base when a hire starts.** Contact: **potter@trydemigod.com** only.

---

## Shared with Dasha (run on both)

Same four jobs as Dasha's 2026-08-13 section. Demigod-specific notes only.

### S1. `site-hunt` in CI

`node /home/potter/site-hunt.mjs` is required on `bin/dg ship prepare`. P0/P1 fail the ship. Fail closed if Dasha acid `#dfff00`, hot `#ff3b81`, violet `#7c4dff`, cherries, or Arial Black display stack appear on trydemigod.com. Fail closed if Demigod phosphor/signal/gold/statue/`.dgnav` appear on getdasha.com.

**Automation:** add the hunt to the prepare gate next to `demigod:verify:source` and board honesty. Laptop `.mjs` is source of truth.

**Edge:** SPA pretty-paths share one HTML shell — dedup findings. Copy-scrub JS is ignored; JSON-LD is not. jsDelivr `@main` lag is P3 when raw GitHub is clean. Empty bounties feed is honest, not a P0.

### S2. SRI / one CDN SHA in deploy

**Done (CSS pin):** one SHA on `Uuriko/demigod-site-cdn` for **css / foot / map / art**. Do not ship head from commit A, foot from B, map from catbox. `docs/SHIP-AND-CDN.md` is the spine; a split pin is a visual bug (two eras at once) **and** an integrity bug.

**Still required:** every first-party script/style the live page loads carries `integrity` written by the publish script (`demigod-foot-cdn-publish.mjs`), not by hand. `footer:cdn-matches-manifest` stays a ship gate. After publish, `bin/dg truth --require-match` plus a digest recompute of live bytes vs pin.

**SRI stale — researched, same class as Dasha Studio 2026-08-10:** a 200 page with a wrong pin is a **dead** page. Browsers refuse the file; Lighthouse and string asserts still pass. Gate on digest, not on HTTP status. Read the algorithm from the pin (sha256/384/512). Pin a commit SHA, never `@main`. Temporary catbox/litterbox hosts are not production.

**Tests:** `demigod-footer-cdn-manifest.test.mjs`; truth sibling drift; a mutated `demigod-foot-core.js` without republish fails `--require-match`.

### S3. Webflow paste runbook

`bin/dg ship run` under current-request publish auth: prepare → CDN → CM6 paste of **exact** disk head + footer → queue-publish `finished` → curl **www.trydemigod.com**. Refuse partial pairs. CDP Chrome `:9223`. If `gh` is unauthenticated, the documented Actions ingest path — not a silent catbox pin.

**Edge:** `set` of Webflow custom code replaces the block. Designer JS-off canvas must equal JS-on (NOW item DG1). Paste cannot be the only place the product exists.

### S4. Product-mix tests

No Dasha acid on Demigod, no Demigod phosphor on Dasha. Never seed dasha-desk listings into the Demigod bounties feed to look alive. An empty feed is honest. `demigod-copy-denylist.txt` + brand-guard tests + site-hunt mix class.

---

## NOW (this week)

### DG1. Designer JS-off honest H1 — kill Talentlink gold canvas, statue, fake roles

**Done when:** with JavaScript disabled, www.trydemigod.com still paints:

- Dual-path cards (Hire filled signal, Share privately phosphor outline)
- Phosphor H1, solid on first meaningful paint (do **not** wait for `.title-accent-gold`)
- Fee sentence: 10% of first-year base when a hire starts
- Contact: potter@trydemigod.com
- Process spine: software compares, human proposes, intro on mutual yes

and does **not** paint:

- Gold `#D4AF37`, `.title-accent-gold` as the H1 voice
- `.statue-frame`, statue SVG, marble/pantheon/lightning-bolt god identity
- Fake roles, fake candidate counts, "vetted network", "48h", Stripe-live, Twilio-live
- Talentlink-sf gold canvas leftovers (`--g:#D4AF37`, gold glows, premium pill CTAs)
- Operator Calm paper+cobalt

JS-off canvas must equal JS-on. If the page is a different product with JS disabled, the canvas is lying.

**Automation plan:**

1. Put the H1, dual-path, fee, contact, and process spine in the **Webflow canvas** (and/or head CSS that does not depend on foot). Foot may enhance. Foot may not be the only place the product exists.
2. Hide and delete statue markup. CSS `display:none` on `.statue-frame` is a stopgap; delete the SVG from the canvas in the same paste.
3. Kill remaining `#D4AF37` in `demigod-head-styles.css` and live CSS. `--g` is signal `#10c674`.
4. `demigod-head-route-paint.test.mjs` + a JS-off Playwright/CDP shot: H1 computed color is phosphor `#a6ffcb` (or the locked token), not gold.
5. `demigod-live-honesty-audit.mjs` / `demigod-verify-signal-theater.mjs`: zero fake roles in the first paint.
6. site-hunt P0 on gold, statue, "vetted network", SLA clocks.

**Edge cases:**

- Late `:root` that drops Manrope and leaves system-ui is the surface being wrong — fix the cascade, do not "match live."
- File-top `--dim:#8aa193` must be `#8a9a8e`; `--dg-rule` must be `rgba(166,255,203,.18)` not `.28`. Art direction table wins over live drift.
- H1 must not be uppercase Cinzel. Manrope + phosphor, sentence case, slight negative tracking.
- Webflow Designer preview can lie (fonts loaded in Designer, not on www). Verify curl + CDP against **www**.

**Tests:** JS-off H1 text + color; no `#D4AF37` in live CSS; no `.statue-frame` in live HTML; honesty audit; site-hunt.

### DG2. Contact theater delete

**Done when:** every surface, meta, footer, WIZ done-state, and agent copy has **only** `potter@trydemigod.com`. Gone: `hello@trydemigod.com`, live chat widgets, 8am–5pm SLA, "our team replies within one business day", fake team photos, fake headcount, fake "operators on shift", pay-online theater (Stripe-live, checkout, "start your plan").

**Automation plan:** `demigod-copy-denylist.txt` + `demigod-copy-policy.mjs` + site-hunt P0. Grep the Webflow canvas, JSON-LD, foot JS, WIZ strings. A doc that still says hello@ is wrong — strike it in the same change as the site.

**Edge:** do not add a second inbox to look bigger. Do not replace theater with "we'll be in touch in 48h" (that is a different lie — DG5 is the honest status ticket).

**Tests:** denylist on disk + live HTML; WIZ done-state snapshot.

### DG3. Hire card prominence — DONE (CSS `229c9de`)

Hire is the filled signal action; Share privately is the phosphor outline. Hire must be **at least as prominent**. Historical live bug: hero `.dg-path-pair` painted Hire as a translucent wash (phosphor type on 22% green film) while Share privately was the crisp outline. KEEP_WORKING lock at the end of `demigod-head-styles.css` was correct; higher-specificity hero rules undid it.

**Still automate:** a regression test that Hire's computed background is opaque signal `#10c674` (or the lock's specified fill) and that its contrast vs Share privately does not invert. site-hunt / `demigod-hero-brand-guard.test.mjs`. If a later cascade re-dims Hire, the test fails — do not "balance" the pair.

**Edge:** equal size, equal type scale, equal min-height. Do not relabel to "I'm hiring" / "I'm looking" as a substitute for the treatment. Labels stay Hire / Share privately unless art direction changes.

### DG4. One CDN SHA — DONE

Keep it done. Split pins are a reopen, not a variant. Automation: S2 forever.

### DG5. Privacy already `/legal`

Do not invent `/privacy` on Demigod. Canonical legal URL is `/legal`. Dasha's `/privacy` is Dasha. Mix test: Demigod footer must not link getdasha privacy as if it were ours, and Dasha must not link `/legal` as if it were getdasha.

**Automation:** route audit + site-hunt. Edge: a 301 from `/privacy` → `/legal` on trydemigod is allowed if people type it; the **link** we publish is `/legal`.

---

## 30 days

### DG6. Status ticket after Webflow submit

**Done when:** after a Hire or Share-privately Webflow submit, the person gets a durable ticket they can reopen, with an honest state machine:

`received → parked → proposing → intro → trial → started → closed`

No fake "we'll be in touch in 48h" clock. No black hole. Status is visible to the submitter (email or a token URL). Agents may move tickets **along this spine** with evidence; they may not jump to `intro` without mutual yes, or to `started` without a real start.

**Automation plan:**

1. Webflow form webhook → existing `demigod-submissions-ingest.mjs` / `demigod-webhook-*.mjs` mints a ticket id.
2. Confirmation page / email: ticket id + status URL. Copy is "received", not "our team."
3. Store state on disk SoR (`demigod-submissions-lib.mjs` / role ledger), not in Webflow CMS as the truth.
4. Public status page: only what that token is allowed to see. No other candidates, no other companies.
5. Transitions require a named evidence field (webhook receipt, Potter yes, mutual yes, trial packet sent, start date). Missing evidence → refuse the write.
6. Notify on transition (email). **Kill switch** on the send (same as Horton packets). Default may be on for `received` (transactional) and off for anything that looks like recruiting outreach.

**Edge cases:**

- Double submit: idempotent ticket (same email + role + time window), do not mint two lives.
- Webflow can 200 the form and fail the webhook. Status page must still be mintable from the ingest poller (`demigod-watch-submits.mjs`). "received" only after **we** have the row, not after Webflow's thank-you.
- `closed` is terminal and honest (no fit, withdrawn, hired elsewhere, spam). Do not delete; retain per blueprint record schedule.
- Do not show `proposing` to the other side until Potter has actually proposed. Software compares; a human proposes.

**Tests:** ingest isolation tests already exist — add state-machine transitions, illegal jumps, idempotent mint, token authorization (user A cannot read user B).

### DG7. Talent proof URL required

**Done when:** Share-privately / talent WIZ cannot submit without a proof URL (GitHub, shipped work, paper, talk). Empty proof is not a profile. The field is validated (http(s), not a `javascript:`, not a bare LinkedIn with no path if we decide that is too weak — document the allow-shape).

**Automation:** WIZ client + server ingest `required-evidence` tests (`demigod-submissions-required-evidence.test.mjs` exists — make it fail closed on missing URL). Cap inbound (DG9) applies after proof, not instead of it.

**Edge:** Pallais (below) is why we want proof **and** a first paid trial — a URL is not a closed loop. Do not reject people for missing a famous logo. Do reject empty.

### DG8. California Labor Code 432.3 — strip salary history

**Done when:** no Demigod form, WIZ step, packet, or agent prompt asks current or prior salary. Ask **expectations** and **alignment with the posted scale**. Do not use prior salary to justify a new offer. Recruiter postings use the employer's good-faith pay scale where required.

**Automation plan:** copy-denylist phrases (`current salary`, `current comp`, `what do you make`, `salary history`). Packet templates scanned in CI. Horton recs (DG10) scanned before any send. Inbound parse that extracts "currently making $X" from a résumé must **not** write it into the candidate record used for offers — drop or quarantine.

**Edge:** 432.3 is California. Demigod's ICP is SF. Do not "only strip for CA roles" — strip everywhere so a remote form does not leak the question onto a CA hire. Asking **expectations** is allowed; pre-filling expectations from scraped history is the bug.

**Tests:** form-p0 / copy-denylist; packet fixture with "current salary?" fails; WIZ DOM has no salary-history input.

### DG9. Cap inbound

**Done when:** a documented daily/weekly cap exists on unsolicited talent submits and on Hire briefs, with a honest full-state ("we're parked, not ignoring you") instead of a silent drop. Cap is to keep Potter's review real (blueprint: human review is meaningful only with authority, time, and the ability to disagree).

**Automation:** rate limit by email + proof-domain + IP. Over-cap → ticket still `received` then `parked` with the parked reason `inbound_cap`, not 500. AEA scramble (DG11) is how parked talent gets another look — not a second form spam.

**Edge:** do not cap so hard that the first real founder brief bounces. Hire briefs from new companies get a higher priority lane than talent spray. Never return 200 + discard (black hole).

---

## 90 days

### DG10. Three-packet Horton recs to Potter (kill-switch send)

**Done when:** for a live Hire brief, the system can draft **at most three** recommendation packets to Potter (not to the company, not to the talent). Each packet is evidence-backed (proof URL, constraints, 90-day outcome fit, gaps). No fitScore as a public verdict. Potter sends or kills.

John Horton's online-labor-market results: algorithmic recs change who gets seen; noisy recs waste both sides; the human has to be able to ignore the machine. Hence **three**, hence **to Potter**, hence **kill-switch**.

**Automation plan:**

1. `demigod-match.mjs` / matching engine already compares. Wrap output as packets, not scores on the website.
2. Queue: `draft` → Potter review UI (`demigod-match-review.mjs`) → `approved_to_send` | `killed`.
3. Send path is **off** unless `DEMIGOD_CURRENT_REQUEST_PUBLISH`-class auth **and** a kill-switch file/env (`DG_HORTON_SEND=0` default). Agents may draft unattended. They may not send unattended.
4. Log every draft, kill, and send. No silent retries that look like a second rec.

**Edge cases:**

- California ADS/FEHA (effective 2025-10-01): tools that recommend candidates can be covered even when a human decides. Packets are advisory, never auto-reject, preserve inputs 4+ years if this is an ADS. Do not claim "not an ADS" in marketing without a legal pass (`docs/DEMIGOD-STRATEGY-RESEARCH-2026-08-04.md`).
- Do not email the company a ranking. That is Instant Offers energy (banned).
- Three is a cap per brief per review cycle, not a quota to fill. Zero packets is a valid outcome (no honest match).
- Kim–Pergler: firm-driven search hires more and retains less. Packets must not become outbound spam. Mutual yes still gates intro.

**Tests:** packet schema; cap of 3; send refused when kill-switch off; review evidence tests already on disk stay green.

### DG11. AEA scramble of parked

**Done when:** parked tickets (inbound cap, no-match, timing) enter a periodic **scramble** — a bounded re-consideration pass — rather than rotting. Named after the AEA job-market scramble: a second, explicit look at leftover inventory, not a dark funnel.

**Automation:** cron lists `parked` older than N days, re-runs compare, drafts Horton packets only if new evidence exists, otherwise stays parked with a timestamp. Never auto-promotes to `proposing`. Never emails talent "you were scrambled" as if it were an offer.

**Edge:** scramble is not a second application. Do not ask them to re-submit salary history (432.3) or a new proof URL unless the old one 404s. Cap the scramble batch so it cannot overwhelm DG9.

### DG12. Cheap-talk band shown to talent and frozen (Kircher)

**Done when:** compensation is shown to talent as a **band** the employer already committed to (posted scale / WIZ range). The band is **frozen** before intros. Talent sees the same band Potter sees. No side-channel "what would it take" that rewrites the band after a yes.

**Why Kircher:** directed-search / cheap-talk results — wage talk that is not binding is cheap talk; it can still coordinate **if displayed and stable**. A band that moves after the reveal is a different game and trains people to lie. Freeze is the product.

**Automation:** band lives on the role packet at `proposing`. Edits after `intro` require a new packet and a new yes. Talent status page shows the frozen band, not "competitive."

**Edge:** 432.3 — this is the employer's scale, not the candidate's history. Pallais — a frozen band plus a paid trial beats a vague "DOE." Empty band cannot enter `proposing` (same shape as Dasha empty `payTo`: no inventory without a destination).

**Tests:** packet without a band cannot transition to proposing; edit-after-intro refused; talent token sees the freeze timestamp.

### DG13. Paid 2–5 day trial packet

**Done when:** the trial is a real paid packet, not an unpaid take-home, not weekend homework.

| Situation | How we pay | Why |
|---|---|---|
| SF onsite | **EOR / W-2** | California **AB5 / ABC test**: onsite labor under company direction fails "free from control" and usually fails "independent trade." Contractor theater here is the bug. |
| Remote / first proof / bounty-shaped | **USDC or contractor** | Still paid. Still 2–5 days. Not unpaid "see if they can code." |

**Pay even if no hire.** The trial is work, not a free option on the candidate. Demigod may facilitate the packet; the employer (or EOR) is the payer of record unless we have actually contracted otherwise. Do not pretend we are the EOR if we are not.

**Automation plan:**

1. Packet template: scope, days (2–5), pay amount, classification (W-2/EOR vs contractor/USDC), 90-day outcome relevance, stop date.
2. Status `trial` only when the packet is sent **and** pay is arranged. A Google doc with no pay is not `trial`.
3. If no hire: still mark trial paid in the ledger. Fee (10%) does **not** apply to trial pay. 10% applies at `started`.
4. Agents draft packets. Kill-switch on send (same as Horton). Classification default: onsite SF → W-2/EOR; do not let a prompt "save money with a 1099" win.

**Edge cases (AB5):**

- ABC test: (A) free from control, (B) work outside the usual course, (C) independently established trade. A designer sitting in the SF office for five days is not (A) or (B). Do not "try contractor first."
- EOR vs W-2: if the startup cannot payroll a two-day worker, EOR is the path. If we cannot honestly offer either, **do not run an onsite trial**.
- USDC remote: still collect tax forms the employer/EOR needs; USDC does not erase classification. First-proof bounty ≠ employment if it is truly scoped and not directed onsite — still pay.
- Unpaid take-home is banned in art direction and stays banned.

**Tests:** packet schema requires pay + classification; onsite+contractor fixture fails; `trial` transition without pay refused; no-hire still records pay.

---

## Later (permanent)

### DG14. 10% invoice on `started`

When a hire **starts**, invoice **10% of first-year base**. Not of "cash comp" theater, not a monthly SaaS price, not "free forever" for companies. Candidates never pay. No invoice on `intro`, `trial`, or `closed`.

**Automation we may never auto-send:** an invoice drafter that reads `started` + base from the frozen packet and writes a draft. Send requires Potter. Do not auto-Stripe. Payments remain pending until a real rail exists (`docs/SHIP-AND-CDN.md` honesty: no Stripe-live theater).

**Edge:** trial pay is not "base." Equity-only offers: no 10% of a made-up cash equivalent. If there is no first-year base, there is no 10% — and maybe there is no `started` we should take.

### DG15. Never two-way stars

No mutual 1–5 star rating of companies vs talent. It invites retaliation, cheap-talk noise, and "culture fit" proxies the blueprint forbids. Outcomes are: intro happened, trial paid, started, closed-reason. Pallais-style **work-sample outcomes** (did the trial ship) beat stars.

**Automation:** site-hunt / copy-denylist / UI grep for star widgets. Never add them to WIZ done-states.

### DG16. Never Instant Offers

No one-click pre-offer, no exploding "accept in 24h" generated by software, no LinkedIn-style Instant Offers. Horton packets go to Potter. Offers go through humans. Cheap-talk band is a **display**, not an offer.

**Automation:** denylist "instant offer", "pre-approved offer", "accept now." Matching engine cannot write `offer_sent`.

### DG17. Never seed dasha-desk on the Demigod feed

Empty Demigod bounties feed is honest. Pulling `dasha-desk` listings, acid ticks, or cherries onto trydemigod.com/bounties to look alive is a mix lie. Reverse is also banned (Dasha board's `EXTRA_SEED_URLS` pointing at demigod-site-cdn is a known leak — burn it on the Dasha side in 90d, do not "reciprocate").

**Automation:** board honesty tests; site-hunt; `demigod-verify-board-honesty.mjs`. Feed merge allowlist does not include `Uuriko/dasha-desk`.

---

## Researched edge cases (keep with the task, not in a trivia file)

### SRI stale

A successful deploy + HTTP 200 + passing string asserts can still mean **the browser refused the script**. Dasha lost `/studio` for a day this way (2026-08-10). Demigod's split-pin / `@main` lag is the same class. Digest the live bytes. Pin commit SHAs. Write the pin in the same job that writes the bytes.

### Iframe SEO

Dasha's `/bounties` iframe is the cautionary tale: crawlers see the shell, Webflow occupies `/bounties.json`, the sitemap omitted the route. Demigod must not "fix" bounties with an iframe of dasha-desk or GitHub Pages. Native mount, honest empty feed, sitemap/routes that exist.

### OAuth unconfigured — honest

Dasha Board says **GitHub soon** when lobby OAuth is dark. Demigod must treat unconfigured Stripe/Twilio/SMS the same: **pending**, not a live checkout. Honest beats a dead Connect / Pay.

### Empty `payTo` / empty band

No destination, no list. Demigod: no frozen cheap-talk band, no `proposing`. Dasha: no Pay button, cannot List. Inventory without a counterparty is theater.

### AB5 / ABC test

SF onsite trial → EOR/W-2. Contractor/USDC is for remote/bounty first-proof, still paid. Do not 1099 an onsite five-day worker to move faster.

### Pallais outcomes

Amanda Pallais, *Inefficient Hiring in Entry-Level Labor Markets*: a first paid job that **reveals** performance to the market changes later outcomes. Demigod's paid 2–5 day trial is that instrument. Stars, logos, and years-of-experience filters are not. Record whether the trial shipped; that record is the outcome. Pay even if no hire — otherwise we did not run the Pallais move, we ran a free option.

### Kircher reveal

Cheap talk coordinates when the message is **public and stable**. Reveal the band to talent at `proposing`, freeze it, do not renegotiate in the dark after yes. A moving band is not "flexibility"; it is a different game that rewards lying. Pair with 432.3: reveal the **employer's** scale, never the candidate's history.

---

## Automation matrix

| ID | Human still required | Agent may run unattended | Never auto-send |
|---|---|---|---|
| DG1–DG5 site honesty | Webflow publish auth | CSS, tests, hunt, draft paste | paste/publish with flag off |
| DG6 status | proposing / intro / started | mint `received`, park on cap | intro email without mutual yes |
| DG10 Horton | Potter review + kill-switch | draft ≤3 packets | the send |
| DG13 trial | classification + pay arrange | draft packet | unpaid take-home, onsite-1099 |
| DG14 invoice | Potter send | draft on `started` | Stripe-live, auto-charge |
| DG15–DG17 bans | — | grep / hunt / honesty | stars, Instant Offers, dasha-desk seed |

---

## Pointers

- Art: [`DEMIGOD-ART-DIRECTION.md`](../DEMIGOD-ART-DIRECTION.md)
- Ship: [`SHIP-AND-CDN.md`](SHIP-AND-CDN.md)
- Tasks register: [`DEMIGOD-TASKS.md`](DEMIGOD-TASKS.md)
- Handbook: [`DEMIGOD-HANDBOOK.md`](DEMIGOD-HANDBOOK.md)
- Recruiting law research: [`DEMIGOD-FULL-SERVICE-RECRUITING-BLUEPRINT.md`](DEMIGOD-FULL-SERVICE-RECRUITING-BLUEPRINT.md) §25
- ADS / CA: [`DEMIGOD-STRATEGY-RESEARCH-2026-08-04.md`](DEMIGOD-STRATEGY-RESEARCH-2026-08-04.md)
- Mix twin: [`DASHA-ROADMAP.md`](../DASHA-ROADMAP.md)
- Hunt: [`SITE-HUNT.md`](../SITE-HUNT.md)
