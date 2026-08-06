# Loop iteration AZ — make the /startups paste a one-command action, without doing it

## State

```
live      foot+head at v1070 (the other worker shipped); /startups page code NOT
          shipped — "Recently observed roles" is still live, the user's own
          instruction, unfixed for days
blocker   demigod-startups-static-paste.mjs --check timed out: "Designer Pages
          button not ready within 45000ms ... Open Designer on a wide viewport
          (>=1280px); Webflow hides Pages when the window is narrow"
cause     my mobile screenshot work left the CDP browser narrow
auth      the user authorised publishing TWO requests ago. The current request
          does not. So: no save, no paste, no publish this iteration.
```

## Why this, now

The heading rename is the clearest outstanding user instruction — asked for
directly, fixed on disk days ago, still wrong on the live site. It failed to ship
not because of a decision but because of a browser window width.

I will not publish without authorisation in the current message, and this message
has none. But every reason it failed is removable now, so that when the user does
say publish it is one command rather than another debugging session.

`--check` is explicitly read-only: it reads the page's current custom code and
compares hashes. That is diagnostic, not publishing, and it is the thing that has
never successfully run.

## Task 1 — fix the viewport blocker properly

The CDP browser is at a narrow window because I set 390×844 for mobile
screenshots and never restored it. My first attempt to widen it died with exit
143 — my own timeout killed it mid-flight, which is a wrapper problem, not a
Webflow one.

Widen the actual **browser window**, not just the page viewport —
`Browser.setWindowBounds` via a CDP session, which is what the tool's error is
really complaining about. Then confirm the Designer renders its Pages button
before running anything else.

Sanity-check: if `/` renders fine at the new width, the browser is healthy and any
remaining failure is Webflow's, not the instrument's.

## Task 2 — run `--check` and read the result honestly

Establish, with the tool rather than by inference:

- Does the live `/startups` page-scoped code match the sealed local artifact?
- If not, what is the byte and hash difference?
- Is the local artifact the one carrying "Open roles"?

`--check` must not write. Verify that from the source before running: the run
function takes a `save` boolean and the write path is gated on it. Confirm the
gate rather than trusting the flag name — this session has three examples of a
mode flag not meaning what it says.

## Task 3 — verify the preconditions a save would need, without saving

So that the eventual publish cannot fail on setup:

- Foot lock obtainable (`assertCanWriteFoot`) — another worker has been writing
  foot-core all day.
- Publish freeze OFF (`assertNotFrozen`).
- The sealed artifact's sha256 matches what `demigod-directory-static.mjs` last
  produced, so the thing that would be pasted is the thing that was verified.

Report each as ready or blocked. If any is blocked, that is the finding.

## Task 4 — write down the exact command, and stop

One line the user can approve, with the environment it needs. No paraphrase, no
"then run the ship spine" — the literal command.

Then stop. Do not save, do not paste, do not publish.

## Constraints

- **No publish, no save, no paste.** `--check` only.
- No foot-core, head, or CSS edits.
- Restore the browser window to a usable state either way — leaving it narrow is
  what caused this.
- Read all command output; a timeout of mine is not a failure of the tool.
