# Oryx workstation roadmap

Updated: 2026-08-06

## Strategic idea

Treat the 2017 Oryx Pro as a mostly plugged-in **local control plane**, not as a modern all-day mobile laptop.

Its 62 GiB RAM, fast 1 TB NVMe and 8 GiB GTX 1070 remain unusually useful for development, browser automation, small local models and media work. Its 30% battery health, older Intel 8265 Wi-Fi and four CPU cores make battery-first customization, huge model serving and many always-on agents poor fits.

## Ranked roadmap

| Rank | Capability | Value | Cost/risk | Decision |
|---:|---|---|---|---|
| 1 | Encrypted versioned backup | Prevents the only catastrophic failure: losing the workspace or home directory | Requires a separate destination and secret handling | **Next once a destination exists** |
| 2 | Controlled OS/COSMIC update | Security, Intel microcode, Wi-Fi and substantial COSMIC fixes are cached as available | Replaces active desktop packages and requires a clean reboot window | **Plan, do not run mid-session** |
| 3 | Local AI trial | GTX 1070 is explicitly supported by Ollama; 8 GiB VRAM can host useful quantized 7–8B-class models | Heat, power and weaker performance than modern tensor-core GPUs | **Benchmark on demand; no autostart** |
| 4 | Private speech-to-text | GPU-assisted whisper.cpp could turn voice notes or meetings into local text without uploading audio | Build/model storage and microphone workflow | **Useful after one real recording use case** |
| 5 | Private device bridge | Tailscale can provide stable encrypted access, private service sharing and cross-network transfer | Adds an identity/network dependency | **Best if there is a second owned device** |
| 6 | Local-only transfer | LocalSend is simple and cross-platform without an account | Guest Wi-Fi may isolate devices; it is transfer, not sync | **Use instead of Tailscale only on trusted LANs** |
| 7 | Continuous device sync | Syncthing can sync peer-to-peer with TLS | Sync propagates deletions and is not backup; adds discovery metadata and a daemon | **Only for a named two-device folder** |
| 8 | Rootless containers | Podman is daemonless and Quadlet integrates cleanly with user systemd | Images consume disk and add another packaging layer | **Install only when isolation solves a real project problem** |

## Phase 1 — resilience

### 1. Backup design

Use Restic once an external disk, NAS or object-storage destination is selected.

Why Restic fits:

- encryption is native;
- snapshots are deduplicated and independently restorable;
- retention supports hourly/daily/weekly/monthly policies;
- repository integrity can be checked;
- it works with local and remote backends.

Initial backup scope should include user-created work and configuration, but exclude reproducible bulk caches:

- include `/home/potter` work repositories, documents, `.ssh`, `.gnupg`, `.config`, and selected application profiles;
- exclude browser caches, package caches, `node_modules`, model blobs and disposable build output;
- store the Restic password outside the repository and outside the sole laptop;
- perform one test restore before calling the backup complete.

No backup job should be created until its destination and recovery-secret location are real. The Pop!_OS recovery partition repairs the OS; it does not preserve personal work.

### 2. Maintenance window

The cached package list includes security updates, `amd64-microcode`, certificates and a large COSMIC update. The safe sequence is:

1. complete and verify the first backup;
2. capture `laptop snapshot`;
3. update system packages and recovery media on AC power;
4. reboot once;
5. verify NVIDIA, Wi-Fi, COSMIC shortcuts, audio and the laptop audit;
6. inspect high-priority boot errors rather than tuning blindly.

The earlier Intel `iwlwifi` firmware crash recovered automatically. Prefer the supported kernel/microcode update path before driver parameters.

## Phase 2 — private local compute

### Local model lane

Ollama’s current hardware table includes the GTX 1070 (compute capability 6.1), and this machine’s NVIDIA 580 driver exceeds Ollama’s 570 minimum for capability 5.0–6.2.

The useful ceiling is a quantized model that fits mostly inside 8 GiB VRAM. Start with one small coding/general model, measure tokens/second, VRAM, GPU temperature and answer quality, then keep or remove it. Do not install a model zoo or expose the API beyond localhost.

