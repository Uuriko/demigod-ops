# Execution prompt — free stack upgrades (detailed)

**Role:** You are the implementing operator for Demigod’s free-tooling and workflow upgrades.  
**Source of truth for *what*:** `docs/research/STACK-WORKFLOWS-FREE-TOOLS-RESULTS-2026-07-31.md`  
**Source of truth for *how agents work*:** `docs/process/AGENT-TOOLING-MAX-2026-07-31.md`  
**Worktree:** `/home/potter/.grok/worktrees/potter/demigod`  
**Always:** `export DEMIGOD_ROOT` to that path before any demigod command.

---

## 0. Non-negotiable rules

1. **No publish** unless the human’s *current* message explicitly says publish/ship to Webflow. Prepare and local gates only.  
2. **No outbound email/DM/posts/forms** without current-message auth.  
3. **No secrets in git.** If gitleaks finds real secrets, redact and stop—do not commit them.  
4. **Ponytail:** minimum diffs; reuse `bin/dg*` instead of inventing parallel wrappers.  
5. **One foot-core writer:** check `node demigod-foot-lock.mjs status`; if owner PID is dead, `release --force`.  
6. Prefer **user-local installs** (`~/.local/bin`) over `sudo`.  
7. After code/config changes: smallest relevant gate, then commit + push to `Uuriko/demigod-ops` on current branch.  
8. Report what ran, what needs human OAuth, and what was blocked.

---

## 1. Preflight (do first, in order)

```bash
export PATH="$HOME/.local/bin:$PATH"
export DEMIGOD_ROOT=/home/potter/.grok/worktrees/potter/demigod
cd "$DEMIGOD_ROOT"

# Identity
git rev-parse --show-toplevel
git status -sb
git branch --show-current

# Foot lock hygiene
node demigod-foot-lock.mjs status
# if locked and PID dead:
#   node demigod-foot-lock.mjs release --force

# Baseline truth (observational)
bin/dg truth 2>&1 | tail -20

# Tools already present
for c in just gitleaks watchexec shellcheck yq delta tldr jq rg gh; do
  printf '%-12s %s\n' "$c" "$(command -v $c 2>/dev/null || echo MISSING)"
done
```

Record: disk foot version, live version, lock free?, missing binaries.

---

## 2. Install `just` (command runner)

### Goal
`just truth`, `just gate`, `just blog`, `just prepare` map to existing Demigod commands—no new product logic.

### Install (user-local)

```bash
mkdir -p "$HOME/.local/bin"
# Official installer to ~/.local/bin (no sudo)
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh \
  | bash -s -- --to "$HOME/.local/bin"
just --version
```

If curl installer fails, fetch latest release binary for `x86_64-unknown-linux-musl` from  
https://github.com/casey/just/releases and place at `~/.local/bin/just`.

### Create `Justfile` at repo root

Requirements:

- `set shell := ["bash", "-eu", "-o", "pipefail", "-c"]`
- Recipes must `export DEMIGOD_ROOT` to Justfile directory or env.
- Recipes:

| Recipe | Must run |
|--------|----------|
| `default` | list recipes (`just --list`) |
| `orient` | print DEMIGOD_ROOT + `bin/dg truth` tail (or short status) |
| `truth` | `bin/dg truth` |
| `blog` | `node demigod-blog-quality.mjs` then `node demigod-blog-sync.mjs --check` |
| `smoke` | `node demigod-foot-smoke.mjs` |
| `source` | `npm run demigod:verify:source` |
| `board` | `node demigod-verify-board-honesty.mjs` |
| `gate` | smoke + board + blog-check (source optional if too slow—document) |
| `gate-full` | source + smoke + board + blog + site-health if cheap |
| `prepare` | `node demigod-ship.mjs prepare` |
| `work` | `node demigod-work-find.mjs` |
| `tools` | `bin/dg tools` or registry --md |
| `lock-status` | `node demigod-foot-lock.mjs status` |
| `lock-release-dead` | status JSON; if PID dead, release --force; else print blocked |
| `secrets` | `gitleaks detect` (see §3) |
| `watch-foot` | watchexec recipe if binary present |

### Verify

```bash
just --list
just truth   # should exit 0 or known prepare-only pass
just blog
just smoke
```

---

## 3. Install `gitleaks` + scan + CI hook

### Install user-local

```bash
# Resolve latest version via GitHub API if possible
VER=$(curl -sS https://api.github.com/repos/gitleaks/gitleaks/releases/latest | jq -r .tag_name | sed 's/^v//')
# fallback hardcode if API fails e.g. 8.30.0
curl -sSL -o /tmp/gitleaks.tgz \
  "https://github.com/gitleaks/gitleaks/releases/download/v${VER}/gitleaks_${VER}_linux_x64.tar.gz"
tar -xzf /tmp/gitleaks.tgz -C /tmp
mv /tmp/gitleaks "$HOME/.local/bin/gitleaks"
chmod +x "$HOME/.local/bin/gitleaks"
gitleaks version
```

