# Fable — Ambition Debate: Demigod Internal Tools + Dashboard

## 1. What "ambitious" means when demand is the bottleneck

Ambitious does NOT mean more tools. You have ~50 registry entries and a corruption history longer than your customer list. Every hour spent on tooling is an hour not spent DMing SF founders. So the only honest definition of ambitious here is: **tools that convert founder-hours into outreach-hours**, not tools that convert founder-hours into more tooling. If a feature doesn't either (a) let you trust the site without looking at it, or (b) put a name/DM/reply in front of you faster, it's scope creep wearing a hard-hat. The tragic pattern in your own history: concurrent Grok/Fable sessions "helping" by rewriting foot-core while nobody was closing a pilot. That's not ambition, that's avoidance with a CLI.

## 2. Critique of a full "agent OS"

A full agent OS — continuous loops, watchers, self-healing, multi-agent boards — is exactly the wrong shape for a 1-founder pre-revenue shop. It assumes the bottleneck is execution throughput. It isn't. You've proven, repeatedly, that unattended concurrency is your #1 root cause of incidents (board corruption #2–#5, foot corruption #4–#5, split-brain BOARD_CDN, sustain-cycle minting fake pilots). An agent OS multiplies the number of writers touching shared state while you're not watching. That's not resilience, it's more surface area for the exact failure mode you keep firing memory-writes about. Building an OS is also a status move — it feels like "real infra" — but it optimizes for a metric (autonomy) nobody is paying you for. Nobody buys Demigod because your internal tools run themselves.

## 3. Ambitious-but-survivable architecture (4 components, no more)

1. **Truth** (landed) — the single oracle of "is the live site what I think it is." One command, one boolean, one hash. Nothing else is allowed to claim "verified" without going through it.
2. **Lock** (landed) — mutex on foot-core writes. Non-negotiable: no tool, human or agent, edits canonical JS without holding it. This is the fix for 90% of your incident memory.
3. **Review** (v2.2) — the honesty compiler. Not a linter — a gate that fails builds/publishes when copy/board/gates drift from stated policy (no 48h SLA, seed caps, etc). This should be the ONLY thing allowed to say "safe to ship."
4. **Cockpit** (dash, re-scoped) — not a status TV. One screen, one question answered: "what do I do in the next 10 minutes." Everything else demoted to `bin/dg` subcommands you run on demand.

That's it. Everything else in the 50-tool registry is either a one-off script that should run once and die, or a duplicate of one of these four.

## 4. Ranked 8 features (review + tools + dash)

1. **Truth as sole "green"** — kill every other tool's right to print "PASS." Only `truth.mjs` output can flip a status green anywhere (dash, review, CLI). Stops the "stale green gate" disease outright.
2. **Foot-lock enforced at the OS level, not just app level** — file-permission or fs-watch enforcement, so even a rogue script can't bypass the mutex like sustain-cycle did.
3. **Review as pre-publish honesty gate, wired into `dg publish`** — no publish path that skips it, including CDP/human paste.
4. *(weird/high-leverage)* **GTM-gated tool lockout** — `bin/dg` refuses to run any *editing* tool (foot-core, board writers) if you haven't logged an outreach action (DM/call/reply) in the last N hours. Literally makes the tools enforce the phase-2 priority instead of trusting willpower.
5. **Dashboard collapses to ONE traffic light + ONE next-action string** — no panels, no charts, no "roles: 5" vanity metrics. If it can't be one line, it doesn't belong on the cockpit.
6. *(weird/high-leverage)* **"Diff cost" ledger** — every tool-writer session gets scored: lines churned vs. anything shipped/verified. Surfaces exactly the pattern that caused corruptions #2–#5 (concurrent sessions churning foot-core with nothing to show) before it becomes an incident, not after.
7. **Auto-archive dead scripts** — any `demigod-*.mjs` untouched 14 days moves to `archive/` automatically. Registry shrinks itself instead of growing forever.
8. **Pilot-log as append-only, single-writer, boring** — explicitly NOT agent-run. This is the one place a human types the truth by hand. No auto-mint, no sim, no "logger" agent. Keep it deliberately unambitious.

## 5. What to DELETE / merge

- **Delete**: every `demigod-*-pass.mjs` one-shot script older than its last successful run (ghost-push, drift-fix-pass, master-only-pass, etc. — these are session artifacts, not tools, and there are ~25 of them).
- **Merge**: all "publish variants" (foot-publish, legal-publish, partnerships-publish-pass, ship-head-now, full-ship-pass) into one `dg publish` gated by Review + Truth. Five ways to publish is five ways to bypass the gate.
- **Merge**: nav/forms/route-pages/seo passes into one `dg content-pass` — they're all "edit copy, re-verify," not distinct capabilities.
- **Delete**: sustain-cycle / anything that mints board data automatically. This is the single highest-incident-density piece of code in the whole history. It should not exist in any form.
- **Delete**: the watcher pattern generally (verify-only watchers are fine; auto-publish watchers are not — proven repeatedly).

## 6. Continuous OS vs. trustworthy-on-demand — verdict

**Trustworthy-on-demand wins, decisively.** A solo founder pre-revenue has no team to absorb a 3am corruption; every incident in memory happened because something was running *without a human in the loop deciding to run it*. Continuous systems need continuous attention to supervise — which is the one resource you don't have (that's why demand gen is starved). The right model is: tools are silent until invoked, invocation always passes through Lock + Truth + Review, and the only "always-on" process allowed is a read-only verifier. Autonomy should scale with a track record of clean runs, not be assumed on day one — you already learned this the hard way across 5+ corruption incidents.

## 7. Best 2-week sprint (agents-only build)

- **Days 1–2**: Harden Lock (fs-level enforcement) + wire Truth as the only writer of "green" anywhere in the repo.
- **Days 3–4**: Collapse all publish scripts into one `dg publish`, gated by Review v2.2 + Truth. Delete the rest same-day (git history keeps them).
- **Days 5–6**: Rebuild dash as single traffic-light + next-action cockpit; kill every panel that isn't derived from Truth.
- **Days 7–8**: Ship the GTM-gate lockout (#4) and diff-cost ledger (#6) — the two weird ones, because they're the only features that directly change founder behavior, not just tool correctness.
- **Days 9–10**: Archive sweep — delete/merge per §5, cut registry from ~50 to ~12.
- **Days 11–12**: Adversarial test: try to reproduce corruption #2–#5 against the new architecture (concurrent writer, sim-mint attempt, stale-gate replay). Fix whatever survives.
- **Days 13–14**: Freeze. No new tools for 30 days. Every day of that freeze is a day for DMs, not scripts.

**Bottom line**: the ambitious move isn't a bigger machine, it's a smaller one you can trust without watching — freeing every hour you'd have spent supervising it for the thing that actually grows the business: talking to founders.
