<!-- agent-task: 20260812210256825-347927-f28nkp; role: codex; completed: 2026-08-12T21:10:35.515Z; raw model output, verify before promotion -->
Blocked before implementation by the sandbox.

What I verified:
- Issue #16268 is still open: https://github.com/elizaOS/eliza/issues/16268
- `/home/potter/src/eliza` is on `develop` at `b9dec8f6`, matching `upstream/develop`.
- Existing package smoke is not fail-closed:
  - `.github/workflows/snap-publish.yml` builds/publishes snap without install/version/help smoke.
  - `packages/app-core/scripts/build-flatpak.mjs` builds a bundle but does not install/run/assert it.
  - `.github/workflows/release-electrobun.yml` has packaged macOS smoke with `continue-on-error: true`.
  - Linux package artifacts are built/uploaded without version/help launcher assertions.

Hard blocker:
- Required bus claims failed: `EROFS: read-only file system, open '/tmp/dg-busy/agent-bus/messages.jsonl'`
- Branch creation failed: `fatal: Unable to create '/home/potter/src/eliza/.git/index.lock': Read-only file system`
- No edits, commit, verification log, heartbeat, or PR could be produced from this read-only session.

No PR URL exists. I also could not write the requested out-path summary because no out path was provided and the filesystem is read-only.
