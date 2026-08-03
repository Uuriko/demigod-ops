import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SOR = [
  /^DEMIGOD-(BOARD|PAIRS|LEADS|PILOTS|MATCHES|OUTREACH|REFERRALS)\.json/,
  /^DEMIGOD-SUBMISSIONS-INBOX\.json/,
  /^DEMIGOD-EVENTS(?:-API)?(?:\.|$)/,
  /^demigod-events-data\.json/,
  /^demigod-board\.corrupt/i,
  /^demigod-board\.json\.bak/i,
  /\.corrupt[.-]/i,
  /^SIGNAL-THEATER\.json$/,
  /^events-bot-outbox\//,
  /^talent-crm\//,
  /^DEMIGOD-PROOF-LOG\.json/,
  /^grok-(?:input|snapshot|tail)\.txt$/,
  /^ORCA-PAIR-EMAIL-STATUS\.txt$/,
  /^\.(?:gitconfig|zshrc|wget-hsts|sudo_as_admin_successful)$/,
  /^\.(?:finch|fzf|hermes|kimi-code|omp|openclaude|orca|pi|pyenv|vscode)\//,
  /^demigod-outreach\/(?!template-dm(?:-engineer)?\.md$)/,
  /^dm-send-log\.txt$/,
  /^demigod-ops\/[^/]*-PREP-[^/]*\.md$/,
  /^demigod-ops\/(invoices\/|intros\/(?!\.gitkeep$))/,
];

const SAFE = /-(REPORT|TRIAGE|AUDIT|DASHBOARD)\.json$/;
const PRIVATE_DERIVED = /^DEMIGOD-INBOX-REPORT\.json(?:\.|$)/;

export const REQUIRED_IGNORE_RULES = [
  'DEMIGOD-EVENTS.json',
  'DEMIGOD-EVENTS.*',
  'events-bot-outbox/',
  'DEMIGOD-SUBMISSIONS-INBOX.json',
  'DEMIGOD-SUBMISSIONS-INBOX.json.archive.jsonl',
  'DEMIGOD-SUBMISSIONS-INBOX.json.corrupt.*',
  'DEMIGOD-INBOX-REPORT.json',
  'talent-crm/',
  'demigod-ops/*-PREP-*.md',
  'demigod-outreach/*',
  '!demigod-outreach/template-dm.md',
  '!demigod-outreach/template-dm-engineer.md',
  'dm-send-log.txt',
  'SIGNAL-THEATER.json',
  'DEMIGOD-PROOF-LOG.json',
  'DEMIGOD-PROOF-LOG.json.corrupt.*',
  'DEMIGOD-MATCHES.json*',
  'DEMIGOD-OUTREACH.json*',
  'demigod-ops/intros/*',
  '!demigod-ops/intros/.gitkeep',
  'demigod-ops/invoices/',
  'DEMIGOD-BOARD.corrupt*',
  'DEMIGOD-BOARD.CORRUPT*',
  'DEMIGOD-BOARD.json',
  'DEMIGOD-BOARD.json.*',
  'DEMIGOD-PAIRS.json',
  'DEMIGOD-PAIRS.json.*',
  'demigod-board.corrupt*',
  'DEMIGOD-LEADS.json',
  'DEMIGOD-LEADS.json.*',
  'DEMIGOD-PILOTS.json',
  'DEMIGOD-PILOTS.json.*',
  'DEMIGOD-REFERRALS.json',
  'DEMIGOD-REFERRALS.json.*',
  'DEMIGOD-EVENTS-API.json',
  'demigod-events-data.json',
  'demigod-events-data.json.*',
  'demigod-board.json.bak*',
  'grok-input.txt',
  'grok-snapshot.txt',
  'grok-tail.txt',
  'ORCA-PAIR-EMAIL-STATUS.txt',
  '.gitconfig',
  '.zshrc',
  '.wget-hsts',
  '.sudo_as_admin_successful',
  '.finch/',
  '.fzf/',
  '.hermes/',
  '.kimi-code/',
  '.omp/',
  '.openclaude/',
  '.orca/',
  '.pi/',
  '.pyenv/',
  '.vscode/',
];

const ALLOWED_NEGATIONS = new Set([
  '!demigod-outreach/template-dm.md',
  '!demigod-outreach/template-dm-engineer.md',
  '!demigod-ops/intros/.gitkeep',
]);

export const isSensitive = (file) =>
  PRIVATE_DERIVED.test(file) || (!SAFE.test(file) && SOR.some((pattern) => pattern.test(file)));

