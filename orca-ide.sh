#!/usr/bin/env bash
# Launch Orca IDE — clean PATH so computer-use finds system python3+gi (not pyenv).
export PATH="/usr/bin:${HOME}/.local/bin:/usr/local/bin:/bin:/usr/sbin:/sbin"
unset PYENV_ROOT PYENV_SHELL PYENV_VERSION
# Pop!_OS Wayland + Vulkan can crash Electron (exit 135); prefer X11.
export ELECTRON_OZONE_PLATFORM_HINT=x11
exec "${HOME}/orca-linux.AppImage" --no-sandbox --ozone-platform=x11 "$@"