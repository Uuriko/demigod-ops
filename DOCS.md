# Demigod documentation map

This is the **doc of docs** for trydemigod.com and Demigod operations. Use it to find the authoritative document for a task, understand which files are living guidance versus historical evidence, and locate related source, commands, and receipts.

It is a navigation layer, not another source of release state. Run `bin/dg truth` for the current website version and `bin/dg session` for current operational direction.

## Start in 60 seconds

| Need | Open or run |
|------|-------------|
| One-card orientation | [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) |
| Current product state | [`DEMIGOD-COMPRESSED-STATE.md`](DEMIGOD-COMPRESSED-STATE.md) |
| Fresh operational state | `bin/dg session` |
| Disk/CDN/live release truth | `bin/dg truth` |
| Authority and safety rules | [`AGENTS.md`](AGENTS.md) |
| Studio handbook | [`docs/DEMIGOD-HANDBOOK.md`](docs/DEMIGOD-HANDBOOK.md) |
| **Authorized ship** | [`docs/SHIP-AND-CDN.md`](docs/SHIP-AND-CDN.md) |
| **Observed roles pipeline** | [`docs/ROLES-PIPELINE.md`](docs/ROLES-PIPELINE.md) |
| Website workflow | [`DEMIGOD-WORKFLOW.md`](DEMIGOD-WORKFLOW.md) |
| System and command map | [`docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md`](docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md) |

## What wins when documents disagree

Use this precedence order:

1. Current system, developer, user, and applicable `AGENTS.md` instructions.
2. Current executable evidence: `bin/dg truth`, canonical source, tests, and fresh receipts.
3. [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) and [`DEMIGOD-COMPRESSED-STATE.md`](DEMIGOD-COMPRESSED-STATE.md).
4. Living rules and workflows listed in this map.
5. Research, plans, drafts, and dated assessments.
6. `docs/exchange/` history.

Never copy a version, hash, freeze state, queue count, or “live” claim from prose when a command or canonical artifact can answer it.

## Canonical living documents

| Document | Owns | Does not own |
|----------|------|--------------|
| [`AGENTS.md`](AGENTS.md) | Workspace scope, authority, hard stops, agent behavior | Release state |
| [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) | Short daily entry card | Detailed architecture |
| [`DEMIGOD-COMPRESSED-STATE.md`](DEMIGOD-COMPRESSED-STATE.md) | Compact current product/system orientation | Live release identity |
| [`DEMIGOD-AGENTS.md`](DEMIGOD-AGENTS.md) | Expanded Demigod agent rules | Historical strategy |
| [`DEMIGOD-WORKFLOW.md`](DEMIGOD-WORKFLOW.md) | Edit, verify, prepare, and authorized release flow | Product strategy |
| [`docs/DEMIGOD-HANDBOOK.md`](docs/DEMIGOD-HANDBOOK.md) | Product, principles, operating standards, onboarding | Machine-readable state |
| [`docs/DEMIGOD-AGENT-WORKFLOW.md`](docs/DEMIGOD-AGENT-WORKFLOW.md) | Short machine-specific execution loop | Authority beyond `AGENTS.md` |
| [`AGENT-COMMS.md`](AGENT-COMMS.md) | Orca and fallback cross-agent communication | Task authority |
| [`docs/PONYTAIL-AGENTS.md`](docs/PONYTAIL-AGENTS.md) | Minimal-code rules | Product requirements |
| [`docs/process/OPS.md`](docs/process/OPS.md) | One-page operational checklists | Release truth |

Compatibility entry files—`AGENT-SIMPLE.md`, `AGENT-STATE.md`, `AGENT-RULES.md`, and tool-specific pointers—should point to canonical documents instead of duplicating them.

## Documentation by task

### Website, Webflow, and release

