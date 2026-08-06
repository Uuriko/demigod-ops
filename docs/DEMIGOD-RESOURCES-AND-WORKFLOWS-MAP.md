# Demigod — Resources & Workflows Map

_Living map of the system (agents + CLI + dash + ship/demand). Live commands win._

**Document navigation and authority:** [`DOCS.md`](../DOCS.md). This file maps systems and workflows; `DOCS.md` maps the documentation corpus.

---

## 1. Product spine

```
Founders / talent  →  trydemigod.com (Webflow + custom code)
                         │
                         ├─ HEAD: demigod-head-minimal.html + head styles CDN
                         └─ FOOT: demigod-footer-lite.html → CDN foot JS
                                      └─ demigod-foot-core.js (SoR for site JS)

Submissions / pilots  →  ops (inbox, pairs, demand drafts, pilot log)
Agents                →  research, edit, verify, and publish; ask only for the narrow exceptions in AGENTS.md
```

| Layer | Canonical files | Live |
|-------|-----------------|------|
| Foot JS | `demigod-foot-core.js` | CDN (manifest `DEMIGOD-FOOT-CDN.json`) |
| Footer loader | `demigod-footer-lite.html` | Webflow custom code footer |
| Head | `demigod-head-minimal.html`, `demigod-head-styles.css` | Webflow head + Catbox CSS |
| Board | `DEMIGOD-BOARD.json` + `DEMIGOD-BOARD-HONESTY.json` | Local operations truth |
| Lock | foot-lock | One writer for foot-core |

**Truth oracle:** `bin/dg truth` → `/tmp/dg-busy/truth.json` (disk == CDN == live, board, lock).

---

## 2. Control plane modules (Home)

One cohesion layer: `bin/dg home` · dash `#overview` · `/api/control` · `/tmp/dg-busy/control-plane.json`

| Module | Why | Primary CLI | Dash jobs |
|--------|-----|-------------|-----------|
| **site** | Live foot healthy vs disk | `bin/dg smoke` · `truth` | smoke, truth |
| **events** | SF event lifecycle + public API | `bin/dg events status` | events-outbox-status, events-invite-drain, events-tick |
| **webflow** | CDP, freeze, paste ready | `bin/dg webflow doctor` | webflow, webflow-doctor, tab-prune |
| **match** | Inbox → pairs → intro | `bin/dg matches` | inbox, match-review, auto-propose |
| **review** | Diff policy scan | `bin/dg review` | review, review-bug |
| **hygiene** | Tabs + laptop | `bin/dg hygiene --prune` | hygiene, tab-prune |
| **workloop** | Continuous local audits + draft-only checks | `bin/dg-useful-loop status` | — |
| **ship** | When (not) to mutate CDN/Webflow | freeze status · ship checklist | ship-checklist, verify-source, board-honesty |
| **plans** | Handoffs + multi-agent plans | `bin/dg-handoff` | plan-inbox |
| **orca** | Phone/laptop remote seat | `bin/dg-orca` | up / pair |

**Keyboard (dash):** `g` then `s` Home · `i` Inbox · `m` Matches · `a` Work · `t` Tools · `p` Ship · `f` SF Map. `g` then `r`/`h`/`y`/`w` runs Review/Hygiene/Ponytail/Webflow doctor.

---

## 3. Session workflow (default)

```
bin/dg orient          # 5-line card: green / freeze / NEXT / demand / assertSame
        │
        ▼
   one goal · claim foot lock if editing foot-core
        │
        ▼
   smallest change (Ponytail: YAGNI → reuse → stdlib → min)
        │
        ▼
   npm run demigod:verify:source  (+ honesty / truth as needed)
        │
        ▼
   stop  (or ship path if intentionally releasing)
```

**Authority:** [`AGENTS.md`](../AGENTS.md). Stages are optional workflow labels, not permission gates.

**Ponytail:** compact policy at `docs/PONYTAIL-AGENTS.md`; installed agent skills enforce it.

---

## 4. Ship workflow

Full guide: [`SHIP-AND-CDN.md`](SHIP-AND-CDN.md).

