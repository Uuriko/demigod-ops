#!/usr/bin/env node
/**
 * demigod-review-rules — pluggable rule catalog
 * Each rule: { id, sev, tier, run(ctx) => Finding[] }
 * ctx: { rel, src, root, isJs, isFoot, isMeta, bugMode }
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const GAME_RE =
  /ninjawhee-eat-the-sounds|overworld\.js|vinyl-.*\.js|game-progress\.js|pause-journal\.js|pixel-gfx\.js|eat-the-sounds\//;

function finding(partial) {
  return {
    id: crypto.randomBytes(4).toString('hex'),
    tier: 'C',
    ...partial,
  };
}

function lineNo(src, idx) {
  if (idx < 0) return null;
  return src.slice(0, idx).split('\n').length;
}

function findAll(src, re) {
  const out = [];
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = r.exec(src))) out.push({ index: m.index, match: m[0], groups: m });
  return out;
}

export const RULES = [
  {
    id: 'game-hard-stop',
    sev: 'critical',
    tier: 'C',
    run({ rel, src, isMeta }) {
      // Path only — never scan source (rule catalogs mention game names)
      if (isMeta) return [];
      if (GAME_RE.test(rel)) {
        return [
          finding({
            rule: 'game-hard-stop',
            sev: 'critical',
            file: rel,
            title: 'Game path in scope',
            detail: 'Eat the Sounds is archived — do not edit unless user reopens the game',
            fix: 'Revert game file changes',
            tier: 'C',
          }),
        ];
      }
      // Only flag source if it's an actual game file being edited (path already covered)
      return [];
    },
  },
  {
    id: 'esm-import-order',
    sev: 'critical',
    tier: 'C',
    run({ rel, src, isJs }) {
      if (!isJs) return [];
      const out = [];
      const lines = src.split('\n');
      let seenCode = false;
      let inBlock = false;
      let inImport = false;
      for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (inBlock) {
          if (t.includes('*/')) inBlock = false;
          continue;
        }
        if (t.startsWith('/*')) {
          if (!t.includes('*/')) inBlock = true;
          continue;
        }
        if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('#!')) continue;
        if (t === "'use strict';" || t === '"use strict";') continue;

        // Multi-line import { a, b } from 'x'
        if (/^import\s/.test(t) || /^import\s*['"]/.test(t)) {
          if (seenCode) {
            out.push(
              finding({
                rule: 'esm-import-order',
                sev: 'critical',
                file: rel,
                line: i + 1,
                title: 'Import after code (invalid ESM)',
                detail: t.slice(0, 100),
                fix: 'Move import to top of file',
                tier: 'C',
              }),
            );
          }
          // still open if no 'from' yet or unclosed brace
          inImport = !/from\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || (t.includes('{') && !t.includes('}'));
          if (/from\s+['"][^'"]+['"]/.test(t) && (!t.includes('{') || t.includes('}'))) inImport = false;
          continue;
        }
        if (inImport) {
          if (/from\s+['"][^'"]+['"]/.test(t) || /;\s*$/.test(t)) inImport = false;
          continue;
        }

        if (/^export\s.+\sfrom\s+['"]/.test(t)) {
          if (seenCode) {
            out.push(
              finding({
                rule: 'esm-import-order',
                sev: 'critical',
                file: rel,
                line: i + 1,
                title: 'export-from after code (invalid ESM)',
                detail: t.slice(0, 100),
                fix: 'Move with imports at top',
                tier: 'C',
              }),
            );
          }
          continue;
        }
        if (/^export\s/.test(t)) {
          seenCode = true;
          continue;
        }
        seenCode = true;
      }
      return out;
    },
  },
  {
    id: 'board-chokepoint',
    sev: 'high',
    tier: 'C',
    run({ rel, src, isJs }) {
      if (!isJs) return [];
      const out = [];
      for (const m of findAll(src, /writeFileSync\s*\(\s*[^)]*BOARD|fs\.writeFileSync\s*\([^)]*DEMIGOD-BOARD/g)) {
        out.push(
          finding({
            rule: 'board-chokepoint',
            sev: 'high',
            file: rel,
            line: lineNo(src, m.index),
            title: 'Direct board file write',
            detail: m.match.slice(0, 120),
            fix: 'Use saveBoard/writeBoard with {reason,actor}',
            tier: 'C',
          }),
        );
      }
      return out;
    },
  },
  {
    id: 'board-audit-meta',
    sev: 'medium',
    tier: 'B',
    run({ rel, src, isJs, isMeta }) {
      if (!isJs || isMeta) return [];
      const out = [];
      for (const m of findAll(src, /saveBoard\s*\(\s*[^,)]+\s*\)/g)) {
        if (!src.slice(m.index, m.index + 100).includes('{')) {
          out.push(
            finding({
              rule: 'board-audit-meta',
              sev: 'medium',
              file: rel,
              line: lineNo(src, m.index),
              title: 'saveBoard without {reason,actor}',
              detail: m.match.slice(0, 80),
              fix: "saveBoard(board, { reason: '…', actor: process.env.USER || 'agent' })",
              tier: 'B',
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: 'real-roles-env',
    sev: 'high',
    tier: 'B',
    run({ rel, src, isJs, isMeta }) {
      if (!isJs || isMeta) return [];
      if (
        /allowRealRoles\s*:\s*true/.test(src) &&
        !/DEMIGOD_ALLOW_REAL_ROLES/.test(src) &&
        /saveBoard|writeBoard|mintBoard/.test(src)
      ) {
        return [
          finding({
            rule: 'real-roles-env',
            sev: 'high',
            file: rel,
            title: 'allowRealRoles without env gate awareness',
            detail: 'Need DEMIGOD_ALLOW_REAL_ROLES=1 + opts',
            fix: 'Check process.env.DEMIGOD_ALLOW_REAL_ROLES',
            tier: 'B',
          }),
        ];
      }
      return [];
    },
  },
  {
    id: 'copy-policy',
    sev: 'high',
    tier: 'C',
    run({ rel, src, isMeta }) {
      if (isMeta || /\.md$/.test(rel)) return [];
      if (/scrubTimeClaims|TIME_RE|promise language|banned phrase/i.test(src)) return [];
      const out = [];
      for (const m of findAll(src, /\b48\s*h(our)?s?\b|\bwithin\s*48\b/gi)) {
        const ctx = src.slice(Math.max(0, m.index - 80), m.index + 80);
        if (/scrub|ban|forbid|never|avoid|policy|replace|strip|remove|claim/i.test(ctx)) continue;
        out.push(
          finding({
            rule: 'copy-policy',
            sev: 'high',
            file: rel,
            line: lineNo(src, m.index),
            title: '48h promise language',
            detail: m.match,
            fix: 'Use pending language; hello@trydemigod.com will follow up',
            tier: 'C',
          }),
        );
      }
      return out;
    },
  },
  {
    id: 'eval-use',
    sev: 'high',
    tier: 'C',
    run({ rel, src, isJs, isMeta, bugMode }) {
      if (!isJs || isMeta) return [];
      const out = [];
      for (const m of findAll(src, /\beval\s*\(|new Function\s*\(/g)) {
        const low = rel.includes('user-test') && /new Function/.test(m.match);
        out.push(
          finding({
            rule: 'eval-use',
            sev: low ? 'low' : bugMode ? 'critical' : 'high',
            file: rel,
            line: lineNo(src, m.index),
            title: low ? 'new Function (test harness)' : 'Dynamic code execution',
            detail: m.match,
            fix: 'Avoid eval on untrusted input',
            tier: 'C',
          }),
        );
      }
      return out;
    },
  },
  {
    id: 'xss-innerhtml',
    sev: 'medium',
    tier: 'B',
    run({ rel, src, isJs, isFoot, bugMode }) {
      if (!isJs) return [];
      const out = [];
      for (const m of findAll(src, /\.innerHTML\s*=/g)) {
        const ctx = src.slice(Math.max(0, m.index - 120), m.index + 80);
        if (isFoot && !bugMode) {
          if (/\besc\s*\(/.test(ctx)) continue;
          out.push(
            finding({
              rule: 'xss-innerhtml',
              sev: 'low',
              file: rel,
              line: lineNo(src, m.index),
              title: 'innerHTML in foot (check esc)',
              detail: 'foot-core often uses esc(); verify untrusted data',
              fix: 'Use esc() or textContent',
              tier: 'B',
            }),
          );
          continue;
        }
        if (/\besc\s*\(/.test(ctx)) continue;
        out.push(
          finding({
            rule: 'xss-innerhtml',
            sev: 'medium',
            file: rel,
            line: lineNo(src, m.index),
            title: 'innerHTML without nearby esc()',
            detail: 'Ensure untrusted data is escaped',
            fix: 'Use esc() or textContent',
            tier: 'B',
          }),
        );
      }
      return out;
    },
  },
  {
    id: 'force-http',
    sev: 'high',
    tier: 'B',
    run({ rel, src, isJs, isMeta }) {
      if (!isJs || isMeta) return [];
      if (
        /body\.force|req\.body.*force/.test(src) &&
        /intro|mint|board|pair/.test(src) &&
        !/Never accept force|ignore body\.force|never trust force|no HTTP force/i.test(src)
      ) {
        return [
          finding({
            rule: 'force-http',
            sev: 'high',
            file: rel,
            title: 'force flag possibly from HTTP body',
            detail: 'Never trust force from HTTP — CLI/env only',
            fix: 'Ignore body.force; use env/argv with audit',
            tier: 'B',
          }),
        ];
      }
      return [];
    },
  },
  {
    id: 'csrf-local',
    sev: 'medium',
    tier: 'B',
    run({ rel, src, isJs }) {
      if (!isJs || !/createServer|http\.createServer/.test(src)) return [];
      if (!/req\.method === ['"]POST['"]/.test(src)) return [];
      if (/origin|local-origin|Referer|forbidden from origin/i.test(src)) return [];
      return [
        finding({
          rule: 'csrf-local',
          sev: 'medium',
          file: rel,
          title: 'HTTP POST without obvious origin guard',
          detail: 'Mutating POSTs should soft-guard Origin/Referer',
          fix: 'Match /api/jobs mutate origin check',
          tier: 'B',
        }),
      ];
    },
  },
  {
    id: 'canonical-foot',
    sev: 'high',
    tier: 'C',
    run({ rel, src }) {
      if (rel.includes('foot') && rel.endsWith('.js') && path.basename(rel) !== 'demigod-foot-core.js') {
        if (/__dgFootVer|dgFootVersion/.test(src)) {
          return [
            finding({
              rule: 'canonical-foot',
              sev: 'high',
              file: rel,
              title: 'Non-canonical foot with version marker',
              detail: 'Edit demigod-foot-core.js only',
              fix: 'Move changes into demigod-foot-core.js',
              tier: 'C',
            }),
          ];
        }
      }
      return [];
    },
  },
  {
    id: 'empty-catch',
    sev: 'low',
    tier: 'B',
    run({ rel, src, isJs, bugMode }) {
      if (!isJs) return [];
      const out = [];
      for (const m of findAll(src, /catch\s*\([^)]*\)\s*\{\s*\}/g)) {
        out.push(
          finding({
            rule: 'empty-catch',
            sev: bugMode ? 'medium' : 'low',
            file: rel,
            line: lineNo(src, m.index),
            title: 'Empty catch',
            detail: 'Errors swallowed',
            fix: 'Log or comment why ignore is safe',
            tier: 'B',
          }),
        );
      }
      return out;
    },
  },
  {
    id: 'todo-marker',
    sev: 'low',
    tier: 'C',
    run({ rel, src, isMeta, bugMode }) {
      if (isMeta) return [];
      const out = [];
      for (const m of findAll(src, /\b(TODO|FIXME|HACK|XXX)\b[:\s].{0,80}/g)) {
        out.push(
          finding({
            rule: 'todo-marker',
            sev: bugMode ? 'medium' : 'low',
            file: rel,
            line: lineNo(src, m.index),
            title: `Marker: ${m.match.slice(0, 16)}`,
            detail: m.match.slice(0, 100),
            tier: 'C',
          }),
        );
      }
      return out;
    },
  },
  {
    id: 'broken-relative-import',
    sev: 'high',
    tier: 'C',
    run({ rel, src, isJs, root }) {
      if (!isJs) return [];
      const out = [];
      const dir = path.dirname(path.join(root, rel));
      for (const m of findAll(src, /from\s+['"](\.[^'"]+)['"]/g)) {
        const full = m.match.match(/from\s+['"](\.[^'"]+)['"]/);
        const spec = full?.[1];
        if (!spec) continue;
        const candidates = [
          path.resolve(dir, spec),
          path.resolve(dir, spec + '.mjs'),
          path.resolve(dir, spec + '.js'),
          path.resolve(dir, path.join(spec, 'index.mjs')),
          path.resolve(dir, path.join(spec, 'index.js')),
        ];
        if (!candidates.some((c) => fs.existsSync(c))) {
          out.push(
            finding({
              rule: 'broken-relative-import',
              sev: 'high',
              file: rel,
              line: lineNo(src, m.index),
              title: 'Relative import path missing on disk',
              detail: spec,
              fix: 'Fix import path or create missing module',
              tier: 'C',
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: 'duplicate-const',
    sev: 'critical',
    tier: 'C',
    run({ rel, src, isJs }) {
      if (!isJs) return [];
      const names = new Map();
      const out = [];
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/);
        if (!m) continue;
        const n = m[1];
        // skip inside functions roughly: if line has more indent and we're not top-level, still flag top-level dups only
        if (lines[i].match(/^\s{2,}/) && !lines[i].match(/^export/)) continue;
        if (names.has(n)) {
          out.push(
            finding({
              rule: 'duplicate-const',
              sev: 'critical',
              file: rel,
              line: i + 1,
              title: `Duplicate const ${n}`,
              detail: `Also declared at line ${names.get(n)}`,
              fix: 'Remove duplicate declaration',
              tier: 'C',
            }),
          );
        } else names.set(n, i + 1);
      }
      return out;
    },
  },
  {
    id: 'file-size',
    sev: 'info',
    tier: 'C',
    run({ rel, src, isJs }) {
      if (!isJs) return [];
      const n = src.split('\n').length;
      if (n > 2500) {
        return [
          finding({
            rule: 'file-size',
            sev: 'info',
            file: rel,
            title: `Large file (${n} lines)`,
            detail: 'Prefer smaller modules for new code',
            tier: 'C',
          }),
        ];
      }
      return [];
    },
  },
  // ── Swarm catalog (Codex/rules 2026-07-13): high-signal Demigod history ──
  {
    id: 'secret-in-source',
    sev: 'critical',
    tier: 'C',
    run({ rel, src, isMeta }) {
      if (isMeta || /\.md$/.test(rel)) return [];
      if (/\.env/.test(rel)) return []; // env files expected
      const out = [];
      // common key shapes (not exhaustive)
      const patterns = [
        /sk-[A-Za-z0-9]{20,}/g,
        /AKIA[0-9A-Z]{16}/g,
        /ghp_[A-Za-z0-9]{20,}/g,
        /xox[baprs]-[A-Za-z0-9-]{10,}/g,
      ];
      for (const re of patterns) {
        for (const m of findAll(src, re)) {
          out.push(
            finding({
              rule: 'secret-in-source',
              sev: 'critical',
              file: rel,
              line: lineNo(src, m.index),
              title: 'Possible secret material in source',
              detail: 'Key-shaped string — move to env / untrack',
              fix: 'Revoke if real; use process.env + gitignored env file',
              tier: 'C',
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: 'publish-while-frozen-call',
    sev: 'high',
    tier: 'C',
    run({ rel, src, isJs, isMeta }) {
      if (!isJs || isMeta) return [];
      // Heuristic: mutate publish helpers invoked without freeze check nearby
      if (!/cm6-paste|foot-cdn-publish|webflow-publish|board-publish/i.test(src)) return [];
      if (/isFrozen|publish-freeze|freeze\.on|DEMIGOD_FREEZE|freezeOn/i.test(src)) return [];
      if (!/spawnSync|execSync|main\(|publish/i.test(src)) return [];
      // only flag dedicated publish scripts
      if (!/publish|paste|cdn/i.test(rel)) return [];
      return [
        finding({
          rule: 'publish-while-frozen-call',
          sev: 'medium',
          file: rel,
          title: 'Publish script may lack freeze guard',
          detail: 'Ensure freeze ON blocks mutate publish paths',
          fix: 'Check demigod-publish-freeze / isFrozen before CDP paste',
          tier: 'B',
        }),
      ];
    },
  },
  {
    id: 'ingest-no-dedupe',
    sev: 'high',
    tier: 'B',
    run({ rel, src, isJs }) {
      if (!isJs) return [];
      if (!/ingestSubmission|function ingest/i.test(src)) return [];
      if (/dedupe|already|duplicate|slugId|find.*email/i.test(src)) return [];
      return [
        finding({
          rule: 'ingest-no-dedupe',
          sev: 'medium',
          file: rel,
          title: 'Ingest path may lack email/id dedupe',
          detail: 'Historical bug: duplicate seeds without dedupe',
          fix: 'Check existing inbox items by email before push',
          tier: 'B',
        }),
      ];
    },
  },
];

export function runAllRules(ctx) {
  const findings = [];
  for (const rule of RULES) {
    try {
      const part = rule.run(ctx) || [];
      for (const f of part) {
        if (!f.rule) f.rule = rule.id;
        if (!f.sev) f.sev = rule.sev;
        if (!f.tier) f.tier = rule.tier || 'C';
        findings.push(f);
      }
    } catch (e) {
      findings.push(
        finding({
          rule: 'rule-engine-error',
          sev: 'medium',
          file: ctx.rel,
          title: `Rule ${rule.id} threw`,
          detail: String(e.message || e).slice(0, 200),
          tier: 'C',
        }),
      );
    }
  }
  return findings;
}

export function listRuleCatalog() {
  return RULES.map((r) => ({ id: r.id, sev: r.sev, tier: r.tier }));
}
