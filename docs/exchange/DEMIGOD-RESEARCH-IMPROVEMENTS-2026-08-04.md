# Demigod improvement brief — outside research (2026-08-04)

**Scope:** Startup product + site + ops. Not a Clay clone. No invented pilots or metrics.  
**Sources (fetched this run):** GTM recruiting specialist guides, talent-marketplace software landscape, SaaS landing conversion practice, multi-agent coding orchestration patterns (links below).

---

## Research domains (2+)

### A. Talent marketplace / GTM hiring
- Early GTM mis-hires cost startups quarters of progress; specialist GTM recruiting is framed as trust + speed for revenue roles, not volume ATS spam.  
  — [Beacon Talent: What is GTM Recruiting?](https://beacontalent.io/resources/what-is-gtm-recruiting) (crawled 2026-08)  
  — [UltraTalent: GTM Recruiter roles 2026](https://ultratalent.com/blog/gtm-recruiter/) (Feb 2026)  
- Mature talent marketplaces close the loop skill → match → opportunity → **outcome feedback**, not “job board with AI.”  
  — [TeamMeter: Best talent marketplace software 2026](https://www.teammeter.com/best-talent-marketplace-software-in-2026/) (Apr 2026)  
- Human-in-the-loop remains the credibility layer while AI narrows; pure reject-funnel AI is the anti-pattern.  
  — Industry commentary on HITL vs black-box screening (2026 hiring discourse)

### B. SaaS landing conversion & trust
- Conversion ≈ **clarity + trust + low friction**; one primary CTA; outcome language over feature lists.  
  — [Orbix: SaaS landing page design](https://www.orbix.studio/blogs/saas-landing-page-design-guide) (2026-08)  
  — [Genesys Growth: B2B SaaS landing pages](https://genesysgrowth.com/blog/designing-b2b-saas-landing-pages) (Mar 2026)  
- Fake or ambiguous social proof (generic “vetted”, invented counts) destroys trust; grammar/SEO hygiene still matter.  
  — [Flighted / Studio Maydit 2026 conversion notes](https://studiomaydit.com/blog/saas-landing-page-best-practices-2026)

### C. Agent / studio workflow
- Prefer **default single agent** + subagents for decomposition; isolation (worktrees) over standing swarms.  
  — [Addy Osmani: The Code Agent Orchestra](https://addyosmani.com/blog/code-agent-orchestra/) (Mar 2026)  
- Deterministic routing + quality gates beat free-form multi-agent thrash.  
  — [Microsoft Conductor / multi-agent orchestration surveys 2026](https://opensource.microsoft.com/blog/2026/05/14/conductor-deterministic-orchestration-for-multi-agent-ai-workflows/)

---

## Implications for Demigod

| Insight | Demigod read |
|--------|----------------|
| HITL is the product | Keep “humans in the loop / mutual yes”; kill residual agency-theater copy |
| Outcome loop | Pilot log + first real brief > more board chrome |
| One CTA / clarity | Dual-path hire/talent is fine; strip second titles, soft-404 noise, dense link farms |
| Default 1 agent | Orient → one goal → verify; Claude/Codex only when blocked |

---

## Prioritized add / keep / remove

### Add (when evidence exists)
1. **First real accepted role on the board** — only after true inbound brief (Phase 2 gate).  
2. **Observed open-age badges after ≥7 daily ledger polls** — honest “tracked Nd”, not day-0 cosplay.  
3. **One public proof surface** (e.g. Notes post or status) when a pilot outcome is real — never invented.

### Keep
1. **Foot-core + CDN as product SoR** — WIZ/honesty live there.  
2. **Drafts-only outreach** — no auto-DM.  
3. **Role ledger + map** as private intelligence, not a public Clay.  
4. **`bin/dg` control plane** (orient / truth / ship prepare).

### Remove / refuse
1. **Raw HTML tags inside head comments** that leak into live HTML (fixed this run: Untitled title string).  
2. **Parallel “start here” cards** that fight `DEMIGOD-SIMPLE.md`.  
3. **Clay clone / graph OS / people-data waterfalls**.  
4. **Standing multi-agent swarms** and continuous-improve loops without user ask.  
5. **Fake board metrics, SLA, “3–5 pre-vetted” volume promises** (already scrubbed; never reintroduce).

---

## This run’s product fix
Head custom code contained a JS comment with a literal `<title>Untitled</title>`, which appeared as a **second title** in the served homepage HTML (SEO/crawler noise). Comment rewritten without raw title tags; verify gate `head:no-raw-title-tag-in-source` added; foot also normalizes `document.title` when it is literally `Untitled`.
