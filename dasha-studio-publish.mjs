#!/usr/bin/env node
/**
 * Copy the Studio into the public repo, and prove the copy has not drifted.
 *
 * The public repo held only the Desk. The Studio is the more interesting artifact — it is the thing
 * someone might actually want to change — and it was private, which made "contribute to Dasha" mean
 * "contribute to the smaller half". This publishes it.
 *
 * The obvious way to do that is to copy the files once and move on, and the obvious way is wrong:
 * two copies of a 40 KB HTML file drift, silently, and the copy strangers see is the one that rots.
 * So the public tree is GENERATED from this one and `--check` fails when it is stale — the same
 * contract dasha-desk/build.mjs already uses for its own outputs, for the same reason.
 *
 * Only three rewrites happen on the way across, all of them because the public tree has different
 * filenames than this one. Nothing about the Studio's behaviour changes.
 *
 *   node dasha-studio-publish.mjs           # write dasha-desk/studio/
 *   node dasha-studio-publish.mjs --check    # exit 1 if the public copy is stale
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dasha-desk', 'studio');
const check = process.argv.includes('--check');

const read = (rel) => readFile(join(root, rel), 'utf8');

/* What the Studio is allowed to reach for. Every host here is a decision, not an accident.

   This used to scan only src=/href= attributes, which is why it waved through fifteen photographs:
   they are URLs inside a JavaScript array, loaded with new Image(), and an attribute-shaped regex
   cannot see them. A dependency check that only looks at markup does not check a canvas app.

   The photo gallery is deliberate — the operator chose on 2026-08-08 to keep it and narrow the CC0
   claim instead. What that costs is stated plainly rather than hidden: the drawn looks still work
   with no network, but the gallery does not, and a photo host can rot or start refusing us at any
   time. The footer must therefore never claim the photos are ours to give away. */
const LINKS = /^https:\/\/(creativecommons\.org|github\.com\/Uuriko|jup\.ag|x\.com)/;
const PHOTO_HOSTS = /^https:\/\/(pbs\.twimg\.com|static1\.squarespace\.com|www\.moviemaker\.com|m\.media-amazon\.com|br\.web\.img2\.acsta\.net|avatars\.mds\.yandex\.net|upload\.wikimedia\.org)\//;
const studio = await read('dasha-meme-studio.html');
// Every absolute URL anywhere in the file — markup, CSS, or a string literal in the script.
const external = [...studio.matchAll(/https?:\/\/[^\s"'`)<>]+/g)].map((m) => m[0]);
const loaded = external.filter((url) => !LINKS.test(url) && !PHOTO_HOSTS.test(url));
if (loaded.length) {
  console.error(`The Studio reaches a host nobody approved: ${[...new Set(loaded)].join(', ')}`);
  console.error('Add it to LINKS or PHOTO_HOSTS on purpose, or drop it.');
  process.exit(1);
}

/* The licence claim has to match what the tool can actually put in an export. Only a build that can
   put a PHOTO in an export overclaims by saying "exports are CC0" — a fully drawn build says it
   truthfully, so this fires on the combination, not on the wording alone. */
const hasGallery = external.some((url) => PHOTO_HOSTS.test(url));
if (hasGallery && /exports are\s*<a[^>]*>CC0/i.test(studio)) {
  console.error('The footer still dedicates EXPORTS to the public domain while a photo gallery exists.');
  console.error('Narrow it to what the Studio draws, or remove the gallery.');
  process.exit(1);
}

const files = new Map();

// index.html — the Studio itself, renamed so `python3 -m http.server` serves it at /studio/.
files.set('index.html', studio);

/* The generator, rewritten for the public tree's filenames. Contributors need to be able to
   regenerate the embed after changing the Studio, or the embed is what goes stale over there. */
const builder = (await read('dasha-studio-embed-build.mjs'))
  .replace(/dasha-meme-studio\.html/g, 'index.html')
  .replace(/dasha-studio-embed\.html/g, 'embed.html')
  .replace(/dasha-studio-embed\.js/g, 'embed.js')
  .replace(/dasha-studio-embed-build\.mjs/g, 'embed-build.mjs');
files.set('embed-build.mjs', builder);

/* embed.html is produced by running THAT script, not by copying ours. The two differ: the generated
   header names the file it came from, so a copy of our embed would be permanently "stale" against
   the public builder — the public gate would fail on a first clone, which is the worst possible
   first impression. Importing the rewritten module is also the only way to be sure the rewrite did
   not break it. */
const { buildStudioEmbed, embedScript } = await import(
  'data:text/javascript;base64,' + Buffer.from(builder).toString('base64'));
const embed = buildStudioEmbed(studio);
files.set('embed.html', embed);
// embed.js is the external-script variant. The builder's own --check looks for it, so a public tree
// without it fails `node embed-build.mjs --check` on a fresh clone.
files.set('embed.js', embedScript(embed));

for (const svg of ['mark', 'favicon', 'character']) {
  files.set(`assets/${svg}.svg`, await read(`dasha-${svg}.svg`));
}

files.set('LICENSE', await read('LICENSE-KIT'));

files.set('README.md', await read('dasha-studio-readme.md'));
files.set('studio.test.mjs', await read('dasha-studio-static.test.mjs'));

if (check) {
  const stale = [];
  for (const [name, want] of files) {
    let have = null;
    try { have = await readFile(join(out, name), 'utf8'); } catch {}
    if (have !== want) stale.push(name);
  }
  // A file in the public tree that this script does not generate is an untracked hand edit.
  const known = new Set([...files.keys()].map((f) => f.split('/')[0]));
  for (const entry of await readdir(out, { withFileTypes: true }).catch(() => [])) {
    if (!known.has(entry.name)) stale.push(`${entry.name} (not generated by this script)`);
  }
  if (stale.length) {
    console.error(`stale public Studio: ${stale.join(', ')} — run: node dasha-studio-publish.mjs`);
    process.exit(1);
  }
  console.log(`Dasha Studio publish: PASS (${files.size} files in dasha-desk/studio/ match source)`);
} else {
  for (const [name, text] of files) {
    const target = join(out, name);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
  }
  console.log(`wrote ${files.size} files to dasha-desk/studio/`);
  for (const [name, text] of files) console.log(`  ${name.padEnd(20)} ${text.length} bytes`);
}
