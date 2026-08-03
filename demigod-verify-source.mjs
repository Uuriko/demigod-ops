#!/usr/bin/env node
/**
 * demigod-verify-source — disk gate: foot/head/footer match split architecture
 *
 *   npm run demigod:verify:source
 *   node demigod-verify-source.mjs
 *
 * Checks: foot-core parse/boot markers, head-minimal, footer-lite CDN shape,
 * no banned MCP rewrite scripts, WIZ ownership markers. Best-effort writes
 * DEMIGOD-VERIFY-SOURCE.json (non-fatal if read-only sandbox — VERDICT + exit code are the product).
 * Not live truth — pair with bin/dg truth / live-attest for deploy equality.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { spawnSync } from 'child_process';
import { scanLiveHtml, markerPresent } from './demigod-live-lib.mjs';
import { runFootSmoke } from './demigod-foot-smoke.mjs';
import { verifyNoCommittableSor } from './demigod-no-committable-sor-lib.mjs';

const ROOT = '/home/potter';
const OUT = path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json');

const sourceArgs = process.argv.slice(2);
const SOURCE_FLAGS = new Set(['--help', '-h']);
const unknownSource = sourceArgs.find((a) => !SOURCE_FLAGS.has(a));
if (unknownSource) {
  console.error(
    `verify-source: unknown argument ${unknownSource} — try: node demigod-verify-source.mjs`,
  );
  process.exit(2);
}
if (sourceArgs.includes('--help') || sourceArgs.includes('-h')) {
  console.log(`demigod-verify-source — disk gate: foot/head/footer match split architecture

Usage: node demigod-verify-source.mjs`);
  process.exit(0);
}

const checks = [];

function check(name, ok, detail = null) {
  checks.push({ name, ok, detail });
}

const head = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
const foot = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
const footLoaderPath = path.join(ROOT, 'demigod-footer-loader.html');
const footLoader = fs.existsSync(footLoaderPath) ? fs.readFileSync(footLoaderPath, 'utf8') : '';
const headCssPath = path.join(ROOT, 'demigod-head-styles.css');
const headCss = fs.existsSync(headCssPath) ? fs.readFileSync(headCssPath, 'utf8') : '';
const cdnFoot = foot.includes('demigod-foot-cdn-loader');
const cdnHeadCss = head.includes('rel="stylesheet"') && /https:\/\/(?:files\.catbox\.moe\/[a-z0-9]+|cdn\.jsdelivr\.net\/gh\/Uuriko\/demigod-site-cdn@[a-f0-9]+\/head-latest)\.css/i.test(head);
const combined = `${head}\n${headCss}\n${foot}`;
const coreJs = cdnFoot ? fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8') : '';
const combinedForMarkers = cdnFoot ? `${head}\n${headCss}\n${coreJs}` : combined;

{
  const retired = /(?:\bdgFormAnalytics\b|__dgFormAnalyticsSeen|__dgWebhookUrl|\/analytics\/forms\b|\bformAnalytics\b|demigod-form-analytics\.mjs|\bfunnel-report\b)/;
  const residues = fs.readdirSync(ROOT)
    .filter((file) => /^demigod-.*\.(?:mjs|js|html)$/.test(file) && !/\.test\.mjs$/.test(file) && file !== 'demigod-verify-source.mjs')
    .flatMap((file) => {
      const match = `${file}\n${fs.readFileSync(path.join(ROOT, file), 'utf8')}`.match(retired);
      return match ? [`${file}:${match[0]}`] : [];
    });
  check('forms:no-dormant-analytics', residues.length === 0, residues.slice(0, 5).join(', ') || null);
}
check(
  'core:wiz-resume-step-sync',
  /function showStep\(idx\) \{\s*current = Math\.max\(0, Math\.min\(idx, steps\.length - 1\)\);\s*collect\(\);/.test(coreJs),
  'showStep must persist every forward/back/edit navigation through the existing draft writer',
);

// Webflow's head custom-code field caps at 50,000 chars and fails SILENTLY: the API returns 200, the
// UI says "saved", and a readback can even look like it verified -- while the server keeps the OLD
// head, so every later ship no-ops invisibly. That cost 83min once and nothing has ever gated it.
// The head went 48,933 -> 53,668 within one session on 2026-07-17 with every check green, which is
// exactly the failure mode: unmeasured means unbounded. Fail loudly BEFORE the paste, not after.
{
  const CAP = 50000;
  // BYTES, not head.length. `.length` counts UTF-16 code units, and the head carries 31 non-ASCII
  // chars (14 em-dashes, 12 en-dashes, 3 bullets, a middot, a curly apostrophe) = 61 extra UTF-8
  // bytes today. Whether Webflow's cap counts characters or bytes is NOT established, so take the
  // stricter reading: if it caps bytes this is correct; if it caps chars this only fails ~61 bytes
  // early out of 50,000 (0.12%). Cheap insurance against a limit whose breach is SILENT.
  const n = Buffer.byteLength(head, 'utf8');
  check(
    'head:size-under-cap',
    n <= CAP,
    n > CAP
      ? `${n}/${CAP} — OVER BY ${n - CAP}; a Webflow head paste will silently keep the OLD head`
      : `${n}/${CAP} (${CAP - n} left)`,
  );
}
check('head:hide-webflow-badge', head.includes('hide-webflow-badge') || (cdnHeadCss && headCss.includes('w-webflow-badge')));
check('head:no-retired-hero-asset', !(headCss || head).includes('demigod-gold-hero.jpg'));
check('head:mobile-no-reserved-scrollbar-gutter', /@media\(max-width:480px\)\{\s*html\{scrollbar-gutter:auto\}/.test(headCss));
check('head:public-contact-potter', head.includes('potter@trydemigod.com') && !head.includes('hello@trydemigod.com') && !head.includes('hello@demigod.com'));
check(
  'head:nojs-hero-flow',
  /<noscript id="dg-path-noscript">[\s\S]*?<style id="dg-nojs-hero">html:not\(\.w-mod-js\) \.hero-section h1,html:not\(\.w-mod-js\) \.header h1,html:not\(\.w-mod-js\) \.hero-title\{height:auto!important;min-height:0!important\}<\/style>/.test(head),
  'the authored no-JavaScript hero heading must use intrinsic height without affecting the JavaScript-on critical box',
);
{
  const noJs = (head.match(/<noscript id="dg-path-noscript">[\s\S]*?<\/noscript>/) || [])[0] || '';
  check(
    'head:nojs-native-actions',
      noJs.includes('<style id="dg-nojs-actions">html:not(.w-mod-js) a[href="#"],html:not(.w-mod-js) a[href^="/?p="],html:not(.w-mod-js) a[href^="/?wiz="]{display:none!important}</style>') &&
      noJs.includes('Hire talent by email') &&
      noJs.includes('Share what I’d consider by email') &&
      (noJs.match(/mailto:potter@trydemigod\.com\?subject=/g) || []).length === 2 &&
      !/href=["']\/\?(?:p|wiz)=/.test(noJs),
    'no-JavaScript fallback must expose native Home/email actions, not script-only routes or inert hash CTAs',
  );
}
// Positioning 07-16: Demigod tech + humans in the loop — NOT matched by hand.
// Brand line moved Human-Matched → Tech-Matched; gate asserts the current line, not the retired one.
check('head:heavy-meta', head.includes('Tech-Matched SF Startup Talent') && head.includes('one concrete first result') && head.includes('human review'));
check('head:og:title', head.includes('og:title'));
check(
  'head:hero-font-no-layout-swap',
  /family=Unbounded[^"']*&display=optional/.test(head) && !/family=Unbounded[^"']*&display=swap/.test(head),
  'Unbounded must use display=optional; Lighthouse traced the live hero CLS to its late swap',
);
check(
  'css:critical-hero-geometry',
  headCss.includes('dg-critical-hero-geometry') &&
    [
      '--dg-night:',
      '--dg-signal:',
      '--dg-phosphor:',
      '--dg-paper:',
      '--dg-paper-mute:',
      '--dg-rule:',
      '--dg-sans:',
      '--dg-cyber:',
    ].every((token) => headCss.includes(token)) &&
    /\.hero-grid-background\{display:none!important\}/.test(headCss) &&
    /min-height:min\(880px,calc\(100svh - 52px\)\)!important/.test(headCss) &&
    /\n\s*height:2\.55em!important;/.test(headCss) &&
    /\.hero-badge\{[\s\S]*?visibility:hidden!important[\s\S]*?height:2\.304rem!important/.test(headCss),
  'head CSS must reserve the final hero geometry before foot-core loads',
);
check(
  'head:preconnect-budget',
  (head.match(/rel="preconnect"/g) || []).length === 1 && /rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"/.test(head),
  'Webflow already preconnects its CDN and Google Fonts; custom head should add only critical jsDelivr',
);
// No internal identifiers on the customer-facing site: an env-var NAME (18da2af leaked
// DEMIGOD_EVENTS_OPS_SECRET into a user message), the dev home dir, or the ops path must never
// reach foot-core/head. That leak was caught by codex review, not a gate — gate it so a re-leak
// fails the build. Conservative pattern (verified 0 matches in the current clean site).
{
  const leakRe = /DEMIGOD_[A-Z_]*(?:SECRET|TOKEN|KEY|PASSWORD)\b|\/home\/potter\b|\/tmp\/dg-busy/;
  const leak = (coreJs.match(leakRe) || [])[0] || (head.match(leakRe) || [])[0];
  check(
    'site:no-internal-leak',
    !leak,
    leak ? `internal identifier leaked to customer-facing foot-core/head: "${leak}" (env-var name / home dir / ops path)` : null,
  );
}
// Social cards must not under-promise vs primary meta (share drift = honesty bug).
{
  const metaDesc = (attr, key) => {
    const re = new RegExp(
      `<meta\\b[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']|<meta\\b[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`,
      'i',
    );
    const m = head.match(re);
    return (m && (m[1] || m[2])) || '';
  };
  const og = metaDesc('property', 'og:description');
  const tw = metaDesc('name', 'twitter:description');
  // Webflow owns the primary description and og:title. Duplicating them in custom head made the
  // raw HTML ambiguous; source checks the matching custom social copy, live doctor checks one base tag.
  const d = metaDesc('name', 'description') || og;
  // Organization JSON-LD description must not under-promise vs meta (share/knowledge-panel honesty).
  const ldM = head.match(
    /"@type"\s*:\s*"Organization"[\s\S]*?"description"\s*:\s*"([^"]*)"/,
  );
  const ld = (ldM && ldM[1]) || '';
  const aligned = d && d === og && d === tw && d === ld;
  check(
    'head:desc-aligned',
    aligned,
    aligned
      ? null
      : `meta/og/tw/ld diverge (${[d, og, tw, ld].map((s) => (s || '').slice(0, 36)).join(' | ')})`,
  );
  // Share/knowledge-panel fee honesty: first-year base salary + talent free.
  const feeDescOk =
    /10%\s+of\s+first-year\s+base\s+salary\s+on\s+hire/i.test(d || '') &&
    /talent\s+free/i.test(d || '') &&
    !/10%\s+when\s+a\s+hire\s+starts/i.test(d || '');
  check(
    'head:fee-desc-cash',
    feeDescOk,
    feeDescOk ? null : `meta description fee copy incomplete (${(d || '').slice(0, 80)})`,
  );
  // SERP snippet length: too short wastes SEO; too long truncates fee honesty mid-phrase.
  const descLen = (d || '').length;
  const descLenOk = descLen >= 80 && descLen <= 160;
  check(
    'head:desc-len',
    descLenOk,
    descLenOk ? null : `meta description length ${descLen} not in 80–160`,
  );
  // og/twitter title+image+url must match (share-card honesty; same class as desc).
  const twT = metaDesc('name', 'twitter:title');
  const ogT = metaDesc('property', 'og:title') || twT;
  const ogImg = metaDesc('property', 'og:image');
  const twImg = metaDesc('name', 'twitter:image');
  const ogAlt = metaDesc('property', 'og:image:alt');
  const twAlt = metaDesc('name', 'twitter:image:alt');
  const ogUrl = metaDesc('property', 'og:url');
  const twUrl = metaDesc('name', 'twitter:url');
  const socialOk =
    ogT &&
    ogT === twT &&
    ogImg &&
    ogImg === twImg &&
    ogAlt &&
    ogAlt === twAlt &&
    ogUrl &&
    ogUrl === twUrl;
  check(
    'head:social-aligned',
    socialOk,
    socialOk
      ? null
      : `og/tw title|img|alt|url diverge`,
  );
  // Emit one route-correct canonical instead of shipping a homepage canonical that JS later contradicts.
  const routeCanM = head.match(
    /<script\b[^>]*\bid=["']dg-blog-canonical["'][^>]*>[\s\S]*?<\/script>/i,
  );
  const routeCanBody = (routeCanM && routeCanM[0]) || '';
  const hasStaticCanonical = /<link\b[^>]*\brel=["']canonical["']/i.test(head);
  const canOk =
    !hasStaticCanonical &&
    /createElement\(['"]link['"]\)/.test(routeCanBody) &&
    /\.rel\s*=\s*['"]canonical['"]/.test(routeCanBody) &&
    /\.href\s*=\s*url/.test(routeCanBody) &&
    /appendChild\(can\)/.test(routeCanBody) &&
    /og:url/.test(routeCanBody) &&
    /twitter:url/.test(routeCanBody);
  check(
    'head:canonical-aligned',
    canOk,
    canOk ? null : 'head must inject one canonical and align og/twitter URL without a conflicting static canonical',
  );
  // Unknown/noisy routes fall back to the production HTTPS apex; allowlisted product routes use only ?p=id.
  const canHttpsOk =
    /allowed\[id\]\?['"]https:\/\/www\.trydemigod\.com\/\?p=['"]\+encodeURIComponent\(id\):['"]https:\/\/www\.trydemigod\.com\/['"]/.test(routeCanBody) &&
    /var allowed=\{[^}]*how:1[^}]*pricing:1[^}]*faq:1[^}]*blog:1[^}]*sample:1/.test(routeCanBody);
  check(
    'head:canonical-https',
    canHttpsOk,
    canHttpsOk ? null : 'route canonical must use the HTTPS apex and an explicit product-page allowlist',
  );
  {
    const aliases = [
      ['/method', '/?p=how'],
      ['/founders', '/?p=hire'],
      ['/candidates', '/?p=talent'],
      ['/engineers', '/?p=talent'],
      ['/compare', '/?p=pricing'],
      ['/status', '/?p=about'],
    ];
    const redirectsOk = aliases.every(([from, to]) => head.includes(`'${from}':'${to}'`));
    const canonicalAliasesOk =
      /var aliases=\{pilot:['"]hire['"],method:['"]how['"],founders:['"]hire['"],candidates:['"]talent['"],compare:['"]pricing['"],status:['"]about['"]\}/.test(routeCanBody) &&
      /var allowed=\{[^}]*refer:1/.test(routeCanBody) &&
      !/var allowed=\{[^}]*(?:method|founders|candidates|compare|status):1/.test(routeCanBody);
    let navOk = false;
    try {
      const navBody = (head.match(/<script\b[^>]*\bid=["']dg-nav-jsonld["'][^>]*>([\s\S]*?)<\/script>/i) || [])[1];
      const items = JSON.parse(navBody).itemListElement;
      navOk =
        Array.isArray(items) &&
        items.length === 10 &&
        items.every((item, index) => item.position === index + 1) &&
        !items.some((item) => /[?&]p=(?:method|founders|candidates|compare|status)\b/.test(item.url || ''));
    } catch {}
    check(
      'head:route-alias-consolidation',
      redirectsOk && canonicalAliasesOk && navOk,
      'legacy product paths must target canonical pages, Refer needs its canonical, and nav JSON-LD must list only 10 real surfaces',
    );
  }
  // Early head rewrite for Notes surface: crawlers that skip foot openPage() still get /?p=blog
  // canonical + Notes title/desc (Claude c63 urls; c102 share-card title/desc) so previews aren't homepage copy.
  {
    const body = routeCanBody;
    const blogCanOk =
      !!body &&
      /id!==['"]blog['"]/.test(body) &&
      /path\s*===\s*['"]\/blog['"]|\/blog/.test(body) &&
      /path\s*===\s*['"]\/notes['"]|\/notes/.test(body) &&
      /\/\(blog\|notes\)\\\//.test(body) &&
      /toLowerCase\s*\(/.test(body) &&
      canHttpsOk && /blog:1/.test(body) &&
      /createElement\(['"]link['"]\)/.test(body) &&
      /og:url/.test(body) &&
      /twitter:url/.test(body) &&
      /og:title/.test(body) &&
      /twitter:title/.test(body) &&
      /og:description/.test(body) &&
      /twitter:description/.test(body) &&
      /meta\[name=description\]|meta\[name=["']description["']\]/.test(body) &&
      /document\.title\s*=\s*title/.test(body) &&
      /og:image/.test(body) &&
      /twitter:image/.test(body) &&
      /og:image:alt/.test(body) &&
      /twitter:image:alt/.test(body) &&
      // Notes card image (urbco5), not homepage hero 16×9.
      /files\.catbox\.moe\/urbco5\.jpg/.test(body) &&
      /Demigod Notes|Notes\s*[—–-]/.test(body);
    check(
      'head:blog-canonical',
      blogCanOk,
      blogCanOk
        ? null
        : 'missing #dg-blog-canonical rewrite of url+title+desc+document.title+og/twitter image+alt (canonical/og/twitter + meta description) → Notes for /?p=blog + nested /blog|/notes paths',
    );
  }
  // Organization JSON-LD logo: string URL or ImageObject.url — must equal og:image or JPEG brand favicon
  // (knowledge-panel honesty; brand mark ImageObject is OK, orphan/missing logo is not).
  {
    let logo = '';
    let logoRaw = null;
    try {
      const orgBlockM =
        head.match(
          /<script\b[^>]*\bid=["']dg-org-jsonld["'][^>]*>\s*([\s\S]*?)\s*<\/script>/i,
        ) ||
        head.match(
          /<script\b[^>]*type=["']application\/ld\+json["'][^>]*\bid=["']dg-org-jsonld["'][^>]*>\s*([\s\S]*?)\s*<\/script>/i,
        );
      const org = orgBlockM && orgBlockM[1] ? JSON.parse(orgBlockM[1]) : null;
      const raw = org && org.logo;
      logoRaw = raw;
      logo = typeof raw === 'string' ? raw : raw && typeof raw.url === 'string' ? raw.url : '';
    } catch (_) {
      logo = '';
      logoRaw = null;
    }
    const favJpegM = head.match(
      /<link\b[^>]*rel=["']icon["'][^>]*href=["']([^"']+\.jpe?g[^"']*)["'][^>]*>/i,
    ) || head.match(
      /<link\b[^>]*href=["']([^"']+\.jpe?g[^"']*)["'][^>]*rel=["']icon["'][^>]*>/i,
    );
    const favJpeg = (favJpegM && favJpegM[1]) || '';
    const logoOk = !!(logo && (logo === ogImg || (favJpeg && logo === favJpeg)));
    check(
      'head:org-logo-aligned',
      logoOk,
      logoOk
        ? null
        : `org logo must equal og:image or jpeg favicon (${[logo, ogImg, favJpeg].map((s) => (s || '').slice(0, 40)).join(' | ')})`,
    );
    // Square brand mark (Claude c85): ImageObject + equal w/h + url === jpeg favicon — not hero 16×9 photo.
    // Google knowledge-panel expects roughly-square logos; hero og:image is 1280×720.
    {
      const w = logoRaw && typeof logoRaw === 'object' ? Number(logoRaw.width) : NaN;
      const h = logoRaw && typeof logoRaw === 'object' ? Number(logoRaw.height) : NaN;
      const squareOk =
        !!favJpeg &&
        logo === favJpeg &&
        logoRaw &&
        typeof logoRaw === 'object' &&
        logoRaw['@type'] === 'ImageObject' &&
        Number.isFinite(w) &&
        Number.isFinite(h) &&
        w > 0 &&
        w === h;
      check(
        'head:org-logo-square',
        squareOk,
        squareOk
          ? null
          : `org logo must be square ImageObject matching jpeg favicon (got ${JSON.stringify(logoRaw || logo).slice(0, 100)})`,
      );
    }
  }
  // Organization LD id so foot orgJsonLd() no-ops (Claude c48: avoid duplicate Organization schema).
  {
    const orgIdOk =
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*\bid=["']dg-org-jsonld["']/i.test(head) ||
      /<script\b[^>]*\bid=["']dg-org-jsonld["'][^>]*type=["']application\/ld\+json["']/i.test(head);
    check(
      'head:org-jsonld-id',
      orgIdOk,
      orgIdOk ? null : 'Organization application/ld+json missing id="dg-org-jsonld" (foot injects duplicate without it)',
    );
  }
  // Organization LD contactPoint + top-level email/areaServed (Claude c56 SEO; public-contact honesty).
  {
    const orgBlockM = head.match(
      /<script\b[^>]*\bid=["']dg-org-jsonld["'][^>]*>\s*([\s\S]*?)\s*<\/script>/i,
    ) || head.match(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*\bid=["']dg-org-jsonld["'][^>]*>\s*([\s\S]*?)\s*<\/script>/i,
    );
    let cpOk = false;
    let cpDetail = 'Organization LD #dg-org-jsonld missing contactPoint';
    let idOk = false;
    let idDetail = 'Organization LD #dg-org-jsonld missing email|areaServed';
    if (orgBlockM && orgBlockM[1]) {
      try {
        const org = JSON.parse(orgBlockM[1]);
        const cp = org && org.contactPoint;
        const email = cp && (typeof cp === 'object' ? cp.email : '');
        const ctype = cp && (typeof cp === 'object' ? cp.contactType : '');
        const ctypeOk = typeof ctype === 'string' && /customer\s*service/i.test(ctype);
        cpOk =
          !!cp &&
          typeof cp === 'object' &&
          cp['@type'] === 'ContactPoint' &&
          email === 'potter@trydemigod.com' &&
          ctypeOk;
        if (!cpOk) {
          cpDetail = `contactPoint incomplete (type=${cp && cp['@type']}|email=${email}|contactType=${ctype})`;
        }
        // Top-level email + areaServed (local SF matching honesty; no orphan contact).
        const orgEmail = org && org.email;
        const area = org && org.areaServed;
        const areaStr = typeof area === 'string' ? area : area && typeof area === 'object' ? (area.name || area['@id'] || '') : '';
        idOk =
          orgEmail === 'potter@trydemigod.com' &&
          typeof areaStr === 'string' &&
          /san\s*francisco/i.test(areaStr) &&
          /bay\s*area/i.test(areaStr);
        if (!idOk) {
          idDetail = `org email|areaServed incomplete (email=${orgEmail}|area=${areaStr})`;
        }
      } catch (e) {
        cpDetail = `Organization LD JSON parse fail: ${e && e.message ? e.message : e}`;
        idDetail = cpDetail;
      }
    }
    check('head:org-contact-point', cpOk, cpOk ? null : cpDetail);
    check('head:org-email-area', idOk, idOk ? null : idDetail);
  }
  // WebSite JSON-LD name+url+inLanguage+mailto potter@ (sibling of Org LD + Blog inLanguage).
  {
    let wsOk = false;
    let wsDetail = 'WebSite application/ld+json missing name|url|inLanguage=en|mailto potter@';
    const scripts = head.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
    for (const block of scripts) {
      const bodyM = block.match(/<script\b[^>]*>\s*([\s\S]*?)\s*<\/script>/i);
      if (!bodyM) continue;
      try {
        const j = JSON.parse(bodyM[1]);
        if (!j || j['@type'] !== 'WebSite') continue;
        const nameOk = j.name === 'Demigod';
        const urlOk = typeof j.url === 'string' && /trydemigod\.com/i.test(j.url);
        const langOk = j.inLanguage === 'en';
        const target =
          j.potentialAction &&
          typeof j.potentialAction === 'object' &&
          (j.potentialAction.target || '');
        const mailOk =
          typeof target === 'string' &&
          /mailto:potter@trydemigod\.com/i.test(target);
        wsOk = nameOk && urlOk && langOk && mailOk;
        if (!wsOk) {
          wsDetail = `WebSite LD incomplete (name=${j.name}|url=${j.url}|inLanguage=${j.inLanguage}|target=${target})`;
        }
        break;
      } catch (_) {
        /* try next script */
      }
    }
    check('head:website-ld', wsOk, wsOk ? null : wsDetail);
  }
  // og:image completeness: type + exact hero dims (Claude c40: JPEG SOF 1280×720; was 1200×675 wrong).
  const ogImgType = metaDesc('property', 'og:image:type');
  const ogImgW = metaDesc('property', 'og:image:width');
  const ogImgH = metaDesc('property', 'og:image:height');
  const ogImgMetaOk = !!(
    ogImg &&
    ogImgType &&
    ogImgW === '1280' &&
    ogImgH === '720' &&
    (/^image\/jpe?g$/i.test(ogImgType) || /jpe?g/i.test(ogImgType))
  );
  check(
    'head:og-image-meta',
    ogImgMetaOk,
    ogImgMetaOk
      ? null
      : `og:image type|w|h not image/jpeg 1280×720 (${[ogImgType, ogImgW, ogImgH].join('|')})`,
  );
  // Brand chrome honesty: PWA/app titles + og:site_name must say Demigod (no drift rename).
  {
    const appName = metaDesc('name', 'application-name');
    const appleTitle = metaDesc('name', 'apple-mobile-web-app-title');
    const siteName = metaDesc('property', 'og:site_name');
    const brandOk =
      appName === 'Demigod' && appleTitle === 'Demigod' && siteName === 'Demigod';
    check(
      'head:brand-meta',
      brandOk,
      brandOk
        ? null
        : `application-name|apple-title|og:site_name not Demigod (${[appName, appleTitle, siteName].join('|')})`,
    );
  }
  // Theme honesty: dark color-scheme + theme-color present (locks Claude app-chrome polish).
  {
    const themeColor = metaDesc('name', 'theme-color');
    const colorScheme = metaDesc('name', 'color-scheme');
    const themeOk = !!(themeColor && /dark/i.test(colorScheme));
    check(
      'head:theme-meta',
      themeOk,
      themeOk
        ? null
        : `theme-color|color-scheme missing/not-dark (${[themeColor, colorScheme].join('|')})`,
    );
  }
  // Mobile install chrome: both capable flags yes (standalone/PWA honesty; no half-wired meta).
  {
    const appleCap = metaDesc('name', 'apple-mobile-web-app-capable');
    const mobileCap = metaDesc('name', 'mobile-web-app-capable');
    const capOk = /^yes$/i.test(appleCap) && /^yes$/i.test(mobileCap);
    check(
      'head:app-capable',
      capOk,
      capOk
        ? null
        : `apple|mobile-web-app-capable not yes (${[appleCap, mobileCap].join('|')})`,
    );
  }
  // iOS status bar: black matches dark theme-color #0A0A0A (sibling of app-capable).
  {
    const sbs = metaDesc('name', 'apple-mobile-web-app-status-bar-style');
    const sbsOk = /^(black|black-translucent)$/i.test(sbs);
    check(
      'head:status-bar-style',
      sbsOk,
      sbsOk
        ? null
        : `apple-mobile-web-app-status-bar-style not black|black-translucent (${sbs || 'missing'})`,
    );
  }
  // Windows tile: match theme-color brand token (install chrome honesty).
  {
    const tile = metaDesc('name', 'msapplication-TileColor');
    const tileOk = /^#0A0A0A$/i.test(tile);
    check(
      'head:ms-tile-color',
      tileOk,
      tileOk
        ? null
        : `msapplication-TileColor not #0A0A0A (${tile || 'missing'})`,
    );
  }
  // Windows tile image: square brand mark same absolute URL as jpeg favicon (sibling of TileColor).
  {
    const tileImg = (metaDesc('name', 'msapplication-TileImage') || '').trim();
    const jpegIcon =
      head.match(
        /<link\b[^>]*rel=["']icon["'][^>]*href=["']([^"']*ges75q\.jpg)["'][^>]*>/i,
      ) ||
      head.match(
        /<link\b[^>]*href=["']([^"']*ges75q\.jpg)["'][^>]*rel=["']icon["'][^>]*>/i,
      );
    const favHref = (jpegIcon && jpegIcon[1]) || '';
    const tileImgOk =
      /ges75q\.jpg/i.test(tileImg) &&
      !!favHref &&
      tileImg === favHref;
    check(
      'head:ms-tile-image',
      tileImgOk,
      tileImgOk
        ? null
        : `msapplication-TileImage must equal jpeg favicon href (${tileImg || 'missing'} vs ${favHref || 'no-favicon'})`,
    );
  }
  // Referrer policy: strip path/query on cross-origin (privacy; lock strict-origin-when-cross-origin).
  {
    const ref = metaDesc('name', 'referrer');
    const refOk = /strict-origin-when-cross-origin/i.test(ref);
    check(
      'head:referrer-policy',
      refOk,
      refOk ? null : `referrer not strict-origin-when-cross-origin (${ref || 'missing'})`,
    );
  }
  // Mobile format-detection: no auto-link phone numbers in chrome (UX honesty).
  {
    const fd = metaDesc('name', 'format-detection');
    const fdOk = /telephone\s*=\s*no/i.test(fd);
    check(
      'head:format-detection',
      fdOk,
      fdOk ? null : `format-detection missing telephone=no (${fd || 'missing'})`,
    );
  }
  // Robots rich-preview honesty (Claude c45): uncapped snippet + video preview + large image preview.
  {
    const robots = metaDesc('name', 'robots');
    const robotsOk =
      /index/i.test(robots) &&
      /follow/i.test(robots) &&
      /max-image-preview:\s*large/i.test(robots) &&
      /max-snippet:\s*-1/i.test(robots) &&
      /max-video-preview:\s*-1/i.test(robots);
    check(
      'head:robots-rich-preview',
      robotsOk,
      robotsOk
        ? null
        : `robots missing index,follow + max-image-preview:large + max-snippet:-1 + max-video-preview:-1 (${robots || 'missing'})`,
    );
  }
  // JPEG favicon sizes honesty: declare real pixel dims (Claude c42 SOF: ges75q.jpg is 1024×1024, not 32×32).
  {
    const jpegIcon =
      head.match(
        /<link\b[^>]*rel=["']icon["'][^>]*href=["'][^"']*ges75q\.jpg["'][^>]*>/i,
      ) ||
      head.match(
        /<link\b[^>]*href=["'][^"']*ges75q\.jpg["'][^>]*rel=["']icon["'][^>]*>/i,
      );
    const tag = (jpegIcon && jpegIcon[0]) || '';
    const sizesM = tag.match(/\bsizes=["']([^"']+)["']/i);
    const typeM = tag.match(/\btype=["']([^"']+)["']/i);
    const sizes = (sizesM && sizesM[1]) || '';
    const type = (typeM && typeM[1]) || '';
    const favOk =
      !!tag &&
      sizes === '1024x1024' &&
      (/^image\/jpe?g$/i.test(type) || /jpe?g/i.test(type));
    check(
      'head:favicon-jpeg-sizes',
      favOk,
      favOk
        ? null
        : `ges75q.jpg icon sizes|type not 1024x1024 image/jpeg (${[sizes || 'no-sizes', type || 'no-type'].join('|')})`,
    );
  }
  // Apple-touch-icon: same absolute URL as jpeg favicon + real 1024×1024 + type=image/jpeg.
  {
    const touch =
      head.match(
        /<link\b[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*ges75q\.jpg)["'][^>]*>/i,
      ) ||
      head.match(
        /<link\b[^>]*href=["']([^"']*ges75q\.jpg)["'][^>]*rel=["']apple-touch-icon["'][^>]*>/i,
      );
    const tag = (touch && touch[0]) || '';
    const touchHref = (touch && touch[1]) || '';
    const sizesM = tag.match(/\bsizes=["']([^"']+)["']/i);
    const typeM = tag.match(/\btype=["']([^"']+)["']/i);
    const sizes = (sizesM && sizesM[1]) || '';
    const type = (typeM && typeM[1]) || '';
    const jpegIcon =
      head.match(
        /<link\b[^>]*rel=["']icon["'][^>]*href=["']([^"']*ges75q\.jpg)["'][^>]*>/i,
      ) ||
      head.match(
        /<link\b[^>]*href=["']([^"']*ges75q\.jpg)["'][^>]*rel=["']icon["'][^>]*>/i,
      );
    const favHref = (jpegIcon && jpegIcon[1]) || '';
    const touchOk =
      !!tag &&
      sizes === '1024x1024' &&
      /^image\/jpe?g$/i.test(type) &&
      !!touchHref &&
      !!favHref &&
      touchHref === favHref;
    check(
      'head:apple-touch-sizes',
      touchOk,
      touchOk
        ? null
        : `apple-touch-icon must match jpeg favicon href + sizes=1024x1024 type=image/jpeg (${[sizes || 'no-sizes', type || 'no-type', touchHref || 'no-href', favHref || 'no-favicon'].join('|')})`,
    );
  }
  // Author meta honesty: brand = Demigod (sibling of brand-meta application-name).
  {
    const author = metaDesc('name', 'author');
    const authorOk = /^Demigod$/i.test(author);
    check(
      'head:author-meta',
      authorOk,
      authorOk ? null : `meta author not Demigod (${author || 'missing'})`,
    );
  }
  // Share document type + locale: homepage is website/en_US (not article/empty locale drift).
  {
    const ogType = metaDesc('property', 'og:type');
    const ogLocale = metaDesc('property', 'og:locale');
    const typeLocaleOk = /^website$/i.test(ogType) && /^en_US$/i.test(ogLocale);
    check(
      'head:og-type-locale',
      typeLocaleOk,
      typeLocaleOk
        ? null
        : `og:type|og:locale not website|en_US (${[ogType || 'missing', ogLocale || 'missing'].join('|')})`,
    );
  }
  // Twitter card type: large image for hero share (dash only checked presence; lock exact value).
  {
    const twCard = metaDesc('name', 'twitter:card');
    const cardOk = /^summary_large_image$/i.test(twCard);
    check(
      'head:twitter-card',
      cardOk,
      cardOk ? null : `twitter:card not summary_large_image (${twCard || 'missing'})`,
    );
  }
  // Brand chrome hex: theme-color must stay exact dark token (not mere presence; sibling of theme-meta).
  {
    const themeColor = metaDesc('name', 'theme-color');
    const hexOk = /^#0A0A0A$/i.test(themeColor);
    check(
      'head:theme-color-hex',
      hexOk,
      hexOk ? null : `theme-color not #0A0A0A (${themeColor || 'missing'})`,
    );
  }
  // color-scheme exact dark (theme-meta only checks /dark/i presence; lock sole value).
  {
    const colorScheme = metaDesc('name', 'color-scheme');
    const csOk = /^dark$/i.test(colorScheme);
    check(
      'head:color-scheme-dark',
      csOk,
      csOk ? null : `color-scheme not exact dark (${colorScheme || 'missing'})`,
    );
  }
  // LCP honesty: hero og:image must be preloaded as image (cold share/LCP path; zero HTML change if present).
  {
    const ogImg = metaDesc('property', 'og:image');
    let preloadOk = false;
    let preloadDetail = 'no og:image';
    if (ogImg) {
      const esc = ogImg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      preloadOk = new RegExp(
        `<link\\b[^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*href=["']${esc}["']|<link\\b[^>]*href=["']${esc}["'][^>]*rel=["']preload["'][^>]*as=["']image["']|<link\\b[^>]*rel=["']preload["'][^>]*href=["']${esc}["'][^>]*as=["']image["']|<link\\b[^>]*as=["']image["'][^>]*rel=["']preload["'][^>]*href=["']${esc}["']`,
        'i',
      ).test(head);
      preloadDetail = preloadOk
        ? null
        : `missing preload as=image for og:image (${ogImg.slice(0, 60)}…)`;
    }
    check('head:hero-lcp-preload', preloadOk, preloadDetail);
  }
  // LCP priority: hero og:image preload must declare fetchpriority=high (sibling of as=image).
  {
    const ogImg = metaDesc('property', 'og:image');
    let fpOk = false;
    let fpDetail = 'no og:image';
    if (ogImg) {
      const esc = ogImg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(
        `<link\\b[^>]*rel=["']preload["'][^>]*href=["']${esc}["'][^>]*>|<link\\b[^>]*href=["']${esc}["'][^>]*rel=["']preload["'][^>]*>`,
        'i',
      );
      const m = head.match(re);
      const tag = (m && m[0]) || '';
      fpOk = !!tag && /fetchpriority=["']high["']/i.test(tag);
      fpDetail = fpOk
        ? null
        : `hero preload missing fetchpriority=high (${tag ? tag.slice(0, 90) : 'no preload tag'})`;
    }
    check('head:hero-lcp-fetchpriority', fpOk, fpDetail);
  }
  // Cold-path DNS/TLS for hero host: preconnect og:image origin (sibling of preconnect-foot-cdn).
  {
    const ogImg = metaDesc('property', 'og:image');
    let preOk = false;
    let preDetail = 'no og:image';
    if (ogImg) {
      try {
        const origin = new URL(ogImg).origin;
        const esc = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        preOk = new RegExp(
          `<link\\b[^>]*rel=["']preconnect["'][^>]*href=["']${esc}["']|<link\\b[^>]*href=["']${esc}["'][^>]*rel=["']preconnect["']`,
          'i',
        ).test(head);
        preDetail = preOk ? null : `missing preconnect for og:image origin ${origin}`;
      } catch (e) {
        preDetail = String(e.message || e).slice(0, 60);
      }
    }
    check('head:preconnect-og-image', preOk, preDetail);
  }
  // Scalable brand mark: SVG favicon with sizes=any (modern UA pick; sibling of jpeg 1024 sizes).
  {
    const svgIcon = /<link\b(?=[^>]*\brel=["']icon["'])(?=[^>]*\btype=["']image\/svg\+xml["'])(?=[^>]*\bsizes=["']any["'])[^>]*>/i.test(
      head,
    );
    check(
      'head:favicon-svg',
      svgIcon,
      svgIcon ? null : 'missing link rel=icon type=image/svg+xml sizes=any',
    );
  }
  // Blog JSON-LD: each BlogPosting needs datePublished + dateModified; count ≥ published blog SoR posts.
  {
    let blogLdDatesOk = false;
    let blogLdDetail = 'no Blog JSON-LD';
    let blogLdSorOk = false;
    let blogLdSorDetail = 'no Blog JSON-LD';
    let blogLdPubOk = false;
    let blogLdPubDetail = 'no Blog publisher';
    let blogLdAuthorOk = false;
    let blogLdAuthorDetail = 'no BlogPosting authors';
    let blogLdLangOk = false;
    let blogLdLangDetail = 'no Blog inLanguage';
    let blogLdMepOk = false;
    let blogLdMepDetail = 'no Blog JSON-LD';
    try {
      const blogPosts = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'demigod-blog-posts.json'), 'utf8'),
      );
      const pub = (blogPosts.posts || []).filter((p) => p && p.published !== false);
      const pubN = pub.length;
      // Full script body (non-greedy \{…\} truncates nested BlogPosting author objects).
      let blogBlock = '';
      for (const m of head.matchAll(
        /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      )) {
        const body = String(m[1] || '').trim();
        if (/"@type"\s*:\s*"Blog"/.test(body) && (/"blogPost"\s*:/.test(body) || /BlogPosting/.test(body))) {
          blogBlock = body;
          break;
        }
      }
      const postN = (blogBlock.match(/"@type"\s*:\s*"BlogPosting"/g) || []).length;
      const dateN = (blogBlock.match(/"datePublished"\s*:\s*"[^"]+"/g) || []).length;
      const modN = (blogBlock.match(/"dateModified"\s*:\s*"[^"]+"/g) || []).length;
      // Exact count: BlogPosting[] must equal published SoR (no draft leaks in LD).
      // Empty catalog: Blog shell with zero BlogPosting is honest.
      blogLdDatesOk =
        postN === pubN && dateN === postN && modN === postN && !!blogBlock;
      blogLdDetail = blogLdDatesOk
        ? null
        : `posts=${postN} dates=${dateN} modified=${modN} publishedSoR=${pubN}`;
      // Field-level SoR lock: headline/description/date/image/url must match blog JSON (SEO honesty).
      try {
        const ld = blogBlock ? JSON.parse(blogBlock) : null;
        const ldPosts = (ld && Array.isArray(ld.blogPost) && ld.blogPost) || [];
        const drafts = (blogPosts.posts || []).filter((p) => p && p.published === false);
        const miss = [];
        for (const p of pub) {
          const slug = p.slug || p.id || '';
          const day = String(p.publishedAt || '').slice(0, 10);
          const hit = ldPosts.find((b) => b && b.url && slug && String(b.url).includes(slug));
          if (!hit) {
            miss.push(`${slug}:missing`);
            continue;
          }
          if (hit.headline !== p.title) miss.push(`${slug}:title`);
          if (hit.description !== p.summary) miss.push(`${slug}:desc`);
          if (p.category && hit.articleSection !== p.category) miss.push(`${slug}:section`);
          if (day && hit.datePublished !== day) miss.push(`${slug}:date`);
          if (p.image && hit.image !== p.image) miss.push(`${slug}:image`);
          if (!String(hit.url || '').includes(`#note-${slug}`)) miss.push(`${slug}:url`);
        }
        for (const d of drafts) {
          const slug = d.slug || d.id || '';
          if (
            slug &&
            ldPosts.some((b) => b && b.url && String(b.url).includes(slug))
          ) {
            miss.push(`${slug}:draft-in-ld`);
          }
        }
        if (ldPosts.length !== pubN) miss.push(`count=${ldPosts.length}!=${pubN}`);
        blogLdSorOk = miss.length === 0 && ldPosts.length === pubN && !!ld;
        blogLdSorDetail = blogLdSorOk ? null : miss.slice(0, 6).join(',') || 'empty';
        // Blog publisher must match Organization name+url + square brand logo (knowledge-graph honesty).
        const publisher =
          ld && ld.publisher && typeof ld.publisher === 'object' ? ld.publisher : null;
        const site = 'https://www.trydemigod.com';
        const pubLogo = publisher && publisher.logo;
        const pubLogoUrl =
          typeof pubLogo === 'string'
            ? pubLogo
            : pubLogo && typeof pubLogo.url === 'string'
              ? pubLogo.url
              : '';
        const pubLogoW = pubLogo && typeof pubLogo === 'object' ? Number(pubLogo.width) : NaN;
        const pubLogoH = pubLogo && typeof pubLogo === 'object' ? Number(pubLogo.height) : NaN;
        const favJpegPub =
          ((head.match(
            /<link\b[^>]*rel=["']icon["'][^>]*href=["']([^"']+\.jpe?g[^"']*)["'][^>]*>/i,
          ) ||
            head.match(
              /<link\b[^>]*href=["']([^"']+\.jpe?g[^"']*)["'][^>]*rel=["']icon["'][^>]*>/i,
            ) ||
            [])[1]) ||
          '';
        const pubLogoSquare =
          !!favJpegPub &&
          pubLogoUrl === favJpegPub &&
          pubLogo &&
          typeof pubLogo === 'object' &&
          pubLogo['@type'] === 'ImageObject' &&
          Number.isFinite(pubLogoW) &&
          Number.isFinite(pubLogoH) &&
          pubLogoW > 0 &&
          pubLogoW === pubLogoH;
        blogLdPubOk = !!(
          publisher &&
          publisher['@type'] === 'Organization' &&
          publisher.name === 'Demigod' &&
          (publisher.url === site || publisher.url === site + '/') &&
          pubLogoSquare
        );
        blogLdPubDetail = blogLdPubOk
          ? null
          : `publisher=${publisher ? JSON.stringify(publisher).slice(0, 120) : 'missing'}`;
        // Each BlogPosting author must be Organization Demigod (sibling of publisher).
        const badAuthors = [];
        for (const bp of ldPosts) {
          const a = bp && bp.author && typeof bp.author === 'object' ? bp.author : null;
          if (!a || a['@type'] !== 'Organization' || a.name !== 'Demigod') {
            const slug =
              (bp && bp.url && String(bp.url).match(/#note-([^#/?]+)/)) || null;
            badAuthors.push(slug ? slug[1] : 'unknown');
          }
        }
        blogLdAuthorOk =
          ldPosts.length === pubN && badAuthors.length === 0;
        blogLdAuthorDetail = blogLdAuthorOk
          ? null
          : badAuthors.length
            ? `badAuthor=${badAuthors.slice(0, 4).join(',')}`
            : 'no posts';
        // Blog + each BlogPosting must declare inLanguage=en (locale honesty).
        const badLang = [];
        if (!ld || ld.inLanguage !== 'en') badLang.push('Blog');
        for (const bp of ldPosts) {
          if (!bp || bp.inLanguage !== 'en') {
            const slug =
              (bp && bp.url && String(bp.url).match(/#note-([^#/?]+)/)) || null;
            badLang.push(slug ? slug[1] : 'post');
          }
        }
        blogLdLangOk = ldPosts.length === pubN && badLang.length === 0;
        blogLdLangDetail = blogLdLangOk
          ? null
          : `badLang=${badLang.slice(0, 4).join(',')}`;
        // c248: each BlogPosting mainEntityOfPage = WebPage @id with #note-{slug} (share/SEO deep-link honesty).
        const mepMiss = [];
        for (const p of pub) {
          const slug = p.slug || p.id || '';
          const hit = ldPosts.find((b) => b && b.url && slug && String(b.url).includes(slug));
          if (!hit) {
            mepMiss.push(`${slug}:missing`);
            continue;
          }
          const mep = hit.mainEntityOfPage;
          const mepId =
            typeof mep === 'string'
              ? mep
              : mep && typeof mep === 'object'
                ? String(mep['@id'] || mep.id || '')
                : '';
          const mepTypeOk =
            typeof mep === 'string' ||
            (mep && typeof mep === 'object' && mep['@type'] === 'WebPage');
          if (!mepTypeOk || !mepId.includes(`#note-${slug}`)) {
            mepMiss.push(slug || 'unknown');
          }
        }
        blogLdMepOk = mepMiss.length === 0 && ldPosts.length === pubN;
        blogLdMepDetail = blogLdMepOk ? null : mepMiss.slice(0, 6).join(',') || 'empty';
      } catch (e2) {
        blogLdSorOk = false;
        blogLdSorDetail = String(e2.message || e2).slice(0, 80);
        blogLdPubOk = false;
        blogLdPubDetail = blogLdSorDetail;
        blogLdAuthorOk = false;
        blogLdAuthorDetail = blogLdSorDetail;
        blogLdLangOk = false;
        blogLdLangDetail = blogLdSorDetail;
        blogLdMepOk = false;
        blogLdMepDetail = blogLdSorDetail;
      }
    } catch (e) {
      blogLdDetail = String(e.message || e).slice(0, 80);
      blogLdSorDetail = blogLdDetail;
      blogLdPubDetail = blogLdDetail;
      blogLdAuthorDetail = blogLdDetail;
      blogLdLangDetail = blogLdDetail;
      blogLdMepDetail = blogLdDetail;
    }
    check('head:blog-ld-dates', blogLdDatesOk, blogLdDetail);
    check('head:blog-ld-sor', blogLdSorOk, blogLdSorDetail);
    check('head:blog-ld-publisher', blogLdPubOk, blogLdPubDetail);
    check('head:blog-ld-author', blogLdAuthorOk, blogLdAuthorDetail);
    check('head:blog-ld-lang', blogLdLangOk, blogLdLangDetail);
    check('head:blog-ld-mep', blogLdMepOk, blogLdMepDetail);
  }
}
check('head:css-only-no-core-js', !head.includes('demigod-core') && !head.includes('FORMS_MODE'));
check('head:hides-webflow-badge-css', /\.w-webflow-badge[^}]*display:\s*none/i.test(headCss || head));
check('head:hero-fouc-guard', (headCss || head).includes('title-accent-gold'));
check(
  'hero:permanent-demigod-h1',
  /hero\.textContent=['"]DEMIGOD['"]/.test(head) &&
    /function\s+paintHeroBrandH1\s*\(/.test(coreJs || foot) &&
    /data-dg-hero-phase['"],\s*['"]brand['"]/.test(coreJs || foot) &&
    /paintCyberWord\(el,\s*['"]Demigod['"]\)/.test(coreJs || foot) &&
    !/paintDualPathH1|__dgHeroHoldMs|__dgHeroFadeMs|Find talent\.<br>/.test(coreJs || foot),
  'hero H1 must stay DEMIGOD permanently; dual-path copy belongs only in CTAs',
);
// Disk CSS honesty layers (v259/v316/v421/v449). Live catbox CSS often lags —
// this locks disk SoR only; intentional CSS ship is separate (no thrash CDN).
{
  const css = headCss || '';
  const hasReadiness =
    /v421\s+readiness\s+guard/i.test(css) && /body:not\(\.dg-ready\)/.test(css);
  const hasHonesty =
    /v449\s+head-only\s+honesty\s+guard/i.test(css) && /body\.dg-head-fallback/.test(css);
  const hasNoRetiredRouteCss = !/\.dg-(?:decision-grid|p-grid|p-hi)\b/.test(css);
  const hasNoInfiniteGlow =
    /v316:\s*no infinite CTA glow/i.test(css) &&
    !/\.premium-btn[^{]*\{[^}]*animation:\s*dg-gold-glow[^;]*infinite/i.test(css);
  // The hero artwork renders separately; do not fetch a duplicate CSS background.
  const hasHeroBrand =
    !/files\.catbox\.moe\/126k4p\.jpg/.test(css) && !/demigod-hermes-hero-16x9/i.test(css);
  const hasNoBroadSectionHide =
    !/main\s*>\s*section:not\([^}]*display\s*:\s*none\s*!important/i.test(css) &&
    !/body\s*>\s*section:not\([^}]*display\s*:\s*none\s*!important/i.test(css);
  const cssHonestyOk =
    hasReadiness && hasHonesty && hasNoRetiredRouteCss && hasNoInfiniteGlow && hasHeroBrand && hasNoBroadSectionHide;
  check(
    'css:disk-honesty-guards',
    cssHonestyOk,
    cssHonestyOk
      ? null
      : `missing disk CSS guards readiness=${hasReadiness} honesty=${hasHonesty} noRetiredRouteCss=${hasNoRetiredRouteCss} noInfiniteGlow=${hasNoInfiniteGlow} heroBrand=${hasHeroBrand} noBroadSectionHide=${hasNoBroadSectionHide}`,
  );
}
check(
  'head:no-obsolete-ix-unhide',
  !/dg-(?:unhide-critical|unhide-main|graceful-unhide|early-unhide)|__dgUnhideV5|unhide-v5-safe|w-mod-ix3/.test(head),
  'head must not restore the retired Webflow IX visibility workaround',
);
check(
  'core:no-obsolete-ix-unhide',
  !/function\s+forceMainVisible|forceMainVisible\(\)|classList\.add\(['"]w-mod-ix3/.test(coreJs || foot),
  'foot must not restore the retired Webflow IX visibility workaround',
);
check(
  'head:path-redirects',
  /id=["']dg-path-redirects["']/.test(head) && /\/fees/.test(head) && /p=pricing/.test(head) && /\/security/.test(head) && /p=legal/.test(head) && /\/p\//.test(head) && /\/apply/.test(head),
  /id=["']dg-path-redirects["']/.test(head)
    ? null
    : 'head must include #dg-path-redirects for /fees→pricing /security→legal /p/* /apply (firecrawl 404 P0)',
);
check(
  'head:skip-main-target',
  /querySelector\(['"]main['"]\)\s*\|\|\s*document\.querySelector\(['"]\.hero-section['"]\)/.test(head) &&
    /tagName\s*!==\s*['"]MAIN['"][\s\S]{0,100}setAttribute\(['"]role['"],['"]main['"]\)/.test(head),
  'early skip link must create #main and a main landmark from the existing hero when Webflow has no <main>',
);
// Contact scrub: hello@ → potter@ (static meta alone is not enough if Designer HTML drifts).
// Finite only: once:true DOMContentLoaded + setTimeouts; ban setInterval thrash.
// Meta keep-last: Webflow page-settings may emit stale description/og/twitter before our
// canonical tags; scrub must drop all-but-last matching element (Claude c152).
{
  const scrub = (head.match(/<script\b[^>]*id=["']dg-contact-scrub["'][^>]*>[\s\S]*?<\/script>/i) || [])[0] || '';
  // Match scrub *source* (BAD hello@ + GOOD potter@ + mailto walk), not runtime email.
  const contactOk =
    !!scrub &&
    /hello@/.test(scrub) &&
    /potter@trydemigod\.com/.test(scrub) &&
    /mailto:/.test(scrub) &&
    /data-props-link/.test(scrub) &&
    /once\s*:\s*true/.test(scrub) &&
    !/setInterval/.test(scrub);
  // c207: keep-last url + image:alt · c235: og:site_name + og:locale (Webflow page-settings race).
  const metaDedupeOk =
    !!scrub &&
    /meta\[name=description\]/.test(scrub) &&
    /og:title/.test(scrub) &&
    /og:description/.test(scrub) &&
    /og:type/.test(scrub) &&
    /og:url/.test(scrub) &&
    /og:image/.test(scrub) &&
    /og:image:alt/.test(scrub) &&
    /og:site_name/.test(scrub) &&
    /og:locale/.test(scrub) &&
    /twitter:card/.test(scrub) &&
    /twitter:title/.test(scrub) &&
    /twitter:description/.test(scrub) &&
    /twitter:url/.test(scrub) &&
    /twitter:image/.test(scrub) &&
    /twitter:image:alt/.test(scrub) &&
    /els\.length\s*-\s*1/.test(scrub) &&
    /\.remove\s*\(/.test(scrub) &&
    /setTimeout\s*\(\s*scrub\s*,\s*50\s*\)/.test(scrub) &&
    /setTimeout\s*\(\s*scrub\s*,\s*400\s*\)/.test(scrub) &&
    /setTimeout\s*\(\s*scrub\s*,\s*1200\s*\)/.test(scrub);
  check(
    'head:contact-scrub',
    contactOk,
    contactOk
      ? null
      : !scrub
        ? 'missing #dg-contact-scrub script'
        : /setInterval/.test(scrub)
          ? 'contact scrub must not use setInterval (use finite setTimeouts)'
          : !/once\s*:\s*true/.test(scrub)
            ? 'contact scrub missing DOMContentLoaded {once:true}'
            : !/data-props-link/.test(scrub)
              ? 'contact scrub must rewrite data-props-link (Webflow Designer mailto JSON)'
              : 'contact scrub must rewrite hello@ → potter@trydemigod.com (incl. mailto)',
  );
  check(
    'head:meta-dedupe',
    metaDedupeOk,
    metaDedupeOk
      ? null
      : !scrub
        ? 'missing #dg-contact-scrub (meta keep-last lives there)'
        : 'contact scrub must keep-last description/og/twitter title+desc+url+image+image:alt+site_name+locale + finite 50/400/1200ms re-scrub (Webflow page-settings race)',
  );
}
// Early copy scrub must stay finite — no eternal TreeWalker interval.
{
  const copy = (head.match(/<script\b[^>]*id=["']dg-early-copy-scrub["'][^>]*>[\s\S]*?<\/script>/i) || [])[0] || '';
  const copyOk =
    !!copy &&
    /setInterval/.test(copy) &&
    /clearInterval/.test(copy) &&
    /\+\+n\s*>=\s*\d+|n\s*\+\+\s*>=\s*\d+|n\s*>=\s*\d+/.test(copy);
  check(
    'head:copy-scrub-finite',
    copyOk,
    copyOk
      ? null
      : !copy
        ? 'missing #dg-early-copy-scrub script'
        : 'early copy scrub missing clearInterval / finite n>= bound (interval thrash risk)',
  );
}
// Head CTA fail-open when foot CDN never marks dg-ready (bounded; labels dual path).
// Labels must MATCH foot-core's canonical COPY.ctaFounder/ctaEngineer — derived here, NOT hardcoded.
// This gate previously required the literal 'Demigod' to appear in the head; the brand name/meta/
// wordmark always satisfy that, so it never verified the actual CTA label and passed straight through
// the head-vs-foot 'Demigod' regression. Cross-check the real labels so drift in EITHER file fails.
{
  const footCoreSrc = coreJs || fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  // \s* before the colon too: a valid reformat (`ctaFounder : "..."`) must not false-red this gate.
  const ctaFounder = (footCoreSrc.match(/ctaFounder\s*:\s*(["'])(.*?)\1/) || [])[2];
  const ctaEngineer = (footCoreSrc.match(/ctaEngineer\s*:\s*(["'])(.*?)\1/) || [])[2];
  const ctaOk =
    /dg-head-fallback/.test(head) &&
    /data-dg-cta/.test(head) &&
    /['"]hire['"]/.test(head) &&
    /['"]talent['"]/.test(head) &&
    /setTimeout\s*\(/.test(head) &&
    !!ctaFounder &&
    head.includes(ctaFounder) &&
    !!ctaEngineer &&
    head.includes(ctaEngineer);
  check(
    'head:cta-fallback',
    ctaOk,
    ctaOk
      ? null
      : `head CTA fail-open must set dg-head-fallback + data-dg-cta hire/talent + bounded setTimeout + foot COPY labels (ctaFounder=${ctaFounder || '?'}, ctaEngineer=${ctaEngineer || '?'})`,
  );
}
check(
  'head:path-pills-not-force-hidden',
  !/(?:^|,)\s*#dg-path-pills(?:\s*,|\s*\{)[^{]*\{[^}]*display\s*:\s*none\s*!important/im.test(headCss),
);
// Foot CDN loader origin must be preconnected (cold DNS+TLS on primary foot script — Claude c38).
{
  const srcM =
    foot.match(
      /<script\b(?=[^>]*\bid=["']demigod-foot-cdn-loader["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*>/i,
    ) ||
    foot.match(
      /<script\b(?=[^>]*\bsrc=["']([^"']+)["'])(?=[^>]*\bid=["']demigod-foot-cdn-loader["'])[^>]*>/i,
    );
  let preOk = false;
  let preDetail = 'no demigod-foot-cdn-loader src in footer-lite';
  if (srcM && srcM[1]) {
    try {
      const origin = new URL(srcM[1]).origin;
      const esc = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      preOk = new RegExp(
        `<link\\b[^>]*rel=["']preconnect["'][^>]*href=["']${esc}["']|<link\\b[^>]*href=["']${esc}["'][^>]*rel=["']preconnect["']`,
        'i',
      ).test(head);
      preDetail = preOk ? null : `missing preconnect for foot CDN ${origin}`;
    } catch (e) {
      preDetail = String(e.message || e).slice(0, 60);
    }
  }
  check('head:preconnect-foot-cdn', preOk, preDetail);
}
check('head:cdn-stylesheet', cdnHeadCss || head.includes('<style'));
// Parse every inline <script> in the head exactly as a browser would (vm.Script).
// Closes the blind spot that shipped a SyntaxError'd unhide script (page stays hidden).
{
  const scriptBlocks = [...head.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)];
  let headScriptsOk = true;
  let badDetail = '';
  for (const m of scriptBlocks) {
    const attrs = m[1] || '';
    const s = m[2] || '';
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    try { new vm.Script(s); } catch (e) { headScriptsOk = false; badDetail = String(e.message).slice(0, 120); break; }
  }
  check('head:inline-scripts-parse', headScriptsOk, badDetail);
}

// Parse foot-core itself (vm.Script = compile-only, like `node --check`; browser globals never run).
// The head got a parse gate after a SyntaxError'd unhide script shipped; foot-core -- the file agents
// edit most, ~40 bumps/day -- had none. Every other core: check greps SUBSTRINGS of coreJs, so a
// SyntaxError that leaves those substrings intact passes them all: the exact v150 failure, "grep gates
// green on a file that does not parse". The ship path catches it (ship-status disk_syntax), but the
// mandated post-edit source checks did NOT -- an agent editing
// foot-core saw three green gates on a broken file until the ship failed. Verified before adding:
// vm.Script parses the real foot-core, throws on broken syntax, no top-level import/export to false-fail.
if (cdnFoot && coreJs) {
  let coreParses = true;
  let coreDetail = '';
  try { new vm.Script(coreJs); } catch (e) { coreParses = false; coreDetail = 'foot-core SyntaxError: ' + String(e.message).slice(0, 120); }
  check('core:parses', coreParses, coreDetail);
}

if (cdnFoot) {
  // Attribute order is not semantically significant. The canonical loader
  // carries an id before src so ship tooling can recognize hashed fallbacks.
  // Anchor on the loader id so this asserts the CANONICAL loader has a valid https src,
  // not merely that some CDN <script> exists (e.g. a /hire page script). Lookaheads are
  // attribute-order-independent; the id itself is load-bearing for cm6 paste-publish.
  check('footer:cdn-loader', /<script\b(?=[^>]*\bid=["']demigod-foot-cdn-loader["'])(?=[^>]*\bsrc=["']https?:\/\/[^"']+["'])[^>]*><\/script>/i.test(foot));
  check('footer:cdn-url', foot.includes('catbox.moe') || foot.includes('cdn.jsdelivr.net') || foot.includes('website-files.com'));
  // Parse footer-lite's own inline scripts (vm.Script, compile-only). This file IS the footer custom
  // code pasted into Webflow -- a THIRD executable surface after the head and foot-core, both of which
  // are now parse-gated. Its inline redirect map (/events -> ?p=events etc.) is generated, so a
  // generator bug producing invalid JS would break the footer paste with the same "SyntaxError'd
  // script ships, page misbehaves" signature the head gate was added for. footer:boot-smoke despite
  // its name smokes foot-core, not this. `foot` holds footer-lite. src-only loader tags are skipped.
  {
    const fScripts = [...foot.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)];
    let footScriptsOk = true;
    let fBad = '';
    for (const m of fScripts) {
      if (/type\s*=\s*["']application\/(ld\+json|json)["']/i.test(m[1] || '')) continue;
      const s = m[2] || '';
      if (!s.trim()) continue;
      try { new vm.Script(s); } catch (e) { footScriptsOk = false; fBad = 'footer-lite SyntaxError: ' + String(e.message).slice(0, 110); break; }
    }
    check('footer:inline-scripts-parse', footScriptsOk, fBad);
  }
  // Nested path redirects + note deep-links (v28). Thrash often drops to v27 without these.
  // c201: /fees→?p=pricing + /security→?p=legal (canonical mini-pages; works even if live foot lags id aliases).
  // c247: /network→?p=talent (same pattern — bare network id is only an alias; no DG_PAGES.network).
  check(
    'footer:path-redirects',
    (/blog\|notes/.test(foot) || /\/\(blog\|notes\)/.test(foot)) &&
      /method[^\n]{0,80}p=how/.test(foot) &&
      /#note-/.test(foot) &&
      /\\\/fees/.test(foot) &&
      /fees[\s\S]{0,80}p=pricing|fees[^\n]{0,60}pricing/.test(foot) &&
      /\\\/security/.test(foot) &&
      /security[\s\S]{0,80}p=legal|security[^\n]{0,60}legal/.test(foot) &&
      /\\\/network/.test(foot) &&
      /network[\s\S]{0,80}p=talent|network[^\n]{0,60}talent/.test(foot) &&
      !/p=network/.test(foot),
    'need blog|notes + /method→how + #note-slug + /fees→pricing + /security→legal + /network→talent',
  );
  {
    const aliasesOk = (html) =>
      /method[^\n]{0,80}p=how/.test(html) &&
      /founders[^\n]{0,80}p=hire/.test(html) &&
      /candidates\|engineers[^\n]{0,80}p=talent/.test(html) &&
      /compare[^\n]{0,80}p=pricing/.test(html) &&
      /status[^\n]{0,80}p=about/.test(html) &&
      !/p=(?:method|founders|candidates|compare|status)\b/.test(html);
    check(
      'footer:route-alias-consolidation',
      aliasesOk(foot) && aliasesOk(footLoader),
      'legacy footer routes must preserve inbound URLs without regenerating retired page ids',
    );
  }
  // c228: /sample → ?p=sample now that DG_PAGES.sample exists (Claude v505). Early footer
  // redirect works even when live foot lags path-map; pairs with core:sample-page honesty.
  check(
    'footer:sample-path',
    // Accept escaped JS form (\/sample) or plain /sample in source thrash variants
    (/\/sample/.test(foot) || /\\\/sample/.test(foot)) && /p=sample/.test(foot),
    'footer-lite must redirect /sample → ?p=sample (pairs with core DG_PAGES.sample)',
  );
  // Pilot was phase scaffolding, not a distinct product. Preserve old inbound URLs as a hire alias
  // while keeping the retired page, footer link, canonical, and structured-data entry deleted.
  {
    const pilotToHire = (s) =>
      !!(s && (/\/pilot/.test(s) || /\\\/pilot/.test(s)) && /p=hire/.test(s) && !/p=pilot/.test(s));
    check(
      'pilot:retired-alias',
      pilotToHire(foot) &&
        pilotToHire(footLoader) &&
        /['"]\/pilot['"]\s*:\s*['"]hire['"]/.test(coreJs) &&
        /if\s*\(id\)\s*id\s*=\s*DG_PAGE_PATHS\[['"]\/['"]\s*\+\s*id\]\s*\|\|\s*id/.test(coreJs) &&
        !/pilot:\s*\{/.test(coreJs) &&
        !/data-dg-page=['"]pilot['"]|>\s*Pilot\s*</.test(coreJs) &&
        /['"]\/pilot['"]\s*:\s*['"]\/\?p=hire['"]/.test(head) &&
        /var aliases=\{pilot:['"]hire['"]/.test(head) &&
        !/\bp=pilot\b|["']name["']\s*:\s*["']Pilot["']/.test(head),
      'legacy /pilot and ?p=pilot must resolve to hire; the public Pilot page/link/metadata stay retired',
    );
  }
  if (coreJs) {
    // All FOUR version markers must agree (mid-bump thrash left banner≠__dgFootVer).
    // The boot console.log is the 4th — it is what a human/agent reads in the browser console to
    // confirm which version is live, and it was the one the gate did not check, so it was the one
    // that drifted (file at v651 while the console announced v647). Nothing auto-bumps these; the
    // gate is what makes a bumper remember them, so it has to name every marker.
    {
      const banner = (coreJs.match(/dg-foot-v(\d+)-core/) || [])[1] || null;
      const internal = (coreJs.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] || null;
      const publicV = (coreJs.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1] || null;
      const booted = (coreJs.match(/foot v(\d+)-core loaded/) || [])[1] || null;
      const all = [banner, internal, publicV, booted];
      const agree = all.every((v) => v && v === banner);
      check(
        'core:version-marker',
        agree,
        agree
          ? `v${internal}`
          : `split banner=${banner || '?'} internal=${internal || '?'} public=${publicV || '?'} booted=${booted || '?'}`,
      );
    }
    for (const fn of ['run', 'show', 'hide', 'sched', 'boot']) {
      const called = new RegExp(`[^\\w.]${fn}\\(`).test(coreJs);
      check(`coreJs:${fn}-defined-if-called`, !called || coreJs.includes(`function ${fn}(`));
    }
    check('core:run-show', /function run\s*\(/.test(coreJs) && /function show\s*\(/.test(coreJs));
    check('core:no-fake-sms', !/555-DEMO/.test(coreJs));
    check('core:forms-fee-note', coreJs.includes('dg-fee-note') && coreJs.includes('function forms'));
    check(
      'core:unique-submit-trust',
      /p\.className=['"]dg-submit-trust['"]/.test(coreJs) &&
        /f\.querySelector\(['"]\.dg-submit-trust['"]\)/.test(coreJs) &&
        !/id=['"]dg-submit-trust['"]|p\.id=['"]dg-submit-trust['"]/.test(coreJs),
      'both wizard trust notes must share a class, never a duplicated document id',
    );
    // Claude c167/c169: lead-capture autofill — company + contact-email + engineer name/email/url
    check(
      'core:form-autocomplete',
      /name="company-name"[^>]*autocomplete="organization"/.test(coreJs) &&
        /setAttribute\(\s*['"]autocomplete['"]\s*,\s*['"]email['"]\s*\)/.test(coreJs) &&
        /setAttribute\(\s*['"]autocomplete['"]\s*,\s*n===\s*['"]full-name['"]\s*\?\s*['"]name['"]\s*:\s*['"]email['"]\s*\)/.test(coreJs) &&
        /setAttribute\(\s*['"]autocomplete['"]\s*,\s*['"]url['"]\s*\)/.test(coreJs),
    );
    // v825: an explicit wizard Close closes; the existing same-tab draft preserves progress.
    check(
      'core:no-exit-interstitial',
      !/\bofferAbandon\b|dg-abandon|Follow-up request/.test(coreJs) &&
        /sessionStorage\.setItem\(SAVE_KEY/.test(coreJs) &&
        /sessionStorage\.removeItem\(SAVE_KEY\)/.test(coreJs),
      'wizard Close must not open a follow-up interstitial; same-tab draft resume stays intact',
    );
    // Path and ?p= aliases share one route map so an alias cannot work in only one entry path.
    check(
      'core:route-fees-security',
      /['"]\/fees['"]\s*:\s*['"]pricing['"]/.test(coreJs) &&
        /['"]\/security['"]\s*:\s*['"]legal['"]/.test(coreJs) &&
        /if\s*\(id\)\s*id\s*=\s*DG_PAGE_PATHS\[['"]\/['"]\s*\+\s*id\]\s*\|\|\s*id/.test(coreJs),
    );
    {
      const pagesBlock = (coreJs.match(/var DG_PAGES\s*=\s*\{([\s\S]*?)\n\};\nfunction pageCss/) || [])[1] || '';
      const retired = ['method', 'founders', 'candidates', 'compare', 'status', 'partners'];
      const retained = ['how', 'hire', 'talent', 'pricing', 'about', 'contact', 'refer', 'events', 'sample'];
      const aliases = {
        method: 'how',
        founders: 'hire',
        candidates: 'talent',
        engineers: 'talent',
        compare: 'pricing',
        status: 'about',
        partners: 'refer',
        partnerships: 'refer',
        partnership: 'refer',
      };
      const hasPage = (id) => new RegExp(`\\n\\s*${id}:\\s*\\{`).test(`\n${pagesBlock}`);
      const aliasesOk = Object.entries(aliases).every(([from, to]) =>
        new RegExp(`['"]/${from}['"]\\s*:\\s*['"]${to}['"]`).test(coreJs));
      check(
        'core:route-alias-consolidation',
        retired.every((id) => !hasPage(id)) &&
          retained.every(hasPage) &&
          aliasesOk &&
          !/dg-(?:decision-grid|p-grid|p-hi)|__DG_FOOT_VER__/.test(coreJs),
        'duplicate pages and their dead presentation code must stay deleted while legacy aliases target canonical pages',
      );
    }
    {
      const pageHtml = (coreJs.match(/function dgMapEventsHtml\(kind\)\{[\s\S]*?\n\}\n\nvar DG_PAGES/) || [''])[0];
      const community = (coreJs.match(/function communitySubmissionsMount\(root\) \{[\s\S]*?\n\}\n\n\/\* v606/) || [''])[0];
      check(
        'core:community-manage-on-demand',
        (pageHtml.match(/<details hidden><summary>Manage my (?:event|startup) submissions/g) || []).length === 2 &&
          !/No (?:event|startup) submissions saved|Submit and manage/.test(pageHtml) &&
          /var pageKind = \(listingsBox && listingsBox\.getAttribute\('data-kind'\)\) \|\| 'both';/.test(community) &&
          /var rows = credentials\(\)\.filter/.test(community) &&
          /pageKind === 'events' && startup/.test(community) &&
          /pageKind === 'startups' && !startup/.test(community) &&
          /if \(!rows\.length\) return;\s*manage\.parentElement\.hidden = false;/.test(community) &&
          /if \(memory\) return memory;/.test(community) &&
          /rows\.push\(row\); memory = rows\.slice\(-20\);/.test(community) &&
          /if \(remember\(\{ id: imported\[0\], manageToken: imported\[1\] \}\)\) history\.replaceState/.test(community) &&
          !/return Promise\.resolve\(null\)/.test(community),
        'submission management stays hidden until relevant, and blocked storage cannot destroy its private credential',
      );
    }
    // Claude v505 + c228: Sample matches mini-page (honest labels) so /sample + ?p=sample work.
    // Ban sample→notfound id kill; footer:sample-path covers bare /sample early redirect.
    check(
      'core:sample-page',
      /sample:\s*\{[\s\S]{0,500}?title:\s*['"]Sample matches['"]/.test(coreJs) &&
        /sample:\s*\{[\s\S]{0,800}?no fake placements/i.test(coreJs) &&
        /labeled samples/i.test(coreJs) &&
        !/id\s*===\s*['"]sample['"]\s*\)\s*id\s*=\s*['"]notfound['"]/.test(coreJs),
      'DG_PAGES.sample honesty required (Sample matches + no fake placements); ban sample→notfound',
    );
    {
      const sampleBlock = (coreJs.match(/\n  sample: \{[\s\S]*?\n  event: \{/) || [''])[0];
      check(
        'core:sample-one-match-one-pass',
        /A useful match/.test(sampleBlock) &&
          /A useful pass/.test(sampleBlock) &&
          !/Founder view|Talent view/.test(sampleBlock) &&
          (sampleBlock.match(/<ul class="dg-p-list">/g) || []).length === 2,
        'sample must show one useful match and one useful pass without mirrored audience blocks',
      );
    }
    check(
      'core:no-zero-behavior-page-branches',
      !/var\s+KEEP\s*=\s*\/\^\(\?:\)\$\//.test(coreJs) &&
        !/id === 'contact' \|\| id === 'legal' \|\| id === 'partners'/.test(coreJs) &&
        !/\bDG_ART\b|\bDG_STARTUP_MAP_ASSET\b/.test(coreJs) &&
        !/host\.appendChild\(w\);\s*return a;/.test(coreJs),
      'remove impossible or unread page branches, one-reader constants, and the ignored mk return',
    );
    check(
      'core:home-proof-links',
      // hard routes (/sample /map) preferred; soft /?p= still accepted for thrash variants
      /href=["']\/(?:\?p=)?sample["'][^>]*data-dg-page=["']sample["']/.test(coreJs) &&
        // /startups is the real Webflow shell for the directory (map page id)
        /href=["']\/(?:\?p=map|map|startups)["'][^>]*data-dg-page=["']map["']/.test(coreJs) &&
        /else if\s*\(\/THE PROCESS\|HUMAN-MATCHED STARTUP\|PRICING\|ONE SIMPLE MODEL\/i\.test\(sniff\)\)\s*\{[\s\S]{0,160}?s\.style\.setProperty\(['"]display['"],['"]block['"],['"]important['"]\)/.test(
          coreJs,
        ) &&
        /\.roles-header,\.roles-grid,\[data-dg-hidden=roles-simplify\]\{display:none!important\}/.test(
          coreJs,
        ) &&
        !/injectBlogHome|dg-blog-home|dg-aperture/.test(coreJs),
      'home must reveal only scrubbed process/pricing, hide sample-role/blog/decorative sections, and expose sample + SF directory',
    );
    // Soft-404 page for unknown paths (not /sample — that redirects via footer-lite).
    check(
      'core:notfound-page',
      /notfound:\s*\{[\s\S]{0,240}?title:\s*['"]Page not found['"]/.test(coreJs) &&
        /Not found · Demigod/.test(coreJs),
      'DG_PAGES.notfound soft-404 page required (title + doc)',
    );
    check(
      'core:compact-footer',
      ((coreJs.match(/class=["']dg-footer-group["']/g) || []).length === 2) &&
        /data-dg-page=["']how["'][\s\S]{0,400}?data-dg-page=["']pricing["'][\s\S]{0,400}?data-dg-page=["']faq["']/.test(coreJs) &&
        /data-dg-page=["']about["'][\s\S]{0,400}?data-dg-page=["']press["'][\s\S]{0,400}?data-dg-page=["']legal["']/.test(coreJs) &&
        /href=["']mailto:potter@trydemigod\.com["']/.test(coreJs) &&
        !/dg-footer-intro|demigod-footer-tag|footer-email/.test(coreJs),
      'footer keeps two conversion actions and two short nav groups without the retired intro/id chrome',
    );
    check(
      'core:mobile-footer-action-dedupe',
      /@media\(max-width:767px\)\{\.dg-footer-actions,\.hero-actions,\.hero-actions\.dg-path-pair\{display:none!important\}/.test(coreJs),
      'mobile fixed action bar owns conversion; hide the duplicate footer pair below 768px',
    );
    const faqBlock = (coreJs.match(/\n  faq: \{[\s\S]*?\n  private: \{/) || [''])[0];
    check(
      'core:faq-lean',
      (faqBlock.match(/<details\b/g) || []).length === 6 &&
        /How much does it cost\?[\s\S]*?Is my profile private\?[\s\S]*?What happens after I send a brief\?[\s\S]*?Does AI decide who gets matched\?[\s\S]*?Who do you work with\?[\s\S]*?What if a match is not right\?/.test(faqBlock),
      'FAQ must match the six ordered v903 decision questions; dedicated pages own repeated process and form copy',
    );
    check('core:no-fake-sms-trust', !/Text \+1 \(415\) 555-DEMO/.test(coreJs));
    check('core:no-fake-sms-hero', !/heroSub:.*555-DEMO/.test(coreJs));
    check('core:wizBuild-defined', /function\s+wizBuild\s*\(/.test(coreJs) || /const\s+wizBuild\s*=|let\s+wizBuild\s*=/.test(coreJs));
    check('core:wizBuild-called', (coreJs.match(/wizBuild\s*\(/g) || []).length >= 1);
    // ungameable: key fns must be defined if called (catches run/show/trust/renderBoard etc. bare calls)
    const fnsToCheck = ['wizBuild','run','show','trust','renderBoard','enhanceWIZ'];
    const calledFns = [...coreJs.matchAll(/\b(wizBuild|run|show|trust|renderBoard|enhanceWIZ)\s*\(/g)].map(m=>m[1]);
    for (const fn of new Set(calledFns)) {
      if (fnsToCheck.includes(fn)) {
        const def = new RegExp(`function\\s+${fn}\\s*\\(|(?:const|let|var)\\s+${fn}\\s*=`).test(coreJs);
        check(`core:${fn}-defined-if-called`, def);
      }
    }
    // Fable-hardened call-graph + WIZ data checks (prevents gaming + ensures 90day/forms perfection)
    const defined = new Set([...coreJs.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
    const OK = new Set(['if','for','while','switch','catch','return','function','typeof','fetch','setTimeout','clearTimeout','String','Array','Object','JSON','Math','Date','RegExp','Promise','Error','parseInt','MutationObserver','IntersectionObserver','NodeFilter','getComputedStyle','matchMedia','Set','Map','isNaN','Boolean','Number','console','document','window','qa','q','esc','ph','formEl','rmF','lbl','addMotion','scrubTimeClaims','scrubStaticLabels','dedupeAll','fetchBoard','successCta','charCount','submitTrust','wizVal','wizWrap','wizCss','paint','review']);
    const undef = [...new Set([...coreJs.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]))].filter(n => !OK.has(n) && !defined.has(n) && !new RegExp(`(?:var|let|const)\\s+${n}\\s*=`).test(coreJs) && !/^(get|set|has|add|delete|clear|size|then|catch|forEach|map|filter|reduce|slice|trim|test|includes|replace|split|join|push|pop|shift|unshift)$/.test(n));
    const serious = undef.filter(u => /(wiz|run|show|forms|trust|dedupe|enhance|boot|sched)/i.test(u));
    check('coreJs:all-calls-defined', true, 'info-only; candidates:' + serious.slice(0,3).join(','));
    check('core:90day-in-wiz', /90day-outcome/.test(coreJs) && /WIZ_CFG.*startup/.test(coreJs));
    check('core:90day-required-inject', /name="90day-outcome"[^>]*required|90day-outcome.*required/.test(coreJs));
    const sessionDraftPrivacy =
      /sessionStorage\.setItem\(SAVE_KEY/.test(coreJs) &&
      /sessionStorage\.getItem\(SAVE_KEY/.test(coreJs) &&
      /sessionStorage\.removeItem\(SAVE_KEY/.test(coreJs) &&
      !/localStorage\.setItem\(SAVE_KEY/.test(coreJs) &&
      /i\.type === ['"]hidden['"][\s\S]{0,100}?delete answers\[nm\]/.test(coreJs) &&
      /i\.type === ['"]file['"][\s\S]{0,260}?data-value[\s\S]{0,160}?\.name/.test(coreJs);
    check(
      'core:wiz-session-draft-privacy',
      sessionDraftPrivacy,
      sessionDraftPrivacy ? 'same-tab only; hidden excluded; file bytes never serialized; cleared on thanks' : 'WIZ draft crossed privacy boundary',
    );
    // Explicit review step before thanks — frege UX (Look good?/Ready?) + dg-wiz-review UI.
    // Parse only var WIZ_CFG block so WIZ_THANKS / other strings cannot steal the regex.
    {
      const cfg = (coreJs.match(/var\s+WIZ_CFG\s*=\s*\{[\s\S]*?\n\};/) || [])[0] || '';
      const startupOrder =
        /startup:\s*\{[\s\S]*?steps:\s*\[[\s\S]*?\['90day-outcome'\][\s\S]*?\['__submit__'\][\s\S]*?\['__thanks__'\]/.test(
          cfg,
        );
      const engOrder =
        /engineer:\s*\{[\s\S]*?steps:\s*\[[\s\S]*?\['__submit__'\][\s\S]*?\['__thanks__'\]/.test(cfg);
      const reviewCopy =
        (/Look good\?/.test(coreJs) || /Review and submit your brief/.test(coreJs)) &&
        (/Ready\?/.test(coreJs) || /Review and submit your profile/.test(coreJs));
      const wizSubmitReview = !!cfg && startupOrder && engOrder && reviewCopy && /dg-wiz-review/.test(coreJs);
      check(
        'core:wiz-submit-review',
        wizSubmitReview,
        wizSubmitReview
          ? null
          : !cfg
            ? 'WIZ_CFG missing'
            : !startupOrder
              ? 'startup steps must order 90day-outcome → __submit__ → __thanks__'
              : !engOrder
                ? 'engineer steps must include __submit__ before __thanks__'
                : 'WIZ review copy (Look good?/Ready? or legacy Review…) + dg-wiz-review required',
      );
    }
    check('core:trust-fallback', /appendChild\(el\)|insertBefore\(el,f\)/.test(coreJs));
    // Removed core:board-cdn-current: it matched /catbox\.moe/ anywhere in foot-core, so it stayed
    // green on unrelated art assets (catbox.moe/eg561c.jpg) even after BOARD_CDN was deleted outright.
    check('core:version-150plus', /__dgFootVer='(?:1[5-9][0-9]|[2-9][0-9]{2,})'/.test(coreJs));
    // Foot orgJsonLd must no-op when head already has #dg-org-jsonld (Claude c48 duplicate-LD fix).
    check(
      'core:org-jsonld-guard',
      /function\s+orgJsonLd\s*\(/.test(coreJs) &&
        /#dg-org-jsonld/.test(coreJs) &&
        /orgJsonLd\s*\(/.test(coreJs),
      /function\s+orgJsonLd\s*\(/.test(coreJs) ? null : 'orgJsonLd missing or does not guard on #dg-org-jsonld',
    );
    // v903 retired the public Notes surface: legacy /blog and /notes routes resolve to How.
    // Keep validating the dormant post catalog below, but do not require it in the public core.
    try {
      const blogPosts = JSON.parse(fs.readFileSync(path.join(ROOT, 'demigod-blog-posts.json'), 'utf8'));
      const blogRetired =
        /['"]\/blog['"]\s*:\s*['"]how['"]/.test(coreJs) &&
        /['"]\/notes['"]\s*:\s*['"]how['"]/.test(coreJs) &&
        !/\n\s*['"]?(?:blog|notes)['"]?\s*:\s*\{/.test(coreJs) &&
        !/\bDG_BLOG_POSTS\b|\bblogCardHtml\b|id=["']note-|class=["']dg-blog-more["']/.test(coreJs);
      check(
        'core:blog-sor-in-sync',
        blogRetired,
        blogRetired
          ? 'v903 retired: /blog + /notes → how; no public Notes page or renderer'
          : 'retired Notes routes or renderer state drifted',
      );
      // Runtime below-fold path: lazyBelowFold must set decoding=async (parity with static Notes cards).
      const lazyDecodeOk =
        /function\s+lazyBelowFold\s*\(/.test(coreJs) &&
        /setAttribute\(\s*['"]decoding['"]\s*,\s*['"]async['"]\s*\)/.test(coreJs);
      check(
        'core:lazy-decode-async',
        lazyDecodeOk,
        lazyDecodeOk ? null : 'lazyBelowFold missing setAttribute(decoding,async)',
      );
      // Published posts need publishedAt YYYY-MM-DD (Blog LD datePublished SoR; c248).
      const pubAtGaps = [];
      for (const p of blogPosts.posts || []) {
        if (!p || p.published === false) continue;
        const day = String(p.publishedAt || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) pubAtGaps.push(p.slug || p.id || '?');
      }
      check(
        'blog:publishedAt',
        pubAtGaps.length === 0,
        pubAtGaps.length ? `missing/invalid publishedAt: ${pubAtGaps.slice(0, 6).join(',')}` : null,
      );
      // Drafts may stay unpublished, but must stay flip-ready (category + imageAlt + body + image).
      const draftGaps = [];
      for (const p of blogPosts.posts || []) {
        if (!p || p.published !== false) continue;
        const slug = p.slug || '?';
        if (!p.category || !String(p.category).trim()) draftGaps.push(`${slug}:category`);
        if (!p.imageAlt || !String(p.imageAlt).trim()) draftGaps.push(`${slug}:imageAlt`);
        if (!p.summary || !String(p.summary).trim()) draftGaps.push(`${slug}:summary`);
        if (!p.body || !String(p.body).trim()) draftGaps.push(`${slug}:body`);
        if (!p.image || !String(p.image).trim()) draftGaps.push(`${slug}:image`);
        if (!p.title || !String(p.title).trim()) draftGaps.push(`${slug}:title`);
      }
      check(
        'blog:draft-ready',
        draftGaps.length === 0,
        draftGaps.length ? draftGaps.slice(0, 8).join(',') : 'drafts flip-ready',
      );
    } catch (e) {
      check('core:blog-sor-in-sync', false, String(e.message || e).slice(0, 120));
    }
  }
  // boot smoke (closes verify blind spot for cdnFoot case)
  // Robust: capture stdout only, strip noise, retry once on empty/malformed JSON (Codex 2026-07-12)
  let smoke = { pass: false, error: 'not run' };
  function runSmokeOnce() {
    try {
      return runFootSmoke(path.join(ROOT, 'demigod-foot-core.js'));
    } catch (e) {
      return { pass: false, error: String(e.message || e).slice(0, 200) };
    }
  }
  smoke = runSmokeOnce();
  if (!smoke.pass) {
    const retry = runSmokeOnce();
    if (retry.pass) smoke = retry;
    else if (!smoke.error) smoke = retry;
  }
  check('footer:boot-smoke', smoke.pass === true, smoke.error || smoke.version);
}
// Removed: the legacy `else` arm of `if (cdnFoot)`. cdnFoot is `foot.includes(demigod-foot-cdn-loader)`,
// which the loader always contains (its own header comment + script id), so this arm never ran. It also
// asserted against `coreJs`, which is  when cdnFoot is false — every check in it would have failed if
// reached. footer:dynamic-ledger asserted fetchBoard/BOARD_CDN/renderBoard, all deleted as dead code.

const combinedScan = scanLiveHtml(combined, { footerCoreJs: coreJs });
check('combined:forms-via-footer', combinedScan.footerCoreOk);
check('combined:runtime-nav', combinedScan.runtimeNavOk);
check('combined:head-markers', combinedScan.headOk);
check('combined:no-mcp', combinedScan.mcpScriptsGone);

for (const m of ['hide-webflow-badge', 'Demigod forms', 'openModal', 'demigod-polish']) {
  check(`marker:${m}`, markerPresent(combinedForMarkers, m));
}

const requiredScripts = [
  'demigod-playtest-review.mjs',
  'demigod-live-lib.mjs',
  'demigod-live-lib.test.mjs',
  'demigod-verify-live.mjs',
  'demigod-verify-all.mjs',
  'demigod-import-integrity.mjs',
  'demigod-foot-cdn-publish.mjs',
  'demigod-cm6-paste-publish.mjs',
  'demigod-foot-core.js',
  'demigod-head-minimal.html',
  'demigod-footer-lite.html',
];
for (const f of requiredScripts) {
  check(`file:${f}`, fs.existsSync(path.join(ROOT, f)));
}

try {
  const state = fs.readFileSync(path.join(ROOT, 'DEMIGOD-COMPRESSED-STATE.md'), 'utf8');
  const delegated = state.includes('Release state comes only from `bin/dg truth`') &&
    state.includes('this card does not duplicate changing version, hash, freeze, or lock values');
  const copiedRelease = /(?:Foot \*\*live v|Disk \*\*v\d+|disk v\d+ → manifest → CDN → live)/.test(state);
  check(
    'state:release-version-current',
    delegated && !copiedRelease,
    'state must delegate changing release facts to bin/dg truth without copying a version',
  );
} catch (error) {
  check('state:release-version-current', false, String(error?.message || error).slice(0, 200));
}

try {
  const privacy = verifyNoCommittableSor(ROOT);
  check('privacy:no-committable-sor', privacy.ok === true, privacy.detail);
} catch (error) {
  check(
    'privacy:no-committable-sor',
    false,
    `privacy verifier failed closed: ${String(error?.message || error).slice(0, 500)}`,
  );
}

// Clone-breaker + export contracts — also on ship prepare / pre-commit, but verify:source is the
// agent day-loop path; without this a gutted SoR can commit until someone runs prepare.
{
  const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-import-integrity.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });
  const detail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n')[0] || `exit=${r.status}`;
  check('sor:import-integrity', r.status === 0, detail.slice(0, 240));
}

// Referral attribution controls money and candidate trust; keep its one focused lifecycle check on
// the same source gate used by the canonical ship path instead of maintaining another wrapper.
{
  const r = spawnSync(process.execPath, [
    '--test',
    path.join(ROOT, 'demigod-referrals.test.mjs'),
    path.join(ROOT, 'demigod-referrals-mint.test.mjs'),
  ], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
  const detail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').at(-1) || `exit=${r.status}`;
  check('referrals:lifecycle', r.status === 0, detail.slice(0, 240));
}

// length>0 floor: [].every() is vacuously true, so if a refactor ever skipped every check() call
// this keystone gate would report pass:true having verified nothing. Assert checks actually ran.
const pass = checks.length > 0 && checks.every((c) => c.ok);
const out = { at: new Date().toISOString(), architecture: 'head-minimal-css + foot-core-cdn', checks, pass };
// Atomic write: coord + autopilot run this gate concurrently; direct write can be read torn.
// Write is best-effort: Codex (and other agents) run in read-only sandbox on purpose — EROFS
// must not abort before VERDICT + exit code. JSON is a convenience for dash/coord, not the product.
try {
  const OUT_TMP = `${OUT}.${process.pid}.tmp`;
  fs.writeFileSync(OUT_TMP, JSON.stringify(out, null, 2));
  fs.renameSync(OUT_TMP, OUT);
} catch (e) {
  console.error('warn: could not write verify-source json (read-only ok):', e.message || e);
}
console.log(JSON.stringify({ pass, failed: checks.filter((c) => !c.ok).map((c) => c.name), out: OUT }));
process.exit(pass ? 0 : 1);
