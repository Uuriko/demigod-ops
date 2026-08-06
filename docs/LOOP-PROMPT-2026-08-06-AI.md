# Loop iteration AI — prove the receiver works, so only the URL is left

## State

```
intake     NOT connected. Forms fine (native Webflow + Turnstile). Everything
           after: no public URL, no DEMIGOD-WEBHOOK-SETUP.json, tunnel record
           five weeks stale with webhookUrl:"", no process, nothing on :9877,
           and no systemd unit — unlike every other recurring job here.
user needs Webflow login to see whether submissions are queued there
```

## Why this, now

Yesterday's spec listed four things reconnection needs. Three require accounts the
user holds. One — supervising the receiver — I said was mechanical and doable here.

Handing someone a four-step task where I have verified none of the steps is weak.
The useful move is to shrink it: prove that everything downstream of the public
URL already works, so the remaining ask is genuinely just "give me a URL and
register the webhook" rather than "reconnect this and hope the rest is intact."

There is also a question that could invalidate the whole plan and should be
answered before the user spends any effort. `demigod-submissions-webhook.mjs`
imports `webhookAuthSafeToBind` and `resolveWebflowWebhookSecrets`. If the signing
secret was a 2026-08-02 casualty, the receiver will refuse to bind even with a
perfect URL, and the user's Webflow work would be wasted. **Check secret readiness
first.**

## Task 1 — secret readiness, without printing anything

Call `webhookAuthReadiness()` / `resolveWebflowWebhookSecrets()` and report only:
present or absent, and how many. **Never echo a secret, a prefix, or a length that
would narrow it.** If a secret is absent, that is the top of the user's list and it
changes the order of their work.

Also determine what the receiver does when secrets are missing — does it refuse to
bind (good, fail closed) or bind and accept unsigned payloads (a security defect
that matters the moment it is exposed to the internet)? `webhookAuthSafeToBind`
suggests the former; verify rather than infer from the name.

## Task 2 — start the receiver in isolation and prove ingestion end to end

Everything here must be isolated from real state:

- `DEMIGOD_BUSY` to a scratch dir and `DEMIGOD_TEST_SCOPE` set to its basename —
  that is the mechanism `demigod-lead-sourcer.test.mjs` already uses, and
  `demigod-intake-smoke-isolation.test.mjs` exists for exactly this.
- **Nothing may write to the real `DEMIGOD-SUBMISSIONS-INBOX.json`.** Verify its
  mtime and byte size before and after and assert they are unchanged. A synthetic
  lead in a store the user reads is worse than an unanswered question.
- Bind to localhost only. Never expose the port.

Then: start it, POST a correctly signed payload shaped like a real Webflow form
submission, and confirm it lands in the ISOLATED inbox with the right shape. Then
POST one with a bad signature and confirm it is rejected. Both directions matter —
a receiver that accepts everything is worse than one that is down.

Stop the process afterwards. Do not leave a listener running.

## Task 3 — supervise it, the way everything else here is supervised

Every other recurring job has a unit in `systemd-user/`: roles pipeline, role
ledger, events tick, tab hygiene, memguard, and the snapshot I added. The
submissions receiver — the one process whose absence loses customer data — has
none. That asymmetry is the reason it stays down after any restart.

Write the unit. Then decide deliberately whether to enable it:

- If secrets are present and it binds cleanly on localhost, enabling is harmless
  and means it survives a reboot.
- If secrets are absent, do NOT enable a service that cannot work — a unit in a
  permanent restart-fail loop is noise that trains people to ignore it. Write it,
  leave it disabled, and say what unblocks it.

Whichever, verify with `systemctl --user`, not by assuming — I shipped
`demigod-backup.timer` as "ready" once and it turned out never to have been
installed at all.

## Task 4 — restate the user's list, shorter

Rewrite the four-step reconnection spec with everything now verified marked as
done, so what is left is only what genuinely needs their accounts. If the list is
still four items, say so. If it is one, say that.

## Constraints

- No writes to real stores. Verify unchanged, do not assume.
- No secret values in any output, ever.
- Localhost binding only. No tunnel, no public exposure, no Webflow API calls.
- No outbound, no drafts, no money.
- No foot-core, no head, no CSS.
- Leave no process running when the iteration ends.
