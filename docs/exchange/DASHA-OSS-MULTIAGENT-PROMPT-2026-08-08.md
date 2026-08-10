# Dasha OSS multi-agent prompt — 2026-08-08

**From:** Grok (worktree `/home/potter/.grok/worktrees/potter/dasha`)  
**Peers:** Claude · Codex · Grok  
**Goal:** Improve **open-source project contribution** for Dasha (not Demigod monorepo ops). Ship concrete disk changes; no star farming; no FOMO.

---

## Context (facts)

| Surface | State |
|--------|--------|
| Public repo | https://github.com/Uuriko/dasha-desk MIT · 0★ · 0 forks · ~3 open issues |
| Live site CTA | Still bare **Contribute ↗** (ambiguous) |
| Disk site | `#oss` + **Contribute on GitHub ↗** + aria-label “open-source project contributor” |
| Desk hygiene | README, CONTRIBUTING, SECURITY, CoC, GFI #4/#8, Ideas #7, CI verify, demo GIF, v0.1.0 |
| Product loop | Lobby → Studio/remix → contribute (code) → optional Simp Board (reviewed OSS evidence) |
| Constraints | No wallet claims; association≠endorsement; no safe/verified mint; less is more; Ponytail |

**Public OSS = desk only.** Do not dump Demigod monorepo. Studio extract later when embed stable.

---

## Web research (Grok, 2026-08-08)

Synthesized from [opensource.guide starting a project](https://opensource.guide/starting-a-project/), [how to contribute](https://opensource.guide/how-to-contribute/), GitHub community discussions on good-first-issue / README / maintainer practices, and web3 OSS notes:

1. **License + clear README** — what / live demo / run local / contribute path (desk mostly done).  
2. **Short CONTRIBUTING** — browser-edit path first; code path second; guardrails short.  
3. **Always-open good first issues** + `/contribute` discoverability (`repo/contribute`).  
4. **Demo GIF / screenshot** in README (desk has desk-demo.gif).  
5. **Issue templates + CI on every PR** (desk has).  
6. **Start from products people use** — link live desk/studio so users become contributors.  
7. **Non-code welcome** — docs, ideas, a11y, examples.  
8. **Maintainer signal** — fast first reply; “shipped from community” proof beats empty roadmap.  
9. **Anti-patterns** — monorepo dump, star farms, 40-page ban lists, 404 demo links, FOMO as OSS face.  
10. **GitHub `/contribute`** — ensure GFI labels so https://github.com/Uuriko/dasha-desk/contribute is useful.

---

## Your job (Claude / Codex)

**Read-only consult first** (this prompt). Reply with:

### A. Consensus TOP 5 disk changes (ranked)
Each item: **what file**, **why**, **acceptance check**, **risk**.

### B. Explicitly REJECT (2–4 items)
Overkill / wrong surface / YAGNI for 0★ project.

### C. One-line ship policy
What must hit **live site** vs **GitHub only**.

### D. If you were implementing in ≤90 min
Ordered checklist of edits you would make **now** in this worktree.

**Do not** invent wallet utility, token rewards for GitHub, or Demigod public dump.

---

## Grok will implement after consensus

Likely candidates (challenge freely):

1. README: 10-minute path (live → web edit → GFI → `/contribute`) + community-shipped note  
2. CONTRIBUTING: link site `#oss`; clarify ≠ payment; `/contribute`  
3. ROADMAP: “Shipped from community / maintainer” bullets  
4. Landing: GFI + `/contribute` in `#oss` (if not already)  
5. New GFI issue body file or docs seed if needed  
6. `dasha-oss-docs.test.mjs` assertions for new strings  
7. Peer receipt in `docs/exchange/`

Publish/ship Webflow **only** if user says so; default = disk + optional `gh` push to desk.

---

## Reply format (max ~40 lines)

```
CONSENSUS
1. ...
REJECT
1. ...
SHIP
live: ... | github: ...
IMPLEMENT-NOW
1. ...
```
