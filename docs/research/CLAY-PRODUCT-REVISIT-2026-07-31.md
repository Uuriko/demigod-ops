# Clay product revisit (2026-07-31)

**Purpose:** Refresh what Clay is *now* vs Demigod DIE / company-research posture.  
**Sources:** clay.com (home, claygent, pricing), Account Research Agents blog (2026-07-22), existing `docs/die/research/COMPETITIVE-LANDSCAPE.md`, `DEMIGOD-DIE-BRIEF.md`, `docs/die/CLAY-DIE-MULTI-AGENT.md`.  
**Not a decision to buy Clay or clone it.**

---

## 1. What Clay claims to be in mid-2026

**Positioning (homepage):** *“Infrastructure to get any data, run agentic workflows, and launch GTM plays.”* Not “spreadsheet enrichment” — **GTM operating system / orchestration layer**.

**Social proof they put on site:** Stripe, Figma, OpenAI, Anthropic, Intercom (+140% outbound pipeline), Vanta (80%+ enrichment), Rippling, Verkada, Canva, Cursor, HubSpot, Notion, etc.  
**Company scale signals:** ~$100M ARR (blog), employee tender at **$5B** valuation (NYT DealBook / Clay press, Jan 2026), Sculpt GTM conference Oct 8 2026 SF.

### Product surface map

| Layer | Clay product | Job |
|-------|--------------|-----|
| **Data** | Marketplace **150–200+ providers**, waterfall enrichment | Max coverage on emails/phones/firmographics; multi-provider until hit |
| **AI research** | **Claygent** (table agents) | On-demand web research, structured columns, reasoning traces, prompt test/rollback |
| **Always-on research** | **Account Research Agents** (open beta Jul 22 2026) | Segment-wide persistent account memory over **Audiences**; write auditable fields; human-approved CRM/DWH writes |
| **Data layer** | **Audiences** | Unlimited search (paid); CRM + warehouse + signals unified; no 50k table ceiling for big plays |
| **Signals** | Job change, promo, hire, news, social; web intent (Growth+) | Trigger timing for outbound |
| **Orchestration** | Tables, functions, Sculptor, HTTP APIs, webhooks | Encode GTM logic once; reuse across plays |
| **Execution** | Sequencer + email integrations, **Ads** sync (LinkedIn/Meta/Google) | Message and paid media, not just research |
| **Agent interface** | **Clay MCP**, Claude connector, Codex MCP, agent plugin API/CLI | Reps call Ops-built workflows from AI tools |
| **People surface** | University, templates, experts, GTME job board, community | Ecosystem lock-in |

### Claygent vs Account Research Agents (Clay’s own table)

| | Claygent (tables) | Account Research Agents (Audiences) |
|--|-------------------|-------------------------------------|
| Runs on | Single row/cell | Every account in a segment |
| Memory | Stateless one-shot | Persistent; tracks change |
| CRM write | Manual config | Automatic, **human-approved** |
| Cadence | On-demand / fixed schedule | Segment-dependent dynamic |
| Data sources | Per-field config | Defaults to full Audience context (CRM, Gong, email, DWH, enrich, signals) |
| Best for | Lookups (LinkedIn URL, industry tag) | Book-of-business intelligence (PQA expansion, closed-lost, health, rep ramp) |
| Plans | All tiers | Launch / Growth / Enterprise (not Free) |

**Use cases ARA advertises:** product-qualified expansion, closed-lost re-engage, account health/churn risk, rep onboarding with relationship history.

### Pricing (public self-serve, Mar 2026 restructure)

| Plan | ~List | Credits sketch | Notable unlocks |
|------|-------|----------------|-----------------|
| **Free** | $0 | 100 data credits/mo, 500 actions/mo | Unlimited seats/tables, waterfalls, Claygent, sequencer; **200 rows/table** |
| **Launch** | ~$167–185/mo | From ~2.5k data / 15k actions | Phone, signals, email campaign integrations, larger tables, **ARA**, Audiences search |
| **Growth** | ~$446–495/mo | From ~6k data / 40k actions | CRM auto-sync, warehouse, HTTP API, webhooks, web intent, 1 ads audience |
| **Enterprise** | Custom | Custom | Unlimited ads audiences/imports, SSO, RBAC, dedicated strategist, bulk enrich add-ons |

**Economics notes (public + third-party 2026 writeups):**
- Split meter: **Data Credits** (provider lookups; AI may be fixed or token-variable for frontier models) + **Actions** (workflow/AI prompt ticks).
- Variable AI: Clay says no markup on some frontier token models; native models fixed credits.
- Third parties claim real annual cost for mid teams often **far above list** once credits + Sales Nav + seats scale (treat as directional, not audited).
- Credits generally **don’t roll** on standard plans (industry reporting).

### Adjacent launches worth knowing
- **Open-weight models in Claygent** (Jul 2026) — cost control for long agents.  
- **MCP for reps** (Claude, Codex) — Ops builds, reps consume in chat.  
- **Agent plugin / API & CLI** — “build on Clay from coding agents.”  
- **How Clay uses Clay for recruiting** (May 2026 blog) — they dogfood Clay for **talent sourcing**, not only sales (relevant peer for Demigod).  
- **TAM sourcing** continuous find of accounts at scale.

---

## 2. What this means for Demigod (revisit DIE)

