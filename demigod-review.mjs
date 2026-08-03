#!/usr/bin/env node
/**
 * demigod-review v2.3 — code review + bugfix orchestrator
 *
 *   bin/dg-review [--bug] [--gates] [--fix] [--rescan] [--allow-foot]
 *   bin/dg-review --llm --include-meta --full
 *   bin/dg-review --fail-on medium --max 40 --only-rule eval-use
 *   bin/dg-review --exclude '*.md' --exclude-rule todo-marker
 *   bin/dg-review --format summary|json|md   # stdout format
 *   bin/dg-review --stats                   # per-pass timing
 *   bin/dg-review --print-fix-prompt        # emit agent fix prompt to stdout
 *   bin/dg-review --config path.json        # override DEMIGOD-REVIEW.json
 *   bin/dg-review --no-config
 *   bin/dg-review --catalog | --version
 *   node demigod-review-selftest.mjs
 *
 * Config defaults: DEMIGOD-REVIEW.json or .demigod-review.json (CLI wins).
 * Out: /tmp/dg-busy/review-latest.{json,md,sarif} review-fix-prompt.md
 */
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
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
  loadReviewConfig,
  dedupeFindings,
  summaryLine,
  OUT_PROMPT,
} from './demigod-review-lib.mjs';
import { runAllRules, listRuleCatalog } from './demigod-review-rules.mjs';
import { applySafeFixes } from './demigod-review-fix.mjs';
import { suggestGates, runGates } from './demigod-review-gates.mjs';
import {
  inputProof,
  baselineDiff,
  saveFindingsSnapshot,
  checkContract,
  loadContract,
  midRunGuard,
  captureMtimes,
} from './demigod-review-proof.mjs';
import { beginRun, sealRun, addArtifact } from './demigod-evidence.mjs';
import fs from 'fs';

const args = process.argv.slice(2);

const KNOWN = new Set([
  '--json', '--quiet', '--bug', '--fix', '--dry-run', '--gates', '--no-git',
  '--untracked', '--all', '--full', '--llm', '--catalog', '--baseline-add',
  '--allow-foot', '--rescan', '--fix-rescan', '--include-meta', '--diff',
  '--files', '--paths', '--fail-on', '--max', '--only-rule', '--exclude-rule', '--exclude',
  '--gate-ids', '--version', '-V', '--help', '-h', '--format', '--stats',
  '--print-fix-prompt', '--config', '--no-config', '--changed', '--no-save-baseline',
  '--contract', '--no-contract', '--since', '--baseline-diff', '--watch',
]);

