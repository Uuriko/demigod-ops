#!/usr/bin/env node
/**
 * Minify lobby + simp clients into dasha-lobby-static-gen.mjs for Worker static serve.
 * Landing loads them from https://lobby.getdasha.com/client/*.js (avoids Webflow ~50KB cap).
 *
 *   node dasha-lobby-assets-build.mjs --write
 *   node dasha-lobby-assets-build.mjs --check
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const outPath = join(root, 'dasha-lobby-static-gen.mjs');

function pinSri(path, pattern, replacement) {
  const file = join(root, path);
  const source = readFileSync(file, 'utf8');
  const next = source.replace(pattern, replacement);
  if (next === source && !source.includes(replacement)) throw new Error(`SRI marker missing: ${path}`);
  if (next !== source) writeFileSync(file, next);
}

/** Same minify as lobby embed-build — comments + whitespace outside strings. */
function minifyJs(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let inStr = null;
  let inLine = false;
  let inBlock = false;
  let inRegex = false;
  let prevCode = '';
  const isIdent = (c) => /[A-Za-z0-9_$]/.test(c);
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (inLine) {
      if (c === '\n') {
        inLine = false;
        out += '\n';
      }
      i++;
      continue;
    }
    if (inBlock) {
      if (c === '*' && next === '/') {
        inBlock = false;
        i += 2;
      } else i++;
      continue;
    }
    if (inStr) {
      out += c;
      if (c === '\\' && i + 1 < n) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (c === inStr) inStr = null;
      i++;
      continue;
    }
    if (inRegex) {
      out += c;
      if (c === '\\' && i + 1 < n) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (c === '/') inRegex = false;
      i++;
      continue;
    }
    if (c === '/' && next === '/') {
      inLine = true;
      i += 2;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlock = true;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      out += c;
      prevCode = c;
      i++;
      continue;
    }
    if (c === '/') {
      const p = prevCode.trim().slice(-1);
      if (!p || /[=(:,;!&|?{}\[~+\-*%<>^]/.test(p) || prevCode.endsWith('return')) {
        inRegex = true;
        out += c;
        prevCode = c;
        i++;
        continue;
      }
    }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
      while (i < n && /[ \t\r\n]/.test(src[i])) i++;
      const left = prevCode.slice(-1);
      const right = src[i] || '';
      if (isIdent(left) && isIdent(right)) out += ' ';
      else if ((left === '+' && right === '+') || (left === '-' && right === '-')) out += ' ';
      continue;
    }
    out += c;
    prevCode += c;
    if (prevCode.length > 16) prevCode = prevCode.slice(-16);
    i++;
  }
  return out.trim();
}

function loadClient(name) {
  return readFileSync(join(root, name), 'utf8')
    .replace(/^\/\*\*[\s\S]*?\*\/\s*/, '')
    .trim();
}