```
bin/dg ship status|prepare|cdn|paste|verify|run
```

| Step | Does | Needs |
|------|------|--------|
| **status** | Facts + readiness | read-only |
| **prepare** | verify-source, honesty, foot-smoke, truth | read-only |
| **cdn** | Upload foot + siblings → manifest/footer pin | foot lock + **current-request publish env** |
| **paste** | CM6 head+foot → Webflow custom code + queue-publish | foot lock + CDP + publish env |
| **verify** | `truth --require-match` | network |
| **run** | prepare → cdn → paste → verify | foot lock + publish env |

**Related:** `demigod-foot-cdn-publish.mjs`, `demigod-cdn-actions-publish.mjs` (catbox + Actions when `gh` unauth), `demigod-cm6-paste-publish.mjs`, `bin/dg lock`.

**Roles surface (disk):** `node demigod-roles-pipeline.mjs` — see [`ROLES-PIPELINE.md`](ROLES-PIPELINE.md). Live embed needs ship/paste.

---

## 5. Demand / pilot workflow (GTM)

```
bin/dg demand status|queue|draft|log|templates
bin/dg pilot status
```

| Action | Behavior |
|--------|----------|
| **status / queue** | Pipeline card → `/tmp/dg-busy/demand-status.json` |
| **draft** | Copy-paste DM pack — **never sends** |
| **send** | Permanently stopped — drafts only; no environment override |
| **pilot** | Warm inbound → pilot OS / log |

Dash: demand chips on Home; jobs `demand`, `pilot`.

---

## 6. Match / submissions workflow

```
Website visitor → Webflow native form → Webflow submission store/email

Local/test intake → submissions inbox → pairs → review → intro draft
```

These are separate today: `DEMIGOD-FOOT-CDN.json` has `webhookUrl: null`, so production Webflow submissions do **not** automatically enter the local inbox.

| Tool | Role |
|------|------|
| `bin/dg-inbox` / job inbox | Redacted submissions queue |
| `bin/dg matches` / match-review | Pair ledger |
| `auto-propose` | Score roles×cands → `DEMIGOD-PAIRS` |
| `demigod-intro-draft.mjs` | Intro draft (gates on status) |
| Board honesty | ≤3 seeds; real receipts only |

---

## 7. Dashboard (ops UI)

**URL:** http://127.0.0.1:9878  
**Binary:** `demigod-agent-dashboard.mjs` · `bin/dg-dash` / `npm run demigod:dash`

| Tab / surface | Purpose |
|---------------|---------|
| Home | Control plane modules + spine + NEXT |
| Inbox | Submissions |
| Matches | Pair queue |
| Work | Agent plans and handoffs |
| Tools | Registry (hot by default; `?all=1` full) + Run jobs |
| Ship | Checklist and release truth |
| SF Map | Private startup atlas + map links |

**Jobs:** `POST /api/jobs?run=<id>` (allowlist in dashboard; mutations require explicit job intent).
**Key APIs:** `/api/status` (includes demand/pilot snapshots), `/api/control`, `/api/truth`, `/api/orient`, `/api/tools`, `/api/jobs`, `/api/webflow`, `/api/matches`, `/api/inbox`, `/api/handoff`, `/api/ship-checklist`, `/api/events`.

**Busy state:** `/tmp/dg-busy/*` (truth, control-plane, demand-status, ship receipts, …).

---

## 8. Tools registry (catalog)

`node demigod-tools-registry.mjs --json` · dash `/api/tools` · `bin/dg tools`

The default API exposes the primary set; `?all=1` exposes the cold catalog. Runnable tools come from the dashboard job allowlist; cold tools are copy-only.

---

## 9. CLI map (`bin/dg …`)

| Family | Verbs |
|--------|--------|
| Orient | `orient`, `unify`, `home`, `status`, `next`, `modules` |
| Truth | `truth`, `live`, `evidence`, `ledger` |
| Ship | `ship prepare`, `freeze`, `lock`, `lock-who` |
| Webflow | `webflow`, `doctor` (via modules) |
| Demand | `demand`, `pilot` |
| Match | `matches`, `inbox`, `pairs` |
| Review | `review`, `review-bug`, `review-fix` |
| Hygiene | `hygiene` |
| Orca | `orca` |
| Meta | `tools`, `full-check`, `cockpit`, `usertest`, `handoff`, `start` |

