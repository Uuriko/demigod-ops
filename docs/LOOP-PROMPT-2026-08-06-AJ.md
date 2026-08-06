# Loop iteration AJ — every last mile, not just the one I tripped over

## State

```
found      intake disconnected since ~2026-06-30. Forms fine, Webflow stores the
           submission, nothing carries it to the inbox. Five weeks silent.
receiver   proven working; only a secret + public URL left, both user-side
pattern    no audit here checks ARRIVAL. honesty reads served HTML, axe reads the
           DOM, conversion reads CTAs. All three stay green while nothing lands.
```

## Why this, now

I found the intake break by accident — chasing why the funnel was empty. It had
been broken for five weeks and every gate in this repo was green throughout.

That is not a fact about intake. It is a fact about the **shape** of the failure:
a handoff to an external service where the local side succeeds, the remote side is
never reached, and nothing checks. Any integration with that shape is failing
silently right now and I would not know.

I have never swept for it. One instance found by accident implies others found by
nobody — the same reasoning that made the "audit my own blocked list" and "audit
the user's instructions" iterations pay off.

## Task 1 — enumerate every external handoff

Every point where this system hands work to something outside the machine. From
what is already known, at minimum:

```
Webflow forms      → inbox            KNOWN BROKEN (this week's finding)
Webflow publish    → live site        cdn + paste; truth reports on it
catbox.moe         → asset hosting    7 URLs verified 200 earlier this week
Webflow CMS        → blog             demigod-blog-sync.mjs
events             → ?                demigod-events-tunnel is inactive/disabled
X/Twitter          → staging          collector runs; staging-only by design
HN                 → roles feed       appears to work, roles reach the site
Stripe             → payment          feeCents note literally says "Stripe pending"
email / messaging  → ?                find what exists
```

Complete that list from the repo rather than from this sketch. Look for anything
holding an API key, a webhook URL, a tunnel, an OAuth token, or an outbound HTTP
call.

## Task 2 — for each, answer ONE question: does the far side receive?

Not "is the code correct", not "does the local step succeed". Does the thing on
the other end actually get it?

Classify each into exactly one:

- **Verified working** — with the evidence. A 200 from the remote, a receipt, a
  live artifact that could only exist if the handoff completed.
- **Silently broken** — the local side succeeds and nothing arrives. This is the
  intake shape and it is the one that matters.
- **Never configured** — no credential, no URL, dormant by design or by neglect.
  Say which; "never set up" and "was set up and rotted" are different problems.
- **Cannot verify without the user's accounts** — say precisely what they'd check.

Prefer evidence that could only exist if the far side received. A local log
saying "sent" proves the local side ran, which is exactly the evidence that was
green for five weeks while intake was dead.

## Task 3 — Stripe specifically

`feeCents()` returns a note reading "Stripe pending — invoice is a stub until paid
evidence", and `invoiceStub` refuses to mint a receipt without an evidence path.
That is honest and fail-closed, and it also means **there is no payment path**.

Establish whether Stripe is integrated at all, partially, or not. This matters
beyond plumbing: the funnel cannot reach `paid` without it, so the retention
evidence question from two iterations ago has a second blocker nobody has named.

State it as a fact and a requirement. **No verdict about the business.** Whether
and when to wire payments is entirely the user's call and depends on things I
cannot see.

## Task 4 — the generalisable fix, if one is cheap

If several integrations share the silent-failure shape, the useful output is not
eight separate findings — it is one check that would have caught all of them.

Consider whether a single "last mile" probe belongs in the existing gates: for
each configured integration, is there a cheap positive signal that the far side is
reachable and authorised? Only build it if it can be verified honestly and does
not require credentials I lack. If it cannot, say so and leave the list.

Do not build a monitor that reports green by checking local config. That is the
failure being audited, reimplemented.

## Constraints

- Read-only against every remote. No sends, no posts, no test submissions, no
  charges, no Webflow API writes.
- Never print a secret; presence and shape only.
- No foot-core, no head, no CSS. No publishing.
- Evidence of arrival, not evidence of attempt.
