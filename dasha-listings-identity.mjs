/** Score a DexScreener token `info` blob against Dasha canonical identity.
 *  Does not submit, pay, or post.
 */
export const CANONICAL_SITE = 'https://www.getdasha.com';
export const REJECT_WEBSITES = new Set(['https://dasha.cam', 'http://dasha.cam']);
export const REJECT_TELEGRAM = new Set(['https://t.me/dashacommunity']);

/** Solana Pay URL only when the listing names a real recipient. Empty payTo must not pay. */
export function listingCanPay(row) {
  const payTo = String(row?.payTo || '').trim();
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(payTo);
}

export function scoreDexInfo(info) {
  const websites = (info?.websites || []).map((w) => String(w?.url || '')).filter(Boolean);
  const socials = Array.isArray(info?.socials) ? info.socials : [];
  const telegram = socials.find((s) => s?.type === 'telegram')?.url || null;
  const twitter = socials.find((s) => s?.type === 'twitter')?.url || null;
  const site = websites[0] || null;
  return {
    website: site,
    websiteIsCanonical: websites.some((u) => u === CANONICAL_SITE || u === 'https://getdasha.com'),
    websiteIsRejected: websites.some((u) => REJECT_WEBSITES.has(u.replace(/\/$/, ''))),
    telegram,
    telegramBanned: Boolean(telegram && REJECT_TELEGRAM.has(String(telegram).replace(/\/$/, ''))),
    twitter,
    twitterIsProfile: /^https:\/\/(www\.)?(x|twitter)\.com\/dash_eats\/?$/i.test(String(twitter || '')),
  };
}
