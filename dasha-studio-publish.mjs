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
import { createHash } from 'node:crypto';
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
const LINKS = /^https:\/\/(creativecommons\.org|github\.com\/Uuriko|jup\.ag|x\.com|(?:www\.|lobby\.)getdasha\.com)/;
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
  .replace(/dasha-studio-embed-build\.mjs/g, 'embed-build.mjs')
  // Public pack has no lobby static-gen; SRI is only for the live thin loader path.
  .replace(
    /import \{ STUDIO_CLIENT_SRI \} from '\.\/dasha-lobby-static-gen\.mjs';/,
    "const STUDIO_CLIENT_SRI = 'sha384-public-studio-pack';",
  )
  /* Public pack must ship the self-contained fragment as embed.html (pasteable offline).
     The private builder CLI writes a thin Worker loader instead; rewrite the outputs so
     `node embed-build.mjs --check` and studio.test.mjs agree with what publish writes. */
  .replace(
    "const outputs = [['embed.html', loader], ['embed.js', script]];",
    "const outputs = [['embed.html', embed], ['embed.js', script]];",
  )
  .replace(
    "console.log('studio loader + Worker client generated');",
    "console.log('studio embed + script generated');",
  );
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
files.set('media.json', await read('dasha-studio-media.json'));

/* The README's copy-paste snippet pins embed.js by SHA-384, and studio.test.mjs asserts the pin
   equals the bytes actually shipped. That pin used to be hand-maintained, so it went stale the
   moment the embed changed — and because the published test fails closed, the GitHub Pages deploy
   workflow failed with it. Pages then stopped publishing entirely: the hosted embed sat frozen at
   65 KB against a 114 KB source, and every site that pasted the snippet kept loading the old bytes.
   Nobody saw it, because it is not our page — exactly the failure dasha-discovery.test.mjs warns
   about. Computed from the embed being published, so it cannot drift from it again. */
const publishedSri = `sha384-${createHash('sha384').update(files.get('embed.js')).digest('base64')}`;

/* A second copy under a fingerprinted name, and the snippet points at THAT.
   An integrity= pin against a mutable URL is the one arrangement that cannot work: updating the
   file breaks every page already pinning the old bytes, and not updating it leaves those pages
   running code this repo no longer gates. Both halves of that happened here — the hosted embed sat
   frozen for weeks, and refreshing it invalidated whatever pins were already out there.
   Fingerprinting removes the choice. embed-<hash>.js never changes for a given hash, so a pasted
   snippet keeps working forever, and a new hash is simply a new file next to it.
   Bare embed.js stays, unpinned, for anyone who would rather track latest — the same either/or
   Stripe settled on from the opposite side: they serve a mutable URL and refuse SRI outright,
   because a payment script must be able to push a fix. A CC0 drawing tool has no such urgency, so
   the guarantee worth keeping here is that an embedder's page does not break without warning. */
const fingerprint = createHash('sha256').update(files.get('embed.js')).digest('hex').slice(0, 12);
const versionedName = `embed-${fingerprint}.js`;
files.set(versionedName, files.get('embed.js'));

const readmeSource = await read('dasha-studio-readme.md');
const readme = readmeSource
  .replace(/embed(-[a-f0-9]+)?\.js"/g, `${versionedName}"`)
  .replace(/integrity="sha384-[A-Za-z0-9+/=]+"/g, `integrity="${publishedSri}"`);
if (!readme.includes(publishedSri)) {
  throw new Error('dasha-studio-readme.md has no integrity="sha384-…" to update — the snippet lost its pin');
}
if (!readme.includes(versionedName)) {
  throw new Error('dasha-studio-readme.md snippet does not point at the fingerprinted embed');
}
files.set('README.md', readme);

/* loader.html — the GitHub Pages thin loader. It pins the fingerprinted Pages embed (not the
   Webflow lobby client), so a changed Pages asset fails closed instead of silently executing. It
   is generated from dasha-studio-loader.html with the same fingerprint + SRI as the README snippet,
   which is what keeps its pin from going stale every time the Studio changes. */
const loader = (await read('dasha-studio-loader.html'))
  .replace(/embed\.js"/g, `${versionedName}"`)
  .replace(/integrity="sha384-[A-Za-z0-9+/=]+"/g, `integrity="${publishedSri}"`);
if (!loader.includes(versionedName)) {
  throw new Error('dasha-studio-loader.html does not point at the fingerprinted embed');
}
if (!loader.includes(publishedSri)) {
  throw new Error('dasha-studio-loader.html has no integrity="sha384-…" to update — the loader lost its pin');
}
files.set('loader.html', loader);
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
    /* Superseded fingerprints stay. Deleting embed-<old>.js would break every page that pasted it,
       which is the exact harm fingerprinting exists to prevent — they are kept deliberately, not
       left behind, so they are not hand edits. */
    if (/^embed-[a-f0-9]+\.js$/.test(entry.name)) continue;
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