| Task | Primary document | Related items |
|------|------------------|---------------|
| Understand runtime and delivery | [`docs/DEMIGOD-WEBSITE-ARCHITECTURE-DIAGRAM.md`](docs/DEMIGOD-WEBSITE-ARCHITECTURE-DIAGRAM.md) | `demigod-foot-core.js`, `demigod-head-styles.css`, `demigod-head-minimal.html`, `demigod-footer-lite.html` |
| Edit and verify the site | [`DEMIGOD-WORKFLOW.md`](DEMIGOD-WORKFLOW.md) | `npm run demigod:verify:source`, `bin/dg ship prepare` |
| **Authorized ship (CDN + Webflow)** | [`docs/SHIP-AND-CDN.md`](docs/SHIP-AND-CDN.md) | `bin/dg ship run`, `demigod-foot-cdn-publish.mjs`, `demigod-cdn-actions-publish.mjs`, `demigod-cm6-paste-publish.mjs` |
| Work through Webflow | [`docs/WEBFLOW-AGENT-PLAYBOOK.md`](docs/WEBFLOW-AGENT-PLAYBOOK.md) | [`docs/WEBFLOW-AGENT-INSTRUCTIONS.md`](docs/WEBFLOW-AGENT-INSTRUCTIONS.md), [`docs/WEBFLOW-EXPERT-GUIDE.md`](docs/WEBFLOW-EXPERT-GUIDE.md) |
| Connect Webflow MCP | [`docs/WEBFLOW-MCP-SETUP.md`](docs/WEBFLOW-MCP-SETUP.md) | `bin/dg webflow connect setup` |
| Public “recently observed roles” | [`docs/ROLES-PIPELINE.md`](docs/ROLES-PIPELINE.md) | `demigod-roles-pipeline.mjs`, `DEMIGOD-PUBLIC-ROLES.json`, foot `#dg-observed-roles` |
| Audit interactions | [`docs/TRYDEMIGOD-INTERACTION-REPAIR-PROMPT-2026-08-04.md`](docs/TRYDEMIGOD-INTERACTION-REPAIR-PROMPT-2026-08-04.md) | `demigod-navigation-audit.mjs`, `demigod-wiz-cdp-playtest.mjs`, `demigod-cdp-mobile-a11y-sweep.mjs` |
| Maintain blog behavior | [`docs/BLOG-SYSTEM.md`](docs/BLOG-SYSTEM.md) | `demigod-blog-sync.mjs`, `demigod-blog-posts.json` |
| Review copy direction | [`docs/SITE-COPY-DRAFT-2026-08-04.md`](docs/SITE-COPY-DRAFT-2026-08-04.md) | Draft only; current source and honesty gates win |

### Product, recruiting, and matching

| Task | Primary document | Related items |
|------|------------------|---------------|
| Understand product and trust model | [`docs/DEMIGOD-HANDBOOK.md`](docs/DEMIGOD-HANDBOOK.md) | [`DEMIGOD-REFERRAL-SIMPLE.md`](DEMIGOD-REFERRAL-SIMPLE.md) |
| Full-service recruiting design | [`docs/DEMIGOD-FULL-SERVICE-RECRUITING-BLUEPRINT.md`](docs/DEMIGOD-FULL-SERVICE-RECRUITING-BLUEPRINT.md) | `bin/dg matches`, dashboard Inbox/Matches |
| Assessment evidence | [`docs/DEMIGOD-ASSESSMENT-METHODS-RESEARCH.md`](docs/DEMIGOD-ASSESSMENT-METHODS-RESEARCH.md) | [`docs/DEMIGOD-TALENT-ENGINEERING-RESEARCH.md`](docs/DEMIGOD-TALENT-ENGINEERING-RESEARCH.md) |
| Referral policy | [`DEMIGOD-REFERRAL-SIMPLE.md`](DEMIGOD-REFERRAL-SIMPLE.md) | `demigod-referrals-mint.test.mjs`, referral ledger/config |
| Real pilot operations | [`demigod-ops/PILOT-LOG.md`](demigod-ops/PILOT-LOG.md) | `demigod-ops/WHITE-GLOVE-ON-REPLY.md`, `demigod-ops/WEEKLY-SCORECARD.md` |

