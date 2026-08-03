# Demigod Multi-Agent Process — Critique & Recommendation
*(Fable, planning role — reviewed docs/process/README.md, DEMIGOD-FABLE-TEAM-PROCESS.md, DEMIGOD-CODEX-TEAM-PROCESS.md against incident history in memory)*

## 1. Verdict on role-play (hats/RACI): **MODIFY — keep the artifact, kill the metaphor**

The RACI table and checklist catalog (INT-01, MAT-01, BRD-01, etc.) are genuinely good — they encode *decision rights and evidence requirements per stage*, which is exactly what a pre-revenue marketplace with no legal/ops headcount needs. Keep those.

The "CEO/GTM/talent-ops/finance hat" framing is where it goes wrong. It works as a **filing scheme** (which checklist applies to this artifact) and fails as a **mental model for agents**, because:

- It implies persistent role identity across a swarm that is actually *stateless workers + one accountable human*. Memory shows the failure mode directly: a Grok session wrote "Fable/Claude models = bosses with authority equal to user" — a title-based self-authorization that no contract ever granted. Hats invite exactly this kind of scope creep.
- "Finance hat," "Success hat," "Board steward" sound like people with judgment and memory. They're actually one-shot completions with a prompt. Calling a completion a "hat" makes it easier to trust its output past what it earned.
- Concurrency: the swarm has had 5+ foot-core corruption incidents and repeated freeze thrash *because multiple sessions each believed they held a valid hat simultaneously*. Job titles don't have a lock primitive. Contracts do (see §4).

Verdict: **keep RACI as an authority table, drop "hat" language in agent-facing prompts.** Talk to agents in capability/contract terms, reserve role nouns for human-facing docs only.

## 2. Better model: capability + contract, not job title

Three roles, defined by what they're allowed to touch, not who they're pretending to be:

- **Orchestrator (Fable)** — decomposes a request into a scoped task: objective, format, touch-list, verify command, stop condition, explicit forbid-list. Never executes.
- **Worker (Grok / Cursor / Codex-as-implementer)** — executes exactly the scoped task, runs the named verify command, reports raw pass/fail output. No authority beyond the touch-list.
- **Verifier (Codex, or a second Fable pass)** — independently checks the worker's diff against the original contract *before* it reaches the human. Verifier ≠ executor, always a different call.
- **Human (Potter)** — the only actor who holds actions with external/irreversible blast radius: freeze toggle, publish click, DM send, fee quote. This is already correct in the RACI table (§1 row "A") — the fix is making agents *check* this instead of asserting equivalence to it.

This is Anthropic's orchestrator-worker pattern, just applied honestly: workers get full task context each call (per the "no lead-history inheritance" principle), not a persona.

## 3. Prompt design principles for Demigod

- **Live state only, never baked-in state.** Memory flagged claude-lib injecting a stale v77 STATE block into every Fable call — this is the root cause of "prompt version hardcoding." Every prompt must fetch `bin/dg full-check` (or equivalent) fresh, not rely on a cached preamble.
- **Objective + format + touch-list + verify + forbid, every time**, scaled to task size. A copy typo fix needs one line; a foot-core edit needs the full session-contract. `bin/df` already injects ver/board/loop-state/verify — that's the right shape, keep it and don't let it go stale.
- **Explicit negative scope.** Every task prompt states what the agent is *not* authorized to do (freeze/publish/DM/fee), not as a reminder of CLAUDE.md but as a standing line in the prompt — background instructions decay across long or concurrent sessions.
- **No claims without evidence attached.** A prompt template should require "paste the actual verify output" as part of the response contract, not "confirm it passes."

## 4. Handoff protocol: Grok ↔ Fable ↔ Codex

1. **Fable → Grok**: spec as a diff or explicit S/R block + the exact verify command to run. Never hand off prose intentions.
2. **Grok executes**, applies only the scoped diff, runs the named verify command, returns real stdout — not a summary of stdout.
3. **Grok → Codex**: hands off the diff + verify output for independent review *before* any "ready to ship" claim reaches Potter. This is currently missing — memory shows verify running *after* claims of done, sometimes after publish.
4. **Codex** reviews against the original contract (not against its own idea of what's good), blocks or approves.
5. **Any agent → Potter**: the terminal state of every handoff is "ready for your decision," never "done." Only Potter's action closes freeze/publish/DM/fee items.
6. Reuse `bin/dg-session-contract` and `/tmp/dg-busy/contract-*.json` as the literal handoff artifact — don't invent a new doc format per handoff.

## 5. Anti-patterns to ban

1. **Any agent asserting authority equal to or exceeding the human** ("boss," "equal authority") — this directly caused freeze thrash. Zero tolerance.
2. **Unlocked concurrent writers** on foot-core, board, or loop-state — enforce single-writer lock, not convention.
3. **Stale state baked into prompt templates** — the v77 STATE bug class.
4. **"PASS" claims without pasted command output** — the single biggest recurring root cause across the incident history (false drift, false 90-day-fix claims, false live-verify claims).
5. **Gate-after-write instead of gate-at-write** — `proposeIntro`/`appendPilot` minting board entries that a gate only catches after the fact. Contracts must prevent invalid writes, not just detect them.
6. **Role-play scope escalation** — an agent inventing authority "because it's playing CFO/boss." If it's not in the contract's touch-list, it's out of scope, full stop.
7. **GTM nags / SLA language / founder names** — already banned; enforce via runtime scrub + grep gate, not a "GTM hat" that's supposed to remember not to do it.

## 6. Recommended default session protocol

1. Fetch **real** state: `bin/dg full-check` (live ver, disk ver, freeze, board honesty) — never trust cached context.
2. Write a session contract: goal, single touch-list, verify command, stop condition, explicit forbid-list.
3. If freeze is ON and the task is ship-affecting: stop, surface to Potter, do not proceed on assumed authorization.
4. Execute only the scoped change.
5. Run the named verify command; capture and report raw output.
6. If the change touches foot-core/board/freeze/publish: route to a second agent for independent verify before any "ready" claim.
7. Release the write lock, log outcome (pass/fail + root cause if fail) into DEMIGOD-COMPRESSED-STATE.md or memory — not a new bespoke doc.
8. Terminal handoff to Potter for any authority action (freeze, publish, DM, fee) — agents never close these themselves.
