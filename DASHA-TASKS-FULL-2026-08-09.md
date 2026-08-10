# getdasha.com — full task inventory

> **Live-state correction (2026-08-09):** T-001–T-004 are complete. Home, Studio and Desk passed exact Webflow readback; the Lobby Worker deployed; `getdasha.com` and `www.getdasha.com` published; the live fast audit passed with no hard or soft failures. The Home OG image is exact-hash live. The joint Studio/Quiz aggregate baseline was reset and verified at zero at `2026-08-08T21:27:20-07:00`. Current next work is observation, not another ship unblock. See [`DASHA-RETENTION-RESEARCH-2026-08-09.md`](DASHA-RETENTION-RESEARCH-2026-08-09.md).

**Generated:** 2026-08-09  
**Method:** Executed [`DASHA-TASK-GEN-PROMPT-2026-08-09.md`](DASHA-TASK-GEN-PROMPT-2026-08-09.md)  
**Inputs:** web research · `npm run dasha:meta` · `npm run dasha:audit:live:fast` · `DASHA-LIVE-CONTEXT.md` · `DASHA-PRODUCT-BRIEF.md` · live curls  
**Product loop:** Know the lore → make an artifact → receive recognition → share outward.

---

## 1. Executive summary

Dasha is a coherent **culture + trust** site (Home / Studio / Desk / Lobby / Quiz+Simp). Disk has raced ahead of **www** on several announce-critical gates. Live audit hard fails:

| Hard ID | Meaning (ops) |
|---------|----------------|
| `assets-hash-match` | Worker/static client hash vs expected drift |
| `home-one-buy-venue` | Live home still exposes extra buy venues vs disk “Jupiter primary” rule |
| `home-negative-coin-copy` | Live home still trips negative-coin honesty gate (disk cleaned earlier) |

**Top 5 tasks right now**

1. **T-001** — Re-auth Webflow + ship Home (disk → www) to clear hard fails  
2. **T-002** — Ship Studio embed shell (mint + first paint)  
3. **T-003** — Align lobby/assets hash so `assets-hash-match` passes  
4. **T-010** — Keep Studio share path warm/native (verify live after ship)  
5. **T-020** — Observe metrics baseline before new scoring machinery  

**Primary block:** Webflow MCP/token for www push. Agent-local work should not thrash Home polish until ship lands.

---

## 2. Research synthesis (web → Dasha)

| External finding | Dasha implication | Tasks |
|------------------|-------------------|-------|
| Memecoins win on **narrative + community + remix content**, not utility decks | Studio + quiz + X share are growth engines; Desk is trust plumbing | T-010–T-025 |
| Discovery path is CA paste → chart → risk → swap; site is secondary | Visible mint + one clear Jupiter path + Dexscreener outbounds | T-001, T-030–T-035 |
| Viral quizzes: **~6–12 Q**, result identity + image, no pre-auth gate | Quick 10Q invite already; dual mode; invest in share sticky/result hero | T-020–T-024 |
| Web Share API: native file share + feature detect; better mobile completion | Studio/quiz PNG share must stay on click path, no OAuth await | T-010–T-012, T-021 |
| Generic “TG + FOMO + roadmap” CRO is the **default pump template** | Explicit KILL list; never add TG HQ / countdown / “safe mint” | KILL section |
| Power-law attention; most tokens die; burned cohorts hate FOMO copy | Honesty + NFA + association language is retention, not liability | T-001, T-040 |
| Community “vibes” live on X more than brand Discord | Lobby on-site is fine; X intents + optional link; no Discord HQ | T-050–T-052 |

Selected sources (patterns, not marching orders): memecoin culture writeups (culture > utility); viral quiz length/share practice; [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API); Solana “verify CA” / Jupiter lock-to-mint norms.

---

## 3. Live vs disk gap

| Item | Disk | Live www (~2026-08-09) | Action |
|------|------|------------------------|--------|
| Landing size | ~36KB class (post cuts) | ~57KB HTML | Ship Home |
| Buy venues | Jupiter-primary pattern | Hard fail `home-one-buy-venue` | Ship Home |
| Negative-coin copy gate | Cleaned in fast ship path | Hard fail `home-negative-coin-copy` | Ship Home |
| Studio shell mint | Embed has shell + CA | Thin ~7.7KB, mint not in HTML | Ship Studio embed |
| Lobby assets | Rebuild often | hash in health; audit `assets-hash-match` hard | Rebuild + deploy + audit sync |
| Quiz dual-mode / sticky CTAs | On worker clients | Client-served from lobby — usually live if Worker deployed | Verify after ship |
| Meta | ok | ok | Keep green |