function escTemplate(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const sri = source => `sha384-${createHash('sha384').update(source).digest('base64')}`;

function assertSingleClient(src, name, marker) {
  // Guard against accidental paste-duplication (hash thrash + double mount).
  const n = src.split(marker).length - 1;
  if (n !== 1) {
    throw new Error(
      `dasha-lobby-assets-build: ${name} must contain exactly one ${JSON.stringify(marker)} (found ${n})`,
    );
  }
}

function build() {
  const lobbySrc = loadClient('dasha-lobby-client.js');
  const simpSrc = loadClient('dasha-simp-board-client.js');
  const studioSrc = loadClient('dasha-studio-embed.js');
  assertSingleClient(lobbySrc, 'dasha-lobby-client.js', 'global.DashaLobby');
  assertSingleClient(simpSrc, 'dasha-simp-board-client.js', 'global.DashaSimpBoard');
  const lobby = minifyJs(lobbySrc);
  const simp = minifyJs(simpSrc);
  const studio = minifyJs(studioSrc);
  const lobbySri = sri(lobby);
  const simpSri = sri(simp);
  const studioSri = sri(studio);
  const robots = readFileSync(join(root, 'dasha-robots.txt'), 'utf8').trim() + '\n';
  const sitemap = readFileSync(join(root, 'dasha-sitemap.xml'), 'utf8')
    .replace(/<!--[\s\S]*?-->\n?/g, '')
    .trim() + '\n';
  const howto = readFileSync(join(root, 'dasha-how-to-buy.html'), 'utf8');
  const chessPage = readFileSync(join(root, 'dasha-chess-page.html'), 'utf8');
  const lobbyPage = readFileSync(join(root, 'dasha-lobby-page.html'), 'utf8');
  const socialCard = readFileSync(join(root, 'dasha-worker-assets/og/dasha-social-card.png'));
  const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');
  const workerDependencies = [
    'dasha-lobby-mod.mjs',
    'dasha-lobby-x.mjs',
    'dasha-simp-actions.mjs',
    'dasha-simp-score.mjs',
    'dasha-chess.mjs',
  ].map(file => readFileSync(join(root, file), 'utf8')).join('\n');
  const wrangler = readFileSync(join(root, 'dasha-lobby-wrangler.jsonc'), 'utf8');
  const hash = createHash('sha256')
    .update(
      worker +
        '\n' +
        workerDependencies +
        '\n' +
        wrangler +
        '\n' +
        lobby +
        '\n' +
        simp +
        '\n' +
        studio +
        '\n' +
        robots +
        '\n' +
        sitemap +
        '\n' +
        howto +
        '\n' +
        chessPage +
        '\n' +
        lobbyPage +
        '\n' +
        socialCard.toString('base64'),
    )
    .digest('hex')
    .slice(0, 16);
  return {
    hash,
    lobbyBytes: lobby.length,
    simpBytes: simp.length,
    studioBytes: studio.length,
    lobbySri,
    simpSri,
    studioSri,
    robotsBytes: robots.length,
    sitemapBytes: sitemap.length,
    howtoBytes: howto.length,
    chessPageBytes: chessPage.length,
    lobbyPageBytes: lobbyPage.length,
    source: `/** Auto-generated by dasha-lobby-assets-build.mjs — do not edit. */
export const LOBBY_CLIENT_JS = \`${escTemplate(lobby)}\`;
export const SIMP_BOARD_JS = \`${escTemplate(simp)}\`;
export const LOBBY_CLIENT_SRI = ${JSON.stringify(lobbySri)};
export const SIMP_BOARD_SRI = ${JSON.stringify(simpSri)};
export const STUDIO_CLIENT_SRI = ${JSON.stringify(studioSri)};
export const STUDIO_CLIENT_JS = \`${escTemplate(studio)}\`;
export const ROBOTS_TXT = \`${escTemplate(robots)}\`;
export const SITEMAP_XML = \`${escTemplate(sitemap)}\`;
export const HOWTO_HTML = \`${escTemplate(howto)}\`;
export const CHESS_PAGE_HTML = \`${escTemplate(chessPage)}\`;
export const LOBBY_PAGE_HTML = \`${escTemplate(lobbyPage)}\`;
export const ASSET_HASH = ${JSON.stringify(hash)};
`,
  };
}

const built = build();

if (args.has('--check')) {
  if (!existsSync(outPath)) {
    console.error('dasha-lobby-assets-build: missing dasha-lobby-static-gen.mjs — run --write');
    process.exit(1);
  }
  const have = readFileSync(outPath, 'utf8');
  if (have !== built.source) {
    console.error('dasha-lobby-assets-build: dasha-lobby-static-gen.mjs OUT OF SYNC — run --write');
    process.exit(1);
  }
  const landing = readFileSync(join(root, 'dasha-landing.html'), 'utf8');
  if (!landing.includes(`const SIMP_SRI='${built.simpSri}'`) || !landing.includes('s.integrity=SIMP_SRI') || !landing.includes("s.crossOrigin='anonymous'")) {
    console.error('dasha-lobby-assets-build: homepage Simp client SRI is stale');
    process.exit(1);
  }
  const lobbyPage = readFileSync(join(root, 'dasha-lobby-page.html'), 'utf8');
  if (!lobbyPage.includes(`s.integrity='${built.lobbySri}'`) || !lobbyPage.includes("s.crossOrigin='anonymous'")) {
    console.error('dasha-lobby-assets-build: lobby client SRI is stale');
    process.exit(1);
  }
  const studioEmbed = readFileSync(join(root, 'dasha-studio-embed.html'), 'utf8');
  if (!studioEmbed.includes(`integrity="${built.studioSri}"`) || !studioEmbed.includes('crossorigin="anonymous"')) {
    console.error('dasha-lobby-assets-build: Studio client SRI is stale');
    process.exit(1);
  }
  console.log('dasha-lobby-assets-build: check PASS', {
    hash: built.hash,
    lobbyBytes: built.lobbyBytes,
    simpBytes: built.simpBytes,
    studioBytes: built.studioBytes,
    lobbySri: built.lobbySri,
    simpSri: built.simpSri,
    studioSri: built.studioSri,
    robotsBytes: built.robotsBytes,
    sitemapBytes: built.sitemapBytes,
    howtoBytes: built.howtoBytes,
    lobbyPageBytes: built.lobbyPageBytes,
  });
  process.exit(0);
}

if (args.has('--write') || args.size === 0) {
  pinSri('dasha-landing.html', /const SIMP_SRI='sha384-[A-Za-z0-9+/=]+'/, `const SIMP_SRI='${built.simpSri}'`);
  pinSri('dasha-lobby-page.html', /s\.integrity='sha384-[A-Za-z0-9+/=]+'/, `s.integrity='${built.lobbySri}'`);
  pinSri('dasha-studio-embed.html', /integrity="sha384-[A-Za-z0-9+/=]+"/, `integrity="${built.studioSri}"`);
  const final = build();
  writeFileSync(outPath, final.source);
  console.log('dasha-lobby-assets-build: wrote static gen', {
    hash: final.hash,
    lobbyBytes: final.lobbyBytes,
    simpBytes: final.simpBytes,
    studioBytes: final.studioBytes,
    lobbySri: final.lobbySri,
    simpSri: final.simpSri,
    studioSri: final.studioSri,
    robotsBytes: final.robotsBytes,
    sitemapBytes: final.sitemapBytes,
    howtoBytes: final.howtoBytes,
    lobbyPageBytes: final.lobbyPageBytes,
  });
  process.exit(0);
}

console.error('usage: node dasha-lobby-assets-build.mjs --check|--write');
process.exit(2);