function flag(name) {
  return args.includes(name);
}
function opt(name, def = null) {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  if (v == null || v.startsWith('--')) {
    console.error(`demigod-review: missing value for ${name}`);
    process.exit(2);
  }
  return v;
}
function listAfter(name) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const out = [];
  for (let j = i + 1; j < args.length && !args[j].startsWith('--'); j++) out.push(args[j]);
  return out;
}
/** --files path… and --paths path|a,b alias (plan-ledger / agent muscle memory). */
function listScopePaths() {
  const raw = [...(listAfter('--files') || []), ...(listAfter('--paths') || [])];
  if (!raw.length) return null;
  const out = [];
  for (const item of raw) {
    for (const p of String(item).split(',').map((s) => s.trim()).filter(Boolean)) out.push(p);
  }
  return out.length ? out : null;
}
function multiOpt(name) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name) {
      const v = args[i + 1];
      if (!v || v.startsWith('--')) {
        console.error(`demigod-review: missing value for ${name}`);
        process.exit(2);
      }
      out.push(v);
      i++;
    }
  }
  return out;
}
function csv(name) {
  const v = opt(name, '');
  if (!v) return [];
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

// Unknown flags
for (const a of args) {
  if (!a.startsWith('--') && a !== '-V' && a !== '-h') continue;
  if (a === '-V' || a === '-h') continue;
  const base = a.includes('=') ? a.split('=')[0] : a;
  // skip values
  if (!base.startsWith('--')) continue;
  if (!KNOWN.has(base) && !KNOWN.has(a)) {
    // allow --files values etc - only check tokens that look like flags
    if (args.includes(base) || args.some((x, i) => x === base)) {
      // if previous token took this as value, skip
      const idx = args.indexOf(a);
      if (idx > 0) {
        const prev = args[idx - 1];
        if (
          prev === '--diff' ||
          prev === '--fail-on' ||
          prev === '--max' ||
          prev === '--only-rule' ||
          prev === '--exclude-rule' ||
          prev === '--exclude' ||
          prev === '--gate-ids' ||
          prev === '--format' ||
          prev === '--config' ||
          prev === '--contract' ||
          prev === '--files' ||
          prev === '--paths'
        ) {
          continue;
        }
      }
      if (!KNOWN.has(base)) {
        console.error(`demigod-review: unknown flag ${a} (try --help)`);
        process.exit(2);
      }
    }
  }
}

function printHelp() {
  console.log(`demigod-review v2.3 — Demigod static review + tier-A fix + gates

Usage:
  bin/dg-review [options]
  bin/dg-review --files a.mjs b.mjs --bug --gates
  bin/dg-review --fix --dry-run
  bin/dg-review --format summary

Options:
  --bug --full --gates --gate-ids id1,id2
  --fix --dry-run --rescan --allow-foot
  --llm --include-meta --no-git --untracked
  --diff <base> --since [ref]   # default since=HEAD~1 when no --files (agent thrash↓)
  --files <paths...> --paths <a,b|paths...>  # --paths alias (comma or space)
  --changed (git scope)
  --contract path.json          # required when scope >1 files (PASS blocked without)
  --no-contract                 # escape multi-file contract requirement
  --fail-on critical|high|medium|low|any|never
  --max N --only-rule a,b --exclude-rule a,b --exclude glob
  --format json|md|summary|sarif   (stdout; files always written)
  --stats --print-fix-prompt --quiet
  --config path.json --no-config --baseline-add
  --watch --baseline-diff --contract path.json
  --catalog --version --help

Config: DEMIGOD-REVIEW.json (CLI overrides).
Reports: /tmp/dg-busy/review-latest.*
`);
}

const cli = {
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
  base: flag('--diff') ? opt('--diff') : null,
  since: (() => {
    if (!flag('--since')) return null;
    const i = args.indexOf('--since');
    const v = args[i + 1];
    if (!v || v.startsWith('--')) return 'HEAD~1';
    return v;
  })(),
  files: listScopePaths(),
  failOn: flag('--fail-on') ? opt('--fail-on') : null,
  max: flag('--max') ? Number(opt('--max')) : null,
  onlyRules: flag('--only-rule') ? csv('--only-rule') : null,
  excludeRules: flag('--exclude-rule') ? csv('--exclude-rule') : null,
  exclude: multiOpt('--exclude'),
  gateIds: flag('--gate-ids') ? csv('--gate-ids') : [],
  version: flag('--version') || flag('-V'),
  help: flag('--help') || flag('-h'),
  format: flag('--format') ? opt('--format') : null,
  stats: flag('--stats'),
  printFixPrompt: flag('--print-fix-prompt'),
  configPath: flag('--config') ? opt('--config') : null,
  noConfig: flag('--no-config'),
  watch: flag('--watch'),
  baselineDiff: flag('--baseline-diff'),
  contract: flag('--contract') ? opt('--contract') : null,
  noContract: flag('--no-contract'),
  noSaveBaseline: flag('--no-save-baseline'),
};

if (cli.help) {
  printHelp();
  process.exit(0);
}
if (cli.version) {
  console.log('demigod-review 2.3.0');
  process.exit(0);
}

// Merge config
let cfg = null;
if (!cli.noConfig) {
  if (cli.configPath) {
    try {
      cfg = { path: cli.configPath, ...JSON.parse(fs.readFileSync(cli.configPath, 'utf8')) };
    } catch (e) {
      console.error('demigod-review: bad --config', e.message);
      process.exit(2);
    }
  } else {
    cfg = loadReviewConfig();
  }
}

function pick(cliVal, cfgKey, def) {
  if (cliVal !== null && cliVal !== undefined && !(Array.isArray(cliVal) && cliVal.length === 0 && cfg?.[cfgKey])) {
    if (cliVal !== null) return cliVal;
  }
  if (cfg && cfg[cfgKey] !== undefined) return cfg[cfgKey];
  return def;
}

// Build flags with defaults
const flags = {
  json: cli.json || cli.format === 'json',
  quiet: cli.quiet,
  bug: cli.bug || Boolean(cfg?.bug),
  fix: cli.fix,
  dryRun: cli.dryRun,
  gates: cli.gates || Boolean(cfg?.gates),
  noGit: cli.noGit,
  untracked: cli.untracked,
  full: cli.full || Boolean(cfg?.full),
  llm: cli.llm,
  catalog: cli.catalog,
  baselineAdd: cli.baselineAdd,
  allowFoot: cli.allowFoot,
  rescan: cli.rescan,
  includeMeta: cli.includeMeta,
  // Default agent scope: --since HEAD~1 when no explicit --files / --full / --no-git
  base:
    cli.base ||
    cli.since ||
    (!cli.files?.length && !cli.full && !cli.noGit ? 'HEAD~1' : null),
  files: cli.files,
  failOn: cli.failOn || cfg?.failOn || 'high',
  max: cli.max != null ? cli.max : cfg?.max || 0,
  onlyRules: cli.onlyRules?.length ? cli.onlyRules : cfg?.onlyRules || [],
  excludeRules: [
    ...(cli.excludeRules?.length ? cli.excludeRules : []),
    ...((!cli.excludeRules && cfg?.excludeRules) || []),
  ],
  exclude: [...cli.exclude, ...((cfg?.exclude) || [])],
  gateIds: cli.gateIds?.length ? cli.gateIds : cfg?.gateIds || [],
  format: cli.format || (cli.json ? 'json' : 'text'),
  stats: cli.stats,
  printFixPrompt: cli.printFixPrompt,
  configPath: cfg?.path || null,
  watch: cli.watch,
  baselineDiff: Boolean(cli.baselineDiff),
  contractPath: cli.contract,
  noContract: cli.noContract || Boolean(cfg?.noContract),
  noSaveBaseline: cli.noSaveBaseline,
  sinceDefault: Boolean(!cli.base && !cli.since && !cli.files?.length && !cli.full && !cli.noGit),
};

// dedupe excludeRules
flags.excludeRules = [...new Set(flags.excludeRules.filter(Boolean))];

if (flags.catalog) {
  const cat = listRuleCatalog();
  if (flags.json || flags.format === 'json') console.log(JSON.stringify({ version: '2.3.0', rules: cat }, null, 2));
  else {
    console.log('demigod-review rule catalog v2.3');
    for (const r of cat) console.log(`  ${r.id.padEnd(28)} sev=${r.sev.padEnd(8)} tier=${r.tier}`);
  }
  process.exit(0);
}

const timing = {};

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
        onlyRules: ruleOpts.onlyRules?.length ? ruleOpts.onlyRules : null,
        excludeRules: ruleOpts.excludeRules?.length ? ruleOpts.excludeRules : null,
      }),
    );
  }
  return findings;
}

