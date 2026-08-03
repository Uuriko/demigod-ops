/** Shared board JSON helpers — signal, receipts, and pilots. */
import fs from 'fs';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import { BOARD_PATH, loadBoard, saveBoard, isRealReceipt } from './demigod-submissions-lib.mjs';

export function weekLabel(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  return `Week ${week}`;
}

export function computeSignal(board = {}) {
  // honest: no invented math score — real counts only (mirrors foot-core renderSignal)
  // isSeedRole (not a bare id regex) — seeds carry sample:true with random ids, so an
  // id-prefix test counted every seed as real and poisoned signal.realRoles.
  const roles = (board.roles || []).filter((r) => !isSeedRole(r));
  const realReceipts = (board.receipts || []).filter(isRealReceipt).length;
  return {
    score: null,
    realRoles: roles.length,
    realReceipts,
    slotsTaken: Math.max(roles.length, board.signal?.slotsTaken || 1),
    slotsMax: board.signal?.slotsMax || 12,
    weekLabel: board.signal?.weekLabel || weekLabel(),
  };
}

export function nextReceiptNumber(board = {}) {
  const nums = (board.receipts || []).map((r) => Number(r.number) || 0);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

export function mintReceipt(board = {}, { intros = 3, status = 'delivered', note = '' } = {}) {
  const number = nextReceiptNumber(board);
  const hash = crypto.randomBytes(6).toString('hex');
  // intros is a proof claim ("N intros delivered") — coerce to a safe whole number like appendPilot
  // (c302): negative/NaN → 0, positive fractional floored. Number(intros)||0 let -5 and 3.7 through:
  // `--intros=-5` would mint "−5 intros delivered".
  const nIntros = Number(intros);
  const receipt = {
    hash,
    number,
    intros: Number.isFinite(nIntros) && nIntros > 0 ? Math.floor(nIntros) : 0,
    status,
    note: String(note || '').trim(),
    at: new Date().toISOString(),
  };
  board.receipts = [receipt, ...(board.receipts || [])].slice(0, 24);
  board.signal = computeSignal(board);
  return receipt;
}

export function isSeedRole(r = {}) {
  return !!(r.sample || /^role-seed/i.test(r.id || '') || /^cand-seed/i.test(r.id || ''));
}

export function ledgerRoleNote(r = {}) {
  if (r.outcome) return String(r.outcome);
  if (r.note) return String(r.note);
  if (r.pilot && Number(r.intros) > 0) {
    const n = Number(r.intros);
    return `${n} human intro${n === 1 ? '' : 's'} delivered.`;
  }
  if (r.pilot) return 'Brief received · human review in progress.';
  if (isSeedRole(r)) return 'Sample pipeline row — warming up.';
  return 'Brief open · humans reviewing fit.';
}

export function ledgerRoles(board = {}, limit = 8) {
  const roles = board.roles || [];
  const seen = {};
  const out = [];
  roles
    .slice()
    .sort((a, b) => new Date(b.featuredAt || 0) - new Date(a.featuredAt || 0))
    .forEach((r) => {
      const key = `${r.title || ''}|${r.stageType || ''}`;
      if (seen[key]) return;
      seen[key] = 1;
      out.push({
        ...r,
        outcome: r.outcome || ledgerRoleNote(r),
        sample: r.sample ?? isSeedRole(r),
      });
    });
  return out.slice(0, limit);
}

export function latestReceipt(board = {}) {
  const list = board.receipts || [];
  if (!list.length) return null;
  return list.slice().sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))[0];
}

export function appendPilot(board = {}, {
  founder = '',
  brief = '',
  intros = 0,
  quote = '',
  outcome = '',
  stage = 'Active',
  stageType = 'Pre-seed · SF startup',
  withReceipt = true,
} = {}) {
  // intros is a delivered-count: coerce a bad --intros to a safe whole number so it can't mint
  // "Infinity intros delivered" text or a JSON-null intros field. Non-finite/negative/NaN → 0;
  // a positive fractional is floored (3.7 → 3), not rejected — don't "fix" this to isInteger.
  const n = Number(intros);
  const introN = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  const roleOutcome = String(outcome || '').trim()
    || (introN > 0 ? `${introN} human intro${introN === 1 ? '' : 's'} delivered.` : 'Brief received · human review in progress.');
  const role = {
    id: `role-${Date.now().toString(36)}`,
    title: String(brief || 'Open role').slice(0, 60),
    stageType: String(stageType).slice(0, 80),
    skills: 'Human-curated brief',
    comp: 'Comp on intro',
    status: String(stage).slice(0, 40),
    featuredAt: new Date().toISOString(),
    pilot: true,
    sample: false,
    outcome: roleOutcome,
    intros: introN || undefined,
    founderTag: founder ? 'logged' : undefined,
  };
  board.roles = [role, ...(board.roles || []).filter((r) => !/^role-seed/i.test(r.id || ''))].slice(0, 8);
  if (quote) {
    board.testimonials = [{ quote: String(quote).slice(0, 280), at: new Date().toISOString() }, ...(board.testimonials || [])].slice(0, 3);
  }
  let receipt = null;
  if (withReceipt && introN > 0) {
    receipt = mintReceipt(board, {
      intros: introN,
      status: 'delivered',
      note: `${role.title} · pilot logged`,
    });
    board.velocity = `1 brief → ${introN} intro${introN === 1 ? '' : 's'} → pipeline active`;
  }
  board.signal = computeSignal(board);
  board.milestones = board.milestones || [];
  board.milestones.unshift({
    at: new Date().toISOString(),
    text: `${role.title} · ${stage}`,
    intros: introN,
  });
  board.milestones = board.milestones.slice(0, 6);
  return { board, role, receipt };
}

export function defaultBoardExtras(board = {}) {
  board.signal = computeSignal(board);
  if (!board.velocity) board.velocity = 'Briefs reviewed · intros on fit only';
  if (!board.receipts?.length) {
    board.receipts = [{
      hash: 'demo004',
      number: 4,
      intros: 3,
      status: 'delivered',
      note: 'Sample receipt — replace when first pilot ships',
      at: new Date().toISOString(),
    }];
  }
  return board;
}

/** Prefer saveBoard(board, { reason, actor }) — single persist path. */
export function writeBoard(board, opts = {}) {
  return saveBoard(board, { reason: opts.reason || 'board-lib.writeBoard', actor: opts.actor, ...opts });
}

// Library only — direct CLI runs must not soft-succeed as empty exit 0.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.error('board-lib: library module — import from demigod-board-lib.mjs (no CLI)');
  process.exit(2);
}
