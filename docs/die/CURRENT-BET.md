# CURRENT-BET — DIE operator desk

Product area for Demigod agents: the **DIE operator desk** (Potter / operators), not founder `/app`.

| Surface | Where |
|---|---|
| Hosted desk | https://app.trydemigod.com |
| Loopback desk | `127.0.0.1:9880` |
| Worker sources | `workers/demigod-die/` |
| Contracts | `docs/die/CONTRACTS.md` |

This desk carries **no people-data**.

## Status

**H3 is live** at `app.trydemigod.com` (`healthz` release `hosted-read-only-h3`). Read-only role list is 21 rows: named OpenAI · Account Director plus 20 public weekly movers (`PUBLIC_MOVERS`). Mutations stay off (`x-demigod-die: hosted-read-only`).

**Access is blocked.** Zero Trust is `not_enabled` on the Cloudflare account. Enable Access, then Access app **DIE** for `app.trydemigod.com` allowing `potter@trydemigod.com`. `workers/demigod-die/create-die-access-app.sh` POSTs that app once Zero Trust is on. It does not embed secrets.

## Later

An operator opens one named role on the private desk and sees company + brief checkpoints without leaving Access.

## Next opportunity

Enable Access on the Cloudflare account (still `not_enabled`), then the DIE Access app.

## Now

H3 hosted read-only is live.

- `/roles`, `/companies`, `/roles/:id` — mutations off.
- Every response carries `x-demigod-die: hosted-read-only`.
- Public `GET` `/healthz` — no JWT, no app bytes, release `hosted-read-only-h3`.
- Behind the JWT shape gate: 21 roles (named brief + public movers). No people-data.

## Notes

Public walk measured. Leftover `/die` → home is **not** this desk.
