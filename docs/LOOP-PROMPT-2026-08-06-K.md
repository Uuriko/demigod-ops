# Loop iteration K — the sourcing pipeline is capped by an empty research catalog

## State

```
lock     HELD by codex-head-preconnect-budget (4th consecutive iteration)
suite    537/539 — 2 reds are another agent's dashboard-clean-ui registry work
control  research_seal: no-evidence · export_board_identity_clean · 3 delivery-loop
```

## The causal chain, traced this iteration

Last iteration ended with the lead sourcer producing **one** partner lead
(Replit) under `--startups`. I assumed startups were simply rare in the pool.
They are not. The pool is capped upstream:

```
DEMIGOD-COMPANY-RESEARCH.json  →  "companies": 0   (empty catalog)
        ↓
demigod-recruitai-export.mjs   →  --top 40 succeeds
                                  --top 80  throws "invalid company research source"
                                  --top 200 throws the same
        ↓
export rows                    →  capped at 40, ranked by open-req count
                                  = the 40 largest SF employers
        ↓
demigod-lead-sourcer --startups → almost everything abstains as notStartupSized
                                  1 lead
```

Verified by bisecting `--top`: 40 works, 80 and 200 throw at
`demigod-recruitai-export.mjs:1333`. The catalog itself reports
`{version, researchedAt, companies: []}` — zero entries.

This also explains two standing control-board failures that I had been treating
as unrelated: `research_seal: no-evidence` and the work queue's always-on
`reseal-run` task pointing at `demigod-company-research-benchmark.mjs`. They are
the same root cause.

## A method failure of mine, worth stating

I ran `demigod-recruitai-export.mjs --top 400` last iteration with output
redirected to `/dev/null`, saw the sourcer produce a lead, and concluded the chain
was healthy. The command had **failed**; the 40 rows were stale from an earlier
run. Third time this session I have been misled by not reading output I chose to
suppress. Redirecting stdout on a command whose success I am about to depend on is
the same error class as trusting a source grep over a rendered page.

## Task 1 — establish whether the catalog can be repopulated here

`demigod-company-research-benchmark.mjs` is the producer. Before running it,
determine what it needs:

1. Does it require network access, and specifically Firecrawl? `FIRECRAWL_API_KEY`
   and the `firecrawl` CLI were both wipe casualties — `.env.firecrawl` and
   `.firecrawl-key` are on the list of 37 unrecoverable gitignored files.
2. Does it write `DEMIGOD-COMPANY-RESEARCH.json` directly, or via the reseal queue?
3. Is there a no-network or fixture mode (`--selftest`, `--dry`, `--offline`)?

**If it needs a credential that no longer exists, stop and report that.** That is
a wipe consequence with a named blocker, not a task to force. Do not fabricate
research entries — the catalog feeds an honesty-gated export, and inventing rows
there would be the worst possible place to do it.

## Task 2 — if it cannot be repopulated, make the cap visible

The export currently fails with a bare `{"ok":false,"error":"invalid company
research source"}` when asked for more rows than the empty catalog supports. That
message names the wrong thing: the source is not invalid, it is *empty*, and the
operator has no way to tell those apart.

A better failure states the actual condition and the fix, e.g. the catalog has N
entries and the request needs more, run the benchmark. This is small, honest, and
turns a dead end into a next step. It does not require the catalog to be full.

Verify the improved error with the same bisect (`--top 40` / `--top 80`).

## Task 3 — record the real ceiling

Whatever happens, document in the report:

- the sourcer's true reachable pool today (40 rows, all large employers)
- that `--startups` yielding ~1 lead is a **pipeline cap**, not a scarcity of SF
  startups — the role ledger independently shows 17 startup companies with 150
  aging roles
- that the 17-company list from `report --posted --startups` is currently the
  better target list, because it does not pass through the capped export

That last point matters: I built the `--startups` screen into the sourcer, and the
honest conclusion may be that the *ledger* path is the usable one until the
catalog is restored. Saying so is more useful than defending the newer code.

## Constraints

- **Never fabricate research entries.** The catalog gates an honesty-checked export.
- No foot-core. Lock held for the 4th iteration.
- No publishing, no outbound.
- Read command output before depending on it. No `>/dev/null` on anything whose
  success the next step assumes.
- Scope commits explicitly.
