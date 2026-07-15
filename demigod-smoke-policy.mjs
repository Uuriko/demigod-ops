/**
 * Soft foot drift policy (shared by smoke + selftests — no CDP).
 */
export function classifyFootDrift({ freezeOn, diskVer, liveVer }) {
  const liveN = String(liveVer || '')
    .replace(/^foot\s*/i, '')
    .replace(/^v/i, '')
    .trim();
  const diskN = diskVer != null ? String(diskVer).replace(/^v/i, '') : null;
  const footVersionMatch = Boolean(diskN && liveN && diskN === liveN);
  const driftExpected = Boolean(freezeOn && !footVersionMatch && diskN && liveN);
  return {
    footVersionMatch,
    driftExpected,
    softDrift: driftExpected,
    footVersionSeverity: footVersionMatch ? 'ok' : driftExpected ? 'warn' : 'info',
    note: driftExpected
      ? `WARN soft: disk v${diskN} ≠ live v${liveN} (freeze ON — not core fail)`
      : !footVersionMatch && diskN
        ? `disk v${diskN} vs live ${liveVer} — hard when freeze OFF: bin/dg truth --require-match`
        : null,
  };
}
