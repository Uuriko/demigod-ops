import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export function secretLeakKinds(text) {
  const source = String(text || '');
  return [
    /\b(?:gh[opusr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/.test(source) && 'github-token',
    /\b(?:client_secret|GITHUB_CLIENT_SECRET|X_CLIENT_SECRET|LOBBY_SESSION_SECRET)\s*[:=]\s*["'`][^\s"'`\\]{8,}/i.test(source) && 'hardcoded-oauth-secret',
  ].filter(Boolean);
}

export function scanBundleDir(root) {
  const leaks = [], stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.isFile() && (/\.(?:c?m?js|json|map|css|html|txt)$/i.test(entry.name) || !entry.name.includes('.'))) {
        const kinds = secretLeakKinds(readFileSync(path, 'utf8'));
        if (kinds.length) leaks.push({ file: relative(root, path), kinds });
      }
    }
  }
  return leaks;
}
