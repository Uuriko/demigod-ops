#!/usr/bin/env node
/**
 * demigod-review v2 — code review + bugfix orchestrator
 *
 *   bin/dg-review
 *   bin/dg-review --json --bug --gates
 *   bin/dg-review --files a.mjs --full
 *   bin/dg-review --fix --dry-run
 *   bin/dg-review --llm                 # optional claude deep pass
 *   bin/dg-review --catalog
 *   bin/dg-review --baseline-add
 *   node demigod-review-selftest.mjs
 *
 * Modules: demigod-review-{lib,rules,fix,gates,llm}.mjs
 * Out: /tmp/dg-busy/review-latest.{json,md} review-fix-prompt.md review-latest.sarif.json
 */
import path from 'path';
import crypto from 'crypto';
import {
  ROOT,
  listScopeFiles,
  readRel,
  syntaxCheck,
  getGitDiff,
  parseDiffHunks,
  markDiffAwareness,
  applyDiffFilter,
  loadBaseline,
  finalizeFindings,
  scoreSummary,
  writeReports,
  appendBaseline,
  sh,
} from './demigod-review-lib.mjs';
import { runAllRules, listRuleCatalog } from './demigod-review-rules.mjs';
import { applySafeFixes } from './demigod-review-fix.mjs';
import { suggestGates, runGates } from './demigod-review-gates.mjs';

const args = process.argv.slice(2);

function flag(name) {
  return args.includes(name);
}
function opt(name, def = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
}
function listAfter(name) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const out = [];
  for (let j = i + 1; j < args.length && !args[j].startsWith('--'); j++) out.push(args[j]);
  return out;
}

const flags = {
  json: flag('--json'),
  quiet: flag('--quiet'),
  bug: flag('--bug'),
  fix: flag('--fix'),
  dryRun: flag('--dry-run'),
  gates: flag('--gates'),
  noGit: flag('--no-git'),
  untracked: flag('--untracked') || flag('--all'),
  full: flag('--full'),
  llm: flag('--llm'),
  catalog: flag('--catalog'),
  baselineAdd: flag('--baseline-add'),
  base: opt('--diff', null),
  files: listAfter('--files'),
};

if (flags.catalog) {
  const cat = listRuleCatalog();
  if (flags.json) console.log(JSON.stringify({ rules: cat }, null, 2));
  else {
    console.log('demigod-review rule catalog');
    for (const r of cat) console.log(`  ${r.id.padEnd(28)} sev=${r.sev.padEnd(8)} tier=${r.tier}`);
  }
  process.exit(0);
}