**Announce-ready:** **no** until hard list empty.

---

## 4. P0 — Ship & trust

### T-001 · Webflow re-auth + ship Home (disk → www)
- **Priority:** P0  
- **Surface:** Home · Ops  
- **Owner:** webflow-token (+ agent ship once token valid)  
- **Why:** Live hard fails `home-one-buy-venue`, `home-negative-coin-copy`; announce-ready blocked; growth copy on disk not public.  
- **Done when:** `npm run dasha:ship` (or home push) succeeds with readback; `dasha:audit:live:fast` clears those two IDs.  
- **Depends on:** Valid `DASHA_WF_TOKEN` / `/tmp/dasha-wf-token.txt` + `npm run dasha:token:check`.  
- **Do not:** Hand-edit Webflow without ship path; don’t “fix” by weakening audit.

### T-002 · Ship Studio embed shell (mint + lede first paint)
- **Priority:** P0  
- **Surface:** Studio · Ops  
- **Owner:** webflow-token  
- **Why:** Research + audit: thin JS-only shell fails crawlers/first paint/trust; disk `dasha-studio-embed.html` has mint shell.  
- **Done when:** Live `/studio` HTML contains mint CA + `dasha-studio-shell` (or equivalent) + `studio.js`; tools still mount.  
- **Depends on:** T-001 token; `node dasha-studio-embed-build.mjs --check` green.  
- **Do not:** Inline full studio into Webflow 50k cap.

### T-003 · Clear `assets-hash-match`
- **Priority:** P0  
- **Surface:** Ops · Lobby  
- **Owner:** agent-local  
- **Why:** Live audit hard fail; clients/SEO assets must match expected hash.  
- **Done when:** `node dasha-lobby-assets-build.mjs --write` + Worker deploy; audit hard no longer lists `assets-hash-match`.  
- **Depends on:** Understanding whether check is disk vs live Worker mismatch.  
- **Do not:** Silence the check.

### T-004 · Full three-route ship after token (studio → desk → home)
- **Priority:** P0  
- **Surface:** Cross · Ops  
- **Owner:** webflow-token  
- **Why:** Ship lag is the product; parity across Home/Studio/Desk.  
- **Done when:** `npm run dasha:ship` verify green; meta + live-fast hard=[].  
- **Depends on:** T-001 token.  
- **Do not:** Publish without readback (Codex P0 history).

### T-005 · Keep mint constant single-source discipline
- **Priority:** P0 (ongoing)  
- **Surface:** Trust  
- **Owner:** agent-local  
- **Why:** Multi-copy mint is drift risk; honesty depends on exact CA.  
- **Done when:** Landing/studio/desk/lobby/how-to all show `53uxQtB9…pump`; gates still enforce.  
- **Depends on:** —  
- **Do not:** Invent “verified mint” wording.

### T-006 · Lobby pin / health NFA string stable
- **Priority:** P0 (verify)  
- **Surface:** Lobby · Trust  
- **Owner:** agent-local  
- **Why:** Health pin must stay NFA-honest; recent fires touched pin.  
- **Done when:** `/health` pin includes not-financial-advice posture if audit requires; meta green.  
- **Depends on:** Current audit rules.  
- **Do not:** Market lobby as trading chat.

### T-007 · On-chain / discovery gates stay green
- **Status:** durable identity and routes green 2026-08-09; current soft gaps are Jupiter website/X/VRFD, Phantom verification/About, and Solflare verification plus an incorrect mutable presentation. See [`DASHA-DISCOVERY-INTEGRITY-2026-08-09.md`](DASHA-DISCOVERY-INTEGRITY-2026-08-09.md).  
- **Priority evidence:** Solana Explorer now documents that it aggregates RugCheck, Jupiter, CoinGecko, Solflare, and Bluprynt verification. Prefer the minimal Jupiter identity correction before building a Blink, new wallet flow, or token incentive; those add surface area without observed retention evidence.
- **Priority:** P0 (regression)  
- **Surface:** Trust · Ops  
- **Owner:** agent-local  
- **Why:** LIVE-CONTEXT lists onchain + discovery work; prevent silent drift.  
- **Done when:** `npm run dasha:onchain:check` (if present) and related gates pass on CI/agent runs.  
- **Depends on:** RPC availability.  
- **Do not:** Cache-fake onchain results.

