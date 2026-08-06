# Loop iteration CB — make it safe to show a stranger, on a phone, today

## State

```
user need    "i need to be able to show this landing page and website to people asap"
available    live desk (200), localhost:8899, LAN 192.168.12.53:8899, portable 26K file
verified     file:// works — isSecureContext true, crypto.subtle present, tool generates
NOT verified the examples + proves sections at 390px — I rendered them and never looked
known gap    og:image 404s wherever it is not deployed → blank unfurl when pasted
known gap    the portable single file links to a sibling that may not travel with it
blocked      public URL needs the user's authorization
```

## Why this, now

The task changed from "improve the page" to "do not embarrass the user in front of
someone else." Those need different work.

The single most likely way this goes wrong: **someone opens the link on a phone.** That is
how shared links get read. I added two substantial sections in the last iteration —
three example cards and a two-column proves/does-not-prove panel — captured screenshots at
390px, and then read only the desktop one. A two-column grid and a card with a badge and a
button are exactly the constructs that collapse badly at 390. I have caught two scaled-type
failures today by looking, and I skipped looking on the newest thing on the page.

The second way it goes wrong: **the file gets forwarded.** The portable file is genuinely
self-contained for rendering, but it links to `./dasha-conviction-receipt.html`. Emailed on
its own, that link is dead. A dead link on a page whose whole pitch is trustworthiness is a
worse impression than not having the link.

The third is the blank unfurl, which I cannot fully fix without knowing the host — but I
can stop it from being a silent surprise.

## Task 1 — look at the new sections at 390 and fix what is wrong

Read the mobile screenshots I already captured. Specifically check:

- the `.cols` two-column panel — at 390 it should be one column; confirm it actually is
- the `Invalidated` badge next to a heading that wraps — a pill floating onto its own line
  next to a two-line heading looks broken
- the three example cards — the third is taller than the others because it has an outcome
  line; make sure that reads as intentional rather than as a layout bug
- the `Start from this` buttons at 44px min-height against a 390 width
- total page length — the tool must still be reachable without an unreasonable scroll,
  which both agents were explicit about

Fix what is actually wrong. Do not restyle what merely differs from desktop.

## Task 2 — make the portable file self-sufficient

The fallback link is the only thing that breaks when the file travels alone. Decide between:

- pointing it somewhere that always resolves, or
- making it degrade honestly when the sibling is missing, or
- removing it from the portable copy specifically

Prefer the option that keeps ONE file rather than introducing a second variant to maintain
— two copies of a landing page that drift is exactly the problem the drift guards exist to
prevent, and I would be creating a third copy by hand.

Whatever is chosen, the tool itself must keep working from `file://`, which is verified and
must stay verified after the change.

## Task 3 — write the handoff the user actually needs

A short `DASHA-SHOW-THIS.md`: every way to show it right now, what each one is good for,
what to say about which page is which, and the caveats stated plainly so the user is not
surprised in front of an audience.

It must cover the two-page distinction — the Desk is the landing page per the brief, mine
is the tool — because the user showing the wrong one and describing it as the landing page
is a credibility problem, not a technical one.

Short enough to read on a phone while walking into a meeting. If it needs a table of
contents it is too long.

## Task 4 — prepare the publish so it is one command, but do not run it

Publishing is outbound and needs authorization in the request. It has not been given. But
"say the word and it is live in a minute" is only true if the work is already done.

Write the upload as a script that is ready to execute, verify everything it can verify
*without* sending anything — that the file exists, is self-contained, is the right size,
that the tool passes its gates — and stop before the network call. Make the last step
obvious and single.

**Do not upload. Do not post. Do not send.** Preparing is not publishing, and the
distinction has to hold even when the user is in a hurry.

## Task 5 — re-run both gates and confirm nothing regressed

The last iteration added a section, a stylesheet block and a second `<script>`. The second
script is the risky one: the drift guard finds the tool script with
`m.find(x => /receipt-form/.test(x))`, which returns the **first** match, so a script
mentioning that string earlier in the document would be silently compared instead. I
checked this once. Confirm it still holds after any change here.

## Constraints

- No publishing, no upload, no outbound anything.
- Do not touch the drift-guarded tool region.
- Do not create a second hand-maintained copy of the landing page.
- `file://` must still work end to end after Task 2.
- Fix only what is actually broken at 390; different is not broken.
