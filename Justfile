# Demigod free-stack recipes — thin wrappers over bin/dg* and node gates.
# Requires: export PATH includes ~/.local/bin ; prefer running from repo root.
# Docs: docs/process/EXECUTE-FREE-STACK-UPGRADES-PROMPT-2026-07-31.md

set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

export DEMIGOD_ROOT := justfile_directory()

# List recipes (default)
default:
	@just --list

# Session start: root + truth tail
orient:
	@echo "DEMIGOD_ROOT=$DEMIGOD_ROOT"
	@cd "$DEMIGOD_ROOT" && bin/dg truth 2>&1 | tail -25

truth:
	@cd "$DEMIGOD_ROOT" && bin/dg truth

# Blog SoR quality + sync check (no write)
blog:
	@cd "$DEMIGOD_ROOT" && node demigod-blog-quality.mjs >/tmp/dg-busy/just-blog-quality.json
	@cd "$DEMIGOD_ROOT" && node demigod-blog-sync.mjs --check
	@python3 -c "import json;d=json.load(open('/tmp/dg-busy/just-blog-quality.json')); print('blog quality ok=', d.get('ok'), 'posts=', len(d.get('results') or []))"

smoke:
	@cd "$DEMIGOD_ROOT" && node demigod-foot-smoke.mjs

source:
	@cd "$DEMIGOD_ROOT" && npm run demigod:verify:source

board:
	@cd "$DEMIGOD_ROOT" && node demigod-verify-board-honesty.mjs

# Fast post-edit ladder (no full source suite)
gate: smoke board blog
	@echo "just gate OK (smoke + board + blog)"

# Heavier ladder
gate-full: source smoke board blog
	@cd "$DEMIGOD_ROOT" && node demigod-site-health.mjs 2>&1 | tail -15
	@echo "just gate-full OK"

prepare:
	@cd "$DEMIGOD_ROOT" && node demigod-ship.mjs prepare

work:
	@cd "$DEMIGOD_ROOT" && node demigod-work-find.mjs

tools:
	@cd "$DEMIGOD_ROOT" && bin/dg tools 2>&1 | head -40

# Product desk spine (Match / Directory / Notes / Desk / DIE)
desk:
	@cd "$DEMIGOD_ROOT" && node demigod-product-desk.mjs --md

desk-json:
	@cd "$DEMIGOD_ROOT" && node demigod-product-desk.mjs

lock-status:
	@cd "$DEMIGOD_ROOT" && node demigod-foot-lock.mjs status

# Release foot lock only if holder PID is dead
lock-release-dead:
	@cd "$DEMIGOD_ROOT" && bin/dg-lock-release-dead

# Secret scan (requires gitleaks on PATH)
secrets:
	@cd "$DEMIGOD_ROOT" && gitleaks detect --source . --verbose --redact --exit-code 1 --config .gitleaks.toml

# Local-only: re-run foot smoke when foot-core changes
watch-foot:
	@cd "$DEMIGOD_ROOT" && watchexec -e js -w demigod-foot-core.js -- node demigod-foot-smoke.mjs