---

## 5. P1 — Culture loop (Studio / Quiz / share)

### T-010 · Verify Studio fast-share path live (PNG warm + no OAuth await)
- **Priority:** P1  
- **Surface:** Studio  
- **Owner:** agent-local  
- **Why:** Web Share research: latency + user-activation kill completion. Disk has warm cache + non-blocking OAuth.  
- **Done when:** Live `studio.js` contains `warmPng` / share without await status; phone smoke Share opens sheet.  
- **Depends on:** Worker deploy current.  
- **Do not:** Re-add `await refreshLinkedHandle` on share click.

### T-011 · Studio “New take” loop remains obvious post-share
- **Priority:** P1  
- **Surface:** Studio  
- **Owner:** agent-local  
- **Why:** Create-again after share compounds content volume.  
- **Done when:** After share, New take / sticky path works on mobile; studio tests green.  
- **Depends on:** T-010.  
- **Do not:** Auto-post to X.

### T-012 · Studio share text always carries remix URL
- **Priority:** P1 (verify)  
- **Surface:** Studio  
- **Owner:** agent-local  
- **Why:** Many share targets drop `url` field; caption must include link (shipped pattern).  
- **Done when:** Tests assert remix in share text; live behavior matches.  
- **Depends on:** —  

### T-013 · Studio first paint / empty-state still never blank
- **Priority:** P1  
- **Surface:** Studio  
- **Owner:** agent-local  
- **Why:** Default photo + captions reduce decision cost.  
- **Done when:** Open Studio → photo renders without interaction; Surprise = new take.  
- **Depends on:** Photo CDN hotlink health (pbs.twimg).  

### T-014 · Fallback library stills if Twitter CDN fails
- **Priority:** P1  
- **Surface:** Studio  
- **Owner:** agent-local  
- **Why:** External image hosts fail silently → blank creative tool.  
- **Done when:** At least one always-on still (self-hosted or wikimedia) if primary fails.  
- **Depends on:** Asset hosting decision.  

### T-020 · Observe quiz+Studio metrics before new scoring
- **Priority:** P1  
- **Surface:** Quiz · Ops  
- **Owner:** observe-first  
- **Why:** Product brief: evidence question only after metrics baseline + real traffic.  
- **Done when:** Documented baseline read (authenticated metrics); no new points systems.  
- **Depends on:** Metrics endpoint live; some traffic.  
- **Do not:** Add referrals / purchase points.

### T-021 · Quiz result native image share stays primary
- **Priority:** P1  
- **Surface:** Quiz  
- **Owner:** agent-local  
- **Why:** Result is the viral unit; PNG + canShare pattern.  
- **Done when:** Board client share uses file share when available; retake keeps quick/deep mode.  
- **Depends on:** Lobby client deploy.  

### T-022 · Quiz invite URL always Quick 10Q
- **Priority:** P1 (verify)  
- **Surface:** Quiz  
- **Owner:** agent-local  
- **Why:** Research: short path for invite traffic.  
- **Done when:** `?quiz=1` → mode quick; board Take → deep; tests cover.  

### T-023 · Quiz result sticky CTAs (Share + Make one)
- **Priority:** P1 (verify)  
- **Surface:** Quiz · Studio  
- **Owner:** agent-local  
- **Why:** Completion → share/create handoff.  
- **Done when:** Mobile sticky after result; buy-sticky doesn’t cover it.  

### T-024 · Quiz → Studio seed handoff remains tailored
- **Priority:** P1  
- **Surface:** Cross  
- **Owner:** agent-local  
- **Why:** Brief: quiz results open Studio seeds; keep lineage in fragment.  
- **Done when:** Result CTA opens Studio with usable line/look; no wallet required.  

### T-025 · Challenge / Beat-this result cards stay shareable
- **Priority:** P1  
- **Surface:** Quiz  
- **Owner:** agent-local  
- **Why:** Permanent result URLs drive re-entry.  
- **Done when:** `/simp/r/*` OG + client challenge flow still pass board tests.  

