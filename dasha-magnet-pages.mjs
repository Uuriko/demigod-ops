/**
 * Magnet rooms for words people type. Title + hop. Send stays on POST /faucet/claim.
 */
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

function pageShell({ title, canonical, body, footer }) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — getdasha.com</title>
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="description" content="${escapeHtml(title)}">
<meta name="theme-color" content="#070608">
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}html,body{margin:0;min-height:100%;background:var(--ink);color:var(--paper)}body{box-sizing:border-box;min-height:100vh;padding:1.25rem;font:16px/1.45 Arial,Helvetica,sans-serif}h1{margin:0 0 .5rem;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;font-size:clamp(2.6rem,10vw,5rem);line-height:.9;text-transform:uppercase}a{color:var(--acid)}.magnet-go{display:inline-flex;min-height:48px;align-items:center;padding:0 1.25rem;margin:0 .5rem .75rem 0;background:var(--acid);color:var(--ink);font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;text-decoration:none;text-transform:uppercase}footer{margin-top:36px;color:rgba(244,237,219,.62)}footer a{color:var(--acid);display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding:0 .4rem}@media(prefers-reduced-motion:reduce)*{transition:none!important;animation:none!important}</style>
<body>
${body}
${footer || ''}
</body></html>`;
}

export function magnetPageHtml(kind, footer = '') {
  if (kind === 'airdrop') {
    return pageShell({
      title: 'Airdrop',
      canonical: 'https://www.getdasha.com/airdrop',
      footer,
      body: `<h1>AIRDROP</h1>
<p><a class="magnet-go" href="/faucet">Faucet</a></p>`,
    });
  }
  if (kind === 'earn') {
    return pageShell({
      title: 'Earn',
      canonical: 'https://www.getdasha.com/earn',
      footer,
      body: `<h1>EARN</h1>
<p><a class="magnet-go" href="/faucet">Faucet</a></p>`,
    });
  }
  return pageShell({
    title: 'Claim',
    canonical: 'https://www.getdasha.com/claim',
    footer,
    body: `<h1>CLAIM</h1>
<p><a class="magnet-go" href="/faucet">Faucet</a></p>`,
  });
}