### Events, demand, and startup operations

| Task | Primary document | Related items |
|------|------------------|---------------|
| EventsBot product and safety | [`DEMIGOD-EVENTS-BOT.md`](DEMIGOD-EVENTS-BOT.md) | `docs/events/`, `bin/dg events status` |
| Demand and pilot status | [`docs/process/OPS.md`](docs/process/OPS.md) | `bin/dg demand status`, `bin/dg pilot status` |
| GTM research and scripts | [`docs/gtm/`](docs/gtm/) | Draft-only unless current request authorizes an external action |
| DIE/Clay-like operations | [`DEMIGOD-DIE-BRIEF.md`](DEMIGOD-DIE-BRIEF.md) | [`DEMIGOD-DIE-SPEC.md`](DEMIGOD-DIE-SPEC.md), [`docs/die/WEBAPP-PLAN.md`](docs/die/WEBAPP-PLAN.md), `docs/die/` |
| Local operator workflow | [`docs/DEMIGOD-TOTAL-WORKFLOW-DIAGRAM.md`](docs/DEMIGOD-TOTAL-WORKFLOW-DIAGRAM.md) | [`docs/DEMIGOD-MULTI-AGENT-COORD-DIAGRAM.md`](docs/DEMIGOD-MULTI-AGENT-COORD-DIAGRAM.md) |

### Agents, tools, and machine operation

| Task | Primary document | Related items |
|------|------------------|---------------|
| Agent session workflow | [`docs/DEMIGOD-AGENT-WORKFLOW.md`](docs/DEMIGOD-AGENT-WORKFLOW.md) | `bin/dg session`, [`DEMIGOD-KEEP-WORKING-PROMPT.md`](DEMIGOD-KEEP-WORKING-PROMPT.md) |
| Keep-working / never self-stop | [`DEMIGOD-KEEP-WORKING-PROMPT.md`](DEMIGOD-KEEP-WORKING-PROMPT.md) | `/tmp/dg-busy/KEEP_WORKING`, `demigod-useful-loop.service` |
| **Next-work self-prompt (design+ops)** | [`docs/SELF-PROMPT-NEXT-DESIGN-AND-OPS.md`](docs/SELF-PROMPT-NEXT-DESIGN-AND-OPS.md) | Busy copy: `/tmp/dg-busy/design-track/NEXT-SELF-PROMPT.md` |
| Cross-agent coordination | [`AGENT-COMMS.md`](AGENT-COMMS.md) | Orca first; stateless fallbacks second |
| Tool and resource map | [`docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md`](docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md) | `bin/dg tools`, dashboard Tools |
| Code minimalism | [`docs/PONYTAIL-AGENTS.md`](docs/PONYTAIL-AGENTS.md) | [`docs/PONYTAIL-SETUP.md`](docs/PONYTAIL-SETUP.md) |
| File-access reliability | [`docs/DEMIGOD-AGENT-FILE-ACCESS.md`](docs/DEMIGOD-AGENT-FILE-ACCESS.md) | `docs/agent-file-access.md` is a compatibility pointer |
| Laptop and tab hygiene | [`DEMIGOD-LAPTOP-BLUE-MOON.md`](DEMIGOD-LAPTOP-BLUE-MOON.md) | [`docs/LAPTOP-AND-WORKFLOW-PLAN.md`](docs/LAPTOP-AND-WORKFLOW-PLAN.md), `bin/dg hygiene --prune` |
| GitHub API + CDP (incl. CDN repo) | [`docs/process/GITHUB-CDP-AGENTS.md`](docs/process/GITHUB-CDP-AGENTS.md) | `demigod-github-agent.mjs`, GitHub MCP, `Uuriko/demigod-site-cdn` |