---

## 6. P1/P2 — Home / Desk / Lobby

### T-030 · Home hero hierarchy: Studio + Quiz before buy noise
- **Priority:** P1  
- **Surface:** Home  
- **Owner:** agent-local (after T-001)  
- **Why:** Culture loop first; buy present but not the only story.  
- **Done when:** Above-fold CTAs include Open Studio + Take quiz; mint reachable.  

### T-031 · Home mint paste-check remains correct
- **Priority:** P1  
- **Surface:** Home · Trust  
- **Owner:** agent-local  
- **Why:** “Is this the mint?” is the anti-scam job.  
- **Done when:** `dasha-landing-mint-check.test.mjs` PASS; live input works.  

### T-032 · Sticky buy doesn’t fight quiz/studio stickies
- **Priority:** P2  
- **Surface:** Home · Quiz · Studio  
- **Owner:** agent-local  
- **Why:** Multiple fixed bars kill completion.  
- **Done when:** Mutually exclusive open states (already partially modeled).  

### T-033 · Desk remains alternate-rails honesty surface
- **Priority:** P1  
- **Surface:** Desk  
- **Owner:** agent-local  
- **Why:** Home simplified to one Jupiter venue; Desk keeps verified alternates.  
- **Done when:** Desk shows exact-mint Pump/Phantom/Raydium/Solscan as designed; no FOMO.  

### T-034 · How-to-buy route publish decision
- **Priority:** P2  
- **Surface:** Desk · Ops  
- **Owner:** webflow-token / product  
- **Why:** How-to exists on disk/Worker; may 404 on www route.  
- **Done when:** Either published route linked from Desk/Home, or deliberately unlinked everywhere.  

### T-035 · How-to mint tap-to-copy remains
- **Priority:** P2  
- **Surface:** Trust  
- **Owner:** agent-local  
- **Why:** One-tap CA copy is table stakes.  
- **Done when:** Live how-to (if routed) copies mint; tests green.  

### T-050 · Lobby empty-state CTAs (Studio + Quiz)
- **Priority:** P1 (verify)  
- **Surface:** Lobby  
- **Owner:** agent-local  
- **Why:** Empty chat needs next step, not dead end.  
- **Done when:** Empty state shows Be first + Open Studio + Take quiz.  

### T-051 · Lobby verify-mint deep link absolute to www
- **Priority:** P1 (verify)  
- **Surface:** Lobby · Trust  
- **Owner:** agent-local  
- **Why:** `#token` on `/lobby` is broken.  
- **Done when:** Pin/link goes to `https://www.getdasha.com/#token`.  

### T-052 · Lobby listener leak / destroy hygiene
- **Priority:** P2 (verify)  
- **Surface:** Lobby  
- **Owner:** agent-local  
- **Why:** Remount leaks hurt long sessions.  
- **Done when:** destroy removes message/keydown listeners; lobby tests pass.  

### T-053 · Lobby HSTS / HTTPS redirect on custom domain
- **Priority:** P2  
- **Surface:** Ops · Trust  
- **Owner:** agent-local / DNS  
- **Why:** LIVE-CONTEXT domain trust notes HTTP gaps.  
- **Done when:** HTTP→HTTPS 308; HSTS present where intended; no mixed content.  

### T-054 · Lobby rate limits / spam shield stay sane
- **Priority:** P2  
- **Surface:** Lobby  
- **Owner:** agent-local  
- **Why:** Public chat without Discord HQ needs caps.  
- **Done when:** Soft caps + auto-shield still enforced in mod tests.  

---

## 7. P2 — SEO, performance, a11y

### T-060 · OG/twitter cards accurate per route
- **Priority:** P2  
- **Surface:** Home · Studio · Desk  
- **Owner:** webflow-token + agent  
- **Why:** Share previews are acquisition.  
- **Done when:** Titles/descriptions match product (no casino title); studio card image loads.  

### T-061 · Sitemap + robots truth
- **Priority:** P2  
- **Surface:** Ops  
- **Owner:** agent-local  
- **Why:** Meta already checks; keep routes complete.  
- **Done when:** sitemap lists home/studio/desk; robots consistent www+lobby.  