Thin wrappers remain only where they protect a distinct runtime or safety boundary.

**npm:** low-level `demigod:*` checks remain in `package.json`; prefer `bin/dg` entrypoints when they exist.

---

## 10. Agent & automation resources

| Resource | Role |
|----------|------|
| `AGENTS.md` | Sole project policy; compatibility files only point here |
| `.cursor/rules/demigod.mdc` + `ponytail.mdc` | Cursor pointers |
| Ponytail plugin | Claude Code + Codex |
| `bin/df` / Fable | Plan / review with fresh disk truth |
| Claude / Grok | Advisory review via `ask-claude` / `grok-ask` |
| CDP Chrome `:9223` | Designer, custom-code, live audits |
| `demigod-useful-loop` | One durable, bounded background work loop |
| Orca | Primary Claude ↔ Codex messaging, tracked tasks, and worktrees |

---

## 11. External systems

| System | Use |
|--------|-----|
| **Webflow** | Hosting, Designer, custom code, forms, publish |
| **CDN** | Foot/head JS/CSS (jsDelivr / statically gist / catbox fallbacks) |
| **trydemigod.com** | Production |
| **talentlink-sf.webflow.io** | Staging |
| **Email** | hello@ (live); forms → inbox |
| **Twilio / Stripe** | Pre-services — “pending” language only until real |
| **GitHub** | Source + optional CDN source for foot |

---

## 12. Canonical docs (start here)

| Doc | Use |
|-----|-----|
| `DOCS.md` | Documentation authority, task routing, lifecycle, and archives |
| `DEMIGOD-SIMPLE.md` | Day card |
| `DEMIGOD-COMPRESSED-STATE.md` | Living state |
| `DEMIGOD-AGENTS.md` | Full agent rules |
| `DEMIGOD-WORKFLOW.md` | Edit → verify → publish |
| `docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md` | **This map** |
| `docs/PONYTAIL-SETUP.md` | Ponytail install + dash integration |
| `docs/process/README.md` | Team process OS / RACI |
| `docs/exchange/*` | Session exchanges, postmortems |

---

## 13. One-page diagram

```
                    ┌─────────────────┐
                    │  bin/dg orient  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   ┌──────────┐        ┌──────────┐        ┌──────────┐
   │  Truth   │        │ Control  │        │  Demand  │
   │  oracle  │◄──────►│  plane   │◄──────►│  pilot   │
   └────┬─────┘        └────┬─────┘        └────┬─────┘
        │                   │                   │
        │            ┌──────┴──────┐            │
        │            │ Dash :9878  │            │
        │            │ modules+jobs│            │
        │            └──────┬──────┘            │
        ▼                   ▼                   ▼
   Site CDN/live      Webflow CDP          Inbox/pairs
        │                   │
        └────────┬──────────┘
                 ▼
          Ship: prepare→cdn→paste→verify
                 │
                 ▼
          Freeze · Lock · Evidence seals
```

---

## 14. Quick “where do I…?”

| Goal | Go here |
|------|---------|
| Session start | `bin/dg orient` |
| Is live shipped? | `bin/dg truth` |
| Edit foot JS | lock claim → `demigod-foot-core.js` → verify → ship path |
| Publish to live | freeze off + lock → `bin/dg ship run` (or cdn/paste pieces) |
| Laptop tabs | `bin/dg hygiene --prune` |
| Agent coding style | `docs/PONYTAIL-AGENTS.md` |
| DM drafts | `bin/dg demand draft` (no send) |
| Form submissions | dash Inbox / `bin/dg-inbox` |
| Multi-agent plan | Fable `bin/df` · Work tab · handoff |
| Remote phone | `bin/dg-orca` |
| Full catalog | `bin/dg tools` or `/api/tools?all=1` |