async function main() {
  const t0 = Date.now();
  const files = listScopeFiles({
    noGit: flags.noGit,
    untracked: flags.untracked,
    base: flags.base,
    files: flags.files,
  });

  // empty scope: hot surface so tool never no-ops silently
  const scope =
    files.length > 0
      ? files
      : [
          'demigod-review.mjs',
          'demigod-review-lib.mjs',
          'demigod-review-rules.mjs',
          'demigod-submissions-lib.mjs',
        ].filter((f) => readRel(f) != null);

  const baseline = loadBaseline();
  let findings = [];

  // Pass 1: syntax
  for (const rel of scope) {
    const syn = syntaxCheck(rel);
    if (syn) findings.push(syn);
  }

  // Pass 2: rules
  for (const rel of scope) {
    const src = readRel(rel);
    if (src == null) {
      findings.push({
        id: crypto.randomBytes(4).toString('hex'),
        rule: 'missing-file',
        sev: 'medium',
        file: rel,
        title: 'Unreadable or deleted file',
        detail: 'In scope but not readable',
        tier: 'C',
      });
      continue;
    }
    const base = path.basename(rel);
    const ctx = {
      rel,
      src,
      root: ROOT,
      isJs: /\.(mjs|js|cjs)$/.test(rel),
      isFoot: base === 'demigod-foot-core.js',
      isMeta: /^demigod-review/.test(base),
      bugMode: flags.bug,
    };
    findings.push(...runAllRules(ctx));
  }

  // Pass 3: diff awareness
  let hunks = new Map();
  if (!flags.noGit && !flags.files?.length) {
    try {
      const diff = getGitDiff(flags.base);
      hunks = parseDiffHunks(diff);
    } catch {
      hunks = new Map();
    }
  }
  findings = markDiffAwareness(findings, hunks);
  findings = applyDiffFilter(findings, { full: flags.full, bug: flags.bug });

  // Pass 4: optional LLM
  if (flags.llm) {
    try {
      const { runLlmPass } = await import('./demigod-review-llm.mjs');
      const extra = runLlmPass({ files: scope, findings });
      findings.push(...extra);
    } catch (e) {
      findings.push({
        id: crypto.randomBytes(4).toString('hex'),
        rule: 'llm-pass-error',
        sev: 'info',
        title: 'LLM pass skipped/failed',
        detail: String(e.message || e).slice(0, 200),
        tier: 'C',
      });
    }
  }

  // Pass 5: tier A fixes
  let autoApplied = [];
  if (flags.fix) {
    autoApplied = applySafeFixes(scope, {
      dryRun: flags.dryRun,
      readRel,
    });
  }

  findings = finalizeFindings(findings, baseline);

  // Gates
  let gates = null;
  const gatesSuggested = suggestGates(scope);
  if (flags.gates) {
    gates = runGates(scope);
  }

  if (flags.baselineAdd) {
    const r = appendBaseline(findings.filter((f) => f.sev === 'low' || f.sev === 'info'));
    if (!flags.quiet) console.log(`baseline: added ${r.added} → ${r.path}`);
  }

  const summary = scoreSummary(findings);
  if (gates?.some((g) => !g.ok)) summary.fail = true;

  const report = {
    version: 2,
    at: new Date().toISOString(),
    root: ROOT,
    mode: {
      bug: flags.bug,
      fix: flags.fix,
      dryRun: flags.dryRun,
      gates: flags.gates,
      full: flags.full,
      llm: flags.llm,
      base: flags.base,
    },
    files: scope,
    findings,
    summary,
    gates,
    gatesSuggested,
    autoApplied,
    timing: { ms: Date.now() - t0 },
    cmds: {
      recheck: 'bin/dg-review --json',
      bug: 'bin/dg-review --bug --gates',
      fixDry: 'bin/dg-review --fix --dry-run',
      selftest: 'node demigod-review-selftest.mjs',
      llm: 'bin/dg-review --llm --bug',
    },
  };
  report.outs = writeReports(report);

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!flags.quiet) {
    console.log(
      `demigod-review v2 ${summary.fail ? 'FAIL' : 'OK'} · ${scope.length} files · ${summary.count} findings (${summary.suppressed} suppressed) · ${report.timing.ms}ms`,
    );
    console.log(`  sev ${JSON.stringify(summary.bySev)}`);
    const top = findings
      .filter((f) => !f.suppressed && (f.sev === 'critical' || f.sev === 'high'))
      .slice(0, 15);
    for (const f of top) {
      console.log(
        `  [${f.sev}] ${f.file || '?'}${f.line ? ':' + f.line : ''} — ${f.title} (${f.rule}${f.inDiff === true ? ',diff' : ''})`,
      );
    }
    if (autoApplied.length) {
      console.log(`  auto-fix: ${autoApplied.length} file(s)${flags.dryRun ? ' (dry-run)' : ''}`);
    }
    if (gates) {
      for (const g of gates) console.log(`  gate ${g.ok ? '✓' : '✗'} ${g.id} ${g.ms}ms`);
    }
    console.log(`  report ${report.outs.md}`);
    console.log(`  prompt ${report.outs.prompt}`);
  }

  process.exit(summary.fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
