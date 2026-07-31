# Demigod — quality loop (audits · bugfix · reviews · simulated users)

**North star:** website + Demigod product quality.  
**Problem this solves:** agents ship features forever without user-test, bugfix, design, or code review.

## Standing rule (all agents)

After a **feature batch** (or when disk/live drift is healthy), run a **quality wave** before inventing more product surface:

```bash
bin/dg-quality pick          # choose next audit by smell
bin/dg-quality once          # run one rotated audit pack
bin/dg-quality once --full   # deeper pack (slower)
bin/dg-quality status
```

**Do not** treat verify:source alone as UX validation.  
**Do** fix P0/P1 findings before the next feature thrash.
**Do** delete bad website copy, dead code, and failed experiments when review says so.
**Do** add pages/form/website copy when it improves founder hire briefs or talent profiles.

## Cadence

| Mode | When |
|------|------|
| Dashboard / CLI | `bin/dg-quality once` when evidence calls for it |
| After ship | agents should `bin/dg-quality once` post-`bin/dg ship` |
| Smell-driven | many foot bumps, zero playtest receipts, thrash without review |
| Manual | any time before a big feature bet |

## Audit catalog (rotate)

| id | Name | What it runs | Fixes belong to |
|----|------|--------------|-----------------|
| Q1 | **Sim-user / harness** | `node demigod-user-test.mjs --quick` | Claude website / Grok gates |
| Q2 | **WIZ CDP playtest** | `node demigod-wiz-cdp-playtest.mjs --local` (if CDP up) else smoke | Claude website |
| Q3 | **Bug review** | `node demigod-review.mjs --bug --json --no-contract` | lane by file |
| Q4 | **Full static review** | `node demigod-review.mjs --json --no-contract` | lane by file |
| Q5 | **Ponytail over-eng** | `node demigod-ponytail.mjs check --json` | whoever owns file |
| Q6 | **Conversion playtest** | `node demigod-conversion-playtest.mjs` if present else smoke | Claude |
| Q7 | **Live smoke + truth** | `bin/dg smoke` + `bin/dg ship status` | Grok gates |
| Q8 | **A11y / forms gate** | `npm run demigod:verify:source` + review-form dry if available | Claude |
### Smell → prefer

| Smell | Prefer |
|-------|--------|
| Feature thrash, no usertest receipt | Q1 Q2 Q6 |
| Timeouts / flaky foot | Q3 Q5 Q7 |
| Dash/tools bloat | Q5 Q4 |
| Just shipped | Q7 Q1 Q2 |
| Copy/SEO only | Q8 Q4 |

## Outputs

| Path | Purpose |
|------|---------|
| `/tmp/dg-busy/coord/quality-last.json` | last wave receipt |
| `/tmp/dg-busy/coord/quality-backlog.json` | open P0/P1 fix items |
| `/tmp/dg-busy/coord/quality-notes/*.md` | wave logs |
| digest **## Quality loop** | agents must read |

## Agent contract after a quality wave

1. Read `quality-last.json` + `quality-backlog.json`.
2. If backlog has **P0/P1**, **fix before new features** (lane-respecting).
3. Write `*-last.json` with `did` including quality fix.
4. Re-run the failed check if you claimed a fix.

## Not a substitute for ship

Quality ≠ publish. After fixes: `bin/dg ship prepare|run|verify` when disk meaningfully leads live.
