# Loop iteration AQ — close the tabs, and decide the seven inert units

## State

```
site        still held — foot-core and head-styles written 2.5 min ago, 180
            uncommitted files
found       7 unit files systemd has never seen. One of them, tab-hygiene, is a
            direct user request from earlier this session that was never actioned.
user asked  "clost extra tabs" — I have no evidence I ever did it
script      bin/dg-tab-hygiene: skips during ship/paste, skips on publish-freeze,
            no-ops without CDP, keeps one tab per role. Header: "on a timer so
            nobody has to ask."
```

## Why this, now

Yesterday's audit surfaced seven unit files systemd has never seen. One of them
maps directly onto an instruction the user gave me earlier in this session — *close
extra tabs* — which, like the "recently observed roles" heading, I appear never to
have carried out. That heading sat live for days. This has sat undone for the same
reason: nobody checked.

The site is held, publishing is blocked, intake needs the user's accounts. This is
a real, unblocked, explicitly-requested piece of work, and it is small.

## Task 1 — establish the current tab state before touching anything

Check whether CDP Chrome is even running on 127.0.0.1:9223, and if so how many
tabs exist and what they are. Count and categorise; **do not dump full URLs**,
some may be private pages or authenticated sessions.

If Chrome is not running, the script no-ops and there is nothing to close — say so
and move to Task 3 rather than manufacturing work.

## Task 2 — run it once, and verify what it actually did

`bin/dg-tab-hygiene` is guarded, but guards are a claim until tested. Before
running:

- Confirm no ship/paste is in flight — the script's own comment records the one
  real hazard: "it closes custom-code tabs; check no ship/paste in flight first."
  The site is under active edit by another worker, so a Webflow custom-code tab
  may be open and in use. **If a paste could be in progress, do not run it.**
- Check `publish-freeze` state.

Then run it once and report: how many tabs before, how many after, and which
categories were closed. If it closed something that looks like another worker's
in-progress Webflow tab, say so immediately — that is a real harm and outranks the
rest of this prompt.

## Task 3 — decide the timer deliberately, not by default

The script exists to run on a timer "so nobody has to ask." The user asked once.
Installing the timer serves the standing intent; it is also a recurring automated
action against their browser.

Weigh it honestly:

- For: the user asked, the script is guarded, it no-ops when Chrome is absent, and
  it keeps one tab per role rather than closing everything.
- Against: another worker is actively editing the site and may hold Webflow
  custom-code tabs; the in-flight guard is coarse by the author's own admission
  ("ponytail: coarse in-flight guard. If it ever races a paste, widen the guard").

If the guard's coverage cannot be established, prefer running it once now and
leaving the timer uninstalled with a clear statement of what would make it safe.
A recurring job that can close a colleague's working tab is not a small risk.

## Task 4 — triage the other six inert units, without installing any

`busy-rotate`, `cdp`, `dash`, `memguard`, `session-ready`, `power-ac-auto`.

For each: what does it do, what breaks if it never runs, and is it plausibly
retired or plausibly forgotten? Read the unit and its script. Produce a
one-line-per-unit recommendation for the user.

**Install nothing else.** Seven units were never installed and the reason may
simply be that nobody wanted them running. That is the user's call, and a blanket
install is exactly the kind of unrequested change that turns a machine into
something its owner no longer recognises — which is close to what happened here on
2026-08-02.

## Constraints

- No foot-core, no head, no CSS. No publishing, no outbound.
- Do not close a tab that could belong to an in-flight paste.
- No full URLs in output; counts and categories only.
- Install at most one unit, and only if Task 3 concludes it is safe.
- Read all command output.
