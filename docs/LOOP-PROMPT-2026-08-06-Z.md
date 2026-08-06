# Loop iteration Z — audit what visitors actually see, not what is on disk

## State

```
site disk  HELD — foot-core written 3s before the check, lock claimed
live       v1019, published ~5h ago, unchanged since
disk       v1030 — mid-redesign, uncommitted, NOT what anyone is looking at
data plane D1/D2/D3 done; research done; S1-S4 blocked on the redesign
```

## Why this, now

Every iteration this session has audited code, tests, pipelines, or my own
reasoning. None has looked at the live website. The standing goal is
trydemigod.com, and the thing a visitor loads right now is **v1019** — five hours
old, stable, and completely untouched by the redesign in flight.

That makes live the one part of the product I can examine without colliding with
anything. It is also the only surface where a defect is currently costing
something real: disk defects cost nothing until they publish, live defects are
being served to every visitor today.

Four audit tools already exist — `demigod-live-honesty-audit`,
`demigod-conversion-audit`, `demigod-axe-routes`, `demigod-button-audit`. Ponytail
rung 2 for the ninth time: run what exists before writing anything new.

## Task 1 — run the existing audits against live, and read the output

Run each of the four. For each: what did it check, what did it find, and is the
finding real or an artefact of the tool?

Critical discipline, learned expensively this session: **a tool reporting green is
not evidence until I know what it actually checked.** `demigod-sprint-selftest`
sliced between two markers that no longer existed and asserted against `''`.
`partnerFixture` built research and never validated it. Both were green and both
were worthless. For every audit that passes, state in one line what would have to
break for it to fail. If I cannot answer that, the green does not count.

If a tool needs a browser, use Puppeteer — hand-rolled CDP under
`Emulation.setDeviceMetricsOverride` produced four wrong measurements in
iterations L and M. Sanity-check the instrument against a known-good route every
run: if `/` looks broken, the instrument is broken, not the site.

## Task 2 — accessibility is the one most likely to be genuinely broken

`demigod-axe-routes` runs axe against the routes. Accessibility defects are
invisible in every other audit, are the class most likely to have accumulated
silently across many copy edits, and are the class where "we never checked" is the
usual answer.

Report violations by severity with the specific selector and route. Do not
summarise them into a count — a count is not actionable and hides whether the same
violation repeats on twelve routes or twelve distinct problems exist.

Where a violation is real, note whether the fix belongs to foot-core (held, so it
waits) or is pure CSS/markup that the redesign may already be changing. **Do not
fix held files.** Write the finding precisely enough to be applied cold.

## Task 3 — check the claims on the live page against the data behind them

`demigod-live-honesty-audit` exists for exactly this. Demigod's whole positioning
is that its claims are backed. A claim on the live site that the current data
cannot support is the most damaging possible defect for this product specifically
— worse than a broken button, because it undermines the one thing that
differentiates it.

Check especially anything the directory work touched: role counts, company counts,
"recently observed", freshness claims, and the 10% fee statement. If a number is
stated on live, verify it against the ledger and map as they are NOW, not as they
were when the copy was written.

## Task 4 — report defects with a severity the user can act on

Rank by what a visitor loses. For each defect: route, what breaks, who it affects,
whether the fix is blocked by the held redesign, and effort.

If live is clean, say so plainly and do not manufacture findings. "I audited the
live site across four dimensions and found N real defects" is a useful sentence at
any N including zero — but only if the audits genuinely could have failed, which
Task 1 requires establishing.

## Constraints

- **Read-only against live.** No publishing, no CDN upload, no paste. Auditing is
  not publishing and must not become it.
- No foot-core, no head, no CSS — the redesign holds them. Findings only.
- No outbound, no drafts, no money, no contact data.
- Puppeteer for anything rendered; sanity-check the instrument every run.
- Read all command output. Never redirect a command a later step depends on.
