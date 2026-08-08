# Trust / scope red-team (disk)

Date: 2026-08-08 · SoR `/home/potter`

| File | Result |
|------|--------|
| dasha-landing.html | clean |
| dasha-how-to-buy.html | clean |
| dasha-meme-studio.html | clean |
| dasha-desk/src/body.html | clean |
| dasha-desk/src/app.js | clean (only *mentions* of raid/referral are ban comments) |
| dasha-desk/config/dasha.json | clean |

Scanned for: dashacommunity telegram, official Dasha, safe token, verified mint, endorsed by, thesis card, conviction receipt, raid FOMO CTAs, buy the dip, referral loops.

Cross-links:
- Home ↔ desk + studio: yes
- Home → /how-to-buy: **no** (correct; route 404 live)
- Desk → /how-to-buy: **no** (correct)
- Studio → desk + home: yes
- How-to-buy → home/studio/desk: yes

Gates: growth + how-to-buy PASS after this check.
