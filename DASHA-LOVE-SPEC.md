---
status: canonical
canonical_for: dasha-love-spec
title: Dasha Love Spec — plan, self-prompt, build order
updated: 2026-08-12
p0_status: shipped
p0_notes: handoff mint + /h/:id live; Studio prefers handoff URL
p1_status: shipped
p1_notes: Surprise rolls sticker+line; Today ritual; richer handoff OG
p1b_status: disk-ready
p1b_notes: mini look thumbs; pure-JS /h/:id/og.png (async CompressionStream); puppeteer handoff mock; surprise bias; after-share handoff cue; mint rate limit; funnel handoffMints/Opens. Lobby deploy blocked — CF OAuth invalid_grant (bin/dasha-cf-ready).
p1c_status: disk-ready
p1c_notes: look-strip thumbs; photo empty cue; cold-open Today/Surprise invite; keyboard R/T
related:
  - DASHA-PRODUCT-BRIEF.md
  - DASHA-CULTURE-STUDIO-PRODUCT.md
  - DASHA-STUDIO-UI-UX-PLAN.md
---

# Dasha Love Spec

**North-star feeling:** *I made something that looks like us, I shipped it, and someone else got to play.*

**Do not pivot.** Deepen Make → Ship → Return. Token stays optional. No wallet gate on create.

---

## 1. Love moments (acceptance tests)

| # | Moment | Pass when |
|---|--------|-----------|
| L1 | Instant competence | Cold open looks postable without typing (Poster default + canvas text) |
| L2 | One change is mine | Edit line or look → canvas updates; Share still primary |
| L3 | Share works | Native share or X fallthrough delivers image; status honest |
| L4 | Handoff survives the feed | Pasted link has path-based URL with static `og:*` (not fragment-only) |
| L5 | Your turn | Opening handoff shows inbound strip + loads DNA; one edit re-exports |
| L6 | No humiliation | No account/wallet for create; no bag rank; rights carve-out intact |
| L7 | Stay in the joke | After-share: post text + make another + open what they get |

---

## 2. Architecture (hybrid handoff)

```
Studio (local DNA in fragment always)
   │
   ├─ Share / Copy link
   │     mint best-effort → POST /studio/handoff
   │     prefer https://lobby.getdasha.com/h/<id>
   │     fall back to fragment remix URL if offline
   │
   └─ GET /h/<id>
         static HTML + og:title/description/image
         CTA → www.getdasha.com/studio#…DNA…
```

- Store **state only** in Lobby DO (TTL 90d). No local upload bytes.
- OG image v1: existing social card PNG.
- Fragment remains offline source of truth.

---

## 3. Build phases

### Phase P0 — Close the love loop (this build)
1. Worker: mint + GET `/h/:id` OG page + metrics
2. Studio: prefer handoff URL on copy/share/after-open
3. Events: `handoff_mint` (and open counted via page view metric if cheap)
4. Tests: mint validation, OG markers, Studio prefers handoff when API ok
5. Deploy lobby + ship Studio when gates green

### Phase P1 — Craft delight
- Surprise + sticker roll; mini variant thumbs; ritual starter slot
- Edge OG card from line+look (workers-og) — after P0 proves return

### Phase P2 — Belong (optional)
- Seasons as Studio constraints; Board scores make/export only

### Phase P3 — Interop
- OCO polish; pack PRs

---

## 4. Anti-goals

- No quest farm, no buy-to-rank, no AI sludge voice, no full design suite, no social graph as hero.

---

## 5. Self-execution prompt

```
You are shipping Dasha Love Spec P0 against /home/potter (SoR).

Goal: Make → Ship → Return works for strangers.
1) Write/maintain DASHA-LOVE-SPEC.md (done if current).
2) Worker (dasha-lobby-worker.mjs):
   - POST /studio/handoff { look, format, line, photo?, effect?, sticker?, src?, parent? }
     validate enums/lengths; reject local photo blobs; id base64url; store in DO
     studioHandoffs with exp 90d; rate-limit lightly; return { ok, id, url }
   - GET|HEAD /h/:id HTML with escapeHtml, og tags, twitter card, CTA open studio#dna
   - Metrics handoffMints / handoffOpens on studioMetrics
   - Route /h/ and /studio/handoff through LOBBY DO like /studio/event
3) Studio (dasha-meme-studio.html):
   - ensureHandoffUrl() mint best-effort; cache by state sig; fallback remixURL()
   - Share url, X intent url, copy-link, after-open use ensureHandoffUrl when !imageOnly
   - trackStudio('handoff_mint') once per successful mint (extend track allowlist)
4) Tests: smallest relevant; no thesis/receipt language; no remix in visible main.
5) Rebuild embed + assets; publish desk studio; promote worktrees.
6) Deploy lobby with CF token; ship --only=studio when green.
7) Report L1–L7 status honestly.

Ponytail: shortest working path. No new deps. Publication only after verify.
```

---

## 6. P0 implementation notes

- Mirror `/simp/r/` HTML pattern for OG.
- Studio origin must be in ALLOWED_ORIGINS for POST.
- `trackStudio` only fires known events once; add `handoff_mint`.
- Public funnel may expose handoffMints above threshold later.
