# Loop iteration AY — publish, authorised in the current request

## Authorisation

The user's current message says **"publish right now then stop"**. That is the
explicit current-request authorisation the ship spine requires. It is not inherited
from an earlier message and does not extend past this one.

## State going in

```
disk v1060 · live v1019 · +41 versions · lagDebt
prepare    8/8 gates green earlier today
truth      siblings intentional-staged · freeze OFF · lock free
tree       182 uncommitted files — the other worker's redesign SHIPS with this
```

The concern is stated once and then acted on: the build is **disk state**, so
another worker's uncommitted redesign goes live. I have raised this repeatedly and
the user has now said publish. Proceed with the full request.

## Task 1 — pre-flight, and stop if anything is not green

Do not skip straight to `ship run`. In order:

1. `bin/dg truth` — freeze must be OFF, board honesty pass, lock obtainable.
2. `bin/dg ship prepare` — all gates. **If any gate fails, stop and report.** A
   red gate is the system refusing, and overriding it is not what "publish" means.
3. Confirm nothing is mid-write: a foot-core save landing between prepare and paste
   is the one race that can ship a half-written file.

## Task 2 — claim the lock properly

`bin/dg lock claim --owner "$USER" --why ship` and capture the token. The foot lock
exists so two writers cannot paste at once, and another agent has been writing
foot-core all day.

If the lock cannot be claimed, stop — someone else holds it and publishing over
them is exactly what the lock prevents.

## Task 3 — run the spine

```
DEMIGOD_CURRENT_REQUEST_PUBLISH=1 DG_LOCK_TOKEN=… bin/dg ship run
```

prepare → cdn → paste → verify. Read every line of output. Do not redirect
anything the next step depends on — that error has occurred three times today.

## Task 4 — verify against the live site, not against the run's own report

`bin/dg ship verify` and `bin/dg truth --require-match`, then confirm live actually
moved: the live foot version should equal disk, and the lag should collapse to 0.

Then check the two things this publish is expected to carry:

- `/startups` heading now reads "Open roles", not "Recently observed roles" — the
  user's instruction that has been live-broken for days.
- The site still renders. Fetch `/` and one mini-page and confirm HTTP 200 and no
  banned phrases via `demigod-live-honesty-audit`.

## Task 5 — release the lock, then stop

Release the foot lock whether the publish succeeded or failed. Leaving it held
blocks the other worker.

Then stop. The user said "then stop" and means it. Report what shipped, what the
new version is, and anything that failed — no new work, no next iteration.

## Constraints

- Authorisation covers **this publish only**.
- If any gate refuses, stop and report rather than working around it.
- Release the lock in every outcome.
- No other outbound actions — no posts, no messages, no money.
