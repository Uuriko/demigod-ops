# Ponytail setup (Demigod)

**Repo:** https://github.com/DietrichGebert/ponytail  
**What:** Makes coding agents act like a lazy senior — YAGNI ladder, less over-engineering, keep safety checks.

## Installed here

| Surface | Path / command |
|---------|----------------|
| Cursor rule | `~/.cursor/rules/ponytail.mdc` |
| Codex AGENTS | `~/.codex/AGENTS.md` (ponytail section) |
| Config | `~/.config/ponytail/config.json` → `defaultMode: full` |
| Claude skills (copy) | `~/.claude/skills/ponytail*` |
| Docs copy | `docs/PONYTAIL-AGENTS.md` |

## CLI install (if plugins available)

```bash
# Claude Code
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail

# Codex
codex plugin marketplace add DietrichGebert/ponytail
codex plugin add ponytail@ponytail
# then open /hooks and trust lifecycle hooks; new thread
```

## Modes

`/ponytail lite|full|ultra|off` — default **full**

## Ladder (before writing code)

1. Need to exist? 2. Already in codebase? 3. Stdlib? 4. Native platform? 5. Installed dep? 6. One line? 7. Minimum that works.

Never skip: trust-boundary validation, data-loss handling, security, a11y.
