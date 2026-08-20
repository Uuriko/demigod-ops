/**
 * Worker-owned home for www.trydemigod.com/.
 * Lock: DEMIGOD-BIBLE.md — full 5-band Claude artifact 47e4ad1c-c427-468d-a837-eb46437d634d.
 * CDN foot/head pins do not load here.
 */

const INK = '#0B120F';
const BONE = '#EFE9DD';
const CLAY = '#D3A093';
const BONE_TEXT = '#E4DED2';
const DARK = '#23211D';

const HEADLINE = 'A motley crew is assembled quietly.';
const BODY =
  'You’re not filling a seat. You’re deciding who’s in the boat. The first five people decide what the company becomes — so we don’t send names into the world automatically. A person reads the fit, then knocks once.';
const TONIGHT_A = 'A person reads every brief.';
const TONIGHT_B = 'Names move after mutual yes.';
const STEPS = [
  ['01', 'You say it once'],
  ['02', 'A person chooses'],
  ['03', 'You meet'],
];
const FIELDS = [
  ['ROLE', 'the actual work'],
  ['COMP', 'the real range'],
  ['LOCATION', 'SF Bay'],
  ['REVIEWED BY', 'a person'],
];
const QUOTE = 'A person reads the fit, then knocks once.';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;1,400&family=IM+Fell+English:ital@0;1&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;600&family=Sorts+Mill+Goudy:ital,wght@0,400;1,400&display=swap';

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>\")";

const CSS = `
:root{--ink:${INK};--bone:${BONE};--clay:${CLAY};--bone-text:${BONE_TEXT};--dark:${DARK}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--ink);color:var(--bone-text)}
body{min-height:100%;font:16px/1.5 "Hanken Grotesk",system-ui,sans-serif}
a{color:inherit;text-decoration:none}
a:focus-visible{outline:2px solid var(--clay);outline-offset:3px}
.grain{position:fixed;inset:0;pointer-events:none;z-index:8;opacity:.11;mix-blend-mode:overlay;background:${GRAIN}}
.band{position:relative}
.ink{background:var(--ink);color:var(--bone-text)}
.bone{background:var(--bone);color:var(--dark)}
.wrap{width:min(68rem,calc(100% - 2.5rem));margin:0 auto}
.mast{display:grid;grid-template-columns:1fr auto 1fr;align-items:baseline;padding:1.45rem 0 1.1rem;border-bottom:1px solid color-mix(in srgb,var(--clay) 42%,transparent)}
.place{justify-self:start}
.wordmark{justify-self:center;margin:0;font:400 2rem/1 "Instrument Serif","Sorts Mill Goudy",serif}
.est{justify-self:end}
.kicker,.place,.est,.tonight .kicker,.cite{margin:0;color:var(--clay);font:600 .68rem/1.2 "Hanken Grotesk",system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}
.hero-stage{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(13rem,.7fr);gap:3rem 4rem;padding:4.4rem 0 1.5rem;align-items:end}
h1{margin:.55rem 0 1.15rem;max-width:14ch;font:400 clamp(2.4rem,5.6vw,3.7rem)/1.05 "Instrument Serif","Sorts Mill Goudy",serif}
.lede,.band p.lede{margin:0;max-width:36rem}
.ink .lede{color:var(--bone-text)}
.actions{display:flex;flex-wrap:wrap;gap:.75rem;padding:0 0 3.4rem}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 1.15rem;border:1px solid transparent;border-radius:0;font:600 .92rem/1 "Hanken Grotesk",system-ui,sans-serif}
.btn-primary{background:var(--bone);color:var(--dark)}
.btn-ghost{border-color:var(--bone);color:var(--bone-text);background:transparent}
.bone .btn-primary{background:var(--ink);color:var(--bone-text)}
.bone .btn-ghost{border-color:var(--dark);color:var(--dark)}
.tonight p{margin:.4rem 0 0;color:var(--bone-text);font:15px/1.45 "Hanken Grotesk",system-ui,sans-serif}
.pad{padding:4.4rem 0 4.6rem}
h2{margin:.45rem 0 0;max-width:18ch;font:400 clamp(2rem,4.4vw,3rem)/1.08 "IM Fell English","Sorts Mill Goudy",serif}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:2.6rem 0 0;border:1px solid var(--clay)}
.step{padding:1.15rem 1.1rem 1.25rem;border-right:1px solid var(--clay)}
.step:last-child{border-right:0}
.num{display:block;margin:0 0 .55rem;color:var(--clay);font:600 .78rem/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.08em}
.step strong{display:block;font:400 1.25rem/1.25 "Instrument Serif",serif}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:2.4rem 0 0;border-top:1px solid var(--clay);border-left:1px solid var(--clay)}
.cell{padding:1.15rem 1rem 1.3rem;border-right:1px solid var(--clay);border-bottom:1px solid var(--clay)}
.cell dt{margin:0 0 .45rem;color:var(--clay);font:600 .68rem/1.2 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}
.cell dd{margin:0;font:400 1.2rem/1.3 "Instrument Serif",serif}
.price-line{margin:1.15rem 0 0;max-width:28rem}
blockquote{margin:2.1rem 0 0;padding:0;border:0;max-width:28rem}
blockquote p{margin:0;font:italic 1.35rem/1.35 "IM Fell English","Sorts Mill Goudy",serif}
.cite{margin:.7rem 0 0}
.close h2{max-width:16ch}
.close .actions{padding:1.8rem 0 0}
.foot{display:flex;justify-content:space-between;gap:1rem;margin:3.2rem 0 0;padding:1.2rem 0 0;border-top:1px solid color-mix(in srgb,var(--clay) 42%,transparent);color:var(--clay);font-size:.85rem}
.foot a{color:var(--clay)}
@media (max-width:860px){
  .mast{grid-template-columns:1fr 1fr;row-gap:.5rem}
  .wordmark{grid-column:1/-1;justify-self:center;order:-1}
  .hero-stage{grid-template-columns:1fr;gap:2.4rem;padding-top:2.8rem}
  .steps,.grid{grid-template-columns:1fr 1fr}
  .step{border-bottom:1px solid var(--clay)}
  .step:nth-child(2n){border-right:0}
  h1,h2{max-width:none}
}
@media (max-width:560px){
  .steps,.grid{grid-template-columns:1fr}
  .step,.cell{border-right:0}
}
`.replace(/\n/g, '');

