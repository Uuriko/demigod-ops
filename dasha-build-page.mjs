const ESC = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function dashaBuildPageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dasha Build — ship open source, earn rewards</title>
<meta name="description" content="Open-source work for Dasha: pick a task, ship on GitHub, get reviewed, build a public record.">
<link rel="canonical" href="https://www.getdasha.com/build">
<meta name="theme-color" content="#070608">
<style>
:root{--ink:#070608;--paper:#f3f0df;--acid:#dfff00;--hot:#ff3b81;--violet:#7c4dff;--muted:#aaa6b4}
*{box-sizing:border-box}html,body{margin:0;background:var(--ink);color:var(--paper);font-family:Arial,Helvetica,sans-serif}a{color:inherit}
.wrap{max-width:1180px;margin:auto;padding:22px}.nav{display:flex;gap:16px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #2a2730;padding-bottom:16px}.brand{font:900 22px/1 Arial Black,Arial,sans-serif;text-decoration:none}.brand b{color:var(--acid)}.nav a:not(.brand){font-weight:700;text-decoration:none;color:#d8d4df}.hero{padding:72px 0 42px;display:grid;grid-template-columns:1.4fr .8fr;gap:38px}.eyebrow{color:var(--acid);font-weight:900;text-transform:uppercase;letter-spacing:.08em}.hero h1{font:900 clamp(48px,8vw,106px)/.88 Arial Black,Arial,sans-serif;letter-spacing:-.055em;margin:14px 0 22px;max-width:900px}.hero p{font-size:21px;line-height:1.45;color:#d7d3dc;max-width:760px}.cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.btn{display:inline-block;padding:13px 17px;border:2px solid var(--paper);font-weight:900;text-decoration:none;box-shadow:4px 4px 0 var(--paper);background:var(--ink)}.btn.primary{background:var(--acid);color:#090909;border-color:var(--acid);box-shadow:4px 4px 0 var(--hot)}.panel{border:2px solid #38343e;padding:20px;align-self:start;background:#0d0b10}.panel h2{font:900 25px Arial Black,Arial;margin:0 0 12px}.steps{counter-reset:s;display:grid;gap:10px}.step{counter-increment:s;border-top:1px solid #322f37;padding:12px 0}.step:before{content:counter(s);display:inline-grid;place-items:center;width:26px;height:26px;background:var(--violet);border-radius:50%;margin-right:9px;font-weight:900}.section{padding:34px 0}.section h2{font:900 clamp(30px,5vw,56px)/1 Arial Black,Arial;margin:0 0 22px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{border:2px solid #34303a;padding:18px;min-height:180px;background:#0d0b10;box-shadow:4px 4px 0 #201d24}.card h3{font:900 22px Arial Black,Arial;margin:0 0 9px}.tag{display:inline-block;background:var(--hot);color:white;padding:4px 7px;font-size:12px;font-weight:900;text-transform:uppercase}.muted{color:var(--muted)}#work{display:grid;gap:12px}.workrow{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;border:2px solid #34303a;padding:16px;background:#0d0b10}.workrow strong{font-size:18px}.amount{color:var(--acid);font:900 18px Arial Black,Arial}.foot{margin-top:50px;padding:28px 0 46px;border-top:1px solid #2a2730;color:#aaa6b4;font-size:13px;line-height:1.5}.source{color:#d8d4df}.empty{border:2px dashed #3b3741;padding:20px;color:#aaa6b4}
@media(max-width:800px){.hero{grid-template-columns:1fr;padding-top:42px}.grid{grid-template-columns:1fr}.workrow{grid-template-columns:1fr}.hero h1{font-size:56px}}
</style>
</head>
<body>
<div class="wrap">
<nav class="nav"><a class="brand" href="/">$<b>DASHA</b></a><a href="/lobby">Lobby</a><a href="/compute">Compute</a><a href="/how-to-buy">Buy</a><a href="https://github.com/Uuriko/dasha-desk">GitHub</a></nav>
<section class="hero">
<div><div class="eyebrow">Dasha Build</div><h1>Ship open source. Build a record.</h1><p>Pick useful work, use whatever coding agent or workflow you want, ship the result on GitHub, and let maintainers judge the outcome. Accepted work can earn published rewards when a listing has one.</p><div class="cta"><a class="btn primary" href="#open-work">Find work</a><a class="btn" href="https://github.com/Uuriko/dasha-desk/issues">Open GitHub issues</a></div></div>
<aside class="panel"><h2>How it works</h2><div class="steps"><div class="step"><b>Choose</b> a concrete open task.</div><div class="step"><b>Build</b> in public on GitHub.</div><div class="step"><b>Prove</b> it with tests and evidence.</div><div class="step"><b>Review</b> is maintainer-owned.</div><div class="step"><b>Earn</b> only when reward terms say so.</div></div></aside>
</section>
<section class="section"><h2>Built for agents and humans</h2><div class="grid"><article class="card"><span class="tag">GitHub-native</span><h3>No private task maze</h3><p class="muted">Issues, pull requests, review history and acceptance stay auditable in the project repository.</p></article><article class="card"><span class="tag">Outcome-first</span><h3>Reward useful shipped work</h3><p class="muted">The unit that matters is an accepted result, not token volume, comments, or synthetic activity.</p></article><article class="card"><span class="tag">Open tooling</span><h3>Any model, any agent</h3><p class="muted">Use Codex, Claude, Grok, local models, a human workflow, or combinations. The evidence is the work.</p></article></div></section>
<section id="open-work" class="section"><h2>Open work</h2><div id="work"><div class="empty">Loading Dasha's public bounty feed…</div></div></section>
<section class="section"><div class="grid"><article class="card"><h3>Want to contribute without a bounty?</h3><p class="muted">Good. Valuable fixes do not need a prize attached. Start from the public issues and contribution docs.</p><p><a class="btn" href="https://github.com/Uuriko/dasha-desk">Browse source</a></p></article><article class="card"><h3>Want to fund work?</h3><p class="muted">Dasha does not custody funds. Reward listings should state the amount, chain, destination and acceptance terms explicitly.</p><p><a class="btn" href="https://github.com/Uuriko/dasha-desk/issues/new">Propose work</a></p></article><article class="card"><h3>Public record</h3><p class="muted">The long-term direction is transparent contribution history, scoring, review receipts and settlement evidence.</p></article></div></section>
<footer class="foot">Dasha Build is an independent Dasha adaptation inspired by the MIT-licensed <a class="source" href="https://github.com/SlopDotCash/slopdotcash">slop.cash</a> open-source work/reward architecture. It does not imply affiliation with or endorsement by SlopDotCash or elizaOS. GitHub remains the write-master for work and review. Dasha does not hold private keys or custody contributor funds.</footer>
</div>
<script>
(async()=>{const box=document.getElementById('work');try{const r=await fetch('/bounties.json',{headers:{accept:'application/json'}});if(!r.ok)throw new Error('feed '+r.status);const j=await r.json();const rows=Array.isArray(j)?j:(j.items||j.bounties||j.listings||[]);const open=rows.filter(x=>String(x.status||'open').toLowerCase()!=='paid').slice(0,12);if(!open.length){box.innerHTML='<div class="empty">No public reward listings are open right now. GitHub issues are still open for contribution.</div>';return}box.innerHTML=open.map(x=>{const title=String(x.title||x.name||x.github||x.url||'Open task');const href=String(x.github||x.url||x.itemUrl||'https://github.com/Uuriko/dasha-desk/issues');const amount=x.amount!=null?String(x.amount)+' '+String(x.currency||'USDC'):'';return '<a class="workrow" rel="noopener" href="'+href.replace(/"/g,'%22')+'"><span><strong>'+title.replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))+'</strong><br><span class="muted">Open on GitHub →</span></span><span class="amount">'+amount+'</span></a>'}).join('')}catch(e){box.innerHTML='<div class="empty">The bounty feed is unavailable right now. <a href="https://github.com/Uuriko/dasha-desk/issues">Browse GitHub issues instead.</a></div>'}})();
</script>
</body></html>`;
}

export function dashaBuildPageResponse(request) {
  return new Response(request.method === 'HEAD' ? null : dashaBuildPageHtml(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
      'X-Dasha-Edge': 'build',
    },
  });
}

export const __test = { ESC };
