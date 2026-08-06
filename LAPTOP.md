# Potter laptop control card

Updated: 2026-08-06

Deep research and ranked next steps: [`LAPTOP-ROADMAP.md`](LAPTOP-ROADMAP.md).

## Machine truth

- Pop!_OS 24.04 LTS with COSMIC on Wayland
- Intel i7-7820HK: 4 cores / 8 threads
- NVIDIA GTX 1070 Mobile
- 62 GiB RAM, 1 TB Samsung 960 Pro NVMe
- System76 balanced power profile
- Battery health is about **30%**: 18.3 Wh full versus 60.2 Wh design capacity. Software cannot restore that lost capacity.
- No dedicated backup tool was detected.
- `df` intermittently stalls during mount enumeration; the control command contains this with a timeout. This commonly points to a stale userspace/network mount and deserves a separate mount audit if it persists.

## One command

`bin/laptop` uses only Bash, Python’s standard library, systemd, UPower and System76’s native utility.

```bash
laptop status       # concise hardware/session health
laptop tabs         # list automation-browser pages
laptop tabs-prune   # close localhost tests, setup pages and exact duplicates
laptop focus        # prune automation tabs + choose balanced power
laptop battery      # System76 battery-life profile
laptop balanced     # normal profile
laptop performance  # temporary maximum-performance profile
laptop snapshot     # save current status under ~/.local/state/laptop-audit/
```

`tabs-prune` deliberately leaves distinct non-local pages alone. It does not alter Firefox or unknown personal tabs.

## COSMIC workflow worth using

COSMIC already supplies most of the useful “power user” behavior without extensions:

- `Super` opens the launcher; `t:` runs a terminal command, `:` runs a shell command, `/` browses files and `=` calculates.
- `Super+Y` toggles tiling for the current workspace.
- `Super+S` stacks windows into tabs.
- `Super+Ctrl+direction` changes workspaces; `Shift+Super+Ctrl+direction` moves the active window.
- `Super+1…9` jumps directly to a workspace.
- Pinned workspaces retain their tiling state after reboot. A useful native layout is workspace 1 for communication, 2 for code/terminal, 3 for browser verification and 4 for research.

These are supported COSMIC features, not fragile config-file edits. Customize bindings in COSMIC Settings → Input Devices → Keyboard → Keyboard Shortcuts.

## Changes made in this audit

- Closed nine excess Chrome automation tabs; retained one live Dasha page.
- Disabled and stopped paused Demigod background services and timers.
- Stopped and disabled the completed COSMIC Initial Setup autostart entry.
- Disabled three failed legacy X11-session autostarts (`hidpi-daemon`, `hidpi-frontend`, and `nvidia-settings-autostart`) under COSMIC Wayland; COSMIC keeps native display scaling.
- Added the dependency-free `laptop` control command.

## Important next layers

### Backup before cleverness

The disk has a Pop!_OS recovery partition, but recovery is not a backup of personal files. The next meaningful system addition is an encrypted, versioned backup to a separate physical destination. A destination has not been assumed or configured.

### Battery

System76 documents charge thresholds for supported firmware, but this machine exposes no Linux charge-threshold attributes. Do not force unsupported kernel interfaces. Balanced mode is the sensible plugged-in default; battery mode is available for unplugged work.

### GPU

Graphics switching requires model support and a reboot. This audit did not force a graphics-mode change. The current GTX 1070 remains useful for browser rendering, media and compatible local compute, while balanced CPU power avoids unnecessary heat during ordinary work.

### Updates

The cached package index reports security, CPU microcode and substantial COSMIC updates. They were audited but not applied during an active graphical session because replacing the desktop stack can require a reboot. Firmware inventory reports the System76 firmware's last update state as successful and the Samsung NVMe as update-capable.

## Primary references

- [Pop!_OS 24.04 COSMIC keyboard shortcuts](https://system76.com/support/articles/pop-cosmic-keyboard-shortcuts)
- [Pop!_OS basics and persistent workspaces](https://support.system76.com/support/articles/pop-basics)
- [System76 battery-life guidance](https://support.system76.com/support/articles/battery)
- [System76 battery thresholds](https://support.system76.com/articles/laptop-battery-thresholds/)
- [System76 graphics switching](https://support.system76.com/support/articles/graphics-switch-pop)
- [Pop!_OS recovery partition](https://support.system76.com/support/articles/pop-recovery)
- [Flatpak maintenance](https://docs.flatpak.org/en/latest/using-flatpak.html)
- [Linux power-supply interface](https://docs.kernel.org/power/power_supply_class.html)
