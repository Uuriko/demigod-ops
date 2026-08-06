# Loop iteration AR — four bytes of headroom on a file that grows every day

## State

```
static     sf-startups-static.html = 49,996 bytes. Ceiling = 50,000. Headroom 4.
grows      it gained 24 bytes since the last commit even though my heading rename
           SAVED 13 — the directory data is outgrowing the limit on its own
ceiling    Webflow footer/custom-code limit, external and not negotiable
on breach  buildStaticDirectory throws "exceeds the ... Webflow footer ceiling —
           paginate the fallback", and directory-static is an OPTIONAL pipeline
           step, so the pipeline stays green while the fallback stops updating
```

## Why this, now

I found the four-byte headroom two days ago and added a warning at 1,500 bytes.
A warning is not a fix. It fires into a log nobody reads on a step that is allowed
to fail, which is the exact silent-failure shape I have spent five iterations
hunting elsewhere in this repo.

The site is held, publishing is blocked, intake needs the user's accounts. This is
real product work on the main public surface, it is unblocked, and it will break on
its own schedule if left.

What breaks: `/startups` has a crawlable static fallback for visitors and search
engines that arrive before the interactive directory loads. When the build throws,
that fallback silently stops updating and starts aging — it does not disappear, so
nothing looks wrong, it just quietly becomes a stale snapshot of the directory.

## Task 1 — measure where the 50,000 bytes actually go

Do not guess at what to cut. Break the generated file down by section and by
per-row cost:

- How many companies are in the fallback, and what does one row cost in bytes?
- How much is fixed overhead — heading, intro, caveats, structural markup?
- How much is the recent-roles block?
- What fraction is markup versus content? Attribute strings, repeated inline
  styles, and class names repeated 500 times are often the real weight.

State the per-row byte cost. That number determines how many rows a byte saving
buys, and it is the only honest basis for choosing between options.

## Task 2 — choose the cheapest change that preserves crawlable value

The fallback exists so a crawler and a no-JS visitor see real companies and roles.
Any reduction must keep that true. Options to weigh with the numbers from Task 1:

- **Trim markup, keep rows.** If repeated inline styles or redundant attributes
  dominate, removing them buys headroom without dropping a single company. This is
  strictly the best outcome if the numbers support it.
- **Reduce row count.** Fewer companies in the fallback, chosen by a rule that is
  honest and stated — the interactive directory still shows everything. If rows
  are cut, the page must not imply it is showing the full directory.
- **Paginate**, which the error message suggests. Weigh honestly: it means more
  than one Webflow embed and a routing story, and the payoff is only worth it if
  markup trimming cannot buy enough room.

Prefer the option that loses no company. Prefer a smaller diff. If trimming buys
years of headroom, do that and stop.

## Task 3 — do not weaken the ceiling or the honesty

- **Do not raise `DEPLOYABLE_BYTES`.** It is Webflow's limit, not ours. Raising it
  turns a fail-closed guard into a silent truncation at paste time.
- Every honesty claim in the fallback stays. The caveats about board observation,
  "not matching inventory", and provenance are not padding — they are the reason
  this project's claims are defensible, and they are the first thing that looks
  cuttable to someone counting bytes.
- If rows are dropped, say so on the page. A fallback that shows 200 of 2,902
  companies while implying completeness is a false claim, and it is exactly the
  kind this codebase's gates exist to prevent.

## Task 4 — verify with numbers and a proven guard

- Report bytes before and after, and the new headroom in both bytes and
  "days of growth at the observed rate" if that rate can be estimated honestly.
- `demigod-directory-static.mjs --selftest` and the directory tests.
- A test that fails if the fallback silently loses its crawlable content — proven
  non-vacuous by breaking the subject.
- Confirm the existing headroom warning still fires at the right threshold.

## Constraints

- No foot-core, no head, no CSS — held, and `demigod-directory-static.mjs` is the
  file to touch.
- The other worker has 180 uncommitted files; check this file is not among their
  active edits before starting, and stay out of anything they are holding.
- No publishing. The fix reaches visitors only with authorisation.
- Read all command output.
