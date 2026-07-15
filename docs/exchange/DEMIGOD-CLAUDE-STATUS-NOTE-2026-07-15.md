# Demigod Website Status (Agent Reference)

**Product:** Webflow talent matching, trydemigod.com. Phase: GTM paused, website-only focus.

## Architecture Layers
- **Canonical JS:** `demigod-foot-core.js` — single source of truth for site JS. Edit only this file (or supporting `demigod-*.mjs` for non-site work).
- **Head:** minimal custom code, FOUC/unhide handling, no OAuth/Supabase (stripped).
- **Footer loader/CDN:** `demigod-footer-loader.html` + CDN publish via `demigod-foot-cdn-publish.mjs`.
- **Board data:** `DEMIGOD-BOARD.json` — honest data only, max 3 seed entries, real=0 until genuine roles exist.
- **Verify gates:** `npm run demigod:verify:source` (+ :all / targeted) — source parse, smoke boot, honesty checks. Must run after every edit.
- **Publish:** Webflow custom-code paste + Publish click is a **human action**. Agents prepare (CDN push, diffs, CDP screenshots) but do not click Publish.

## Recent Product Decisions
- **Home-minimal declutter** (v205): reduced homepage clutter, favicon added.
- **Dual CTA:** hiring-vs-talent split path, one-question ownership framing (WIZ).
- **No auto-DM:** founder outreach is human-sent; no automated DM blast to prospects (demand scripts prepare drafts only).
- **No 48h/SLA promises, no founder names** on live site — copy policy, runtime-scrubbed.
- **Pre-services language:** "pending" copy for Twilio/Stripe/SMS — not live yet.
- **WIZ stepper:** startup + engineer flows, 90day-outcome field required, explicit review step before submit.
- **Game (Eat the Sounds):** archived, do not touch unless explicitly told to reopen.

## What Agents Should NOT Do
- Do not edit JS outside `demigod-foot-core.js` for site behavior.
- Do not click Publish in Webflow — prepare only, human publishes.
- Do not mint board entries, pilots, or receipts from proposals/sims (`sample:false` must reflect real data only).
- Do not send outreach DMs automatically — human sends.
- Do not add 48h/SLA promises, founder names, or overclaimed "live roles hiring now" copy.
- Do not skip verify gates before declaring a change safe.
- Do not trust a "live" claim without a fresh CDP/curl check — CDN hashes have gone stale/mismatched repeatedly.
- Do not touch the game code without explicit "reopen the game" instruction.
