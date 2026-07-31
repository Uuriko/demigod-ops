# Laptop blue-moon check (once every ~2 weeks)

**Remember:** periodically audit the laptop for speed, heat, excess tabs/processes, and small quality-of-life tooling.  
Not every hour — **once in a blue moon** (~14 days), or when the machine feels hot/slow.

## One command

```bash
bin/dg-laptop-blue-moon          # prune CDP tabs + snapshot + stamp
bin/dg-laptop-blue-moon --full   # + log trim + hung-agent kill (safe list)
bin/dg-laptop-blue-moon --due    # exit 0 if last run ≥14d ago
```

Stamp: `/tmp/dg-busy/laptop-blue-moon.stamp`  
Receipt: `/tmp/dg-busy/laptop-blue-moon-latest.json`  
Also: `node demigod-laptop-hygiene.mjs --prune` · `bin/dg hygiene --prune`

## Checklist

### Always safe
1. **CDP tabs** — keep **4–8** real pages: Ops `:9878`, live site, Designer, Custom Code. Prune the rest.
2. **Load / mem** — `uptime` + `free -h`. If load ≫ cores or free mem low, prune tabs and pause extra agent swarms.
3. **Hung agents** — long stuck `claude --print` / playtests ≥25m: `node demigod-laptop-hygiene.mjs --kill-hung` (never kill CDP Chrome).
4. **Busy logs** — trim huge `/tmp/dg-busy/*.log` (`--optimize` does this).
5. **GNOME Orca TTS** — screen reader not needed; `pkill -x orca` if speaking (not Orca IDE).

### Speed / heat (this machine)
6. **Thermals** — `sensors` · Package id 0 often the snappiness killer. Lift laptop, clear vents.
7. **Power** — AC: `system76-power profile performance` for ship bursts; daily: **balanced** if hot.
8. **Swappiness** — if `cat /proc/sys/vm/swappiness` ≫ 60, set **10** (needs sudo):
   ```bash
   sudo sysctl -w vm.swappiness=10
   echo vm.swappiness=10 | sudo tee /etc/sysctl.d/99-demigod-swappiness.conf
   ```
9. **cosmic-comp** — multi-day high CPU → log out/in or reboot compositor session.
10. **Long interactive codex/claude** — restart idle multi-day sessions to free hundreds of MB.

### Demigod loops
11. Useful-loop should stay up; `funnel-loop.STOP` is fine when the funnel loop is intentionally paused.
12. Don’t stack quality-loop, full funnel selftests, and multiple model consultations.

### Optional tools to install (if missing)
| Tool | Why |
|------|-----|
| `btop` / `htop` | live process view |
| `nvtop` | GPU if relevant |
| `duf` / `dust` | disk usage clearer than df/du |
| `ripgrep` / `fd` | already common on this box |

```bash
# Pop/Ubuntu examples (only if you want them)
# sudo apt install btop htop duf
```

### Customizations worth keeping
- `bin/dg-laptop-blue-moon` — this pass
- `demigod-laptop-hygiene.mjs` — tab prune + hung kill
- `demigod-tab-hygiene.timer` — periodic tab hygiene if enabled

## When the useful-loop should nudge
`demigod-work-find.mjs` flags `laptop-blue-moon` when the stamp is older than **14 days** (or missing). Task runs `bin/dg-laptop-blue-moon`.

## Do not
- Kill CDP Chrome (`:9223`) or Events tunnel casually
- Force-publish under freeze
- `rm -rf` busy dirs as a “speedup”
