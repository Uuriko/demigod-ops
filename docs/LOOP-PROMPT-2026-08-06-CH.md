# Loop iteration CH — confirm the demo bug, then take getdasha.com as far as I can alone

## State

```
unconfirmed  "Start from this" may dead-end on the required future-only resolution date.
             My verification script crashed before answering. Unknown in BOTH directions.
authorised   "find admin console in webflow for getdasha.com and verify set it up and
             whatever else needs to be done you do all of it don't ask me to decide or
             do anything unless absolutely needed"
unknown      whether getdasha.com is even registered, whether it points anywhere,
             whether Webflow MCP auth is live in this session
committed    b464bb2, gates green, preview serving
```

## Why this order

The demo bug goes first because it is small, it is on the path the user walks in front of
other people, and I told them it was unresolved. Leaving a known-unknown on the demo path
while starting a large new task would be the wrong trade.

Then getdasha.com, which is explicitly authorised and explicitly delegated — "you do all of
it, don't ask me to decide." That instruction removes the usual check-in, so the discipline
has to come from somewhere else: from **not doing things that cannot be undone**, and from
finding out the actual state before changing anything.

## Task 1 — settle the prefill question, in either direction

Click "Start from this", fill only the address, submit, and read `#error` and whether
`#output` unhides. That is the whole test.

The previous attempt crashed inside the harness, not in the page, so I still do not know if
the bug is real. **Do not fix it before reproducing it.** Twice today I have built a fix for
a defect that was not there — the "already-due call" failure turned out to be the tool
behaving correctly and my test being wrong.

If it does fail: prefill a resolution date computed as an **offset from today**, never a
literal. A hardcoded date reintroduces exactly the validation error being fixed the moment
it passes. Match the offset to each example's own language — the one about two weeks of
silence must not resolve tomorrow.

Then re-walk the whole path from cleared storage: click, generate, and confirm the call
appears in "Your calls".

## Task 2 — find out what getdasha.com actually is, before touching anything

Establish, from evidence rather than assumption:

- does the domain resolve, and to what — NS, A/CNAME, and what an HTTP request returns
- is it registered at all, and if so does anything suggest it is the user's
- does Webflow already know about it, and what does the live site currently serve
- is `mcp__webflow__authenticate` usable in this session, or does it need an interactive
  login the user must perform

Every one of those is read-only and each changes what is possible. Do this before forming a
plan — a DNS record pointing somewhere unexpected means a completely different task from an
unconfigured domain.

## Task 3 — do what can be done, and be precise about the line

The authorisation covers setting up the domain. It does **not** stretch to:

- **buying anything.** If the domain is unregistered, purchasing it is money movement and
  needs its own explicit authorisation, "do all of it" notwithstanding. Report the price and
  where, and stop.
- **rewriting the live site's content.** That is grok's lane and the Desk is its product.
  Domain and DNS configuration is not the same as editing the page.
- **anything irreversible I cannot verify first.** Changing a nameserver on a domain that is
  serving something is exactly the class of action to check twice.

Within those, act. Configure, verify, and report what actually changed.

## Task 4 — if it is blocked, produce the exact steps rather than a shrug

The likely outcome is that some part needs a browser login the user must perform. If so,
"do all of it" is best honoured by making their part as small as possible: the exact console,
the exact screen, the exact values to paste, in order.

Not "add a CNAME" — the specific host, the specific target, the specific TTL, and where to
put it for the registrar they actually use.

## Task 5 — say plainly what the domain changes about the rest

The canonical, og:url and og:image on my page are pinned to a Webflow staging origin, and
all three must move together if a real domain arrives. The blank social unfurl is caused by
the OG card not being reachable at that origin.

A working domain is the thing that fixes the unfurl. Note what would need to change and
where, but do not change those tags until the domain actually resolves — pointing them at a
hostname that does not answer is the defect I already fixed once today.

## Constraints

- Reproduce the prefill defect before fixing it.
- Resolution dates as offsets from today, never literals.
- No purchases. No money movement. Report and stop if that is the blocker.
- No edits to `dasha-desk` or to the live page's content.
- Read-only investigation before any change.
- Do not repoint canonical/og tags until the domain resolves.