### Research, reviews, and design inputs

| Area | Location | Status |
|------|----------|--------|
| Current research briefs | [`docs/research/`](docs/research/) | Evidence and recommendations; canonical source still wins |
| Dated strategic research | `docs/DEMIGOD-*-RESEARCH*.md` | Dated input, not standing authority |
| Weakness/generalization transfer | [`docs/WEAKNESS-TRANSFER-ASSESSMENT-2026-08-05.md`](docs/WEAKNESS-TRANSFER-ASSESSMENT-2026-08-05.md) | Reasoning research |
| Website inspiration | [`docs/WEBFLOW-INSPO-SITES.md`](docs/WEBFLOW-INSPO-SITES.md) | Inspiration, not a spec |
| Dated audits and recovery | `docs/DEMIGOD-AUDIT-*.md`, [`docs/RECOVERY-2026-08-02.md`](docs/RECOVERY-2026-08-02.md) | Point-in-time evidence |

## Directory map and lifecycle

| Location | Lifecycle | Rule |
|----------|-----------|------|
| Repository root | Canonical entry and cross-system documents | Keep short; no copied release state |
| `docs/` | Living guides, architecture, research, and focused references | Link back here when a new category is added |
| `docs/process/` | Living operational checklists | [`docs/process/OPS.md`](docs/process/OPS.md) wins over expanded checklists |
| `docs/research/` | Research evidence | Date and cite sources; do not silently turn findings into policy |
| `docs/gtm/` | GTM plans and local drafts | External actions remain request-gated |
| `docs/events/` | Events-specific reference | `DEMIGOD-EVENTS-BOT.md` is the primary entry |
| `docs/die/` | DIE/Clay-like design and recovery material | One subsystem, not a separate product |
| `docs/agents/` | Agent-specific supporting material | Root `AGENTS.md` still owns authority |
| `docs/exchange/` | Historical exchanges, postmortems, and handoffs | Archive: search when needed; never preload as current state |
| `demigod-ops/` | Operational logs, call packs, drafts, and scorecards | Reality only; drafts and warm signals are not pilots or sends |
| `/tmp/dg-busy/` | Machine receipts and transient state | Not documentation; current evidence may override prose |
| `audit-shots/` | Rendered visual evidence | Not canonical source; pair with the audit receipt |

## Related source-of-truth artifacts

| Concern | Canonical artifact or command |
|---------|-------------------------------|
| Website behavior | `demigod-foot-core.js` |
| Website styling | `demigod-head-styles.css` |
| Webflow loaders | `demigod-head-minimal.html`, `demigod-footer-lite.html` |
| Release manifest | `DEMIGOD-FOOT-CDN.json` |
| Release truth | `bin/dg truth` → `/tmp/dg-busy/truth.json` |
| Source verification | `npm run demigod:verify:source` |
| Board honesty (matching samples) | `DEMIGOD-BOARD.json`, board-honesty gate — **not** public roles inventory |
| Public observed roles | `DEMIGOD-PUBLIC-ROLES.json` + footer embed; built by `demigod-public-roles.mjs` / roles pipeline |
| Role ledger (ATS first-seen) | `demigod-role-ledger.mjs` + timer; feed via `demigod-roles-feed.mjs` |
| CDN source repo | `Uuriko/demigod-site-cdn` (jsDelivr `@sha/foot-latest.js` + siblings) |
| Sitemap and controls | `demigod-navigation-audit.mjs` → `/tmp/dg-busy/navigation-audit.json` |
| Visual design | `demigod-design-audit.mjs` → `DEMIGOD-DESIGN-AUDIT.json` + `audit-shots/design/` |
| Mobile accessibility | `demigod-cdp-mobile-a11y-sweep.mjs` → `/tmp/dg-busy/mobile-a11y-sweep.json` |
| Wizard behavior | `demigod-wiz-cdp-playtest.mjs` |
| Current work discovery | `node demigod-work-find.mjs` |
| Complete task register | [`docs/DEMIGOD-TASKS.md`](docs/DEMIGOD-TASKS.md) |
| Keep-working flag | `/tmp/dg-busy/KEEP_WORKING` (cleared only when user ends the standing order) |

