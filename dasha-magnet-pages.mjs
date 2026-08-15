/**
 * Honest magnet pages for words people type. No transfer except POST /faucet/claim.
 */
import { JUPITER, MINT } from './dasha-faucet.mjs';

const STILLS = {
  airdrop: 'bull.jpg',
  earn: 'chart.jpg',
  claim: 'weekend.jpg',
};

const CANONICAL = {
  '/airdrop': 'airdrop',
  '/airdrops': 'airdrop',
  '/earn': 'earn',
  '/rewards': 'earn',
  '/claim': 'claim',
};

export function magnetKind(pathname) {
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  return CANONICAL[path] || null;
}

export function magnetCanonicalPath(kind) {
  if (kind === 'airdrop') return '/airdrop';
  if (kind === 'earn') return '/earn';
  if (kind === 'claim') return '/claim';
  return '';
}

export function magnetRoute(pathname) {
  const kind = magnetKind(pathname);
  if (!kind) return null;
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  const canonical = magnetCanonicalPath(kind);
  return { kind, canonical, redirect: path !== canonical };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageShell({ title, description, canonical, body, footer }) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — getdasha.com</title>
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="description" content="${escapeHtml(description)}">
<meta name="theme-color" content="#070608">
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}html,body{margin:0;min-height:100%;background:var(--ink);color:var(--paper)}body{box-sizing:border-box;min-height:100vh;padding:1.25rem;font:16px/1.45 Arial,Helvetica,sans-serif}h1{margin:0 0 .5rem;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;font-size:clamp(2.6rem,10vw,5rem);line-height:.9;text-transform:uppercase}h2{margin:1.2rem 0 .4rem;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;text-transform:uppercase}a{color:var(--acid)}.magnet-still{display:block;width:min(420px,100%);height:160px;object-fit:cover;margin:12px 0;border:1px solid var(--acid)}.magnet-ca{display:block;margin:12px 0;padding:12px;border:1px solid #7c4dff;font-family:Fragment Mono,ui-monospace,Menlo,Consolas,monospace;word-break:break-all;user-select:all}.magnet-go{display:inline-flex;min-height:48px;align-items:center;padding:0 1.25rem;margin:0 .5rem .75rem 0;background:var(--acid);color:var(--ink);font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;text-decoration:none;text-transform:uppercase}footer{margin-top:36px;color:rgba(244,237,219,.62)}footer a{color:var(--acid)}@media(prefers-reduced-motion:reduce)*{transition:none!important;animation:none!important}</style>
<body>
${body}
${footer || ''}
</body></html>`;
}

export function magnetPageHtml(kind, footer = '') {
  const still = STILLS[kind] || STILLS.claim;
  const img = `<img class="magnet-still" src="https://lobby.getdasha.com/simp/photo/${still}" alt="">`;
  const mint = `<code class="magnet-ca">${escapeHtml(MINT)}</code>`;
  if (kind === 'airdrop') {
    return pageShell({
      title: 'Airdrop',
      description: 'there isn\'t one. no snapshot. no allocation.',
      canonical: 'https://www.getdasha.com/airdrop',
      footer,
      body: `<h1>AIRDROP</h1>
${img}
<p>there isn't one. no snapshot. no allocation. no form that pays a bag.</p>
<p>What exists: a tiny <a href="/faucet">/faucet</a> sample. not an airdrop. not earn. Agents do not claim this faucet.</p>
<h2>How to get a bag</h2>
<p><a href="/how-to-buy">How to buy</a> · <a href="${escapeHtml(JUPITER)}">Jupiter</a></p>
${mint}
<p>MATCH, not verified. She is not the dev.</p>`,
    });
  }
  if (kind === 'earn') {
    return pageShell({
      title: 'Earn',
      description: '$dasha does not pay you to click, learn, or refer.',
      canonical: 'https://www.getdasha.com/earn',
      footer,
      body: `<h1>EARN</h1>
${img}
<p>$dasha does not pay you to click, learn, or refer.</p>
<p><a href="/learn">/learn</a> Simp points are a score not $dasha.</p>
<p><a href="/chess">/chess</a> is ELO.</p>
<p><a href="/simp">/simp</a> is a quiz.</p>
<p><a href="/faucet">/faucet</a> is a sample, still not earn.</p>
${mint}
<p>No start-earning transfer. No XP.</p>`,
    });
  }
  return pageShell({
    title: 'Claim',
    description: 'the only send is the /faucet sample.',
    canonical: 'https://www.getdasha.com/claim',
    footer,
    body: `<h1>CLAIM</h1>
${img}
<p>the only send is the /faucet sample. not an airdrop. not earn.</p>
<p>Agents do not claim this faucet.</p>
<p><a class="magnet-go" href="/faucet">Open faucet</a></p>
${mint}`,
  });
}
