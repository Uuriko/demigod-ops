# Last-mile audit — every handoff to something outside this machine

The intake break was found by accident and had been silent for five weeks. Its
shape: the local side succeeds, the remote side is never reached, nothing checks.
This sweeps for that shape everywhere else.

Rule applied throughout: **evidence the far side received**, not evidence the
local side ran. A log saying "sent" is exactly the green that held for five weeks
while intake was dead.

| Handoff | State | Evidence |
|---|---|---|
| Webflow forms → inbox | **Silently broken** | no public URL, no setup receipt, receiver not running, no unit. Since ~2026-06-30. |
| **Webflow API** | **Never configured — token is EMPTY** | `WEBFLOW_API_TOKEN=` with no value in `.config/demigod/webflow.env` |
| **Stripe → payment** | **Not integrated at all** | no `api.stripe.com` call, no `new Stripe(`, not in `package.json`. All 24 "stripe" hits are the *company* as a board example, or notes saying pending. |
| Webflow publish → live | **Verified working** | live v1019 published 2026-08-06 10:57Z. Uses CDN upload + CM6 paste over CDP, **not** the API — which is why it still works with an empty token. |
| catbox.moe → assets | **Verified working** | all 7 URLs HTTP 200 with correct content types, 2.4MB total |
| HN/boards → roles feed | **Verified working** | 120 roles, regenerated 12:28 today; those roles render in the directory |
| X/Twitter → staging | **Working, staging-only by design** | 20 captured / 13 kept today. Nothing consumes the staging file, deliberately. |
| Blog sync | **Local check only** | `--check` returns ok/published 1/no issues, but with an empty API token this cannot be CMS-arrival evidence |
| events tunnel | **Inactive, disabled** | `systemctl --user`: inactive / disabled |
| events tick | **Inactive, disabled** | same |
| events bot | Active | process running |
| Email / SMS | **Does not exist** | no nodemailer, smtp, twilio, sendgrid, resend or postmark anywhere |

## The two findings that change the previous plan

**1. The empty Webflow token blocks the step I assigned to the user.**

Yesterday's remaining list ended with "register a public URL —
`demigod-webflow-webhook-setup.mjs` writes the missing setup receipt." That script
needs `WEBFLOW_API_TOKEN`, and the token is an empty string. So webhook
registration is blocked on restoring the token first, which was on the
never-completed rotation list from the 2026-08-02 wipe.

Worth noting the trap: `WEBFLOW_API_TOKEN=` is *present as a key* with an empty
value. Anything checking "is the key configured" sees it and says yes. Only a
check that distinguishes present-and-non-empty from present-and-empty catches it,
and that is the same class of mistake as `git ls-files -o -i` looking like it
covered untracked files.

**2. There is no payment path, so the funnel cannot reach `paid`.**

Two iterations ago I established retention evidence needs a pair reaching `paid`
with a real receipt. `invoiceStub` refuses to mint one without evidence, and
`feeCents` notes "Stripe pending — invoice is a stub until paid evidence". Both
are honest and fail-closed. They also mean the terminal funnel state is
unreachable today, independent of demand.

This is a statement of system state and what a payment path would require. Whether,
when and how to wire payments depends on plans, resources and timing I cannot see,
and is entirely the user's call.

## Why no automated last-mile monitor came out of this

The obvious move is a gate that checks every integration. Every honest version of
that check needs the credential it is checking — and the credentials are the thing
that is missing. A monitor that verifies local config would report green on all
three broken handoffs above, which is precisely the failure being audited,
reimplemented as a gate.

The one cheap and honest piece is narrower: treat **present-but-empty** as absent
wherever credentials are read. `resolveWebflowWebhookSecrets` already does this via
`validSecret`; the Webflow token path does not.
