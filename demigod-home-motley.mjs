/**
 * Worker-owned first paint for www.trydemigod.com/.
 * Lock: DEMIGOD-BIBLE.md (Claude artifact 47e4ad1c-c427-468d-a837-eb46437d634d).
 * Self-contained charcoal first paint. CDN foot/head pins do not load here.
 */

const NIGHT = '#0d0d0d';
const PAPER = '#efe8dc';
const MUTE = '#8a847a';
const LINE = 'rgba(239,232,220,.18)';
const INK = '#0d0d0d';

const HEADLINE = 'A motley crew is assembled quietly.';
const BODY =
  'You’re not filling a seat. You’re deciding who’s in the boat. The first five people decide what the company becomes — so we don’t send names into the world automatically. A person reads the fit, then knocks once.';
const TONIGHT_A = 'A person reads every brief.';
const TONIGHT_B = 'Names move after mutual yes.';
const CHAPTERS = [
  {
    kicker: 'CHAPTER TWO',
    title: 'How a name moves.',
    body: 'You send a brief. A person reads it. If there’s a fit, both sides say yes before any name moves. Then one knock.',
  },
  {
    kicker: 'CHAPTER THREE',
    title: 'Who this is for.',
    body: 'SF Bay Area. The first engineering seats. Seed and Series A. You’re deciding who’s in the boat.',
  },
  {
    kicker: 'CHAPTER FOUR',
    title: 'The fee.',
    body: '10% when you hire. Nothing until then. Talent is free.',
  },
];

const CSS = `
:root{--night:${NIGHT};--paper:${PAPER};--mute:${MUTE};--line:${LINE};--ink:${INK}}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--night);color:var(--paper)}
body{font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:inherit}
a:focus-visible{outline:2px solid var(--paper);outline-offset:3px}
.wrap{max-width:68rem;margin:0 auto;padding:1.65rem 2rem 3.25rem}
.mast{display:grid;grid-template-columns:1fr auto 1fr;align-items:baseline;padding:0 0 1.1rem;border-bottom:1px solid var(--line)}
.place{justify-self:start}
.wordmark{justify-self:center;margin:0;font:700 2.05rem/1 "Iowan Old Style",Palatino,"Palatino Linotype",Georgia,serif;letter-spacing:.01em}
.est{justify-self:end}
.place,.est,.kicker,.tonight h2{margin:0;color:var(--mute);font:600 .68rem/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.2em;text-transform:uppercase}
.stage{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(12rem,.7fr);gap:3.5rem 4rem;padding:4.4rem 0 0;align-items:end}
.kicker{margin-bottom:.85rem}
h1{margin:0 0 1.15rem;max-width:14ch;font:700 clamp(2.35rem,5.4vw,3.55rem)/1.08 "Iowan Old Style",Palatino,"Palatino Linotype",Georgia,serif}
.lede{margin:0;max-width:36rem;color:var(--paper)}
.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin:1.85rem 0 0}
.btn{display:inline-block;padding:.72rem 1.15rem;border-radius:4px;text-decoration:none;font:500 .95rem/1.2 system-ui,-apple-system,"Segoe UI",sans-serif}
.btn-primary{background:var(--paper);color:var(--ink)}
.btn-ghost{border:1px solid var(--paper);color:var(--paper);background:transparent}
.tonight{padding:0 0 .15rem}
.tonight ul{list-style:none;margin:.7rem 0 0;padding:0}
.tonight li{margin:0 0 .4rem;color:var(--mute);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
.chapters{margin:3.5rem 0 0;padding:1rem 0 0;border-top:1px solid var(--line)}
.chapter{max-width:38rem;padding:2.15rem 0;border-bottom:1px solid var(--line)}
.chapter h2{margin:.55rem 0 .7rem;font:400 1.65rem/1.15 "Iowan Old Style",Palatino,"Palatino Linotype",Georgia,serif}
.chapter p{margin:0;color:var(--paper)}
.foot{margin:3.25rem 0 0;color:var(--mute);font-size:.85rem}
.foot a{color:var(--mute)}
@media (max-width:800px){
  .mast{grid-template-columns:1fr 1fr;row-gap:.55rem}
  .wordmark{grid-column:1/-1;justify-self:center;order:-1}
  .stage{grid-template-columns:1fr;gap:3rem;padding-top:3rem}
  h1{max-width:none}
}
`.replace(/\n/g, '');

/** Charcoal / serif home. Honest tonight lines only — no names, no invented counts. */
export function demigodHomeHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demigod</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header class="mast">
<p class="place">SF BAY AREA</p>
<p class="wordmark">Demigod</p>
<p class="est">EST. 2025</p>
</header>
<div class="stage">
<main>
<p class="kicker">CHAPTER ONE</p>
<h1>${HEADLINE}</h1>
<p class="lede">${BODY}</p>
<p class="actions">
<a class="btn btn-primary" href="/hire">Start a brief</a>
<a class="btn btn-ghost" href="/hire?wiz=engineer">Join the network</a>
</p>
</main>
<aside class="tonight" aria-label="Tonight">
<h2>Tonight</h2>
<ul>
<li>${TONIGHT_A}</li>
<li>${TONIGHT_B}</li>
</ul>
</aside>
</div>
<div class="chapters">
${CHAPTERS.map((chapter) => `<section class="chapter">
<p class="kicker">${chapter.kicker}</p>
<h2>${chapter.title}</h2>
<p>${chapter.body}</p>
</section>`).join('')}
</div>
<footer class="foot"><a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></footer>
</div>
</body>
</html>`;
}
