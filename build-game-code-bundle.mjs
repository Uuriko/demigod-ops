import fs from 'fs';
import path from 'path';

const ROOT = '/home/potter';
const GAME_FILES = [
  'ninjawhee-eat-the-sounds.html',
  'overworld.js',
  'heavy-dialogue-art.js',
  'pixel-gfx.js',
  'game-progress.js',
  'store-items.js',
  'pause-journal.js',
  'vinyl-echo-bridge.js',
  'vinyl-audio.js',
  'easter-eggs.js',
  'audio-bus.js',
  'rhythm-loop.js',
  'heavy-runtime.js',
  'STORE-TILE-LAYOUT-PLAN.md',
  'HEAVY-GAME-DESIGN-PASS.md',
  'HEAVY-VISUAL-DIRECTION.md',
  'HEAVY-RHYTHM-DIRECTION.md',
  'NOTES-FOR-SUPERGROK-HEAVY.md',
];

function indexFile(rel, content) {
  const lines = content.split('\n');
  const funcs = [...content.matchAll(/function\s+(\w+)/g)].map((m) => m[1]);
  const exports = [...content.matchAll(/window\.(\w+)\s*=/g)].map((m) => m[1]);
  const consts = [...content.matchAll(/const\s+([A-Z][A-Z0-9_]+)\s*=/g)].map((m) => m[1]);
  return { rel, lines: lines.length, bytes: content.length, funcs: [...new Set(funcs)], exports: [...new Set(exports)], consts: [...new Set(consts)].slice(0, 40) };
}

let bundle = '# EAT THE SOUNDS — Complete Game Source Bundle\n';
bundle += `# Generated ${new Date().toISOString()}\n\n`;
const manifest = [];

for (const rel of GAME_FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) continue;
  const content = fs.readFileSync(fp, 'utf8');
  manifest.push(indexFile(rel, content));
  bundle += `\n\n${'='.repeat(72)}\n`;
  bundle += `FILE: ${rel} (${content.split('\n').length} lines)\n`;
  bundle += `${'='.repeat(72)}\n`;
  bundle += content;
  if (!content.endsWith('\n')) bundle += '\n';
}

const manifestMd = `# Code Manifest\n\n| File | Lines | Exports | Key consts |\n|------|-------|---------|------------|\n`
  + manifest.map((m) => `| ${m.rel} | ${m.lines} | ${m.exports.join(', ') || '—'} | ${m.consts.slice(0, 6).join(', ') || '—'} |`).join('\n')
  + '\n\n## Functions per file\n\n'
  + manifest.map((m) => `### ${m.rel}\n${m.funcs.join(', ') || '(none)'}\n`).join('\n');

const outBundle = path.join(ROOT, 'GAME-CODE-COMPLETE-BUNDLE.txt');
const outManifest = path.join(ROOT, 'GAME-CODE-MANIFEST.md');
fs.writeFileSync(outBundle, bundle);
fs.writeFileSync(outManifest, manifestMd);

const stats = { files: manifest.length, totalLines: manifest.reduce((s, m) => s + m.lines, 0), bundleBytes: bundle.length };
fs.writeFileSync(path.join(ROOT, 'GAME-CODE-BUNDLE-STATS.json'), JSON.stringify(stats, null, 2));
console.log(JSON.stringify(stats, null, 2));
console.log('wrote', outBundle, outManifest);