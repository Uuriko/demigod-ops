---
status: generated
generated_at: 2026-08-17T20:30:00.000Z
---

# Dasha current state

Prepared on disk 2026-08-17. **Not published.** Live watch canary is still red until Worker/Webflow ship.

| Surface | Disk | Live |
|---|---|---|
| Home | Simp is a door to `/simp` (no board mount). Acid ticker exists JS-off. Footer has `/bounties` `/privacy` `/simp`. No `/graph`. Two Jupiter Buy CTAs (header + mint card). | Still Designer-drifted: board SRI mismatch, `/graph` 404 |
| Studio | Thin loader + CC0 + likeness carve-out | Watch: rights copy gone |
| Bounties | `dasha-bounties.html` + Worker route on dasha-2 (undeployed) | 404 |
| How to buy / FAQ / notes / 404 / privacy | Standalone HTML with canonical + og:url | How-to-buy may be live; others need paste/deploy |
| Sitemap | `/simp` `/chess` `/bounties` `/privacy` | Live sitemap still missing some |
| Faucet | Copy read-back + dest last-4 honesty on disk. Treasury **unfunded** on purpose | Live client lags disk |
| Worker | Root cannot deploy (CF 10074). dasha-2 can. Last deploy wins |

Blocked without current-request publish: remount-or-door live home, studio rights, `/bounties`, lobby `/price`, SRI pins.

Do not fund the faucet. Do not clone Pump.fun GO.