### T-062 · Landing under soft budget permanently
- **Priority:** P2  
- **Surface:** Home  
- **Owner:** agent-local  
- **Why:** Webflow ~50k custom-code cap; soft budget warnings.  
- **Done when:** Ship gate soft budget not constantly breached; heavy UI stays on Worker clients.  

### T-063 · Touch targets ≥44px on mobile primary CTAs
- **Priority:** P2  
- **Surface:** Cross  
- **Owner:** agent-local  
- **Why:** Studio/lobby tests already enforce patterns; extend if regressions.  

### T-064 · Reduced-motion / contrast paths
- **Priority:** P3  
- **Surface:** Studio · Home  
- **Owner:** agent-local  
- **Why:** A11y without visual gimmicks.  

---

## 8. P2/P3 — Ops, metrics, OSS

### T-070 · Metrics baseline ops runbook
- **Status:** **DONE 2026-08-09** — `metrics-summary` reports bounded Studio, Quiz, and handoff ratios plus the non-retention interpretation limit; unit test is wired into `dasha:test:lobby`.  
- **Priority:** P2  
- **Surface:** Ops  
- **Owner:** agent-local  
- **Why:** Codex shipped metrics reset/baseline; operators need how-to read.  
- **Done when:** Short doc: how to read Studio+quiz metrics, reset, auth. **Met in `DASHA-LOBBY.md`.**  

### T-071 · Ship order: push/readback before lobby deploy
- **Priority:** P2 (verify)  
- **Surface:** Ops  
- **Owner:** agent-local  
- **Why:** Avoid Worker ahead of www.  
- **Done when:** `dasha-ship.mjs` order remains push→lobby→publish; tests assert.  

### T-072 · Fast ship rejects negative-coin / FOMO / TG
- **Priority:** P2 (regression)  
- **Surface:** Ops · Trust  
- **Owner:** agent-local  
- **Why:** Gate already expanded; keep tests.  

### T-073 · Holder proof rate limits stay
- **Priority:** P2  
- **Surface:** Trust  
- **Owner:** agent-local  
- **Why:** Abuse hardening shipped; don’t regress.  

### T-074 · Creative evidence X-status-only
- **Priority:** P2 (policy)  
- **Surface:** Simp  
- **Owner:** agent-local  
- **Why:** Editable Studio URL is not publication proof.  
- **Done when:** No Studio claim button; claims require X evidence rules.  

### T-080 · OSS demo-first README pitch
- **Priority:** P3  
- **Surface:** OSS  
- **Owner:** human-culture + agent  
- **Why:** Research: stars from 15s demo, not CODEOWNERS theater.  
- **Done when:** Public repo shows Studio GIF + clone path; no fake utility claims.  

### T-081 · Good-first-issues linked from site remain real
- **Priority:** P3  
- **Surface:** OSS  
- **Owner:** human-culture  

---

## 9. PARK — observe-first

### T-090 · Any new Simp scoring axes
- **Priority:** PARK  
- **Why:** Brief: observe opt-in + evidence before new machinery.  

### T-091 · Remix Wall / public gallery of Studio outputs
- **Priority:** PARK  
- **Why:** Needs moderation + provenance policy; X stream discovery deferred.  

### T-092 · PWA install
- **Priority:** PARK  
- **Why:** Explicitly deferred until funnel evidence.  

### T-093 · AI image generation in Studio
- **Priority:** PARK → likely KILL if deps  
- **Why:** Conflicts with single-file no-deps Studio ethos unless later product decision.  

### T-094 · How-to-buy paid ads / tracker campaigns
- **Priority:** PARK  
- **Why:** External promo; not product code.  

### T-095 · Multi-language site
- **Priority:** PARK  

---

## 10. KILL list

| Idea | Why kill |
|------|----------|
| Telegram / Discord as official HQ | Product forbids; scam-adjacent templates |
| FOMO countdown / “last chance” | Honesty + burned cohort research |
| “Safe / verified / official mint” | Trust boundary |
| Thesis cards / conviction receipts / forecasting | Permanently scrapped |
| Post-to-earn / raid bots / InfoFi farming | Policy hostility; sybil trash |
| Purchase points / bag-size rank | Financializes recognition |
| Auto-enroll Simp on OAuth | Consent boundary |
| Second Studio codebase | Drift death |
| Tokenomics / fake utility roadmap page | Not the product |
| Casino chrome / “the casino is open” | Explicitly removed |

