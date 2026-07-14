#!/usr/bin/env node
/**
 * demigod-review v2.1 — code review + bugfix orchestrator
 *
 *   bin/dg-review
 *   bin/dg-review --bug --gates
 *   bin/dg-review --files a.mjs --full
 *   bin/dg-review --fix --dry-run
 *   bin/dg-review --fix --allow-foot     # rare: tier-A on foot-core
 *   bin/dg-review --fix --rescan         # re-run rules after autofix
 *   bin/dg-review --llm
 *   bin/dg-review --catalog
 *   bin/dg-review --baseline-add
 *   bin/dg-review --only-rule eval-use,syntax
 *   bin/dg-review --exclude-rule todo-marker
 *   bin/dg-review --exclude '*.md' --exclude package.json
 *   bin/dg-review --fail-on medium        # critical|high|medium|low|any|never
 *   bin/dg-review --max 50
 *   bin/dg-review --include-meta          # also scan demigod-review* with full rules
 *   bin/dg-review --gate-ids board-honesty,review-selftest
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
  limitFindings,
  matchExclude,
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
function multiOpt(name) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && args[i + 1]) out.push(args[++i]);
  }
  return out;
}
function csv(name) {
  const v = opt(name, '');
  if (!v) return [];
  return v.split(',').map((s) => s.trim()).filter(Boolean);
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
  allowFoot: flag('--allow-foot'),
  rescan: flag('--rescan') || flag('--fix-rescan'),
  includeMeta: flag('--include-meta'),
  base: opt('--diff', null),
  files: listAfter('--files'),
  failOn: opt('--fail-on', 'high'),
  max: Number(opt('--max', '0')) || 0,
  onlyRules: csv('--only-rule'),
  excludeRules: csv('--exclude-rule'),
  exclude: multiOpt('--exclude'),
  gateIds: csv('--gate-ids'),
  version: flag('--version') || flag('-V'),
};

if (flags.version) {
  console.log('demigod-review 2.1.0');
  process.exit(0);
}

if (flags.catalog) {
  const cat = listRuleCatalog();
  if (flags.json) console.log(JSON.stringify({ version: '2.1.0', rules: cat }, null, 2));
  else {
    console.log('demigod-review rule catalog v2.1');
    for (const r of cat) console.log(`  ${r.id.padEnd(28)} sev=${r.sev.padEnd(8)} tier=${r.tier}`);
  }
  process.exit(0);
}

function collectFindings(scope, ruleOpts) {
  let findings = [];
  const only = ruleOpts.onlyRules;
  const runSyntax = !only?.length || only.includes('syntax');
  if (runSyntax) {
    for (const rel of scope) {
      const syn = syntaxCheck(rel);
      if (syn) findings.push(syn);
    }
  }
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
    const isMetaFile = /^demigod-review/.test(base) || base === 'dg-review';
    const ctx = {
      rel,
      src,
      root: ROOT,
      isJs: /\.(mjs|js|cjs)$/.test(rel),
      isFoot: base === 'demigod-foot-core.js',
      isMeta: flags.includeMeta ? false : isMetaFile,
      bugMode: flags.bug,
      includeMeta: flags.includeMeta,
    };
    findings.push(
      ...runAllRules(ctx, {
        onlyRules: ruleOpts.onlyRules,
        excludeRules: ruleOpts.excludeRules,
      }),
    );
  }
  return findings;
}

async function main() {
  const t0 = Date.now();
  let files = listScopeFiles({
    noGit: flags.noGit,
    untracked: flags.untracked,
    base: flags.base,
    files: flags.files,
  });

  if (flags.exclude.length) {
    files = files.filter((f) => !matchExclude(f, flags.exclude));
  }

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
  const ruleOpts = { onlyRules: flags.onlyRules, excludeRules: flags.excludeRules };

  let findings = collectFindings(scope, ruleOpts);

  // Tier A fixes BEFORE final scoring (optional re-scan)
  let autoApplied = [];
  if (flags.fix) {
    autoApplied = applySafeFixes(scope, {
      dryRun: flags.dryRun,
      allowFoot: flags.allowFoot,
      readRel,
    });
    if ((flags.rescan || !flags.dryRun) && !flags.dryRun && autoApplied.some((a) => a.fixes?.length && !a.syntaxBroken && !a.rolledBack)) {
      findings = collectFindings(scope, ruleOpts);
    } else if (flags.rescan && flags.dryRun) {
      // dry-run cannot re-scan disk; note in report only
    }
  }

  // Optional LLM (after static; then normalize once)
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

  // Diff awareness + filter (all producers)
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

    findings = finalizeFindings(findings, baseline);
  if (flags.max > 0) findings = limitFindings(findings, flags.max);

  // Gates
  let gates = null;
  const gatesSuggested = suggestGates(scope);
  if (flags.gates) {
    gates = runGates(scope, {
      only: flags.gateIds.length ? flags.gateIds : null,
    });
  }

  if (flags.baselineAdd) {
    const r = appendBaseline(findings.filter((f) => f.sev === 'low' || f.sev === 'info'));
    if (!flags.quiet && !flags.json) console.log(`baseline: added ${r.added} → ${r.path}`);
  }

  const summary = scoreSummary(findings, { failOn: flags.failOn });
  if (gates?.some((g) => !g.ok)) summary.fail = true;

  const report = {
    version: '2.1.0',
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
      allowFoot: flags.allowFoot,
      rescan: flags.rescan,
      includeMeta: flags.includeMeta,
      failOn: flags.failOn,
      max: flags.max || null,
      onlyRules: flags.onlyRules,
      excludeRules: flags.excludeRules,
      exclude: flags.exclude,
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
      fixRescan: 'bin/dg-review --fix --rescan',
      selftest: 'node demigod-review-selftest.mjs',
      llm: 'bin/dg-review --llm --bug',
    },
  };
  report.outs = writeReports(report);

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!flags.quiet) {
    console.log(
      `demigod-review v2.1 ${summary.fail ? 'FAIL' : 'OK'} · ${scope.length} files · ${summary.count} findings (${summary.suppressed} suppressed) · failOn=${summary.failOn} · ${report.timing.ms}ms`,
    );
    console.log(`  sev ${JSON.stringify(summary.bySev)}`);
    const top = findings
      .filter((f) => !f.suppressed && (f.sev === 'critical' || f.sev === 'high' || f.sev === 'medium'))
      .slice(0, 20);
    for (const f of top) {
      console.log(
        `  [${f.sev}] ${f.file || '?'}${f.line ? ':' + f.line : ''} — ${f.title} (${f.rule}${f.inDiff === true ? ',diff' : ''})`,
      );
    }
    if (autoApplied.length) {
      const real = autoApplied.filter((a) => a.fixes?.length);
      console.log(`  auto-fix: ${real.length} file(s)${flags.dryRun ? ' (dry-run)' : ''}${flags.allowFoot ? ' allow-foot' : ''}`);
      for (const a of real.slice(0, 8)) {
        console.log(`    ${a.file}: ${(a.fixes || []).join(', ')}${a.skipped ? ' [' + a.skipped + ']' : ''}`);
      }
    }
    if (gates) {
      for (const g of gates) {
        console.log(`  gate ${g.ok ? '✓' : '✗'} ${g.id} status=${g.status} ${g.ms}ms`);
      }
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
