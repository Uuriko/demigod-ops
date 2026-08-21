export const WEBFLOW_METADATA = {
  home: {
    pageId: '5f1458136c15aa41639b8538',
    path: '/',
    title: '$dasha — make the timeline stranger',
    description: '$dasha. Make something. Pass it on.',
    ogTitle: '$dasha — make the timeline stranger',
    ogDescription: 'Make something. Pass it on.',
    ogImage: 'https://lobby.getdasha.com/og/dasha-social-card.png',
    canonical: 'https://www.getdasha.com/',
  },
  studio: {
    pageId: '6a763858748c216defe621b9',
    path: '/studio',
    title: 'Dasha Studio — make one, pass it on',
    description: 'Make Dasha posts, stories, banners, and GIFs.',
    ogTitle: 'Dasha Studio — make one, pass it on',
    ogDescription: 'Make Dasha posts, stories, banners, and GIFs.',
    ogImage: 'https://cdn.prod.website-files.com/5f1458122ba25e70a3ff2bd0/6a776335157ed9bc2f06777c_dasha-card-studio-v1.png',
    canonical: 'https://www.getdasha.com/studio',
  },
  desk: {
    pageId: '6a74b59530c70741b1c574c4',
    path: '/dasha',
    title: '$dasha desk — verify, chart, buy',
    description: '$dasha mint, chart, and source links.',
    ogTitle: '$dasha desk — verify, chart, buy',
    ogDescription: '$dasha mint, chart, and source links.',
    ogImage: 'https://cdn.prod.website-files.com/5f1458122ba25e70a3ff2bd0/6a776335c294a629047ee9e9_dasha-card-desk-v1.png',
    canonical: 'https://www.getdasha.com/dasha',
  },
  lobby: {
    pageId: '6a77870a95e3872a95ef7337',
    path: '/lobby',
    title: '$dasha community — chat and forum',
    description: 'Live chat and lasting threads for $dasha.',
    ogTitle: '$dasha community — chat and forum',
    ogDescription: 'Live chat and lasting threads for $dasha.',
    ogImage: 'https://lobby.getdasha.com/og/dasha-social-card.png',
    canonical: 'https://www.getdasha.com/lobby',
  },
  howto: {
    pageId: null,
    path: '/how-to-buy',
    title: 'How to buy $dasha — getdasha.com',
    description: 'How to buy $dasha on Solana: fund SOL, match the full mint, swap on Jupiter. getdasha.com never opens a wallet.',
    ogTitle: 'How to buy $dasha',
    ogDescription: 'How to buy $dasha on Solana: fund SOL, match the full mint, swap on Jupiter. getdasha.com never opens a wallet.',
    ogImage: 'https://lobby.getdasha.com/og/dasha-social-card.png',
    canonical: 'https://www.getdasha.com/how-to-buy',
  },
};

const attributes = (tag = '') => {
  const out = {};
  for (const match of String(tag).matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gi)) out[match[1].toLowerCase()] = match[3].replaceAll('&amp;', '&');
  return out;
};

export const stripDuplicateOgImage = (head = '') => String(head)
  .replace(/^[ \t]*<meta\b(?=[^>]*\bproperty=["']og:image["'])[^>]*>\s*\n?/gim, '');

const STUDIO_MANIFEST_LINK = '<link rel="manifest" href="/studio.webmanifest">';
const manifestLinks = head => String(head).match(/<link\b(?=[^>]*\brel=["'][^"']*\bmanifest\b[^"']*["'])[^>]*>\s*\n?/gi) || [];

export const ensureStudioManifestLink = (head = '') => {
  const source = String(head), links = manifestLinks(source);
  if (links.length === 1 && /\bhref=["']\/studio\.webmanifest["']/i.test(links[0])) return source;
  const clean = source.replace(/<link\b(?=[^>]*\brel=["'][^"']*\bmanifest\b[^"']*["'])[^>]*>\s*\n?/gi, '').trimEnd();
  return `${clean}${clean ? '\n' : ''}${STUDIO_MANIFEST_LINK}\n`;
};

export function extractWebMetadata(html) {
  const source = String(html || '');
  const meta = {};
  const ogImages = [];
  for (const tag of source.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = attributes(tag);
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key) meta[key] = attrs.content || '';
    if (key === 'og:image') ogImages.push(attrs.content || '');
  }
  let canonical = '';
  for (const tag of source.match(/<link\b[^>]*>/gi) || []) {
    const attrs = attributes(tag);
    if ((attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical')) canonical = attrs.href || '';
  }
  return {
    title: (source.match(/<title>([^<]*)/i)?.[1] || '').trim(),
    description: meta.description || '',
    ogTitle: meta['og:title'] || '',
    ogDescription: meta['og:description'] || '',
    ogImage: meta['og:image'] || '',
    ogImages,
    ogType: meta['og:type'] || '',
    ogUrl: meta['og:url'] || '',
    canonical,
  };
}

export const metadataMismatches = (actual, expected) => [
  ...['title', 'description', 'ogTitle', 'ogDescription', 'ogImage', 'canonical'].filter((field) => actual?.[field] !== expected?.[field]),
  ...(actual?.ogImages?.length === 1 ? [] : ['ogImageCount']),
  ...(actual?.ogType === 'website' ? [] : ['ogType']),
  ...(actual?.ogUrl === expected?.canonical ? [] : ['ogUrl']),
];

/** Data API payload for Webflow-managed fields; OG image remains a Designer metadata write. */
export const webflowPageUpdate = (expected) => ({
  seo: { title: expected.title, description: expected.description },
  openGraph: {
    title: expected.ogTitle,
    titleCopied: false,
    description: expected.ogDescription,
    descriptionCopied: false,
    imageUrl: expected.ogImage,
  },
});
