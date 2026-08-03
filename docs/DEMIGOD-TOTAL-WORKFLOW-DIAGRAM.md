# Demigod — total workflow & processes

Comprehensive process map for ops, site ship, demand, matching, and agents.  
View in dash: **SF Map** tab · API `/api/maps/workflow`.

---

## 1. Big picture

```mermaid
flowchart TB
  subgraph PRODUCT["Product"]
    LIVE["www.trydemigod.com"]
    WF["Webflow Designer + Custom Code"]
    CDN["Foot CDN (current truth)"]
  end

  subgraph AGENTS["Agents"]
    GROK["Grok"]
    CLAUDE["Claude / Fable"]
    CODEX["Codex"]
    CURSOR["Cursor"]
    PONY["Ponytail rules"]
  end

  subgraph OPS["Ops spine"]
    ORIENT["bin/dg orient"]
    TRUTH["bin/dg truth"]
    DASH["Dash :9878"]
    PRIORITY["priority board"]
    DOG["tool dogfood"]
  end

  subgraph DEMAND["Demand / pilots"]
    DRAFTS["demand drafts"]
    WARM["warm inbound"]
    PILOT["pilot log"]
  end

  subgraph MATCH["Matching"]
    INBOX["submissions inbox"]
    PAIRS["pairs ledger"]
    INTRO["intro drafts"]
  end

  subgraph SHIP["Ship"]
    LOCK["foot lock"]
    FREEZE["publish freeze"]
    PREP["ship prepare"]
    CDNP["cdn publish"]
    PASTE["cm6 paste"]
    PUB["Webflow publish"]
  end

  subgraph LOOPS["Work loop"]
    USEFUL["useful-loop"]
  end

  ORIENT --> TRUTH
  ORIENT --> PRIORITY
  DASH --> PRIORITY
  DASH --> TRUTH
  AGENTS --> PONY
  AGENTS --> ORIENT
  AGENTS --> DASH
  AGENTS --> DOG
  TRUTH --> LIVE
  PREP --> CDNP --> PASTE --> PUB --> LIVE
  FREEZE -.->|blocks mutate| CDNP
  LOCK -.->|mutex| CDNP
  LIVE --> INBOX --> PAIRS --> INTRO
  DRAFTS --> WARM --> PILOT
  USEFUL --> DOG
```

---

## 2. Daily session process

```mermaid
flowchart LR
  A[orient] --> B{green?}
  B -->|no| C[truth + fix]
  B -->|yes| D[priority board]
  D --> E[one goal]
  E --> F[Ponytail min change]
  F --> G[verify]
  G --> H{ship?}
  H -->|no| I[stop / handoff]
  H -->|yes| J[ship prepare→cdn→paste→verify]
  J --> K[optional freeze on]
```

---

## 3. Website request path

See also: `docs/DEMIGOD-WEBSITE-ARCHITECTURE-DIAGRAM.md`

```
Browser → Webflow HTML
  → Head custom (unhide, scrub, CSS)
  → Body (layout, modals, forms)
  → Footer (redirects + CDN foot JS)
  → foot-core: WIZ · board · ?p= pages
  → Form POST → Webflow store/email
```

---

## 4. Demand / pilot process

```mermaid
flowchart TD
  SIG[Founder/talent signal] --> WARM[Warm inbound log]
  WARM --> CALL[Call / meeting]
  CALL --> DISP{Disposition}
  DISP -->|fit| BRIEF[Role brief = pilot]
  DISP -->|no fit| CLOSE[Close honest]
  BRIEF --> MATCH[Human match 3–5]
  MATCH --> MUTUAL[Both sides approve]
  MUTUAL --> INTRO[Intro]
  QUEUE[Draft DM queue] -.->|current-request-gated| SIG
```

**Rules:** drafts only · warm ≠ pilot · no invented receipts · outbound sends are current-request-gated.

---

## 5. Agent collaboration process

| Stage | Who | Output |
|-------|-----|--------|
| Plan | Fable/Claude | Spec, files, risks |
| Execute | Grok/Cursor | Diffs + gate stdout |
| Review | Codex | PASS/BLOCK |
| Authorize | Current user request | Freeze, publish, outbound messages, money |

Always: **Ponytail** · dogfood wraps · no concurrent thrash loops.

---

## 6. Tool dogfood process

```
Use tool via: node demigod-tool-dogfood.mjs wrap --tool=NAME -- <cmd>
  → jsonl event (ok, ms, why)
  → /api/dogfood status
  → suggestions: reliability / usefulness / unused
  → improve or demote tool
```

---

## 7. Control plane modules

site · events · webflow · match · review · hygiene · ponytail · **workloop** · ship · orca · plans

---

## 8. Success metrics (honest)

| Metric | Target signal |
|--------|----------------|
| Truth green | disk==live foot, shipped |
| Pilots | real briefs only (0 is honest) |
| Warm overdue | 0 |
| Drafts ready | hygiene ok |
| Dogfood | tools used + low fail rate |
