# Lobby / Simp observation (start 2026-08-08)

**Goal:** Watch real opt-in before adding scoring machinery.

## Check cadence

```bash
curl -sS https://lobby.getdasha.com/health | jq .
curl -sS https://lobby.getdasha.com/stats | jq .
curl -sS https://lobby.getdasha.com/simp/board | jq '{editorial: (.editorial|length), measured: (.measured|length)}'
```

## Log (append dated lines)

| When | Health | Capacity notes | Measured rows | Notes |
|------|--------|----------------|---------------|-------|
| 2026-08-08 16:20 UTC | ok=True assets=01c30ca761127c73 | softCap=75 max=80 | 1 | batch pass start |

## Do not add until evidence

Referrals · purchase points · social scrape · token-weighted rank · auto-join on OAuth.