function stepsHtml() {
  return STEPS.map(([num, title]) => `<div class="step"><span class="num">${num}</span><strong>${title}</strong></div>`).join('');
}

function fieldsHtml() {
  return FIELDS.map(([kind, value]) => `<div class="cell"><dt>${kind}</dt><dd>${value}</dd></div>`).join('');
}

/** Full 5-band home. Honest tonight. Field kinds only — no names, no invented counts. */
export function demigodHomeHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demigod</title>
<meta name="description" content="You’re not filling a seat. You’re deciding who’s in the boat. A person reads the fit, then knocks once.">
<link rel="canonical" href="https://www.trydemigod.com/">
<link rel="stylesheet" href="${FONTS}">
<style>${CSS}</style>
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<section class="band ink">
<div class="wrap">
<header class="mast">
<p class="place">SF BAY AREA</p>
<p class="wordmark">Demigod</p>
<p class="est">EST. 2025</p>
</header>
<div class="hero-stage">
<div>
<p class="kicker">CHAPTER ONE</p>
<h1>${HEADLINE}</h1>
<p class="lede">${BODY}</p>
</div>
<aside class="tonight" aria-label="Tonight">
<p class="kicker">TONIGHT</p>
<p>${TONIGHT_A}</p>
<p>${TONIGHT_B}</p>
</aside>
</div>
<p class="actions">
<a class="btn btn-primary" href="/hire">Start a brief</a>
<a class="btn btn-ghost" href="/hire?wiz=engineer">Join the network</a>
</p>
</div>
</section>
<section class="band bone">
<div class="wrap pad">
<p class="kicker">HOW IT GOES</p>
<h2>Every crew starts with two people who recognised each other.</h2>
<div class="steps">${stepsHtml()}</div>
</div>
</section>
<section class="band ink">
<div class="wrap pad">
<p class="kicker">What gets checked</p>
<h2>Some things arrive like weather.</h2>
<dl class="grid">${fieldsHtml()}</dl>
</div>
</section>
<section class="band bone">
<div class="wrap pad">
<p class="kicker">Pricing</p>
<h2>We’re paid only if someone joins you.</h2>
<p class="price-line">10% of first-year salary after they start.</p>
<blockquote>
<p>${QUOTE}</p>
<p class="cite">— a founder</p>
</blockquote>
</div>
</section>
<section class="band ink close">
<div class="wrap pad">
<h2>The first five decide what it becomes.</h2>
<p class="actions">
<a class="btn btn-primary" href="/hire">Start a brief</a>
<a class="btn btn-ghost" href="/hire?wiz=engineer">Join the network</a>
</p>
<footer class="foot"><a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></footer>
</div>
</section>
</body>
</html>`;
}
