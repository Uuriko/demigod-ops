/**
 * Soft foot drift policy (shared by smoke + selftests — no CDP).
 * Soft when freeze ON **or** prepare-only (publish unauthorized / truth prepareOnlyRelease).
 */
export function classifyFootDrift({ freezeOn, diskVer, liveVer, prepareOnly = false }) {
  const liveN = String(liveVer || '')
    .replace(/^foot\s*/i, '')
    .replace(/^v/i, '')
    .trim();
  const diskN = diskVer != null ? String(diskVer).replace(/^v/i, '') : null;
  const footVersionMatch = Boolean(diskN && liveN && diskN === liveN);
  const softOk = Boolean(freezeOn || prepareOnly);
  const driftExpected = Boolean(softOk && !footVersionMatch && diskN && liveN);
  return {
    footVersionMatch,
    driftExpected,
    softDrift: driftExpected,
    footVersionSeverity: footVersionMatch ? 'ok' : driftExpected ? 'warn' : 'info',
    note: driftExpected
      ? prepareOnly && !freezeOn
        ? `WARN soft: disk v${diskN} ≠ live v${liveN} (prepare-only — publish unauthorized)`
        : `WARN soft: disk v${diskN} ≠ live v${liveN} (freeze ON — not core fail)`
      : !footVersionMatch && diskN
        ? `disk v${diskN} vs live ${liveVer} — hard when freeze OFF: bin/dg truth --require-match`
        : null,
  };
}