---

## 11. Suggested sequences

### Wave 1 — Unblock announce (this week)

1. Human/agent: Webflow re-auth → T-001  
2. Ship Home + Studio (+ Desk if desk lag) → T-002, T-004  
3. Fix assets hash → T-003  
4. Re-run `dasha:audit:live:fast` until hard=[]  

### Wave 2 — Culture loop proof (after traffic)

1. T-010–T-013, T-021–T-024 verify live funnels  
2. T-020 metrics observation notes  
3. T-050–T-051 lobby entry paths  

### Wave 3 — Harden & polish

1. T-014 stills resilience  
2. T-053 HSTS  
3. T-060–T-062 SEO/budget  
4. T-070 metrics runbook  
5. T-080 OSS demo  

### Do not sequence

Anything on KILL or PARK without new evidence + product decision.

---

## 12. Healthy definition

```bash
npm run dasha:meta                    # ok
npm run dasha:audit:live:fast         # hard: []
# After surface edits:
npm run dasha:test:studio
npm run dasha:test:simp
npm run dasha:test:lobby
npm run dasha:test:landing
# Ship when token valid:
npm run dasha:token:check
npm run dasha:ship
```

**Announce-ready** only when live-fast hard is empty and meta ok.

---

## 13. Task index (quick scan)

| ID | Title | Pri | Owner |
|----|-------|-----|--------|
| T-001 | Ship Home via Webflow | P0 | webflow-token |
| T-002 | Ship Studio shell | P0 | webflow-token |
| T-003 | assets-hash-match | P0 | agent-local |
| T-004 | Full three-route ship | P0 | webflow-token |
| T-005 | Mint constant discipline | P0 | agent-local |
| T-006 | Lobby NFA pin | P0 | agent-local |
| T-007 | Onchain gates | P0 | agent-local |
| T-010 | Studio fast-share verify | P1 | agent-local |
| T-011 | New take post-share | P1 | agent-local |
| T-012 | Remix in share text | P1 | agent-local |
| T-013 | Never blank Studio | P1 | agent-local |
| T-014 | Fallback stills | P1 | agent-local |
| T-020 | Observe metrics | P1 | observe-first |
| T-021 | Quiz image share | P1 | agent-local |
| T-022 | Invite = Quick 10Q | P1 | agent-local |
| T-023 | Result sticky CTAs | P1 | agent-local |
| T-024 | Quiz→Studio seed | P1 | agent-local |
| T-025 | Challenge cards | P1 | agent-local |
| T-030 | Home CTA hierarchy | P1 | agent-local |
| T-031 | Mint paste-check | P1 | agent-local |
| T-032 | Sticky bar conflicts | P2 | agent-local |
| T-033 | Desk alternate rails | P1 | agent-local |
| T-034 | How-to route decision | P2 | product |
| T-035 | How-to tap-to-copy | P2 | agent-local |
| T-050 | Lobby empty CTAs | P1 | agent-local |
| T-051 | Lobby mint absolute link | P1 | agent-local |
| T-052 | Lobby destroy hygiene | P2 | agent-local |
| T-053 | Lobby HSTS | P2 | ops |
| T-054 | Lobby spam caps | P2 | agent-local |
| T-060 | OG cards | P2 | mixed |
| T-061 | Sitemap/robots | P2 | agent-local |
| T-062 | Landing budget | P2 | agent-local |
| T-063 | Touch targets | P2 | agent-local |
| T-064 | Reduced motion | P3 | agent-local |
| T-070 | Metrics runbook | P2 | agent-local |
| T-071 | Ship order | P2 | agent-local |
| T-072 | Fast ship honesty | P2 | agent-local |
| T-073 | Holder rate limits | P2 | agent-local |
| T-074 | Creative X-only | P2 | agent-local |
| T-080 | OSS demo README | P3 | mixed |
| T-081 | Good first issues | P3 | human |
| T-090–095 | PARK items | PARK | — |

---

## 14. Prompt artifact

Reusable generator: [`DASHA-TASK-GEN-PROMPT-2026-08-09.md`](DASHA-TASK-GEN-PROMPT-2026-08-09.md)

Re-run after major ships when live hard fails change.

---

*Inventory complete for 2026-08-09. Implementation is separate: start at Wave 1 / T-001.*
