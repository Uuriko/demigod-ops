#!/usr/bin/env node
/**
 * demigod-review-fix — tier A safe auto-fixers only
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

  if (!/\.(mjs|js|html|css|md|json)$/.test(rel)) {
    return { fixes, next, changed: false };
  }

  const noTrail = next
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n');
  if (noTrail !== next) {
    fixes.push('strip-trailing-whitespace');
    next = noTrail;
  }

  if (next.length && !next.endsWith('\n')) {
    fixes.push('trailing-newline');
    next = next + '\n';
  }

  // Only expand leading tabs when file is mostly space-indented
  if (/\.mjs$/.test(rel) && next.includes('\t')) {
    const spaceLines = (next.match(/^  /gm) || []).length;
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
 * Apply tier-A fixes. Never touches foot-core unless --allow-foot.
 */
export function applySafeFixes(files, { dryRun = false, allowFoot = false, readRel } = {}) {
  const applied = [];
  for (const rel of files) {
    if (path.basename(rel) === 'demigod-foot-core.js' && !allowFoot) continue;
    const src = readRel(rel);
    if (src == null) continue;
    const { fixes, next, changed } = computeSafeFixes(rel, src);
    if (!changed) continue;
    if (dryRun) {
      applied.push({ file: rel, dryRun: true, fixes });
    } else {
      atomicWrite(path.join(ROOT, rel), next);
      const syn = syntaxCheck(rel);
      applied.push({
        file: rel,
        dryRun: false,
        fixes,
        syntaxBroken: Boolean(syn),
        syntaxDetail: syn?.detail,
      });
    }
  }
  return applied;
}