### Still true (do not reverse without product decision)

From DIE brief + multi-agent atlas:

1. **Clay clone is a permanent non-goal** (recipe marketplace, public research SaaS, full GTM sequencer, people email waterfalls as product).  
2. Demigod product center is **two-sided SF talent match** (consent, mutual yes, 10% hire fee) — not outbound GTM OS.  
3. “Always-on account research” alone is **not** a moat — Clay ARA + Common Room etc. already own that narrative.  
4. Allowed DIE enrichment: **attributable public** company/role facts. Forbidden: guessed phones/emails as product, login-gated scrape, brokered people data, auto-DM.

### Where Clay still *wins* and Demigod should not compete

| Clay strength | Demigod response |
|---------------|------------------|
| 150–200 providers + waterfalls | Buy or skip; don’t rebuild marketplace |
| Sequencer + ads + CRM write loops | Out of scope (email friend / drafts-only policy) |
| Audiences unlimited TAM plays | Not the product; SF map + role ledger is narrower |
| GTM engineer ecosystem | Different buyer; we sell founders + candidates |
| Credit-funded breadth at sales scale | Our cost center is match quality + ops time |

### Where Demigod can still differentiate (if built carefully)

| Differentiator | Why Clay doesn’t own it |
|----------------|-------------------------|
| **Role-first + candidate-consent workflow** | Clay optimizes account→rep→outbound; we optimize company-role↔candidate→mutual intro |
| **Observed hiring age / public ATS ledger** | Already local (role ledger, directory aging, pulse) — public SF truth, not CRM dirt |
| **Atomic assertions + unknown reasons + review** | Clay shows traces/evidence drill-down; portable correction history + fail-closed “unknown” still a wedge if implemented |
| **Phase-2 gate on accepted real roles** | Prevents fake research theater on sample board roles |
| **Honesty on pilots** | Warm ≠ pilot; no invent — Clay’s customer stories are GTM pipeline metrics, not two-sided hire |

### Using Clay *as a tool* (optional ops, not product)

If ever authorized as a paid tool for Demigod ops:

| Use | Don’t use |
|-----|-----------|
| Founder/company desk research for **demand** shortlists (public web via Claygent) | Candidate email/phone waterfalls into site or auto-DM |
| Job-change / hiring signals on **target companies** | Building Demigod as “Clay for recruiting” public SaaS |
| Export structured notes into private talent-crm / match notes | Writing unsolicited people data into public map |

Clay’s own recruiting blog shows the *category* works for talent ops — but Demigod’s compliance bar (consent, no brokered PII on site) is stricter.

---

## 3. Feature map: Clay capability → Demigod already / gap

| Clay capability | Demigod today | Gap / action |
|-----------------|---------------|--------------|
| Waterfall multi-provider | ATS multi-provider poll (Greenhouse/Lever/Ashby…) for **jobs**, not people emails | Keep jobs waterfall; refuse people-data product |
| Claygent one-shot research | Manual + company-research-benchmark seals | Phase-2 company context on match-review **only** when accepted role |
| Account Research Agents persistent memory | Role ledger first-seen + aging; research seal | Do not rebuild Audiences; strengthen evidence drawer for sealed claims |
| Signals (job change) | HN hiring + ATS open counts + aging badges | Enough for SF directory; optional Clay signals only if paid ops |
| Sequencer / ads | Drafts-only demand DMs | Keep human send |
| MCP for reps | Orca/agent tools on laptop | Local tools already; no need Clay MCP for product |
| CRM sync | Private talent-crm + pilot OS | Keep private; no public CRM product |

---

## 4. Updated competitive one-liner

**Clay (2026):** GTM data + agent orchestration for sales/marketing ops — waterfalls, Claygent, always-on Account Research Agents on Audiences, CRM/ads/sequencer, MCP into Claude/Codex; priced Free→Launch→Growth→Enterprise on dual credits.

**Demigod:** SF two-sided talent matching with honest public hiring map + private evidence-backed match ops.  
**Overlap:** company research language and “agents on accounts.”  
**Non-overlap:** Clay sells pipeline; Demigod sells **mutual hire path**. Cloning Clay is still the wrong product.

---

## 5. Implications for next Demigod work (ranked)

1. **Pilot delivery** (Laurelin / real roles) — product risk; Clay revisit does not unblock.  
2. **Public map/role ledger freshness** — already Clay-adjacent *job* signal; keep directory refresh healthy.  
3. **Phase-2 company context** — only after `acceptedForDelivery≥1`; design as atomic assertions, not ARA clone.  
4. **Optional:** evaluate Free Clay for internal founder research only (no product dependency).  
5. **Refuse:** people email waterfalls, public research SaaS, knowledge-graph “35M people” fantasy.

---

## 6. Source checklist

- https://www.clay.com/  
- https://www.clay.com/claygent  
- https://www.clay.com/pricing  
- https://www.clay.com/blog/account-research-agents (2026-07-22)  
- https://www.clay.com/blog/how-clay-uses-clay-for-recruiting-top-talent  
- https://www.clay.com/mcp  
- Internal: `docs/die/research/COMPETITIVE-LANDSCAPE.md` §Clay, `DEMIGOD-DIE-BRIEF.md`, `docs/die/CLAY-DIE-MULTI-AGENT.md`

---

*Research only. No Clay signup, no spend, no outbound.*