## Common receipts (not docs)

| Receipt | Meaning |
|---------|---------|
| `/tmp/dg-busy/truth.json` | Last truth oracle |
| `/tmp/dg-busy/ship-prepare.json` / `ship-receipts/` | Ship gates |
| `/tmp/dg-busy/foot-cdn-publish-latest.json` | Last CDN publish attempt |
| `/tmp/dg-busy/cdn-catbox-urls.json` | Catbox staging URLs when `gh` unauth |
| `/tmp/dg-busy/cdn-actions-publish-receipt.json` | Actions/CDN helper outcome |
| `/tmp/dg-busy/roles-pipeline-latest.json` | Last roles pipeline run |
| `/tmp/dg-busy/useful-loop-last.json` | Useful-loop cycle plan/did |

## Documentation maintenance rules

1. Put authority in one document and link to it elsewhere.
2. Do not copy volatile versions, hashes, timestamps, queue counts, or live status into navigation docs.
3. Label documents as living, dated research, draft, receipt, compatibility pointer, or archive.
4. Name dated evidence with `YYYY-MM-DD`; keep living docs undated.
5. Link the canonical source and the command that verifies it.
6. Move historical exchanges under `docs/exchange/`; do not use them as session entry points.
7. Update this map when adding a new living documentation category or changing authority.
8. Prefer repairing or replacing an existing guide over creating a near-duplicate.
9. Keep outbound, publish, form, and money authority in `AGENTS.md`, not scattered workflow prose.
10. Validate links and examples after meaningful documentation changes.
11. Separate **matching inventory** (board samples) from **observed public roles** (ATS first-seen) in every product-facing doc.
12. When a tool path changes (ship CDN, roles pipeline, timers), update the primary guide and this map in the same change when practical.

## How to improve docs further (standing backlog)

| Improvement | Why |
|-------------|-----|
| Keep `DOCS.md` as the only “where do I go?” index | Prevents duplicate maps |
| One living guide per subsystem (`SHIP-AND-CDN`, `ROLES-PIPELINE`, Events, Demand) | Agents find the whole path without archaeology |
| Delete or archive dated “latest” notes from `AGENTS.md` when they contradict truth | Stale autonomy/version prose causes thrash |
| Pair every claim with a command (`bin/dg truth`, verify-source, pipeline selftest) | Docs stay falsifiable |
| Prefer receipts under `/tmp/dg-busy/` over updating prose for “what ran last” | Less drift |
| Research → policy only via explicit product decision, not by aging into the handbook | Honesty |

## Quick routing questions

| Question | Answer |
|----------|--------|
| “What should I read first?” | [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) |
| “What is actually live?” | `bin/dg truth` |
| “Which document has authority?” | [`AGENTS.md`](AGENTS.md) |
| “How does the whole system connect?” | [`docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md`](docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md) |
| “How do I edit and verify the site?” | [`DEMIGOD-WORKFLOW.md`](DEMIGOD-WORKFLOW.md) |
| “What work still needs doing?” | [`docs/DEMIGOD-TASKS.md`](docs/DEMIGOD-TASKS.md) |
| “Where are team checklists?” | [`docs/process/README.md`](docs/process/README.md) |
| “Where are old decisions or postmortems?” | Search `docs/exchange/` |
| “Where are active operational records?” | `demigod-ops/` and canonical machine state |
| “Where are game documents?” | Archived top-level game files; out of Demigod scope unless explicitly reopened |

---

When this map and a dated document disagree, follow the precedence section above and repair the stale link or statement rather than adding another explanation.
