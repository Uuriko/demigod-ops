import fs from 'fs';

const files = [
  'ninjawhee-eat-the-sounds.html', 'overworld.js', 'heavy-dialogue-art.js',
  'pixel-gfx.js', 'game-progress.js', 'store-items.js', 'pause-journal.js',
  'vinyl-echo-bridge.js', 'vinyl-audio.js', 'easter-eggs.js', 'audio-bus.js',
  'rhythm-loop.js', 'heavy-runtime.js',
];

let out = '# EAT THE SOUNDS — Code Digest for Design Doc\n\n';
const manifest = fs.readFileSync('/home/potter/GAME-CODE-MANIFEST.md', 'utf8');
out += manifest + '\n\n';

for (const rel of files) {
  const content = fs.readFileSync(`/home/potter/${rel}`, 'utf8');
  const lines = content.split('\n');
  out += `\n## ${rel} (${lines.length} lines)\n\n`;
  // Extract dialogue forests
  if (rel.includes('.html')) {
    const m = content.match(/DIALOGUE_FORESTS\s*=\s*\{([\s\S]*?)\n    \};/);
    if (m) {
      const forests = [...m[1].matchAll(/(\w+):\s*\{/g)].map((x) => x[1]);
      out += `**Dialogue forests:** ${forests.join(', ')}\n\n`;
    }
    const charts = content.match(/buildChartForSong|CHART_SECTIONS|songs\s*=/g);
    out += `**Rhythm:** chart builders present\n\n`;
    out += '**First 120 lines of script section:**\n```\n';
    const scriptStart = content.indexOf('<script>');
    out += content.slice(scriptStart, scriptStart + 4000);
    out += '\n```\n';
    out += '**Dialogue sample (intro forest):**\n```\n';
    const intro = content.match(/intro:\s*\{[\s\S]{0,2500}/);
    if (intro) out += intro[0];
    out += '\n```\n';
    out += '**Return forest sample:**\n```\n';
    const ret = content.match(/return:\s*\{[\s\S]{0,2000}/);
    if (ret) out += ret[0];
    out += '\n```\n';
    continue;
  }
  out += '```js\n' + lines.slice(0, Math.min(180, lines.length)).join('\n') + '\n```\n';
  if (lines.length > 180) out += `\n*(+${lines.length - 180} more lines)*\n`;
}

fs.writeFileSync('/home/potter/GAME-CODE-DESIGN-DIGEST.md', out);
console.log('digest bytes', out.length);