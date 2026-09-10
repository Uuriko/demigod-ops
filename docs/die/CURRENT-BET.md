# CURRENT-BET — DIE operator desk

Product area for Demigod agents: the **DIE operator desk** (Potter / operators), not founder `/app`.

| Surface | Where |
|---|---|
| Hosted desk | https://app.trydemigod.com |
| Loopback desk | `127.0.0.1:9880` |
| Worker sources | `workers/demigod-die/` |
| Contracts | `docs/die/CONTRACTS.md` |

This desk carries **no people-data**.

## Later

An operator opens one named role on the private desk and sees company + brief checkpoints without leaving Access.

## Next opportunity

The desk is already hosted read-only. Zero Trust / Access is **not** enabled on the Cloudflare account yet.

Need:

1. Enable Access on the Cloudflare account.
2. Access app **DIE** for `app.trydemigod.com` allowing `potter@trydemigod.com`.

`workers/demigod-die/create-die-access-app.sh` POSTs that app once Zero Trust is on. It does not embed secrets.

## Now

H2 hosted read-only is live at `app.trydemigod.com`.

- `/roles`, `/companies`, `/roles/:id` — mutations off.
- Every response carries `x-demigod-die: hosted-read-only`.
- H2.1 public `GET` `/healthz` — no JWT, no app bytes.

After Access: richer read-only role list from public movers / journal. Mutations stay off.

## Notes

Public walk measured. Leftover `/die` → home is **not** this desk.