// ponytail: v2/v3 SHA-1 indexes plus exact private-root rules avoid a Git subprocess;
// fail closed on new index modes, and expand this policy before adopting complex ignores.
export function parseGitIndex(index) {
  if (!Buffer.isBuffer(index) || index.length < 32) throw new Error('git index missing or truncated');
  if (index.toString('ascii', 0, 4) !== 'DIRC') throw new Error('git index signature invalid');
  const version = index.readUInt32BE(4);
  if (version !== 2 && version !== 3) throw new Error(`git index version ${version} unsupported`);

  const count = index.readUInt32BE(8);
  const trailer = index.length - 20;
  let offset = 12;
  const files = [];
  for (let i = 0; i < count; i += 1) {
    const start = offset;
    if (offset + 62 > trailer) throw new Error('git index entry truncated');
    const flags = index.readUInt16BE(offset + 60);
    offset += 62;
    if (flags & 0x4000) {
      if (version !== 3) throw new Error('extended entry in git index v2 unsupported');
      offset += 2;
    }
    const nul = index.indexOf(0, offset);
    if (nul < offset || nul >= trailer) throw new Error('git index path truncated');
    const file = index.toString('utf8', offset, nul);
    if (!file) throw new Error('git index path empty');
    files.push(file);
    offset = start + Math.ceil((nul + 1 - start) / 8) * 8;
    if (offset > trailer) throw new Error('git index entry padding overflow');
  }

  while (offset < trailer) {
    if (offset + 8 > trailer) throw new Error('git index extension truncated');
    const signature = index.toString('ascii', offset, offset + 4);
    const size = index.readUInt32BE(offset + 4);
    if (offset + 8 + size > trailer) throw new Error('git index extension overflow');
    if (signature === 'link' || signature === 'sdir') {
      throw new Error(`git ${signature === 'link' ? 'split' : 'sparse'} index unsupported`);
    }
    if (/^[a-z]/.test(signature)) throw new Error(`required git index extension ${signature} unsupported`);
    offset += 8 + size;
  }

  const actual = crypto.createHash('sha1').update(index.subarray(0, trailer)).digest();
  if (!actual.equals(index.subarray(trailer))) throw new Error('git index checksum invalid');
  return files;
}

function gitDir(root) {
  const dotGit = path.join(root, '.git');
  if (fs.statSync(dotGit).isDirectory()) return dotGit;
  const match = fs.readFileSync(dotGit, 'utf8').match(/^gitdir:\s*(.+)$/m);
  if (!match) throw new Error('.git file has no gitdir');
  return path.resolve(root, match[1].trim());
}

export function verifyNoCommittableSor(root = '/home/potter') {
  try {
    const files = parseGitIndex(fs.readFileSync(path.join(gitDir(root), 'index')));
    const trackedSensitive = [...new Set(files.filter(isSensitive))].sort();
    const rules = fs
      .readFileSync(path.join(root, '.gitignore'), 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    const ruleSet = new Set(rules);
    const missingIgnoreRules = REQUIRED_IGNORE_RULES.filter((rule) => !ruleSet.has(rule));
    // Any new negation can reopen an earlier private wildcard. Require an
    // explicit review here instead of attempting partial Git-ignore semantics.
    const unsafeNegations = rules.filter(
      (rule) => rule.startsWith('!') && !ALLOWED_NEGATIONS.has(rule),
    );
    const ok = !trackedSensitive.length && !missingIgnoreRules.length && !unsafeNegations.length;
    const problems = [
      ...trackedSensitive.map((file) => `tracked sensitive path: ${file}`),
      ...missingIgnoreRules.map((rule) => `missing .gitignore rule: ${rule}`),
      ...unsafeNegations.map((rule) => `unsafe .gitignore negation: ${rule}`),
    ];
    return {
      ok,
      trackedCount: files.length,
      trackedSensitive,
      missingIgnoreRules,
      unsafeNegations,
      error: null,
      detail: ok
        ? `tracked=${files.length}; privacyRules=${REQUIRED_IGNORE_RULES.length}; no committable SoR/PII`
        : problems.slice(0, 20).join('\n'),
    };
  } catch (error) {
    const message = String(error?.message || error);
    return {
      ok: false,
      trackedCount: null,
      trackedSensitive: [],
      missingIgnoreRules: [],
      unsafeNegations: [],
      error: message,
      detail: `privacy inventory unknown: ${message}`,
    };
  }
}
