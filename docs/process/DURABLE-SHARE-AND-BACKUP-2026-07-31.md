# Durable share & backup (2026-07-31)

**Goal:** Nothing important should exist only as an uncommitted laptop file.  
**Exception:** Secrets and candidate PII stay out of public remotes; private GitHub + encrypted local archives are the non-site homes.

---

## 1. Non-local surfaces (where work already lives)

| Surface | What | Access |
|---------|------|--------|
| **https://www.trydemigod.com** | Live product (Webflow + custom code) | Public |
| **CDN** `Uuriko/demigod-site-cdn` + jsDelivr | Foot JS, head CSS, map-data, startup-map | Public (via CDN) |
| **GitHub `Uuriko/demigod-ops`** (private) | Ops code, research, intake *without* treating it as public SoR | Collaborators with repo access |
| **GitHub `Uuriko/demigod-site-cdn`** (public) | Shipped static/CDN assets | Public |
| **Webflow Designer** talentlink-sf | Structure + Custom Code paste | Account holders |
| **`/tmp/dg-busy/`** | Busy receipts (truth, ship, demand) | **Laptop only, ephemeral** — re-run tools to regenerate |

---

## 2. Must never be the only copy

| Asset | Correct home | Never |
|-------|--------------|-------|
| Foot/core, head, ship path | git + CDN after ship | Laptop disk alone |
| Research writeups (`docs/research/*`) | **Commit + push** demigod-ops | Untracked forever |
| GTM one-pagers | **Commit + push** | — |
| DIE competitive notes | **Commit + push** | — |
| Ops intake (Laurelin warm, pilot readiness, redacted notes) | **Private** demigod-ops git | Public site / public repo |
| **talent-crm** (candidates, emails, resumes) | Private dir + **local archive** under `~/.local/share/demigod-private-backups/` | Git (gitignored) · CDN · Webflow · public GitHub |
| Pilot shortlist confidential names | talent-crm notes only | demigod-ops if not redacted |
| Events SoR / submissions inbox | gitignored local | Git |
| Board / pairs real data | gitignored | Git |

---

## 3. Commands (agent / human)

### Share durable code + research (private GitHub)

```bash
cd /home/potter/.grok/worktrees/potter/demigod   # or DEMIGOD_ROOT
git status -sb
# stage only shareable paths (no talent-crm, no secrets)
git add docs/research docs/gtm docs/die docs/process/DURABLE-SHARE-AND-BACKUP-2026-07-31.md \
  demigod-ops/intake demigod-pilot-inbound.mjs   # etc. as needed
git commit -m "…"
git push -u origin HEAD
```

Repo: `https://github.com/Uuriko/demigod-ops` (private).

### Private CRM backup (laptop archive, not git)

```bash
BACKUP_ROOT=~/.local/share/demigod-private-backups
mkdir -p "$BACKUP_ROOT" && chmod 700 "$BACKUP_ROOT"
tar -czf "$BACKUP_ROOT/talent-crm-$(date -u +%Y%m%dT%H%MZ).tar.gz" -C "$HOME" talent-crm
chmod 600 "$BACKUP_ROOT"/talent-crm-*.tar.gz
# prune: keep last 5
ls -1t "$BACKUP_ROOT"/talent-crm-*.tar.gz | tail -n +6 | xargs -r rm -f
```

Optional later: copy tarballs to an external drive or a **private** encrypted cloud bucket — never public S3/GitHub.

### Live site ship (non-local product)

```bash
bin/dg lock claim --owner "$USER" --why ship
export DEMIGOD_CURRENT_REQUEST_PUBLISH=1 DG_LOCK_TOKEN=…
bin/dg ship run    # prepare → CDN → Webflow paste → truth --require-match → live-attest
bin/dg lock release
bin/dg truth
```

### CDN repo

Site CDN objects ship via `demigod-foot-cdn-publish.mjs` into **demigod-site-cdn** (see manifest `DEMIGOD-FOOT-CDN.json`). Do not hand-edit production CDN in git without the ship path.

---

## 4. Laptop-only traps (audit checklist)

Run occasionally:

```bash
# Untracked research / ops that should be on GitHub
git status -u --short docs/ demigod-ops/

# Confirmed gitignored private SoR
git check-ignore -v /home/potter/talent-crm/candidates.json DEMIGOD-BOARD.json 2>/dev/null

# Busy dir is not a backup
ls /tmp/dg-busy | head
```

If `docs/research/*` shows `??` for days → commit/push same day.

---

## 5. What “shared” means for multi-agent

| Audience | Channel |
|----------|---------|
| Other agents on this machine | git worktree + this doc + `docs/die/CLAY-DIE-MULTI-AGENT.md` |
| Future you / other machines | **private** demigod-ops push + talent-crm tarball restore |
| Public | trydemigod.com only (honest board, no CRM) |
| Collaborators | private GitHub access — not Discord dumps of candidates |

---

## 6. Session actions 2026-07-31

- [x] Document this runbook  
- [x] talent-crm tarball under `~/.local/share/demigod-private-backups/`  
- [ ] Commit + push research/intake/process (private demigod-ops)  
- [ ] `bin/dg ship run` with current-request publish auth  
- [ ] Confirm `bin/dg truth` PASS after ship  

---

*Private PII stays private. Public site stays honest.*
