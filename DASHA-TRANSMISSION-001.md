---
status: working
owner: transmission-001
created: 2026-08-11
authority: DASHA-ROADMAP.md
---

# Transmission 001 — local runbook

## Prompt and starter

**Instruction:** `make me an alibi.`

**Prepared starter:**
[`At 11:47 PM, I was…`](https://www.getdasha.com/studio#look=ticket&format=story&line=At+11%3A47+PM%2C+I+was%E2%80%A6&src=transmission-001)

The sentence is deliberately unfinished. The participant changes the line, exports the image and
keeps the editable Studio link when sharing it. This uses the existing fragment grammar; there is no
new route, account, upload service or reward.

## Seven-day contract

- A distinct person is one normalized public-reply author handle. Count only that handle's first
  submission; later replies from it are return/remix evidence, not another person.
- A submitted response is a reply under the original post containing an image or Studio link. A
  material response has Relay Lab `material_edit: true` against the prepared starter and is not only
  whitespace or punctuation changed in the line. An editable handoff also includes a Relay-valid
  child Studio URL. These are separate counts.
- Acknowledge each person's first submitted response with a project public-reply URL by the end of
  the next calendar day in `America/Los_Angeles`, measured from the submission reply timestamp.
- Freeze the operator roster below before launch. Every reply from a listed handle is always an
  `operator-example` and excluded from every gate count.
- Do not award Simp Points, token rewards or referral credit for participation in this test.
- Stop below two submitted non-operator artifacts after the original post has remained live for the
  full seven-day window and has either a non-zero attributed-open delta or one non-operator reply.
- Adapt once only when at least two credible non-operator attempts fail at the same ledger-coded
  step: `open`, `edit`, `export`, `reply-with-link`, or `ack`. Continue without claiming G2 when at
  least two submissions exist, the window remains open, and neither the adapt nor G2 rule is met.

### Operator roster — launch gate

No launch while either field is blank.

| Role | Public handles excluded from gate counts |
|---|---|
| Original-post publisher | `[record before launch]` |
| Other project-controlled accounts | `[record before launch, or write none]` |

## Submission and observation path

The single submission path is a **public reply to the authorized original Transmission post**. The
post URL is recorded at launch; no DM, form, account, wallet or second intake channel is introduced.
The reply asks for the exported image and its editable `getdasha.com/studio#…` link. A quote-post can
be public evidence only when its URL is also replied under the original post, keeping one review
queue.

Before the post is sent, capture the authenticated aggregate baseline from the Worker tree:

```bash
LOBBY_MOD_SECRET=… npm run dasha:studio:metrics:summary
```

Capture the same output at close. The `sources.transmission001` delta proves attributed Studio opens;
it does not prove distinct people, exports or valid submissions. Public replies and the manual ledger
own those claims. G2 never uses metrics alone. Never reset shared metrics for this experiment.

For each reply, compare the prepared starter and returned editable link in
[`dasha-relay-lab.html`](dasha-relay-lab.html). Copy its `dasha-relay-observation/v0` result into the
review notes. This reuses the existing bounded grammar and material-change check instead of creating
a second evaluator.

## Manual review ledger

Leave rows empty until real submissions exist.

| Received (PT) | Author handle | Public reply | Failed step | Relay observation | Editable link | Permission/source confirmed | Acknowledgement reply | Return/remix evidence | Tier/decision |
|---|---|---|---|---|---|---|---|---|---|

Normalize the public handle case-insensitively for dedupe. Do not copy wallet, balance, payment or
private-message data into the ledger.

Review tiers are `submitted`, `material`, `editable-handoff`, `invalid`, or `operator-example`.
`material` includes `submitted`; `editable-handoff` includes both. Missing editability can count only
as `submitted`. The G2 mapping is at least five submitted responses from distinct non-operators, at
least three material responses, at least one editable handoff, and at least one return, remix or
request for another. A like or automated reaction is not an acknowledgement.

Return/remix/request evidence is bounded as follows: a return is a second public reply from the same
handle during the window; a remix is a later material child URL derived from the starter or another
participant's public editable URL; a request is an explicit public request for another prompt.

## Closing record template

Publish no closing record unless real participation exists.

```text
Transmission 001 — make me an alibi.
Window: [start]–[end]
Original post: [URL]
Baseline timestamp / sources.transmission001: [timestamp] / [n]
Close timestamp / sources.transmission001: [timestamp] / [n]
Attributed-open delta: [n — reach only, not people or conversion]
Distinct non-operator submissions: [n]
Materially changed artifacts: [n]
Editable handoffs preserved: [n]
Returns/remixes/requests for another: [n]
Acknowledgements completed on time: [n]/[n]
Decision: continue | adapt once | stop
Decision evidence: [thresholds and any repeated failed step]
Selected public responses: [links, only with permission]
```

## Prepared distribution variants

These are drafts, not posted messages.

1. `make me an alibi. change one thing, save it, then reply with the image + editable link. [starter]`
2. `11:47 PM. one unfinished story. finish the alibi, then reply with your image + editable link: [starter]`
3. `the image is not the object. change the alibi and reply with both the image and editable link: [starter]`

Select exactly one original-post variant for the seven-day window. Keep the others unposted unless a
later authorized adapt run selects one replacement. Do not repeat-link spam, imply endorsement,
mention price performance or manufacture participation. The selected post should add one short
boundary: stay transformative; no endorsement/price claim or private media without permission.