Good local jobs:

- private first-pass summaries;
- offline document classification;
- short code explanation and transformation;
- structured extraction from local notes;
- fallback work when an API is unavailable.

Poor local jobs:

- frontier-quality product strategy;
- giant contexts;
- many concurrent agents;
- an always-running public endpoint.

### Local voice lane

whisper.cpp is a better second GPU experiment than image generation because it produces a concrete workflow artifact: searchable local text from voice notes and recordings. Keep audio and transcripts local by default and start with file transcription, not a background microphone daemon.

## Phase 3 — device fabric

Choose exactly one initial transfer/network path:

### Tailscale when devices are on different or hostile networks

- stable device addressing behind NAT;
- encrypted peer-to-peer links;
- private `Serve` for local dashboards;
- Taildrop for owned-device file transfer, acknowledging its alpha status;
- no public Funnel unless a specific service must be public.

This is the stronger fit while using guest Wi-Fi, where access-point isolation can defeat LocalSend and local discovery.

### LocalSend when devices share a trusted LAN

- no account or cloud relay;
- HTTPS transfer between nearby devices;
- simple phone/desktop handoff.

It is not remote access, durable synchronization or backup.

### Syncthing only for continuous folders

Use it only when a named folder genuinely needs live two-device replication. Turn on file versioning at the receiving device and remember that local edits are not versioned there. Global discovery leaks device-presence metadata; make that an explicit privacy choice.

## Phase 4 — work modes

COSMIC workspaces should be the visual layer; transient systemd scopes should become the resource layer.

Candidate modes:

- **Focus:** balanced power, prune disposable automation tabs, workspace 2 tiled for editor/terminal, no background agents.
- **Research:** browser workspace plus a bounded local model; preserve one verification browser page per project.
- **Render:** performance profile for a finite command, then automatically return to balanced.
- **Travel:** battery profile, lower brightness, no local model and no unnecessary services.

The resource-control implementation can use native `systemd-run --user --scope` with CPU and memory properties, but only after a real runaway command is identified. With 49 GiB currently available, static global limits would solve no present problem.

## Ideas deliberately rejected for now

- Reinstalling or changing filesystems merely to gain snapshot features
- Forced battery charge thresholds unsupported by this firmware
- Custom kernels or Wi-Fi module flags after one recovered firmware event
- Kubernetes, Docker Desktop or a permanent container daemon
- Multiple sync products at once
- A local model server starting at login
- Publicly tunneling development services by default
- Bulk-closing the personal Firefox session without classifying its state
- Desktop-extension collections that duplicate COSMIC’s native launcher, tiling and workspaces

## Decision gates

1. **Backup:** destination exists, secret recovery path exists, test restore succeeds.
2. **Update:** backup passes and a reboot window exists.
3. **Local AI:** one task is named; benchmark beats CPU/cloud friction enough to keep it.
4. **Device bridge:** a second device and desired access pattern are named.
5. **Containers:** a project needs isolation or reproducibility that native tooling does not already provide.

## Primary research

- [Ollama hardware support](https://docs.ollama.com/gpu)
- [Restic encryption](https://restic.readthedocs.io/en/stable/070_encryption.html)
- [Restic commands and integrity checks](https://restic.readthedocs.io/en/stable/manual_rest.html)
- [Syncthing security model](https://docs.syncthing.net/users/security.html)
- [Syncthing file versioning](https://docs.syncthing.net/users/versioning)
- [Tailscale device connectivity](https://tailscale.com/docs/how-to/connect-to-devices)
- [Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve)
- [Tailscale Taildrop](https://tailscale.com/docs/features/taildrop)
- [LocalSend repository and protocol summary](https://github.com/localsend/localsend)
- [Podman rootless operation](https://docs.podman.io/en/latest/markdown/podman.1.html)
- [Podman Quadlet and user systemd](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
- [Linux pressure-stall information](https://docs.kernel.org/accounting/psi.html)
- [COSMIC keyboard workflow](https://system76.com/support/articles/pop-cosmic-keyboard-shortcuts)