### First scan (repo)

```bash
cd "$DEMIGOD_ROOT"
gitleaks detect --source . --report-path /tmp/dg-busy/gitleaks-report.json --report-format json -v || true
# also human-readable:
gitleaks detect --source . -v 2>&1 | tee /tmp/dg-busy/gitleaks-detect.txt | tail -40
```

### Policy file `.gitleaks.toml` (if needed)

- Allowlist only **false positives** (example fake keys in tests, documented samples).  
- Never allowlist real credentials.  
- If findings are real: **do not commit them**; scrub files; rotate if needed (report to human).

### Wire into CI (`.github/workflows/verify.yml`)

Add a step after checkout (or parallel job) that:

- Installs gitleaks binary on ubuntu-latest (curl release)  
- Runs `gitleaks detect --source . --exit-code 1`  
- Uses no org license (personal Uuriko account)  

If CI becomes red only on known false positives, fix allowlist surgically.

### Local just recipe

```
secrets:
  gitleaks detect --source . --verbose
```

---

## 4. Install `watchexec` (optional foot watch)

```bash
# latest linux x86_64 from releases
# e.g. watchexec-*-x86_64-unknown-linux-musl.tar.xz
# extract watchexec to ~/.local/bin
watchexec --version
```

Just recipe:

```
watch-foot:
  watchexec -e js -w demigod-foot-core.js -- node demigod-foot-smoke.mjs
```

Do **not** leave a watch process running as a daemon in CI; local only.

---

## 5. Firecrawl OAuth (human-in-the-loop possible)

1. Confirm plugin enabled in `~/.grok/config.toml` under `[plugins] enabled` includes `"firecrawl"`.  
2. Attempt a real MCP/tool scrape of a **public** docs URL (e.g. Firecrawl intro or demigod public page).  
3. If OAuth prompt is required: **stop and tell human** exact steps (`/mcps` or browser popup).  
4. On success: write a one-line receipt under `/tmp/dg-busy/firecrawl-oauth-ok.txt` with timestamp.  
5. Never scrape private talent CRM or non-public personal data.

---

## 6. Dogfood skills (prove they work)

```bash
# Document invocation in a short receipt
# Simulate orient checklist:
export DEMIGOD_ROOT=...
bin/dg truth | tail -15
node demigod-work-find.mjs --json | head -c 2000
# Run gates skill ladder:
just gate   # or manual smoke+board+blog
```

Update `docs/process/AGENT-TOOLING-MAX-2026-07-31.md` only if recipes change materially (one short “Justfile” section).

---

## 7. PATH hygiene

Ensure `~/.bashrc` (or zshrc) contains:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Do not overwrite user’s whole rc; append only if missing.

---

## 8. Agent-comms micro-upgrade (optional, short)

If `AGENT-COMMS.md` exists, add a **5-line SBAR handoff** block:

- **S:** disk/live foot, lock  
- **B:** branch + last commit  
- **A:** gates pass/fail  
- **R:** next task  

Keep it under 20 lines total addition.

---

## 9. Verification matrix (must all pass before done)

| Check | Command | Pass criteria |
|-------|---------|---------------|
| just installed | `just --version` | prints version |
| recipes list | `just --list` | shows gate, truth, blog, prepare |
| smoke | `just smoke` | pass, version matches disk foot (869+) |
| blog | `just blog` | quality ok + sync check ok |
| secrets tool | `gitleaks version` | prints version |
| secrets scan | `just secrets` or detect | exit 0 or documented findings only |
| truth | `just truth` | PASS prepare-only acceptable |
| CI | push workflow | green or fixed |
| no publish | — | live version may still lag disk |

---

## 10. Git commit strategy

Prefer **2–3 commits**, not one megacommit:

1. `chore: add Justfile and just-based demigod recipes`  
2. `chore: add gitleaks local + CI secret scan`  
3. `docs: note free-stack execution and SBAR handoff`  

Push `origin HEAD` after gates green.

---

## 11. Explicitly out of scope this run

- Webflow publish / foot CDN v869 ship  
- Research reseal fail-fresh deep fix  
- Installing a fourth coding agent  
- Free SaaS ATS  
- Gmail reauth if human already did it (only probe)

---

## 12. Final report format (to human)

```
## Free stack upgrades — done
- installed: …
- Justfile recipes: …
- gitleaks: findings N / CI wired: yes|no
- firecrawl: oauth ok|needs human
- gates: smoke/blog/truth …

## Needs human
- …

## Not done (scope)
- publish …
```

---

## 13. Order of operations (strict)

1. Preflight + lock hygiene  
2. Install just → write Justfile → verify recipes  
3. Install gitleaks → scan → allowlist only if needed → CI  
4. Install watchexec → watch-foot recipe  
5. Firecrawl probe  
6. PATH + optional AGENT-COMMS  
7. Full verification matrix  
8. Commits + push  
9. Final report  

**Start now at step 1.**
