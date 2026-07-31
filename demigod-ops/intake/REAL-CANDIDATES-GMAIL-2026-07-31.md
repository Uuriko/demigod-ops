# Real candidates from Gmail (2026-07-31)

**Source:** Browser Gmail on potter@trydemigod.com (search `has:attachment filename:pdf (resume OR CV OR portfolio)`)  
**Store:** `/home/potter/talent-crm/` (private; not site board; mode 0600)  
**Gmail MCP:** still revoked (`Token has been permanently revoked`) — re-auth via TUI `/mcps` → gmail → `i`  
**X DMs:** @potterlab; no clear CV DMs on first screen; no X DM API  

## Consent rule
These people emailed resumes for job help / roles. **Do not intro** until candidate consent is observed for Demigod matching (`docs/process/CANDIDATE-CONSENT-CHECKLIST.md`). Status = `reviewing`.

## Confirmed emails (full open 2026-07-31)

| Priority | Name | CRM id | Email (From header) | Signal | Resume |
|----------|------|--------|---------------------|--------|--------|
| P0 | **Michael Graham** | cand-d2428be2d381 | `mlgraham@me.com` (also `michael.graham@coderocket.com`; prior CRM had gmail alias) | SF · sole dev BotMediation · CodeRocket founder · 15y · Python/Django/React/AWS | Michael Graham - Resume - 20260607.pdf |
| P1 | **Mario Alberto Zuniga Gutierrez** | cand-51a3c269ba91 | `mariozuniga@berkeley.edu` | AgentMail Founding Eng interest Apr 20; open to other cos if closed | Resume - Mario A Zuniga Gutierrez.pdf |
| P1 | **Hunter Holland** | cand-9a3b149648cc | `hhunterholland@gmail.com` | Two resumes Jun 17; asked which is stronger | Hunter_Holland_Resume_Summer26.pdf · Resume June 2026.pdf |
| P2 | **David Spiegel** | cand-ec9b38588dd1 | `davidaspiegs@gmail.com` | Technical/AI PM · Twitter source · AI eval | Ads + AI PM resumes |
| P2 | **Paul Y Rapoport** (signs Lorxus) | cand-a2924bbf39d3 | `coronacoreanici@gmail.com` | Apr 13 Nice meeting · resume 2026 | PaulYRapoport_Resume2026.pdf |
| P3 | **Bryan Alexander Hoyt** | cand-dd0c30574841 | `bryanhoyt@ucla.edu` | Apr 17 · looking forward to speaking | hoyt2026.pdf |
| P3 | **Imran Isa-Dutse** | cand-08143af28fec | `imranisadutse@gmail.com` | Jun 19 · referred by Beyza · SWE SF/NY intros | (no PDF in list view) |

## Older / lower priority (seen in search, not fully ingested)
Griffin Wong, Astha Tiwari (TPM), Haroon, John Fox (SF, itsjohnfox@gmail.com list preview), Sissi Hai, Vittorio Mottini (bioeng), James Olichney (design), nick taylor, Ken Gibbs (thermo), etc. Many 2020–2024 craigslist/spam noise — skip for pilot.

## Public-role fit sketches (NOT real pairs — no accepted founder role + no consent)
Ledger live 2026-07-31 (`DEMIGOD_ROLE_LEDGER=/home/potter/DEMIGOD-ROLE-LEDGER.json`):

| Candidate | Public posting (evidence only) | Fit note | Blocked because |
|-----------|--------------------------------|----------|-----------------|
| Mario | AgentMail Founding Engineer · [Ashby](https://jobs.ashbyhq.com/agentmail/6e99881b-595c-44e0-8f82-eb431ef98623) lastSeen 2026-07-31 | He already applied/asked re that company | Consent + founder acceptance not logged |
| Graham | AgentMail Senior Eng Backend/Infra · Airbyte Senior SRE · Speakeasy Platform Eng (SRE) · AfterQuery Platform/Applied AI | Strong SRE + AI product ownership story | Same; also he was corresponding with `evan@sfcompute.com` on CoS thread — not a Demigod accepted role |
| Hunter / Hoyt / Paul | Various SF founding eng postings | Need resume depth + consent before ranking | reviewing |

## Next agent steps
1. Local consent draft only (no send) when ready to re-engage  
2. Download resumes under `talent-crm/resumes/<id>/` if useful for review  
3. When a **real** startup role is accepted (not demo / not public scrape alone), propose pairs only after consent  
4. Re-auth Gmail MCP: `/mcps` → gmail → `i`  
5. X: search DMs for “resume” / “CV” / “engineer” in UI if needed  

## Blocked
- Gmail MCP OAuth still permanently revoked  
- No real accepted role gate yet (`acceptedForDelivery=0`, pairs real=0)  
- Outbound/consent emails not sent (publish/outbound gate)  
- Live `/startups` fragment stale vs disk (publish-gated)

## Re-extract 2026-07-31 (Gmail MCP live)

Gmail MCP works again. Re-confirmed PDF attachers via `get_message` (attachment metadata).  
Private detail: `/home/potter/talent-crm/notes/GMAIL-X-EXTRACT-2026-07-31.md`  
CRM ingest merged 7 + James PDF note + Haroon (2024).  
**X DMs:** no CV/PDF DMs on visible chat list / search first screen.  
**PDF bytes:** not downloaded (no Gmail attachment download tool in gateway).