async function main() {
  const t0 = Date.now();
  let t = Date.now();

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

  timing.scopeMs = Date.now() - t;
  t = Date.now();

  const baseline = loadBaseline();
  const ruleOpts = { onlyRules: flags.onlyRules, excludeRules: flags.excludeRules };

  // Multi-file contract required for PASS (Codex N-C1) — escape: --no-contract
  let contractResult = null;
  if (scope.length > 1 && !flags.contractPath && !flags.noContract) {
    contractResult = {
      ok: false,
      issues: [
        `multi-file scope (${scope.length}) requires --contract path.json (or --no-contract)`,
        'touch: ' + scope.slice(0, 12).join(', ') + (scope.length > 12 ? '…' : ''),
      ],
    };
    const report = {
      version: '2.3.0',
      at: new Date().toISOString(),
      summary: { fail: true, count: contractResult.issues.length, bySev: { critical: 1 }, failOn: flags.failOn },
      contract: contractResult,
      scopeMode: { base: flags.base, sinceDefault: flags.sinceDefault, files: flags.files?.length || 0 },
      findings: contractResult.issues.map((msg) => ({
        rule: 'contract-required',
        sev: 'critical',
        title: 'Multi-file review requires contract',
        detail: msg,
        tier: 'C',
      })),
      files: scope,
    };
    writeReports(report);
    if (flags.json || flags.format === 'json') console.log(JSON.stringify(report, null, 2));
    else {
      console.log('demigod-review CONTRACT REQUIRED (multi-file)');
      for (const i of contractResult.issues) console.log('  ✗', i);
      console.log('  hint: write /tmp/dg-busy/contracts/<id>.json then --contract that path');
    }
    process.exit(1);
  }
  // Change contract (optional path — validated when present)
  if (flags.contractPath) {
    try {
      const c = loadContract(flags.contractPath);
      contractResult = checkContract(c, scope);
      if (!contractResult.ok) {
        const report = {
          version: '2.3.0',
          at: new Date().toISOString(),
          summary: { fail: true, count: contractResult.issues.length, bySev: { critical: 1 }, failOn: flags.failOn },
          contract: contractResult,
          findings: contractResult.issues.map((msg) => ({
            rule: 'contract',
            sev: 'critical',
            title: 'Contract violation',
            detail: msg,
            tier: 'C',
          })),
          files: scope,
        };
        writeReports(report);
        if (flags.json || flags.format === 'json') console.log(JSON.stringify(report, null, 2));
        else {
          console.log('demigod-review CONTRACT FAIL');
          for (const i of contractResult.issues) console.log('  ✗', i);
        }
        process.exit(1);
      }
    } catch (e) {
      console.error('contract error', e.message || e);
      process.exit(2);
    }
  }

  const startMtimes = captureMtimes(scope);
  const evRun = beginRun('review', { scope });
  const proofInputs = inputProof(scope);

  let findings = collectFindings(scope, ruleOpts);
  timing.rulesMs = Date.now() - t;
  t = Date.now();

  let autoApplied = [];
  if (flags.fix) {
    autoApplied = applySafeFixes(scope, {
      dryRun: flags.dryRun,
      allowFoot: flags.allowFoot,
      readRel,
    });
    const appliedOk = autoApplied.some(
      (a) => a.fixes?.length && !a.syntaxBroken && !a.rolledBack && !a.dryRun,
    );
    if (appliedOk) {
      findings = collectFindings(scope, ruleOpts);
    }
  }
  timing.fixMs = Date.now() - t;
  t = Date.now();

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
  timing.llmMs = Date.now() - t;
  t = Date.now();

  let hunks = new Map();
  if (!flags.noGit && !flags.files?.length) {
    try {
      hunks = parseDiffHunks(getGitDiff(flags.base));
    } catch {
      hunks = new Map();
    }
  }
  findings = markDiffAwareness(findings, hunks);
  findings = applyDiffFilter(findings, { full: flags.full, bug: flags.bug });
  findings = finalizeFindings(findings, baseline);
  findings = dedupeFindings(findings);
  if (flags.max > 0) findings = limitFindings(findings, flags.max);
  timing.filterMs = Date.now() - t;
  t = Date.now();

  let gates = null;
  const gatesSuggested = suggestGates(scope);
  if (flags.gates) {
    gates = runGates(scope, {
      only: flags.gateIds.length ? flags.gateIds : null,
    });
  }
  timing.gatesMs = Date.now() - t;

  if (flags.baselineAdd) {
    const r = appendBaseline(findings.filter((f) => f.sev === 'low' || f.sev === 'info'));
    if (!flags.quiet && flags.format === 'text') console.error(`baseline: added ${r.added} → ${r.path}`);
  }

  // Mid-run concurrent edit guard
  const mguard = midRunGuard(scope, startMtimes);
  if (!mguard.ok) {
    findings.push({
      id: 'midrun',
      rule: 'concurrent-edit',
      sev: 'high',
      title: 'Files changed during review',
      detail: 'Possible concurrent writer: ' + mguard.changed.join(', '),
      tier: 'C',
    });
  }

  let bdiff = null;
  if (flags.baselineDiff) {
    bdiff = baselineDiff(findings);
  }
  if (!flags.noSaveBaseline) {
    try {
      saveFindingsSnapshot(findings);
    } catch {
      /* */
    }
  }

  const summary = scoreSummary(findings, { failOn: flags.failOn });
  if (gates?.some((g) => !g.ok)) summary.fail = true;
  if (mguard && !mguard.ok) summary.fail = true;

  const report = {
    version: '2.3.0',
    inputProof: proofInputs,
    at: new Date().toISOString(),
    root: ROOT,
    config: flags.configPath,
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
      format: flags.format,
      watch: flags.watch,
      baselineDiff: flags.baselineDiff,
      contract: flags.contractPath,
    },
    contract: contractResult,
    baselineDiff: bdiff,
    concurrentEdit: mguard || null,
    files: scope,
    findings,
    summary,
    gates,
    gatesSuggested,
    autoApplied,
    timing: { ms: Date.now() - t0, ...timing },
    cmds: {
      recheck: 'bin/dg-review --json',
      bug: 'bin/dg-review --bug --gates',
      fixDry: 'bin/dg-review --fix --dry-run',
      self: 'bin/dg-review --include-meta --bug --full --files demigod-review.mjs demigod-review-lib.mjs demigod-review-rules.mjs demigod-review-fix.mjs demigod-review-gates.mjs',
      selftest: 'node demigod-review-selftest.mjs',
    },
  };
  report.outs = writeReports(report);
  report.summaryLine = summaryLine(report);
  try {
    const sealed = sealRun(
      addArtifact(evRun, 'review-latest.json', '/tmp/dg-busy/review-latest.json'),
      { pass: !summary.fail, exit: summary.fail ? 1 : 0, summary: report.summaryLine, ttlSec: 3600 },
      { findings: summary.count, inputProof: proofInputs },
    );
    report.evidenceRunId = sealed.runId;
    report.evidencePath = sealed._path;
    // rewrite json with evidence pointer
    writeReports(report);
  } catch (e) {
    report.evidenceError = String(e.message || e);
  }

  if (flags.printFixPrompt) {
    try {
      console.log(fs.readFileSync(OUT_PROMPT, 'utf8'));
    } catch {
      console.log('# no fix prompt');
    }
    process.exit(summary.fail ? 1 : 0);
  }

  if (flags.format === 'json' || flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (flags.format === 'summary') {
    console.log(report.summaryLine);
    if (flags.stats) console.log(JSON.stringify(report.timing));
  } else if (flags.format === 'md') {
    try {
      console.log(fs.readFileSync(report.outs.md, 'utf8'));
    } catch {
      console.log(report.summaryLine);
    }
  } else if (flags.format === 'sarif') {
    try {
      console.log(fs.readFileSync(report.outs.sarif, 'utf8'));
    } catch {
      console.log('{}');
    }
  } else if (!flags.quiet) {
    console.log(
      `demigod-review v2.3 ${summary.fail ? 'FAIL' : 'OK'} · ${scope.length} files · ${summary.count} findings (${summary.suppressed} suppressed) · failOn=${summary.failOn} · ${report.timing.ms}ms`,
    );
    if (flags.configPath) console.log(`  config ${flags.configPath}`);
    console.log(`  sev ${JSON.stringify(summary.bySev)}`);
    if (flags.stats) {
      console.log(
        `  stats scope=${timing.scopeMs}ms rules=${timing.rulesMs}ms fix=${timing.fixMs}ms llm=${timing.llmMs}ms filter=${timing.filterMs}ms gates=${timing.gatesMs}ms`,
      );
    }
    const top = findings
      .filter((f) => !f.suppressed && (f.sev === 'critical' || f.sev === 'high' || f.sev === 'medium'))
      .slice(0, 25);
    for (const f of top) {
      console.log(
        `  [${f.sev}] ${f.file || '?'}${f.line ? ':' + f.line : ''} — ${f.title} (${f.rule}${f.inDiff === true ? ',diff' : ''})`,
      );
    }
    if (autoApplied.length) {
      const real = autoApplied.filter((a) => a.fixes?.length);
      console.log(
        `  auto-fix: ${real.length} file(s)${flags.dryRun ? ' (dry-run)' : ''}${flags.allowFoot ? ' allow-foot' : ''}`,
      );
      for (const a of real.slice(0, 10)) {
        console.log(
          `    ${a.file}: ${(a.fixes || []).join(', ')}${a.rolledBack ? ' [rolled-back]' : ''}${a.skipped ? ' [' + a.skipped + ']' : ''}`,
        );
      }
    }
    if (gates) {
      for (const g of gates) {
        console.log(`  gate ${g.ok ? '✓' : '✗'} ${g.id} status=${g.status ?? '?'} ${g.ms}ms`);
      }
    }
    console.log(`  report ${report.outs.md}`);
    console.log(`  prompt ${report.outs.prompt}`);
    console.log(`  ${report.summaryLine}`);
    if (report.baselineDiff) {
      const b = report.baselineDiff;
      console.log(`  baseline-diff +${b.added} -${b.resolved} still=${b.stillOpen}`);
    }
    if (report.evidenceRunId) console.log(`  evidence ${report.evidenceRunId}`);
  }


  if (flags.watch) {
    console.error('[review --watch] watching scope; Ctrl+C to stop');
    const paths = scope.map((s) => (s.startsWith('/') ? s : path.join(ROOT, s)));
    let timer = null;
    const rerun = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        console.error('[review --watch] change detected — re-exec');
        const r = spawnSync(process.execPath, process.argv.slice(1).filter((a) => a !== '--watch'), {
          cwd: ROOT,
          stdio: 'inherit',
          env: process.env,
        });
        // keep watching
      }, 400);
    };
    for (const fp of paths) {
      try {
        fs.watch(fp, { persistent: true }, rerun);
      } catch {
        try {
          fs.watch(path.dirname(fp), rerun);
        } catch {
          /* */
        }
      }
    }
    await new Promise(() => {}); // hang until kill
  }

  process.exit(summary.fail ? 1 : 0);

}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
