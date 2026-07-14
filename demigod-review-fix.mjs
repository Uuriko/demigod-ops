#!/usr/bin/env node
/**
 * demigod-review-fix — tier A safe auto-fixers only
 *
 * Never invents logic. Safe transforms:
 *  - strip trailing whitespace
 *  - ensure trailing newline
 *  - expand leading tabs when file is space-dominant
 *  - collapse 3+ consecutive blank lines → 2 (mjs/js/md only)
 *  - strip UTF-8 BOM
 *
 * Never touches demigod-foot-core.js unless allowFoot=true.
 */
import path from 'path';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { ROOT, syntaxCheck } from './demigod-review-lib.mjs';

/**
 * @returns {{ fixes: string[], next: string, changed: boolean }}
 */
export function computeSafeFixes(rel, src) {
  const fixes = [];
  let next = src;

  if (!/\.(mjs|js|cjs|html|css|md|json|txt)$/.test(rel)) {
    return { fixes, next, changed: false };
  }

  // UTF-8 BOM
  if (next.charCodeAt(0) === 0xfeff) {
    fixes.push('strip-bom');
    next = next.slice(1);
  }

  const noTrail = next
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n');
  if (noTrail !== next) {
    fixes.push('strip-trailing-whitespace');
    next = noTrail;
  }

  // Collapse 3+ blank lines to 2 (not minified single-line dumps)
  if (/\.(mjs|js|cjs|md)$/.test(rel) && next.includes('\n\n\n')) {
    const collapsed = next.replace(/\n{3,}/g, '\n\n');
    if (collapsed !== next) {
      fixes.push('collapse-extra-blank-lines');
      next = collapsed;
    }
  }

  if (next.length && !next.endsWith('\n')) {
    fixes.push('trailing-newline');
    next = next + '\n';
  }

  // Only expand leading tabs when file is mostly space-indented
  if (/\.(mjs|js|cjs)$/.test(rel) && next.includes('\t')) {
    const spaceLines = (next.match(/^ {2}/gm) || []).length;
    const tabLines = (next.match(/^\t/gm) || []).length;
    if (spaceLines > tabLines && tabLines > 0) {
      const detab = next.replace(/^\t+/gm, (m) => '  '.repeat(m.length));
      if (detab !== next) {
        fixes.push('expand-leading-tabs');
        next = detab;
      }
    }
  }

  return { fixes, next, changed: next !== src };
}

/**
 * Apply tier-A fixes.
 * @returns {Array<{file:string,dryRun:boolean,fixes:string[],syntaxBroken?:boolean,syntaxDetail?:string}>}
 */
export function applySafeFixes(files, { dryRun = false, allowFoot = false, readRel } = {}) {
  const applied = [];
  for (const rel of files) {
    if (path.basename(rel) === 'demigod-foot-core.js' && !allowFoot) {
      applied.push({ file: rel, dryRun, fixes: [], skipped: 'foot-core (use --allow-foot)' });
      continue;
    }
    const src = readRel(rel);
    if (src == null) continue;
    const { fixes, next, changed } = computeSafeFixes(rel, src);
    if (!changed) continue;
    if (dryRun) {
      applied.push({ file: rel, dryRun: true, fixes });
    } else {
      const abs = path.join(ROOT, rel);
      const prev = src;
      atomicWrite(abs, next);
      const syn = syntaxCheck(rel);
      if (syn) {
        // Rollback — never leave tier-A "safe" fix in a broken state
        atomicWrite(abs, prev);
        applied.push({
          file: rel,
          dryRun: false,
          fixes,
          syntaxBroken: true,
          rolledBack: true,
          syntaxDetail: syn?.detail,
        });
      } else {
        applied.push({
          file: rel,
          dryRun: false,
          fixes,
          syntaxBroken: false,
          rolledBack: false,
        });
      }
    }
  }
  return applied;
}
