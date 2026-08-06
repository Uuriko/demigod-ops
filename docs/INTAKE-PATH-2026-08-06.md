# Intake path — the empty inbox is a disconnected pipeline, not measured demand

Yesterday's funnel audit reported 0 real submissions and framed it as funnel state.
That reading invited a conclusion about demand. This traces the mechanical path
first, and the mechanical answer changes what the 0 means.

## Verdict

**Intake is not connected. The local inbox cannot receive a submission today.**

An empty inbox is therefore not evidence about demand. It is evidence that
nothing delivers to it.

## The path, hop by hop

| Hop | State |
|---|---|
| Live forms | **Working.** Native Webflow forms — `data-wf-page-id`, Turnstile sitekey present on all three (`startup-hire`, `partner-apply`, `jobseeker-form`). They post to Webflow's own form storage. |
| Webflow → webhook | **Not established.** `resolveWebhookPublicUrl()` returns empty from all three of its sources. |
| `DEMIGOD-WEBHOOK-SETUP.json` | **Missing entirely.** |
| `DEMIGOD-TUNNEL.json` | Dated **2026-06-30**, five weeks stale. `webhookUrl: ""`. Records `pid: 159905`, long dead. Its own note reads "Keep this process running; Webflow POSTs…". |
| Receiver process | **Not running.** No `node …webhook` process. Nothing listening on port 9877. |
| Systemd supervision | **None.** No unit for the submissions webhook in `systemd-user/`, unlike the roles pipeline, role ledger, events tick and tab hygiene, which all have one. |
| `demigod-events-tunnel` | `inactive` / `disabled`. |

A cloudflared tunnel *is* running, but it points at `127.0.0.1:3460` — the events
service. Port 9877, which the webhook record names, has nothing on it.

## What this means

The forms accept input and Webflow stores the result. Nothing carries it to
`DEMIGOD-SUBMISSIONS-INBOX.json`. So:

- Any submission made since at least 2026-06-30 would be sitting in **Webflow's
  own form-submissions dashboard**, invisible to every tool in this repo.
- Whether such submissions exist **cannot be determined from this machine** — it
  needs a Webflow login, which is the user's.
- This is the silent failure mode worth fearing: the form renders, validates,
  accepts, and reports success. Nothing about the visitor experience indicates a
  problem, and no audit in this codebase would catch it. The honesty audit reads
  served HTML, axe reads the DOM, the conversion audit reads CTAs. None of them
  submits, and none of them checks arrival.

This predates the 2026-08-02 wipe. The tunnel record's empty `webhookUrl` is from
2026-06-30, so this is not wipe damage — it is a link that was never re-established
after the tunnel died, or never completed.

## The one action that resolves the ambiguity

**Open Webflow → the site → Forms, and look at the submissions list.** That is the
only place the answer can exist, it takes a moment, and it needs a login I do not
have.

- If there are submissions: they have been arriving and nothing routed them. The
  fix is reconnecting the webhook, and there is real demand data waiting.
- If there are none: the funnel really is empty, yesterday's reading holds, and
  the intake path should still be reconnected before any traffic work.

## What reconnecting requires

Stated as a specification, not a recommendation:

1. A stable public URL for the receiver. The current design expects a tunnel; the
   record for it is five weeks stale and its process is gone.
2. `demigod-submissions-webhook.mjs` running and supervised. Every other recurring
   job here has a systemd unit; this one does not, which is why it stays down
   after any restart.
3. The Webflow webhook registered against that URL —
   `demigod-webflow-webhook-setup.mjs` exists for this and writes the
   `DEMIGOD-WEBHOOK-SETUP.json` that is currently missing.
4. The signing secret present so `verifyWebflowWebhook` validates. Token rotation
   after the wipe was flagged and never done, so this needs checking rather than
   assuming.

Steps 1, 3 and 4 need credentials or accounts only the user holds. Step 2 is
mechanical and can be done here once a URL exists.
