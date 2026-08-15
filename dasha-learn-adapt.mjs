/**
 * Dasha /learn adaptive picker — pure. No I/O.
 * state: { track, difficulty:0|1|2, skills:{[id]:{m:0-3,elo:1000}}, done, queue }
 */
export const ELO_K = 40;
export const ELO_D = [800, 1000, 1200];
export const STUDY = { chill: 0, normal: 1, mean: 2 };

export function createState(track, { study = 'normal' } = {}) {
  const difficulty = STUDY[study] ?? 1;
  return { track: String(track || 'crypto'), difficulty, skills: {}, done: [], queue: [], fresh: 0 };
}

export function skillOf(state, id) {
  const row = state?.skills?.[id];
  return { m: clampInt(row?.m, 0, 3), elo: Number.isFinite(Number(row?.elo)) ? Number(row.elo) : 1000 };
}

export function struggleCount({ wrongs = 0, explainAgain = 0, felt, dwell } = {}) {
  return (Number(wrongs) > 0 ? Number(wrongs) : 0)
    + (Number(explainAgain) > 0 ? Number(explainAgain) : 0)
    + (felt === 'hard' ? 1 : 0)
    + (dwell ? 1 : 0);
}

export function collectSignals(input = {}) {
  const felt = input.felt === 'easy' || input.felt === 'hard' ? input.felt : 'ok';
  const wrongs = Math.max(0, Number(input.wrongs) || 0);
  const explainAgain = Math.max(0, Number(input.explainAgain) || 0);
  const dwell = Boolean(input.dwell) || Number(input.dwellMs) > 40_000;
  return {
    passed: Boolean(input.passed),
    felt,
    wrongs,
    explainAgain,
    easyDoor: Boolean(input.easyDoor),
    dwell,
    struggle: struggleCount({ wrongs, explainAgain, felt, dwell }),
  };
}

export function nextDifficulty(difficulty, signals) {
  const cur = clampInt(difficulty, 0, 2);
  if (signals.easyDoor || signals.struggle >= 2 || !signals.passed) return Math.max(0, cur - 1);
  if (signals.passed && signals.felt === 'easy' && signals.struggle === 0) return Math.min(2, cur + 1);
  return cur;
}

/** Tug-of-war +1/−1. Lock at 3. */
export function updateMastery(skill, passed) {
  const cur = skillOf({ skills: { x: skill } }, 'x');
  if (cur.m >= 3) return { ...cur, m: 3 };
  return { ...cur, m: clampInt(cur.m + (passed ? 1 : -1), 0, 3) };
}

export function updateElo(skill, passed, difficulty) {
  const cur = skillOf({ skills: { x: skill } }, 'x');
  const d = ELO_D[clampInt(difficulty, 0, 2)] ?? 1000;
  const expected = 1 / (1 + 10 ** ((d - cur.elo) / 400));
  return { ...cur, elo: Math.round(cur.elo + ELO_K * ((passed ? 1 : 0) - expected)) };
}

export function applyStudyControl(state, study) {
  const difficulty = STUDY[study];
  if (difficulty == null) return state;
  return { ...state, difficulty };
}

/** Crypto door skip: land on C04, wallet+sol mastery 1. */
export function skipOnChain(state) {
  const skills = { ...state.skills };
  skills.wallet = { ...skillOf(state, 'wallet'), m: Math.max(1, skillOf(state, 'wallet').m) };
  skills.sol = { ...skillOf(state, 'sol'), m: Math.max(1, skillOf(state, 'sol').m) };
  const queue = ['C04', ...(state.queue || []).filter((id) => id !== 'C04')];
  return { ...state, skills, queue };
}

export function mergeProgress(local, remote) {
  const a = local || createState('crypto');
  const b = remote || {};
  const skills = { ...a.skills };
  for (const [id, row] of Object.entries(b.skills || {})) {
    const cur = skillOf({ skills }, id);
    const other = skillOf({ skills: { [id]: row } }, id);
    skills[id] = { m: Math.max(cur.m, other.m), elo: Math.max(cur.elo, other.elo) };
  }
  return {
    ...a,
    skills,
    done: [...new Set([...(a.done || []), ...(b.done || [])])],
    queue: a.queue?.length ? a.queue : (b.queue || []),
  };
}

/**
 * After every 2 new modules, interleave a retrieval.
 * Else unseen in {diff, diff-1}; Elo tie-break; bank order fallback.
 * Cold start: first module *01.
 */
export function pickNext(state, bank) {
  const track = state?.track;
  const list = (bank || []).filter((mod) => !track || mod.track === track);
  if (!list.length) return null;
  const done = new Set(state.done || []);
  if (done.size === 0) {
    const queued = (state.queue || []).find((id) => list.some((mod) => mod.id === id));
    if (queued) return list.find((mod) => mod.id === queued) || null;
    return list.find((mod) => /01$/.test(mod.id)) || list[0];
  }
  const queued = (state.queue || []).find((id) => list.some((mod) => mod.id === id) && !done.has(id));
  if (queued) return list.find((mod) => mod.id === queued) || null;
  const fresh = Number(state.fresh) || 0;
  if (fresh >= 2) {
    const retrieval = pickFrom(list.filter((mod) => done.has(mod.id)), state, list);
    if (retrieval) return retrieval;
  }
  const diff = clampInt(state.difficulty, 0, 2);
  const unseen = list.filter((mod) => !done.has(mod.id));
  const band = unseen.filter((mod) => mod.difficulty === diff || mod.difficulty === diff - 1);
  return pickFrom(band.length ? band : unseen, state, list);
}

export function applyModule(state, mod, rawSignals) {
  const signals = collectSignals(rawSignals);
  const skillId = mod?.skill || 'gen';
  const prev = skillOf(state, skillId);
  const nextSkill = updateElo(updateMastery(prev, signals.passed), signals.passed, mod?.difficulty ?? state.difficulty);
  const done = [...new Set([...(state.done || []), mod.id])];
  const wasNew = !(state.done || []).includes(mod.id);
  const retrieval = !wasNew || (Number(state.fresh) >= 2 && (state.done || []).includes(mod.id));
  const fresh = retrieval ? 0 : (Number(state.fresh) || 0) + (wasNew ? 1 : 0);
  return {
    ...state,
    difficulty: nextDifficulty(state.difficulty, signals),
    skills: { ...state.skills, [skillId]: nextSkill },
    done,
    queue: (state.queue || []).filter((id) => id !== mod.id),
    fresh: Math.min(2, fresh),
  };
}

function pickFrom(pool, state, bank) {
  if (!pool.length) return null;
  const ranked = [...pool].sort((a, b) => {
    const ea = skillOf(state, a.skill).elo;
    const eb = skillOf(state, b.skill).elo;
    if (ea !== eb) return ea - eb;
    return bank.indexOf(a) - bank.indexOf(b);
  });
  return ranked[0];
}

function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}
