# Directory intent capture — build prompt

## Where this came from

Debate round 2, Codex vs Grok, 2026-08-06.

- **Codex** argued for a published work-sample rubric (5 criteria, human-scored,
  no AI verdict), then conceded: *"with zero transactions, this may be premature
  compliance theater… the real constraint may simply be acquiring and closing the
  first employer brief."*
- **Grok** argued the directory is the only asset with real distribution — useful
  to a founder today with zero trust required — then conceded: *"If founders
  treat the directory as free research and never convert… you've built a public
  jobs atlas that increases their options while leaving Demigod with traffic but
  still zero pairs."*

Grok wins on sequencing, for the same reason it won round 1: a rubric explains a
service nobody has bought. But **Grok's self-refutation is the real design brief**
— free-riding is the failure mode, and the fix is capturing intent at the moment
of highest signal rather than hoping traffic converts later.

Grok's step 1 (promote the directory to top-level nav) is already being done by
another agent. This prompt is **step 2**.

## The build

On directory rows for companies with observed open roles, add one low-friction
action that turns a browsing founder into a brief.

**The insight that keeps it small:** the highest-signal moment is a founder
looking at *their own company's row*, or filtering for the function they are
hiring for. At that instant they have already told us the role and the company.
The action should carry that context, not ask for it again.

## Hard constraints

- **Reuse the existing wizard.** `#startup-modal` / `#startup-hire` already
  collects the brief, already has consent copy, already passes the forms audit.
  Do not build a second form system. Ponytail: rung 2, it is already here.
- **No outbound.** The action opens a form. It does not send, DM, or notify.
  `DEMIGOD-SIMPLE.md`: no auto-DM.
- **No new claim.** The row says a company has N observed open roles on its own
  public board. The action must not imply Demigod represents that company, has a
  relationship with it, or can place there. This is the honesty edge and the
  thing most likely to go wrong.
- **Directory stays useful without it.** If a founder ignores the action, the
  directory is unchanged. No modal on load, no gate, no email wall.
- **One writer.** `demigod-foot-core.js` is being edited by another agent right
  now (v935→v1014 today). Prefer `demigod-startup-atlas-web.js`, which I own from
  this session's work. Check `git diff` before and after.

## What to build, precisely

1. On each company row that has `openRoles > 0`, render one action:
   **"Hiring here? Start a brief"** — a button, not a link, so it cannot be
   confused with the outbound ATS link already on the row.
2. Clicking it opens the existing startup wizard with `company-name` prefilled
   from the row.
3. If the wizard is unavailable (foot-core not loaded, mini-page context), fall
   back to the plain `/hire` route. Never a dead control.
4. The button must be keyboard reachable, have an accessible name that includes
   the company, and meet the 44px touch target the rest of the site holds to.

## Verification

- `node --check demigod-startup-atlas-web.js`
- `node --test demigod-startup-atlas-web.test.mjs` — extend it
- `npm run demigod:verify:source`
- `node demigod-live-honesty-audit.mjs`
- Rendered check over CDP: the button exists on a roles row, is focusable, and
  opening it prefills the company.

**The regression test must be non-vacuous.** Four false test signals turned up in
this session — three stale oracles and one vacuous green. Assert behaviour
(button present only when openRoles > 0; company name carried) and prove the
negative case fails.

## Out of scope

- The work-sample rubric. Codex's argument is good and it is not wrong forever —
  it is wrong *now*, before a single brief exists. Revisit after the first
  accepted brief.
- Email digests / role alerts (Grok's step 3). Those are outbound and need
  their own authorisation and infrastructure.
- Publishing. Disk only unless the current request authorises it.
