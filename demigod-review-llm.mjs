#!/usr/bin/env node
/**
 * demigod-review-llm — optional deep pass via claude CLI (when available)
 * Never required. Adds semantic findings as rule=llm-semantic.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { ROOT, BUSY } from './demigod-review-lib.mjs';
import { ensureBusy } from './demigod-agent-tools-lib.mjs';

function hasClaude() {
  const r = spawnSync('bash', ['-lc', 'command -v claude'], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim();
}

/**
 * @param {{ files: string[], findings: any[], timeoutMs?: number }} opts
 * @returns {any[]} extra findings
 */
export function runLlmPass({ files, findings, timeoutMs = 90000 } = {}) {
  if (!hasClaude()) return [];
  const blockers = findings.filter((f) => !f.suppressed && (f.sev === 'critical' || f.sev === 'high')).slice(0, 12);
  const focus = files.filter((f) => /\.(mjs|js)$/.test(f)).slice(0, 8);
  if (!focus.length) return [];

  const snippets = [];
  for (const f of focus) {
    try {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      snippets.push(`### ${f}\n\`\`\`\n${src.slice(0, 4000)}\n\`\`\``);
    } catch {
      /* */
    }
  }

  const prompt = `You are a strict code reviewer for Demigod (Node ESM ops tools, freeze ON).
Return ONLY a JSON array of findings (max 8). Each: {"sev":"critical|high|medium","file":"...","line":null,"title":"...","detail":"...","fix":"..."}.
Focus on real bugs: race conditions, wrong API usage, missing awaits, board PII, intro send risks, security.
Do NOT nitpick style. Existing static findings:
${JSON.stringify(blockers.map((b) => ({ rule: b.rule, file: b.file, title: b.title })), null, 0)}

Files:
${snippets.join('\n\n')}
`;

  ensureBusy();
  const promptPath = path.join(BUSY, 'review-llm-prompt.txt');
  fs.writeFileSync(promptPath, prompt);

  const r = spawnSync(
    'bash',
    [
      '-lc',
      `timeout ${Math.ceil(timeoutMs / 1000)} claude --print --model sonnet -p "$(cat ${promptPath})" 2>/dev/null | tail -c 20000`,
    ],
    { encoding: 'utf8', timeout: timeoutMs + 5000, cwd: ROOT },
  );

  const text = r.stdout || '';
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 8).map((x) => ({
      id: crypto.randomBytes(4).toString('hex'),
      rule: 'llm-semantic',
      sev: ['critical', 'high', 'medium', 'low'].includes(x.sev) ? x.sev : 'medium',
      file: x.file || focus[0],
      line: x.line || null,
      title: String(x.title || 'LLM finding').slice(0, 120),
      detail: String(x.detail || '').slice(0, 400),
      fix: x.fix ? String(x.fix).slice(0, 300) : undefined,
      tier: 'C',
    }));
  } catch {
    return [];
  }
}
