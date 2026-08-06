# Loop iteration AK — present-but-empty is not configured

## State

```
site       still held — foot-core written 4 min ago, uncommitted files 129 → 177
found      WEBFLOW_API_TOKEN= is an empty string. It reads as "configured" to
           anything asking whether the key is present, and it silently blocks
           webhook registration — the step I had assigned to the user.
named      "the one honest narrow piece: treat present-but-empty as absent
           wherever credentials are read" — my words yesterday, not yet done
```

## Why this, now

Yesterday I identified exactly one cheap, honest, generalisable fix from the
last-mile audit and then did not do it. Naming a fix and moving on is the habit
I have spent this session correcting in myself, so it gets done now.

The trap is specific and worth stating precisely. `WEBFLOW_API_TOKEN=` is a key
that **exists** with an **empty value**. Every natural way of checking — `'KEY' in
env`, `env.KEY !== undefined`, `grep -q KEY file`, "is it in the .env" — answers
yes. Only `Boolean(value)` or a format check answers no. So the configuration
looks complete, the code proceeds, and the failure surfaces somewhere far away as
a confusing API error, or never surfaces at all.

`demigod-webhook-auth.mjs` already gets this right: `validSecret()` requires a
32–256 char hex string, so an empty or malformed value is treated as absent and
`resolveWebflowWebhookSecrets()` returns `[]`. That is the standard to hold every
other credential read to.

This is the same class as two other errors this session: `git ls-files -o -i`
looking like it covered untracked files when it covered ignored ones, and a
non-hex test secret being silently rejected so a signature test passed while
proving nothing. Absence that presents as presence.

## Task 1 — find every credential and config read

Enumerate where this codebase reads a secret, token, URL, or required setting:

- `process.env.X` for anything credential- or endpoint-shaped
- `.env`-style files under `.config/demigod/`
- JSON receipts consulted for a URL (`DEMIGOD-TUNNEL.json`,
  `DEMIGOD-WEBHOOK-SETUP.json`) — `resolveWebhookPublicUrl` reads both

For each, determine what it does with an **empty string** versus a **missing
key**. Those must be treated the same. Where they are not, that is the finding.

Do not fix blind. Read each call site and decide whether empty-means-absent is
actually correct there — an optional setting with a meaningful empty default is
not a bug, and changing it would be worse than leaving it.

## Task 2 — fix the ones that are genuinely wrong, fail closed

Where empty is currently treated as configured:

- Treat it as absent.
- **Fail closed, loudly, at the point of use** — not by silently substituting a
  default. Silent substitution is how the empty token produced no error anywhere.
- The error must name the file and the key an operator has to fix. "missing
  credential" sends someone hunting; "WEBFLOW_API_TOKEN is empty in
  ~/.config/demigod/webflow.env" does not.

Security constraint: **never widen access**. If a check currently refuses on
missing and would now also refuse on empty, that is correct. Nothing here may make
a path more permissive, and no change may cause something to bind, send, or
authenticate where it previously did not.

## Task 3 — one guard, proven non-vacuous

A single test that asserts empty-string is treated as absent across the credential
readers. Prove it by making one reader accept empty again and watching it go red
with a message naming the reader.

Check the fixture for the degenerate shape first: if the test passes with the fix
reverted, the fixture does not distinguish the cases. That has happened three
times this session — the single-word company keys, the `PER_COMPANY_MAX` rot, and
the non-hex webhook secret — so check it rather than assuming.

## Task 4 — say whether it would have caught the real one

The honest test of this work: would the guard have caught `WEBFLOW_API_TOKEN=`
before it silently blocked webhook registration? If yes, say how. If it only
covers readers that were already correct, say that plainly — a guard that would
have missed the motivating bug is worth much less and should not be reported as
though it closed the hole.

## Constraints

- Never print a secret, a prefix, or a length that narrows one.
- No foot-core, no head, no CSS — held, and the other worker's tree is growing.
- No publishing, no outbound, no Webflow API calls, no money.
- Do not create or populate any credential file. Restoring the token is the
  user's action and remains theirs.
- Read all command output.
