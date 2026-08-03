# Settlement executed — 2026-07-13

## Landed
| ID | Deliverable | Cmd |
|----|-------------|-----|
| S1 | Hash-gated publish + receipt | `bin/dg-publish-foot` / `node demigod-publish-foot.mjs --dry-run` |
| S2 | PLAN-LEDGER | `bin/dg-plan open` · `DEMIGOD-PLAN-LEDGER.json` |
| S3 | Claim-verifier | `bin/dg-claim-verify --ship --copy-policy --smoke --board` |
| S4 | Warm-25 + DM pack | `docs/gtm/FOUNDERS-WARM-25.md` · `docs/gtm/DM-PACK-TOP.md` |

Also: `bin/dg-start` (brief+ship+lock+claim-verify+open plans), foot-lock, ship-status, dashboard :9878.

## Codex P0s fixed
- Publish lock uses publisher PID
- `--no-upload` refuses disk≠manifest
- CDN fallback verifies remote body sha256
- Manifest sha normalized after cdn-publish
- Claim-verify requires specific flags/claim
- Ledger corrupt-safe + atomic write

## Human unblock (only you)
1. Send Top3: T0 → Hellyeah → Weave (`docs/gtm/DM-PACK-TOP.md` + ready-emails)
2. `node demigod-dm-mark-sent.mjs --name=T0` (etc.)
3. Douglas call prep if still scheduled

## Agent session
```bash
bin/dg-start
```
