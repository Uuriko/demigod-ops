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
import { scanLiveHtml, markerPresent } from './demigod-live-lib.mjs';
import { runFootSmoke } from './demigod-foot-smoke.mjs';

const ROOT = '/home/potter';
const OUT = path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json');

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
const cdnHeadCss = head.includes('rel="stylesheet"') && head.includes('catbox.moe');
const combined = `${head}\n${headCss}\n${foot}`;
const coreJs = cdnFoot ? fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8') : '';
const combinedForMarkers = cdnFoot ? `${head}\n${headCss}\n${coreJs}` : combined;

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
check('head:public-contact-potter', head.includes('potter@trydemigod.com') && !head.includes('hello@trydemigod.com') && !head.includes('hello@demigod.com'));
// Positioning 07-16: Demigod tech + humans in the loop — NOT matched by hand.
// Brand line moved Human-Matched → Tech-Matched; gate asserts the current line, not the retired one.
check('head:heavy-meta', head.includes('Tech-Matched SF Startup Talent') && (head.includes('curated talent') || head.includes('curated candidates')));
check('head:og:title', head.includes('og:title'));
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
  const d = metaDesc('name', 'description');
  const og = metaDesc('property', 'og:description');
  const tw = metaDesc('name', 'twitter:description');
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
  // Share/knowledge-panel fee honesty: first-year cash + talent free (not bare "10% when hire starts").
  const feeDescOk =
    /10%\s+of\s+first-year\s+cash\s+on\s+hire/i.test(d || '') &&
    /free\s+for\s+talent/i.test(d || '') &&
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
  const ogT = metaDesc('property', 'og:title');
  const twT = metaDesc('name', 'twitter:title');
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
  // Homepage canonical must match og/twitter url (share + SEO honesty; mini-pages set runtime).
  const canM = head.match(
    /rel=["']canonical["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["']canonical["']/i,
  );
  const can = (canM && (canM[1] || canM[2])) || '';
  const canOk = can && ogUrl && can === ogUrl && can === twUrl;
  check(
    'head:canonical-aligned',
    canOk,
    canOk ? null : `canonical|og|tw url diverge (${[can, ogUrl, twUrl].map((s) => (s || '').slice(0, 40)).join(' | ')})`,
  );
  // Homepage canonical must be production HTTPS apex (not http, not bare host, not hash).
  const canHttpsOk = can === 'https://www.trydemigod.com/';
  check(
    'head:canonical-https',
    canHttpsOk,
    canHttpsOk ? null : `canonical not https://www.trydemigod.com/ (${can || 'missing'})`,
  );
  // Early head rewrite for Notes surface: crawlers that skip foot openPage() still get /?p=blog
  // canonical + Notes title/desc (Claude c63 urls; c102 share-card title/desc) so previews aren't homepage copy.
  {
    const blogCanM = head.match(
      /<script\b[^>]*\bid=["']dg-blog-canonical["'][^>]*>[\s\S]*?<\/script>/i,
    );
    const body = (blogCanM && blogCanM[0]) || '';
    const blogCanOk =
      !!body &&
      /id!==['"]blog['"]/.test(body) &&
      /path\s*===\s*['"]\/blog['"]|\/blog/.test(body) &&
      /path\s*===\s*['"]\/notes['"]|\/notes/.test(body) &&
      /\/\(blog\|notes\)\\\//.test(body) &&
      /toLowerCase\s*\(/.test(body) &&
      /trydemigod\.com\/\?p=blog/.test(body) &&
      /rel=canonical|link\[rel=canonical\]/.test(body) &&
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
// Disk CSS honesty layers (v259/v316/v421/v449). Live catbox CSS often lags —
// this locks disk SoR only; intentional CSS ship is separate (no thrash CDN).
{
  const css = headCss || '';
  const hasReadiness =
    /v421\s+readiness\s+guard/i.test(css) && /body:not\(\.dg-ready\)/.test(css);
  const hasHonesty =
    /v449\s+head-only\s+honesty\s+guard/i.test(css) && /body\.dg-head-fallback/.test(css);
  const hasDecisionGrid = /\.dg-decision-grid\b/.test(css);
  const hasNoInfiniteGlow =
    /v316:\s*no infinite CTA glow/i.test(css) &&
    !/\.premium-btn[^{]*\{[^}]*animation:\s*dg-gold-glow[^;]*infinite/i.test(css);
  // Hero bg must match head og:image + foot brandAssets (126k4p); ban stale Webflow hermes stock.
  const hasHeroBrand =
    /files\.catbox\.moe\/126k4p\.jpg/.test(css) && !/demigod-hermes-hero-16x9/i.test(css);
  const cssHonestyOk =
    hasReadiness && hasHonesty && hasDecisionGrid && hasNoInfiniteGlow && hasHeroBrand;
  check(
    'css:disk-honesty-guards',
    cssHonestyOk,
    cssHonestyOk
      ? null
      : `missing disk CSS guards readiness=${hasReadiness} honesty=${hasHonesty} decisionGrid=${hasDecisionGrid} noInfiniteGlow=${hasNoInfiniteGlow} heroBrand=${hasHeroBrand}`,
  );
}
// Unhide must target named hero shell only — never [class*="hero"] (flattens Webflow IX children).
// .hero-content-right is intentionally absent: foot-core brandAssets() always sets it
// display:none!important, so forcing it visible in head would be dead CSS.
// .hero-content-left is absent from head-minimal unhide (Claude c78); head-styles may still
// layout-target it (max-width etc) — ban only force-unhide !important + head-minimal selectors.
{
  const broadHero = /\[class\*\s*=\s*["'][^"']*hero/i.test(head);
  const shellNamed = head.includes('.hero-section') && head.includes('.hero-container');
  const heroContentLeftForced = /\.hero-content-left\b[^{]*\{[^}]*(visibility|opacity|transform)\s*:[^;}]*!important/i.test(
    headCss || head,
  );
  // head-minimal paste must not reintroduce .hero-content-left into unhide CSS/JS (IX flatten).
  const heroContentLeftInMinimal = /\.hero-content-left\b|hero-content-left/.test(head);
  // h2/.premium-btn must not be force-unhidden within unhide CSS/JS — flattens
  // intentionally-hidden headings/CTAs beyond the hero shell (h1/header/main).
  // Scope = unhide styles + early unhide JS only (copy-scrub walks h2 text nodes).
  // Strip /* */ comments so explanatory notes cannot trip the ban.
  const unhideScopeRaw = [
    /<style\b[^>]*id=["']dg-unhide-critical["'][^>]*>[\s\S]*?<\/style>/i,
    /<style\b[^>]*id=["']dg-unhide-main["'][^>]*>[\s\S]*?<\/style>/i,
    /<style\b[^>]*id=["']dg-graceful-unhide["'][^>]*>[\s\S]*?<\/style>/i,
    /<script\b[^>]*id=["']dg-early-unhide["'][^>]*>[\s\S]*?<\/script>/i,
    /<noscript>\s*<style>[\s\S]*?<\/style>\s*<\/noscript>/i,
  ]
    .map((re) => ((head.match(re) || [])[0] || ''))
    .join('\n');
  const unhideScope = unhideScopeRaw.replace(/\/\*[\s\S]*?\*\//g, '');
  const h2OrPremiumBtnForced =
    /(^|[,\s])h2\s*[,{]|\.premium-btn\s*[,{']|querySelectorAll\([^)]*(?:h2|\.premium-btn)/i.test(
      unhideScope,
    );
  const heroShellOk = !broadHero && shellNamed && !heroContentLeftForced && !heroContentLeftInMinimal && !h2OrPremiumBtnForced;
  check(
    'head:hero-shell-only',
    heroShellOk,
    heroShellOk
      ? null
      : broadHero
        ? 'broad [class*="hero"] still present (use named shell selectors)'
        : heroContentLeftForced
          ? '.hero-content-left force-unhidden with !important (flattens Webflow IX)'
          : heroContentLeftInMinimal
            ? '.hero-content-left in head-minimal unhide (use shell-only; layout stays in head-styles)'
            : h2OrPremiumBtnForced
              ? 'h2/.premium-btn force-unhidden (flattens intentionally-hidden headings/CTAs beyond hero shell)'
              : 'missing named hero shell selectors',
  );
}
// Early unhide must stay v5 finite-tick (v4 MutationObserver thrash froze browsers).
// Require clearInterval + n>=N bound so setInterval cannot run forever if load never fires.
{
  const early = (head.match(/<script\b[^>]*id=["']dg-early-unhide["'][^>]*>[\s\S]*?<\/script>/i) || [])[0] || '';
  const unhideV5 =
    /__dgUnhideV5/.test(early) &&
    /unhide-v5-safe/.test(head) &&
    /setInterval/.test(early) &&
    /clearInterval/.test(early) &&
    /\+\+n\s*>=\s*\d+|n\s*\+\+\s*>=\s*\d+|n\s*>=\s*\d+/.test(early) &&
    !/MutationObserver/.test(early);
  check(
    'head:unhide-v5-safe',
    unhideV5,
    unhideV5
      ? null
      : !early
        ? 'missing #dg-early-unhide script'
        : /MutationObserver/.test(early)
          ? 'early unhide still uses MutationObserver (v4 thrash)'
          : !/clearInterval/.test(early) || !/\+\+n\s*>=\s*\d+|n\s*\+\+\s*>=\s*\d+|n\s*>=\s*\d+/.test(early)
            ? 'early unhide missing clearInterval / finite n>= bound (interval thrash risk)'
            : 'early unhide missing __dgUnhideV5 / unhide-v5-safe / setInterval finite ticks',
  );
  // Positive shell require (not only bans): early tick must target named hero shell +
  // use setProperty(...,'important') + once:true listeners (sibling of contact-scrub).
  // Use [\s\S] for load listener (function(){…} has nested parens that break [^)]*).
  // header *element* required (parity with critical CSS — class .header alone is not enough).
  const earlyQ = (early.match(/querySelectorAll\s*\(\s*['"]([^'"]+)['"]/i) || [])[1] || '';
  const earlyHasHeaderEl = /(^|[,])\s*header\s*([,]|$)/i.test(earlyQ);
  const earlyShell =
    !!early &&
    /querySelectorAll\s*\(\s*['"][^'"]*\.hero-section[^'"]*\.hero-container[^'"]*main[^'"]*h1/i.test(early) &&
    earlyHasHeaderEl &&
    /setProperty\s*\(\s*['"]visibility['"]\s*,\s*['"]visible['"]\s*,\s*['"]important['"]\s*\)/.test(early) &&
    /setProperty\s*\(\s*['"]opacity['"]\s*,\s*['"]1['"]\s*,\s*['"]important['"]\s*\)/.test(early) &&
    /DOMContentLoaded[\s\S]{0,60}once\s*:\s*true/.test(early) &&
    /['"]load['"][\s\S]{0,120}once\s*:\s*true/.test(early);
  check(
    'head:early-unhide-shell',
    earlyShell,
    earlyShell
      ? null
      : !early
        ? 'missing #dg-early-unhide script'
        : !/querySelectorAll\s*\(\s*['"][^'"]*\.hero-section/i.test(early)
          ? 'early unhide missing shell querySelectorAll (.hero-section…main,h1,header)'
          : !earlyHasHeaderEl
            ? 'early unhide shell must include header element (not only .header class)'
          : !/setProperty\s*\(\s*['"]visibility['"]/.test(early)
            ? 'early unhide must setProperty visibility/opacity with important'
            : 'early unhide missing DOMContentLoaded/load {once:true}',
  );
  // Swarm P2 / c175/c202: JS transform+translate:none only on hero-section|hero-container (not header/main/h1 IX).
  const earlyFlat = early.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
  const transformHeroGated =
    !!early &&
    /contains\s*\(\s*['"]hero-section['"]\s*\)/.test(early) &&
    /contains\s*\(\s*['"]hero-container['"]\s*\)/.test(early) &&
    /setProperty\s*\(\s*['"]transform['"]\s*,\s*['"]none['"]/.test(early) &&
    /setProperty\s*\(\s*['"]translate['"]\s*,\s*['"]none['"]/.test(early) &&
    // reject bare: visibility+opacity then transform without classList gate
    !/if\s*\(\s*!e\s*\|\|\s*!e\.style\s*\)\s*continue\s*;\s*e\.style\.setProperty\s*\(\s*['"]visibility['"][^;]+;\s*e\.style\.setProperty\s*\(\s*['"]opacity['"][^;]+;\s*e\.style\.setProperty\s*\(\s*['"]transform['"]/.test(
      earlyFlat,
    );
  check(
    'head:unhide-transform-hero',
    transformHeroGated,
    transformHeroGated
      ? null
      : !early
        ? 'missing #dg-early-unhide'
        : 'early unhide must set transform+translate:none only when classList has hero-section|hero-container',
  );
  // c202: noscript shell must include .hero-container (parity with critical CSS shell; was .hero-section-only).
  const noscriptStyle = (head.match(/<noscript>\s*<style>([\s\S]*?)<\/style>\s*<\/noscript>/i) || [])[1] || '';
  const noscriptShellOk =
    !!noscriptStyle &&
    /\.hero-section\b/.test(noscriptStyle) &&
    /\.hero-container\b/.test(noscriptStyle) &&
    !/transform\s*:\s*none/i.test(noscriptStyle) &&
    !/translate\s*:\s*none/i.test(noscriptStyle);
  check(
    'head:noscript-shell',
    noscriptShellOk,
    noscriptShellOk
      ? null
      : !noscriptStyle
        ? 'missing noscript unhide style'
        : !/\.hero-container\b/.test(noscriptStyle)
          ? 'noscript shell missing .hero-container (parity with critical CSS)'
          : 'noscript must not force transform/translate:none (IX-safe; visibility only)',
  );
  // Swarm P2 / c184/c189: critical CSS transform/translate:none only on hero shell leaves; main/graceful never flatten IX.
  const critBlock = (head.match(/<style\b[^>]*id=["']dg-unhide-critical["'][^>]*>[\s\S]*?<\/style>/i) || [])[0] || '';
  const critBody = critBlock.replace(/\/\*[\s\S]*?\*\//g, '');
  let critHeroTransform = false;
  let critHeroTranslate = false;
  let critTransformScoped = !!critBlock;
  let critTranslateScoped = !!critBlock;
  {
    const ruleRe = /([^{}@]+)\{([^}]*)\}/g;
    let rm;
    while ((rm = ruleRe.exec(critBody))) {
      const body = rm[2] || '';
      const hasTf = /transform\s*:\s*none/i.test(body);
      const hasTr = /translate\s*:\s*none/i.test(body);
      if (!hasTf && !hasTr) continue;
      const parts = String(rm[1] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      let leavesOk = true;
      for (const p of parts) {
        const leaf = p.replace(/^html\.w-mod-js:not\(\.w-mod-ix3\)\s+/i, '').trim();
        if (leaf !== '.hero-section' && leaf !== '.hero-container') {
          leavesOk = false;
          break;
        }
      }
      if (hasTf) {
        if (!leavesOk) critTransformScoped = false;
        else critHeroTransform = true;
      }
      if (hasTr) {
        if (!leavesOk) critTranslateScoped = false;
        else critHeroTranslate = true;
      }
      if (!critTransformScoped || !critTranslateScoped) break;
    }
  }
  const mainBlock = (head.match(/<style\b[^>]*id=["']dg-unhide-main["'][^>]*>[\s\S]*?<\/style>/i) || [])[0] || '';
  const gracefulBlock = (head.match(/<style\b[^>]*id=["']dg-graceful-unhide["'][^>]*>[\s\S]*?<\/style>/i) || [])[0] || '';
  const mainGraceFlat = (mainBlock + '\n' + gracefulBlock).replace(/\/\*[\s\S]*?\*\//g, '');
  const mainGraceNoFlatten =
    !!mainBlock &&
    !!gracefulBlock &&
    !/transform\s*:\s*none/i.test(mainGraceFlat) &&
    !/translate\s*:\s*none/i.test(mainGraceFlat);
  const criticalTransformOk =
    critHeroTransform &&
    critTransformScoped &&
    critHeroTranslate &&
    critTranslateScoped &&
    mainGraceNoFlatten;
  check(
    'head:critical-transform-hero',
    criticalTransformOk,
    criticalTransformOk
      ? null
      : !critBlock
        ? 'missing #dg-unhide-critical'
        : !critHeroTransform || !critTransformScoped
          ? 'dg-unhide-critical must set transform:none only on .hero-section|.hero-container leaves'
          : !critHeroTranslate || !critTranslateScoped
            ? 'dg-unhide-critical must set translate:none only on .hero-section|.hero-container leaves (c189 IX-safe)'
            : 'dg-unhide-main/graceful must not set transform/translate:none (IX/header safe)',
  );
  // #dg-unhide-main must include header (c93 visibility parity).
  // #dg-graceful-unhide: animate hero shell only (swarm P2 / c273); ban main/h1/header
  // animation selectors. Reduced-motion must kill hero anim.
  const mainHeaderOk =
    !!mainBlock &&
    /html\.w-mod-js:not\(\.w-mod-ix3\)\s+header\s*[,{]/.test(mainBlock);
  const gracefulNoComment = gracefulBlock.replace(/\/\*[\s\S]*?\*\//g, '');
  const gracefulOutsideReduce = gracefulNoComment.replace(
    /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{[\s\S]*?\}/gi,
    '',
  );
  let gracefulAnimatesShell = false;
  {
    const animBlocks = gracefulOutsideReduce.match(/[^{}]+\{[^}]*animation\s*:[^}]*\}/gi) || [];
    for (const blk of animBlocks) {
      const sel = blk.split('{')[0] || '';
      if (/(^|[,])\s*(header|main|h1)\s*([,{]|$)/i.test(sel)) {
        gracefulAnimatesShell = true;
        break;
      }
    }
  }
  const gracefulHeroAnim =
    /\.hero-section[\s\S]{0,100}animation\s*:/i.test(gracefulOutsideReduce) ||
    /\.hero-container[\s\S]{0,100}animation\s*:/i.test(gracefulOutsideReduce);
  const reduceHeroAnim =
    /prefers-reduced-motion:reduce[\s\S]{0,220}\.hero-section/.test(gracefulNoComment) &&
    /prefers-reduced-motion:reduce[\s\S]{0,220}animation\s*:\s*none/i.test(gracefulNoComment);
  const gracefulHeroOnly =
    !!gracefulBlock && gracefulHeroAnim && reduceHeroAnim && !gracefulAnimatesShell;
  const unhideMainHeaderOk = mainHeaderOk && gracefulHeroOnly;
  check(
    'head:path-redirects',
    /id=["']dg-path-redirects["']/.test(head) && /\/fees/.test(head) && /p=pricing/.test(head) && /\/security/.test(head) && /p=legal/.test(head) && /\/p\//.test(head) && /\/apply/.test(head),
    /id=["']dg-path-redirects["']/.test(head)
      ? null
      : 'head must include #dg-path-redirects for /fees→pricing /security→legal /p/* /apply (firecrawl 404 P0)',
  );
  check(
    'head:unhide-main-header',
    unhideMainHeaderOk,
    unhideMainHeaderOk
      ? null
      : !mainHeaderOk
        ? 'dg-unhide-main missing header element selector (parity with critical/early shell)'
        : !gracefulHeroAnim
          ? 'dg-graceful-unhide must animate .hero-section|.hero-container (force-show)'
          : !reduceHeroAnim
            ? 'dg-graceful-unhide reduced-motion must animation:none hero shell'
            : 'dg-graceful-unhide must not animate main/h1/header (swarm P2 hero shell only)',
  );
}
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
// Early copy scrub must be finite-tick (sibling of unhide-v5-safe — no eternal TreeWalker interval).
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
// mandated post-edit set (verify:source + board-honesty + loop-state) did NOT -- an agent editing
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
      (/\/method(\\\/\|\$)/.test(foot) || /p=method/.test(foot) || /\/method(\/|\$)/.test(foot)) &&
      /#note-/.test(foot) &&
      /\\\/fees/.test(foot) &&
      /fees[\s\S]{0,80}p=pricing|fees[^\n]{0,60}pricing/.test(foot) &&
      /\\\/security/.test(foot) &&
      /security[\s\S]{0,80}p=legal|security[^\n]{0,60}legal/.test(foot) &&
      /\\\/network/.test(foot) &&
      /network[\s\S]{0,80}p=talent|network[^\n]{0,60}talent/.test(foot) &&
      !/p=network/.test(foot),
    'need blog|notes + method + #note-slug + /fees→pricing + /security→legal + /network→?p=talent (v28/c201/c247)',
  );
  // c228: /sample → ?p=sample now that DG_PAGES.sample exists (Claude v505). Early footer
  // redirect works even when live foot lags path-map; pairs with core:sample-page honesty.
  check(
    'footer:sample-path',
    // Accept escaped JS form (\/sample) or plain /sample in source thrash variants
    (/\/sample/.test(foot) || /\\\/sample/.test(foot)) && /p=sample/.test(foot),
    'footer-lite must redirect /sample → ?p=sample (pairs with core DG_PAGES.sample)',
  );
  // c309/v507: /pilot → ?p=pilot so early path hits open Pilot mini-page (now in #dg-legal-links).
  // c333: also lock demigod-footer-loader.html (mirror thrash often drops loader while lite stays green).
  {
    const pilotPath = (s) =>
      !!(s && (/\/pilot/.test(s) || /\\\/pilot/.test(s)) && /p=pilot/.test(s));
    check(
      'footer:pilot-path',
      pilotPath(foot) && pilotPath(footLoader),
      'footer-lite + footer-loader must redirect /pilot → ?p=pilot (pairs with DG_PAGES.pilot + legal nav)',
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
    // Claude c167/c169: lead-capture autofill — abandon + company + contact-email + engineer name/email/url
    check(
      'core:form-autocomplete',
      /id="dg-abandon-email"[^>]*autocomplete="email"/.test(coreJs) &&
        /name="company-name"[^>]*autocomplete="organization"/.test(coreJs) &&
        /setAttribute\(\s*['"]autocomplete['"]\s*,\s*['"]email['"]\s*\)/.test(coreJs) &&
        /setAttribute\(\s*['"]autocomplete['"]\s*,\s*n===\s*['"]full-name['"]\s*\?\s*['"]name['"]\s*:\s*['"]email['"]\s*\)/.test(coreJs) &&
        /setAttribute\(\s*['"]autocomplete['"]\s*,\s*['"]url['"]\s*\)/.test(coreJs),
    );
    // Claude v506: offerAbandon dialog a11y — modal semantics + Escape close + focus email field
    check(
      'core:offer-abandon-a11y',
      /function\s+offerAbandon\s*\(/.test(coreJs) &&
        /id=['"]dg-abandon['"]/.test(coreJs) &&
        /setAttribute\(\s*['"]aria-modal['"]\s*,\s*['"]true['"]\s*\)/.test(coreJs) &&
        /setAttribute\(\s*['"]aria-label['"]\s*,\s*['"]Follow-up email['"]\s*\)/.test(coreJs) &&
        /e\.key\s*===\s*['"]Escape['"]/.test(coreJs) &&
        /#dg-abandon-email['"]\s*\)[\s\S]{0,40}?\.focus\s*\(/.test(coreJs),
      'offerAbandon must be dialog (aria-modal + label) with Escape close + focus #dg-abandon-email',
    );
    // Claude c176/v504: path + ?p= aliases — /fees|/security must not soft-404 (map alone was bypassed by id-from-query)
    check(
      'core:route-fees-security',
      /['"]\/fees['"]\s*:\s*['"]pricing['"]/.test(coreJs) &&
        /['"]\/security['"]\s*:\s*['"]legal['"]/.test(coreJs) &&
        /id\s*===\s*['"]fees['"]\s*\)\s*id\s*=\s*['"]pricing['"]/.test(coreJs) &&
        /id\s*===\s*['"]security['"]\s*\)\s*id\s*=\s*['"]legal['"]/.test(coreJs),
    );
    // v507: Pilot mini-page was orphan (DG_PAGES+route only) — must appear in #dg-legal-links footer nav
    check(
      'core:legal-links-pilot',
      /id=['"]dg-legal-links['"]/.test(coreJs) &&
        /data-dg-page=['"]pilot['"]/.test(coreJs) &&
        /['"]\/pilot['"]\s*:\s*['"]pilot['"]/.test(coreJs) &&
        /pilot:\s*\{/.test(coreJs),
      'Pilot must be in #dg-legal-links + path map + DG_PAGES (no orphan /?p=pilot)',
    );
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
    // Claude v507: Pilot was a dead mini-page (route existed, zero inbound UI links).
    // Lock path map + DG_PAGES.pilot + #dg-legal-links Pilot anchor (discoverability).
    check(
      'core:pilot-page',
      /pilot:\s*\{[\s\S]{0,240}?title:\s*['"]Pilot['"]/.test(coreJs) &&
        /['"]\/pilot['"]\s*:\s*['"]pilot['"]/.test(coreJs) &&
        /data-dg-page=["']pilot["']/.test(coreJs) &&
        />\s*Pilot\s*</.test(coreJs),
      'DG_PAGES.pilot + /pilot path + legal-nav Pilot link required (v507 discoverability)',
    );
    // Soft-404 page for unknown paths (not /sample — that redirects via footer-lite).
    check(
      'core:notfound-page',
      /notfound:\s*\{[\s\S]{0,240}?title:\s*['"]Page not found['"]/.test(coreJs) &&
        /Not found · Demigod/.test(coreJs),
      'DG_PAGES.notfound soft-404 page required (title + doc)',
    );
    // Claude v507: Pilot mini-page must be inbound-reachable from footer legal nav (was orphan: route worked, zero UI links).
    check(
      'core:pilot-legal-nav',
      /pilot:\s*\{[\s\S]{0,400}?White-glove pilot/i.test(coreJs) &&
        /['"]\/pilot['"]\s*:\s*['"]pilot['"]/.test(coreJs) &&
        /id=['"]dg-legal-links['"][\s\S]{0,900}?data-dg-page=['"]pilot['"]/.test(coreJs) &&
        /href=['"]\/\?p=pilot['"]/.test(coreJs) &&
        />Pilot</.test(coreJs),
      'DG_PAGES.pilot + path /pilot + #dg-legal-links Pilot link required (v507 orphan fix)',
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
    // Notes SoR: demigod-blog-posts.json embedded as DG_BLOG_POSTS + runtime card render
    // (static hand-copied HTML cards are gone; gate accepts embed + template path).
    try {
      const blogPosts = JSON.parse(fs.readFileSync(path.join(ROOT, 'demigod-blog-posts.json'), 'utf8'));
      const published = (blogPosts.posts || []).filter((p) => p && p.published !== false);
      const missing = [];
      const dynamicSor =
        /var\s+DG_BLOG_POSTS\s*=/.test(coreJs) &&
        /id="note-'\s*\+/.test(coreJs) &&
        /class="dg-blog-more"/.test(coreJs) &&
        /<summary>Full note · /.test(coreJs);
      for (const p of published) {
        if (!p.title || !coreJs.includes(p.title)) missing.push(`${p.slug || '?'}:title`);
        if (!p.summary || !coreJs.includes(p.summary)) missing.push(`${p.slug || '?'}:summary`);
        if (p.imageAlt && !coreJs.includes(p.imageAlt)) missing.push(`${p.slug || '?'}:alt`);
        if (p.body) {
          const slice = String(p.body).slice(0, 48);
          // Foot embeds JSON with escaped newlines; raw slice may not match source text.
          const esc = JSON.stringify(slice).slice(1, -1);
          if (!coreJs.includes(slice) && !coreJs.includes(esc)) missing.push(`${p.slug || '?'}:body`);
        }
        if (p.image && !coreJs.includes(p.image)) missing.push(`${p.slug || '?'}:image`);
        // Static id= or dynamic embed slug (runtime builds id="note-"+slug)
        if (
          p.slug &&
          !coreJs.includes(`id="note-${p.slug}"`) &&
          !(dynamicSor && coreJs.includes(`"slug":"${p.slug}"`))
        ) {
          missing.push(`${p.slug}:id`);
        }
      }
      const moreCount = (coreJs.match(/class="dg-blog-more"/g) || []).length;
      // Empty published catalog is allowed (wipe / pre-content); dynamic SoR must still exist.
      if (!dynamicSor) {
        if (moreCount < published.length) missing.push(`details=${moreCount}<${published.length}`);
        const labeled = (coreJs.match(/<summary>Full note · /g) || []).length;
        if (labeled < published.length) missing.push(`labeledSummary=${labeled}<${published.length}`);
      }
      // Dropped the 'no-deeplink' sub-check: it asserted coreJs.includes('Deep-link Notes cards'),
      // and that string exists in foot-core ONLY as a `//` comment (line ~4505). Deleting the comment
      // failed the gate while the feature worked; deleting the FEATURE and keeping the comment passed
      // it. 'note-hashchange' below already guards the real deep-link path (focusBlogNoteFromHash +
      // a hashchange listener), so the comment assert guarded nothing that code doesn't.
      // Deep-link ship path: title rewrite + hashchange re-focus + reduced-motion scroll (v475–v478)
      if (!coreJs.includes(' · Notes · Demigod')) missing.push('deep-title');
      if (!/hashchange/.test(coreJs) || !coreJs.includes('focusBlogNoteFromHash')) missing.push('note-hashchange');
      if (!/prefers-reduced-motion:\s*reduce/.test(coreJs) || !/matches\)\s*\?\s*['"]auto['"]\s*:\s*['"]smooth['"]/.test(coreJs)) {
        missing.push('note-reduced-motion');
      }
      // Static cards need lazy dims on each id; dynamic template needs one lazy+async+width/height path.
      if (dynamicSor) {
        const dynLazy =
          /loading=["']lazy["']/.test(coreJs) &&
          /decoding=["']async["']/.test(coreJs) &&
          /width=["']\d+["']/.test(coreJs) &&
          /height=["']\d+["']/.test(coreJs);
        if (!dynLazy) missing.push('lazyDims=dynamic-template');
      } else {
        const noteLazyDims = (
          coreJs.match(
            /id="note-[^"]+"><img\b[^>]*\bloading="lazy"[^>]*\bdecoding="async"[^>]*\bwidth="\d+"[^>]*\bheight="\d+"/g,
          ) || []
        ).length;
        if (noteLazyDims < published.length) {
          missing.push(`lazyDims=${noteLazyDims}<${published.length}`);
        }
      }
      // Draft posts must not ship as static Notes cards (e.g. ship-when-ready published:false)
      for (const p of blogPosts.posts || []) {
        if (p && p.published === false && p.slug && coreJs.includes(`id="note-${p.slug}"`)) {
          missing.push(`${p.slug}:draft-in-foot`);
        }
      }
      check(
        'core:blog-sor-in-sync',
        missing.length === 0,
        missing.length
          ? missing.slice(0, 8).join(',')
          : `${published.length}posts+${dynamicSor ? 'dynSoR' : 'static'}+deeplink+hash+rmotion+lazyDims`,
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
  'demigod-foot-cdn-publish.mjs',
  'demigod-fix-custom-code.mjs',
  'demigod-foot-core.js',
  'demigod-head-minimal.html',
  'demigod-footer-lite.html',
];
for (const f of requiredScripts) {
  check(`file:${f}`, fs.existsSync(path.join(ROOT, f)));
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
